// @/app/actions.ts
"use server";

import { generateCardName as aiGenerateCardName, type GenerateCardNameInput } from '@/ai/flows/generate-card-name';
import type { TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { generateTemplateObjectString } from '@/lib/template-code-helpers';
import fs from 'fs/promises';
import path from 'path';

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

export async function saveTemplateDefinitionAction(
  templateId: string,
  templateName: string,
  fields: TemplateFieldDefinition[]
): Promise<{ success: boolean; message: string; generatedCode?: string }> {
  const templatesFilePath = path.join(process.cwd(), 'src', 'lib', 'card-templates.ts');
  const newTemplateObjectString = generateTemplateObjectString(templateId, templateName, fields);

  try {
    let content = await fs.readFile(templatesFilePath, 'utf-8');

    // Check if template ID already exists in CARD_TEMPLATE_IDS
    const cardTemplateIdsRegex = /export const CARD_TEMPLATE_IDS = \[(.*?)\] as const;/s;
    const idsMatch = content.match(cardTemplateIdsRegex);
    if (idsMatch && idsMatch[1]) {
      const idsArrayString = idsMatch[1];
      // Simple check, might need to be more robust for varied formatting
      if (idsArrayString.includes(`'${templateId}'`)) {
        return { 
          success: false, 
          message: `Template ID '${templateId}' already exists. Please choose a unique ID.`,
          generatedCode: newTemplateObjectString // Return code for manual edit if needed
        };
      }
    } else {
      console.warn("Could not reliably parse CARD_TEMPLATE_IDS. Skipping duplicate check for ID.");
    }
    
    // Insert into cardTemplates array
    const cardTemplatesAnchor = 'export const cardTemplates: CardTemplate[] = [';
    const cardTemplatesEndAnchor = '];';
    
    let insertionPoint = content.lastIndexOf(cardTemplatesEndAnchor, content.indexOf(cardTemplatesAnchor) + cardTemplatesAnchor.length);
    if (content.indexOf(cardTemplatesAnchor) === -1 || insertionPoint === -1) {
        throw new Error('Could not find cardTemplates array anchor or end anchor in src/lib/card-templates.ts');
    }
    // Check if the array is empty or needs a comma
    const arrayContentStart = content.indexOf(cardTemplatesAnchor) + cardTemplatesAnchor.length;
    const arrayContent = content.substring(arrayContentStart, insertionPoint).trim();
    const needsCommaBeforeInsert = arrayContent !== '' && !arrayContent.endsWith(',');

    const newTemplateEntry = `${needsCommaBeforeInsert ? ',' : ''}\n${newTemplateObjectString.split('\n').map(line => `  ${line}`).join('\n').trimStart()}${arrayContent === '' ? '' : ','}\n`;
    content = content.slice(0, insertionPoint) + newTemplateEntry + content.slice(insertionPoint);
    
    // Insert into CARD_TEMPLATE_IDS array
    const cardTemplateIdsAnchor = 'export const CARD_TEMPLATE_IDS = [';
    insertionPoint = content.lastIndexOf('] as const;', content.indexOf(cardTemplateIdsAnchor) + cardTemplateIdsAnchor.length);
     if (content.indexOf(cardTemplateIdsAnchor) === -1 || insertionPoint === -1) {
        throw new Error('Could not find CARD_TEMPLATE_IDS array anchor or end anchor in src/lib/card-templates.ts');
    }

    const idsArrayContentStart = content.indexOf(cardTemplateIdsAnchor) + cardTemplateIdsAnchor.length;
    const idsArrayContent = content.substring(idsArrayContentStart, insertionPoint).trim();
    const needsCommaForId = idsArrayContent !== '' && !idsArrayContent.endsWith(',');
    
    const newIdEntry = `${needsCommaForId ? ', ' : ''}'${templateId}'`;
    content = content.slice(0, insertionPoint) + newIdEntry + content.slice(insertionPoint);

    await fs.writeFile(templatesFilePath, content, 'utf-8');
    return { success: true, message: 'Template saved to src/lib/card-templates.ts successfully. You may need to restart your development server for changes to take full effect.' };

  } catch (error: any) {
    console.error('Error saving template definition:', error);
    return { 
      success: false, 
      message: `Failed to save template: ${error.message}. Please see console for details.`,
      generatedCode: newTemplateObjectString // Provide code for manual insertion
    };
  }
}
