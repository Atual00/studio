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
    .array(
      z.object({
        filename: z.string().describe('The name of the document file.'),
        dataUri: z
          .string()
          .describe(
            'The document file data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
          ),
      })
    )
    .describe('An array of document objects, each containing a filename and its data URI.'),
  bidCriteria: z.string().describe('The criteria for the bid, including required documents and their validity rules.'),
});
export type ValidateBidDocumentsInput = z.infer<typeof ValidateBidDocumentsInputSchema>;

// Define a schema for individual document validity results
const DocumentValiditySchema = z.object({
  documentName: z.string().describe('The name or identifier of the document provided in the input.'),
  isValid: z.boolean().describe('Whether the document is considered valid based on the criteria.'),
  reasoning: z.string().optional().describe('Reason if the document is invalid or requires attention (optional).'),
});

// Update the output schema to use an array of validity objects
const ValidateBidDocumentsOutputSchema = z.object({
  completeness: z.boolean().describe('Whether all documents required by the bid criteria seem to be present in the input array.'),
  validityDetails: z
    .array(DocumentValiditySchema)
    .describe('The validity status and details for each document provided in the input array.'),
  missingDocuments: z
    .array(z.string())
    .describe('List of documents that seem to be required by the criteria but were not found in the input array.'),
});
export type ValidateBidDocumentsOutput = z.infer<typeof ValidateBidDocumentsOutputSchema>;

export async function validateBidDocuments(input: ValidateBidDocumentsInput): Promise<ValidateBidDocumentsOutput> {
  // Map input documents for the prompt, adding filenames for reference
  const promptInput = {
    documents: input.documents.map(doc => ({
      filename: doc.filename,
      dataUri: doc.dataUri,
    })),
    bidCriteria: input.bidCriteria,
  };
  return validateBidDocumentsFlow(promptInput);
}

// Update the prompt input schema to accept the new document object structure
const promptInputSchema = z.object({
  documents: z
    .array(
      z.object({
        filename: z.string(),
        dataUri: z.string(),
      })
    )
    .describe('Array of document objects with filename and data URI.'),
  bidCriteria: z.string().describe('The criteria for the bid, including required documents and validity rules.'),
});


const prompt = ai.definePrompt({
  name: 'validateBidDocumentsPrompt',
  input: {
    schema: promptInputSchema, // Use the updated prompt input schema
  },
  output: {
    schema: ValidateBidDocumentsOutputSchema, // Use the updated output schema
  },
  prompt: `You are an AI assistant specialized in validating bid documents against specific criteria.

Given the following documents (identified by filename) and bid criteria, perform the following tasks:
1.  **Completeness Check**: Determine if all documents explicitly required by the bid criteria are present among the provided documents. Set the 'completeness' field accordingly. List any seemingly required documents that are missing in the 'missingDocuments' field.
2.  **Validity Check**: For EACH document provided in the input array, evaluate its content against the bid criteria. Determine if the document appears valid according to the rules (e.g., correct type, within expiration date if applicable, contains required information). Set the 'isValid' field for each document in the 'validityDetails' array. Use the document's filename provided in the input as the 'documentName'. Provide a brief 'reasoning' if a document is deemed invalid or has issues.

Bid Criteria:
{{{bidCriteria}}}

Provided Documents:
{{#each documents}}
--- Document: {{filename}} ---
{{media url=dataUri}}
--- End Document: {{filename}} ---
{{/each}}

Return a JSON object strictly adhering to the specified output schema, including the 'completeness' status, the 'validityDetails' array (containing an object for each provided document), and the 'missingDocuments' array.
`,
});


// Update the flow definition to use the correct input/output schemas
const validateBidDocumentsFlow = ai.defineFlow<
  typeof promptInputSchema, // Flow input now matches prompt input
  typeof ValidateBidDocumentsOutputSchema
>(
  {
    name: 'validateBidDocumentsFlow',
    inputSchema: promptInputSchema, // Use the updated prompt input schema for the flow
    outputSchema: ValidateBidDocumentsOutputSchema,
  },
  async input => {
    console.log('Calling AI prompt with input:', JSON.stringify(input, null, 2));
    try {
        const {output} = await prompt(input);
        console.log('Received AI output:', JSON.stringify(output, null, 2));

        // Basic validation of output structure (optional but recommended)
        if (!output || typeof output.completeness !== 'boolean' || !Array.isArray(output.validityDetails) || !Array.isArray(output.missingDocuments)) {
            throw new Error('AI output does not match the expected schema.');
        }
        // Further validation can be added here if needed

        return output!;
    } catch(error) {
        console.error("Error during AI prompt execution:", error);
        // Rethrow or handle the error appropriately
         // Provide a default/error response matching the schema
         return {
           completeness: false,
           validityDetails: input.documents.map(doc => ({
             documentName: doc.filename,
             isValid: false,
             reasoning: `Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
           })),
           missingDocuments: ['Validation process failed'],
         };
    }
  }
);

// Helper function to convert File objects to the required input format
export const filesToValidateInput = async (files: File[], bidCriteria: string): Promise<ValidateBidDocumentsInput> => {
  const documents = await Promise.all(
    files.map(file => {
      return new Promise<{ filename: string; dataUri: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ filename: file.name, dataUri: reader.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })
  );
  return { documents, bidCriteria };
};
