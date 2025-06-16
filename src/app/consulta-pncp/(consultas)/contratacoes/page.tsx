
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
// ResultsDisplay is used by ApiConsultaForm internally
// import ResultsDisplay from '@/components/consulta-legado/common/ResultsDisplay'; 
import { filterLicitacoesWithAI, type FilterLicitacoesInput, type FilterLicitacoesOutput, type LicitacaoSummary } from '@/ai/flows/filter-licitacoes-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { zodResolver } from '@hookform/resolvers/zod';

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
  aiRegiao: z.string().optional(), 
  aiTipoLicitacao: z.string().optional(), 
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
    tamanhoPagina: 50,
    uf: undefined,
    termoBusca: '',
    aiRegiao: '', 
    aiTipoLicitacao: '', 
  };

  // State to hold the data that will be displayed (could be raw API data or AI-filtered data)
  const [processedDataForDisplay, setProcessedDataForDisplay] = useState<any>(null);
  const [isFilteringWithAI, setIsFilteringWithAI] = useState(false);
  const [aiFilterError, setAiFilterError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // Keep track of the page for the API call

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });


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
            <FormField control={currentForm.control} name="aiRegiao" render={({ field }) => ( 
              <FormItem> 
                <FormLabel>Filtrar por Região Descritiva (IA)</FormLabel> 
                <FormControl><Input placeholder="Ex: Oeste do Paraná, Sul de Minas" {...field} value={field.value ?? ''} /></FormControl> 
                <FormMessage /> 
              </FormItem> 
            )}/>
            <FormField control={currentForm.control} name="aiTipoLicitacao" render={({ field }) => ( 
              <FormItem> 
                <FormLabel>Filtrar por Tipo/Objeto Descritivo (IA)</FormLabel> 
                <FormControl><Input placeholder="Ex: reforma, obra, serviços de limpeza" {...field} value={field.value ?? ''} /></FormControl> 
                <FormMessage /> 
              </FormItem> 
            )}/>
        </div>
         <p className="text-xs text-muted-foreground mt-2">Os filtros IA são aplicados sobre os resultados da busca principal. Pode levar alguns segundos adicionais.</p>
      </div>
    </>
  );

  const handleFetchData = async (formValues: FormValues, pageToFetch: number): Promise<any> => {
     const params: ConsultarContratacoesPNCPParams = {
        dataInicial: formValues.dataInicial,
        dataFinal: formValues.dataFinal,
        codigoModalidadeContratacao: formValues.codigoModalidadeContratacao,
        pagina: pageToFetch,
        tamanhoPagina: formValues.tamanhoPagina,
        uf: formValues.uf,
        termoBusca: formValues.termoBusca,
     };
     let rawResult = await consultarContratacoesPNCP(params);
     let finalDataToDisplay = rawResult;

     const { aiRegiao, aiTipoLicitacao } = formValues; // Get AI filters from current form values

     if ((aiRegiao && aiRegiao.trim() !== '') || (aiTipoLicitacao && aiTipoLicitacao.trim() !== '')) {
        if (rawResult && rawResult.data && rawResult.data.length > 0) {
            setIsFilteringWithAI(true);
            setAiFilterError(null);
            try {
                const licitacoesToFilter: LicitacaoSummary[] = rawResult.data.map((item: any) => ({
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
                    ...(aiRegiao && aiRegiao.trim() !== '' && { regiao: aiRegiao.trim() }),
                    ...(aiTipoLicitacao && aiTipoLicitacao.trim() !== '' && { tipoLicitacao: aiTipoLicitacao.trim() }),
                };
                
                const aiFilteredResult: FilterLicitacoesOutput = await filterLicitacoesWithAI(input);
                
                finalDataToDisplay = {
                    ...rawResult, // Keep original pagination info
                    data: aiFilteredResult.filteredLicitacoes,
                    totalRegistrosFiltradosAI: aiFilteredResult.filteredLicitacoes.length,
                };
            } catch (err) {
                console.error("Error during AI filtering:", err);
                const errorMessage = err instanceof Error ? err.message : "Erro desconhecido no filtro IA.";
                setAiFilterError(errorMessage);
                // Fallback to raw data, finalDataToDisplay is already rawResult
            } finally {
                setIsFilteringWithAI(false);
            }
        } else {
             // No raw data to filter with AI, or AI filters not active
            console.log("No raw data for AI filtering or AI filters not active.");
        }
     }
     
     setProcessedDataForDisplay(finalDataToDisplay);
     return finalDataToDisplay; // Return the (potentially AI-filtered) data
  }

  const handleApiFormPageChange = (newPage: number) => {
    setCurrentPage(newPage); // Update local current page, which then feeds into fetchDataFunction
  };


  return (
    <FormProvider {...form}>
      <ApiConsultaForm
        formSchema={formSchema}
        defaultValues={defaultValues}
        renderFormFields={renderFormFields}
        fetchDataFunction={(values) => handleFetchData(values, currentPage)} // Pass currentPage
        onPageChange={handleApiFormPageChange} 
        formTitle="Consultar Contratações por Data de Publicação (PNCP)"
        formDescription="Busque contratações publicadas no PNCP. Filtros IA são aplicados após a busca inicial."
        externalData={processedDataForDisplay} // Pass the processed data to ApiConsultaForm
      />
      {isFilteringWithAI && (
        <div className="mt-4 flex items-center justify-center text-primary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Filtrando resultados com IA...</span>
        </div>
      )}
      {aiFilterError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Erro no Filtro IA</AlertTitle>
          <AlertDescription>{aiFilterError}</AlertDescription>
        </Alert>
      )}
    </FormProvider>
  );
}
    
