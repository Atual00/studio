
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarContratacoesPNCP } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Códigos de Modalidade (exemplos da Lei 14.133/2021 - PNCP)
const modalidadesPNCP = [
  { value: 1, label: 'CONCORRÊNCIA' },
  { value: 2, label: 'CONCURSO' },
  { value: 3, label: 'LEILÃO' },
  { value: 4, label: 'PREGÃO' },
  { value: 5, label: 'DIÁLOGO COMPETITIVO' },
  // Adicionar outros códigos conforme Seção 10.1 do manual se necessário
];

const formSchema = z.object({
  dataPublicacaoPncpInicial: z.date({ required_error: 'Data de Publicação Inicial é obrigatória.' }),
  dataPublicacaoPncpFinal: z.date({ required_error: 'Data de Publicação Final é obrigatória.' }),
  codigoModalidade: z.preprocess(
    val => Number(val), 
    z.number({ required_error: 'Código da Modalidade é obrigatório.' })
  ),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  unidadeOrgaoCodigoUnidade: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  orgaoEntidadeCnpj: z.string().optional().transform(val => val || undefined),
  itemCategoriaIdPncp: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  criterioJulgamentoIdPncp: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  tipoInstrumentoConvocatorioId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  amparoLegalId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  modoDisputaId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  situacaoCompraId: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  sequencialCompra: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  anoCompra: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  dataAtualizacaoPncp: z.date().optional(),
  contratacaoDesconsiderada: z.enum(['all', 'true', 'false']).optional().transform(val => val === 'all' ? undefined : val === 'true'),
}).refine(data => data.dataPublicacaoPncpFinal >= data.dataPublicacaoPncpInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataPublicacaoPncpFinal"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarContratacoesPncpPage() {
  const defaultValues: FormValues = {
    dataPublicacaoPncpInicial: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
    dataPublicacaoPncpFinal: new Date(), // Today
    codigoModalidade: 4, // Default to Pregão
    pagina: 1,
    tamanhoPagina: 10,
    contratacaoDesconsiderada: undefined,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField control={form.control} name="dataPublicacaoPncpInicial" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Public. PNCP Inicial*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="dataPublicacaoPncpFinal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Public. PNCP Final*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField
        control={form.control}
        name="codigoModalidade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código da Modalidade*</FormLabel>
            <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger></FormControl>
              <SelectContent>
                {modalidadesPNCP.map(modalidade => (
                  <SelectItem key={modalidade.value} value={String(modalidade.value)}>
                    {modalidade.label} ({modalidade.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField control={form.control} name="unidadeOrgaoCodigoUnidade" render={({ field }) => (<FormItem><FormLabel>Cód. Unidade Órgão</FormLabel><FormControl><Input type="number" placeholder="Ex: 120001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="orgaoEntidadeCnpj" render={({ field }) => (<FormItem><FormLabel>CNPJ Órgão/Entidade</FormLabel><FormControl><Input placeholder="XX.XXX.XXX/XXXX-XX" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="itemCategoriaIdPncp" render={({ field }) => (<FormItem><FormLabel>ID Categoria Item (PNCP)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="criterioJulgamentoIdPncp" render={({ field }) => (<FormItem><FormLabel>ID Critério Julgamento (PNCP)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="tipoInstrumentoConvocatorioId" render={({ field }) => (<FormItem><FormLabel>ID Tipo Instr. Convocatório</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="amparoLegalId" render={({ field }) => (<FormItem><FormLabel>ID Amparo Legal</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="modoDisputaId" render={({ field }) => (<FormItem><FormLabel>ID Modo Disputa</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="situacaoCompraId" render={({ field }) => (<FormItem><FormLabel>ID Situação Compra</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="sequencialCompra" render={({ field }) => (<FormItem><FormLabel>Sequencial Compra</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="anoCompra" render={({ field }) => (<FormItem><FormLabel>Ano Compra</FormLabel><FormControl><Input type="number" placeholder="Ex: 2024" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="dataAtualizacaoPncp" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Atualização PNCP</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField
        control={form.control}
        name="contratacaoDesconsiderada"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contratação Desconsiderada?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value === undefined ? "all" : String(field.value)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim (Desconsiderada)</SelectItem>
                <SelectItem value="false">Não (Ativa)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
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
      fetchDataFunction={consultarContratacoesPNCP}
      formTitle="Consultar Contratações (PNCP Lei 14.133/2021)"
      formDescription="Busque contratações publicadas no PNCP com base nos filtros abaixo."
    />
  );
}

