# Licitax Advisor

This is a Next.js application designed for managing bidding processes (licitações) for clients. It uses Genkit for AI features and Firestore (via Google Cloud) as its backend database.

## Getting Started

To run this application locally, follow these steps:

**Prerequisites:**

*   Node.js (Version 18 or later recommended)
*   npm or yarn package manager
*   Google Cloud Project with **Firestore enabled**.
*   Firebase Service Account Key for backend authentication.
*   Google Generative AI API Key (for AI features, optional if not using AI).
*   Firebase Project with a deployed Cloud Function to act as a proxy for the Compras.gov.br API (for legacy API consultation features, optional).

**Installation:**

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd licitax-advisor
    ```
2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```
3.  **Configure Environment Variables:**
    *   Create a file named `.env.local` in the root directory of the project by copying `.env` (e.g., `cp .env .env.local`). **Be careful not to commit secrets in `.env.local` to public repositories.**
    *   **Firebase Admin SDK (Backend Firestore Access):**
        *   Go to your Google Cloud Project > IAM & Admin > Service Accounts.
        *   Create a service account (or use an existing one with appropriate permissions, e.g., "Cloud Datastore User" or "Firebase Admin").
        *   Generate a JSON key for this service account and download it.
        *   **Option A (Recommended for Deployment, e.g., Vercel):** Open the downloaded JSON key file, copy its entire content, and paste it as a single-line string into the `FIREBASE_SERVICE_ACCOUNT_JSON` variable in your `.env.local` file.
            ```env
            FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "your-project-id", ...}'
            ```
        *   **Option B (Alternative for Local Development):** Save the downloaded JSON key file (e.g., `serviceAccountKey.json`) in a secure location within your project (ensure it's in `.gitignore`). Then, set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable in your system or shell to point to the absolute path of this file. For example, in your `.env.local` (or shell profile):
            ```env
            # If using GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_JSON can be empty or removed.
            # GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json" 
            ```
            The `src/lib/firebaseAdmin.ts` file will attempt to initialize using `FIREBASE_SERVICE_ACCOUNT_JSON` first, then `GOOGLE_APPLICATION_CREDENTIALS`.
    *   **(Optional) Google Generative AI API Key:**
        Add your Google Generative AI API key to the `.env.local` file if you intend to use AI features:
        ```env
        GOOGLE_GENAI_API_KEY="YOUR_API_KEY_HERE"
        ```
        Replace `"YOUR_API_KEY_HERE"` with your actual API key. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   **(Optional) Compras.gov.br Proxy URL:**
        If using the legacy Compras.gov.br API consultation, add the URL of your deployed Firebase Cloud Function:
        ```env
        NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL="YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE"
        ```
        Example: `https://southamerica-east1-your-project-id.cloudfunctions.net/consultarApiComprasGov`

**Firestore Setup:**

1.  Ensure you have a Google Cloud Project.
2.  Go to the Firebase console and add Firebase to your Google Cloud project, or create a new Firebase project linked to it.
3.  In the Firebase console, navigate to **Firestore Database** (or Build > Firestore Database).
4.  Click **Create database**.
5.  Choose **Start in production mode** (recommended for security rules) or test mode.
6.  Select a location for your Firestore data.
7.  Click **Enable**.
8.  **Security Rules:** For backend access via `firebase-admin` (as used in API routes), the service account's IAM permissions are typically sufficient. However, if you plan to access Firestore directly from the client-side in the future, you'll need to configure appropriate [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started). For now, the API routes will handle data access.

**Running the Development Server:**

1.  **Start the Next.js development server:**
    Using npm:
    ```bash
    npm run dev
    ```
    Or using yarn:
    ```bash
    yarn dev
    ```
2.  **Access the application:**
    Open your web browser and navigate to [http://localhost:9002](http://localhost:9002).

This application is a web-based prototype and runs in your browser. The steps above allow you to run the code on your own machine with a Firestore backend.
