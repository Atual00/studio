
'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel, Handshake, PlayCircle, Flag, MessageSquare } from 'lucide-react';
import { parseISO, isValid, addMonths, setDate, differenceInSeconds, format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type User } from './userService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from './configuracoesService';
import { fetchClientDetails as fetchServiceClientDetails } from './clientService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const LOCAL_STORAGE_KEY_LICITACOES = 'licitaxLicitacoes';
const LOCAL_STORAGE_KEY_DEBITOS = 'licitaxDebitos';

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
         // valorTotalLicitacao is removed
         valorPrimeiroColocado: typeof item.valorPrimeiroColocado === 'number' ? item.valorPrimeiroColocado : undefined,
         propostaItensPdfNome: item.propostaItensPdfNome || undefined,
         itensProposta: item.itensProposta || [],
         valorReferenciaEdital: typeof item.valorReferenciaEdital === 'number' ? item.valorReferenciaEdital : undefined,
         observacoesPropostaFinal: item.observacoesPropostaFinal || undefined,
         disputaConfig: item.disputaConfig || {},
         disputaLog: item.disputaLog ? {
            ...item.disputaLog,
            iniciadaEm: parseDate(item.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(item.disputaLog.finalizadaEm),
            mensagens: (item.disputaLog.mensagens || []).map((m:any) => ({...m, timestamp: parseDate(m.timestamp)})),
            itensPropostaFinalCliente: item.disputaLog.itensPropostaFinalCliente || [],
            valorFinalPropostaCliente: typeof item.disputaLog.valorFinalPropostaCliente === 'number' ? item.disputaLog.valorFinalPropostaCliente : undefined,
         } : { mensagens: [], itensPropostaFinalCliente: [] },
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
        // valorTotalLicitacao removed
        propostaItensPdfNome: item.propostaItensPdfNome,
        itensProposta: item.itensProposta,
        valorReferenciaEdital: item.valorReferenciaEdital,
        observacoesPropostaFinal: item.observacoesPropostaFinal,
        disputaLog: item.disputaLog ? {
            ...item.disputaLog,
            iniciadaEm: item.disputaLog.iniciadaEm instanceof Date && isValid(item.disputaLog.iniciadaEm) ? item.disputaLog.iniciadaEm.toISOString() : null,
            finalizadaEm: item.disputaLog.finalizadaEm instanceof Date && isValid(item.disputaLog.finalizadaEm) ? item.disputaLog.finalizadaEm.toISOString() : null,
            mensagens: (item.disputaLog.mensagens || []).map(m => ({...m, timestamp: m.timestamp instanceof Date && isValid(m.timestamp) ? m.timestamp.toISOString() : null})),
            itensPropostaFinalCliente: item.disputaLog.itensPropostaFinalCliente,
            valorFinalPropostaCliente: item.disputaLog.valorFinalPropostaCliente,
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
export interface PropostaItem {
  id: string;
  lote?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitarioFinalCliente?: number; // Client's final bid unit price
  valorTotalFinalCliente?: number;   // Calculated: quantidade * valorUnitarioFinalCliente
}

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
  valorFinalPropostaCliente?: number;
  itensPropostaFinalCliente?: PropostaItem[];
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
  // valorTotalLicitacao?: number; // REMOVED
  propostaItensPdfNome?: string; // ADDED - To store the name of the uploaded PDF
  itensProposta: PropostaItem[]; // ADDED - To store manually entered/transcribed proposal items
  valorReferenciaEdital?: number; // ADDED - Reference value from tender, set in dispute room
  observacoesPropostaFinal?: string; // ADDED - Observations for the final proposal

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
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status' | 'orgaoComprador' // valorTotalLicitacao removed
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
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador }) => ({ // valorTotalLicitacao removed
    id,
    clienteNome,
    modalidade,
    numeroLicitacao,
    orgaoComprador,
    plataforma,
    dataInicio,
    dataMetaAnalise,
    status,
    // valorTotalLicitacao, // REMOVED
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
          // valorTotalLicitacao removed
          propostaItensPdfNome: licitacao.propostaItensPdfNome,
          itensProposta: licitacao.itensProposta || [],
          valorReferenciaEdital: licitacao.valorReferenciaEdital,
          observacoesPropostaFinal: licitacao.observacoesPropostaFinal,
          disputaConfig: licitacao.disputaConfig || {},
          disputaLog: licitacao.disputaLog ? {
            ...licitacao.disputaLog,
            iniciadaEm: parseDate(licitacao.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(licitacao.disputaLog.finalizadaEm),
            mensagens: (licitacao.disputaLog.mensagens || []).map(m => ({...m, timestamp: parseDate(m.timestamp) as Date})),
            itensPropostaFinalCliente: licitacao.disputaLog.itensPropostaFinalCliente || [],
            valorFinalPropostaCliente: licitacao.disputaLog.valorFinalPropostaCliente,
          } : { mensagens: [], itensPropostaFinalCliente: [] },
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
    // valorTotalLicitacao: data.valorTotalLicitacao, // REMOVED
    propostaItensPdfNome: data.propostaItensPdf instanceof File ? data.propostaItensPdf.name : undefined, // Store filename
    itensProposta: [], // Initialize empty
    valorReferenciaEdital: undefined, // To be set in dispute room
    observacoesPropostaFinal: undefined,
    createdBy: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        cpf: currentUser.cpf,
    } : undefined,
    disputaConfig: {},
    disputaLog: { mensagens: [], itensPropostaFinalCliente: [] },
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
  }


  const parseUpdateDate = (date: Date | string | undefined): Date | undefined => {
      if (!date) return undefined;
      try {
          const parsed = typeof date === 'string' ? parseISO(date) : date;
          return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
      } catch { return undefined; }
  };

  // Handle propostaItensPdf if it's a File object (from form)
  let propostaItensPdfNomeToSet = existingLicitacao.propostaItensPdfNome;
  if (data.propostaItensPdf instanceof File) {
    propostaItensPdfNomeToSet = data.propostaItensPdf.name;
  } else if (data.hasOwnProperty('propostaItensPdfNome')) { // Allow explicitly setting/clearing the name
    propostaItensPdfNomeToSet = data.propostaItensPdfNome;
  }


  const updatedLicitacao: LicitacaoDetails = {
      ...existingLicitacao,
      ...data,
      propostaItensPdfNome: propostaItensPdfNomeToSet, // Use the determined name
      // Ensure File object for 'propostaItensPdf' is not spread into LicitacaoDetails
      propostaItensPdf: undefined, // Clear the File object from the data being merged

      dataHomologacao: homologationDateToSet instanceof Date ? homologationDateToSet : parseUpdateDate(homologationDateToSet),
      dataInicio: data.dataInicio ? parseUpdateDate(data.dataInicio) as Date : existingLicitacao.dataInicio as Date,
      dataMetaAnalise: data.dataMetaAnalise ? parseUpdateDate(data.dataMetaAnalise) as Date : existingLicitacao.dataMetaAnalise as Date,
      comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: parseUpdateDate(c.data) as Date })) : existingLicitacao.comentarios,
      valorCobrado: data.valorCobrado !== undefined ? Number(data.valorCobrado) : existingLicitacao.valorCobrado,
      // valorTotalLicitacao removed
      valorPrimeiroColocado: data.valorPrimeiroColocado !== undefined ? Number(data.valorPrimeiroColocado) : existingLicitacao.valorPrimeiroColocado,
      itensProposta: data.itensProposta || existingLicitacao.itensProposta,
      valorReferenciaEdital: data.valorReferenciaEdital !== undefined ? Number(data.valorReferenciaEdital) : existingLicitacao.valorReferenciaEdital,
      observacoesPropostaFinal: data.observacoesPropostaFinal || existingLicitacao.observacoesPropostaFinal,
      disputaConfig: data.disputaConfig ? { ...existingLicitacao.disputaConfig, ...data.disputaConfig } : existingLicitacao.disputaConfig,
      disputaLog: data.disputaLog ? {
          ...existingLicitacao.disputaLog,
          ...data.disputaLog,
          iniciadaEm: data.disputaLog.iniciadaEm ? parseUpdateDate(data.disputaLog.iniciadaEm) : existingLicitacao.disputaLog?.iniciadaEm,
          finalizadaEm: data.disputaLog.finalizadaEm ? parseUpdateDate(data.disputaLog.finalizadaEm) : existingLicitacao.disputaLog?.finalizadaEm,
          mensagens: data.disputaLog.mensagens ? data.disputaLog.mensagens.map(m => ({...m, timestamp: parseUpdateDate(m.timestamp) as Date })) : existingLicitacao.disputaLog?.mensagens || [],
          itensPropostaFinalCliente: data.disputaLog.itensPropostaFinalCliente || existingLicitacao.disputaLog?.itensPropostaFinalCliente || [],
          valorFinalPropostaCliente: data.disputaLog.valorFinalPropostaCliente !== undefined ? Number(data.disputaLog.valorFinalPropostaCliente) : existingLicitacao.disputaLog?.valorFinalPropostaCliente,
      } : existingLicitacao.disputaLog,
  };

  const updatedLicitacoes = [...licitacoes];
  updatedLicitacoes[licitacaoIndex] = updatedLicitacao;
  saveLicitacoesToStorage(updatedLicitacoes);

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
      addDetail("Valor Referência Edital", (lic.valorReferenciaEdital || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
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

      if (lic.disputaLog?.mensagens && lic.disputaLog.mensagens.length > 0) {
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text("Ocorrências da Sessão:", margin, yPos); yPos += 7;
        doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        lic.disputaLog.mensagens.forEach(msg => {
            const timestampStr = msg.timestamp ? formatDateFns(typeof msg.timestamp === 'string' ? parseISO(msg.timestamp) : msg.timestamp, "HH:mm:ss", {locale: ptBR}) : 'N/A';
            const textLines = doc.splitTextToSize(`[${timestampStr}] ${msg.autor || 'Sistema'}: ${msg.texto}`, 196 - (margin * 2));
            doc.text(textLines, margin, yPos);
            yPos += (textLines.length * 5);
            if (yPos > 270) { doc.addPage(); yPos = 20; }
        });
        yPos += 4;
      }

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Resultado da Disputa:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaLog?.clienteVenceu) {
          addDetail("Resultado", "Cliente Venceu a Licitação");
          if (lic.disputaLog.valorFinalPropostaCliente !== undefined) {
             addDetail("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
          }
      } else {
          addDetail("Resultado", "Cliente Não Venceu");
          addDetail("Posição Final do Cliente", lic.disputaLog?.posicaoCliente?.toString() || "Não informada");
           if (lic.disputaLog?.valorFinalPropostaCliente !== undefined) {
             addDetail("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
          }
      }
      yPos += 10;

      doc.text(`Sessão conduzida por: ${user?.fullName || user?.username || 'Usuário do Sistema'}`, margin, yPos); yPos +=6;
      if (user?.cpf) { doc.text(`CPF do Operador: ${user.cpf}`, margin, yPos); yPos +=6; }

      doc.save(`Ata_Disputa_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };

// New function to generate final proposal PDF
export const generatePropostaFinalPDF = (
    lic: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    user: { username: string; fullName?: string; cpf?: string } | null
  ) => {
    if (!lic.disputaLog?.itensPropostaFinalCliente || lic.disputaLog.itensPropostaFinalCliente.length === 0) {
        console.warn("Não há itens finais da proposta para gerar o PDF.");
        // Optionally, show a toast to the user here
        return;
    }

    const doc = new jsPDF();
    const hoje = formatDateFns(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const logoUrl = config?.logoUrl;
    const logoDim = 25;
    const margin = 14;
    let yPos = 20;

    // Header with Logo
    if (logoUrl) {
        try {
            const img = new Image();
            img.src = logoUrl;
            const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
            if (imageType === "PNG" || imageType === "JPEG") {
                doc.addImage(img, imageType, margin, yPos - 5, logoDim, logoDim);
            }
        } catch (e) { console.error("Error adding logo to Proposta PDF:", e); }
    }
    
    let textX = logoUrl ? margin + logoDim + 5 : margin;
    let headerTextY = logoUrl ? yPos + 5 : yPos + 5;

    if (config) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(config.nomeFantasia || config.razaoSocial, textX, headerTextY); headerTextY +=6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`CNPJ: ${config.cnpj}`, textX, headerTextY); headerTextY +=4;
        doc.text(`Email: ${config.email} | Tel: ${config.telefone}`, textX, headerTextY); headerTextY +=4;
        doc.text(`${config.enderecoRua}, ${config.enderecoNumero} - ${config.enderecoBairro}`, textX, headerTextY); headerTextY +=4;
        doc.text(`${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, headerTextY);
    }
    yPos = Math.max(yPos + logoDim + 2, headerTextY + 8);


    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text("PROPOSTA COMERCIAL", 105, yPos, { align: 'center' }); yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Licitação Nº: ${lic.numeroLicitacao}`, margin, yPos);
    doc.text(`Data: ${hoje}`, 196 - margin, yPos, {align: 'right'}); yPos += 7;
    doc.text(`Órgão Licitante: ${lic.orgaoComprador}`, margin, yPos); yPos += 7;
    doc.text(`Proponente: ${lic.clienteNome}`, margin, yPos); yPos += 10;

    doc.text("Prezados Senhores,", margin, yPos); yPos += 7;
    doc.text("Apresentamos nossa proposta para o fornecimento dos itens abaixo, conforme condições do edital:", margin, yPos, {maxWidth: 196 - margin*2 }); yPos += 10;


    const tableColumnStyles = {
      0: { cellWidth: 15 }, // Lote
      1: { cellWidth: 75 }, // Descrição
      2: { cellWidth: 15 }, // Unidade
      3: { cellWidth: 18 }, // Quantidade
      4: { cellWidth: 28, halign: 'right' }, // Vlr. Unit.
      5: { cellWidth: 28, halign: 'right' }, // Vlr. Total
    };

    autoTable(doc, {
        startY: yPos,
        head: [['Lote', 'Descrição do Item', 'Unid.', 'Qtd.', 'Vlr. Unit. (R$)', 'Vlr. Total (R$)']],
        body: (lic.disputaLog.itensPropostaFinalCliente || []).map(item => [
            item.lote || '-',
            item.descricao,
            item.unidade,
            item.quantidade.toLocaleString('pt-BR'),
            (item.valorUnitarioFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
            (item.valorTotalFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: tableColumnStyles,
        margin: { left: margin, right: margin },
        didDrawPage: (data) => { // Redraw header on new pages
             yPos = data.cursor?.y || 20;
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const totalProposta = (lic.disputaLog.valorFinalPropostaCliente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    doc.text(`VALOR TOTAL DA PROPOSTA: ${totalProposta}`, 196 - margin, yPos, { align: 'right' });
    yPos += 10;

    if (lic.observacoesPropostaFinal) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Observações Adicionais:", margin, yPos); yPos += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const obsLines = doc.splitTextToSize(lic.observacoesPropostaFinal, 196 - margin * 2);
        doc.text(obsLines, margin, yPos);
        yPos += obsLines.length * 5 + 5;
    }

    yPos = Math.max(yPos, 240); // Ensure space for signature
    if (yPos > 270) { doc.addPage(); yPos = 30; }


    doc.setFontSize(10);
    doc.text("________________________________________", margin, yPos); yPos += 5;
    doc.text(lic.clienteNome, margin, yPos); yPos += 5;
    const client = licitacoes.find(l => l.id === lic.id); // Assuming licitacoes is available or fetch client details
    if (client) {
        const clientDetails = getLicitacoesFromStorage().find(c => c.id === lic.id); // A bit redundant, improve if needed
        if (clientDetails) { // Ideally fetch full client details for CNPJ
            const cnpj = getClientsFromStorage().find(c => c.id === clientDetails.clienteId)?.cnpj;
             if(cnpj) doc.text(`CNPJ: ${cnpj}`, margin, yPos);
        }
    }


    doc.save(`Proposta_Final_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };


// Helper function to get client CNPJ - assuming you might want it elsewhere too
// You already have fetchServiceClientDetails which can be used.
// For simplicity in PDF, I'll try to use existing data or skip CNPJ if not readily available.

// Ensure all functions used by components are exported
// (fetchLicitacoes, fetchLicitacaoDetails, addLicitacao, updateLicitacao, deleteLicitacao, fetchDebitos, updateDebitoStatus, addDebitoAvulso)

// Add any other helper function that might be needed by more than one component if relevant.
// E.g., a more robust parseISO or date formatter if needed across the app.
const getClientsFromStorage = (): {id: string, cnpj?: string}[] => { // Simplified for example
  const storedData = localStorage.getItem('licitaxClients'); // Assuming this key stores ClientDetails[]
  try {
    const clients: LicitacaoDetails[] = storedData ? JSON.parse(storedData) : []; // This type is wrong here, should be ClientDetails
    // This is a placeholder, you need to fetch actual client details or adjust
    return clients.map(c => ({id: c.clienteId, cnpj: 'CNPJ_EXAMPLE'}));
  } catch {
    return [];
  }
}

// This is a placeholder for the global 'licitacoes' array which is not ideal.
// It's better to fetch client details by ID when needed, like already done in addLicitacao.
const licitacoes: LicitacaoDetails[] = getLicitacoesFromStorage();
```
    </content>
  </change>
  <change>
    <file>/src/components/licitacoes/licitacao-form.tsx</file>
    <content><![CDATA[
'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {useState, useEffect} from 'react';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Calendar as CalendarIcon, Loader2, Upload} from 'lucide-react'; // Added Upload

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';
import { type ClientListItem } from '@/services/clientService';

const modalities = ['Pregão Eletrônico', 'Tomada de Preços', 'Convite', 'Concorrência', 'Leilão', 'Dispensa Eletrônica', 'Concurso', 'RDC'];
const platforms = ['ComprasNet', 'Licitações-e (BB)', 'BEC/SP', 'BNC', 'BLL Compras', 'Portal de Compras Públicas', 'Outra Plataforma'];

const parseCurrencyString = (val: unknown): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val.match(/^R?\$\s?0([,.](0+))?$/) || val.trim() === '0') return 0;
    const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Zod schema for validation
const licitacaoFormSchema = z.object({
  clienteId: z.string({required_error: 'Selecione o cliente participante.'}).min(1, 'Selecione o cliente participante.'),
  modalidade: z.string({required_error: 'Selecione a modalidade da licitação.'}),
  numeroLicitacao: z.string().min(1, {message: 'Número da licitação é obrigatório.'}),
  orgaoComprador: z.string().min(1, {message: 'Órgão comprador é obrigatório.'}),
  plataforma: z.string({required_error: 'Selecione a plataforma onde ocorrerá.'}),
  dataInicio: z.date({required_error: 'Data e hora de início são obrigatórias.'}),
  dataMetaAnalise: z.date({required_error: 'Data meta para análise é obrigatória.'}),
  valorCobrado: z.preprocess(
    parseCurrencyString,
    z.number({required_error: 'Valor cobrado é obrigatório.', invalid_type_error: 'Valor cobrado deve ser um número.'}).min(0, { message: 'Valor deve ser zero ou positivo.' })
  ),
  // valorTotalLicitacao REMOVED
  propostaItensPdf: z.custom<File | undefined>((val) => val === undefined || val instanceof File, {
    message: "Arquivo de itens da proposta inválido. Deve ser um PDF.",
  }).refine(file => file ? file.type === "application/pdf" : true, "Arquivo deve ser um PDF.")
    .optional(),
  observacoes: z.string().optional(),
});

// Add a type that includes the File object for form handling,
// but LicitacaoDetails will store propostaItensPdfNome as string.
export type LicitacaoFormValues = z.infer<typeof licitacaoFormSchema>;


interface LicitacaoFormProps {
  clients: ClientListItem[];
  initialData?: Partial<LicitacaoFormValues & { dataInicio?: string | Date; dataMetaAnalise?: string | Date; propostaItensPdfNome?: string }>;
  onSubmit?: (data: LicitacaoFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function LicitacaoForm({clients, initialData, onSubmit, isSubmitting = false}: LicitacaoFormProps) {

  const parseInitialDate = (date: string | Date | undefined): Date | undefined => {
        if (!date) return undefined;
        try {
             const parsed = typeof date === 'string' ? parseISO(date) : date;
             return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
        } catch {
            return undefined;
        }
    };

  // State for managing the file input, as react-hook-form doesn't handle files directly well
  const [selectedPropostaFile, setSelectedPropostaFile] = useState<File | undefined>(undefined);
  const [propostaFileName, setPropostaFileName] = useState<string | undefined>(initialData?.propostaItensPdfNome);


  const form = useForm<LicitacaoFormValues>({
    resolver: zodResolver(licitacaoFormSchema),
    defaultValues: {
      clienteId: initialData?.clienteId || '',
      modalidade: initialData?.modalidade || undefined,
      numeroLicitacao: initialData?.numeroLicitacao || '',
      orgaoComprador: initialData?.orgaoComprador || '',
      plataforma: initialData?.plataforma || undefined,
      dataInicio: parseInitialDate(initialData?.dataInicio),
      dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
      valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
      // valorTotalLicitacao removed
      propostaItensPdf: undefined, // File object is not part of initial data directly
      observacoes: initialData?.observacoes || '',
    },
  });

    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                 clienteId: initialData?.clienteId || '',
                 modalidade: initialData?.modalidade || undefined,
                 orgaoComprador: initialData?.orgaoComprador || '',
                 plataforma: initialData?.plataforma || undefined,
                 dataInicio: parseInitialDate(initialData?.dataInicio),
                 dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
                 valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
                 observacoes: initialData?.observacoes || '',
            });
            setPropostaFileName(initialData.propostaItensPdfNome);
            // Note: We cannot pre-fill the file input for security reasons
            setSelectedPropostaFile(undefined);
        }
    }, [initialData, form]);


  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    if (value === 0) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
     const rawValue = e.target.value;
     if (rawValue.trim() === '0' || rawValue === 'R$ 0,00' || rawValue.replace(/[^0-9,]/g, '') === '0' || rawValue.replace(/[^0-9.]/g, '') === '0') {
          field.onChange(0);
          return;
      }
      const cleaned = rawValue.replace(/[^0-9]/g, '');
      if (cleaned === '') {
          field.onChange(undefined);
      } else {
          const parsedNum = parseInt(cleaned, 10) / 100;
          field.onChange(isNaN(parsedNum) ? undefined : parsedNum);
      }
   };

  const handlePropostaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type === "application/pdf") {
            setSelectedPropostaFile(file);
            setPropostaFileName(file.name);
            form.setValue('propostaItensPdf', file, { shouldValidate: true });
            form.clearErrors('propostaItensPdf');
        } else {
            setSelectedPropostaFile(undefined);
            setPropostaFileName(undefined);
            form.setValue('propostaItensPdf', undefined);
            form.setError('propostaItensPdf', { type: 'manual', message: 'Arquivo deve ser um PDF.' });
            event.target.value = ''; // Clear the input
        }
    } else {
        setSelectedPropostaFile(undefined);
        setPropostaFileName(undefined);
        form.setValue('propostaItensPdf', undefined);
    }
  };


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    console.log('Form Data (before sending to parent):', data);
    // The 'propostaItensPdf' field in 'data' will be the File object if selected.
    // The parent onSubmit (addLicitacao/updateLicitacao service) will handle using its name.

    if (onSubmit) {
      try {
        await onSubmit(data); // Pass the form data including the File object
      } catch (error) {
         console.error('Failed to submit licitação data:', error);
      }
    } else {
      console.warn('No onSubmit handler provided to LicitacaoForm.');
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="clienteId"
          render={({field}) => (
            <FormItem>
              <FormLabel>Cliente*</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente participante" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.cnpj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="modalidade"
            render={({field}) => (
              <FormItem>
                <FormLabel>Modalidade*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {modalities.map(mod => (
                      <SelectItem key={mod} value={mod}>
                        {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numeroLicitacao"
            render={({field}) => (
              <FormItem>
                <FormLabel>Número da Licitação*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Pregão 123/2024, TP 001/2024" {...field} value={field.value || ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="orgaoComprador"
            render={({field}) => (
              <FormItem>
                <FormLabel>Órgão Comprador*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Prefeitura Municipal de..., Ministério da..." {...field} value={field.value || ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="plataforma"
            render={({field}) => (
              <FormItem>
                <FormLabel>Plataforma*</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                   <FormControl>
                     <SelectTrigger>
                       <SelectValue placeholder="Onde a licitação ocorrerá" />
                     </SelectTrigger>
                   </FormControl>
                   <SelectContent>
                     {platforms.map(plat => (
                       <SelectItem key={plat} value={plat}>
                         {plat}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="valorCobrado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Cobrado (Assessoria)*</FormLabel>
                  <FormControl>
                    <Input
                     placeholder="R$ 0,00"
                     type="text"
                     value={field.value !== undefined ? formatCurrency(field.value) : ''}
                     onChange={(e) => handleCurrencyChange(e, field)}
                     onBlur={(e) => {
                        e.target.value = formatCurrency(field.value);
                     }}
                     disabled={isSubmitting}
                     inputMode="decimal"
                    />
                  </FormControl>
                   <FormDescription>Valor que será faturado para o cliente (pode ser R$ 0,00).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {/* REMOVED Valor Total Estimado (Licitação) Field */}

        <FormField
          control={form.control}
          name="propostaItensPdf"
          render={({ field /* Destructure field if you directly use its onChange, onBlur etc. */ }) => (
            <FormItem>
              <FormLabel htmlFor="propostaItensPdf">Itens da Proposta (PDF)</FormLabel>
              <FormControl>
                <Input
                  id="propostaItensPdf"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePropostaFileChange} // Use custom handler
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
              </FormControl>
              {propostaFileName && (
                <FormDescription className="text-xs text-muted-foreground">
                  Arquivo selecionado: {propostaFileName}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />


         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
              control={form.control}
              name="dataInicio"
              render={({ field }) => {
                const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Hora Início*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                           id={formItemId}
                           aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
                           aria-invalid={!!error}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy HH:mm", { locale: ptBR })
                          ) : (
                            <span>Selecione data e hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                             const currentTime = field.value instanceof Date ? { hours: field.value.getHours(), minutes: field.value.getMinutes() } : { hours: 9, minutes: 0 };
                             if (date) {
                                 date.setHours(currentTime.hours, currentTime.minutes, 0, 0);
                                 field.onChange(date);
                             } else {
                                 field.onChange(undefined);
                             }
                         }}
                        initialFocus
                         disabled={isSubmitting}
                      />
                       <div className="p-2 border-t">
                          <Label htmlFor="time-inicio" className="text-xs">Hora Início</Label>
                          <Input
                            id="time-inicio"
                            type="time"
                            defaultValue={field.value ? format(field.value, 'HH:mm') : '09:00'}
                            onChange={(e) => {
                              const time = e.target.value;
                              const currentValidDate = field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : new Date();
                              if (time) {
                                const [hours, minutes] = time.split(':').map(Number);
                                const newDate = new Date(currentValidDate);
                                newDate.setHours(hours, minutes, 0, 0);
                                field.onChange(newDate);
                              }
                            }}
                             disabled={isSubmitting}
                          />
                       </div>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data e hora de início da disputa/sessão.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}}
            />
             <FormField
              control={form.control}
              name="dataMetaAnalise"
              render={({ field }) => {
                const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Meta Análise*</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                           id={formItemId}
                           aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
                           aria-invalid={!!error}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data meta</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                            if (date) {
                                date.setHours(0, 0, 0, 0);
                                field.onChange(date);
                            } else {
                                field.onChange(undefined);
                            }
                        }}
                        initialFocus
                         disabled={isSubmitting}
                      />
                    </PopoverContent>
                  </Popover>
                   <FormDescription>
                    Prazo interno para análise e juntada de documentos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}}
            />
        </div>


        <FormField
            control={form.control}
            name="observacoes"
            render={({field}) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalhes importantes, links adicionais, objeto resumido, etc." className="min-h-[100px]" {...field} value={field.value || ''} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Confirmar e Salvar Licitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
