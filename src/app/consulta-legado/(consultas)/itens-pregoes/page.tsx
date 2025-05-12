
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarItensPregoes } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  dtHomInicial: z.date({ required_error: 'Data de homologação inicial é obrigatória.' }),
  dtHomFinal: z.date({ required_error: 'Data de homologação final é obrigatória.' }),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  coUasg: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
}).refine(data => data.dtHomFinal >= data.dtHomInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dtHomFinal"],
});
// Add refinement for date range limit if applicable (e.g., 365 days)

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarItensPregoesPage() {
  const defaultValues: FormValues = {
    dtHomInicial: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Default to start of current month
    dtHomFinal: new Date(), // Default to today
    pagina: 1,
    tamanhoPagina: 10,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="dtHomInicial"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Homologação Inicial*</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dtHomFinal"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Homologação Final*</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="coUasg"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código UASG (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 123456" {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="tamanhoPagina"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resultados por Página (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" min="1" max="500" placeholder="Padrão: 10, Máx: 500" {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <ApiConsultaForm
      formSchema={formSchema}
      defaultValues={defaultValues}
      renderFormFields={renderForm}
      fetchDataFunction={consultarItensPregoes}
      formTitle="Consultar Itens de Pregões"
      formDescription="Busque itens de pregões com base no período de homologação."
    />
  );
}
