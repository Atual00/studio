
'use client';

import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form';

const LOCAL_STORAGE_KEY = 'licitaxConfiguracoesEmpresa';

// --- Helper Functions ---

const getConfigFromStorage = (): ConfiguracoesFormValues | null => {
  if (typeof window === 'undefined') return null; // Avoid server-side execution
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    if (storedData) {
        const parsedData = JSON.parse(storedData);
         // Ensure diaVencimentoPadrao is a number
         parsedData.diaVencimentoPadrao = typeof parsedData.diaVencimentoPadrao === 'number'
           ? parsedData.diaVencimentoPadrao
           : 15; // Default if missing or wrong type
        return parsedData;
    }
    return null;
  } catch (e) {
    console.error("Error parsing configurations from localStorage:", e);
    return null;
  }
};

const saveConfigToStorage = (config: ConfiguracoesFormValues): void => {
   if (typeof window === 'undefined') return;
  try {
    // Ensure diaVencimentoPadrao is stored as a number
     const configToSave = {
        ...config,
        diaVencimentoPadrao: Number(config.diaVencimentoPadrao)
     };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
  } catch (e) {
    console.error("Error saving configurations to localStorage:", e);
  }
};

// Default configurations if none are stored
const getDefaultConfig = (): ConfiguracoesFormValues => ({
    razaoSocial: 'Sua Assessoria Ltda',
    cnpj: '00.000.000/0001-00', // Example placeholder
    email: 'contato@suaassessoria.com',
    telefone: '(XX) XXXXX-XXXX',
    enderecoCep: '00000-000',
    enderecoRua: 'Rua Exemplo',
    enderecoNumero: '123',
    enderecoBairro: 'Centro',
    enderecoCidade: 'Sua Cidade',
    // Leave bank details empty initially
    banco: '',
    agencia: '',
    conta: '',
    chavePix: '',
    diaVencimentoPadrao: 15, // Default day
});


// --- Service Functions ---

/**
 * Fetches the current company configurations.
 * Returns default values if no configuration is found.
 * @returns A promise that resolves to the ConfiguracoesFormValues.
 */
export const fetchConfiguracoes = async (): Promise<ConfiguracoesFormValues> => {
  console.log('Fetching configurations...');
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate small delay
  const storedConfig = getConfigFromStorage();
  return storedConfig || getDefaultConfig(); // Return stored config or defaults
};

/**
 * Updates the company configurations.
 * @param data The configuration data to save.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const updateConfiguracoes = async (data: ConfiguracoesFormValues): Promise<boolean> => {
  console.log('Updating configurations:', data);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  try {
    saveConfigToStorage(data);
    return true; // Simulate success
  } catch (e) {
    console.error("Error during configuration update:", e);
    return false; // Simulate failure
  }
};
