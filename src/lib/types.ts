
// Using CardTemplateId from the TemplateContext now as the primary source of truth for IDs at runtime
import type { CardTemplateId as ContextCardTemplateId } from '@/contexts/TemplateContext'; 

export type CardTemplateId = ContextCardTemplateId; // Alias for clarity
export const NEW_CARD_TEMPLATE_ID_PLACEHOLDER = "__SELECT_TEMPLATE__" as const;
export type NewCardTemplateIdPlaceholder = typeof NEW_CARD_TEMPLATE_ID_PLACEHOLDER;


export interface CardData {
  id: string;
  templateId: CardTemplateId | NewCardTemplateIdPlaceholder; // Uses the context-based CardTemplateId or placeholder
  name: string;
  description: string;
  cost?: number;
  attack?: number;
  defense?: number;
  imageUrl?: string;
  dataAiHint?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic'; // This could also become dynamic via template
  effectText?: string;
  flavorText?: string;
  customFields?: Record<string, string | number | boolean>; // For fields not in the core set
  // artworkUrl might be part of customFields or a specific field in a template
  artworkUrl?: string; 
}

export interface Project {
  id: string;
  name: string;
  thumbnailUrl: string;
  dataAiHint?: string;
  lastModified: string;
  associatedTemplateIds: CardTemplateId[]; 
  cards: CardData[]; 
}

// This type might be simplified or removed if ProjectContext directly provides Project type with cards
export interface EditorProjectData extends Omit<Project, 'thumbnailUrl' | 'lastModified' | 'dataAiHint'> {
  // EditorProjectData essentially becomes the Project type from ProjectContext
}


export interface DeckData { // This type might be synonymous with Project now or a subset of it
  id: string;
  name: string;
  cards: CardData[];
}

