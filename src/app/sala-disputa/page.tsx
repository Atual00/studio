
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, PlayCircle, AlertCircle, Info } from 'lucide-react';
import { fetchLicitacoes, type LicitacaoListItem, statusMap } from '@/services/licitacaoService';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

export default function SalaDisputaPage() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLicitacoesParaDisputa = async () => {
      setLoading(true);
      setError(null);
      try {
        const todasLicitacoes = await fetchLicitacoes();
        const paraDisputa = todasLicitacoes.filter(
          lic => lic.status === 'AGUARDANDO_DISPUTA' || lic.status === 'EM_DISPUTA'
        ).sort((a,b) => {
             // Sort by AGUARDANDO_DISPUTA first, then by dataInicio
            if (a.status === 'AGUARDANDO_DISPUTA' && b.status !== 'AGUARDANDO_DISPUTA') return -1;
            if (a.status !== 'AGUARDANDO_DISPUTA' && b.status === 'AGUARDANDO_DISPUTA') return 1;
            try {
                const dateA = a.dataInicio instanceof Date ? a.dataInicio : parseISO(a.dataInicio);
                const dateB = b.dataInicio instanceof Date ? b.dataInicio : parseISO(b.dataInicio);
                if (!isValid(dateA)) return 1;
                if (!isValid(dateB)) return -1;
                return dateA.getTime() - dateB.getTime(); // Soonest first
            } catch { return 0; }
        });
        setLicitacoes(paraDisputa);
      } catch (err) {
        console.error('Erro ao buscar licitações para disputa:', err);
        setError(`Falha ao carregar licitações. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setLoading(false);
      }
    };
    loadLicitacoesParaDisputa();
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Sala de Disputa</h2>
        {/* Potentially add a refresh button or other controls here */}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Licitações Aguardando ou em Disputa</CardTitle>
          <CardDescription>
            Acompanhe e gerencie as licitações que estão prontas para a fase de disputa ou já em andamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : licitacoes.length === 0 && !error ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Nenhuma Licitação</AlertTitle>
              <AlertDescription>
                Não há licitações aguardando início de disputa ou em disputa no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Data/Hora Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licitacoes.map((lic) => {
                  const statusInfo = statusMap[lic.status];
                  const badgeVariant = statusInfo ? getBadgeVariant(statusInfo.color) : 'outline';
                  return (
                    <TableRow key={lic.id}>
                      <TableCell className="font-medium">{lic.numeroLicitacao}</TableCell>
                      <TableCell>{lic.clienteNome}</TableCell>
                      <TableCell>{lic.orgaoComprador}</TableCell>
                      <TableCell>{formatDate(lic.dataInicio, true)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant}>
                           {statusInfo?.icon && React.createElement(statusInfo.icon, {className:"h-3 w-3 mr-1 inline"})}
                           {statusInfo?.label || lic.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/sala-disputa/${lic.id}`} passHref>
                          <Button size="sm">
                            {lic.status === 'EM_DISPUTA' ? 'Continuar Disputa' : 'Iniciar Disputa'}
                            <PlayCircle className="ml-2 h-4 w-4" />
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
