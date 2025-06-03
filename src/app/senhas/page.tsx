
'use client'; // For state, interactions

import {useState, useEffect} from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {PlusCircle, Edit, Trash2, Eye, EyeOff, Copy, Filter, Loader2, AlertCircle} from 'lucide-react'; // Added AlertCircle
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useToast} from '@/hooks/use-toast';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

// --- Mock Data and Types ---
interface Credencial {
  id: string;
  clienteId: string;
  clienteNome: string;
  portal: string;
  login: string;
  senhaCriptografada: string; // Store encrypted password
  linkAcesso?: string;
  observacao?: string;
}

interface ClienteSimple {
    id: string;
    name: string;
    // Add other fields if needed from clientService.ClientListItem, e.g., cnpj
    cnpj?: string;
}

// Mock fetch functions (replace with actual API calls)
const fetchClientesSimple = async (): Promise<ClienteSimple[]> => {
   console.log('Fetching simple client list for passwords...');
   await new Promise(resolve => setTimeout(resolve, 300));
   // This mock should ideally come from clientService or a shared source
   // For now, ensure it has what the Select needs (id, name)
    const clientsFromStorage = _getBasicClientsFromStorage(); // Use a helper if clientService isn't directly usable here
    return clientsFromStorage.map(c => ({id: c.id, name: c.razaoSocial, cnpj: c.cnpj }));
}

// Internal helper to get basic client data if clientService is complex to import directly
// or to avoid circular dependencies if senhasService were a thing.
const _getBasicClientsFromStorage = (): {id: string, razaoSocial: string, cnpj: string}[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem('licitaxClients'); // Assuming 'licitaxClients' is the key from clientService
  try {
    const clients: {id: string, razaoSocial: string, cnpj: string}[] = storedData ? JSON.parse(storedData) : [];
    return clients.map(c => ({ id: c.id, razaoSocial: c.razaoSocial, cnpj: c.cnpj }));
  } catch (e) {
    console.error("Error parsing clients from localStorage for senhas:", e);
    return [];
  }
};


const fetchCredenciais = async (): Promise<Credencial[]> => {
  console.log('Fetching credenciais...');
  if (typeof window === 'undefined') return [];
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedCreds = localStorage.getItem('licitaxCredenciais');
  try {
      return storedCreds ? JSON.parse(storedCreds) : [];
  } catch (e) {
      console.error("Error parsing credenciais from localStorage:", e);
      return [];
  }
};

