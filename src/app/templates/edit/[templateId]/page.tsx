
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, ArrowLeft, Eye, HelpCircle, Copy, Palette, ChevronDown, ChevronRight } from 'lucide-react';
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
  styleFontSize: string; // Inline style
  iconName?: string;

  // Advanced text styling (inline)
  styleRight?: string;
  styleFontWeight?: string; // Inline style
  styleLineHeight?: string;
  styleMaxHeight?: string;
  styleOverflow?: string;
  styleTextOverflow?: string;
  styleFontStyle?: string;
  styleTextAlign?: string;
  stylePadding?: string;
  styleBorderTop?: string;
  styleBorderBottom?: string;

  // Tailwind class selectors
  tailwindTextColor?: string;
  tailwindFontSize?: string;
  tailwindFontWeight?: string;
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

const TAILWIND_TEXT_COLORS = [
    { value: "text-card-foreground", label: "Default (Card FG)" },
    { value: "text-primary", label: "Primary" },
    { value: "text-secondary", label: "Secondary" },
    { value: "text-muted-foreground", label: "Muted" },
    { value: "text-destructive", label: "Destructive" },
    { value: "text-white", label: "White" },
    { value: "text-black", label: "Black" },
    { value: "text-slate-500", label: "Slate 500" },
    { value: "text-red-500", label: "Red 500" },
    { value: "text-orange-500", label: "Orange 500" },
    { value: "text-amber-500", label: "Amber 500" },
    { value: "text-yellow-500", label: "Yellow 500" },
    { value: "text-lime-500", label: "Lime 500" },
    { value: "text-green-500", label: "Green 500" },
    { value: "text-emerald-500", label: "Emerald 500" },
    { value: "text-teal-500", label: "Teal 500" },
    { value: "text-cyan-500", label: "Cyan 500" },
    { value: "text-sky-500", label: "Sky 500" },
    { value: "text-blue-500", label: "Blue 500" },
    { value: "text-indigo-500", label: "Indigo 500" },
    { value: "text-violet-500", label: "Violet 500" },
    { value: "text-purple-500", label: "Purple 500" },
    { value: "text-fuchsia-500", label: "Fuchsia 500" },
    { value: "text-pink-500", label: "Pink 500" },
    { value: "text-rose-500", label: "Rose 500" },
    { value: "", label: "None (Inherit/CSS)" },
];

const TAILWIND_FONT_SIZES = [
    { value: "text-xs", label: "XS" },
    { value: "text-sm", label: "Small" },
    { value: "text-base", label: "Base" },
    { value: "text-lg", label: "Large" },
    { value: "text-xl", label: "XL" },
    { value: "text-2xl", label: "2XL" },
    { value: "text-3xl", label: "3XL" },
    { value: "text-4xl", label: "4XL" },
    { value: "", label: "None (Inherit/CSS)" },
];

const TAILWIND_FONT_WEIGHTS = [
    { value: "font-thin", label: "Thin (100)" },
    { value: "font-extralight", label: "Extra Light (200)" },
    { value: "font-light", label: "Light (300)" },
    { value: "font-normal", label: "Normal (400)" },
    { value: "font-medium", label: "Medium (500)" },
    { value: "font-semibold", label: "Semi-Bold (600)" },
    { value: "font-bold", label: "Bold (700)" },
    { value: "font-extrabold", label: "Extra Bold (800)" },
    { value: "font-black", label: "Black (900)" },
    { value: "", label: "None (Inherit/CSS)" },
];


function mapTemplateFieldToFieldDefinition(field: TemplateField): TemplateFieldDefinition {
    console.log('[DEBUG] EditTemplatePage/mapTemplateFieldToFieldDefinition: Mapping field', field);
    const definition: TemplateFieldDefinition = {
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue,
        previewValue: typeof field.defaultValue === 'string' ? field.defaultValue : (field.defaultValue !== undefined ? String(field.defaultValue) : undefined), // Simple preview init
        placeholderConfigWidth: field.placeholderConfigWidth,
        placeholderConfigHeight: field.placeholderConfigHeight,
        placeholderConfigBgColor: field.placeholderConfigBgColor,
        placeholderConfigTextColor: field.placeholderConfigTextColor,
        placeholderConfigText: field.placeholderConfigText,
    };
    if (field.type === 'select' && field.options) {
        definition.optionsString = field.options.map(opt => `${opt.value}:${opt.label}`).join(',');
    }
    console.log('[DEBUG] EditTemplatePage/mapTemplateFieldToFieldDefinition: Resulting definition', definition);
    return definition;
}

