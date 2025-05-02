
'use client'; // Required for state, effects, and client-side interactions

import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
import {format} from 'date-fns';
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
import {FileCheck2, FileX2, HelpCircle, Upload, Bot, Loader2, CheckCircle, XCircle, Send} from 'lucide-react';
import {validateBidDocuments, type ValidateBidDocumentsOutput, filesToValidateInput} from '@/ai/flows/document-validator'; // Import AI flow and helper
import {useToast} from '@/hooks/use-toast'; // Import useToast hook

// --- Mock Data and Types ---
interface LicitacaoDetails {
  id: string;
  cliente: string;
  cnpjCliente: string; // Added for context
  modalidade: string;
  numero: string;
  plataforma: string;
  dataInicio: Date;
  dataMetaAnalise: Date;
  valor: number;
  status: string;
  observacoes?: string;
  checklist: { [key: string]: boolean };
  comentarios: { id: string, texto: string, data: Date, autor: string }[];
  valorPrimeiroColocado?: number;
}

// Same status map as in licitacoes/page.tsx
const statusMap: {[key: string]: {label: string; color: string}} = {
  AGUARDANDO_ANALISE: {label: 'Aguardando Análise', color: 'secondary'},
  EM_ANALISE: {label: 'Em Análise', color: 'info'},
  DOCUMENTACAO_CONCLUIDA: {label: 'Documentação Concluída', color: 'success'},
  FALTA_DOCUMENTACAO: {label: 'Falta Documentação', color: 'warning'},
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent'},
  EM_HOMOLOGACAO: {label: 'Em Homologação', color: 'default'},
  AGUARDANDO_RECURSO: {label: 'Aguardando Recurso', color: 'outline'},
  EM_PRAZO_CONTRARRAZAO: {label: 'Prazo Contrarrazão', color: 'outline'},
  PROCESSO_HOMOLOGADO: {label: 'Processo Homologado', color: 'success'},
};

const getBadgeVariant = (color: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
   switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive':
    case 'warning':
      return 'destructive';
    case 'success': return 'default';
    case 'info':
    case 'accent':
    case 'outline':
    default:
      return 'outline';
  }
};

const requiredDocuments = [
  { id: 'contratoSocial', label: 'Contrato Social' },
  { id: 'cnpjDoc', label: 'CNPJ' }, // Renamed to avoid conflict
  { id: 'cndFederal', label: 'CND Federal' },
  { id: 'cndEstadual', label: 'CND Estadual' },
  { id: 'cndMunicipal', label: 'CND Municipal' },
  { id: 'cndFgts', label: 'CND FGTS' },
  { id: 'cndt', label: 'CNDT' },
  { id: 'certidaoFalencia', label: 'Certidão de Falência' },
  { id: 'qualificacaoFinanceira', label: 'Qualificação Financeira' },
  { id: 'qualificacaoTecnica', label: 'Qualificação Técnica' },
];

