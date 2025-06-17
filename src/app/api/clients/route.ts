// src/app/api/clients/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { ClientFormValues, ClientDetails } from '@/components/clientes/client-form';

// Helper to convert Firestore timestamp to Date or string for ClientDetails
const mapFirestoreDocToClientDetails = (docData: admin.firestore.DocumentData): ClientDetails => {
  // Ensure all date fields are correctly handled if they exist
  // For ClientDetails, no specific date fields are defined beyond what ClientFormValues has.
  // If ClientFormValues had Date objects, you'd parse them here.
  return {
    id: docData.id, // Assuming id is stored as a field after adding, or use doc.id
    ...docData,
  } as ClientDetails;
};


export async function GET(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const clientsSnapshot = await db.collection('clients').get();
    const clients: ClientDetails[] = [];
    clientsSnapshot.forEach(doc => {
      clients.push(mapFirestoreDocToClientDetails({ id: doc.id, ...doc.data() }));
    });
    return NextResponse.json(clients, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    // Check if the error is due to Firestore not being initialized
    if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured. Please check server logs for Firebase Admin SDK setup.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error fetching clients', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const clientData = await request.json() as ClientFormValues;

    // Basic validation (you might want more robust validation, e.g., with Zod on the backend too)
    if (!clientData.razaoSocial || !clientData.cnpj) {
      return NextResponse.json({ message: 'Razão Social and CNPJ are required' }, { status: 400 });
    }

    // Check for duplicate CNPJ
    const existingClientQuery = await db.collection('clients').where('cnpj', '==', clientData.cnpj).limit(1).get();
    if (!existingClientQuery.empty) {
      return NextResponse.json({ message: `CNPJ ${clientData.cnpj} já cadastrado.` }, { status: 409 });
    }

    const docRef = await db.collection('clients').add(clientData);
    const newClient: ClientDetails = {
      id: docRef.id,
      ...clientData,
    };
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error adding client:', error);
     if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured. Please check server logs for Firebase Admin SDK setup.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error adding client', error: error.message }, { status: 500 });
  }
}
