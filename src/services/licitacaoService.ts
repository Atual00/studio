
'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel, Handshake, PlayCircle, Flag, MessageSquare } from 'lucide-react'; // Added PlayCircle, Flag, MessageSquare
import { parseISO, isValid, addMonths, setDate, differenceInSeconds, formatDistanceStrict, format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type User } from './userService';
import { fetchConfiguracoes } from './configuracoesService'; // For calculating due dates
import { fetchClientDetails as fetchServiceClientDetails } from './clientService'; // Renamed import
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
         disputaConfig: item.disputaConfig || {}, // Initialize if missing
         disputaLog: item.disputaLog ? { 
            ...item.disputaLog,
            iniciadaEm: parseDate(item.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(item.disputaLog.finalizadaEm),
            mensagens: (item.disputaLog.mensagens || []).map((m:any) => ({...m, timestamp: parseDate(m.timestamp)}))
         } : { mensagens: [] }, 
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
        disputaLog: item.disputaLog ? {
            ...item.disputaLog,
            iniciadaEm: item.disputaLog.iniciadaEm instanceof Date && isValid(item.disputaLog.iniciadaEm) ? item.disputaLog.iniciadaEm.toISOString() : null,
            finalizadaEm: item.disputaLog.finalizadaEm instanceof Date && isValid(item.disputaLog.finalizadaEm) ? item.disputaLog.finalizadaEm.toISOString() : null,
            mensagens: (item.disputaLog.mensagens || []).map(m => ({...m, timestamp: m.timestamp instanceof Date && isValid(m.timestamp) ? m.timestamp.toISOString() : null})),
        } : undefined,
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
        dataVencimento: parseDate(item.dataVencimento) as Date, 
        dataReferencia: parseDate(item.dataReferencia) as Date, 
      };
    });
  } catch (e) {
    console.error("Error parsing debitos from localStorage:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DEBITOS);
    return [];
  }
};

export const saveDebitosToStorage = (debitos: Debito[]): void => {
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
export interface DisputaConfig {
  limiteTipo?: 'valor' | 'percentual';
  limiteValor?: number; 
  valorCalculadoAteOndePodeChegar?: number;
}
export interface DisputaMensagem {
  id: string;
  timestamp: Date | string;
  texto: string;
  autor?: string; 
}

export interface DisputaLog {
  iniciadaEm?: Date | string;
  finalizadaEm?: Date | string;
  duracao?: string; 
  clienteVenceu?: boolean;
  posicaoCliente?: number;
  mensagens?: DisputaMensagem[]; 
}


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
  };
  disputaConfig?: DisputaConfig;
  disputaLog?: DisputaLog;
}

export type LicitacaoListItem = Pick<
    LicitacaoDetails,
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status' | 'orgaoComprador' | 'valorTotalLicitacao'
>;

export const statusMap: {[key: string]: {label: string; color: string; icon: React.ElementType}} = {
  AGUARDANDO_ANALISE: {label: 'Aguardando Análise', color: 'secondary', icon: Clock},
  EM_ANALISE: {label: 'Em Análise', color: 'info', icon: Loader2 },
  DOCUMENTACAO_CONCLUIDA: {label: 'Documentação OK', color: 'success', icon: CheckCircle},
  FALTA_DOCUMENTACAO: {label: 'Falta Documento', color: 'warning', icon: FileWarning},
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent', icon: PlayCircle},
  EM_DISPUTA: {label: 'Em Disputa', color: 'destructive', icon: Gavel}, 
  DISPUTA_CONCLUIDA: {label: 'Disputa Concluída', color: 'default', icon: Flag}, 
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
  id: string; 
  tipoDebito: 'LICITACAO' | 'AVULSO' | 'ACORDO_PARCELA';
  clienteNome: string;
  clienteCnpj?: string;
  descricao: string;
  valor: number; 
  dataVencimento: Date;
  dataReferencia: Date; 
  status: 'PENDENTE' | 'PAGO' | 'ENVIADO_FINANCEIRO' | 'PAGO_VIA_ACORDO'; 
  licitacaoNumero?: string; 
  acordoId?: string; 
  originalDebitoIds?: string[]; 
  
  jurosCalculado?: number;
}


