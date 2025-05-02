// src/ai/flows/document-validator.ts
'use server';

/**
 * @fileOverview A document validation AI agent for bid applications.
 *
 * - validateBidDocuments - A function that validates bid documents.
 * - ValidateBidDocumentsInput - The input type for the validateBidDocuments function.
 * - ValidateBidDocumentsOutput - The return type for the validateBidDocuments function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ValidateBidDocumentsInputSchema = z.object({
  documents: z
    .array(z.string())
    .describe(
      'An array of document file data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  bidCriteria: z.string().describe('The criteria for the bid, including required documents.'),
});
export type ValidateBidDocumentsInput = z.infer<typeof ValidateBidDocumentsInputSchema>;

const ValidateBidDocumentsOutputSchema = z.object({
  completeness: z.boolean().describe('Whether all required documents are present.'),
  validity: z.record(z.boolean()).describe('The validity status of each document.'),
  missingDocuments: z.array(z.string()).describe('List of missing documents, if any.'),
});
export type ValidateBidDocumentsOutput = z.infer<typeof ValidateBidDocumentsOutputSchema>;

export async function validateBidDocuments(input: ValidateBidDocumentsInput): Promise<ValidateBidDocumentsOutput> {
  return validateBidDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateBidDocumentsPrompt',
  input: {
    schema: z.object({
      documents: z
        .array(z.string())
        .describe(
          'An array of document file data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
        ),
      bidCriteria: z.string().describe('The criteria for the bid, including required documents.'),
    }),
  },
  output: {
    schema: z.object({
      completeness: z.boolean().describe('Whether all required documents are present.'),
      validity: z.record(z.boolean()).describe('The validity status of each document.'),
      missingDocuments: z.array(z.string()).describe('List of missing documents, if any.'),
    }),
  },
  prompt: `You are an AI assistant specialized in validating bid documents against specific criteria.

Given the following documents and bid criteria, determine if all required documents are present and if each document is valid.

Bid Criteria: {{{bidCriteria}}}

Documents:{{#each documents}} {{media url=this}} {{/each}}

Return a JSON object indicating the completeness of the document set, the validity status of each document, and a list of any missing documents.
`,
});

const validateBidDocumentsFlow = ai.defineFlow<
  typeof ValidateBidDocumentsInputSchema,
  typeof ValidateBidDocumentsOutputSchema
>(
  {
    name: 'validateBidDocumentsFlow',
    inputSchema: ValidateBidDocumentsInputSchema,
    outputSchema: ValidateBidDocumentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
