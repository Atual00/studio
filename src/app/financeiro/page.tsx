'use client'; // Required for state and client-side interaction

import React, { useState, useEffect, useMemo } from 'react'; // Import React
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
import { Download, FileText, Filter, Loader2, Send, CheckCircle, Clock, CalendarIcon, X, Receipt, Mail, PlusCircle, Handshake, AlertCircle } from 'lucide-react'; // Import icons + Receipt + Mail + Handshake
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addMonths, setDate, isValid, differenceInDays, addDays, addWeeks, isBefore } from 'date-fns'; // Updated date-fns imports + isValid + differenceInDays
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import for autoTable
import { useToast } from '@/hooks/use-toast';
import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form'; // Import settings type
import { fetchDebitos, updateDebitoStatus, type Debito, addDebitoAvulso, type DebitoAvulsoFormData, saveDebitosToStorage } from '@/services/licitacaoService'; // Import from licitacaoService
import { fetchConfiguracoes } from '@/services/configuracoesService'; // Import config service
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
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
  FormLabel,
} from "@/components/ui/form";
import { fetchClients, type ClientListItem } from '@/services/clientService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const statusFinanceiroMap: { [key: string]: { label: string; color: string; icon: React.ElementType } } = {
    PENDENTE: { label: 'Pendente', color: 'warning', icon: Clock },
    PAGO: { label: 'Pago (Baixado)', color: 'success', icon: CheckCircle },
    ENVIADO_FINANCEIRO: { label: 'Enviado Financeiro', color: 'info', icon: Send },
    PAGO_VIA_ACORDO: { label: 'Pago via Acordo', color: 'success', icon: Handshake },
    ACORDO_PARCELA: { label: 'Parcela Acordo', color: 'accent', icon: Clock }, // For individual agreement installments
};

const getBadgeVariantFinanceiro = (color: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info' | 'accent' => {
    switch (color) {
        case 'success': return 'success';
        case 'warning': return 'warning';
        case 'info': return 'info';
        case 'accent': return 'accent';
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

// Zod Schema for Acordo Form
const acordoFormSchema = z.object({
    desconto: z.preprocess(
        (val) => typeof val === 'string' ? parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) : val,
        z.number().min(0, "Desconto não pode ser negativo.").optional()
    ),
    numeroParcelas: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
        z.number().min(1, "Número de parcelas deve ser pelo menos 1.")
    ),
    dataVencimentoPrimeiraParcela: z.date({ required_error: "Data de vencimento da primeira parcela é obrigatória." }),
    tipoParcelamento: z.enum(['unica', 'mensal', 'quinzenal', 'semanal']),
    observacoes: z.string().optional(),
});
type AcordoFormData = z.infer<typeof acordoFormSchema>;

// Helper function moved to module scope
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
    return null;
}


