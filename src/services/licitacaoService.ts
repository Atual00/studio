'use client';

import type { LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { CalendarCheck, CheckCircle, Clock, FileWarning, HelpCircle, Loader2, Send, Target, XCircle, Gavel } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'licitaxLicitacoes';

// --- Helper Functions ---

const getLicitacoesFromStorage = (): LicitacaoDetails[] => {
  if (typeof window === 'undefined') return []; // Avoid server-side execution
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    // Attempt to parse dates stored as ISO strings
    const items = storedData ? JSON.parse(storedData) : [];
    return items.map((item: any) => ({
        ...item,
        dataInicio: item.dataInicio ? new Date(item.dataInicio) : undefined,
        dataMetaAnalise: item.dataMetaAnalise ? new Date(item.dataMetaAnalise) : undefined,
        comentarios: (item.comentarios || []).map((c:any) => ({...c, data: c.data ? new Date(c.data) : undefined })),
        // Ensure checklist is an object
        checklist: typeof item.checklist === 'object' && item.checklist !== null ? item.checklist : {},
    }));
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
  // cnpjCliente: string; // Removed, fetch from clientService if needed
  status: string; // Use keys from statusMap
  checklist: { [key: string]: boolean };
  comentarios: { id: string, texto: string, data: Date | string, autor: string }[]; // Allow string for storage
  valorPrimeiroColocado?: number;
  // Dates should be Date objects in application logic, stored as ISO strings
  dataInicio: Date | string;
  dataMetaAnalise: Date | string;
}


export type LicitacaoListItem = Pick<
    LicitacaoDetails,
    'id' | 'clienteNome' | 'modalidade' | 'numeroLicitacao' | 'plataforma' | 'dataInicio' | 'dataMetaAnalise' | 'status'
    // | 'cnpjCliente' // Removed
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
  // Add more statuses as needed
   PROCESSO_ENCERRADO: {label: 'Processo Encerrado', color: 'secondary', icon: XCircle},
   RECURSO_IMPUGNACAO: {label: 'Recurso/Impugnação', color: 'warning', icon: HelpCircle},
};

