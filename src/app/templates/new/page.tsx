// src/app/templates/new/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, Palette, HelpCircle, Copy, ChevronDown, ChevronRight, EllipsisVertical, Settings } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId as ContextCardTemplateId, LayoutDefinition, LayoutElement } from '@/lib/card-templates';
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

const NONE_VALUE = "_none_";

// Moved helper functions to module scope to prevent initialization errors

const mapFieldDefinitionToTemplateField = (def: TemplateFieldDefinition): TemplateField => {
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
};

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

const generateSamplePlaceholderUrl = (config: {
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  text?: string;
}): string => {
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
  // Add .png format specifier if colors are used or if no colors but explicit PNG is desired
  path += `.png`;

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = config.text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  // console.log('[DEBUG] generateSamplePlaceholderUrl: Generated URL', fullUrl, 'from config', config);
  return fullUrl;
};


const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon || typeof Icon !== 'function') {
    console.warn(`[TemplateDesignerPage] Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} />;
  }
  return <Icon {...props} />;
};

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

const TAILWIND_BORDER_RADIUS_OPTIONS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Default)" }, { value: "rounded-none", label: "None (Explicit)"},
  { value: "rounded-sm", label: "Small"}, { value: "rounded", label: "Default"},
  { value: "rounded-md", label: "Medium"}, { value: "rounded-lg", label: "Large"},
  { value: "rounded-xl", label: "XL"}, { value: "rounded-2xl", label: "2XL"},
  { value: "rounded-3xl", label: "3XL"}, { value: "rounded-full", label: "Full"},
];
const TAILWIND_BORDER_COLOR_OPTIONS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Theme Default)" }, { value: "border-transparent", label: "Transparent" },
  { value: "border-current", label: "Current Text Color" }, { value: "border-primary", label: "Primary Theme" },
  { value: "border-secondary", label: "Secondary Theme" }, { value: "border-muted", label: "Muted Theme" },
  { value: "border-destructive", label: "Destructive Theme" }, { value: "border-white", label: "White" },
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
  if (value === NONE_VALUE || !value) return '';
  const option = BORDER_SIDE_WIDTH_OPTIONS.find(opt => opt.value === value);
  if (!option) return '';
  if (option.value === 'default') return `${option.classPrefix}-${side}`;
  if (option.value === '0') return `${option.classPrefix}-${side}-0`; // Ensure border-t-0, etc.
  return `${option.classPrefix}-${side}-${option.value}`;
};


const defaultLayoutParsed = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING) as LayoutDefinition;

const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", /* "Flash" was removed */ "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

export interface LayoutElementGuiConfig {
  _uiId: string;
  fieldKey: string;
  label: string;
  originalType: TemplateFieldDefinition['type'];
  isEnabledOnCanvas: boolean;
  isExpandedInGui: boolean;

  elementType: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData';

  styleTop: string;
  styleLeft: string;
  styleRight?: string;
  styleBottom?: string;
  styleMaxHeight?: string;
  stylePadding?: string;
  styleFontStyle?: string;
  styleTextAlign?: string;
  styleBorderTop?: string; // Direct CSS border string
  styleBorderBottom?: string; // Direct CSS border string

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

  iconName?: string;
}

export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const { toast } = useToast();
  const { addTemplate, templates: existingTemplates, isLoading: templatesLoading } = useTemplates();
  const router = useRouter();

  // State for Canvas Setup GUI
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(COMMON_CARD_SIZES[0].value);
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(String(defaultLayoutParsed.width || `${DEFAULT_CANVAS_WIDTH}px`));
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(String(defaultLayoutParsed.height || `${DEFAULT_CANVAS_HEIGHT}px`));
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>(defaultLayoutParsed.backgroundColor || 'hsl(var(--card))');
  const [canvasBorderColor, setCanvasBorderColor] = useState<string>(defaultLayoutParsed.borderColor || 'hsl(var(--border))');
  const [canvasBorderRadius, setCanvasBorderRadius] = useState<string>(defaultLayoutParsed.borderRadius || 'calc(var(--radius) - 2px)');
  const [canvasBorderWidth, setCanvasBorderWidth] = useState<string>(defaultLayoutParsed.borderWidth || '1px');
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>(defaultLayoutParsed.borderStyle || "solid");

  // State for Layout Element GUI configurations
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  const guiBuilderLastUpdateRef = useRef<number>(0);
  // const jsonEditorLastUpdateRef = useRef<number>(0); // Not currently used for sync-back

  useEffect(() => {
    if (templateName.trim()) {
      const newId = toCamelCase(templateName.trim());
      setTemplateId(newId || 'untitledTemplate');
    } else {
      setTemplateId('');
    }
  }, [templateName]);

  // Initialize Canvas settings from default JSON string on mount for a new template
  useEffect(() => {
    console.log('[DEBUG] NewTemplatePage: Initializing canvas settings from DEFAULT_CARD_LAYOUT_JSON_STRING.');
    try {
      const parsedLayout = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);
      setCanvasWidthSetting(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`);
      setCanvasHeightSetting(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      setCanvasBackgroundColor(parsedLayout.backgroundColor || 'hsl(var(--card))');
      setCanvasBorderColor(parsedLayout.borderColor || 'hsl(var(--border))');
      setCanvasBorderRadius(parsedLayout.borderRadius || 'calc(var(--radius) - 2px)');
      setCanvasBorderWidth(parsedLayout.borderWidth || '1px');
      setCanvasBorderStyle(parsedLayout.borderStyle || 'solid');

      const matchingPreset = COMMON_CARD_SIZES.find(s => s.width === parsedLayout.width && s.height === parsedLayout.height);
      setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

    } catch (e) {
      console.error("Error parsing DEFAULT_CARD_LAYOUT_JSON_STRING for canvas settings:", e);
      // Fallback to hardcoded defaults if JSON parsing fails
      setCanvasWidthSetting(`${DEFAULT_CANVAS_WIDTH}px`);
      setCanvasHeightSetting(`${DEFAULT_CANVAS_HEIGHT}px`);
      setCanvasBackgroundColor('hsl(var(--card))');
      setCanvasBorderColor('hsl(var(--border))');
      setCanvasBorderRadius('calc(var(--radius) - 2px)');
      setCanvasBorderWidth('1px');
      setCanvasBorderStyle('solid');
      setSelectedSizePreset(COMMON_CARD_SIZES[0].value);
    }
  }, []);


  // Sync data fields to GUI config list
  useEffect(() => {
    console.log('[DEBUG] NewTemplatePage: Fields changed, syncing to layoutElementGuiConfigs. Fields count:', fields.length);
    setLayoutElementGuiConfigs(prevConfigs => {
      const existingConfigsByUiIdMap = new Map(prevConfigs.map(c => [c._uiId, c]));
      const newConfigs: LayoutElementGuiConfig[] = [];

      fields.forEach((field, index) => {
        let config = existingConfigsByUiIdMap.get(field._uiId!);
        const defaultTopValue = `${10 + (index % 8) * 25}px`; // Simple cascade for Y, reduced step

        if (config) {
          newConfigs.push({
            ...config,
            _uiId: field._uiId!,
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
          });
        } else {
          console.log('[DEBUG] NewTemplatePage: Adding new GUI config for field', field.label);
          newConfigs.push({
            _uiId: field._uiId || `gui-cfg-${field.key}-${Date.now()}-${index}`,
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
            isEnabledOnCanvas: false, // Default to not enabled on canvas for new templates
            isExpandedInGui: false,
            elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),

            styleTop: defaultTopValue,
            styleLeft: '10px',
            styleRight: '',
            styleBottom: '',
            styleMaxHeight: field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : 'auto'),
            stylePadding: '',
            styleFontStyle: 'normal',
            styleTextAlign: 'left',
            styleBorderTop: '',
            styleBorderBottom: '',

            tailwindTextColor: 'text-black',
            tailwindFontSize: 'text-base',
            tailwindFontWeight: 'font-normal',
            tailwindLineHeight: 'leading-normal',
            tailwindOverflow: 'overflow-visible',
            tailwindTextOverflow: NONE_VALUE,
            tailwindBorderRadius: NONE_VALUE,
            tailwindBorderColor: NONE_VALUE,
            tailwindBorderTopW: NONE_VALUE,
            tailwindBorderRightW: NONE_VALUE,
            tailwindBorderBottomW: NONE_VALUE,
            tailwindBorderLeftW: NONE_VALUE,

            iconName: field.type === 'number' ? 'Coins' : '',
          });
        }
      });
      const currentFieldUiIds = new Set(fields.map(f => f._uiId));
      return newConfigs.filter(nc => currentFieldUiIds.has(nc._uiId));
    });
  }, [fields]);


  // Effect to populate GUI Element controls from layoutDefinition string (for syncing from JSON editor to GUI)
  // This runs when activeEditorView changes or when layoutDefinition (the string) changes AND editor is 'gui'
  useEffect(() => {
    if (activeEditorView === 'json') {
      // If JSON editor is active, don't parse JSON back to GUI to avoid overwriting user's direct JSON edits.
      // GUI will update from JSON only when switching back to GUI mode.
      return;
    }

    // Only attempt to parse and update GUI if GUI is active, or to initialize GUI when it becomes active
    // This logic is now more focused on syncing when switching TO GUI mode or if layoutDefinition changes externally
    console.log('[DEBUG] NewTemplatePage: Syncing layoutDefinition string TO GUI elements (if GUI active or switching to it).');
    let parsedLayout: LayoutDefinition;
    try {
      parsedLayout = JSON.parse(layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING);
      setLayoutJsonError(null); // Clear error if parse is successful
    } catch (e) {
      console.warn("[DEBUG] NewTemplatePage: Error parsing layoutDefinition for GUI population, using defaults for elements.", e);
      setLayoutJsonError(`Invalid JSON in textarea: ${String(e).substring(0, 100)}`);
      parsedLayout = { ...JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING), elements: [] };
    }

    const elementsFromJson = Array.isArray(parsedLayout.elements) ? parsedLayout.elements : [];
    const elementsFromJsonMap = new Map(elementsFromJson.map(el => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(prevConfigs => {
      return prevConfigs.map((config, index) => {
        const existingJsonElement = elementsFromJsonMap.get(config.fieldKey);
        const defaultTopValue = `${10 + (index % 8) * 25}px`;

        if (existingJsonElement) {
          const style = existingJsonElement.style || {};
          const classes = (existingJsonElement.className || '').split(' ').filter(Boolean);

          return {
            ...config, // Preserve _uiId, fieldKey, label, originalType, isExpandedInGui
            isEnabledOnCanvas: true,
            elementType: existingJsonElement.type || (config.originalType === 'textarea' ? 'textarea' : (config.originalType === 'placeholderImage' ? 'image' : 'text')),
            iconName: existingJsonElement.icon || '',

            styleTop: String(style.top ?? ''),
            styleLeft: String(style.left ?? ''),
            styleRight: String(style.right ?? ''),
            styleBottom: String(style.bottom ?? ''),
            styleMaxHeight: String(style.maxHeight ?? (config.originalType === 'textarea' ? '80px' : 'auto')),
            stylePadding: String(style.padding ?? ''),
            styleFontStyle: String(style.fontStyle ?? 'normal'),
            styleTextAlign: String(style.textAlign ?? 'left'),
            styleBorderTop: String(style.borderTop ?? ''),
            styleBorderBottom: String(style.borderBottom ?? ''),

            tailwindTextColor: classes.find(c => TAILWIND_TEXT_COLORS.some(opt => opt.value === c)) || 'text-black',
            tailwindFontSize: classes.find(c => TAILWIND_FONT_SIZES.some(opt => opt.value === c)) || 'text-base',
            tailwindFontWeight: classes.find(c => TAILWIND_FONT_WEIGHTS.some(opt => opt.value === c)) || 'font-normal',
            tailwindLineHeight: classes.find(c => TAILWIND_LINE_HEIGHTS.some(opt => opt.value === c)) || 'leading-normal',
            tailwindOverflow: classes.find(c => TAILWIND_OVERFLOW.some(opt => opt.value === c)) || 'overflow-visible',
            tailwindTextOverflow: classes.find(c => TAILWIND_TEXT_OVERFLOW.some(opt => opt.value === c)) || NONE_VALUE,
            tailwindBorderRadius: classes.find(c => TAILWIND_BORDER_RADIUS_OPTIONS.some(opt => opt.value === c)) || NONE_VALUE,
            tailwindBorderColor: classes.find(c => TAILWIND_BORDER_COLOR_OPTIONS.some(opt => opt.value === c)) || NONE_VALUE,
            tailwindBorderTopW: BORDER_SIDE_WIDTH_OPTIONS.find(opt => getSideBorderWidthClass('t', opt.value) === classes.find(c => getSideBorderWidthClass('t', opt.value) === c && opt.value !== NONE_VALUE))?.value || NONE_VALUE,
            tailwindBorderRightW: BORDER_SIDE_WIDTH_OPTIONS.find(opt => getSideBorderWidthClass('r', opt.value) === classes.find(c => getSideBorderWidthClass('r', opt.value) === c && opt.value !== NONE_VALUE))?.value || NONE_VALUE,
            tailwindBorderBottomW: BORDER_SIDE_WIDTH_OPTIONS.find(opt => getSideBorderWidthClass('b', opt.value) === classes.find(c => getSideBorderWidthClass('b', opt.value) === c && opt.value !== NONE_VALUE))?.value || NONE_VALUE,
            tailwindBorderLeftW: BORDER_SIDE_WIDTH_OPTIONS.find(opt => getSideBorderWidthClass('l', opt.value) === classes.find(c => getSideBorderWidthClass('l', opt.value) === c && opt.value !== NONE_VALUE))?.value || NONE_VALUE,
          };
        } else {
          // Field exists in data fields, but not in JSON layout: reset its GUI config to defaults (disabled)
          return {
            ...config,
            isEnabledOnCanvas: false,
            // isExpandedInGui: false, // Keep current expansion state
            elementType: config.originalType === 'textarea' ? 'textarea' : (config.originalType === 'placeholderImage' ? 'image' : 'text'),
            styleTop: defaultTopValue, styleLeft: '10px', styleRight: '', styleBottom: '',
            styleMaxHeight: config.originalType === 'textarea' ? '80px' : (config.originalType === 'placeholderImage' ? '140px' : 'auto'),
            stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
            styleBorderTop: '', styleBorderBottom: '',
            tailwindTextColor: 'text-black', tailwindFontSize: 'text-base', tailwindFontWeight: 'font-normal',
            tailwindLineHeight: 'leading-normal', tailwindOverflow: 'overflow-visible', tailwindTextOverflow: NONE_VALUE,
            tailwindBorderRadius: NONE_VALUE, tailwindBorderColor: NONE_VALUE,
            tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE, tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
            iconName: '',
          };
        }
      });
    });
  }, [layoutDefinition, activeEditorView, fields]); // Runs when switching to GUI, or if JSON string changes while GUI is active


  // Debounced effect to generate JSON from GUI when GUI elements or canvas settings change (if in GUI mode)
  useEffect(() => {
    if (activeEditorView === 'gui') {
      if (guiBuilderLastUpdateRef.current) {
        clearTimeout(guiBuilderLastUpdateRef.current);
      }
      guiBuilderLastUpdateRef.current = window.setTimeout(() => {
        console.log('[DEBUG] NewTemplatePage: GUI state changed, auto-generating JSON for preview.');
        handleGenerateJsonFromBuilder(false); // Pass false to not show toast on auto-updates
      }, 500); // 500ms debounce
    }
    return () => {
      if (guiBuilderLastUpdateRef.current) {
        clearTimeout(guiBuilderLastUpdateRef.current);
      }
    };
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    canvasBackgroundColor, canvasBorderColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
    activeEditorView, // Ensure this effect is tied to the GUI view
    // handleGenerateJsonFromBuilder // Not needed as a dep here, will grab current version
  ]);


  // Generate sample card data for the live preview
  useEffect(() => {
    console.log('[DEBUG] NewTemplatePage: Generating sample card for preview.');
    const currentTemplateIdForPreview = templateId || 'previewTemplateId';
    const generatedSampleCard: Partial<CardData> & { [key: string]: any } = {
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
          case 'textarea': valueForPreview = `Sample content for ${fieldDef.label}.`; break;
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

    if (generatedSampleCard.name === undefined && !fields.some(f => f.key === 'name')) generatedSampleCard.name = templateName || 'Awesome Card Name';
    if (generatedSampleCard.cost === undefined && !fields.some(f => f.key === 'cost')) generatedSampleCard.cost = 3;
    if (generatedSampleCard.imageUrl === undefined && !fields.some(f => f.key === 'imageUrl')) {
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH, height: parseInt(canvasHeightSetting.replace('px','')) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art'});
    }
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';

    setSampleCardForPreview(generatedSampleCard as CardData);
    console.log('[DEBUG] NewTemplatePage: Sample card for preview updated.');
  }, [fields, templateId, templateName, canvasWidthSetting, canvasHeightSetting]); // Re-generate sample if fields or canvas size changes


  const templateForPreview = useMemo((): CardTemplate => {
    return {
      id: (templateId || 'previewTemplateId') as CardTemplateId,
      name: templateName || 'Preview Template Name',
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition,
    };
  }, [templateId, templateName, fields, layoutDefinition]);


  const handleAddField = useCallback(() => {
    console.log('[DEBUG] NewTemplatePage/handleAddField: Adding new field.');
    const newFieldBaseLabel = `New Field`;
    let newFieldLabel = `${newFieldBaseLabel} ${fields.length + 1}`;
    let counter = fields.length + 1;
    while(fields.some(f => f.label === newFieldLabel)) {
        counter++;
        newFieldLabel = `${newFieldBaseLabel} ${counter}`;
    }

    let baseKey = toCamelCase(newFieldLabel);
    if (!baseKey) {
        baseKey = `newField${fields.length + 1}`;
    }
    let newKey = baseKey;
    let keyCounter = 1;
    while (fields.some(f => f.key === newKey)) {
        newKey = `${baseKey}${keyCounter}`;
        keyCounter++;
    }
    const newUiId = `field-new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
        placeholderConfigWidth: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH,
        placeholderConfigHeight: 140,
      }
    ]);
  }, [fields, canvasWidthSetting]);

  const handleRemoveField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] NewTemplatePage/handleRemoveField: Removing field with _uiId', uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] NewTemplatePage/handleFieldChange: Updating field _uiId:', uiIdToUpdate, updatedFieldDefinition);
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
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth || parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH;
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

  const handleLayoutDefinitionChangeFromTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    console.log('[DEBUG] NewTemplatePage/handleLayoutDefinitionChangeFromTextarea: Layout string changed by user.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
    // jsonEditorLastUpdateRef.current = Date.now(); // Not currently used for sync-back
  };

  const validateAndFormatLayoutJson = useCallback(() => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      const formatted = JSON.stringify(parsed, null, 2);
      setLayoutDefinition(formatted);
      setLayoutJsonError(null);
      console.log('[DEBUG] NewTemplatePage/validateAndFormatLayoutJson: JSON is valid and formatted.');
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] NewTemplatePage/validateAndFormatLayoutJson: Invalid JSON', e.message);
      return false;
    }
  }, [layoutDefinition]);

  const handleGuiConfigChange = useCallback((targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => {
    console.log(`[DEBUG] NewTemplatePage/handleGuiConfigChange: fieldUiId: ${targetUiId}, prop: ${property}, value: ${String(value).substring(0,50)}`);
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config._uiId === targetUiId ? { ...config, [property]: value } : config
      )
    );
    // Debounced effect will handle JSON generation if in GUI mode
  }, []);

  const handleToggleGuiExpand = useCallback((targetUiId: string) => {
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config._uiId === targetUiId ? { ...config, isExpandedInGui: !config.isExpandedInGui } : config
      )
    );
  }, []);

  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true) => {
    console.log('[DEBUG] NewTemplatePage/handleGenerateJsonFromBuilder: Generating JSON from GUI controls.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements: LayoutElement[] = elementsToInclude.map(config => {
      const style: React.CSSProperties & { [key: string]: any } = { position: "absolute" }; // Ensure it can hold any CSS prop

      if (config.styleTop?.trim()) style.top = config.styleTop.trim().endsWith('px') || config.styleTop.trim().endsWith('%') ? config.styleTop.trim() : `${config.styleTop.trim()}px`;
      if (config.styleLeft?.trim()) style.left = config.styleLeft.trim().endsWith('px') || config.styleLeft.trim().endsWith('%') ? config.styleLeft.trim() : `${config.styleLeft.trim()}px`;
      if (config.styleRight?.trim()) style.right = config.styleRight.trim();
      if (config.styleBottom?.trim()) style.bottom = config.styleBottom.trim();
      if (config.styleMaxHeight?.trim()) style.maxHeight = config.styleMaxHeight.trim();
      if (config.stylePadding?.trim()) style.padding = config.stylePadding.trim();
      if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim();
      if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim();
      if (config.styleBorderTop?.trim()) style.borderTop = config.styleBorderTop.trim();
      if (config.styleBorderBottom?.trim()) style.borderBottom = config.styleBorderBottom.trim();

      const classNames = [];
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');

      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('text-black');

      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('text-base');

      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('font-normal');

      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      else if (config.elementType === 'text' || config.elementType === 'textarea') classNames.push('leading-normal');

      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      else if (config.elementType === 'text' || config.elementType === 'textarea') classNames.push('overflow-visible');

      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);

      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);

      const sideBorderClasses = [
        getSideBorderWidthClass('t', config.tailwindBorderTopW || NONE_VALUE),
        getSideBorderWidthClass('r', config.tailwindBorderRightW || NONE_VALUE),
        getSideBorderWidthClass('b', config.tailwindBorderBottomW || NONE_VALUE),
        getSideBorderWidthClass('l', config.tailwindBorderLeftW || NONE_VALUE),
      ].filter(Boolean);

      if (sideBorderClasses.length > 0) {
        classNames.push(...sideBorderClasses);
        if (config.tailwindBorderColor && config.tailwindBorderColor !== NONE_VALUE) {
          classNames.push(config.tailwindBorderColor);
        } else {
          classNames.push('border-border'); // Default border color
        }
      }

      const element: LayoutElement = {
        fieldKey: config.fieldKey,
        type: config.elementType,
      };
      if (Object.keys(style).length > 0) element.style = style;
      const finalClassName = classNames.filter(Boolean).join(' ').trim();
      if (finalClassName) element.className = finalClassName;
      if (config.elementType === 'iconValue' && config.iconName?.trim()) {
        element.icon = config.iconName.trim();
      }
      return element;
    });

    const newLayout: LayoutDefinition = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: canvasBackgroundColor || undefined,
      borderColor: canvasBorderColor || undefined,
      borderRadius: canvasBorderRadius || undefined,
      borderWidth: canvasBorderWidth || undefined,
      borderStyle: canvasBorderStyle || undefined,
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    setLayoutJsonError(null);
    guiBuilderLastUpdateRef.current = Date.now();
    if (showSuccessToast) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in textarea and preview."});
    }
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    canvasBackgroundColor, canvasBorderColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
    toast
  ]);


  const handleSaveTemplate = async () => {
    console.log('[DEBUG] NewTemplatePage/handleSaveTemplate: Attempting to save.');
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
            duration: 7000,
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
            duration: 7000,
        });
        return;
    }

    let finalLayoutDefToSave = layoutDefinition.trim();
    if (!finalLayoutDefToSave) {
       finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else {
      try {
        JSON.parse(finalLayoutDefToSave);
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        toast({
          title: "Invalid Layout JSON",
          description: `The JSON in 'Layout Definition' is invalid. Error: ${e.message}. Please correct it.`,
          variant: "destructive",
          duration: 7000,
        });
        setActiveEditorView('json');
        return;
      }
    }

    setIsSaving(true);
    const newTemplate: CardTemplate = {
      id: finalTemplateId as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };
    console.log('[DEBUG] NewTemplatePage/handleSaveTemplate: Calling context.addTemplate with:', newTemplate);
    const result = await addTemplate(newTemplate);

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

  const handleSizePresetChange = (value: string) => {
    setSelectedSizePreset(value);
    if (value === "custom") {
      // No change if custom, user will edit inputs
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
      default: console.warn("Unhandled canvas direct CSS property change:", prop);
    }
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

  if (templatesLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading template context...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
         <CardHeader>
           <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center">
            <div>
                <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
                <CardDescription className="text-md pt-1">
                    Define the data structure and visual layout for a new card template.
                </CardDescription>
            </div>
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
                    onClick={() => handleGenerateJsonFromBuilder()}
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
           <CardDescription className="pt-2 text-muted-foreground">
             Template ID will be auto-generated from the name (e.g., "Hero Card" becomes "heroCard"). Field Keys are auto-generated from Field Labels.
           </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
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
            <h3 className="text-lg font-semibold mb-3">Data Fields</h3>
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
              className="mt-4"
              title={"Add a new data field"}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="md:flex md:flex-row md:gap-6 items-start">
        <Card className="md:w-[65%] flex flex-col shadow-md mb-6 md:mb-0">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Visual Layout Builder &amp; JSON Output</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="editor-view-toggle" className="text-xs text-muted-foreground">
                        {activeEditorView === 'gui' ? 'GUI Builder' : 'JSON Editor'}
                    </Label>
                    <Switch
                        id="editor-view-toggle"
                        checked={activeEditorView === 'gui'}
                        onCheckedChange={(checked) => setActiveEditorView(checked ? 'gui' : 'json')}
                        aria-label="Toggle editor view"
                    />
                </div>
            </div>
             <CardDescription className="text-sm">
              {activeEditorView === 'gui'
                ? "Use the GUI below to configure card canvas properties and individual layout elements. The JSON output and preview update automatically."
                : "Directly edit the Layout Definition JSON. Changes here will update the preview. GUI controls will update if you switch back."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col min-h-0">
            {activeEditorView === 'gui' && (
              <>
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <h4 className="text-base font-semibold mb-2">Card Canvas Setup</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                    <div>
                      <Label htmlFor="canvasSizePreset" className="text-xs font-medium">Canvas Size Preset</Label>
                      <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving}>
                        <SelectTrigger id="canvasSizePreset" className="mt-1 h-8 text-xs"><SelectValue placeholder="Select size preset" /></SelectTrigger>
                        <SelectContent>{COMMON_CARD_SIZES.map(size => (<SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    {selectedSizePreset === 'custom' ? ( <>
                        <div><Label htmlFor="canvasWidth" className="text-xs font-medium">Custom Width (CSS)</Label><Input id="canvasWidth" value={canvasWidthSetting} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs"/></div>
                        <div><Label htmlFor="canvasHeight" className="text-xs font-medium">Custom Height (CSS)</Label><Input id="canvasHeight" value={canvasHeightSetting} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs"/></div>
                    </> ) : COMMON_CARD_SIZES.find(s=>s.value === selectedSizePreset) && (
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
                              <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId)} className="h-7 w-7 text-muted-foreground" disabled={!config.isEnabledOnCanvas}>
                                {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </div>
                            {config.isExpandedInGui && config.isEnabledOnCanvas && (
                              <div className="mt-3 pt-3 border-t border-dashed space-y-4">

                                <details className="space-y-2 group" open>
                                  <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5"><Settings className="h-3 w-3 mr-1"/> Element Type & Icon Name <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" /></summary>
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
                                          <AccordionItem value={`icon-browser-inline-${config._uiId}`} className="border-b-0">
                                            <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5"><Copy className="mr-1 h-3 w-3" /> Browse Icons</AccordionTrigger>
                                            <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                                <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                                <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                                                  <div className={cn("grid gap-0.5", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                                                    {commonLucideIconsForGuide.map(iconKey => (<TooltipProvider key={`${iconKey}-new-${config._uiId}`} delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey as string)} className="h-7 w-7 p-1" ><IconComponent name={iconKey as string} className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent></Tooltip></TooltipProvider>))}
                                                  </div>
                                                </ScrollArea>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </div>
                                    )}
                                  </div>
                                </details>

                                <details className="space-y-2 group" open>
                                  <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5"><Settings className="h-3 w-3 mr-1"/> Position & Sizing <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" /></summary>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                      {['styleTop', 'styleLeft', 'styleRight', 'styleBottom'].map(prop => (<div key={prop}><Label htmlFor={`el-${prop}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS)</Label><Input id={`el-${prop}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId, prop as keyof LayoutElementGuiConfig, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px" disabled={isSaving}/></div>))}
                                      <div><Label htmlFor={`el-styleMaxHeight-${config._uiId}`} className="text-xs">Max Height (CSS)</Label><Input id={`el-styleMaxHeight-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px" disabled={isSaving}/></div>
                                      <div><Label htmlFor={`el-stylePadding-${config._uiId}`} className="text-xs">Padding (CSS)</Label><Input id={`el-stylePadding-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px" disabled={isSaving}/></div>
                                  </div>
                                </details>

                                {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                                  <details className="space-y-2 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5"><Settings className="h-3 w-3 mr-1"/> Typography <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" /></summary>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                      <div><Label htmlFor={`el-twTextColor-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label><Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextColor', value)} disabled={isSaving}><SelectTrigger id={`el-twTextColor-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger><SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-twFontSize-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label><Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontSize', value)} disabled={isSaving}><SelectTrigger id={`el-twFontSize-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger><SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-twFontWeight-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label><Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontWeight', value)} disabled={isSaving}><SelectTrigger id={`el-twFontWeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger><SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-twLineHeight-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label><Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindLineHeight', value)} disabled={isSaving}><SelectTrigger id={`el-twLineHeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select line height" /></SelectTrigger><SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-styleFontStyle-${config._uiId}`} className="text-xs">Font Style (CSS)</Label><Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleFontStyle', value)} disabled={isSaving}><SelectTrigger id={`el-styleFontStyle-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent></Select></div>
                                      <div><Label htmlFor={`el-styleTextAlign-${config._uiId}`} className="text-xs">Text Align (CSS)</Label><Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleTextAlign', value)} disabled={isSaving}><SelectTrigger id={`el-styleTextAlign-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem></SelectContent></Select></div>
                                    </div>
                                  </details>
                                )}

                                {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                    <details className="space-y-2 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5"><Settings className="h-3 w-3 mr-1"/> Overflow & Display (Text - Tailwind) <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" /></summary>
                                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                      <div><Label htmlFor={`el-twOverflow-${config._uiId}`} className="text-xs">Overflow</Label><Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindOverflow', value)} disabled={isSaving}><SelectTrigger id={`el-twOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select overflow" /></SelectTrigger><SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-twTextOverflow-${config._uiId}`} className="text-xs">Text Overflow</Label><Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextOverflow', value)} disabled={isSaving}><SelectTrigger id={`el-twTextOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select text overflow" /></SelectTrigger><SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                    </details>
                                )}

                                <details className="space-y-2 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5"><Settings className="h-3 w-3 mr-1"/> Borders <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" /></summary>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                                    <div><Label htmlFor={`el-twBorderRadius-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label><Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderRadius', value)} disabled={isSaving}><SelectTrigger id={`el-twBorderRadius-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twBorderColor-${config._uiId}`} className="text-xs">Border Color (Tailwind)</Label><Select value={config.tailwindBorderColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderColor', value)} disabled={isSaving}><SelectTrigger id={`el-twBorderColor-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_BORDER_COLOR_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-1 mt-2">
                                      {(['t', 'r', 'b', 'l'] as const).map(side => { const propKey = `tailwindBorder${side.toUpperCase()}W` as keyof LayoutElementGuiConfig; return (<div key={side}><Label htmlFor={`el-twBorder${side}W-${config._uiId}`} className="text-xs capitalize">Border {side === 't' ? 'Top' : side === 'r' ? 'Right' : side === 'b' ? 'Bottom' : 'Left'} W</Label><Select value={(config as any)[propKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, propKey, value)} disabled={isSaving}><SelectTrigger id={`el-twBorder${side}W-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select></div>); })}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1 mt-2">
                                      <div><Label htmlFor={`el-styleBorderTop-${config._uiId}`} className="text-xs">Border Top (CSS value)</Label><Input id={`el-styleBorderTop-${config._uiId}`} value={config.styleBorderTop || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleBorderTop', e.target.value)} placeholder="e.g., 1px solid #ccc" className="h-8 text-xs mt-0.5" disabled={isSaving}/></div>
                                      <div><Label htmlFor={`el-styleBorderBottom-${config._uiId}`} className="text-xs">Border Bottom (CSS value)</Label><Input id={`el-styleBorderBottom-${config._uiId}`} value={config.styleBorderBottom || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleBorderBottom', e.target.value)} placeholder="e.g., 1px solid #ccc" className="h-8 text-xs mt-0.5" disabled={isSaving}/></div>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                        {layoutElementGuiConfigs.length === 0 && fields.length > 0 && ( <p className="text-xs text-muted-foreground text-center py-2">No data fields are currently enabled for the layout. Toggle a field above to configure it.</p> )}
                        {fields.length === 0 && ( <p className="text-xs text-muted-foreground text-center py-2">Add data fields to the template first to configure their layout.</p> )}
                      </div>
                  </ScrollArea>
                </div>
              </>
            )}
            {activeEditorView === 'json' && (
              <div className="mt-4 flex-grow flex flex-col min-h-0">
                  <div>
                    <Label htmlFor="layoutDefinition" className="text-sm font-medium">Layout Definition JSON (Manual Edit)</Label>
                    <Textarea
                      id="layoutDefinition"
                      value={layoutDefinition}
                      onChange={handleLayoutDefinitionChangeFromTextarea}
                      onBlur={validateAndFormatLayoutJson}
                      placeholder="Click 'Generate/Update JSON from Builder' above, or paste/edit your JSON here."
                      rows={15}
                      className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                      disabled={isSaving}
                    />
                  </div>
                  {layoutJsonError && ( <Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4 !text-destructive-foreground" /><AlertTitle>JSON Error</AlertTitle><AlertDescription className="text-xs">{layoutJsonError}</AlertDescription></Alert> )}
              </div>
            )}
            <Accordion type="single" collapsible className="w-full mt-2" defaultValue={""}>
              <AccordionItem value="lucide-icon-explorer-main" className="border-b-0">
                <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3.5 py-1.5">
                  <Copy className="mr-1.5 h-3 w-3" /> Browse Lucide Icons
                </AccordionTrigger>
                <AccordionContent className="text-xs p-2 border rounded-md bg-muted/30">
                  <p className="text-xs font-semibold mb-1.5 text-foreground">Click icon to Copy Name:</p>
                  <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                    <div className={cn("grid gap-1", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                      {commonLucideIconsForGuide.map(iconKey => (
                        <TooltipProvider key={`${iconKey}-new-main`} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey as string)} className="h-7 w-7 p-1" >
                                <IconComponent name={iconKey as string} className="h-4 w-4" />
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
          </CardContent>
        </Card>

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
              This preview updates as you interact with the {activeEditorView === 'gui' ? 'GUI builder' : 'JSON editor'}.
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
