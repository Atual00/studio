// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app(); // Return existing app if already initialized
  }

  // Option 1: Service account JSON string in environment variable (recommended for Vercel/serverless)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('Initializing Firebase Admin SDK with FIREBASE_SERVICE_ACCOUNT_JSON...');
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // You might need to specify your databaseURL if it's not automatically inferred
        // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // Or your specific DB URL
      });
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      // Fall through to try applicationDefault if parsing fails
    }
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS environment variable (standard for GCP)
  // This will be automatically picked up by admin.credential.applicationDefault()
  // if the environment variable points to a valid service account JSON file.
  try {
    console.log('Attempting to initialize Firebase Admin SDK with applicationDefault()...');
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (e: any) {
    // This error often means GOOGLE_APPLICATION_CREDENTIALS is not set or invalid
    console.warn(
        'Firebase Admin SDK: Failed to initialize with applicationDefault(). This is expected if GOOGLE_APPLICATION_CREDENTIALS is not set. Error:', e.message
    );
  }

  // Fallback if no credentials found by any method
  console.error(
    'Firebase Admin SDK: CRITICAL - Initialization failed. No valid credentials provided. ' +
    'Please set either FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS environment variables. ' +
    'Firestore operations will fail.'
  );
  return null; // Indicates initialization failure
};

// Initialize the app
const app = initializeFirebaseAdmin();

// Export Firestore instance (or null if initialization failed)
export const dbAdmin = app ? admin.firestore() : null;

// Helper function to ensure db is initialized before use in API routes
export const getFirestoreAdmin = () => {
  if (!dbAdmin) {
    // This should ideally not be hit if initialization is successful at startup.
    // However, if it is, it might indicate a problem with how env vars are loaded
    // or an attempt to use dbAdmin before app initialization is complete.
    console.error(
        "Firestore Admin is not initialized. This usually means Firebase Admin SDK " +
        "could not find valid credentials during startup. Check server logs for " +
        "details on FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS. " +
        "API routes requiring database access will fail."
    );
    throw new Error("Firestore Admin not initialized. Check server logs for credential configuration issues.");
  }
  return dbAdmin;
};