// --- Service Functions ---

export const fetchLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  console.log('Fetching all licitações...');
  await new Promise(resolve => setTimeout(resolve, 350));
  const licitacoes = getLicitacoesFromStorage();
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador, valorTotalLicitacao }) => ({
    id,
    clienteNome,
    modalidade,
    numeroLicitacao,
    orgaoComprador,
    plataforma,
    dataInicio,
    dataMetaAnalise,
    status,
    valorTotalLicitacao,
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
          disputaConfig: licitacao.disputaConfig || {},
          disputaLog: licitacao.disputaLog ? {
            ...licitacao.disputaLog,
            iniciadaEm: parseDate(licitacao.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(licitacao.disputaLog.finalizadaEm),
            mensagens: (licitacao.disputaLog.mensagens || []).map(m => ({...m, timestamp: parseDate(m.timestamp) as Date})),
          } : { mensagens: [] },
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
    disputaConfig: {}, 
    disputaLog: { mensagens: [] }, 
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
      disputaConfig: data.disputaConfig ? { ...existingLicitacao.disputaConfig, ...data.disputaConfig } : existingLicitacao.disputaConfig,
      disputaLog: data.disputaLog ? {
          ...existingLicitacao.disputaLog,
          ...data.disputaLog,
          iniciadaEm: data.disputaLog.iniciadaEm ? parseUpdateDate(data.disputaLog.iniciadaEm) : existingLicitacao.disputaLog?.iniciadaEm,
          finalizadaEm: data.disputaLog.finalizadaEm ? parseUpdateDate(data.disputaLog.finalizadaEm) : existingLicitacao.disputaLog?.finalizadaEm,
          mensagens: data.disputaLog.mensagens ? data.disputaLog.mensagens.map(m => ({...m, timestamp: parseUpdateDate(m.timestamp) as Date })) : existingLicitacao.disputaLog?.mensagens || [],
      } : existingLicitacao.disputaLog,
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
        dataReferencia: updatedLicitacao.dataHomologacao, 
        status: 'PENDENTE', 
        licitacaoNumero: updatedLicitacao.numeroLicitacao,
    };

    if (existingDebitIndex !== -1) {
        
        const currentStatus = debitos[existingDebitIndex].status;
        debitos[existingDebitIndex] = {
             ...debitos[existingDebitIndex],
             ...debitData,
             status: currentStatus === 'PENDENTE' ? 'PENDENTE' : currentStatus 
        };
    } else {
        debitos.push(debitData);
    }
    saveDebitosToStorage(debitos);
  } else if (existingLicitacao.status === 'PROCESSO_HOMOLOGADO' && data.status && data.status !== 'PROCESSO_HOMOLOGADO') {
    
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
  await new Promise(resolve => setTimeout(resolve, 100)); 

  const licitacoes = getLicitacoesFromStorage();
  let debitos = getDebitosFromStorage();
  const config = await fetchConfiguracoes(); 

  let debitsModified = false;

  
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
        
      }
    }
  }

  if (debitsModified) {
    saveDebitosToStorage(debitos);
  }

  
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
        dataReferencia: new Date(), 
        status: 'PENDENTE',
        
    };

    debitos.push(newDebito);
    saveDebitosToStorage(debitos);
    return newDebito;
};

