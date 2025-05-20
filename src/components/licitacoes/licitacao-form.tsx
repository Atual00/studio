'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {useState, useEffect} from 'react';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Calendar as CalendarIcon, Loader2, Upload} from 'lucide-react'; // Added Upload

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';
import { type ClientListItem } from '@/services/clientService';

const modalities = ['Pregão Eletrônico', 'Tomada de Preços', 'Convite', 'Concorrência', 'Leilão', 'Dispensa Eletrônica', 'Concurso', 'RDC'];
const platforms = ['ComprasNet', 'Licitações-e (BB)', 'BEC/SP', 'BNC', 'BLL Compras', 'Portal de Compras Públicas', 'Outra Plataforma'];

const parseCurrencyString = (val: unknown): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val.match(/^R?\$\s?0([,.](0+))?$/) || val.trim() === '0') return 0;
    const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Zod schema for validation
const licitacaoFormSchema = z.object({
  clienteId: z.string({required_error: 'Selecione o cliente participante.'}).min(1, 'Selecione o cliente participante.'),
  modalidade: z.string({required_error: 'Selecione a modalidade da licitação.'}),
  numeroLicitacao: z.string().min(1, {message: 'Número da licitação é obrigatório.'}),
  orgaoComprador: z.string().min(1, {message: 'Órgão comprador é obrigatório.'}),
  plataforma: z.string({required_error: 'Selecione a plataforma onde ocorrerá.'}),
  dataInicio: z.date({required_error: 'Data e hora de início são obrigatórias.'}),
  dataMetaAnalise: z.date({required_error: 'Data meta para análise é obrigatória.'}),
  valorCobrado: z.preprocess(
    parseCurrencyString,
    z.number({required_error: 'Valor cobrado é obrigatório.', invalid_type_error: 'Valor cobrado deve ser um número.'}).min(0, { message: 'Valor deve ser zero ou positivo.' })
  ),
  // valorTotalLicitacao REMOVED
  propostaItensPdf: z.custom<File | undefined>((val) => val === undefined || val instanceof File, {
    message: "Arquivo de itens da proposta inválido. Deve ser um PDF.",
  }).refine(file => file ? file.type === "application/pdf" : true, "Arquivo deve ser um PDF.")
    .optional(),
  observacoes: z.string().optional(),
});

// Add a type that includes the File object for form handling,
// but LicitacaoDetails will store propostaItensPdfNome as string.
export type LicitacaoFormValues = z.infer<typeof licitacaoFormSchema>;


