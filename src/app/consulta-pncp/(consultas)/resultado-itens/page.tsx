
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarResultadoItensPNCP } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  dataResultadoPncpInicial: z.date({ required_error: 'Data de Resultado Inicial é obrigatória.' }),
  dataResultadoPncpFinal: z.date({ required_error: 'Data de Resultado Final é obrigatória.' }),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  unidadeOrgaoCodigoUnidade: z.string().optional().transform(val => val || undefined),
  niFornecedor: z.string().optional().transform(val => val || undefined),
  codigoPais: z.string().optional().transform(val => val || undefined),
  porteFornecedorId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  naturezaJuridicaId: z.string().optional().transform(val => val || undefined),
  situacaoCompraItemResultadoId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  valorUnitarioHomologadoInicial: z.preprocess(val => val ? parseFloat(String(val).replace(',', '.')) : undefined, z.number().optional()),
  valorUnitarioHomologadoFinal: z.preprocess(val => val ? parseFloat(String(val).replace(',', '.')) : undefined, z.number().optional()),
  valorTotalHomologadoInicial: z.preprocess(val => val ? parseFloat(String(val).replace(',', '.')) : undefined, z.number().optional()),
  valorTotalHomologadoFinal: z.preprocess(val => val ? parseFloat(String(val).replace(',', '.')) : undefined, z.number().optional()),
  aplicacaoMargemPreferencia: z.enum(['', 'true', 'false']).optional().transform(val => val === '' ? undefined : val === 'true'),
  aplicacaoBeneficioMeepp: z.enum(['', 'true', 'false']).optional().transform(val => val === '' ? undefined : val === 'true'),
  aplicacaoCriterioDesempate: z.enum(['', 'true', 'false']).optional().transform(val => val === '' ? undefined : val === 'true'),
}).refine(data => data.dataResultadoPncpFinal >= data.dataResultadoPncpInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataResultadoPncpFinal"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarResultadoItensPncpPage() {
  const defaultValues: FormValues = {
    dataResultadoPncpInicial: new Date(new Date().getFullYear(), 0, 1), // Default to start of current year
    dataResultadoPncpFinal: new Date(), // Default to today
    pagina: 1,
    tamanhoPagina: 10,
    aplicacaoMargemPreferencia: undefined,
    aplicacaoBeneficioMeepp: undefined,
    aplicacaoCriterioDesempate: undefined,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField control={form.control} name="dataResultadoPncpInicial" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Resultado PNCP Inicial*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="dataResultadoPncpFinal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Resultado PNCP Final*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="unidadeOrgaoCodigoUnidade" render={({ field }) => (<FormItem><FormLabel>Cód. Unidade Órgão</FormLabel><FormControl><Input placeholder="Ex: 120001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="niFornecedor" render={({ field }) => (<FormItem><FormLabel>NI Fornecedor</FormLabel><FormControl><Input placeholder="CNPJ/CPF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="codigoPais" render={({ field }) => (<FormItem><FormLabel>Cód. País Fornecedor</FormLabel><FormControl><Input placeholder="Ex: BR" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="porteFornecedorId" render={({ field }) => (<FormItem><FormLabel>ID Porte Fornecedor</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="naturezaJuridicaId" render={({ field }) => (<FormItem><FormLabel>ID Natureza Jurídica</FormLabel><FormControl><Input placeholder="Ex: 2062" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="situacaoCompraItemResultadoId" render={({ field }) => (<FormItem><FormLabel>ID Situação Item Resultado</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="valorUnitarioHomologadoInicial" render={({ field }) => (<FormItem><FormLabel>Valor Unit. Homolog. Inicial</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 100.50" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="valorUnitarioHomologadoFinal" render={({ field }) => (<FormItem><FormLabel>Valor Unit. Homolog. Final</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 150.75" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="valorTotalHomologadoInicial" render={({ field }) => (<FormItem><FormLabel>Valor Total Homolog. Inicial</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="valorTotalHomologadoFinal" render={({ field }) => (<FormItem><FormLabel>Valor Total Homolog. Final</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField
        control={form.control}
        name="aplicacaoMargemPreferencia"
        render={({ field }) => (
          <FormItem><FormLabel>Aplic. Margem Preferência?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="aplicacaoBeneficioMeepp"
        render={({ field }) => (
          <FormItem><FormLabel>Aplic. Benefício ME/EPP?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="aplicacaoCriterioDesempate"
        render={({ field }) => (
          <FormItem><FormLabel>Aplic. Critério Desempate?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}
      />
      <FormField control={form.control} name="tamanhoPagina" render={({ field }) => (<FormItem><FormLabel>Resultados por Página</FormLabel><FormControl><Input type="number" min="1" max="500" placeholder="Padrão: 10" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
    </div>
  );

  return (
    <ApiConsultaForm
      formSchema={formSchema}
      defaultValues={defaultValues}
      renderFormFields={renderForm}
      fetchDataFunction={consultarResultadoItensPNCP}
      formTitle="Consultar Resultado dos Itens (PNCP Lei 14.133/2021)"
      formDescription="Busque resultados de itens de contratações do PNCP."
    />
  );
}