// Helper function to format elapsed time
export const formatElapsedTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export const generateAtaSessaoPDF = (
    lic: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    user: { username: string; fullName?: string; cpf?: string } | null
  ) => {
      const doc = new jsPDF();
      const hoje = formatDateFns(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const logoUrl = config?.logoUrl;
      const logoDim = 25;
      const margin = 14;
      let yPos = 20;

      // Header
      if (logoUrl) {
        try {
          const img = new Image();
          img.src = logoUrl;
          const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          if (imageType === "PNG" || imageType === "JPEG") {
            doc.addImage(img, imageType, margin, yPos - 5, logoDim, logoDim);
            yPos += logoDim - 5; 
          } else {
            console.warn("Formato do logo não suportado para PDF, pulando logo.");
            yPos +=5;
          }
        } catch (e) { console.error("Error adding logo:", e); yPos += 5; }
      } else {
        yPos += 5;
      }

      doc.setFontSize(16);
      doc.text("ATA DA SESSÃO DE DISPUTA", 105, yPos, { align: 'center' });
      yPos += 10;

      // Assessoria Info
      if (config) {
        doc.setFontSize(11);
        doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, margin, yPos);
        yPos += 6;
      }
      doc.setFontSize(10);
      doc.text(`Data da Geração: ${hoje}`, margin, yPos);
      yPos += 8;
      doc.setLineWidth(0.1); doc.line(margin, yPos, 196, yPos); yPos += 8;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Dados da Licitação:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const addDetail = (label: string, value: string | undefined | null) => {
        if (value !== undefined && value !== null) {
          doc.text(`${label}: ${value}`, margin, yPos); yPos += 6;
        }
      };
      addDetail("Protocolo", lic.id);
      addDetail("Cliente", lic.clienteNome);
      addDetail("Número Lic.", lic.numeroLicitacao);
      addDetail("Órgão", lic.orgaoComprador);
      addDetail("Modalidade", lic.modalidade);
      addDetail("Plataforma", lic.plataforma);
      addDetail("Valor Total Estimado", (lic.valorTotalLicitacao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      yPos += 4;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Configuração da Disputa (Limite Cliente):", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaConfig?.limiteTipo === 'valor') {
          addDetail("Tipo de Limite", "Valor Absoluto");
          addDetail("Valor Limite Definido", (lic.disputaConfig.limiteValor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      } else if (lic.disputaConfig?.limiteTipo === 'percentual') {
          addDetail("Tipo de Limite", "Percentual");
          addDetail("Percentual Definido", `${lic.disputaConfig.limiteValor || 0}%`);
          addDetail("Valor Calculado (Pode Chegar Até)", (lic.disputaConfig.valorCalculadoAteOndePodeChegar || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      } else {
          addDetail("Limite Cliente", "Não definido ou não aplicável.");
      }
      yPos += 4;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Registro da Disputa:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const formatDateLogAta = (date: Date | string | undefined) => date ? formatDateFns(date instanceof Date ? date : parseISO(date as string), "dd/MM/yyyy HH:mm:ss", {locale: ptBR}) : 'N/A';
      addDetail("Início da Disputa", formatDateLogAta(lic.disputaLog?.iniciadaEm));
      addDetail("Fim da Disputa", formatDateLogAta(lic.disputaLog?.finalizadaEm));
      addDetail("Duração Total", lic.disputaLog?.duracao || 'N/A');
      yPos += 4;
      
      // Mensagens da Disputa
      if (lic.disputaLog?.mensagens && lic.disputaLog.mensagens.length > 0) {
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text("Ocorrências da Sessão:", margin, yPos); yPos += 7;
        doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        lic.disputaLog.mensagens.forEach(msg => {
            const timestampStr = msg.timestamp ? formatDateFns(typeof msg.timestamp === 'string' ? parseISO(msg.timestamp) : msg.timestamp, "HH:mm:ss", {locale: ptBR}) : 'N/A';
            const textLines = doc.splitTextToSize(`[${timestampStr}] ${msg.autor || 'Sistema'}: ${msg.texto}`, 196 - (margin * 2));
            doc.text(textLines, margin, yPos);
            yPos += (textLines.length * 5); // Adjust based on line height
            if (yPos > 270) { doc.addPage(); yPos = 20; } // Basic pagination
        });
        yPos += 4;
      }


      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Resultado da Disputa:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaLog?.clienteVenceu) {
          addDetail("Resultado", "Cliente Venceu a Licitação");
      } else {
          addDetail("Resultado", "Cliente Não Venceu");
          addDetail("Posição Final do Cliente", lic.disputaLog?.posicaoCliente?.toString() || "Não informada");
      }
      yPos += 10;

      doc.text(`Sessão conduzida por: ${user?.fullName || user?.username || 'Usuário do Sistema'}`, margin, yPos); yPos +=6;
      if (user?.cpf) { doc.text(`CPF do Operador: ${user.cpf}`, margin, yPos); yPos +=6; }

      doc.save(`Ata_Disputa_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };
