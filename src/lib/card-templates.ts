
import type { CardData } from './types';

// Define the structure for a field within a card template
export interface TemplateField {
  key: keyof Omit<CardData, 'id' | 'templateId' | 'customFields'> | string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'placeholderImage';
  defaultValue?: string | number | boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  // Specific config for 'placeholderImage' type
  placeholderConfigWidth?: number;
  placeholderConfigHeight?: number;
  placeholderConfigBgColor?: string; // Hex without #
  placeholderConfigTextColor?: string; // Hex without #
  placeholderConfigText?: string;
}

// Basic structure for a layout element
export interface LayoutElement {
  fieldKey: string; // Key from CardData
  type: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData'; // Type of element to render
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
  elements: LayoutElement[];
}

// Define the structure for a card template
export interface CardTemplate {
  id: string;
  name: string;
  fields: TemplateField[];
  layoutDefinition?: string; // JSON string for LayoutDefinition
}

// This CardTemplateId is a generic representation, used by CardData
export type CardTemplateId = string;

export const DEFAULT_CANVAS_WIDTH = 280;
export const DEFAULT_CANVAS_HEIGHT = 400;

// DEFAULT_CARD_LAYOUT_JSON_STRING
// This is a comprehensive default layout.
// Remember:
// - `fieldKey` values MUST match the "Field Key" you define in your "Data Fields" section.
// - For `style` objects, use camelCase for CSS properties (e.g., `fontSize`, not `font-size`).
export const DEFAULT_CARD_LAYOUT_JSON_STRING = `{
  "width": "${DEFAULT_CANVAS_WIDTH}px",
  "height": "${DEFAULT_CANVAS_HEIGHT}px",
  "backgroundColor": "hsl(var(--card))",
  "borderColor": "hsl(var(--border))",
  "borderRadius": "calc(var(--radius) - 2px)",
  "elements": [
    {
      "fieldKey": "name",
      "type": "text",
      "style": {
        "position": "absolute",
        "top": "15px",
        "left": "15px",
        "right": "60px",
        "fontSize": "1.1em",
        "fontWeight": "bold",
        "lineHeight": "1.2",
        "maxHeight": "40px",
        "overflow": "hidden",
        "textOverflow": "ellipsis"
      },
      "className": "text-card-foreground"
    },
    {
      "fieldKey": "cost",
      "type": "iconValue",
      "icon": "Coins",
      "style": {
        "position": "absolute",
        "top": "15px",
        "right": "15px",
        "fontSize": "1.1em",
        "fontWeight": "bold",
        "padding": "5px",
        "backgroundColor": "hsl(var(--muted))",
        "borderRadius": "9999px",
        "border": "1px solid hsl(var(--primary))"
      },
      "className": "text-primary"
    },
    {
      "fieldKey": "imageUrl",
      "type": "image",
      "style": {
        "position": "absolute",
        "top": "60px",
        "left": "15px",
        "right": "15px",
        "height": "140px",
        "objectFit": "cover",
        "borderRadius": "calc(var(--radius) - 4px)"
      }
    },
    {
      "fieldKey": "cardType",
      "type": "text",
      "style": {
        "position": "absolute",
        "top": "210px",
        "left": "15px",
        "right": "15px",
        "fontSize": "0.8em",
        "fontStyle": "italic",
        "textAlign": "center",
        "padding": "2px 0",
        "borderTop": "1px solid hsl(var(--border))",
        "borderBottom": "1px solid hsl(var(--border))"
      },
      "className": "text-muted-foreground"
    },
    {
      "fieldKey": "effectText",
      "type": "textarea",
      "style": {
        "position": "absolute",
        "top": "240px",
        "left": "15px",
        "right": "15px",
        "bottom": "55px",
        "fontSize": "0.85em",
        "lineHeight": "1.4"
      },
      "className": "text-card-foreground whitespace-pre-wrap"
    },
    {
      "fieldKey": "attack",
      "type": "iconValue",
      "icon": "Sword",
      "style": {
        "position": "absolute",
        "bottom": "15px",
        "left": "15px",
        "fontSize": "1em",
        "fontWeight": "bold"
      },
      "className": "text-destructive"
    },
    {
      "fieldKey": "defense",
      "type": "iconValue",
      "icon": "Shield",
      "style": {
        "position": "absolute",
        "bottom": "15px",
        "right": "15px",
        "fontSize": "1em",
        "fontWeight": "bold"
      },
      "className": "text-blue-500"
    }
  ]
}`;


// Centralized array of all card template definitions - this is the initial SEED.
// The TemplateContext will manage the runtime list, potentially loaded from localStorage.
// If localStorage is empty, it seeds with this. Now it will seed with an empty array.
export const cardTemplates: CardTemplate[] = [];
