// src/lib/card-designer/utils.ts
import * as LucideIcons from 'lucide-react'; // Main wildcard import
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
  
  path += `.png`; // Ensure PNG format

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
    borderSideWidthOptions: ReadonlyArray<{ value: string; label: string; twClass?: string }> 
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: getSideBorderWidthClass called with:', side, value);
  if (!value || value === NONE_VALUE) return '';
  const option = borderSideWidthOptions.find(opt => opt.value === value);
  if (!option || !option.twClass) return '';
  
  return option.twClass.replace('?', side);
};

// getSideBorderColorClass is no longer needed if color is part of twClass or global border color logic

export const findTailwindClassValue = (
    classNameString: string | undefined, 
    options: ReadonlyArray<{value: string, label?: string}>,
    defaultValue: string = NONE_VALUE
  ): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findTailwindClassValue');
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
  borderSideWidthOptions: ReadonlyArray<{ value: string; label: string; twClass: string }>,
  tailwindBorderPaletteOptions: ReadonlyArray<{ value: string; label?: string }>,
  defaultValue: string = NONE_VALUE
): string => {
  // console.log('[DEBUG] card-designer/utils.ts: findSideBorderClassValue for:', side, type);
  if (!classNameString) return defaultValue;
  const classes = classNameString.split(' ');

  if (type === 'width') {
    for (const opt of borderSideWidthOptions) {
      if (opt.value === NONE_VALUE || !opt.twClass) continue;
      const classToFind = opt.twClass.replace('?', side);
      if (classes.includes(classToFind)) {
        return opt.value;
      }
    }
  } else if (type === 'color') {
    const colorClassPrefix = `border-${side}-`;
    for (const cls of classes) {
      if (cls.startsWith(colorClassPrefix)) {
        const colorSuffix = cls.substring(colorClassPrefix.length);
        if (tailwindBorderPaletteOptions.some(opt => opt.value === colorSuffix && opt.value !== NONE_VALUE)) {
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
  const { name, className, ...otherIconProps } = props;

  // console.log('[DEBUG] card-designer/utils.ts: IconComponent rendering icon:', name, "with className:", className);
  const IconToRender = (LucideIcons as any)[name];

  if (!IconToRender || typeof IconToRender !== 'function') {
    console.warn(`[IconComponent] Lucide icon "${name}" not found or not a function. Rendering basic SVG fallback.`);
    // Basic visual fallback using raw SVG (paths for HelpCircle)
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className} // Apply className to the SVG itself
        {...otherIconProps}  // Spread other props like color, size (if not overridden by className)
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    );
  }
  return <IconToRender className={className} {...otherIconProps} />;
};

console.log('[DEBUG] card-designer/utils.ts: Module fully loaded and helpers defined.');
