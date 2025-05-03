'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {useState, useEffect} from 'react';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Calendar as CalendarIcon, Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {Label} from '@/components/ui/label'; // Import Label component
import {cn} from '@/lib/utils';
import { type ClientListItem } from '@/services/clientService'; // Import ClientListItem type

// Example modalities and platforms (replace with actual data source if needed)
const modalities = ['Pregão Eletrônico', 'Tomada de Preços', 'Convite', 'Concorrência', 'Leilão', 'Dispensa Eletrônica', 'Concurso', 'RDC'];
const platforms = ['ComprasNet', 'Licitações-e (BB)', 'BEC/SP', 'BNC', 'BLL Compras', 'Portal de Compras Públicas', 'Outra Plataforma'];

// Zod schema for validation
const licitacaoFormSchema = z.object({
  clienteId: z.string({required_error: 'Selecione o cliente participante.'}),
  modalidade: z.string({required_error: 'Selecione a modalidade da licitação.'}),
  numeroLicitacao: z.string().min(1, {message: 'Número da licitação é obrigatório.'}),
  plataforma: z.string({required_error: 'Selecione a plataforma onde ocorrerá.'}),
  dataInicio: z.date({required_error: 'Data e hora de início são obrigatórias.'}),
  dataMetaAnalise: z.date({required_error: 'Data meta para análise é obrigatória.'}),
  // Allow zero, handle string input for currency
  valorCobrado: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
      }
       // Allow number 0 directly
       if (typeof val === 'number') {
         return val;
       }
      return val;
    },
    z.number({required_error: 'Valor cobrado é obrigatório.'}).min(0, { message: 'Valor deve ser zero ou positivo.' })
  ),
  observacoes: z.string().optional(),
});

export type LicitacaoFormValues = z.infer<typeof licitacaoFormSchema>;

interface LicitacaoFormProps {
  clients: ClientListItem[]; // Use ClientListItem type
  initialData?: Partial<LicitacaoFormValues & { dataInicio?: string | Date; dataMetaAnalise?: string | Date }>; // Allow string dates for initial data
  onSubmit?: (data: LicitacaoFormValues) => void | Promise<void>; // Optional submit handler
  isSubmitting?: boolean; // Add submitting state prop
}

