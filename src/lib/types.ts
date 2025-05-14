export interface Project {
  id: string;
  name: string;
  thumbnailUrl: string; // URL to an image, e.g., placeholder
  lastModified: string; // ISO date string
}

export type CardTemplateId = 'creature' | 'spell' | 'item' | 'generic';

export interface CardData {
  id: string;
  templateId: CardTemplateId;
  name: string;
  description: string;
  cost?: number;
  attack?: number;
  defense?: number;
  imageUrl?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic';
  effectText?: string;
  flavorText?: string;
  // For any other template-specific fields not covered above
  customFields?: Record<string, string | number | boolean>;
}

export interface DeckData {
  id: string; // Typically corresponds to projectId
  name: string; // Name of the project/deck
  cards: CardData[];
}

// Represents the structure of how a template's fields should be edited
export interface TemplateFieldDefinition {
  key: keyof CardData | `customFields.${string}`;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  options?: Array<{value: string; label: string}>; // For select type
}
