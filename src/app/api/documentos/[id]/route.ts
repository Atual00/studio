// src/app/api/documentos/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { Documento } from '@/services/documentoService';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    const data: Omit<Documento, 'id' | 'clienteNome'> = await request.json();

    // Convert date string back to Date object for Firestore
    const dataToUpdate: { [key: string]: any } = { ...data };
    if (data.dataVencimento) {
      dataToUpdate.dataVencimento = new Date(data.dataVencimento);
    }

    // If client ID is being updated, we must also update the denormalized clientName
    const clientSnapshot = await db.collection('clients').doc(data.clienteId).get();
    if (!clientSnapshot.exists) {
        return NextResponse.json({ message: `Client with ID ${data.clienteId} not found.` }, { status: 404 });
    }
    dataToUpdate.clienteNome = clientSnapshot.data()?.razaoSocial || 'Cliente Desconhecido';

    await db.collection('documentos').doc(id).update(dataToUpdate);
    return NextResponse.json({ message: 'Documento atualizado com sucesso' }, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating documento ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao atualizar documento', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    await db.collection('documentos').doc(id).delete();
    return NextResponse.json({ message: 'Documento excluído com sucesso' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting documento ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao excluir documento', error: error.message }, { status: 500 });
  }
}