interface LicitacaoFormProps {
  clients: ClientListItem[];
  initialData?: Partial<LicitacaoFormValues & { dataInicio?: string | Date; dataMetaAnalise?: string | Date; propostaItensPdfNome?: string }>;
  onSubmit?: (data: LicitacaoFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function LicitacaoForm({clients, initialData, onSubmit, isSubmitting = false}: LicitacaoFormProps) {

  const parseInitialDate = (date: string | Date | undefined): Date | undefined => {
        if (!date) return undefined;
        try {
             const parsed = typeof date === 'string' ? parseISO(date) : date;
             return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : undefined;
        } catch {
            return undefined;
        }
    };

  // State for managing the file input, as react-hook-form doesn't handle files directly well
  const [selectedPropostaFile, setSelectedPropostaFile] = useState<File | undefined>(undefined);
  const [propostaFileName, setPropostaFileName] = useState<string | undefined>(initialData?.propostaItensPdfNome);


  const form = useForm<LicitacaoFormValues>({
    resolver: zodResolver(licitacaoFormSchema),
    defaultValues: {
      clienteId: initialData?.clienteId || '',
      modalidade: initialData?.modalidade || undefined,
      numeroLicitacao: initialData?.numeroLicitacao || '',
      orgaoComprador: initialData?.orgaoComprador || '',
      plataforma: initialData?.plataforma || undefined,
      dataInicio: parseInitialDate(initialData?.dataInicio),
      dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
      valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
      // valorTotalLicitacao removed
      propostaItensPdf: undefined, // File object is not part of initial data directly
      observacoes: initialData?.observacoes || '',
    },
  });

    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                 clienteId: initialData?.clienteId || '',
                 modalidade: initialData?.modalidade || undefined,
                 orgaoComprador: initialData?.orgaoComprador || '',
                 plataforma: initialData?.plataforma || undefined,
                 dataInicio: parseInitialDate(initialData?.dataInicio),
                 dataMetaAnalise: parseInitialDate(initialData?.dataMetaAnalise),
                 valorCobrado: initialData?.valorCobrado !== undefined ? Number(initialData.valorCobrado) : undefined,
                 observacoes: initialData?.observacoes || '',
            });
            setPropostaFileName(initialData.propostaItensPdfNome);
            // Note: We cannot pre-fill the file input for security reasons
            setSelectedPropostaFile(undefined);
        }
    }, [initialData, form]);


  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    if (value === 0) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
     const rawValue = e.target.value;
     if (rawValue.trim() === '0' || rawValue === 'R$ 0,00' || rawValue.replace(/[^0-9,]/g, '') === '0' || rawValue.replace(/[^0-9.]/g, '') === '0') {
          field.onChange(0);
          return;
      }
      const cleaned = rawValue.replace(/[^0-9]/g, '');
      if (cleaned === '') {
          field.onChange(undefined);
      } else {
          const parsedNum = parseInt(cleaned, 10) / 100;
          field.onChange(isNaN(parsedNum) ? undefined : parsedNum);
      }
   };

  const handlePropostaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type === "application/pdf") {
            setSelectedPropostaFile(file);
            setPropostaFileName(file.name);
            form.setValue('propostaItensPdf', file, { shouldValidate: true });
            form.clearErrors('propostaItensPdf');
        } else {
            setSelectedPropostaFile(undefined);
            setPropostaFileName(undefined);
            form.setValue('propostaItensPdf', undefined);
            form.setError('propostaItensPdf', { type: 'manual', message: 'Arquivo deve ser um PDF.' });
            event.target.value = ''; // Clear the input
        }
    } else {
        setSelectedPropostaFile(undefined);
        setPropostaFileName(undefined);
        form.setValue('propostaItensPdf', undefined);
    }
  };


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    console.log('Form Data (before sending to parent):', data);
    // The 'propostaItensPdf' field in 'data' will be the File object if selected.
    // The parent onSubmit (addLicitacao/updateLicitacao service) will handle using its name.

    if (onSubmit) {
      try {
        await onSubmit(data); // Pass the form data including the File object
      } catch (error) {
         console.error('Failed to submit licitação data:', error);
      }
    } else {
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
                      {client.name} ({client.cnpj})
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
                     type="text"
                     value={field.value !== undefined ? formatCurrency(field.value) : ''}
                     onChange={(e) => handleCurrencyChange(e, field)}
                     onBlur={(e) => {
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

        {/* REMOVED Valor Total Estimado (Licitação) Field */}

        <FormField
          control={form.control}
          name="propostaItensPdf"
          render={({ field /* Destructure field if you directly use its onChange, onBlur etc. */ }) => (
            <FormItem>
              <FormLabel htmlFor="propostaItensPdf">Itens da Proposta (PDF)</FormLabel>
              <FormControl>
                <Input
                  id="propostaItensPdf"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePropostaFileChange} // Use custom handler
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
              </FormControl>
              {propostaFileName && (
                <FormDescription className="text-xs text-muted-foreground">
                  Arquivo selecionado: {propostaFileName}
                </FormDescription>
              )}
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
                             const currentTime = field.value instanceof Date ? { hours: field.value.getHours(), minutes: field.value.getMinutes() } : { hours: 9, minutes: 0 };
                             if (date) {
                                 date.setHours(currentTime.hours, currentTime.minutes, 0, 0);
                                 field.onChange(date);
                             } else {
                                 field.onChange(undefined);
                             }
                         }}
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
                              const currentValidDate = field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : new Date();
                              if (time) {
                                const [hours, minutes] = time.split(':').map(Number);
                                const newDate = new Date(currentValidDate);
                                newDate.setHours(hours, minutes, 0, 0);
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
                            if (date) {
                                date.setHours(0, 0, 0, 0);
                                field.onChange(date);
                            } else {
                                field.onChange(undefined);
                            }
                        }}
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