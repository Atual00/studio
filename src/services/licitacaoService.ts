
'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel } from 'lucide-react';
import { parseISO } from 'date-fns'; // Import parseISO

const LOCAL_STORAGE_KEY = 'licitaxLicitacoes';
const DEBIT_STATUS_STORAGE_KEY = 'licitaxDebitStatuses'; // Key for finance statuses

// --- Helper Functions ---

const getLicitacoesFromStorage = (): LicitacaoDetails[] => {
  if (typeof window === 'undefined') return []; // Avoid server-side execution
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    // Attempt to parse dates stored as ISO strings
    const items = storedData ? JSON.parse(storedData) : [];
    return items.map((item: any) => ({
        ...item,
        // Parse dates carefully, handling potential invalid strings
        dataInicio: item.dataInicio ? (typeof item.dataInicio === 'string' ? parseISO(item.dataInicio) : item.dataInicio) : undefined,
        dataMetaAnalise: item.dataMetaAnalise ? (typeof item.dataMetaAnalise === 'string' ? parseISO(item.dataMetaAnalise) : item.dataMetaAnalise) : undefined,
        // Ensure dataHomologacao is also parsed if stored
        dataHomologacao: item.dataHomologacao ? (typeof item.dataHomologacao === 'string' ? parseISO(item.dataHomologacao) : item.dataHomologacao) : undefined,
        comentarios: (item.comentarios || []).map((c:any) => ({...c, data: c.data ? (typeof c.data === 'string' ? parseISO(c.data) : c.data) : undefined })),
        // Ensure checklist is an object
        checklist: typeof item.checklist === 'object' && item.checklist !== null ? item.checklist : {},
    })).filter(item => item.dataInicio instanceof Date && !isNaN(item.dataInicio.getTime())); // Filter out items with invalid dates
  } catch (e) {
    console.error("Error parsing licitacoes from localStorage:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    return [];
  }
};

const saveLicitacoesToStorage = (licitacoes: LicitacaoDetails[]): void => {
   if (typeof window === 'undefined') return;
  try {
    // Store dates as ISO strings for better compatibility
    const itemsToStore = licitacoes.map(item => ({
        ...item,
        dataInicio: item.dataInicio instanceof Date ? item.dataInicio.toISOString() : item.dataInicio,
        dataMetaAnalise: item.dataMetaAnalise instanceof Date ? item.dataMetaAnalise.toISOString() : item.dataMetaAnalise,
        dataHomologacao: item.dataHomologacao instanceof Date ? item.dataHomologacao.toISOString() : item.dataHomologacao, // Save homologation date
        comentarios: (item.comentarios || []).map(c => ({...c, data: c.data instanceof Date ? c.data.toISOString() : c.data })),
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(itemsToStore));
  } catch (e) {
    console.error("Error saving licitacoes to localStorage:", e);
  }
};

// --- Types and Constants ---

export interface LicitacaoDetails extends LicitacaoFormValues {
  id: string; // Protocolo
  clienteNome: string; // Fetched/denormalized for listing
  status: string; // Use keys from statusMap
  checklist: { [key: string]: boolean };
  comentarios: { id: string, texto: string, data: Date | string, autor: string }[]; // Allow string for storage
  valorPrimeiroColocado?: number;
  // Dates should be Date objects in application logic, stored as ISO strings
  dataInicio: Date | string;
  dataMetaAnalise: Date | string;
  dataHomologacao?: Date | string; // Add homologation date
}


export type LicitacaoListItem = Pick<
    LicitacaoDetails,
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status'
>;

// Status mapping - Centralized here
export const statusMap: {[key: string]: {label: string; color: string; icon: React.ElementType}} = {
  AGUARDANDO_ANALISE: {label: 'Aguardando Análise', color: 'secondary', icon: Clock},
  EM_ANALISE: {label: 'Em Análise', color: 'info', icon: Loader2 }, // Using Loader icon might need animation class
  DOCUMENTACAO_CONCLUIDA: {label: 'Documentação OK', color: 'success', icon: CheckCircle},
  FALTA_DOCUMENTACAO: {label: 'Falta Documento', color: 'warning', icon: FileWarning},
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent', icon: Gavel},
  EM_HOMOLOGACAO: {label: 'Em Homologação', color: 'default', icon: Target}, // Using 'default' (primary)
  AGUARDANDO_RECURSO: {label: 'Aguardando Recurso', color: 'outline', icon: HelpCircle},
  EM_PRAZO_CONTRARRAZAO: {label: 'Prazo Contrarrazão', color: 'outline', icon: CalendarCheck},
  PROCESSO_HOMOLOGADO: {label: 'Processo Homologado', color: 'success', icon: CheckCircle},
  PROCESSO_ENCERRADO: {label: 'Processo Encerrado', color: 'secondary', icon: XCircle},
  RECURSO_IMPUGNACAO: {label: 'Recurso/Impugnação', color: 'warning', icon: HelpCircle},
};

// Required documents list - Centralized
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
  // Add others as needed
];


// --- Service Functions ---

/**
 * Fetches a list of all licitacoes.
 * @returns A promise that resolves to an array of LicitacaoListItems.
 */
export const fetchLicitacoes = async (): Promise<LicitacaoListItem[]> => {
  console.log('Fetching all licitações...');
  await new Promise(resolve => setTimeout(resolve, 350)); // Simulate API delay
  const licitacoes = getLicitacoesFromStorage();
  // Map to the ListItem format
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status }) => ({
    id,
    clienteNome,
    modalidade,
    numeroLicitacao,
    plataforma,
    dataInicio,
    dataMetaAnalise,
    status,
  }));
};

