
// Using CardTemplateId from the TemplateContext now as the primary source of truth for IDs at runtime
import type { CardTemplateId as ContextCardTemplateId } from '@/contexts/TemplateContext'; 

export type CardTemplateId = ContextCardTemplateId; // Alias for clarity

export interface Project {
  id: string;
  name: string;
  thumbnailUrl: string;
  dataAiHint?: string;
  lastModified: string;
  associatedTemplateIds?: CardTemplateId[]; // Uses the context-based CardTemplateId
}

export interface CardData {
  id: string;
  templateId: CardTemplateId; // Uses the context-based CardTemplateId
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
}

export interface EditorProjectData {
  id: string;
  name: string;
  cards: CardData[];
  associatedTemplateIds: CardTemplateId[]; // Uses the context-based CardTemplateId
}

export interface DeckData {
  id: string;
  name: string;
  cards: CardData[];
}
