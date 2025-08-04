
'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; 
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ExternalLink, Info, Send } from 'lucide-react'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// AI functionality disabled for deployment
interface LicitacaoSummary {
  numeroControlePNCP: string;
  objetoCompra: string;
  modalidadeContratacaoNome?: string;
  uf?: string;
  municipioNome?: string;
  valorTotalEstimado?: number;
  dataPublicacaoPncp?: string;
  linkSistemaOrigem?: string;
  orgaoEntidadeNome?: string;
}

interface ResultsDisplayProps {
  data: any; // Can be raw API response or AI filtered data
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

const formatCurrencyForDisplay = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateForDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Data Inválida';
  } catch {
    return 'Data Inválida';
  }
};

export default function ResultsDisplay({ data, currentPage, onPageChange }: ResultsDisplayProps) {
  const router = useRouter(); 

  if (data instanceof Error) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Erro ao Processar Resultados</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Ocorreu um Erro</AlertTitle>
            <AlertDescription>{data.message}</AlertDescription>
          </Alert>
          <ScrollArea className="h-[200px] w-full rounded-md border p-4 mt-2">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify({ error: data.message, details: data.stack }, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
  
  // itemsData will always be LicitacaoSummary[] because of the mapping in contracoes/page.tsx
  const itemsData: LicitacaoSummary[] = data?.data ?? []; 
  const totalRegistros = data?.totalRegistros ?? 0;
  const totalPaginas = data?.totalPaginas ?? 0;
  const paginaAtualApi = data?.numeroPagina ?? currentPage;
  const totalRegistrosFiltradosAI = data?.totalRegistrosFiltradosAI;

  const hasPrevPage = paginaAtualApi > 1;
  const hasNextPage = paginaAtualApi < totalPaginas;

  if (!data || (!itemsData.length && !totalRegistros && !data.error)) {
    return (
        <Card className="mt-6">
            <CardHeader><CardTitle>Resultados da Consulta</CardTitle></CardHeader>
            <CardContent>
                 <Alert variant="info">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Nenhum resultado</AlertTitle>
                    <AlertDescription>Sua busca não retornou resultados ou os filtros aplicados são muito restritivos.</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }
  
  if (data.error) {
     return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Erro na Resposta da API</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Erro da API</AlertTitle>
            <AlertDescription>{typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}</AlertDescription>
          </Alert>
           <ScrollArea className="h-[200px] w-full rounded-md border p-4 mt-2">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  const handleAnalisarLicitacao = (item: LicitacaoSummary) => {
    const queryParams = new URLSearchParams();
    if (item.numeroControlePNCP) queryParams.append('numeroLicitacao', item.numeroControlePNCP);
    if (item.orgaoEntidadeNome) queryParams.append('orgaoComprador', item.orgaoEntidadeNome);
    if (item.modalidadeContratacaoNome) queryParams.append('modalidade', item.modalidadeContratacaoNome);
    if (item.objetoCompra) queryParams.append('objetoCompra', item.objetoCompra);
    if (item.dataPublicacaoPncp) queryParams.append('dataPublicacao', item.dataPublicacaoPncp);
    if (item.linkSistemaOrigem) queryParams.append('linkSistemaOrigem', item.linkSistemaOrigem);
    
    router.push(`/licitacoes/nova?${queryParams.toString()}`);
  };


  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Resultados da Consulta</CardTitle>
        {totalRegistrosFiltradosAI !== undefined && itemsData.length !== totalRegistros && (
            <p className="text-sm text-muted-foreground">
                Mostrando {itemsData.length} de {totalRegistrosFiltradosAI} licitações após filtro IA (original da API: {totalRegistros}).
            </p>
        )}
      </CardHeader>
      <CardContent>
        {itemsData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Controle PNCP</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Órgão/UF</TableHead>
                <TableHead>Publicação</TableHead>
                <TableHead className="text-right">Valor Estimado</TableHead>
                <TableHead>Link Externo</TableHead>
                <TableHead className="text-right">Ações</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsData.map((item) => (
                <TableRow key={item.numeroControlePNCP}>
                  <TableCell className="font-medium">{item.numeroControlePNCP}</TableCell>
                  <TableCell className="max-w-xs truncate" title={item.objetoCompra}>{item.objetoCompra}</TableCell>
                  <TableCell><Badge variant="secondary">{item.modalidadeContratacaoNome || 'N/A'}</Badge></TableCell>
                  <TableCell>
                    {item.orgaoEntidadeNome || item.municipioNome || 'N/A'}
                    {item.uf && ` (${item.uf})`}
                  </TableCell>
                  <TableCell>{formatDateForDisplay(item.dataPublicacaoPncp)}</TableCell>
                  <TableCell className="text-right">{formatCurrencyForDisplay(item.valorTotalEstimado)}</TableCell>
                  <TableCell>
                    {item.linkSistemaOrigem ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={item.linkSistemaOrigem} target="_blank" rel="noopener noreferrer" title="Abrir no sistema de origem">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleAnalisarLicitacao(item)} title="Enviar para Análise">
                      <Send className="mr-1 h-3 w-3" /> Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Nenhum item encontrado para os critérios selecionados.</p>
        )}
      </CardContent>
      {(totalPaginas > 0 || totalRegistros > 0) && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
           <p className="text-sm text-muted-foreground">
            {totalRegistros > 0 ? (
                `Página ${paginaAtualApi} de ${totalPaginas}. Total de ${totalRegistros} registros na API.`
            ) : (
                 `Nenhum registro encontrado na API.`
            )}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginaAtualApi - 1)}
              disabled={!hasPrevPage || totalPaginas === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginaAtualApi + 1)}
              disabled={!hasNextPage || totalPaginas === 0}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

