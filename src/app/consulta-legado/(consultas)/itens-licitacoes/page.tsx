
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ApiConsultaForm from '@/components/consulta-legado/common/ApiConsultaForm';
import { consultarItensLicitacao } from '@/services/comprasGovService';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  modalidade: z.preprocess(val => Number(val), z.number({ required_error: 'Código da modalidade é obrigatório.' })), // 1-Convite, 2-Tomada Preços, 3-Concorrência
  pagina: z.preprocess(val => Number(val) || 1, z.number().min(1).optional().default(1)),
  tamanhoPagina: z.preprocess(val => Number(val) || 10, z.number().min(1).max(500).optional().default(10)),
  uasg: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  numeroAviso: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  codigoItemMaterial: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  codigoItemServico: z.preprocess(val => val ? Number(val) : undefined, z.number().optional()),
  cnpjFornecedor: z.string().optional(),
  cpfVencedor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarItensLicitacoesPage() {
  const defaultValues: FormValues = {
    modalidade: 1, // Default to Convite, or make user choose
    pagina: 1,
    tamanhoPagina: 10,
  };

  const renderForm = (form: ReturnType<typeof useForm<FormValues>>) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="modalidade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código Modalidade*</FormLabel>
            <FormControl>
              <Input type="number" placeholder="1-Convite, 2-TP, 3-Concorrência" {...field} />
            </FormControl>
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
        name="codigoItemMaterial"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cód. Item Material (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="codigoItemServico"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cód. Item Serviço (Opcional)</FormLabel>
            <FormControl>
              <Input type="number" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cnpjFornecedor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CNPJ Fornecedor (Opcional)</FormLabel>
            <FormControl>
              <Input placeholder="XX.XXX.XXX/XXXX-XX" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cpfVencedor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CPF Vencedor (Opcional)</FormLabel>
            <FormControl>
              <Input placeholder="XXX.XXX.XXX-XX" {...field} value={field.value ?? ''} />
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
      fetchDataFunction={consultarItensLicitacao}
      formTitle="Consultar Itens de Licitações (Lei 8.666/93)"
      formDescription="Busque itens de licitações (Convite, Tomada de Preços, Concorrência)."
    />
  );
}
