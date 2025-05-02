'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Calendar as CalendarIcon} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {cn} from '@/lib/utils';

// Example modalities and platforms (replace with actual data source if needed)
const modalities = ['Pregão Eletrônico', 'Tomada de Preços', 'Convite', 'Concorrência', 'Leilão', 'Dispensa Eletrônica'];
const platforms = ['ComprasNet', 'Licitações-e', 'BEC/SP', 'Portal da Cidade', 'BLL Compras', 'Outra'];

// Zod schema for validation
const licitacaoFormSchema = z.object({
  clienteId: z.string({required_error: 'Selecione o cliente participante.'}),
  modalidade: z.string({required_error: 'Selecione a modalidade da licitação.'}),
  numeroLicitacao: z.string().min(1, {message: 'Número da licitação é obrigatório.'}),
  plataforma: z.string({required_error: 'Selecione a plataforma onde ocorrerá.'}),
  dataInicio: z.date({required_error: 'Data e hora de início são obrigatórias.'}),
  dataMetaAnalise: z.date({required_error: 'Data meta para análise é obrigatória.'}),
  valorCobrado: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
         // Remove R$, dots, and replace comma with dot for parsing
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number({required_error: 'Valor cobrado é obrigatório.'}).positive({ message: 'Valor deve ser positivo.' })
  ),
  observacoes: z.string().optional(),
});

type LicitacaoFormValues = z.infer<typeof licitacaoFormSchema>;

interface LicitacaoFormProps {
  clients: {id: string; name: string}[]; // Pass clients list as prop
  initialData?: Partial<LicitacaoFormValues>; // For editing
  onSubmit?: (data: LicitacaoFormValues) => void | Promise<void>; // Optional submit handler
}

export default function LicitacaoForm({clients, initialData, onSubmit}: LicitacaoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LicitacaoFormValues>({
    resolver: zodResolver(licitacaoFormSchema),
    defaultValues: initialData || {
      clienteId: undefined,
      modalidade: undefined,
      numeroLicitacao: '',
      plataforma: undefined,
      dataInicio: undefined,
      dataMetaAnalise: undefined,
      valorCobrado: undefined,
      observacoes: '',
    },
  });

   // Format currency on input change
  const formatCurrency = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '';
    let numStr = String(value).replace(/\D/g, '');
    if (!numStr) return '';

    let num = parseInt(numStr, 10) / 100;

    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
     const rawValue = e.target.value.replace(/\D/g, '');
     const numberValue = parseInt(rawValue, 10) / 100;
     field.onChange(isNaN(numberValue) ? undefined : numberValue); // Store as number
     // Update displayed value (formatted) - React Hook Form handles state update
     e.target.value = formatCurrency(numberValue);
   };


  const handleFormSubmit = async (data: LicitacaoFormValues) => {
    setIsSubmitting(true);
    console.log('Form Data:', data); // Log data for debugging
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        // Default action if no onSubmit provided (e.g., API call)
        console.log('Submitting licitação data (default action)...', data);
        // Replace with your actual API call
        // This should generate the protocol number on the backend
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        console.log('Licitação data submitted successfully. Protocolo: [Backend Generated]');
        // Example: router.push('/licitacoes'); // Redirect after save
         form.reset(); // Reset form on success
      }
    } catch (error) {
      console.error('Failed to submit licitação data:', error);
      // Show error message to user (e.g., using toast)
    } finally {
      setIsSubmitting(false);
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente participante" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Input placeholder="Ex: Pregão 123/2024, TP 001/2024" {...field} />
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
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    {/* Controlled input for currency */}
                    <Input
                     placeholder="R$ 0,00"
                     value={formatCurrency(field.value)} // Display formatted value
                     onChange={(e) => handleCurrencyChange(e, field)}
                    />
                  </FormControl>
                   <FormDescription>Valor que será faturado para o cliente.</FormDescription>
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
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0)) // Disable past dates
                        }
                        initialFocus
                      />
                       {/* Basic Time Input - Consider a dedicated time picker component for better UX */}
                       <div className="p-2 border-t">
                          <Input
                            type="time"
                            defaultValue={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => {
                              const time = e.target.value;
                              if (field.value && time) {
                                const [hours, minutes] = time.split(':').map(Number);
                                const newDate = new Date(field.value);
                                newDate.setHours(hours, minutes);
                                field.onChange(newDate);
                              } else if (time) {
                                // Handle case where date is not yet selected but time is entered
                                // Might require temporary state or combined input approach
                                const [hours, minutes] = time.split(':').map(Number);
                                const tempDate = new Date(); // Use today as base if no date selected
                                tempDate.setHours(hours, minutes, 0, 0);
                                field.onChange(tempDate); // Or handle differently
                              }
                            }}
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
                         disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0)) // Disable past dates
                        }
                        initialFocus
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
                  <Textarea placeholder="Detalhes importantes, links adicionais, etc." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Confirmar e Salvar Licitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
