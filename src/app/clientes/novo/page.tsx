'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ClientForm, { type ClientFormValues } from '@/components/clientes/client-form';
import { addClient } from '@/services/clientService'; // Import the actual service
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      const newClient = await addClient(data);
      if (newClient) {
        toast({
          title: 'Sucesso!',
          description: 'Novo cliente cadastrado.',
        });
        router.push(`/clientes/${newClient.id}`); // Redirect to the new client's detail page
      } else {
        throw new Error('Failed to get new client data after adding.');
      }
    } catch (error) {
      console.error('Erro ao salvar novo cliente:', error);
      toast({
        title: 'Erro ao Salvar',
        description: `Não foi possível cadastrar o cliente. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Novo Cliente</h2>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Preencha as informações abaixo para cadastrar um novo cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitting ? (
             <div className="flex justify-center items-center h-40">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="ml-2">Salvando...</p>
            </div>
          ) : (
            <ClientForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
