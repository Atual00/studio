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
  // Adapt to the new PNCP API response structure
  const itemsData = data?.data ?? []; // Data is under the 'data' key
  const totalRegistros = data?.totalRegistros ?? 0;
  const totalPaginas = data?.totalPaginas ?? 0;
  const paginaAtualApi = data?.numeroPagina ?? currentPage; // 'numeroPagina' for current page
  const tamanhoPaginaApi = data?.tamanhoPagina ?? (itemsData.length > 0 ? itemsData.length : 10); // 'tamanhoPagina' if present

  const hasPrevPage = paginaAtualApi > 1;
  const hasNextPage = paginaAtualApi < totalPaginas;

  // Handle cases where data might be an error object from the service
  let displayData = data;
  if (data instanceof Error) {
    displayData = { error: data.message, details: data.stack };
  } else if (typeof data === 'string') {
    try {
      displayData = JSON.parse(data); // If data is a JSON string
    } catch (e) {
      displayData = { raw_string_data: data }; // If not valid JSON, show raw string
    }
  }


  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Resultados da Consulta</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(displayData, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
      {(totalPaginas > 0 || totalRegistros > 0 || (data && !data.error && itemsData.length > 0)) && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
           <p className="text-sm text-muted-foreground">
            {totalRegistros > 0 ? (
                `Página ${paginaAtualApi} de ${totalPaginas}. Total de ${totalRegistros} registros.`
            ) : itemsData.length > 0 ? (
                `Mostrando ${itemsData.length} registros nesta página.` // Fallback if pagination info is missing but data exists
            ) : (
                 `Nenhum registro encontrado.`
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