export default function LicitacaoForm({clients, initialData, onSubmit, isSubmitting = false}: LicitacaoFormProps) {
  // Removed internal isSubmitting state

  // Helper function to safely parse dates from initialData (which might be string or Date)
    const parseInitialDate = (date: string | Date | undefined): Date | undefined => {
        if (!date) return undefined;
        try {
            return typeof date === 'string' ? parseISO(date) : date;
        } catch {
            return undefined;
        }
    };


  const form = useForm<LicitacaoFormValues>({
    resolver: zodResolver(licitacaoFormSchema),
    defaultValues: {
      ...initialData,
      // Ensure dates are Date objects for the form state
      dataInicio: parseInitialDate(initialData?.dataInicio),
      dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
      // Ensure valorCobrado is a number if provided
      valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
    },
  });

    // Effect to reset form when initialData changes (e.g., in an edit scenario)
    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                 dataInicio: parseInitialDate(initialData?.dataInicio),
                 dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
                 valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
            });
        }
    }, [initialData, form]);


   // Format currency on input change and allow zero
  const formatCurrency = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '';
     // Allow typing '0' or '0,00' etc.
     if (String(value).match(/^0[,.]?0*$/)) return 'R$ 0,00';

    let numStr = String(value).replace(/\D/g, '');
    if (!numStr) return '';

    let num = parseInt(numStr, 10) / 100;

    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
     const rawValue = e.target.value;
     let numberValue: number | undefined;

      // Special handling for zero input
      if (rawValue === '0' || rawValue === 'R$ 0,00' || rawValue.replace(/\D/g, '') === '0') {
          numberValue = 0;
      } else {
          const cleaned = rawValue.replace(/\D/g, '');
          const parsedNum = parseInt(cleaned, 10) / 100;
          numberValue = isNaN(parsedNum) ? undefined : parsedNum;
      }

     field.onChange(numberValue); // Store as number or undefined
     // Update displayed value (formatted)
     // We need to manually set the input value because field.onChange might not trigger a re-render immediately with the formatted value
     e.target.value = formatCurrency(numberValue);
   };


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    console.log('Form Data:', data); // Log data for debugging
    // Convert dates to ISO strings before submitting if backend expects strings
    const dataToSubmit = {
        ...data,
        dataInicio: data.dataInicio.toISOString(),
        dataMetaAnalise: data.dataMetaAnalise.toISOString(),
    };

    console.log('Submitting Data:', dataToSubmit);

    if (onSubmit) {
      try {
        await onSubmit(data); // Pass original data with Date objects if onSubmit handles it
      } catch (error) {
         console.error('Failed to submit licitação data:', error);
         // Error handling is managed by the parent through toast
      }
    } else {
      // Default action if no onSubmit provided
      console.warn('No onSubmit handler provided to LicitacaoForm.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="clienteId"
          render={({field}) => (
            <FormItem>
              <FormLabel>Cliente*</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente participante" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="modalidade"
            render={({field}) => (
              <FormItem>
                <FormLabel>Modalidade*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {modalities.map(mod => (
                      <SelectItem key={mod} value={mod}>
                        {mod}
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
            name="numeroLicitacao"
            render={({field}) => (
              <FormItem>
                <FormLabel>Número da Licitação*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Pregão 123/2024, TP 001/2024" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="plataforma"
            render={({field}) => (
              <FormItem>
                <FormLabel>Plataforma*</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                   <FormControl>
                     <SelectTrigger>
                       <SelectValue placeholder="Onde a licitação ocorrerá" />
                     </SelectTrigger>
                   </FormControl>
                   <SelectContent>
                     {platforms.map(plat => (
                       <SelectItem key={plat} value={plat}>
                         {plat}
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
              name="valorCobrado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Cobrado*</FormLabel>
                  <FormControl>
                    <Input
                     placeholder="R$ 0,00"
                     // Use field.value directly if it's already managed as a number
                     // value={formatCurrency(field.value)} // Use controlled formatting
                     defaultValue={formatCurrency(field.value)} // Use defaultValue for initial render
                     onBlur={(e) => { // Format on blur
                         e.target.value = formatCurrency(field.value);
                     }}
                     onChange={(e) => handleCurrencyChange(e, field)} // Handle change to parse/set number
                     disabled={isSubmitting}
                    />
                  </FormControl>
                   <FormDescription>Valor que será faturado para o cliente (pode ser R$ 0,00).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
              control={form.control}
              name="dataInicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Hora Início*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy HH:mm", { locale: ptBR })
                          ) : (
                            <span>Selecione data e hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Allow past dates if needed
                        initialFocus
                         disabled={isSubmitting}
                      />
                       <div className="p-2 border-t">
                          <Label htmlFor="time-inicio" className="text-xs">Hora Início</Label>
                          <Input
                            id="time-inicio"
                            type="time"
                            defaultValue={field.value ? format(field.value, 'HH:mm') : '09:00'}
                            onChange={(e) => {
                              const time = e.target.value;
                              const currentValidDate = field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : new Date(); // Use today if no valid date yet
                              if (time) {
                                const [hours, minutes] = time.split(':').map(Number);
                                const newDate = new Date(currentValidDate);
                                newDate.setHours(hours, minutes, 0, 0); // Set seconds and ms to 0
                                field.onChange(newDate);
                              }
                            }}
                             disabled={isSubmitting}
                          />
                       </div>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data e hora de início da disputa/sessão.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dataMetaAnalise"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Meta Análise*</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data meta</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                         // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Allow past dates if needed
                        initialFocus
                         disabled={isSubmitting}
                      />
                    </PopoverContent>
                  </Popover>
                   <FormDescription>
                    Prazo interno para análise e juntada de documentos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>


        <FormField
            control={form.control}
            name="observacoes"
            render={({field}) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalhes importantes, links adicionais, objeto resumido, etc." className="min-h-[100px]" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Confirmar e Salvar Licitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
