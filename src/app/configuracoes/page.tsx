
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, AlertCircle, Users, Image as ImageIcon, Upload, Trash2, PlusCircle, User } from 'lucide-react'; // Added icons
import { useToast } from '@/hooks/use-toast';
import ConfiguracoesForm, { type ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fetchConfiguracoes, updateConfiguracoes, saveLogo, deleteLogo } from '@/services/configuracoesService'; // Import services
import { fetchUsers, addUser, deleteUser, type User as AppUser } from '@/services/userService'; // Import user services, rename User to avoid conflict
import { Button } from '@/components/ui/button'; // Import Button
import { Input } from '@/components/ui/input'; // Import Input for file and user
import { Label } from '@/components/ui/label'; // Import Label
import Image from 'next/image'; // Import next/image
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext'; // Import useAuth for role checking

// --- User Add Form Schema (basic) ---
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Import Form components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select


// Helper to format CPF on input change
const formatCpf = (value: string | undefined): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14); // XXX.XXX.XXX-XX
};


const userSchema = z.object({
    fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres."),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido. Use o formato XXX.XXX.XXX-XX."),
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres.").toLowerCase(), // Store lowercase
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
    role: z.enum(['admin', 'user']).default('user'), // Add role selection
});
type UserFormData = z.infer<typeof userSchema>;

