
// src/ai/flows/fill-declaration-flow.ts
'use server';
/**
 * @fileOverview An AI agent for filling declaration templates with client data.
 *
 * - fillDeclaration - A function that processes a declaration template.
 * - FillDeclarationInput - The input type for the fillDeclaration function.
 * - FillDeclarationOutput - The return type for the fillDeclaration function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Schema for the client details part of the input
const ClientDataSchema = z.object({
  razaoSocial: z.string().describe('The full legal name of the company (Razão Social).'),
  nomeFantasia: z.string().optional().describe('The trade name of the company (Nome Fantasia).'),
  cnpj: z.string().describe('The company CNPJ (format: XX.XXX.XXX/XXXX-XX).'),
  inscricaoEstadual: z.string().optional().describe('The State Registration number (Inscrição Estadual).'),
  enderecoCompleto: z.string().describe('The full address of the company (e.g., Rua Exemplo, 123 - Bairro, Cidade - CEP XXXXX-XXX).'),
  email: z.string().email().describe('The company contact email.'),
  telefone: z.string().describe('The company contact phone number.'),
  socioNome: z.string().describe('The name of the primary partner/owner (Sócio Administrador).'),
  socioCpf: z.string().describe('The CPF of the primary partner/owner (format: XXX.XXX.XXX-XX).'),
  socioRg: z.string().optional().describe('The RG (ID card number) of the primary partner/owner.'),
  socioEnderecoCompleto: z.string().optional().describe('The full address of the primary partner/owner if different from the company.'),
  // Add other relevant client fields here if needed by common declarations
});

const FillDeclarationInputSchema = z.object({
  clientData: ClientDataSchema.describe('An object containing the details of the client company.'),
  declarationTemplate: z
    .string()
    .describe(
      'The text of the declaration template. This template should use Handlebars-style placeholders for client data, e.g., {{razaoSocial}}, {{cnpj}}, {{enderecoCompleto}}, {{socioNome}}, {{socioCpf}}. Other placeholders include {{diaAtual}}, {{mesAtual}}, {{anoAtual}}, {{cidadeEmpresa}}, {{dataExtenso}}.'
    ),
});
export type FillDeclarationInput = z.infer<typeof FillDeclarationInputSchema>;

const FillDeclarationOutputSchema = z.object({
  filledDeclaration: z.string().describe('The declaration text with all placeholders filled with the client data and relevant current date information.'),
});
export type FillDeclarationOutput = z.infer<typeof FillDeclarationOutputSchema>;

export async function fillDeclaration(input: FillDeclarationInput): Promise<FillDeclarationOutput> {
  // Add current date information to be available for the prompt
  const now = new Date();
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const promptInput = {
    ...input,
    currentDateDetails: {
        diaAtual: now.getDate().toString(),
        mesAtual: meses[now.getMonth()],
        anoAtual: now.getFullYear().toString(),
        cidadeEmpresa: input.clientData.enderecoCompleto.split(' - ')[1]?.split(',')[0] || 'Nossa Cidade', // Attempt to extract city
        dataExtenso: `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`,
    }
  };
  return fillDeclarationFlow(promptInput);
}

// Updated schema for prompt input to include currentDateDetails
const promptInputSchema = z.object({
  clientData: ClientDataSchema,
  declarationTemplate: z.string(),
  currentDateDetails: z.object({
    diaAtual: z.string(),
    mesAtual: z.string(),
    anoAtual: z.string(),
    cidadeEmpresa: z.string(),
    dataExtenso: z.string(),
  }),
});


const fillDeclarationPrompt = ai.definePrompt({
  name: 'fillDeclarationPrompt',
  input: { schema: promptInputSchema },
  output: { schema: FillDeclarationOutputSchema },
  prompt: `Você é um assistente especializado em preencher declarações e documentos para empresas.
Sua tarefa é pegar o "Modelo de Declaração" fornecido e preencher os espaços marcados com os dados do cliente e informações de data atuais.

**Dados do Cliente para Preenchimento:**
- Razão Social: {{clientData.razaoSocial}}
- Nome Fantasia: {{clientData.nomeFantasia}}
- CNPJ: {{clientData.cnpj}}
- Inscrição Estadual: {{clientData.inscricaoEstadual}}
- Endereço Completo da Empresa: {{clientData.enderecoCompleto}}
- Email da Empresa: {{clientData.email}}
- Telefone da Empresa: {{clientData.telefone}}
- Nome do Sócio Principal: {{clientData.socioNome}}
- CPF do Sócio Principal: {{clientData.socioCpf}}
- RG do Sócio Principal: {{clientData.socioRg}}
- Endereço Completo do Sócio: {{clientData.socioEnderecoCompleto}}

**Informações de Data Atual para Preenchimento:**
- Dia Atual (número): {{currentDateDetails.diaAtual}}
- Mês Atual (por extenso): {{currentDateDetails.mesAtual}}
- Ano Atual (número): {{currentDateDetails.anoAtual}}
- Cidade da Empresa (para local da assinatura, se não especificado no modelo): {{currentDateDetails.cidadeEmpresa}}
- Data Atual por Extenso: {{currentDateDetails.dataExtenso}}

**Modelo de Declaração:**
\`\`\`
{{{declarationTemplate}}}
\`\`\`

**Instruções:**
1.  Substitua todos os marcadores no "Modelo de Declaração" (como {{razaoSocial}}, {{cnpj}}, {{diaAtual}}, {{mesAtual}}, {{anoAtual}}, {{dataExtenso}}, {{cidadeEmpresa}}, etc.) pelos valores correspondentes dos "Dados do Cliente" e "Informações de Data Atual".
2.  Se um campo opcional do cliente (como {{nomeFantasia}} ou {{inscricaoEstadual}}) não for fornecido nos dados, substitua o marcador por "Não Aplicável" ou remova a linha/frase relevante se fizer sentido no contexto da declaração. Para {{clientData.socioEnderecoCompleto}}, se não fornecido, pode-se assumir que é o mesmo da empresa ou omitir, dependendo do contexto do modelo.
3.  Certifique-se de que o texto final esteja gramaticalmente correto e faça sentido.
4.  Retorne apenas o texto da declaração completamente preenchido no campo "filledDeclaration" do JSON de saída. Não inclua explicações ou texto adicional fora da declaração preenchida.

Se o modelo contiver algo como "[Local], [dia] de [mês] de [ano].", substitua por "{{currentDateDetails.cidadeEmpresa}}, {{currentDateDetails.dataExtenso}}.".
Se o modelo contiver "[Nome do representante legal da empresa]", substitua por "{{clientData.socioNome}}".
Se o modelo contiver "[CPF do representante legal]", substitua por "{{clientData.socioCpf}}".
Se o modelo contiver "[Nome da Empresa]", substitua por "{{clientData.razaoSocial}}".
Se o modelo contiver "[CNPJ da Empresa]", substitua por "{{clientData.cnpj}}".
Se o modelo contiver "[Endereço da Empresa]", substitua por "{{clientData.enderecoCompleto}}".

Analise o contexto do modelo para fazer as substituições mais apropriadas.
`,
});

const fillDeclarationFlow = ai.defineFlow(
  {
    name: 'fillDeclarationFlow',
    inputSchema: promptInputSchema, // Use the updated prompt input schema for the flow
    outputSchema: FillDeclarationOutputSchema,
  },
  async (input) => {
    console.log('Calling AI prompt to fill declaration with input:', JSON.stringify(input, null, 2));
    try {
      const { output } = await fillDeclarationPrompt(input);
      if (!output || typeof output.filledDeclaration !== 'string') {
        console.error('AI output structure error:', output);
        throw new Error('AI output does not match the expected schema or is missing.');
      }
      console.log('Received AI output (filled declaration):', output.filledDeclaration);
      return output;
    } catch (error) {
      console.error("Error during AI prompt execution for fillDeclarationFlow:", error);
      // Provide a fallback or rethrow
      return {
        filledDeclaration: `Erro ao preencher a declaração: ${error instanceof Error ? error.message : 'Erro desconhecido.'}\n\nModelo Original:\n${input.declarationTemplate}`,
      };
    }
  }
);
