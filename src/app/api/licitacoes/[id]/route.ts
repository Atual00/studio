// src/app/api/licitacoes/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebaseAdmin';
import { addMonths, setDate } from 'date-fns';
import type { LicitacaoDetails, Debito } from '@/services/licitacaoService';

interface RouteParams {
  params: { id: string };
}

// Helper to convert Firestore data (with Timestamps) to our LicitacaoDetails type (with ISO strings)
const mapDocToLicitacao = (doc: admin.firestore.DocumentSnapshot): LicitacaoDetails => {
  const data = doc.data()!;
  // Function to safely convert Firestore Timestamp or string to ISO string
  const toISOString = (date: any): string | undefined => {
    if (!date) return undefined;
    if (date.toDate) return date.toDate().toISOString(); // Firestore Timestamp
    if (typeof date === 'string') return new Date(date).toISOString();
    if (date instanceof Date) return date.toISOString();
    return undefined;
  };

  return {
    ...data,
    id: doc.id,
    dataInicio: toISOString(data.dataInicio)!,
    dataMetaAnalise: toISOString(data.dataMetaAnalise)!,
    dataHomologacao: toISOString(data.dataHomologacao),
    // Ensure nested dates are also converted
    comentarios: (data.comentarios || []).map((c: any) => ({ ...c, data: toISOString(c.data) })),
    disputaLog: data.disputaLog ? {
        ...data.disputaLog,
        iniciadaEm: toISOString(data.disputaLog.iniciadaEm),
        finalizadaEm: toISOString(data.disputaLog.finalizadaEm),
        mensagens: (data.disputaLog.mensagens || []).map((m: any) => ({ ...m, timestamp: toISOString(m.timestamp) })),
    } : undefined,
    dataResultadoHabilitacao: toISOString(data.dataResultadoHabilitacao),
    dataInicioRecursoHabilitacao: toISOString(data.dataInicioRecursoHabilitacao),
    prazoFinalRecursoHabilitacao: toISOString(data.prazoFinalRecursoHabilitacao),
    dataInicioContrarrazoesHabilitacao: toISOString(data.dataInicioContrarrazoesHabilitacao),
    prazoFinalContrarrazoesHabilitacao: toISOString(data.prazoFinalContrarrazoesHabilitacao),
    dataDecisaoFinalRecursoHabilitacao: toISOString(data.dataDecisaoFinalRecursoHabilitacao),
  } as LicitacaoDetails;
};


export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    const licitacaoDoc = await db.collection('licitacoes').doc(id).get();

    if (!licitacaoDoc.exists) {
      return NextResponse.json({ message: 'Licitação não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(mapDocToLicitacao(licitacaoDoc), { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching licitacao ${id}:`, error);
    if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao buscar licitação', error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    const data: Partial<LicitacaoDetails> = await request.json();
    const licitacaoRef = db.collection('licitacoes').doc(id);

    // Convert date strings back to Date objects for Firestore
    const convertToDate = (isoString?: string | Date): Date | undefined => {
        if (!isoString) return undefined;
        return new Date(isoString);
    };

    const dataToUpdate: { [key: string]: any } = { ...data };
    
    // Convert all potential date fields
    const dateFields: (keyof LicitacaoDetails)[] = [
      'dataInicio', 'dataMetaAnalise', 'dataHomologacao', 'dataResultadoHabilitacao',
      'dataInicioRecursoHabilitacao', 'prazoFinalRecursoHabilitacao', 'dataInicioContrarrazoesHabilitacao',
      'prazoFinalContrarrazoesHabilitacao', 'dataDecisaoFinalRecursoHabilitacao'
    ];

    dateFields.forEach(field => {
      if (data[field]) {
        dataToUpdate[field] = convertToDate(data[field] as string);
      }
    });
     if (data.disputaLog) {
        dataToUpdate.disputaLog = {
            ...data.disputaLog,
            iniciadaEm: convertToDate(data.disputaLog.iniciadaEm),
            finalizadaEm: convertToDate(data.disputaLog.finalizadaEm),
             mensagens: (data.disputaLog.mensagens || []).map(m => ({...m, timestamp: convertToDate(m.timestamp as string)})),
        }
    }


    const existingDoc = await licitacaoRef.get();
    if (!existingDoc.exists) {
        return NextResponse.json({ message: 'Licitação não encontrada para atualização.' }, { status: 404 });
    }
    const wasHomologado = existingDoc.data()?.status === 'PROCESSO_HOMOLOGADO';

    if (data.status === 'PROCESSO_HOMOLOGADO' && !wasHomologado) {
      dataToUpdate.dataHomologacao = new Date(); // Set homologation date on status change
    }

    await licitacaoRef.update(dataToUpdate);

    // Handle Debit creation/update on homologation
    if (data.status === 'PROCESSO_HOMOLOGADO' && !wasHomologado) {
        const licitacaoData = { ...existingDoc.data(), ...dataToUpdate } as LicitacaoDetails;
        const configSnapshot = await db.collection('configuracoes').doc('empresa').get();
        const config = configSnapshot.data() || { diaVencimentoPadrao: 15 };
        const clientSnapshot = await db.collection('clients').doc(licitacaoData.clienteId).get();
        const clientData = clientSnapshot.data();

        const dueDate = addMonths(dataToUpdate.dataHomologacao, 1);
        const finalDueDate = setDate(dueDate, config.diaVencimentoPadrao || 15);

        const debitRef = db.collection('debitos').doc(id);
        const debitData: Omit<Debito, 'id'> = {
            tipoDebito: 'LICITACAO',
            clienteNome: licitacaoData.clienteNome,
            clienteCnpj: clientData?.cnpj || null,
            descricao: `Serviços Licitação ${licitacaoData.numeroLicitacao}`,
            valor: licitacaoData.valorCobrado,
            dataVencimento: finalDueDate,
            dataReferencia: dataToUpdate.dataHomologacao,
            status: 'PENDENTE',
            licitacaoNumero: licitacaoData.numeroLicitacao,
        };
        await debitRef.set(debitData, { merge: true }); // Use set with merge to create or update
    }

    return NextResponse.json({ message: 'Licitação atualizada com sucesso' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating licitacao ${id}:`, error);
     if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao atualizar licitação', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const db = getFirestoreAdmin();
    // Optional: Also delete the associated debit if it exists and is pending
    const debitRef = db.collection('debitos').doc(id);
    const debitDoc = await debitRef.get();
    if (debitDoc.exists && debitDoc.data()?.status === 'PENDENTE') {
        await debitRef.delete();
    }

    await db.collection('licitacoes').doc(id).delete();
    
    return NextResponse.json({ message: 'Licitação excluída com sucesso' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting licitacao ${id}:`, error);
     if (error.message.includes("Firestore Admin not initialized")) {
      return NextResponse.json({ message: "Backend database not configured.", error: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Erro ao excluir licitação', error: error.message }, { status: 500 });
  }
}
