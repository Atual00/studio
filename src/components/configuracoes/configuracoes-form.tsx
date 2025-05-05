
'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {useState, useEffect} from 'react';

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {getAddressByPostalCode, type Address} from '@/services/address'; // Import service
import {Loader2} from 'lucide-react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'; // Import Select

// Zod schema for validation
const configuracoesFormSchema = z.object({
  razaoSocial: z.string().min(2, {message: 'Razão Social deve ter pelo menos 2 caracteres.'}),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {message: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX.'}),
  // Address fields
  enderecoRua: z.string().min(1, {message: 'Rua é obrigatória.'}),
  enderecoNumero: z.string().min(1, {message: 'Número é obrigatório.'}),
  enderecoComplemento: z.string().optional(),
  enderecoBairro: z.string().min(1, {message: 'Bairro é obrigatório.'}),
  enderecoCidade: z.string().min(1, {message: 'Cidade é obrigatória.'}),
  enderecoCep: z.string().regex(/^\d{5}-\d{3}$/, {message: 'CEP inválido. Use o formato XXXXX-XXX.'}),
  // Contact
  email: z.string().email({message: 'E-mail inválido.'}),
  telefone: z.string().min(10, {message: 'Telefone deve ter pelo menos 10 dígitos.'}),
  // Bank Details
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  chavePix: z.string().optional(),
  // Financial Settings
  diaVencimentoPadrao: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number({ required_error: 'Dia de vencimento é obrigatório.', invalid_type_error: 'Dia deve ser um número.'}).min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31')
  ),
  // Logo (Optional - for future use)
  // logoUrl: z.string().url("URL inválida").optional().or(z.literal('')),
});

export type ConfiguracoesFormValues = z.infer<typeof configuracoesFormSchema>;

interface ConfiguracoesFormProps {
  initialData?: Partial<ConfiguracoesFormValues>; // For loading existing settings
  onSubmit?: (data: ConfiguracoesFormValues) => void | Promise<void>; // Submit handler
  isSubmitting?: boolean; // Loading state from parent
}

