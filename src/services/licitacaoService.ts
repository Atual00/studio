

'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel } from 'lucide-react';
import { parseISO, isValid } from 'date-fns'; // Import parseISO and isValid
import { type User } from './userService'; // Import User type

const LOCAL_STORAGE_KEY = 'licitaxLicitacoes';
const DEBIT_STATUS_STORAGE_KEY = 'licitaxDebitStatuses'; // Key for finance statuses

// --- Helper Functions ---

const getLicitacoesFromStorage = (): LicitacaoDetails[] => {
  if (typeof window === 'undefined') return []; // Avoid server-side execution
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    // Attempt to parse dates stored as ISO strings
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
         // Parse dates carefully, handling potential invalid strings
         dataInicio: parseDate(item.dataInicio),
         dataMetaAnalise: parseDate(item.dataMetaAnalise),
         // Ensure dataHomologacao is also parsed if stored
         dataHomologacao: parseDate(item.dataHomologacao),
         comentarios: (item.comentarios || []).map((c:any) => ({...c, data: parseDate(c.data) })),
         // Ensure checklist is an object
         checklist: typeof item.checklist === 'object' && item.checklist !== null ? item.checklist : {},
         // Ensure numeric fields are numbers
         valorCobrado: typeof item.valorCobrado === 'number' ? item.valorCobrado : 0,
         valorTotalLicitacao: typeof item.valorTotalLicitacao === 'number' ? item.valorTotalLicitacao : 0,
         valorPrimeiroColocado: typeof item.valorPrimeiroColocado === 'number' ? item.valorPrimeiroColocado : undefined,
       };
     }).filter(item => item.dataInicio instanceof Date); // Filter out items with invalid start dates
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
        dataInicio: item.dataInicio instanceof Date && isValid(item.dataInicio) ? item.dataInicio.toISOString() : null,
        dataMetaAnalise: item.dataMetaAnalise instanceof Date && isValid(item.dataMetaAnalise) ? item.dataMetaAnalise.toISOString() : null,
        dataHomologacao: item.dataHomologacao instanceof Date && isValid(item.dataHomologacao) ? item.dataHomologacao.toISOString() : null, // Save homologation date
        comentarios: (item.comentarios || []).map(c => ({...c, data: c.data instanceof Date && isValid(c.data) ? c.data.toISOString() : null })),
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
  orgaoComprador: string; // Added field
  valorTotalLicitacao?: number; // Added field (make optional if needed)
  createdBy?: { // Store who created the bid
      userId?: string; // If using IDs from userService
      username: string;
      fullName?: string;
      cpf?: string;
  }
}


export type LicitacaoListItem = Pick<
    LicitacaoDetails,
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status' | 'orgaoComprador'
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
  return licitacoes.map(({ id, clienteNome, modalidade, numeroLicitacao, plataforma, dataInicio, dataMetaAnalise, status, orgaoComprador }) => ({
    id,
    clienteNome,
    modalidade,
    numeroLicitacao,
    orgaoComprador, // Include new field
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

   const parseDate = (date: Date | string | undefined): Date | undefined => {
       if (!date) return undefined;
       try {
           const parsed = typeof date === 'string' ? parseISO(date) : date;
           return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
       } catch { return undefined; }
   }


  if (licitacao) {
      // Ensure dates are Date objects when returning details
      return {
          ...licitacao,
          dataInicio: parseDate(licitacao.dataInicio) as Date, // Assert Date as it's filtered on load
          dataMetaAnalise: parseDate(licitacao.dataMetaAnalise) as Date, // Assert Date
          dataHomologacao: parseDate(licitacao.dataHomologacao),
          comentarios: (licitacao.comentarios || []).map(c => ({...c, data: parseDate(c.data) as Date })), // Assert Date
      };
  }

  return null;
};

/**
 * Adds a new licitacao.
 * @param data The data for the new licitacao (LicitacaoFormValues).
 * @param currentUser The user creating the licitacao (optional, for signature).
 * @returns A promise that resolves to the newly created LicitacaoDetails (with ID) or null on failure.
 */
export const addLicitacao = async (
    data: LicitacaoFormValues,
    currentUser?: { username: string; fullName?: string; cpf?: string } | null // Accept user info
): Promise<LicitacaoDetails | null> => {
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
    valorPrimeiroColocado: undefined, // Initialize
    orgaoComprador: data.orgaoComprador, // Added field
    valorTotalLicitacao: data.valorTotalLicitacao, // Added field
    // Add creator info if available
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

   // Ensure dates passed in `data` are converted to Date objects if they are strings
    const parseUpdateDate = (date: Date | string | undefined): Date | undefined => {
        if (!date) return undefined;
        try {
            const parsed = typeof date === 'string' ? parseISO(date) : date;
            return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
        } catch { return undefined; }
    };


  // Merge existing data with new data
  const updatedLicitacao: LicitacaoDetails = {
      ...existingLicitacao,
      ...data,
      dataHomologacao: homologationDate instanceof Date ? homologationDate : parseUpdateDate(homologationDate), // Assign parsed homologation date
       // Ensure dates are handled correctly (prefer Date objects)
      dataInicio: data.dataInicio ? parseUpdateDate(data.dataInicio) as Date : existingLicitacao.dataInicio as Date,
      dataMetaAnalise: data.dataMetaAnalise ? parseUpdateDate(data.dataMetaAnalise) as Date : existingLicitacao.dataMetaAnalise as Date,
      // Ensure comments preserve Date objects if updated
       comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: parseUpdateDate(c.data) as Date })) : existingLicitacao.comentarios,
       // Ensure numeric fields are numbers
       valorCobrado: data.valorCobrado !== undefined ? Number(data.valorCobrado) : existingLicitacao.valorCobrado,
       valorTotalLicitacao: data.valorTotalLicitacao !== undefined ? Number(data.valorTotalLicitacao) : existingLicitacao.valorTotalLicitacao,
       valorPrimeiroColocado: data.valorPrimeiroColocado !== undefined ? Number(data.valorPrimeiroColocado) : existingLicitacao.valorPrimeiroColocado,
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
     localStorage.removeItem(DEBIT_STATUS_STORAGE_KEY); // Clear corrupted data
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
       // Only create debit if status is homologado AND homologation date exists and is valid
       if (lic.status === 'PROCESSO_HOMOLOGADO' && lic.dataHomologacao) {
            const homologationDate = typeof lic.dataHomologacao === 'string' ? parseISO(lic.dataHomologacao) : lic.dataHomologacao;

            if (homologationDate instanceof Date && isValid(homologationDate)) {
               try {
                   const client = await fetchClientDetails(lic.clienteId);
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
               } catch (clientError) {
                   console.error(`Error fetching client details for licitacao ${lic.id}:`, clientError);
                   // Optionally create debit with fallback client name if needed
                   // const currentStatus = debitStatuses[lic.id] || 'PENDENTE';
                   // debitos.push({ ... , clienteNome: lic.clienteNome || 'Cliente N/A', clienteCnpj: 'CNPJ N/A', ... });
               }

            } else {
                console.warn(`Skipping debit creation for ${lic.id} due to invalid homologation date:`, lic.dataHomologacao);
            }
       }
   }));

   // Sort debitos by homologation date descending
   debitos.sort((a, b) => b.dataHomologacao.getTime() - a.dataHomologacao.getTime());

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
