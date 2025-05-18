
// src/app/templates/new/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, Palette, ChevronDown, ChevronRight, Settings, Copy, HelpCircle, EllipsisVertical } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId as ContextCardTemplateId, LayoutDefinition } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


type CardTemplateId = ContextCardTemplateId;

export interface LayoutElementGuiConfig {
  _uiId: string;
  fieldKey: string;
  label: string;
  originalType: TemplateFieldDefinition['type'];
  isEnabledOnCanvas: boolean;
  isExpandedInGui: boolean;

  elementType: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData';
  iconName?: string;

  styleTop: string;
  styleLeft: string;
  styleRight?: string;
  styleBottom?: string;
  styleMaxHeight?: string;
  stylePadding?: string;
  styleFontStyle?: string;
  styleTextAlign?: string;
  styleBorderTop?: string;
  styleBorderBottom?: string;

  tailwindTextColor?: string;
  tailwindFontSize?: string;
  tailwindFontWeight?: string;
  tailwindLineHeight?: string;
  tailwindOverflow?: string;
  tailwindTextOverflow?: string;
  tailwindBorderRadius?: string;
  tailwindBorderColor?: string;
  tailwindBorderTopW?: string;
  tailwindBorderRightW?: string;
  tailwindBorderBottomW?: string;
  tailwindBorderLeftW?: string;
}

const COMMON_CARD_SIZES = [
  { label: `Default (${DEFAULT_CANVAS_WIDTH}x${DEFAULT_CANVAS_HEIGHT} px)`, width: `${DEFAULT_CANVAS_WIDTH}px`, height: `${DEFAULT_CANVAS_HEIGHT}px`, value: `${DEFAULT_CANVAS_WIDTH}x${DEFAULT_CANVAS_HEIGHT}` },
  { label: "Poker (250x350 px)", width: "250px", height: "350px", value: "250x350" },
  { label: "Bridge (225x350 px)", width: "225px", height: "350px", value: "225x350" },
  { label: "Tarot (275x475 px)", width: "275px", height: "475px", value: "275x475" },
  { label: "Small Square (250x250 px)", width: "250px", height: "250px", value: "250x250" },
  { label: "Jumbo (350x500 px)", width: "350px", height: "500px", value: "350x500" },
  { label: "Business Card (350x200 px)", width: "350px", height: "200px", value: "350x200" },
  { label: "Custom", value: "custom" }
];

const NONE_VALUE = "_none_";

const TAILWIND_TEXT_COLORS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Theme Default)" },
    { value: "text-black", label: "Black" },
    { value: "text-white", label: "White" },
    { value: "text-slate-500", label: "Slate 500" }, { value: "text-red-500", label: "Red 500" },
    { value: "text-orange-500", label: "Orange 500" }, { value: "text-amber-500", label: "Amber 500" },
    { value: "text-yellow-500", label: "Yellow 500" }, { value: "text-lime-500", label: "Lime 500" },
    { value: "text-green-500", label: "Green 500" }, { value: "text-emerald-500", label: "Emerald 500" },
    { value: "text-teal-500", label: "Teal 500" }, { value: "text-cyan-500", label: "Cyan 500" },
    { value: "text-sky-500", label: "Sky 500" }, { value: "text-blue-500", label: "Blue 500" },
    { value: "text-indigo-500", label: "Indigo 500" }, { value: "text-violet-500", label: "Violet 500" },
    { value: "text-purple-500", label: "Purple 500" }, { value: "text-fuchsia-500", label: "Fuchsia 500" },
    { value: "text-pink-500", label: "Pink 500" }, { value: "text-rose-500", label: "Rose 500" },
];
const TAILWIND_FONT_SIZES: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "text-xs", label: "XS" }, { value: "text-sm", label: "Small" }, { value: "text-base", label: "Base" },
    { value: "text-lg", label: "Large" }, { value: "text-xl", label: "XL" }, { value: "text-2xl", label: "2XL" },
    { value: "text-3xl", label: "3XL" }, { value: "text-4xl", label: "4XL" },
];
const TAILWIND_FONT_WEIGHTS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "font-thin", label: "Thin (100)" }, { value: "font-extralight", label: "Extra Light (200)" },
    { value: "font-light", label: "Light (300)" }, { value: "font-normal", label: "Normal (400)" },
    { value: "font-medium", label: "Medium (500)" }, { value: "font-semibold", label: "Semi-Bold (600)" },
    { value: "font-bold", label: "Bold (700)" }, { value: "font-extrabold", label: "Extra Bold (800)" },
    { value: "font-black", label: "Black (900)" },
];
const TAILWIND_LINE_HEIGHTS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "leading-3", label: "0.75rem (12px)" }, { value: "leading-4", label: "1rem (16px)" },
    { value: "leading-5", label: "1.25rem (20px)" }, { value: "leading-6", label: "1.5rem (24px)" },
    { value: "leading-7", label: "1.75rem (28px)" }, { value: "leading-8", label: "2rem (32px)" },
    { value: "leading-9", label: "2.25rem (36px)" }, { value: "leading-10", label: "2.5rem (40px)" },
    { value: "leading-none", label: "None (1)" }, { value: "leading-tight", label: "Tight (1.25)" },
    { value: "leading-snug", label: "Snug (1.375)" }, { value: "leading-normal", label: "Normal (1.5)" },
    { value: "leading-relaxed", label: "Relaxed (1.625)" }, { value: "leading-loose", label: "Loose (2)" },
];
const TAILWIND_OVERFLOW: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "overflow-auto", label: "Auto" }, { value: "overflow-hidden", label: "Hidden" },
    { value: "overflow-clip", label: "Clip" }, { value: "overflow-visible", label: "Visible" },
    { value: "overflow-scroll", label: "Scroll" },
];
const TAILWIND_TEXT_OVERFLOW: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "truncate", label: "Truncate (Ellipsis + Hidden)" }, { value: "text-ellipsis", label: "Ellipsis" },
    { value: "text-clip", label: "Clip" },
];

const TAILWIND_BORDER_RADIUS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Default)" },
  { value: "rounded-none", label: "None (Explicit)"},
  { value: "rounded-sm", label: "Small"},
  { value: "rounded", label: "Default"},
  { value: "rounded-md", label: "Medium"},
  { value: "rounded-lg", label: "Large"},
  { value: "rounded-xl", label: "XL"},
  { value: "rounded-2xl", label: "2XL"},
  { value: "rounded-3xl", label: "3XL"},
  { value: "rounded-full", label: "Full"},
];

