// 'use server';

/**
 * @fileOverview A card name generation AI agent.
 *
 * - generateCardName - A function that handles the card name generation process.
 * - GenerateCardNameInput - The input type for the generateCardName function.
 * - GenerateCardNameOutput - The return type for the generateCardName function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCardNameInputSchema = z.object({
  cardDescription: z
    .string()
    .describe('The description of the card for which a name is to be generated.'),
});
export type GenerateCardNameInput = z.infer<typeof GenerateCardNameInputSchema>;

const GenerateCardNameOutputSchema = z.object({
  cardName: z.string().describe('The generated name for the card.'),
});
export type GenerateCardNameOutput = z.infer<typeof GenerateCardNameOutputSchema>;

export async function generateCardName(input: GenerateCardNameInput): Promise<GenerateCardNameOutput> {
  return generateCardNameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCardNamePrompt',
  input: {schema: GenerateCardNameInputSchema},
  output: {schema: GenerateCardNameOutputSchema},
  prompt: `You are a creative card game designer.

  Generate a unique and fitting name for a card, based on its description.

  Description: {{{cardDescription}}}
  Name:`,
});

const generateCardNameFlow = ai.defineFlow(
  {
    name: 'generateCardNameFlow',
    inputSchema: GenerateCardNameInputSchema,
    outputSchema: GenerateCardNameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
