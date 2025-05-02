
'use client'; // Required for state and client-side interaction

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Download, FileText, Filter, Loader2, Send, CheckCircle, Clock} from 'lucide-react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import autoTable plugin
import {useToast} from '@/hooks/use-toast';
import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form'; // Import settings type


// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}


// --- Mock Data and Types ---
interface Debito {
  id: string; // Usually Licitacao ID or a specific debit ID
  licitacaoNumero: string;
  clienteNome: string;
  clienteCnpj: string; // For invoice
  valor: number;
  dataHomologacao: Date;
  status: 'PENDENTE' | 'PAGO' | 'ENVIADO_FINANCEIRO';
}

// Mock fetch function (replace with actual API call)
const fetchDebitos = async (): Promise<Debito[]> => {
  console.log('Fetching debitos...');
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
  return [
    {
      id: 'LIC-003',
      licitacaoNumero: 'PE 456/2024',
      clienteNome: 'Comércio Varejista XYZ EIRELI',
      clienteCnpj: '22.222.222/0001-22',
      valor: 850.00,
      dataHomologacao: new Date(2024, 7, 10), // Example homologation date
      status: 'PENDENTE',
    },
     {
      id: 'LIC-005', // Example
      licitacaoNumero: 'PE 789/2024',
      clienteNome: 'Empresa Exemplo Ltda',
      clienteCnpj: '00.000.000/0001-00',
      valor: 1500.00,
      dataHomologacao: new Date(2024, 7, 12),
      status: 'PENDENTE',
    },
    {
      id: 'LIC-001', // Corresponds to an older, processed one
      licitacaoNumero: 'PE 123/2024',
      clienteNome: 'Empresa Exemplo Ltda',
      clienteCnpj: '00.000.000/0001-00',
      valor: 500.00,
      dataHomologacao: new Date(2024, 6, 28),
      status: 'PAGO',
    },
     {
      id: 'LIC-002',
      licitacaoNumero: 'TP 005/2024',
      clienteNome: 'Soluções Inovadoras S.A.',
      clienteCnpj: '11.111.111/0001-11',
      valor: 1200.50,
      dataHomologacao: new Date(2024, 7, 5),
      status: 'ENVIADO_FINANCEIRO',
    },
  ];
};

// Mock update function
const updateDebitoStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO'): Promise<boolean> => {
   console.log(`Updating debito ID: ${id} to status: ${newStatus}`);
   await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
   return true; // Simulate success
}

// Mock function to fetch company settings (reuse logic from configuracoes/page.tsx)
const fetchConfiguracoesEmpresa = async (): Promise<ConfiguracoesFormValues | null> => {
    console.log('Fetching company configurations for PDF...');
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate small delay
    const storedConfig = localStorage.getItem('configuracoesEmpresa');
    if (storedConfig) {
        try {
            return JSON.parse(storedConfig);
        } catch (e) {
            console.error("Error parsing stored config:", e);
            return null;
        }
    }
    // Return default/empty if not found
    return {
        razaoSocial: 'Licitax Advisor (Nome Padrão)',
        cnpj: '00.000.000/0001-00',
        email: 'contato@licitax.com',
        telefone: '(XX) XXXXX-XXXX',
        enderecoCep: '00000-000',
        enderecoRua: 'Rua Padrão',
        enderecoNumero: 'S/N',
        enderecoBairro: 'Centro',
        enderecoCidade: 'Cidade Padrão',
        banco: 'Banco Exemplo',
        agencia: '0001',
        conta: '12345-6',
        chavePix: 'seu-pix@exemplo.com',
    };
};


const statusFinanceiroMap: {[key: string]: {label: string; color: string; icon: React.ElementType}} = {
  PENDENTE: {label: 'Pendente', color: 'warning', icon: Clock},
  PAGO: {label: 'Pago (Baixado)', color: 'success', icon: CheckCircle},
  ENVIADO_FINANCEIRO: {label: 'Enviado Financeiro', color: 'info', icon: Send},
};

const getBadgeVariantFinanceiro = (color: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
   switch (color) {
      case 'success': return 'default'; // Using primary for success
      case 'warning': return 'destructive'; // Using destructive for pending
      case 'info': return 'secondary';
      default: return 'outline';
   }
}


