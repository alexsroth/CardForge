
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
  style?: React.CSSProperties; // Inline styles for properties not covered by Tailwind or for overrides
  className?: string; // Tailwind classes for common styling
  prefix?: string; // For text elements, e.g., "Cost: "
  suffix?: string; // For text elements
  icon?: string; // Lucide icon name for iconValue type
}

// Define the structure for a card template's layout
export interface LayoutDefinition {
  // Top-level canvas properties (direct CSS or Tailwind class name)
  width?: string;
  height?: string;
  // Direct CSS properties for canvas (can be overridden by canvasClassName if it includes bg-*, border-*, etc.)
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderStyle?: string;     // Direct CSS (solid, dashed, etc.)
  // Tailwind classes for canvas styling (e.g. "bg-primary rounded-lg border-2 border-secondary")
  canvasClassName?: string;

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

// Minimal default layout - users build elements via GUI
export const DEFAULT_CARD_LAYOUT_JSON_STRING = `{
  "width": "${DEFAULT_CANVAS_WIDTH}px",
  "height": "${DEFAULT_CANVAS_HEIGHT}px",
  "backgroundColor": "hsl(var(--card))",
  "borderColor": "hsl(var(--border))",
  "borderRadius": "calc(var(--radius) - 2px)",
  "borderWidth": "1px",
  "borderStyle": "solid",
  "canvasClassName": "bg-card",
  "elements": []
}`;


// Centralized array of all card template definitions - this is the initial SEED.
// The TemplateContext will manage the runtime list, potentially loaded from localStorage.
// If localStorage is empty, it seeds with this.
export const cardTemplates: CardTemplate[] = [];
