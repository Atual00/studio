'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileText,
  Plus
} from 'lucide-react';
import { fetchDebitos, updateDebitoStatus, type Debito } from '@/services/licitacaoService';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import NotificationBadge from '@/components/notifications/NotificationBadge';

const getStatusBadge = (status: Debito['status']) => {
  switch (status) {
    case 'PENDENTE':
      return <Badge variant="warning">Pendente</Badge>;
    case 'PAGO':
      return <Badge variant="success">Pago</Badge>;
    case 'ENVIADO_FINANCEIRO':
      return <Badge variant="secondary">Enviado ao Financeiro</Badge>;
    case 'PAGO_VIA_ACORDO':
      return <Badge variant="info">Pago via Acordo</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isValid(dateObj)) {
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    }
    return 'Data Inválida';
  } catch {
    return 'Data Inválida';
  }
};

const isOverdue = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isValid(dateObj)) {
      return isBefore(startOfDay(dateObj), startOfDay(new Date()));
    }
    return false;
  } catch {
    return false;
  }
};

export default function FinanceiroPage() {
  const [debitos, setDebitos] = useState<Debito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadDebitos = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDebitos();
        setDebitos(data);
      } catch (err) {
        console.error('Erro ao buscar débitos:', err);
        setError(`Falha ao carregar débitos. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setLoading(false);
      }
    };
    loadDebitos();
  }, []);

  const handleStatusUpdate = async (debitoId: string, newStatus: 'PAGO' | 'ENVIADO_FINANCEIRO') => {
    setUpdatingStatus(debitoId);
    try {
      const success = await updateDebitoStatus(debitoId, newStatus);
      if (success) {
        setDebitos(prev => prev.map(d => 
          d.id === debitoId ? { ...d, status: newStatus } : d
        ));
        toast({
          title: 'Status Atualizado',
          description: `Débito marcado como ${newStatus === 'PAGO' ? 'pago' : 'enviado ao financeiro'}.`
        });
      } else {
        throw new Error('Falha ao atualizar status.');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: 'Erro',
        description: `Não foi possível atualizar o status. ${err instanceof Error ? err.message : ''}`,
        variant: 'destructive'
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filterDebitos = (status?: Debito['status']) => {
    if (!status) return debitos;
    return debitos.filter(d => d.status === status);
  };

  const pendingDebitos = filterDebitos('PENDENTE');
  const overdueDebitos = pendingDebitos.filter(d => isOverdue(d.dataVencimento));
  const paidDebitos = filterDebitos('PAGO');
  const sentToFinanceDebitos = filterDebitos('ENVIADO_FINANCEIRO');

  const renderDebitoTable = (debitosList: Debito[], showActions = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5} className="text-center h-24">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </TableCell>
          </TableRow>
        ) : debitosList.length > 0 ? (
          debitosList.map(debito => (
            <TableRow key={debito.id} className={isOverdue(debito.dataVencimento) && debito.status === 'PENDENTE' ? 'bg-red-50' : ''}>
              <TableCell className="font-medium">
                <Link href={`/clientes/${debito.clienteNome}`} className="hover:underline text-primary">
                  {debito.clienteNome}
                </Link>
              </TableCell>
              <TableCell>
                {debito.descricao}
                {debito.licitacaoNumero && (
                  <div className="text-xs text-muted-foreground">
                    Ref: {debito.licitacaoNumero}
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(debito.valor)}
              </TableCell>
              <TableCell>
                <div className={cn(
                  "flex items-center gap-2",
                  isOverdue(debito.dataVencimento) && debito.status === 'PENDENTE' && "text-red-600"
                )}>
                  {formatDate(debito.dataVencimento)}
                  {isOverdue(debito.dataVencimento) && debito.status === 'PENDENTE' && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(debito.status)}
              </TableCell>
              {showActions && (
                <TableCell className="text-right space-x-2">
                  {debito.status === 'PENDENTE' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(debito.id, 'ENVIADO_FINANCEIRO')}
                        disabled={updatingStatus === debito.id}
                      >
                        {updatingStatus === debito.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Enviar ao Financeiro'
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStatusUpdate(debito.id, 'PAGO')}
                        disabled={updatingStatus === debito.id}
                      >
                        {updatingStatus === debito.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Marcar como Pago'
                        )}
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground h-24">
              Nenhum débito encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Controle Financeiro</h2>
          <NotificationBadge entityType="debito" />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Débito Avulso
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDebitos.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingDebitos.reduce((sum, d) => sum + d.valor, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueDebitos.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueDebitos.reduce((sum, d) => sum + d.valor, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidDebitos.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(paidDebitos.reduce((sum, d) => sum + d.valor, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debitos.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(debitos.reduce((sum, d) => sum + d.valor, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Débitos</CardTitle>
          <CardDescription>
            Acompanhe e gerencie os pagamentos dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendentes" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pendentes" className="relative">
                Pendentes
                {pendingDebitos.length > 0 && (
                  <Badge variant="warning" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {pendingDebitos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="atrasados" className="relative">
                Em Atraso
                {overdueDebitos.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {overdueDebitos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="enviados">
                Enviados
                {sentToFinanceDebitos.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {sentToFinanceDebitos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pagos">
                Pagos
                {paidDebitos.length > 0 && (
                  <Badge variant="success" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {paidDebitos.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="mt-4">
              {renderDebitoTable(pendingDebitos)}
            </TabsContent>

            <TabsContent value="atrasados" className="mt-4">
              {overdueDebitos.length > 0 ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Débitos em Atraso</AlertTitle>
                    <AlertDescription>
                      Existem {overdueDebitos.length} débito(s) em atraso que requerem atenção imediata.
                    </AlertDescription>
                  </Alert>
                  {renderDebitoTable(overdueDebitos)}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium mb-2">Nenhum débito em atraso</h3>
                  <p className="text-muted-foreground">
                    Todos os pagamentos estão em dia!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="enviados" className="mt-4">
              {renderDebitoTable(sentToFinanceDebitos, false)}
            </TabsContent>

            <TabsContent value="pagos" className="mt-4">
              {renderDebitoTable(paidDebitos, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}