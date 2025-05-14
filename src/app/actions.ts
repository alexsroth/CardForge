// @/app/actions.ts
"use server";

import { generateCardName as aiGenerateCardName, type GenerateCardNameInput } from '@/ai/flows/generate-card-name';

export async function generateCardNameAction(input: GenerateCardNameInput): Promise<string> {
  try {
    // Validate input if necessary, though Zod in definePrompt handles some of this.
    if (!input.cardDescription || input.cardDescription.trim().length < 10) {
      // Basic validation example
      throw new Error("Card description is too short to generate a meaningful name.");
    }
    const result = await aiGenerateCardName(input);
    return result.cardName;
  } catch (error) {
    console.error("Error in generateCardNameAction:", error);
    // It's good practice to not expose raw error messages to the client.
    // Log the detailed error on the server and return a generic message.
    if (error instanceof Error) {
        throw new Error(`Failed to generate card name: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while generating the card name.");
  }
}
