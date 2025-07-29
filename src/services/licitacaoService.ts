
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

// --- LOCAL STORAGE KEYS ---
const LICITACOES_KEY = 'licitaxLicitacoes';
const DEBITOS_KEY = 'licitaxDebitos';

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

// --- LocalStorage Helper Functions ---

const getFromStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const stored = localStorage.getItem(key);
    try {
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        console.error(`Error parsing localStorage key ${key}:`, e);
        return defaultValue;
    }
};

const saveToStorage = <T>(key: string, data: T): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving to localStorage key ${key}:`, e);
    }
};


// --- Licitacao Service Functions ---

export const fetchLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  console.log('Fetching all licitações from localStorage...');
  await new Promise(resolve => setTimeout(resolve, 100));
  const licitacoes = getFromStorage<LicitacaoDetails[]>(LICITACOES_KEY, []);
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador }) => ({
    id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador
  }));
};

export const fetchActiveLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  const licitacoes = await fetchLicitacoes();
  const finalizedStatuses = ['PROCESSO_HOMOLOGADO', 'PROCESSO_ENCERRADO'];
  return licitacoes.filter(lic => !finalizedStatuses.includes(lic.status));
};

export const fetchLicitacaoDetails = async (id: string): Promise<LicitacaoDetails | null> => {
  console.log(`Fetching details for licitação ID from localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 50));
  const licitacoes = getFromStorage<LicitacaoDetails[]>(LICITACOES_KEY, []);
  return licitacoes.find(l => l.id === id) || null;
};

export const addLicitacao = async (data: LicitacaoFormValues, currentUser?: User | null): Promise<LicitacaoDetails | null> => {
  console.log("Adding new licitação to localStorage:", data);
  await new Promise(resolve => setTimeout(resolve, 200));
  const allLicitacoes = getFromStorage<LicitacaoDetails[]>(LICITACOES_KEY, []);
  
  const clients = JSON.parse(localStorage.getItem('licitaxClients') || '[]');
  const client = clients.find((c: any) => c.id === data.clienteId);
  if (!client) throw new Error("Cliente não encontrado.");

  const newLicitacao: LicitacaoDetails = {
    ...data,
    id: `LIC-${Date.now()}`,
    clienteNome: client.razaoSocial,
    status: 'AGUARDANDO_ANALISE',
    checklist: {},
    comentarios: [],
    itensProposta: [],
    propostaItensPdfNome: data.propostaItensPdf?.name,
    createdBy: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        cpf: currentUser.cpf,
    } : undefined
  };
  
  saveToStorage(LICITACOES_KEY, [...allLicitacoes, newLicitacao]);
  return newLicitacao;
};

