
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


// DEFAULT_CARD_LAYOUT_JSON_STRING
// This is a comprehensive default layout.
// Remember:
// - `fieldKey` values MUST match the "Field Key" you define in your "Data Fields" section.
// - For `style` objects, use camelCase for CSS properties (e.g., `fontSize`, not `font-size`).
// - Comments (like these) will be visible in the textarea but stripped when the JSON is parsed and formatted.
export const DEFAULT_CARD_LAYOUT_JSON_STRING = `{
  // Overall card dimensions and appearance
  "width": "280px",
  "height": "400px",
  "backgroundColor": "hsl(var(--card))", // Uses CSS variables from globals.css
  "borderColor": "hsl(var(--border))",
  "borderRadius": "calc(var(--radius) - 2px)",
  // "backgroundImageField": "artworkUrl", // Optional: field key for a full card background image. Removed by user request.

  // Array of visual elements to render on the card
  "elements": [
    {
      "fieldKey": "name", // Maps to the 'name' field in your card data
      "type": "text",
      "style": {
        "position": "absolute",
        "top": "15px",
        "left": "15px",
        "right": "60px", // Leave space for cost or other elements
        "fontSize": "1.1em",
        "fontWeight": "bold",
        "lineHeight": "1.2", // Ensures multi-word titles don't get too tall
        "maxHeight": "40px", // Prevents overly long names from breaking layout
        "overflow": "hidden",
        "textOverflow": "ellipsis" // Adds '...' for overflow
      },
      "className": "text-card-foreground" // Use theme's card text color
    },
    {
      "fieldKey": "cost", // Maps to 'cost' field
      "type": "iconValue", // Renders an icon next to the value
      "icon": "Coins",     // Lucide icon name (ensure it exists in lucide-react)
      "style": {
        "position": "absolute",
        "top": "15px",
        "right": "15px",
        "fontSize": "1.1em",
        "fontWeight": "bold",
        "padding": "5px",
        "backgroundColor": "hsla(var(--primary-foreground), 0.1)", // Semi-transparent primary background
        "borderRadius": "9999px", // Circular
        "border": "1px solid hsla(var(--primary), 0.5)" // Border using primary color
      },
      "className": "text-primary" // Use theme's primary color for text
    },
    {
      "fieldKey": "imageUrl", // Maps to 'imageUrl' field for the main card art
      "type": "image",
      "style": {
        "position": "absolute",
        "top": "60px",    // Position below name/cost
        "left": "15px",
        "right": "15px",
        "height": "140px", // Fixed height for the image area
        "objectFit": "cover", // How the image should fill the area
        "borderRadius": "calc(var(--radius) - 4px)" // Slightly smaller radius than card
      }
      // "dataAiHint" for images is handled by the renderer directly from card data, not in layout
    },
    {
      "fieldKey": "cardType", // Maps to 'cardType' field (e.g., "Creature - Goblin")
      "type": "text",
      "style": {
        "position": "absolute",
        "top": "210px", // Position below the main image
        "left": "15px",
        "right": "15px",
        "fontSize": "0.8em",
        "fontStyle": "italic",
        "textAlign": "center",
        "padding": "2px 0",
        "borderTop": "1px solid hsl(var(--border))", // Separator lines
        "borderBottom": "1px solid hsl(var(--border))"
      },
      "className": "text-muted-foreground" // Use theme's muted text color
    },
    {
      "fieldKey": "effectText", // Maps to 'effectText' field for rules or abilities
      "type": "textarea",    // Allows multi-line text, renderer might add scroll
      "style": {
        "position": "absolute",
        "top": "240px", // Position below the card type line
        "left": "15px",
        "right": "15px",
        "bottom": "55px", // Leave space for stats at the bottom
        "fontSize": "0.85em",
        "lineHeight": "1.4" // Good readability for text blocks
        // "overflowY": "auto" // Renderer might handle scroll for textarea type
      },
      "className": "text-card-foreground whitespace-pre-wrap" // Ensure text wraps and preserves whitespace
    },
    {
      "fieldKey": "attack", // Maps to 'attack' field
      "type": "iconValue",
      "icon": "Sword",
      "style": {
        "position": "absolute",
        "bottom": "15px",
        "left": "15px",
        "fontSize": "1em",
        "fontWeight": "bold"
      },
      "className": "text-destructive" // Use theme's destructive color (often red)
    },
    {
      "fieldKey": "defense", // Maps to 'defense' field
      "type": "iconValue",
      "icon": "Shield",
      "style": {
        "position": "absolute",
        "bottom": "15px",
        "right": "15px",
        "fontSize": "1em",
        "fontWeight": "bold"
      },
      "className": "text-blue-500" // Example specific color for defense
    }
    // Add more elements as needed for your specific card design
    // e.g., rarity, flavor text, set symbols, etc.
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
      { key: 'artworkUrl', label: 'Full Card Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png', defaultValue: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png', defaultValue: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., abstract pattern' },
      { key: 'description', label: 'Description (fallback)', type: 'textarea', placeholder: 'General card text if specific fields are not used.' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', placeholder: 'e.g., Basic Unit', defaultValue: 'Unit' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 0 },
      { key: 'attack', label: 'Attack', type: 'number', defaultValue: 1 },
      { key: 'defense', label: 'Defense', type: 'number', defaultValue: 1 },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Main card text, abilities, rules.', defaultValue: 'Sample effect text.' },
      { key: 'flavorText', label: 'Flavor Text', type: 'textarea', placeholder: 'Italicized thematic text.' },
      {
        key: 'rarity', label: 'Rarity', type: 'select', defaultValue: 'common',
        options: [ { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' }, { value: 'rare', label: 'Rare' } ],
      },
    ],
    layoutDefinition: DEFAULT_CARD_LAYOUT_JSON_STRING
  },
  {
    id: 'creature',
    name: 'Creature Card (Seed)',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Grizzly Bear' },
      { key: 'artworkUrl', label: 'Full Card Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png', defaultValue: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png', defaultValue: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., forest beast' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 3, placeholder: '3' },
      { key: 'attack', label: 'Attack', type: 'number', defaultValue: 2, placeholder: '2' },
      { key: 'defense', label: 'Defense', type: 'number', defaultValue: 2, placeholder: '2' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Creature - Bear', placeholder: 'e.g., Creature - Bear' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Abilities and rules text...', defaultValue: 'This creature has a standard effect.' },
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
      { key: 'artworkUrl', label: 'Full Card Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png', defaultValue: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png', defaultValue: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., magical explosion' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 1, placeholder: '1' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Spell - Instant', placeholder: 'e.g., Instant Spell' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Spell effects and rules text...', defaultValue: 'This spell has a magical effect.' },
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
      { key: 'artworkUrl', label: 'Full Card Art URL', type: 'text', placeholder: 'https://placehold.co/280x400.png', defaultValue: 'https://placehold.co/280x400.png' },
      { key: 'imageUrl', label: 'Main Image URL', type: 'text', placeholder: 'https://placehold.co/250x140.png', defaultValue: 'https://placehold.co/250x140.png' },
      { key: 'dataAiHint', label: 'AI Image Hint', type: 'text', placeholder: 'e.g., glowing artifact' },
      { key: 'cost', label: 'Cost', type: 'number', defaultValue: 2, placeholder: '2' },
      { key: 'cardType', label: 'Card Type Line', type: 'text', defaultValue: 'Item - Equipment', placeholder: 'e.g., Equipment' },
      { key: 'effectText', label: 'Effect Text', type: 'textarea', placeholder: 'Item effects and rules text...', defaultValue: 'This item provides a benefit.' },
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