// --- Component ---
export default function FinanceiroPage() {
  const [debitos, setDebitos] = useState<Debito[]>([]);
  const [filteredDebitos, setFilteredDebitos] = useState<Debito[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'processados'>('pendentes');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterLicitacao, setFilterLicitacao] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<{[key: string]: boolean}>({}); // Track loading state per item
  const {toast} = useToast();


  // Fetch data on mount (Debits and Config)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setLoadingConfig(true);
      try {
        const [debitosData, configData] = await Promise.all([
           fetchDebitos(),
           fetchConfiguracoesEmpresa()
        ]);
        setDebitos(debitosData);
        setConfiguracoes(configData);
      } catch (err) {
        console.error('Erro ao carregar dados financeiros ou configurações:', err);
        toast({ title: "Erro", description: "Falha ao carregar dados financeiros ou configurações.", variant: "destructive" });
      } finally {
        setLoading(false);
        setLoadingConfig(false);
      }
    };
    loadInitialData();
  }, [toast]); // Added toast to dependencies


   // Filter logic
  useEffect(() => {
    let result = debitos;

    if (activeTab === 'pendentes') {
      result = result.filter(d => d.status === 'PENDENTE');
    } else { // processados
      result = result.filter(d => d.status === 'PAGO' || d.status === 'ENVIADO_FINANCEIRO');
    }

    if (filterCliente) {
       result = result.filter(d =>
        d.clienteNome.toLowerCase().includes(filterCliente.toLowerCase()) ||
        d.clienteCnpj.includes(filterCliente) // Allow filtering by CNPJ as well
      );
    }
     if (filterLicitacao) {
       result = result.filter(d =>
        d.licitacaoNumero.toLowerCase().includes(filterLicitacao.toLowerCase()) ||
        d.id.toLowerCase().includes(filterLicitacao.toLowerCase()) // Allow filtering by protocol ID
      );
    }

    setFilteredDebitos(result);
  }, [debitos, activeTab, filterCliente, filterLicitacao]);


  const handleUpdateStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO') => {
     setUpdatingStatus(prev => ({ ...prev, [id]: true }));
     const success = await updateDebitoStatus(id, newStatus);
     if (success) {
        setDebitos(prevDebitos => prevDebitos.map(d => d.id === id ? { ...d, status: newStatus } : d));
        toast({ title: "Sucesso", description: `Débito ${id} atualizado para ${statusFinanceiroMap[newStatus].label}.` });
     } else {
         toast({ title: "Erro", description: `Falha ao atualizar status do débito ${id}.`, variant: "destructive" });
     }
      setUpdatingStatus(prev => ({ ...prev, [id]: false }));
  }

   // --- PDF Generation ---

   const checkConfig = (): boolean => {
      if (!configuracoes) {
           toast({title: "Aviso", description: "Configurações da assessoria não carregadas. Verifique a página de Configurações.", variant: "destructive"});
           return false;
      }
      return true;
   }

   // Generate individual invoice
   const generateInvoicePDF = (debito: Debito) => {
    if (!checkConfig()) return;

    const doc = new jsPDF();
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const config = configuracoes!; // Use loaded config

    // Header - Advisory Info
    doc.setFontSize(18);
    doc.text(config.nomeFantasia || config.razaoSocial, 14, 22);
    doc.setFontSize(10);
    doc.text(`CNPJ: ${config.cnpj}`, 14, 28);
     // Add advisory address if needed
     // doc.text(`${config.enderecoRua}, ${config.enderecoNumero} - ${config.enderecoBairro}`, 14, 34);
     // doc.text(`${config.enderecoCidade} - CEP: ${config.enderecoCep}`, 14, 40);
     doc.text(`Contato: ${config.email} / ${config.telefone}`, 14, 34);

     doc.setFontSize(14);
     doc.setFont(undefined, 'bold');
     doc.text("FATURA DE SERVIÇOS", 196, 22, { align: 'right' });
     doc.setFont(undefined, 'normal');
     doc.setFontSize(10);
     doc.text(`Data de Emissão: ${hoje}`, 196, 28, { align: 'right' });


    doc.line(14, 45, 196, 45); // Separator line

    // Client Info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Cliente:", 14, 55);
    doc.setFont(undefined, 'normal');
    doc.text(`Razão Social: ${debito.clienteNome}`, 14, 62);
    doc.text(`CNPJ: ${debito.clienteCnpj}`, 14, 69);
    // Add client address here if available/needed

    doc.line(14, 78, 196, 78); // Separator line

    // Debit Details
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Detalhes do Serviço Prestado:", 14, 88);
     doc.setFont(undefined, 'normal');
     (doc as any).autoTable({ // Use autoTable for better structure
        startY: 93,
        head: [['Referência', 'Descrição', 'Data Homologação', 'Valor']],
        body: [
            [
             debito.id,
             `Serviços de Assessoria - Licitação ${debito.licitacaoNumero}`,
             format(debito.dataHomologacao, "dd/MM/yyyy", { locale: ptBR }),
             debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [26, 35, 126] }, // Dark blue header (#1A237E) - TODO: Use theme colors
        margin: { left: 14, right: 14 },
        tableWidth: 'auto', // Adjust table width automatically
    });


    // Total
    const finalY = (doc as any).lastAutoTable.finalY; // Get Y position after table
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Valor Total: ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 15);

     // Payment Info (Using config)
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Informações para Pagamento:", 14, finalY + 25);
     if (config.banco && config.agencia && config.conta) {
        doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, 14, finalY + 30);
     }
     if (config.chavePix) {
        doc.text(`Chave PIX (${config.cnpj ? 'CNPJ' : 'geral'}): ${config.chavePix}`, 14, finalY + (config.banco ? 35 : 30));
     } else if (config.cnpj) {
         // Fallback to CNPJ if PIX key not set but CNPJ exists
         doc.text(`PIX (CNPJ): ${config.cnpj}`, 14, finalY + (config.banco ? 35 : 30));
     }
     // Add due date logic if needed
    doc.text("Vencimento: [Definir Data de Vencimento]", 14, finalY + (config.banco ? 40 : 35));


    // Footer (Optional)
    doc.line(14, doc.internal.pageSize.height - 20, 196, doc.internal.pageSize.height - 20);
    doc.text(`${config.razaoSocial} - Agradecemos a sua preferência!`, 14, doc.internal.pageSize.height - 15);


    doc.save(`Fatura_${debito.clienteNome.replace(/\s+/g, '_')}_${debito.id}.pdf`);
  };


   // Generate report for pending debits
   const generatePendingReportPDF = () => {
    if (!checkConfig()) return;
    const config = configuracoes!;

    const doc = new jsPDF();
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const pendingDebits = filteredDebitos.filter(d => d.status === 'PENDENTE'); // Ensure we only get pending ones

     // Header
    doc.setFontSize(16);
    doc.text("Relatório de Pendências Financeiras", 14, 22);
     doc.setFontSize(12);
     doc.text(config.razaoSocial, 14, 28);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${hoje}`, 14, 34);
    doc.line(14, 40, 196, 40);

     // Table
    (doc as any).autoTable({
        startY: 45,
        head: [['Protocolo', 'Cliente', 'CNPJ', 'Licitação', 'Data Homolog.', 'Valor Pendente']],
        body: pendingDebits.map(d => [
             d.id,
             d.clienteNome,
             d.clienteCnpj,
             d.licitacaoNumero,
             format(d.dataHomologacao, "dd/MM/yyyy", { locale: ptBR }),
             d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]),
        theme: 'striped',
        headStyles: { fillColor: [26, 35, 126] }, // Dark blue header
        margin: { left: 14, right: 14 },
    });

     // Total Pending
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalPendente = pendingDebits.reduce((sum, d) => sum + d.valor, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Pendente: ${totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 15);


    doc.save(`Relatorio_Pendencias_${hoje.replace(/\//g, '-')}.pdf`);
   }

    // Generate collection document per client
   const generateCollectionPDF = (clienteNome: string) => {
      if (!checkConfig()) return;
      const config = configuracoes!;

      const clientDebits = filteredDebitos.filter(d => d.clienteNome === clienteNome && d.status === 'PENDENTE');
      if (clientDebits.length === 0) {
         toast({title: "Aviso", description: `Nenhuma pendência encontrada para ${clienteNome}.`});
         return;
      }

      const doc = new jsPDF();
      const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
      const firstDebit = clientDebits[0]; // Get info from the first debit of this client

       // Header
      doc.setFontSize(16);
      doc.text(`Documento de Cobrança`, 14, 22);
      doc.setFontSize(12);
       doc.text(`De: ${config.razaoSocial} (CNPJ: ${config.cnpj})`, 14, 30);
       doc.text(`Para: ${firstDebit.clienteNome} (CNPJ: ${firstDebit.clienteCnpj})`, 14, 36);
       doc.setFontSize(10);
       doc.text(`Data de Emissão: ${hoje}`, 14, 42);
       doc.line(14, 50, 196, 50);

      // Introduction Text (Example)
      doc.setFontSize(11);
      doc.text("Prezados,", 14, 60);
      doc.text(`Constam em aberto os seguintes débitos referentes aos serviços de assessoria em licitações prestados pela ${config.razaoSocial}:`, 14, 67, { maxWidth: 180 });


       // Table of Debits
      (doc as any).autoTable({
         startY: 75,
         head: [['Protocolo', 'Licitação', 'Data Homologação', 'Valor']],
         body: clientDebits.map(d => [
             d.id,
             d.licitacaoNumero,
             format(d.dataHomologacao, "dd/MM/yyyy", { locale: ptBR }),
             d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
         ]),
         theme: 'grid',
         headStyles: { fillColor: [26, 35, 126] },
         margin: { left: 14, right: 14 },
     });

      // Total and Payment Info
     const finalY = (doc as any).lastAutoTable.finalY;
     const totalCliente = clientDebits.reduce((sum, d) => sum + d.valor, 0);
     doc.setFontSize(12);
     doc.setFont(undefined, 'bold');
     doc.text(`Valor Total Devido: ${totalCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 15);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Solicitamos a regularização dos valores pendentes. Informações para pagamento:", 14, finalY + 25);
       if (config.banco && config.agencia && config.conta) {
          doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, 14, finalY + 30);
       }
       if (config.chavePix) {
          doc.text(`Chave PIX (${config.cnpj ? 'CNPJ' : 'geral'}): ${config.chavePix}`, 14, finalY + (config.banco ? 35 : 30));
       } else if (config.cnpj) {
           doc.text(`PIX (CNPJ): ${config.cnpj}`, 14, finalY + (config.banco ? 35 : 30));
       }
      doc.text(`Em caso de dúvidas, contate-nos através de ${config.email} ou ${config.telefone}.`, 14, finalY + (config.banco || config.chavePix ? 45 : 35));


     // Footer (Optional)
     doc.line(14, doc.internal.pageSize.height - 20, 196, doc.internal.pageSize.height - 20);
     doc.text(config.razaoSocial, 14, doc.internal.pageSize.height - 15);


      doc.save(`Cobranca_${firstDebit.clienteNome.replace(/\s+/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`);
   }

   // Get unique client names with pending debits for the dropdown
   const clientsWithPendingDebits = Array.from(new Set(debitos.filter(d => d.status === 'PENDENTE').map(d => d.clienteNome)));


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Módulo Financeiro</h2>

        {/* Filter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
                placeholder="Filtrar por Cliente ou CNPJ..."
                value={filterCliente}
                onChange={(e) => setFilterCliente(e.target.value)}
            />
             <Input
                placeholder="Filtrar por Licitação ou Protocolo..."
                value={filterLicitacao}
                onChange={(e) => setFilterLicitacao(e.target.value)}
            />
            {/* Date filter could be added here */}
             {/* <Button variant="outline" onClick={applyFilters}>Aplicar Filtros</Button> // Filtering is now real-time */}
          </div>
        </CardContent>
      </Card>


      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="processados">Processados</TabsTrigger>
          </TabsList>
          {activeTab === 'pendentes' && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={generatePendingReportPDF} disabled={loading || loadingConfig || filteredDebitos.filter(d => d.status === 'PENDENTE').length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Relatório Pendências (PDF)
              </Button>
               <Select onValueChange={generateCollectionPDF} disabled={loading || loadingConfig || clientsWithPendingDebits.length === 0}>
                 <SelectTrigger className="w-full sm:w-[280px]"> {/* Adjusted width */}
                   <SelectValue placeholder="Gerar Cobrança por Cliente (PDF)" />
                 </SelectTrigger>
                 <SelectContent>
                    {loadingConfig ? (
                      <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                    ) : clientsWithPendingDebits.length > 0 ? (
                       clientsWithPendingDebits.map(cliente => (
                         <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                       ))
                    ) : (
                         <SelectItem value="no-clients" disabled>Nenhum cliente com pendências</SelectItem>
                    )}
                 </SelectContent>
               </Select>
            </div>
          )}
        </div>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Débitos Pendentes</CardTitle>
              <CardDescription>Licitações homologadas aguardando ação.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTable
                 debitos={filteredDebitos}
                 loading={loading}
                 updatingStatus={updatingStatus}
                 onUpdateStatus={handleUpdateStatus}
                 onGenerateInvoice={generateInvoicePDF}
                 showActions={true}
                 actionsDisabled={loadingConfig} // Disable actions while config loads
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processados">
          <Card>
            <CardHeader>
              <CardTitle>Débitos Processados</CardTitle>
              <CardDescription>Histórico de pagamentos baixados ou enviados.</CardDescription>
            </CardHeader>
            <CardContent>
               <FinancialTable
                 debitos={filteredDebitos}
                 loading={loading}
                 updatingStatus={{}} // No actions needed here
                 onUpdateStatus={() => {}}
                 onGenerateInvoice={generateInvoicePDF} // Still allow generating past invoices
                 showActions={false} // Hide status update buttons
                 actionsDisabled={loadingConfig} // Disable invoice generation if config not loaded
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


// --- Reusable Table Component ---
interface FinancialTableProps {
   debitos: Debito[];
   loading: boolean;
   updatingStatus: { [key: string]: boolean };
   onUpdateStatus: (id: string, status: 'PAGO' | 'ENVIADO_FINANCEIRO') => void;
   onGenerateInvoice: (debito: Debito) => void;
   showActions: boolean;
   actionsDisabled?: boolean; // Added prop to disable actions based on config loading
}

function FinancialTable({ debitos, loading, updatingStatus, onUpdateStatus, onGenerateInvoice, showActions, actionsDisabled = false }: FinancialTableProps) {
   return (
       <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Licitação</TableHead>
                <TableHead>Data Homolog.</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                     <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : debitos.length > 0 ? (
                debitos.map(debito => {
                   const isLoading = updatingStatus[debito.id];
                   const statusInfo = statusFinanceiroMap[debito.status];
                   return (
                      <TableRow key={debito.id}>
                        <TableCell className="font-medium">{debito.id}</TableCell>
                        <TableCell>{debito.clienteNome}</TableCell>
                        <TableCell>{debito.licitacaoNumero}</TableCell>
                        <TableCell>{format(debito.dataHomologacao, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariantFinanceiro(statusInfo.color)} className="flex items-center gap-1 w-fit">
                            <statusInfo.icon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="sm" onClick={() => onGenerateInvoice(debito)} title="Gerar Fatura PDF" disabled={actionsDisabled}>
                             {actionsDisabled ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4" />}
                            {/* <span className="ml-1 hidden sm:inline">Fatura</span> */}
                          </Button>
                          {showActions && debito.status === 'PENDENTE' && (
                            <>
                              <Button variant="default" size="sm" onClick={() => onUpdateStatus(debito.id, 'PAGO')} disabled={isLoading || actionsDisabled} title="Marcar como Pago (Baixar)">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                {/* <span className="ml-1 hidden sm:inline">Baixar</span> */}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(debito.id, 'ENVIADO_FINANCEIRO')} disabled={isLoading || actionsDisabled} title="Enviar para Financeiro Externo">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {/* <span className="ml-1 hidden sm:inline">Enviar</span> */}
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                   );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum débito encontrado para esta visualização.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
   );
}
