
import type { CardData } from './types';

// Define the structure for a field within a card template
export interface TemplateField {
  key: keyof Omit<CardData, 'id' | 'templateId' | 'customFields'> | string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
  defaultValue?: string | number | boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

// Define the structure for a card template
export interface CardTemplate {
  id: string; // Changed from CardTemplateId to string for more flexibility with user-defined IDs
  name: string;
  fields: TemplateField[];
}

// Define available template IDs - this now serves as the "seed" data.
// The actual CardTemplateId type used by the context might be more dynamic.
export const CARD_TEMPLATE_IDS_SEED = ['generic', 'creature', 'spell', 'item'] as const;
export type CardTemplateIdSeed = typeof CARD_TEMPLATE_IDS_SEED[number];

// This CardTemplateId is a more generic representation, used by CardData
export type CardTemplateId = string;


// Centralized array of all card template definitions - this is the initial SEED.
// The TemplateContext will manage the runtime list, potentially loaded from localStorage.
export const cardTemplates: CardTemplate[] = [
  {
    id: 'generic',
    name: 'Generic Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Card Name' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., abstract pattern' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Card text, abilities, etc.' },
    ],
  },
  {
    id: 'creature',
    name: 'Creature Card (Seed)',
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
    name: 'Spell Card (Seed)',
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
    name: 'Item Card (Seed)',
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

// These helper functions are now effectively replaced by methods in TemplateContext
// but can be kept if direct use of seed data is ever needed, or for type reference.

// export function getTemplateById(templateId?: CardTemplateId): CardTemplate | undefined {
//   if (!templateId) return undefined;
//   return cardTemplates.find(t => t.id === templateId);
// }

// export function getAvailableTemplatesForSelect(allowedTemplateIds?: CardTemplateId[]) {
//   const templatesToConsider = allowedTemplateIds
//     ? cardTemplates.filter(template => allowedTemplateIds.includes(template.id))
//     : cardTemplates;
//   return templatesToConsider.map(template => ({
//     value: template.id,
//     label: template.name,
//   }));
// }
