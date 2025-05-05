
'use client';

import type { ClientFormValues, ClientDetails } from '@/components/clientes/client-form';

const LOCAL_STORAGE_KEY = 'licitaxClients';

// --- Helper Functions ---

const getClientsFromStorage = (): ClientDetails[] => {
  if (typeof window === 'undefined') return []; // Avoid server-side execution
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    return storedData ? JSON.parse(storedData) : [];
  } catch (e) {
    console.error("Error parsing clients from localStorage:", e);
    return [];
  }
};

const saveClientsToStorage = (clients: ClientDetails[]): void => {
   if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
  } catch (e) {
    console.error("Error saving clients to localStorage:", e);
  }
};

// --- Service Functions ---

// Exporting ClientListItem type explicitly
export type ClientListItem = Pick<ClientDetails, 'id' | 'razaoSocial' | 'nomeFantasia' | 'cnpj' | 'cidade'> & { name: string }; // Added 'name' for consistency

/**
 * Fetches a simplified list of all clients.
 * @returns A promise that resolves to an array of ClientListItems.
 */
export const fetchClients = async (): Promise<ClientListItem[]> => {
  console.log('Fetching all clients...');
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
  const clients = getClientsFromStorage();
  return clients.map(({ id, razaoSocial, nomeFantasia, cnpj, enderecoCidade }) => ({
    id,
    razaoSocial,
    nomeFantasia,
    cnpj,
    cidade: enderecoCidade, // Map enderecoCidade to cidade
    name: razaoSocial, // Add 'name' property, using razaoSocial as default
  }));
};

/**
 * Fetches the full details of a specific client by ID.
 * @param id The ID of the client to fetch.
 * @returns A promise that resolves to the ClientDetails or null if not found.
 */
export const fetchClientDetails = async (id: string): Promise<ClientDetails | null> => {
  console.log(`Fetching details for client ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  const clients = getClientsFromStorage();
  const client = clients.find(c => c.id === id);
  return client || null;
};

/**
 * Adds a new client.
 * @param data The data for the new client (ClientFormValues).
 * @returns A promise that resolves to the newly created ClientDetails (with ID) or null on failure.
 */
export const addClient = async (data: ClientFormValues): Promise<ClientDetails | null> => {
  console.log("Adding new client:", data);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  // Basic validation (though Zod handles most)
  if (!data.razaoSocial || !data.cnpj) {
    console.error("Client add failed: Missing required fields");
    return null;
  }

  const clients = getClientsFromStorage();

  // Check for duplicate CNPJ (optional but recommended)
  if (clients.some(c => c.cnpj === data.cnpj)) {
       throw new Error(`Já existe um cliente com o CNPJ ${data.cnpj}.`);
  }


  const newClient: ClientDetails = {
    ...data,
    id: `CLI-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Simple unique ID generation
  };

  const updatedClients = [...clients, newClient];
  saveClientsToStorage(updatedClients);
  return newClient;
};

/**
 * Updates an existing client.
 * @param id The ID of the client to update.
 * @param data The partial data to update (ClientFormValues).
 * @returns A promise that resolves to true on success, false on failure (e.g., client not found).
 */
export const updateClient = async (id: string, data: Partial<ClientFormValues>): Promise<boolean> => {
  console.log(`Updating client ID: ${id} with data:`, data);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

  const clients = getClientsFromStorage();
  const clientIndex = clients.findIndex(c => c.id === id);

  if (clientIndex === -1) {
    console.error(`Client update failed: Client with ID ${id} not found.`);
    return false;
  }

   // Check for duplicate CNPJ if CNPJ is being changed
   if (data.cnpj && data.cnpj !== clients[clientIndex].cnpj) {
       if (clients.some((c, index) => index !== clientIndex && c.cnpj === data.cnpj)) {
           throw new Error(`Já existe outro cliente com o CNPJ ${data.cnpj}.`);
       }
   }


  const updatedClient = { ...clients[clientIndex], ...data };
  const updatedClients = [...clients];
  updatedClients[clientIndex] = updatedClient;

  saveClientsToStorage(updatedClients);
  return true;
};

/**
 * Deletes a client by ID.
 * @param id The ID of the client to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  console.log(`Deleting client ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay

  const clients = getClientsFromStorage();
  const updatedClients = clients.filter(c => c.id !== id);

  if (clients.length === updatedClients.length) {
    console.error(`Client delete failed: Client with ID ${id} not found.`);
    return false; // Client not found
  }

  saveClientsToStorage(updatedClients);
  // TODO: Consider deleting related data (licitacoes, senhas) here or handle cascading deletes
  return true;
};

    