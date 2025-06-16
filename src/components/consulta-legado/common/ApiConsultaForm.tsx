
'use client';

import React, { useState, ReactNode, useEffect } from 'react';
import { useForm, FormProvider, SubmitHandler, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ResultsDisplay from './ResultsDisplay';

interface ApiConsultaFormProps<TFormValues extends FieldValues, TResponseData> {
  formSchema: z.ZodSchema<TFormValues>;
  defaultValues: TFormValues;
  renderFormFields: (form: ReturnType<typeof useForm<TFormValues>>) => ReactNode;
  fetchDataFunction: (params: TFormValues, page: number) => Promise<TResponseData>;
  formTitle: string;
  formDescription: string;
  onPageChange?: (newPage: number) => void; // Callback for when page changes internally
  externalData?: TResponseData | null; // Optional prop to feed data externally (for AI post-processing)
}

export default function ApiConsultaForm<TFormValues extends FieldValues, TResponseData>({
  formSchema,
  defaultValues,
  renderFormFields,
  fetchDataFunction,
  formTitle,
  formDescription,
  onPageChange,
  externalData, // Receive external data
}: ApiConsultaFormProps<TFormValues, TResponseData>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResponseData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<TFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Effect to update displayed data if externalData prop changes
  useEffect(() => {
    if (externalData !== undefined) { // Check if prop is provided
      setData(externalData);
    }
  }, [externalData]);

  const executeFetch = async (values: TFormValues, page: number) => {
    setIsLoading(true);
    setError(null);
    // Don't clear setData(null) here if we want to show previous results while loading new page or AI filtering
    // Or if externalData is used, it will manage the data state.
    if (externalData === undefined) { // Only clear data if not managed externally
        setData(null);
    }
    try {
      const result = await fetchDataFunction(values, page);
      if (externalData === undefined) { // Only set data if not managed externally
          setData(result);
      }
      // Current page in API response might differ, reflect it
      const apiPage = (result as any)?.numeroPagina || page;
      setCurrentPage(apiPage);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
      console.error(`Error in ${formTitle}:`, err);
       if (externalData === undefined) {
          setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit: SubmitHandler<TFormValues> = async (values) => {
    setCurrentPage(1); // Reset to first page on new submit
    if (onPageChange) onPageChange(1);
    executeFetch(values, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0) {
      // setCurrentPage(newPage); // This will be updated by executeFetch based on API response
      if (onPageChange) onPageChange(newPage);
      executeFetch(form.getValues(), newPage);
    }
  };

  // Determine which data to pass to ResultsDisplay
  const displayData = externalData !== undefined ? externalData : data;
  // Determine current page for ResultsDisplay
  const displayCurrentPage = externalData !== undefined ? ((externalData as any)?.numeroPagina || currentPage) : currentPage;


  return (
    <FormProvider {...form}>
      <Card>
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>{formDescription}</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-4">
            {renderFormFields(form)}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Consultar
            </Button>
          </CardFooter>
        </form>
      </Card>

      {isLoading && !displayData && ( // Show loading only if no data is being displayed yet
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Consultando API...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro na Consulta</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {displayData && (
        <ResultsDisplay
          data={displayData}
          currentPage={displayCurrentPage}
          onPageChange={handlePageChange}
        />
      )}
    </FormProvider>
  );
}
