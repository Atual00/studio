
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LicitacaoForm, { type LicitacaoFormValues } from '@/components/licitacoes/licitacao-form';
import { addLicitacao, type LicitacaoDetails } from '@/services/licitacaoService';
import { fetchClients as fetchClientList, type ClientListItem } from '@/services/clientService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { format, parseISO, isValid } from 'date-fns'; // Added parseISO, isValid
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';


const generateConfirmationPDF = (
    licitacao: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    currentUser: { username: string; fullName?: string; cpf?: string } | null
) => {
  const doc = new jsPDF();
  const hoje = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const logoUrl = config?.logoUrl;
  const logoDim = 25;
  const margin = 14;
  let headerY = 22;

  if (logoUrl) {
      try {
          const img = new Image();
          img.src = logoUrl;
          const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          if (imageType === "PNG" || imageType === "JPEG") {
              doc.addImage(img, imageType, margin, 15, logoDim, logoDim);
              headerY = 18 + logoDim;
          } else {
              console.warn("Formato do logo não suportado pelo jsPDF, pulando logo.");
          }
      } catch (e) {
          console.error("Erro ao adicionar logo ao PDF:", e);
      }
  }

  doc.setFontSize(16);
  doc.text("Confirmação de Recebimento de Licitação", 105, headerY, { align: 'center' });
  headerY += 8;

  if (config) {
    doc.setFontSize(11);
    doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, margin, headerY);
    headerY += 6;
  }
  doc.setFontSize(10);
  doc.text(`Data de Recebimento: ${hoje}`, margin, headerY);
  headerY += 8;

  doc.setLineWidth(0.1);
  doc.line(margin, headerY, 196, headerY);
  headerY += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("Detalhes da Licitação Recebida:", margin, headerY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);

  let currentY = headerY + 7;
  const lineHeight = 7;
  const fieldX = margin;
  const valueX = 60; // Adjusted for potentially longer labels

  const addDetail = (label: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null) {
         doc.text(`${label}:`, fieldX, currentY);
         doc.text(String(value), valueX, currentY, { maxWidth: 196 - valueX - margin }); // Add maxWidth for long values
         currentY += lineHeight;
      }
  }

  const safeFormatDate = (dateInput: Date | string | undefined | null, includeTime = false): string => {
    if (!dateInput) return 'N/A';
    try {
      const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      if (!(dateObj instanceof Date) || !isValid(dateObj)) return 'Data Inválida';
      const formatString = includeTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
      return format(dateObj, formatString, { locale: ptBR });
    } catch (e) { return 'Data Inválida'; }
  };


  addDetail('Protocolo', licitacao.id);
  addDetail('Cliente', licitacao.clienteNome);
  addDetail('Número Lic.', licitacao.numeroLicitacao);
  addDetail('Órgão Comprador', licitacao.orgaoComprador);
  addDetail('Modalidade', licitacao.modalidade);
  addDetail('Plataforma', licitacao.plataforma);
  addDetail('Data Início', safeFormatDate(licitacao.dataInicio, true));
  addDetail('Meta Análise', safeFormatDate(licitacao.dataMetaAnalise));
  addDetail('Valor Cobrado (Assessoria)', (licitacao.valorCobrado ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  // Valor Total (Licitação) REMOVED
  if(licitacao.propostaItensPdfNome){
    addDetail('PDF Itens Proposta', licitacao.propostaItensPdfNome);
  }
  addDetail('Status Inicial', 'Aguardando Análise');

  currentY += lineHeight;

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
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);

   useEffect(() => {
    const loadRequiredData = async () => {
      setLoadingData(true);
      setErrorLoadingData(null);
      try {
        const [clientData, configData] = await Promise.all([
          fetchClientList(),
          fetchConfiguracoes()
        ]);
        setClients(clientData || []);
        setConfiguracoes(configData);
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
      const newLicitacao = await addLicitacao(data, currentUser);
      if (newLicitacao) {
        toast({
          title: 'Sucesso!',
          description: `Licitação ${newLicitacao.numeroLicitacao} (${newLicitacao.id}) cadastrada. Gerando confirmação...`,
        });
        try {
          generateConfirmationPDF(newLicitacao, configuracoes, currentUser);
        } catch (pdfError) {
           console.error("Erro ao gerar PDF de confirmação:", pdfError);
           toast({ title: "Aviso", description: "Licitação salva, mas houve um erro ao gerar o PDF de confirmação.", variant: "warning" });
        }
        router.push(`/licitacoes/${newLicitacao.id}`);
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
       setIsSubmitting(false);
    }
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
           ): clients.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Cliente Encontrado</AlertTitle>
                <AlertDescription>
                   Você precisa cadastrar pelo menos um cliente antes de criar uma licitação.
                   <Link href="/clientes/novo" className="text-primary hover:underline ml-1">Cadastrar Cliente</Link>
                </AlertDescription>
              </Alert>
            ) : (
            <LicitacaoForm clients={clients} onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
