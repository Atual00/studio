
'use client';

import {useState, useEffect} from 'react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Loader2} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import ConfiguracoesForm, { type ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// --- Mock Data and Types ---
// This type should match the form values
type ConfiguracoesEmpresa = ConfiguracoesFormValues;

// --- Mock API Functions (Replace with actual API calls) ---

// Mock fetch function to get current settings
const fetchConfiguracoes = async (): Promise<ConfiguracoesEmpresa | null> => {
  console.log('Fetching configurations...');
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay

  // Return mock data or null if not found/set yet
  // Example: Load from localStorage or a dedicated endpoint
  const storedConfig = localStorage.getItem('configuracoesEmpresa');
  if (storedConfig) {
     try {
         return JSON.parse(storedConfig) as ConfiguracoesEmpresa;
     } catch (e) {
         console.error("Error parsing stored config:", e);
         return null;
     }
  }

   // Return some default empty-ish state if nothing stored
   return {
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
   };
};

// Mock update function to save settings
const updateConfiguracoes = async (data: ConfiguracoesEmpresa): Promise<boolean> => {
  console.log('Updating configurations:', data);
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

  // Example: Save to localStorage or send to backend
  try {
      localStorage.setItem('configuracoesEmpresa', JSON.stringify(data));
      return true; // Simulate success
  } catch (e) {
      console.error("Error saving config:", e);
      return false; // Simulate failure
  }
};


// --- Component ---
export default function ConfiguracoesPage() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesEmpresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {toast} = useToast();

  // Fetch existing configurations on mount
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConfiguracoes();
        setConfiguracoes(data);
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
        setError('Falha ao carregar as configurações atuais.');
        toast({ title: "Erro", description: "Não foi possível carregar as configurações.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [toast]);

  // Handle form submission
  const handleFormSubmit = async (data: ConfiguracoesFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const success = await updateConfiguracoes(data);
      if (success) {
        setConfiguracoes(data); // Update local state on successful save
        toast({
          title: "Sucesso!",
          description: "Configurações da assessoria salvas.",
        });
      } else {
         setError('Falha ao salvar as configurações.');
         toast({
          title: "Erro",
          description: "Não foi possível salvar as configurações.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erro ao submeter formulário de configurações:", err);
       setError('Ocorreu um erro inesperado ao salvar.');
       toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Configurações da Assessoria</h2>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
         <Alert variant="destructive">
           <AlertTitle>Erro ao Carregar</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

       {/* Render form only when loading is finished and no error occurred,
           or if there's initial data (even if fetched returned null) */}
      {!loading && !error && (
           <Card>
             <CardHeader>
               <CardTitle>Informações da Empresa</CardTitle>
               <CardDescription>
                 Preencha os dados da sua empresa de assessoria. Estas informações serão usadas em relatórios e documentos gerados pelo sistema.
               </CardDescription>
             </CardHeader>
             <CardContent>
               {/* Pass fetched data (or null) to the form */}
               <ConfiguracoesForm
                 initialData={configuracoes ?? undefined}
                 onSubmit={handleFormSubmit}
                 isSubmitting={isSubmitting}
               />
                {/* Display submission error message */}
               {error && !isSubmitting && (
                   <Alert variant="destructive" className="mt-4">
                       <AlertTitle>Erro ao Salvar</AlertTitle>
                       <AlertDescription>{error}</AlertDescription>
                   </Alert>
               )}
             </CardContent>
           </Card>
       )}

       {/* Fallback if loading finishes but config is still null (shouldn't happen with default return) */}
       {/* {!loading && !error && !configuracoes && (
            <Alert>
                <AlertTitle>Configuração Inicial</AlertTitle>
                <AlertDescription>Parece que as configurações ainda não foram definidas. Preencha o formulário acima.</AlertDescription>
            </Alert>
       )} */}
    </div>
  );
}
