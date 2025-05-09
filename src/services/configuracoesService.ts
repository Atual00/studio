
'use client';

import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form';

const LOCAL_STORAGE_KEY = 'licitaxConfiguracoesEmpresa';
const LOGO_STORAGE_KEY = 'licitaxLogoUrl'; // Separate key for logo URL

// --- Helper Functions ---

const getConfigFromStorage = (): ConfiguracoesFormValues | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  const storedLogoUrl = localStorage.getItem(LOGO_STORAGE_KEY); // Get logo URL separately
  try {
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Ensure diaVencimentoPadrao is a number
      parsedData.diaVencimentoPadrao = typeof parsedData.diaVencimentoPadrao === 'number'
        ? parsedData.diaVencimentoPadrao
        : 15; // Default if missing or wrong type
      // Ensure taxaJurosDiaria is a number or default
      parsedData.taxaJurosDiaria = typeof parsedData.taxaJurosDiaria === 'number'
        ? parsedData.taxaJurosDiaria
        : 0.0; // Default 0%
       // Add logoUrl from its storage
       parsedData.logoUrl = storedLogoUrl || ''; // Default to empty string if not found
      return parsedData;
    }
    // If no main config, still check for logo
     if (storedLogoUrl) {
        const defaults = getDefaultConfig();
        defaults.logoUrl = storedLogoUrl;
        return defaults;
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
    // Separate logoUrl before saving main config
    const { logoUrl, ...mainConfig } = config;
    // Ensure diaVencimentoPadrao and taxaJurosDiaria are stored as numbers
    const configToSave = {
      ...mainConfig,
      diaVencimentoPadrao: Number(mainConfig.diaVencimentoPadrao),
      taxaJurosDiaria: mainConfig.taxaJurosDiaria !== undefined ? Number(mainConfig.taxaJurosDiaria) : undefined,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
    // Save logoUrl separately (or remove if empty/undefined)
    if (logoUrl) {
        localStorage.setItem(LOGO_STORAGE_KEY, logoUrl);
    } else {
        localStorage.removeItem(LOGO_STORAGE_KEY);
    }

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
  taxaJurosDiaria: 0.0, // Default 0% interest rate
  logoUrl: '', // Default empty logo URL
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


/**
 * Saves the uploaded logo file.
 * In a real app, this would upload to cloud storage and return the URL.
 * Here, we simulate it by storing a data URL in localStorage.
 * @param file The logo file to save.
 * @returns A promise that resolves to the URL of the saved logo, or null on failure.
 */
export const saveLogo = async (file: File): Promise<string | null> => {
    console.log('Saving logo:', file.name);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate upload delay
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl); // Store data URL
                    resolve(dataUrl);
                } else {
                    reject(new Error("Cannot save logo on server-side."));
                }
            } catch (e) {
                 console.error("Error saving logo to localStorage:", e);
                 // Handle potential storage limits
                 if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                      reject(new Error("Falha ao salvar logo: Espaço de armazenamento local excedido. Tente uma imagem menor."));
                 } else {
                      reject(new Error(`Falha ao salvar logo: ${e instanceof Error ? e.message : 'Erro desconhecido'}`));
                 }

            }
        };
        reader.onerror = (error) => {
            console.error("Error reading logo file:", error);
            reject(new Error("Falha ao ler o arquivo do logo."));
        };
        reader.readAsDataURL(file); // Read file as Data URL
    });
};

/**
 * Deletes the currently stored logo.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteLogo = async (): Promise<boolean> => {
    console.log('Deleting logo...');
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(LOGO_STORAGE_KEY); // Remove from storage
            return true;
        }
        return false; // Cannot delete on server-side
    } catch (e) {
        console.error("Error deleting logo from localStorage:", e);
        return false;
    }
};
