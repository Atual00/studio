
'use client';

import React, { useState, ReactNode } from 'react';
import { useForm, FormProvider, SubmitHandler, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ResultsDisplay from './ResultsDisplay'; // Component to display results

interface ApiConsultaFormProps<TFormValues extends FieldValues, TResponseData> {
  formSchema: z.ZodSchema<TFormValues>;
  defaultValues: TFormValues;
  renderFormFields: (form: ReturnType<typeof useForm<TFormValues>>) => ReactNode;
  fetchDataFunction: (params: TFormValues) => Promise<TResponseData>;
  formTitle: string;
  formDescription: string;
}

export default function ApiConsultaForm<TFormValues extends FieldValues, TResponseData>({
  formSchema,
  defaultValues,
  renderFormFields,
  fetchDataFunction,
  formTitle,
  formDescription,
}: ApiConsultaFormProps<TFormValues, TResponseData>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResponseData | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // For pagination

  const form = useForm<TFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const executeFetch = async (values: TFormValues, page: number) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const paramsWithPage = { ...values, pagina: page };
      const result = await fetchDataFunction(paramsWithPage);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
      console.error(`Error in ${formTitle}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit: SubmitHandler<TFormValues> = async (values) => {
    setCurrentPage(1); // Reset to first page on new submit
    executeFetch(values, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0) {
      setCurrentPage(newPage);
      executeFetch(form.getValues(), newPage); // Fetch new page with current form values
    }
  };

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

      {isLoading && (
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

      {data && (
        <ResultsDisplay
          data={data}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </FormProvider>
  );
}
