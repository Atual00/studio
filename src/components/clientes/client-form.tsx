'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller, useWatch} from 'react-hook-form';
import {z} from 'zod';
import {useState, useEffect} from 'react';

import {Button} from '@/components/ui/button';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {getAddressByPostalCode, type Address} from '@/services/address'; // Import service
import { Loader2 } from 'lucide-react'; // Import Loader

const companySizeOptions = ['MEI', 'ME', 'EPP', 'Demais']; // Added 'Demais'

// Zod schema for validation
const clientFormSchema = z.object({
  razaoSocial: z.string().min(2, {message: 'Razão Social deve ter pelo menos 2 caracteres.'}),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {message: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX.'}),
  inscricaoEstadual: z.string().optional(),
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
  // Company Details
  enquadramento: z.string({required_error: 'Selecione o enquadramento da empresa.'}),
  // Bank Details
  banco: z.string().optional(),
  conta: z.string().optional(),
  agencia: z.string().optional(),
  // Partner Details
  socioNome: z.string().min(2, {message: 'Nome do sócio é obrigatório.'}),
  socioCpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {message: 'CPF inválido. Use o formato XXX.XXX.XXX-XX.'}),
  socioRg: z.string().optional(),
  copiarEnderecoEmpresa: z.boolean().default(false),
  // Partner Address fields (optional if copying)
  socioEnderecoRua: z.string().optional(),
  socioEnderecoNumero: z.string().optional(),
  socioEnderecoComplemento: z.string().optional(),
  socioEnderecoBairro: z.string().optional(),
  socioEnderecoCidade: z.string().optional(),
  socioEnderecoCep: z.string().optional(),
  // Observations
  observacoes: z.string().optional(),
})
// Add refinement to make partner address optional only if copyAddressFlag is true
.refine(data => {
    if (data.copiarEnderecoEmpresa) {
      return true; // If copying, other fields are not required
    }
    // If not copying, these fields become required (example for CEP)
    return !!data.socioEnderecoCep?.match(/^\d{5}-\d{3}$/);
  }, {
    message: "CEP do sócio é obrigatório quando não se copia o endereço da empresa.",
    path: ["socioEnderecoCep"], // Specify the path of the error
  })
  // Add more refinements for other partner address fields if needed
   .refine(data => data.copiarEnderecoEmpresa || !!data.socioEnderecoRua, {
    message: "Rua do sócio é obrigatória.",
    path: ["socioEnderecoRua"],
   })
    .refine(data => data.copiarEnderecoEmpresa || !!data.socioEnderecoNumero, {
    message: "Número do sócio é obrigatório.",
    path: ["socioEnderecoNumero"],
   })
     .refine(data => data.copiarEnderecoEmpresa || !!data.socioEnderecoBairro, {
    message: "Bairro do sócio é obrigatório.",
    path: ["socioEnderecoBairro"],
   })
      .refine(data => data.copiarEnderecoEmpresa || !!data.socioEnderecoCidade, {
    message: "Cidade do sócio é obrigatória.",
    path: ["socioEnderecoCidade"],
   });


export type ClientFormValues = z.infer<typeof clientFormSchema>;

// Define ClientDetails by extending ClientFormValues with an ID
export interface ClientDetails extends ClientFormValues {
  id: string;
}


interface ClientFormProps {
  initialData?: Partial<ClientFormValues>; // For editing
  onSubmit?: (data: ClientFormValues) => void | Promise<void>; // Optional submit handler
  isSubmitting?: boolean; // Added prop to reflect submitting state
}

