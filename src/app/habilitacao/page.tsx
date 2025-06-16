
// src/app/habilitacao/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Eye, AlertCircle, FileArchive, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fetchLicitacoes, type LicitacaoListItem, statusMap } from '@/services/licitacaoService';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const habilitacaoStatuses = [
  'EM_HABILITACAO',
  'HABILITADO',
  'INABILITADO',
  'RECURSO_HABILITACAO',
  'CONTRARRAZOES_HABILITACAO',
  'AGUARDANDO_RECURSO', // Assuming general resource can be part of this phase
  'EM_PRAZO_CONTRARRAZAO', // Assuming general counter-argument can be part of this
  // 'EM_HOMOLOGACAO' // Could also be here or in a separate "Finalizing" module
];

const getBadgeVariant = (color: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'accent' => {
  switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive': return 'destructive';
    case 'warning': return 'warning';
    case 'success': return 'success';
    case 'info': return 'info';
    case 'accent': return 'accent';
    case 'default': return 'default';
    case 'outline':
    default:
      return 'outline';
  }
};

export default function HabilitacaoPage() {
  const [licitacoesHabilitacao, setLicitacoesHabilitacao] = useState<LicitacaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const todasLicitacoes = await fetchLicitacoes();
        const emHabilitacao = todasLicitacoes
          .filter(lic => habilitacaoStatuses.includes(lic.status))
          .sort((a, b) => {
            const dateA = a.dataInicio instanceof Date ? a.dataInicio : parseISO(a.dataInicio as string);
            const dateB = b.dataInicio instanceof Date ? b.dataInicio : parseISO(b.dataInicio as string);
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime(); // Most recent first
          });
        setLicitacoesHabilitacao(emHabilitacao);
      } catch (err) {
        console.error('Erro ao buscar licitações para habilitação:', err);
        setError(`Falha ao carregar licitações. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatDate = (date: Date | string | undefined | null, time = false): string => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!(dateObj instanceof Date) || !isValid(dateObj)) return 'Inválida';
      const formatString = time ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
      return format(dateObj, formatString, { locale: ptBR });
    } catch (e) { return 'Inválida'; }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <FileArchive className="h-6 w-6" />
        Módulo de Habilitação
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Licitações em Fase de Habilitação</CardTitle>
          <CardDescription>
            Acompanhe e gerencie o processo de habilitação, recursos e contrarrazões das licitações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          ) : licitacoesHabilitacao.length === 0 ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Nenhuma Licitação em Habilitação</AlertTitle>
              <AlertDescription>
                Não há licitações atualmente nesta fase.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Protocolo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Número Lic.</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Data Início Disputa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licitacoesHabilitacao.map((lic) => {
                  const statusInfo = statusMap[lic.status];
                  const badgeVariant = statusInfo ? getBadgeVariant(statusInfo.color) : 'outline';
                  return (
                    <TableRow key={lic.id}>
                      <TableCell className="font-medium">{lic.id}</TableCell>
                      <TableCell>{lic.clienteNome}</TableCell>
                      <TableCell>{lic.numeroLicitacao}</TableCell>
                      <TableCell>{lic.orgaoComprador}</TableCell>
                      <TableCell>{formatDate(lic.dataInicio, true)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className="whitespace-nowrap">
                           {statusInfo?.icon && React.createElement(statusInfo.icon, {className:"h-3 w-3 mr-1 inline"})}
                           {statusInfo?.label || lic.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/licitacoes/${lic.id}`} passHref>
                          <Button variant="ghost" size="icon" title="Ver Detalhes e Gerenciar Habilitação">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
