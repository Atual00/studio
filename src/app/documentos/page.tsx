
// src/app/documentos/page.tsx
'use client'; // For state and effects

import React, {useState, useEffect, useCallback} from 'react'; // Import React
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'; // Import Alert
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {Label} from '@/components/ui/label';
import {AlertCircle, CalendarClock, CheckCircle, Filter, Loader2, PlusCircle, Trash2, Edit, FileText, Calendar as CalendarIcon, HelpCircle, X} from 'lucide-react'; // Added HelpCircle and X
import {format, differenceInDays, isBefore, addDays, parseISO, startOfDay, endOfDay, isValid} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Button} from '@/components/ui/button';
import Link from 'next/link'; // For linking to client
import { fetchDocumentos, addDocumento, updateDocumento, deleteDocumento, type Documento, type DocumentoFormData } from '@/services/documentoService'; // Import document service
import { fetchClients, type ClientListItem } from '@/services/clientService'; // Import client service
import { useForm, Controller } from 'react-hook-form'; // Import react-hook-form
import { z } from 'zod'; // Import zod
import { zodResolver } from '@hookform/resolvers/zod'; // Import zod resolver
import { cn } from '@/lib/utils'; // Import cn utility
import {
  Form, // Assuming Form, FormControl, etc. are also used
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';


// --- Zod Schema for Form ---
const documentoSchema = z.object({
  clienteId: z.string({required_error: "Selecione o cliente"}).min(1, "Cliente é obrigatório"),
  tipoDocumento: z.string().min(1, "Tipo de documento é obrigatório"),
  dataVencimento: z.date().nullable().optional(), // Allow null or undefined
});


// --- Helper Function for Status ---
const getDocumentStatus = (vencimento: Date | null | string): { label: string; color: 'destructive' | 'warning' | 'success' | 'default'; icon: React.ElementType } => {
  let dateVencimento: Date | null = null;
  if (vencimento instanceof Date && isValid(vencimento)) {
      dateVencimento = vencimento;
  } else if (typeof vencimento === 'string') {
      try {
          const parsed = parseISO(vencimento);
          if (isValid(parsed)) {
              dateVencimento = parsed;
          }
      } catch {
          // ignore parse error
      }
  }

  if (!dateVencimento) {
    return { label: 'Não Aplicável', color: 'default', icon: HelpCircle }; // Changed Icon
  }
  const today = startOfDay(new Date()); // Compare against start of today
  const targetDate = startOfDay(dateVencimento); // Compare against start of expiration date

  if (isBefore(targetDate, today)) {
     const daysDiff = differenceInDays(today, targetDate); // How many days ago it expired
    return { label: `Vencido (${daysDiff}d atrás)`, color: 'destructive', icon: AlertCircle };
  } else {
     const daysDiff = differenceInDays(targetDate, today); // How many days until it expires
     if (daysDiff <= 0) { // Expires today
        return { label: `Vence Hoje`, color: 'destructive', icon: AlertCircle };
     } else if (daysDiff <= 15) {
        return { label: `Vence em ${daysDiff}d`, color: 'destructive', icon: CalendarClock }; // Urgent (within 15 days) - Changed color and icon
     } else if (daysDiff <= 30) {
        return { label: `Vence em ${daysDiff}d`, color: 'warning', icon: CalendarClock }; // Warning (within 30 days)
     } else {
        return { label: 'Válido', color: 'success', icon: CheckCircle }; // Valid (> 30 days)
     }
  }
};


const getBadgeVariantDoc = (color: 'destructive' | 'warning' | 'success' | 'default'): 'destructive' | 'warning' | 'success' | 'outline' => {
   switch (color) {
       case 'destructive': return 'destructive';
       case 'warning': return 'warning'; // Use specific warning variant
       case 'success': return 'success'; // Use specific success variant
       case 'default': return 'outline'; // Using outline for N/A
   }
}

// Helper to parse and validate date strings or Date objects
const parseAndValidateDate = (dateInput: string | Date | null | undefined): Date | null => {
   if (!dateInput) return null;
   if (dateInput instanceof Date) {
       return isValid(dateInput) ? dateInput : null;
   }
   if (typeof dateInput === 'string') {
      try {
         const parsed = parseISO(dateInput);
         return isValid(parsed) ? parsed : null;
      } catch {
         return null;
      }
   }
   return null; // Return null for other types
}


// --- Component ---
export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState<Documento[]>([]);
  const [clientes, setClientes] = useState<ClientListItem[]>([]); // State for client list
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true); // Separate loading state for clients
  const [filterCliente, setFilterCliente] = useState('todos'); // Allow filtering by specific client ID
  const [filterTipo, setFilterTipo] = useState(''); // Initial state empty for Input filter
  const [filterStatus, setFilterStatus] = useState<'todos' | 'vencido' | 'vence_hoje' | 'vence_15d' | 'vence_30d' | 'valido' | 'na'>('todos');
  const [error, setError] = useState<string | null>(null); // State for general errors
  const [isSubmitting, setIsSubmitting] = useState(false); // State for form submission
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null); // State for editing
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State for dialog visibility
  const { toast } = useToast();

  // Initialize form using useForm hook
  const form = useForm<DocumentoFormData>({
      resolver: zodResolver(documentoSchema),
      defaultValues: {
          clienteId: '',
          tipoDocumento: '',
          dataVencimento: null,
      }
  });
  
  const loadInitialData = useCallback(async () => {
    // Set loading states at the beginning
    setLoading(true);
    setLoadingClients(true);
    setError(null);
    try {
      const [docData, clientData] = await Promise.all([
        fetchDocumentos(),
        fetchClients()
      ]);
      setDocumentos(docData);
      setFilteredDocumentos(docData);
      setClientes(clientData);
    } catch (err) {
      const errorMessage = `Falha ao carregar dados. ${err instanceof Error ? err.message : ''}`;
      console.error('Erro ao buscar documentos ou clientes:', err);
      setError(errorMessage);
      toast({ title: "Erro de Carregamento", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingClients(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);


   // Filter logic
  useEffect(() => {
    let result = documentos;

    if (filterCliente !== 'todos') {
       result = result.filter(d => d.clienteId === filterCliente);
    }

    if (filterTipo) { // Filter if filterTipo is not empty
       result = result.filter(d =>
        d.tipoDocumento.toLowerCase().includes(filterTipo.toLowerCase())
      );
    }

     if (filterStatus !== 'todos') {
        result = result.filter(d => {
            const statusInfo = getDocumentStatus(d.dataVencimento);
            const today = startOfDay(new Date());
            let venc: Date | null = null;
            if (d.dataVencimento) {
               try {
                   venc = d.dataVencimento instanceof Date ? d.dataVencimento : parseISO(d.dataVencimento);
                   if (!isValid(venc)) venc = null; // Treat invalid dates as null
                   else venc = startOfDay(venc); // Normalize to start of day
               } catch { venc = null; }
            }

            switch (filterStatus) {
                case 'vencido':
                    return venc ? isBefore(venc, today) : false;
                 case 'vence_hoje':
                    return venc ? differenceInDays(venc, today) === 0 : false;
                case 'vence_15d':
                     return venc ? !isBefore(venc, today) && differenceInDays(venc, today) > 0 && differenceInDays(venc, today) <= 15 : false;
                case 'vence_30d':
                     return venc ? !isBefore(venc, today) && differenceInDays(venc, today) > 15 && differenceInDays(venc, today) <= 30 : false;
                 case 'valido':
                     return venc ? (!isBefore(venc, today) && differenceInDays(venc, today) > 30) : false; // Only strictly valid (>30d)
                 case 'na':
                     return !venc || statusInfo.label === 'Não Aplicável'; // Include null/undefined/NA dates
                default:
                    return true;
            }
        });
    }


    // Sort by expiration date (soonest first, then N/A, then already expired)
    result.sort((a, b) => {
         let dateA: Date | null = null;
         let dateB: Date | null = null;

         try { dateA = a.dataVencimento ? (a.dataVencimento instanceof Date ? a.dataVencimento : parseISO(a.dataVencimento as string)) : null; if (dateA && !isValid(dateA)) dateA = null; } catch { dateA = null; }
         try { dateB = b.dataVencimento ? (b.dataVencimento instanceof Date ? b.dataVencimento : parseISO(b.dataVencimento as string)) : null; if (dateB && !isValid(dateB)) dateB = null; } catch { dateB = null; }

         const today = startOfDay(new Date());
         const isAExpired = dateA ? isBefore(startOfDay(dateA), today) : false;
         const isBExpired = dateB ? isBefore(startOfDay(dateB), today) : false;

         if (!dateA && !dateB) return 0; // Both N/A - keep original order or sort by name?
         if (!dateA) return 1;         // N/A (A) comes after valid dates (B)
         if (!dateB) return -1;        // N/A (B) comes after valid dates (A)

         if (isAExpired && isBExpired) return dateA.getTime() - dateB.getTime(); // Both expired: sort by expiration date (oldest first)
         if (isAExpired) return 1;      // Expired (A) comes after valid/NA (B)
         if (isBExpired) return -1;     // Expired (B) comes after valid/NA (A)

         // Both are valid and not N/A: sort by closest expiration date first
         return dateA.getTime() - dateB.getTime();
    });


    setFilteredDocumentos(result);
  }, [documentos, filterCliente, filterTipo, filterStatus]);

   // --- CRUD Handlers ---

    const handleOpenDialog = (doc: Documento | null = null) => {
        setEditingDocumento(doc);
        form.reset(doc ? {
             clienteId: doc.clienteId,
             tipoDocumento: doc.tipoDocumento,
             dataVencimento: parseAndValidateDate(doc.dataVencimento),
         } : {
            clienteId: '',
            tipoDocumento: '',
            dataVencimento: null,
        });
        setError(null);
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: DocumentoFormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            if (editingDocumento) {
                await updateDocumento(editingDocumento.id, data);
                toast({ title: "Sucesso", description: "Documento atualizado." });
            } else {
                await addDocumento(data);
                toast({ title: "Sucesso", description: "Documento adicionado." });
            }
            setIsDialogOpen(false);
            await loadInitialData(); // Reload data to show changes
        } catch (err) {
            const errorMessage = `Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
            console.error("Erro ao salvar documento:", err);
            setError(errorMessage);
            toast({ title: "Erro", description: errorMessage, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = confirm("Tem certeza que deseja excluir este documento?");
        if (!confirmed) return;
        try {
            await deleteDocumento(id);
            toast({ title: "Sucesso", description: `Documento excluído.` });
            await loadInitialData(); // Reload data
        } catch (err) {
            const errorMessage = `Erro ao excluir: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
            console.error("Erro ao excluir documento:", err);
            setError(errorMessage);
            toast({ title: "Erro", description: errorMessage, variant: "destructive" });
        }
    };

    const clearFilters = () => {
        setFilterCliente('todos');
        setFilterTipo('');
        setFilterStatus('todos');
    };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-semibold">Controle de Vencimento de Documentos</h2>
         <Button onClick={() => handleOpenDialog()}>
           <PlusCircle className="mr-2 h-4 w-4" />
           Adicionar Documento
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <Select value={filterCliente} onValueChange={setFilterCliente} disabled={loadingClients}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Cliente..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="todos">Todos os Clientes</SelectItem>
                 {loadingClients ? (
                      <SelectItem value="loading-clients" disabled>Carregando...</SelectItem>
                 ) : (
                     clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                     ))
                 )}
              </SelectContent>
            </Select>
             <Input
                 placeholder="Filtrar por Tipo..."
                 value={filterTipo}
                 onChange={(e) => setFilterTipo(e.target.value)}
                 disabled={loading}
              />
             <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="todos">Todos Status</SelectItem>
                 <SelectItem value="vencido">Vencido</SelectItem>
                 <SelectItem value="vence_hoje">Vence Hoje</SelectItem>
                 <SelectItem value="vence_15d">Vence em até 15 dias</SelectItem>
                  <SelectItem value="vence_30d">Vence em 16-30 dias</SelectItem>
                 <SelectItem value="valido">Válido (&gt;30d)</SelectItem>
                 <SelectItem value="na">Não Aplicável</SelectItem>
              </SelectContent>
            </Select>
              <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-primary">
                 <X className="mr-2 h-4 w-4"/> Limpar Filtros
              </Button>
          </div>
        </CardContent>
      </Card>


      <Card>
         <CardHeader>
            <CardTitle>Documentos Monitorados</CardTitle>
             <CardDescription>Acompanhe a validade dos documentos dos seus clientes.</CardDescription>
         </CardHeader>
          <CardContent>
             {error && !loading && ( // Show error only if not loading
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro</AlertTitle>
                     <AlertDescription>{error}</AlertDescription>
                 </Alert>
             )}
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo de Documento</TableHead>
                    <TableHead>Data de Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : filteredDocumentos.length > 0 ? (
                       filteredDocumentos.map(doc => {
                            const statusInfo = getDocumentStatus(doc.dataVencimento);
                             const parsedDate = parseAndValidateDate(doc.dataVencimento);
                             const formattedDate = parsedDate
                                 ? format(parsedDate, "dd/MM/yyyy", { locale: ptBR })
                                 : 'N/A';
                            return (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                       <Link href={`/clientes/${doc.clienteId}`} className="hover:underline text-primary">
                                          {doc.clienteNome || 'Cliente não encontrado'}
                                       </Link>
                                    </TableCell>
                                    <TableCell>{doc.tipoDocumento}</TableCell>
                                    <TableCell>{formattedDate}</TableCell>
                                    <TableCell>
                                        <Badge variant={getBadgeVariantDoc(statusInfo.color)} className="flex items-center gap-1 w-fit whitespace-nowrap">
                                            <statusInfo.icon className="h-3 w-3" />
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                       <Button variant="ghost" size="icon" title="Editar" onClick={() => handleOpenDialog(doc)}>
                                           <Edit className="h-4 w-4" />
                                       </Button>
                                       <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(doc.id)}>
                                           <Trash2 className="h-4 w-4 text-destructive" />
                                       </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                {error ? 'Não foi possível carregar os documentos.' : 'Nenhum documento encontrado com os filtros aplicados.'}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
          </CardContent>
      </Card>

       {/* Add/Edit Document Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingDocumento ? 'Editar Documento' : 'Adicionar Novo Documento'}</DialogTitle>
                    <DialogDescription>
                        Preencha as informações do documento e sua data de vencimento (se aplicável).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                     {error && ( // Display submission-specific error
                         <Alert variant="destructive">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Erro ao Salvar</AlertTitle>
                             <AlertDescription>{error}</AlertDescription>
                         </Alert>
                     )}
                     <FormField
                        control={form.control}
                        name="clienteId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting || loadingClients}>
                                    <FormControl>
                                        <SelectTrigger id="clienteId">
                                            <SelectValue placeholder="Selecione o Cliente" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {loadingClients ? (
                                            <SelectItem value="loading-clients" disabled>Carregando...</SelectItem>
                                        ) : (
                                             clientes.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                             ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="tipoDocumento"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>Tipo de Documento*</FormLabel>
                              <FormControl>
                                 <Input id="tipoDocumento" placeholder="Ex: CND Federal, Contrato Social..." {...field} disabled={isSubmitting} />
                               </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="dataVencimento"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data de Vencimento</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={isSubmitting}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                                ) : (
                                                    <span>Selecione a data (opcional)</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ?? undefined}
                                            onSelect={(date) => field.onChange(date || null)}
                                            initialFocus
                                            disabled={isSubmitting}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription className="text-xs">Deixe em branco se não aplicável.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {editingDocumento ? 'Salvar Alterações' : 'Adicionar Documento'}
                        </Button>
                    </DialogFooter>
                  </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