export const updateLicitacao = async (id: string, data: Partial<LicitacaoDetails>): Promise<boolean> => {
  console.log(`Updating licitação ID in localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const allLicitacoes = getFromStorage<LicitacaoDetails[]>(LICITACOES_KEY, []);
  const index = allLicitacoes.findIndex(l => l.id === id);

  if (index === -1) return false;

  const wasHomologado = allLicitacoes[index].status === 'PROCESSO_HOMOLOGADO';
  
  allLicitacoes[index] = { ...allLicitacoes[index], ...data };
  
  // Debit creation logic on homologation
  if (data.status === 'PROCESSO_HOMOLOGADO' && !wasHomologado) {
    allLicitacoes[index].dataHomologacao = new Date(); // Set homologation date
    const licitacaoData = allLicitacoes[index];
    const config = getFromStorage<ConfiguracoesFormValues>('licitaxConfiguracoesEmpresa', getDefaultConfig());
    const clients = getFromStorage<ClientDetails[]>('licitaxClients', []);
    const clientData = clients.find(c => c.id === licitacaoData.clienteId);

    const dueDate = addMonths(new Date(licitacaoData.dataHomologacao), 1);
    const finalDueDate = setDate(dueDate, config?.diaVencimentoPadrao || 15);

    const debitData: Debito = {
        id: id, // Use licitacao ID as debit ID for 1-to-1 relationship
        tipoDebito: 'LICITACAO',
        clienteNome: licitacaoData.clienteNome,
        clienteCnpj: clientData?.cnpj || undefined,
        descricao: `Serviços Licitação ${licitacaoData.numeroLicitacao}`,
        valor: licitacaoData.valorCobrado,
        dataVencimento: finalDueDate,
        dataReferencia: new Date(licitacaoData.dataHomologacao),
        status: 'PENDENTE',
        licitacaoNumero: licitacaoData.numeroLicitacao,
    };
    
    const allDebitos = getFromStorage<Debito[]>(DEBITOS_KEY, []);
    // Remove existing debit with same ID to avoid duplicates
    const filteredDebitos = allDebitos.filter(d => d.id !== id);
    saveToStorage(DEBITOS_KEY, [...filteredDebitos, debitData]);
  }
  
  saveToStorage(LICITACOES_KEY, allLicitacoes);
  return true;
};

export const deleteLicitacao = async (id: string): Promise<boolean> => {
  console.log(`Deleting licitação ID from localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const allLicitacoes = getFromStorage<LicitacaoDetails[]>(LICITACOES_KEY, []);
  const filtered = allLicitacoes.filter(l => l.id !== id);
  if (allLicitacoes.length === filtered.length) return false;

  saveToStorage(LICITACOES_KEY, filtered);
  // Also delete associated debit
  const allDebitos = getFromStorage<Debito[]>(DEBITOS_KEY, []);
  const filteredDebitos = allDebitos.filter(d => d.id !== id);
  saveToStorage(DEBITOS_KEY, filteredDebitos);

  return true;
};

// --- Debito Service Functions ---

const getDefaultConfig = (): ConfiguracoesFormValues => ({
    razaoSocial: '', cnpj: '', email: '', telefone: '', enderecoCep: '',
    enderecoRua: '', enderecoNumero: '', enderecoBairro: '', enderecoCidade: '',
    diaVencimentoPadrao: 15, taxaJurosDiaria: 0, logoUrl: ''
});

export const fetchDebitos = async (): Promise<Debito[]> => {
  console.log('Fetching all debitos from localStorage...');
  await new Promise(resolve => setTimeout(resolve, 100));
  return getFromStorage<Debito[]>(DEBITOS_KEY, []);
};

export const updateDebitoStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO' | 'PAGO_VIA_ACORDO'): Promise<boolean> => {
  console.log(`Updating debit status for ID in localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const allDebitos = getFromStorage<Debito[]>(DEBITOS_KEY, []);
  const index = allDebitos.findIndex(d => d.id === id);
  if (index === -1) return false;
  
  allDebitos[index].status = newStatus;
  saveToStorage(DEBITOS_KEY, allDebitos);
  return true;
};

export type DebitoAvulsoFormData = Omit<Debito, 'id' | 'tipoDebito' | 'dataReferencia' | 'status' | 'licitacaoNumero' | 'acordoId' | 'originalDebitoIds' | 'jurosCalculado'>;

export const addDebitoAvulso = async (data: DebitoAvulsoFormData): Promise<Debito | null> => {
  console.log("Adding new debito avulso to localStorage:", data);
  await new Promise(resolve => setTimeout(resolve, 200));
  const allDebitos = getFromStorage<Debito[]>(DEBITOS_KEY, []);
  const newDebito: Debito = {
    ...data,
    id: `AV-${Date.now()}`,
    tipoDebito: 'AVULSO',
    dataReferencia: new Date(),
    status: 'PENDENTE',
  };
  saveToStorage(DEBITOS_KEY, [...allDebitos, newDebito]);
  return newDebito;
};

export const saveDebitosToStorage = async (debitos: Debito[]): Promise<void> => {
  console.log("Saving all debitos to localStorage...");
  await new Promise(resolve => setTimeout(resolve, 50));
  saveToStorage(DEBITOS_KEY, debitos);
};

// --- PDF Generation and Other Helpers ---

export const formatElapsedTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const MARGIN = 14;
const LINE_HEIGHT = 5;

const addTextAndPaginate = (
    doc: jsPDF, text: string, x: number, y: number, options: any, pageContentHeight: number, drawPageHeader: () => number
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

export const generateAtaSessaoPDF = (lic: LicitacaoDetails, config: ConfiguracoesFormValues | null, user: User | null) => {
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
          if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, MARGIN, currentY - 5, logoDim, logoDim); currentY = MARGIN + logoDim; } } catch (e) { console.error("Error adding logo:", e); } }
          doc.setFontSize(16); doc.text("ATA DA SESSÃO DE DISPUTA", pageWidth / 2, currentY, { align: 'center' }); currentY += 10;
          if (config) { doc.setFontSize(11); doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, MARGIN, currentY); currentY += 6; }
          doc.setFontSize(10); doc.text(`Data da Geração: ${hoje}`, MARGIN, currentY); currentY += 8;
          doc.setLineWidth(0.1); doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY); currentY += 8;
          return currentY;
      };
      yPos = drawHeader();

      const addDetailLine = (label: string, value: string | undefined | null) => {
        if (value === undefined || value === null) value = 'N/A';
        const text = `${label}: ${value}`;
        yPos = addTextAndPaginate(doc, text, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawHeader);
      };

      doc.setFontSize(12); doc.setFont(undefined, 'bold'); addDetailLine("Dados da Licitação", ""); doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      addDetailLine("Protocolo", lic.id); addDetailLine("Cliente", lic.clienteNome); addDetailLine("Número Lic.", lic.numeroLicitacao); addDetailLine("Órgão", lic.orgaoComprador); addDetailLine("Modalidade", lic.modalidade); addDetailLine("Plataforma", lic.plataforma); addDetailLine("Valor Referência Edital", (lic.valorReferenciaEdital || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })); yPos += 4;
      doc.setFontSize(12); doc.setFont(undefined, 'bold'); addDetailLine("Configuração da Disputa (Limite Cliente)", ""); doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaConfig?.limiteTipo === 'valor') { addDetailLine("Tipo de Limite", "Valor Absoluto"); addDetailLine("Valor Limite Definido", (lic.disputaConfig.limiteValor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })); }
      else if (lic.disputaConfig?.limiteTipo === 'percentual') { addDetailLine("Tipo de Limite", "Percentual"); addDetailLine("Percentual Definido", `${lic.disputaConfig.limiteValor || 0}%`); addDetailLine("Valor Calculado (Pode Chegar Até)", (lic.disputaConfig.valorCalculadoAteOndePodeChegar || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })); }
      else { addDetailLine("Limite Cliente", "Não definido ou não aplicável."); }
      yPos += 4;
      doc.setFontSize(12); doc.setFont(undefined, 'bold'); addDetailLine("Registro da Disputa", ""); doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const formatDateLogAta = (date: Date | string | undefined) => date ? formatDateFns(date instanceof Date ? date : parseISO(date as string), "dd/MM/yyyy HH:mm:ss", {locale: ptBR}) : 'N/A';
      addDetailLine("Início da Disputa", formatDateLogAta(lic.disputaLog?.iniciadaEm)); addDetailLine("Fim da Disputa", formatDateLogAta(lic.disputaLog?.finalizadaEm)); addDetailLine("Duração Total", lic.disputaLog?.duracao || 'N/A'); yPos += 4;

      if (lic.disputaLog?.mensagens && lic.disputaLog.mensagens.length > 0) {
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); addDetailLine("Ocorrências da Sessão",""); doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        lic.disputaLog.mensagens.forEach(msg => { const timestampStr = msg.timestamp ? formatDateFns(typeof msg.timestamp === 'string' ? parseISO(msg.timestamp) : msg.timestamp, "HH:mm:ss", {locale: ptBR}) : 'N/A'; const textContent = `[${timestampStr}] ${msg.autor || 'Sistema'}: ${msg.texto}`; yPos = addTextAndPaginate(doc, textContent, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawHeader); });
        yPos += 4;
      }

      doc.setFontSize(12); doc.setFont(undefined, 'bold'); addDetailLine("Resultado da Disputa",""); doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaLog?.clienteVenceu) { addDetailLine("Resultado", "Cliente Venceu a Licitação"); if (lic.disputaLog.valorFinalPropostaCliente !== undefined) { addDetailLine("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })); } }
      else { addDetailLine("Resultado", "Cliente Não Venceu"); addDetailLine("Posição Final do Cliente", lic.disputaLog?.posicaoCliente?.toString() || "Não informada"); if (lic.disputaLog?.valorFinalPropostaCliente !== undefined) { addDetailLine("Valor Final da Proposta do Cliente", lic.disputaLog.valorFinalPropostaCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })); } }
      yPos += 10;
      yPos = addTextAndPaginate(doc, `Sessão conduzida por: ${user?.fullName || user?.username || 'Usuário do Sistema'}`, MARGIN, yPos, {}, contentHeight, drawHeader);
      if (user?.cpf) { yPos = addTextAndPaginate(doc, `CPF do Operador: ${user.cpf}`, MARGIN, yPos, {}, contentHeight, drawHeader); }
      doc.save(`Ata_Disputa_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
};

export const generatePropostaFinalPDF = async (lic: LicitacaoDetails, config: ConfiguracoesFormValues | null, user: User | null) => {
    if (!lic.disputaLog?.itensPropostaFinalCliente || lic.disputaLog.itensPropostaFinalCliente.length === 0) { console.warn("Não há itens finais da proposta para gerar o PDF."); return; }
    const clientDetails = await fetchServiceClientDetails(lic.clienteId);
    const doc = new jsPDF();
    const hoje = formatDateFns(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentHeight = pageHeight - MARGIN * 2;
    let yPos = MARGIN + 5;

    const drawClientHeaderPDF = (): number => {
        let currentY = MARGIN + 5;
        if (clientDetails) { doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(clientDetails.razaoSocial, MARGIN, currentY); currentY +=6; doc.setFont(undefined, 'normal'); doc.setFontSize(9); doc.text(`CNPJ: ${clientDetails.cnpj}`, MARGIN, currentY); currentY +=4; doc.text(`Email: ${clientDetails.email} | Tel: ${clientDetails.telefone}`, MARGIN, currentY); currentY +=4; doc.text(`${clientDetails.enderecoRua}, ${clientDetails.enderecoNumero}${clientDetails.enderecoComplemento ? ' - '+clientDetails.enderecoComplemento : ''} - ${clientDetails.enderecoBairro}`, MARGIN, currentY); currentY +=4; doc.text(`${clientDetails.enderecoCidade} - CEP: ${clientDetails.enderecoCep}`, MARGIN, currentY); }
        else { doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(lic.clienteNome, MARGIN, currentY); currentY +=6; doc.setFontSize(9); doc.text(`(Detalhes do cliente não puderam ser carregados)`, MARGIN, currentY); currentY +=4; }
        return currentY + 8;
    };
    yPos = drawClientHeaderPDF();
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); yPos = addTextAndPaginate(doc, "PROPOSTA COMERCIAL", pageWidth / 2, yPos, { align: 'center' }, contentHeight, drawClientHeaderPDF); yPos += 5;
    doc.setFontSize(11); doc.setFont(undefined, 'normal'); yPos = addTextAndPaginate(doc, `Licitação Nº: ${lic.numeroLicitacao}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); doc.text(`Data: ${hoje}`, pageWidth - MARGIN, yPos - LINE_HEIGHT, {align: 'right'}); yPos = addTextAndPaginate(doc, `Órgão Licitante: ${lic.orgaoComprador}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); yPos += 5;
    yPos = addTextAndPaginate(doc, "Prezados Senhores,", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); yPos = addTextAndPaginate(doc, "Apresentamos nossa proposta para o fornecimento dos itens abaixo, conforme condições do edital:", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); yPos += 5;

    autoTable(doc, {
        startY: yPos,
        head: [['Lote', 'Descrição do Item', 'Unid.', 'Qtd.', 'Vlr. Unit. (R$)', 'Vlr. Total (R$)']],
        body: (lic.disputaLog.itensPropostaFinalCliente || []).map(item => [
            item.lote || '-', item.descricao, item.unidade, item.quantidade.toLocaleString('pt-BR'),
            (item.valorUnitarioFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
            (item.valorTotalFinalCliente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        ]),
        theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 75 }, 2: { cellWidth: 15 }, 3: { cellWidth: 18 }, 4: { cellWidth: 28, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' }, }, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: (data) => { if (data.pageNumber > 1) { yPos = drawClientHeaderPDF(); } else { yPos = data.cursor?.y || yPos; } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); const totalProposta = (lic.disputaLog.valorFinalPropostaCliente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    yPos = addTextAndPaginate(doc, `VALOR TOTAL DA PROPOSTA: ${totalProposta}`, pageWidth - MARGIN, yPos, { align: 'right' }, contentHeight, drawClientHeaderPDF); yPos += 5;
    if (lic.observacoesPropostaFinal) { doc.setFontSize(11); doc.setFont(undefined, 'bold'); yPos = addTextAndPaginate(doc, "Observações Adicionais:", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); doc.setFont(undefined, 'normal'); doc.setFontSize(10); yPos = addTextAndPaginate(doc, lic.observacoesPropostaFinal, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawClientHeaderPDF); yPos += 5; }
    if (yPos > pageHeight - MARGIN - 30) { doc.addPage(); yPos = drawClientHeaderPDF(); }
    doc.setFontSize(10);
    yPos = addTextAndPaginate(doc, "________________________________________", MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); yPos = addTextAndPaginate(doc, lic.clienteNome, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF);
    if(clientDetails?.cnpj) { addTextAndPaginate(doc, `CNPJ: ${clientDetails.cnpj}`, MARGIN, yPos, {}, contentHeight, drawClientHeaderPDF); }
    doc.save(`Proposta_Final_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };

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
        if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, MARGIN, currentY - 3, logoDim, logoDim); currentY = MARGIN + logoDim; } } catch (e) { console.error("Error adding logo:", e); } }
        doc.setFontSize(14); doc.text(config.nomeFantasia || config.razaoSocial, MARGIN + (logoUrl ? logoDim + 3 : 0), currentY - (logoUrl ? logoDim/2 - 2 : -5) );
        doc.setFontSize(10); doc.text(`CNPJ: ${config.cnpj}`, MARGIN + (logoUrl ? logoDim + 3 : 0), currentY - (logoUrl ? logoDim/2 - 7 : 0) );
        currentY = Math.max(currentY, MARGIN + logoDim + 5);
        doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text("TERMO DE ACORDO DE DÍVIDA", pageWidth / 2, currentY, { align: 'center' }); currentY += 8;
        doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.text(`Acordo ID: ${acordoData.id}`, MARGIN, currentY); currentY += 5;
        doc.text(`Data do Acordo: ${formatDateFns(typeof acordoData.dataCriacao === 'string' ? parseISO(acordoData.dataCriacao) : acordoData.dataCriacao, "dd/MM/yyyy", {locale: ptBR})}`, MARGIN, currentY); currentY += 8;
        return currentY;
    };
    
    yPos = drawAcordoHeader();
    yPos = addTextAndPaginate(doc, `Entre: ${config.razaoSocial} (CNPJ: ${config.cnpj}), doravante denominada CREDORA,`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `E: ${cliente.clienteNome} (CNPJ: ${cliente.clienteCnpj || 'N/A'}), doravante denominado(a) DEVEDOR(A),`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader); yPos += LINE_HEIGHT;
    yPos = addTextAndPaginate(doc, "Fica estabelecido o presente acordo para quitação dos débitos listados abaixo:", MARGIN, yPos, {}, contentHeight, drawAcordoHeader); yPos += LINE_HEIGHT;

    const totalOriginal = acordoData.debitosOriginais.reduce((sum, d) => sum + d.valor, 0);
    const totalJuros = acordoData.debitosOriginais.reduce((sum, d) => sum + (d.jurosCalculado || 0), 0);

    autoTable(doc, {
        startY: yPos,
        head: [['Protocolo Original', 'Descrição', 'Venc. Original', 'Valor Original', 'Juros Aplicados', 'Valor Atualizado']],
        body: acordoData.debitosOriginais.map(d => [ d.id, d.descricao, formatDateFns(typeof d.dataVencimento === 'string' ? parseISO(d.dataVencimento) : d.dataVencimento, "dd/MM/yyyy", {locale: ptBR}), d.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), (d.jurosCalculado || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), (d.valor + (d.jurosCalculado || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), ]),
        theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: data => { if(data.pageNumber > 1) yPos = drawAcordoHeader(); else yPos = data.cursor?.y || yPos; }
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
    yPos = addTextAndPaginate(doc, `Soma dos Valores Originais: ${totalOriginal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `Soma dos Juros Aplicados: ${totalJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader);
    if (acordoData.descontoConcedido > 0) { yPos = addTextAndPaginate(doc, `Desconto Concedido: ${(acordoData.descontoConcedido).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader); }
    doc.setFont(undefined, 'bold'); yPos = addTextAndPaginate(doc, `Valor Final do Acordo: ${acordoData.valorFinalAcordo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader); doc.setFont(undefined, 'normal'); yPos += LINE_HEIGHT;
    yPos = addTextAndPaginate(doc, `O valor final será pago em ${acordoData.numeroParcelas} parcela(s), conforme detalhamento abaixo:`, MARGIN, yPos, {}, contentHeight, drawAcordoHeader); yPos += LINE_HEIGHT;

    autoTable(doc, {
        startY: yPos,
        head: [['Nº Parcela', 'Data Vencimento', 'Valor da Parcela']],
        body: parcelas.map((p, index) => [ `${index + 1}/${acordoData.numeroParcelas}`, formatDateFns(typeof p.dataVencimento === 'string' ? parseISO(p.dataVencimento) : p.dataVencimento, "dd/MM/yyyy", {locale: ptBR}), p.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), ]),
        theme: 'grid', headStyles: { fillColor: [50, 100, 150] }, margin: { left: MARGIN, right: MARGIN },
        didDrawPage: data => { if(data.pageNumber > 1) yPos = drawAcordoHeader(); else yPos = data.cursor?.y || yPos;}
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    if(acordoData.observacoes) { yPos = addTextAndPaginate(doc, `Observações do Acordo: ${acordoData.observacoes}`, MARGIN, yPos, {maxWidth: pageWidth - MARGIN * 2}, contentHeight, drawAcordoHeader); }
    yPos = addTextAndPaginate(doc, "O não pagamento de qualquer parcela na data aprazada implicará no vencimento antecipado das demais e na aplicação das medidas cabíveis para cobrança do saldo devedor.", MARGIN, yPos, {maxWidth: pageWidth - MARGIN*2}, contentHeight, drawAcordoHeader); yPos += 15;
    yPos = addTextAndPaginate(doc, "_________________________                     _________________________", pageWidth/2, yPos, {align: 'center'}, contentHeight, drawAcordoHeader);
    yPos = addTextAndPaginate(doc, `${config.razaoSocial} (CREDORA)                                         ${cliente.clienteNome} (DEVEDOR(A))`, pageWidth/2, yPos, {align: 'center'}, contentHeight, drawAcordoHeader);
    doc.setLineWidth(0.1); doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15); doc.setFontSize(8); doc.text(`${config.razaoSocial} - ${config.cnpj}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.save(`Termo_Acordo_${acordoData.id}_${cliente.clienteNome.replace(/[^\w]/g, '_')}.pdf`);
};
