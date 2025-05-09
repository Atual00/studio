
'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel, Handshake } from 'lucide-react'; // Added Handshake
import { parseISO, isValid, addMonths, setDate } from 'date-fns';
import { type User } from './userService';
import { fetchConfiguracoes } from './configuracoesService'; // For calculating due dates
import { fetchClientDetails as fetchServiceClientDetails } from './clientService'; // Renamed import

const LOCAL_STORAGE_KEY_LICITACOES = 'licitaxLicitacoes';
const LOCAL_STORAGE_KEY_DEBITOS = 'licitaxDebitos'; // New key for all debits

// --- Helper Functions ---

const getLicitacoesFromStorage = (): LicitacaoDetails[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_LICITACOES);
  try {
    const items: any[] = storedData ? JSON.parse(storedData) : [];
     return items.map((item: any) => {
       const parseDate = (date: string | Date | undefined): Date | undefined => {
          if (!date) return undefined;
          try {
              const parsed = typeof date === 'string' ? parseISO(date) : date;
              return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
          } catch { return undefined; }
       };
       return {
         ...item,
         dataInicio: parseDate(item.dataInicio),
         dataMetaAnalise: parseDate(item.dataMetaAnalise),
         dataHomologacao: parseDate(item.dataHomologacao),
         comentarios: (item.comentarios || []).map((c:any) => ({...c, data: parseDate(c.data) })),
         checklist: typeof item.checklist === 'object' && item.checklist !== null ? item.checklist : {},
         valorCobrado: typeof item.valorCobrado === 'number' ? item.valorCobrado : 0,
         valorTotalLicitacao: typeof item.valorTotalLicitacao === 'number' ? item.valorTotalLicitacao : 0,
         valorPrimeiroColocado: typeof item.valorPrimeiroColocado === 'number' ? item.valorPrimeiroColocado : undefined,
       };
     }).filter(item => item.dataInicio instanceof Date);
  } catch (e) {
    console.error("Error parsing licitacoes from localStorage:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY_LICITACOES);
    return [];
  }
};

