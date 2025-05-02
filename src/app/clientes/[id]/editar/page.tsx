'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation'; // Use useRouter for navigation
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Loader2, ArrowLeft} from 'lucide-react';
import ClientForm from '@/components/clientes/client-form'; // Re-use the form component
import { type ClientFormValues } from '@/components/clientes/client-form'; // Import type
import { useToast } from "@/hooks/use-toast";

// --- Mock Data and Types ---
interface ClientDetails extends ClientFormValues {
  id: string;
}

// Mock fetch function (same as view page)
const fetchClientDetails = async (id: string): Promise<ClientDetails | null> => {
  console.log(`Fetching details for client ID for editing: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

  // Example Data (replace with actual data structure based on ClientFormValues)
  if (id === '1') {
    return {
      id: '1',
      razaoSocial: 'Empresa Exemplo Ltda',
      nomeFantasia: 'Exemplo Corp',
      cnpj: '00.000.000/0001-00',
      inscricaoEstadual: '123.456.789.111',
      enderecoRua: 'Rua Exemplo',
      enderecoNumero: '123',
      enderecoComplemento: 'Sala 10',
      enderecoBairro: 'Centro',
      enderecoCidade: 'São Paulo',
      enderecoCep: '01000-000',
      email: 'contato@exemplo.com',
      telefone: '(11) 99999-8888',
      enquadramento: 'ME',
      banco: 'Banco Exemplo S.A.',
      agencia: '0001',
      conta: '12345-6',
      socioNome: 'João da Silva',
      socioCpf: '111.222.333-44',
      socioRg: '12.345.678-9',
      copiarEnderecoEmpresa: false,
      socioEnderecoRua: 'Rua do Sócio',
      socioEnderecoNumero: '456',
      socioEnderecoBairro: 'Vila Sócio',
      socioEnderecoCidade: 'São Paulo',
      socioEnderecoCep: '02000-000',
      observacoes: 'Cliente antigo, foco em pregões.',
    };
  }
    if (id === '2') {
     return {
       id: '2',
       razaoSocial: 'Soluções Inovadoras S.A.',
       nomeFantasia: 'Inova Soluções',
       cnpj: '11.111.111/0001-11',
       inscricaoEstadual: 'Isento',
       enderecoRua: 'Avenida Principal',
       enderecoNumero: '789',
       enderecoBairro: 'Bairro Tecnológico',
       enderecoCidade: 'Rio de Janeiro',
       enderecoCep: '20000-000',
       email: 'comercial@inova.com.br',
       telefone: '(21) 98888-7777',
       enquadramento: 'EPP',
       banco: 'Banco Digital Ex',
       agencia: '0002',
       conta: '98765-4',
       socioNome: 'Maria Oliveira',
       socioCpf: '444.555.666-77',
       copiarEnderecoEmpresa: true, // Example where address is copied
       socioEnderecoRua: 'Avenida Principal', // Copied
       socioEnderecoNumero: '789', // Copied
       socioEnderecoBairro: 'Bairro Tecnológico', // Copied
       socioEnderecoCidade: 'Rio de Janeiro', // Copied
       socioEnderecoCep: '20000-000', // Copied
       observacoes: 'Foco em tecnologia e serviços.',
     };
   }
  return null; // Not found
};

// Mock update function
const updateClient = async (id: string, data: ClientFormValues): Promise<boolean> => {
   console.log(`Updating client ID: ${id} with data:`, data);
   await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
   // Add validation or error simulation if needed
   return true; // Simulate success
}


// --- Component ---
export default function EditarClientePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [clientData, setClientData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [id]);

  // Handle form submission
  const handleFormSubmit = async (data: ClientFormValues) => {
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
                description: "Ocorreu um erro ao salvar as alterações.",
                variant: "destructive",
            });
     }
  };


  // --- Render Logic ---
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
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
             <Button variant="outline" onClick={() => router.push(`/clientes/${id}`)}> {/* Navigate back to view */}
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
           <ClientForm initialData={clientData} onSubmit={handleFormSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
