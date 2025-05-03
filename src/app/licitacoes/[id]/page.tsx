'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Separator} from '@/components/ui/separator';
import {
    FileCheck2,
    FileX2,
    HelpCircle,
    Upload,
    Bot,
    Loader2,
    CheckCircle,
    XCircle,
    Send,
    ArrowLeft,
    Trash2,
    CalendarCheck,
    Clock
} from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {validateBidDocuments, type ValidateBidDocumentsOutput, filesToValidateInput} from '@/ai/flows/document-validator';
import {useToast} from '@/hooks/use-toast';
import { fetchLicitacaoDetails, updateLicitacao, deleteLicitacao, type LicitacaoDetails, statusMap, requiredDocuments } from '@/services/licitacaoService';
import { type ClientDetails } from '@/components/clientes/client-form'; // For Client info type if needed
import { fetchClientDetails } from '@/services/clientService'; // To fetch client CNPJ

// Helper to get badge variant based on custom color mapping from service
const getBadgeVariant = (color: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive':
    case 'warning':
      return 'destructive';
    case 'success': return 'default'; // Map success to default (primary)
    case 'info':
    case 'accent':
    case 'outline':
    default:
      return 'outline';
  }
};

// --- Component ---
export default function LicitacaoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {toast} = useToast();

  const [licitacao, setLicitacao] = useState<LicitacaoDetails | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null); // Store fetched client details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({});
  const [currentStatus, setCurrentStatus] = useState(''); // Use 'currentStatus' to avoid conflict with statusMap
  const [newComment, setNewComment] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidateBidDocumentsOutput | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [bidCriteria, setBidCriteria] = useState<string>(''); // State for bid criteria input

  const [valorPrimeiroColocadoInput, setValorPrimeiroColocadoInput] = useState<string>(''); // Input as string for formatting
  const [isSavingBidResult, setIsSavingBidResult] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await fetchLicitacaoDetails(id);
          if (data) {
            setLicitacao(data);
            setChecklist(data.checklist || {});
            setCurrentStatus(data.status);
            // Format initial value for display
            setValorPrimeiroColocadoInput(
              data.valorPrimeiroColocado !== undefined && data.valorPrimeiroColocado !== null
                ? data.valorPrimeiroColocado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : ''
            );

             // Fetch client details to get CNPJ
             if(data.clienteId) {
                 const clientData = await fetchClientDetails(data.clienteId);
                 setClientDetails(clientData);
             }


            // Pre-fill criteria based on modality (example)
            if (data.modalidade === 'Pregão Eletrônico') {
                 setBidCriteria(`Documentos necessários para Pregão Eletrônico (exemplo): ${requiredDocuments.map(d => d.label).join(', ')}. Verificar datas de validade e assinaturas. Atestados de capacidade técnica podem ser exigidos.`);
            } else {
                 setBidCriteria('Defina os critérios e documentos exigidos pelo edital aqui.');
            }


          } else {
            setError('Licitação não encontrada.');
          }
        } catch (err) {
          console.error('Erro ao buscar detalhes da licitação:', err);
          setError(`Falha ao carregar os dados da licitação. ${err instanceof Error ? err.message : ''}`);
          toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else {
        setError('ID da licitação inválido.');
        setLoading(false);
    }
  }, [id, toast]);

  // Handler for status change
  const handleStatusChange = async (newStatus: string) => {
    if (!licitacao || isSavingStatus || newStatus === currentStatus) return;
    setIsSavingStatus(true);
    setError(null); // Clear previous errors
    try {
        const success = await updateLicitacao(licitacao.id, { status: newStatus });
        if (success) {
           setCurrentStatus(newStatus); // Update local state on success
           setLicitacao(prev => prev ? {...prev, status: newStatus} : null);
           toast({ title: "Sucesso", description: "Status da licitação atualizado." });
        } else {
            throw new Error("Falha ao atualizar status no backend.");
        }
    } catch (err) {
        setError(`Falha ao atualizar o status. ${err instanceof Error ? err.message : ''}`);
        toast({ title: "Erro", description: `Falha ao atualizar o status. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handler for checklist item change
  const handleChecklistChange = async (docId: string, checked: boolean) => {
     if (!licitacao || isSavingChecklist) return;

     const originalChecklistValue = checklist[docId]; // Store original value for revert
     const updatedChecklist = { ...checklist, [docId]: checked };
     setChecklist(updatedChecklist); // Optimistic UI update
     setIsSavingChecklist(true);
     setError(null);

     try {
       const success = await updateLicitacao(licitacao.id, { checklist: updatedChecklist });
       if (!success) {
            throw new Error("Falha ao salvar checklist no backend.");
       }
         // toast({ title: "Checklist atualizado" }); // Optional success toast
     } catch (err) {
         // Revert UI on failure
         setChecklist(prev => ({ ...prev, [docId]: originalChecklistValue }));
         setError(`Falha ao atualizar checklist. ${err instanceof Error ? err.message : ''}`);
         toast({ title: "Erro", description: `Falha ao atualizar ${requiredDocuments.find(d=>d.id===docId)?.label || docId}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
     } finally {
        setIsSavingChecklist(false);
     }
  };

  // Handler for adding a comment
  const handleAddComment = async () => {
     if (!licitacao || !newComment.trim() || isAddingComment) return;
     setIsAddingComment(true);
     setError(null);

     const commentData = {
         id: `c${Date.now()}`, // Temporary ID, backend should generate real one
         texto: newComment.trim(),
         data: new Date().toISOString(), // Use ISO string for storage consistency
         autor: 'Usuário Atual' // Replace with actual user info
     };

     const updatedComments = [...(licitacao.comentarios || []), commentData];

     // Optimistic UI update
     const originalComments = licitacao.comentarios;
     setLicitacao(prev => prev ? {...prev, comentarios: updatedComments } : null);
     setNewComment('');

     try {
       const success = await updateLicitacao(licitacao.id, { comentarios: updatedComments }); // Send the whole list
       if (!success) {
            throw new Error("Falha ao salvar comentário no backend.");
       }
         toast({ title: "Comentário adicionado." });
     } catch(err) {
         // Revert UI on failure
         setLicitacao(prev => prev ? {...prev, comentarios: originalComments || [] } : null);
         setNewComment(commentData.texto); // Put text back in textarea
         setError(`Falha ao adicionar comentário. ${err instanceof Error ? err.message : ''}`);
         toast({ title: "Erro", description: `Falha ao adicionar comentário. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
     } finally {
      setIsAddingComment(false);
     }
  };

 // Handler for file upload
 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Prevent duplicates
      const newFiles = Array.from(event.target.files);
      setUploadedFiles(prev => {
          const existingNames = new Set(prev.map(f => f.name));
          const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
          return [...prev, ...uniqueNewFiles];
      });
      // Clear the input value to allow uploading the same file again if needed
      event.target.value = '';
      // Clear previous validation results when new files are added
      setValidationResult(null);
      setError(null); // Clear previous errors
    }
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // If removing a file while validation results exist, clear results
    if (validationResult) {
        setValidationResult(null);
    }
     setError(null);
  };

 // Handler for triggering AI validation
  const handleValidateDocuments = async () => {
    if (uploadedFiles.length === 0 || !bidCriteria.trim()) {
      toast({title: "Atenção", description: "Faça upload de documentos e defina os critérios do edital.", variant: "destructive"});
      return;
    }
    setIsValidating(true);
    setValidationResult(null); // Clear previous results
    setError(null);

    try {
      const input = await filesToValidateInput(uploadedFiles, bidCriteria);
      console.log("Sending to AI:", JSON.stringify({ bidCriteria, fileCount: input.documents.length, firstFileName: input.documents[0]?.filename }, null, 2));

      const result = await validateBidDocuments(input);
      setValidationResult(result);
      console.log("AI Result:", JSON.stringify(result, null, 2));

       if (result && result.validityDetails) {
         const updatedChecklist = { ...checklist };
         let allRequiredPresentAndValid = true;
         const aiChecklistUpdates: { [key: string]: boolean } = {};

         const validityMap = new Map(result.validityDetails.map(detail => [detail.documentName.toLowerCase(), detail]));

         requiredDocuments.forEach(docInfo => {
           const docId = docInfo.id;
           const docLabelLower = docInfo.label.toLowerCase();
           // Find *any* uploaded file whose name contains the required doc label (case-insensitive)
           const uploadedFile = uploadedFiles.find(f => f.name.toLowerCase().includes(docLabelLower));
           const docFileNameLower = uploadedFile?.name.toLowerCase();
           const aiDetail = docFileNameLower ? validityMap.get(docFileNameLower) : undefined;

           let isConsideredValid = aiDetail?.isValid ?? false;
           const isMissing = result.missingDocuments?.some(missing => missing.toLowerCase().includes(docLabelLower));

           // Determine if the checklist item should be checked based on AI validation
           const shouldBeChecked = !!uploadedFile && isConsideredValid && !isMissing;
           aiChecklistUpdates[docId] = shouldBeChecked; // Store AI's opinion

           // Update overall validity check
           if (!shouldBeChecked) {
               allRequiredPresentAndValid = false;
           }
         });

         // Apply AI updates to the local checklist state
         setChecklist(prev => ({ ...prev, ...aiChecklistUpdates }));

         // Attempt to save the AI-updated checklist to the backend
         try {
             const success = await updateLicitacao(id, { checklist: { ...checklist, ...aiChecklistUpdates } }); // Send combined state
             if (success) {
                 toast({ title: "Checklist Atualizado", description: "Checklist atualizado com base na validação da IA." });
             } else {
                 throw new Error("Falha ao salvar checklist atualizado pela IA no backend.");
             }
         } catch (checklistSaveError) {
              // Revert checklist changes if backend update fails
              console.error("Checklist save error:", checklistSaveError);
              // Refetch or use original state to revert `checklist` state
              // For simplicity, we'll just show an error toast here
              toast({ title: "Erro ao Salvar Checklist", description: `Não foi possível salvar as atualizações do checklist. ${checklistSaveError instanceof Error ? checklistSaveError.message : ''}`, variant: "destructive" });
              // Revert local state (optional, might cause confusion if AI result is still shown)
              // const originalData = await fetchLicitacaoDetails(id);
              // if (originalData) setChecklist(originalData.checklist || {});
         }

          // Update status based on completeness (example logic) - Only if status is appropriate
         if (currentStatus === 'EM_ANALISE' || currentStatus === 'FALTA_DOCUMENTACAO') {
            if (result.completeness && allRequiredPresentAndValid) {
                await handleStatusChange('DOCUMENTACAO_CONCLUIDA');
            } else {
                await handleStatusChange('FALTA_DOCUMENTACAO');
            }
         } else if (currentStatus === 'AGUARDANDO_ANALISE') {
             // If just started, update to Em Análise after first validation
             await handleStatusChange('EM_ANALISE');
             // Then potentially update again based on results
             if (result.completeness && allRequiredPresentAndValid) {
                await handleStatusChange('DOCUMENTACAO_CONCLUIDA');
             } else {
                await handleStatusChange('FALTA_DOCUMENTACAO');
            }
         }
       } else {
           // Handle case where AI result might be incomplete
           console.warn("AI validation result structure might be incomplete:", result);
           setError("Resultado da validação da IA está incompleto.");
       }

    } catch (error) {
      console.error('Erro na validação por IA:', error);
      const errorMessage = `Falha ao validar documentos com IA. ${error instanceof Error ? error.message : 'Erro desconhecido.'}`;
      setError(errorMessage);
      toast({title: "Erro de Validação", description: errorMessage, variant: "destructive"});
       // Set a default error state in validationResult if AI fails completely
       setValidationResult({
            completeness: false,
            validityDetails: uploadedFiles.map(f => ({ documentName: f.name, isValid: false, reasoning: `Falha na validação: ${error instanceof Error ? error.message : 'Erro desconhecido.'}`})),
            missingDocuments: ['Processo de validação falhou']
       });
    } finally {
      setIsValidating(false);
    }
  };


  // Format currency for display
  const formatCurrency = (value: number | undefined | null): string => {
      if (value === undefined || value === null) return '';
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

   // Parse currency string to number
  const parseCurrency = (value: string): number | undefined => {
      if (!value) return undefined;
      // Remove R$, spaces, dots, and replace comma with dot
      const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
  };

   // Handler for saving bid result (1st place value)
   const handleSaveBidResult = async () => {
       const valorNum = parseCurrency(valorPrimeiroColocadoInput);

      if (!licitacao || isSavingBidResult || valorNum === undefined || valorNum < 0) { // Allow zero
          toast({ title: "Atenção", description: "Insira um valor válido (incluindo zero) para o primeiro colocado.", variant: "destructive" });
          return;
      }
      setIsSavingBidResult(true);
      setError(null);
      try {
        const success = await updateLicitacao(licitacao.id, { valorPrimeiroColocado: valorNum });
        if (success) {
            setLicitacao(prev => prev ? { ...prev, valorPrimeiroColocado: valorNum } : null);
            toast({ title: "Sucesso", description: "Valor do primeiro colocado salvo." });
        } else {
            throw new Error("Falha ao salvar valor no backend.");
        }
      } catch (err) {
         setError(`Falha ao salvar o valor. ${err instanceof Error ? err.message : ''}`);
         toast({ title: "Erro", description: `Falha ao salvar o valor. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
      } finally {
        setIsSavingBidResult(false);
     }
   };

   // Calculate bid difference
   const calculateBidDifference = () => {
      if (!licitacao || licitacao.valorPrimeiroColocado === undefined || licitacao.valorPrimeiroColocado === null || licitacao.valor <= 0) {
          return null;
      }
      const valorProprio = licitacao.valor; // Assuming this is the client's bid value
      const valorPrimeiro = licitacao.valorPrimeiroColocado;

      if (valorPrimeiro <= 0) { // Handle division by zero or non-positive competitor bid
         return { absolute: formatCurrency(valorProprio - valorPrimeiro), percentage: valorPrimeiro === 0 ? 'N/A (1º foi R$ 0)' : 'Inválido (1º < 0)' };
      }

      const difference = valorProprio - valorPrimeiro;
      const percentageDifference = (difference / valorPrimeiro) * 100;
      return {
          absolute: formatCurrency(difference),
          percentage: percentageDifference.toFixed(2) + '%'
      };
   };

   const bidDifference = calculateBidDifference();

   // Handle Licitacao deletion
   const handleDelete = async () => {
       if (!licitacao) return;
       setIsDeleting(true);
       setError(null);
       try {
           const success = await deleteLicitacao(licitacao.id);
           if (success) {
               toast({ title: "Sucesso", description: "Licitação excluída." });
               router.push('/licitacoes'); // Redirect to the list
           } else {
               throw new Error("Falha na operação de exclusão no backend.");
           }
       } catch (err) {
           console.error('Erro ao excluir licitação:', err);
           setError(`Falha ao excluir a licitação. ${err instanceof Error ? err.message : ''}`);
           toast({ title: "Erro", description: `Não foi possível excluir a licitação. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
           setIsDeleting(false); // Keep dialog open on error
       }
       // No finally needed as it redirects on success
   };


  // --- Render Logic ---
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error && !licitacao) { // Show error only if loading failed completely
    return (
         <div className="space-y-4">
            <Button variant="outline" onClick={() => router.push('/licitacoes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
            </Button>
            <Alert variant="destructive">
                <XCircle className="h-4 w-4"/>
                <AlertTitle>Erro ao Carregar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
    );
  }

  if (!licitacao) {
    return (
         <div className="space-y-4">
            <Button variant="outline" onClick={() => router.push('/licitacoes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
            </Button>
            <Alert>
                <HelpCircle className="h-4 w-4"/>
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>Nenhuma informação de licitação para exibir.</AlertDescription>
            </Alert>
        </div>
    );
  }

  // Safely format dates, handling potential string dates from storage
    const formatDate = (date: Date | string | undefined | null, time = false): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            const formatString = time ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
            return format(dateObj, formatString, { locale: ptBR });
        } catch (e) {
            console.error("Error formatting date:", date, e);
            return 'Data inválida';
        }
    };


  return (
    <div className="space-y-6">
      {/* Header */}
       <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
               <div className="flex items-center gap-2 mb-1">
                    <Button variant="outline" size="sm" onClick={() => router.push('/licitacoes')} className="h-7 px-2">
                       <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-2xl font-semibold">{licitacao.numeroLicitacao}</h2>
                </div>
               <p className="text-muted-foreground ml-9">{licitacao.clienteNome} ({clientDetails?.cnpj || 'CNPJ não carregado'})</p>
               <p className="text-sm text-muted-foreground ml-9">{licitacao.modalidade} - {licitacao.plataforma}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                 <div className="flex items-center gap-2">
                     <Badge variant={getBadgeVariant(statusMap[currentStatus]?.color)} className="text-sm px-3 py-1">
                        {statusMap[currentStatus]?.icon && React.createElement(statusMap[currentStatus].icon, { className: "h-3 w-3 mr-1" })}
                        {statusMap[currentStatus]?.label || currentStatus}
                     </Badge>
                     <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isSavingStatus}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Alterar Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(statusMap).map(([key, { label }]) => (
                            <SelectItem key={key} value={key} disabled={isSavingStatus}>
                                {isSavingStatus && currentStatus === key ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                                {label}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 {/* Delete Button */}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-1"/> Excluir Licitação
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a licitação "{licitacao.numeroLicitacao}"? Esta ação não pode ser desfeita e removerá todos os dados associados.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                             {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
       </div>


      {/* Display general errors */}
      {error && !loading && (
           <Alert variant="destructive">
               <XCircle className="h-4 w-4"/>
               <AlertTitle>Erro</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
           </Alert>
      )}

      {/* Main Content Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

         {/* Left Column: Details & Checklist & AI */}
         <div className="lg:col-span-2 space-y-6">
             {/* Core Details */}
              <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Licitação</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                   <div><span className="font-medium">Protocolo:</span> {licitacao.id}</div>
                   <div><span className="font-medium">Valor Cobrado:</span> {formatCurrency(licitacao.valorCobrado)}</div>
                   <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground"/> <span className="font-medium">Início Disputa:</span> {formatDate(licitacao.dataInicio, true)}</div>
                   <div className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5 text-muted-foreground"/> <span className="font-medium">Meta Análise:</span> {formatDate(licitacao.dataMetaAnalise)}</div>
                   {licitacao.observacoes && (
                       <div className="sm:col-span-2 mt-2 pt-2 border-t"><span className="font-medium">Observações:</span> <p className="text-muted-foreground whitespace-pre-wrap">{licitacao.observacoes}</p></div>
                   )}
                </CardContent>
            </Card>

             {/* Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Checklist de Documentos</CardTitle>
                    <CardDescription>Marque os documentos conforme análise ou validação da IA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {requiredDocuments.map(doc => {
                        // Find the AI validation result for this specific required document type
                        const docLabelLower = doc.label.toLowerCase();
                        const aiValidationDetail = validationResult?.validityDetails?.find(detail =>
                            detail.documentName.toLowerCase().includes(docLabelLower)
                        );
                        const isCurrentlySaving = isSavingChecklist && checklist[doc.id] !== licitacao.checklist?.[doc.id];

                        return (
                            <div key={doc.id} className="flex items-center space-x-3 group">
                                <Checkbox
                                    id={`chk-${doc.id}`}
                                    checked={checklist[doc.id] || false}
                                    onCheckedChange={(checked) => handleChecklistChange(doc.id, !!checked)}
                                    disabled={isSavingChecklist}
                                    aria-label={doc.label}
                                />
                                <Label htmlFor={`chk-${doc.id}`} className="flex-1 text-sm font-normal cursor-pointer group-hover:text-primary transition-colors">
                                    {doc.label}
                                </Label>
                                {/* Indicate AI validation status if available */}
                                {aiValidationDetail ? (
                                    aiValidationDetail.isValid
                                        ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" title={`Validado pela IA ${aiValidationDetail.reasoning ? `(${aiValidationDetail.reasoning})` : ''}`} />
                                        : <XCircle className="h-4 w-4 text-red-600 shrink-0" title={`Inválido/Problema (IA): ${aiValidationDetail.reasoning || 'Sem detalhes'}`} />
                                ) : (isValidating && <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" title="Aguardando validação da IA"/>)}

                                {isCurrentlySaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                            </div>
                        );
                    })}
                </CardContent>
                 <CardFooter>
                    {isSavingChecklist && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Salvando checklist...</p>}
                 </CardFooter>
            </Card>

            {/* AI Document Validator */}
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Validador de Documentos (IA)</CardTitle>
                    <CardDescription>Faça upload dos documentos e defina os critérios do edital para validação automática.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="bid-criteria">Critérios do Edital (Documentos Exigidos e Regras)</Label>
                        <Textarea
                            id="bid-criteria"
                            placeholder="Ex: CND Federal (validade mínima 30 dias), Balanço Patrimonial (último exercício), Atestados X e Y..."
                            value={bidCriteria}
                            onChange={(e) => setBidCriteria(e.target.value)}
                            className="min-h-[100px] mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="file-upload" className="mb-1 block">Upload de Documentos</Label>
                        <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="cursor-pointer" disabled={isValidating} />
                        {uploadedFiles.length > 0 && (
                            <div className="mt-3 space-y-2 text-sm max-h-40 overflow-y-auto pr-2 border rounded-md p-2">
                                <p className="font-medium mb-1">Arquivos carregados ({uploadedFiles.length}):</p>
                                <ul className="space-y-1">
                                {uploadedFiles.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between text-xs bg-secondary p-1 rounded">
                                       <span className="truncate pr-2">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                       <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 px-1 text-muted-foreground hover:text-destructive" disabled={isValidating}>
                                          <Trash2 className="h-3 w-3"/>
                                        </Button>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                    </div>

                     {/* AI Validation Result Display */}
                     {validationResult && !isValidating && (
                        <Alert variant={validationResult.completeness && validationResult.validityDetails.every(d => d.isValid) ? 'success' : 'warning'} className="mt-4">
                             {validationResult.completeness && validationResult.validityDetails.every(d => d.isValid) ? <FileCheck2 className="h-4 w-4" /> : <FileX2 className="h-4 w-4" />}
                            <AlertTitle>Resultado da Validação IA</AlertTitle>
                            <AlertDescription>
                                <p className="font-medium">Status Geral: {validationResult.completeness && validationResult.validityDetails.every(d => d.isValid) ? 'Completo e Válido' : 'Incompleto ou Inválido'}</p>
                                {validationResult.missingDocuments && validationResult.missingDocuments.length > 0 && (
                                   <p>Documentos faltantes/não identificados: <span className="font-semibold">{validationResult.missingDocuments.join(', ')}</span></p>
                                )}
                                {validationResult.validityDetails && validationResult.validityDetails.length > 0 && (
                                    <>
                                        <p className="mt-2 font-medium">Detalhes por Arquivo:</p>
                                        <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                                        {validationResult.validityDetails.map((detail) => (
                                            <li key={detail.documentName} className={detail.isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                                <span className="font-semibold text-foreground">{detail.documentName}:</span> {detail.isValid ? 'Válido' : 'Inválido/Problema'} {detail.reasoning ? `(${detail.reasoning})` : ''}
                                            </li>
                                        ))}
                                        </ul>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Button onClick={handleValidateDocuments} disabled={isValidating || uploadedFiles.length === 0 || !bidCriteria.trim()}>
                       {isValidating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</> : <><Bot className="mr-2 h-4 w-4" /> Validar com IA</>}
                    </Button>
                     {isValidating && <p className="text-sm text-muted-foreground">Aguarde, validando documentos...</p>}
                </CardFooter>
            </Card>

            {/* Bid Result Section */}
            {['AGUARDANDO_DISPUTA', 'EM_HOMOLOGACAO', 'AGUARDANDO_RECURSO', 'EM_PRAZO_CONTRARRAZAO', 'PROCESSO_HOMOLOGADO'].includes(currentStatus) && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Disputa</CardTitle>
                  <CardDescription>Registre o valor do primeiro colocado (se aplicável) para análise.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="valor-primeiro">Valor Ofertado pelo 1º Colocado</Label>
                       <Input
                        id="valor-primeiro"
                        placeholder="R$ 0,00"
                        value={valorPrimeiroColocadoInput}
                        onChange={(e) => {
                             const parsedValue = parseCurrency(e.target.value);
                             setValorPrimeiroColocadoInput(formatCurrency(parsedValue)); // Keep input formatted
                         }}
                        disabled={isSavingBidResult}
                        className={parseCurrency(valorPrimeiroColocadoInput) === undefined && valorPrimeiroColocadoInput !== '' ? 'border-red-500' : ''} // Basic invalid style
                      />
                      {parseCurrency(valorPrimeiroColocadoInput) === undefined && valorPrimeiroColocadoInput !== '' && <p className="text-xs text-destructive mt-1">Valor inválido.</p>}
                    </div>
                    <Button onClick={handleSaveBidResult} disabled={isSavingBidResult || parseCurrency(valorPrimeiroColocadoInput) === undefined}>
                       {isSavingBidResult ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Salvar'}
                    </Button>
                  </div>
                   {bidDifference && (
                     <Alert variant={licitacao.valor <= (licitacao.valorPrimeiroColocado ?? Infinity) ? 'success' : 'warning'} className="text-sm">
                         {licitacao.valor <= (licitacao.valorPrimeiroColocado ?? Infinity) ? <CheckCircle className="h-4 w-4" /> : <HelpCircle className="h-4 w-4"/> }
                       <AlertTitle>Análise de Lance</AlertTitle>
                       <AlertDescription>
                         {licitacao.valorPrimeiroColocado === licitacao.valor
                            ? `Seu lance (${formatCurrency(licitacao.valor)}) foi igual ao do primeiro colocado.`
                            : licitacao.valor < (licitacao.valorPrimeiroColocado ?? Infinity)
                            ? `Seu lance (${formatCurrency(licitacao.valor)}) foi ${bidDifference.absolute} (${bidDifference.percentage}) abaixo do primeiro colocado (${formatCurrency(licitacao.valorPrimeiroColocado)}).`
                            : `Seu lance (${formatCurrency(licitacao.valor)}) foi ${bidDifference.absolute} (${bidDifference.percentage}) acima do primeiro colocado (${formatCurrency(licitacao.valorPrimeiroColocado)}).`}

                       </AlertDescription>
                     </Alert>
                   )}
                </CardContent>
              </Card>
            )}

         </div>


          {/* Right Column: Comments */}
         <div className="lg:col-span-1 space-y-6">
              <Card className="sticky top-4"> {/* Make comments sticky */}
                 <CardHeader>
                     <CardTitle>Comentários</CardTitle>
                     <CardDescription>Adicione notas e atualizações sobre o processo.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4 max-h-[calc(100vh-18rem)] overflow-y-auto p-4 border-t border-b"> {/* Scrollable content */}
                    {licitacao.comentarios && licitacao.comentarios.length > 0 ? (
                        [...licitacao.comentarios].reverse().map(comment => ( // Show newest first
                            <div key={comment.id} className="text-sm border rounded-md p-3 bg-muted/50">
                                <p className="font-medium text-xs text-foreground">{comment.autor} <span className="font-normal text-muted-foreground">em {formatDate(comment.data, true)}</span></p>
                                <p className="mt-1 whitespace-pre-wrap">{comment.texto}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário adicionado ainda.</p>
                    )}
                 </CardContent>
                 <CardFooter className="flex flex-col items-stretch gap-2 pt-4">
                    <Label htmlFor="new-comment">Adicionar Comentário</Label>
                    <Textarea
                        id="new-comment"
                        placeholder="Digite seu comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isAddingComment}
                        className="min-h-[70px]"
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim() || isAddingComment}>
                        {isAddingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Adicionar Comentário
                    </Button>
                 </CardFooter>
              </Card>
         </div>

       </div>
    </div>
  );
}
