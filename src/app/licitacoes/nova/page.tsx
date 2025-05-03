'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LicitacaoForm, { type LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { addLicitacao } from '@/services/licitacaoService'; // Import actual service
import { fetchClients as fetchClientList, type ClientListItem } from '@/services/clientService'; // Import client fetching
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link'; // Import Link


export default function NovaLicitacaoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorLoadingClients, setErrorLoadingClients] = useState<string | null>(null);

   // Fetch clients on mount
   useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      setErrorLoadingClients(null);
      try {
        const clientData = await fetchClientList();
        setClients(clientData || []); // Ensure clients is always an array
      } catch (err) {
        console.error("Erro ao carregar lista de clientes:", err);
        setErrorLoadingClients("Falha ao carregar a lista de clientes.");
        toast({ title: "Erro", description: "Não foi possível carregar clientes.", variant: "destructive" });
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, [toast]);


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    setIsSubmitting(true);
    try {
      const newLicitacao = await addLicitacao(data);
      if (newLicitacao) {
        toast({
          title: 'Sucesso!',
          description: `Licitação ${newLicitacao.numeroLicitacao} (${newLicitacao.id}) cadastrada.`,
        });
        router.push(`/licitacoes/${newLicitacao.id}`); // Redirect to the new licitacao's detail page
      } else {
         throw new Error('Falha ao obter dados da licitação após adição.');
      }
    } catch (error) {
      console.error('Erro ao salvar nova licitação:', error);
      toast({
        title: 'Erro ao Salvar',
        description: `Não foi possível cadastrar a licitação. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
       setIsSubmitting(false); // Ensure submitting state is reset on error
    }
    // No need to set isSubmitting false on success due to redirect
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Nova Licitação</h2>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Licitação</CardTitle>
          <CardDescription>Preencha as informações abaixo para cadastrar uma nova licitação.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClients ? (
             <div className="flex justify-center items-center h-24">
               <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <p className="ml-2">Carregando clientes...</p>
             </div>
          ) : errorLoadingClients ? (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Clientes</AlertTitle>
               <AlertDescription>{errorLoadingClients}</AlertDescription>
             </Alert>
           ) : isSubmitting ? (
             <div className="flex justify-center items-center h-40">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="ml-2">Salvando licitação...</p>
             </div>
           ): clients.length === 0 ? ( // Check if clients list is empty after loading
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Cliente Encontrado</AlertTitle>
                <AlertDescription>
                   Você precisa cadastrar pelo menos um cliente antes de criar uma licitação.
                   <Link href="/clientes/novo" className="text-primary hover:underline ml-1">Cadastrar Cliente</Link>
                </AlertDescription>
              </Alert>
            ) : (
            // Pass the fetched clients (guaranteed to be an array)
            <LicitacaoForm clients={clients} onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
