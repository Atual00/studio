
'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel, Handshake, PlayCircle, Flag, MessageSquare, FileArchive, UserCheck, UserX, ShieldQuestion, FileQuestion } from 'lucide-react'; // Added icons for Habilitação
import { parseISO, isValid, addMonths, setDate, differenceInSeconds, format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type User } from './userService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from './configuracoesService';
import { fetchClientDetails as fetchServiceClientDetails, type ClientDetails } from './clientService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const LOCAL_STORAGE_KEY_LICITACOES = 'licitaxLicitacoes';
const LOCAL_STORAGE_KEY_DEBITOS = 'licitaxDebitos';
const LOCAL_STORAGE_KEY_AGREEMENTS = 'licitaxAgreements';

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
         valorPrimeiroColocado: typeof item.valorPrimeiroColocado === 'number' ? item.valorPrimeiroColocado : undefined,
         propostaItensPdfNome: item.propostaItensPdfNome || undefined,
         itensProposta: item.itensProposta || [],
         valorReferenciaEdital: typeof item.valorReferenciaEdital === 'number' ? item.valorReferenciaEdital : undefined,
         observacoesPropostaFinal: item.observacoesPropostaFinal || undefined,
         createdBy: item.createdBy,
         disputaConfig: item.disputaConfig || {},
         disputaLog: item.disputaLog ? {
            ...item.disputaLog,
            iniciadaEm: parseDate(item.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(item.disputaLog.finalizadaEm),
            mensagens: (item.disputaLog.mensagens || []).map((m:any) => ({...m, timestamp: parseDate(m.timestamp)})),
            itensPropostaFinalCliente: item.disputaLog.itensPropostaFinalCliente || [],
            valorFinalPropostaCliente: typeof item.disputaLog.valorFinalPropostaCliente === 'number' ? item.disputaLog.valorFinalPropostaCliente : undefined,
         } : { mensagens: [], itensPropostaFinalCliente: [] },
         // Habilitação fields
         ataHabilitacaoConteudo: item.ataHabilitacaoConteudo || undefined, // Added
         dataResultadoHabilitacao: parseDate(item.dataResultadoHabilitacao),
         justificativaInabilitacao: item.justificativaInabilitacao,
         isEmRecursoHabilitacao: item.isEmRecursoHabilitacao,
         dataInicioRecursoHabilitacao: parseDate(item.dataInicioRecursoHabilitacao),
         prazoFinalRecursoHabilitacao: parseDate(item.prazoFinalRecursoHabilitacao),
         textoRecursoHabilitacao: item.textoRecursoHabilitacao,
         isEmContrarrazoesHabilitacao: item.isEmContrarrazoesHabilitacao,
         dataInicioContrarrazoesHabilitacao: parseDate(item.dataInicioContrarrazoesHabilitacao),
         prazoFinalContrarrazoesHabilitacao: parseDate(item.prazoFinalContrarrazoesHabilitacao),
         textoContrarrazoesHabilitacao: item.textoContrarrazoesHabilitacao,
         decisaoFinalRecursoHabilitacao: item.decisaoFinalRecursoHabilitacao,
         dataDecisaoFinalRecursoHabilitacao: parseDate(item.dataDecisaoFinalRecursoHabilitacao),
         obsDecisaoFinalRecursoHabilitacao: item.obsDecisaoFinalRecursoHabilitacao,
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
    const itemsToStore = licitacoes.map(item => {
        const parseDateForStorage = (date: Date | string | undefined | null): string | null => {
            if (!date) return null;
            const d = date instanceof Date ? date : parseISO(date as string);
            return isValid(d) ? d.toISOString() : null;
        };
        return {
            ...item,
            dataInicio: parseDateForStorage(item.dataInicio),
            dataMetaAnalise: parseDateForStorage(item.dataMetaAnalise),
            dataHomologacao: parseDateForStorage(item.dataHomologacao),
            comentarios: (item.comentarios || []).map(c => ({...c, data: parseDateForStorage(c.data) })),
            propostaItensPdfNome: item.propostaItensPdfNome,
            itensProposta: item.itensProposta,
            valorReferenciaEdital: item.valorReferenciaEdital,
            observacoesPropostaFinal: item.observacoesPropostaFinal,
            createdBy: item.createdBy,
            disputaConfig: item.disputaConfig,
            disputaLog: item.disputaLog ? {
                ...item.disputaLog,
                iniciadaEm: parseDateForStorage(item.disputaLog.iniciadaEm),
                finalizadaEm: parseDateForStorage(item.disputaLog.finalizadaEm),
                mensagens: (item.disputaLog.mensagens || []).map(m => ({...m, timestamp: parseDateForStorage(m.timestamp)})),
                itensPropostaFinalCliente: item.disputaLog.itensPropostaFinalCliente,
                valorFinalPropostaCliente: item.disputaLog.valorFinalPropostaCliente,
            } : undefined,
            // Habilitação fields
            ataHabilitacaoConteudo: item.ataHabilitacaoConteudo, // Added
            dataResultadoHabilitacao: parseDateForStorage(item.dataResultadoHabilitacao),
            justificativaInabilitacao: item.justificativaInabilitacao,
            isEmRecursoHabilitacao: item.isEmRecursoHabilitacao,
            dataInicioRecursoHabilitacao: parseDateForStorage(item.dataInicioRecursoHabilitacao),
            prazoFinalRecursoHabilitacao: parseDateForStorage(item.prazoFinalRecursoHabilitacao),
            textoRecursoHabilitacao: item.textoRecursoHabilitacao,
            isEmContrarrazoesHabilitacao: item.isEmContrarrazoesHabilitacao,
            dataInicioContrarrazoesHabilitacao: parseDateForStorage(item.dataInicioContrarrazoesHabilitacao),
            prazoFinalContrarrazoesHabilitacao: parseDateForStorage(item.prazoFinalContrarrazoesHabilitacao),
            textoContrarrazoesHabilitacao: item.textoContrarrazoesHabilitacao,
            decisaoFinalRecursoHabilitacao: item.decisaoFinalRecursoHabilitacao,
            dataDecisaoFinalRecursoHabilitacao: parseDateForStorage(item.dataDecisaoFinalRecursoHabilitacao),
            obsDecisaoFinalRecursoHabilitacao: item.obsDecisaoFinalRecursoHabilitacao,
        }
    });
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
  valorUnitarioEstimado?: number;
  valorUnitarioFinalCliente?: number;
  valorTotalFinalCliente?: number;
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
  clienteId: string;
  status: string;
  checklist: { [key: string]: boolean };
  comentarios: { id: string, texto: string, data: Date | string, autor: string }[];
  valorPrimeiroColocado?: number;
  dataInicio: Date | string;
  dataMetaAnalise: Date | string;
  dataHomologacao?: Date | string;
  orgaoComprador: string;
  propostaItensPdfNome?: string;
  itensProposta: PropostaItem[];
  valorReferenciaEdital?: number;
  observacoesPropostaFinal?: string;

  createdBy?: {
      userId?: string;
      username: string;
      fullName?: string;
      cpf?: string;
  };
  disputaConfig?: DisputaConfig;
  disputaLog?: DisputaLog;
  valorTotalLicitacao?: number;

  // Habilitação Fields
  ataHabilitacaoConteudo?: string; // Added for Qualification Meeting Minutes
  dataResultadoHabilitacao?: Date | string;
  justificativaInabilitacao?: string;
  isEmRecursoHabilitacao?: boolean;
  dataInicioRecursoHabilitacao?: Date | string;
  prazoFinalRecursoHabilitacao?: Date | string;
  textoRecursoHabilitacao?: string;
  isEmContrarrazoesHabilitacao?: boolean;
  dataInicioContrarrazoesHabilitacao?: Date | string;
  prazoFinalContrarrazoesHabilitacao?: Date | string;
  textoContrarrazoesHabilitacao?: string;
  decisaoFinalRecursoHabilitacao?: 'PROVIDO' | 'IMPROVIDO' | 'CONVERTIDO_EM_DILIGENCIA' | 'PENDENTE_JULGAMENTO';
  dataDecisaoFinalRecursoHabilitacao?: Date | string;
  obsDecisaoFinalRecursoHabilitacao?: string;
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
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent', icon: PlayCircle},
  EM_DISPUTA: {label: 'Em Disputa', color: 'destructive', icon: Gavel},
  DISPUTA_CONCLUIDA: {label: 'Disputa Concluída', color: 'default', icon: Flag},
  EM_HABILITACAO: {label: 'Em Habilitação', color: 'info', icon: FileArchive},
  HABILITADO: {label: 'Habilitado', color: 'success', icon: UserCheck},
  INABILITADO: {label: 'Inabilitado', color: 'destructive', icon: UserX},
  RECURSO_HABILITACAO: {label: 'Recurso (Habilitação)', color: 'warning', icon: ShieldQuestion},
  CONTRARRAZOES_HABILITACAO: {label: 'Contrarrazões (Habilitação)', color: 'warning', icon: FileQuestion},
  AGUARDANDO_RECURSO: {label: 'Aguardando Recurso (Geral)', color: 'outline', icon: HelpCircle}, // Could be for qualification or other appeal
  EM_PRAZO_CONTRARRAZAO: {label: 'Prazo Contrarrazão (Geral)', color: 'outline', icon: CalendarCheck}, // Could be for qualification or other counter-appeal
  EM_RECURSO_GERAL: {label: 'Em Recurso (Geral)', color: 'warning', icon: ShieldQuestion},
  EM_CONTRARRAZAO_GERAL: {label: 'Em Contrarrazão (Geral)', color: 'warning', icon: FileQuestion},
  EM_HOMOLOGACAO: {label: 'Em Homologação', color: 'default', icon: Target},
  PROCESSO_HOMOLOGADO: {label: 'Processo Homologado', color: 'success', icon: CheckCircle},
  PROCESSO_ENCERRADO: {label: 'Processo Encerrado', color: 'secondary', icon: XCircle},
  // RECURSO_IMPUGNACAO: {label: 'Recurso/Impugnação (Geral)', color: 'warning', icon: HelpCircle}, // This seems redundant with EM_RECURSO_GERAL
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

export interface AcordoDetalhes {
    id: string;
    clienteNome: string;
    clienteCnpj?: string;
    debitosOriginais: (Debito & { jurosCalculado?: number })[];
    descontoConcedido: number;
    valorFinalAcordo: number;
    numeroParcelas: number;
    tipoParcelamento: 'unica' | 'mensal' | 'quinzenal' | 'semanal';
    dataVencimentoPrimeiraParcela: Date | string;
    observacoes?: string;
    dataCriacao: Date | string;
    parcelasGeradasIds: string[];
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

export const fetchActiveLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  console.log('Fetching active licitações...');
  await new Promise(resolve => setTimeout(resolve, 300));
  const licitacoes = getLicitacoesFromStorage();
  const finalizedStatuses = ['PROCESSO_HOMOLOGADO', 'PROCESSO_ENCERRADO'];
  return licitacoes
    .filter(lic => !finalizedStatuses.includes(lic.status))
    .map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador }) => ({
      id,
      clienteNome,
      modalidade,
      numeroLicitacao,
      orgaoComprador,
      plataforma,
      dataInicio,
      dataMetaAnalise,
      status,
    }))
    .sort((a, b) => { // Sort by most recent dataInicio first
        const dateA = a.dataInicio instanceof Date ? a.dataInicio : parseISO(a.dataInicio as string);
        const dateB = b.dataInicio instanceof Date ? b.dataInicio : parseISO(b.dataInicio as string);
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;
        return dateB.getTime() - dateA.getTime();
    });
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
          propostaItensPdfNome: licitacao.propostaItensPdfNome,
          itensProposta: licitacao.itensProposta || [],
          valorReferenciaEdital: licitacao.valorReferenciaEdital,
          observacoesPropostaFinal: licitacao.observacoesPropostaFinal,
          createdBy: licitacao.createdBy,
          disputaConfig: licitacao.disputaConfig || {},
          disputaLog: licitacao.disputaLog ? {
            ...licitacao.disputaLog,
            iniciadaEm: parseDate(licitacao.disputaLog.iniciadaEm),
            finalizadaEm: parseDate(licitacao.disputaLog.finalizadaEm),
            mensagens: (licitacao.disputaLog.mensagens || []).map(m => ({...m, timestamp: parseDate(m.timestamp) as Date})),
            itensPropostaFinalCliente: licitacao.disputaLog.itensPropostaFinalCliente || [],
            valorFinalPropostaCliente: licitacao.disputaLog.valorFinalPropostaCliente,
          } : { mensagens: [], itensPropostaFinalCliente: [] },
          // Habilitação fields
          ataHabilitacaoConteudo: licitacao.ataHabilitacaoConteudo,
          dataResultadoHabilitacao: parseDate(licitacao.dataResultadoHabilitacao),
          justificativaInabilitacao: licitacao.justificativaInabilitacao,
          isEmRecursoHabilitacao: licitacao.isEmRecursoHabilitacao,
          dataInicioRecursoHabilitacao: parseDate(licitacao.dataInicioRecursoHabilitacao),
          prazoFinalRecursoHabilitacao: parseDate(licitacao.prazoFinalRecursoHabilitacao),
          textoRecursoHabilitacao: licitacao.textoRecursoHabilitacao,
          isEmContrarrazoesHabilitacao: licitacao.isEmContrarrazoesHabilitacao,
          dataInicioContrarrazoesHabilitacao: parseDate(licitacao.dataInicioContrarrazoesHabilitacao),
          prazoFinalContrarrazoesHabilitacao: parseDate(licitacao.prazoFinalContrarrazoesHabilitacao),
          textoContrarrazoesHabilitacao: licitacao.textoContrarrazoesHabilitacao,
          decisaoFinalRecursoHabilitacao: licitacao.decisaoFinalRecursoHabilitacao,
          dataDecisaoFinalRecursoHabilitacao: parseDate(licitacao.dataDecisaoFinalRecursoHabilitacao),
          obsDecisaoFinalRecursoHabilitacao: licitacao.obsDecisaoFinalRecursoHabilitacao,
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
    clienteId: data.clienteId,
    clienteNome: client.razaoSocial,
    status: 'AGUARDANDO_ANALISE',
    checklist: {},
    comentarios: [],
    dataInicio: data.dataInicio,
    dataMetaAnalise: data.dataMetaAnalise,
    dataHomologacao: undefined,
    valorPrimeiroColocado: undefined,
    orgaoComprador: data.orgaoComprador,
    propostaItensPdfNome: data.propostaItensPdf instanceof File ? data.propostaItensPdf.name : undefined,
    itensProposta: [],
    valorReferenciaEdital: undefined,
    observacoesPropostaFinal: undefined,
    createdBy: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        cpf: currentUser.cpf,
    } : undefined,
    disputaConfig: {},
    disputaLog: { mensagens: [], itensPropostaFinalCliente: [] },
     // Initialize Habilitação fields
    ataHabilitacaoConteudo: undefined,
    dataResultadoHabilitacao: undefined,
    justificativaInabilitacao: undefined,
    isEmRecursoHabilitacao: false,
    dataInicioRecursoHabilitacao: undefined,
    prazoFinalRecursoHabilitacao: undefined,
    textoRecursoHabilitacao: undefined,
    isEmContrarrazoesHabilitacao: false,
    dataInicioContrarrazoesHabilitacao: undefined,
    prazoFinalContrarrazoesHabilitacao: undefined,
    textoContrarrazoesHabilitacao: undefined,
    decisaoFinalRecursoHabilitacao: undefined,
    dataDecisaoFinalRecursoHabilitacao: undefined,
    obsDecisaoFinalRecursoHabilitacao: undefined,
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


  const parseUpdateDate = (date: Date | string | undefined | null): Date | undefined => { // Allow null
      if (date === null) return undefined; // Treat null as undefined for parsing
      if (!date) return undefined;
      try {
          const parsed = typeof date === 'string' ? parseISO(date) : date;
          return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
      } catch { return undefined; }
  };

  let propostaItensPdfNomeToSet = existingLicitacao.propostaItensPdfNome;
  if (data.propostaItensPdf instanceof File) {
    propostaItensPdfNomeToSet = data.propostaItensPdf.name;
  } else if (data.hasOwnProperty('propostaItensPdfNome')) {
    propostaItensPdfNomeToSet = data.propostaItensPdfNome;
  }


  const updatedLicitacao: LicitacaoDetails = {
      ...existingLicitacao,
      ...data,
      propostaItensPdfNome: propostaItensPdfNomeToSet,
      propostaItensPdf: undefined, // Clear the File object after using its name
      dataHomologacao: homologationDateToSet instanceof Date ? homologationDateToSet : parseUpdateDate(homologationDateToSet),
      dataInicio: data.dataInicio ? parseUpdateDate(data.dataInicio) as Date : existingLicitacao.dataInicio as Date,
      dataMetaAnalise: data.dataMetaAnalise ? parseUpdateDate(data.dataMetaAnalise) as Date : existingLicitacao.dataMetaAnalise as Date,
      comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: parseUpdateDate(c.data) as Date })) : existingLicitacao.comentarios,
      valorCobrado: data.valorCobrado !== undefined ? Number(data.valorCobrado) : existingLicitacao.valorCobrado,
      valorPrimeiroColocado: data.valorPrimeiroColocado !== undefined ? Number(data.valorPrimeiroColocado) : existingLicitacao.valorPrimeiroColocado,
      itensProposta: data.itensProposta || existingLicitacao.itensProposta,
      valorReferenciaEdital: data.valorReferenciaEdital !== undefined ? Number(data.valorReferenciaEdital) : existingLicitacao.valorReferenciaEdital,
      observacoesPropostaFinal: data.observacoesPropostaFinal || existingLicitacao.observacoesPropostaFinal,
      createdBy: data.createdBy || existingLicitacao.createdBy,
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
      // Habilitação fields merge
      ataHabilitacaoConteudo: data.hasOwnProperty('ataHabilitacaoConteudo') ? data.ataHabilitacaoConteudo : existingLicitacao.ataHabilitacaoConteudo,
      dataResultadoHabilitacao: data.hasOwnProperty('dataResultadoHabilitacao') ? parseUpdateDate(data.dataResultadoHabilitacao) : existingLicitacao.dataResultadoHabilitacao,
      justificativaInabilitacao: data.hasOwnProperty('justificativaInabilitacao') ? data.justificativaInabilitacao : existingLicitacao.justificativaInabilitacao,
      isEmRecursoHabilitacao: data.hasOwnProperty('isEmRecursoHabilitacao') ? data.isEmRecursoHabilitacao : existingLicitacao.isEmRecursoHabilitacao,
      dataInicioRecursoHabilitacao: data.hasOwnProperty('dataInicioRecursoHabilitacao') ? parseUpdateDate(data.dataInicioRecursoHabilitacao) : existingLicitacao.dataInicioRecursoHabilitacao,
      prazoFinalRecursoHabilitacao: data.hasOwnProperty('prazoFinalRecursoHabilitacao') ? parseUpdateDate(data.prazoFinalRecursoHabilitacao) : existingLicitacao.prazoFinalRecursoHabilitacao,
      textoRecursoHabilitacao: data.hasOwnProperty('textoRecursoHabilitacao') ? data.textoRecursoHabilitacao : existingLicitacao.textoRecursoHabilitacao,
      isEmContrarrazoesHabilitacao: data.hasOwnProperty('isEmContrarrazoesHabilitacao') ? data.isEmContrarrazoesHabilitacao : existingLicitacao.isEmContrarrazoesHabilitacao,
      dataInicioContrarrazoesHabilitacao: data.hasOwnProperty('dataInicioContrarrazoesHabilitacao') ? parseUpdateDate(data.dataInicioContrarrazoesHabilitacao) : existingLicitacao.dataInicioContrarrazoesHabilitacao,
      prazoFinalContrarrazoesHabilitacao: data.hasOwnProperty('prazoFinalContrarrazoesHabilitacao') ? parseUpdateDate(data.prazoFinalContrarrazoesHabilitacao) : existingLicitacao.prazoFinalContrarrazoesHabilitacao,
      textoContrarrazoesHabilitacao: data.hasOwnProperty('textoContrarrazoesHabilitacao') ? data.textoContrarrazoesHabilitacao : existingLicitacao.textoContrarrazoesHabilitacao,
      decisaoFinalRecursoHabilitacao: data.decisaoFinalRecursoHabilitacao || existingLicitacao.decisaoFinalRecursoHabilitacao,
      dataDecisaoFinalRecursoHabilitacao: data.hasOwnProperty('dataDecisaoFinalRecursoHabilitacao') ? parseUpdateDate(data.dataDecisaoFinalRecursoHabilitacao) : existingLicitacao.dataDecisaoFinalRecursoHabilitacao,
      obsDecisaoFinalRecursoHabilitacao: data.hasOwnProperty('obsDecisaoFinalRecursoHabilitacao') ? data.obsDecisaoFinalRecursoHabilitacao : existingLicitacao.obsDecisaoFinalRecursoHabilitacao,
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
  const updatedDebitos = debitos.filter(d => !(d.id === id && d.tipoDebito === 'LICITACAO' && d.status === 'PENDENTE'));
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
    const existingDebitIndex = debitos.findIndex(d => d.id === lic.id && d.tipoDebito === 'LICITACAO');

    if (lic.status === 'PROCESSO_HOMOLOGADO' && lic.dataHomologacao instanceof Date && isValid(lic.dataHomologacao)) {
      const client = await fetchServiceClientDetails(lic.clienteId);
      const dueDate = addMonths(lic.dataHomologacao, 1);
      const finalDueDate = setDate(dueDate, config.diaVencimentoPadrao || 15);

      const debitData: Partial<Debito> = {
        tipoDebito: 'LICITACAO',
        clienteNome: lic.clienteNome,
        clienteCnpj: client?.cnpj,
        descricao: `Serviços Licitação ${lic.numeroLicitacao}`,
        valor: lic.valorCobrado,
        dataVencimento: finalDueDate,
        dataReferencia: lic.dataHomologacao,
        licitacaoNumero: lic.numeroLicitacao,
      };

      if (existingDebitIndex !== -1) {
        const currentStatus = debitos[existingDebitIndex].status;
        debitos[existingDebitIndex] = {
          ...debitos[existingDebitIndex],
          ...debitData,
          status: currentStatus === 'PENDENTE' ? 'PENDENTE' : currentStatus,
        } as Debito;
        debitsModified = true;
      } else {
        debitos.push({
          id: lic.id,
          ...debitData,
          status: 'PENDENTE',
        } as Debito);
        debitsModified = true;
      }
    } else if (existingDebitIndex !== -1 && debitos[existingDebitIndex].status === 'PENDENTE') {
      debitos.splice(existingDebitIndex, 1);
      debitsModified = true;
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

export type DebitoAvulsoFormData = Omit<Debito, 'id' | 'tipoDebito' | 'dataReferencia' | 'status' | 'licitacaoNumero' | 'acordoId' | 'originalDebitoIds' | 'jurosCalculado'>;


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


// --- Helper for saving and fetching agreement details ---
const getAgreementsFromStorage = (): AcordoDetalhes[] => {
    if (typeof window === 'undefined') return [];
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_AGREEMENTS);
    try {
        return storedData ? JSON.parse(storedData) : [];
    } catch (e) {
        console.error("Error parsing agreements from localStorage:", e);
        return [];
    }
};

