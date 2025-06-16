
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarContratacoesPNCP, type ConsultarContratacoesPNCPParams } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const modalidadesPNCP = [
  { value: 1, label: 'CONCORRÊNCIA' },
  { value: 2, label: 'CONCURSO' },
  { value: 3, label: 'LEILÃO' },
  { value: 4, label: 'PREGÃO (Genérico)' },
  { value: 5, label: 'DIÁLOGO COMPETITIVO' },
  { value: 6, label: 'PREGÃO ELETRÔNICO (Conforme guia)' },
];

const ufsBrasil = [
    { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' }, { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' }, { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' }, { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' }, { value: 'TO', label: 'Tocantins' }
];


const formSchema = z.object({
  dataInicial: z.date({ required_error: 'Data de Início é obrigatória.' }),
  dataFinal: z.date({ required_error: 'Data de Fim é obrigatória.' }),
  codigoModalidadeContratacao: z.preprocess(
    val => Number(val),
    z.number({ required_error: 'Código da Modalidade é obrigatório.' })
  ),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  uf: z.string().optional().transform(val => val === 'todos' ? undefined : val), // 'todos' will be treated as undefined
  termoBusca: z.string().optional(),
}).refine(data => data.dataFinal >= data.dataInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataFinal"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarContratacoesPncpPage() {
  const defaultValues: FormValues = {
    dataInicial: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dataFinal: new Date(),
    codigoModalidadeContratacao: 6,
    pagina: 1,
    tamanhoPagina: 10,
    uf: undefined,
    termoBusca: '',
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField control={form.control} name="dataInicial" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Inicial*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="dataFinal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Final*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      <FormField
        control={form.control}
        name="codigoModalidadeContratacao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modalidade da Contratação*</FormLabel>
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
      <FormField
        control={form.control}
        name="uf"
        render={({ field }) => (
          <FormItem>
            <FormLabel>UF (Estado)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || 'todos'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Todos os Estados" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="todos">Todos os Estados</SelectItem>
                {ufsBrasil.map(uf => (
                  <SelectItem key={uf.value} value={uf.value}>
                    {uf.label} ({uf.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="termoBusca"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Termo de Busca (Objeto)</FormLabel>
            <FormControl><Input placeholder="Ex: aquisição de computadores" {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField control={form.control} name="tamanhoPagina" render={({ field }) => (<FormItem><FormLabel>Resultados por Página</FormLabel><FormControl><Input type="number" min="1" max="500" placeholder="Padrão: 10" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value,10) || 10)} /></FormControl><FormMessage /></FormItem>)} />
    </div>
  );

  const handleFetchData = async (values: FormValues): Promise<any> => {
     const params: ConsultarContratacoesPNCPParams = {
        dataInicial: values.dataInicial,
        dataFinal: values.dataFinal,
        codigoModalidadeContratacao: values.codigoModalidadeContratacao,
        pagina: values.pagina,
        tamanhoPagina: values.tamanhoPagina,
        uf: values.uf, // Pass uf
        termoBusca: values.termoBusca, // Pass termoBusca
     };
     return consultarContratacoesPNCP(params);
  }


  return (
    <ApiConsultaForm
      formSchema={formSchema}
      defaultValues={defaultValues}
      renderFormFields={renderForm}
      fetchDataFunction={handleFetchData}
      formTitle="Consultar Contratações por Data de Publicação (PNCP)"
      formDescription="Busque contratações publicadas no PNCP com base nos filtros abaixo. A API retorna dados no formato JSON."
    />
  );
}