const saveLicitacoesToStorage = (licitacoes: LicitacaoDetails[]): void => {
   if (typeof window === 'undefined') return;
  try {
    const itemsToStore = licitacoes.map(item => ({
        ...item,
        dataInicio: item.dataInicio instanceof Date && isValid(item.dataInicio) ? item.dataInicio.toISOString() : null,
        dataMetaAnalise: item.dataMetaAnalise instanceof Date && isValid(item.dataMetaAnalise) ? item.dataMetaAnalise.toISOString() : null,
        dataHomologacao: item.dataHomologacao instanceof Date && isValid(item.dataHomologacao) ? item.dataHomologacao.toISOString() : null,
        comentarios: (item.comentarios || []).map(c => ({...c, data: c.data instanceof Date && isValid(c.data) ? c.data.toISOString() : null })),
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY_LICITACOES, JSON.stringify(itemsToStore));
  } catch (e) {
    console.error("Error saving licitacoes to localStorage:", e);
  }
};


const getDebitosFromStorage = (): Debito[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_DEBITOS);
  try {
    const items: any[] = storedData ? JSON.parse(storedData) : [];
    return items.map((item: any) => {
      const parseDate = (date: string | Date | undefined): Date | undefined => {
         if (!date) return undefined;
         try {
             const parsed = typeof date === 'string' ? parseISO(date) : date;
             return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
         } catch { return undefined; }
      };
      return {
        ...item,
        dataVencimento: parseDate(item.dataVencimento) as Date, // Should always be a valid date
        dataReferencia: parseDate(item.dataReferencia) as Date, // Should always be a valid date
      };
    });
  } catch (e) {
    console.error("Error parsing debitos from localStorage:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DEBITOS);
    return [];
  }
};

const saveDebitosToStorage = (debitos: Debito[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const itemsToStore = debitos.map(debito => ({
      ...debito,
      dataVencimento: debito.dataVencimento instanceof Date && isValid(debito.dataVencimento) ? debito.dataVencimento.toISOString() : null,
      dataReferencia: debito.dataReferencia instanceof Date && isValid(debito.dataReferencia) ? debito.dataReferencia.toISOString() : null,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY_DEBITOS, JSON.stringify(itemsToStore));
  } catch (e) {
    console.error("Error saving debitos to localStorage:", e);
  }
};


// --- Types and Constants ---

export interface LicitacaoDetails extends LicitacaoFormValues {
  id: string;
  clienteNome: string;
  status: string;
  checklist: { [key: string]: boolean };
  comentarios: { id: string, texto: string, data: Date | string, autor: string }[];
  valorPrimeiroColocado?: number;
  dataInicio: Date | string;
  dataMetaAnalise: Date | string;
  dataHomologacao?: Date | string;
  orgaoComprador: string;
  valorTotalLicitacao?: number;
  createdBy?: {
      userId?: string;
      username: string;
      fullName?: string;
      cpf?: string;
  }
}

export type LicitacaoListItem = Pick<
    LicitacaoDetails,
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status' | 'orgaoComprador'
>;

export const statusMap: {[key: string]: {label: string; color: string; icon: React.ElementType}} = {
  AGUARDANDO_ANALISE: {label: 'Aguardando Análise', color: 'secondary', icon: Clock},
  EM_ANALISE: {label: 'Em Análise', color: 'info', icon: Loader2 },
  DOCUMENTACAO_CONCLUIDA: {label: 'Documentação OK', color: 'success', icon: CheckCircle},
  FALTA_DOCUMENTACAO: {label: 'Falta Documento', color: 'warning', icon: FileWarning},
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent', icon: Gavel},
  EM_HOMOLOGACAO: {label: 'Em Homologação', color: 'default', icon: Target},
  AGUARDANDO_RECURSO: {label: 'Aguardando Recurso', color: 'outline', icon: HelpCircle},
  EM_PRAZO_CONTRARRAZAO: {label: 'Prazo Contrarrazão', color: 'outline', icon: CalendarCheck},
  PROCESSO_HOMOLOGADO: {label: 'Processo Homologado', color: 'success', icon: CheckCircle},
  PROCESSO_ENCERRADO: {label: 'Processo Encerrado', color: 'secondary', icon: XCircle},
  RECURSO_IMPUGNACAO: {label: 'Recurso/Impugnação', color: 'warning', icon: HelpCircle},
};

export const requiredDocuments = [
  { id: 'contratoSocial', label: 'Contrato Social/Req.Empresário/Estatuto' },
  { id: 'cnpjDoc', label: 'Cartão CNPJ' },
  { id: 'certidoesRegularidade', label: 'Certidões de Regularidade Fiscal (Fed/Est/Mun)' },
  { id: 'cndFgts', label: 'Certidão Negativa FGTS (CRF)' },
  { id: 'cndt', label: 'Certidão Negativa Débitos Trabalhistas (CNDT)' },
  { id: 'certidaoFalencia', label: 'Certidão Negativa Falência/Concordata' },
  { id: 'balancoPatrimonial', label: 'Balanço Patrimonial (último exercício)' },
  { id: 'qualificacaoTecnica', label: 'Qualificação Técnica (Atestados, etc.)' },
  { id: 'declaracoes', label: 'Declarações Diversas (conforme edital)' },
  { id: 'documentosSocio', label: 'Documentos Sócios (RG/CPF/Comprov. End.)' },
  { id: 'propostaComercial', label: 'Proposta Comercial' },
];

export interface Debito {
  id: string; // Can be LIC-ID for licitacao debits, AVULSO-ID for avulsos, PARCELA-ID for agreement installments
  tipoDebito: 'LICITACAO' | 'AVULSO' | 'ACORDO_PARCELA';
  clienteNome: string;
  clienteCnpj?: string;
  descricao: string;
  valor: number; // Original value for LICITACAO/AVULSO, installment value for ACORDO_PARCELA
  dataVencimento: Date;
  dataReferencia: Date; // Homologation date for LICITACAO, creation date for AVULSO/ACORDO_PARCELA
  status: 'PENDENTE' | 'PAGO' | 'ENVIADO_FINANCEIRO' | 'PAGO_VIA_ACORDO'; // PAGO_VIA_ACORDO for original debits settled by an agreement
  licitacaoNumero?: string; // Only for LICITACAO type, or a reference for ACORDO_PARCELA
  acordoId?: string; // Links installments to an agreement, or original debits to the agreement that settled them
  originalDebitoIds?: string[]; // For ACORDO_PARCELA, lists original debit IDs it covers
  // For display/calculation in UI, not stored persistently on Debito itself
  jurosCalculado?: number;
}


// --- Service Functions ---

export const fetchLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  console.log('Fetching all licitações...');
  await new Promise(resolve => setTimeout(resolve, 350));
  const licitacoes = getLicitacoesFromStorage();
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador }) => ({
    id,
    clienteNome,
    modalidade,
    numeroLicitacao,
    orgaoComprador,
    plataforma,
    dataInicio,
    dataMetaAnalise,
    status,
  }));
};

