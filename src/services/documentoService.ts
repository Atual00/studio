
'use client';

import { parseISO, isValid } from 'date-fns';
import { fetchClients } from './clientService'; // To get client names

const LOCAL_STORAGE_KEY = 'licitaxDocumentos';

export interface Documento {
  id: string; // Unique ID for the document instance
  clienteId: string;
  clienteNome: string; // Denormalized for display
  tipoDocumento: string; // e.g., CND Federal, Contrato Social
  dataVencimento: Date | null | string; // Allow string for storage, null if not applicable
  // Could add file link/reference here later
  // fileUrl?: string;
}

type DocumentoFormData = Omit<Documento, 'id' | 'clienteNome'>; // Type for adding/updating

// --- Helper Functions ---

const getDocumentosFromStorage = (): Documento[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    const items: any[] = storedData ? JSON.parse(storedData) : [];
    // Ensure dates are parsed (or null) and clienteNome exists
     return items.map(item => ({
        ...item,
        dataVencimento: item.dataVencimento ? parseAndValidateDate(item.dataVencimento) : null,
        clienteNome: item.clienteNome || 'Cliente Desconhecido', // Fallback
     })).filter(item => item.clienteId); // Ensure basic validity
  } catch (e) {
    console.error("Error parsing documentos from localStorage:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return [];
  }
};

const saveDocumentosToStorage = (documentos: Documento[]): void => {
  if (typeof window === 'undefined') return;
  try {
     // Store dates as ISO strings or null
     const itemsToStore = documentos.map(doc => ({
        ...doc,
        dataVencimento: doc.dataVencimento instanceof Date && isValid(doc.dataVencimento)
                         ? doc.dataVencimento.toISOString()
                         : null,
     }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(itemsToStore));
  } catch (e) {
    console.error("Error saving documentos to localStorage:", e);
  }
};

// Helper to parse and validate date strings
const parseAndValidateDate = (dateStr: string | Date | null): Date | null => {
   if (!dateStr) return null;
   if (dateStr instanceof Date && isValid(dateStr)) return dateStr;
   if (typeof dateStr === 'string') {
      try {
         const parsed = parseISO(dateStr);
         return isValid(parsed) ? parsed : null;
      } catch {
         return null;
      }
   }
   return null;
}

// --- Service Functions ---

/**
 * Fetches all stored documents.
 * @returns A promise that resolves to an array of Documento objects.
 */
export const fetchDocumentos = async (): Promise<Documento[]> => {
  console.log('Fetching documentos...');
  await new Promise(resolve => setTimeout(resolve, 250)); // Simulate API delay
  return getDocumentosFromStorage();
};

/**
 * Adds a new document.
 * @param data The data for the new document (DocumentoFormData).
 * @returns A promise that resolves to the newly created Documento (with ID and client name) or null on failure.
 */
export const addDocumento = async (data: DocumentoFormData): Promise<Documento | null> => {
  console.log("Adding new documento:", data);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

  if (!data.clienteId || !data.tipoDocumento) {
    console.error("Document add failed: Missing required fields");
    throw new Error("Cliente e Tipo de Documento são obrigatórios.");
  }

  // Fetch client name
  const clients = await fetchClients(); // Assuming this returns { id: string, name: string }[]
  const cliente = clients.find(c => c.id === data.clienteId);
  if (!cliente) {
      throw new Error(`Cliente com ID ${data.clienteId} não encontrado.`);
  }

  const documentos = getDocumentosFromStorage();

  const newDocumento: Documento = {
    ...data,
    id: `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clienteNome: cliente.name, // Use fetched client name
    dataVencimento: parseAndValidateDate(data.dataVencimento), // Ensure date is valid Date or null
  };

  const updatedDocumentos = [newDocumento, ...documentos]; // Add to the beginning
  saveDocumentosToStorage(updatedDocumentos);
  return newDocumento;
};

/**
 * Updates an existing document.
 * @param id The ID of the document to update.
 * @param data The partial data to update (Partial<DocumentoFormData>).
 * @returns A promise that resolves to true on success, false on failure.
 */
export const updateDocumento = async (id: string, data: Partial<DocumentoFormData>): Promise<boolean> => {
  console.log(`Updating documento ID: ${id} with data:`, data);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

  const documentos = getDocumentosFromStorage();
  const docIndex = documentos.findIndex(d => d.id === id);

  if (docIndex === -1) {
    console.error(`Document update failed: Document with ID ${id} not found.`);
    return false;
  }

   const existingDoc = documentos[docIndex];
   let clienteNome = existingDoc.clienteNome;

   // If client ID is changing, fetch the new client name
   if (data.clienteId && data.clienteId !== existingDoc.clienteId) {
      const clients = await fetchClients();
      const newCliente = clients.find(c => c.id === data.clienteId);
       if (!newCliente) {
           throw new Error(`Novo Cliente com ID ${data.clienteId} não encontrado.`);
       }
       clienteNome = newCliente.name;
   }


  const updatedDocumento: Documento = {
    ...existingDoc,
    ...data,
     clienteNome: clienteNome, // Update client name if needed
    // Ensure date is valid Date or null
    dataVencimento: data.dataVencimento !== undefined
                     ? parseAndValidateDate(data.dataVencimento)
                     : existingDoc.dataVencimento, // Keep existing if not provided
  };

  const updatedDocumentos = [...documentos];
  updatedDocumentos[docIndex] = updatedDocumento;

  saveDocumentosToStorage(updatedDocumentos);
  return true;
};

/**
 * Deletes a document by ID.
 * @param id The ID of the document to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteDocumento = async (id: string): Promise<boolean> => {
  console.log(`Deleting documento ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  const documentos = getDocumentosFromStorage();
  const updatedDocumentos = documentos.filter(d => d.id !== id);

  if (documentos.length === updatedDocumentos.length) {
    console.error(`Document delete failed: Document with ID ${id} not found.`);
    return false; // Not found
  }

  saveDocumentosToStorage(updatedDocumentos);
  return true;
};
