
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, ArrowLeft, Eye, Palette, ChevronDown, ChevronRight, Settings, Copy, HelpCircle } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates, type CardTemplateId as ContextCardTemplateId } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, LayoutDefinition } from '@/lib/card-templates';
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
import type { LayoutElementGuiConfig } from '../new/page'; // Import from new page


type CardTemplateId = ContextCardTemplateId;


const COMMON_CARD_SIZES = [ /* ... existing ... */ ];
const NONE_VALUE = "_none_";
const TAILWIND_TEXT_COLORS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_FONT_SIZES: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_FONT_WEIGHTS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_LINE_HEIGHTS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_OVERFLOW: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_TEXT_OVERFLOW: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_BORDER_RADIUS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_BORDER_COLORS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];
const TAILWIND_BACKGROUND_COLORS: Array<{value: string, label: string}> = [ /* ... existing ... */ ];

const BORDER_SIDE_WIDTH_OPTIONS: { value: string; label: string; }[] = [
  { value: NONE_VALUE, label: "None (No Border)" },
  { value: 'default', label: "Default (1px)" },
  { value: '0', label: "0px" },
  { value: '2', label: "2px" },
  { value: '4', label: "4px" },
  { value: '8', label: "8px" },
];

const getSideBorderWidthClass = (side: 't' | 'r' | 'b' | 'l', value: string): string => {
  if (value === NONE_VALUE) return '';
  if (value === 'default') return `border-${side}`;
  return `border-${side}-${value}`;
};


