// src/app/api/documentos/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { Documento } from '@/services/documentoService';

// Helper to convert Firestore data (with Timestamps) to our Documento type (with ISO strings)
const mapDocToDocumento = (doc: admin.firestore.DocumentSnapshot): Documento => {
  const data = doc.data()!;
  return {
    id: doc.id,
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    tipoDocumento: data.tipoDocumento,
    // Ensure date is converted from Firestore Timestamp to ISO string for JSON serialization
    dataVencimento: data.dataVencimento ? data.dataVencimento.toDate().toISOString() : null,
  } as Documento;
};

export async function GET(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const documentosSnapshot = await db.collection('documentos').get();
    const documentos: Documento[] = [];
    documentosSnapshot.forEach(doc => {
      documentos.push(mapDocToDocumento(doc));
    });
    return NextResponse.json(documentos, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching documentos:', error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error fetching documentos', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const body: Omit<Documento, 'id' | 'clienteNome'> = await request.json();
    
    // Basic validation
    if (!body.clienteId || !body.tipoDocumento) {
      return NextResponse.json({ message: 'Campos obrigatórios (clienteId, tipoDocumento) estão faltando.' }, { status: 400 });
    }

    // Fetch client details to denormalize client name
    const clientDoc = await db.collection('clients').doc(body.clienteId).get();
    if (!clientDoc.exists) {
        return NextResponse.json({ message: `Cliente com ID ${body.clienteId} não encontrado.` }, { status: 404 });
    }
    const clienteNome = clientDoc.data()?.razaoSocial || 'Cliente Desconhecido';

    const newDocumentoData: any = {
      ...body,
      clienteNome: clienteNome,
      // Convert date string from payload to Firestore Timestamp object if it exists
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
      createdAt: new Date(),
    };

    const docRef = await db.collection('documentos').add(newDocumentoData);
    const newDoc = await docRef.get();
    
    return NextResponse.json(mapDocToDocumento(newDoc), { status: 201 });
  } catch (error: any)
  {
    console.error('Error adding documento:', error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao adicionar documento', error: error.message }, { status: 500 });
  }
}
