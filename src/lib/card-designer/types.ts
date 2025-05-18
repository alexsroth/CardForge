// src/lib/card-designer/types.ts

// Originally from src/components/template-designer/field-row.tsx
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

// Originally defined in new/page.tsx and edit/[templateId]/page.tsx
export interface LayoutElementGuiConfig {
  _uiId: string; // Link back to the TemplateFieldDefinition._uiId
  fieldKey: string;
  label: string; // To display in the GUI list
  originalType: TemplateFieldDefinition['type']; // From the data field definition
  isEnabledOnCanvas: boolean; // Is this element part of the layout?
  isExpandedInGui: boolean; // Is the detail configuration UI for this element expanded?

  // GUI settings for the layout element
  elementType: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData';
  iconName?: string; // For 'iconValue' type

  // Direct CSS style inputs (values are strings, e.g., "10px", "bold")
  styleTop: string;
  styleLeft: string;
  styleRight?: string;
  styleBottom?: string;
  styleMaxHeight?: string;
  stylePadding?: string;
  styleFontStyle?: string; // e.g., "italic", "normal"
  styleTextAlign?: string; // e.g., "left", "center", "right"
  // styleBorderTop?: string; // Replaced by Tailwind per-side
  // styleBorderBottom?: string; // Replaced by Tailwind per-side

  // Tailwind class selections
  tailwindTextColor?: string;
  tailwindFontSize?: string;
  tailwindFontWeight?: string;
  tailwindLineHeight?: string;
  tailwindOverflow?: string;
  tailwindTextOverflow?: string;
  
  tailwindBorderRadius?: string;
  // tailwindBorderColor?: string; // Replaced by per-side color
  // tailwindBorderWidth?: string; // Replaced by per-side width

  tailwindBorderTopW?: string;
  tailwindBorderRightW?: string;
  tailwindBorderBottomW?: string;
  tailwindBorderLeftW?: string;
  
  tailwindBorderTopColor?: string;
  tailwindBorderRightColor?: string;
  tailwindBorderBottomColor?: string;
  tailwindBorderLeftColor?: string;
}

console.log('[DEBUG] card-designer/types.ts: Module loaded');
