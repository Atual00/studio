

'use client'; // Required for state and client-side interaction

import React, { useState, useEffect } from 'react'; // Import React
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover
import { Calendar } from '@/components/ui/calendar'; // Import Calendar
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { type DateRange } from 'react-day-picker'; // Import DateRange type
import { Download, FileText, Filter, Loader2, Send, CheckCircle, Clock, CalendarIcon, X, Receipt, Mail, PlusCircle } from 'lucide-react'; // Import icons + Receipt + Mail
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addMonths, setDate, isValid } from 'date-fns'; // Updated date-fns imports + isValid
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import for autoTable
import { useToast } from '@/hooks/use-toast';
import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form'; // Import settings type
import { fetchDebitos, updateDebitoStatus, type Debito, addDebitoAvulso, type DebitoAvulsoFormData } from '@/services/licitacaoService'; // Import from licitacaoService
import { fetchConfiguracoes } from '@/services/configuracoesService'; // Import config service
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  FormLabel, // Added FormLabel import
} from "@/components/ui/form";
import { fetchClients, type ClientListItem } from '@/services/clientService';


const statusFinanceiroMap: { [key: string]: { label: string; color: string; icon: React.ElementType } } = {
    PENDENTE: { label: 'Pendente', color: 'warning', icon: Clock },
    PAGO: { label: 'Pago (Baixado)', color: 'success', icon: CheckCircle },
    ENVIADO_FINANCEIRO: { label: 'Enviado Financeiro', color: 'info', icon: Send },
};

const getBadgeVariantFinanceiro = (color: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info' | 'accent' => {
    switch (color) {
        case 'success': return 'success'; // Explicit success variant
        case 'warning': return 'warning'; // Explicit warning variant
        case 'info': return 'info';     // Explicit info variant
        case 'accent': return 'accent';   // Accent for others if needed
        default: return 'outline';
    }
}

// Zod Schema for Debito Avulso Form
const debitoAvulsoSchema = z.object({
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório."),
  clienteCnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {message: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX.'}).optional().or(z.literal('')),
  descricao: z.string().min(1, "Descrição é obrigatória."),
  valor: z.preprocess(
    (val) => typeof val === 'string' ? parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) : val,
    z.number({required_error: "Valor é obrigatório."}).min(0.01, "Valor deve ser maior que zero.")
  ),
  dataVencimento: z.date({required_error: "Data de vencimento é obrigatória."}),
});


