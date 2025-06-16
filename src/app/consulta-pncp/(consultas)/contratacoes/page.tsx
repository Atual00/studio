
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { CalendarIcon, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultsDisplay from '@/components/consulta-legado/common/ResultsDisplay'; // Re-using for display
import { filterLicitacoesWithAI, type FilterLicitacoesInput, type FilterLicitacoesOutput } from '@/ai/flows/filter-licitacoes-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const modalidadesPNCP = [
  { value: 1, label: 'Leilão - Eletrônico' },
  { value: 2, label: 'Diálogo Competitivo' },
  { value: 3, label: 'Concurso' },
  { value: 4, label: 'Concorrência - Eletrônica' },
  { value: 5, label: 'Concorrência - Presencial' },
  { value: 6, label: 'Pregão - Eletrônico' },
  { value: 7, label: 'Pregão - Presencial' },
  { value: 8, label: 'Dispensa de Licitação' },
  { value: 9, label: 'Inexigibilidade' },
  { value: 10, label: 'Manifestação de Interesse' },
  { value: 11, label: 'Pré-qualificação' },
  { value: 12, label: 'Credenciamento' },
  { value: 13, label: 'Leilão - Presencial' }
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

const regioesBrasil = [
    { value: 'NORTE', label: 'Norte' },
    { value: 'NORDESTE', label: 'Nordeste' },
    { value: 'CENTRO_OESTE', label: 'Centro-Oeste' },
    { value: 'SUDESTE', label: 'Sudeste' },
    { value: 'SUL', label: 'Sul' },
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
  uf: z.string().optional().transform(val => val === 'todos' || !val ? undefined : val),
  termoBusca: z.string().optional(),
  // AI Filters
  aiRegiao: z.string().optional().transform(val => val === 'todas' || !val ? undefined : val),
  aiTipoLicitacao: z.string().optional().transform(val => val === 'todos' || !val ? undefined : val),
}).refine(data => data.dataFinal >= data.dataInicial, {
  message: "Data final deve ser maior ou igual à data inicial.",
  path: ["dataFinal"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultarContratacoesPncpPage() {
  const defaultValues: FormValues = {
    dataInicial: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dataFinal: new Date(),
    codigoModalidadeContratacao: 6, // Default to Pregão Eletrônico
    pagina: 1,
    tamanhoPagina: 50, // Default 50, max 500
    uf: undefined,
    termoBusca: '',
    aiRegiao: undefined,
    aiTipoLicitacao: undefined,
  };

  const [apiRawData, setApiRawData] = useState<any>(null);
  const [processedDataForDisplay, setProcessedDataForDisplay] = useState<any>(null);
  const [isFilteringWithAI, setIsFilteringWithAI] = useState(false);
  const [aiFilterError, setAiFilterError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // For pagination management

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // This effect triggers AI filtering when raw API data changes and AI filters are active
  useEffect(() => {
    const performAiFiltering = async () => {
      if (!apiRawData || !apiRawData.data || apiRawData.data.length === 0) {
        setProcessedDataForDisplay(apiRawData); // Pass through raw data if no AI filtering needed or no data
        return;
      }

      const { aiRegiao, aiTipoLicitacao } = form.getValues();
      if (!aiRegiao && !aiTipoLicitacao) {
        setProcessedDataForDisplay(apiRawData); // No AI filters selected
        return;
      }

      setIsFilteringWithAI(true);
      setAiFilterError(null);
      try {
        const licitacoesToFilter = apiRawData.data.map((item: any) => ({ // Map to a simpler structure for AI
          numeroControlePNCP: item.numeroControlePNCP,
          objetoCompra: item.objetoCompra,
          modalidadeContratacaoNome: item.modalidadeContratacaoNome,
          uf: item.unidadeOrgao?.uf,
          municipioNome: item.unidadeOrgao?.municipioNome,
          valorTotalEstimado: item.valorTotalEstimado,
          dataPublicacaoPncp: item.dataPublicacaoPncp,
          linkSistemaOrigem: item.linkSistemaOrigem,
          orgaoEntidadeNome: item.orgaoEntidade?.nomeRazaoSocial,
        }));

        const input: FilterLicitacoesInput = {
          licitacoes: licitacoesToFilter,
          ...(aiRegiao && { regiao: aiRegiao }),
          ...(aiTipoLicitacao && { tipoLicitacao: aiTipoLicitacao }),
        };
        const result: FilterLicitacoesOutput = await filterLicitacoesWithAI(input);
        
        // Reconstruct the data structure for ResultsDisplay, keeping original pagination info
        setProcessedDataForDisplay({
            ...apiRawData, // Keep original pagination, totalRegistros etc.
            data: result.filteredLicitacoes, // Replace data with filtered list
            totalRegistrosFiltradosAI: result.filteredLicitacoes.length, // Add new info
        });

      } catch (err) {
        console.error("Error during AI filtering:", err);
        setAiFilterError(err instanceof Error ? err.message : "Erro desconhecido no filtro IA.");
        setProcessedDataForDisplay(apiRawData); // Show raw data on AI error
      } finally {
        setIsFilteringWithAI(false);
      }
    };

    performAiFiltering();
  }, [apiRawData, form]);


  const renderFormFields = (currentForm: ReturnType<typeof useForm<FormValues>>) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField control={currentForm.control} name="dataInicial" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Inicial*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        <FormField control={currentForm.control} name="dataFinal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data Final*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        <FormField control={currentForm.control} name="codigoModalidadeContratacao" render={({ field }) => ( <FormItem> <FormLabel>Modalidade da Contratação*</FormLabel> <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}> <FormControl><SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger></FormControl> <SelectContent> {modalidadesPNCP.map(modalidade => ( <SelectItem key={modalidade.value} value={String(modalidade.value)}> {modalidade.label} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
        <FormField control={currentForm.control} name="uf" render={({ field }) => ( <FormItem> <FormLabel>UF (Estado)</FormLabel> <Select onValueChange={field.onChange} value={field.value || 'todos'}> <FormControl><SelectTrigger><SelectValue placeholder="Todos os Estados" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="todos">Todos os Estados</SelectItem> {ufsBrasil.map(uf => ( <SelectItem key={uf.value} value={uf.value}> {uf.label} ({uf.value}) </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
        <FormField control={currentForm.control} name="termoBusca" render={({ field }) => ( <FormItem> <FormLabel>Termo de Busca (Objeto)</FormLabel> <FormControl><Input placeholder="Ex: aquisição de computadores" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>
        <FormField control={currentForm.control} name="tamanhoPagina" render={({ field }) => (<FormItem><FormLabel>Resultados por Página</FormLabel><FormControl><Input type="number" min="1" max="500" placeholder="Padrão: 50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value,10) || 50)} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <div className="mt-6 pt-4 border-t">
        <h4 className="text-md font-semibold mb-2 flex items-center"><Filter className="h-5 w-5 mr-2 text-primary"/>Filtros Adicionais (IA)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={currentForm.control} name="aiRegiao" render={({ field }) => ( <FormItem> <FormLabel>Filtrar por Região (IA)</FormLabel> <Select onValueChange={field.onChange} value={field.value || 'todas'}> <FormControl><SelectTrigger><SelectValue placeholder="Todas as Regiões" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="todas">Todas as Regiões</SelectItem> {regioesBrasil.map(reg => ( <SelectItem key={reg.value} value={reg.value}> {reg.label} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            <FormField control={currentForm.control} name="aiTipoLicitacao" render={({ field }) => ( <FormItem> <FormLabel>Filtrar por Tipo de Licitação (IA)</FormLabel> <Select onValueChange={field.onChange} value={field.value || 'todos'}> <FormControl><SelectTrigger><SelectValue placeholder="Todos os Tipos" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="todos">Todos os Tipos</SelectItem> {modalidadesPNCP.map(mod => ( <SelectItem key={mod.value} value={mod.label}> {mod.label} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
        </div>
         <p className="text-xs text-muted-foreground mt-2">Os filtros IA são aplicados sobre os resultados da busca principal. Pode levar alguns segundos adicionais.</p>
      </div>
    </>
  );

  const handleFetchData = async (values: FormValues, pageToFetch: number): Promise<any> => {
     const params: ConsultarContratacoesPNCPParams = {
        dataInicial: values.dataInicial,
        dataFinal: values.dataFinal,
        codigoModalidadeContratacao: values.codigoModalidadeContratacao,
        pagina: pageToFetch, // Use pageToFetch for pagination
        tamanhoPagina: values.tamanhoPagina,
        uf: values.uf,
        termoBusca: values.termoBusca,
     };
     // This function now just fetches, AI filtering is handled by useEffect
     const rawResult = await consultarContratacoesPNCP(params);
     setApiRawData(rawResult); // Store raw data to trigger AI filtering effect
     // For ApiConsultaForm, we immediately return the raw data.
     // The display will update once AI filtering (if any) completes.
     return rawResult;
  }

  // Callback for ApiConsultaForm to update the current page state here
  const handleApiFormPageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // The fetch will be triggered by ApiConsultaForm's internal logic
  };


  return (
    <FormProvider {...form}>
      <ApiConsultaForm
        formSchema={formSchema}
        defaultValues={defaultValues}
        renderFormFields={renderFormFields}
        fetchDataFunction={(values) => handleFetchData(values, currentPage)} // Pass current page
        onPageChange={handleApiFormPageChange} // Allow ApiConsultaForm to update page
        formTitle="Consultar Contratações por Data de Publicação (PNCP)"
        formDescription="Busque contratações publicadas no PNCP. Filtros IA são aplicados após a busca inicial."
        externalData={processedDataForDisplay} // Pass processed data for display
      />
      {isFilteringWithAI && (
        <div className="mt-4 flex items-center justify-center text-primary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Filtrando resultados com IA...</span>
        </div>
      )}
      {aiFilterError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Erro no Filtro IA</AlertTitle>
          <AlertDescription>{aiFilterError}</AlertDescription>
        </Alert>
      )}
       {/* ResultsDisplay is now handled inside ApiConsultaForm using externalData */}
    </FormProvider>
  );
}
