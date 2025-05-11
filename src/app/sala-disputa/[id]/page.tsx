
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Loader2, Play, StopCircle, AlertCircle, Check, X, Percent, FileText, Info, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchLicitacaoDetails, updateLicitacao, type LicitacaoDetails, type DisputaConfig, type DisputaLog, formatElapsedTime, statusMap } from '@/services/licitacaoService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, isValid, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format currency for display
const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper to parse currency string to number
const parseCurrency = (value: string): number | undefined => {
    if (!value) return undefined;
    if (value.trim() === '0' || value.trim() === 'R$ 0,00' || value.replace(/[^0-9,]/g, '') === '0') return 0;
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
};


export default function DisputaIndividualPage() {
  const params = useParams();
  const router = useRouter();
  const idLicitacao = params.id as string;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [licitacao, setLicitacao] = useState<LicitacaoDetails | null>(null);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limiteTipo, setLimiteTipo] = useState<'valor' | 'percentual'>('valor');
  const [limiteInput, setLimiteInput] = useState<string>(''); // Stores raw input (e.g., "10000" or "10%")
  const [valorCalculadoLimite, setValorCalculadoLimite] = useState<number | undefined>(undefined);
  const [valorTotalLicitacaoInput, setValorTotalLicitacaoInput] = useState<string>('');


  const [elapsedTime, setElapsedTime] = useState<number>(0); // In seconds
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [isOutcomeDialogOpen, setIsOutcomeDialogOpen] = useState(false);
  const [clienteVenceu, setClienteVenceu] = useState<boolean | undefined>(undefined);
  const [posicaoCliente, setPosicaoCliente] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);


  const calculateLimiteCliente = useCallback(() => {
    const valorTotalNum = parseCurrency(valorTotalLicitacaoInput);
    if (valorTotalNum === undefined || valorTotalNum < 0) {
      setValorCalculadoLimite(undefined);
      return;
    }

    if (limiteTipo === 'valor') {
      const limiteVal = parseCurrency(limiteInput);
      setValorCalculadoLimite(limiteVal);
    } else if (limiteTipo === 'percentual') {
      const percentual = parseFloat(limiteInput.replace('%', ''));
      if (!isNaN(percentual) && percentual >= 0 && percentual <= 100) {
        setValorCalculadoLimite(valorTotalNum - (valorTotalNum * (percentual / 100)));
      } else {
        setValorCalculadoLimite(undefined);
      }
    }
  }, [valorTotalLicitacaoInput, limiteTipo, limiteInput]);

  useEffect(() => {
    calculateLimiteCliente();
  }, [valorTotalLicitacaoInput, limiteTipo, limiteInput, calculateLimiteCliente]);


  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [licDetails, configData] = await Promise.all([
          fetchLicitacaoDetails(idLicitacao),
          fetchConfiguracoes()
        ]);

        if (!licDetails) {
          setError('Licitação não encontrada.');
          setLoading(false);
          return;
        }
        setLicitacao(licDetails);
        setConfiguracoes(configData);

        // Initialize form fields from licitacao data
        setValorTotalLicitacaoInput(formatCurrency(licDetails.valorTotalLicitacao));
        if (licDetails.disputaConfig?.limiteTipo) {
            setLimiteTipo(licDetails.disputaConfig.limiteTipo);
            if (licDetails.disputaConfig.limiteTipo === 'valor' && licDetails.disputaConfig.limiteValor !== undefined) {
                setLimiteInput(formatCurrency(licDetails.disputaConfig.limiteValor));
            } else if (licDetails.disputaConfig.limiteTipo === 'percentual' && licDetails.disputaConfig.limiteValor !== undefined) {
                setLimiteInput(`${licDetails.disputaConfig.limiteValor}%`);
            }
            setValorCalculadoLimite(licDetails.disputaConfig.valorCalculadoAteOndePodeChegar);
        }


        // Timer logic
        if (licDetails.status === 'EM_DISPUTA' && licDetails.disputaLog?.iniciadaEm) {
          const startTime = licDetails.disputaLog.iniciadaEm instanceof Date
            ? licDetails.disputaLog.iniciadaEm
            : parseISO(licDetails.disputaLog.iniciadaEm as string);

          if (isValid(startTime)) {
            const now = new Date();
            const initialElapsedTime = differenceInSeconds(now, startTime);
            setElapsedTime(initialElapsedTime > 0 ? initialElapsedTime : 0);

            const interval = setInterval(() => {
              setElapsedTime(prevTime => prevTime + 1);
            }, 1000);
            setTimerIntervalId(interval);
          }
        }


      } catch (err) {
        console.error('Erro ao carregar dados da disputa:', err);
        setError(`Falha ao carregar dados. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Cleanup timer on unmount
    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
    };
  }, [idLicitacao]);

  const handleIniciarDisputa = async () => {
    if (!licitacao || licitacao.status === 'EM_DISPUTA') return;

    const valorTotalNum = parseCurrency(valorTotalLicitacaoInput);
    if (valorTotalNum === undefined || valorTotalNum < 0) {
        toast({ title: "Erro", description: "Valor Total da Licitação é inválido.", variant: "destructive" });
        return;
    }
    if (valorCalculadoLimite === undefined) {
        toast({ title: "Erro", description: "Limite do cliente (valor ou percentual) é inválido ou não definido.", variant: "destructive" });
        return;
    }


    setIsSubmitting(true);
    const disputaConfig: DisputaConfig = {
        limiteTipo: limiteTipo,
        limiteValor: limiteTipo === 'valor' ? parseCurrency(limiteInput) : parseFloat(limiteInput.replace('%', '')),
        valorCalculadoAteOndePodeChegar: valorCalculadoLimite
    };
    const disputaLog: DisputaLog = {
        iniciadaEm: new Date()
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'EM_DISPUTA',
        valorTotalLicitacao: valorTotalNum, // Save potentially updated valorTotal
        disputaConfig,
        disputaLog
      });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, status: 'EM_DISPUTA', valorTotalLicitacao: valorTotalNum, disputaConfig, disputaLog } : null);
        toast({ title: "Sucesso", description: "Disputa iniciada." });
        // Start timer
        const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        setTimerIntervalId(interval);
      } else {
        throw new Error("Falha ao atualizar status para Em Disputa.");
      }
    } catch (err) {
      toast({ title: "Erro", description: `Não foi possível iniciar a disputa. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizarDisputa = () => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    setTimerIntervalId(null);
    setIsOutcomeDialogOpen(true);
  };

  const handleOutcomeSubmit = async () => {
    if (!licitacao || clienteVenceu === undefined || (clienteVenceu === false && !posicaoCliente.trim())) {
        toast({ title: "Atenção", description: "Preencha o resultado da disputa.", variant: "warning" });
        return;
    }
    setIsSubmitting(true);
    const finalizadaEm = new Date();
    const duracao = formatElapsedTime(elapsedTime);

    const disputaLogUpdate: DisputaLog = {
        ...licitacao.disputaLog,
        finalizadaEm,
        duracao,
        clienteVenceu,
        posicaoCliente: !clienteVenceu ? parseInt(posicaoCliente, 10) : undefined,
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'DISPUTA_CONCLUIDA',
        disputaLog: disputaLogUpdate
      });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, status: 'DISPUTA_CONCLUIDA', disputaLog: disputaLogUpdate } : null);
        toast({ title: "Sucesso", description: "Disputa finalizada. Gerando ata..." });
        generateAtaSessaoPDF(
            {...licitacao, status: 'DISPUTA_CONCLUIDA', disputaLog: disputaLogUpdate }, // Pass updated licitacao for PDF
            configuracoes,
            currentUser
        );
        setIsOutcomeDialogOpen(false);
        // Optionally redirect or show success message
        // router.push('/sala-disputa');
      } else {
        throw new Error("Falha ao finalizar disputa no backend.");
      }
    } catch (err) {
      toast({ title: "Erro", description: `Não foi possível finalizar a disputa. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
       // Restart timer if save failed? Or leave it stopped?
       if (licitacao?.status === 'EM_DISPUTA' && !timerIntervalId) {
           const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
           setTimerIntervalId(interval);
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateAtaSessaoPDF = (
    lic: LicitacaoDetails,
    config: ConfiguracoesFormValues | null,
    user: { username: string; fullName?: string; cpf?: string } | null
  ) => {
      const doc = new jsPDF();
      const hoje = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const logoUrl = config?.logoUrl;
      const logoDim = 25;
      const margin = 14;
      let yPos = 20;

      // Header
      if (logoUrl) {
        try {
          const img = new Image();
          img.src = logoUrl;
          const imageType = logoUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          doc.addImage(img, imageType, margin, yPos - 5, logoDim, logoDim);
          yPos += logoDim - 5; // Adjust yPos based on logo
        } catch (e) { console.error("Error adding logo:", e); yPos += 5; }
      } else {
        yPos += 5;
      }

      doc.setFontSize(16);
      doc.text("ATA DA SESSÃO DE DISPUTA", 105, yPos, { align: 'center' });
      yPos += 10;

      // Assessoria Info
      if (config) {
        doc.setFontSize(11);
        doc.text(`Assessoria: ${config.nomeFantasia || config.razaoSocial} (CNPJ: ${config.cnpj})`, margin, yPos);
        yPos += 6;
      }
      doc.setFontSize(10);
      doc.text(`Data da Geração: ${hoje}`, margin, yPos);
      yPos += 8;
      doc.setLineWidth(0.1); doc.line(margin, yPos, 196, yPos); yPos += 8;

      // Licitação Details
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Dados da Licitação:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const addDetail = (label: string, value: string | undefined | null) => {
        if (value !== undefined && value !== null) {
          doc.text(`${label}: ${value}`, margin, yPos); yPos += 6;
        }
      };
      addDetail("Protocolo", lic.id);
      addDetail("Cliente", lic.clienteNome);
      addDetail("Número Lic.", lic.numeroLicitacao);
      addDetail("Órgão", lic.orgaoComprador);
      addDetail("Modalidade", lic.modalidade);
      addDetail("Plataforma", lic.plataforma);
      addDetail("Valor Total Estimado", formatCurrency(lic.valorTotalLicitacao));
      yPos += 4;

      // Disputa Config
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Configuração da Disputa (Limite Cliente):", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaConfig?.limiteTipo === 'valor') {
          addDetail("Tipo de Limite", "Valor Absoluto");
          addDetail("Valor Limite Definido", formatCurrency(lic.disputaConfig.limiteValor));
      } else if (lic.disputaConfig?.limiteTipo === 'percentual') {
          addDetail("Tipo de Limite", "Percentual");
          addDetail("Percentual Definido", `${lic.disputaConfig.limiteValor || 0}%`);
          addDetail("Valor Calculado (Pode Chegar Até)", formatCurrency(lic.disputaConfig.valorCalculadoAteOndePodeChegar));
      } else {
          addDetail("Limite Cliente", "Não definido ou não aplicável.");
      }
      yPos += 4;

      // Disputa Log
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Registro da Disputa:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      const formatDateLog = (date: Date | string | undefined) => date ? format(date instanceof Date ? date : parseISO(date as string), "dd/MM/yyyy HH:mm:ss", {locale: ptBR}) : 'N/A';
      addDetail("Início da Disputa", formatDateLog(lic.disputaLog?.iniciadaEm));
      addDetail("Fim da Disputa", formatDateLog(lic.disputaLog?.finalizadaEm));
      addDetail("Duração Total", lic.disputaLog?.duracao || 'N/A');
      yPos += 4;

      // Resultado
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text("Resultado da Disputa:", margin, yPos); yPos += 7;
      doc.setFont(undefined, 'normal'); doc.setFontSize(11);
      if (lic.disputaLog?.clienteVenceu) {
          addDetail("Resultado", "Cliente Venceu a Licitação");
      } else {
          addDetail("Resultado", "Cliente Não Venceu");
          addDetail("Posição Final do Cliente", lic.disputaLog?.posicaoCliente?.toString() || "Não informada");
      }
      yPos += 10;

      // Operador
      doc.text(`Sessão conduzida por: ${user?.fullName || user?.username || 'Usuário do Sistema'}`, margin, yPos); yPos +=6;
      if (user?.cpf) { doc.text(`CPF do Operador: ${user.cpf}`, margin, yPos); yPos +=6; }


      doc.save(`Ata_Disputa_${lic.numeroLicitacao.replace(/[^\w]/g, '_')}.pdf`);
  };


  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!licitacao) return <Alert><AlertTitle>Licitação não encontrada</AlertTitle></Alert>;

  const isDisputaAtiva = licitacao.status === 'EM_DISPUTA';
  const isDisputaConfiguravel = licitacao.status === 'AGUARDANDO_DISPUTA';
  const isDisputaFinalizada = licitacao.status === 'DISPUTA_CONCLUIDA';


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{licitacao.numeroLicitacao} - {licitacao.clienteNome}</span>
            <Badge variant={statusMap[licitacao.status]?.color as any || 'outline'}>
                {statusMap[licitacao.status]?.icon && React.createElement(statusMap[licitacao.status].icon, {className: "h-3 w-3 mr-1 inline"})}
                {statusMap[licitacao.status]?.label || licitacao.status}
            </Badge>
          </CardTitle>
          <CardDescription>{licitacao.orgaoComprador} | Plataforma: {licitacao.plataforma} | Início: {format(parseISO(licitacao.dataInicio as string), "dd/MM/yyyy HH:mm", { locale: ptBR })}</CardDescription>
        </CardHeader>

        {isDisputaConfiguravel && (
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="valorTotalLicitacao">Valor Total da Licitação (Estimado/Global)</Label>
                    <Input
                        id="valorTotalLicitacao"
                        type="text"
                        placeholder="R$ 0,00"
                        value={valorTotalLicitacaoInput}
                        onChange={(e) => setValorTotalLicitacaoInput(e.target.value)}
                        onBlur={(e) => setValorTotalLicitacaoInput(formatCurrency(parseCurrency(e.target.value)))}
                        disabled={isSubmitting}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <Label htmlFor="limiteTipo">Tipo de Limite para o Cliente</Label>
                        <Select value={limiteTipo} onValueChange={(v) => setLimiteTipo(v as any)} disabled={isSubmitting}>
                            <SelectTrigger id="limiteTipo"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="valor">Valor Absoluto (R$)</SelectItem>
                                <SelectItem value="percentual">Percentual (%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="limiteInput">
                            {limiteTipo === 'valor' ? 'Valor Limite (R$)' : 'Percentual Limite (%)'}
                        </Label>
                        <Input
                            id="limiteInput"
                            type="text"
                            placeholder={limiteTipo === 'valor' ? 'Ex: 15000.00' : 'Ex: 10 para 10%'}
                            value={limiteInput}
                            onChange={(e) => setLimiteInput(e.target.value)}
                            onBlur={(e) => {
                                if (limiteTipo === 'valor') setLimiteInput(formatCurrency(parseCurrency(e.target.value)));
                                // No specific blur format for percentage string
                            }}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                 {valorCalculadoLimite !== undefined && (
                    <Alert variant="info" className="mt-2">
                        <Info className="h-4 w-4"/>
                        <AlertTitle>Limite Calculado</AlertTitle>
                        <AlertDescription>
                            Cliente pode chegar até: <strong>{formatCurrency(valorCalculadoLimite)}</strong>
                        </AlertDescription>
                    </Alert>
                )}

            </CardContent>
        )}

        {isDisputaAtiva && licitacao.disputaConfig && (
             <CardContent className="space-y-4">
                <Alert variant="info">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>Configuração da Disputa</AlertTitle>
                    <AlertDescription>
                        Valor Total da Licitação: {formatCurrency(licitacao.valorTotalLicitacao)} <br />
                        Limite Cliente: {
                            licitacao.disputaConfig.limiteTipo === 'valor'
                            ? `${formatCurrency(licitacao.disputaConfig.limiteValor)} (Valor Absoluto)`
                            : `${licitacao.disputaConfig.limiteValor}% (Percentual)`
                        } <br />
                        Pode Chegar Até: <strong>{formatCurrency(licitacao.disputaConfig.valorCalculadoAteOndePodeChegar)}</strong>
                    </AlertDescription>
                </Alert>
                 <div className="text-center my-6">
                    <p className="text-sm text-muted-foreground">Tempo Decorrido</p>
                    <p className="text-5xl font-bold tracking-tighter">{formatElapsedTime(elapsedTime)}</p>
                 </div>
             </CardContent>
        )}

        {isDisputaFinalizada && licitacao.disputaLog && (
            <CardContent className="space-y-4">
                <Alert variant={licitacao.disputaLog.clienteVenceu ? "success" : "warning"}>
                    {licitacao.disputaLog.clienteVenceu ? <Check className="h-4 w-4"/> : <X className="h-4 w-4"/>}
                    <AlertTitle>Resultado da Disputa</AlertTitle>
                    <AlertDescription>
                        Status: {licitacao.disputaLog.clienteVenceu ? "Cliente Venceu!" : `Cliente ficou em ${licitacao.disputaLog.posicaoCliente || 'N/A'}º lugar.`} <br/>
                        Início: {formatDateLog(licitacao.disputaLog.iniciadaEm)} | Fim: {formatDateLog(licitacao.disputaLog.finalizadaEm)} <br/>
                        Duração: {licitacao.disputaLog.duracao || 'N/A'}
                    </AlertDescription>
                </Alert>
                 <div className="flex justify-end">
                     <Button variant="outline" onClick={() => generateAtaSessaoPDF(licitacao, configuracoes, currentUser)}>
                        <FileText className="mr-2 h-4 w-4" /> Gerar Ata Novamente
                    </Button>
                 </div>
            </CardContent>
        )}


        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/sala-disputa')} disabled={isSubmitting}>
            Voltar para Lista
          </Button>
          {isDisputaConfiguravel && (
            <Button onClick={handleIniciarDisputa} disabled={isSubmitting || valorCalculadoLimite === undefined || parseCurrency(valorTotalLicitacaoInput) === undefined}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Iniciar Disputa
            </Button>
          )}
          {isDisputaAtiva && (
            <Button variant="destructive" onClick={handleFinalizarDisputa} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
              Encerrar Disputa
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Outcome Dialog */}
      <Dialog open={isOutcomeDialogOpen} onOpenChange={setIsOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado da Disputa</DialogTitle>
            <DialogDescription>Informe o resultado da participação do cliente na licitação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>O cliente venceu a licitação?</Label>
              <Select onValueChange={(value) => setClienteVenceu(value === 'true')} value={clienteVenceu?.toString()}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {clienteVenceu === false && (
              <div className="space-y-2">
                <Label htmlFor="posicaoCliente">Qual a posição final do cliente?</Label>
                <Input
                  id="posicaoCliente"
                  type="number"
                  min="1"
                  placeholder="Ex: 2, 3, etc."
                  value={posicaoCliente}
                  onChange={(e) => setPosicaoCliente(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
            <Button onClick={handleOutcomeSubmit} disabled={isSubmitting || clienteVenceu === undefined || (clienteVenceu === false && !posicaoCliente.trim())}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to format date logs, placed outside component for reuse if needed
const formatDateLog = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    try {
        const dateObj = date instanceof Date ? date : parseISO(date as string);
        return isValid(dateObj) ? format(dateObj, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : 'Data Inválida';
    } catch { return 'Data Inválida';}
};

