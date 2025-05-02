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
import {PlusCircle, Edit, Trash2, Eye, EyeOff, Copy, Filter, Loader2} from 'lucide-react';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useToast} from '@/hooks/use-toast';
import Link from 'next/link';

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
}

// Mock fetch functions (replace with actual API calls)
const fetchClientesSimple = async (): Promise<ClienteSimple[]> => {
   console.log('Fetching simple client list...');
   await new Promise(resolve => setTimeout(resolve, 300));
   return [
       { id: '1', name: 'Empresa Exemplo Ltda' },
       { id: '2', name: 'Soluções Inovadoras S.A.' },
       { id: '3', name: 'Comércio Varejista XYZ EIRELI' },
   ];
}

const fetchCredenciais = async (): Promise<Credencial[]> => {
  console.log('Fetching credenciais...');
  await new Promise(resolve => setTimeout(resolve, 500));
  // IMPORTANT: In a real app, the password MUST be encrypted before storing
  // and decrypted only when necessary (or ideally, never shown directly).
  // This mock data uses plain text for demonstration ONLY.
  return [
    {
      id: 'cred-001',
      clienteId: '1',
      clienteNome: 'Empresa Exemplo Ltda',
      portal: 'ComprasNet',
      login: 'empresa_exemplo',
      senhaCriptografada: 'senhaSuperSegura123', // Plain text for demo ONLY
      linkAcesso: 'https://www.gov.br/compras/pt-br',
      observacao: 'Acesso principal'
    },
    {
      id: 'cred-002',
      clienteId: '2',
      clienteNome: 'Soluções Inovadoras S.A.',
      portal: 'Licitações-e (BB)',
      login: 'inovasolu',
      senhaCriptografada: 'outraSenha!@#', // Plain text for demo ONLY
      linkAcesso: 'https://www.licitacoes-e.com.br',
    },
     {
      id: 'cred-003',
      clienteId: '1',
      clienteNome: 'Empresa Exemplo Ltda',
      portal: 'BEC/SP',
      login: '0000000000100', // CNPJ example
      senhaCriptografada: 'becSenha#', // Plain text for demo ONLY
      linkAcesso: 'https://www.bec.sp.gov.br',
       observacao: 'Senha de negociação'
    },
  ];
};

// Mock API functions for CRUD
const addCredencial = async (data: Omit<Credencial, 'id' | 'clienteNome'>): Promise<Credencial | null> => {
    console.log("Adding credencial:", data);
    await new Promise(resolve => setTimeout(resolve, 400));
    const cliente = (await fetchClientesSimple()).find(c => c.id === data.clienteId);
    if (!cliente) return null;
    // !!! ENCRYPT PASSWORD HERE before sending to backend !!!
    const newCred: Credencial = { ...data, id: `cred-${Date.now()}`, clienteNome: cliente.name };
    return newCred;
}

const updateCredencial = async (id: string, data: Partial<Omit<Credencial, 'id' | 'clienteNome'>>): Promise<Credencial | null> => {
     console.log("Updating credencial:", id, data);
     await new Promise(resolve => setTimeout(resolve, 400));
      // !!! ENCRYPT PASSWORD HERE if it's being changed !!!
     const existing = (await fetchCredenciais()).find(c => c.id === id);
     if (!existing) return null;
     const cliente = (await fetchClientesSimple()).find(c => c.id === (data.clienteId || existing.clienteId));
     if (!cliente) return null; // Should not happen if validation is correct
     const updatedCred: Credencial = { ...existing, ...data, clienteNome: cliente.name };
     return updatedCred;
}

const deleteCredencial = async (id: string): Promise<boolean> => {
     console.log("Deleting credencial:", id);
     await new Promise(resolve => setTimeout(resolve, 400));
     return true; // Simulate success
}


// --- Zod Schema for Form ---
const credencialSchema = z.object({
  clienteId: z.string({required_error: "Selecione o cliente"}),
  portal: z.string().min(1, "Nome do portal é obrigatório"),
  login: z.string().min(1, "Login é obrigatório"),
  senhaCriptografada: z.string().min(4, "Senha deve ter pelo menos 4 caracteres"), // Adjust min length as needed
  linkAcesso: z.string().url("URL inválida").optional().or(z.literal('')), // Allow empty string
  observacao: z.string().optional(),
});

type CredencialFormData = z.infer<typeof credencialSchema>;


