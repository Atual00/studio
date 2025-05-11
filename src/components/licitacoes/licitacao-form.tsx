

'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller} from 'react-hook-form'; // Import Controller
import {z} from 'zod';
import {useState, useEffect} from 'react';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Calendar as CalendarIcon, Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField} from '@/components/ui/form'; // Import useFormField
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

// Helper for parsing currency string to number
const parseCurrencyString = (val: unknown): number | undefined => {
  if (typeof val === 'number') return val; // Already a number
  if (typeof val === 'string') {
    // Allow "0", "0,00" etc. to be parsed as 0
    if (val.match(/^R?\$\s?0([,.](0+))?$/) || val.trim() === '0') return 0;
    const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Zod schema for validation
const licitacaoFormSchema = z.object({
  clienteId: z.string({required_error: 'Selecione o cliente participante.'}).min(1, 'Selecione o cliente participante.'), // Ensure not empty string
  modalidade: z.string({required_error: 'Selecione a modalidade da licitação.'}),
  numeroLicitacao: z.string().min(1, {message: 'Número da licitação é obrigatório.'}),
  orgaoComprador: z.string().min(1, {message: 'Órgão comprador é obrigatório.'}), // Added field
  plataforma: z.string({required_error: 'Selecione a plataforma onde ocorrerá.'}),
  dataInicio: z.date({required_error: 'Data e hora de início são obrigatórias.'}),
  dataMetaAnalise: z.date({required_error: 'Data meta para análise é obrigatória.'}),
  // Allow zero, handle string input for currency
  valorCobrado: z.preprocess(
    parseCurrencyString,
    z.number({required_error: 'Valor cobrado é obrigatório.', invalid_type_error: 'Valor cobrado deve ser um número.'}).min(0, { message: 'Valor deve ser zero ou positivo.' })
  ),
  valorTotalLicitacao: z.preprocess( // Added field
     parseCurrencyString,
     z.number({required_error: 'Valor total da licitação é obrigatório.', invalid_type_error: 'Valor total deve ser um número.'}).min(0, { message: 'Valor total deve ser zero ou positivo.' })
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

  // Helper function to safely parse dates from initialData (which might be string or Date)
    const parseInitialDate = (date: string | Date | undefined): Date | undefined => {
        if (!date) return undefined;
        try {
             const parsed = typeof date === 'string' ? parseISO(date) : date;
             // Validate parsed date
             return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
        } catch {
            return undefined;
        }
    };


  const form = useForm<LicitacaoFormValues>({
    resolver: zodResolver(licitacaoFormSchema),
    defaultValues: {
      clienteId: initialData?.clienteId || '', // Use empty string instead of undefined
      modalidade: initialData?.modalidade || undefined,
      numeroLicitacao: initialData?.numeroLicitacao || '',
      orgaoComprador: initialData?.orgaoComprador || '', // Initialize new field
      plataforma: initialData?.plataforma || undefined,
      dataInicio: parseInitialDate(initialData?.dataInicio),
      dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
      // Ensure valorCobrado is a number if provided, otherwise undefined
      valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
      valorTotalLicitacao: initialData?.valorTotalLicitacao !== undefined ? Number(initialData.valorTotalLicitacao) : undefined, // Initialize new field
      observacoes: initialData?.observacoes || '',
    },
  });

    // Effect to reset form when initialData changes (e.g., in an edit scenario)
    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                 clienteId: initialData?.clienteId || '', // Reset client ID correctly
                 modalidade: initialData?.modalidade || undefined,
                 orgaoComprador: initialData?.orgaoComprador || '',
                 plataforma: initialData?.plataforma || undefined,
                 dataInicio: parseInitialDate(initialData?.dataInicio),
                 dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
                 valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
                 valorTotalLicitacao: initialData?.valorTotalLicitacao !== undefined ? Number(initialData.valorTotalLicitacao) : undefined,
                 observacoes: initialData?.observacoes || '', // Ensure observacoes is reset
            });
        }
    }, [initialData, form]);


   // Format currency on input change and allow zero
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    // Explicitly format 0 as R$ 0,00
    if (value === 0) return 'R$ 0,00';

    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
     const rawValue = e.target.value;
     let numberValue: number | undefined;

      // Check if the raw input aims to be zero
      if (rawValue.trim() === '0' || rawValue === 'R$ 0,00' || rawValue.replace(/[^0-9,]/g, '') === '0' || rawValue.replace(/[^0-9.]/g, '') === '0') {
          numberValue = 0;
          field.onChange(0); // Update form state with 0
          // Don't format immediately onChange, format onBlur instead for better UX
          // e.target.value = formatCurrency(0);
          return;
      }

      // Parse non-zero values
      const cleaned = rawValue.replace(/[^0-9]/g, '');
      if (cleaned === '') {
          numberValue = undefined;
          field.onChange(undefined); // Update form state
          // e.target.value = ''; // Clear display if needed, but often better to keep raw input during typing
      } else {
          const parsedNum = parseInt(cleaned, 10) / 100;
          numberValue = isNaN(parsedNum) ? undefined : parsedNum;
          field.onChange(numberValue); // Update form state
          // Don't format immediately onChange, format onBlur instead for better UX
          // e.target.value = formatCurrency(numberValue);
      }
   };


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    console.log('Form Data:', data); // Log data for debugging
    // Convert dates to ISO strings before submitting if backend expects strings
    const dataToSubmit = {
        ...data,
        // Ensure dates are valid before calling toISOString
        dataInicio: data.dataInicio instanceof Date ? data.dataInicio.toISOString() : undefined,
        dataMetaAnalise: data.dataMetaAnalise instanceof Date ? data.dataMetaAnalise.toISOString() : undefined,
    };

    console.log('Submitting Data:', dataToSubmit);

    if (onSubmit) {
      try {
        // Pass data with Date objects if the service handles it, otherwise pass dataToSubmit
        await onSubmit(data);
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
              {/* Use field.value directly, ensure initial is empty string */}
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
                      {client.name} ({client.cnpj}) {/* Show CNPJ for clarity */}
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
                  <Input placeholder="Ex: Pregão 123/2024, TP 001/2024" {...field} value={field.value || ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="orgaoComprador"
            render={({field}) => (
              <FormItem>
                <FormLabel>Órgão Comprador*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Prefeitura Municipal de..., Ministério da..." {...field} value={field.value || ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


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
                  <FormLabel>Valor Cobrado (Assessoria)*</FormLabel>
                  <FormControl>
                    <Input
                     placeholder="R$ 0,00"
                     type="text" // Use text type for formatting control
                     value={field.value !== undefined ? formatCurrency(field.value) : ''} // Format value for display
                     onChange={(e) => handleCurrencyChange(e, field)}
                     onBlur={(e) => { // Ensure formatting on blur
                        e.target.value = formatCurrency(field.value);
                     }}
                     disabled={isSubmitting}
                     inputMode="decimal"
                    />
                  </FormControl>
                   <FormDescription>Valor que será faturado para o cliente (pode ser R$ 0,00).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
            control={form.control}
            name="valorTotalLicitacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total Estimado/Global (Licitação)*</FormLabel>
                <FormControl>
                  <Input
                     placeholder="R$ 0,00"
                     type="text"
                     value={field.value !== undefined ? formatCurrency(field.value) : ''} // Format value for display
                     onChange={(e) => handleCurrencyChange(e, field)}
                     onBlur={(e) => {
                         e.target.value = formatCurrency(field.value);
                      }}
                     disabled={isSubmitting}
                     inputMode="decimal"
                  />
                </FormControl>
                <FormDescription>Valor total estimado ou global da licitação (para referência).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
              control={form.control}
              name="dataInicio"
              render={({ field }) => {
                const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Hora Início*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                           id={formItemId}
                           aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
                           aria-invalid={!!error}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy HH:mm", { locale: ptBR })
                          ) : (
                            <span>Selecione data e hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                             // Preserve time if date is selected without time picker interaction
                             const currentTime = field.value instanceof Date ? { hours: field.value.getHours(), minutes: field.value.getMinutes() } : { hours: 9, minutes: 0 }; // Default time
                             if (date) {
                                 date.setHours(currentTime.hours, currentTime.minutes, 0, 0);
                                 field.onChange(date);
                             } else {
                                 field.onChange(undefined);
                             }
                         }}
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
                              // Ensure field.value is a valid date before setting time
                              const currentValidDate = field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : new Date();
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
              )}}
            />
             <FormField
              control={form.control}
              name="dataMetaAnalise"
              render={({ field }) => {
                const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Meta Análise*</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isSubmitting}
                           id={formItemId}
                           aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
                           aria-invalid={!!error}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data meta</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                            // Set time to start of day for date-only fields
                            if (date) {
                                date.setHours(0, 0, 0, 0);
                                field.onChange(date);
                            } else {
                                field.onChange(undefined);
                            }
                        }}
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
              )}}
            />
        </div>


        <FormField
            control={form.control}
            name="observacoes"
            render={({field}) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalhes importantes, links adicionais, objeto resumido, etc." className="min-h-[100px]" {...field} value={field.value || ''} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Confirmar e Salvar Licitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

