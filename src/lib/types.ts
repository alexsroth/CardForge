
// Import CardTemplateId from the new definitions file
import type { CardTemplateId as ImportedCardTemplateId } from './card-templates';

export interface Project {
  id: string;
  name: string;
  thumbnailUrl: string;
  dataAiHint?: string; // Added for project thumbnail AI hint
  lastModified: string;
  associatedTemplateIds?: ImportedCardTemplateId[]; // Templates associated with this project
}

// This type alias ensures we use the centrally defined IDs
export type CardTemplateId = ImportedCardTemplateId;

export interface CardData {
  id: string;
  templateId: CardTemplateId;
  name: string;
  description: string; // General description, mainly for 'generic' or as fallback
  cost?: number;
  attack?: number;
  defense?: number;
  imageUrl?: string;
  dataAiHint?: string; // For AI image generation hint for the card image
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic';
  effectText?: string; // Primary rules text
  flavorText?: string; // Italicized, non-rules text (previously part of description in some templates)
  customFields?: Record<string, string | number | boolean>;
}

// Specific data structure needed for the editor page
export interface EditorProjectData {
  id: string;
  name: string;
  cards: CardData[];
  associatedTemplateIds: CardTemplateId[];
}

// This type was previously used by initialDeckData, keeping for reference or future use if needed.
// For now, the editor uses EditorProjectData.
export interface DeckData {
  id: string; // Typically corresponds to projectId
  name: string; // Name of the project/deck
  cards: CardData[];
}

// TemplateFieldDefinition is removed as its role is taken over by TemplateField in card-templates.ts
