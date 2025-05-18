// src/lib/card-designer/utils.ts
import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react'; // Explicit import for fallback
// Other imports (constants)
import { NONE_VALUE } from './constants';

console.log('[DEBUG] card-designer/utils.ts: Module loaded, attempting to define helpers.');

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
  // Append .png to specify format, especially when colors are used
  path += `.png`;

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText && cleanText.length > 0) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  return fullUrl;
};

export const getSideBorderWidthClass = (
    side: 't' | 'r' | 'b' | 'l',
    value: string | undefined,
    widthOptions: ReadonlyArray<{ value: string; tailwindClass: string }> // Assuming tailwindClass has '?'
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: getSideBorderWidthClass called for side:', side, 'value:', value);
  if (!value || value === NONE_VALUE) return '';
  const option = widthOptions.find(opt => opt.value === value);
  // Replace '?' with the actual side character (t, r, b, l)
  return option ? option.tailwindClass.replace('?', side) : '';
};

export const getSideBorderColorClass = (
    side: 't' | 'r' | 'b' | 'l',
    value: string | undefined,
    colorOptions: ReadonlyArray<{value: string, label: string}> // These are just color names/values like "primary" or "red-500"
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: getSideBorderColorClass called for side:', side, 'value:', value);
  if (!value || value === NONE_VALUE) return '';
  const colorOption = colorOptions.find(opt => opt.value === value);
  if (colorOption) {
    return `border-${side}-${value}`; // Constructs e.g., border-t-primary, border-r-red-500
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
    if (opt.value === NONE_VALUE || !opt.value) continue; // Skip the "None" option placeholder
    if (classes.includes(opt.value)) {
      return opt.value;
    }
  }
  return defaultValue;
};

// Helper to find a specific side's border width or color class from a className string
export const findSideBorderClassValue = (
  classNameString: string | undefined,
  side: 't' | 'r' | 'b' | 'l',
  type: 'width' | 'color', // 'width' for classes like 'border-t-2', 'color' for 'border-t-red-500'
  widthOptions: ReadonlyArray<{value: string, tailwindClass: string, label: string}>, // e.g. value: '2', tailwindClass: 'border-?-2'
  colorOptions: ReadonlyArray<{value: string, label: string}>, // e.g. value: 'red-500'
  defaultValue: string = NONE_VALUE
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findSideBorderClassValue for side:', side, 'type:', type, 'in:', classNameString);
  if (!classNameString) return defaultValue;
  const classes = classNameString.split(' ');

  if (type === 'width') {
    for (const opt of widthOptions) {
      if (opt.value === NONE_VALUE) continue;
      const expectedClass = opt.tailwindClass.replace('?', side); // e.g. 'border-t-2'
      if (classes.includes(expectedClass)) {
        return opt.value; // Return the abstract value like '2', not the full class
      }
    }
  } else if (type === 'color') {
    const colorClassPrefix = `border-${side}-`; // e.g. 'border-t-'
    for (const cls of classes) {
      if (cls.startsWith(colorClassPrefix)) {
        const colorSuffix = cls.substring(colorClassPrefix.length); // e.g. 'red-500'
        if (colorOptions.some(opt => opt.value === colorSuffix && opt.value !== NONE_VALUE)) {
          return colorSuffix;
        }
      }
    }
  }
  return defaultValue;
};

interface IconComponentActualProps extends LucideIcons.LucideProps {
  name: string;
}

export const IconComponent = (props: IconComponentActualProps) => {
  const { name, className, ...restOfProps } = props; // Destructure className specifically

  // console.log('[DEBUG] card-designer/utils.ts: IconComponent rendering icon:', name);
  const IconToRender = (LucideIcons as any)[name];

  if (!IconToRender || typeof IconToRender !== 'function') {
    console.warn(`[IconComponent] Lucide icon "${name}" not found or not a function. Rendering fallback HelpCircle.`);
    // Drastically simplify fallback props to diagnose parser issue
    if (className) {
      return <HelpCircle className={className} />;
    }
    return <HelpCircle />; // Render with no props if className is also undefined
  }
  // For the actual icon, continue attempting to spread other props
  return <IconToRender className={className} {...restOfProps} />;
};

console.log('[DEBUG] card-designer/utils.ts: Module fully loaded and helpers defined.');
