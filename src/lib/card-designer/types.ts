
// src/lib/card-designer/types.ts

// Originally from src/components/template-designer/field-row.tsx and template designer pages
export interface TemplateFieldDefinition {
  _uiId?: string; // Stable unique ID for React key purposes
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'placeholderImage';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  previewValue?: string; // Stores the user-defined preview value as a string
  optionsString?: string;
  placeholderConfigWidth?: number;
  placeholderConfigHeight?: number;
  placeholderConfigBgColor?: string;
  placeholderConfigTextColor?: string;
  placeholderConfigText?: string;
}

// Configuration for each layout element in the GUI builder
export interface LayoutElementGuiConfig {
  _uiId: string; // Link back to the TemplateFieldDefinition._uiId
  fieldKey: string;
  label: string;
  originalType: TemplateFieldDefinition['type'];
  isEnabledOnCanvas: boolean;
  isExpandedInGui: boolean;

  elementType: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData';
  iconName?: string;

  // Direct CSS style inputs
  styleTop: string;
  styleLeft: string;
  styleRight: string;
  styleBottom: string;
  styleMaxHeight: string;
  stylePadding: string;
  styleFontStyle: string;
  styleTextAlign: string;
  // styleBorderTop: string; // Replaced by Tailwind per-side
  // styleBorderBottom: string; // Replaced by Tailwind per-side

  // Tailwind class selections
  tailwindTextColor: string;
  tailwindFontSize: string;
  tailwindFontWeight: string;
  tailwindLineHeight: string;
  tailwindOverflow: string;
  tailwindTextOverflow: string;
  
  tailwindBorderRadius: string;
  // tailwindBorderColor: string; // Replaced by per-side color
  // tailwindBorderWidth: string; // Replaced by per-side width

  tailwindBorderTopW: string;
  tailwindBorderRightW: string;
  tailwindBorderBottomW: string;
  tailwindBorderLeftW: string;
  
  tailwindBorderTopColor: string;
  tailwindBorderRightColor: string;
  tailwindBorderBottomColor: string;
  tailwindBorderLeftColor: string;
}

// console.log('[DEBUG] card-designer/types.ts: Module loaded');

    