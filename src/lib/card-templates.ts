
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


export const DEFAULT_CARD_LAYOUT_JSON_STRING = `{
  "width": "280px",
  "height": "400px",
  "backgroundColor": "hsl(var(--card))",
  "borderColor": "hsl(var(--border))",
  "borderRadius": "calc(var(--radius) - 2px)",
  "backgroundImageField": "artworkUrl", 
  "elements": [
    {
      "fieldKey": "name", "type": "text",
      "style": { "position": "absolute", "top": "15px", "left": "15px", "right": "60px", "fontSize": "1.1em", "fontWeight": "bold", "lineHeight": "1.2", "maxHeight": "40px", "overflow": "hidden", "textOverflow": "ellipsis" },
      "className": "text-card-foreground"
    },
    {
      "fieldKey": "cost", "type": "iconValue", "icon": "Coins",
      "style": { "position": "absolute", "top": "15px", "right": "15px", "fontSize": "1.1em", "fontWeight": "bold", "padding": "5px", "backgroundColor": "hsla(var(--primary-foreground), 0.1)", "borderRadius": "9999px", "border": "1px solid hsla(var(--primary), 0.5)" },
      "className": "text-primary"
    },
    {
      "fieldKey": "imageUrl", "type": "image",
      "style": { "position": "absolute", "top": "60px", "left": "15px", "right": "15px", "height": "140px", "objectFit": "cover", "borderRadius": "calc(var(--radius) - 4px)" }
    },
    {
        "fieldKey": "cardType", "type": "text",
        "style": { "position": "absolute", "top": "210px", "left": "15px", "right": "15px", "fontSize": "0.8em", "fontStyle": "italic", "textAlign": "center", "padding": "2px 0", "borderTop": "1px solid hsl(var(--border))", "borderBottom": "1px solid hsl(var(--border))" },
        "className": "text-muted-foreground"
    },
    {
      "fieldKey": "effectText", "type": "textarea",
      "style": { "position": "absolute", "top": "240px", "left": "15px", "right": "15px", "bottom": "55px", "fontSize": "0.85em", "lineHeight": "1.4" },
      "className": "text-card-foreground"
    },
    {
      "fieldKey": "attack", "type": "iconValue", "icon": "Sword",
      "style": { "position": "absolute", "bottom": "15px", "left": "15px", "fontSize": "1em", "fontWeight": "bold" },
      "className": "text-destructive"
    },
    {
      "fieldKey": "defense", "type": "iconValue", "icon": "Shield",
      "style": { "position": "absolute", "bottom": "15px", "right": "15px", "fontSize": "1em", "fontWeight": "bold" },
      "className": "text-blue-500" 
    }
  ]
}`;


// Centralized array of all card template definitions - this is the initial SEED.
// The TemplateContext will manage the runtime list, potentially loaded from localStorage.
export const cardTemplates: CardTemplate[] = [
  {
    id: 'generic',
    name: 'Generic Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Card Name' },
      { key: 'artworkUrl', label: 'Background Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., abstract pattern' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Card text, abilities, etc.' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', placeholder: 'e.g., Basic Unit' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0 },
      { key: 'attack', label: 'Attack', type: 'number', defaultValue: 0 },
      { key: 'defense', label: 'Defense', type: 'number', defaultValue: 0 },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Main card text.' },
    ],
    layoutDefinition: DEFAULT_CARD_LAYOUT_JSON_STRING
  },
  {
    id: 'creature',
    name: 'Creature Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Grizzly Bear' },
      { key: 'artworkUrl', label: 'Background Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., forest beast' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '3' },
      { key: 'attack', label: 'Attack', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'defense', label: 'Defense', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Creature', placeholder: 'e.g., Creature - Bear' },
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
    layoutDefinition: DEFAULT_CARD_LAYOUT_JSON_STRING,
  },
  {
    id: 'spell',
    name: 'Spell Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Fireball' },
      { key: 'artworkUrl', label: 'Background Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., magical explosion' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '1' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Spell', placeholder: 'e.g., Instant Spell' },
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
    layoutDefinition: DEFAULT_CARD_LAYOUT_JSON_STRING,
  },
  {
    id: 'item',
    name: 'Item Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Healing Potion' },
      { key: 'artworkUrl', label: 'Background Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., glowing artifact' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0, placeholder: '2' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Item', placeholder: 'e.g., Equipment' },
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
    layoutDefinition: DEFAULT_CARD_LAYOUT_JSON_STRING,
  },
];

    