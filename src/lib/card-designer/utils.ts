// src/lib/card-designer/utils.ts
import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react'; // Explicit import for fallback
import { NONE_VALUE } from './constants';

// console.log('[DEBUG] card-designer/utils.ts: Module loaded, attempting to define helpers.');

export const toCamelCase = (str: string): string => {
  // console.log('[DEBUG] card-designer/utils.ts: toCamelCase called with:', str);
  if (!str) return '';
  const cleaned = str.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/[\s_-]+/g, ' ').trim();
  if (!cleaned) return 'untitledField';

  const words = cleaned.split(' ');
  if (words.length === 0) return 'untitledField';

  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  let result = [firstWord, ...restWords].join('');
  if (!result) result = 'untitledField';
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  return result;
};

export const generateSamplePlaceholderUrl = (config: {
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  text?: string;
}): string => {
  // console.log('[DEBUG] card-designer/utils.ts: generateSamplePlaceholderUrl with config:', config);

  const numWidth = Number(config.width);
  const numHeight = Number(config.height);

  const w = (!isNaN(numWidth) && numWidth > 0) ? numWidth : 100;
  const h = (!isNaN(numHeight) && numHeight > 0) ? numHeight : 100;

  let path = `${w}x${h}`;
  const cleanBgColor = config.bgColor?.replace('#', '').trim();
  const cleanTextColor = config.textColor?.replace('#', '').trim();

  if (cleanBgColor && cleanBgColor.length > 0) {
    path += `/${cleanBgColor}`;
    if (cleanTextColor && cleanTextColor.length > 0) {
      path += `/${cleanTextColor}`;
    }
  }
  
  // Always append .png after dimensions and colors, before text query
  path += '.png';

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText && cleanText.length > 0) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  // console.log('[DEBUG] card-designer/utils.ts: Generated placeholder URL:', fullUrl);
  return fullUrl;
};

export const getSideBorderWidthClass = (
  side: 't' | 'r' | 'b' | 'l',
  value: string | undefined,
  options: ReadonlyArray<{ value: string; class: string; label?: string }> // class is the full Tailwind class e.g. "border-t-2"
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: getSideBorderWidthClass for side:', side, 'value:', value);
  if (!value || value === NONE_VALUE) return '';
  // The 'value' from the dropdown is now the direct Tailwind class or "NONE_VALUE"
  // For example, if user selects "2px" for top, 'value' will be "border-t-2"
  // This function might simplify to just returning `value` if `value` is the class itself.
  // Or, if `value` is still like "2", "4", "default", it needs to map to the class.
  // Let's assume 'value' is the intended class suffix like '2', '4', or 'default' for 1px
  
  // The BORDER_SIDE_WIDTH_OPTIONS in constants.ts should be like:
  // { value: "NONE_VALUE", label: "None (No Border)", class: "" },
  // { value: "default", label: "Default (1px)", class: `border-${side}` },
  // { value: "0", label: "0px", class: `border-${side}-0` },
  // { value: "2", label: "2px", class: `border-${side}-2` },
  // So, this function might not be strictly needed if the 'value' stored in GUI config IS the class itself.
  // For now, assuming the options structure is consistent and 'value' is the key.
  const option = options.find(opt => opt.value === value);
  if (option && option.class) { // Check if option.class exists
    return option.class.replace('?', side); // Assuming BORDER_SIDE_WIDTH_OPTIONS in constants uses '?'
  }
  // Fallback if direct mapping is done in GUI:
  if (value && value !== NONE_VALUE && value.startsWith(`border-${side}`)) {
    return value; // Value might already be the full class
  }
  if (value === "default") return `border-${side}`;
  if (value && value !== NONE_VALUE) return `border-${side}-${value}`;
  return '';
};


export const getSideBorderColorClass = (
  side: 't' | 'r' | 'b' | 'l',
  colorValue: string | undefined, // e.g., "primary", "red-500"
  colorOptions: ReadonlyArray<{value: string, label: string}>
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: getSideBorderColorClass for side:', side, 'value:', colorValue);
  if (!colorValue || colorValue === NONE_VALUE) return '';
  const colorOption = colorOptions.find(opt => opt.value === colorValue);
  if (colorOption) {
    return `border-${side}-${colorValue}`;
  }
  return '';
};


export const findTailwindClassValue = (
  classNameString: string | undefined,
  options: ReadonlyArray<{value: string, label?: string}>,
  defaultValue: string = NONE_VALUE
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findTailwindClassValue searching in:', classNameString);
  if (!classNameString) return defaultValue;
  const classes = classNameString.split(' ');
  for (const opt of options) {
    if (opt.value === NONE_VALUE || !opt.value) continue;
    if (classes.includes(opt.value)) {
      return opt.value;
    }
  }
  return defaultValue;
};

export const findSideBorderClassValue = (
  classNameString: string | undefined,
  side: 't' | 'r' | 'b' | 'l',
  type: 'width' | 'color',
  widthOptions: ReadonlyArray<{value: string; class?: string; classPrefix?: string; label: string}>,
  colorOptions: ReadonlyArray<{value: string; label: string}>,
  defaultValue: string = NONE_VALUE
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findSideBorderClassValue for side:', side, 'type:', type, 'in:', classNameString);
  if (!classNameString) return defaultValue;
  const classes = classNameString.split(' ');

  if (type === 'width') {
    // Match specific width classes e.g., border-t-2, border-r
    // Order of check might matter if 'border-t' and 'border-t-2' are both present, match more specific first.
    const widthClassPattern = new RegExp(`^border-${side}-(\\d+)$`); // e.g. border-t-2
    const defaultWidthClass = `border-${side}`; // e.g. border-t

    for (const cls of classes) {
      const match = cls.match(widthClassPattern);
      if (match) {
        const widthValue = match[1]; // "2", "4", etc.
        if (widthOptions.some(opt => opt.value === widthValue)) {
          return widthValue;
        }
      }
    }
    // Check for default width (e.g., 'border-t')
    if (classes.includes(defaultWidthClass) && widthOptions.some(opt => opt.value === 'default')) {
      return 'default';
    }
  } else if (type === 'color') {
    const colorClassPattern = new RegExp(`^border-${side}-(.+)`); // e.g. border-t-red-500
    for (const cls of classes) {
      const match = cls.match(colorClassPattern);
      if (match) {
        const colorSuffix = match[1]; // "red-500", "primary", etc.
        if (colorOptions.some(opt => opt.value === colorSuffix && opt.value !== NONE_VALUE)) {
          return colorSuffix;
        }
      }
    }
  }
  return defaultValue;
};

// console.log('[DEBUG] card-designer/utils.ts: Module fully loaded and helpers defined.');