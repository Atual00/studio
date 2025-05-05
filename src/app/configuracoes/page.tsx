
'use client';

import {useState, useEffect} from 'react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Loader2, AlertCircle} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import ConfiguracoesForm, { type ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fetchConfiguracoes, updateConfiguracoes } from '@/services/configuracoesService'; // Import actual service


// --- Component ---
export default function ConfiguracoesPage() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
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
        description: `Ocorreu um erro ao salvar as configurações. ${err instanceof Error ? err.message : ''}`,
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

      {!loading && error && !configuracoes && ( // Show error only if loading failed and no data exists
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
           <AlertTitle>Erro ao Carregar</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

       {/* Render form only when loading is finished */}
      {!loading && (
           <Card>
             <CardHeader>
               <CardTitle>Informações da Empresa</CardTitle>
               <CardDescription>
                 Preencha os dados da sua empresa de assessoria. Estas informações serão usadas em relatórios e documentos gerados pelo sistema.
               </CardDescription>
             </CardHeader>
             <CardContent>
                {/* Render the form, pass initialData (even if null/undefined) */}
                <ConfiguracoesForm
                 initialData={configuracoes ?? undefined} // Pass null or actual data
                 onSubmit={handleFormSubmit}
                 isSubmitting={isSubmitting}
                />
                {/* Display submission error message */}
               {error && !isSubmitting && ( // Show save error if present and not currently submitting
                   <Alert variant="destructive" className="mt-4">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Erro ao Salvar</AlertTitle>
                       <AlertDescription>{error}</AlertDescription>
                   </Alert>
               )}
             </CardContent>
           </Card>
       )}

    </div>
  );
}
