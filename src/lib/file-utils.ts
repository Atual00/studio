// src/lib/file-utils.ts
'use client';

// AI functionality disabled for deployment
interface ValidateBidDocumentsInput {
  documents: { filename: string; dataUri: string }[];
  bidCriteria: string;
}

/**
 * Converts an array of File objects and bid criteria string into the format required by the validateBidDocuments flow.
 * This function is intended to be used on the client-side as it uses FileReader.
 * @param files An array of File objects.
 * @param bidCriteria A string describing the bid criteria.
 * @returns A Promise that resolves to ValidateBidDocumentsInput.
 */
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
