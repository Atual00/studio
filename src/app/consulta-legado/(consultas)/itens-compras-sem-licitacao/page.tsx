
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarItensComprasSemLicitacao } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const formSchema = z.object({
  dtAnoAvisoLicitacao: z.preprocess(val => Number(val), z.number({ required_error: 'Ano do aviso é obrigatório.' }).min(1990).max(currentYear + 5)),
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  coUasg: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  coModalidadeLicitacao: z.preprocess(val => val ? Number(val) : undefined, z.enum(['6', '7']).optional()),
  coConjuntoMateriais: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  coServico: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  nuCpfCnpjFornecedor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarItensComprasSemLicitacaoPage() {
  const defaultValues: FormValues = {
    dtAnoAvisoLicitacao: currentYear,
    pagina: 1,
    tamanhoPagina: 10,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="dtAnoAvisoLicitacao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ano do Aviso da Licitação*</FormLabel>
            <FormControl>
              <Input type="number" placeholder={`Ex: ${currentYear}`} {...field} />
            </FormControl>
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
        name="coModalidadeLicitacao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Compra (Opcional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value?.toString() ?? ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="6">Dispensa</SelectItem>
                <SelectItem value="7">Inexigibilidade</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="coConjuntoMateriais"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cód. Conjunto Materiais (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="coServico"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código do Serviço (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="nuCpfCnpjFornecedor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CPF/CNPJ Fornecedor (Opcional)</FormLabel>
            <FormControl>
              <Input placeholder="Somente números" {...field} value={field.value ?? ''}/>
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
      fetchDataFunction={consultarItensComprasSemLicitacao}
      formTitle="Consultar Itens de Compras Sem Licitação"
      formDescription="Busque itens de Dispensas e Inexigibilidades."
    />
  );
}
