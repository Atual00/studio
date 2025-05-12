
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResultsDisplayProps {
  data: any; // The raw data from the API
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

export default function ResultsDisplay({ data, currentPage, onPageChange }: ResultsDisplayProps) {
  // Attempt to extract common pagination fields, specific to Compras.gov.br structure
  const totalRegistros = data?.totalRegistros ?? data?._pagination?.total ?? 0;
  const totalPaginas = data?.totalPaginas ?? data?._pagination?.totalPages ?? 0;
  const itensPorPagina = data?.tamanhoPagina ?? data?._pagination?.perPage ?? (data?._embedded?.length || 10);
  const paginaAtualApi = data?.paginaAtual ?? data?._pagination?.page ?? currentPage;

  const hasPrevPage = paginaAtualApi > 1;
  const hasNextPage = paginaAtualApi < totalPaginas;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Resultados da Consulta</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
      {(totalPaginas > 0 || totalRegistros > 0) && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
           <p className="text-sm text-muted-foreground">
            {totalRegistros > 0 ? (
                `Página ${paginaAtualApi} de ${totalPaginas}. Total de ${totalRegistros} registros.`
            ) : (
                 `Nenhum registro encontrado.`
            )}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginaAtualApi - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginaAtualApi + 1)}
              disabled={!hasNextPage}
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
