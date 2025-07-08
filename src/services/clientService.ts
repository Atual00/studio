
'use client';

import type { ClientFormValues, ClientDetails } from '@/components/clientes/client-form';

// --- Service Functions ---

// Exporting ClientListItem type explicitly
export type ClientListItem = Pick<ClientDetails, 'id' | 'razaoSocial' | 'nomeFantasia' | 'cnpj'> & { cidade: string, name: string };

/**
 * Fetches a simplified list of all clients from the backend API.
 * @returns A promise that resolves to an array of ClientListItems.
 */
export const fetchClients = async (): Promise<ClientListItem[]> => {
  console.log('Fetching all clients from API...');
  try {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const serverErrorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
      throw new Error(`Failed to fetch clients: ${serverErrorMessage}`);
    }
    const clients: ClientDetails[] = await response.json();
    return clients.map(({ id, razaoSocial, nomeFantasia, cnpj, enderecoCidade }) => ({
      id,
      razaoSocial,
      nomeFantasia: nomeFantasia || '', // Ensure nomeFantasia is a string
      cnpj,
      cidade: enderecoCidade,
      name: razaoSocial,
    }));
  } catch (error) {
    console.error('Error in fetchClients:', error);
    throw error; // Re-throw to be caught by the caller
  }
};

/**
 * Fetches the full details of a specific client by ID from the backend API.
 * @param id The ID of the client to fetch.
 * @returns A promise that resolves to the ClientDetails or null if not found.
 */
export const fetchClientDetails = async (id: string): Promise<ClientDetails | null> => {
  console.log(`Fetching details for client ID from API: ${id}`);
  try {
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Client not found
      }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const serverErrorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
      throw new Error(`Failed to fetch client details: ${serverErrorMessage}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in fetchClientDetails:', error);
    throw error;
  }
};

/**
 * Adds a new client via the backend API.
 * @param data The data for the new client (ClientFormValues).
 * @returns A promise that resolves to the newly created ClientDetails (with ID) or null on failure.
 */
export const addClient = async (data: ClientFormValues): Promise<ClientDetails | null> => {
  console.log("Adding new client via API:", data);
  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const serverErrorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
      throw new Error(`Failed to add client: ${serverErrorMessage}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in addClient:', error);
    throw error;
  }
};

/**
 * Updates an existing client via the backend API.
 * @param id The ID of the client to update.
 * @param data The partial data to update (ClientFormValues).
 * @returns A promise that resolves to true on success, false on failure.
 */
export const updateClient = async (id: string, data: Partial<ClientFormValues>): Promise<boolean> => {
  console.log(`Updating client ID via API: ${id} with data:`, data);
  try {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const serverErrorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
      throw new Error(`Failed to update client: ${serverErrorMessage}`);
    }
    return response.ok;
  } catch (error) {
    console.error('Error in updateClient:', error);
    throw error;
  }
};

/**
 * Deletes a client by ID via the backend API.
 * @param id The ID of the client to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  console.log(`Deleting client ID via API: ${id}`);
  try {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const serverErrorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
      throw new Error(`Failed to delete client: ${serverErrorMessage}`);
    }
    return response.ok;
  } catch (error) {
    console.error('Error in deleteClient:', error);
    throw error;
  }
};
