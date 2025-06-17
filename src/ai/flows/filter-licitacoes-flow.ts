
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
  modalidadeContratacaoNome: z.string().nullable().optional().describe('Name of the bid modality (e.g., "Pregão Eletrônico").'),
  uf: z.string().nullable().optional().describe('The state (Unidade Federativa, e.g., "SP", "RJ", "Paraná") where the bid is located.'),
  municipioNome: z.string().nullable().optional().describe('The name of the municipality.'),
  valorTotalEstimado: z.number().nullable().optional().describe('Estimated total value of the bid.'),
  dataPublicacaoPncp: z.string().nullable().optional().describe('Publication date on PNCP (ISO format YYYY-MM-DD).'),
  linkSistemaOrigem: z.string().nullable().optional().describe('Link to the original system.'),
  orgaoEntidadeNome: z.string().nullable().optional().describe('Name of the purchasing body/entity.'),
});
export type LicitacaoSummary = z.infer<typeof LicitacaoSummarySchema>;

const FilterLicitacoesInputSchema = z.object({
  licitacoes: z.array(LicitacaoSummarySchema).describe('An array of licitação summary objects to be filtered.'),
  regiao: z.string().optional().describe('The descriptive region to filter by (e.g., "Oeste do Paraná", "Nordeste", "Sul de Minas Gerais", "Todo o estado de São Paulo"). The AI will interpret this based on UF and Municipio.'),
  tipoLicitacao: z.string().optional().describe('The descriptive bid type or object to filter by (e.g., "reforma", "obra", "serviços de limpeza", "aquisição de veículos"). The AI will search this in "objetoCompra".'),
});
export type FilterLicitacoesInput = z.infer<typeof FilterLicitacoesInputSchema>;

const FilterLicitacoesOutputSchema = z.object({
  filteredLicitacoes: z.array(LicitacaoSummarySchema).describe('An array of licitação summary objects that match ALL the filter criteria. Returns an empty array if no items match.'),
});
export type FilterLicitacoesOutput = z.infer<typeof FilterLicitacoesOutputSchema>;

export async function filterLicitacoesWithAI(input: FilterLicitacoesInput): Promise<FilterLicitacoesOutput> {
  // If no AI-specific filters are provided, or if the input licitacoes list is empty, return all input licitacoes.
  // This check is now primarily handled in the page component before calling the AI.
  // However, adding a safeguard here is also fine.
  if (input.licitacoes.length === 0 || ((!input.regiao || input.regiao.trim() === '') && (!input.tipoLicitacao || input.tipoLicitacao.trim() === ''))) {
    console.log("AI Filtering: No specific AI filters provided or no licitacoes to filter, returning input directly.");
    return { filteredLicitacoes: input.licitacoes };
  }
  return filterLicitacoesFlow(input);
}

