
'use client';

import type { ClientFormValues, ClientDetails } from '@/components/clientes/client-form';

const LOCAL_STORAGE_KEY = 'licitaxClients';

// --- Helper Functions ---

const getClientsFromStorage = (): ClientDetails[] => {
  if (typeof window === 'undefined') return [];
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

export type ClientListItem = Pick<ClientDetails, 'id' | 'razaoSocial' | 'nomeFantasia' | 'cnpj'> & { cidade: string, name: string };

export const fetchClients = async (): Promise<ClientListItem[]> => {
  console.log('Fetching all clients from localStorage...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
  const clients = getClientsFromStorage();
  return clients.map(({ id, razaoSocial, nomeFantasia, cnpj, enderecoCidade }) => ({
    id,
    razaoSocial,
    nomeFantasia: nomeFantasia || '',
    cnpj,
    cidade: enderecoCidade,
    name: razaoSocial,
  }));
};

export const fetchClientDetails = async (id: string): Promise<ClientDetails | null> => {
  console.log(`Fetching details for client ID from localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
  const clients = getClientsFromStorage();
  return clients.find(client => client.id === id) || null;
};

export const addClient = async (data: ClientFormValues): Promise<ClientDetails | null> => {
  console.log("Adding new client to localStorage:", data);
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
  const clients = getClientsFromStorage();
  
  if (clients.some(client => client.cnpj === data.cnpj)) {
    throw new Error(`CNPJ ${data.cnpj} já cadastrado.`);
  }

  const newClient: ClientDetails = {
    id: `CLI-${Date.now()}`,
    ...data,
  };
  
  saveClientsToStorage([...clients, newClient]);
  return newClient;
};

export const updateClient = async (id: string, data: Partial<ClientFormValues>): Promise<boolean> => {
  console.log(`Updating client ID in localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 200));
  const clients = getClientsFromStorage();
  const clientIndex = clients.findIndex(client => client.id === id);

  if (clientIndex === -1) {
    return false;
  }

  // Check for CNPJ conflict if CNPJ is being changed
  if (data.cnpj && data.cnpj !== clients[clientIndex].cnpj) {
      if (clients.some(c => c.cnpj === data.cnpj && c.id !== id)) {
           throw new Error(`CNPJ ${data.cnpj} já cadastrado para outro cliente.`);
      }
  }

  clients[clientIndex] = { ...clients[clientIndex], ...data };
  saveClientsToStorage(clients);
  return true;
};

export const deleteClient = async (id: string): Promise<boolean> => {
  console.log(`Deleting client ID from localStorage: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  let clients = getClientsFromStorage();
  const initialLength = clients.length;
  clients = clients.filter(client => client.id !== id);
  
  if (clients.length < initialLength) {
    saveClientsToStorage(clients);
    // Also delete related data
    // This part is simplified; a real app might need more robust cascading deletes.
    let licitacoes = JSON.parse(localStorage.getItem('licitaxLicitacoes') || '[]');
    localStorage.setItem('licitaxLicitacoes', JSON.stringify(licitacoes.filter((l: any) => l.clienteId !== id)));
    
    let debitos = JSON.parse(localStorage.getItem('licitaxDebitos') || '[]');
    localStorage.setItem('licitaxDebitos', JSON.stringify(debitos.filter((d: any) => d.clienteId !== id)));

    let documentos = JSON.parse(localStorage.getItem('licitaxDocumentos') || '[]');
    localStorage.setItem('licitaxDocumentos', JSON.stringify(documentos.filter((doc: any) => doc.clienteId !== id)));
    
    return true;
  }
  return false;
};
