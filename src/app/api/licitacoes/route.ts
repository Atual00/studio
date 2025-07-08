// src/app/api/licitacoes/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import type { LicitacaoDetails } from '@/services/licitacaoService'; // Reuse type from service

// Helper to convert Firestore data (with Timestamps) to our LicitacaoDetails type (with ISO strings)
const mapDocToLicitacao = (doc: admin.firestore.DocumentSnapshot): LicitacaoDetails | null => {
  const data = doc.data();
  // Basic validation: ensure required date fields exist and are valid timestamps before converting
  if (!data || !data.dataInicio?.toDate || !data.dataMetaAnalise?.toDate) {
    console.warn(`[API] Skipping malformed licitacao document (missing or invalid dates): ${doc.id}`);
    return null; // Return null for invalid documents
  }

  return {
    ...data,
    id: doc.id,
    // Ensure dates are converted from Firestore Timestamps to ISO strings for JSON serialization
    dataInicio: data.dataInicio.toDate().toISOString(),
    dataMetaAnalise: data.dataMetaAnalise.toDate().toISOString(),
    // Handle optional dates
    dataHomologacao: data.dataHomologacao ? data.dataHomologacao.toDate().toISOString() : undefined,
  } as LicitacaoDetails;
};


export async function GET(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const licitacoesSnapshot = await db.collection('licitacoes').orderBy('dataInicio', 'desc').get();
    const licitacoes: LicitacaoDetails[] = [];
    
    licitacoesSnapshot.forEach(doc => {
      try { // Add a try-catch for each document to prevent one bad record from failing the whole request
        const mappedDoc = mapDocToLicitacao(doc);
        if (mappedDoc) { // Only push valid, successfully mapped documents
          licitacoes.push(mappedDoc);
        }
      } catch (e: any) {
        console.error(`[API] Failed to process 'licitacao' with ID: ${doc.id}. Error: ${e.message}`);
        // This will skip the problematic document and continue with the others.
      }
    });

    return NextResponse.json(licitacoes, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching licitacoes collection:', error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
     // Check for authentication token errors
    if (error.message.includes("Could not refresh access token")) {
        return NextResponse.json({
            message: "Authentication with Google Cloud failed. Your service account credentials (FIREBASE_SERVICE_ACCOUNT_JSON) may be invalid, expired, or lack permissions.",
            error: error.message
        }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error fetching licitacoes collection', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getFirestoreAdmin();
    const body = await request.json();
    
    // Zod validation could be added here for more safety
    if (!body.clienteId || !body.numeroLicitacao) {
      return NextResponse.json({ message: 'Campos obrigatórios estão faltando.' }, { status: 400 });
    }
    
    // Fetch client details to denormalize client name
    const clientDoc = await db.collection('clients').doc(body.clienteId).get();
    if (!clientDoc.exists) {
        return NextResponse.json({ message: `Cliente com ID ${body.clienteId} não encontrado.` }, { status: 404 });
    }
    const clientName = clientDoc.data()?.razaoSocial || 'Cliente Desconhecido';

    const newLicitacaoData = {
        ...body,
        clienteNome: clientName,
        // Convert date strings from payload to Firestore Timestamp objects
        dataInicio: new Date(body.dataInicio),
        dataMetaAnalise: new Date(body.dataMetaAnalise),
        status: 'AGUARDANDO_ANALISE', // Initial status
        checklist: {},
        comentarios: [],
        createdAt: new Date(), // Add a creation timestamp
    };
    // Remove the file object if it was passed, only store the name
    delete newLicitacaoData.propostaItensPdf; 

    const docRef = await db.collection('licitacoes').add(newLicitacaoData);
    
    const newLicitacao = await docRef.get();
    
    const mappedNewLicitacao = mapDocToLicitacao(newLicitacao);

    if (!mappedNewLicitacao) {
        // This case should be rare as we just created it, but it's a good safeguard
        throw new Error("Failed to map the newly created licitação.");
    }
    
    return NextResponse.json(mappedNewLicitacao, { status: 201 });
  } catch (error: any) {
    console.error('Error adding licitação:', error);
     if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao adicionar licitação', error: error.message }, { status: 500 });
  }
}
