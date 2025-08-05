'use client';

import React, {useState, useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {format, parseISO, isValid} from 'date-fns';
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
    Clock,
    FileText,
    FileArchive,
    UserCheck,
    UserX,
    ShieldQuestion,
    FileQuestion,
    CalendarIcon as CalendarDateIcon, // Renamed to avoid conflict with Calendar component
    ArrowRightCircle,
    Save,
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
import {validateBidDocuments, type ValidateBidDocumentsOutput } from '@/ai/flows/document-validator';
import { filesToValidateInput } from '@/lib/file-utils';
import {useToast} from '@/hooks/use-toast';
import { fetchLicitacaoDetails, updateLicitacao, deleteLicitacao, type LicitacaoDetails, statusMap, requiredDocuments, generateAtaSessaoPDF, generatePropostaFinalPDF } from '@/services/licitacaoService';
import { type ClientDetails } from '@/components/clientes/client-form';
import { fetchClientDetails } from '@/services/clientService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService';
import { useAuth } from '@/context/AuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const getBadgeVariant = (color: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'accent' => {
  switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive': return 'destructive';
    case 'warning': return 'warning';
    case 'success': return 'success';
    case 'info': return 'info';
    case 'accent': return 'accent';
    case 'default': return 'default';
    case 'outline':
    default:
      return 'outline';
  }
};

