// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, ArrowLeft, Eye, HelpCircle, Palette, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates, type CardTemplateId as ContextCardTemplateId } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CardTemplateId = ContextCardTemplateId;

interface LayoutElementGuiConfig {
  _uiId: string;
  fieldKey: string;
  label: string;
  originalType: TemplateFieldDefinition['type'];
  isEnabledOnCanvas: boolean;
  isExpandedInGui: boolean;

  elementType: 'text' | 'textarea' | 'image' | 'iconValue' | 'iconFromData';
  styleTop: string;
  styleLeft: string;
  styleWidth: string;
  styleHeight: string;
  iconName?: string;
  
  styleRight?: string;
  // styleFontSize?: string; // Replaced by Tailwind
  // styleFontWeight?: string; // Replaced by Tailwind
  // styleLineHeight?: string; // Replaced by Tailwind
  styleMaxHeight?: string;
  // styleOverflow?: string; // Replaced by Tailwind
  // styleTextOverflow?: string; // Replaced by Tailwind
  styleFontStyle?: string;
  styleTextAlign?: string;
  stylePadding?: string;
  styleBorderTop?: string;
  styleBorderBottom?: string;

  tailwindTextColor?: string;
  tailwindFontSize?: string;
  tailwindFontWeight?: string;
  tailwindLineHeight?: string;
  tailwindOverflow?: string;
  tailwindTextOverflow?: string;
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

const TAILWIND_TEXT_COLORS = [
    { value: "text-card-foreground", label: "Default (Card FG)" }, { value: "text-primary", label: "Primary" },
    { value: "text-secondary", label: "Secondary" }, { value: "text-muted-foreground", label: "Muted" },
    { value: "text-destructive", label: "Destructive" }, { value: "text-white", label: "White" }, { value: "text-black", label: "Black" },
    { value: "text-slate-500", label: "Slate 500" }, { value: "text-red-500", label: "Red 500" },
    { value: "text-orange-500", label: "Orange 500" }, { value: "text-amber-500", label: "Amber 500" },
    { value: "text-yellow-500", label: "Yellow 500" }, { value: "text-lime-500", label: "Lime 500" },
    { value: "text-green-500", label: "Green 500" }, { value: "text-emerald-500", label: "Emerald 500" },
    { value: "text-teal-500", label: "Teal 500" }, { value: "text-cyan-500", label: "Cyan 500" },
    { value: "text-sky-500", label: "Sky 500" }, { value: "text-blue-500", label: "Blue 500" },
    { value: "text-indigo-500", label: "Indigo 500" }, { value: "text-violet-500", label: "Violet 500" },
    { value: "text-purple-500", label: "Purple 500" }, { value: "text-fuchsia-500", label: "Fuchsia 500" },
    { value: "text-pink-500", label: "Pink 500" }, { value: "text-rose-500", label: "Rose 500" },
    { value: NONE_VALUE, label: "None (Inherit)" },
];
const TAILWIND_FONT_SIZES = [
    { value: "text-xs", label: "XS" }, { value: "text-sm", label: "Small" }, { value: "text-base", label: "Base" },
    { value: "text-lg", label: "Large" }, { value: "text-xl", label: "XL" }, { value: "text-2xl", label: "2XL" },
    { value: "text-3xl", label: "3XL" }, { value: "text-4xl", label: "4XL" }, { value: NONE_VALUE, label: "None" },
];
const TAILWIND_FONT_WEIGHTS = [
    { value: "font-thin", label: "Thin (100)" }, { value: "font-extralight", label: "Extra Light (200)" },
    { value: "font-light", label: "Light (300)" }, { value: "font-normal", label: "Normal (400)" },
    { value: "font-medium", label: "Medium (500)" }, { value: "font-semibold", label: "Semi-Bold (600)" },
    { value: "font-bold", label: "Bold (700)" }, { value: "font-extrabold", label: "Extra Bold (800)" },
    { value: "font-black", label: "Black (900)" }, { value: NONE_VALUE, label: "None" },
];
const TAILWIND_LINE_HEIGHTS = [
    { value: "leading-3", label: "0.75rem (12px)" }, { value: "leading-4", label: "1rem (16px)" },
    { value: "leading-5", label: "1.25rem (20px)" }, { value: "leading-6", label: "1.5rem (24px)" },
    { value: "leading-7", label: "1.75rem (28px)" }, { value: "leading-8", label: "2rem (32px)" },
    { value: "leading-9", label: "2.25rem (36px)" }, { value: "leading-10", label: "2.5rem (40px)" },
    { value: "leading-none", label: "None (1)" }, { value: "leading-tight", label: "Tight (1.25)" },
    { value: "leading-snug", label: "Snug (1.375)" }, { value: "leading-normal", label: "Normal (1.5)" },
    { value: "leading-relaxed", label: "Relaxed (1.625)" }, { value: "leading-loose", label: "Loose (2)" },
    { value: NONE_VALUE, label: "None (Rely on CSS)" },
];
const TAILWIND_OVERFLOW = [
    { value: "overflow-auto", label: "Auto" }, { value: "overflow-hidden", label: "Hidden" },
    { value: "overflow-clip", label: "Clip" }, { value: "overflow-visible", label: "Visible" },
    { value: "overflow-scroll", label: "Scroll" }, { value: NONE_VALUE, label: "None (Default)" },
];
const TAILWIND_TEXT_OVERFLOW = [
    { value: "truncate", label: "Truncate (Ellipsis + Hidden)" }, { value: "text-ellipsis", label: "Ellipsis" },
    { value: "text-clip", label: "Clip" }, { value: NONE_VALUE, label: "None (Default)" },
];


function mapTemplateFieldToFieldDefinition(field: TemplateField, index: number): TemplateFieldDefinition {
    // console.log('[DEBUG] EditTemplatePage/mapTemplateFieldToFieldDefinition: Mapping field', field);
    const definition: TemplateFieldDefinition = {
        _uiId: `loaded-field-${field.key}-${index}-${Date.now()}`, // Ensure stable UI ID for loaded fields
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue,
        previewValue: typeof field.defaultValue === 'string' ? field.defaultValue : (field.defaultValue !== undefined ? String(field.defaultValue) : undefined),
        placeholderConfigWidth: field.placeholderConfigWidth,
        placeholderConfigHeight: field.placeholderConfigHeight,
        placeholderConfigBgColor: field.placeholderConfigBgColor,
        placeholderConfigTextColor: field.placeholderConfigTextColor,
        placeholderConfigText: field.placeholderConfigText,
    };
    if (field.type === 'select' && field.options) {
        definition.optionsString = field.options.map(opt => `${opt.value}:${opt.label}`).join(',');
    }
    return definition;
}

function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
    // console.log('[DEBUG] EditTemplatePage/mapFieldDefinitionToTemplateField: Mapping def', def);
    const field: TemplateField = {
        key: def.key,
        label: def.label,
        type: def.type,
        placeholderConfigWidth: def.placeholderConfigWidth,
        placeholderConfigHeight: def.placeholderConfigHeight,
        placeholderConfigBgColor: def.placeholderConfigBgColor,
        placeholderConfigTextColor: def.placeholderConfigTextColor,
        placeholderConfigText: def.placeholderConfigText,
    };
    if (def.placeholder) field.placeholder = def.placeholder;
    if (def.defaultValue !== undefined && def.defaultValue !== '') {
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
    return field;
}

const toCamelCase = (str: string): string => {
  if (!str) return '';
  const cleaned = str
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, ' ');
  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'untitledField';
  let result = [words[0].toLowerCase(), ...words.slice(1).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )].join('');
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
  const {
    width = 100,
    height = 100,
    bgColor: rawBgColor,
    textColor: rawTextColor,
    text: rawText,
  } = config;

  let path = `${width}x${height}`;
  const bgColor = rawBgColor?.replace('#', '').trim();
  const textColor = rawTextColor?.replace('#', '').trim();

  if (bgColor) {
    path += `/${bgColor}`;
    if (textColor) {
      path += `/${textColor}`;
    }
  }
  path += `.png`;

  let fullUrl = `https://placehold.co/${path}`;
  const text = rawText?.trim();
  if (text) {
    fullUrl += `?text=${encodeURIComponent(text)}`;
  }
  return fullUrl;
}

