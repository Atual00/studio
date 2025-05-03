'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation'; // Use useRouter for navigation
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Loader2, ArrowLeft} from 'lucide-react';
import ClientForm, { type ClientFormValues, type ClientDetails } from '@/components/clientes/client-form'; // Import component and types
import { useToast } from "@/hooks/use-toast";
import { fetchClientDetails, updateClient } from '@/services/clientService'; // Import actual service functions

// --- Component ---
export default function EditarClientePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [clientData, setClientData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

  // Fetch data on mount
  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await fetchClientDetails(id);
          if (data) {
            setClientData(data);
          } else {
            setError('Cliente não encontrado.');
          }
        } catch (err) {
          console.error('Erro ao buscar detalhes do cliente para edição:', err);
          setError('Falha ao carregar os dados do cliente.');
          toast({ title: "Erro", description: "Falha ao carregar dados do cliente.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else {
        setError('ID do cliente inválido.');
        setLoading(false);
    }
  }, [id, toast]);

  // Handle form submission
  const handleFormSubmit = async (data: ClientFormValues) => {
     setIsSubmitting(true);
     try {
         const success = await updateClient(id, data);
         if (success) {
             toast({
                title: "Sucesso!",
                description: "Dados do cliente atualizados.",
             });
             router.push(`/clientes/${id}`); // Redirect to view page after successful update
         } else {
              toast({
                title: "Erro",
                description: "Falha ao atualizar os dados do cliente.",
                variant: "destructive",
            });
         }
     } catch(err) {
          console.error("Erro ao submeter formulário de edição:", err);
           toast({
                title: "Erro Inesperado",
                description: `Ocorreu um erro ao salvar as alterações. ${err instanceof Error ? err.message : ''}`,
                variant: "destructive",
            });
     } finally {
         setIsSubmitting(false);
     }
  };


  // --- Render Logic ---
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error && !clientData) { // Show error only if data couldn't be loaded at all
     return (
        <div className="space-y-4">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
        );
  }

   if (!clientData) {
     // This case might happen if ID is invalid or fetch failed but error state wasn't set properly
     return (
        <div className="space-y-4">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Alert>
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>Não foi possível carregar os dados para edição.</AlertDescription>
            </Alert>
        </div>
    );
  }


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Editar Cliente: {clientData.razaoSocial}</h2>
             <Button variant="outline" onClick={() => router.push(`/clientes/${id}`)} disabled={isSubmitting}> {/* Disable while submitting */}
                <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar Edição
            </Button>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Modifique as informações abaixo e salve as alterações.</CardDescription>
        </CardHeader>
        <CardContent>
           {/* Render the form with initial data and submit handler */}
           <ClientForm
              initialData={clientData}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting} // Pass submitting state
            />
        </CardContent>
      </Card>
    </div>
  );
}