/**
 * Fetches the full details of a specific licitacao by ID (Protocolo).
 * @param id The ID (protocolo) of the licitacao to fetch.
 * @returns A promise that resolves to the LicitacaoDetails or null if not found.
 */
export const fetchLicitacaoDetails = async (id: string): Promise<LicitacaoDetails | null> => {
  console.log(`Fetching details for licitação ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
  const licitacoes = getLicitacoesFromStorage();
  const licitacao = licitacoes.find(l => l.id === id);

  if (licitacao) {
      // Ensure dates are Date objects when returning details
      const parseDate = (date: Date | string | undefined): Date | undefined => {
          if (!date) return undefined;
          try {
              const parsed = typeof date === 'string' ? parseISO(date) : date;
              return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
          } catch { return undefined; }
      }
      return {
          ...licitacao,
          dataInicio: parseDate(licitacao.dataInicio),
          dataMetaAnalise: parseDate(licitacao.dataMetaAnalise),
          dataHomologacao: parseDate(licitacao.dataHomologacao),
          comentarios: (licitacao.comentarios || []).map(c => ({...c, data: parseDate(c.data) }))
      };
  }

  return null;
};

/**
 * Adds a new licitacao.
 * @param data The data for the new licitacao (LicitacaoFormValues).
 * @returns A promise that resolves to the newly created LicitacaoDetails (with ID) or null on failure.
 */
export const addLicitacao = async (data: LicitacaoFormValues): Promise<LicitacaoDetails | null> => {
  console.log("Adding new licitação:", data);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay

   const { fetchClientDetails } = await import('@/services/clientService');
   const client = await fetchClientDetails(data.clienteId);
   if (!client) {
      throw new Error(`Cliente com ID ${data.clienteId} não encontrado.`);
   }


  const licitacoes = getLicitacoesFromStorage();

  const newLicitacao: LicitacaoDetails = {
    ...data,
    id: `LIC-${Date.now()}`, // Simple unique ID (protocolo)
    clienteNome: client.razaoSocial,
    status: 'AGUARDANDO_ANALISE',
    checklist: {},
    comentarios: [],
    // Dates are already Date objects from the form
    dataInicio: data.dataInicio,
    dataMetaAnalise: data.dataMetaAnalise,
    dataHomologacao: undefined, // Initialize homologation date
  };

  const updatedLicitacoes = [...licitacoes, newLicitacao];
  saveLicitacoesToStorage(updatedLicitacoes);
  return newLicitacao;
};

/**
 * Updates an existing licitacao.
 * @param id The ID (protocolo) of the licitacao to update.
 * @param data The partial data to update (Partial<LicitacaoDetails>).
 * @returns A promise that resolves to true on success, false on failure.
 */
export const updateLicitacao = async (id: string, data: Partial<LicitacaoDetails>): Promise<boolean> => {
  console.log(`Updating licitação ID: ${id} with data:`, data);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

  const licitacoes = getLicitacoesFromStorage();
  const licitacaoIndex = licitacoes.findIndex(l => l.id === id);

  if (licitacaoIndex === -1) {
    console.error(`Licitação update failed: Licitação with ID ${id} not found.`);
    return false;
  }

  const existingLicitacao = licitacoes[licitacaoIndex];

  // Check if status is changing to 'PROCESSO_HOMOLOGADO' and set homologation date
   let homologationDate = existingLicitacao.dataHomologacao;
   if (data.status === 'PROCESSO_HOMOLOGADO' && existingLicitacao.status !== 'PROCESSO_HOMOLOGADO') {
       homologationDate = new Date(); // Set homologation date to now
   }

  // Merge existing data with new data
  const updatedLicitacao = {
      ...existingLicitacao,
      ...data,
      dataHomologacao: homologationDate, // Assign the potentially updated homologation date
       // Ensure dates are handled correctly (might be string or Date)
      dataInicio: data.dataInicio ? (typeof data.dataInicio === 'string' ? new Date(data.dataInicio) : data.dataInicio) : existingLicitacao.dataInicio,
      dataMetaAnalise: data.dataMetaAnalise ? (typeof data.dataMetaAnalise === 'string' ? new Date(data.dataMetaAnalise) : data.dataMetaAnalise) : existingLicitacao.dataMetaAnalise,
      // Ensure comments preserve Date objects if updated
      comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: typeof c.data === 'string' ? new Date(c.data) : c.data })) : existingLicitacao.comentarios,
  };

  const updatedLicitacoes = [...licitacoes];
  updatedLicitacoes[licitacaoIndex] = updatedLicitacao;

  saveLicitacoesToStorage(updatedLicitacoes);
  return true;
};

/**
 * Deletes a licitacao by ID (Protocolo).
 * @param id The ID of the licitacao to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteLicitacao = async (id: string): Promise<boolean> => {
  console.log(`Deleting licitação ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  const licitacoes = getLicitacoesFromStorage();
  const updatedLicitacoes = licitacoes.filter(l => l.id !== id);

  if (licitacoes.length === updatedLicitacoes.length) {
    console.error(`Licitação delete failed: Licitação with ID ${id} not found.`);
    return false; // Not found
  }

  saveLicitacoesToStorage(updatedLicitacoes);
  // Also delete associated debit status
  deleteDebitStatus(id);
  return true;
};


/**
 * Fetches debit information based on licitacoes.
 * Only includes licitacoes with status 'PROCESSO_HOMOLOGADO'.
 * @returns A promise that resolves to an array of Debito objects.
 */
 export interface Debito {
  id: string; // Licitacao ID
  licitacaoNumero: string;
  clienteNome: string;
  clienteCnpj: string;
  valor: number;
  dataHomologacao: Date; // Date when status changed to Homologado
  status: 'PENDENTE' | 'PAGO' | 'ENVIADO_FINANCEIRO'; // Status specific to finance
}

 // Helper to get debit statuses from localStorage
 const getDebitStatuses = (): { [key: string]: 'PAGO' | 'ENVIADO_FINANCEIRO' } => {
   if (typeof window === 'undefined') return {};
   const stored = localStorage.getItem(DEBIT_STATUS_STORAGE_KEY);
   try {
     return stored ? JSON.parse(stored) : {};
   } catch (e) {
     console.error("Error parsing debit statuses:", e);
     return {};
   }
 };

 // Helper to save debit statuses to localStorage
 const saveDebitStatuses = (statuses: { [key: string]: 'PAGO' | 'ENVIADO_FINANCEIRO' }): void => {
   if (typeof window === 'undefined') return;
   try {
     localStorage.setItem(DEBIT_STATUS_STORAGE_KEY, JSON.stringify(statuses));
   } catch (e) {
     console.error("Error saving debit statuses:", e);
   }
 };

 // Helper to delete a specific debit status
 const deleteDebitStatus = (id: string): void => {
    if (typeof window === 'undefined') return;
    const statuses = getDebitStatuses();
    delete statuses[id];
    saveDebitStatuses(statuses);
 }

 export const fetchDebitos = async (): Promise<Debito[]> => {
   console.log('Fetching debitos based on licitacoes...');
   await new Promise(resolve => setTimeout(resolve, 450)); // Simulate API delay
   const licitacoes = getLicitacoesFromStorage();
   const { fetchClientDetails } = await import('@/services/clientService');
   const debitStatuses = getDebitStatuses(); // Load persisted finance statuses

   const debitos: Debito[] = [];

   await Promise.all(licitacoes.map(async lic => {
       // Only create debit if status is homologado AND homologation date exists
       if (lic.status === 'PROCESSO_HOMOLOGADO' && lic.dataHomologacao) {
            const client = await fetchClientDetails(lic.clienteId);
            const homologationDate = typeof lic.dataHomologacao === 'string' ? parseISO(lic.dataHomologacao) : lic.dataHomologacao;

            // Ensure homologationDate is valid before proceeding
            if (homologationDate instanceof Date && !isNaN(homologationDate.getTime())) {
               const currentStatus = debitStatuses[lic.id] || 'PENDENTE'; // Get persisted status or default to PENDENTE
               debitos.push({
                   id: lic.id,
                   licitacaoNumero: lic.numeroLicitacao,
                   clienteNome: lic.clienteNome,
                   clienteCnpj: client?.cnpj || 'CNPJ N/A',
                   valor: lic.valorCobrado,
                   dataHomologacao: homologationDate,
                   status: currentStatus,
               });
            } else {
                console.warn(`Skipping debit creation for ${lic.id} due to invalid homologation date:`, lic.dataHomologacao);
            }
       }
   }));

   console.log("Generated Debitos:", debitos);
   return debitos;
 };


 // Updates the *finance* status of a debit in localStorage
 export const updateDebitoStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO'): Promise<boolean> => {
   console.log(`Updating debit (finance) status for Licitacao ID: ${id} to status: ${newStatus}`);
   await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
   try {
      if (typeof window !== 'undefined') {
          const statuses = getDebitStatuses();
          statuses[id] = newStatus;
          saveDebitStatuses(statuses);
          return true;
      }
      return false; // Cannot update on server-side
   } catch (error) {
       console.error("Error updating debit status:", error);
       return false;
   }
 }