const TAILWIND_BORDER_COLORS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Theme Default)" },
  { value: "border-transparent", label: "Transparent" },
  { value: "border-current", label: "Current Text Color" },
  { value: "border-primary", label: "Primary" },
  { value: "border-secondary", label: "Secondary" },
  { value: "border-muted", label: "Muted" },
  { value: "border-destructive", label: "Destructive" },
  { value: "border-white", label: "White" },
  { value: "border-black", label: "Black" },
  { value: "border-slate-500", label: "Slate 500" }, { value: "border-red-500", label: "Red 500" },
  { value: "border-orange-500", label: "Orange 500" }, { value: "border-amber-500", label: "Amber 500" },
  { value: "border-yellow-500", label: "Yellow 500" }, { value: "border-lime-500", label: "Lime 500" },
  { value: "border-green-500", label: "Green 500" }, { value: "border-emerald-500", label: "Emerald 500" },
  { value: "border-teal-500", label: "Teal 500" }, { value: "border-cyan-500", label: "Cyan 500" },
  { value: "border-sky-500", label: "Sky 500" }, { value: "border-blue-500", label: "Blue 500" },
  { value: "border-indigo-500", label: "Indigo 500" }, { value: "border-violet-500", label: "Violet 500" },
  { value: "border-purple-500", label: "Purple 500" }, { value: "border-fuchsia-500", label: "Fuchsia 500" },
  { value: "border-pink-500", label: "Pink 500" }, { value: "border-rose-500", label: "Rose 500" },
];

const BORDER_SIDE_WIDTH_OPTIONS: { value: string; label: string; classPrefix: string }[] = [
  { value: NONE_VALUE, label: "None (No Border)", classPrefix: "" },
  { value: 'default', label: "Default (1px)", classPrefix: "border" },
  { value: '0', label: "0px", classPrefix: "border" },
  { value: '2', label: "2px", classPrefix: "border" },
  { value: '4', label: "4px", classPrefix: "border" },
  { value: '8', label: "8px", classPrefix: "border" },
];

const getSideBorderWidthClass = (side: 't' | 'r' | 'b' | 'l', value: string): string => {
  if (value === NONE_VALUE) return '';
  const option = BORDER_SIDE_WIDTH_OPTIONS.find(opt => opt.value === value);
  if (!option) return '';
  if (option.value === 'default') return `${option.classPrefix}-${side}`;
  return `${option.classPrefix}-${side}-${option.value}`;
};


function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
  const field: TemplateField = {
    key: def.key,
    label: def.label,
    type: def.type,
  };
  if (def.placeholder) field.placeholder = def.placeholder;
  if (def.defaultValue !== undefined && String(def.defaultValue).trim() !== '') {
    if (def.type === 'number') {
      field.defaultValue = Number(def.defaultValue) || 0;
    } else if (def.type === 'boolean') {
      field.defaultValue = def.defaultValue === true || String(def.defaultValue).toLowerCase() === 'true';
    } else {
      field.defaultValue = String(def.defaultValue);
    }
  }
  if (def.type === 'select' && def.optionsString) {
    field.options = def.optionsString.split(',').map(pair => {
      const parts = pair.split(':');
      return {
        value: parts[0]?.trim() || '',
        label: parts[1]?.trim() || parts[0]?.trim() || '',
      };
    }).filter(opt => opt.value);
  }
   if (def.type === 'placeholderImage') {
    field.placeholderConfigWidth = def.placeholderConfigWidth;
    field.placeholderConfigHeight = def.placeholderConfigHeight;
    field.placeholderConfigBgColor = def.placeholderConfigBgColor;
    field.placeholderConfigTextColor = def.placeholderConfigTextColor;
    field.placeholderConfigText = def.placeholderConfigText;
  }
  return field;
}

const toCamelCase = (str: string): string => {
  if (!str) return '';
  const cleaned = str
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, ' ');

  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'untitledField';

  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  let result = [firstWord, ...restWords].join('');

  if (!result) result = 'untitledField';
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  return result;
};


function generateSamplePlaceholderUrl(config: {
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  text?: string;
}): string {
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
  path += `.png`;

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  return fullUrl;
}


const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
   if (!Icon || typeof Icon !== 'function') {
    return <LucideIcons.HelpCircle {...props} />;
  }
  return <Icon {...props} />;
};


