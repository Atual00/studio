
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

// --- Service Functions ---

/**
 * Fetches all stored documents from the backend API.
 * @returns A promise that resolves to an array of Documento objects.
 */
export const fetchDocumentos = async (): Promise<Documento[]> => {
  console.log('Fetching documentos from API...');
  try {
    const response = await fetch('/api/documentos');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to fetch documents: ${errorData.message || response.status}`);
    }
    const documentos: Documento[] = await response.json();
    // Parse date strings into Date objects for client-side use
    return documentos.map(doc => ({
      ...doc,
      dataVencimento: parseAndValidateDate(doc.dataVencimento)
    }));
  } catch (error) {
    console.error('Error in fetchDocumentos:', error);
    throw error;
  }
};

/**
 * Adds a new document via the backend API.
 * @param data The data for the new document (DocumentoFormData).
 * @returns A promise that resolves to the newly created Documento or null on failure.
 */
export const addDocumento = async (data: DocumentoFormData): Promise<Documento | null> => {
  console.log("Adding new documento via API:", data);
  try {
    const response = await fetch('/api/documentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        // Ensure date is sent in a format the backend can parse (ISO string)
        dataVencimento: data.dataVencimento instanceof Date && isValid(data.dataVencimento)
                         ? data.dataVencimento.toISOString()
                         : null,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'Failed to add document');
    }
    const newDoc = await response.json();
    // Parse date on return for immediate use
    return { ...newDoc, dataVencimento: parseAndValidateDate(newDoc.dataVencimento) };
  } catch (error) {
    console.error('Error in addDocumento:', error);
    throw error;
  }
};

/**
 * Updates an existing document via the backend API.
 * @param id The ID of the document to update.
 * @param data The partial data to update (Partial<DocumentoFormData>).
 * @returns A promise that resolves to true on success, false on failure.
 */
export const updateDocumento = async (id: string, data: Partial<DocumentoFormData>): Promise<boolean> => {
  console.log(`Updating documento ID via API: ${id}`);
  try {
    const response = await fetch(`/api/documentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        dataVencimento: data.dataVencimento instanceof Date && isValid(data.dataVencimento)
                         ? data.dataVencimento.toISOString()
                         : (data.dataVencimento === null ? null : undefined), // Handle explicit null or ignore
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error in updateDocumento:', error);
    throw error;
  }
};

/**
 * Deletes a document by ID via the backend API.
 * @param id The ID of the document to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteDocumento = async (id: string): Promise<boolean> => {
  console.log(`Deleting documento ID via API: ${id}`);
  try {
    const response = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.error('Error in deleteDocumento:', error);
    throw error;
  }
};
