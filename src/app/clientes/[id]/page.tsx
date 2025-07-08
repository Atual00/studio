'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation'; // Use useRouter for navigation
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Separator} from '@/components/ui/separator';
import {Loader2, Edit, ArrowLeft, Building, User, Banknote, MapPin, Mail, Phone, FileText, Trash2, XCircle, Gavel, KeyRound} from 'lucide-react';
import Link from 'next/link';
import { type ClientFormValues, type ClientDetails } from '@/components/clientes/client-form'; // Import types from form
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { fetchClientDetails, deleteClient } from '@/services/clientService'; // Import actual service functions
import { useToast } from '@/hooks/use-toast';


// --- Component ---
export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // State for deletion process

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
          toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
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

   // Helper to display optional fields
   const displayField = (value: string | undefined | null, placeholder = '-') => {
       return value || placeholder;
   }

   // Handle client deletion
   const handleDeleteClient = async () => {
       if (!client) return;
       setIsDeleting(true);
       try {
           const success = await deleteClient(client.id);
           if (success) {
               toast({ title: "Sucesso", description: "Cliente excluído." });
               router.push('/clientes'); // Redirect to the client list
           } else {
               throw new Error("Falha na operação de exclusão.");
           }
       } catch (err) {
           console.error('Erro ao excluir cliente:', err);
           setError(`Falha ao excluir o cliente. ${err instanceof Error ? err.message : ''}`);
           toast({ title: "Erro", description: "Não foi possível excluir o cliente.", variant: "destructive" });
           setIsDeleting(false);
       }
       // No need to set isDeleting to false on success, as it redirects
   };


  // --- Render Logic ---
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error && !client) { // Show error only if data couldn't be loaded
    return (
        <div className="space-y-4">
            <Button variant="outline" onClick={() => router.push('/clientes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
            </Button>
            <Alert variant="destructive">
                 <XCircle className="h-4 w-4"/>
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
        );
  }

  if (!client) {
    // This might occur if ID was invalid from the start
    return (
        <div className="space-y-4">
             <Button variant="outline" onClick={() => router.push('/clientes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
            </Button>
            <Alert>
                {/* Use a more appropriate icon if needed */}
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>Nenhuma informação de cliente para exibir.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back, Edit, and Delete buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Button variant="outline" onClick={() => router.push('/clientes')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
            </Button>
         </div>
        <div className="flex gap-2 flex-wrap justify-end">
            <Link href={`/licitacoes?cliente=${client.id}`} passHref><Button variant="outline" size="sm"><Gavel className="mr-2 h-4 w-4"/>Ver Licitações</Button></Link>
            <Link href={`/senhas?clienteId=${client.id}`} passHref><Button variant="outline" size="sm"><KeyRound className="mr-2 h-4 w-4"/>Ver Senhas</Button></Link>
            <Link href={`/clientes/${id}/editar`} passHref>
                <Button disabled={isDeleting} variant="default" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Editar
                </Button>
            </Link>
            {/* Delete Button with Confirmation Dialog */}
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Excluir
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o cliente "{client.razaoSocial}"? Esta ação não pode ser desfeita. Todas as licitações e dados associados podem ser afetados.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClient} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{client.razaoSocial}</CardTitle>
          <CardDescription>{displayField(client.nomeFantasia)} - {client.cnpj}</CardDescription>
           <Badge variant={client.enquadramento === 'MEI' ? 'secondary' : client.enquadramento === 'ME' ? 'outline' : 'default'} className="w-fit mt-1">{client.enquadramento}</Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Display error during deletion attempt if needed */}
           {error && isDeleting && (
                 <Alert variant="destructive">
                     <XCircle className="h-4 w-4"/>
                    <AlertTitle>Erro ao Excluir</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
           )}

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
      </Card>
    </div>
  );
}