// --- Component ---
export default function FinanceiroPage() {
    const [allDebitos, setAllDebitos] = useState<Debito[]>([]);
    const [filteredDebitos, setFilteredDebitos] = useState<Debito[]>([]);
    const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [activeTab, setActiveTab] = useState<'pendentes' | 'processados'>('pendentes');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterLicitacao, setFilterLicitacao] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [updatingStatus, setUpdatingStatus] = useState<{ [key: string]: boolean }>({});
    const [selectedDebitos, setSelectedDebitos] = useState<Set<string>>(new Set());
    const [isSendingBatch, setIsSendingBatch] = useState(false);
    const [isDebitoAvulsoDialogOpen, setIsDebitoAvulsoDialogOpen] = useState(false);
    const [isSubmittingDebitoAvulso, setIsSubmittingDebitoAvulso] = useState(false);
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);

    const [isAcordoDialogOpen, setIsAcordoDialogOpen] = useState(false);
    const [debitosParaAcordo, setDebitosParaAcordo] = useState<Debito[]>([]);
    const [isSubmittingAcordo, setIsSubmittingAcordo] = useState(false);


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

    const acordoForm = useForm<AcordoFormData>({
        resolver: zodResolver(acordoFormSchema),
        defaultValues: {
            desconto: 0,
            numeroParcelas: 1,
            dataVencimentoPrimeiraParcela: addDays(new Date(), 7), // Default to 7 days from now
            tipoParcelamento: 'mensal',
            observacoes: '',
        }
    });


    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setLoadingConfig(true);
            setLoadingClients(true);
            try {
                const [debitosData, configData, clientsData] = await Promise.all([
                    fetchDebitos(),
                    fetchConfiguracoes(),
                    fetchClients()
                ]);
                setAllDebitos(debitosData);
                setFilteredDebitos(debitosData);
                setConfiguracoes(configData);
                setClients(clientsData);
            } catch (err) {
                console.error('Erro ao carregar dados financeiros ou configurações:', err);
                toast({ title: "Erro", description: `Falha ao carregar dados. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
            } finally {
                setLoading(false);
                setLoadingConfig(false);
                setLoadingClients(false);
            }
        };
        loadInitialData();
    }, [toast]);


    const calculateInterest = (debito: Debito): number => {
        if (debito.status !== 'PENDENTE' || !configuracoes?.taxaJurosDiaria || configuracoes.taxaJurosDiaria <= 0) {
            return 0;
        }
        const today = startOfDay(new Date());
        let dueDate = parseAndValidateDate(debito.dataVencimento);
        if (!dueDate || !isBefore(dueDate, today)) {
            return 0;
        }
        const diasAtraso = differenceInDays(today, dueDate);
        if (diasAtraso <= 0) return 0;

        const juros = debito.valor * (configuracoes.taxaJurosDiaria / 100) * diasAtraso;
        return parseFloat(juros.toFixed(2)); // Round to 2 decimal places
    };

    useEffect(() => {
        let result = allDebitos;

        if (activeTab === 'pendentes') {
            result = result.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA');
        } else {
            result = result.filter(d => d.status === 'PAGO' || d.status === 'ENVIADO_FINANCEIRO' || d.status === 'PAGO_VIA_ACORDO');
        }

        if (filterCliente) {
            result = result.filter(d =>
                d.clienteNome.toLowerCase().includes(filterCliente.toLowerCase()) ||
                (d.clienteCnpj && d.clienteCnpj.includes(filterCliente))
            );
        }

        if (filterLicitacao) {
            result = result.filter(d =>
                (d.licitacaoNumero && d.licitacaoNumero.toLowerCase().includes(filterLicitacao.toLowerCase())) ||
                d.id.toLowerCase().includes(filterLicitacao.toLowerCase())
            );
        }

        if (dateRange?.from) {
            const start = startOfDay(dateRange.from);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            result = result.filter(d => {
                try {
                    const refDate = parseAndValidateDate(d.dataReferencia);
                    if (!refDate) return false;
                    return isWithinInterval(refDate, { start, end });
                } catch (e) { return false; }
            });
        }

        setFilteredDebitos(result);
        setSelectedDebitos(new Set());
    }, [allDebitos, activeTab, filterCliente, filterLicitacao, dateRange, configuracoes]);


    const handleUpdateStatus = async (id: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO') => {
        setUpdatingStatus(prev => ({ ...prev, [id]: true }));
        try {
            const success = await updateDebitoStatus(id, newStatus);
            if (success) {
                setAllDebitos(prevDebitos => prevDebitos.map(d => d.id === id ? { ...d, status: newStatus } : d));
                toast({ title: "Sucesso", description: `Débito ${id} atualizado para ${statusFinanceiroMap[newStatus]?.label}.` });
            } else {
                throw new Error("Falha ao atualizar status no backend.");
            }
        } catch (err) {
            toast({ title: "Erro", description: `Falha ao atualizar status do débito ${id}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [id]: false }));
        }
    }

    const handleSendBatch = async () => {
        if (selectedDebitos.size === 0) {
            toast({ title: "Atenção", description: "Selecione pelo menos um débito para enviar.", variant: "warning" });
            return;
        }
        setIsSendingBatch(true);
        const selectedIds = Array.from(selectedDebitos);
        const debitsToSend = allDebitos.filter(d => selectedIds.includes(d.id) && d.status === 'PENDENTE');
        if (debitsToSend.length === 0) {
            toast({ title: "Atenção", description: "Nenhum débito pendente selecionado para envio.", variant: "warning" });
            setIsSendingBatch(false);
            return;
        }

        const updatedDebitosList = [...allDebitos];
        const failedUpdates: string[] = [];

        try {
            await Promise.all(debitsToSend.map(async (debito) => {
                try {
                    const success = await updateDebitoStatus(debito.id, 'ENVIADO_FINANCEIRO');
                    if (success) {
                        const index = updatedDebitosList.findIndex(d => d.id === debito.id);
                        if (index !== -1) {
                            updatedDebitosList[index] = { ...updatedDebitosList[index], status: 'ENVIADO_FINANCEIRO' };
                        }
                    } else {
                        failedUpdates.push(debito.id);
                    }
                } catch (err) {
                    failedUpdates.push(debito.id);
                }
            }));

            setAllDebitos(updatedDebitosList);
            setSelectedDebitos(new Set());

            if (failedUpdates.length > 0) {
                 toast({ title: "Erro Parcial", description: `Falha ao enviar ${failedUpdates.length} débito(s): ${failedUpdates.join(', ')}`, variant: "destructive" });
            } else {
                toast({ title: "Sucesso", description: `${debitsToSend.length} débito(s) marcados como 'Enviado Financeiro'. Gerando relatório...` });
                generateBatchReportPDF(debitsToSend.map(d => ({...d, juros: calculateInterest(d)}))); // Pass juros to report
            }

        } catch (batchError) {
            toast({ title: "Erro", description: "Ocorreu um erro ao processar o envio em lote.", variant: "destructive" });
        } finally {
            setIsSendingBatch(false);
        }
    }

    const checkConfig = (): boolean => {
        if (!configuracoes) {
            toast({ title: "Aviso", description: "Configurações da assessoria não carregadas. Verifique a página de Configurações.", variant: "destructive" });
            return false;
        }
        return true;
    }

    const formatDateForPDF = (date: Date | string | undefined | null, includeTime = false): string => {
        const parsed = parseAndValidateDate(date);
        if (!parsed) return 'N/A';
        const formatString = includeTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
        return format(parsed, formatString, { locale: ptBR });
    };
    

    const calculateDueDate = (baseDateInput: Date | string, config: ConfiguracoesFormValues | null): Date => {
        const defaultDueDay = config?.diaVencimentoPadrao || 15;
        let baseDate = parseAndValidateDate(baseDateInput) || new Date();
        let dueDate = addMonths(baseDate, 1);
        dueDate = setDate(dueDate, defaultDueDay);
        return dueDate;
    }

    const generateInvoicePDF = (debito: Debito) => {
        if (!checkConfig() || !configuracoes) return;
        const doc = new jsPDF();
        const hoje = formatDateForPDF(new Date());
        const config = configuracoes;
        const juros = calculateInterest(debito);
        const valorTotalComJuros = debito.valor + juros;
        const dueDate = debito.tipoDebito === 'LICITACAO' ? calculateDueDate(debito.dataReferencia, config) : parseAndValidateDate(debito.dataVencimento);

        const logoUrl = config.logoUrl;
        const logoDim = 25;
        const margin = 14;
        let headerY = 20;

        const drawHeader = () => {
            let textX = margin; let textY = headerY;
            if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error("Error adding logo to PDF:", e); } }
            doc.setFontSize(14); doc.text(config.nomeFantasia || config.razaoSocial, textX, textY); textY += 6;
            doc.setFontSize(10); doc.text(`CNPJ: ${config.cnpj}`, textX, textY); textY += 5;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY); textY += 5;
            doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY); textY += 5;
            doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY); headerY = textY + 8;
        };
        drawHeader();
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text("FATURA DE SERVIÇOS", 196, 22, { align: 'right' });
        doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.text(`Data de Emissão: ${hoje}`, 196, 28, { align: 'right' });
        doc.text(`Fatura Ref: ${debito.id}`, 196, 34, { align: 'right' });
        doc.setLineWidth(0.1); doc.line(margin, headerY, 196, headerY); let contentY = headerY + 10;
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("Cliente:", margin, contentY); doc.setFont(undefined, 'normal'); contentY += 7;
        doc.text(`Razão Social: ${debito.clienteNome}`, margin, contentY); contentY += 7;
        doc.text(`CNPJ: ${debito.clienteCnpj || 'N/A'}`, margin, contentY); contentY += 10;
        doc.line(margin, contentY, 196, contentY); contentY += 10;
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("Detalhes do Serviço Prestado:", margin, contentY); doc.setFont(undefined, 'normal');
        
        const body = [
            [ debito.id, debito.descricao, formatDateForPDF(debito.dataReferencia), debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ]
        ];
        if (juros > 0) {
            body.push(['', 'Juros por atraso', formatDateForPDF(debito.dataVencimento), juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
        }

        autoTable(doc, {
            startY: contentY + 5,
            head: [['Referência', 'Descrição', 'Data Ref/Venc.', 'Valor']],
            body: body,
            theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, margin: { left: margin, right: margin }, tableWidth: 'auto',
        });

        const finalY = (doc as any).lastAutoTable.finalY || contentY + 35;
        doc.setFontSize(14); doc.setFont(undefined, 'bold');
        doc.text(`Valor Total: ${valorTotalComJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });
        doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text("Informações para Pagamento:", margin, finalY + 25); doc.setFont(undefined, 'normal');
        let paymentY = finalY + 30;
        if (config.banco && config.agencia && config.conta) { doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, margin, paymentY); paymentY += 5; }
        if (config.chavePix) { const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral'; doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, margin, paymentY); paymentY += 5; }
        else if (config.cnpj) { doc.text(`PIX (CNPJ): ${config.cnpj}`, margin, paymentY); paymentY += 5; }
        doc.setFont(undefined, 'bold'); doc.text(`Vencimento: ${formatDateForPDF(dueDate)}`, margin, paymentY + 5);
        const pageHeight = doc.internal.pageSize.height; doc.setLineWidth(0.1); doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9); doc.text(`${config.razaoSocial} - ${config.cnpj} - Agradecemos a sua preferência!`, 105, pageHeight - 15, { align: 'center' });
        doc.save(`Fatura_${debito.clienteNome.replace(/[\s.]+/g, '_')}_${debito.id}.pdf`);
    };

    const generateReceiptPDF = (debito: Debito) => {
        if (!checkConfig() || !configuracoes) return;
        if (debito.status !== 'PAGO' && debito.status !== 'PAGO_VIA_ACORDO') { toast({title: "Aviso", description: "Só é possível gerar recibo para débitos com status 'Pago' ou 'Pago via Acordo'.", variant: "warning"}); return; }
        const doc = new jsPDF(); const hoje = formatDateForPDF(new Date(), true); const config = configuracoes; const paymentDate = formatDateForPDF(new Date());
        const logoUrl = config.logoUrl; const logoDim = 25; const margin = 14; let headerY = 20;
        const drawHeader = () => {
            let textX = margin; let textY = headerY;
            if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error("Error adding logo:", e); } }
            doc.setFontSize(14); doc.text(config.nomeFantasia || config.razaoSocial, textX, textY); textY += 6;
            doc.setFontSize(10); doc.text(`CNPJ: ${config.cnpj}`, textX, textY); textY += 5;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY); textY += 5;
            doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY); textY += 5;
            doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY); headerY = textY + 8;
        };
        drawHeader();
        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text("RECIBO DE PAGAMENTO", 105, headerY + 10, { align: 'center' });
        doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.text(`Emitido em: ${hoje}`, 196, headerY + 15, { align: 'right' });
        doc.setLineWidth(0.1); doc.line(margin, headerY + 25, 196, headerY + 25);
        doc.setFontSize(11); let currentY = headerY + 35;
        const juros = debito.status === 'PAGO_VIA_ACORDO' ? 0 : calculateInterest(debito); // Assume agreement value includes interest, or it was waived. For simple "PAGO", calculate.
        const valorRecebido = debito.valor + (debito.status === 'PAGO_VIA_ACORDO' ? 0 : juros);

        doc.text(`Recebemos de ${debito.clienteNome} (CNPJ: ${debito.clienteCnpj || 'N/A'}),`, margin, currentY); currentY += 7;
        doc.text(`a importância de ${valorRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, referente ao pagamento`, margin, currentY); currentY += 7;
        doc.text(`dos serviços: ${debito.descricao},`, margin, currentY); currentY += 7;
        doc.text(`com referência em ${formatDateForPDF(debito.dataReferencia)}.`, margin, currentY); currentY += 14;
        doc.text(`Data do Pagamento (Baixa): ${paymentDate}`, margin, currentY); currentY += 14;
        doc.text(`Para clareza, firmamos o presente.`, margin, currentY); currentY += 20;
        doc.text(`${config.enderecoCidade}, ${formatDateForPDF(new Date())}.`, 105, currentY, { align: 'center' }); currentY += 25;
        doc.line(50, currentY, 160, currentY); currentY += 5;
        doc.text(`${config.razaoSocial}`, 105, currentY, { align: 'center' }); currentY += 5;
        doc.text(`CNPJ: ${config.cnpj}`, 105, currentY, { align: 'center' });
        const pageHeight = doc.internal.pageSize.height; doc.setLineWidth(0.1); doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9); doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });
        doc.save(`Recibo_${debito.clienteNome.replace(/[\s.]+/g, '_')}_${debito.id}.pdf`);
    };

    const generatePendingReportPDF = () => {
        if (!checkConfig() || !configuracoes) return; const config = configuracoes;
        const pendingDebitsWithInterest = filteredDebitos
            .filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA')
            .map(d => ({ ...d, juros: calculateInterest(d), valorAtual: d.valor + calculateInterest(d) }));
        const doc = new jsPDF(); const hoje = formatDateForPDF(new Date());
        const logoUrl = config.logoUrl; const logoDim = 25; const margin = 14; let headerY = 20;
        const drawHeader = () => {
            let textX = margin; let textY = headerY;
            if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error(e); } }
            doc.setFontSize(16); doc.text("Relatório de Pendências Financeiras", textX, textY); textY += 6;
            doc.setFontSize(11); doc.text(config.nomeFantasia || config.razaoSocial, textX, textY); textY += 5;
            doc.setFontSize(10); doc.text(`Gerado em: ${hoje}`, textX, textY); textY += 5;
            doc.text(`Filtros: ${filterCliente || 'Todos Clientes'}, ${filterLicitacao || 'Todas Licitações/Débitos'}, ${dateRange ? `${formatDateForPDF(dateRange.from)} a ${formatDateForPDF(dateRange.to)}` : 'Qualquer Data'}`, textX, textY); headerY = textY + 8;
        };
        drawHeader();
        doc.setLineWidth(0.1); doc.line(margin, headerY, 196, headerY); let contentY = headerY + 10;
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Cliente', 'Descrição', 'Vencimento', 'Valor Original', 'Juros', 'Valor Atualizado']],
            body: pendingDebitsWithInterest.map(d => [
                d.id, d.clienteNome, d.descricao, formatDateForPDF(d.dataVencimento),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                d.juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                d.valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'striped', headStyles: { fillColor: [26, 35, 126] }, margin: { left: margin, right: margin },
        });
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 15;
        const totalPendente = pendingDebitsWithInterest.reduce((sum, d) => sum + d.valorAtual, 0);
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(`Total Pendente (Filtro Atual): ${totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });
        const pageHeight = doc.internal.pageSize.height; doc.setLineWidth(0.1); doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9); doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });
        doc.save(`Relatorio_Pendencias_${hoje.replace(/\//g, '-')}.pdf`);
    }

    const generateCollectionPDF = (clienteNome: string) => {
        if (!checkConfig() || !configuracoes) return; const config = configuracoes;
        const clientDebitsWithInterest = filteredDebitos
            .filter(d => d.clienteNome === clienteNome && (d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA'))
            .map(d => ({ ...d, juros: calculateInterest(d), valorAtual: d.valor + calculateInterest(d) }));
        if (clientDebitsWithInterest.length === 0) { toast({ title: "Aviso", description: `Nenhuma pendência encontrada para ${clienteNome} com os filtros atuais.` }); return; }
        const doc = new jsPDF(); const hoje = formatDateForPDF(new Date()); const firstDebit = clientDebitsWithInterest[0];
        const logoUrl = config.logoUrl; const logoDim = 25; const margin = 14; let headerY = 20;
        const drawHeader = () => {
            let textX = margin; let textY = headerY;
            if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error(e); } }
            doc.setFontSize(16); doc.text(`Documento de Cobrança`, textX, textY); textY += 7;
            doc.setFontSize(11); doc.text(`De: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, textX, textY); textY += 6;
            doc.text(`Para: ${firstDebit.clienteNome} (CNPJ: ${firstDebit.clienteCnpj || 'N/A'})`, textX, textY); textY += 6;
            doc.setFontSize(10); doc.text(`Data de Emissão: ${hoje}`, textX, textY); headerY = textY + 8;
        };
        drawHeader();
        doc.setLineWidth(0.1); doc.line(margin, headerY, 196, headerY); let contentY = headerY + 10;
        doc.setFontSize(11); doc.text("Prezados,", margin, contentY); contentY += 7;
        doc.text(`Constam em aberto os seguintes débitos referentes aos serviços prestados pela ${config.nomeFantasia || config.razaoSocial}:`, margin, contentY, { maxWidth: 180 }); contentY += 10;
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Descrição', 'Vencimento', 'Valor Original', 'Juros', 'Valor Atualizado']],
            body: clientDebitsWithInterest.map(d => [
                d.id, d.descricao, formatDateForPDF(d.dataVencimento),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                d.juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                d.valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, margin: { left: margin, right: margin },
        });
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 25;
        const totalCliente = clientDebitsWithInterest.reduce((sum, d) => sum + d.valorAtual, 0);
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(`Valor Total Devido: ${totalCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });
        doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text("Informações para Pagamento:", margin, finalY + 25); doc.setFont(undefined, 'normal');
        let paymentYColl = finalY + 30;
        if (config.banco && config.agencia && config.conta) { doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, margin, paymentYColl); paymentYColl += 5; }
        if (config.chavePix) { const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral'; doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, margin, paymentYColl); paymentYColl += 5; }
        else if (config.cnpj) { doc.text(`PIX (CNPJ): ${config.cnpj}`, margin, paymentYColl); paymentYColl += 5; }
        doc.setFont(undefined, 'normal'); doc.text(`Solicitamos a regularização dos valores conforme vencimentos indicados na tabela acima.`, margin, paymentYColl + 5);
        doc.text(`Em caso de dúvidas, contate-nos através de ${config.email} ou ${config.telefone}.`, margin, paymentYColl + 15);
        const pageHeightColl = doc.internal.pageSize.height; doc.setLineWidth(0.1); doc.line(margin, pageHeightColl - 20, 196, pageHeightColl - 20);
        doc.setFontSize(9); doc.text(config.nomeFantasia || config.razaoSocial, 105, pageHeightColl - 15, { align: 'center' });
        doc.save(`Cobranca_${firstDebit.clienteNome.replace(/[\s.]+/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`);
    }

    const generateBatchReportPDF = (sentDebits: (Debito & { juros: number })[]) => {
        if (!checkConfig() || !configuracoes) return; const config = configuracoes;
        const doc = new jsPDF(); const hoje = formatDateForPDF(new Date(), true);
        const logoUrl = config.logoUrl; const logoDim = 25; const margin = 14; let headerY = 20;
        const drawHeader = () => {
             let textX = margin; let textY = headerY;
             if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error(e); } }
             doc.setFontSize(16); doc.text("Relatório de Débitos Enviados ao Financeiro", textX, textY); textY += 6;
             doc.setFontSize(11); doc.text(config.nomeFantasia || config.razaoSocial, textX, textY); textY += 5;
             doc.setFontSize(10); doc.text(`Gerado em: ${hoje}`, textX, textY); headerY = textY + 8;
        };
        drawHeader();
        doc.setLineWidth(0.1); doc.line(margin, headerY, 196, headerY); let contentY = headerY + 10;
        autoTable(doc, {
            startY: contentY,
            head: [['Protocolo', 'Cliente', 'Descrição', 'Vencimento', 'Valor Original', 'Juros Calc.', 'Valor Enviado']],
            body: sentDebits.map(d => [
                d.id, d.clienteNome, d.descricao, formatDateForPDF(d.dataVencimento),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                d.juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                (d.valor + d.juros).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'striped', headStyles: { fillColor: [26, 35, 126] }, margin: { left: margin, right: margin },
        });
        const finalY = (doc as any).lastAutoTable.finalY || contentY + 15;
        const totalSent = sentDebits.reduce((sum, d) => sum + d.valor + d.juros, 0);
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(`Total Enviado: ${totalSent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${sentDebits.length} débito(s))`, 196, finalY + 15, { align: 'right' });
        const pageHeight = doc.internal.pageSize.height; doc.setLineWidth(0.1); doc.line(margin, pageHeight - 20, 196, pageHeight - 20);
        doc.setFontSize(9); doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 15, { align: 'center' });
        doc.save(`Relatorio_Envio_Lote_${hoje.replace(/[\s/:]/g, '-')}.pdf`);
    };

    const clientsWithPendingDebits = Array.from(new Set(filteredDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').map(d => d.clienteNome)));

    const clearFilters = () => {
        setFilterCliente('');
        setFilterLicitacao('');
        setDateRange(undefined);
    }

    const handleSelectDebito = (id: string, checked: boolean) => {
        setSelectedDebitos(prev => {
            const newSelection = new Set(prev);
            if (checked) { newSelection.add(id); } else { newSelection.delete(id); }
            return newSelection;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allVisibleIds = filteredDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').map(d => d.id); // Only select pending/agreement installments
            setSelectedDebitos(new Set(allVisibleIds));
        } else {
            setSelectedDebitos(new Set());
        }
    };

    const isAllSelected = filteredDebitos.length > 0 && selectedDebitos.size === filteredDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').length && filteredDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').length > 0;

    const handleDebitoAvulsoSubmit = async (data: z.infer<typeof debitoAvulsoSchema>) => {
        setIsSubmittingDebitoAvulso(true);
        try {
            const newDebito = await addDebitoAvulso({ ...data, clienteCnpj: data.clienteCnpj || undefined });
            if (newDebito) {
                setAllDebitos(prev => [newDebito, ...prev]);
                toast({ title: "Sucesso!", description: "Débito avulso adicionado." });
                setIsDebitoAvulsoDialogOpen(false); debitoAvulsoForm.reset();
            } else { throw new Error("Falha ao adicionar débito avulso."); }
        } catch (error) {
            toast({ title: "Erro", description: `Não foi possível adicionar o débito. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        } finally { setIsSubmittingDebitoAvulso(false); }
    };

    const formatCnpjInput = (value: string | undefined): string => {
        if (!value) return ''; const digits = value.replace(/\D/g, '');
        return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
    };

    const formatCurrencyInput = (value: string | undefined): string => {
        if (!value) return ''; const digits = value.replace(/\D/g, ''); if (digits === '') return '';
        const number = parseFloat(digits) / 100;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleOpenAcordoDialog = () => {
        const selected = allDebitos.filter(d => selectedDebitos.has(d.id) && (d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA'));
        if (selected.length === 0) {
            toast({ title: "Atenção", description: "Selecione débitos pendentes para criar um acordo.", variant: "warning" });
            return;
        }
        // Check if all selected debits belong to the same client
        const firstClientName = selected[0].clienteNome;
        if (!selected.every(d => d.clienteNome === firstClientName)) {
            toast({ title: "Atenção", description: "Todos os débitos selecionados para o acordo devem pertencer ao mesmo cliente.", variant: "destructive" });
            return;
        }

        setDebitosParaAcordo(selected.map(d => ({...d, jurosCalculado: calculateInterest(d)}))); // Store with calculated interest at this point
        acordoForm.reset({ // Reset form with defaults or based on debits
            desconto: 0,
            numeroParcelas: 1,
            dataVencimentoPrimeiraParcela: addDays(new Date(), 7),
            tipoParcelamento: 'mensal',
            observacoes: `Acordo referente aos débitos: ${selected.map(d => d.id).join(', ')}`,
        });
        setIsAcordoDialogOpen(true);
    };

    const handleAcordoSubmit = async (data: AcordoFormData) => {
        setIsSubmittingAcordo(true);
        const acordoId = `ACORDO-${Date.now()}`;

        const newInstallments: Debito[] = [];
        const totalAtualAcordo = debitosParaAcordo.reduce((sum, d) => sum + d.valor + (d.jurosCalculado || 0), 0);
        const valorFinalAcordo = totalAtualAcordo - (data.desconto || 0);
        if (valorFinalAcordo < 0) {
            acordoForm.setError("desconto", {message: "Desconto não pode ser maior que o valor total."});
            setIsSubmittingAcordo(false);
            return;
        }
        const valorParcela = parseFloat((valorFinalAcordo / data.numeroParcelas).toFixed(2));

        let proximoVencimento = startOfDay(data.dataVencimentoPrimeiraParcela);

        for (let i = 0; i < data.numeroParcelas; i++) {
            newInstallments.push({
                id: `PARCELA-${acordoId}-${i + 1}`,
                tipoDebito: 'ACORDO_PARCELA',
                clienteNome: debitosParaAcordo[0].clienteNome,
                clienteCnpj: debitosParaAcordo[0].clienteCnpj,
                descricao: `Parcela ${i + 1}/${data.numeroParcelas} do Acordo ${acordoId}`,
                valor: valorParcela,
                dataVencimento: new Date(proximoVencimento), // Clone date
                dataReferencia: new Date(), // Agreement creation date
                status: 'PENDENTE',
                licitacaoNumero: debitosParaAcordo.map(d => d.licitacaoNumero || d.id).join(', ').substring(0, 100), // Concat original refs
                acordoId: acordoId,
                originalDebitoIds: debitosParaAcordo.map(d => d.id),
            });

            switch (data.tipoParcelamento) {
                case 'mensal': proximoVencimento = addMonths(proximoVencimento, 1); break;
                case 'quinzenal': proximoVencimento = addDays(proximoVencimento, 15); break;
                case 'semanal': proximoVencimento = addWeeks(proximoVencimento, 1); break;
                // 'unica' handled by numeroParcelas = 1
            }
        }
        // Handle potential rounding difference in last installment
        if (data.numeroParcelas > 0) {
            const totalParcelado = valorParcela * data.numeroParcelas;
            const diferenca = valorFinalAcordo - totalParcelado;
            if (Math.abs(diferenca) > 0.001 && newInstallments.length > 0) { // Check for small diff
                newInstallments[newInstallments.length - 1].valor += diferenca;
                newInstallments[newInstallments.length - 1].valor = parseFloat(newInstallments[newInstallments.length - 1].valor.toFixed(2));
            }
        }


        try {
            const updatedOriginalDebits = allDebitos.map(d => {
                if (debitosParaAcordo.some(ad => ad.id === d.id)) {
                    return { ...d, status: 'PAGO_VIA_ACORDO' as const, acordoId: acordoId };
                }
                return d;
            });

            setAllDebitos([...updatedOriginalDebits, ...newInstallments]);
            saveDebitosToStorage([...updatedOriginalDebits, ...newInstallments]); // Save all to storage

            toast({ title: "Sucesso!", description: `Acordo ${acordoId} criado com ${data.numeroParcelas} parcela(s).` });
            generateAcordoPDF(debitosParaAcordo, data, newInstallments, acordoId, valorFinalAcordo);
            setIsAcordoDialogOpen(false);
            setSelectedDebitos(new Set()); // Clear selection
        } catch (err) {
            toast({ title: "Erro", description: `Falha ao criar acordo. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setIsSubmittingAcordo(false);
        }
    };

    const generateAcordoPDF = (
        debitosOriginais: (Debito & { jurosCalculado?: number })[],
        acordoData: AcordoFormData,
        parcelas: Debito[],
        acordoId: string,
        valorFinalAcordo: number
    ) => {
        if (!checkConfig() || !configuracoes) return;
        const doc = new jsPDF(); const hoje = formatDateForPDF(new Date()); const config = configuracoes;
        const cliente = debitosOriginais[0]; // Assume all from same client
        const logoUrl = config.logoUrl; const logoDim = 25; const margin = 14; let headerY = 20;

        const drawHeader = () => { 
            let textX = margin; let textY = headerY;
            if (logoUrl) { try { const img = new Image(); img.src = logoUrl; const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG"; if (imageType === "PNG" || imageType === "JPEG") { doc.addImage(img, imageType, margin, textY - 5, logoDim, logoDim); textX += logoDim + 8; textY += 4; } } catch (e) { console.error("Error adding logo to PDF:", e); } }
            doc.setFontSize(14); doc.text(config.nomeFantasia || config.razaoSocial, textX, textY); textY += 6;
            doc.setFontSize(10); doc.text(`CNPJ: ${config.cnpj}`, textX, textY); textY += 5;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY); textY += 5;
            headerY = textY + 8;
        };
        drawHeader();

        doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text("TERMO DE ACORDO DE DÍVIDA", 105, headerY, { align: 'center' }); headerY += 8;
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`Acordo ID: ${acordoId}`, margin, headerY); headerY += 5;
        doc.text(`Data do Acordo: ${hoje}`, margin, headerY); headerY += 8;

        doc.setFontSize(11);
        doc.text(`Entre: ${config.razaoSocial} (CNPJ: ${config.cnpj}), doravante denominada CREDORA,`, margin, headerY); headerY += 6;
        doc.text(`E: ${cliente.clienteNome} (CNPJ: ${cliente.clienteCnpj || 'N/A'}), doravante denominado(a) DEVEDOR(A),`, margin, headerY); headerY += 8;
        
        doc.text("Fica estabelecido o presente acordo para quitação dos débitos listados abaixo:", margin, headerY); headerY += 8;

        const totalOriginal = debitosOriginais.reduce((sum, d) => sum + d.valor, 0);
        const totalJuros = debitosOriginais.reduce((sum, d) => sum + (d.jurosCalculado || 0), 0);
        const totalAtualAntesDesconto = totalOriginal + totalJuros;

        autoTable(doc, {
            startY: headerY,
            head: [['Protocolo Original', 'Descrição', 'Venc. Original', 'Valor Original', 'Juros Aplicados', 'Valor Atualizado']],
            body: debitosOriginais.map(d => [
                d.id,
                d.descricao,
                formatDateForPDF(d.dataVencimento),
                d.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
                (d.jurosCalculado || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
                (d.valor + (d.jurosCalculado || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
            ]),
            theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, margin: { left: margin, right: margin },
        });
        headerY = (doc as any).lastAutoTable.finalY + 8;

        doc.text(`Soma dos Valores Originais: ${totalOriginal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, margin, headerY); headerY +=6;
        doc.text(`Soma dos Juros Aplicados: ${totalJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, margin, headerY); headerY +=6;
        doc.text(`Total Atualizado (Antes do Desconto): ${totalAtualAntesDesconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, margin, headerY); headerY +=6;
        if (acordoData.desconto && acordoData.desconto > 0) {
            doc.text(`Desconto Concedido: ${(acordoData.desconto).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, margin, headerY); headerY +=6;
        }
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Final do Acordo: ${valorFinalAcordo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, margin, headerY); headerY +=8;
        doc.setFont(undefined, 'normal');

        doc.text(`O valor final será pago em ${acordoData.numeroParcelas} parcela(s), conforme detalhamento abaixo:`, margin, headerY); headerY +=8;

        autoTable(doc, {
            startY: headerY,
            head: [['Nº Parcela', 'Data Vencimento', 'Valor da Parcela']],
            body: parcelas.map((p, index) => [
                `${index + 1}/${acordoData.numeroParcelas}`,
                formatDateForPDF(p.dataVencimento),
                p.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
            ]),
            theme: 'grid', headStyles: { fillColor: [50, 100, 150] }, margin: { left: margin, right: margin },
        });
        headerY = (doc as any).lastAutoTable.finalY + 8;

        if(acordoData.observacoes) {
            doc.text(`Observações do Acordo: ${acordoData.observacoes}`, margin, headerY, {maxWidth: 180}); headerY +=10;
        }

        doc.text("O não pagamento de qualquer parcela na data aprazada implicará no vencimento antecipado das demais e na aplicação das medidas cabíveis para cobrança do saldo devedor.", margin, headerY, {maxWidth: 180}); headerY+=15;

        headerY += 20; // Space for signatures
        doc.text("_________________________                     _________________________", 105, headerY, {align: 'center'}); headerY +=6;
        doc.text(`${config.razaoSocial} (CREDORA)                                         ${cliente.clienteNome} (DEVEDOR(A))`, 105, headerY, {align: 'center'});

        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1); doc.line(margin, pageHeight - 15, 196, pageHeight - 15);
        doc.setFontSize(8); doc.text(`${config.razaoSocial} - ${config.cnpj}`, 105, pageHeight - 10, { align: 'center' });

        doc.save(`Termo_Acordo_${acordoId}_${cliente.clienteNome.replace(/[\s.]+/g, '_')}.pdf`);
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                 <h2 className="text-2xl font-semibold">Módulo Financeiro</h2>
                 <div className="flex gap-2 flex-wrap">
                    <Dialog open={isAcordoDialogOpen} onOpenChange={setIsAcordoDialogOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" onClick={handleOpenAcordoDialog} disabled={selectedDebitos.size === 0 || loading || loadingConfig}>
                                <Handshake className="mr-2 h-4 w-4" /> Criar Acordo
                            </Button>
                        </DialogTrigger>
                        {/* AcordoFormDialog content below */}
                         <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Acordo de Dívida</DialogTitle>
                                <DialogDescription>
                                    Cliente: {debitosParaAcordo.length > 0 ? debitosParaAcordo[0].clienteNome : 'N/A'}<br/>
                                    Débitos selecionados: {debitosParaAcordo.length}
                                </DialogDescription>
                            </DialogHeader>
                            <AcordoFormDialog
                                debitos={debitosParaAcordo}
                                config={configuracoes}
                                onSubmit={handleAcordoSubmit}
                                isSubmitting={isSubmittingAcordo}
                                form={acordoForm}
                                formatCurrencyInput={formatCurrencyInput}
                            />
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isDebitoAvulsoDialogOpen} onOpenChange={setIsDebitoAvulsoDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"> <PlusCircle className="mr-2 h-4 w-4" /> Lançar Débito Avulso </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[525px]">
                            <DialogHeader> <DialogTitle>Lançar Novo Débito Avulso</DialogTitle> <DialogDescription> Preencha as informações para criar um novo débito manualmente. </DialogDescription> </DialogHeader>
                            <Form {...debitoAvulsoForm}>
                                <form onSubmit={debitoAvulsoForm.handleSubmit(handleDebitoAvulsoSubmit)} className="space-y-4 py-4">
                                    <FormField control={debitoAvulsoForm.control} name="clienteNome" render={({ field }) => ( <FormItem> <FormLabel>Nome do Cliente*</FormLabel> <Select onValueChange={(value) => { field.onChange(value); const selectedClient = clients.find(c => c.name === value); if (selectedClient) { debitoAvulsoForm.setValue('clienteCnpj', selectedClient.cnpj, { shouldValidate: true }); } else { debitoAvulsoForm.setValue('clienteCnpj', '', { shouldValidate: true }); } }} value={field.value} disabled={isSubmittingDebitoAvulso || loadingClients} > <FormControl> <SelectTrigger> <SelectValue placeholder="Selecione um cliente ou digite um novo" /> </SelectTrigger> </FormControl> <SelectContent> {loadingClients ? ( <SelectItem value="loading" disabled>Carregando clientes...</SelectItem> ) : ( clients.map(client => ( <SelectItem key={client.id} value={client.name}> {client.name} ({client.cnpj}) </SelectItem> )) )} </SelectContent> </Select> <FormDescription>Você pode selecionar um cliente existente (CNPJ será preenchido) ou digitar um novo nome.</FormDescription> <Input placeholder="Ou digite o nome do cliente" value={field.value} onChange={(e) => { field.onChange(e.target.value); if (!clients.some(c => c.name === e.target.value)) { debitoAvulsoForm.setValue('clienteCnpj', '', { shouldValidate: true }); } }} className="mt-1" disabled={isSubmittingDebitoAvulso} /> <FormMessage /> </FormItem> )}/>
                                    <FormField control={debitoAvulsoForm.control} name="clienteCnpj" render={({ field }) => ( <FormItem> <FormLabel>CNPJ do Cliente</FormLabel> <FormControl> <Input placeholder="XX.XXX.XXX/XXXX-XX (Opcional)" {...field} onChange={(e) => field.onChange(formatCnpjInput(e.target.value))} disabled={isSubmittingDebitoAvulso} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={debitoAvulsoForm.control} name="descricao" render={({ field }) => ( <FormItem> <FormLabel>Descrição do Débito*</FormLabel> <FormControl> <Textarea placeholder="Ex: Consultoria XYZ, Taxa de Serviço..." {...field} disabled={isSubmittingDebitoAvulso} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={debitoAvulsoForm.control} name="valor" render={({ field }) => ( <FormItem> <FormLabel>Valor do Débito*</FormLabel> <FormControl> <Input type="text" placeholder="R$ 0,00" value={field.value !== undefined ? formatCurrencyInput(field.value.toString()) : ''} onChange={(e) => { const rawValue = e.target.value; const cleaned = rawValue.replace(/\D/g, ''); if (cleaned === '') { field.onChange(undefined); } else { const numValue = parseFloat(cleaned) / 100; field.onChange(isNaN(numValue) ? undefined : numValue); } }} onBlur={(e) => { if (field.value !== undefined) { e.target.value = formatCurrencyInput(field.value.toString()); } }} disabled={isSubmittingDebitoAvulso} inputMode="decimal" /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={debitoAvulsoForm.control} name="dataVencimento" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Data de Vencimento*</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> 
                                        <Button variant={"outline"} className={cn( "w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground" )} disabled={isSubmittingDebitoAvulso} > 
                                            <span className="flex w-full items-center justify-between">
                                                <span>
                                                    {field.value ? ( format(field.value, "dd/MM/yyyy", { locale: ptBR }) ) : ( "Selecione a data" )}
                                                </span>
                                                <CalendarIcon className="h-4 w-4 opacity-50" />
                                            </span>
                                        </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < startOfDay(new Date()) || isSubmittingDebitoAvulso } initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                                    <DialogFooter> <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingDebitoAvulso}>Cancelar</Button></DialogClose> <Button type="submit" disabled={isSubmittingDebitoAvulso}> {isSubmittingDebitoAvulso && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Adicionar Débito </Button> </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                 </div>
            </div>
            <p className="text-muted-foreground">Gerencie os débitos gerados a partir das licitações homologadas e avulsos.</p>

            <Card>
                <CardHeader className="pb-2"> <CardTitle className="text-lg flex items-center gap-2"> <Filter className="h-5 w-5" /> Filtros ({activeTab === 'pendentes' ? 'Pendentes' : 'Processados'}) </CardTitle> </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <Input placeholder="Filtrar por Cliente ou CNPJ..." value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)} />
                        <Input placeholder="Filtrar por Licitação ou Prot..." value={filterLicitacao} onChange={(e) => setFilterLicitacao(e.target.value)} />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <span className="flex w-full items-center justify-between">
                                        <span>
                                            <CalendarIcon className="mr-2 h-4 w-4 inline-block" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>{format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                                                ) : (
                                                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                                                )
                                            ) : (
                                                "Data Referência"
                                            )}
                                        </span>
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ptBR} />
                            </PopoverContent>
                        </Popover>
                        <div></div> <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-primary lg:justify-self-end"> <X className="mr-2 h-4 w-4" /> Limpar Filtros </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <TabsList>
                        <TabsTrigger value="pendentes">Pendentes ({allDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').length})</TabsTrigger>
                        <TabsTrigger value="processados">Processados ({allDebitos.filter(d => d.status === 'PAGO' || d.status === 'ENVIADO_FINANCEIRO' || d.status === 'PAGO_VIA_ACORDO').length})</TabsTrigger>
                    </TabsList>
                    {activeTab === 'pendentes' && (
                        <div className="flex gap-2 flex-wrap">
                             <Button variant="secondary" onClick={handleSendBatch} disabled={loading || loadingConfig || selectedDebitos.size === 0 || isSendingBatch}> {isSendingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} {isSendingBatch ? 'Enviando...' : `Enviar Selecionados (${selectedDebitos.size})`} </Button>
                            <Button variant="outline" onClick={generatePendingReportPDF} disabled={loading || loadingConfig || filteredDebitos.filter(d => d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').length === 0}> <Download className="mr-2 h-4 w-4" /> Relatório Pendências (PDF) </Button>
                            <Select onValueChange={generateCollectionPDF} disabled={loading || loadingConfig || clientsWithPendingDebits.length === 0}> <SelectTrigger className="w-full sm:w-[280px]"> <SelectValue placeholder="Gerar Cobrança por Cliente (PDF)" /> </SelectTrigger> <SelectContent> {loadingConfig ? ( <SelectItem value="loading" disabled>Carregando...</SelectItem> ) : clientsWithPendingDebits.length > 0 ? ( clientsWithPendingDebits.sort().map(cliente => ( <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem> )) ) : ( <SelectItem value="no-clients" disabled>Nenhum cliente com pendências</SelectItem> )} </SelectContent> </Select>
                        </div>
                    )}
                </div>
                <TabsContent value="pendentes">
                    <Card> <CardHeader> <CardTitle>Débitos Pendentes</CardTitle> <CardDescription>Débitos aguardando ação financeira.</CardDescription> </CardHeader> <CardContent> <FinancialTable debitos={filteredDebitos} loading={loading} updatingStatus={updatingStatus} onUpdateStatus={handleUpdateStatus} onGenerateInvoice={generateInvoicePDF} onGenerateReceipt={generateReceiptPDF} showActions={true} actionsDisabled={loadingConfig || isSendingBatch} selectedDebitos={selectedDebitos} onSelectDebito={handleSelectDebito} onSelectAll={handleSelectAll} isAllSelected={isAllSelected} calculateInterest={calculateInterest} /> </CardContent> </Card>
                </TabsContent>
                <TabsContent value="processados">
                    <Card> <CardHeader> <CardTitle>Débitos Processados</CardTitle> <CardDescription>Histórico de débitos baixados ou enviados.</CardDescription> </CardHeader> <CardContent> <FinancialTable debitos={filteredDebitos} loading={loading} updatingStatus={{}} onUpdateStatus={() => { }} onGenerateInvoice={generateInvoicePDF} onGenerateReceipt={generateReceiptPDF} showActions={false} actionsDisabled={loadingConfig} selectedDebitos={new Set()} onSelectDebito={() => {}} onSelectAll={() => {}} isAllSelected={false} calculateInterest={calculateInterest}/> </CardContent> </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

interface FinancialTableProps {
    debitos: Debito[]; loading: boolean; updatingStatus: { [key: string]: boolean };
    onUpdateStatus: (id: string, status: 'PAGO' | 'ENVIADO_FINANCEIRO') => void;
    onGenerateInvoice: (debito: Debito) => void; onGenerateReceipt: (debito: Debito) => void;
    showActions: boolean; actionsDisabled?: boolean; selectedDebitos: Set<string>;
    onSelectDebito: (id: string, checked: boolean) => void; onSelectAll: (checked: boolean) => void;
    isAllSelected: boolean; calculateInterest: (debito: Debito) => number;
}

function FinancialTable({ debitos, loading, updatingStatus, onUpdateStatus, onGenerateInvoice, onGenerateReceipt, showActions, actionsDisabled = false, selectedDebitos, onSelectDebito, onSelectAll, isAllSelected, calculateInterest }: FinancialTableProps) {
    const formatDate = (date: Date | string | undefined | null): string => {
        const parsed = parseAndValidateDate(date);
        if (!parsed) return 'N/A';
        return format(parsed, "dd/MM/yyyy", { locale: ptBR });
    };

    const getDisplayValue = (debito: Debito) => {
        const juros = calculateInterest(debito);
        const valorComJuros = debito.valor + juros;
        if (juros > 0) {
            return (
                <div className="flex flex-col items-end">
                    <span>{valorComJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span className="text-xs text-destructive"> (Principal: {debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                </div>
            );
        }
        return debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };


    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader> 
                    <TableRow> 
                        {showActions && (<TableHead className="w-[50px]"><Checkbox checked={isAllSelected} onCheckedChange={(checked) => onSelectAll(Boolean(checked))} aria-label="Selecionar todos" disabled={loading || debitos.filter(d=> d.status === 'PENDENTE' || d.status === 'ACORDO_PARCELA').length === 0}/></TableHead>)} 
                        <TableHead className="w-[120px]">Protocolo</TableHead> 
                        <TableHead>Cliente</TableHead> 
                        <TableHead>Descrição</TableHead> 
                        <TableHead>Data Referência</TableHead> 
                        <TableHead>Vencimento</TableHead> 
                        <TableHead className="text-right">Valor</TableHead> 
                        <TableHead>Status</TableHead> 
                        <TableHead className="text-right w-[200px]">Ações</TableHead> 
                    </TableRow> 
                </TableHeader>
                <TableBody>
                    {loading ? ( <TableRow><TableCell colSpan={showActions ? 9 : 8} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow> ) :
                     debitos.length > 0 ? ( debitos.map(debito => {
                            const isLoading = updatingStatus[debito.id]; const statusInfo = statusFinanceiroMap[debito.status]; const isSelected = selectedDebitos.has(debito.id);
                            const canSelect = debito.status === 'PENDENTE' || debito.status === 'ACORDO_PARCELA';
                            return (
                                <TableRow key={debito.id} data-state={isSelected ? "selected" : ""}>
                                     {showActions && ( <TableCell><Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectDebito(debito.id, Boolean(checked))} aria-label={`Selecionar débito ${debito.id}`} disabled={actionsDisabled || !canSelect}/> </TableCell> )}
                                    <TableCell className="font-medium">{debito.id}</TableCell> 
                                    <TableCell>{debito.clienteNome}</TableCell> 
                                    <TableCell>{debito.descricao}</TableCell> 
                                    <TableCell>{formatDate(debito.dataReferencia)}</TableCell> 
                                    <TableCell>{formatDate(debito.dataVencimento)}</TableCell>
                                    <TableCell className="text-right">{getDisplayValue(debito)}</TableCell>
                                    <TableCell> {statusInfo ? ( <Badge variant={getBadgeVariantFinanceiro(statusInfo.color)} className="flex items-center gap-1 w-fit whitespace-nowrap"> <statusInfo.icon className="h-3 w-3" /> {statusInfo.label} </Badge> ) : ( <Badge variant="outline"> {debito.status || 'Desconhecido'} </Badge> )} </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => onGenerateInvoice(debito)} title="Gerar Fatura PDF" disabled={actionsDisabled}> {actionsDisabled && isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} </Button>
                                        {(debito.status === 'PAGO' || debito.status === 'PAGO_VIA_ACORDO') && ( <Button variant="outline" size="sm" onClick={() => onGenerateReceipt(debito)} title="Gerar Recibo PDF" disabled={actionsDisabled}> {actionsDisabled && isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} </Button> )}
                                        {showActions && (debito.status === 'PENDENTE' || debito.status === 'ACORDO_PARCELA') && ( <> <Button variant="default" size="sm" onClick={() => onUpdateStatus(debito.id, 'PAGO')} disabled={isLoading || actionsDisabled} title="Marcar como Pago (Baixar)"> {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} </Button> </> )}
                                    </TableCell>
                                </TableRow> );
                        }) ) : ( <TableRow><TableCell colSpan={showActions ? 9 : 8} className="text-center text-muted-foreground h-24">Nenhum débito encontrado para esta visualização.</TableCell></TableRow> )}
                </TableBody>
            </Table>
        </div> );
}


interface AcordoFormDialogProps {
    debitos: (Debito & { jurosCalculado?: number })[]; // Debits with pre-calculated interest
    config: ConfiguracoesFormValues | null;
    onSubmit: (data: AcordoFormData) => Promise<void>;
    isSubmitting: boolean;
    form: any; // react-hook-form useForm return type
    formatCurrencyInput: (value: string | undefined) => string; // Added prop
}

function AcordoFormDialog({ debitos, config, onSubmit, isSubmitting, form, formatCurrencyInput }: AcordoFormDialogProps) {
    const { control, watch, setValue } = form;
    const numeroParcelas = watch('numeroParcelas');
    const desconto = watch('desconto') || 0;
    const dataVencimentoPrimeiraParcela = watch('dataVencimentoPrimeiraParcela');
    const tipoParcelamento = watch('tipoParcelamento');

    const { valorOriginalTotal, jurosTotal, valorAtualTotal } = useMemo(() => {
        let original = 0;
        let juros = 0;
        debitos.forEach(d => {
            original += d.valor;
            juros += d.jurosCalculado || 0;
        });
        return { valorOriginalTotal: original, jurosTotal: juros, valorAtualTotal: original + juros };
    }, [debitos]);

    const valorFinalAcordo = valorAtualTotal - desconto;
    const valorParcela = numeroParcelas > 0 ? parseFloat((valorFinalAcordo / numeroParcelas).toFixed(2)) : 0;

    const parcelasPreview = useMemo(() => {
        if (!dataVencimentoPrimeiraParcela || numeroParcelas < 1 || valorParcela <=0) return [];
        const installments = [];
        let currentDate = startOfDay(new Date(dataVencimentoPrimeiraParcela));
        for (let i = 0; i < numeroParcelas; i++) {
            installments.push({
                numero: i + 1,
                dataVencimento: new Date(currentDate), // Clone date
                valor: valorParcela,
            });
            if (i < numeroParcelas -1) { // Don't advance date for the last installment if it's unique
                 switch (tipoParcelamento) {
                    case 'mensal': currentDate = addMonths(currentDate, 1); break;
                    case 'quinzenal': currentDate = addDays(currentDate, 15); break;
                    case 'semanal': currentDate = addWeeks(currentDate, 1); break;
                }
            }
        }
         // Adjust last installment for rounding differences
        if (numeroParcelas > 0 && installments.length > 0) {
            const totalParceladoCalculado = installments.reduce((sum, p) => sum + p.valor, 0);
            const diferenca = valorFinalAcordo - totalParceladoCalculado;
            if (Math.abs(diferenca) > 0.001) {
                installments[installments.length - 1].valor += diferenca;
                 installments[installments.length - 1].valor = parseFloat(installments[installments.length - 1].valor.toFixed(2));
            }
        }
        return installments;
    }, [numeroParcelas, valorParcela, dataVencimentoPrimeiraParcela, tipoParcelamento, valorFinalAcordo]);


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                <div className="p-4 border rounded-md bg-muted/50 space-y-1">
                    <p className="text-sm">Total Original Débitos: <span className="font-semibold">{valorOriginalTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span></p>
                    <p className="text-sm">Total Juros Acumulados: <span className="font-semibold">{jurosTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span></p>
                    <p className="text-md font-bold">Valor Total Atualizado: {valorAtualTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                </div>

                 {valorFinalAcordo < 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Valor do Desconto Inválido</AlertTitle>
                        <AlertDescription>O desconto não pode ser maior que o valor total atualizado.</AlertDescription>
                    </Alert>
                )}


                <FormField control={control} name="desconto" render={({ field }) => (
                    <FormItem> <FormLabel>Valor do Desconto</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="R$ 0,00"
                                value={field.value !== undefined ? formatCurrencyInput(field.value.toString()) : ''}
                                onChange={(e) => { const rawValue = e.target.value; const cleaned = rawValue.replace(/\D/g, ''); if (cleaned === '') { field.onChange(undefined); } else { const numValue = parseFloat(cleaned) / 100; field.onChange(isNaN(numValue) ? undefined : numValue); } }}
                                onBlur={(e) => { if (field.value !== undefined) { e.target.value = formatCurrencyInput(field.value.toString()); } }}
                                disabled={isSubmitting} inputMode="decimal"
                            />
                        </FormControl> <FormMessage />
                    </FormItem> )}/>

                <div className="p-2 border rounded-md">
                     <p className="text-lg font-bold text-primary">Valor Final do Acordo: {valorFinalAcordo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="numeroParcelas" render={({ field }) => (
                        <FormItem> <FormLabel>Número de Parcelas*</FormLabel>
                            <FormControl> <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} disabled={isSubmitting}/> </FormControl> <FormMessage />
                        </FormItem> )}/>
                    <FormField control={control} name="tipoParcelamento" render={({ field }) => (
                        <FormItem> <FormLabel>Frequência Parcelas*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="unica">Única</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                </SelectContent>
                            </Select> <FormMessage />
                        </FormItem> )}/>
                </div>
                 <FormField control={control} name="dataVencimentoPrimeiraParcela" render={({ field }) => (
                    <FormItem className="flex flex-col"> <FormLabel>Vencimento 1ª Parcela*</FormLabel>
                        <Popover> <PopoverTrigger asChild> 
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")} disabled={isSubmitting}>
                                <span className="flex w-full items-center justify-between">
                                    <span>
                                        {field.value ? format(new Date(field.value), "dd/MM/yyyy", {locale: ptBR}) : "Selecione a data"}
                                    </span>
                                    <CalendarIcon className="h-4 w-4 opacity-50"/>
                                </span>
                            </Button>
                        </FormControl>
                         </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(date) => date < startOfDay(new Date()) || isSubmitting} initialFocus/>
                        </PopoverContent> </Popover> <FormMessage/>
                    </FormItem> )}/>

                {parcelasPreview.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="text-md font-medium">Visualização das Parcelas:</h4>
                        <Table className="text-xs">
                            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {parcelasPreview.map(p => (
                                    <TableRow key={p.numero}>
                                        <TableCell>{p.numero}</TableCell>
                                        <TableCell>{format(p.dataVencimento, "dd/MM/yyyy", {locale: ptBR})}</TableCell>
                                        <TableCell className="text-right">{p.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                <FormField control={control} name="observacoes" render={({ field }) => (
                    <FormItem> <FormLabel>Observações do Acordo</FormLabel>
                        <FormControl> <Textarea placeholder="Detalhes adicionais sobre o acordo..." {...field} disabled={isSubmitting}/> </FormControl> <FormMessage />
                    </FormItem> )}/>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting || valorFinalAcordo < 0}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Acordo </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
