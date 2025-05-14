
import type { CardData } from './types';

// Define the structure for a field within a card template
export interface TemplateField {
  key: keyof Omit<CardData, 'id' | 'templateId' | 'customFields'> | string; // string for future customFields paths
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
  defaultValue?: string | number | boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  // e.g. helperText?: string; for tooltips or hints under the field
}

// Define the structure for a card template
export interface CardTemplate {
  id: string; // Unique ID for the template
  name: string; // User-friendly name (e.g., "Creature Card")
  fields: TemplateField[];
  // Optional: defaultImageUrl, defaultDataAiHint for this template
}

// Define available template IDs - this ensures consistency
export const CARD_TEMPLATE_IDS = ['generic', 'creature', 'spell', 'item'] as const;
export type CardTemplateId = typeof CARD_TEMPLATE_IDS[number];

// Centralized array of all card template definitions
export const cardTemplates: CardTemplate[] = [
  {
    id: 'generic',
    name: 'Generic Card',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Card Name' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., abstract pattern' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Card text, abilities, etc.' },
    ],
  },
  {
    id: 'creature',
    name: 'Creature Card',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Grizzly Bear' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., forest beast' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '3' },
      { key: 'attack', label: 'Attack', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'defense', label: 'Defense', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Abilities and rules text...' },
      { key: 'flavorText', label: 'Flavor Text', type: 'textarea', placeholder: 'A short, evocative quote or description...' },
      {
        key: 'rarity', label: 'Rarity', type: 'select', defaultValue: 'common',
        options: [
          { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' },
          { value: 'rare', label: 'Rare' }, { value: 'mythic', label: 'Mythic' },
        ],
      },
    ],
  },
  {
    id: 'spell',
    name: 'Spell Card',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Fireball' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., magical explosion' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '1' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Spell effects and rules text...' },
      { key: 'flavorText', label: 'Flavor Text', type: 'textarea', placeholder: 'A short, evocative quote or description...' },
      {
        key: 'rarity', label: 'Rarity', type: 'select', defaultValue: 'common',
        options: [
          { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' },
          { value: 'rare', label: 'Rare' }, { value: 'mythic', label: 'Mythic' },
        ],
      },
    ],
  },
  {
    id: 'item',
    name: 'Item Card',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Healing Potion' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., glowing artifact' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Item effects and rules text...' },
      { key: 'flavorText', label: 'Flavor Text', type: 'textarea', placeholder: 'A short, evocative quote or description...' },
      {
        key: 'rarity', label: 'Rarity', type: 'select', defaultValue: 'common',
        options: [
          { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' },
          { value: 'rare', label: 'Rare' }, { value: 'mythic', label: 'Mythic' },
        ],
      },
    ],
  },
];

// Helper function to get a template definition by its ID
export function getTemplateById(templateId?: CardTemplateId): CardTemplate | undefined {
  if (!templateId) return undefined;
  return cardTemplates.find(t => t.id === templateId);
}

// Helper to get all available template IDs and names for select dropdowns
export function getAvailableTemplatesForSelect() {
  return cardTemplates.map(template => ({
    value: template.id,
    label: template.name,
  }));
}
