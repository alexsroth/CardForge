// src/lib/card-designer/utils.ts
import * as LucideIcons from 'lucide-react';
import { HelpCircle as FallbackIcon } from 'lucide-react';
import type { BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, TAILWIND_TEXT_COLORS, TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS, TAILWIND_LINE_HEIGHTS, TAILWIND_OVERFLOW, TAILWIND_TEXT_OVERFLOW, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE } from './constants';


export const toCamelCase = (str: string): string => {
  console.log('[DEBUG] card-designer/utils.ts: toCamelCase called with:', str);
  if (!str) return '';
  const cleaned = str.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, ' ');
  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'untitledField';
  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  let result = [firstWord, ...restWords].join('');
  if (!result) result = 'untitledField';
  if (/^[0-9]/.test(result)) result = '_' + result;
  return result;
};

export const generateSamplePlaceholderUrl = (config: {
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  text?: string;
}): string => {
  console.log('[DEBUG] card-designer/utils.ts: generateSamplePlaceholderUrl called with config:', config);
  const numWidth = Number(config.width);
  const numHeight = Number(config.height);

  const w = (!isNaN(numWidth) && numWidth > 0) ? numWidth : 100;
  const h = (!isNaN(numHeight) && numHeight > 0) ? numHeight : 100;
  
  let path = `${w}x${h}`;
  const cleanBgColor = config.bgColor?.replace('#', '').trim();
  const cleanTextColor = config.textColor?.replace('#', '').trim();

  if (cleanBgColor) {
    path += `/${cleanBgColor}`;
    if (cleanTextColor) {
      path += `/${cleanTextColor}`;
    }
  }
  // Always request .png for consistency in card editor, appended after colors if they exist, or after dimensions.
  path += `.png`; 

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  // console.log('[DEBUG] FieldRow/generatePlaceholderUrl: Generated URL', fullUrl, 'from config', config);
  return fullUrl;
};

// Helper for border width Tailwind classes
export const getSideBorderWidthClass = (
    side: 't' | 'r' | 'b' | 'l', 
    value: string | undefined,
    borderSideWidthOptions: typeof BORDER_SIDE_WIDTH_OPTIONS // Pass the options array
): string => {
  console.log('[DEBUG] card-designer/utils.ts: getSideBorderWidthClass called with:', side, value);
  if (!value || value === NONE_VALUE) return '';
  const option = borderSideWidthOptions.find(opt => opt.value === value);
  if (!option) return ''; // Should not happen if value comes from select
  if (option.value === 'default') return `border-${side}`;
  return `border-${side}-${option.value}`;
};

// Helper for border color Tailwind classes
export const getSideBorderColorClass = (
    side: 't' | 'r' | 'b' | 'l', 
    colorValue: string | undefined,
    tailwindBorderPaletteOptions: typeof TAILWIND_BORDER_PALETTE_OPTIONS // Pass the options array
): string => {
  console.log('[DEBUG] card-designer/utils.ts: getSideBorderColorClass called with:', side, colorValue);
  if (!colorValue || colorValue === NONE_VALUE) return '';
  // The colorValue from the GUI will be like "primary", "red-500", etc.
  // It does not include "border-" or "border-t-".
  return `border-${side}-${colorValue}`;
};

export const findTailwindClassValue = (
    classNameString: string | undefined, 
    options: Array<{value: string, label?: string}>, // label is optional here
    noneValue: string = NONE_VALUE
  ): string => {
  console.log('[DEBUG] card-designer/utils.ts: findTailwindClassValue called for options:', options.map(o => o.value).slice(0,3));
  if (!classNameString) return noneValue;
  const classes = classNameString.split(' ');
  for (const opt of options) {
    if (opt.value === noneValue || !opt.value) continue; // Skip the "None" or empty value option
    if (classes.includes(opt.value)) {
      return opt.value;
    }
  }
  return noneValue;
};

export const findSideBorderClassValue = (
    classNameString: string | undefined, 
    side: 't' | 'r' | 'b' | 'l', 
    type: 'width' | 'color',
    borderSideWidthOptions: typeof BORDER_SIDE_WIDTH_OPTIONS,
    tailwindBorderPaletteOptions: typeof TAILWIND_BORDER_PALETTE_OPTIONS,
    noneValue: string = NONE_VALUE
  ): string => {
  console.log('[DEBUG] card-designer/utils.ts: findSideBorderClassValue called for:', side, type);
  if (!classNameString) return noneValue;
  const classes = classNameString.split(' ');

  if (type === 'width') {
    const prefix = `border-${side}-`;
    const exactSideBorder = `border-${side}`; // For default 1px width
    for (const cls of classes) {
      if (cls === exactSideBorder) return 'default'; // Maps to our GUI option 'default'
      if (cls.startsWith(prefix)) {
        const valuePart = cls.substring(prefix.length);
        if (borderSideWidthOptions.some(opt => opt.value === valuePart && opt.value !== noneValue)) {
          return valuePart;
        }
      }
    }
  } else if (type === 'color') {
    const prefix = `border-${side}-`; // e.g., border-t-
    for (const cls of classes) {
      if (cls.startsWith(prefix)) {
        const colorSuffix = cls.substring(prefix.length); // e.g., red-500, primary
        if (tailwindBorderPaletteOptions.some(opt => opt.value === colorSuffix && opt.value !== noneValue)) {
          return colorSuffix; // This is the value stored in the select (without border-side- prefix)
        }
      }
    }
  }
  return noneValue;
};

export const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  console.log('[DEBUG] card-designer/utils.ts: IconComponent rendering icon:', name);
  const Icon = (LucideIcons as any)[name];
  if (!Icon || typeof Icon !== 'function') {
    console.warn(`[IconComponent] Lucide icon "${name}" not found or not a function. Fallback 'HelpCircle' will be used.`);
    return <FallbackIcon {...props} />;
  }
  return <Icon {...props} />;
};

console.log('[DEBUG] card-designer/utils.ts: Module loaded');