const filterLicitacoesPrompt = ai.definePrompt({
  name: 'filterLicitacoesPrompt',
  input: { schema: FilterLicitacoesInputSchema },
  output: { schema: FilterLicitacoesOutputSchema },
  prompt: `Você é um assistente especializado em filtrar listas de licitações públicas brasileiras.
Sua tarefa é analisar a lista de licitações fornecida e retornar APENAS aquelas que atendem a TODOS os critérios de filtro especificados pelo usuário.

**Critérios de Mapeamento e Filtragem:**

- **Região Descritiva (Filtro 'regiao'):** Se um filtro de 'regiao' for fornecido:
    - Analise os campos 'uf' (estado) e 'municipioNome' de cada licitação.
    - **Regiões Amplas (Norte, Nordeste, Centro-Oeste, Sudeste, Sul):** Se 'regiao' for exatamente uma destas, use o mapeamento de UFs padrão:
        - Norte: AC, AP, AM, PA, RO, RR, TO
        - Nordeste: AL, BA, CE, MA, PB, PE, PI, RN, SE
        - Centro-Oeste: DF, GO, MT, MS
        - Sudeste: ES, MG, RJ, SP
        - Sul: PR, RS, SC
    - **Regiões Mais Específicas (ex: "Oeste do Paraná", "Sul de Minas Gerais", "Região Metropolitana de Curitiba"):** Tente inferir se a combinação 'uf' e 'municipioNome' da licitação corresponde à região descrita. Isso pode envolver verificar se o 'municipioNome' está contido na descrição da região e se a 'uf' é compatível. Se não houver uma correspondência clara ou se 'uf' ou 'municipioNome' estiverem ausentes/nulos, a licitação NÃO deve ser incluída se este filtro de região específica estiver ativo.
    - **Todo o Estado:** Se 'regiao' for algo como "Todo o estado de São Paulo" ou apenas "São Paulo" (e não for uma das 5 grandes regiões), verifique se a 'uf' da licitação corresponde ao estado mencionado.

- **Tipo/Objeto Descritivo da Licitação (Filtro 'tipoLicitacao'):** Se um filtro de 'tipoLicitacao' for fornecido (ex: "reforma de escola", "compra de computadores", "serviços de limpeza", "aquisição de veículos"):
    - Analise o campo 'objetoCompra' de cada licitação.
    - Verifique se o 'objetoCompra' contém o termo exato fornecido em 'tipoLicitacao' ou palavras-chave semanticamente muito próximas e diretamente relacionadas. A correspondência deve ser relevante para o contexto de licitações.
    - Se o 'objetoCompra' não corresponder ao 'tipoLicitacao', a licitação NÃO deve ser incluída se este filtro de tipo estiver ativo.

**Instruções IMPORTANTES:**
1.  Se um filtro de 'regiao' for fornecido, inclua APENAS licitações que satisfaçam estritamente o critério de 'regiao'. Se uma licitação não corresponder, EXCLUA-A.
2.  Se um filtro de 'tipoLicitacao' for fornecido, inclua APENAS licitações que satisfaçam estritamente o critério de 'tipoLicitacao' em seu 'objetoCompra'. Se uma licitação não corresponder, EXCLUA-A.
3.  Se AMBOS 'regiao' e 'tipoLicitacao' forem fornecidos, a licitação DEVE satisfazer AMBOS os critérios para ser incluída. Se falhar em qualquer um, EXCLUA-A.
4.  Se NENHUM filtro ('regiao' ou 'tipoLicitacao') for fornecido (ou se forem strings vazias), retorne TODAS as licitações da lista de entrada.
5.  Se um campo crucial para o filtro (como 'uf'/'municipioNome' para região, ou 'objetoCompra' para tipo) estiver ausente/nulo na licitação, essa licitação NÃO deve corresponder a esse filtro específico e deve ser EXCLUÍDA se o filtro estiver ativo.

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
    console.log('AI Filtering Flow - Input:', JSON.stringify(input, null, 2));

    // Check if AI-specific filters are actually provided and if there are licitacoes
    if (input.licitacoes.length === 0) {
        console.log("AI Filtering Flow: No licitacoes to filter, returning empty array.");
        return { filteredLicitacoes: [] };
    }
    if ((!input.regiao || input.regiao.trim() === '') && (!input.tipoLicitacao || input.tipoLicitacao.trim() === '')) {
        console.log("AI Filtering Flow: No specific AI filters (regiao or tipoLicitacao) provided, returning all input licitacoes.");
        return { filteredLicitacoes: input.licitacoes };
    }

    try {
      const {output} = await filterLicitacoesPrompt(input);
      if (!output || !Array.isArray(output.filteredLicitacoes)) {
        console.error('AI Filtering Flow - Output structure error or missing filteredLicitacoes:', output);
        // Fallback: return original list if AI output is malformed
        // This might happen if the model doesn't adhere to the schema.
        return { filteredLicitacoes: input.licitacoes };
      }
      console.log('AI Filtering Flow - Output Count:', output.filteredLicitacoes.length);
      return output;
    } catch (error) {
      console.error("AI Filtering Flow - Error during AI prompt execution:", error);
      // Fallback: return original list on error
      return { filteredLicitacoes: input.licitacoes };
    }
  }
);

    