// Mock fetch function
const fetchLicitacaoDetails = async (id: string): Promise<LicitacaoDetails | null> => {
  console.log(`Fetching details for licitação ID: ${id}`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  if (id === 'LIC-001') {
    return {
      id: 'LIC-001',
      cliente: 'Empresa Exemplo Ltda',
      cnpjCliente: '00.000.000/0001-00',
      modalidade: 'Pregão Eletrônico',
      numero: 'PE 123/2024',
      plataforma: 'ComprasNet',
      dataInicio: new Date(2024, 6, 25, 9, 0),
      dataMetaAnalise: new Date(2024, 6, 20),
      valor: 500.0,
      status: 'AGUARDANDO_ANALISE',
      observacoes: 'Verificar necessidade de atestado específico.',
      checklist: {
        contratoSocial: true,
        cnpjDoc: true,
        cndFederal: false, // Example missing
      },
      comentarios: [
          { id: 'c1', texto: 'Cliente enviou Contrato Social atualizado.', data: new Date(2024, 6, 15, 10, 0), autor: 'Analista 1'},
      ],
      valorPrimeiroColocado: undefined, // Example initial state
    };
  }
   if (id === 'LIC-002') {
     return {
       id: 'LIC-002',
       cliente: 'Soluções Inovadoras S.A.',
       cnpjCliente: '11.111.111/0001-11',
       modalidade: 'Tomada de Preços',
       numero: 'TP 005/2024',
       plataforma: 'Portal da Cidade',
       dataInicio: new Date(2024, 7, 1, 14, 30),
       dataMetaAnalise: new Date(2024, 6, 28),
       valor: 1200.5,
       status: 'EM_ANALISE',
       checklist: { /* Add checklist data */ },
       comentarios: [],
       valorPrimeiroColocado: 1150.00 // Example finished bid
     };
   }
  return null; // Not found
};

// Mock update function
const updateLicitacao = async (id: string, data: Partial<LicitacaoDetails>): Promise<boolean> => {
   console.log(`Updating licitação ID: ${id} with data:`, data);
   // Simulate API call
   await new Promise(resolve => setTimeout(resolve, 300));
   return true; // Simulate success
}


// --- Component ---
export default function LicitacaoDetalhesPage() {
  const params = useParams();
  const id = params.id as string;
  const {toast} = useToast();

  const [licitacao, setLicitacao] = useState<LicitacaoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({});
  const [status, setStatus] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidateBidDocumentsOutput | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [bidCriteria, setBidCriteria] = useState<string>(''); // State for bid criteria input

  const [valorPrimeiroColocado, setValorPrimeiroColocado] = useState<number | undefined>(undefined);
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
            setChecklist(data.checklist || {}); // Initialize checklist state
            setStatus(data.status); // Initialize status state
            setValorPrimeiroColocado(data.valorPrimeiroColocado); // Init competitor bid value

            // Pre-fill criteria based on modality (example)
            if (data.modalidade === 'Pregão Eletrônico') {
                 setBidCriteria('Documentos necessários para Pregão Eletrônico: Contrato Social, CNPJ, CND Federal, CND Estadual, CND Municipal, CND FGTS, CNDT, Certidão de Falência, Qualificação Financeira (Balanço), Qualificação Técnica (Atestados, se aplicável).');
            } else {
                 setBidCriteria('Defina os critérios e documentos exigidos pelo edital aqui.');
            }


          } else {
            setError('Licitação não encontrada.');
          }
        } catch (err) {
          console.error('Erro ao buscar detalhes da licitação:', err);
          setError('Falha ao carregar os dados da licitação.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [id]);

  // Handler for status change
  const handleStatusChange = async (newStatus: string) => {
    if (!licitacao || isSavingStatus) return;
    setIsSavingStatus(true);
    const success = await updateLicitacao(licitacao.id, { status: newStatus });
    if (success) {
       setStatus(newStatus); // Update local state on success
       setLicitacao(prev => prev ? {...prev, status: newStatus} : null);
       toast({ title: "Sucesso", description: "Status da licitação atualizado." });
    } else {
        toast({ title: "Erro", description: "Falha ao atualizar o status.", variant: "destructive" });
    }
    setIsSavingStatus(false);
  };

  // Handler for checklist item change
  const handleChecklistChange = async (docId: string, checked: boolean) => {
     if (!licitacao || isSavingChecklist) return;
     setIsSavingChecklist(true);

     const updatedChecklist = { ...checklist, [docId]: checked };
     setChecklist(updatedChecklist); // Optimistic UI update

     const success = await updateLicitacao(licitacao.id, { checklist: updatedChecklist });
     if (success) {
         // Already updated locally
         // toast({ title: "Checklist atualizado" }); // Optional success toast
     } else {
         // Revert UI on failure
         setChecklist(prev => ({ ...prev, [docId]: !checked }));
         toast({ title: "Erro", description: `Falha ao atualizar ${docId}.`, variant: "destructive" });
     }
     setIsSavingChecklist(false);
  };

  // Handler for adding a comment
  const handleAddComment = async () => {
     if (!licitacao || !newComment.trim() || isAddingComment) return;
     setIsAddingComment(true);

     const commentData = {
         id: `c${Date.now()}`, // Temporary ID, backend should generate real one
         texto: newComment,
         data: new Date(),
         autor: 'Usuário Atual' // Replace with actual user info
     };

     const updatedComments = [...(licitacao.comentarios || []), commentData];

     // Optimistic UI update
     setLicitacao(prev => prev ? {...prev, comentarios: updatedComments } : null);
     setNewComment('');

     const success = await updateLicitacao(licitacao.id, { comentarios: updatedComments }); // Send the whole list
     if (success) {
          toast({ title: "Comentário adicionado." });
     } else {
         // Revert UI on failure
         setLicitacao(prev => prev ? {...prev, comentarios: licitacao.comentarios || [] } : null);
         setNewComment(commentData.texto); // Put text back in textarea
         toast({ title: "Erro", description: "Falha ao adicionar comentário.", variant: "destructive" });
     }
     setIsAddingComment(false);
  };

 // Handler for file upload
 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(event.target.files!)]);
      // Clear the input value to allow uploading the same file again if needed
      event.target.value = '';
    }
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // If removing a file while validation results exist, clear results
    if (validationResult) {
        setValidationResult(null);
    }
  };

 // Handler for triggering AI validation
  const handleValidateDocuments = async () => {
    if (uploadedFiles.length === 0 || !bidCriteria.trim()) {
      toast({title: "Atenção", description: "Faça upload de documentos e defina os critérios do edital.", variant: "destructive"});
      return;
    }
    setIsValidating(true);
    setValidationResult(null); // Clear previous results

    try {
      // Use the helper function to convert files to the required input format
      const input = await filesToValidateInput(uploadedFiles, bidCriteria);

      console.log("Sending to AI:", JSON.stringify(input, null, 2)); // Log input for debugging

      const result = await validateBidDocuments(input);
      setValidationResult(result);
      console.log("AI Result:", JSON.stringify(result, null, 2));

        // Automatically update checklist based on AI result (optional)
       if (result.validityDetails) {
         const updatedChecklist = { ...checklist };
         let allRequiredPresentAndValid = true;

         // Map AI results by document name for easier lookup
         const validityMap = new Map(result.validityDetails.map(detail => [detail.documentName.toLowerCase(), detail.isValid]));

         requiredDocuments.forEach(docInfo => {
           const docLabelLower = docInfo.label.toLowerCase();
           // Find *any* uploaded file whose name contains the required doc label (case-insensitive)
           const uploadedFile = uploadedFiles.find(f => f.name.toLowerCase().includes(docLabelLower));
           const docFileNameLower = uploadedFile?.name.toLowerCase();

           let isConsideredValid = false;
           if (docFileNameLower && validityMap.has(docFileNameLower)) {
             isConsideredValid = validityMap.get(docFileNameLower) ?? false;
           }

           // Update checklist based on whether a matching file was found and considered valid by the AI
           updatedChecklist[docInfo.id] = !!uploadedFile && isConsideredValid;


           // Check if this required doc is missing or invalid
           const isMissing = result.missingDocuments?.some(missing => missing.toLowerCase().includes(docLabelLower));

           if (!uploadedFile || !isConsideredValid || isMissing) {
                allRequiredPresentAndValid = false;
                // Ensure checklist is false if invalid or missing
                updatedChecklist[docInfo.id] = false;
           }
         });

           // Update checklist state after processing all documents
         // Set local state first for responsiveness
         setChecklist(updatedChecklist);
         // Then, attempt to save the updated checklist to the backend
         const success = await updateLicitacao(id, { checklist: updatedChecklist });
         if (success) {
              toast({ title: "Checklist Atualizado", description: "Checklist atualizado com base na validação da IA." });
         } else {
              // Revert checklist changes if backend update fails (optional)
              toast({ title: "Erro", description: "Falha ao salvar checklist atualizado pela IA.", variant: "destructive" });
               // Consider reverting `checklist` state here if needed by refetching or storing original
               const originalData = await fetchLicitacaoDetails(id); // Refetch to revert
               if (originalData) setChecklist(originalData.checklist || {});

         }


          // Update status based on completeness (example logic)
         if (result.completeness && allRequiredPresentAndValid && status === 'EM_ANALISE') {
            handleStatusChange('DOCUMENTACAO_CONCLUIDA');
         } else if ((!result.completeness || !allRequiredPresentAndValid) && status !== 'FALTA_DOCUMENTACAO') {
            handleStatusChange('FALTA_DOCUMENTACAO');
         }

       }


    } catch (error) {
      console.error('Erro na validação por IA:', error);
      toast({title: "Erro de Validação", description: `Falha ao validar documentos com IA. ${error instanceof Error ? error.message : ''}`, variant: "destructive"});
    } finally {
      setIsValidating(false);
    }
  };


   // Handler for saving bid result (1st place value)
   const handleSaveBidResult = async () => {
      if (!licitacao || isSavingBidResult || valorPrimeiroColocado === undefined || valorPrimeiroColocado <= 0) {
          toast({ title: "Atenção", description: "Insira um valor válido para o primeiro colocado.", variant: "destructive" });
          return;
      }
      setIsSavingBidResult(true);
      const success = await updateLicitacao(licitacao.id, { valorPrimeiroColocado });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, valorPrimeiroColocado } : null);
        toast({ title: "Sucesso", description: "Valor do primeiro colocado salvo." });
      } else {
         toast({ title: "Erro", description: "Falha ao salvar o valor.", variant: "destructive" });
      }
      setIsSavingBidResult(false);
   };

   // Calculate bid difference
   const calculateBidDifference = () => {
     if (!licitacao || valorPrimeiroColocado === undefined || licitacao.valor <= 0 || valorPrimeiroColocado <= 0) {
       return null;
     }
     const difference = licitacao.valor - valorPrimeiroColocado;
     const percentageDifference = (difference / valorPrimeiroColocado) * 100;
     return {
       absolute: difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
       percentage: percentageDifference.toFixed(2) + '%'
     };
   };

   const bidDifference = calculateBidDifference();


  // --- Render Logic ---
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <Alert variant="destructive">
             <XCircle className="h-4 w-4"/>
             <AlertTitle>Erro</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>;
  }

  if (!licitacao) {
    return <Alert>
              <HelpCircle className="h-4 w-4"/>
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>Nenhuma informação de licitação para exibir.</AlertDescription>
           </Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div>
           <h2 className="text-2xl font-semibold">{licitacao.numero}</h2>
           <p className="text-muted-foreground">{licitacao.cliente} ({licitacao.cnpjCliente})</p>
           <p className="text-sm text-muted-foreground">{licitacao.modalidade} - {licitacao.plataforma}</p>
        </div>
         <div className="flex items-center gap-4 flex-shrink-0">
             <Badge variant={getBadgeVariant(statusMap[status]?.color || 'outline')} className="text-sm px-3 py-1">
                {statusMap[status]?.label || status}
             </Badge>
             <Select value={status} onValueChange={handleStatusChange} disabled={isSavingStatus}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Alterar Status" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(statusMap).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} disabled={isSavingStatus}>
                        {isSavingStatus && status === key ? 'Salvando...' : label}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
         </div>
      </div>

      {/* Main Content Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

         {/* Left Column: Details & Checklist */}
         <div className="lg:col-span-2 space-y-6">
             {/* Core Details */}
              <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Licitação</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div><span className="font-medium">Protocolo:</span> {licitacao.id}</div>
                   <div><span className="font-medium">Valor Cobrado:</span> {licitacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                   <div><span className="font-medium">Início Disputa:</span> {format(licitacao.dataInicio, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                   <div><span className="font-medium">Meta Análise:</span> {format(licitacao.dataMetaAnalise, "dd/MM/yyyy", { locale: ptBR })}</div>
                   {licitacao.observacoes && (
                       <div className="sm:col-span-2"><span className="font-medium">Observações:</span> {licitacao.observacoes}</div>
                   )}
                </CardContent>
            </Card>

             {/* Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Checklist de Documentos</CardTitle>
                    <CardDescription>Marque os documentos obrigatórios conforme o edital.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {requiredDocuments.map(doc => {
                        // Find the AI validation result for this specific required document type
                        const docLabelLower = doc.label.toLowerCase();
                        const aiValidationDetail = validationResult?.validityDetails?.find(detail =>
                            detail.documentName.toLowerCase().includes(docLabelLower)
                        );

                        return (
                            <div key={doc.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`chk-${doc.id}`}
                                    checked={checklist[doc.id] || false}
                                    onCheckedChange={(checked) => handleChecklistChange(doc.id, !!checked)}
                                    disabled={isSavingChecklist}
                                />
                                <Label htmlFor={`chk-${doc.id}`} className="flex-1 text-sm font-normal">
                                    {doc.label}
                                </Label>
                                {/* Indicate AI validation status if available */}
                                {aiValidationDetail && (
                                    aiValidationDetail.isValid
                                        ? <CheckCircle className="h-4 w-4 text-green-600" title={`Validado pela IA ${aiValidationDetail.reasoning ? `(${aiValidationDetail.reasoning})` : ''}`} />
                                        : <XCircle className="h-4 w-4 text-red-600" title={`Inválido/Problema (IA): ${aiValidationDetail.reasoning || 'Sem detalhes'}`} />
                                )}
                                {isSavingChecklist && checklist[doc.id] !== licitacao.checklist?.[doc.id] && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        );
                    })}
                </CardContent>
                 <CardFooter>
                    {isSavingChecklist && <p className="text-sm text-muted-foreground">Salvando checklist...</p>}
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
                        <Label htmlFor="bid-criteria">Critérios do Edital (Documentos Exigidos)</Label>
                        <Textarea
                            id="bid-criteria"
                            placeholder="Liste os documentos obrigatórios e critérios específicos mencionados no edital..."
                            value={bidCriteria}
                            onChange={(e) => setBidCriteria(e.target.value)}
                            className="min-h-[80px] mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="file-upload" className="mb-1 block">Upload de Documentos</Label>
                        <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="cursor-pointer" />
                        {uploadedFiles.length > 0 && (
                            <div className="mt-3 space-y-2 text-sm">
                                <p className="font-medium">Arquivos carregados:</p>
                                <ul className="list-disc list-inside">
                                {uploadedFiles.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between">
                                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="text-destructive hover:text-destructive">Remover</Button>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                    </div>

                     {validationResult && (
                        <Alert variant={validationResult.completeness ? 'default' : 'destructive'} className="mt-4">
                            {validationResult.completeness ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            <AlertTitle>{validationResult.completeness ? 'Validação Concluída' : 'Validação Concluída (Incompleto/Inválido)'}</AlertTitle>
                            <AlertDescription>
                                <p>Conjunto de documentos: {validationResult.completeness ? 'Completo' : 'Incompleto ou Inválido'}.</p>
                                {validationResult.missingDocuments && validationResult.missingDocuments.length > 0 && (
                                <p>Documentos faltantes identificados: {validationResult.missingDocuments.join(', ')}</p>
                                )}
                                <p className="mt-2 font-medium">Status de Validade por Arquivo:</p>
                                <ul className="list-disc list-inside">
                                {validationResult.validityDetails.map((detail) => (
                                    <li key={detail.documentName}>{detail.documentName}: {detail.isValid ? 'Válido' : 'Inválido/Problema'} {detail.reasoning ? `(${detail.reasoning})` : ''}</li>
                                ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>
                <CardFooter>
                    <Button onClick={handleValidateDocuments} disabled={isValidating || uploadedFiles.length === 0 || !bidCriteria.trim()}>
                       {isValidating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</> : 'Validar com IA'}
                    </Button>
                </CardFooter>
            </Card>

            {/* Bid Result Section */}
            {['AGUARDANDO_DISPUTA', 'EM_HOMOLOGACAO', 'AGUARDANDO_RECURSO', 'EM_PRAZO_CONTRARRAZAO', 'PROCESSO_HOMOLOGADO'].includes(status) && (
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
                        type="text" // Use text for currency formatting
                        placeholder="R$ 0,00"
                        value={valorPrimeiroColocado !== undefined ? valorPrimeiroColocado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                        onChange={(e) => {
                             const rawValue = e.target.value.replace(/\D/g, '');
                             const num = parseInt(rawValue, 10) / 100;
                             setValorPrimeiroColocado(isNaN(num) ? undefined : num);
                         }}
                        disabled={isSavingBidResult}
                      />
                    </div>
                    <Button onClick={handleSaveBidResult} disabled={isSavingBidResult}>
                       {isSavingBidResult ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Salvar'}
                    </Button>
                  </div>
                   {bidDifference && (
                     <Alert variant="info">
                        <HelpCircle className="h-4 w-4"/>
                       <AlertTitle>Diferença de Lances</AlertTitle>
                       <AlertDescription>
                         Seu lance foi <strong>{bidDifference.absolute} ({bidDifference.percentage})</strong> {parseFloat(bidDifference.absolute.replace(/[R$\s.]/g, '').replace(',', '.')) > 0 ? 'acima' : 'abaixo'} do primeiro colocado.
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
                 <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"> {/* Scrollable content */}
                    {licitacao.comentarios && licitacao.comentarios.length > 0 ? (
                        licitacao.comentarios.map(comment => (
                            <div key={comment.id} className="text-sm border-b pb-2 mb-2">
                                <p className="font-medium">{comment.autor} <span className="text-xs text-muted-foreground">em {format(comment.data, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></p>
                                <p>{comment.texto}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhum comentário adicionado ainda.</p>
                    )}
                 </CardContent>
                 <CardFooter className="flex flex-col items-stretch gap-2 pt-4 border-t">
                    <Textarea
                        placeholder="Digite seu comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isAddingComment}
                        className="min-h-[60px]"
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