function mapTemplateFieldToFieldDefinition(field: TemplateField, index: number): TemplateFieldDefinition { /* ... existing ... */ }
function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField { /* ... existing ... */ }
const toCamelCase = (str: string): string => { /* ... existing ... */ };
function generateSamplePlaceholderUrl(config: { /* ... */ }): string { /* ... existing ... */ }
const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [ /* ... existing ... */ ];
const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => { /* ... existing ... */ };


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
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>("hsl(var(--card))");
  const [tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(NONE_VALUE);
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");

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
      const initialFields = templateToEdit.fields.map((field, index) => mapTemplateFieldToFieldDefinition(field, index));
      setFields(initialFields);

      const initialLayoutDefString = templateToEdit.layoutDefinition?.trim() ? templateToEdit.layoutDefinition : DEFAULT_CARD_LAYOUT_JSON_STRING;
      setLayoutDefinition(initialLayoutDefString);

      try {
        const parsedLayout = JSON.parse(initialLayoutDefString || '{}') as LayoutDefinition;
        const layoutElements = Array.isArray(parsedLayout.elements) ? parsedLayout.elements : [];

        setCanvasWidthSetting(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`);
        setCanvasBackgroundColor(parsedLayout.backgroundColor || "hsl(var(--card))");
        setCanvasBorderStyle(parsedLayout.borderStyle || "solid");
        
        const matchingPreset = COMMON_CARD_SIZES.find(
          s => s.width === (parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`) && s.height === (parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`)
        );
        setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

        if (parsedLayout.canvasClassName) {
            const classes = parsedLayout.canvasClassName.split(' ');
            const bgColor = classes.find(c => TAILWIND_BACKGROUND_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            if (bgColor !== NONE_VALUE) {
                setTailwindCanvasBackgroundColor(bgColor);
                setCanvasBackgroundColor(''); // Prioritize Tailwind if set
            } else {
                setTailwindCanvasBackgroundColor(NONE_VALUE);
            }
            setTailwindCanvasBorderRadius(classes.find(c => TAILWIND_BORDER_RADIUS.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE);
            setTailwindCanvasBorderColor(classes.find(c => TAILWIND_BORDER_COLORS.some(opt => opt.value === c && c !== NONE_VALUE)) || NONE_VALUE);
        } else { // Fallback for older JSON: try to map direct CSS to Tailwind if possible
            setTailwindCanvasBackgroundColor(parsedLayout.backgroundColor ? `bg-[${String(parsedLayout.backgroundColor)}]` : NONE_VALUE);
            setTailwindCanvasBorderRadius(NONE_VALUE); // No direct simple map from CSS string to Tailwind class
            setTailwindCanvasBorderColor(NONE_VALUE); // No direct simple map
        }


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
            styleRight: existingLayoutElement?.style?.right || '',
            styleBottom: existingLayoutElement?.style?.bottom || '',
            styleMaxHeight: existingLayoutElement?.style?.maxHeight || (field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : (field.type === 'number' ? 'auto' : 'auto'))),
            styleFontStyle: existingLayoutElement?.style?.fontStyle || 'normal',
            styleTextAlign: existingLayoutElement?.style?.textAlign || 'left',
            stylePadding: existingLayoutElement?.style?.padding || '',
            iconName: existingLayoutElement?.icon || (field.type === 'number' ? 'Coins' : ''),
            
            tailwindTextColor: NONE_VALUE, tailwindFontSize: NONE_VALUE, tailwindFontWeight: NONE_VALUE,
            tailwindLineHeight: NONE_VALUE, tailwindOverflow: NONE_VALUE, tailwindTextOverflow: NONE_VALUE,
            tailwindBorderRadius: NONE_VALUE, 
            tailwindBorderColor: NONE_VALUE,
            tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
            tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
          };

          if (existingLayoutElement?.className) {
            const classes = String(existingLayoutElement.className).split(' ');
            config.tailwindTextColor = classes.find(c => TAILWIND_TEXT_COLORS.some(tc => tc.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindFontSize = classes.find(c => TAILWIND_FONT_SIZES.some(ts => ts.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindFontWeight = classes.find(c => TAILWIND_FONT_WEIGHTS.some(tw => tw.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindLineHeight = classes.find(c => TAILWIND_LINE_HEIGHTS.some(tl => tl.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindOverflow = classes.find(c => TAILWIND_OVERFLOW.some(to => to.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindTextOverflow = classes.find(c => TAILWIND_TEXT_OVERFLOW.some(tto => tto.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindBorderRadius = classes.find(c => TAILWIND_BORDER_RADIUS.some(br => br.value === c && c !== NONE_VALUE)) || NONE_VALUE;
            config.tailwindBorderColor = classes.find(c => TAILWIND_BORDER_COLORS.some(bc => bc.value === c && c !== NONE_VALUE)) || NONE_VALUE;

            // Parse per-side border widths
            config.tailwindBorderTopW = classes.find(c => c.startsWith('border-t') && BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('t', opt.value === NONE_VALUE ? '' : opt.value) === c || (opt.value === 'default' && c === 'border-t'))) || NONE_VALUE;
            config.tailwindBorderRightW = classes.find(c => c.startsWith('border-r') && BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('r', opt.value === NONE_VALUE ? '' : opt.value) === c || (opt.value === 'default' && c === 'border-r'))) || NONE_VALUE;
            config.tailwindBorderBottomW = classes.find(c => c.startsWith('border-b') && BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('b', opt.value === NONE_VALUE ? '' : opt.value) === c || (opt.value === 'default' && c === 'border-b'))) || NONE_VALUE;
            config.tailwindBorderLeftW = classes.find(c => c.startsWith('border-l') && BORDER_SIDE_WIDTH_OPTIONS.some(opt => getSideBorderWidthClass('l', opt.value === NONE_VALUE ? '' : opt.value) === c || (opt.value === 'default' && c === 'border-l'))) || NONE_VALUE;
          }
          return config;
        }));

      } catch (e) {
        console.warn("[DEBUG] EditTemplatePage: Could not parse initial layout definition for GUI config:", e);
        setLayoutElementGuiConfigs(initialFields.map((field, index) => {
            const yOffset = 10 + (index % 8) * 35; const xOffset = 10;
            return {
                _uiId: field._uiId || `gui-cfg-edit-fallback-${field.key}-${Date.now()}-${index}`,
                fieldKey: field.key, label: field.label, originalType: field.type,
                isEnabledOnCanvas: true, isExpandedInGui: false,
                elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
                styleTop: `${yOffset}px`, styleLeft: `${xOffset}px`, styleRight: '', styleBottom: '',
                styleMaxHeight: field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : (field.type === 'number' ? 'auto' : 'auto')), 
                iconName: field.type === 'number' ? 'Coins' : '',
                styleFontStyle: 'normal', styleTextAlign: 'left', stylePadding: '',
                tailwindTextColor: NONE_VALUE, tailwindFontSize: NONE_VALUE, tailwindFontWeight: NONE_VALUE,
                tailwindLineHeight: NONE_VALUE, tailwindOverflow: NONE_VALUE, tailwindTextOverflow: NONE_VALUE,
                tailwindBorderRadius: NONE_VALUE, tailwindBorderColor: NONE_VALUE,
                tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
                tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
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

  useEffect(() => { /* ... existing field sync ... */  setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigsMap = new Map(prevConfigs.map(c => [c._uiId, c]));
      const finalConfigs: LayoutElementGuiConfig[] = [];

      fields.forEach((field, index) => {
        const existingConfig = newConfigsMap.get(field._uiId || '');
        if (existingConfig) {
            finalConfigs.push({
                ...existingConfig,
                label: field.label, 
                originalType: field.type, 
                fieldKey: field.key 
            });
        } else {
          const yOffset = 10 + (layoutElementGuiConfigs.length % 8) * 35;
          const xOffset = 10;
          finalConfigs.push({
            _uiId: field._uiId || `gui-cfg-edit-sync-${field.key}-${Date.now()}-${index}`,
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
            isEnabledOnCanvas: true, 
            isExpandedInGui: false,
            elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
            styleTop: `${yOffset}px`,
            styleLeft: `${xOffset}px`,
            styleRight: '', styleBottom: '',
            styleMaxHeight: field.type === 'textarea' ? '80px' : (field.type === 'placeholderImage' ? '140px' : (field.type === 'number' ? 'auto' : 'auto')), 
            iconName: field.type === 'number' ? 'Coins' : '',
            styleFontStyle: 'normal', styleTextAlign: 'left', stylePadding: '',
            tailwindTextColor: NONE_VALUE, tailwindFontSize: NONE_VALUE, tailwindFontWeight: NONE_VALUE,
            tailwindLineHeight: NONE_VALUE, tailwindOverflow: NONE_VALUE, tailwindTextOverflow: NONE_VALUE,
            tailwindBorderRadius: NONE_VALUE, tailwindBorderColor: NONE_VALUE,
            tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
            tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
          });
        }
      });
      return finalConfigs.filter(nc => fields.some(f => f._uiId === nc._uiId));
    });}, [fields]);
  useEffect(() => { /* ... existing sampleCardForPreview generation ... */  console.log('[DEBUG] EditTemplatePage: Generating sampleCardForPreview. Fields count:', fields.length, 'Original ID:', originalTemplateId);
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
    setSampleCardForPreview(generatedSampleCard as CardData);}, [fields, originalTemplateId, templateName, canvasWidthSetting, canvasHeightSetting]);
  const templateForPreview = useMemo((): CardTemplate => ({ /* ... existing ... */ }), [originalTemplateId, templateName, fields, layoutDefinition]);
  const handleAddField = () => { /* ... existing ... */ };
  const handleRemoveField = (uiIdToRemove: string) => { /* ... existing ... */ };
  const handleFieldChange = (uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => { /* ... existing ... */ };
  const handleLayoutDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { /* ... existing ... */ };
  const validateAndFormatLayoutJson = () => { /* ... existing ... */ };
  const handleGuiConfigChange = (targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => { /* ... existing ... */ };
  const handleToggleGuiExpand = (targetUiId: string) => { /* ... existing ... */ };

  const handleGenerateJsonFromBuilder = () => {
    console.log('[DEBUG] EditTemplatePage/handleGenerateJsonFromBuilder: Generating JSON from GUI configs.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: any = { position: "absolute" };
      if (config.styleTop?.trim()) style.top = config.styleTop.trim().endsWith('px') || config.styleTop.trim().endsWith('%') ? config.styleTop.trim() : `${config.styleTop.trim()}px`;
      if (config.styleLeft?.trim()) style.left = config.styleLeft.trim().endsWith('px') || config.styleLeft.trim().endsWith('%') ? config.styleLeft.trim() : `${config.styleLeft.trim()}px`;
      if (config.styleRight?.trim()) style.right = config.styleRight.trim();
      if (config.styleBottom?.trim()) style.bottom = config.styleBottom.trim();
      if (config.styleMaxHeight?.trim()) style.maxHeight = config.styleMaxHeight.trim();
      if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim();
      if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim();
      if (config.stylePadding?.trim()) style.padding = config.stylePadding.trim();
      
      const classNames = [];
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');
      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('text-card-foreground');
      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('text-base');
      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('font-normal');
      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('leading-normal');
      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      else if (config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') classNames.push('overflow-visible');
      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
      
      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);
      
      const borderSideClasses = [
        config.tailwindBorderTopW,
        config.tailwindBorderRightW,
        config.tailwindBorderBottomW,
        config.tailwindBorderLeftW,
      ].filter(w => w && w !== NONE_VALUE);

      if (borderSideClasses.length > 0) {
        classNames.push(...borderSideClasses);
        if (config.tailwindBorderColor && config.tailwindBorderColor !== NONE_VALUE) {
          classNames.push(config.tailwindBorderColor);
        } else {
          classNames.push('border-border'); 
        }
      }
      
      const element: any = {
        fieldKey: config.fieldKey, type: config.elementType, style: style,
        className: classNames.filter(Boolean).join(' ').trim()
      };
      if (config.elementType === 'iconValue' && config.iconName?.trim()) element.icon = config.iconName.trim();
      return element;
    });

    const finalCanvasClassNameParts = [];
    if (tailwindCanvasBackgroundColor && tailwindCanvasBackgroundColor !== NONE_VALUE) finalCanvasClassNameParts.push(tailwindCanvasBackgroundColor);
    if (tailwindCanvasBorderRadius && tailwindCanvasBorderRadius !== NONE_VALUE) finalCanvasClassNameParts.push(tailwindCanvasBorderRadius);
    if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE) finalCanvasClassNameParts.push(tailwindCanvasBorderColor);

    const newLayout: LayoutDefinition = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: tailwindCanvasBackgroundColor === NONE_VALUE ? (canvasBackgroundColor || "hsl(var(--card))") : undefined,
      borderStyle: canvasBorderStyle || "solid",
      canvasClassName: finalCanvasClassNameParts.filter(Boolean).join(' ').trim() || undefined,
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    setLayoutJsonError(null);
    toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in the textarea and preview."});
  };


  const handleSaveTemplate = async () => { /* ... existing ... */ };
  const handleCopyIconName = async (iconName: string) => { /* ... existing ... */ };
  const handleSizePresetChange = (value: string) => { /* ... existing ... */ };
  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: string) => { /* ... existing ... */ };
  const handleCanvasPropertyChange = (
    prop: keyof Pick<EditTemplatePage['state'], 'canvasBackgroundColor' | 'canvasBorderStyle' | 'tailwindCanvasBackgroundColor' | 'tailwindCanvasBorderRadius' | 'tailwindCanvasBorderColor'>,
    value: string
  ) => { /* ... existing ... */ };

  if (isLoadingPage) { /* ... existing ... */ }
  if (errorLoading) { /* ... existing ... */ }
  
  const TAILWIND_BORDER_WIDTHS_OPTIONS = [ // For the global canvas border width dropdown
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "border-0", label: "0px (No Border)"},
    { value: "border", label: "1px"},
    { value: "border-2", label: "2px"},
    { value: "border-4", label: "4px"},
    { value: "border-8", label: "8px"},
  ];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Edit Template</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates"><Palette className="mr-2 h-4 w-4" /> Back to Library</Link>
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
            <h3 className="text-lg font-semibold mb-2">Data Fields</h3>
            <ScrollArea className="pr-2">
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
        {/* Left Column: Layout Builder */}
        <Card className="md:w-[65%] flex flex-col shadow-md mb-6 md:mb-0">
          <CardHeader>
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription className="text-md">
                Configure canvas properties and individual layout elements using the GUI. Click "Generate/Update JSON" to reflect changes in the JSON output and preview.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {/* Card Canvas Setup Section */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <h4 className="text-base font-semibold mb-1">Card Canvas Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                <div>
                  <Label htmlFor="canvasSizePresetEdit" className="text-xs font-medium">Canvas Size Preset</Label>
                  <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving}>
                    <SelectTrigger id="canvasSizePresetEdit" className="mt-1 h-8 text-xs">
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
                      <Label htmlFor="canvasWidthEdit" className="text-xs font-medium">Custom Width (e.g., 280px)</Label>
                      <Input id="canvasWidthEdit" value={canvasWidthSetting} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs"/>
                    </div>
                    <div>
                      <Label htmlFor="canvasHeightEdit" className="text-xs font-medium">Custom Height (e.g., 400px)</Label>
                      <Input id="canvasHeightEdit" value={canvasHeightSetting} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} disabled={isSaving} className="mt-1 h-8 text-xs"/>
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
                  <Label htmlFor="tailwindCanvasBgColorEdit" className="text-xs font-medium">Background Color (Tailwind)</Label>
                  <Select value={tailwindCanvasBackgroundColor} onValueChange={(value) => handleCanvasPropertyChange('tailwindCanvasBackgroundColor', value)} disabled={isSaving}>
                    <SelectTrigger id="tailwindCanvasBgColorEdit" className="mt-1 h-8 text-xs"><SelectValue placeholder="Select color" /></SelectTrigger>
                    <SelectContent>{TAILWIND_BACKGROUND_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={cn(tailwindCanvasBackgroundColor !== NONE_VALUE && "opacity-50")}>
                  <Label htmlFor="canvasBgColorEdit" className="text-xs font-medium">BG Color (Direct CSS)</Label>
                  <Input id="canvasBgColorEdit" value={canvasBackgroundColor} onChange={(e) => handleCanvasPropertyChange('canvasBackgroundColor', e.target.value)} placeholder="e.g., #RRGGBB" disabled={isSaving || tailwindCanvasBackgroundColor !== NONE_VALUE} className="mt-1 h-8 text-xs"/>
                </div>
                <div>
                  <Label htmlFor="tailwindCanvasBorderRadiusEdit" className="text-xs font-medium">Border Radius (Tailwind)</Label>
                  <Select value={tailwindCanvasBorderRadius} onValueChange={(value) => handleCanvasPropertyChange('tailwindCanvasBorderRadius', value)} disabled={isSaving}>
                    <SelectTrigger id="tailwindCanvasBorderRadiusEdit" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TAILWIND_BORDER_RADIUS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tailwindCanvasBorderColorEdit" className="text-xs font-medium">Border Color (Tailwind)</Label>
                   <Select value={tailwindCanvasBorderColor} onValueChange={(value) => handleCanvasPropertyChange('tailwindCanvasBorderColor', value)} disabled={isSaving}>
                    <SelectTrigger id="tailwindCanvasBorderColorEdit" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TAILWIND_BORDER_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="canvasBorderStyleEdit" className="text-xs font-medium">Border Style (CSS)</Label>
                   <Select value={canvasBorderStyle} onValueChange={(value) => handleCanvasPropertyChange('canvasBorderStyle', value)} disabled={isSaving}>
                    <SelectTrigger id="canvasBorderStyleEdit" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Layout Elements (Toggle to Include & Configure) Section */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
               <ScrollArea className="pr-2">
                  <div className="space-y-2">
                    {layoutElementGuiConfigs.map((config) => (
                      <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`enable-edit-${config._uiId}`}
                              checked={config.isEnabledOnCanvas}
                              onCheckedChange={(checked) => handleGuiConfigChange(config._uiId, 'isEnabledOnCanvas', checked)}
                              disabled={isSaving}
                            />
                            <Label htmlFor={`enable-edit-${config._uiId}`} className="text-sm font-medium cursor-pointer">
                              {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span>
                            </Label>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId)} className="h-7 w-7 text-muted-foreground">
                            {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </div>
                        {config.isExpandedInGui && config.isEnabledOnCanvas && (
                          <div className="mt-3 pt-3 border-t border-dashed space-y-4">
                           {/* Element Type & Icon Section */}
                           <details className="space-y-2 group" open>
                            <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                <Settings className="h-3 w-3 mr-1"/> Element Type & Icon
                                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                            </summary>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                            <div>
                              <Label htmlFor={`el-type-edit-${config._uiId}`} className="text-xs">Element Type</Label>
                              <Select value={config.elementType} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'elementType', value)} disabled={isSaving}>
                                <SelectTrigger id={`el-type-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem>
                                  <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem>
                                  <SelectItem value="iconFromData">Icon from Data</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {config.elementType === 'iconValue' && (
                              <div>
                                <Label htmlFor={`el-icon-edit-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                <Input id={`el-icon-edit-${config._uiId}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSaving}/>
                              </div>
                            )}
                          </div>
                          </details>

                            {/* Position & Sizing Section */}
                            <details className="space-y-2 group" open>
                            <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                <Settings className="h-3 w-3 mr-1"/> Position & Sizing (CSS)
                                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                            </summary>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                {['styleTop', 'styleLeft', 'styleRight', 'styleBottom', 'styleMaxHeight', 'stylePadding'].map(prop => (
                                    <div key={prop}>
                                        <Label htmlFor={`el-${prop}-edit-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()}</Label>
                                        <Input id={`el-${prop}-edit-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId, prop as keyof LayoutElementGuiConfig, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving}/>
                                    </div>
                                ))}
                            </div>
                            </details>
                            
                            {/* Typography Section (Conditional) */}
                            {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                              <>
                               <details className="space-y-2 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                    <Settings className="h-3 w-3 mr-1"/> Typography
                                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                                </summary>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                  <div>
                                    <Label htmlFor={`el-twTextColor-edit-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label>
                                    <Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextColor', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextColor-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontSize-edit-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label>
                                    <Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontSize', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontSize-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twFontWeight-edit-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label>
                                    <Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontWeight', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twFontWeight-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twLineHeight-edit-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label>
                                    <Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindLineHeight', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twLineHeight-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select line height" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleFontStyle-edit-${config._uiId}`} className="text-xs">Font Style (CSS)</Label>
                                     <Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleFontStyle', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleFontStyle-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-styleTextAlign-edit-${config._uiId}`} className="text-xs">Text Align (CSS)</Label>
                                    <Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleTextAlign', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-styleTextAlign-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                </details>
                                {/* Overflow & Display Section (Conditional) */}
                                <details className="space-y-2 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                    <Settings className="h-3 w-3 mr-1"/> Overflow & Display (Text - Tailwind)
                                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                                </summary>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-1">
                                  <div>
                                    <Label htmlFor={`el-twOverflow-edit-${config._uiId}`} className="text-xs">Overflow</Label>
                                    <Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindOverflow', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twOverflow-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`el-twTextOverflow-edit-${config._uiId}`} className="text-xs">Text Overflow</Label>
                                    <Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextOverflow', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twTextOverflow-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select text overflow" /></SelectTrigger>
                                      <SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                </details>
                              </>
                            )}
                            {/* Borders Section */}
                            <details className="space-y-2 group" open>
                            <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1.5">
                                <Settings className="h-3 w-3 mr-1"/> Borders
                                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform ml-auto" />
                            </summary>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                              <div>
                                  <Label htmlFor={`el-twBorderRadius-edit-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label>
                                  <Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderRadius', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twBorderRadius-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>{TAILWIND_BORDER_RADIUS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                              <div>
                                  <Label htmlFor={`el-twBorderColor-edit-${config._uiId}`} className="text-xs">Border Color (Tailwind)</Label>
                                  <Select value={config.tailwindBorderColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderColor', value)} disabled={isSaving}>
                                      <SelectTrigger id={`el-twBorderColor-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>{TAILWIND_BORDER_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-1 mt-2">
                                {(['t', 'r', 'b', 'l'] as const).map(side => {
                                    const propKey = `tailwindBorder${side.toUpperCase()}W` as keyof LayoutElementGuiConfig;
                                    return (
                                    <div key={side}>
                                        <Label htmlFor={`el-twBorder${side}W-edit-${config._uiId}`} className="text-xs capitalize">Border {side === 't' ? 'Top' : side === 'r' ? 'Right' : side === 'b' ? 'Bottom' : 'Left'} W</Label>
                                        <Select value={(config as any)[propKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, propKey, value)} disabled={isSaving}>
                                        <SelectTrigger id={`el-twBorder${side}W-edit-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {BORDER_SIDE_WIDTH_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value === NONE_VALUE ? `none-${side}` : `${getSideBorderWidthClass(side, opt.value)}`} value={opt.value === NONE_VALUE ? NONE_VALUE : getSideBorderWidthClass(side, opt.value)}>
                                                {opt.label}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                    </div>
                                    );
                                })}
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

            <Button onClick={handleGenerateJsonFromBuilder} variant="secondary" size="sm" disabled={isSaving || layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0} className="self-start mt-2">
              <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON from Builder
            </Button>

            {/* JSON Textarea and Helper Accordions */}
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
                   <AlertTriangle className="h-4 w-4 !text-destructive-foreground" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
               <Accordion type="single" collapsible className="w-full mt-3" defaultValue="lucide-icon-explorer">
                <AccordionItem value="lucide-icon-explorer">
                   <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center text-muted-foreground">
                      <Copy className="mr-2 h-4 w-4" /> Browse Lucide Icons
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                    <p className="font-semibold mb-1 mt-0">Common Lucide Icons (Click icon to Copy Name):</p>
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

        {/* Right Column: Live Preview */}
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
              This preview updates as you modify the Layout Definition JSON or use the builder.
              Uses sample data based on your field definitions and preview values.
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
