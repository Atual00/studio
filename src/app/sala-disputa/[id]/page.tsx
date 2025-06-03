
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
import { Loader2, Play, StopCircle, AlertCircle, Check, X, Percent, FileText, Info, MessageSquare, Send, PlusCircle, Trash2, Edit as EditIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchLicitacaoDetails, updateLicitacao, type LicitacaoDetails, type DisputaConfig, type DisputaLog, formatElapsedTime, statusMap, generateAtaSessaoPDF, type DisputaMensagem, type PropostaItem, generatePropostaFinalPDF } from '@/services/licitacaoService';
import { fetchConfiguracoes, type ConfiguracoesFormValues } from '@/services/configuracoesService';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, isValid, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

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
  const [valorReferenciaEditalInput, setValorReferenciaEditalInput] = useState<string>('');

  const [elapsedTime, setElapsedTime] = useState<number>(0); 
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [isOutcomeDialogOpen, setIsOutcomeDialogOpen] = useState(false);
  const [clienteVenceu, setClienteVenceu] = useState<boolean | undefined>(undefined);
  const [posicaoCliente, setPosicaoCliente] = useState<string>('');
  
  const [finalProposalItems, setFinalProposalItems] = useState<PropostaItem[]>([]);
  const [finalProposalObservations, setFinalProposalObservations] = useState<string>('');
  const [grandTotalFinalProposal, setGrandTotalFinalProposal] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null); 

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PropostaItem | null>(null);
  const [currentItemData, setCurrentItemData] = useState<Partial<PropostaItem>>({ lote: '', descricao: '', unidade: '', quantidade: 0 });
  const [isSavingItems, setIsSavingItems] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [licitacao?.disputaLog?.mensagens]);


  const calculateLimiteCliente = useCallback(() => {
    const valorRefEditalNum = parseCurrency(valorReferenciaEditalInput);
    if (valorRefEditalNum === undefined || valorRefEditalNum < 0) {
      setValorCalculadoLimite(undefined);
      return;
    }

    if (limiteTipo === 'valor') {
      const limiteVal = parseCurrency(limiteInput);
      setValorCalculadoLimite(limiteVal);
    } else if (limiteTipo === 'percentual') {
      const percentual = parseFloat(limiteInput.replace('%', ''));
      if (!isNaN(percentual) && percentual >= 0 && percentual <= 100) {
        setValorCalculadoLimite(valorRefEditalNum - (valorRefEditalNum * (percentual / 100)));
      } else {
        setValorCalculadoLimite(undefined);
      }
    }
  }, [valorReferenciaEditalInput, limiteTipo, limiteInput]);

  useEffect(() => {
    calculateLimiteCliente();
  }, [valorReferenciaEditalInput, limiteTipo, limiteInput, calculateLimiteCliente]);


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
        
        setValorReferenciaEditalInput(formatCurrency(licDetails.valorReferenciaEdital));
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
        } else if (licDetails.status === 'DISPUTA_CONCLUIDA' && licDetails.disputaLog?.iniciadaEm && licDetails.disputaLog?.finalizadaEm) {
            // If dispute is already concluded, set elapsed time to the stored duration
             const inicio = typeof licDetails.disputaLog.iniciadaEm === 'string' ? parseISO(licDetails.disputaLog.iniciadaEm) : licDetails.disputaLog.iniciadaEm;
             const fim = typeof licDetails.disputaLog.finalizadaEm === 'string' ? parseISO(licDetails.disputaLog.finalizadaEm) : licDetails.disputaLog.finalizadaEm;
             if (inicio && fim && isValid(inicio) && isValid(fim)) {
                 setElapsedTime(differenceInSeconds(fim, inicio));
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


  const handleOpenItemModal = (item: PropostaItem | null = null) => {
    setEditingItem(item);
    setCurrentItemData(item ? { ...item } : { id: `item-${Date.now()}`, lote: '', descricao: '', unidade: '', quantidade: 0 });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!licitacao || !currentItemData.descricao || !currentItemData.unidade || currentItemData.quantidade === undefined || currentItemData.quantidade <= 0) {
      toast({ title: "Erro", description: "Descrição, unidade e quantidade (maior que zero) são obrigatórios para o item.", variant: "destructive" });
      return;
    }
    setIsSavingItems(true);
    let updatedItemsProposta;
    if (editingItem) {
      updatedItemsProposta = (licitacao.itensProposta || []).map(item => item.id === editingItem.id ? { ...item, ...currentItemData } as PropostaItem : item);
    } else {
      updatedItemsProposta = [...(licitacao.itensProposta || []), { ...currentItemData, id: currentItemData.id || `item-${Date.now()}` } as PropostaItem];
    }

    try {
      const success = await updateLicitacao(idLicitacao, { itensProposta: updatedItemsProposta });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, itensProposta: updatedItemsProposta } : null);
        toast({ title: "Sucesso", description: `Item ${editingItem ? 'atualizado' : 'adicionado'}.` });
        setIsItemModalOpen(false);
      } else {
        throw new Error("Falha ao salvar item da proposta.");
      }
    } catch (err) {
      toast({ title: "Erro", description: `Não foi possível salvar o item. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
    } finally {
      setIsSavingItems(false);
    }
  };
  
  const handleDeleteItem = async (itemId: string) => {
      if (!licitacao) return;
      const confirmed = confirm("Tem certeza que deseja excluir este item da proposta?");
      if (!confirmed) return;
      
      setIsSavingItems(true);
      const updatedItemsProposta = (licitacao.itensProposta || []).filter(item => item.id !== itemId);
       try {
          const success = await updateLicitacao(idLicitacao, { itensProposta: updatedItemsProposta });
          if (success) {
            setLicitacao(prev => prev ? { ...prev, itensProposta: updatedItemsProposta } : null);
            toast({ title: "Sucesso", description: "Item excluído da proposta." });
          } else {
            throw new Error("Falha ao excluir item da proposta.");
          }
        } catch (err) {
          toast({ title: "Erro", description: `Não foi possível excluir o item. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
          setIsSavingItems(false);
        }
  };


  const handleIniciarDisputa = async () => {
    if (!licitacao || licitacao.status === 'EM_DISPUTA') return;

    const valorRefEditalNum = parseCurrency(valorReferenciaEditalInput);
    if (valorRefEditalNum === undefined || valorRefEditalNum < 0) {
        toast({ title: "Erro", description: "Valor de Referência do Edital é inválido.", variant: "destructive" });
        return;
    }
    if (valorCalculadoLimite === undefined) {
        toast({ title: "Erro", description: "Limite do cliente (valor ou percentual) é inválido ou não definido.", variant: "destructive" });
        return;
    }
     if (!licitacao.itensProposta || licitacao.itensProposta.length === 0) {
        toast({ title: "Atenção", description: "Adicione pelo menos um item à proposta antes de iniciar a disputa.", variant: "warning" });
        return;
    }

    setIsSubmitting(true);
    const disputaConfig: DisputaConfig = {
        limiteTipo: limiteTipo,
        limiteValor: limiteTipo === 'valor' ? parseCurrency(limiteInput) : parseFloat(limiteInput.replace('%', '')),
        valorCalculadoAteOndePodeChegar: valorCalculadoLimite
    };
    const disputaLog: DisputaLog = {
        ...licitacao.disputaLog, 
        iniciadaEm: new Date(),
        mensagens: licitacao.disputaLog?.mensagens || [], 
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'EM_DISPUTA',
        valorReferenciaEdital: valorRefEditalNum, 
        disputaConfig,
        disputaLog,
        itensProposta: licitacao.itensProposta, // Ensure current items are saved
      });
      if (success) {
        setLicitacao(prev => prev ? { ...prev, status: 'EM_DISPUTA', valorReferenciaEdital: valorRefEditalNum, disputaConfig, disputaLog, itensProposta: prev.itensProposta } : null);
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

    if (licitacao?.status === 'DISPUTA_CONCLUIDA' && licitacao.disputaLog) {
        // If already concluded, pre-fill with existing final data
        setFinalProposalItems(licitacao.disputaLog.itensPropostaFinalCliente || licitacao.itensProposta || []);
        setFinalProposalObservations(licitacao.observacoesPropostaFinal || '');
        setGrandTotalFinalProposal(licitacao.disputaLog.valorFinalPropostaCliente || 0);
        setClienteVenceu(licitacao.disputaLog.clienteVenceu);
        setPosicaoCliente(licitacao.disputaLog.posicaoCliente?.toString() || '');
    } else if (licitacao) {
        // Initialize finalProposalItems from licitacao.itensProposta for a new finalization
        const initialFinalItems = (licitacao.itensProposta || []).map(item => ({
            ...item,
            valorUnitarioFinalCliente: item.valorUnitarioEstimado, 
            valorTotalFinalCliente: item.valorUnitarioEstimado ? item.valorUnitarioEstimado * item.quantidade : undefined,
        }));
        setFinalProposalItems(initialFinalItems);
        setFinalProposalObservations(licitacao.observacoesPropostaFinal || '');
        calculateGrandTotal(initialFinalItems);
        setClienteVenceu(undefined); // Reset outcome for new finalization
        setPosicaoCliente('');
    }
    setIsOutcomeDialogOpen(true);
  };

  const handleFinalItemPriceChange = (itemId: string, newUnitPriceStr: string) => {
    const newUnitPrice = parseCurrency(newUnitPriceStr);
    setFinalProposalItems(prevItems => {
        const updatedItems = prevItems.map(item => {
            if (item.id === itemId) {
                const valorTotal = newUnitPrice !== undefined ? newUnitPrice * item.quantidade : undefined;
                return { ...item, valorUnitarioFinalCliente: newUnitPrice, valorTotalFinalCliente: valorTotal };
            }
            return item;
        });
        calculateGrandTotal(updatedItems);
        return updatedItems;
    });
  };

  const calculateGrandTotal = (items: PropostaItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.valorTotalFinalCliente || 0), 0);
    setGrandTotalFinalProposal(total);
  };


  const handleOutcomeSubmit = async () => {
    if (!licitacao || clienteVenceu === undefined || (clienteVenceu === false && !posicaoCliente.trim())) {
        toast({ title: "Atenção", description: "Preencha o resultado da disputa (venceu/posição).", variant: "warning" });
        return;
    }
     if (finalProposalItems.some(item => item.valorUnitarioFinalCliente === undefined || item.valorUnitarioFinalCliente < 0)) {
        toast({ title: "Atenção", description: "Todos os itens devem ter um valor unitário final preenchido e válido (>= 0).", variant: "warning" });
        return;
    }

    setIsSubmitting(true);
    const finalizadaEm = new Date();
    const duracao = formatElapsedTime(elapsedTime);

    const disputaLogUpdate: DisputaLog = {
        ...licitacao.disputaLog,
        iniciadaEm: licitacao.disputaLog?.iniciadaEm || new Date(), // Ensure iniciadaEm is set
        finalizadaEm,
        duracao,
        clienteVenceu,
        posicaoCliente: !clienteVenceu ? parseInt(posicaoCliente, 10) : undefined,
        mensagens: licitacao.disputaLog?.mensagens || [],
        itensPropostaFinalCliente: finalProposalItems,
        valorFinalPropostaCliente: grandTotalFinalProposal,
    };

    try {
      const success = await updateLicitacao(idLicitacao, {
        status: 'DISPUTA_CONCLUIDA',
        disputaLog: disputaLogUpdate,
        observacoesPropostaFinal: finalProposalObservations,
      });
      if (success) {
        const updatedLic = {...licitacao, status: 'DISPUTA_CONCLUIDA', disputaLog: disputaLogUpdate, observacoesPropostaFinal: finalProposalObservations };
        setLicitacao(updatedLic);
        toast({ title: "Sucesso", description: "Disputa finalizada. Gerando documentos..." });
        await generateAtaSessaoPDF(updatedLic, configuracoes, currentUser);
        await generatePropostaFinalPDF(updatedLic, configuracoes, currentUser); 
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
    const updatedDisputaLog = { ...licitacao.disputaLog, iniciadaEm: licitacao.disputaLog?.iniciadaEm || new Date(), mensagens: updatedMensagens };


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
            <CardContent className="space-y-6">
                <div>
                    <Label htmlFor="valorReferenciaEdital">Valor de Referência do Edital (Estimado/Global)</Label>
                    <Input
                        id="valorReferenciaEdital"
                        type="text"
                        placeholder="R$ 0,00"
                        value={valorReferenciaEditalInput}
                        onChange={(e) => setValorReferenciaEditalInput(e.target.value)}
                        onBlur={(e) => setValorReferenciaEditalInput(formatCurrency(parseCurrency(e.target.value)))}
                        disabled={isSubmitting}
                    />
                     <p className="text-xs text-muted-foreground mt-1">Este valor será usado para calcular o limite percentual do cliente.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <Label htmlFor="limiteTipo">Tipo de Limite para o Cliente</Label>
                        <Select value={limiteTipo} onValueChange={(v) => setLimiteTipo(v as any)} disabled={isSubmitting}>
                            <SelectTrigger id="limiteTipo"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="valor">Valor Absoluto (R$)</SelectItem>
                                <SelectItem value="percentual">Percentual (%) sobre Ref. Edital</SelectItem>
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
                        <AlertTitle>Limite Calculado para o Cliente</AlertTitle>
                        <AlertDescription>
                            Cliente pode chegar até: <strong>{formatCurrency(valorCalculadoLimite)}</strong>
                        </AlertDescription>
                    </Alert>
                )}
                
                {/* Itens da Proposta Section */}
                <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium">Itens da Proposta (Conforme PDF)</h4>
                        <Button variant="outline" size="sm" onClick={() => handleOpenItemModal()} disabled={isSavingItems}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Item
                        </Button>
                    </div>
                    {licitacao.propostaItensPdfNome && (
                        <p className="text-xs text-muted-foreground">
                            Referência: {licitacao.propostaItensPdfNome} (Faça a transcrição manual dos itens abaixo)
                        </p>
                    )}
                    {(licitacao.itensProposta || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum item adicionado. Adicione os itens da proposta para referência.</p>
                    ) : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Descrição</TableHead><TableHead>Unid.</TableHead><TableHead>Qtd.</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {(licitacao.itensProposta || []).map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.lote || '-'}</TableCell><TableCell>{item.descricao}</TableCell><TableCell>{item.unidade}</TableCell><TableCell>{item.quantidade}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenItemModal(item)} disabled={isSavingItems}><EditIcon className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} disabled={isSavingItems}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>


            </CardContent>
        )}

        {isDisputaAtiva && licitacao.disputaConfig && (
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Alert variant="info">
                        <Info className="h-4 w-4"/>
                        <AlertTitle>Configuração da Disputa</AlertTitle>
                        <AlertDescription>
                            Valor Referência Edital: {formatCurrency(licitacao.valorReferenciaEdital)} <br />
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
                     {(licitacao.itensProposta || []).length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                             <h4 className="text-md font-medium">Itens da Proposta (Referência):</h4>
                             <ScrollArea className="h-40 border rounded-md p-2 text-xs">
                                 <ul className="space-y-1">
                                 {(licitacao.itensProposta || []).map(item => (
                                     <li key={item.id}><strong>{item.lote ? `Lote ${item.lote} - ` : ''}{item.descricao}</strong> (Qtd: {item.quantidade} {item.unidade})</li>
                                 ))}
                                 </ul>
                             </ScrollArea>
                        </div>
                    )}
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
                        Duração: {licitacao.disputaLog.duracao || 'N/A'} <br/>
                        Valor Final da Proposta Cliente: {formatCurrency(licitacao.disputaLog.valorFinalPropostaCliente)}
                    </AlertDescription>
                </Alert>
                 <div className="flex justify-end gap-2">
                     <Button variant="outline" onClick={async () => await generatePropostaFinalPDF(licitacao, configuracoes, currentUser)}>
                        <FileText className="mr-2 h-4 w-4" /> Gerar Proposta Final (PDF)
                    </Button>
                     <Button variant="outline" onClick={() => generateAtaSessaoPDF(licitacao, configuracoes, currentUser)}>
                        <FileText className="mr-2 h-4 w-4" /> Gerar Ata da Sessão (PDF)
                    </Button>
                 </div>
            </CardContent>
        )}

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/sala-disputa')} disabled={isSubmitting}>
            Voltar para Lista
          </Button>
          {isDisputaConfiguravel && (
            <Button onClick={handleIniciarDisputa} disabled={isSubmitting || valorCalculadoLimite === undefined || parseCurrency(valorReferenciaEditalInput) === undefined || (licitacao.itensProposta || []).length === 0}>
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
           {isDisputaFinalizada && (
             <Button onClick={handleFinalizarDisputa} disabled={isSubmitting}> {/* Re-opens the outcome dialog */}
                 <EditIcon className="mr-2 h-4 w-4" /> Ver/Refazer Finalização
             </Button>
           )}
        </CardFooter>
      </Card>

      {/* Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item da Proposta' : 'Adicionar Novo Item à Proposta'}</DialogTitle>
            <DialogDescription>Preencha os detalhes do item conforme o edital/proposta base.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="item-lote">Lote/Grupo (Opcional)</Label>
              <Input id="item-lote" value={currentItemData.lote || ''} onChange={e => setCurrentItemData(p => ({...p, lote: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-descricao">Descrição do Item*</Label>
              <Textarea id="item-descricao" value={currentItemData.descricao || ''} onChange={e => setCurrentItemData(p => ({...p, descricao: e.target.value}))} placeholder="Descrição detalhada do item" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                <Label htmlFor="item-unidade">Unidade*</Label>
                <Input id="item-unidade" value={currentItemData.unidade || ''} onChange={e => setCurrentItemData(p => ({...p, unidade: e.target.value}))} placeholder="Ex: UN, CX, KG" />
                </div>
                <div className="space-y-1">
                <Label htmlFor="item-quantidade">Quantidade*</Label>
                <Input id="item-quantidade" type="number" value={currentItemData.quantidade || ''} onChange={e => setCurrentItemData(p => ({...p, quantidade: parseInt(e.target.value, 10) || 0}))} min="1" />
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSavingItems}>Cancelar</Button></DialogClose>
            <Button onClick={handleSaveItem} disabled={isSavingItems || !currentItemData.descricao || !currentItemData.unidade || !currentItemData.quantidade || currentItemData.quantidade <= 0}>
              {isSavingItems && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Outcome and Final Proposal Dialog */}
      <Dialog open={isOutcomeDialogOpen} onOpenChange={setIsOutcomeDialogOpen}>
        <DialogContent className="sm:max-w-2xl"> {/* Wider dialog */}
          <DialogHeader>
            <DialogTitle>Resultado da Disputa e Proposta Final</DialogTitle>
            <DialogDescription>Informe o resultado e os valores finais da proposta do cliente.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1"> {/* Added ScrollArea */}
            <div className="space-y-6 py-4 pr-3"> {/* Added padding for scrollbar */}
                <div className="space-y-2">
                <Label>O cliente venceu a licitação?</Label>
                <Select onValueChange={(value) => setClienteVenceu(value === 'true')} value={clienteVenceu === undefined ? '' : clienteVenceu.toString()}>
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

                <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-md font-medium">Itens da Proposta Final do Cliente:</h4>
                    {finalProposalItems.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item da proposta inicial encontrado para precificar.</p>}
                    {finalProposalItems.map((item, index) => (
                        <Card key={item.id} className="p-3 space-y-2 text-sm">
                             <p><strong>{item.lote ? `Lote ${item.lote} - ` : ''}{item.descricao}</strong></p>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                                <div><Label>Unidade:</Label> <Input value={item.unidade} disabled className="text-xs"/></div>
                                <div><Label>Quantidade:</Label> <Input type="number" value={item.quantidade} disabled className="text-xs"/></div>
                                <div>
                                    <Label htmlFor={`item-final-price-${index}`}>Vlr. Unit. Final (R$)*</Label>
                                    <Input
                                        id={`item-final-price-${index}`}
                                        type="text"
                                        placeholder="R$ 0,00"
                                        value={formatCurrency(item.valorUnitarioFinalCliente)}
                                        onChange={(e) => handleFinalItemPriceChange(item.id, e.target.value)}
                                        onBlur={(e) => {
                                            const parsed = parseCurrency(e.target.value);
                                            e.target.value = formatCurrency(parsed); // Format on blur
                                        }}
                                        className="text-xs"
                                    />
                                </div>
                                 <div><Label>Vlr. Total Item (R$):</Label> <Input value={formatCurrency(item.valorTotalFinalCliente)} disabled className="text-xs font-semibold"/></div>
                             </div>
                        </Card>
                    ))}
                     <p className="text-right font-bold text-lg mt-2">
                        Valor Total da Proposta Cliente: {formatCurrency(grandTotalFinalProposal)}
                    </p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="finalProposalObservations">Observações da Proposta Final</Label>
                    <Textarea
                        id="finalProposalObservations"
                        placeholder="Observações, condições especiais, validade da proposta, etc."
                        value={finalProposalObservations}
                        onChange={(e) => setFinalProposalObservations(e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
            <Button 
                onClick={handleOutcomeSubmit} 
                disabled={
                    isSubmitting || 
                    clienteVenceu === undefined || 
                    (clienteVenceu === false && !posicaoCliente.trim()) ||
                    finalProposalItems.some(item => item.valorUnitarioFinalCliente === undefined || item.valorUnitarioFinalCliente < 0)
                }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Resultado e Gerar Documentos
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

    