// --- Component ---
export default function ConfiguracoesPage() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // State for logo preview URL
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]); // Use renamed AppUser type
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null); // Track which user is being deleted
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user role

  const userForm = useForm<UserFormData>({
      resolver: zodResolver(userSchema),
      defaultValues: { fullName: '', cpf: '', username: '', password: '', role: 'user' },
  });


  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingConfig(true);
      setLoadingUsers(true);
      setConfigError(null);
      setUserError(null);
      try {
        const [configData, usersData] = await Promise.all([
          fetchConfiguracoes(),
          user?.role === 'admin' ? fetchUsers() : Promise.resolve([]), // Only fetch users if admin
        ]);
        setConfiguracoes(configData);
        setLogoPreview(configData.logoUrl || null); // Load existing logo URL
        setUsers(usersData);
      } catch (err) {
        console.error('Erro ao buscar configurações ou usuários:', err);
        const errorMsg = `Falha ao carregar dados. ${err instanceof Error ? err.message : ''}`;
        setConfigError(errorMsg); // Show error in config section for simplicity
        toast({ title: "Erro", description: errorMsg, variant: "destructive" });
      } finally {
        setLoadingConfig(false);
        setLoadingUsers(false);
      }
    };
    loadData();
  }, [toast, user?.role]); // Re-fetch if role changes (though unlikely without page reload)

   // === Config Handlers ===
   const handleConfigSubmit = async (data: ConfiguracoesFormValues) => {
    setIsSubmittingConfig(true);
    setConfigError(null);
    try {
        // Include existing logoUrl if not uploading a new one
        const dataToSave = { ...data, logoUrl: logoPreview || undefined };
        const success = await updateConfiguracoes(dataToSave);
        if (success) {
            setConfiguracoes(dataToSave);
            toast({ title: "Sucesso!", description: "Configurações da assessoria salvas." });
        } else {
            throw new Error("Falha ao salvar configurações no backend.");
        }
    } catch (err) {
        console.error("Erro ao submeter formulário de configurações:", err);
        const errorMsg = `Ocorreu um erro ao salvar as configurações. ${err instanceof Error ? err.message : ''}`;
        setConfigError(errorMsg);
        toast({ title: "Erro Inesperado", description: errorMsg, variant: "destructive" });
    } finally {
        setIsSubmittingConfig(false);
    }
   };


  // === Logo Handlers ===
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setConfigError(null); // Clear error on new file selection
    } else {
      setSelectedLogoFile(null);
      // Optionally clear preview if file is invalid/removed
      // setLogoPreview(configuracoes?.logoUrl || null);
       if (file) { // Only show toast if a file was actually selected but invalid
           toast({ title: "Arquivo Inválido", description: "Por favor, selecione um arquivo de imagem (PNG, JPG, etc.).", variant: "destructive" });
       }
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) return;
    setIsUploadingLogo(true);
    setConfigError(null);
    try {
      const newLogoUrl = await saveLogo(selectedLogoFile);
      if (newLogoUrl) {
        // Update config in backend AND local state
        const updatedConfig = { ...configuracoes!, logoUrl: newLogoUrl };
        const success = await updateConfiguracoes(updatedConfig);
        if (success) {
             setConfiguracoes(updatedConfig);
             setLogoPreview(newLogoUrl); // Update preview to stored URL
             setSelectedLogoFile(null); // Clear selected file
             toast({ title: "Sucesso!", description: "Logo da assessoria atualizado." });
        } else {
             throw new Error("Falha ao atualizar configurações com a nova URL do logo.");
        }

      } else {
         throw new Error("Falha ao salvar o logo.");
      }
    } catch (err) {
      console.error("Erro ao fazer upload do logo:", err);
      const errorMsg = `Falha no upload do logo. ${err instanceof Error ? err.message : ''}`;
      setConfigError(errorMsg);
      toast({ title: "Erro Upload", description: errorMsg, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

   const handleDeleteLogo = async () => {
    if (!logoPreview || !configuracoes?.logoUrl) return; // Check if there's a logo to delete

    const confirmed = confirm("Tem certeza que deseja remover o logo da assessoria?");
    if (!confirmed) return;

    setIsDeletingLogo(true);
    setConfigError(null);
    try {
        const success = await deleteLogo(); // Assuming deleteLogo handles removing the stored file/URL
        if (success) {
             // Update config in backend AND local state
            const updatedConfig = { ...configuracoes!, logoUrl: undefined };
             const updateSuccess = await updateConfiguracoes(updatedConfig);
            if (updateSuccess) {
                setConfiguracoes(updatedConfig);
                setLogoPreview(null);
                setSelectedLogoFile(null);
                toast({ title: "Sucesso!", description: "Logo removido." });
            } else {
                throw new Error("Falha ao atualizar configurações após remover URL do logo.");
            }
        } else {
            throw new Error("Falha ao remover o logo no backend/storage.");
        }
    } catch (err) {
        console.error("Erro ao remover o logo:", err);
        const errorMsg = `Falha ao remover o logo. ${err instanceof Error ? err.message : ''}`;
        setConfigError(errorMsg);
        toast({ title: "Erro", description: errorMsg, variant: "destructive" });
    } finally {
        setIsDeletingLogo(false);
    }
   };

    // === User Handlers ===
    const handleAddUserSubmit = async (data: UserFormData) => {
        setIsAddingUser(true);
        setUserError(null);
        try {
            // Pass all required fields to addUser
            const newUser = await addUser(data.username, data.password, data.role, data.fullName, data.cpf);
            if (newUser) {
                setUsers(prev => [...prev, newUser]);
                toast({ title: "Sucesso!", description: `Usuário ${newUser.username} adicionado.` });
                setIsUserDialogOpen(false);
                userForm.reset(); // Reset form after successful add
            } else {
                throw new Error("Falha ao adicionar usuário no backend.");
            }
        } catch (err) {
            console.error("Erro ao adicionar usuário:", err);
            const errorMsg = `Falha ao adicionar usuário. ${err instanceof Error ? err.message : ''}`;
            setUserError(errorMsg); // Display error within the dialog
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleDeleteUser = async (userId: string, username: string) => {
       if (user?.username?.toLowerCase() === username.toLowerCase()) { // Compare lowercase
            toast({ title: "Ação Inválida", description: "Você não pode excluir sua própria conta.", variant: "destructive" });
            return;
       }

        const confirmed = confirm(`Tem certeza que deseja excluir o usuário "${username}"?`);
        if (!confirmed) return;

        setIsDeletingUser(userId);
        setUserError(null);
        try {
            const success = await deleteUser(userId);
            if (success) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                toast({ title: "Sucesso!", description: `Usuário ${username} excluído.` });
            } else {
                throw new Error("Falha ao excluir usuário no backend.");
            }
        } catch (err) {
            console.error("Erro ao excluir usuário:", err);
            const errorMsg = `Falha ao excluir usuário. ${err instanceof Error ? err.message : ''}`;
            setUserError(errorMsg); // Show error near the user list
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        } finally {
            setIsDeletingUser(null);
        }
    };

  // --- Render ---
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Configurações da Assessoria</h2>

      {/* Configurações Form Card */}
      <Card>
         <CardHeader>
           <CardTitle>Informações da Empresa</CardTitle>
           <CardDescription>
             Dados da sua empresa de assessoria para relatórios e documentos.
           </CardDescription>
         </CardHeader>
         <CardContent>
            {loadingConfig ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : configError && !configuracoes ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Erro ao Carregar</AlertTitle>
                   <AlertDescription>{configError}</AlertDescription>
                 </Alert>
            ) : (
               <>
                 <ConfiguracoesForm
                   initialData={configuracoes ?? undefined}
                   onSubmit={handleConfigSubmit}
                   isSubmitting={isSubmittingConfig}
                 />
                 {configError && !isSubmittingConfig && (
                     <Alert variant="destructive" className="mt-4">
                         <AlertCircle className="h-4 w-4" />
                         <AlertTitle>Erro ao Salvar Configurações</AlertTitle>
                         <AlertDescription>{configError}</AlertDescription>
                     </Alert>
                 )}
               </>
            )}
         </CardContent>
       </Card>


      {/* Logo Upload Card */}
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Logo da Assessoria</CardTitle>
             <CardDescription>Faça upload do logo que aparecerá nos cabeçalhos dos relatórios (PNG, JPG).</CardDescription>
         </CardHeader>
          <CardContent className="space-y-4">
             {configError && (isUploadingLogo || isDeletingLogo) && ( // Show logo specific errors here too
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro no Logo</AlertTitle>
                     <AlertDescription>{configError}</AlertDescription>
                 </Alert>
             )}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 border rounded-md flex items-center justify-center bg-muted overflow-hidden shrink-0">
                     {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="Preview Logo" className="object-contain max-h-full max-w-full" />
                    ) : (
                         <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    )}
                </div>
                 <div className="flex-1 space-y-2">
                    <Label htmlFor="logo-upload">Selecionar Arquivo</Label>
                    <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleLogoFileChange} disabled={isUploadingLogo || isDeletingLogo} />
                    <div className="flex flex-wrap gap-2 mt-2">
                         <Button onClick={handleUploadLogo} disabled={!selectedLogoFile || isUploadingLogo || isDeletingLogo}>
                             {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                             {isUploadingLogo ? 'Enviando...' : 'Salvar Logo'}
                         </Button>
                         {logoPreview && ( // Show delete button only if a logo exists
                            <Button variant="destructive" onClick={handleDeleteLogo} disabled={isDeletingLogo || isUploadingLogo}>
                                {isDeletingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                {isDeletingLogo ? 'Removendo...' : 'Remover Logo'}
                            </Button>
                         )}
                    </div>
                 </div>
            </div>
         </CardContent>
      </Card>


      {/* User Management Card (Admin Only) */}
      {user?.role === 'admin' && (
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Gerenciamento de Usuários</CardTitle>
               <CardDescription>Adicione ou remova usuários do sistema.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                 {loadingUsers ? (
                     <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     </div>
                 ) : userError && users.length === 0 ? ( // Show error if loading failed and no users exist
                     <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Erro ao Carregar Usuários</AlertTitle>
                       <AlertDescription>{userError}</AlertDescription>
                     </Alert>
                  ) : (
                    <>
                     {userError && ( // Show non-critical errors (like delete failed)
                         <Alert variant="destructive" className="mb-4">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Erro</AlertTitle>
                             <AlertDescription>{userError}</AlertDescription>
                         </Alert>
                     )}
                      <Table>
                         <TableHeader>
                            <TableRow>
                               <TableHead>Nome Completo</TableHead>
                               <TableHead>Usuário</TableHead>
                               <TableHead>CPF</TableHead>
                               <TableHead>Role</TableHead> {/* Added Role column */}
                               <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                <TableRow key={u.id}>
                                     <TableCell>{u.fullName || '-'}</TableCell>
                                    <TableCell>{u.username}</TableCell>
                                     <TableCell>{u.cpf || '-'}</TableCell>
                                    <TableCell className="capitalize">{u.role}</TableCell> {/* Display Role */}
                                    <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteUser(u.id, u.username)}
                                        disabled={isDeletingUser === u.id || u.username?.toLowerCase() === user?.username?.toLowerCase()} // Disable delete for self, case-insensitive
                                        title={u.username?.toLowerCase() === user?.username?.toLowerCase() ? "Não é possível excluir a si mesmo" : "Excluir Usuário"}
                                    >
                                        {isDeletingUser === u.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        )}
                                    </Button>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum usuário cadastrado.</TableCell>
                                </TableRow>
                            )}
                         </TableBody>
                      </Table>
                    </>
                  )}
             </CardContent>
               <CardFooter className="flex justify-end">
                  <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                     <DialogTrigger asChild>
                         <Button>
                            <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Usuário
                         </Button>
                     </DialogTrigger>
                     <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader>
                            <DialogTitle>Novo Usuário</DialogTitle>
                            <DialogDescription>Preencha os dados para criar um novo acesso.</DialogDescription>
                         </DialogHeader>
                         {/* User Form using react-hook-form */}
                         <Form {...userForm}>
                           <form onSubmit={userForm.handleSubmit(handleAddUserSubmit)} className="space-y-4 py-4">
                                {userError && ( // Show add user error inside dialog
                                  <Alert variant="destructive">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertTitle>Erro ao Adicionar</AlertTitle>
                                      <AlertDescription>{userError}</AlertDescription>
                                  </Alert>
                                )}
                                <FormField
                                    control={userForm.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Completo</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome e Sobrenome" {...field} disabled={isAddingUser} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={userForm.control}
                                    name="cpf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="XXX.XXX.XXX-XX"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatCpf(e.target.value))}
                                                    disabled={isAddingUser}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={userForm.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Usuário (login)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome de usuário para login" {...field} disabled={isAddingUser} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={userForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Senha de acesso" {...field} disabled={isAddingUser} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                               <FormField
                                  control={userForm.control}
                                  name="role"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Permissão</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isAddingUser}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Selecione a permissão" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="user">Usuário Padrão</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                               <DialogFooter>
                                  <DialogClose asChild>
                                      <Button type="button" variant="outline" disabled={isAddingUser}>Cancelar</Button>
                                  </DialogClose>
                                  <Button type="submit" disabled={isAddingUser}>
                                      {isAddingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                      {isAddingUser ? 'Adicionando...' : 'Adicionar Usuário'}
                                  </Button>
                               </DialogFooter>
                           </form>
                        </Form>
                     </DialogContent>
                  </Dialog>
               </CardFooter>
           </Card>
      )}
    </div>
  );
}
    