
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarItensContratacoesPNCP } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  materialOuServico: z.enum(['M', 'S'], { required_error: 'Material ou Serviço é obrigatório.' }),
  codigoClasse: z.preprocess(val => Number(val), z.number({ required_error: 'Código da Classe é obrigatório.' })),
  codigoGrupo: z.preprocess(val => Number(val), z.number({ required_error: 'Código do Grupo é obrigatório.' })),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  unidadeOrgaoCodigoUnidade: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  orgaoEntidadeCnpj: z.string().optional().transform(val => val || undefined),
  situacaoCompraItem: z.string().optional().transform(val => val || undefined),
  codItemCatalogo: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  temResultado: z.enum(['all', 'true', 'false']).optional().transform(val => val === 'all' ? undefined : val === 'true'),
  codFornecedor: z.string().optional().transform(val => val || undefined),
  dataInclusaoPncpInicial: z.date().optional(),
  dataInclusaoPncpFinal: z.date().optional(),
  dataAtualizacaoPncp: z.date().optional(),
  bps: z.enum(['all', 'true', 'false']).optional().transform(val => val === 'all' ? undefined : val === 'true'),
  margemPreferenciaNormal: z.enum(['all', 'true', 'false']).optional().transform(val => val === 'all' ? undefined : val === 'true'),
  codigoNCM: z.string().optional().transform(val => val || undefined),
}).refine(data => {
  if (data.dataInclusaoPncpInicial && data.dataInclusaoPncpFinal) {
    return data.dataInclusaoPncpFinal >= data.dataInclusaoPncpInicial;
  }
  return true;
}, {
  message: "Data final de inclusão deve ser maior ou igual à data inicial.",
  path: ["dataInclusaoPncpFinal"],
});


type FormValues = z.infer<typeof formSchema>;

export default function ConsultarItensContratacoesPncpPage() {
  const defaultValues: FormValues = {
    materialOuServico: 'M',
    codigoClasse: undefined as unknown as number, // Required, so no default empty string
    codigoGrupo: undefined as unknown as number,  // Required
    pagina: 1,
    tamanhoPagina: 10,
    temResultado: undefined,
    bps: undefined,
    margemPreferenciaNormal: undefined,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField
        control={form.control}
        name="materialOuServico"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Material ou Serviço*</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="M">Material (M)</SelectItem>
                <SelectItem value="S">Serviço (S)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="codigoClasse"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código da Classe*</FormLabel>
            <FormControl><Input type="number" placeholder="Ex: 1234" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="codigoGrupo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código do Grupo*</FormLabel>
            <FormControl><Input type="number" placeholder="Ex: 56" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField control={form.control} name="unidadeOrgaoCodigoUnidade" render={({ field }) => (<FormItem><FormLabel>Cód. Unidade Órgão</FormLabel><FormControl><Input type="number" placeholder="Ex: 120001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="orgaoEntidadeCnpj" render={({ field }) => (<FormItem><FormLabel>CNPJ Órgão/Entidade</FormLabel><FormControl><Input placeholder="XX.XXX.XXX/XXXX-XX" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="situacaoCompraItem" render={({ field }) => (<FormItem><FormLabel>Situação Compra Item</FormLabel><FormControl><Input placeholder="Ex: Aberto" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="codItemCatalogo" render={({ field }) => (<FormItem><FormLabel>Cód. Item Catálogo</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

      <FormField
        control={form.control}
        name="temResultado"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tem Resultado?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "all" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField control={form.control} name="codFornecedor" render={({ field }) => (<FormItem><FormLabel>Cód. Fornecedor</FormLabel><FormControl><Input placeholder="CNPJ/CPF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="dataInclusaoPncpInicial" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Inclusão PNCP Inicial</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="dataInclusaoPncpFinal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Inclusão PNCP Final</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
       <FormField control={form.control} name="dataAtualizacaoPncp" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Atualização PNCP</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
       <FormField
        control={form.control}
        name="bps"
        render={({ field }) => (
          <FormItem><FormLabel>Vinculado ao BPS?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "all" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="margemPreferenciaNormal"
        render={({ field }) => (
          <FormItem><FormLabel>Margem Preferência Normal?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "all" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}
      />
      <FormField control={form.control} name="codigoNCM" render={({ field }) => (<FormItem><FormLabel>Código NCM</FormLabel><FormControl><Input placeholder="Ex: 8471.30.12" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="tamanhoPagina" render={({ field }) => (<FormItem><FormLabel>Resultados por Página</FormLabel><FormControl><Input type="number" min="1" max="500" placeholder="Padrão: 10" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
    </div>
  );

  return (
    <ApiConsultaForm
      formSchema={formSchema}
      defaultValues={defaultValues}
      renderFormFields={renderForm}
      fetchDataFunction={consultarItensContratacoesPNCP}
      formTitle="Consultar Itens de Contratações (PNCP Lei 14.133/2021)"
      formDescription="Busque itens de contratações do PNCP com base nos filtros abaixo."
    />
  );
}

