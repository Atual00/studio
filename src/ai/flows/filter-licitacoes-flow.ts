
'use server';
/**
 * @fileOverview An AI agent for filtering lists of licitações based on criteria like region and bid type.
 *
 * - filterLicitacoesWithAI - A function that filters licitações using AI.
 * - FilterLicitacoesInput - The input type for the filterLicitacoesWithAI function.
 * - FilterLicitacoesOutput - The return type for the filterLicitacoesWithAI function.
 */

import {ai} from '@/ai/ai-instance'; // Assuming your global AI instance is here
import {z} from 'genkit';

// A simplified structure for licitacao data relevant for filtering
const LicitacaoSummarySchema = z.object({
  numeroControlePNCP: z.string().describe('Unique control number from PNCP.'),
  objetoCompra: z.string().describe('The object of the bid/purchase.'),
  modalidadeContratacaoNome: z.string().optional().describe('Name of the bid modality (e.g., "Pregão Eletrônico").'),
  uf: z.string().optional().describe('The state (Unidade Federativa, e.g., "SP", "RJ") where the bid is located.'),
  municipioNome: z.string().optional().describe('The name of the municipality.'),
  valorTotalEstimado: z.number().optional().describe('Estimated total value of the bid.'),
  dataPublicacaoPncp: z.string().optional().describe('Publication date on PNCP (ISO format YYYY-MM-DD).'),
  linkSistemaOrigem: z.string().optional().describe('Link to the original system.'),
  orgaoEntidadeNome: z.string().optional().describe('Name of the purchasing body/entity.'),
});
export type LicitacaoSummary = z.infer<typeof LicitacaoSummarySchema>;

const FilterLicitacoesInputSchema = z.object({
  licitacoes: z.array(LicitacaoSummarySchema).describe('An array of licitação summary objects to be filtered.'),
  regiao: z.string().optional().describe('The descriptive region to filter by (e.g., "Oeste do Paraná", "Nordeste", "Sul de Minas Gerais"). The AI will interpret this based on UF and Municipio.'),
  tipoLicitacao: z.string().optional().describe('The descriptive bid type or object to filter by (e.g., "reforma", "obra", "serviços de limpeza"). The AI will search this in "objetoCompra".'),
});
export type FilterLicitacoesInput = z.infer<typeof FilterLicitacoesInputSchema>;

const FilterLicitacoesOutputSchema = z.object({
  filteredLicitacoes: z.array(LicitacaoSummarySchema).describe('An array of licitação summary objects that match the filter criteria.'),
});
export type FilterLicitacoesOutput = z.infer<typeof FilterLicitacoesOutputSchema>;

export async function filterLicitacoesWithAI(input: FilterLicitacoesInput): Promise<FilterLicitacoesOutput> {
  return filterLicitacoesFlow(input);
}

