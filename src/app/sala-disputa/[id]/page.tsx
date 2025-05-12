
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Loader2, Play, StopCircle, AlertCircle, Check, X, Percent, FileText, Info, MessageSquare, Send } from 'lucide-react'; // Added MessageSquare, Send
import { useToast } from '@/hooks/use-toast';
import { fetchLicitacaoDetails, updateLicitacao, type LicitacaoDetails, type DisputaConfig, type DisputaLog, formatElapsedTime, statusMap, generateAtaSessaoPDF, type DisputaMensagem } from '@/services/licitacaoService'; // Added DisputaMensagem, generateAtaSessaoPDF
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, isValid, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea


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
  const [limiteInput, setLimiteInput] = useState<string>(''); 
  const [valorCalculadoLimite, setValorCalculadoLimite] = useState<number | undefined>(undefined);
  const [valorTotalLicitacaoInput, setValorTotalLicitacaoInput] = useState<string>('');


  const [elapsedTime, setElapsedTime] = useState<number>(0); 
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [isOutcomeDialogOpen, setIsOutcomeDialogOpen] = useState(false);
  const [clienteVenceu, setClienteVenceu] = useState<boolean | undefined>(undefined);
  const [posicaoCliente, setPosicaoCliente] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling messages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [licitacao?.disputaLog?.mensagens]);


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
        ...licitacao.disputaLog, // Preserve existing messages if any
        iniciadaEm: new Date(),
        mensagens: licitacao.disputaLog?.mensagens || [], // Ensure messages array exists
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'EM_DISPUTA',
        valorTotalLicitacao: valorTotalNum, 
        disputaConfig,
        disputaLog
      });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, status: 'EM_DISPUTA', valorTotalLicitacao: valorTotalNum, disputaConfig, disputaLog } : null);
        toast({ title: "Sucesso", description: "Disputa iniciada." });
        
        setElapsedTime(0); 
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
        mensagens: licitacao.disputaLog?.mensagens || [], // Preserve messages
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'DISPUTA_CONCLUIDA',
        disputaLog: disputaLogUpdate
      });
      if (success) {
        const updatedLic = {...licitacao, status: 'DISPUTA_CONCLUIDA', disputaLog: disputaLogUpdate };
        setLicitacao(updatedLic);
        toast({ title: "Sucesso", description: "Disputa finalizada. Gerando ata..." });
        generateAtaSessaoPDF(
            updatedLic, 
            configuracoes,
            currentUser
        );
        setIsOutcomeDialogOpen(false);
        
      } else {
        throw new Error("Falha ao finalizar disputa no backend.");
      }
    } catch (err) {
      toast({ title: "Erro", description: `Não foi possível finalizar a disputa. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
       
       if (licitacao?.status === 'EM_DISPUTA' && !timerIntervalId) {
           const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
           setTimerIntervalId(interval);
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMessage = async () => {
    if (!licitacao || !currentMessage.trim() || !isDisputaAtiva) return;
    setIsSubmittingMessage(true);
    const newMessage: DisputaMensagem = {
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        texto: currentMessage.trim(),
        autor: currentUser?.fullName || currentUser?.username || 'Sistema',
    };
    const updatedMensagens = [...(licitacao.disputaLog?.mensagens || []), newMessage];
    const updatedDisputaLog = { ...licitacao.disputaLog, mensagens: updatedMensagens };

    try {
        const success = await updateLicitacao(idLicitacao, { disputaLog: updatedDisputaLog });
        if (success) {
            setLicitacao(prev => prev ? { ...prev, disputaLog: updatedDisputaLog } : null);
            setCurrentMessage('');
            toast({ title: "Mensagem Adicionada", description: "Sua mensagem foi registrada."});
        } else {
            throw new Error("Falha ao salvar mensagem no backend.");
        }
    } catch (err) {
        toast({ title: "Erro", description: `Não foi possível adicionar a mensagem. ${err instanceof Error ? err.message : ''}`, variant: "destructive"});
    } finally {
        setIsSubmittingMessage(false);
    }
  };


  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!licitacao) return <Alert><AlertTitle>Licitação não encontrada</AlertTitle></Alert>;

  const isDisputaAtiva = licitacao.status === 'EM_DISPUTA';
  const isDisputaConfiguravel = licitacao.status === 'AGUARDANDO_DISPUTA';
  const isDisputaFinalizada = licitacao.status === 'DISPUTA_CONCLUIDA';

  let displayDataInicio = 'Data Inválida';
  if (licitacao.dataInicio) {
    
    const dateToFormat = licitacao.dataInicio instanceof Date 
      ? licitacao.dataInicio 
      : parseISO(licitacao.dataInicio as string); 
    if (isValid(dateToFormat)) {
      displayDataInicio = format(dateToFormat, "dd/MM/yyyy HH:mm", { locale: ptBR });
    }
  }


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
          <CardDescription>{licitacao.orgaoComprador} | Plataforma: {licitacao.plataforma} | Início: {displayDataInicio}</CardDescription>
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
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
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
                </div>
                <div className="space-y-4">
                     <Label htmlFor="disputa-messages" className="flex items-center gap-2"><MessageSquare className="h-5 w-5"/> Registrar Ocorrências/Mensagens</Label>
                    <ScrollArea className="h-48 w-full rounded-md border p-3 text-sm">
                        {(licitacao.disputaLog?.mensagens || []).length === 0 && <p className="text-muted-foreground">Nenhuma mensagem registrada.</p>}
                        {(licitacao.disputaLog?.mensagens || []).map(msg => (
                            <div key={msg.id} className="mb-2 last:mb-0 border-b pb-1">
                                <p className="text-xs text-muted-foreground">
                                    {formatDateLog(msg.timestamp)} por {msg.autor}
                                </p>
                                <p>{msg.texto}</p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </ScrollArea>
                    <div className="flex gap-2">
                        <Textarea
                            id="disputa-message-input"
                            placeholder="Digite uma ocorrência ou mensagem..."
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            disabled={isSubmittingMessage}
                            className="flex-1 min-h-[60px]"
                        />
                        <Button onClick={handleAddMessage} disabled={isSubmittingMessage || !currentMessage.trim()} className="self-end">
                            {isSubmittingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Enviar
                        </Button>
                    </div>
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


const formatDateLog = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    try {
        const dateObj = date instanceof Date ? date : parseISO(date as string);
        return isValid(dateObj) ? format(dateObj, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : 'Data Inválida';
    } catch { return 'Data Inválida';}
};