const saveCredenciaisToStorage = (creds: Credencial[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('licitaxCredenciais', JSON.stringify(creds));
}


// Mock API functions for CRUD
const addCredencial = async (data: Omit<Credencial, 'id' | 'clienteNome'>): Promise<Credencial | null> => {
    console.log("Adding credencial:", data);
    await new Promise(resolve => setTimeout(resolve, 400));
    const clientsList = await fetchClientesSimple(); // Fetch current client list
    const cliente = clientsList.find(c => c.id === data.clienteId);
    if (!cliente) {
        console.error("Cliente não encontrado para adicionar credencial.");
        return null;
    }
    const newCred: Credencial = { ...data, id: `cred-${Date.now()}`, clienteNome: cliente.name };
    const currentCreds = await fetchCredenciais();
    saveCredenciaisToStorage([...currentCreds, newCred]);
    return newCred;
}

const updateCredencial = async (id: string, data: Partial<Omit<Credencial, 'id' | 'clienteNome'>>): Promise<Credencial | null> => {
     console.log("Updating credencial:", id, data);
     await new Promise(resolve => setTimeout(resolve, 400));
     const currentCreds = await fetchCredenciais();
     const existingIndex = currentCreds.findIndex(c => c.id === id);
     if (existingIndex === -1) return null;

     let clienteNome = currentCreds[existingIndex].clienteNome;
     if (data.clienteId && data.clienteId !== currentCreds[existingIndex].clienteId) {
         const clientsList = await fetchClientesSimple();
         const cliente = clientsList.find(c => c.id === data.clienteId);
         if (cliente) clienteNome = cliente.name;
         else { console.error("Novo cliente não encontrado para atualizar credencial."); return null; }
     }
     
     const updatedCred: Credencial = { ...currentCreds[existingIndex], ...data, clienteNome };
     currentCreds[existingIndex] = updatedCred;
     saveCredenciaisToStorage(currentCreds);
     return updatedCred;
}

const deleteCredencial = async (id: string): Promise<boolean> => {
     console.log("Deleting credencial:", id);
     await new Promise(resolve => setTimeout(resolve, 400));
     const currentCreds = await fetchCredenciais();
     const filteredCreds = currentCreds.filter(c => c.id !== id);
     if (currentCreds.length === filteredCreds.length) return false;
     saveCredenciaisToStorage(filteredCreds);
     return true;
}


// --- Zod Schema for Form ---
const credencialSchema = z.object({
  clienteId: z.string({required_error: "Selecione o cliente"}).min(1, "Cliente é obrigatório"),
  portal: z.string().min(1, "Nome do portal é obrigatório"),
  login: z.string().min(1, "Login é obrigatório"),
  senhaCriptografada: z.string().min(4, "Senha deve ter pelo menos 4 caracteres"), 
  linkAcesso: z.string().url("URL inválida").optional().or(z.literal('')),
  observacao: z.string().optional(),
});

type CredencialFormData = z.infer<typeof credencialSchema>;


// --- Component ---
export default function SenhasPage() {
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [filteredCredenciais, setFilteredCredenciais] = useState<Credencial[]>([]);
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [filterCliente, setFilterCliente] = useState('todos'); 
  const [filterPortal, setFilterPortal] = useState('');
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCredencial, setEditingCredencial] = useState<Credencial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {toast} = useToast();

  const form = useForm<CredencialFormData>({
    resolver: zodResolver(credencialSchema),
    defaultValues: {
      clienteId: undefined,
      portal: '',
      login: '',
      senhaCriptografada: '',
      linkAcesso: '',
      observacao: ''
    }
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadingClients(true);
      setErrorLoading(null);
      try {
        const [credsData, clientesData] = await Promise.all([
          fetchCredenciais(),
          fetchClientesSimple()
        ]);
        setCredenciais(credsData);
        setClientes(clientesData);
        setFilteredCredenciais(credsData); 
      } catch (err) {
        const errorMsg = `Falha ao carregar dados. ${err instanceof Error ? err.message : ''}`;
        console.error("Erro ao carregar dados de senhas:", err);
        setErrorLoading(errorMsg);
        toast({ title: "Erro de Carregamento", description: errorMsg, variant: "destructive" });
      } finally {
        setLoading(false);
        setLoadingClients(false);
      }
    };
    loadData();
  }, [toast]); 

  // Filter logic
  useEffect(() => {
    let result = credenciais;
    if (filterCliente && filterCliente !== 'todos') {
      result = result.filter(c => c.clienteId === filterCliente);
    }
    if (filterPortal) {
       result = result.filter(c => c.portal.toLowerCase().includes(filterPortal.toLowerCase()));
    }
    setFilteredCredenciais(result);
  }, [credenciais, filterCliente, filterPortal]);

  const toggleShowPassword = (id: string) => {
    setShowPasswordId(prevId => (prevId === id ? null : id));
  };

  const copyPassword = (senha: string) => {
    navigator.clipboard.writeText(senha)
      .then(() => {
        toast({ title: "Copiado!", description: "Senha copiada para a área de transferência." });
      })
      .catch(err => {
        console.error("Erro ao copiar senha:", err);
        toast({ title: "Erro", description: "Não foi possível copiar a senha.", variant: "destructive" });
      });
  };

  const handleOpenDialog = (credencial: Credencial | null = null) => {
      setEditingCredencial(credencial);
      form.reset(credencial ? {
          clienteId: credencial.clienteId,
          portal: credencial.portal,
          login: credencial.login,
          senhaCriptografada: credencial.senhaCriptografada, 
          linkAcesso: credencial.linkAcesso || '',
          observacao: credencial.observacao || ''
      } : { 
          clienteId: undefined,
          portal: '',
          login: '',
          senhaCriptografada: '',
          linkAcesso: '',
          observacao: ''
      });
      setShowPasswordId(null); 
      setIsDialogOpen(true);
  };


   const onSubmit = async (data: CredencialFormData) => {
     setIsSubmitting(true);
     try {
       if (editingCredencial) {
         const updated = await updateCredencial(editingCredencial.id, data);
         if (updated) {
            setCredenciais(prev => prev.map(c => c.id === updated.id ? updated : c));
            toast({ title: "Sucesso", description: "Credencial atualizada." });
            setIsDialogOpen(false);
         } else {
             toast({ title: "Erro", description: "Falha ao atualizar credencial.", variant: "destructive" });
         }
       } else {
          const added = await addCredencial(data);
           if (added) {
            setCredenciais(prev => [added, ...prev]);
             toast({ title: "Sucesso", description: "Credencial adicionada." });
             setIsDialogOpen(false);
         } else {
              toast({ title: "Erro", description: "Falha ao adicionar credencial.", variant: "destructive" });
         }
       }
     } catch (error) {
        console.error("Erro ao salvar credencial:", error);
        toast({ title: "Erro", description: `Ocorreu um erro inesperado. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
     } finally {
        setIsSubmitting(false);
     }
   };


    const handleDelete = async (id: string) => {
        const confirmed = confirm("Tem certeza que deseja excluir esta credencial?");
        if (!confirmed) return;

        setIsSubmitting(true); 
        try {
            const success = await deleteCredencial(id);
            if (success) {
                setCredenciais(prev => prev.filter(c => c.id !== id));
                toast({ title: "Sucesso", description: "Credencial excluída." });
            } else {
                 toast({ title: "Erro", description: "Falha ao excluir credencial.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Erro ao excluir credencial:", error);
            toast({ title: "Erro", description: `Ocorreu um erro inesperado. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        } finally {
           setIsSubmitting(false);
        }
    };


  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
         <h2 className="text-2xl font-semibold">Gerenciador de Senhas</h2>
         <Button onClick={() => handleOpenDialog()} disabled={loadingClients || clientes.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Credencial
         </Button>
       </div>
        {errorLoading && (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Dados</AlertTitle>
               <AlertDescription>{errorLoading}</AlertDescription>
             </Alert>
        )}
        {loadingClients && !errorLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando lista de clientes...
            </div>
        )}
        {!loadingClients && clientes.length === 0 && !errorLoading && (
            <Alert variant="warning">
                 <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Cliente Cadastrado</AlertTitle>
                <AlertDescription>
                    Você precisa <Link href="/clientes/novo" className="font-medium text-primary hover:underline">cadastrar um cliente</Link> antes de adicionar credenciais.
                </AlertDescription>
            </Alert>
        )}


      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             <Select value={filterCliente} onValueChange={setFilterCliente} disabled={loadingClients || clientes.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Cliente..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="todos">Todos os Clientes</SelectItem>
                 {clientes.map(c => (
                   <SelectItem key={c.id} value={c.id}>{c.name} {c.cnpj ? `(${c.cnpj})` : ''}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
            <Input
                placeholder="Filtrar por Portal..."
                value={filterPortal}
                onChange={(e) => setFilterPortal(e.target.value)}
                 disabled={clientes.length === 0}
            />
          </div>
        </CardContent>
      </Card>


      <Card>
         <CardHeader>
             <CardTitle>Credenciais Salvas</CardTitle>
             <CardDescription>Gerencie os acessos aos portais de licitação.</CardDescription>
         </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Portal</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead>Senha</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {loading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : filteredCredenciais.length > 0 ? (
                        filteredCredenciais.map(cred => (
                            <TableRow key={cred.id}>
                                <TableCell className="font-medium">
                                   <Link href={`/clientes/${cred.clienteId}`} className="hover:underline text-primary">
                                       {cred.clienteNome}
                                   </Link>
                                </TableCell>
                                <TableCell>{cred.portal}</TableCell>
                                <TableCell>{cred.login}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                   <span>{showPasswordId === cred.id ? cred.senhaCriptografada : '••••••••'}</span>
                                    <Button variant="ghost" size="icon" onClick={() => toggleShowPassword(cred.id)} title={showPasswordId === cred.id ? 'Ocultar' : 'Mostrar'}>
                                       {showPasswordId === cred.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    {showPasswordId === cred.id && (
                                        <Button variant="ghost" size="icon" onClick={() => copyPassword(cred.senhaCriptografada)} title="Copiar Senha">
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                                <TableCell>
                                   {cred.linkAcesso ? (
                                       <a href={cred.linkAcesso} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[150px] inline-block">
                                            {cred.linkAcesso}
                                        </a>
                                   ) : '-'}
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cred)} title="Editar" disabled={clientes.length === 0}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cred.id)} disabled={isSubmitting} title="Excluir">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                {clientes.length === 0 && !loadingClients ? 'Cadastre clientes para adicionar credenciais.' : 'Nenhuma credencial encontrada.'}
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCredencial ? 'Editar Credencial' : 'Adicionar Nova Credencial'}</DialogTitle>
            <DialogDescription>
              Preencha as informações de acesso ao portal. A senha será armazenada de forma segura.
            </DialogDescription>
          </DialogHeader>
           <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <Controller
                 control={form.control}
                 name="clienteId"
                 render={({ field }) => (
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="clienteIdDialog" className="text-right">Cliente*</Label>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''} 
                        disabled={isSubmitting || loadingClients}
                    >
                        <SelectTrigger id="clienteIdDialog" className="col-span-3">
                            <SelectValue placeholder="Selecione o Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                        {loadingClients ? (
                            <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                        ) : clientes.length === 0 ? (
                             <SelectItem value="no-clients" disabled>Nenhum cliente cadastrado</SelectItem>
                        ) : (
                           clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} {c.cnpj ? `(${c.cnpj})` : ''}</SelectItem>
                           ))
                        )}
                        </SelectContent>
                    </Select>
                    {form.formState.errors.clienteId && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.clienteId.message}</p>}
                   </div>
                 )}
                />

                <Controller
                    control={form.control}
                    name="portal"
                    render={({ field }) => (
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="portalDialog" className="text-right">Portal*</Label>
                        <Input id="portalDialog" placeholder="Ex: ComprasNet, Licitações-e" className="col-span-3" {...field} disabled={isSubmitting}/>
                        {form.formState.errors.portal && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.portal.message}</p>}
                        </div>
                    )}
                    />
                <Controller
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="loginDialog" className="text-right">Login*</Label>
                        <Input id="loginDialog" placeholder="Usuário de acesso" className="col-span-3" {...field} disabled={isSubmitting}/>
                         {form.formState.errors.login && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.login.message}</p>}
                        </div>
                    )}
                    />
                 <Controller
                    control={form.control}
                    name="senhaCriptografada"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="senhaDialog" className="text-right">Senha*</Label>
                        <Input id="senhaDialog" type="password" placeholder="Senha de acesso" className="col-span-3" {...field} disabled={isSubmitting}/>
                        {form.formState.errors.senhaCriptografada && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.senhaCriptografada.message}</p>}
                       </div>
                    )}
                    />
                  <Controller
                    control={form.control}
                    name="linkAcesso"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="linkAcessoDialog" className="text-right">Link</Label>
                        <Input id="linkAcessoDialog" placeholder="URL de acesso ao portal (opcional)" className="col-span-3" {...field} disabled={isSubmitting}/>
                        {form.formState.errors.linkAcesso && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.linkAcesso.message}</p>}
                       </div>
                    )}
                    />
                   <Controller
                    control={form.control}
                    name="observacao"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="observacaoDialog" className="text-right">Observação</Label>
                        <Input id="observacaoDialog" placeholder="Informação adicional (opcional)" className="col-span-3" {...field} disabled={isSubmitting}/>
                       </div>
                    )}
                    />
             <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
               </DialogClose>
               <Button type="submit" disabled={isSubmitting || loadingClients || clientes.length === 0}>
                   {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                   {editingCredencial ? 'Salvar Alterações' : 'Adicionar Credencial'}
               </Button>
             </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

