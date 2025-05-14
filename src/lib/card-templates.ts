
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

// Basic structure for a layout element
export interface LayoutElement {
  fieldKey: string; // Key from CardData
  type: 'text' | 'textarea' | 'image' | 'iconValue'; // Type of element to render
  style?: React.CSSProperties; // Inline styles
  className?: string; // Tailwind classes
  prefix?: string; // For text elements, e.g., "Cost: "
  suffix?: string; // For text elements
  icon?: string; // Lucide icon name for iconValue type
  // Potentially add specific props for images like 'altTextFieldKey' etc.
}

// Define the structure for a card template's layout
export interface LayoutDefinition {
  width?: string; // e.g., '280px'
  height?: string; // e.g., '400px'
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  backgroundImageField?: keyof CardData | string; // Field key for background image URL
  elements: LayoutElement[];
}

// Define the structure for a card template
export interface CardTemplate {
  id: string;
  name: string;
  fields: TemplateField[];
  layoutDefinition?: string; // JSON string for LayoutDefinition
}

// Define available template IDs - this now serves as the "seed" data.
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
    // Example of a very simple layoutDefinition for the generic card
    layoutDefinition: JSON.stringify({
      width: "280px",
      height: "400px",
      borderColor: "hsl(var(--primary))",
      elements: [
        { fieldKey: "imageUrl", type: "image", style: { position: "absolute", top: "40px", left: "10px", right: "10px", height: "120px", objectFit: "cover", borderRadius: "0.25rem"} },
        { fieldKey: "name", type: "text", style: { position: "absolute", top: "10px", left: "10px", right: "10px", textAlign: "center", fontWeight: "bold", fontSize: "1.1rem" } },
        { fieldKey: "description", type: "textarea", style: { position: "absolute", top: "170px", left: "10px", right: "10px", bottom: "10px", fontSize: "0.9rem", overflowY: "auto" } }
      ]
    } as LayoutDefinition)
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