export const saveAgreementDetails = (agreement: AcordoDetalhes): void => {
    if (typeof window === 'undefined') return;
    const agreements = getAgreementsFromStorage();
    const existingIndex = agreements.findIndex(a => a.id === agreement.id);
    if (existingIndex !== -1) {
        agreements[existingIndex] = agreement;
    } else {
        agreements.push(agreement);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_AGREEMENTS, JSON.stringify(agreements));
};

export const fetchAcordoDetalhes = async (acordoId: string): Promise<AcordoDetalhes | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const agreements = getAgreementsFromStorage();
    return agreements.find(a => a.id === acordoId) || null;
};

// --- PDF Generation Helpers ---

const MARGIN = 14;
const LINE_HEIGHT = 5; // Approx line height for 10-11pt font

const addTextAndPaginate = (
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    options: any, // jsPDF text options
    pageContentHeight: number,
    drawPageHeader: () => number // Function to draw header and return new yPos
): number => {
    const textLines = doc.splitTextToSize(text, (options?.maxWidth || (doc.internal.pageSize.getWidth() - MARGIN * 2)));
    let currentY = y;
    textLines.forEach((line: string) => {
        if (currentY + LINE_HEIGHT > pageContentHeight) {
            doc.addPage();
            currentY = drawPageHeader();
        }
        doc.text(line, x, currentY, options);
        currentY += LINE_HEIGHT;
    });
    return currentY;
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
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentHeight = pageHeight - MARGIN * 2;
      let yPos = MARGIN + 5;

      const drawHeader = (): number => {
          let currentY = MARGIN + 5;
          if (logoUrl) {
            try {
              const img = new Image();
              img.src = logoUrl;
              const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
              if (imageType === "PNG" || imageType === "JPEG") {
                doc.addImage(img, imageType, MARGIN, currentY - 5, logoDim, logoDim);
                currentY = MARGIN + logoDim;
              }
            } catch (e) { console.error("Error adding logo:", e); }
          }
          doc.setFontSize(16);
          doc.text("ATA DA SESSÃO DE DISPUTA", pageWidth / 2, currentY, { align: 'center' });
          currentY += 10;

          if (config) {
            doc.setFontSize(11);
            doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, MARGIN, currentY);
            currentY += 6;
          }
          doc.setFontSize(10);
          doc.text(`Data da Geração: ${hoje}`, MARGIN, currentY);
          currentY += 8;
          doc.setLineWidth(0.1); doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY); currentY += 8;
          return currentY;
      };

      yPos = drawHeader();

      const addDetailLine = (label: string, value: string | undefined | null) => {
        if (value === undefined || value === null) value = 'N/A';
        const text = `${label}: ${value}`;
        yPos = addTextAndPaginate(doc, text, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawHeader);
      };

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      addDetailLine("Dados da Licitação", "");
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);

      addDetailLine("Protocolo", lic.id);
      addDetailLine("Cliente", lic.clienteNome);
      addDetailLine("Número Lic.", lic.numeroLicitacao);
      addDetailLine("Órgão", lic.orgaoComprador);
      addDetailLine("Modalidade", lic.modalidade);
      addDetailLine("Plataforma", lic.plataforma);
      addDetailLine("Valor Referência Edital", (lic.valorReferenciaEdital || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      yPos += 4;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      addDetailLine("Configuração da Disputa (Limite Cliente)", "");
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaConfig?.limiteTipo === 'valor') {
          addDetailLine("Tipo de Limite", "Valor Absoluto");
          addDetailLine("Valor Limite Definido", (lic.disputaConfig.limiteValor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      } else if (lic.disputaConfig?.limiteTipo === 'percentual') {
          addDetailLine("Tipo de Limite", "Percentual");
          addDetailLine("Percentual Definido", `${lic.disputaConfig.limiteValor || 0}%`);
          addDetailLine("Valor Calculado (Pode Chegar Até)", (lic.disputaConfig.valorCalculadoAteOndePodeChegar || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      } else {
          addDetailLine("Limite Cliente", "Não definido ou não aplicável.");
      }
      yPos += 4;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      addDetailLine("Registro da Disputa", "");
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const formatDateLogAta = (date: Date | string | undefined) => date ? formatDateFns(date instanceof Date ? date : parseISO(date as string), "dd/MM/yyyy HH:mm:ss", {locale: ptBR}) : 'N/A';
      addDetailLine("Início da Disputa", formatDateLogAta(lic.disputaLog?.iniciadaEm));
      addDetailLine("Fim da Disputa", formatDateLogAta(lic.disputaLog?.finalizadaEm));
      addDetailLine("Duração Total", lic.disputaLog?.duracao || 'N/A');
      yPos += 4;

      if (lic.disputaLog?.mensagens && lic.disputaLog.mensagens.length > 0) {
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        addDetailLine("Ocorrências da Sessão","");
        doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        lic.disputaLog.mensagens.forEach(msg => {
            const timestampStr = msg.timestamp ? formatDateFns(typeof msg.timestamp === 'string' ? parseISO(msg.timestamp) : msg.timestamp, "HH:mm:ss", {locale: ptBR}) : 'N/A';
            const textContent = `[${timestampStr}] ${msg.autor || 'Sistema'}: ${msg.texto}`;
            yPos = addTextAndPaginate(doc, textContent, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawHeader);
        });
        yPos += 4;
      }

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      addDetailLine("Resultado da Disputa","");
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaLog?.clienteVenceu) {
          addDetailLine("Resultado", "Cliente Venceu a Licitação");
          if (lic.disputaLog.valorFinalPropostaCliente !== undefined) {
             addDetailLine("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
          }
      } else {
          addDetailLine("Resultado", "Cliente Não Venceu");
          addDetailLine("Posição Final do Cliente", lic.disputaLog?.posicaoCliente?.toString() || "Não informada");
           if (lic.disputaLog?.valorFinalPropostaCliente !== undefined) {
             addDetailLine("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
          }
      }
      yPos += 10;

      yPos = addTextAndPaginate(doc, `Sessão conduzida por: ${user?.fullName || user?.username || 'Usuário do Sistema'}`, MARGIN, yPos, {}, contentHeight, drawHeader);
      if (user?.cpf) {
         yPos = addTextAndPaginate(doc, `CPF do Operador: ${user.cpf}`, MARGIN, yPos, {}, contentHeight, drawHeader);
      }

      doc.save(`Ata_Disputa_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };

export const generatePropostaFinalPDF = async (
    lic: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    user: { username: string; fullName?: string; cpf?: string } | null
  ) => {
    if (!lic.disputaLog?.itensPropostaFinalCliente || lic.disputaLog.itensPropostaFinalCliente.length === 0) {
        console.warn("Não há itens finais da proposta para gerar o PDF.");
        return;
    }

    const clientDetails = await fetchServiceClientDetails(lic.clienteId);

    const doc = new jsPDF();
    const hoje = formatDateFns(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentHeight = pageHeight - MARGIN * 2;
    let yPos = MARGIN + 5;

    const drawClientHeaderPDF = (): number => {
        let currentY = MARGIN + 5;
        if (clientDetails) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(clientDetails.razaoSocial, MARGIN, currentY); currentY +=6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.text(`CNPJ: ${clientDetails.cnpj}`, MARGIN, currentY); currentY +=4;
            doc.text(`Email: ${clientDetails.email} | Tel: ${clientDetails.telefone}`, MARGIN, currentY); currentY +=4;
            doc.text(`${clientDetails.enderecoRua}, ${clientDetails.enderecoNumero}${clientDetails.enderecoComplemento ? ' - '+clientDetails.enderecoComplemento : ''} - ${clientDetails.enderecoBairro}`, MARGIN, currentY); currentY +=4;
            doc.text(`${clientDetails.enderecoCidade} - CEP: ${clientDetails.enderecoCep}`, MARGIN, currentY);
        } else {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(lic.clienteNome, MARGIN, currentY); currentY +=6;
            doc.setFontSize(9);
            doc.text(`(Detalhes do cliente não puderam ser carregados)`, MARGIN, currentY); currentY +=4;
        }
        return currentY + 8;
    };
    
    yPos = drawClientHeaderPDF();

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    yPos = addTextAndPaginate(doc, "PROPOSTA COMERCIAL", pageWidth / 2, yPos, { align: 'center' }, contentHeight, drawClientHeaderPDF);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    yPos = addTextAndPaginate(doc, `Licitação Nº: ${lic.numeroLicitacao}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    doc.text(`Data: ${hoje}`, pageWidth - MARGIN, yPos - LINE_HEIGHT, {align: 'right'});
    yPos = addTextAndPaginate(doc, `Órgão Licitante: ${lic.orgaoComprador}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    yPos += 5;

    yPos = addTextAndPaginate(doc, "Prezados Senhores,", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    yPos = addTextAndPaginate(doc, "Apresentamos nossa proposta para o fornecimento dos itens abaixo, conforme condições do edital:", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    yPos += 5;


    const tableColumnStyles = {
      0: { cellWidth: 15 }, 1: { cellWidth: 75 }, 2: { cellWidth: 15 },
      3: { cellWidth: 18 }, 4: { cellWidth: 28, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' },
    };

    autoTable(doc, {
        startY: yPos,
        head: [['Lote', 'Descrição do Item', 'Unid.', 'Qtd.', 'Vlr. Unit. (R$)', 'Vlr. Total (R$)']],
        body: (lic.disputaLog.itensPropostaFinalCliente || []).map(item => [
            item.lote || '-', item.descricao, item.unidade, item.quantidade.toLocaleString('pt-BR'),
            (item.valorUnitarioFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
            (item.valorTotalFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: tableColumnStyles, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: (data) => {
             if (data.pageNumber > 1) { yPos = drawClientHeaderPDF(); }
             else { yPos = data.cursor?.y || yPos; }
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    const totalProposta = (lic.disputaLog.valorFinalPropostaCliente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    yPos = addTextAndPaginate(doc, `VALOR TOTAL DA PROPOSTA: ${totalProposta}`, pageWidth - MARGIN, yPos, { align: 'right' }, contentHeight, drawClientHeaderPDF);
    yPos += 5;

    if (lic.observacoesPropostaFinal) {
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        yPos = addTextAndPaginate(doc, "Observações Adicionais:", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
        doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        yPos = addTextAndPaginate(doc, lic.observacoesPropostaFinal, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawClientHeaderPDF);
        yPos += 5;
    }
    
    if (yPos > pageHeight - MARGIN - 30) { doc.addPage(); yPos = drawClientHeaderPDF(); }
    doc.setFontSize(10);
    yPos = addTextAndPaginate(doc, "________________________________________", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    yPos = addTextAndPaginate(doc, lic.clienteNome, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    if(clientDetails?.cnpj) {
        addTextAndPaginate(doc, `CNPJ: ${clientDetails.cnpj}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    }
    doc.save(`Proposta_Final_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };

const _getClientsFromStorage = (): {id: string, cnpj?: string, razaoSocial?: string, email?: string, telefone?: string, enderecoRua?: string, enderecoNumero?: string, enderecoComplemento?: string, enderecoBairro?: string, enderecoCidade?: string, enderecoCep?: string}[] => {
  const storedData = localStorage.getItem('licitaxClients');
  try {
    const clientList = localStorage.getItem('licitaxClients');
    if (clientList) {
        const parsedClients: ClientDetails[] = JSON.parse(clientList);
        return parsedClients.map(c => ({
            id: c.id, cnpj: c.cnpj, razaoSocial: c.razaoSocial, email: c.email, telefone: c.telefone,
            enderecoRua: c.enderecoRua, enderecoNumero: c.enderecoNumero, enderecoComplemento: c.enderecoComplemento,
            enderecoBairro: c.enderecoBairro, enderecoCidade: c.enderecoCidade, enderecoCep: c.enderecoCep,
        }));
    }
    return [];
  } catch { return []; }
}

export const generateAcordoPDF = (
    debitosOriginais: (Debito & { jurosCalculado?: number })[],
    acordoData: AcordoDetalhes,
    parcelas: Debito[],
    config: ConfiguracoesFormValues | null
) => {
    if (!config) { console.error("Configurações não carregadas."); return; }
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentHeight = pageHeight - MARGIN * 2;
    let yPos = MARGIN + 5;

    const cliente = debitosOriginais.length > 0 ? debitosOriginais[0] : { clienteNome: 'N/A', clienteCnpj: 'N/A' };

    const drawAcordoHeader = (): number => {
        let currentY = MARGIN + 5;
        const logoUrl = config?.logoUrl;
        const logoDim = 25;
        if (logoUrl) {
            try {
                const img = new Image(); img.src = logoUrl;
                const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                if (imageType === "PNG" || imageType === "JPEG") {
                    doc.addImage(img, imageType, MARGIN, currentY - 3, logoDim, logoDim);
                    currentY = MARGIN + logoDim;
                }
            } catch (e) { console.error("Error adding logo:", e); }
        }
        doc.setFontSize(14); doc.text(config.nomeFantasia || config.razaoSocial, MARGIN + (logoUrl ? logoDim + 3 : 0), currentY - (logoUrl ? logoDim/2 - 2 : -5) );
        doc.setFontSize(10); doc.text(`CNPJ: ${config.cnpj}`, MARGIN + (logoUrl ? logoDim + 3 : 0), currentY - (logoUrl ? logoDim/2 - 7 : 0) );
        currentY = Math.max(currentY, MARGIN + logoDim + 5);

        doc.setFontSize(16); doc.setFont(undefined, 'bold');
        doc.text("TERMO DE ACORDO DE DÍVIDA", pageWidth / 2, currentY, { align: 'center' }); currentY += 8;
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`Acordo ID: ${acordoData.id}`, MARGIN, currentY); currentY += 5;
        doc.text(`Data do Acordo: ${formatDateFns(typeof acordoData.dataCriacao === 'string' ? parseISO(acordoData.dataCriacao) : acordoData.dataCriacao, "dd/MM/yyyy", {locale: ptBR})}`, MARGIN, currentY); currentY += 8;
        return currentY;
    };
    
    yPos = drawAcordoHeader();

    yPos = addTextAndPaginate(doc, `Entre: ${config.razaoSocial} (CNPJ: ${config.cnpj}), doravante denominada CREDORA,`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `E: ${cliente.clienteNome} (CNPJ: ${cliente.clienteCnpj || 'N/A'}), doravante denominado(a) DEVEDOR(A),`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos += LINE_HEIGHT;
    yPos = addTextAndPaginate(doc, "Fica estabelecido o presente acordo para quitação dos débitos listados abaixo:", MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos += LINE_HEIGHT;

    const totalOriginal = acordoData.debitosOriginais.reduce((sum, d) => sum + d.valor, 0);
    const totalJuros = acordoData.debitosOriginais.reduce((sum, d) => sum + (d.jurosCalculado || 0), 0);

    autoTable(doc, {
        startY: yPos,
        head: [['Protocolo Original', 'Descrição', 'Venc. Original', 'Valor Original', 'Juros Aplicados', 'Valor Atualizado']],
        body: acordoData.debitosOriginais.map(d => [
            d.id, d.descricao, formatDateFns(typeof d.dataVencimento === 'string' ? parseISO(d.dataVencimento) : d.dataVencimento, "dd/MM/yyyy", {locale: ptBR}),
            d.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
            (d.jurosCalculado || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
            (d.valor + (d.jurosCalculado || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
        ]),
        theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: data => { if(data.pageNumber > 1) yPos = drawAcordoHeader(); else yPos = data.cursor?.y || yPos; }
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    yPos = addTextAndPaginate(doc, `Soma dos Valores Originais: ${totalOriginal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `Soma dos Juros Aplicados: ${totalJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    if (acordoData.descontoConcedido > 0) {
        yPos = addTextAndPaginate(doc, `Desconto Concedido: ${(acordoData.descontoConcedido).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    }
    doc.setFont(undefined, 'bold');
    yPos = addTextAndPaginate(doc, `Valor Final do Acordo: ${acordoData.valorFinalAcordo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    doc.setFont(undefined, 'normal');
    yPos += LINE_HEIGHT;

    yPos = addTextAndPaginate(doc, `O valor final será pago em ${acordoData.numeroParcelas} parcela(s), conforme detalhamento abaixo:`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos += LINE_HEIGHT;

    autoTable(doc, {
        startY: yPos,
        head: [['Nº Parcela', 'Data Vencimento', 'Valor da Parcela']],
        body: parcelas.map((p, index) => [
            `${index + 1}/${acordoData.numeroParcelas}`,
            formatDateFns(typeof p.dataVencimento === 'string' ? parseISO(p.dataVencimento) : p.dataVencimento, "dd/MM/yyyy", {locale: ptBR}),
            p.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
        ]),
        theme: 'grid', headStyles: { fillColor: [50, 100, 150] }, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: data => { if(data.pageNumber > 1) yPos = drawAcordoHeader(); else yPos = data.cursor?.y || yPos;}
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    if(acordoData.observacoes) {
        yPos = addTextAndPaginate(doc, `Observações do Acordo: ${acordoData.observacoes}`, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawAcordoHeader);
    }
    yPos = addTextAndPaginate(doc, "O não pagamento de qualquer parcela na data aprazada implicará no vencimento antecipado das demais e na aplicação das medidas cabíveis para cobrança do saldo devedor.", MARGIN, yPos, {maxWidth: pageWidth - MARGIN*2}, contentHeight, drawAcordoHeader);
    yPos += 15;

    yPos = addTextAndPaginate(doc, "_________________________                     _________________________", pageWidth/2, yPos, {align: 'center'}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `${config.razaoSocial} (CREDORA)                                         ${cliente.clienteNome} (DEVEDOR(A))`, pageWidth/2, yPos, {align: 'center'}, contentHeight, drawAcordoHeader);

    doc.setLineWidth(0.1); doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);
    doc.setFontSize(8); doc.text(`${config.razaoSocial} - ${config.cnpj}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`Termo_Acordo_${acordoData.id}_${cliente.clienteNome.replace(/[^\w]/g, '_')}.pdf`);
};
