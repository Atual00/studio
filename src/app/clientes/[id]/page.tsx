// src/app/clientes/[id]/page.tsx
'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation'; // Use useRouter for navigation
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Separator} from '@/components/ui/separator';
import {Loader2, Edit, ArrowLeft, Building, User, Banknote, MapPin, Mail, Phone, FileText} from 'lucide-react';
import Link from 'next/link';
import { type ClientFormValues } from '@/components/clientes/client-form'; // Import type from form
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { z } from 'zod'; // Import Zod

// --- Mock Data and Types ---
// Assuming ClientFormValues covers all necessary fields for display
interface ClientDetails extends ClientFormValues {
  id: string;
  // Add any other fields not in the form, if needed
}

// Mock fetch function (replace with actual API call)
const fetchClientDetails = async (id: string): Promise<ClientDetails | null> => {
  console.log(`Fetching details for client ID: ${id}`);
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


// --- Component ---
export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
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
            setClient(data);
          } else {
            setError('Cliente não encontrado.');
          }
        } catch (err) {
          console.error('Erro ao buscar detalhes do cliente:', err);
          setError('Falha ao carregar os dados do cliente.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [id]);

   // Helper to display optional fields
   const displayField = (value: string | undefined | null, placeholder = '-') => {
       return value || placeholder;
   }

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

  if (!client) {
    return (
        <div className="space-y-4">
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Alert>
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>Nenhuma informação de cliente para exibir.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back and Edit buttons */}
      <div className="flex justify-between items-center">
         <Button variant="outline" onClick={() => router.push('/clientes')}> {/* Navigate back to list */}
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
        </Button>
        <Link href={`/clientes/${id}/editar`} passHref>
            <Button>
                <Edit className="mr-2 h-4 w-4" /> Editar Cliente
            </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{client.razaoSocial}</CardTitle>
          <CardDescription>{displayField(client.nomeFantasia)} - {client.cnpj}</CardDescription>
           <Badge variant={client.enquadramento === 'MEI' ? 'secondary' : client.enquadramento === 'ME' ? 'outline' : 'default'} className="w-fit mt-1">{client.enquadramento}</Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Company Info Section */}
          <section>
             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Dados da Empresa</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <p><strong className="font-medium">Inscrição Estadual:</strong> {displayField(client.inscricaoEstadual)}</p>
             </div>
             <Separator className="my-4" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                 <p className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/> <span>{client.email}</span></p>
                 <p className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/> <span>{client.telefone}</span></p>
             </div>
             <Separator className="my-4" />
             <div className="text-sm space-y-1">
                 <p className="flex items-start gap-2">
                     <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                     <span>
                         {client.enderecoRua}, {client.enderecoNumero} {displayField(client.enderecoComplemento, '')} <br />
                         {client.enderecoBairro} - {client.enderecoCidade} <br />
                         CEP: {client.enderecoCep}
                     </span>
                </p>
            </div>
          </section>

           {/* Bank Details Section */}
           {(client.banco || client.agencia || client.conta) && (
              <section>
                 <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> Dados Bancários</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <p><strong className="font-medium">Banco:</strong> {displayField(client.banco)}</p>
                    <p><strong className="font-medium">Agência:</strong> {displayField(client.agencia)}</p>
                    <p><strong className="font-medium">Conta:</strong> {displayField(client.conta)}</p>
                 </div>
              </section>
            )}


           {/* Partner Info Section */}
           <section>
             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados do Sócio</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <p><strong className="font-medium">Nome:</strong> {client.socioNome}</p>
                <p><strong className="font-medium">CPF:</strong> {client.socioCpf}</p>
                 <p><strong className="font-medium">RG:</strong> {displayField(client.socioRg)}</p>
             </div>
             <Separator className="my-4" />
             {client.copiarEnderecoEmpresa ? (
                 <p className="text-sm text-muted-foreground italic">Endereço do sócio é o mesmo da empresa.</p>
             ) : (
                <div className="text-sm space-y-1">
                    <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                        <span>
                             {displayField(client.socioEnderecoRua)}, {displayField(client.socioEnderecoNumero)} {displayField(client.socioEnderecoComplemento, '')} <br />
                             {displayField(client.socioEnderecoBairro)} - {displayField(client.socioEnderecoCidade)} <br />
                             CEP: {displayField(client.socioEnderecoCep)}
                        </span>
                    </p>
                </div>
             )}
          </section>


          {/* Observations Section */}
          {client.observacoes && (
             <section>
                 <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Observações</h3>
                 <p className="text-sm whitespace-pre-wrap">{client.observacoes}</p>
             </section>
          )}


        </CardContent>
         {/* Footer could contain quick links related to the client */}
         {/* <CardFooter className="flex justify-end gap-2">
             <Link href={`/licitacoes?cliente=${client.id}`} passHref><Button variant="outline">Ver Licitações</Button></Link>
             <Link href={`/senhas?cliente=${client.id}`} passHref><Button variant="outline">Ver Senhas</Button></Link>
         </CardFooter> */}
      </Card>
    </div>
  );
}


// Define Zod schema here only if not importing (ensure consistency)
const clientFormSchema = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string(),
  inscricaoEstadual: z.string().optional(),
  enderecoRua: z.string(),
  enderecoNumero: z.string(),
  enderecoComplemento: z.string().optional(),
  enderecoBairro: z.string(),
  enderecoCidade: z.string(),
  enderecoCep: z.string(),
  email: z.string(),
  telefone: z.string(),
  enquadramento: z.string(),
  banco: z.string().optional(),
  conta: z.string().optional(),
  agencia: z.string().optional(),
  socioNome: z.string(),
  socioCpf: z.string(),
  socioRg: z.string().optional(),
  copiarEnderecoEmpresa: z.boolean(),
  socioEnderecoRua: z.string().optional(),
  socioEnderecoNumero: z.string().optional(),
  socioEnderecoComplemento: z.string().optional(),
  socioEnderecoBairro: z.string().optional(),
  socioEnderecoCidade: z.string().optional(),
  socioEnderecoCep: z.string().optional(),
  observacoes: z.string().optional(),
});

// Define the type based on the schema above
type ClientFormValues = z.infer<typeof clientFormSchema>;
