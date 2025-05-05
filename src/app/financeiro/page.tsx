
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
import { DateRange } from 'react-day-picker'; // Import DateRange type
import { Download, FileText, Filter, Loader2, Send, CheckCircle, Clock, CalendarIcon, X, Receipt } from 'lucide-react'; // Import icons + Receipt
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addMonths, setDate } from 'date-fns'; // Updated date-fns imports
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import for autoTable
import { useToast } from '@/hooks/use-toast';
import type { ConfiguracoesFormValues } from '@/components/configuracoes/configuracoes-form'; // Import settings type
import { fetchDebitos, updateDebitoStatus, type Debito } from '@/services/licitacaoService'; // Import from licitacaoService
import { fetchConfiguracoes } from '@/services/configuracoesService'; // Import config service


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
    const { toast } = useToast();


    // Fetch data on mount (Debits and Config)
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setLoadingConfig(true);
            try {
                // Fetch debits generated from licitacoes service
                const [debitosData, configData] = await Promise.all([
                    fetchDebitos(),
                    fetchConfiguracoes() // Use service to fetch configs
                ]);
                setAllDebitos(debitosData); // Store all fetched data
                setFilteredDebitos(debitosData); // Initialize filtered list
                setConfiguracoes(configData);
            } catch (err) {
                console.error('Erro ao carregar dados financeiros ou configurações:', err);
                toast({ title: "Erro", description: `Falha ao carregar dados financeiros ou configurações. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
            } finally {
                setLoading(false);
                setLoadingConfig(false);
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
                d.clienteCnpj.includes(filterCliente) // Allow filtering by CNPJ as well
            );
        }

        // 3. Filter by Licitação/Protocolo
        if (filterLicitacao) {
            result = result.filter(d =>
                d.licitacaoNumero.toLowerCase().includes(filterLicitacao.toLowerCase()) ||
                d.id.toLowerCase().includes(filterLicitacao.toLowerCase()) // Allow filtering by protocol ID
            );
        }

        // 4. Filter by Date Range (Data Homologação)
        if (dateRange?.from) {
            const start = startOfDay(dateRange.from);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from); // Use end of 'from' day if 'to' is not set
            result = result.filter(d => {
                try {
                    const homologacaoDate = typeof d.dataHomologacao === 'string' ? parseISO(d.dataHomologacao) : d.dataHomologacao;
                    // Ensure homologacaoDate is a valid Date before comparison
                    if (!(homologacaoDate instanceof Date) || isNaN(homologacaoDate.getTime())) {
                        console.warn(`Invalid homologacaoDate for debit ${d.id}:`, d.dataHomologacao);
                        return false;
                    }
                    return isWithinInterval(homologacaoDate, { start, end });
                } catch (e) {
                    console.error("Error parsing homologacaoDate during filtering:", d.id, e);
                    return false;
                }
            });
        }

        setFilteredDebitos(result);
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
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
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
            if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
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
        const dueDate = calculateDueDate(debito.dataHomologacao);

        // Draw Header with Logo if available
        const drawHeader = () => {
            const logoUrl = config.logoUrl;
            const logoDim = 30; // Logo dimension (height/width)
            const margin = 14;
            const initialY = 22;
            let textX = margin;
            let textY = initialY;

            if (logoUrl) {
                try {
                    const img = new Image();
                    img.src = logoUrl;
                    // Check image type for jsPDF compatibility (PNG, JPEG)
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                     if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, initialY - 8, logoDim, logoDim);
                        textX += logoDim + 10; // Add space between logo and text
                    } else {
                         console.warn("Logo format not directly supported by jsPDF, skipping logo.");
                    }
                } catch (e) {
                    console.error("Error adding logo to PDF:", e);
                }
            }

            // Advisory Info (adjust position based on logo)
            doc.setFontSize(18);
            doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
            textY += 6;
            doc.setFontSize(10);
            doc.text(`CNPJ: ${config.cnpj}`, textX, textY);
            textY += 6;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY);
            textY += 6;
            doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY);
            textY += 6;
            doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY);
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
        doc.line(14, 60, 196, 60); // Separator line below header

        // Client Info
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Cliente:", 14, 70);
        doc.setFont(undefined, 'normal');
        doc.text(`Razão Social: ${debito.clienteNome}`, 14, 77);
        doc.text(`CNPJ: ${debito.clienteCnpj}`, 14, 84);

        doc.line(14, 95, 196, 95); // Separator line

        // Debit Details Table
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Detalhes do Serviço Prestado:", 14, 105);
        doc.setFont(undefined, 'normal');
        autoTable(doc, {
            startY: 110,
            head: [['Referência', 'Descrição', 'Data Homologação', 'Valor']],
            body: [
                [
                    debito.id,
                    `Serviços de Assessoria - Licitação ${debito.licitacaoNumero}`,
                    formatDateForPDF(debito.dataHomologacao),
                    debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                ]
            ],
            theme: 'grid',
            headStyles: { fillColor: [26, 35, 126] }, // Dark blue header
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
        });

        // Total and Payment Info
        const finalY = (doc as any).lastAutoTable.finalY || 135;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total: ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Informações para Pagamento:", 14, finalY + 25);
        doc.setFont(undefined, 'normal');
        let paymentY = finalY + 30;
        if (config.banco && config.agencia && config.conta) {
            doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, 14, paymentY);
            paymentY += 5;
        }
        if (config.chavePix) {
            const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral';
            doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, 14, paymentY);
            paymentY += 5;
        } else if (config.cnpj) {
            doc.text(`PIX (CNPJ): ${config.cnpj}`, 14, paymentY);
            paymentY += 5;
        }
        doc.setFont(undefined, 'bold');
        doc.text(`Vencimento: ${formatDateForPDF(dueDate)}`, 14, paymentY + 5);

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(14, pageHeight - 20, 196, pageHeight - 20);
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

        // Draw Header with Logo
        const drawHeader = () => {
            const logoUrl = config.logoUrl;
            const logoDim = 30;
            const margin = 14;
            const initialY = 22;
            let textX = margin;
            let textY = initialY;

            if (logoUrl) {
                 try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, initialY - 8, logoDim, logoDim);
                        textX += logoDim + 10;
                    } else { console.warn("Logo format not directly supported by jsPDF.");}
                } catch (e) { console.error("Error adding logo to PDF:", e); }
            }
            // Advisory Info
            doc.setFontSize(16); // Larger title for Receipt
            doc.text(config.nomeFantasia || config.razaoSocial, textX, textY);
            textY += 6;
            doc.setFontSize(10);
            doc.text(`CNPJ: ${config.cnpj}`, textX, textY);
            textY += 6;
            doc.text(`Contato: ${config.email} / ${config.telefone}`, textX, textY);
            textY += 6;
             doc.text(`${config.enderecoRua}, ${config.enderecoNumero} ${config.enderecoComplemento || ''}`, textX, textY);
             textY += 6;
             doc.text(`${config.enderecoBairro} - ${config.enderecoCidade} - CEP: ${config.enderecoCep}`, textX, textY);
        };

        drawHeader();

        // Receipt Title & Date
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("RECIBO DE PAGAMENTO", 105, 60, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Emitido em: ${hoje}`, 196, 65, { align: 'right' });

        doc.setLineWidth(0.1);
        doc.line(14, 75, 196, 75);

        // Receipt Body
        doc.setFontSize(11);
        let currentY = 85;
        doc.text(`Recebemos de ${debito.clienteNome} (CNPJ: ${debito.clienteCnpj}),`, 14, currentY);
        currentY += 7;
        doc.text(`a importância de ${debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, referente ao pagamento`, 14, currentY);
        currentY += 7;
        doc.text(`dos serviços de assessoria prestados na licitação ${debito.licitacaoNumero} (Protocolo: ${debito.id}),`, 14, currentY);
        currentY += 7;
        doc.text(`homologada em ${formatDateForPDF(debito.dataHomologacao)}.`, 14, currentY);
        currentY += 14; // More space

        doc.text(`Data do Pagamento (Baixa): ${paymentDate}`, 14, currentY); // Placeholder payment date
        currentY += 14;

        doc.text(`Para clareza, firmamos o presente.`, 14, currentY);
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
        doc.line(14, pageHeight - 20, 196, pageHeight - 20);
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

        // Draw Header with Logo
         const drawHeader = () => {
            const logoUrl = config.logoUrl;
            const logoDim = 25; // Smaller logo for report
            const margin = 14;
            const initialY = 20;
            let textX = margin;
            let textY = initialY;

             if (logoUrl) {
                 try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, initialY - 5, logoDim, logoDim);
                        textX += logoDim + 8;
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
            doc.text(`Filtros: ${filterCliente || 'Todos Clientes'}, ${filterLicitacao || 'Todas Licitações'}, ${dateRange ? `${formatDateForPDF(dateRange.from)} a ${formatDateForPDF(dateRange.to)}` : 'Qualquer Data'}`, textX, textY);

        };
        drawHeader();

        doc.setLineWidth(0.1);
        doc.line(14, 55, 196, 55); // Separator line

        // Table
        autoTable(doc, {
            startY: 60,
            head: [['Protocolo', 'Cliente', 'CNPJ', 'Licitação', 'Data Homolog.', 'Valor Pendente']],
            body: pendingDebits.map(d => [
                d.id,
                d.clienteNome,
                d.clienteCnpj,
                d.licitacaoNumero,
                formatDateForPDF(d.dataHomologacao),
                d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            theme: 'striped',
            headStyles: { fillColor: [26, 35, 126] },
            margin: { left: 14, right: 14 },
        });

        // Total Pending
        const finalY = (doc as any).lastAutoTable.finalY || 75;
        const totalPendente = pendingDebits.reduce((sum, d) => sum + d.valor, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Pendente (Filtro Atual): ${totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(14, pageHeight - 20, 196, pageHeight - 20);
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

         // Draw Header with Logo
         const drawHeader = () => {
            const logoUrl = config.logoUrl;
            const logoDim = 25;
            const margin = 14;
            const initialY = 20;
            let textX = margin;
            let textY = initialY;

            if (logoUrl) {
                try {
                    const img = new Image();
                    img.src = logoUrl;
                    const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                    if (imageType === "PNG" || imageType === "JPEG") {
                        doc.addImage(img, imageType, margin, initialY - 5, logoDim, logoDim);
                        textX += logoDim + 8;
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
            doc.text(`Para: ${firstDebit.clienteNome} (CNPJ: ${firstDebit.clienteCnpj})`, textX, textY);
             textY += 6;
            doc.setFontSize(10);
            doc.text(`Data de Emissão: ${hoje}`, textX, textY);

        };
        drawHeader();


        doc.setLineWidth(0.1);
        doc.line(14, 60, 196, 60); // Separator line

        // Introduction Text
        doc.setFontSize(11);
        doc.text("Prezados,", 14, 70);
        doc.text(`Constam em aberto os seguintes débitos referentes aos serviços de assessoria em licitações prestados pela ${config.nomeFantasia || config.razaoSocial}:`, 14, 77, { maxWidth: 180 });


        // Table of Debits
        autoTable(doc, {
            startY: 85,
            head: [['Protocolo', 'Licitação', 'Data Homologação', 'Valor', 'Vencimento']],
            body: clientDebits.map(d => {
                const dueDate = calculateDueDate(d.dataHomologacao);
                return [
                    d.id,
                    d.licitacaoNumero,
                    formatDateForPDF(d.dataHomologacao),
                    d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    formatDateForPDF(dueDate)
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [26, 35, 126] },
            margin: { left: 14, right: 14 },
        });

        // Total and Payment Info
        const finalY = (doc as any).lastAutoTable.finalY || 110;
        const totalCliente = clientDebits.reduce((sum, d) => sum + d.valor, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total Devido: ${totalCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Informações para Pagamento:", 14, finalY + 25);
        doc.setFont(undefined, 'normal');
        let paymentYColl = finalY + 30;
        if (config.banco && config.agencia && config.conta) {
            doc.text(`Banco: ${config.banco} / Agência: ${config.agencia} / Conta: ${config.conta}`, 14, paymentYColl);
            paymentYColl += 5;
        }
        if (config.chavePix) {
            const pixType = config.cnpj && config.chavePix === config.cnpj ? 'CNPJ' : 'Geral';
            doc.text(`Chave PIX (${pixType}): ${config.chavePix}`, 14, paymentYColl);
            paymentYColl += 5;
        } else if (config.cnpj) {
            doc.text(`PIX (CNPJ): ${config.cnpj}`, 14, paymentYColl);
            paymentYColl += 5;
        }
        doc.setFont(undefined, 'normal');
        doc.text(`Solicitamos a regularização dos valores conforme vencimentos indicados na tabela acima.`, 14, paymentYColl + 5);
        doc.text(`Em caso de dúvidas, contate-nos através de ${config.email} ou ${config.telefone}.`, 14, paymentYColl + 15);


        // Footer
        const pageHeightColl = doc.internal.pageSize.height;
        doc.setLineWidth(0.1);
        doc.line(14, pageHeightColl - 20, 196, pageHeightColl - 20);
        doc.setFontSize(9);
        doc.text(config.nomeFantasia || config.razaoSocial, 105, pageHeightColl - 15, { align: 'center' });


        doc.save(`Cobranca_${firstDebit.clienteNome.replace(/[\s.]+/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`);
    }

    // Get unique client names with pending debits for the dropdown (based on filtered list)
    const clientsWithPendingDebits = Array.from(new Set(filteredDebitos.filter(d => d.status === 'PENDENTE').map(d => d.clienteNome)));

    const clearFilters = () => {
        setFilterCliente('');
        setFilterLicitacao('');
        setDateRange(undefined);
    }


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Módulo Financeiro</h2>
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
                                        <span>Data Homologação</span>
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
                            <CardDescription>Licitações homologadas aguardando ação financeira.</CardDescription>
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
                                actionsDisabled={loadingConfig}
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
                                updatingStatus={{}}
                                onUpdateStatus={() => { }}
                                onGenerateInvoice={generateInvoicePDF}
                                onGenerateReceipt={generateReceiptPDF} // Pass receipt generator
                                showActions={false}
                                actionsDisabled={loadingConfig}
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
}

function FinancialTable({ debitos, loading, updatingStatus, onUpdateStatus, onGenerateInvoice, onGenerateReceipt, showActions, actionsDisabled = false }: FinancialTableProps) {

    // Safely format dates
    const formatDate = (date: Date | string | undefined | null): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
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
                        <TableHead className="w-[120px]">Protocolo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Licitação</TableHead>
                        <TableHead>Data Homolog.</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[200px]">Ações</TableHead> {/* Increased width */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
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
                                    <TableCell>{formatDate(debito.dataHomologacao)}</TableCell>
                                    <TableCell>{debito.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>
                                        {statusInfo ? (
                                            <Badge variant={getBadgeVariantFinanceiro(statusInfo.color)} className="flex items-center gap-1 w-fit whitespace-nowrap">
                                                <statusInfo.icon className="h-3 w-3" />
                                                {statusInfo.label}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit whitespace-nowrap">
                                                 {/* Fallback icon */}
                                                <Clock className="h-3 w-3" />
                                                {debito.status || 'Desconhecido'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => onGenerateInvoice(debito)} title="Gerar Fatura PDF" disabled={actionsDisabled}>
                                            {actionsDisabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                        </Button>
                                        {/* Add Receipt Button - visible for PAID status */}
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
                                                <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(debito.id, 'ENVIADO_FINANCEIRO')} disabled={isLoading || actionsDisabled} title="Marcar como Enviado p/ Financeiro">
                                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                Nenhum débito encontrado para esta visualização.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
