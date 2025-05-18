
// src/lib/card-designer/utils.ts
import * as LucideIcons from 'lucide-react';
import { HelpCircle as FallbackIcon } from 'lucide-react';
import type {
    BORDER_SIDE_WIDTH_OPTIONS as BorderWidthOptionsType, // Renamed for clarity within function
    TAILWIND_BORDER_PALETTE_OPTIONS as BorderPaletteOptionsType, // Renamed for clarity
    TAILWIND_TEXT_COLORS,
    TAILWIND_FONT_SIZES,
    TAILWIND_FONT_WEIGHTS,
    TAILWIND_LINE_HEIGHTS,
    TAILWIND_OVERFLOW,
    TAILWIND_TEXT_OVERFLOW,
    TAILWIND_BORDER_RADIUS_OPTIONS,
    NONE_VALUE
} from './constants';


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
  
  path += `.png`; // Ensure PNG format

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  return fullUrl;
};

// Helper for border width Tailwind classes
export const getSideBorderWidthClass = (
    side: 't' | 'r' | 'b' | 'l', 
    value: string | undefined,
    borderSideWidthOptions: typeof BorderWidthOptionsType 
): string => {
  console.log('[DEBUG] card-designer/utils.ts: getSideBorderWidthClass called with:', side, value);
  if (!value || value === NONE_VALUE) return '';
  const option = borderSideWidthOptions.find(opt => opt.value === value);
  if (!option) return ''; 
  
  // The classPrefix already includes 'border-?-'. We just need to replace '?' with the side.
  // Example: opt.classPrefix = 'border-?-2', side = 't' => 'border-t-2'
  // For 'default', classPrefix = 'border-', side = 't' => 'border-t'
  if (option.classPrefix) {
      return option.classPrefix.replace('?', side);
  }
  return ''; // Should not happen if options are well-defined
};


export const findTailwindClassValue = (
    classNameString: string | undefined, 
    options: Array<{value: string, label?: string}>,
    noneValue: string = NONE_VALUE
  ): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findTailwindClassValue called for options:', options.map(o => o.value).slice(0,3));
  if (!classNameString) return noneValue;
  const classes = classNameString.split(' ');
  for (const opt of options) {
    if (opt.value === noneValue || !opt.value) continue; 
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
    borderSideWidthOptions: typeof BorderWidthOptionsType,
    tailwindBorderPaletteOptions: typeof BorderPaletteOptionsType, // Corrected type name
    noneValue: string = NONE_VALUE
  ): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findSideBorderClassValue called for:', side, type);
  if (!classNameString) return noneValue;
  const classes = classNameString.split(' ');

  if (type === 'width') {
    for (const opt of borderSideWidthOptions) {
        if (opt.value === noneValue) continue;
        // Construct the class to check, e.g., border-t-2 from option '2' and side 't'
        const classToCheck = opt.classPrefix ? opt.classPrefix.replace('?', side) : '';
        if (classToCheck && classes.includes(classToCheck)) {
            return opt.value; // Return the GUI value like '2' or 'default'
        }
    }
  } else if (type === 'color') {
    const colorClassPrefix = `border-${side}-`; // e.g., border-t-
    for (const cls of classes) {
      if (cls.startsWith(colorClassPrefix)) {
        const colorSuffix = cls.substring(colorClassPrefix.length); // e.g., red-500, primary
        if (tailwindBorderPaletteOptions.some(opt => opt.value === colorSuffix && opt.value !== noneValue)) {
          return colorSuffix; 
        }
      }
    }
  }
  return noneValue;
};

export const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  // console.log('[DEBUG] card-designer/utils.ts: IconComponent rendering icon:', name);
  const Icon = (LucideIcons as any)[name];
  if (!Icon || typeof Icon !== 'function') {
    console.warn(`[IconComponent] Lucide icon "${name}" not found or not a function. Fallback 'HelpCircle' will be used.`);
    return <FallbackIcon {...props} />;
  }
  return <Icon {...props} />;
};

console.log('[DEBUG] card-designer/utils.ts: Module loaded');

    