const filterLicitacoesPrompt = ai.definePrompt({
  name: 'filterLicitacoesPrompt',
  input: { schema: FilterLicitacoesInputSchema },
  output: { schema: FilterLicitacoesOutputSchema },
  prompt: `Você é um assistente especializado em filtrar listas de licitações públicas brasileiras.
Sua tarefa é analisar a lista de licitações fornecida e retornar APENAS aquelas que atendem aos critérios de filtro especificados pelo usuário: região descritiva e/ou tipo/objeto descritivo da licitação.

**Critérios de Mapeamento e Filtragem:**

- **Região Descritiva:** Se um filtro de 'regiao' for fornecido (ex: "Oeste do Paraná", "Sul de Minas Gerais", "Nordeste", "Todo o estado de São Paulo"):
    - Analise o campo 'uf' e 'municipioNome' de cada licitação.
    - Tente inferir se a licitação pertence à região descrita. Para regiões amplas como "Nordeste", use o mapeamento de UFs padrão:
        - Norte: AC, AP, AM, PA, RO, RR, TO
        - Nordeste: AL, BA, CE, MA, PB, PE, PI, RN, SE
        - Centro-Oeste: DF, GO, MT, MS
        - Sudeste: ES, MG, RJ, SP
        - Sul: PR, RS, SC
    - Para regiões mais específicas (ex: "Oeste do Paraná"), use bom senso e o contexto do 'municipioNome' e 'uf' para determinar se a licitação se encaixa.
    - Se o campo 'uf' ou 'municipioNome' estiver ausente, a licitação provavelmente não corresponderá a um filtro de região específico, a menos que seja uma região muito ampla (ex: "Brasil").

- **Tipo/Objeto Descritivo da Licitação:** Se um filtro de 'tipoLicitacao' for fornecido (ex: "reforma de escola", "compra de computadores", "serviços de limpeza"):
    - Analise o campo 'objetoCompra' de cada licitação.
    - Verifique se o 'objetoCompra' contém o termo fornecido em 'tipoLicitacao' ou palavras-chave semanticamente relacionadas. A correspondência não precisa ser exata, mas o tema deve ser o mesmo.

**Instruções:**
1.  Se um filtro de 'regiao' for fornecido, inclua apenas licitações que pertençam à região descrita.
2.  Se um filtro de 'tipoLicitacao' for fornecido, inclua apenas licitações cujo 'objetoCompra' seja compatível com o tipo/objeto descrito.
3.  Se AMBOS os filtros ('regiao' e 'tipoLicitacao') forem fornecidos, a licitação DEVE atender a AMBOS os critérios para ser incluída.
4.  Se NENHUM filtro for fornecido ('regiao' e 'tipoLicitacao' estão ausentes ou vazios), retorne TODAS as licitações da lista de entrada.
5.  Se um campo relevante para o filtro (como 'uf'/'municipioNome' para região ou 'objetoCompra' para tipo) estiver ausente na licitação, ela não deve corresponder a esse filtro específico.

**Lista de Licitações para Filtrar:**
\`\`\`json
{{{json licitacoes}}}
\`\`\`

**Filtros Solicitados:**
- Região Desejada: {{#if regiao}}'{{regiao}}'{{else}}Nenhuma{{/if}}
- Tipo/Objeto de Licitação Desejado: {{#if tipoLicitacao}}'{{tipoLicitacao}}'{{else}}Nenhum{{/if}}

Retorne um objeto JSON contendo APENAS a chave 'filteredLicitacoes', que deve ser um array com as licitações que passaram pelos filtros. Se nenhuma licitação atender aos critérios, retorne um array vazio para 'filteredLicitacoes'.
Não inclua nenhuma explicação ou texto adicional na sua resposta, apenas o JSON.
`,
});

const filterLicitacoesFlow = ai.defineFlow(
  {
    name: 'filterLicitacoesFlow',
    inputSchema: FilterLicitacoesInputSchema,
    outputSchema: FilterLicitacoesOutputSchema,
  },
  async (input) => {
    console.log('AI Filtering Input:', JSON.stringify(input, null, 2));
    if (input.licitacoes.length === 0) {
        return { filteredLicitacoes: [] };
    }
    if (!input.regiao && !input.tipoLicitacao) {
        return { filteredLicitacoes: input.licitacoes }; // No filters, return all
    }

    try {
      const { output } = await filterLicitacoesPrompt(input);
      if (!output || !Array.isArray(output.filteredLicitacoes)) {
        console.error('AI output structure error for filterLicitacoesFlow:', output);
        // Fallback to returning all if AI fails structurally, or an empty list if strict filtering is preferred
        return { filteredLicitacoes: input.licitacoes };
      }
      console.log('AI Filtering Output Count:', output.filteredLicitacoes.length);
      return output;
    } catch (error) {
      console.error("Error during AI prompt execution for filterLicitacoesFlow:", error);
      // Fallback strategy: return all input licitacoes on error to avoid losing data,
      // or return empty list if stricter failure handling is needed.
      return { filteredLicitacoes: input.licitacoes };
    }
  }
);