export default function ClientForm({initialData, onSubmit, isSubmitting = false}: ClientFormProps) {
  // Removed internal isSubmitting state, use the prop instead
  const [cepLoading, setCepLoading] = useState(false);
  const [socioCepLoading, setSocioCepLoading] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialData || {
      copiarEnderecoEmpresa: false,
      // Initialize other fields as needed, e.g., empty strings
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      enderecoRua: '',
      enderecoNumero: '',
      enderecoComplemento: '',
      enderecoBairro: '',
      enderecoCidade: '',
      enderecoCep: '',
      email: '',
      telefone: '',
      enquadramento: undefined, // Important for Select placeholder
      banco: '',
      conta: '',
      agencia: '',
      socioNome: '',
      socioCpf: '',
      socioRg: '',
      socioEnderecoRua: '',
      socioEnderecoNumero: '',
      socioEnderecoComplemento: '',
      socioEnderecoBairro: '',
      socioEnderecoCidade: '',
      socioEnderecoCep: '',
      observacoes: '',
    },
  });

  // Reset form if initialData changes (e.g., after successful fetch in edit mode)
   useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);


  const watchedCep = useWatch({control: form.control, name: 'enderecoCep'});
  const watchedSocioCep = useWatch({control: form.control, name: 'socioEnderecoCep'});
  const copyAddressFlag = useWatch({control: form.control, name: 'copiarEnderecoEmpresa'});

  // --- CEP Autofill Logic ---
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
            // Optionally set number focus or handle complement
            // Don't automatically set number or complement from ViaCEP
          } else {
            // Handle case where CEP is not found (optional: clear fields or show message)
            console.warn('CEP não encontrado:', cep);
             // Clear fields if CEP not found, except CEP itself
             form.setValue('enderecoRua', '', { shouldValidate: true });
             form.setValue('enderecoBairro', '', { shouldValidate: true });
             form.setValue('enderecoCidade', '', { shouldValidate: true });
             form.setValue('enderecoNumero', '', { shouldValidate: true });
             form.setValue('enderecoComplemento', '', { shouldValidate: true });
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
          // Optionally show an error toast to the user
        } finally {
          setCepLoading(false);
        }
      };
      fetchAddress();
    }
  }, [watchedCep, form]);

  // --- Socio CEP Autofill Logic ---
   useEffect(() => {
    if (copyAddressFlag) return; // Don't autofill if copying

    const cep = watchedSocioCep?.replace(/\D/g, ''); // Remove non-digits
    if (cep?.length === 8) {
      const fetchAddress = async () => {
        setSocioCepLoading(true);
        try {
          const addressData = await getAddressByPostalCode(cep);
          if (addressData) {
            form.setValue('socioEnderecoRua', addressData.street, { shouldValidate: true });
            form.setValue('socioEnderecoBairro', addressData.neighborhood, { shouldValidate: true });
            form.setValue('socioEnderecoCidade', addressData.city, { shouldValidate: true });
            // Don't automatically set number or complement
          } else {
             console.warn('CEP do sócio não encontrado:', cep);
             // Clear socio address fields if CEP not found
             form.setValue('socioEnderecoRua', '', { shouldValidate: true });
             form.setValue('socioEnderecoBairro', '', { shouldValidate: true });
             form.setValue('socioEnderecoCidade', '', { shouldValidate: true });
             form.setValue('socioEnderecoNumero', '', { shouldValidate: true });
             form.setValue('socioEnderecoComplemento', '', { shouldValidate: true });
          }
        } catch (error) {
          console.error('Erro ao buscar CEP do sócio:', error);
        } finally {
          setSocioCepLoading(false);
        }
      };
      fetchAddress();
    }
  }, [watchedSocioCep, form, copyAddressFlag]);


   // --- Address Copy Logic ---
    useEffect(() => {
      const isInitialLoadWithCopy = initialData?.copiarEnderecoEmpresa && !form.formState.isDirty;

      if (copyAddressFlag) {
        form.setValue('socioEnderecoRua', form.getValues('enderecoRua'));
        form.setValue('socioEnderecoNumero', form.getValues('enderecoNumero'));
        form.setValue('socioEnderecoComplemento', form.getValues('enderecoComplemento'));
        form.setValue('socioEnderecoBairro', form.getValues('enderecoBairro'));
        form.setValue('socioEnderecoCidade', form.getValues('enderecoCidade'));
        form.setValue('socioEnderecoCep', form.getValues('enderecoCep'));
         // Clear errors for socio address fields when copying
         form.clearErrors(['socioEnderecoRua', 'socioEnderecoNumero', 'socioEnderecoBairro', 'socioEnderecoCidade', 'socioEnderecoCep']);

      } else if (!isInitialLoadWithCopy) { // Only clear/reset if not initial load OR if user explicitly unchecked
        // When unchecking, reset to initial partner data or empty strings
        form.setValue('socioEnderecoRua', initialData?.socioEnderecoRua || '');
        form.setValue('socioEnderecoNumero', initialData?.socioEnderecoNumero || '');
        form.setValue('socioEnderecoComplemento', initialData?.socioEnderecoComplemento || '');
        form.setValue('socioEnderecoBairro', initialData?.socioEnderecoBairro || '');
        form.setValue('socioEnderecoCidade', initialData?.socioEnderecoCidade || '');
        form.setValue('socioEnderecoCep', initialData?.socioEnderecoCep || '');
         // Re-validate potentially required fields
         form.trigger(['socioEnderecoRua', 'socioEnderecoNumero', 'socioEnderecoBairro', 'socioEnderecoCidade', 'socioEnderecoCep']);
      }
    }, [copyAddressFlag, form, initialData]); // Rerun when copy flag or initial data changes


  const handleFormSubmit = async (data: ClientFormValues) => {
    // The parent component now controls the isSubmitting state
    console.log('Form Data:', data); // Log data for debugging
    if (onSubmit) {
      await onSubmit(data);
    } else {
      // Default action if no onSubmit provided
      console.log('Submitting client data (default action - no-op)...', data);
      // Default behavior might be nothing, or a generic log/warning
    }
  };

  // Helper to format CNPJ/CPF/CEP on input change
  const formatInput = (value: string | undefined, type: 'cnpj' | 'cpf' | 'cep'): string => {
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
    if (type === 'cpf') {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14); // XXX.XXX.XXX-XX
    }
     if (type === 'cep') {
      return digits
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 9); // XXXXX-XXX
    }
    return value;
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Company Info */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Informações da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="razaoSocial"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Razão Social*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo da empresa" {...field} disabled={isSubmitting} />
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
                    <Input placeholder="Nome comercial da empresa" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <FormField
              control={form.control}
              name="inscricaoEstadual"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Inscrição Estadual</FormLabel>
                  <FormControl>
                    <Input placeholder="Número da Inscrição Estadual ou 'Isento'" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="enquadramento"
            render={({field}) => (
              <FormItem>
                <FormLabel>Enquadramento*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o porte da empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companySizeOptions.map(size => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Company Address */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Endereço da Empresa</h3>
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
                        <Input type="email" placeholder="contato@empresa.com" {...field} disabled={isSubmitting}/>
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


        {/* Bank Details */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Dados Bancários</h3>
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
                    <Input placeholder="Número da agência" {...field} disabled={isSubmitting}/>
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
                  <FormLabel>Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Número da conta com dígito" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Partner Details */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Dados do Sócio</h3>
          <FormField
              control={form.control}
              name="socioNome"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Nome Completo do Sócio*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do sócio administrador ou representante" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="socioCpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF do Sócio*</FormLabel>
                  <FormControl>
                     <Input
                      placeholder="XXX.XXX.XXX-XX"
                      {...field}
                      onChange={(e) => field.onChange(formatInput(e.target.value, 'cpf'))}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socioRg"
              render={({field}) => (
                <FormItem>
                  <FormLabel>RG do Sócio</FormLabel>
                  <FormControl>
                    <Input placeholder="Número do RG" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

           {/* Partner Address */}
          <div className="space-y-4 mt-6 pt-4 border-t">
             <FormField
                control={form.control}
                name="copiarEnderecoEmpresa"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox
                         checked={field.value}
                         onCheckedChange={field.onChange}
                         disabled={isSubmitting}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                        Usar o mesmo endereço da empresa para o sócio
                        </FormLabel>
                    </div>
                     <FormMessage />
                    </FormItem>
                )}
                />

             {/* Conditional rendering based on copyAddressFlag */}
             <div className={cn("space-y-4", copyAddressFlag && "opacity-50 pointer-events-none")}>
                 <FormField
                     control={form.control}
                     name="socioEnderecoCep"
                     render={({ field }) => (
                         <FormItem>
                         <FormLabel>CEP Sócio{copyAddressFlag ? "" : "*"}</FormLabel>
                         <FormControl>
                            <div className="flex items-center gap-2">
                             <Input
                                 placeholder="XXXXX-XXX"
                                 {...field}
                                 onChange={(e) => field.onChange(formatInput(e.target.value, 'cep'))}
                                 maxLength={9}
                                 disabled={isSubmitting || socioCepLoading || copyAddressFlag}
                                 required={!copyAddressFlag} // Mark as required visually/semantically
                             />
                              {socioCepLoading && !copyAddressFlag && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                             </div>
                         </FormControl>
                         <FormMessage />
                         </FormItem>
                     )}
                     />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                     control={form.control}
                     name="socioEnderecoRua"
                     render={({ field }) => (
                         <FormItem className="md:col-span-2">
                         <FormLabel>Rua Sócio{copyAddressFlag ? "" : "*"}</FormLabel>
                         <FormControl>
                             <Input placeholder="Endereço do sócio" {...field} disabled={isSubmitting || socioCepLoading || copyAddressFlag} required={!copyAddressFlag}/>
                         </FormControl>
                         <FormMessage />
                         </FormItem>
                     )}
                     />
                      <FormField
                     control={form.control}
                     name="socioEnderecoNumero"
                     render={({ field }) => (
                         <FormItem>
                         <FormLabel>Número Sócio{copyAddressFlag ? "" : "*"}</FormLabel>
                         <FormControl>
                             <Input placeholder="Nº" {...field} disabled={isSubmitting || copyAddressFlag} required={!copyAddressFlag}/>
                         </FormControl>
                          <FormMessage />
                         </FormItem>
                     )}
                     />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                     control={form.control}
                     name="socioEnderecoComplemento"
                     render={({ field }) => (
                         <FormItem>
                         <FormLabel>Complemento Sócio</FormLabel>
                         <FormControl>
                             <Input placeholder="Apto, Bloco" {...field} disabled={isSubmitting || copyAddressFlag}/>
                         </FormControl>
                          <FormMessage />
                         </FormItem>
                     )}
                     />
                     <FormField
                     control={form.control}
                     name="socioEnderecoBairro"
                     render={({ field }) => (
                         <FormItem>
                         <FormLabel>Bairro Sócio{copyAddressFlag ? "" : "*"}</FormLabel>
                         <FormControl>
                             <Input placeholder="Bairro do sócio" {...field} disabled={isSubmitting || socioCepLoading || copyAddressFlag} required={!copyAddressFlag}/>
                         </FormControl>
                          <FormMessage />
                         </FormItem>
                     )}
                     />
                      <FormField
                     control={form.control}
                     name="socioEnderecoCidade"
                     render={({ field }) => (
                         <FormItem>
                         <FormLabel>Cidade Sócio{copyAddressFlag ? "" : "*"}</FormLabel>
                         <FormControl>
                             <Input placeholder="Cidade do sócio" {...field} disabled={isSubmitting || socioCepLoading || copyAddressFlag} required={!copyAddressFlag}/>
                         </FormControl>
                          <FormMessage />
                         </FormItem>
                     )}
                     />
                 </div>
             </div>
          </div>

        </section>

        {/* Observations */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Observações</h3>
          <FormField
            control={form.control}
            name="observacoes"
            render={({field}) => (
              <FormItem>
                <FormLabel>Observações Gerais</FormLabel>
                <FormControl>
                  <Textarea placeholder="Informações adicionais sobre o cliente..." className="min-h-[100px]" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || cepLoading || socioCepLoading}>
             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Salvar Cliente'}
          </Button>
          {/* Add Cancel button if needed */}
           {/* <Button type="button" variant="outline" onClick={() => router.back()} className="ml-2" disabled={isSubmitting}>Cancelar</Button> */}
        </div>
      </form>
    </Form>
  );
}
