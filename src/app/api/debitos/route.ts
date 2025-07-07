// src/app/api/debitos/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { Debito } from '@/services/licitacaoService'; // Reuse type from service

// Helper to convert Firestore data to Debito type
const mapDocToDebito = (doc: admin.firestore.DocumentSnapshot): Debito => {
  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    // Ensure dates are converted from Firestore Timestamps to ISO strings for JSON serialization
    dataVencimento: (data.dataVencimento.toDate?.() || new Date(data.dataVencimento)).toISOString(),
    dataReferencia: (data.dataReferencia.toDate?.() || new Date(data.dataReferencia)).toISOString(),
  } as Debito;
};

export async function GET(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const debitosSnapshot = await db.collection('debitos').get();
    const debitos: Debito[] = [];
    debitosSnapshot.forEach(doc => {
      debitos.push(mapDocToDebito(doc));
    });
    return NextResponse.json(debitos, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching debitos:', error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Error fetching debitos', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const body = await request.json();
    
    // Zod validation could be added here for more safety
    if (!body.clienteNome || !body.descricao || !body.valor || !body.dataVencimento) {
      return NextResponse.json({ message: 'Campos obrigatórios estão faltando.' }, { status: 400 });
    }

    const newDebitData = {
        tipoDebito: 'AVULSO',
        clienteNome: body.clienteNome,
        clienteCnpj: body.clienteCnpj || null,
        descricao: body.descricao,
        valor: Number(body.valor),
        dataVencimento: new Date(body.dataVencimento),
        dataReferencia: new Date(),
        status: 'PENDENTE',
    };

    const docRef = await db.collection('debitos').add(newDebitData);

    const newDebito = await docRef.get();
    
    return NextResponse.json(mapDocToDebito(newDebito), { status: 201 });
  } catch (error: any) {
    console.error('Error adding avulso debit:', error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao adicionar débito avulso', error: error.message }, { status: 500 });
  }
}