export default function LicitacaoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {toast} = useToast();
  const { user: currentUser } = useAuth();


  const [licitacao, setLicitacao] = useState<LicitacaoDetails | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({});
  const [currentStatus, setCurrentStatus] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidateBidDocumentsOutput | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [bidCriteria, setBidCriteria] = useState<string>('');

  // Habilitação States
  const [ataHabilitacaoConteudo, setAtaHabilitacaoConteudo] = useState<string>('');
  const [dataResultadoHabilitacao, setDataResultadoHabilitacao] = useState<Date | undefined>(undefined);
  const [justificativaInabilitacao, setJustificativaInabilitacao] = useState<string>('');
  const [isEmRecursoHabilitacao, setIsEmRecursoHabilitacao] = useState<boolean>(false);
  const [dataInicioRecursoHabilitacao, setDataInicioRecursoHabilitacao] = useState<Date | undefined>(undefined);
  const [prazoFinalRecursoHabilitacao, setPrazoFinalRecursoHabilitacao] = useState<Date | undefined>(undefined);
  const [textoRecursoHabilitacao, setTextoRecursoHabilitacao] = useState<string>('');
  const [isEmContrarrazoesHabilitacao, setIsEmContrarrazoesHabilitacao] = useState<boolean>(false);
  const [dataInicioContrarrazoesHabilitacao, setDataInicioContrarrazoesHabilitacao] = useState<Date | undefined>(undefined);
  const [prazoFinalContrarrazoesHabilitacao, setPrazoFinalContrarrazoesHabilitacao] = useState<Date | undefined>(undefined);
  const [textoContrarrazoesHabilitacao, setTextoContrarrazoesHabilitacao] = useState<string>('');
  const [decisaoFinalRecursoHabilitacao, setDecisaoFinalRecursoHabilitacao] = useState<'PROVIDO' | 'IMPROVIDO' | 'CONVERTIDO_EM_DILIGENCIA' | 'PENDENTE_JULGAMENTO' | undefined>(undefined);
  const [dataDecisaoFinalRecursoHabilitacao, setDataDecisaoFinalRecursoHabilitacao] = useState<Date | undefined>(undefined);
  const [obsDecisaoFinalRecursoHabilitacao, setObsDecisaoFinalRecursoHabilitacao] = useState<string>('');
  const [isSavingHabilitacao, setIsSavingHabilitacao] = useState(false);


  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const [data, configData] = await Promise.all([
            fetchLicitacaoDetails(id),
            fetchConfiguracoes()
          ]);

          setConfiguracoes(configData);

          if (data) {
            setLicitacao(data);
            setChecklist(data.checklist || {});
            setCurrentStatus(data.status);

             if(data.clienteId) {
                 const clientData = await fetchClientDetails(data.clienteId);
                 setClientDetails(clientData);
             }

            if (data.modalidade === 'Pregão Eletrônico') {
                 setBidCriteria(`Documentos necessários para Pregão Eletrônico (exemplo): ${requiredDocuments.map(d => d.label).join(', ')}. Verificar datas de validade e assinaturas. Atestados de capacidade técnica podem ser exigidos.`);
            } else {
                 setBidCriteria('Defina os critérios e documentos exigidos pelo edital aqui.');
            }

            // Populate Habilitação state from loaded licitacao data
            setAtaHabilitacaoConteudo(data.ataHabilitacaoConteudo || '');
            setDataResultadoHabilitacao(data.dataResultadoHabilitacao instanceof Date ? data.dataResultadoHabilitacao : undefined);
            setJustificativaInabilitacao(data.justificativaInabilitacao || '');
            setIsEmRecursoHabilitacao(data.isEmRecursoHabilitacao || false);
            setDataInicioRecursoHabilitacao(data.dataInicioRecursoHabilitacao instanceof Date ? data.dataInicioRecursoHabilitacao : undefined);
            setPrazoFinalRecursoHabilitacao(data.prazoFinalRecursoHabilitacao instanceof Date ? data.prazoFinalRecursoHabilitacao : undefined);
            setTextoRecursoHabilitacao(data.textoRecursoHabilitacao || '');
            setIsEmContrarrazoesHabilitacao(data.isEmContrarrazoesHabilitacao || false);
            setDataInicioContrarrazoesHabilitacao(data.dataInicioContrarrazoesHabilitacao instanceof Date ? data.dataInicioContrarrazoesHabilitacao : undefined);
            setPrazoFinalContrarrazoesHabilitacao(data.prazoFinalContrarrazoesHabilitacao instanceof Date ? data.prazoFinalContrarrazoesHabilitacao : undefined);
            setTextoContrarrazoesHabilitacao(data.textoContrarrazoesHabilitacao || '');
            setDecisaoFinalRecursoHabilitacao(data.decisaoFinalRecursoHabilitacao || undefined);
            setDataDecisaoFinalRecursoHabilitacao(data.dataDecisaoFinalRecursoHabilitacao instanceof Date ? data.dataDecisaoFinalRecursoHabilitacao : undefined);
            setObsDecisaoFinalRecursoHabilitacao(data.obsDecisaoFinalRecursoHabilitacao || '');


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

  const handleStatusChange = async (newStatus: string) => {
    if (!licitacao || isSavingStatus || newStatus === currentStatus) return;
    setIsSavingStatus(true);
    setError(null);
    try {
        const success = await updateLicitacao(licitacao.id, { status: newStatus });
        if (success) {
           setCurrentStatus(newStatus);
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

  const handleChecklistChange = async (docId: string, checked: boolean) => {
     if (!licitacao || isSavingChecklist) return;
     const originalChecklistValue = checklist[docId];
     const updatedChecklist = { ...checklist, [docId]: checked };
     setChecklist(updatedChecklist);
     setIsSavingChecklist(true);
     setError(null);
     try {
       const success = await updateLicitacao(licitacao.id, { checklist: updatedChecklist });
       if (!success) {
            throw new Error("Falha ao salvar checklist no backend.");
       }
     } catch (err) {
         setChecklist(prev => ({ ...prev, [docId]: originalChecklistValue }));
         setError(`Falha ao atualizar checklist. ${err instanceof Error ? err.message : ''}`);
         toast({ title: "Erro", description: `Falha ao atualizar ${requiredDocuments.find(d=>d.id===docId)?.label || docId}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
     } finally {
        setIsSavingChecklist(false);
     }
  };

  const handleAddComment = async () => {
     if (!licitacao || !newComment.trim() || isAddingComment) return;
     setIsAddingComment(true);
     setError(null);
     const commentData = {
         id: `c${Date.now()}`,
         texto: newComment.trim(),
         data: new Date().toISOString(),
         autor: currentUser?.fullName || currentUser?.username || 'Usuário Atual'
     };
     const updatedComments = [...(licitacao.comentarios || []), commentData];
     const originalComments = licitacao.comentarios;
     setLicitacao(prev => prev ? {...prev, comentarios: updatedComments } : null);
     setNewComment('');
     try {
       const success = await updateLicitacao(licitacao.id, { comentarios: updatedComments });
       if (!success) {
            throw new Error("Falha ao salvar comentário no backend.");
       }
         toast({ title: "Comentário adicionado." });
     } catch(err) {
         setLicitacao(prev => prev ? {...prev, comentarios: originalComments || [] } : null);
         setNewComment(commentData.texto);
         setError(`Falha ao adicionar comentário. ${err instanceof Error ? err.message : ''}`);
         toast({ title: "Erro", description: `Falha ao adicionar comentário. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
     } finally {
      setIsAddingComment(false);
     }
  };

 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setUploadedFiles(prev => {
          const existingNames = new Set(prev.map(f => f.name));
          const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
          return [...prev, ...uniqueNewFiles];
      });
      event.target.value = '';
      setValidationResult(null);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (validationResult) {
        setValidationResult(null);
    }
     setError(null);
  };

  const handleValidateDocuments = async () => {
    if (uploadedFiles.length === 0 || !bidCriteria.trim()) {
      toast({title: "Atenção", description: "Faça upload de documentos e defina os critérios do edital.", variant: "destructive"});
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
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
           const uploadedFile = uploadedFiles.find(f => f.name.toLowerCase().includes(docLabelLower));
           const docFileNameLower = uploadedFile?.name.toLowerCase();
           const aiDetail = docFileNameLower ? validityMap.get(docFileNameLower) : undefined;
           let isConsideredValid = aiDetail?.isValid ?? false;
           const isMissing = result.missingDocuments?.some(missing => missing.toLowerCase().includes(docLabelLower));
           const shouldBeChecked = !!uploadedFile && isConsideredValid && !isMissing;
           aiChecklistUpdates[docId] = shouldBeChecked;
           if (!shouldBeChecked) {
               allRequiredPresentAndValid = false;
           }
         });
         setChecklist(prev => ({ ...prev, ...aiChecklistUpdates }));
         try {
             const success = await updateLicitacao(id, { checklist: { ...checklist, ...aiChecklistUpdates } });
             if (success) {
                 toast({ title: "Checklist Atualizado", description: "Checklist atualizado com base na validação da IA." });
             } else {
                 throw new Error("Falha ao salvar checklist atualizado pela IA no backend.");
             }
         } catch (checklistSaveError) {
              console.error("Checklist save error:", checklistSaveError);
              toast({ title: "Erro ao Salvar Checklist", description: `Não foi possível salvar as atualizações do checklist. ${checklistSaveError instanceof Error ? checklistSaveError.message : ''}`, variant: "destructive" });
         }
         if (currentStatus === 'EM_ANALISE' || currentStatus === 'FALTA_DOCUMENTACAO') {
            if (result.completeness && allRequiredPresentAndValid) {
                await handleStatusChange('DOCUMENTACAO_CONCLUIDA');
            } else {
                await handleStatusChange('FALTA_DOCUMENTACAO');
            }
         } else if (currentStatus === 'AGUARDANDO_ANALISE') {
             await handleStatusChange('EM_ANALISE');
             if (result.completeness && allRequiredPresentAndValid) {
                await handleStatusChange('DOCUMENTACAO_CONCLUIDA');
             } else {
                await handleStatusChange('FALTA_DOCUMENTACAO');
            }
         }
       } else {
           console.warn("AI validation result structure might be incomplete:", result);
           setError("Resultado da validação da IA está incompleto.");
       }
    } catch (error) {
      console.error('Erro na validação por IA:', error);
      const errorMessage = `Falha ao validar documentos com IA. ${error instanceof Error ? error.message : 'Erro desconhecido.'}`;
      setError(errorMessage);
      toast({title: "Erro de Validação", description: errorMessage, variant: "destructive"});
       setValidationResult({
            completeness: false,
            validityDetails: uploadedFiles.map(f => ({ documentName: f.name, isValid: false, reasoning: `Falha na validação: ${error instanceof Error ? error.message : 'Erro desconhecido.'}`})),
            missingDocuments: ['Processo de validação falhou']
       });
    } finally {
      setIsValidating(false);
    }
  };

  const formatCurrency = (value: number | undefined | null): string => {
      if (value === undefined || value === null) return '';
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

   const handleDelete = async () => {
       if (!licitacao) return;
       setIsDeleting(true);
       setError(null);
       try {
           const success = await deleteLicitacao(licitacao.id);
           if (success) {
               toast({ title: "Sucesso", description: "Licitação excluída." });
               router.push('/licitacoes');
           } else {
               throw new Error("Falha na operação de exclusão no backend.");
           }
       } catch (err) {
           console.error('Erro ao excluir licitação:', err);
           setError(`Falha ao excluir a licitação. ${err instanceof Error ? err.message : ''}`);
           toast({ title: "Erro", description: `Não foi possível excluir a licitação. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
           setIsDeleting(false);
       }
   };

   const handleSaveHabilitacaoDetails = async () => {
        if (!licitacao) return;
        setIsSavingHabilitacao(true);
        setError(null);
        try {
            const dataToUpdate: Partial<LicitacaoDetails> = {
                ataHabilitacaoConteudo,
                dataResultadoHabilitacao,
                justificativaInabilitacao,
                isEmRecursoHabilitacao,
                dataInicioRecursoHabilitacao,
                prazoFinalRecursoHabilitacao,
                textoRecursoHabilitacao,
                isEmContrarrazoesHabilitacao,
                dataInicioContrarrazoesHabilitacao,
                prazoFinalContrarrazoesHabilitacao,
                textoContrarrazoesHabilitacao,
                decisaoFinalRecursoHabilitacao,
                dataDecisaoFinalRecursoHabilitacao,
                obsDecisaoFinalRecursoHabilitacao,
            };
            const success = await updateLicitacao(licitacao.id, dataToUpdate);
            if (success) {
                setLicitacao(prev => prev ? { ...prev, ...dataToUpdate } : null);
                toast({ title: "Sucesso", description: "Detalhes da fase de habilitação salvos." });
            } else {
                throw new Error("Falha ao salvar detalhes da habilitação no backend.");
            }
        } catch (err) {
            setError(`Falha ao salvar detalhes da habilitação. ${err instanceof Error ? err.message : ''}`);
            toast({ title: "Erro", description: `Falha ao salvar detalhes da habilitação. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setIsSavingHabilitacao(false);
        }
    };


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error && !licitacao) {
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

    const formatDate = (date: Date | string | undefined | null, time = false): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!(dateObj instanceof Date) || !isValid(dateObj)) {
                 console.warn("Invalid date encountered:", date);
                 return 'Data inválida';
            }
            const formatString = time ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
            return format(dateObj, formatString, { locale: ptBR });
        } catch (e) {
            console.error("Error formatting date:", date, e);
            return 'Data inválida';
        }
    };


  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
               <div className="flex items-center gap-2 mb-1">
                    <Button variant="outline" size="sm" onClick={() => router.push('/licitacoes')} className="h-7 px-2">
                       <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-2xl font-semibold">{licitacao.numeroLicitacao}</h2>
                </div>
               <p className="text-muted-foreground ml-9">{licitacao.clienteNome} ({clientDetails?.cnpj || 'CNPJ não carregado'})</p>
               <p className="text-sm text-muted-foreground ml-9">Órgão: {licitacao.orgaoComprador || 'N/A'}</p>
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
                 <div className="flex flex-wrap gap-2 justify-end">
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
                    {licitacao.disputaLog?.finalizadaEm && (
                        <Button variant="outline" size="sm" onClick={() => generateAtaSessaoPDF(licitacao, configuracoes, currentUser)} disabled={!configuracoes}>
                            <FileText className="mr-2 h-4 w-4"/> Gerar Ata da Disputa
                        </Button>
                    )}
                    {licitacao.disputaLog?.itensPropostaFinalCliente && licitacao.disputaLog.itensPropostaFinalCliente.length > 0 && (
                        <Button variant="outline" size="sm" onClick={async () => await generatePropostaFinalPDF(licitacao, configuracoes, currentUser)} disabled={!configuracoes}>
                            <FileText className="mr-2 h-4 w-4"/> Gerar Proposta Final
                        </Button>
                    )}
                 </div>
             </div>
       </div>

      {error && !loading && (
           <Alert variant="destructive">
               <XCircle className="h-4 w-4"/>
               <AlertTitle>Erro</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
           </Alert>
      )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Licitação</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                   <div><span className="font-medium">Protocolo:</span> {licitacao.id}</div>
                   <div><span className="font-medium">Valor Cobrado (Assessoria):</span> {formatCurrency(licitacao.valorCobrado)}</div>
                   <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground"/> <span className="font-medium">Início Disputa:</span> {formatDate(licitacao.dataInicio, true)}</div>
                   <div className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5 text-muted-foreground"/> <span className="font-medium">Meta Análise:</span> {formatDate(licitacao.dataMetaAnalise)}</div>
                    {licitacao.dataHomologacao && (
                        <div className="sm:col-span-2"><span className="font-medium">Data Homologação:</span> {formatDate(licitacao.dataHomologacao)}</div>
                    )}
                    {licitacao.propostaItensPdfNome && (
                        <div className="sm:col-span-2 flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-muted-foreground"/> <span className="font-medium">PDF Itens da Proposta:</span> {licitacao.propostaItensPdfNome}</div>
                    )}
                   {licitacao.observacoes && (
                       <div className="sm:col-span-2 mt-2 pt-2 border-t"><span className="font-medium">Observações:</span> <p className="text-muted-foreground whitespace-pre-wrap">{licitacao.observacoes}</p></div>
                   )}
                   {/* Display Recourse Deadlines */}
                    { (currentStatus === 'RECURSO_HABILITACAO' || currentStatus === 'EM_RECURSO_GERAL') && licitacao.prazoFinalRecursoHabilitacao && (
                        <div className="sm:col-span-2 text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                            <CalendarCheck className="h-3.5 w-3.5"/> Prazo Final Recurso: {formatDate(licitacao.prazoFinalRecursoHabilitacao)}
                        </div>
                    )}
                    { (currentStatus === 'CONTRARRAZOES_HABILITACAO' || currentStatus === 'EM_CONTRARRAZAO_GERAL') && licitacao.prazoFinalContrarrazoesHabilitacao && (
                        <div className="sm:col-span-2 text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                            <CalendarCheck className="h-3.5 w-3.5"/> Prazo Final Contrarrazões: {formatDate(licitacao.prazoFinalContrarrazoesHabilitacao)}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Checklist de Documentos</CardTitle>
                    <CardDescription>Marque os documentos conforme análise ou validação da IA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {requiredDocuments.map(doc => {
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
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Validador de Documentos (IA)</CardTitle>
                            <CardDescription className="mt-1">Faça upload dos documentos e defina os critérios do edital para validação.</CardDescription>
                        </div>
                        <Button onClick={handleValidateDocuments} disabled={isValidating || uploadedFiles.length === 0 || !bidCriteria.trim()} className="shrink-0">
                            {isValidating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</> : <><Bot className="mr-2 h-4 w-4" /> Validar com IA</>}
                        </Button>
                    </div>
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
            </Card>

            {/* Fase de Habilitação e Recursos Card */}
            {['DISPUTA_CONCLUIDA', 'EM_HABILITACAO', 'HABILITADO', 'INABILITADO', 'RECURSO_HABILITACAO', 'CONTRARRAZOES_HABILITACAO','AGUARDANDO_RECURSO', 'EM_PRAZO_CONTRARRAZAO', 'EM_HOMOLOGACAO', 'PROCESSO_HOMOLOGADO', 'EM_RECURSO_GERAL', 'EM_CONTRARRAZAO_GERAL'].includes(currentStatus) && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <CardTitle>Fase de Habilitação e Recursos</CardTitle>
                                <CardDescription className="mt-1">Gerencie o resultado da habilitação e os processos de recurso.</CardDescription>
                            </div>
                            <Button onClick={handleSaveHabilitacaoDetails} disabled={isSavingHabilitacao} className="shrink-0">
                                {isSavingHabilitacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Dados
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Ata de Habilitação */}
                        <div className="space-y-2">
                            <Label htmlFor="ataHabilitacaoConteudo">Conteúdo para Ata de Habilitação</Label>
                            <Textarea
                                id="ataHabilitacaoConteudo"
                                value={ataHabilitacaoConteudo}
                                onChange={(e) => setAtaHabilitacaoConteudo(e.target.value)}
                                placeholder="Registre aqui os pontos principais, decisões, e informações relevantes para a Ata de Habilitação..."
                                className="min-h-[120px]"
                                disabled={isSavingHabilitacao}
                            />
                        </div>
                        <Separator />
                        {/* Resultado Habilitação */}
                        <div className="space-y-2">
                            <Label htmlFor="dataResultadoHabilitacao">Data do Resultado da Habilitação</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataResultadoHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}>
                                        <CalendarDateIcon className="mr-2 h-4 w-4" />
                                        {dataResultadoHabilitacao ? format(dataResultadoHabilitacao, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataResultadoHabilitacao} onSelect={setDataResultadoHabilitacao} initialFocus disabled={isSavingHabilitacao}/></PopoverContent>
                            </Popover>
                        </div>
                        {currentStatus === 'INABILITADO' && ( // Show only if status is Inabilitado
                             <div className="space-y-2">
                                <Label htmlFor="justificativaInabilitacao">Justificativa (Inabilitação)</Label>
                                <Textarea id="justificativaInabilitacao" value={justificativaInabilitacao} onChange={(e) => setJustificativaInabilitacao(e.target.value)} placeholder="Motivos da inabilitação..." disabled={isSavingHabilitacao} />
                            </div>
                        )}

                        <Separator />
                        {/* Recurso */}
                        <div className="space-y-2">
                           <div className="flex items-center space-x-2">
                                <Checkbox id="isEmRecursoHabilitacao" checked={isEmRecursoHabilitacao} onCheckedChange={(checked) => setIsEmRecursoHabilitacao(Boolean(checked))} disabled={isSavingHabilitacao} />
                                <Label htmlFor="isEmRecursoHabilitacao">Houve Recurso para Habilitação?</Label>
                           </div>
                            {isEmRecursoHabilitacao && (
                                <div className="ml-6 space-y-3 p-3 border-l-2 border-primary/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><Label htmlFor="dataInicioRecursoHabilitacao">Data Início Recurso</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !dataInicioRecursoHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}><CalendarDateIcon className="mr-2 h-4 w-4" />{dataInicioRecursoHabilitacao ? format(dataInicioRecursoHabilitacao, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicioRecursoHabilitacao} onSelect={setDataInicioRecursoHabilitacao} disabled={isSavingHabilitacao}/></PopoverContent></Popover></div>
                                        <div><Label htmlFor="prazoFinalRecursoHabilitacao">Prazo Final Recurso</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !prazoFinalRecursoHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}><CalendarDateIcon className="mr-2 h-4 w-4" />{prazoFinalRecursoHabilitacao ? format(prazoFinalRecursoHabilitacao, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={prazoFinalRecursoHabilitacao} onSelect={setPrazoFinalRecursoHabilitacao} disabled={isSavingHabilitacao}/></PopoverContent></Popover></div>
                                    </div>
                                    <div><Label htmlFor="textoRecursoHabilitacao">Texto/Resumo do Recurso</Label><Textarea id="textoRecursoHabilitacao" value={textoRecursoHabilitacao} onChange={(e) => setTextoRecursoHabilitacao(e.target.value)} placeholder="Principais pontos do recurso interposto..." disabled={isSavingHabilitacao} /></div>
                                </div>
                            )}
                        </div>

                        {/* Contrarrazões */}
                         {isEmRecursoHabilitacao && ( // Only show if there was a Recurso
                            <div className="space-y-2 mt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="isEmContrarrazoesHabilitacao" checked={isEmContrarrazoesHabilitacao} onCheckedChange={(checked) => setIsEmContrarrazoesHabilitacao(Boolean(checked))} disabled={isSavingHabilitacao} />
                                    <Label htmlFor="isEmContrarrazoesHabilitacao">Houve Contrarrazões?</Label>
                                </div>
                                {isEmContrarrazoesHabilitacao && (
                                    <div className="ml-6 space-y-3 p-3 border-l-2 border-accent/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><Label htmlFor="dataInicioContrarrazoesHabilitacao">Data Início Contrarrazões</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !dataInicioContrarrazoesHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}><CalendarDateIcon className="mr-2 h-4 w-4" />{dataInicioContrarrazoesHabilitacao ? format(dataInicioContrarrazoesHabilitacao, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicioContrarrazoesHabilitacao} onSelect={setDataInicioContrarrazoesHabilitacao} disabled={isSavingHabilitacao}/></PopoverContent></Popover></div>
                                            <div><Label htmlFor="prazoFinalContrarrazoesHabilitacao">Prazo Final Contrarrazões</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !prazoFinalContrarrazoesHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}><CalendarDateIcon className="mr-2 h-4 w-4" />{prazoFinalContrarrazoesHabilitacao ? format(prazoFinalContrarrazoesHabilitacao, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={prazoFinalContrarrazoesHabilitacao} onSelect={setPrazoFinalContrarrazoesHabilitacao} disabled={isSavingHabilitacao}/></PopoverContent></Popover></div>
                                        </div>
                                        <div><Label htmlFor="textoContrarrazoesHabilitacao">Texto/Resumo das Contrarrazões</Label><Textarea id="textoContrarrazoesHabilitacao" value={textoContrarrazoesHabilitacao} onChange={(e) => setTextoContrarrazoesHabilitacao(e.target.value)} placeholder="Principais pontos das contrarrazões apresentadas..." disabled={isSavingHabilitacao} /></div>
                                    </div>
                                )}
                            </div>
                        )}
                         {isEmRecursoHabilitacao && ( // Only show if there was a Recurso
                            <div className="space-y-2 mt-4 pt-3 border-t">
                                 <Label htmlFor="decisaoFinalRecursoHabilitacao">Decisão Final do Recurso</Label>
                                 <Select value={decisaoFinalRecursoHabilitacao || ''} onValueChange={(value) => setDecisaoFinalRecursoHabilitacao(value as any)} disabled={isSavingHabilitacao}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a decisão..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDENTE_JULGAMENTO">Pendente de Julgamento</SelectItem>
                                        <SelectItem value="PROVIDO">Provido</SelectItem>
                                        <SelectItem value="IMPROVIDO">Improvido</SelectItem>
                                        <SelectItem value="CONVERTIDO_EM_DILIGENCIA">Convertido em Diligência</SelectItem>
                                    </SelectContent>
                                </Select>
                                {decisaoFinalRecursoHabilitacao && decisaoFinalRecursoHabilitacao !== 'PENDENTE_JULGAMENTO' && (
                                    <>
                                        <div className="mt-2"><Label htmlFor="dataDecisaoFinalRecursoHabilitacao">Data da Decisão Final</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !dataDecisaoFinalRecursoHabilitacao && "text-muted-foreground")} disabled={isSavingHabilitacao}><CalendarDateIcon className="mr-2 h-4 w-4" />{dataDecisaoFinalRecursoHabilitacao ? format(dataDecisaoFinalRecursoHabilitacao, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataDecisaoFinalRecursoHabilitacao} onSelect={setDataDecisaoFinalRecursoHabilitacao} disabled={isSavingHabilitacao}/></PopoverContent></Popover></div>
                                        <div className="mt-2"><Label htmlFor="obsDecisaoFinalRecursoHabilitacao">Observações da Decisão</Label><Textarea id="obsDecisaoFinalRecursoHabilitacao" value={obsDecisaoFinalRecursoHabilitacao} onChange={(e) => setObsDecisaoFinalRecursoHabilitacao(e.target.value)} placeholder="Detalhes da decisão..." disabled={isSavingHabilitacao} /></div>
                                    </>
                                )}
                            </div>
                        )}

                    </CardContent>
                </Card>
            )}
         </div>

         <div className="lg:col-span-1 space-y-6">
              <Card className="sticky top-4">
                 <CardHeader>
                     <CardTitle>Comentários</CardTitle>
                     <CardDescription>Adicione notas e atualizações sobre o processo.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4 max-h-[calc(100vh-18rem)] overflow-y-auto p-4 border-t border-b">
                    <div className="flex flex-col items-stretch gap-2 pb-4 border-b">
                        <Label htmlFor="new-comment" className="sr-only">Adicionar Comentário</Label>
                        <Textarea
                            id="new-comment"
                            placeholder="Digite seu comentário..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isAddingComment}
                            className="min-h-[70px]"
                        />
                        <Button onClick={handleAddComment} disabled={!newComment.trim() || isAddingComment} size="sm">
                            {isAddingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Adicionar Comentário
                        </Button>
                    </div>
                    {licitacao.comentarios && licitacao.comentarios.length > 0 ? (
                        [...licitacao.comentarios].reverse().map(comment => (
                            <div key={comment.id} className="text-sm border rounded-md p-3 bg-muted/50">
                                <p className="font-medium text-xs text-foreground">{comment.autor} <span className="font-normal text-muted-foreground">em {formatDate(comment.data, true)}</span></p>
                                <p className="mt-1 whitespace-pre-wrap">{comment.texto}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário adicionado ainda.</p>
                    )}
                 </CardContent>
              </Card>
         </div>
       </div>
    </div>
  );
}