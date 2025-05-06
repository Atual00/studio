

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LicitacaoForm, { type LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { addLicitacao, type LicitacaoDetails } from '@/services/licitacaoService'; // Import actual service and type
import { fetchClients as fetchClientList, type ClientListItem } from '@/services/clientService'; // Import client fetching
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService'; // Import config fetching
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link'; // Import Link
import jsPDF from 'jspdf'; // Import jsPDF
import { format } from 'date-fns'; // Import date-fns for formatting
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get current user


/**
 * Generates a confirmation PDF for a newly added bid.
 * Includes logo and user signature details.
 * @param licitacao The details of the newly added bid.
 * @param config The advisory company's configuration details.
 * @param currentUser The currently logged-in user.
 */
const generateConfirmationPDF = (
    licitacao: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    currentUser: { username: string; fullName?: string; cpf?: string } | null
) => {
  const doc = new jsPDF();
  const hoje = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const logoUrl = config?.logoUrl;
  const logoDim = 25; // Logo dimension
  const margin = 14;
  let headerY = 22; // Initial Y position for header text

  // Draw Header with Logo if available
  if (logoUrl) {
      try {
          const img = new Image();
          img.src = logoUrl;
          // Determine image type
          const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          if (imageType === "PNG" || imageType === "JPEG") {
              // Adjust logo position and size as needed
              doc.addImage(img, imageType, margin, 15, logoDim, logoDim);
              headerY = 18 + logoDim; // Adjust text start below logo
          } else {
              console.warn("Formato do logo não suportado pelo jsPDF, pulando logo.");
          }
      } catch (e) {
          console.error("Erro ao adicionar logo ao PDF:", e);
      }
  }

  // Confirmation Title
  doc.setFontSize(16);
  doc.text("Confirmação de Recebimento de Licitação", 105, headerY, { align: 'center' });
  headerY += 8;

  // Advisory Info (if available)
  if (config) {
    doc.setFontSize(11);
    doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, margin, headerY);
    headerY += 6;
  }
  // Receipt Date
  doc.setFontSize(10);
  doc.text(`Data de Recebimento: ${hoje}`, margin, headerY);
  headerY += 8;

  // Separator Line
  doc.setLineWidth(0.1);
  doc.line(margin, headerY, 196, headerY);
  headerY += 8;


  // Licitacao Details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("Detalhes da Licitação Recebida:", margin, headerY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);

  let currentY = headerY + 7; // Start details below title
  const lineHeight = 7;
  const fieldX = margin;
  const valueX = 50;

  // Helper to add detail lines
  const addDetail = (label: string, value: string | undefined | null) => {
      if (value !== undefined && value !== null) {
         doc.text(`${label}:`, fieldX, currentY);
         doc.text(value.toString(), valueX, currentY);
         currentY += lineHeight;
      }
  }

  addDetail('Protocolo', licitacao.id);
  addDetail('Cliente', licitacao.clienteNome);
  addDetail('Número Lic.', licitacao.numeroLicitacao);
  addDetail('Órgão Comprador', licitacao.orgaoComprador);
  addDetail('Modalidade', licitacao.modalidade);
  addDetail('Plataforma', licitacao.plataforma);

  // Safely format dates
  const formatDate = (date: Date | string | undefined | null, time = false): string => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date; // Assuming ISO string if string
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'Data Inválida';
      const formatString = time ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
      return format(dateObj, formatString, { locale: ptBR });
    } catch (e) { return 'Data Inválida'; }
  };

  addDetail('Data Início', formatDate(licitacao.dataInicio, true));
  addDetail('Meta Análise', formatDate(licitacao.dataMetaAnalise));
  addDetail('Valor Cobrado (Assessoria)', (licitacao.valorCobrado ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  addDetail('Valor Total (Licitação)', (licitacao.valorTotalLicitacao ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  addDetail('Status Inicial', 'Aguardando Análise');

  currentY += lineHeight; // Extra space before signature

  // Signature Block
  doc.setFontSize(10);
  doc.text("Esta licitação foi recebida pelo sistema e será analisada pela equipe.", margin, currentY, { maxWidth: 180 });
  currentY += 10;
  doc.text(`Documento gerado e assinado automaticamente por:`, margin, currentY);
  currentY += 6;
  doc.setFont(undefined, 'bold');
  doc.text(`${currentUser?.fullName || currentUser?.username || 'Usuário Desconhecido'}`, margin, currentY);
  currentY += 6;
  doc.setFont(undefined, 'normal');
  if (currentUser?.cpf) {
      doc.text(`CPF: ${currentUser.cpf}`, margin, currentY);
      currentY += 6;
  }
  doc.text(`Em: ${hoje}`, margin, currentY);


  // Footer (Optional)
  if (config) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setLineWidth(0.1);
    doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
    doc.setFontSize(9);
    doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });
  }

  doc.save(`Confirmacao_${licitacao.id}.pdf`);
}



