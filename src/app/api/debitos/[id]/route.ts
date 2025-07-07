// src/app/api/debitos/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';

interface RouteParams {
  params: { id: string };
}

// Handler for updating the status of a debit
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const { status } = await request.json();

    if (!status || !['PAGO', 'ENVIADO_FINANCEIRO', 'PAGO_VIA_ACORDO'].includes(status)) {
      return NextResponse.json({ message: 'Status inválido fornecido.' }, { status: 400 });
    }
    
    const db = getFirestoreAdmin();
    const debitRef = db.collection('debitos').doc(id);

    await debitRef.update({ status });

    return NextResponse.json({ message: 'Status do débito atualizado com sucesso' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating debit ${id} status:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
        return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao atualizar status do débito', error: error.message }, { status: 500 });
  }
}