export const fetchLicitacaoDetails = async (id: string): Promise<LicitacaoDetails | null> => {
  console.log(`Fetching details for licitação ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 400));
  const licitacoes = getLicitacoesFromStorage();
  const licitacao = licitacoes.find(l => l.id === id);

   const parseDate = (date: Date | string | undefined): Date | undefined => {
       if (!date) return undefined;
       try {
           const parsed = typeof date === 'string' ? parseISO(date) : date;
           return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
       } catch { return undefined; }
   }

  if (licitacao) {
      return {
          ...licitacao,
          dataInicio: parseDate(licitacao.dataInicio) as Date,
          dataMetaAnalise: parseDate(licitacao.dataMetaAnalise) as Date,
          dataHomologacao: parseDate(licitacao.dataHomologacao),
          comentarios: (licitacao.comentarios || []).map(c => ({...c, data: parseDate(c.data) as Date })),
      };
  }
  return null;
};

export const addLicitacao = async (
    data: LicitacaoFormValues,
    currentUser?: { username: string; fullName?: string; cpf?: string } | null
): Promise<LicitacaoDetails | null> => {
  console.log("Adding new licitação:", data);
  await new Promise(resolve => setTimeout(resolve, 600));

  const client = await fetchServiceClientDetails(data.clienteId);
  if (!client) {
     throw new Error(`Cliente com ID ${data.clienteId} não encontrado.`);
  }

  const licitacoes = getLicitacoesFromStorage();
  const newLicitacao: LicitacaoDetails = {
    ...data,
    id: `LIC-${Date.now()}`,
    clienteNome: client.razaoSocial,
    status: 'AGUARDANDO_ANALISE',
    checklist: {},
    comentarios: [],
    dataInicio: data.dataInicio,
    dataMetaAnalise: data.dataMetaAnalise,
    dataHomologacao: undefined,
    valorPrimeiroColocado: undefined,
    orgaoComprador: data.orgaoComprador,
    valorTotalLicitacao: data.valorTotalLicitacao,
    createdBy: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        cpf: currentUser.cpf,
    } : undefined,
  };

  const updatedLicitacoes = [...licitacoes, newLicitacao];
  saveLicitacoesToStorage(updatedLicitacoes);
  return newLicitacao;
};

export const updateLicitacao = async (id: string, data: Partial<LicitacaoDetails>): Promise<boolean> => {
  console.log(`Updating licitação ID: ${id} with data:`, data);
  await new Promise(resolve => setTimeout(resolve, 300));

  const licitacoes = getLicitacoesFromStorage();
  const licitacaoIndex = licitacoes.findIndex(l => l.id === id);

  if (licitacaoIndex === -1) {
    console.error(`Licitação update failed: Licitação with ID ${id} not found.`);
    return false;
  }

  const existingLicitacao = licitacoes[licitacaoIndex];
  const wasHomologado = existingLicitacao.status === 'PROCESSO_HOMOLOGADO';
  const isNowHomologado = data.status === 'PROCESSO_HOMOLOGADO';

  let homologationDateToSet = existingLicitacao.dataHomologacao;
  if (isNowHomologado && !wasHomologado) {
      homologationDateToSet = new Date();
  } else if (data.status && data.status !== 'PROCESSO_HOMOLOGADO' && wasHomologado) {
      // If status changes from homologado to something else, clear homologation date? Or keep?
      // For now, let's keep it unless explicitly cleared or debit logic handles it.
  }


  const parseUpdateDate = (date: Date | string | undefined): Date | undefined => {
      if (!date) return undefined;
      try {
          const parsed = typeof date === 'string' ? parseISO(date) : date;
          return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
      } catch { return undefined; }
  };

  const updatedLicitacao: LicitacaoDetails = {
      ...existingLicitacao,
      ...data,
      dataHomologacao: homologationDateToSet instanceof Date ? homologationDateToSet : parseUpdateDate(homologationDateToSet),
      dataInicio: data.dataInicio ? parseUpdateDate(data.dataInicio) as Date : existingLicitacao.dataInicio as Date,
      dataMetaAnalise: data.dataMetaAnalise ? parseUpdateDate(data.dataMetaAnalise) as Date : existingLicitacao.dataMetaAnalise as Date,
      comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: parseUpdateDate(c.data) as Date })) : existingLicitacao.comentarios,
      valorCobrado: data.valorCobrado !== undefined ? Number(data.valorCobrado) : existingLicitacao.valorCobrado,
      valorTotalLicitacao: data.valorTotalLicitacao !== undefined ? Number(data.valorTotalLicitacao) : existingLicitacao.valorTotalLicitacao,
      valorPrimeiroColocado: data.valorPrimeiroColocado !== undefined ? Number(data.valorPrimeiroColocado) : existingLicitacao.valorPrimeiroColocado,
  };

  const updatedLicitacoes = [...licitacoes];
  updatedLicitacoes[licitacaoIndex] = updatedLicitacao;
  saveLicitacoesToStorage(updatedLicitacoes);

  // If status changed to PROCESSO_HOMOLOGADO, create or update a debit
  if (isNowHomologado && updatedLicitacao.dataHomologacao instanceof Date && isValid(updatedLicitacao.dataHomologacao)) {
    const debitos = getDebitosFromStorage();
    const existingDebitIndex = debitos.findIndex(d => d.id === id && d.tipoDebito === 'LICITACAO');
    const config = await fetchConfiguracoes();
    const dueDate = addMonths(updatedLicitacao.dataHomologacao, 1);
    const finalDueDate = setDate(dueDate, config.diaVencimentoPadrao || 15);

    const client = await fetchServiceClientDetails(updatedLicitacao.clienteId);

    const debitData: Debito = {
        id: updatedLicitacao.id,
        tipoDebito: 'LICITACAO',
        clienteNome: updatedLicitacao.clienteNome,
        clienteCnpj: client?.cnpj,
        descricao: `Serviços Licitação ${updatedLicitacao.numeroLicitacao}`,
        valor: updatedLicitacao.valorCobrado,
        dataVencimento: finalDueDate,
        dataReferencia: updatedLicitacao.dataHomologacao, // Homologation date as reference
        status: 'PENDENTE', // Default status for new debits
        licitacaoNumero: updatedLicitacao.numeroLicitacao,
    };

    if (existingDebitIndex !== -1) {
        // Update existing debit, but preserve status if it was already manually changed (e.g., to PAGO)
        const currentStatus = debitos[existingDebitIndex].status;
        debitos[existingDebitIndex] = {
             ...debitos[existingDebitIndex],
             ...debitData,
             status: currentStatus === 'PENDENTE' ? 'PENDENTE' : currentStatus // Only reset to PENDENTE if it was already PENDENTE.
        };
    } else {
        debitos.push(debitData);
    }
    saveDebitosToStorage(debitos);
  } else if (existingLicitacao.status === 'PROCESSO_HOMOLOGADO' && data.status && data.status !== 'PROCESSO_HOMOLOGADO') {
    // If licitacao is no longer homologado, remove the debit? Or mark it as cancelled?
    // For now, let's remove it if it was PENDENTE. If PAGO or ENVIADO_FINANCEIRO, it might need manual adjustment.
    const debitos = getDebitosFromStorage();
    const debitIndex = debitos.findIndex(d => d.id === id && d.tipoDebito === 'LICITACAO');
    if (debitIndex !== -1 && debitos[debitIndex].status === 'PENDENTE') {
        debitos.splice(debitIndex, 1);
        saveDebitosToStorage(debitos);
    }
  }

  return true;
};

export const deleteLicitacao = async (id: string): Promise<boolean> => {
  console.log(`Deleting licitação ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const licitacoes = getLicitacoesFromStorage();
  const updatedLicitacoes = licitacoes.filter(l => l.id !== id);

  if (licitacoes.length === updatedLicitacoes.length) {
    console.error(`Licitação delete failed: Licitação with ID ${id} not found.`);
    return false;
  }
  saveLicitacoesToStorage(updatedLicitacoes);

  // Also delete the associated debit
  const debitos = getDebitosFromStorage();
  const updatedDebitos = debitos.filter(d => !(d.id === id && d.tipoDebito === 'LICITACAO'));
  if (debitos.length !== updatedDebitos.length) {
      saveDebitosToStorage(updatedDebitos);
  }

  return true;
};

export const fetchDebitos = async (): Promise<Debito[]> => {
  console.log('Fetching all debitos...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Smaller delay, main work is local

  const licitacoes = getLicitacoesFromStorage();
  let debitos = getDebitosFromStorage();
  const config = await fetchConfiguracoes(); // For due date calculation

  let debitsModified = false;

  // Migration/Consistency Check: Ensure all homologated licitacoes have a debit
  for (const lic of licitacoes) {
    if (lic.status === 'PROCESSO_HOMOLOGADO' && lic.dataHomologacao instanceof Date && isValid(lic.dataHomologacao)) {
      const existingDebit = debitos.find(d => d.id === lic.id && d.tipoDebito === 'LICITACAO');
      if (!existingDebit) {
        console.log(`Creating missing debit for homologated licitacao ${lic.id}`);
        const client = await fetchServiceClientDetails(lic.clienteId);
        const dueDate = addMonths(lic.dataHomologacao, 1);
        const finalDueDate = setDate(dueDate, config.diaVencimentoPadrao || 15);

        debitos.push({
          id: lic.id,
          tipoDebito: 'LICITACAO',
          clienteNome: lic.clienteNome,
          clienteCnpj: client?.cnpj,
          descricao: `Serviços Licitação ${lic.numeroLicitacao}`,
          valor: lic.valorCobrado,
          dataVencimento: finalDueDate,
          dataReferencia: lic.dataHomologacao,
          status: 'PENDENTE',
          licitacaoNumero: lic.numeroLicitacao,
        });
        debitsModified = true;
      } else {
        // Optionally, ensure existing debit data is up-to-date (e.g., valorCobrado)
        // For simplicity, this example doesn't auto-update existing debit fields other than status.
      }
    }
  }

  if (debitsModified) {
    saveDebitosToStorage(debitos);
  }

  // Sort debitos by dataReferencia descending
  debitos.sort((a, b) => {
      const dateA = a.dataReferencia instanceof Date ? a.dataReferencia.getTime() : 0;
      const dateB = b.dataReferencia instanceof Date ? b.dataReferencia.getTime() : 0;
      return dateB - dateA;
  });

  return debitos;
};

export const updateDebitoStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO' | 'PAGO_VIA_ACORDO'): Promise<boolean> => {
  console.log(`Updating debit status for ID: ${id} to status: ${newStatus}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  try {
     const debitos = getDebitosFromStorage();
     const debitIndex = debitos.findIndex(d => d.id === id);
     if (debitIndex !== -1) {
         debitos[debitIndex].status = newStatus;
         saveDebitosToStorage(debitos);
         return true;
     }
     console.error(`Debit with ID ${id} not found for status update.`);
     return false;
  } catch (error) {
      console.error("Error updating debit status:", error);
      return false;
  }
};

export type DebitoAvulsoFormData = Omit<Debito, 'id' | 'tipoDebito' | 'dataReferencia' | 'status' | 'licitacaoNumero'>;

export const addDebitoAvulso = async (data: DebitoAvulsoFormData): Promise<Debito | null> => {
    console.log("Adding new debito avulso:", data);
    await new Promise(resolve => setTimeout(resolve, 400));

    if (!data.clienteNome || !data.descricao || data.valor === undefined || !(data.dataVencimento instanceof Date)) {
        throw new Error("Campos obrigatórios para débito avulso estão faltando ou inválidos.");
    }

    const debitos = getDebitosFromStorage();
    const newDebitId = `AVULSO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newDebito: Debito = {
        id: newDebitId,
        tipoDebito: 'AVULSO',
        clienteNome: data.clienteNome,
        clienteCnpj: data.clienteCnpj,
        descricao: data.descricao,
        valor: data.valor,
        dataVencimento: data.dataVencimento,
        dataReferencia: new Date(), // Creation date as reference date
        status: 'PENDENTE',
        // licitacaoNumero is not applicable for AVULSO
    };

    debitos.push(newDebito);
    saveDebitosToStorage(debitos);
    return newDebito;
};