function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
    console.log('[DEBUG] EditTemplatePage/mapFieldDefinitionToTemplateField: Mapping def', def);
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
    console.log('[DEBUG] EditTemplatePage/mapFieldDefinitionToTemplateField: Resulting field', field);
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
  // console.log(`[DEBUG] EditTemplatePage/toCamelCase: Input: "${str}", Output: "${result}"`);
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
  path += '.png'; // Ensure .png is part of the path before query params for colors

  let fullUrl = `https://placehold.co/${path}`;
  const text = rawText?.trim();
  if (text) {
    fullUrl += `?text=${encodeURIComponent(text)}`;
  }
  console.log('[DEBUG] EditTemplatePage/generateSamplePlaceholderUrl: Generated URL', fullUrl, 'from config', config);
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
  console.log('[DEBUG] EditTemplatePage: Component rendering/re-rendering.');
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
      console.log('[DEBUG] EditTemplatePage: Template found.', templateToEdit);
      setOriginalTemplateId(templateToEdit.id as CardTemplateId);
      setTemplateName(templateToEdit.name);
      const initialFields = templateToEdit.fields.map(mapTemplateFieldToFieldDefinition);
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
          const yOffset = 10 + (index % 8) * 25;
          const xOffset = 10;
          return {
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
            styleFontSize: existingLayoutElement?.style?.fontSize || '12px',
            iconName: existingLayoutElement?.icon || (field.type === 'number' ? 'Coins' : ''),
            // Initialize new style props from JSON if present
            styleRight: existingLayoutElement?.style?.right || '',
            styleFontWeight: existingLayoutElement?.style?.fontWeight || '',
            styleLineHeight: existingLayoutElement?.style?.lineHeight || '',
            styleMaxHeight: existingLayoutElement?.style?.maxHeight || '',
            styleOverflow: existingLayoutElement?.style?.overflow || '',
            styleTextOverflow: existingLayoutElement?.style?.textOverflow || '',
            styleFontStyle: existingLayoutElement?.style?.fontStyle || 'normal',
            styleTextAlign: existingLayoutElement?.style?.textAlign || 'left',
            stylePadding: existingLayoutElement?.style?.padding || '',
            styleBorderTop: existingLayoutElement?.style?.borderTop || '',
            styleBorderBottom: existingLayoutElement?.style?.borderBottom || '',
             // Initialize Tailwind class selectors (these won't be parsed from className string initially)
            tailwindTextColor: 'text-card-foreground',
            tailwindFontSize: 'text-base',
            tailwindFontWeight: 'font-normal',
          };
        }));

      } catch (e) {
        console.warn("[DEBUG] EditTemplatePage: Could not parse initial layout definition for GUI config:", e);
        setSelectedSizePreset(`${DEFAULT_CANVAS_WIDTH}x${DEFAULT_CANVAS_HEIGHT}`);
        setCanvasWidthSetting(`${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(`${DEFAULT_CANVAS_HEIGHT}px`);
        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
            const yOffset = 10 + (index % 8) * 25;
            const xOffset = 10;
            return {
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
                styleFontSize: '12px',
                iconName: field.type === 'number' ? 'Coins' : '',
                styleRight: '',
                styleFontWeight: '',
                styleLineHeight: '',
                styleMaxHeight: '',
                styleOverflow: '',
                styleTextOverflow: '',
                styleFontStyle: 'normal',
                styleTextAlign: 'left',
                stylePadding: '',
                styleBorderTop: '',
                styleBorderBottom: '',
                tailwindTextColor: 'text-card-foreground',
                tailwindFontSize: 'text-base',
                tailwindFontWeight: 'font-normal',
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

  // Sync fields state with layoutElementGuiConfigs
  useEffect(() => {
    console.log('[DEBUG] EditTemplatePage: Syncing fields to layoutElementGuiConfigs. Fields count:', fields.length);
    setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigs = fields.map((field, index) => {
        const existingConfig = prevConfigs.find(c => c.fieldKey === field.key);
        if (existingConfig) {
            return { 
                ...existingConfig, 
                label: field.label, // Update label
                originalType: field.type // Update original type
            };
        }
        // Field was added, create new GUI config with defaults
        const yOffset = 10 + (index % 8) * 25;
        const xOffset = 10;
        return {
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
          styleFontSize: '12px',
          iconName: field.type === 'number' ? 'Coins' : '',
          styleRight: '',
          styleFontWeight: '',
          styleLineHeight: '',
          styleMaxHeight: '',
          styleOverflow: '',
          styleTextOverflow: '',
          styleFontStyle: 'normal',
          styleTextAlign: 'left',
          stylePadding: '',
          styleBorderTop: '',
          styleBorderBottom: '',
          tailwindTextColor: 'text-card-foreground',
          tailwindFontSize: 'text-base',
          tailwindFontWeight: 'font-normal',
        };
      });
      // Filter out GUI configs for fields that no longer exist
      return newConfigs.filter(nc => fields.some(f => f.key === nc.fieldKey));
    });
  }, [fields]);


  useEffect(() => {
    console.log('[DEBUG] EditTemplatePage: Generating sampleCardForPreview. Fields count:', fields.length, 'Original ID:', originalTemplateId);
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
          case 'textarea': valueForPreview = `Sample content for ${fieldDef.label}. This might be a longer string to test wrapping and scrolling behavior in the preview.`; break;
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
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image', bgColor: '444444', textColor: 'ffffff'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting) || DEFAULT_CANVAS_WIDTH, height: parseInt(canvasHeightSetting) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art', bgColor: '222222', textColor: 'dddddd'});
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
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, updatedFieldDefinition: TemplateFieldDefinition) => {
    console.log('[DEBUG] EditTemplatePage/handleFieldChange: Updating field at index', index, updatedFieldDefinition);
    const newFields = [...fields];
    const oldField = newFields[index];
    let modifiedField = { ...oldField, ...updatedFieldDefinition };
    if (updatedFieldDefinition.label !== undefined && updatedFieldDefinition.label !== oldField.label) {
        // Only auto-update key if it seems to have been derived from the old label
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
  };

  const handleLayoutDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    console.log('[DEBUG] EditTemplatePage/handleLayoutDefinitionChange: Layout string changed.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJson = () => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      console.log('[DEBUG] EditTemplatePage/validateAndFormatLayoutJson: JSON is valid and formatted.');
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
        top: config.styleTop.endsWith('px') ? config.styleTop : `${config.styleTop}px`,
        left: config.styleLeft.endsWith('px') ? config.styleLeft : `${config.styleLeft}px`,
        width: config.styleWidth.endsWith('px') ? config.styleWidth : `${config.styleWidth}px`,
        height: config.styleHeight.endsWith('px') ? config.styleHeight : `${config.styleHeight}px`,
      };
      
      // Add inline styles from GUI if they have values
      if (config.styleFontSize && config.styleFontSize.trim() !== '') style.fontSize = config.styleFontSize;
      if (config.styleRight && config.styleRight.trim() !== '') style.right = config.styleRight;
      if (config.styleFontWeight && config.styleFontWeight.trim() !== '') style.fontWeight = config.styleFontWeight;
      if (config.styleLineHeight && config.styleLineHeight.trim() !== '') style.lineHeight = config.styleLineHeight;
      if (config.styleMaxHeight && config.styleMaxHeight.trim() !== '') style.maxHeight = config.styleMaxHeight;
      if (config.styleOverflow && config.styleOverflow.trim() !== '') style.overflow = config.styleOverflow;
      if (config.styleTextOverflow && config.styleTextOverflow.trim() !== '') style.textOverflow = config.styleTextOverflow;
      if (config.styleFontStyle && config.styleFontStyle.trim() !== '' && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle;
      if (config.styleTextAlign && config.styleTextAlign.trim() !== '' && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign;
      if (config.stylePadding && config.stylePadding.trim() !== '') style.padding = config.stylePadding;
      if (config.styleBorderTop && config.styleBorderTop.trim() !== '') style.borderTop = config.styleBorderTop;
      if (config.styleBorderBottom && config.styleBorderBottom.trim() !== '') style.borderBottom = config.styleBorderBottom;

      // Construct className from Tailwind selections
      const classNames = [];
      if (config.originalType === 'textarea') classNames.push('whitespace-pre-wrap'); // Default for textarea elements
      if (config.tailwindTextColor && config.tailwindTextColor !== 'text-card-foreground') classNames.push(config.tailwindTextColor);
      else if (!config.tailwindTextColor && !classNames.includes('text-card-foreground')) classNames.push('text-card-foreground');
      
      if (config.tailwindFontSize && config.tailwindFontSize !== 'text-base') classNames.push(config.tailwindFontSize);
      else if (!config.tailwindFontSize && !classNames.includes('text-base') && !style.fontSize) classNames.push('text-base');

      if (config.tailwindFontWeight && config.tailwindFontWeight !== 'font-normal') classNames.push(config.tailwindFontWeight);
      else if (!config.tailwindFontWeight && !classNames.includes('font-normal') && !style.fontWeight) classNames.push('font-normal');


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
    console.log('[DEBUG] EditTemplatePage/handleSaveTemplate: Attempting to save.');
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
                description: `The JSON in the 'Layout Definition' textarea is invalid. Error: ${(e as Error).message}. Please correct or regenerate.`,
                variant: "destructive",
                duration: 7000,
            });
            setLayoutJsonError(`Invalid JSON: ${(e as Error).message}`);
            return;
        }
    } else {
         handleGenerateJsonFromBuilder(); 
         finalLayoutDefinition = layoutDefinition.trim(); 
         if (!finalLayoutDefinition) {
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
    console.log('[DEBUG] EditTemplatePage/handleSaveTemplate: Calling updateTemplate with:', updatedTemplateData);
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
      // No change to width/height needed, user will input manually
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
    // If user types into custom fields, switch preset to custom
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
      {/* Top Section: Template Info & Data Fields */}
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
             <ScrollArea className="pr-3"> {/* Removed max-h to allow full expansion */}
                <div className="space-y-3">
                    {fields.map((field, index) => (
                    <FieldRow
                        key={field.key} 
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

      {/* Bottom Section: Layout Builder & Preview */}
      <div className="flex flex-col md:flex-row gap-8">
        <Card className="md:w-[65%] flex flex-col shadow-md">
          <CardHeader>
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription className="text-md">
                Configure canvas size and individual layout elements. Generate JSON to preview and save.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {/* Card Canvas Setup */}
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

            {/* Layout Elements Configuration */}
            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-lg font-semibold mb-2">Layout Elements (Toggle to Include)</h4>
               <ScrollArea className="pr-2"> {/* Removed max-h here */}
                  <div className="space-y-2">
                    {layoutElementGuiConfigs.map((config) => (
                      <div key={config.fieldKey} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
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
                            {/* Element Type and Icon Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`el-type-edit-${config.fieldKey}`} className="text-xs">Element Type</Label>
                                <Select
                                  value={config.elementType}
                                  onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'elementType', value)}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger id={`el-type-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="textarea">Textarea</SelectItem>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="iconValue">Icon & Value</SelectItem>
                                    <SelectItem value="iconFromData">Icon from Data</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {config.elementType === 'iconValue' && (
                                <div>
                                  <Label htmlFor={`el-icon-edit-${config.fieldKey}`} className="text-xs">Icon Name (Lucide)</Label>
                                  <Input
                                    id={`el-icon-edit-${config.fieldKey}`}
                                    value={config.iconName || ''}
                                    onChange={(e) => handleGuiConfigChange(config.fieldKey, 'iconName', e.target.value)}
                                    placeholder="e.g., Coins"
                                    className="h-8 text-xs mt-0.5"
                                    disabled={isSaving}
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Position & Sizing Category */}
                            <h5 className="text-xs text-muted-foreground font-semibold mt-3 pt-2 border-t border-dotted">Position & Sizing</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['styleTop', 'styleLeft', 'styleRight', 'styleWidth', 'styleHeight', 'styleMaxHeight', 'stylePadding'].map(prop => (
                                    <div key={prop}>
                                        <Label htmlFor={`el-${prop}-edit-${config.fieldKey}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()}</Label>
                                        <Input id={`el-${prop}-edit-${config.fieldKey}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, prop as keyof LayoutElementGuiConfig, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving}/>
                                    </div>
                                ))}
                            </div>

                            {/* Typography Category (conditionally rendered) */}
                            {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                              <>
                                <h5 className="text-xs text-muted-foreground font-semibold mt-3 pt-2 border-t border-dotted">Typography</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor={`el-styleFontSize-${config.fieldKey}`} className="text-xs">Font Size (CSS)</Label>
                                    <Input id={`el-styleFontSize-${config.fieldKey}`} value={config.styleFontSize} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleFontSize', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 12px, 1.1em" disabled={isSaving}/>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleFontWeight-${config.fieldKey}`} className="text-xs">Font Weight (CSS)</Label>
                                    <Input id={`el-styleFontWeight-${config.fieldKey}`} value={config.styleFontWeight || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleFontWeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., bold, 700" disabled={isSaving}/>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleLineHeight-${config.fieldKey}`} className="text-xs">Line Height (CSS)</Label>
                                    <Input id={`el-styleLineHeight-${config.fieldKey}`} value={config.styleLineHeight || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleLineHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 1.5, 20px" disabled={isSaving}/>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleFontStyle-${config.fieldKey}`} className="text-xs">Font Style</Label>
                                     <Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'styleFontStyle', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleFontStyle-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleTextAlign-${config.fieldKey}`} className="text-xs">Text Align</Label>
                                    <Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'styleTextAlign', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleTextAlign-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  {/* Tailwind Class Selectors */}
                                  <div>
                                    <Label htmlFor={`el-twTextColor-edit-${config.fieldKey}`} className="text-xs">Text Color (Tailwind)</Label>
                                    <Select value={config.tailwindTextColor || ''} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindTextColor', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextColor-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger>
                                      <SelectContent>
                                          {TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontSize-edit-${config.fieldKey}`} className="text-xs">Font Size (Tailwind)</Label>
                                    <Select value={config.tailwindFontSize || ''} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindFontSize', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontSize-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger>
                                      <SelectContent>
                                          {TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontWeight-edit-${config.fieldKey}`} className="text-xs">Font Weight (Tailwind)</Label>
                                    <Select value={config.tailwindFontWeight || ''} onValueChange={(value) => handleGuiConfigChange(config.fieldKey, 'tailwindFontWeight', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontWeight-edit-${config.fieldKey}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger>
                                      <SelectContent>
                                          {TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <h5 className="text-xs text-muted-foreground font-semibold mt-3 pt-2 border-t border-dotted">Overflow & Display (Text)</h5>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor={`el-styleOverflow-${config.fieldKey}`} className="text-xs">Overflow (CSS)</Label>
                                    <Input id={`el-styleOverflow-${config.fieldKey}`} value={config.styleOverflow || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleOverflow', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., hidden, auto" disabled={isSaving}/>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleTextOverflow-${config.fieldKey}`} className="text-xs">Text Overflow (CSS)</Label>
                                    <Input id={`el-styleTextOverflow-${config.fieldKey}`} value={config.styleTextOverflow || ''} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleTextOverflow', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., ellipsis" disabled={isSaving}/>
                                  </div>
                                </div>
                              </>
                            )}
                            {/* Borders Category */}
                            <h5 className="text-xs text-muted-foreground font-semibold mt-3 pt-2 border-t border-dotted">Borders (CSS)</h5>
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

            {/* JSON Output and Guides */}
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
                  // disabled={isSaving} // Keep editable
                />
              </div>
              {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
              <Accordion type="multiple" defaultValue={['layout-guide']} className="w-full mt-3">
                <AccordionItem value="layout-guide">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center text-muted-foreground">
                      <HelpCircle className="mr-2 h-4 w-4" /> Show Layout JSON Guide
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                    <p className="font-semibold mb-1">Top-level properties:</p>
                    <ul className="list-disc list-inside pl-2 mb-2 space-y-0.5">
                      <li><code>width</code>, <code>height</code>: Card dimensions (e.g., "280px"). Set these in "Card Canvas Setup" above.</li>
                      <li><code>backgroundColor</code>, <code>borderColor</code>, <code>borderRadius</code>: CSS values. These are included in the generated JSON with defaults.</li>
                    </ul>
                    <p className="font-semibold mb-1 mt-3">Available Field Keys for this Template:</p>
                    {fields.length > 0 ? (
                      <ScrollArea className="max-h-[100px] bg-background/50 p-2 rounded border text-xs">
                        <ul className="list-disc list-inside space-y-0.5">
                          {fields.map(f => <li key={f.key}><code>{f.key}</code> ({f.label})</li>)}
                        </ul>
                      </ScrollArea>
                    ) : (
                      <p className="italic text-muted-foreground">No data fields defined yet. Add fields above to see their keys here.</p>
                    )}
                    <p className="text-xs mt-1 mb-2">Use these keys in the <code>fieldKey</code> property of elements below if manually editing JSON, or select them in the builder.</p>
                    <p className="font-semibold mb-1 mt-3"><code>elements</code> array (each object defines one visual piece):</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li><strong><code>fieldKey</code></strong>: (String) **Must exactly match** a 'Field Key' from the list above (e.g., if you have "Card Title" with key "cardTitle", use "cardTitle").</li>
                      <li><strong><code>type</code></strong>: (String) One of: "text", "textarea", "image", "iconValue", "iconFromData". The builder helps set these.</li>
                      <li><strong><code>style</code></strong>: (Object) CSS-in-JS (e.g., {`{ "position": "absolute", "top": "10px", "fontSize": "1.2em" }`}). Use camelCase for CSS properties. The builder provides GUI controls for many common styles.</li>
                      <li><strong><code>className</code></strong>: (String, Optional) Tailwind CSS classes. The builder helps generate these from GUI selections for text color, font size, and weight.</li>
                      <li><strong><code>prefix</code> / <code>suffix</code></strong>: (String, Optional) For "text", "iconValue".</li>
                      <li><strong><code>icon</code></strong>: (String, Optional) For "iconValue" type. Name of a Lucide icon. **Ensure the icon exists in `lucide-react`.**</li>
                    </ul>
                    <p className="mt-3 italic">The GUI builder helps create this JSON. You can also manually edit the JSON here; changes will be reflected in the preview. The "Save Template" button always uses the content of this textarea.</p>
                    <p className="font-semibold mb-1 mt-4">Example Element Snippets (for manual JSON editing):</p>
                    <pre className="text-xs bg-background/50 p-2 rounded border whitespace-pre-wrap">
{`// For a simple text display
{
  "fieldKey": "yourCardNameFieldKey", // Replace with one of YOUR field keys from above
  "type": "text",
  "style": { "position": "absolute", "top": "20px", "left": "20px", "fontWeight": "bold" },
  "className": "text-lg text-primary" // Example Tailwind classes
}

// For an image (ensure 'yourImageUrlFieldKey' is a field of type 'text' or 'placeholderImage' in Data Fields)
{
  "fieldKey": "yourImageUrlFieldKey", // Replace
  "type": "image",
  "style": { 
    "position": "absolute", "top": "50px", "left": "20px", 
    "width": "240px", "height": "120px", "objectFit": "cover", "borderRadius": "4px" 
  }
}

// For text with a preceding icon (ensure 'yourManaCostFieldKey' exists)
{
  "fieldKey": "yourManaCostFieldKey", // Replace
  "type": "iconValue",
  "icon": "Coins", // Lucide icon name
  "style": { "position": "absolute", "top": "20px", "right": "20px" }
}

// For an icon whose name is stored in your card data
// (ensure 'yourIconDataFieldKey' exists and is a 'text' field where you'd store "Zap" or "Shield")
{
  "fieldKey": "yourIconDataFieldKey", // Replace
  "type": "iconFromData",
  "style": { "position": "absolute", "bottom": "20px", "left": "20px" }
}`}
                  </pre>
                  </AccordionContent>
                </AccordionItem>
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
              disabled={isSaving || !templateName.trim() || fields.length === 0 || !originalTemplateId}
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
                    {/* Removed 'Show Element Outlines' toggle */}
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
    
    