const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", /* "Flash" removed */ "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
   if (!Icon) { 
    console.warn(`[EditTemplatePage] Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} />;
  }
  return <Icon {...props} />;
};

export default function EditTemplatePage() {
  // console.log('[DEBUG] EditTemplatePage: Component rendering/re-rendering.');
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getTemplateById, updateTemplate, isLoading: templatesLoading } = useTemplates();

  const templateIdToEdit = typeof params.templateId === 'string' ? params.templateId as CardTemplateId : undefined;

  const [originalTemplateId, setOriginalTemplateId] = useState<CardTemplateId | undefined>(templateIdToEdit);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);

  const [layoutDefinition, setLayoutDefinition] = useState<string>('');
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);

  const [selectedSizePreset, setSelectedSizePreset] = useState<string>("custom");
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);


  useEffect(() => {
    if (templatesLoading || !templateIdToEdit) {
      setIsLoadingPage(templatesLoading);
      return;
    }
    console.log('[DEBUG] EditTemplatePage: Loading template for editing. ID:', templateIdToEdit);
    const templateToEdit = getTemplateById(templateIdToEdit);
    if (templateToEdit) {
      // console.log('[DEBUG] EditTemplatePage: Template found.', templateToEdit);
      setOriginalTemplateId(templateToEdit.id as CardTemplateId);
      setTemplateName(templateToEdit.name);
      const initialFields = templateToEdit.fields.map((field, index) => mapTemplateFieldToFieldDefinition(field, index));
      setFields(initialFields);

      const initialLayoutDef = templateToEdit.layoutDefinition?.trim() ? templateToEdit.layoutDefinition : DEFAULT_CARD_LAYOUT_JSON_STRING;
      setLayoutDefinition(initialLayoutDef);

      try {
        const parsedLayout = JSON.parse(initialLayoutDef || '{}');
        const layoutElements = Array.isArray(parsedLayout.elements) ? parsedLayout.elements : [];

        const loadedWidth = parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`;
        const loadedHeight = parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`;
        setCanvasWidthSetting(loadedWidth);
        setCanvasHeightSetting(loadedHeight);

        const matchingPreset = COMMON_CARD_SIZES.find(
          s => s.width === loadedWidth && s.height === loadedHeight
        );
        setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
          const existingLayoutElement = layoutElements.find((el: any) => el.fieldKey === field.key);
          const yOffset = 10 + (index % 8) * 35; 
          const xOffset = 10;

          const config: LayoutElementGuiConfig = {
            _uiId: field._uiId || `gui-cfg-edit-${field.key}-${Date.now()}-${index}`,
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
            isEnabledOnCanvas: !!existingLayoutElement,
            isExpandedInGui: false,
            elementType: existingLayoutElement?.type || (field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text')),
            styleTop: existingLayoutElement?.style?.top || `${yOffset}px`,
            styleLeft: existingLayoutElement?.style?.left || `${xOffset}px`,
            styleWidth: existingLayoutElement?.style?.width || '120px',
            styleHeight: existingLayoutElement?.style?.height || (field.type === 'textarea' ? '60px' : (field.type === 'placeholderImage' ? '140px' : '20px')),
            iconName: existingLayoutElement?.icon || (field.type === 'number' ? 'Coins' : ''),
            
            styleRight: existingLayoutElement?.style?.right || '',
            // styleFontSize: existingLayoutElement?.style?.fontSize || '12px', // Replaced by Tailwind
            // styleFontWeight: existingLayoutElement?.style?.fontWeight || 'normal', // Replaced by Tailwind
            // styleLineHeight: existingLayoutElement?.style?.lineHeight || '', // Replaced by Tailwind
            styleMaxHeight: existingLayoutElement?.style?.maxHeight || '',
            // styleOverflow: existingLayoutElement?.style?.overflow || '', // Replaced by Tailwind
            // styleTextOverflow: existingLayoutElement?.style?.textOverflow || '', // Replaced by Tailwind
            styleFontStyle: existingLayoutElement?.style?.fontStyle || 'normal',
            styleTextAlign: existingLayoutElement?.style?.textAlign || 'left',
            stylePadding: existingLayoutElement?.style?.padding || '',
            styleBorderTop: existingLayoutElement?.style?.borderTop || '',
            styleBorderBottom: existingLayoutElement?.style?.borderBottom || '',
            
            tailwindTextColor: 'text-card-foreground',
            tailwindFontSize: 'text-base',
            tailwindFontWeight: 'font-normal',
            tailwindLineHeight: 'leading-normal',
            tailwindOverflow: 'overflow-visible',
            tailwindTextOverflow: NONE_VALUE,
          };

          if (existingLayoutElement?.className) {
            const classes = String(existingLayoutElement.className).split(' ');
            const twColor = classes.find(c => TAILWIND_TEXT_COLORS.some(tc => tc.value === c && c !== '' && tc.value !== NONE_VALUE));
            const twSize = classes.find(c => TAILWIND_FONT_SIZES.some(ts => ts.value === c && c !== '' && ts.value !== NONE_VALUE));
            const twWeight = classes.find(c => TAILWIND_FONT_WEIGHTS.some(tw => tw.value === c && c !== '' && tw.value !== NONE_VALUE));
            const twLeading = classes.find(c => TAILWIND_LINE_HEIGHTS.some(tl => tl.value === c && c !== '' && tl.value !== NONE_VALUE));
            const twOverflow = classes.find(c => TAILWIND_OVERFLOW.some(to => to.value === c && c !== '' && to.value !== NONE_VALUE));
            const twTextOverflow = classes.find(c => TAILWIND_TEXT_OVERFLOW.some(tto => tto.value === c && c !== '' && tto.value !== NONE_VALUE));
            
            if (twColor) config.tailwindTextColor = twColor;
            if (twSize) config.tailwindFontSize = twSize;
            if (twWeight) config.tailwindFontWeight = twWeight;
            if (twLeading) config.tailwindLineHeight = twLeading;
            if (twOverflow) config.tailwindOverflow = twOverflow;
            if (twTextOverflow) config.tailwindTextOverflow = twTextOverflow;
          }
          return config;
        }));

      } catch (e) {
        console.warn("[DEBUG] EditTemplatePage: Could not parse initial layout definition for GUI config:", e);
        setSelectedSizePreset(`${DEFAULT_CANVAS_WIDTH}x${DEFAULT_CANVAS_HEIGHT}`);
        setCanvasWidthSetting(`${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(`${DEFAULT_CANVAS_HEIGHT}px`);
        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
            const yOffset = 10 + (index % 8) * 35;
            const xOffset = 10;
            return {
                _uiId: field._uiId || `gui-cfg-edit-fallback-${field.key}-${Date.now()}-${index}`,
                fieldKey: field.key,
                label: field.label,
                originalType: field.type,
                isEnabledOnCanvas: true,
                isExpandedInGui: false,
                elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
                styleTop: `${yOffset}px`,
                styleLeft: `${xOffset}px`,
                styleWidth: '120px',
                styleHeight: field.type === 'textarea' ? '60px' : (field.type === 'placeholderImage' ? '140px' : '20px'),
                iconName: field.type === 'number' ? 'Coins' : '',
                styleRight: '', 
                // styleFontSize: '12px', styleFontWeight: 'normal', styleLineHeight: '', 
                styleMaxHeight: '', 
                // styleOverflow: '', styleTextOverflow: '',
                styleFontStyle: 'normal', styleTextAlign: 'left', stylePadding: '', styleBorderTop: '', styleBorderBottom: '',
                tailwindTextColor: 'text-card-foreground', tailwindFontSize: 'text-base', tailwindFontWeight: 'font-normal',
                tailwindLineHeight: 'leading-normal', tailwindOverflow: 'overflow-visible', tailwindTextOverflow: NONE_VALUE,
            };
        }));
      }
      setErrorLoading(null);
    } else {
      console.warn('[DEBUG] EditTemplatePage: Template not found for editing. ID:', templateIdToEdit);
      setErrorLoading(`Template with ID "${templateIdToEdit}" not found.`);
    }
    setIsLoadingPage(false);
  }, [templateIdToEdit, getTemplateById, templatesLoading]);

  useEffect(() => {
    // console.log('[DEBUG] EditTemplatePage: Syncing fields to layoutElementGuiConfigs. Fields count:', fields.length);
    setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigs = fields.map((field, index) => {
        const existingConfig = prevConfigs.find(c => c.fieldKey === field.key);
        if (existingConfig) {
            return {
                ...existingConfig,
                label: field.label, // Keep label in sync
                originalType: field.type // Keep original type in sync
            };
        }
        // Field was added, create a new GUI config for it
        const yOffset = 10 + (index % 8) * 35;
        const xOffset = 10;
        return {
          _uiId: field._uiId || `gui-cfg-edit-sync-${field.key}-${Date.now()}-${index}`,
          fieldKey: field.key,
          label: field.label,
          originalType: field.type,
          isEnabledOnCanvas: true,
          isExpandedInGui: false,
          elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
          styleTop: `${yOffset}px`,
          styleLeft: `${xOffset}px`,
          styleWidth: '120px',
          styleHeight: field.type === 'textarea' ? '60px' : (field.type === 'placeholderImage' ? '140px' : '20px'),
          iconName: field.type === 'number' ? 'Coins' : '',
          styleRight: '', 
          // styleFontSize: '12px', styleFontWeight: 'normal', styleLineHeight: '', 
          styleMaxHeight: '', 
          // styleOverflow: '', styleTextOverflow: '',
          styleFontStyle: 'normal', styleTextAlign: 'left', stylePadding: '', styleBorderTop: '', styleBorderBottom: '',
          tailwindTextColor: 'text-card-foreground', tailwindFontSize: 'text-base', tailwindFontWeight: 'font-normal',
          tailwindLineHeight: 'leading-normal', tailwindOverflow: 'overflow-visible', tailwindTextOverflow: NONE_VALUE,
        };
      });
      // Filter out GUI configs for fields that no longer exist
      return newConfigs.filter(nc => fields.some(f => f.key === nc.fieldKey));
    });
  }, [fields]);


  useEffect(() => {
    // console.log('[DEBUG] EditTemplatePage: Generating sampleCardForPreview. Fields count:', fields.length, 'Original ID:', originalTemplateId);
    const currentTemplateIdForPreview = originalTemplateId || 'previewTemplateId';
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
          case 'textarea': valueForPreview = `Sample content for ${fieldDef.label}.`; break;
          case 'number': valueForPreview = 0; break;
          case 'boolean': valueForPreview = false; break;
          case 'select':
            const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
            valueForPreview = firstOptionValue || `Option`;
            break;
          default: valueForPreview = `Sample ${fieldDef.label}`;
        }
      }
      (generatedSampleCard as any)[key] = valueForPreview;
    });
    if (generatedSampleCard.name === undefined && !fields.some(f => f.key === 'name')) generatedSampleCard.name = 'Awesome Card Name';
    if (generatedSampleCard.cost === undefined && !fields.some(f => f.key === 'cost')) generatedSampleCard.cost = 3;
    if (generatedSampleCard.imageUrl === undefined && !fields.some(f => f.key === 'imageUrl')) {
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH, height: parseInt(canvasHeightSetting) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art'});
    }
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';
    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, originalTemplateId, templateName, canvasWidthSetting, canvasHeightSetting]);

  const templateForPreview = useMemo((): CardTemplate => ({
    id: (originalTemplateId || 'previewTemplateId') as CardTemplateId,
    name: templateName || 'Preview Template Name',
    fields: fields.map(mapFieldDefinitionToTemplateField),
    layoutDefinition: layoutDefinition,
  }), [originalTemplateId, templateName, fields, layoutDefinition]);

  const handleAddField = () => {
    console.log('[DEBUG] EditTemplatePage/handleAddField: Adding new field.');
    const newFieldBaseLabel = `New Field`;
    let newFieldLabel = `${newFieldBaseLabel} ${fields.length + 1}`;
    let counter = fields.length + 1;
    while(fields.some(f => f.label === newFieldLabel)) {
        counter++;
        newFieldLabel = `${newFieldBaseLabel} ${counter}`;
    }
    let baseKey = toCamelCase(newFieldLabel);
    if (!baseKey) baseKey = `newField`;
    let newKey = baseKey;
    let keyCounter = 1;
    while (fields.some(f => f.key === newKey)) {
        newKey = `${baseKey}${keyCounter}`;
        keyCounter++;
    }
    setFields([
      ...fields,
      {
        _uiId: `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        key: newKey,
        label: newFieldLabel,
        type: 'text',
        placeholder: '',
        defaultValue: '',
        previewValue: '',
        optionsString: '',
        placeholderConfigWidth: parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH,
        placeholderConfigHeight: 140,
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    console.log('[DEBUG] EditTemplatePage/handleRemoveField: Removing field at index', index);
    const fieldToRemove = fields[index];
    setFields(fields.filter((_, i) => i !== index));
    // Also remove from GUI configs
    setLayoutElementGuiConfigs(prev => prev.filter(c => c.fieldKey !== fieldToRemove.key));
  };

  const handleFieldChange = (index: number, updatedFieldDefinition: TemplateFieldDefinition) => {
    // console.log('[DEBUG] EditTemplatePage/handleFieldChange: Updating field at index', index, updatedFieldDefinition);
    const newFields = [...fields];
    const oldField = newFields[index];
    const oldFieldKey = oldField.key;
    let modifiedField = { ...oldField, ...updatedFieldDefinition };
    if (updatedFieldDefinition.label !== undefined && updatedFieldDefinition.label !== oldField.label) {
        if (oldField.key === toCamelCase(oldField.label) || oldField.key.startsWith(toCamelCase(oldField.label).replace(/[\d]+$/, ''))) {
            let baseKey = toCamelCase(updatedFieldDefinition.label);
            if (!baseKey) {
                const prefix = 'field';
                let fallbackCounter = 1;
                let potentialKey = `${prefix}${fallbackCounter}`;
                while(newFields.some((f,i) => i !== index && f.key === potentialKey)) {
                    fallbackCounter++;
                    potentialKey = `${prefix}${fallbackCounter}`;
                }
                baseKey = potentialKey;
            }
            let newKey = baseKey;
            let keyCounter = 1;
            while (newFields.some((f, i) => i !== index && f.key === newKey)) {
                newKey = `${baseKey}${keyCounter}`;
                keyCounter++;
            }
            modifiedField.key = newKey;
        }
    }
    if (updatedFieldDefinition.type === 'placeholderImage' && oldField.type !== 'placeholderImage') {
        modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth || parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH;
        modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight || 140;
    } else if (updatedFieldDefinition.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
        modifiedField.placeholderConfigWidth = undefined;
        modifiedField.placeholderConfigHeight = undefined;
        modifiedField.placeholderConfigBgColor = undefined;
        modifiedField.placeholderConfigTextColor = undefined;
        modifiedField.placeholderConfigText = undefined;
    }
    newFields[index] = modifiedField;
    setFields(newFields);

    // Update corresponding GUI config if field key changed or just label/type
     if (modifiedField.key !== oldFieldKey) {
        setLayoutElementGuiConfigs(prev => prev.map(c => 
            c.fieldKey === oldFieldKey ? { ...c, fieldKey: modifiedField.key, label: modifiedField.label, originalType: modifiedField.type } : c
        ));
    } else {
        setLayoutElementGuiConfigs(prev => prev.map(c =>
            c.fieldKey === modifiedField.key ? { ...c, label: modifiedField.label, originalType: modifiedField.type } : c
        ));
    }
  };

  const handleLayoutDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    // console.log('[DEBUG] EditTemplatePage/handleLayoutDefinitionChange: Layout string changed.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJson = () => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      // console.log('[DEBUG] EditTemplatePage/validateAndFormatLayoutJson: JSON is valid and formatted.');
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] EditTemplatePage/validateAndFormatLayoutJson: Invalid JSON', e.message);
      return false;
    }
  };

  const handleGuiConfigChange = (fieldKey: string, property: keyof LayoutElementGuiConfig, value: any) => {
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config.fieldKey === fieldKey ? { ...config, [property]: value } : config
      )
    );
  };

  const handleToggleGuiExpand = (fieldKey: string) => {
    setLayoutElementGuiConfigs(prev =>
      prev.map(config =>
        config.fieldKey === fieldKey ? { ...config, isExpandedInGui: !config.isExpandedInGui } : config
      )
    );
  };

  const handleGenerateJsonFromBuilder = () => {
    console.log('[DEBUG] EditTemplatePage/handleGenerateJsonFromBuilder: Generating JSON from GUI configs.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: any = {
        position: "absolute",
        top: config.styleTop.endsWith('px') || config.styleTop.endsWith('%') ? config.styleTop : `${config.styleTop}px`,
        left: config.styleLeft.endsWith('px') || config.styleLeft.endsWith('%') ? config.styleLeft : `${config.styleLeft}px`,
        width: config.styleWidth.endsWith('px') || config.styleWidth.endsWith('%') ? config.styleWidth : `${config.styleWidth}px`,
        height: config.styleHeight.endsWith('px') || config.styleHeight.endsWith('%') ? config.styleHeight : `${config.styleHeight}px`,
      };

      if (config.styleRight && config.styleRight.trim() !== '') style.right = config.styleRight;
      if (config.styleMaxHeight && config.styleMaxHeight.trim() !== '') style.maxHeight = config.styleMaxHeight;
      if (config.styleFontStyle && config.styleFontStyle.trim() !== '' && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle;
      if (config.styleTextAlign && config.styleTextAlign.trim() !== '' && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign;
      if (config.stylePadding && config.stylePadding.trim() !== '') style.padding = config.stylePadding;
      if (config.styleBorderTop && config.styleBorderTop.trim() !== '') style.borderTop = config.styleBorderTop;
      if (config.styleBorderBottom && config.styleBorderBottom.trim() !== '') style.borderBottom = config.styleBorderBottom;

      const classNames = [];
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');
      
      if (config.tailwindTextColor && config.tailwindTextColor.trim() !== '' && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else classNames.push('text-card-foreground');
      
      if (config.tailwindFontSize && config.tailwindFontSize.trim() !== '' && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else classNames.push('text-base');
      
      if (config.tailwindFontWeight && config.tailwindFontWeight.trim() !== '' && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else classNames.push('font-normal');

      if (config.tailwindLineHeight && config.tailwindLineHeight.trim() !== '' && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      // else classNames.push('leading-normal');

      if (config.tailwindOverflow && config.tailwindOverflow.trim() !== '' && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      // else classNames.push('overflow-visible');

      if (config.tailwindTextOverflow && config.tailwindTextOverflow.trim() !== '' && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);


      const element: any = {
        fieldKey: config.fieldKey,
        type: config.elementType,
        style: style,
        className: classNames.join(' ').trim()
      };
      if (config.elementType === 'iconValue' && config.iconName && config.iconName.trim() !== '') {
        element.icon = config.iconName.trim();
      }
      return element;
    });

    const newLayout = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--border))",
      borderRadius: "calc(var(--radius) - 2px)",
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in the textarea and preview."});
  };


  const handleSaveTemplate = async () => {
    // console.log('[DEBUG] EditTemplatePage/handleSaveTemplate: Attempting to save.');
    if (!originalTemplateId) {
        toast({ title: "Error", description: "Original template ID is missing. Cannot update.", variant: "destructive" });
        return;
    }
    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Add at least one field to the template.", variant: "destructive" });
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

    let finalLayoutDefinition = layoutDefinition.trim();
    if (finalLayoutDefinition) {
        try {
            JSON.parse(finalLayoutDefinition);
        } catch (e) {
            toast({
                title: "Invalid Layout JSON",
                description: `The JSON in 'Layout Definition' is invalid. Error: ${(e as Error).message}. Please correct or regenerate.`,
                variant: "destructive",
                duration: 7000,
            });
            setLayoutJsonError(`Invalid JSON: ${(e as Error).message}`);
            return;
        }
    } else {
        if (layoutElementGuiConfigs.some(c => c.isEnabledOnCanvas)) {
            handleGenerateJsonFromBuilder();
            finalLayoutDefinition = layoutDefinition.trim();
            if (!finalLayoutDefinition) finalLayoutDefinition = DEFAULT_CARD_LAYOUT_JSON_STRING;
        } else {
             finalLayoutDefinition = DEFAULT_CARD_LAYOUT_JSON_STRING;
        }
    }
    setIsSaving(true);
    const updatedTemplateData: CardTemplate = {
      id: originalTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefinition,
    };
    // console.log('[DEBUG] EditTemplatePage/handleSaveTemplate: Calling updateTemplate with:', updatedTemplateData);
    const result = await updateTemplate(updatedTemplateData);
    if (result.success) {
      toast({
        title: "Template Updated!",
        description: result.message,
        variant: "default",
      });
      router.push('/templates');
    } else {
      toast({
        title: "Update Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleCopyIconName = async (iconName: string) => {
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
  };

  const handleSizePresetChange = (value: string) => {
    setSelectedSizePreset(value);
    if (value === "custom") {
      // No change to width/height needed
    } else {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width);
        setCanvasHeightSetting(preset.height);
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


  if (isLoadingPage) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading template data...</p>
      </div>
    );
  }

  if (errorLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <p className="mt-4 text-destructive-foreground">{errorLoading}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-3xl font-bold">Edit Template</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
            </Button>
          </div>
          <CardDescription className="text-md">
            Modify the template's name, fields, and layout. The Template ID (<code>{originalTemplateId}</code>) is auto-generated and cannot be changed.
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
                placeholder="Hero Unit Card"
                disabled={isSaving}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="templateIdDisplay" className="font-semibold">Template ID (Auto-generated, Read-only)</Label>
              <Input
                id="templateIdDisplay"
                value={originalTemplateId || ''}
                readOnly
                disabled
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
           <div>
            <h3 className="text-xl font-semibold mb-3">Data Fields</h3>
            <div className="space-y-3">
                {fields.map((field, index) => (
                <FieldRow
                    key={field._uiId || index} // Use stable _uiId
                    field={field}
                    onChange={(updatedField) => handleFieldChange(index, updatedField)}
                    onRemove={() => handleRemoveField(index)}
                    isSaving={isSaving}
                />
                ))}
                {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                    No fields added yet. Click "Add Field" to begin.
                </p>
                )}
            </div>
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

      <div className="grid grid-cols-1 md:grid-cols-1 gap-8 items-start">
        <Card className="md:w-full flex flex-col shadow-md">
          <CardHeader>
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription className="text-md">
                Configure canvas size, choose which fields to display, and define their basic layout properties. The generated JSON below can be further customized.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-lg font-semibold mb-2">Card Canvas Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-1">
                  <Label htmlFor="canvasSizePresetEdit" className="text-sm font-medium">Canvas Size Preset</Label>
                  <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving}>
                    <SelectTrigger id="canvasSizePresetEdit" className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select size preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CARD_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSizePreset === 'custom' && (
                  <>
                    <div>
                      <Label htmlFor="canvasWidthEdit" className="text-sm font-medium">Custom Width (e.g., 280px)</Label>
                      <Input
                        id="canvasWidthEdit"
                        value={canvasWidthSetting}
                        onChange={(e) => handleCustomDimensionChange('width', e.target.value)}
                        disabled={isSaving}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="canvasHeightEdit" className="text-sm font-medium">Custom Height (e.g., 400px)</Label>
                      <Input
                        id="canvasHeightEdit"
                        value={canvasHeightSetting}
                        onChange={(e) => handleCustomDimensionChange('height', e.target.value)}
                        disabled={isSaving}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </>
                )}
                {(selectedSizePreset !== 'custom' && COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)) && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                     <div>
                        <Label className="text-sm font-medium text-muted-foreground">Width</Label>
                        <p className="text-sm mt-1 h-9 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.width}</p>
                    </div>
                    <div>
                        <Label className="text-sm font-medium text-muted-foreground">Height</Label>
                        <p className="text-sm mt-1 h-9 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.height}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-lg font-semibold mb-2">Layout Elements (Toggle to Include & Configure)</h4>
               <ScrollArea className="pr-2"> 
                  <div className="space-y-2">
                    {layoutElementGuiConfigs.map((config) => (
                      <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`enable-edit-${config.fieldKey}`}
                              checked={config.isEnabledOnCanvas}
                              onCheckedChange={(checked) => handleGuiConfigChange(config.fieldKey, 'isEnabledOnCanvas', checked)}
                              disabled={isSaving}
                            />
                            <Label htmlFor={`enable-edit-${config.fieldKey}`} className="text-sm font-medium cursor-pointer">
                              {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span>
                            </Label>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config.fieldKey)} className="h-7 w-7 text-muted-foreground">
                            {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </div>
                        {config.isExpandedInGui && config.isEnabledOnCanvas && (
                          <div className="mt-3 pt-3 border-t border-dashed space-y-3">
                            {/* Element Type & Icon Name */}
                           <h5 className="text-xs text-muted-foreground font-semibold pt-1">Element Type & Icon</h5>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`el-type-edit-${config.fieldKey}`} className="text-xs">Element Type</Label>
                              <Select value={config.elementType} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'elementType', value)} disabled={isSaving}>
                                <SelectTrigger id={`el-type-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem>
                                  <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem>
                                  <SelectItem value="iconFromData">Icon from Data</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {config.elementType === 'iconValue' && (
                              <div>
                                <Label htmlFor={`el-icon-edit-${config.fieldKey}`} className="text-xs">Icon Name (Lucide)</Label>
                                <Input id={`el-icon-edit-${config.fieldKey}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                            )}
                          </div>

                            {/* Position & Sizing */}
                            <h5 className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-dotted">Position & Sizing (CSS)</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['styleTop', 'styleLeft', 'styleRight', 'styleWidth', 'styleHeight', 'styleMaxHeight', 'stylePadding'].map(prop => (
                                    <div key={prop}>
                                        <Label htmlFor={`el-${prop}-edit-${config.fieldKey}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()}</Label>
                                        <Input id={`el-${prop}-edit-${config.fieldKey}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, prop as keyof LayoutElementGuiConfig, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving}/>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Typography (Conditional for text-based elements) */}
                            {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                              <>
                                <h5 className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-dotted">Typography</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor={`el-twTextColor-edit-${config.fieldKey}`} className="text-xs">Text Color (Tailwind)</Label>
                                    <Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindTextColor', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextColor-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontSize-edit-${config.fieldKey}`} className="text-xs">Font Size (Tailwind)</Label>
                                    <Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindFontSize', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontSize-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontWeight-edit-${config.fieldKey}`} className="text-xs">Font Weight (Tailwind)</Label>
                                    <Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindFontWeight', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontWeight-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twLineHeight-edit-${config.fieldKey}`} className="text-xs">Line Height (Tailwind)</Label>
                                    <Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindLineHeight', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twLineHeight-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select line height" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleFontStyle-edit-${config.fieldKey}`} className="text-xs">Font Style (CSS)</Label>
                                     <Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'styleFontStyle', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleFontStyle-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleTextAlign-edit-${config.fieldKey}`} className="text-xs">Text Align (CSS)</Label>
                                    <Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'styleTextAlign', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleTextAlign-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <h5 className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-dotted">Overflow & Display (Text - Tailwind)</h5>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor={`el-twOverflow-edit-${config.fieldKey}`} className="text-xs">Overflow</Label>
                                    <Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindOverflow', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twOverflow-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twTextOverflow-edit-${config.fieldKey}`} className="text-xs">Text Overflow</Label>
                                    <Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindTextOverflow', value === NONE_VALUE ? '' : value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextOverflow-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select text overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </>
                            )}
                            {/* Borders */}
                            <h5 className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-dotted">Borders (CSS)</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <div>
                                  <Label htmlFor={`el-styleBorderTop-edit-${config.fieldKey}`} className="text-xs">Border Top</Label>
                                  <Input id={`el-styleBorderTop-edit-${config.fieldKey}`} value={config.styleBorderTop || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleBorderTop', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 1px solid #ccc" disabled={isSaving}/>
                              </div>
                              <div>
                                  <Label htmlFor={`el-styleBorderBottom-edit-${config.fieldKey}`} className="text-xs">Border Bottom</Label>
                                  <Input id={`el-styleBorderBottom-edit-${config.fieldKey}`} value={config.styleBorderBottom || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleBorderBottom', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 1px solid #ccc" disabled={isSaving}/>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
            </div>

            <Button onClick={handleGenerateJsonFromBuilder} variant="secondary" size="sm" disabled={isSaving || layoutElementGuiConfigs.length === 0} className="self-start mt-2">
              <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON from Builder
            </Button>

            <div className="mt-4 flex-grow flex flex-col min-h-0">
              <div>
                <Label htmlFor="layoutDefinitionEdit" className="text-sm font-medium">Layout Definition JSON (Builder output updates here)</Label>
                <Textarea
                  id="layoutDefinitionEdit"
                  value={layoutDefinition}
                  onChange={handleLayoutDefinitionChange}
                  onBlur={validateAndFormatLayoutJson}
                  placeholder='Click "Generate/Update JSON from Builder" above, or paste/edit your JSON here.'
                  rows={15}
                  className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                  disabled={isSaving}
                />
              </div>
              {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
              <Accordion type="single" collapsible className="w-full mt-3">
                <AccordionItem value="lucide-icon-explorer">
                   <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center text-muted-foreground">
                      <Copy className="mr-2 h-4 w-4" /> Browse Lucide Icons
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                    <p className="font-semibold mb-1 mt-0">Common Lucide Icons (Click to Copy Name):</p>
                    <ScrollArea className="max-h-[120px] bg-background/50 p-2 rounded border overflow-y-auto">
                       <div className={cn("grid gap-1", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                        {commonLucideIconsForGuide.map(iconName => (
                          <TooltipProvider key={iconName as string} delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconName as string)} className="h-7 w-7 p-1" >
                                  <IconComponent name={iconName as string} className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{iconName as string}</p></TooltipContent>
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
          <CardFooter className="mt-auto pt-4 border-t">
            <Button
              onClick={handleSaveTemplate}
              className="w-full md:w-auto"
              disabled={isSaving || !originalTemplateId || !templateName.trim() || fields.length === 0}
            >
              {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes... </> ) : ( <> <Save className="mr-2 h-4 w-4" /> Save Changes </> )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:w-[35%] sticky top-20 self-start shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center">
                    <Eye className="mr-2 h-5 w-5" /> Live Layout Preview
                </CardTitle>
                 <div className="flex items-center space-x-2">
                    <Switch id="show-pixel-grid-edit" checked={showPixelGrid} onCheckedChange={setShowPixelGrid} aria-label="Show pixel grid" />
                    <Label htmlFor="show-pixel-grid-edit" className="text-xs text-muted-foreground">Pixel Grid</Label>
                </div>
            </div>
            <CardDescription className="text-sm">
              This preview updates as you modify the Layout Definition JSON or template fields.
              Uses sample data based on your field definitions.
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
              <p className="text-muted-foreground">Loading preview or define fields...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
