
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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

// Define the structure for the GUI configuration of layout elements
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
  styleFontSize: string;
  iconName?: string;
}


function mapTemplateFieldToFieldDefinition(field: TemplateField): TemplateFieldDefinition {
    // console.log('[DEBUG] EditTemplatePage/mapTemplateFieldToFieldDefinition: Mapping field', field);
    const definition: TemplateFieldDefinition = {
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
    // console.log('[DEBUG] EditTemplatePage/mapTemplateFieldToFieldDefinition: Resulting definition', definition);
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
    // console.log('[DEBUG] EditTemplatePage/mapFieldDefinitionToTemplateField: Resulting field', field);
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
  path += `.png`; 

  let fullUrl = `https://placehold.co/${path}`;
  const text = rawText?.trim();
  if (text) {
    fullUrl += `?text=${encodeURIComponent(text)}`;
  }
  // console.log('[DEBUG] EditTemplatePage/generateSamplePlaceholderUrl: Generated URL', fullUrl, 'from config', config);
  return fullUrl;
}

const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", // Removed "Flash"
  "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) {
    // console.warn(`[DEBUG] IconComponent (EditTemplatePage): Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
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

  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showElementOutlines, setShowElementOutlines] = useState(false);
  const [showPixelGrid, setShowPixelGrid] = useState(false); // New state for pixel grid


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
        
        setCanvasWidthSetting(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`);

        // Initialize GUI configs based on loaded fields and existing layoutDefinition
        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
          const existingLayoutElement = layoutElements.find((el: any) => el.fieldKey === field.key);
          const yOffset = 10 + (index % 8) * 25; // Adjusted default yOffset
          const xOffset = 10;
          return {
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
            isEnabledOnCanvas: !!existingLayoutElement, // True if found in layout
            isExpandedInGui: false,
            elementType: existingLayoutElement?.type || (field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text')),
            styleTop: existingLayoutElement?.style?.top || `${yOffset}px`,
            styleLeft: existingLayoutElement?.style?.left || `${xOffset}px`,
            styleWidth: existingLayoutElement?.style?.width || '120px',
            styleHeight: existingLayoutElement?.style?.height || (field.type === 'textarea' ? '60px' : '20px'),
            styleFontSize: existingLayoutElement?.style?.fontSize || '12px',
            iconName: existingLayoutElement?.icon || (field.type === 'number' ? 'Coins' : ''),
          };
        }));

      } catch (e) {
        console.warn("[DEBUG] EditTemplatePage: Could not parse initial layout definition for GUI config:", e);
        // Fallback initialization if parsing layout fails
        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
            const yOffset = 10 + (index % 8) * 25; // Adjusted default yOffset
            const xOffset = 10;
            return {
                fieldKey: field.key,
                label: field.label,
                originalType: field.type,
                isEnabledOnCanvas: true, // Default to true if parsing fails
                isExpandedInGui: false,
                elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
                styleTop: `${yOffset}px`,
                styleLeft: `${xOffset}px`,
                styleWidth: '120px',
                styleHeight: field.type === 'textarea' ? '60px' : '20px',
                styleFontSize: '12px',
                iconName: field.type === 'number' ? 'Coins' : '',
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
            // If label or originalType changed, update them in GUI config
            return { ...existingConfig, label: field.label, originalType: field.type };
        }
        // Field was added, create new GUI config with defaults
        const yOffset = 10 + (index % 8) * 25; // Adjusted default yOffset
        const xOffset = 10;
        return {
          fieldKey: field.key,
          label: field.label,
          originalType: field.type,
          isEnabledOnCanvas: true, // New fields default to enabled
          isExpandedInGui: false,
          elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
          styleTop: `${yOffset}px`,
          styleLeft: `${xOffset}px`,
          styleWidth: '120px',
          styleHeight: field.type === 'textarea' ? '60px' : '20px',
          styleFontSize: '12px',
          iconName: field.type === 'number' ? 'Coins' : '',
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
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image', bgColor: '444', textColor: 'fff'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, text: 'Background Art', bgColor: '222', textColor: 'ddd'});
    }
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';
    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, originalTemplateId, templateName]);

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
        placeholderConfigWidth: DEFAULT_CANVAS_WIDTH,
        placeholderConfigHeight: 140,
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    console.log('[DEBUG] EditTemplatePage/handleRemoveField: Removing field at index', index);
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, updatedFieldDefinition: TemplateFieldDefinition) => {
    // console.log('[DEBUG] EditTemplatePage/handleFieldChange: Updating field at index', index, updatedFieldDefinition);
    const newFields = [...fields];
    const oldField = newFields[index];
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
        modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth || DEFAULT_CANVAS_WIDTH;
        modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight || 140;
    } else if (updatedFieldDefinition.type !== 'placeholderImage') {
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
      // console.warn('[DEBUG] EditTemplatePage/validateAndFormatLayoutJson: Invalid JSON', e.message);
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
      const element: any = {
        fieldKey: config.fieldKey,
        type: config.elementType,
        style: {
          position: "absolute",
          top: config.styleTop.endsWith('px') ? config.styleTop : `${config.styleTop}px`,
          left: config.styleLeft.endsWith('px') ? config.styleLeft : `${config.styleLeft}px`,
          width: config.styleWidth.endsWith('px') ? config.styleWidth : `${config.styleWidth}px`,
          height: config.styleHeight.endsWith('px') ? config.styleHeight : `${config.styleHeight}px`,
          fontSize: config.styleFontSize.endsWith('px') ? config.styleFontSize : `${config.styleFontSize}px`,
        },
        className: "text-card-foreground"
      };
      if (config.elementType === 'iconValue' && config.iconName) {
        element.icon = config.iconName;
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
    // Validate JSON from the textarea before saving
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
        finalLayoutDefinition = DEFAULT_CARD_LAYOUT_JSON_STRING; // Fallback
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
      <Card className="shadow-lg border-border/60">
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
              <Label htmlFor="templateName" className="font-semibold text-foreground/90">Template Name</Label>
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
              <Label htmlFor="templateIdDisplay" className="font-semibold text-foreground/90">Template ID (Auto-generated, Read-only)</Label>
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
            <h3 className="text-xl font-semibold mb-3 text-foreground/90">Data Fields</h3>
             <ScrollArea className="pr-3"> {/* Allow this section to grow naturally */}
                <div className="space-y-3">
                    {fields.map((field, index) => (
                    <FieldRow
                        key={index} 
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
        <Card className="md:w-[65%] flex flex-col shadow-lg border-border/60">
          <CardHeader>
              <CardTitle className="text-2xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription className="text-md">
                Configure canvas size and individual layout elements. Generate JSON to preview and save.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-lg font-semibold mb-2 text-foreground/90">Card Canvas Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="canvasWidthEdit" className="text-sm font-medium">Canvas Width (e.g., 280px)</Label>
                  <Input id="canvasWidthEdit" value={canvasWidthSetting} onChange={(e) => setCanvasWidthSetting(e.target.value)} disabled={isSaving} className="mt-1 h-9 text-sm"/>
                </div>
                <div>
                  <Label htmlFor="canvasHeightEdit" className="text-sm font-medium">Canvas Height (e.g., 400px)</Label>
                  <Input id="canvasHeightEdit" value={canvasHeightSetting} onChange={(e) => setCanvasHeightSetting(e.target.value)} disabled={isSaving} className="mt-1 h-9 text-sm"/>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-lg font-semibold mb-2 text-foreground/90">Layout Elements Configuration</h4>
               {layoutElementGuiConfigs.length > 0 ? (
                <ScrollArea className="pr-2"> {/* Removed max-h to fit all */}
                  <div className="space-y-2">
                    {layoutElementGuiConfigs.map((config, index) => (
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
                        {config.isExpandedInGui && (
                          <div className="mt-3 pt-3 border-t border-dashed space-y-3">
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
                            <p className="text-xs text-muted-foreground font-medium mt-2">Styling (px values):</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <Label htmlFor={`el-top-edit-${config.fieldKey}`} className="text-xs">Top</Label>
                                <Input id={`el-top-edit-${config.fieldKey}`} value={config.styleTop} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleTop', e.target.value)} className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                              <div>
                                <Label htmlFor={`el-left-edit-${config.fieldKey}`} className="text-xs">Left</Label>
                                <Input id={`el-left-edit-${config.fieldKey}`} value={config.styleLeft} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleLeft', e.target.value)} className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                              <div>
                                <Label htmlFor={`el-width-edit-${config.fieldKey}`} className="text-xs">Width</Label>
                                <Input id={`el-width-edit-${config.fieldKey}`} value={config.styleWidth} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleWidth', e.target.value)} className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                              <div>
                                <Label htmlFor={`el-height-edit-${config.fieldKey}`} className="text-xs">Height</Label>
                                <Input id={`el-height-edit-${config.fieldKey}`} value={config.styleHeight} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleHeight', e.target.value)} className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                              <div className="sm:col-span-2">
                                <Label htmlFor={`el-fontsize-edit-${config.fieldKey}`} className="text-xs">Font Size</Label>
                                <Input id={`el-fontsize-edit-${config.fieldKey}`} value={config.styleFontSize} onChange={(e) => handleGuiConfigChange(config.fieldKey, 'styleFontSize', e.target.value)} className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No data fields defined yet to build layout elements.</p>
              )}
            </div>
            
            <Button onClick={handleGenerateJsonFromBuilder} variant="secondary" size="sm" disabled={isSaving || layoutElementGuiConfigs.length === 0} className="self-start mt-2">
              <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON from Builder
            </Button>
            
            <div className="mt-4 flex-grow flex flex-col min-h-0">
              <div>
                <Label htmlFor="layoutDefinitionEdit" className="text-sm font-medium">Layout Definition JSON (Manually edit if needed)</Label>
                <Textarea
                  id="layoutDefinitionEdit"
                  value={layoutDefinition}
                  onChange={handleLayoutDefinitionChange}
                  onBlur={validateAndFormatLayoutJson}
                  placeholder='Click "Generate/Update JSON from Builder" above, or paste your JSON here if making manual edits.'
                  rows={15}
                  className="font-mono text-xs flex-grow min-h-[200px] max-h-[300px] bg-muted/20 mt-1"
                  disabled={isSaving}
                />
              </div>
              {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
              <Accordion type="single" collapsible className="w-full mt-3" defaultValue="layout-guide">
                <AccordionItem value="layout-guide">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center text-muted-foreground">
                      <HelpCircle className="mr-2 h-4 w-4" /> Show Layout JSON Guide
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                    <p className="font-semibold mb-1">Top-level properties:</p>
                    <ul className="list-disc list-inside pl-2 mb-2 space-y-0.5">
                      <li><code>width</code>, <code>height</code>: Card dimensions (e.g., "{DEFAULT_CANVAS_WIDTH}px"). Set these in "Card Canvas Setup" above.</li>
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
                    <p className="text-xs mt-1 mb-2">Use these keys in the <code>fieldKey</code> property of elements below if manually editing JSON.</p>
                    <p className="font-semibold mb-1 mt-3"><code>elements</code> array (each object defines one visual piece):</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li><strong><code>fieldKey</code></strong>: (String) **Must exactly match** a 'Field Key' from the list above (e.g., if you have "Card Title" with key "cardTitle", use "cardTitle").</li>
                      <li><strong><code>type</code></strong>: (String) One of: <code>"text"</code>, <code>"textarea"</code>, <code>"image"</code>, <code>"iconValue"</code>, <code>"iconFromData"</code>. The builder currently defaults to "text".</li>
                      <li><strong><code>style</code></strong>: (Object) CSS-in-JS. The builder generates basic positional styles.</li>
                      <li><strong><code>className</code></strong>: (String, Optional) Tailwind CSS classes.</li>
                      <li><strong><code>prefix</code> / <code>suffix</code></strong>: (String, Optional) For "text", "iconValue". Text added before/after the field's value.</li>
                      <li><strong><code>icon</code></strong>: (String, Optional) For "iconValue" type. Name of a Lucide icon. **Ensure the icon exists in lucide-react.**</li>
                    </ul>
                    <p className="mt-3 italic">After generating JSON with the builder, you can manually refine it in the textarea if needed, then validate by blurring. Final save uses the textarea content.</p>
                    <p className="font-semibold mb-1 mt-4">Example Element Snippets (for manual JSON editing):</p>
                    <pre className="text-xs bg-background/50 p-2 rounded border whitespace-pre-wrap">
{`// For a simple text display
{
  "fieldKey": "yourCardNameFieldKey", // Replace with one of YOUR field keys from above
  "type": "text",
  "style": { "position": "absolute", "top": "20px", "left": "20px", "fontWeight": "bold" }
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
        
        <Card className="md:w-[35%] sticky top-20 self-start shadow-lg border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center">
                    <Eye className="mr-2 h-5 w-5" /> Live Layout Preview
                </CardTitle>
                <div className="flex items-center space-x-2">
                    <Switch id="show-outlines-edit" checked={showElementOutlines} onCheckedChange={setShowElementOutlines} aria-label="Show element outlines" />
                    <Label htmlFor="show-outlines-edit" className="text-xs text-muted-foreground">Outlines</Label>
                    <Switch id="show-pixel-grid-edit" checked={showPixelGrid} onCheckedChange={setShowPixelGrid} aria-label="Show pixel grid" />
                    <Label htmlFor="show-pixel-grid-edit" className="text-xs text-muted-foreground">Pixel Grid</Label>
                </div>
            </div>
            <CardDescription className="text-sm">
              This preview updates as you modify the Layout Definition or template fields.
              Uses sample data based on your field definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 rounded-b-md">
            {sampleCardForPreview && templateForPreview ? (
              <DynamicCardRenderer
                card={sampleCardForPreview}
                template={templateForPreview}
                showElementOutlines={showElementOutlines}
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

