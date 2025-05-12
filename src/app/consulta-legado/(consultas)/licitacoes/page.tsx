
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarLicitacao } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  dataPublicacaoInicial: z.date({ required_error: 'Data de publicação inicial é obrigatória.' }),
  dataPublicacaoFinal: z.date({ required_error: 'Data de publicação final é obrigatória.' }),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  uasg: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  numeroAviso: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  modalidade: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()), // 1-Convite, 2-Tomada Preços, 3-Concorrência
}).refine(data => data.dataPublicacaoFinal >= data.dataPublicacaoInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataPublicacaoFinal"],
}).refine(data => {
    const diffTime = Math.abs(data.dataPublicacaoFinal.getTime() - data.dataPublicacaoInicial.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 365;
}, {
    message: "O período entre as datas não pode exceder 365 dias.",
    path: ["dataPublicacaoFinal"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarLicitacoesPage() {
  const defaultValues: FormValues = {
    dataPublicacaoInicial: new Date(new Date().getFullYear(), 0, 1), // Default to start of current year
    dataPublicacaoFinal: new Date(), // Default to today
    pagina: 1,
    tamanhoPagina: 10,
    uasg: undefined,
    numeroAviso: undefined,
    modalidade: undefined,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="dataPublicacaoInicial"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Publicação Inicial*</FormLabel>
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
        name="dataPublicacaoFinal"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Publicação Final*</FormLabel>
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
             <FormDescription>Período máximo de 365 dias.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="uasg"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código UASG (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 123456" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="numeroAviso"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Número da Licitação (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 12024" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="modalidade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código Modalidade (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="1-Convite, 2-TP, 3-Concorrência" {...field} value={field.value ?? ''} />
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
              <Input type="number" min="1" max="500" placeholder="Padrão: 10, Máx: 500" {...field} value={field.value ?? ''} />
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
      fetchDataFunction={consultarLicitacao}
      formTitle="Consultar Licitações (Lei 8.666/93)"
      formDescription="Filtre licitações do tipo Convite, Tomada de Preços e Concorrência."
    />
  );
}