// Required documents list - Centralized
export const requiredDocuments = [
  { id: 'contratoSocial', label: 'Contrato Social/Req.Empresário/Estatuto' },
  { id: 'cnpjDoc', label: 'Cartão CNPJ' },
  { id: 'certidoesRegularidade', label: 'Certidões de Regularidade Fiscal (Fed/Est/Mun)' },
  // { id: 'cndEstadual', label: 'CND Estadual' }, // Combined above
  // { id: 'cndMunicipal', label: 'CND Municipal' }, // Combined above
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
      return {
          ...licitacao,
          dataInicio: typeof licitacao.dataInicio === 'string' ? new Date(licitacao.dataInicio) : licitacao.dataInicio,
          dataMetaAnalise: typeof licitacao.dataMetaAnalise === 'string' ? new Date(licitacao.dataMetaAnalise) : licitacao.dataMetaAnalise,
          comentarios: (licitacao.comentarios || []).map(c => ({...c, data: typeof c.data === 'string' ? new Date(c.data) : c.data }))
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

  // Fetch client name (ideally pass client name or fetch from clientService)
   // This requires clientService to be available/imported
   const { fetchClientDetails } = await import('@/services/clientService'); // Dynamic import if needed
   const client = await fetchClientDetails(data.clienteId);
   if (!client) {
      throw new Error(`Cliente com ID ${data.clienteId} não encontrado.`);
   }


  const licitacoes = getLicitacoesFromStorage();

  const newLicitacao: LicitacaoDetails = {
    ...data,
    id: `LIC-${Date.now()}`, // Simple unique ID (protocolo)
    clienteNome: client.razaoSocial, // Add client name
    // cnpjCliente: client.cnpj, // Add CNPJ
    status: 'AGUARDANDO_ANALISE', // Initial status
    checklist: {}, // Initialize empty checklist
    comentarios: [], // Initialize empty comments
    // Dates are already Date objects from the form
    dataInicio: data.dataInicio,
    dataMetaAnalise: data.dataMetaAnalise,
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

  // Merge existing data with new data
  const updatedLicitacao = {
      ...licitacoes[licitacaoIndex],
      ...data,
       // Ensure dates are handled correctly (might be string or Date)
      dataInicio: data.dataInicio ? (typeof data.dataInicio === 'string' ? new Date(data.dataInicio) : data.dataInicio) : licitacoes[licitacaoIndex].dataInicio,
      dataMetaAnalise: data.dataMetaAnalise ? (typeof data.dataMetaAnalise === 'string' ? new Date(data.dataMetaAnalise) : data.dataMetaAnalise) : licitacoes[licitacaoIndex].dataMetaAnalise,
      // Ensure comments preserve Date objects if updated
      comentarios: data.comentarios ? data.comentarios.map(c => ({...c, data: typeof c.data === 'string' ? new Date(c.data) : c.data })) : licitacoes[licitacaoIndex].comentarios,
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
  // TODO: Optionally delete related financial records if applicable
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
  dataHomologacao: Date; // Or date when status changed to Homologado
  status: 'PENDENTE' | 'PAGO' | 'ENVIADO_FINANCEIRO'; // Status specific to finance
  // Add other finance-specific fields if needed (e.g., invoice number, payment date)
}

 export const fetchDebitos = async (): Promise<Debito[]> => {
   console.log('Fetching debitos based on licitacoes...');
   await new Promise(resolve => setTimeout(resolve, 450)); // Simulate API delay
   const licitacoes = getLicitacoesFromStorage();
   const { fetchClientDetails } = await import('@/services/clientService'); // Dynamic import

   const debitos: Debito[] = [];

   // Use Promise.all to fetch client CNPJs concurrently if needed
   await Promise.all(licitacoes.map(async lic => {
       if (lic.status === 'PROCESSO_HOMOLOGADO') {
            const client = await fetchClientDetails(lic.clienteId);
            debitos.push({
               id: lic.id,
               licitacaoNumero: lic.numeroLicitacao,
               clienteNome: lic.clienteNome,
               clienteCnpj: client?.cnpj || 'CNPJ não encontrado', // Get CNPJ from client details
               valor: lic.valorCobrado, // Use valorCobrado from licitacao
               dataHomologacao: new Date(), // Placeholder: Use actual homologation date if tracked
               status: 'PENDENTE', // Initial status for new debits
               // TODO: Need a way to persist and load the *finance* status ('PAGO', 'ENVIADO_FINANCEIRO')
               // This mock always returns PENDENTE for homologated items.
               // A separate storage mechanism (e.g., localStorage key for debit statuses) or
               // adding finance status directly to LicitacaoDetails would be needed.
           });
       }
   }));


   // --- Mocking persisted finance statuses (REMOVE THIS IN REAL APP) ---
   // This part simulates loading previously saved statuses. In a real app,
   // you'd load this from wherever you store the financial status.
    const mockPersistedStatuses: { [key: string]: 'PAGO' | 'ENVIADO_FINANCEIRO' } = {
       // 'LIC-1720000000001': 'PAGO', // Example: If LIC-XXX was previously paid
       // 'LIC-1721000000002': 'ENVIADO_FINANCEIRO'
    };
    const finalDebitos = debitos.map(d => {
       const persistedStatus = mockPersistedStatuses[d.id];
       return persistedStatus ? { ...d, status: persistedStatus } : d;
    });
   // --- End Mocking ---

   console.log("Generated Debitos:", finalDebitos);
   return finalDebitos;
 };


 // Mock function to update the *finance* status of a debit
 // In a real app, this would update the persisted finance status storage
 export const updateDebitoStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO'): Promise<boolean> => {
   console.log(`Updating debit (finance) status for Licitacao ID: ${id} to status: ${newStatus}`);
   await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
   // TODO: Implement actual persistence of the finance status.
   // Example using a separate localStorage item (simplistic):
   /*
   if (typeof window !== 'undefined') {
       const statuses = JSON.parse(localStorage.getItem('licitaxDebitStatuses') || '{}');
       statuses[id] = newStatus;
       localStorage.setItem('licitaxDebitStatuses', JSON.stringify(statuses));
   }
   */
   console.warn("Persistence for debit finance status not fully implemented.");
   return true; // Simulate success
 }
