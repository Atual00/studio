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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'processados'>('pendentes');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterLicitacao, setFilterLicitacao] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<{[key: string]: boolean}>({}); // Track loading state per item
  const {toast} = useToast();


  // Fetch data on mount
  useEffect(() => {
    const loadDebitos = async () => {
      setLoading(true);
      try {
        const data = await fetchDebitos();
        setDebitos(data);
      } catch (err) {
        console.error('Erro ao buscar débitos:', err);
        toast({ title: "Erro", description: "Falha ao carregar dados financeiros.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadDebitos();
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

   // Generate individual invoice
   const generateInvoicePDF = (debito: Debito) => {
    const doc = new jsPDF();
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

    // Header
    doc.setFontSize(18);
    doc.text("FATURA DE SERVIÇOS - LICITAX ADVISOR", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${hoje}`, 14, 30);
    doc.line(14, 35, 196, 35); // Separator line

    // Client Info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Cliente:", 14, 45);
    doc.setFont(undefined, 'normal');
    doc.text(`Razão Social: ${debito.clienteNome}`, 14, 52);
    doc.text(`CNPJ: ${debito.clienteCnpj}`, 14, 59);
    // Add client address here if available/needed

    doc.line(14, 68, 196, 68); // Separator line

    // Debit Details
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Detalhes do Débito:", 14, 78);
     doc.setFont(undefined, 'normal');
     (doc as any).autoTable({ // Use autoTable for better structure
        startY: 83,
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
        headStyles: { fillColor: [26, 35, 126] }, // Dark blue header (#1A237E)
        margin: { left: 14, right: 14 },
        tableWidth: 'auto', // Adjust table width automatically
    });


    // Total
    const finalY = (doc as any).lastAutoTable.finalY; // Get Y position after table
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Valor Total: ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 15);

     // Payment Info (Example)
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Informações para Pagamento:", 14, finalY + 25);
    doc.text("Banco: [Seu Banco]", 14, finalY + 30);
    doc.text("Agência: [Sua Agência] / Conta: [Sua Conta]", 14, finalY + 35);
    doc.text("CNPJ/PIX: [Seu CNPJ ou Chave PIX]", 14, finalY + 40);
    doc.text("Vencimento: [Data de Vencimento]", 14, finalY + 45); // Add due date logic if needed


    // Footer (Optional)
    doc.line(14, doc.internal.pageSize.height - 20, 196, doc.internal.pageSize.height - 20);
    doc.text("Licitax Advisor - Agradecemos a sua preferência!", 14, doc.internal.pageSize.height - 15);


    doc.save(`Fatura_${debito.clienteNome.replace(/\s+/g, '_')}_${debito.id}.pdf`);
  };


   // Generate report for pending debits
   const generatePendingReportPDF = () => {
    const doc = new jsPDF();
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const pendingDebits = filteredDebitos.filter(d => d.status === 'PENDENTE'); // Ensure we only get pending ones

     // Header
    doc.setFontSize(16);
    doc.text("Relatório de Pendências Financeiras", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${hoje}`, 14, 30);
    doc.line(14, 35, 196, 35);

     // Table
    (doc as any).autoTable({
        startY: 40,
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
      doc.text(`Documento de Cobrança - ${firstDebit.clienteNome}`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Data de Emissão: ${hoje}`, 14, 30);
      doc.text(`CNPJ: ${firstDebit.clienteCnpj}`, 14, 35);
      doc.line(14, 40, 196, 40);

      // Introduction Text (Example)
      doc.setFontSize(11);
      doc.text("Prezados,", 14, 50);
      doc.text(`Constam em aberto os seguintes débitos referentes aos serviços de assessoria em licitações prestados pela Licitax Advisor:`, 14, 57, { maxWidth: 180 });


       // Table of Debits
      (doc as any).autoTable({
         startY: 65,
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
      doc.text("Banco: [Seu Banco]", 14, finalY + 30);
      doc.text("Agência: [Sua Agência] / Conta: [Sua Conta]", 14, finalY + 35);
      doc.text("CNPJ/PIX: [Seu CNPJ ou Chave PIX]", 14, finalY + 40);
      doc.text("Em caso de dúvidas, entre em contato.", 14, finalY + 50);


     // Footer (Optional)
     doc.line(14, doc.internal.pageSize.height - 20, 196, doc.internal.pageSize.height - 20);
     doc.text("Licitax Advisor", 14, doc.internal.pageSize.height - 15);


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
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="processados">Processados</TabsTrigger>
          </TabsList>
          {activeTab === 'pendentes' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={generatePendingReportPDF} disabled={loading || filteredDebitos.filter(d => d.status === 'PENDENTE').length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Relatório Pendências (PDF)
              </Button>
               <Select onValueChange={generateCollectionPDF} disabled={loading || clientsWithPendingDebits.length === 0}>
                 <SelectTrigger className="w-[250px]">
                   <SelectValue placeholder="Gerar Cobrança por Cliente (PDF)" />
                 </SelectTrigger>
                 <SelectContent>
                   {clientsWithPendingDebits.map(cliente => (
                     <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                   ))}
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
}

function FinancialTable({ debitos, loading, updatingStatus, onUpdateStatus, onGenerateInvoice, showActions }: FinancialTableProps) {
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
                          <Button variant="outline" size="sm" onClick={() => onGenerateInvoice(debito)} title="Gerar Fatura PDF">
                            <FileText className="h-4 w-4" />
                            {/* <span className="ml-1 hidden sm:inline">Fatura</span> */}
                          </Button>
                          {showActions && debito.status === 'PENDENTE' && (
                            <>
                              <Button variant="default" size="sm" onClick={() => onUpdateStatus(debito.id, 'PAGO')} disabled={isLoading} title="Marcar como Pago (Baixar)">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                {/* <span className="ml-1 hidden sm:inline">Baixar</span> */}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(debito.id, 'ENVIADO_FINANCEIRO')} disabled={isLoading} title="Enviar para Financeiro Externo">
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