export default function ConfiguracoesForm({initialData, onSubmit, isSubmitting = false}: ConfiguracoesFormProps) {
  const [cepLoading, setCepLoading] = useState(false);

  const form = useForm<ConfiguracoesFormValues>({
    resolver: zodResolver(configuracoesFormSchema),
    defaultValues: initialData || {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      enderecoRua: '',
      enderecoNumero: '',
      enderecoComplemento: '',
      enderecoBairro: '',
      enderecoCidade: '',
      enderecoCep: '',
      email: '',
      telefone: '',
      banco: '',
      agencia: '',
      conta: '',
      chavePix: '',
      diaVencimentoPadrao: 15, // Default to 15
      // logoUrl: '',
    },
  });

   // Watch CEP for autofill
   const watchedCep = form.watch('enderecoCep');

  // --- CEP Autofill Logic ---
  useEffect(() => {
    // Update form values if initialData changes (e.g., after fetch)
    if (initialData) {
        form.reset({
             ...initialData,
            // Ensure diaVencimentoPadrao is a number or default
             diaVencimentoPadrao: typeof initialData.diaVencimentoPadrao === 'number' ? initialData.diaVencimentoPadrao : 15,
        });
    }
   }, [initialData, form]);


   useEffect(() => {
    const cep = watchedCep?.replace(/\D/g, ''); // Remove non-digits
    if (cep?.length === 8) {
      const fetchAddress = async () => {
        setCepLoading(true);
        try {
          const addressData = await getAddressByPostalCode(cep);
          if (addressData) {
            form.setValue('enderecoRua', addressData.street, {shouldValidate: true});
            form.setValue('enderecoBairro', addressData.neighborhood, {shouldValidate: true});
            form.setValue('enderecoCidade', addressData.city, {shouldValidate: true});
            // Don't automatically set number or complement from ViaCEP
            // form.setValue('enderecoNumero', addressData.number || '');
            // form.setValue('enderecoComplemento', addressData.complement || '');
          } else {
            console.warn('CEP não encontrado:', cep);
             // Clear fields if CEP not found
             form.setValue('enderecoRua', '', { shouldValidate: true });
             form.setValue('enderecoBairro', '', { shouldValidate: true });
             form.setValue('enderecoCidade', '', { shouldValidate: true });
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
        } finally {
          setCepLoading(false);
        }
      };
      fetchAddress();
    }
  }, [watchedCep, form]);


  const handleFormSubmit = async (data: ConfiguracoesFormValues) => {
    if (onSubmit) {
      await onSubmit({
          ...data,
         // Ensure diaVencimentoPadrao is submitted as a number
         diaVencimentoPadrao: Number(data.diaVencimentoPadrao)
      });
    } else {
      console.log('Submitting configuration data (default action)...', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Configuration data submitted successfully.');
    }
  };

   // Helper to format CNPJ/CEP on input change
   const formatInput = (value: string | undefined, type: 'cnpj' | 'cep'): string => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (type === 'cnpj') {
      return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18); // XX.XXX.XXX/XXXX-XX
    }
    if (type === 'cep') {
      return digits
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 9); // XXXXX-XXX
    }
    return value;
  };

  // Generate options for day selection
  const dayOptions = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Company Info */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Dados da Assessoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="razaoSocial"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Razão Social*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da sua empresa de assessoria" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nomeFantasia"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome comercial (opcional)" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ*</FormLabel>
                <FormControl>
                  <Input
                    placeholder="XX.XXX.XXX/XXXX-XX"
                    {...field}
                    onChange={(e) => field.onChange(formatInput(e.target.value, 'cnpj'))}
                     disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Company Address */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Endereço da Assessoria</h3>
           <FormField
              control={form.control}
              name="enderecoCep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP*</FormLabel>
                  <FormControl>
                     <div className="flex items-center gap-2">
                      <Input
                        placeholder="XXXXX-XXX"
                        {...field}
                        onChange={(e) => field.onChange(formatInput(e.target.value, 'cep'))}
                        maxLength={9}
                         disabled={isSubmitting || cepLoading}
                      />
                      {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="enderecoRua"
              render={({field}) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Rua*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da rua, avenida, etc." {...field} disabled={isSubmitting || cepLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="enderecoNumero"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Número*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nº" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="enderecoComplemento"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input placeholder="Apto, Bloco, Sala" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enderecoBairro"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Bairro*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do bairro" {...field} disabled={isSubmitting || cepLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enderecoCidade"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Cidade*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da cidade" {...field} disabled={isSubmitting || cepLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

         {/* Contact Info */}
        <section className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-medium mb-4">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>E-mail*</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="contato@suaassessoria.com" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Telefone*</FormLabel>
                    <FormControl>
                        <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </section>

        {/* Bank Details for Receiving Payments */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Dados Bancários para Recebimento</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="banco"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome ou número do banco" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agencia"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl>
                    <Input placeholder="Número da agência (com dígito, se houver)" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conta"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Conta Corrente</FormLabel>
                  <FormControl>
                    <Input placeholder="Número da conta com dígito" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
              control={form.control}
              name="chavePix"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Chave PIX</FormLabel>
                  <FormControl>
                    <Input placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória" {...field} disabled={isSubmitting}/>
                  </FormControl>
                   <FormDescription>Esta chave será usada nas faturas e documentos de cobrança.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </section>

        {/* Financial Settings */}
        <section className="space-y-4 p-4 border rounded-md">
             <h3 className="text-lg font-medium mb-4">Configurações Financeiras</h3>
             <FormField
                control={form.control}
                name="diaVencimentoPadrao"
                render={({field}) => (
                    <FormItem>
                    <FormLabel>Dia Padrão de Vencimento*</FormLabel>
                    <Select
                        onValueChange={(value) => field.onChange(parseInt(value, 10))} // Ensure value is number
                        value={field.value?.toString()} // Convert number to string for Select value
                        disabled={isSubmitting}
                    >
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o dia do mês" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {dayOptions.map(day => (
                             <SelectItem key={day} value={day}>{day}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                     <FormDescription>Dia do mês seguinte à homologação para vencimento das faturas.</FormDescription>
                     <FormMessage />
                    </FormItem>
                )}
                />
        </section>


         {/* Logo Upload - Placeholder */}
         {/* <section className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-medium mb-4">Logo da Assessoria</h3>
            <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>URL do Logo</FormLabel>
                    <FormControl>
                       <Input type="url" placeholder="https://..." {...field} disabled={isSubmitting} />
                    </FormControl>
                     <FormDescription>Link para a imagem do logo que aparecerá nos relatórios.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
             {/* Or implement file upload here */}
         {/* </section> */}


        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || cepLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </Form>
  );
}