// --- Component ---
export default function FinanceiroPage() {
    const [allDebitos, setAllDebitos] = useState<Debito[]>([]); // Store all fetched debits
    const [filteredDebitos, setFilteredDebitos] = useState<Debito[]>([]);
    const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [activeTab, setActiveTab] = useState<'pendentes' | 'processados'>('pendentes');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterLicitacao, setFilterLicitacao] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // State for date range filter
    const [updatingStatus, setUpdatingStatus] = useState<{ [key: string]: boolean }>({}); // Track loading state per item
    const [selectedDebitos, setSelectedDebitos] = useState<Set<string>>(new Set()); // State for selected debit IDs
    const [isSendingBatch, setIsSendingBatch] = useState(false); // State for batch send loading
    const [isDebitoAvulsoDialogOpen, setIsDebitoAvulsoDialogOpen] = useState(false);
    const [isSubmittingDebitoAvulso, setIsSubmittingDebitoAvulso] = useState(false);
    const [clients, setClients] = useState<ClientListItem[]>([]); // For Debito Avulso client selection
    const [loadingClients, setLoadingClients] = useState(true);


    const { toast } = useToast();

    const debitoAvulsoForm = useForm<z.infer<typeof debitoAvulsoSchema>>({
        resolver: zodResolver(debitoAvulsoSchema),
        defaultValues: {
            clienteNome: '',
            clienteCnpj: '',
            descricao: '',
            valor: undefined,
            dataVencimento: undefined,
        },
    });


    // Fetch data on mount (Debits and Config)
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setLoadingConfig(true);
            setLoadingClients(true);
            try {
                // Fetch debits generated from licitacoes service
                const [debitosData, configData, clientsData] = await Promise.all([
                    fetchDebitos(),
                    fetchConfiguracoes(), // Use service to fetch configs
                    fetchClients()
                ]);
                setAllDebitos(debitosData); // Store all fetched data
                setFilteredDebitos(debitosData); // Initialize filtered list
                setConfiguracoes(configData);
                setClients(clientsData);
            } catch (err) {
                console.error('Erro ao carregar dados financeiros ou configurações:', err);
                toast({ title: "Erro", description: `Falha ao carregar dados financeiros ou configurações. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
            } finally {
                setLoading(false);
                setLoadingConfig(false);
                setLoadingClients(false);
            }
        };
        loadInitialData();
    }, [toast]); // Added toast to dependencies


    // Filter logic
    useEffect(() => {
        let result = allDebitos; // Start with all debits

        // 1. Filter by Tab (Status)
        if (activeTab === 'pendentes') {
            result = result.filter(d => d.status === 'PENDENTE');
        } else { // processados
            result = result.filter(d => d.status === 'PAGO' || d.status === 'ENVIADO_FINANCEIRO');
        }

        // 2. Filter by Cliente/CNPJ
        if (filterCliente) {
            result = result.filter(d =>
                d.clienteNome.toLowerCase().includes(filterCliente.toLowerCase()) ||
                (d.clienteCnpj && d.clienteCnpj.includes(filterCliente)) // Allow filtering by CNPJ as well
            );
        }

        // 3. Filter by Licitação/Protocolo
        if (filterLicitacao) {
            result = result.filter(d =>
                (d.licitacaoNumero && d.licitacaoNumero.toLowerCase().includes(filterLicitacao.toLowerCase())) ||
                d.id.toLowerCase().includes(filterLicitacao.toLowerCase()) // Allow filtering by protocol ID
            );
        }

        // 4. Filter by Date Range (Data Homologação for Licitacao, Data Referencia for Avulso)
        if (dateRange?.from) {
            const start = startOfDay(dateRange.from);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from); // Use end of 'from' day if 'to' is not set
            result = result.filter(d => {
                try {
                    // Use dataReferencia which covers both homologacao and avulso creation date
                    const refDate = typeof d.dataReferencia === 'string' ? parseISO(d.dataReferencia) : d.dataReferencia;
                    // Ensure refDate is a valid Date before comparison
                    if (!(refDate instanceof Date) || !isValid(refDate)) {
                        console.warn(`Invalid dataReferencia for debit ${d.id}:`, d.dataReferencia);
                        return false;
                    }
                    return isWithinInterval(refDate, { start, end });
                } catch (e) {
                    console.error("Error parsing dataReferencia during filtering:", d.id, e);
                    return false;
                }
            });
        }

        setFilteredDebitos(result);
        // Clear selection when filters change
        setSelectedDebitos(new Set());
    }, [allDebitos, activeTab, filterCliente, filterLicitacao, dateRange]);


    const handleUpdateStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO') => {
        setUpdatingStatus(prev => ({ ...prev, [id]: true }));
        try {
            const success = await updateDebitoStatus(id, newStatus);
            if (success) {
                // Update the main list and let the filter useEffect re-apply
                setAllDebitos(prevDebitos => prevDebitos.map(d => d.id === id ? { ...d, status: newStatus } : d));
                toast({ title: "Sucesso", description: `Débito ${id} atualizado para ${statusFinanceiroMap[newStatus].label}.` });
            } else {
                throw new Error("Falha ao atualizar status no backend.");
            }
        } catch (err) {
            toast({ title: "Erro", description: `Falha ao atualizar status do débito ${id}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [id]: false }));
        }
    }

    // --- Batch Send ---
    const handleSendBatch = async () => {
        if (selectedDebitos.size === 0) {
            toast({ title: "Atenção", description: "Selecione pelo menos um débito para enviar.", variant: "warning" });
            return;
        }
        setIsSendingBatch(true);
        const selectedIds = Array.from(selectedDebitos);
        const debitsToSend = allDebitos.filter(d => selectedIds.includes(d.id));
        const updatedDebitos = [...allDebitos];
        const failedUpdates: string[] = [];

        try {
            await Promise.all(selectedIds.map(async (id) => {
                try {
                    const success = await updateDebitoStatus(id, 'ENVIADO_FINANCEIRO');
                    if (success) {
                        const index = updatedDebitos.findIndex(d => d.id === id);
                        if (index !== -1) {
                            updatedDebitos[index] = { ...updatedDebitos[index], status: 'ENVIADO_FINANCEIRO' };
                        }
                    } else {
                        failedUpdates.push(id);
                    }
                } catch (err) {
                    console.error(`Error updating status for debit ${id} in batch:`, err);
                    failedUpdates.push(id);
                }
            }));

            setAllDebitos(updatedDebitos); // Update the main list
            setSelectedDebitos(new Set()); // Clear selection

            if (failedUpdates.length > 0) {
                 toast({ title: "Erro Parcial", description: `Falha ao enviar ${failedUpdates.length} débito(s): ${failedUpdates.join(', ')}`, variant: "destructive" });
            } else {
                toast({ title: "Sucesso", description: `${selectedIds.length} débito(s) marcados como 'Enviado Financeiro'. Gerando relatório...` });
                // Generate PDF report for the sent items
                generateBatchReportPDF(debitsToSend);
            }

        } catch (batchError) {
            console.error("Error during batch send:", batchError);
            toast({ title: "Erro", description: "Ocorreu um erro ao processar o envio em lote.", variant: "destructive" });
        } finally {
            setIsSendingBatch(false);
        }
    }

    // --- PDF Generation ---

    const checkConfig = (): boolean => {
        if (!configuracoes) {
            toast({ title: "Aviso", description: "Configurações da assessoria não carregadas. Verifique a página de Configurações.", variant: "destructive" });
            return false;
        }
        return true;
    }

    // Safely format dates
    const formatDateForPDF = (date: Date | string | undefined | null, includeTime = false): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            // Ensure it's a valid date
            if (!(dateObj instanceof Date) || !isValid(dateObj)) {
                return 'Data Inválida';
            }
            const formatString = includeTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
            return format(dateObj, formatString, { locale: ptBR });
        } catch (e) {
            return 'Data Inválida';
        }
    };

    // Calculate Due Date based on Homologation Date and Config
    const calculateDueDate = (homologacaoDate: Date | string): Date => {
        const defaultDueDay = configuracoes?.diaVencimentoPadrao || 15; // Default to 15 if config not loaded
        let baseDate: Date;
        try {
            baseDate = typeof homologacaoDate === 'string' ? parseISO(homologacaoDate) : homologacaoDate;
            // Ensure it's a valid date
            if (!(baseDate instanceof Date) || !isValid(baseDate)) {
                throw new Error("Invalid homologation date");
            }
        } catch {
            baseDate = new Date(); // Fallback to today if parsing fails
        }

        let dueDate = addMonths(baseDate, 1); // Go to the next month
        dueDate = setDate(dueDate, defaultDueDay); // Set the day to the configured default
        return dueDate;
    }

    // --- Invoice PDF ---
    const generateInvoicePDF = (debito: Debito) => {
        if (!checkConfig() || !configuracoes) return;

        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date());
        const config = configuracoes;
        // For avulso, dataReferencia is creation, for licitacao it's homologacao. Due date calc needs this context.
        const baseDateForDueDate = debito.tipoDebito === 'LICITACAO' ? debito.dataReferencia : debito.dataVencimento; // Simpler: use vencimento if avulso
        const dueDate = debito.tipoDebito === 'LICITACAO' ? calculateDueDate(baseDateForDueDate) : debito.dataVencimento;

        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

        // Draw Header with Logo
        const drawHeader = () => {
            let textX = margin;
            let textY = headerY;

            if (logoUrl) {
                try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                     if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim);
                        textX += logoDim + 8; // Add space between logo and text
                        textY += 4; // Adjust vertical alignment if needed
                    } else { console.warn("Logo format not directly supported by jsPDF."); }
                } catch (e) { console.error("Error adding logo to PDF:", e); }
            }
            // Advisory Info (adjust position based on logo)
            doc.setFontSize(14); // Smaller title
            doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
            textY += 6;
            doc.setFontSize(10);
            doc.text(`CNPJ: ${config.cnpj}`, textX, textY);
            textY += 5;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY);
            textY += 5;
            doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY);
            textY += 5;
            doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY);
            headerY = textY + 8; // Update headerY for separator
        };

        drawHeader(); // Draw the header

        // Invoice Title & Date (Right Aligned)
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("FATURA DE SERVIÇOS", 196, 22, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Data de Emissão: ${hoje}`, 196, 28, { align: 'right' });
        doc.text(`Fatura Ref: ${debito.id}`, 196, 34, { align: 'right' }); // Reference ID

        doc.setLineWidth(0.1);
        doc.line(margin, headerY, 196, headerY); // Separator line below header
        let contentY = headerY + 10;

        // Client Info
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Cliente:", margin, contentY);
        doc.setFont(undefined, 'normal');
        contentY += 7;
        doc.text(`Razão Social: ${debito.clienteNome}`, margin, contentY);
        contentY += 7;
        doc.text(`CNPJ: ${debito.clienteCnpj || 'N/A'}`, margin, contentY);
        contentY += 10;

        doc.line(margin, contentY, 196, contentY); // Separator line
        contentY += 10;

        // Debit Details Table
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Detalhes do Serviço Prestado:", margin, contentY);
        doc.setFont(undefined, 'normal');
        autoTable(doc, {
            startY: contentY + 5,
            head: [['Referência', 'Descrição', 'Data Referência', 'Valor']],
            body: [
                [
                    debito.id,
                    debito.descricao,
                    formatDateForPDF(debito.dataReferencia),
                    debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                ]
            ],
            theme: 'grid',
            headStyles: { fillColor: [26, 35, 126] }, // Dark blue header
            margin: { left: margin, right: margin },
            tableWidth: 'auto',
        });

        // Total and Payment Info
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 35;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total: ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Informações para Pagamento:", margin, finalY + 25);
        doc.setFont(undefined, 'normal');
        let paymentY = finalY + 30;
        if (config.banco && config.agencia && config.conta) {
            doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, margin, paymentY);
            paymentY += 5;
        }
        if (config.chavePix) {
            const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral';
            doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, margin, paymentY);
            paymentY += 5;
        } else if (config.cnpj) {
            doc.text(`PIX (CNPJ): ${config.cnpj}`, margin, paymentY);
            paymentY += 5;
        }
        doc.setFont(undefined, 'bold');
        doc.text(`Vencimento: ${formatDateForPDF(dueDate)}`, margin, paymentY + 5);

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9);
        doc.text(`${config.razaoSocial} - ${config.cnpj} - Agradecemos a sua preferência!`, 105, pageHeight - 15, { align: 'center' });

        doc.save(`Fatura_${debito.clienteNome.replace(/[\s.]+/g, '_')}_${debito.id}.pdf`);
    };

    // --- Receipt PDF ---
    const generateReceiptPDF = (debito: Debito) => {
        if (!checkConfig() || !configuracoes) return;
        if (debito.status !== 'PAGO') {
             toast({title: "Aviso", description: "Só é possível gerar recibo para débitos com status 'Pago'.", variant: "warning"});
             return;
        }

        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date(), true); // Include time for receipt
        const config = configuracoes;
        const paymentDate = formatDateForPDF(new Date()); // Assume payment date is today for simplicity
        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

        // Draw Header with Logo
        const drawHeader = () => {
            let textX = margin;
            let textY = headerY;
            if (logoUrl) {
                 try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim);
                        textX += logoDim + 8;
                        textY += 4;
                    } else { console.warn("Logo format not directly supported by jsPDF.");}
                } catch (e) { console.error("Error adding logo to PDF:", e); }
            }
            // Advisory Info
            doc.setFontSize(14);
            doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
            textY += 6;
            doc.setFontSize(10);
            doc.text(`CNPJ: ${config.cnpj}`, textX, textY);
            textY += 5;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY);
            textY += 5;
             doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY);
             textY += 5;
             doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY);
             headerY = textY + 8;
        };

        drawHeader();

        // Receipt Title & Date
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("RECIBO DE PAGAMENTO", 105, headerY + 10, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Emitido em: ${hoje}`, 196, headerY + 15, { align: 'right' });

        doc.setLineWidth(0.1);
        doc.line(margin, headerY + 25, 196, headerY + 25);

        // Receipt Body
        doc.setFontSize(11);
        let currentY = headerY + 35;
        doc.text(`Recebemos de ${debito.clienteNome} (CNPJ: ${debito.clienteCnpj || 'N/A'}),`, margin, currentY);
        currentY += 7;
        doc.text(`a importância de ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, referente ao pagamento`, margin, currentY);
        currentY += 7;
        doc.text(`dos serviços: ${debito.descricao},`, margin, currentY);
        currentY += 7;
        doc.text(`com referência em ${formatDateForPDF(debito.dataReferencia)}.`, margin, currentY);
        currentY += 14; // More space

        doc.text(`Data do Pagamento (Baixa): ${paymentDate}`, margin, currentY); // Placeholder payment date
        currentY += 14;

        doc.text(`Para clareza, firmamos o presente.`, margin, currentY);
        currentY += 20;

        // Signature Line
        doc.text(`${config.enderecoCidade}, ${formatDateForPDF(new Date())}.`, 105, currentY, { align: 'center' });
        currentY += 25;
        doc.line(50, currentY, 160, currentY); // Signature line
        currentY += 5;
        doc.text(`${config.razaoSocial}`, 105, currentY, { align: 'center' });
        currentY += 5;
        doc.text(`CNPJ: ${config.cnpj}`, 105, currentY, { align: 'center' });


        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9);
        doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });

        doc.save(`Recibo_${debito.clienteNome.replace(/[\s.]+/g, '_')}_${debito.id}.pdf`);
    };


    // --- Pending Report PDF ---
    const generatePendingReportPDF = () => {
        if (!checkConfig() || !configuracoes) return;
        const config = configuracoes;

        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date());
        const pendingDebits = filteredDebitos.filter(d => d.status === 'PENDENTE');
        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

        // Draw Header with Logo
         const drawHeader = () => {
            let textX = margin;
            let textY = headerY;

             if (logoUrl) {
                 try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim);
                        textX += logoDim + 8;
                        textY += 4;
                    } else { console.warn("Logo format not directly supported by jsPDF.");}
                } catch (e) { console.error("Error adding logo to PDF:", e); }
            }

            // Report Title & Info
            doc.setFontSize(16);
            doc.text("Relatório de Pendências Financeiras", textX, textY);
             textY += 6;
            doc.setFontSize(11);
            doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
            textY += 5;
            doc.setFontSize(10);
            doc.text(`Gerado em: ${hoje}`, textX, textY);
             textY += 5;
            doc.text(`Filtros: ${filterCliente || 'Todos Clientes'}, ${filterLicitacao || 'Todas Licitações/Débitos'}, ${dateRange ? `${formatDateForPDF(dateRange.from)} a ${formatDateForPDF(dateRange.to)}` : 'Qualquer Data'}`, textX, textY);
             headerY = textY + 8;

        };
        drawHeader();

        doc.setLineWidth(0.1);
        doc.line(margin, headerY, 196, headerY); // Separator line
        let contentY = headerY + 10;

        // Table
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Cliente', 'CNPJ', 'Descrição', 'Data Referência', 'Valor Pendente']],
            body: pendingDebits.map(d => [
                d.id,
                d.clienteNome,
                d.clienteCnpj || 'N/A',
                d.descricao,
                formatDateForPDF(d.dataReferencia),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'striped',
            headStyles: { fillColor: [26, 35, 126] },
            margin: { left: margin, right: margin },
        });

        // Total Pending
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 15;
        const totalPendente = pendingDebits.reduce((sum, d) => sum + d.valor, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Pendente (Filtro Atual): ${totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9);
        doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });


        doc.save(`Relatorio_Pendencias_${hoje.replace(/\//g, '-')}.pdf`);
    }

    // --- Collection PDF ---
    const generateCollectionPDF = (clienteNome: string) => {
        if (!checkConfig() || !configuracoes) return;
        const config = configuracoes;

        const clientDebits = filteredDebitos.filter(d => d.clienteNome === clienteNome && d.status === 'PENDENTE');
        if (clientDebits.length === 0) {
            toast({ title: "Aviso", description: `Nenhuma pendência encontrada para ${clienteNome} com os filtros atuais.` });
            return;
        }

        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date());
        const firstDebit = clientDebits[0];
        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

         // Draw Header with Logo
         const drawHeader = () => {
            let textX = margin;
            let textY = headerY;
            if (logoUrl) {
                try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim);
                        textX += logoDim + 8;
                        textY += 4;
                    } else { console.warn("Logo format not directly supported by jsPDF."); }
                } catch (e) { console.error("Error adding logo to PDF:", e); }
            }
             // Document Title & Info
            doc.setFontSize(16);
            doc.text(`Documento de Cobrança`, textX, textY);
             textY += 7;
            doc.setFontSize(11);
            doc.text(`De: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, textX, textY);
             textY += 6;
            doc.text(`Para: ${firstDebit.clienteNome} (CNPJ: ${firstDebit.clienteCnpj || 'N/A'})`, textX, textY);
             textY += 6;
            doc.setFontSize(10);
            doc.text(`Data de Emissão: ${hoje}`, textX, textY);
            headerY = textY + 8;

        };
        drawHeader();


        doc.setLineWidth(0.1);
        doc.line(margin, headerY, 196, headerY); // Separator line
        let contentY = headerY + 10;

        // Introduction Text
        doc.setFontSize(11);
        doc.text("Prezados,", margin, contentY);
        contentY += 7;
        doc.text(`Constam em aberto os seguintes débitos referentes aos serviços prestados pela ${config.nomeFantasia || config.razaoSocial}:`, margin, contentY, { maxWidth: 180 });
        contentY += 10;

        // Table of Debits
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Descrição', 'Data Referência', 'Valor', 'Vencimento']],
            body: clientDebits.map(d => {
                const dueDate = d.tipoDebito === 'LICITACAO' ? calculateDueDate(d.dataReferencia) : d.dataVencimento;
                return [
                    d.id,
                    d.descricao,
                    formatDateForPDF(d.dataReferencia),
                    d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    formatDateForPDF(dueDate)
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [26, 35, 126] },
            margin: { left: margin, right: margin },
        });

        // Total and Payment Info
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 25;
        const totalCliente = clientDebits.reduce((sum, d) => sum + d.valor, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total Devido: ${totalCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Informações para Pagamento:", margin, finalY + 25);
        doc.setFont(undefined, 'normal');
        let paymentYColl = finalY + 30;
        if (config.banco && config.agencia && config.conta) {
            doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, margin, paymentYColl);
            paymentYColl += 5;
        }
        if (config.chavePix) {
            const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral';
            doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, margin, paymentYColl);
            paymentYColl += 5;
        } else if (config.cnpj) {
            doc.text(`PIX (CNPJ): ${config.cnpj}`, margin, paymentYColl);
            paymentYColl += 5;
        }
        doc.setFont(undefined, 'normal');
        doc.text(`Solicitamos a regularização dos valores conforme vencimentos indicados na tabela acima.`, margin, paymentYColl + 5);
        doc.text(`Em caso de dúvidas, contate-nos através de ${config.email} ou ${config.telefone}.`, margin, paymentYColl + 15);


        // Footer
        const pageHeightColl = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(margin, pageHeightColl - 20, 196, pageHeightColl - 20);
        doc.setFontSize(9);
        doc.text(config.nomeFantasia || config.razaoSocial, 105, pageHeightColl - 15, { align: 'center' });


        doc.save(`Cobranca_${firstDebit.clienteNome.replace(/[\s.]+/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`);
    }

    // --- Batch Sent Report PDF ---
    const generateBatchReportPDF = (sentDebits: Debito[]) => {
        if (!checkConfig() || !configuracoes) return;
        const config = configuracoes;

        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date(), true);
        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

        // Draw Header
        const drawHeader = () => {
             let textX = margin;
             let textY = headerY;
             if (logoUrl) {
                 try {
                     const img = new Image();
                     img.src = logoUrl;
                     const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                     if (imageType === "PNG" || imageType === "JPEG") {
                         doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim);
                         textX += logoDim + 8;
                         textY += 4;
                     } else { console.warn("Logo format not supported."); }
                 } catch (e) { console.error("Error adding logo:", e); }
             }
             doc.setFontSize(16);
             doc.text("Relatório de Débitos Enviados ao Financeiro", textX, textY);
             textY += 6;
             doc.setFontSize(11);
             doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
             textY += 5;
             doc.setFontSize(10);
             doc.text(`Gerado em: ${hoje}`, textX, textY);
             headerY = textY + 8;
        };
        drawHeader();

        doc.setLineWidth(0.1);
        doc.line(margin, headerY, 196, headerY);
        let contentY = headerY + 10;

        // Table of Sent Debits
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Cliente', 'CNPJ', 'Descrição', 'Data Referência', 'Valor']],
            body: sentDebits.map(d => [
                d.id,
                d.clienteNome,
                d.clienteCnpj || 'N/A',
                d.descricao,
                formatDateForPDF(d.dataReferencia),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'striped',
            headStyles: { fillColor: [26, 35, 126] },
            margin: { left: margin, right: margin },
        });

        // Total Sent
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 15;
        const totalSent = sentDebits.reduce((sum, d) => sum + d.valor, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Enviado: ${totalSent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${sentDebits.length} débito(s))`, 196, finalY + 15, { align: 'right' });

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9);
        doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });

        doc.save(`Relatorio_Envio_Lote_${hoje.replace(/[\s/:]/g, '-')}.pdf`);
    };


    // Get unique client names with pending debits for the dropdown (based on filtered list)
    const clientsWithPendingDebits = Array.from(new Set(filteredDebitos.filter(d => d.status === 'PENDENTE').map(d => d.clienteNome)));

    const clearFilters = () => {
        setFilterCliente('');
        setFilterLicitacao('');
        setDateRange(undefined);
    }

     // Handle individual checkbox change
    const handleSelectDebito = (id: string, checked: boolean) => {
        setSelectedDebitos(prev => {
            const newSelection = new Set(prev);
            if (checked) {
                newSelection.add(id);
            } else {
                newSelection.delete(id);
            }
            return newSelection;
        });
    };

    // Handle "Select All" checkbox change
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allVisibleIds = filteredDebitos.map(d => d.id);
            setSelectedDebitos(new Set(allVisibleIds));
        } else {
            setSelectedDebitos(new Set());
        }
    };

    const isAllSelected = filteredDebitos.length > 0 && selectedDebitos.size === filteredDebitos.length;

    const handleDebitoAvulsoSubmit = async (data: z.infer<typeof debitoAvulsoSchema>) => {
        setIsSubmittingDebitoAvulso(true);
        try {
            const newDebito = await addDebitoAvulso({
                ...data,
                // CNPJ is optional on form, but DebitoAvulsoFormData expects it to be potentially undefined
                clienteCnpj: data.clienteCnpj || undefined,
            });
            if (newDebito) {
                setAllDebitos(prev => [newDebito, ...prev]); // Add to the beginning for immediate visibility
                toast({ title: "Sucesso!", description: "Débito avulso adicionado." });
                setIsDebitoAvulsoDialogOpen(false);
                debitoAvulsoForm.reset();
            } else {
                throw new Error("Falha ao adicionar débito avulso.");
            }
        } catch (error) {
            console.error("Erro ao adicionar débito avulso:", error);
            toast({ title: "Erro", description: `Não foi possível adicionar o débito. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        } finally {
            setIsSubmittingDebitoAvulso(false);
        }
    };

    // Format CNPJ input
    const formatCnpjInput = (value: string | undefined): string => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        return digits
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18); // XX.XXX.XXX/XXXX-XX
    };

    const formatCurrencyInput = (value: string | undefined): string => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits === '') return '';

        const number = parseFloat(digits) / 100;
        return number.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                 <h2 className="text-2xl font-semibold">Módulo Financeiro</h2>
                 <Dialog open={isDebitoAvulsoDialogOpen} onOpenChange={setIsDebitoAvulsoDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" /> Lançar Débito Avulso
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                            <DialogTitle>Lançar Novo Débito Avulso</DialogTitle>
                            <DialogDescription>
                                Preencha as informações para criar um novo débito manualmente.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...debitoAvulsoForm}>
                            <form onSubmit={debitoAvulsoForm.handleSubmit(handleDebitoAvulsoSubmit)} className="space-y-4 py-4">
                                <FormField
                                    control={debitoAvulsoForm.control}
                                    name="clienteNome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Cliente*</FormLabel>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    const selectedClient = clients.find(c => c.name === value);
                                                    if (selectedClient) {
                                                        debitoAvulsoForm.setValue('clienteCnpj', selectedClient.cnpj, { shouldValidate: true });
                                                    } else {
                                                        debitoAvulsoForm.setValue('clienteCnpj', '', { shouldValidate: true }); // Clear if not found or custom name
                                                    }
                                                }}
                                                value={field.value}
                                                disabled={isSubmittingDebitoAvulso || loadingClients}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um cliente ou digite um novo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {loadingClients ? (
                                                        <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                                                    ) : (
                                                        clients.map(client => (
                                                            <SelectItem key={client.id} value={client.name}>
                                                                {client.name} ({client.cnpj})
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Você pode selecionar um cliente existente (CNPJ será preenchido) ou digitar um novo nome.</FormDescription>
                                             {/* Allow manual input if desired or if client not in list */}
                                            <Input
                                                placeholder="Ou digite o nome do cliente"
                                                value={field.value}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    // If user types, assume it's a new client, clear CNPJ
                                                    if (!clients.some(c => c.name === e.target.value)) {
                                                        debitoAvulsoForm.setValue('clienteCnpj', '', { shouldValidate: true });
                                                    }
                                                }}
                                                className="mt-1"
                                                disabled={isSubmittingDebitoAvulso}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={debitoAvulsoForm.control}
                                    name="clienteCnpj"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ do Cliente</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="XX.XXX.XXX/XXXX-XX (Opcional)"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatCnpjInput(e.target.value))}
                                                    disabled={isSubmittingDebitoAvulso}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={debitoAvulsoForm.control}
                                    name="descricao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição do Débito*</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Ex: Consultoria XYZ, Taxa de Serviço..." {...field} disabled={isSubmittingDebitoAvulso} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={debitoAvulsoForm.control}
                                    name="valor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor do Débito*</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="R$ 0,00"
                                                    value={field.value !== undefined ? formatCurrencyInput(field.value.toString()) : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value;
                                                        const cleaned = rawValue.replace(/\D/g, '');
                                                        if (cleaned === '') {
                                                            field.onChange(undefined);
                                                        } else {
                                                            const numValue = parseFloat(cleaned) / 100;
                                                            field.onChange(isNaN(numValue) ? undefined : numValue);
                                                        }
                                                    }}
                                                    onBlur={(e) => { // Format on blur
                                                        if (field.value !== undefined) {
                                                            e.target.value = formatCurrencyInput(field.value.toString());
                                                        }
                                                    }}
                                                    disabled={isSubmittingDebitoAvulso}
                                                    inputMode="decimal"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={debitoAvulsoForm.control}
                                    name="dataVencimento"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Data de Vencimento*</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                            disabled={isSubmittingDebitoAvulso}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                                            ) : (
                                                                <span>Selecione a data</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < startOfDay(new Date()) || isSubmittingDebitoAvulso }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingDebitoAvulso}>Cancelar</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmittingDebitoAvulso}>
                                        {isSubmittingDebitoAvulso && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Adicionar Débito
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <p className="text-muted-foreground">Gerencie os débitos gerados a partir das licitações homologadas.</p>

            {/* Filter Section */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" /> Filtros ({activeTab === 'pendentes' ? 'Pendentes' : 'Processados'})
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <Input
                            placeholder="Filtrar por Cliente ou CNPJ..."
                            value={filterCliente}
                            onChange={(e) => setFilterCliente(e.target.value)}
                        />
                        <Input
                            placeholder="Filtrar por Licitação ou Prot..."
                            value={filterLicitacao}
                            onChange={(e) => setFilterLicitacao(e.target.value)}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd/MM/yyyy")
                                        )
                                    ) : (
                                        <span>Data Referência</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                        <div></div>
                        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-primary lg:justify-self-end">
                            <X className="mr-2 h-4 w-4" /> Limpar Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>


            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <TabsList>
                        <TabsTrigger value="pendentes">Pendentes ({allDebitos.filter(d => d.status === 'PENDENTE').length})</TabsTrigger>
                        <TabsTrigger value="processados">Processados ({allDebitos.filter(d => d.status !== 'PENDENTE').length})</TabsTrigger>
                    </TabsList>
                    {activeTab === 'pendentes' && (
                        <div className="flex gap-2 flex-wrap">
                             <Button variant="secondary" onClick={handleSendBatch} disabled={loading || loadingConfig || selectedDebitos.size === 0 || isSendingBatch}>
                                {isSendingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                {isSendingBatch ? 'Enviando...' : `Enviar Selecionados (${selectedDebitos.size})`}
                            </Button>
                            <Button variant="outline" onClick={generatePendingReportPDF} disabled={loading || loadingConfig || filteredDebitos.filter(d => d.status === 'PENDENTE').length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Relatório Pendências (PDF)
                            </Button>
                            <Select onValueChange={generateCollectionPDF} disabled={loading || loadingConfig || clientsWithPendingDebits.length === 0}>
                                <SelectTrigger className="w-full sm:w-[280px]">
                                    <SelectValue placeholder="Gerar Cobrança por Cliente (PDF)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingConfig ? (
                                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                    ) : clientsWithPendingDebits.length > 0 ? (
                                        clientsWithPendingDebits.sort().map(cliente => (
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
                            <CardDescription>Débitos aguardando ação financeira.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FinancialTable
                                debitos={filteredDebitos}
                                loading={loading}
                                updatingStatus={updatingStatus}
                                onUpdateStatus={handleUpdateStatus}
                                onGenerateInvoice={generateInvoicePDF}
                                onGenerateReceipt={generateReceiptPDF} // Pass receipt generator
                                showActions={true}
                                actionsDisabled={loadingConfig || isSendingBatch} // Disable actions during batch send
                                selectedDebitos={selectedDebitos} // Pass selection state
                                onSelectDebito={handleSelectDebito} // Pass select handler
                                onSelectAll={handleSelectAll} // Pass select all handler
                                isAllSelected={isAllSelected} // Pass all selected state
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="processados">
                    <Card>
                        <CardHeader>
                            <CardTitle>Débitos Processados</CardTitle>
                            <CardDescription>Histórico de débitos baixados ou enviados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FinancialTable
                                debitos={filteredDebitos}
                                loading={loading}
                                updatingStatus={{}} // No updates needed here
                                onUpdateStatus={() => { }}
                                onGenerateInvoice={generateInvoicePDF}
                                onGenerateReceipt={generateReceiptPDF} // Pass receipt generator
                                showActions={false} // Don't show PAGO/ENVIADO buttons
                                actionsDisabled={loadingConfig}
                                selectedDebitos={new Set()} // No selection needed here
                                onSelectDebito={() => {}} // No selection needed here
                                onSelectAll={() => {}} // No selection needed here
                                isAllSelected={false} // No selection needed here
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
    onGenerateReceipt: (debito: Debito) => void; // Add prop for receipt generation
    showActions: boolean;
    actionsDisabled?: boolean;
    selectedDebitos: Set<string>; // Selected debit IDs
    onSelectDebito: (id: string, checked: boolean) => void; // Handler for individual selection
    onSelectAll: (checked: boolean) => void; // Handler for select all
    isAllSelected: boolean; // Whether all visible items are selected
}

function FinancialTable({
    debitos,
    loading,
    updatingStatus,
    onUpdateStatus,
    onGenerateInvoice,
    onGenerateReceipt,
    showActions,
    actionsDisabled = false,
    selectedDebitos,
    onSelectDebito,
    onSelectAll,
    isAllSelected
 }: FinancialTableProps) {

    // Safely format dates
    const formatDate = (date: Date | string | undefined | null): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!(dateObj instanceof Date) || !isValid(dateObj)) {
                return 'Inválida';
            }
            return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
        } catch (e) {
            return 'Inválida';
        }
    };


    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {showActions && (<TableHead className="w-[50px]"><Checkbox checked={isAllSelected} onCheckedChange={(checked) => onSelectAll(Boolean(checked))} aria-label="Selecionar todos" disabled={loading || debitos.length === 0}/></TableHead>)}
                        <TableHead className="w-[120px]">Protocolo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data Referência</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[200px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={showActions ? 8 : 7} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : debitos.length > 0 ? (
                        debitos.map(debito => {
                            const isLoading = updatingStatus[debito.id];
                            const statusInfo = statusFinanceiroMap[debito.status];
                            const isSelected = selectedDebitos.has(debito.id);
                            return (
                                <TableRow key={debito.id} data-state={isSelected ? "selected" : ""}>
                                     {showActions && (
                                        <TableCell><Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectDebito(debito.id, Boolean(checked))} aria-label={`Selecionar débito ${debito.id}`} disabled={actionsDisabled}/></TableCell>
                                     )}
                                    <TableCell className="font-medium">{debito.id}</TableCell>
                                    <TableCell>{debito.clienteNome}</TableCell>
                                    <TableCell>{debito.descricao}</TableCell>
                                    <TableCell>{formatDate(debito.dataReferencia)}</TableCell>
                                    <TableCell>{debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>
                                        {statusInfo ? (
                                            <Badge variant={getBadgeVariantFinanceiro(statusInfo.color)} className="flex items-center gap-1 w-fit whitespace-nowrap">
                                                <statusInfo.icon className="h-3 w-3" />
                                                {statusInfo.label}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit whitespace-nowrap">
                                                <Clock className="h-3 w-3" />
                                                {debito.status || 'Desconhecido'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => onGenerateInvoice(debito)} title="Gerar Fatura PDF" disabled={actionsDisabled}>
                                            {actionsDisabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                        </Button>
                                        {debito.status === 'PAGO' && (
                                            <Button variant="outline" size="sm" onClick={() => onGenerateReceipt(debito)} title="Gerar Recibo PDF" disabled={actionsDisabled}>
                                                {actionsDisabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                                            </Button>
                                        )}
                                        {showActions && debito.status === 'PENDENTE' && (
                                            <>
                                                <Button variant="default" size="sm" onClick={() => onUpdateStatus(debito.id, 'PAGO')} disabled={isLoading || actionsDisabled} title="Marcar como Pago (Baixar)">
                                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={showActions ? 8 : 7} className="text-center text-muted-foreground h-24">Nenhum débito encontrado para esta visualização.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
