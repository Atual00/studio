
'use client';

import { parseISO, isValid } from 'date-fns';

export interface Documento {
  id: string; // Unique ID for the document instance
  clienteId: string;
  clienteNome: string; // Denormalized for display
  tipoDocumento: string; // e.g., CND Federal, Contrato Social
  dataVencimento: Date | null | string; // Allow string for storage, null if not applicable
}

export type DocumentoFormData = Omit<Documento, 'id' | 'clienteNome'>; // Type for adding/updating

const LOCAL_STORAGE_KEY = 'licitaxDocumentos';

// Helper to parse and validate date strings or Date objects
const parseAndValidateDate = (dateInput: string | Date | null | undefined): Date | null => {
   if (!dateInput) return null;
   if (dateInput instanceof Date) {
       return isValid(dateInput) ? dateInput : null;
   }
   if (typeof dateInput === 'string') {
      try {
         const parsed = parseISO(dateInput);
         return isValid(parsed) ? parsed : null;
      } catch {
         return null;
      }
   }
   return null;
}

// --- LocalStorage Helper Functions ---

const getDocsFromStorage = (): Documento[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error parsing documents from localStorage:", e);
        return [];
    }
};

const saveDocsToStorage = (documentos: Documento[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documentos));
    } catch (e) {
        console.error("Error saving documents to localStorage:", e);
    }
};

const getClientsFromStorage = (): { id: string, razaoSocial: string }[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('licitaxClients');
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}


// --- Service Functions ---

export const fetchDocumentos = async (): Promise<Documento[]> => {
  console.log('Fetching documentos from localStorage...');
  await new Promise(resolve => setTimeout(resolve, 100));
  const documentos = getDocsFromStorage();
  // Parse date strings into Date objects for client-side use
  return documentos.map(doc => ({
    ...doc,
    dataVencimento: parseAndValidateDate(doc.dataVencimento)
  }));
};

export const addDocumento = async (data: DocumentoFormData): Promise<Documento | null> => {
  console.log("Adding new documento to localStorage:", data);
  await new Promise(resolve => setTimeout(resolve, 200));
  const allDocs = getDocsFromStorage();
  const clients = getClientsFromStorage();
  const client = clients.find(c => c.id === data.clienteId);
  if (!client) {
      throw new Error("Cliente não encontrado.");
  }

  const newDoc: Documento = {
    ...data,
    id: `DOC-${Date.now()}`,
    clienteNome: client.razaoSocial,
    dataVencimento: data.dataVencimento instanceof Date ? data.dataVencimento.toISOString() : null,
  };
  
  saveDocsToStorage([...allDocs, newDoc]);
  return { ...newDoc, dataVencimento: parseAndValidateDate(newDoc.dataVencimento) };
};

export const updateDocumento = async (id: string, data: Partial<DocumentoFormData>): Promise<boolean> => {
  console.log(`Updating documento ID in localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const allDocs = getDocsFromStorage();
  const index = allDocs.findIndex(d => d.id === id);

  if (index === -1) return false;

  const clients = getClientsFromStorage();
  let clientName = allDocs[index].clienteNome;
  if (data.clienteId && data.clienteId !== allDocs[index].clienteId) {
      const newClient = clients.find(c => c.id === data.clienteId);
      if (newClient) {
          clientName = newClient.razaoSocial;
      }
  }

  allDocs[index] = { 
      ...allDocs[index], 
      ...data,
      clienteNome: clientName,
      dataVencimento: data.dataVencimento instanceof Date ? data.dataVencimento.toISOString() : (data.dataVencimento === null ? null : allDocs[index].dataVencimento),
   };
  
  saveDocsToStorage(allDocs);
  return true;
};

export const deleteDocumento = async (id: string): Promise<boolean> => {
  console.log(`Deleting documento ID from localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const allDocs = getDocsFromStorage();
  const filtered = allDocs.filter(d => d.id !== id);
  
  if (allDocs.length === filtered.length) return false;

  saveDocsToStorage(filtered);
  return true;
};