export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);

  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);

  // State for Canvas Setup GUI
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(COMMON_CARD_SIZES[0].value);
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('hsl(var(--card))');
  const [canvasBorderColor, setCanvasBorderColor] = useState<string>('hsl(var(--border))');
  const [canvasBorderRadius, setCanvasBorderRadius] = useState<string>('calc(var(--radius) - 2px)');
  const [canvasBorderWidth, setCanvasBorderWidth] = useState<string>('1px');
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");

  // State for Layout Element GUI configurations
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);

  const { toast } = useToast();
  const { addTemplate: saveTemplateToContext, templates: existingTemplates, isLoading: templatesLoading } = useTemplates();
  const router = useRouter();

  const defaultLayout = useMemo(() => {
    try {
      return JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING) as LayoutDefinition;
    } catch {
      return { width: `${DEFAULT_CANVAS_WIDTH}px`, height: `${DEFAULT_CANVAS_HEIGHT}px`, elements: [] } as LayoutDefinition;
    }
  }, []);


  useEffect(() => {
    // Initialize canvas settings from default layout when component mounts
    let initialParsedLayout = defaultLayout;
     try {
        const parsed = JSON.parse(layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING);
        if (parsed && typeof parsed === 'object') {
            initialParsedLayout = { ...defaultLayout, ...parsed };
        }
    } catch (e) {
        console.warn("Error parsing initial layoutDefinition for canvas settings, using defaults.", e);
    }

    setCanvasWidthSetting(initialParsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`);
    setCanvasHeightSetting(initialParsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`);
    setCanvasBackgroundColor(initialParsedLayout.backgroundColor || 'hsl(var(--card))');
    setCanvasBorderColor(initialParsedLayout.borderColor || 'hsl(var(--border))');
    setCanvasBorderRadius(initialParsedLayout.borderRadius || 'calc(var(--radius) - 2px)');
    setCanvasBorderWidth(initialParsedLayout.borderWidth || '1px');
    setCanvasBorderStyle(initialParsedLayout.borderStyle || 'solid');

    const matchingPreset = COMMON_CARD_SIZES.find(
        s => s.width === initialParsedLayout.width && s.height === initialParsedLayout.height
    );
    setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

  }, [layoutDefinition, defaultLayout]);


  useEffect(() => {
    if (templateName.trim()) {
      setTemplateId(toCamelCase(templateName.trim()));
    } else {
      setTemplateId('');
    }
  }, [templateName]);

  useEffect(() => {
    // Sync fields to layoutElementGuiConfigs
    // This logic now also attempts to parse the current layoutDefinition to pre-populate GUI if editing
    let parsedLayout: LayoutDefinition;
    try {
        parsedLayout = JSON.parse(layoutDefinition.trim() || DEFAULT_CARD_LAYOUT_JSON_STRING) as LayoutDefinition;
    } catch (e) {
        console.warn("Error parsing layoutDefinition for GUI sync, using defaults.", e);
        parsedLayout = defaultLayout; // Use minimal default on error
    }
    const elementsFromJsonMap = new Map((parsedLayout.elements || []).map(el => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(prevConfigs => {
        const existingConfigsByUiIdMap = new Map(prevConfigs.map(c => [c._uiId, c]));
        const newConfigs: LayoutElementGuiConfig[] = fields.map((field, index) => {
            let config = existingConfigsByUiIdMap.get(field._uiId);
            const existingLayoutElement = elementsFromJsonMap.get(field.key);
            const isEnabled = !!existingLayoutElement;
            const styleFromElement = existingLayoutElement?.style || {};
            const classString = existingLayoutElement?.className || '';
            const classes = classString.split(' ').filter(Boolean);
            
            const defaultTopValue = `${10 + (index % 8) * 35}px`;
            const defaultElementType = field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text');

            if (config) { // Update existing config
                return {
                    ...config,
                    label: field.label,
                    fieldKey: field.key,
                    originalType: field.type,
                    isEnabledOnCanvas: isEnabled,
                    // Keep existing expanded state
                    elementType: existingLayoutElement?.type || config.elementType || defaultElementType,
                    iconName: existingLayoutElement?.icon ?? config.iconName ?? (field.type === 'number' ? 'Coins' : ''),
                    
                    styleTop: styleFromElement.top ?? (isEnabled ? '' : defaultTopValue),
                    styleLeft: styleFromElement.left ?? (isEnabled ? '' : '10px'),
                    styleRight: styleFromElement.right ?? '',
                    styleBottom: styleFromElement.bottom ?? '',
                    styleMaxHeight: styleFromElement.maxHeight ?? config.styleMaxHeight ?? (field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : 'auto')),
                    stylePadding: styleFromElement.padding ?? '',
                    styleFontStyle: styleFromElement.fontStyle ?? config.styleFontStyle ?? 'normal',
                    styleTextAlign: styleFromElement.textAlign ?? config.styleTextAlign ?? 'left',
                    styleBorderTop: styleFromElement.borderTop ?? '',
                    styleBorderBottom: styleFromElement.borderBottom ?? '',

                    tailwindTextColor: classes.find(c => TAILWIND_TEXT_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindTextColor || 'text-black',
                    tailwindFontSize: classes.find(c => TAILWIND_FONT_SIZES.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindFontSize || TAILWIND_FONT_SIZES.find(opt => opt.label === "Base")?.value || 'text-base',
                    tailwindFontWeight: classes.find(c => TAILWIND_FONT_WEIGHTS.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindFontWeight || TAILWIND_FONT_WEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'font-normal',
                    tailwindLineHeight: classes.find(c => TAILWIND_LINE_HEIGHTS.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindLineHeight || TAILWIND_LINE_HEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'leading-normal',
                    tailwindOverflow: classes.find(c => TAILWIND_OVERFLOW.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindOverflow || TAILWIND_OVERFLOW.find(opt => opt.label === "Visible")?.value || 'overflow-visible',
                    tailwindTextOverflow: classes.find(c => TAILWIND_TEXT_OVERFLOW.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindTextOverflow || NONE_VALUE,
                    
                    tailwindBorderRadius: classes.find(c => TAILWIND_BORDER_RADIUS.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindBorderRadius || NONE_VALUE,
                    tailwindBorderColor: classes.find(c => TAILWIND_BORDER_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || config.tailwindBorderColor || NONE_VALUE,
                    
                    tailwindBorderTopW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('t', opt.value) === c && opt.value !== NONE_VALUE)) || config.tailwindBorderTopW || NONE_VALUE,
                    tailwindBorderRightW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('r', opt.value) === c && opt.value !== NONE_VALUE)) || config.tailwindBorderRightW || NONE_VALUE,
                    tailwindBorderBottomW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('b', opt.value) === c && opt.value !== NONE_VALUE)) || config.tailwindBorderBottomW || NONE_VALUE,
                    tailwindBorderLeftW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('l', opt.value) === c && opt.value !== NONE_VALUE)) || config.tailwindBorderLeftW || NONE_VALUE,
                };
            } else { // Create new config
                 return {
                    _uiId: field._uiId || `gui-cfg-new-${field.key}-${Date.now()}-${index}`,
                    fieldKey: field.key,
                    label: field.label,
                    originalType: field.type,
                    isEnabledOnCanvas: isEnabled,
                    isExpandedInGui: false,
                    elementType: existingLayoutElement?.type || defaultElementType,
                    iconName: existingLayoutElement?.icon ?? (field.type === 'number' ? 'Coins' : ''),
                    
                    styleTop: styleFromElement.top ?? (isEnabled ? '' : defaultTopValue),
                    styleLeft: styleFromElement.left ?? (isEnabled ? '' : '10px'),
                    styleRight: styleFromElement.right ?? '',
                    styleBottom: styleFromElement.bottom ?? '',
                    
                    styleMaxHeight: styleFromElement.maxHeight ?? (field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : 'auto')),
                    stylePadding: styleFromElement.padding ?? '',
                    styleFontStyle: styleFromElement.fontStyle ?? 'normal',
                    styleTextAlign: styleFromElement.textAlign ?? 'left',
                    styleBorderTop: styleFromElement.borderTop ?? '',
                    styleBorderBottom: styleFromElement.borderBottom ?? '',
                    
                    tailwindTextColor: classes.find(c => TAILWIND_TEXT_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || 'text-black',
                    tailwindFontSize: classes.find(c => TAILWIND_FONT_SIZES.some(opt => opt.value === c && c !== NONE_VALUE)) || TAILWIND_FONT_SIZES.find(opt => opt.label === "Base")?.value || 'text-base',
                    tailwindFontWeight: classes.find(c => TAILWIND_FONT_WEIGHTS.some(opt => opt.value === c && c !== NONE_VALUE)) || TAILWIND_FONT_WEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'font-normal',
                    tailwindLineHeight: classes.find(c => TAILWIND_LINE_HEIGHTS.some(opt => opt.value === c && c !== NONE_VALUE)) || TAILWIND_LINE_HEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'leading-normal',
                    tailwindOverflow: classes.find(c => TAILWIND_OVERFLOW.some(opt => opt.value === c && c !== NONE_VALUE)) || TAILWIND_OVERFLOW.find(opt => opt.label === "Visible")?.value || 'overflow-visible',
                    tailwindTextOverflow: classes.find(c => TAILWIND_TEXT_OVERFLOW.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE,
                    
                    tailwindBorderRadius: classes.find(c => TAILWIND_BORDER_RADIUS.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE,
                    tailwindBorderColor: classes.find(c => TAILWIND_BORDER_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE,
                    
                    tailwindBorderTopW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('t', opt.value) === c && opt.value !== NONE_VALUE)) || NONE_VALUE,
                    tailwindBorderRightW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('r', opt.value) === c && opt.value !== NONE_VALUE)) || NONE_VALUE,
                    tailwindBorderBottomW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('b', opt.value) === c && opt.value !== NONE_VALUE)) || NONE_VALUE,
                    tailwindBorderLeftW: classes.find(c => BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('l', opt.value) === c && opt.value !== NONE_VALUE)) || NONE_VALUE,
                };
            }
        });
        // Filter out configs for fields that no longer exist
        const currentFieldUiIds = new Set(fields.map(f => f._uiId));
        return newConfigs.filter(nc => currentFieldUiIds.has(nc._uiId));
    });
}, [fields, layoutDefinition, defaultLayout]);


  useEffect(() => {
    const currentTemplateIdForPreview = templateId || 'previewTemplateId';
    const generatedSampleCard: Partial<CardData> = {
      id: 'preview-card',
      templateId: currentTemplateIdForPreview as CardTemplateId,
    };
    fields.forEach(fieldDef => {
      const key = fieldDef.key as keyof CardData;
      let valueForPreview: any;
      const hasPreviewValue = fieldDef.previewValue !== undefined && String(fieldDef.previewValue).trim() !== '';
      const hasDefaultValue = fieldDef.defaultValue !== undefined && String(fieldDef.defaultValue).trim() !== '';

      if (fieldDef.type === 'placeholderImage') {
         if (hasPreviewValue && typeof fieldDef.previewValue === 'string' && (fieldDef.previewValue.startsWith('http') || fieldDef.previewValue.startsWith('data:'))) {
          valueForPreview = fieldDef.previewValue;
        } else {
          valueForPreview = generateSamplePlaceholderUrl({
            width: fieldDef.placeholderConfigWidth,
            height: fieldDef.placeholderConfigHeight,
            bgColor: fieldDef.placeholderConfigBgColor,
            textColor: fieldDef.placeholderConfigTextColor,
            text: fieldDef.placeholderConfigText
          });
        }
      } else if (hasPreviewValue) {
        const pv = fieldDef.previewValue as string;
        if (fieldDef.type === 'number') {
          valueForPreview = !isNaN(Number(pv)) ? Number(pv) : (fieldDef.defaultValue !== undefined ? Number(fieldDef.defaultValue) : 0);
        } else if (fieldDef.type === 'boolean') {
          valueForPreview = pv.toLowerCase() === 'true';
        } else {
          valueForPreview = pv;
        }
      } else if (hasDefaultValue) {
        if (fieldDef.type === 'number') {
          valueForPreview = Number(fieldDef.defaultValue) || 0;
        } else if (fieldDef.type === 'boolean') {
          valueForPreview = String(fieldDef.defaultValue).toLowerCase() === 'true';
        } else {
          valueForPreview = fieldDef.defaultValue;
        }
      } else {
        switch (fieldDef.type) {
          case 'text': valueForPreview = `Sample ${fieldDef.label}`; break;
          case 'textarea': valueForPreview = `Sample content for ${fieldDef.label}. This might be a longer text to test how textarea elements handle overflow and scrolling if configured.`; break;
          case 'number': valueForPreview = Math.floor(Math.random() * 100); break;
          case 'boolean': valueForPreview = Math.random() > 0.5; break;
          case 'select':
            const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
            valueForPreview = firstOptionValue || `Option Sample`;
            break;
          default: valueForPreview = `Sample ${fieldDef.label}`;
        }
      }
      (generatedSampleCard as any)[key] = valueForPreview;
    });

    if (generatedSampleCard.name === undefined && !fields.some(f => f.key === 'name')) generatedSampleCard.name = 'Awesome Card Name';
    if (generatedSampleCard.cost === undefined && !fields.some(f => f.key === 'cost')) generatedSampleCard.cost = 3;
    if (generatedSampleCard.imageUrl === undefined && !fields.some(f => f.key === 'imageUrl')) {
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: parseInt(String(canvasWidthSetting).replace('px','')) || DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: parseInt(String(canvasWidthSetting).replace('px','')) || DEFAULT_CANVAS_WIDTH, height: parseInt(String(canvasHeightSetting).replace('px','')) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art'});
    }
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';


    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, templateId, templateName, canvasWidthSetting, canvasHeightSetting]);

  const templateForPreview = useMemo((): CardTemplate => ({
    id: (templateId || 'previewTemplateId') as CardTemplateId,
    name: templateName || 'Preview Template Name',
    fields: fields.map(mapFieldDefinitionToTemplateField),
    layoutDefinition: layoutDefinition,
  }), [templateId, templateName, fields, layoutDefinition]);

  const handleAddField = useCallback(() => {
    console.log('[DEBUG] TemplateDesignerPage/handleAddField: Adding new field.');
    const newFieldBaseLabel = `New Field`;
    let newFieldLabel = `${newFieldBaseLabel} ${fields.length + 1}`;
    let counter = fields.length + 1;
    while(fields.some(f => f.label === newFieldLabel)) {
        counter++;
        newFieldLabel = `${newFieldBaseLabel} ${counter}`;
    }
    let baseKey = toCamelCase(newFieldLabel);
    if (!baseKey) baseKey = `newField${fields.length + 1}`;
    let newKey = baseKey;
    let keyCounter = 1;
    while (fields.some(f => f.key === newKey)) {
        newKey = `${baseKey}${keyCounter}`;
        keyCounter++;
    }
    const newUiId = `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setFields(prevFields => [
      ...prevFields,
      {
        _uiId: newUiId,
        key: newKey,
        label: newFieldLabel,
        type: 'text',
        placeholder: '',
        defaultValue: '',
        previewValue: '',
        optionsString: '',
        placeholderConfigWidth: parseInt(String(canvasWidthSetting).replace('px','')) || DEFAULT_CANVAS_WIDTH,
        placeholderConfigHeight: 140,
      }
    ]);
  }, [fields, canvasWidthSetting]);

  const handleRemoveField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] TemplateDesignerPage/handleRemoveField: Removing field with _uiId', uiIdToRemove);
    const fieldToRemove = fields.find(f => f._uiId === uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
    if (fieldToRemove) {
      setLayoutElementGuiConfigs(prev => prev.filter(c => c._uiId !== fieldToRemove._uiId));
    }
  }, [fields]);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] TemplateDesignerPage/handleFieldChange: Updating field _uiId:', uiIdToUpdate, updatedFieldDefinition);
    setFields(prevFields =>
      prevFields.map(field => {
        if (field._uiId === uiIdToUpdate) {
          const oldField = { ...field };
          let modifiedField = { ...field, ...updatedFieldDefinition };

          if (updatedFieldDefinition.label !== undefined && updatedFieldDefinition.label !== oldField.label) {
            let baseKey = toCamelCase(updatedFieldDefinition.label);
            if (!baseKey) {
              const prefix = 'field';
              let fallbackCounter = 1;
              let potentialKey = `${prefix}${fallbackCounter}`;
              while (prevFields.some(f => f._uiId !== uiIdToUpdate && f.key === potentialKey)) {
                fallbackCounter++;
                potentialKey = `${prefix}${fallbackCounter}`;
              }
              baseKey = potentialKey;
            }
            let newKey = baseKey;
            let keyCounter = 1;
            while (prevFields.some(f => f._uiId !== uiIdToUpdate && f.key === newKey)) {
              newKey = `${baseKey}${keyCounter}`;
              keyCounter++;
            }
            modifiedField.key = newKey;
          }

          if (updatedFieldDefinition.type === 'placeholderImage' && oldField.type !== 'placeholderImage') {
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth || parseInt(String(canvasWidthSetting).replace('px','')) || DEFAULT_CANVAS_WIDTH;
            modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight || 140;
          } else if (updatedFieldDefinition.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
            modifiedField.placeholderConfigWidth = undefined;
            modifiedField.placeholderConfigHeight = undefined;
            modifiedField.placeholderConfigBgColor = undefined;
            modifiedField.placeholderConfigTextColor = undefined;
            modifiedField.placeholderConfigText = undefined;
          }
          return modifiedField;
        }
        return field;
      })
    );
  }, [canvasWidthSetting]);

  const handleLayoutDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    console.log('[DEBUG] TemplateDesignerPage/handleLayoutDefinitionChange: Layout string changed.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJson = useCallback(() => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      console.log('[DEBUG] TemplateDesignerPage/validateAndFormatLayoutJson: JSON is valid and formatted.');
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] TemplateDesignerPage/validateAndFormatLayoutJson: Invalid JSON', e.message);
      return false;
    }
  }, [layoutDefinition]);

  const handleGuiConfigChange = useCallback((targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => {
    console.log(`[DEBUG] TemplateDesignerPage/handleGuiConfigChange: fieldUiId: ${targetUiId}, prop: ${property}, value: ${String(value).substring(0,50)}`);
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config._uiId === targetUiId ? { ...config, [property]: value } : config
      )
    );
  }, []);

  const handleToggleGuiExpand = useCallback((targetUiId: string) => {
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config._uiId === targetUiId ? { ...config, isExpandedInGui: !config.isExpandedInGui } : config
      )
    );
  }, []);

  const handleGenerateJsonFromBuilder = useCallback(() => {
    console.log('[DEBUG] TemplateDesignerPage/handleGenerateJsonFromBuilder: Generating JSON from GUI configs.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: any = { position: "absolute" };
      if (config.styleTop?.trim()) style.top = config.styleTop.trim().endsWith('px') || config.styleTop.trim().endsWith('%') ? config.styleTop.trim() : `${config.styleTop.trim()}px`;
      if (config.styleLeft?.trim()) style.left = config.styleLeft.trim().endsWith('px') || config.styleLeft.trim().endsWith('%') ? config.styleLeft.trim() : `${config.styleLeft.trim()}px`;
      if (config.styleRight?.trim()) style.right = config.styleRight.trim();
      if (config.styleBottom?.trim()) style.bottom = config.styleBottom.trim();

      if (config.styleMaxHeight?.trim()) style.maxHeight = config.styleMaxHeight.trim();
      if (config.stylePadding?.trim()) style.padding = config.stylePadding.trim();
      if (config.styleBorderTop?.trim()) style.borderTop = config.styleBorderTop.trim();
      if (config.styleBorderBottom?.trim()) style.borderBottom = config.styleBorderBottom.trim();

      if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') {
        if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim();
        if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim();
      }

      const classNames = [];
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');

      if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) {
        classNames.push(config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE ? config.tailwindTextColor : 'text-black');
        classNames.push(config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE ? config.tailwindFontSize : TAILWIND_FONT_SIZES.find(opt => opt.label === "Base")?.value || 'text-base');
        classNames.push(config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE ? config.tailwindFontWeight : TAILWIND_FONT_WEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'font-normal');
        classNames.push(config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE ? config.tailwindLineHeight : TAILWIND_LINE_HEIGHTS.find(opt => opt.label.startsWith("Normal"))?.value || 'leading-normal');
      }
       if ((config.elementType === 'text' || config.elementType === 'textarea')) {
        classNames.push(config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE ? config.tailwindOverflow : TAILWIND_OVERFLOW.find(opt => opt.label === "Visible")?.value || 'overflow-visible');
        if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
       }

      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);

      const borderSideClasses = [
        config.tailwindBorderTopW, config.tailwindBorderRightW,
        config.tailwindBorderBottomW, config.tailwindBorderLeftW,
      ].filter(Boolean);

      if (borderSideClasses.length > 0) {
        classNames.push(...borderSideClasses);
        classNames.push(config.tailwindBorderColor && config.tailwindBorderColor !== NONE_VALUE ? config.tailwindBorderColor : 'border-border');
      }

      const element: any = {
        fieldKey: config.fieldKey,
        type: config.elementType,
      };
      if (Object.keys(style).length > 0) element.style = style;
      if (classNames.filter(Boolean).join(' ').trim()) {
        element.className = classNames.filter(Boolean).join(' ').trim();
      }
      if (config.elementType === 'iconValue' && config.iconName?.trim()) element.icon = config.iconName.trim();
      return element;
    });

    const newLayout: LayoutDefinition = {
      width: canvasWidthSetting || defaultLayout.width || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || defaultLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: canvasBackgroundColor || defaultLayout.backgroundColor || undefined,
      borderColor: canvasBorderColor || defaultLayout.borderColor || undefined,
      borderRadius: canvasBorderRadius || defaultLayout.borderRadius || undefined,
      borderWidth: canvasBorderWidth || defaultLayout.borderWidth || undefined,
      borderStyle: canvasBorderStyle || defaultLayout.borderStyle || undefined,
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    setLayoutJsonError(null);
    toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in the textarea and preview."});
  }, [
      layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
      canvasBackgroundColor, canvasBorderColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
      setLayoutDefinition, toast, defaultLayout
  ]);


  const handleSaveTemplate = async () => {
    console.log('[DEBUG] TemplateDesignerPage/handleSaveTemplate: Attempting to save.');
    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    const finalTemplateId = toCamelCase(templateName.trim());
     if (!finalTemplateId) {
        toast({ title: "Invalid Name", description: "Template Name generates an empty ID. Please provide a valid name.", variant: "destructive" });
        return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Please add at least one field to the template.", variant: "destructive" });
      return;
    }
     if (existingTemplates.some(t => t.id === finalTemplateId)) {
        toast({
            title: "Duplicate ID",
            description: `A template with ID '${finalTemplateId}' (generated from name '${templateName}') already exists. Please choose a unique name.`,
            variant: "destructive",
        });
        return;
    }
    const fieldKeys = fields.map(f => f.key);
    const duplicateFieldKeys = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicateFieldKeys.length > 0) {
        toast({
            title: "Duplicate Field Keys",
            description: `Field keys must be unique. Duplicates: ${duplicateFieldKeys.join(', ')}. Please adjust field labels.`,
            variant: "destructive",
        });
        return;
    }

    let finalLayoutDefToSave = layoutDefinition.trim();
    if (!finalLayoutDefToSave) {
      finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    }

    try {
      JSON.parse(finalLayoutDefToSave);
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      toast({
        title: "Invalid Layout JSON",
        description: `The JSON in 'Layout Definition' is invalid. Error: ${e.message}. Please correct it or regenerate from builder.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }


    setIsSaving(true);
    const newTemplate: CardTemplate = {
      id: finalTemplateId as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };
    console.log('[DEBUG] TemplateDesignerPage/handleSaveTemplate: Calling context.addTemplate with:', newTemplate);
    const result = await saveTemplateToContext(newTemplate);
    if (result.success) {
      toast({
        title: "Template Saved!",
        description: result.message,
        variant: "default",
        duration: 7000,
      });
      router.push('/templates');
    } else {
      toast({
        title: "Save Failed",
        description: result.message,
        variant: "destructive",
        duration: 7000,
      });
    }
    setIsSaving(false);
  };

  const handleCopyIconName = useCallback(async (iconName: string) => {
    try {
      await navigator.clipboard.writeText(iconName);
      toast({
        title: "Copied!",
        description: `Icon name "${iconName}" copied to clipboard.`,
        duration: 2000,
      });
    } catch (err) {
      console.error("Failed to copy icon name: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy icon name to clipboard.",
        variant: "destructive",
        duration: 2000,
      });
    }
  }, [toast]);

  const handleSizePresetChange = (value: string) => {
    setSelectedSizePreset(value);
    if (value === "custom") {
    } else {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
  };

  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: string) => {
    if (dimension === 'width') {
      setCanvasWidthSetting(value);
    } else {
      setCanvasHeightSetting(value);
    }
    if (selectedSizePreset !== "custom") {
      setSelectedSizePreset("custom");
    }
  };

   const handleCanvasDirectCSSChange = (
    prop: 'canvasBackgroundColor' | 'canvasBorderColor' | 'canvasBorderRadius' | 'canvasBorderWidth',
    value: string
  ) => {
     switch(prop) {
      case 'canvasBackgroundColor': setCanvasBackgroundColor(value); break;
      case 'canvasBorderColor': setCanvasBorderColor(value); break;
      case 'canvasBorderRadius': setCanvasBorderRadius(value); break;
      case 'canvasBorderWidth': setCanvasBorderWidth(value); break;
      default: console.warn("Unhandled canvas Tailwind property change:", prop);
    }
  };


  if (templatesLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading template context...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
         <CardHeader>
          <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><Palette className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <EllipsisVertical className="h-4 w-4" />
                    <span className="sr-only">Page Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleGenerateJsonFromBuilder}
                    disabled={isSaving || layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0}
                  >
                    <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSaveTemplate}
                    disabled={isSaving || !templateName.trim() || fields.length === 0 || !!layoutJsonError}
                  >
                     {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> ) : ( <> <Save className="mr-2 h-4 w-4" /> Save Template </>)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="text-md pt-2">
            Define the data structure and visual layout for a new card template. Template ID is auto-generated from the name. Field Keys are auto-generated from Field Labels. Templates are saved to browser local storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="templateName" className="font-semibold">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., 'Hero Unit Card'"
                disabled={isSaving}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="templateId" className="font-semibold">Template ID (auto-generated)</Label>
              <Input
                id="templateId"
                value={templateId}
                readOnly
                className="mt-1 bg-muted/50"
                disabled={isSaving || true}
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Data Fields</h3>
            <ScrollArea className="pr-3">
              <div className="space-y-2">
                {fields.map((field) => (
                <FieldRow
                    key={field._uiId}
                    field={field}
                    onChange={(updatedField) => handleFieldChange(field._uiId!, updatedField)}
                    onRemove={() => handleRemoveField(field._uiId!)}
                    isSaving={isSaving}
                />
                ))}
                {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                    No fields added yet. Click "Add Field" to begin.
                </p>
                )}
              </div>
            </ScrollArea>
             <Button
              onClick={handleAddField}
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="mt-3"
              title={"Add a new data field"}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Builder & Preview */}
      <div className="md:flex md:flex-row md:gap-6 items-start">
        {/* Left Column: Visual Layout Builder */}
        <Card className="md:w-[65%] flex flex-col shadow-md mb-6 md:mb-0">
          <CardHeader>
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription className="text-md">
                 Use the GUI below to configure card canvas properties and individual layout elements. Click "Generate/Update JSON" (in page actions menu <EllipsisVertical className="inline h-3 w-3"/>) to reflect changes in the JSON output and preview. The JSON textarea content is used on final save.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {/* Card Canvas Setup Section */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <h4 className="text-base font-semibold mb-1">Card Canvas Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                <div>
                  <Label htmlFor="canvasSizePreset" className="text-xs font-medium">Canvas Size Preset</Label>
                  <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving}>
                    <SelectTrigger id="canvasSizePreset" className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select size preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CARD_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSizePreset === 'custom' ? (
                  <>
                    <div>
                      <Label htmlFor="canvasWidth" className="text-xs font-medium">Custom Width (CSS)</Label>
                      <Input id="canvasWidth" value={canvasWidthSetting} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs" placeholder="e.g., 280px"/>
                    </div>
                    <div>
                      <Label htmlFor="canvasHeight" className="text-xs font-medium">Custom Height (CSS)</Label>
                      <Input id="canvasHeight" value={canvasHeightSetting} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs" placeholder="e.g., 400px"/>
                    </div>
                  </>
                ) : (COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)) && (
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                     <div><Label className="text-xs font-medium text-muted-foreground">Width</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.width}</p></div>
                    <div><Label className="text-xs font-medium text-muted-foreground">Height</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.height}</p></div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end mt-2">
                <div>
                  <Label htmlFor="canvasBgColor" className="text-xs font-medium">Background Color (CSS)</Label>
                  <Input id="canvasBgColor" value={canvasBackgroundColor} onChange={(e) => handleCanvasDirectCSSChange('canvasBackgroundColor', e.target.value)} placeholder="e.g., hsl(var(--card))" disabled={isSaving} className="mt-1 h-8 text-xs"/>
                </div>
                <div>
                  <Label htmlFor="canvasBorderRadius" className="text-xs font-medium">Border Radius (CSS)</Label>
                  <Input id="canvasBorderRadius" value={canvasBorderRadius} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderRadius', e.target.value)} placeholder="e.g., 0.5rem" disabled={isSaving} className="mt-1 h-8 text-xs"/>
                </div>
                 <div>
                  <Label htmlFor="canvasBorderWidth" className="text-xs font-medium">Border Width (CSS)</Label>
                   <Input id="canvasBorderWidth" value={canvasBorderWidth} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderWidth', e.target.value)} placeholder="e.g., 1px" disabled={isSaving} className="mt-1 h-8 text-xs"/>
                </div>
                <div>
                  <Label htmlFor="canvasBorderColor" className="text-xs font-medium">Border Color (CSS)</Label>
                   <Input id="canvasBorderColor" value={canvasBorderColor} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderColor', e.target.value)} placeholder="e.g., hsl(var(--border))" disabled={isSaving} className="mt-1 h-8 text-xs"/>
                </div>
                 <div>
                  <Label htmlFor="canvasBorderStyle" className="text-xs font-medium">Border Style (CSS)</Label>
                   <Select value={canvasBorderStyle} onValueChange={(value) => setCanvasBorderStyle(value)} disabled={isSaving}>
                    <SelectTrigger id="canvasBorderStyle" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Layout Elements Configuration Section */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
               <ScrollArea className="pr-2">
                  <div className="space-y-2">
                    {layoutElementGuiConfigs.map((config) => (
                      <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`enable-${config._uiId}`}
                              checked={config.isEnabledOnCanvas}
                              onCheckedChange={(checked) => handleGuiConfigChange(config._uiId, 'isEnabledOnCanvas', checked)}
                              disabled={isSaving}
                            />
                            <Label htmlFor={`enable-${config._uiId}`} className="text-sm font-medium cursor-pointer">
                              {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span>
                            </Label>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId)} className="h-7 w-7 text-muted-foreground">
                            {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </div>
                        {config.isExpandedInGui && config.isEnabledOnCanvas && (
                          <div className="mt-3 pt-3 border-t border-dashed space-y-4">
                            {/* Category: Element Type & Icon Name */}
                            <details className="space-y-2 group" open>
                              <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                  <Settings className="h-3 w-3 mr-1"/> Element Type & Icon Name
                                  <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                              </summary>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                                <div>
                                  <Label htmlFor={`el-type-${config._uiId}`} className="text-xs">Element Type</Label>
                                  <Select value={config.elementType} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'elementType', value as LayoutElementGuiConfig['elementType'])} disabled={isSaving}>
                                    <SelectTrigger id={`el-type-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem>
                                      <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem>
                                      <SelectItem value="iconFromData">Icon from Data</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {config.elementType === 'iconValue' && (
                                  <div className="space-y-1">
                                    <Label htmlFor={`el-icon-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                    <Input id={`el-icon-${config._uiId}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                                     <Accordion type="single" collapsible className="w-full text-xs" defaultValue="">
                                      <AccordionItem value={`icon-browser-inline-new-${config._uiId}`} className="border-b-0">
                                        <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5">
                                          <Copy className="mr-1 h-3 w-3" /> Browse Icons
                                        </AccordionTrigger>
                                        <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                            <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                            <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border overflow-y-auto">
                                                <div className={cn("grid gap-0.5", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                                                {commonLucideIconsForGuide.map(iconKey => (
                                                    <TooltipProvider key={`${iconKey}-new-${config._uiId}`} delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey)} className="h-7 w-7 p-1" >
                                                            <IconComponent name={iconKey} className="h-4 w-4" />
                                                        </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent>
                                                    </Tooltip>
                                                    </TooltipProvider>
                                                ))}
                                                </div>
                                            </ScrollArea>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </div>
                                )}
                              </div>
                            </details>

                            {/* Category: Position & Sizing (CSS) */}
                            <details className="space-y-2 group" open>
                              <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                  <Settings className="h-3 w-3 mr-1"/> Position & Sizing (CSS)
                                  <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                              </summary>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                  {['styleTop', 'styleLeft', 'styleRight', 'styleBottom'].map(prop => (
                                      <div key={prop}>
                                          <Label htmlFor={`el-${prop}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS value)</Label>
                                          <Input id={`el-${prop}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId, prop as keyof LayoutElementGuiConfig, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving}/>
                                      </div>
                                  ))}
                                  <div>
                                      <Label htmlFor={`el-styleMaxHeight-${config._uiId}`} className="text-xs">Max Height (CSS)</Label>
                                      <Input id={`el-styleMaxHeight-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px" disabled={isSaving}/>
                                  </div>
                                  <div>
                                      <Label htmlFor={`el-stylePadding-${config._uiId}`} className="text-xs">Padding (CSS)</Label>
                                      <Input id={`el-stylePadding-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px or 2px 4px" disabled={isSaving}/>
                                  </div>
                              </div>
                            </details>
                            
                            {/* Category: Typography (Conditional) */}
                            {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                              <details className="space-y-2 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                    <Settings className="h-3 w-3 mr-1"/> Typography
                                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                                </summary>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                  <div>
                                    <Label htmlFor={`el-twTextColor-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label>
                                    <Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextColor', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextColor-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontSize-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label>
                                    <Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontSize', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontSize-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontWeight-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label>
                                    <Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontWeight', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontWeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twLineHeight-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label>
                                    <Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindLineHeight', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twLineHeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select line height" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleFontStyle-${config._uiId}`} className="text-xs">Font Style (CSS)</Label>
                                     <Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleFontStyle', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleFontStyle-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleTextAlign-${config._uiId}`} className="text-xs">Text Align (CSS)</Label>
                                    <Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleTextAlign', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleTextAlign-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                </details>
                            )}
                            {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                <details className="space-y-2 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                    <Settings className="h-3 w-3 mr-1"/> Overflow & Display (Text - Tailwind)
                                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                                </summary>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                  <div>
                                    <Label htmlFor={`el-twOverflow-${config._uiId}`} className="text-xs">Overflow</Label>
                                    <Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindOverflow', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twTextOverflow-${config._uiId}`} className="text-xs">Text Overflow</Label>
                                    <Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextOverflow', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select text overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                </details>
                            )}
                            <details className="space-y-2 group" open>
                            <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                <Settings className="h-3 w-3 mr-1"/> Borders
                                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                            </summary>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                              <div>
                                  <Label htmlFor={`el-twBorderRadius-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label>
                                  <Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderRadius', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twBorderRadius-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>{TAILWIND_BORDER_RADIUS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                              <div>
                                  <Label htmlFor={`el-twBorderColor-${config._uiId}`} className="text-xs">Border Color (Tailwind)</Label>
                                  <Select value={config.tailwindBorderColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderColor', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twBorderColor-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>{TAILWIND_BORDER_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-1 mt-2">
                                {(['t', 'r', 'b', 'l'] as const).map(side => {
                                    const propKey = `tailwindBorder${side.toUpperCase()}W` as keyof LayoutElementGuiConfig;
                                    return (
                                    <div key={side}>
                                        <Label htmlFor={`el-twBorder${side}W-${config._uiId}`} className="text-xs capitalize">Border {side === 't' ? 'Top' : side === 'r' ? 'Right' : side === 'b' ? 'Bottom' : 'Left'} W</Label>
                                        <Select value={(config as any)[propKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, propKey, value)} disabled={isSaving}>
                                        <SelectTrigger id={`el-twBorder${side}W-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {BORDER_SIDE_WIDTH_OPTIONS.map(opt => (
                                            <SelectItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                    </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1 mt-2">
                                <div>
                                    <Label htmlFor={`el-styleBorderTop-${config._uiId}`} className="text-xs">Border Top (CSS value)</Label>
                                    <Input id={`el-styleBorderTop-${config._uiId}`} value={config.styleBorderTop || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleBorderTop', e.target.value)} placeholder="e.g., 1px solid #ccc" className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                                </div>
                                <div>
                                    <Label htmlFor={`el-styleBorderBottom-${config._uiId}`} className="text-xs">Border Bottom (CSS value)</Label>
                                    <Input id={`el-styleBorderBottom-${config._uiId}`} value={config.styleBorderBottom || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleBorderBottom', e.target.value)} placeholder="e.g., 1px solid #ccc" className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                                </div>
                            </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                     {layoutElementGuiConfigs.length === 0 && fields.length > 0 && (
                     <p className="text-xs text-muted-foreground text-center py-2">No data fields are currently enabled for the layout. Toggle a field above to configure it.</p>
                   )}
                   {fields.length === 0 && (
                     <p className="text-xs text-muted-foreground text-center py-2">Add data fields to the template first to configure their layout.</p>
                   )}
                  </div>
                </ScrollArea>
            </div>

            {/* JSON Output & Icon Browser Section */}
            <div className="mt-4 flex-grow flex flex-col min-h-0">
              <div>
                <Label htmlFor="layoutDefinition" className="text-sm font-medium">Layout Definition JSON (Builder output updates here)</Label>
                <Textarea
                  id="layoutDefinition"
                  value={layoutDefinition}
                  onChange={handleLayoutDefinitionChange}
                  onBlur={validateAndFormatLayoutJson}
                  placeholder='Click "Generate/Update JSON from Builder" (in page actions menu) to populate, or paste/edit your JSON here.'
                  rows={15}
                  className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                  disabled={isSaving}
                />
              </div>
              {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4 !text-destructive-foreground" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
              <Accordion type="single" collapsible className="w-full mt-2" defaultValue="">
                <AccordionItem value="lucide-icon-explorer-main" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3.5 py-1.5">
                    <Copy className="mr-1.5 h-3 w-3" /> Browse Lucide Icons
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-2 border rounded-md bg-muted/30">
                    <p className="text-xs font-semibold mb-1.5 text-foreground">Click icon to Copy Name:</p>
                    <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border overflow-y-auto">
                        <div className={cn("grid gap-0.5", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                        {commonLucideIconsForGuide.map(iconKey => (
                            <TooltipProvider key={`${iconKey}-new-main`} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey)} className="h-7 w-7 p-1" >
                                    <IconComponent name={iconKey} className="h-4 w-4" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                        ))}
                        </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Live Preview */}
        <Card className="md:w-[35%] sticky top-20 self-start shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center">
                    <Eye className="mr-2 h-5 w-5" /> Live Layout Preview
                </CardTitle>
                 <div className="flex items-center space-x-2">
                    <Switch id="show-pixel-grid" checked={showPixelGrid} onCheckedChange={setShowPixelGrid} aria-label="Show pixel grid" />
                    <Label htmlFor="show-pixel-grid" className="text-xs text-muted-foreground">Pixel Grid</Label>
                </div>
            </div>
            <CardDescription className="text-sm">
              This preview updates as you modify the Layout Definition JSON or template fields. Uses sample data based on your field definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 rounded-b-md">
            {sampleCardForPreview && templateForPreview ? (
              <DynamicCardRenderer
                card={sampleCardForPreview}
                template={templateForPreview}
                showPixelGrid={showPixelGrid}
              />
            ) : (
              <p className="text-muted-foreground">Define fields to see a preview.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    