export default function NovaLicitacaoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get current user from auth context
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [loadingData, setLoadingData] = useState(true); // Combined loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);

   // Fetch clients and configurations on mount
   useEffect(() => {
    const loadRequiredData = async () => {
      setLoadingData(true);
      setErrorLoadingData(null);
      try {
        const [clientData, configData] = await Promise.all([
          fetchClientList(),
          fetchConfiguracoes()
        ]);
        setClients(clientData || []); // Ensure clients is always an array
        setConfiguracoes(configData); // Store configurations
      } catch (err) {
        console.error("Erro ao carregar dados para nova licitação:", err);
        const errorMsg = `Falha ao carregar dados necessários (Clientes ou Configurações). ${err instanceof Error ? err.message : ''}`;
        setErrorLoadingData(errorMsg);
        toast({ title: "Erro de Carregamento", description: errorMsg, variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };
    loadRequiredData();
  }, [toast]);


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    setIsSubmitting(true);
    try {
      // Add the current user info to the licitacao data before saving (if needed backend-side)
      // Or just use it for the PDF generation as done below.
      const newLicitacao = await addLicitacao(data, currentUser); // Pass user if needed by service
      if (newLicitacao) {
        toast({
          title: 'Sucesso!',
          description: `Licitação ${newLicitacao.numeroLicitacao} (${newLicitacao.id}) cadastrada. Gerando confirmação...`,
        });

        // Generate PDF after successful save
        try {
          generateConfirmationPDF(newLicitacao, configuracoes, currentUser); // Pass currentUser
        } catch (pdfError) {
           console.error("Erro ao gerar PDF de confirmação:", pdfError);
           toast({ title: "Aviso", description: "Licitação salva, mas houve um erro ao gerar o PDF de confirmação.", variant: "warning" });
        }

        router.push(`/licitacoes/${newLicitacao.id}`); // Redirect after PDF attempt
      } else {
         throw new Error('Falha ao obter dados da licitação após adição.');
      }
    } catch (error) {
      console.error('Erro ao salvar nova licitação:', error);
      toast({
        title: 'Erro ao Salvar',
        description: `Não foi possível cadastrar a licitação. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
       setIsSubmitting(false); // Ensure submitting state is reset on error
    }
    // No need to set isSubmitting false on success due to redirect
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Nova Licitação</h2>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Licitação</CardTitle>
          <CardDescription>Preencha as informações abaixo para cadastrar uma nova licitação.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
             <div className="flex justify-center items-center h-24">
               <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <p className="ml-2">Carregando dados...</p>
             </div>
          ) : errorLoadingData ? (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Dados</AlertTitle>
               <AlertDescription>{errorLoadingData}</AlertDescription>
             </Alert>
           ) : isSubmitting ? (
             <div className="flex justify-center items-center h-40">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="ml-2">Salvando licitação...</p>
             </div>
           ): clients.length === 0 ? ( // Check if clients list is empty after loading
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Cliente Encontrado</AlertTitle>
                <AlertDescription>
                   Você precisa cadastrar pelo menos um cliente antes de criar uma licitação.
                   <Link href="/clientes/novo" className="text-primary hover:underline ml-1">Cadastrar Cliente</Link>
                </AlertDescription>
              </Alert>
            ) : (
            // Pass the fetched clients (guaranteed to be an array)
            <LicitacaoForm clients={clients} onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
