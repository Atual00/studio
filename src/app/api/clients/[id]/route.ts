// src/app/api/clients/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { ClientFormValues, ClientDetails } from '@/components/clientes/client-form';

// Helper to convert Firestore timestamp to Date or string
const mapFirestoreDocToClientDetails = (docData: admin.firestore.DocumentData): ClientDetails => {
  return {
    id: docData.id,
    ...docData,
  } as ClientDetails;
};

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    const clientDoc = await db.collection('clients').doc(id).get();

    if (!clientDoc.exists) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }
    const clientData = mapFirestoreDocToClientDetails({ id: clientDoc.id, ...clientDoc.data() });
    return NextResponse.json(clientData, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching client ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured. Please check server logs for Firebase Admin SDK setup.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error fetching client', error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    const clientData = await request.json() as Partial<ClientFormValues>;

    // If CNPJ is being updated, check for duplicates (excluding the current document)
    if (clientData.cnpj) {
      const existingClientQuery = await db.collection('clients')
        .where('cnpj', '==', clientData.cnpj)
        .get();
      
      if (!existingClientQuery.empty) {
        let conflict = false;
        existingClientQuery.forEach(doc => {
          if (doc.id !== id) { // If a different client has this CNPJ
            conflict = true;
          }
        });
        if (conflict) {
          return NextResponse.json({ message: `CNPJ ${clientData.cnpj} já cadastrado para outro cliente.` }, { status: 409 });
        }
      }
    }

    await db.collection('clients').doc(id).update(clientData);
    return NextResponse.json({ message: 'Client updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating client ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured. Please check server logs for Firebase Admin SDK setup.", error: error.message }, { status: 503 });
    }
    if (error.code === 5) { // Firestore NOT_FOUND error code
        return NextResponse.json({ message: `Client with ID ${id} not found for update.` }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error updating client', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    
    // Optional: Check if client exists before attempting delete to provide a more specific 404
    const clientDoc = await db.collection('clients').doc(id).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ message: `Client with ID ${id} not found.` }, { status: 404 });
    }

    await db.collection('clients').doc(id).delete();
    return NextResponse.json({ message: 'Client deleted successfully' }, { status: 200 }); // Or 204 No Content
  } catch (error: any) {
    console.error(`Error deleting client ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured. Please check server logs for Firebase Admin SDK setup.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error deleting client', error: error.message }, { status: 500 });
  }
}