// --- Component ---
export default function SenhasPage() {
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [filteredCredenciais, setFilteredCredenciais] = useState<Credencial[]>([]);
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCliente, setFilterCliente] = useState('todos'); // Initial state for "Todos os Clientes"
  const [filterPortal, setFilterPortal] = useState('');
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null); // Track which password to show
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
      try {
        const [credsData, clientesData] = await Promise.all([
          fetchCredenciais(),
          fetchClientesSimple()
        ]);
        setCredenciais(credsData);
        setClientes(clientesData);
        setFilteredCredenciais(credsData); // Initialize filtered list
      } catch (err) {
        console.error("Erro ao carregar dados de senhas:", err);
        toast({ title: "Erro", description: "Falha ao carregar credenciais ou clientes.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [toast]); // Added toast

  // Filter logic
  useEffect(() => {
    let result = credenciais;
    // Updated filter logic for Cliente
    if (filterCliente && filterCliente !== 'todos') {
      result = result.filter(c => c.clienteId === filterCliente);
    }
    if (filterPortal) {
       result = result.filter(c => c.portal.toLowerCase().includes(filterPortal.toLowerCase()));
    }
    setFilteredCredenciais(result);
  }, [credenciais, filterCliente, filterPortal]);

  // Toggle password visibility
  const toggleShowPassword = (id: string) => {
    setShowPasswordId(prevId => (prevId === id ? null : id));
  };

  // Copy password to clipboard
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

  // Open dialog for adding/editing
  const handleOpenDialog = (credencial: Credencial | null = null) => {
      setEditingCredencial(credencial);
      form.reset(credencial ? {
          clienteId: credencial.clienteId,
          portal: credencial.portal,
          login: credencial.login,
          senhaCriptografada: credencial.senhaCriptografada, // Populate with existing (display only)
          linkAcesso: credencial.linkAcesso || '',
          observacao: credencial.observacao || ''
      } : { // Reset for new entry
          clienteId: undefined,
          portal: '',
          login: '',
          senhaCriptografada: '',
          linkAcesso: '',
          observacao: ''
      });
      setShowPasswordId(null); // Ensure password is hidden in dialog
      setIsDialogOpen(true);
  };


   // Handle form submission (Add/Edit)
   const onSubmit = async (data: CredencialFormData) => {
     setIsSubmitting(true);
     try {
       if (editingCredencial) {
         // Update
         const updated = await updateCredencial(editingCredencial.id, data);
         if (updated) {
            setCredenciais(prev => prev.map(c => c.id === updated.id ? updated : c));
            toast({ title: "Sucesso", description: "Credencial atualizada." });
            setIsDialogOpen(false);
         } else {
             toast({ title: "Erro", description: "Falha ao atualizar credencial.", variant: "destructive" });
         }
       } else {
         // Add
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
        toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
     } finally {
        setIsSubmitting(false);
     }
   };


    // Handle deletion
    const handleDelete = async (id: string) => {
        // Optional: Add a confirmation dialog here
        const confirmed = confirm("Tem certeza que deseja excluir esta credencial?");
        if (!confirmed) return;

        setIsSubmitting(true); // Use submitting state for delete as well
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
            toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
        } finally {
           setIsSubmitting(false);
        }
    };


  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
         <h2 className="text-2xl font-semibold">Gerenciador de Senhas</h2>
         <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Credencial
         </Button>
       </div>


        {/* Filter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Cliente..." />
              </SelectTrigger>
              <SelectContent>
                 {/* Changed value from "" to "todos" */}
                 <SelectItem value="todos">Todos os Clientes</SelectItem>
                 {clientes.map(c => (
                   <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
            <Input
                placeholder="Filtrar por Portal..."
                value={filterPortal}
                onChange={(e) => setFilterPortal(e.target.value)}
            />
            {/* <Button variant="outline" >Aplicar Filtros</Button> // Real-time filtering */}
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
                            <TableCell colSpan={6} className="text-center">
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
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cred)} title="Editar">
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
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                Nenhuma credencial encontrada.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>


        {/* Add/Edit Dialog */}
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
                    <Label htmlFor="clienteId" className="text-right">Cliente*</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecione o Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                        {clientes.map(c => (
                           <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                         ))}
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
                        <Label htmlFor="portal" className="text-right">Portal*</Label>
                        <Input id="portal" placeholder="Ex: ComprasNet, Licitações-e" className="col-span-3" {...field} />
                        {form.formState.errors.portal && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.portal.message}</p>}
                        </div>
                    )}
                    />
                <Controller
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="login" className="text-right">Login*</Label>
                        <Input id="login" placeholder="Usuário de acesso" className="col-span-3" {...field} />
                         {form.formState.errors.login && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.login.message}</p>}
                        </div>
                    )}
                    />
                 <Controller
                    control={form.control}
                    name="senhaCriptografada"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="senha" className="text-right">Senha*</Label>
                        {/* NOTE: This shows the password during edit. Consider a "change password" flow */}
                        <Input id="senha" type="password" placeholder="Senha de acesso" className="col-span-3" {...field} />
                        {form.formState.errors.senhaCriptografada && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.senhaCriptografada.message}</p>}
                       </div>
                    )}
                    />
                  <Controller
                    control={form.control}
                    name="linkAcesso"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="linkAcesso" className="text-right">Link</Label>
                        <Input id="linkAcesso" placeholder="URL de acesso ao portal (opcional)" className="col-span-3" {...field} />
                        {form.formState.errors.linkAcesso && <p className="col-span-4 text-sm text-destructive text-right">{form.formState.errors.linkAcesso.message}</p>}
                       </div>
                    )}
                    />
                   <Controller
                    control={form.control}
                    name="observacao"
                    render={({ field }) => (
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="observacao" className="text-right">Observação</Label>
                        <Input id="observacao" placeholder="Informação adicional (opcional)" className="col-span-3" {...field} />
                       </div>
                    )}
                    />


             <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
               </DialogClose>
               <Button type="submit" disabled={isSubmitting}>
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
