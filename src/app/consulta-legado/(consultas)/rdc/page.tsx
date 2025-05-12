
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarRdc } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';


const formSchema = z.object({
  dataPublicacaoMin: z.date({ required_error: 'Data de publicação inicial é obrigatória.' }),
  dataPublicacaoMax: z.date({ required_error: 'Data de publicação final é obrigatória.' }),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  uasg: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  modalidade: z.preprocess(val => val ? Number(val) : undefined, z.enum(['3','4']).optional()), // 3 (Presencial), 4 (Eletrônico)
  numeroAviso: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  objeto: z.string().optional(),
}).refine(data => data.dataPublicacaoMax >= data.dataPublicacaoMin, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataPublicacaoMax"],
});
// Add refinement for date range limit if applicable

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarRdcPage() {
  const defaultValues: FormValues = {
    dataPublicacaoMin: new Date(new Date().getFullYear(), 0, 1), // Default to start of current year
    dataPublicacaoMax: new Date(), // Default to today
    pagina: 1,
    tamanhoPagina: 10,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="dataPublicacaoMin"
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
        name="dataPublicacaoMax"
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
              <Input type="number" placeholder="Ex: 123456" {...field} value={field.value ?? ''}/>
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
            <FormLabel>Modalidade RDC (Opcional)</FormLabel>
             <Select onValueChange={field.onChange} value={field.value?.toString() ?? ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade RDC" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="3">Presencial</SelectItem>
                <SelectItem value="4">Eletrônico</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="numeroAviso"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Número do Aviso (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 12024" {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="objeto"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Objeto (Opcional)</FormLabel>
            <FormControl>
              <Input placeholder="Termo de busca no objeto" {...field} value={field.value ?? ''}/>
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
      fetchDataFunction={consultarRdc}
      formTitle="Consultar RDC (Regime Diferenciado de Contratações)"
      formDescription="Busque licitações RDC por período de publicação e outros filtros."
    />
  );
}
