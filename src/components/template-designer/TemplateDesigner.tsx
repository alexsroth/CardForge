
// src/components/template-designer/TemplateDesigner.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, Eye, Palette, HelpCircle, Copy, ChevronDown, ChevronRight, Settings, EllipsisVertical } from 'lucide-react';
import FieldRow from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, type CardTemplate, type CardTemplateId } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as LucideIcons from 'lucide-react';

import {
  NONE_VALUE,
  COMMON_CARD_SIZES,
  TAILWIND_TEXT_COLORS,
  TAILWIND_FONT_SIZES,
  TAILWIND_FONT_WEIGHTS,
  TAILWIND_LINE_HEIGHTS,
  TAILWIND_OVERFLOW,
  TAILWIND_TEXT_OVERFLOW,
  TAILWIND_BORDER_RADIUS_OPTIONS,
  BORDER_SIDE_WIDTH_OPTIONS,
  TAILWIND_BORDER_PALETTE_OPTIONS,
  TAILWIND_BACKGROUND_COLORS,
  commonLucideIconsForGuide,
  toCamelCase,
  generateSamplePlaceholderUrl,
  getSideBorderWidthClass,
  getSideBorderColorClass,
  findTailwindClassValue,
  findSideBorderClassValue,
  IconComponent as ImportedIconComponent, // Renamed to avoid conflict
  mapFieldDefinitionToTemplateField,
  mapTemplateFieldToFieldDefinition,
  type TemplateFieldDefinition,
  type LayoutElementGuiConfig,
} from '@/lib/card-designer';


interface TemplateDesignerProps {
  mode: "create" | "edit";
  initialTemplate?: CardTemplate;
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{success: boolean, message?: string}>;
  isSavingTemplate?: boolean; // Prop to indicate saving is in progress from parent
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

// Local IconComponent to avoid prop drilling or context for this specific use case
const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon || typeof Icon !== 'function') {
    console.warn(`[TemplateDesigner] Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} className={cn(props.className, "h-4 w-4")} />;
  }
  return <Icon {...props} className={cn(props.className, "h-4 w-4")} />;
};


export function TemplateDesigner({
  mode,
  initialTemplate,
  onSave,
  isSavingTemplate = false, // Default value
  isLoadingContexts = false,
  existingTemplateIds = [],
}: TemplateDesignerProps) {
  console.log(`[DEBUG] TemplateDesigner: Rendering in ${mode} mode.`);
  if (mode === 'edit' && initialTemplate) {
    console.log('[DEBUG] TemplateDesigner: Initial template for edit:', initialTemplate.name);
  }

  const { toast } = useToast();

  const [templateName, setTemplateName] = useState<string>(initialTemplate?.name || '');
  const [templateId, setTemplateId] = useState<string>(initialTemplate?.id || '');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>(
    initialTemplate?.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, idx)) || []
  );
  const [layoutDefinition, setLayoutDefinition] = useState<string>(
    initialTemplate?.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING
  );
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  
  const guiBuilderLastUpdateRef = useRef<number>(0);
  // const jsonEditorLastUpdateRef = useRef<number>(0); // If needed for complex sync

  // Canvas Setup State
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(COMMON_CARD_SIZES[0].value);
  const [tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor] = useState<string>(NONE_VALUE);
  const [canvasDirectBackgroundColor, setCanvasDirectBackgroundColor] = useState<string>('hsl(var(--card))');
  const [tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth] = useState<string>(NONE_VALUE);
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");
  
  // Layout Element GUI Configs State
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  // Derive Template ID from Name for "create" mode
  useEffect(() => {
    if (mode === 'create') {
      console.log('[DEBUG] TemplateDesigner: create mode - templateName changed, updating templateId.');
      if (templateName.trim()) {
        const newId = toCamelCase(templateName.trim());
        setTemplateId(newId || 'untitledTemplate');
      } else {
        setTemplateId('');
      }
    }
  }, [templateName, mode]);

  // Initialize form state from initialTemplate in "edit" mode
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: useEffect for initialTemplate (edit mode). Mode:', mode, 'InitialTemplate ID:', initialTemplate?.id);
    if (mode === 'edit' && initialTemplate) {
      setTemplateName(initialTemplate.name);
      setTemplateId(initialTemplate.id);
      setFields(initialTemplate.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, idx)));
      const initialLayoutDef = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
      setLayoutDefinition(initialLayoutDef);
      // Parse initialLayoutDef to populate GUI builder states
      try {
        const parsedLayout = JSON.parse(initialLayoutDef.trim() || DEFAULT_CARD_LAYOUT_JSON_STRING);
        setCanvasWidthSetting(String(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`));
        setCanvasHeightSetting(String(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`));

        const matchingPreset = COMMON_CARD_SIZES.find(s => s.width === String(parsedLayout.width) && s.height === String(parsedLayout.height));
        setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

        // Canvas Tailwind classes
        const canvasClasses = parsedLayout.canvasClassName?.split(' ') || [];
        setTailwindCanvasBackgroundColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BACKGROUND_COLORS));
        setTailwindCanvasBorderRadius(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_RADIUS_OPTIONS));
        
        const twBorderWidthClass = canvasClasses.find(cls => cls.startsWith('border') && !cls.startsWith('border-') && (cls === 'border' || /border-\d/.test(cls)));
        const twBorderWidthValue = twBorderWidthClass === 'border' ? 'default' : twBorderWidthClass?.replace('border-', '') || NONE_VALUE;
        setTailwindCanvasBorderWidth(twBorderWidthValue);

        const twBorderColorClass = canvasClasses.find(cls => cls.startsWith('border-') && !(/border-(t|r|b|l)-/.test(cls)) && !(/border-\d/.test(cls)) && cls !== 'border-solid' && cls !== 'border-dashed' && cls !== 'border-dotted' && cls !== 'border-none' && cls !== 'border' );
        setTailwindCanvasBorderColor(twBorderColorClass?.replace('border-', '') || NONE_VALUE);
        
        setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || 'hsl(var(--card))')); // Fallback if no Tailwind BG class
        setCanvasBorderStyle(String(parsedLayout.borderStyle || "solid"));

      } catch (e) {
        console.error("[DEBUG] TemplateDesigner: Could not parse initial layout definition for GUI state:", e);
        setLayoutJsonError(`Failed to parse initial Layout JSON for GUI: ${String(e)}`);
        // Keep default GUI values if initial JSON is bad
      }
    } else if (mode === 'create') {
      // Reset/initialize for create mode (might be redundant if state defaults are good)
      setTemplateName('');
      setTemplateId('');
      setFields([]);
      setLayoutDefinition(DEFAULT_CARD_LAYOUT_JSON_STRING);
      // Reset canvas GUI state to defaults for create mode
      setCanvasWidthSetting(`${DEFAULT_CANVAS_WIDTH}px`);
      setCanvasHeightSetting(`${DEFAULT_CANVAS_HEIGHT}px`);
      setSelectedSizePreset(COMMON_CARD_SIZES.find(s => s.width === `${DEFAULT_CANVAS_WIDTH}px` && s.height === `${DEFAULT_CANVAS_HEIGHT}px`)?.value || COMMON_CARD_SIZES[0].value);
      setTailwindCanvasBackgroundColor(TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE);
      setCanvasDirectBackgroundColor('hsl(var(--card))');
      setTailwindCanvasBorderRadius(TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-md")?.value || NONE_VALUE);
      setTailwindCanvasBorderColor(TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE);
      setTailwindCanvasBorderWidth(BORDER_SIDE_WIDTH_OPTIONS.find(opt => opt.label === "1px" && opt.value === "default")?.value || NONE_VALUE);
      setCanvasBorderStyle("solid");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialTemplate]); // Only run when mode or initialTemplate changes


  // Sync layoutElementGuiConfigs with data fields (fields array)
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Syncing GUI configs with data fields. Fields count:', fields.length);
    setLayoutElementGuiConfigs(prevConfigs => {
      const existingConfigsByUiIdMap = new Map(prevConfigs.map(c => [c._uiId, c]));
      const newConfigs: LayoutElementGuiConfig[] = [];

      fields.forEach((field, index) => {
        let config = existingConfigsByUiIdMap.get(field._uiId!);
        const defaultTopValue = `${10 + (index % 8) * 25}px`; // Reduced default cascade
        const defaultLeftValue = '10px';

        if (config) {
          newConfigs.push({
            ...config,
            fieldKey: field.key, // Ensure fieldKey is updated if label changed
            label: field.label,
            originalType: field.type,
          });
        } else {
          console.log('[DEBUG] TemplateDesigner: New data field UI detected, creating default GUI config for:', field.label);
          newConfigs.push({
            _uiId: field._uiId || `gui-new-${field.key}-${Date.now()}-${index}`,
            fieldKey: field.key,
            label: field.label,
            originalType: field.type,
            isEnabledOnCanvas: false, // Default to false for new fields
            isExpandedInGui: false,
            elementType: field.type === 'textarea' ? 'textarea' : (field.type === 'placeholderImage' ? 'image' : 'text'),
            iconName: field.type === 'number' ? 'Coins' : '',
            
            styleTop: defaultTopValue, styleLeft: defaultLeftValue, styleRight: '', styleBottom: '',
            styleMaxHeight: '', stylePadding: '',
            styleFontStyle: 'normal', styleTextAlign: 'left',
            styleBorderTop: '', styleBorderBottom: '',

            tailwindTextColor: TAILWIND_TEXT_COLORS.find(c => c.value === 'text-black')?.value || NONE_VALUE,
            tailwindFontSize: NONE_VALUE,
            tailwindFontWeight: NONE_VALUE,
            tailwindLineHeight: NONE_VALUE,
            tailwindOverflow: NONE_VALUE,
            tailwindTextOverflow: NONE_VALUE,
            
            tailwindBorderRadius: NONE_VALUE,
            tailwindBorderTopW: NONE_VALUE, tailwindBorderTopColor: NONE_VALUE,
            tailwindBorderRightW: NONE_VALUE, tailwindBorderRightColor: NONE_VALUE,
            tailwindBorderBottomW: NONE_VALUE, tailwindBorderBottomColor: NONE_VALUE,
            tailwindBorderLeftW: NONE_VALUE, tailwindBorderLeftColor: NONE_VALUE,
          });
        }
      });
      // Filter out configs for fields that might have been removed
      const currentFieldUiIds = new Set(fields.map(f => f._uiId));
      return newConfigs.filter(nc => currentFieldUiIds.has(nc._uiId));
    });
  }, [fields]);


  // Effect to parse layoutDefinition and populate GUI controls
  // This runs when layoutDefinition changes (e.g., from textarea or loaded from template) OR when switching to GUI view
  useEffect(() => {
    if (activeEditorView === 'json' && mode === 'create') return; // Don't parse if JSON editor active and creating (allow manual JSON input)
    // if (jsonEditorLastUpdateRef.current > guiBuilderLastUpdateRef.current && activeEditorView === 'gui') {
    //   // JSON editor was the last source of truth, and we are in GUI view, so update GUI
    //   console.log('[DEBUG] TemplateDesigner: JSON editor changed, attempting to parse and update GUI state.');
    // } else if (activeEditorView === 'gui' && guiBuilderLastUpdateRef.current === 0) {
    //    // Initial load in GUI view, or switched to GUI view
    //    console.log('[DEBUG] TemplateDesigner: Switched to GUI view or initial load, parsing JSON for GUI.');
    // } else {
    //   // console.log('[DEBUG] TemplateDesigner: GUI population skipped (neither JSON editor changed nor switched to GUI).');
    //   return;
    // }
    console.log('[DEBUG] TemplateDesigner: layoutDefinition string changed or view switched to GUI, attempting to parse JSON and update GUI state. Active View:', activeEditorView);
    
    let parsedLayout: any; // Using 'any' for parsedLayout as its structure comes from user JSON
    const defaultParsedLayoutForStructure = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);


    try {
      parsedLayout = JSON.parse(layoutDefinition.trim() || DEFAULT_CARD_LAYOUT_JSON_STRING);
    } catch (e) {
      console.error("[DEBUG] TemplateDesigner: Could not parse layout definition for GUI update:", e);
      // Don't set layoutJsonError here if GUI is active, as it might be an intermediate state from GUI update.
      // If JSON editor is active, error will be shown there.
      // For GUI mode, if JSON is broken, we might want to show a warning but not block GUI usage.
      // Fallback to default if parsing fails completely for GUI setup.
      parsedLayout = defaultParsedLayoutForStructure;
      if (activeEditorView === 'json') setLayoutJsonError(`Failed to parse Layout JSON: ${String(e)}. Default structure used for GUI if switched.`);
    }

    // --- Populate Canvas Setup GUI State ---
    setCanvasWidthSetting(String(parsedLayout.width || defaultParsedLayoutForStructure.width));
    setCanvasHeightSetting(String(parsedLayout.height || defaultParsedLayoutForStructure.height));
    
    const matchingPreset = COMMON_CARD_SIZES.find(s => s.width === String(parsedLayout.width) && s.height === String(parsedLayout.height));
    setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

    // Canvas Tailwind classes
    const canvasClasses = parsedLayout.canvasClassName?.split(' ') || [];
    setTailwindCanvasBackgroundColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BACKGROUND_COLORS));
    setTailwindCanvasBorderRadius(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_RADIUS_OPTIONS));
    
    const twBorderWidthClass = canvasClasses.find(cls => cls.startsWith('border') && !cls.startsWith('border-') && (cls === 'border' || /border-\d/.test(cls)));
    const twBorderWidthValue = twBorderWidthClass === 'border' ? 'default' : twBorderWidthClass?.replace('border-', '') || NONE_VALUE;
    setTailwindCanvasBorderWidth(twBorderWidthValue);

    const twBorderColorClass = canvasClasses.find(cls => cls.startsWith('border-') && !(/border-(t|r|b|l)-/.test(cls)) && !(/border-\d/.test(cls)) && cls !== 'border-solid' && cls !== 'border-dashed' && cls !== 'border-dotted' && cls !== 'border-none' && cls !== 'border' );
    setTailwindCanvasBorderColor(twBorderColorClass?.replace('border-', '') || NONE_VALUE);
    
    // Direct CSS fallbacks if no Tailwind class is present
    setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || defaultParsedLayoutForStructure.backgroundColor));
    setCanvasBorderStyle(String(parsedLayout.borderStyle || defaultParsedLayoutForStructure.borderStyle));


    // --- Populate Layout Element GUI Configs ---
     if (!fields || fields.length === 0 && parsedLayout.elements && parsedLayout.elements.length > 0) {
        // This scenario (no data fields but layout has elements) might indicate a mismatch.
        // For now, if no fields defined, element GUI configs will also be empty or based on empty fields array.
        console.log('[DEBUG] TemplateDesigner: No data fields defined, but layout has elements. GUI elements will be based on current (empty) fields.');
        // Ensure we clear out GUI configs if fields are empty but JSON wasn't
        if(fields.length === 0) setLayoutElementGuiConfigs([]);
        // return; // Exiting early might prevent necessary updates if fields are added later.
    }
    if (!fields) {
        console.warn('[DEBUG] TemplateDesigner: `fields` is undefined. Cannot populate element GUI configs.');
        return;
    }


    const elementsFromJsonMap = new Map((parsedLayout.elements || []).map((el: any) => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(prevGuiConfigs => {
       // We need to map over the current `fields` to ensure GUI configs align with defined data fields
      return fields.map((fieldDef, index) => {
        const existingJsonElement = elementsFromJsonMap.get(fieldDef.key);
        const prevConfigForUiId = prevGuiConfigs.find(p => p._uiId === fieldDef._uiId);
        
        const defaultTopValue = `${10 + (index % 8) * 25}px`;
        const defaultLeftValue = '10px';

        let config: LayoutElementGuiConfig = {
          _uiId: fieldDef._uiId!,
          fieldKey: fieldDef.key,
          label: fieldDef.label,
          originalType: fieldDef.type,
          isEnabledOnCanvas: !!existingJsonElement,
          isExpandedInGui: prevConfigForUiId?.isExpandedInGui || false,

          elementType: existingJsonElement?.type || (fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text')),
          iconName: existingJsonElement?.icon || (fieldDef.type === 'number' ? 'Coins' : ''),
          
          styleTop: existingJsonElement?.style?.top ?? (existingJsonElement ? '' : defaultTopValue),
          styleLeft: existingJsonElement?.style?.left ?? (existingJsonElement ? '' : defaultLeftValue),
          styleRight: existingJsonElement?.style?.right ?? '',
          styleBottom: existingJsonElement?.style?.bottom ?? '',
          styleMaxHeight: existingJsonElement?.style?.maxHeight ?? (fieldDef.type === 'textarea' ? 'auto' : ''),
          stylePadding: existingJsonElement?.style?.padding ?? '',
          styleFontStyle: existingJsonElement?.style?.fontStyle ?? 'normal',
          styleTextAlign: existingJsonElement?.style?.textAlign ?? 'left',
          styleBorderTop: existingJsonElement?.style?.borderTop ?? '',
          styleBorderBottom: existingJsonElement?.style?.borderBottom ?? '',
          
          tailwindTextColor: findTailwindClassValue(existingJsonElement?.className, TAILWIND_TEXT_COLORS, NONE_VALUE) || TAILWIND_TEXT_COLORS.find(c=>c.value==='text-black')?.value || NONE_VALUE,
          tailwindFontSize: findTailwindClassValue(existingJsonElement?.className, TAILWIND_FONT_SIZES, NONE_VALUE),
          tailwindFontWeight: findTailwindClassValue(existingJsonElement?.className, TAILWIND_FONT_WEIGHTS, NONE_VALUE),
          tailwindLineHeight: findTailwindClassValue(existingJsonElement?.className, TAILWIND_LINE_HEIGHTS, NONE_VALUE),
          tailwindOverflow: findTailwindClassValue(existingJsonElement?.className, TAILWIND_OVERFLOW, NONE_VALUE),
          tailwindTextOverflow: findTailwindClassValue(existingJsonElement?.className, TAILWIND_TEXT_OVERFLOW, NONE_VALUE),
          
          tailwindBorderRadius: findTailwindClassValue(existingJsonElement?.className, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE),
          
          tailwindBorderTopW: findSideBorderClassValue(existingJsonElement?.className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderTopColor: findSideBorderClassValue(existingJsonElement?.className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderRightW: findSideBorderClassValue(existingJsonElement?.className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderRightColor: findSideBorderClassValue(existingJsonElement?.className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderBottomW: findSideBorderClassValue(existingJsonElement?.className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderBottomColor: findSideBorderClassValue(existingJsonElement?.className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderLeftW: findSideBorderClassValue(existingJsonElement?.className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
          tailwindBorderLeftColor: findSideBorderClassValue(existingJsonElement?.className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE),
        };
        
        if (!existingJsonElement) { // If element not in JSON, ensure it's correctly defaulted
            config.styleTop = defaultTopValue;
            config.styleLeft = defaultLeftValue;
            config.styleRight = ''; // Ensure these are blank if not in JSON
            config.styleBottom = '';
        }
        return config;
      });
    });
    if (activeEditorView === 'gui') {
      setLayoutJsonError(null); // Clear JSON error if GUI is active and just successfully parsed/updated
    }
    // guiBuilderLastUpdateRef.current = Date.now(); // Mark GUI as successfully updated from JSON
    console.log('[DEBUG] TemplateDesigner: GUI controls populated from JSON.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutDefinition, activeEditorView, fields, mode]); // Key dependencies for re-parsing and populating GUI


  // Generate sample card data for live preview
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Generating sampleCardForPreview.');
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
          case 'number': valueForPreview = Math.floor(Math.random() * 10); break;
          case 'boolean': valueForPreview = Math.random() > 0.5; break;
          case 'select':
            const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
            valueForPreview = firstOptionValue || `Option Sample`;
            break;
          default: valueForPreview = `Value for ${fieldDef.label}`;
        }
      }
      (generatedSampleCard as any)[key] = valueForPreview;
    });
    
    if (generatedSampleCard.name === undefined && !fields.some(f => f.key === 'name')) generatedSampleCard.name = templateName || 'Awesome Card Name';
    if (generatedSampleCard.cost === undefined && !fields.some(f => f.key === 'cost')) generatedSampleCard.cost = 3;
    if (generatedSampleCard.imageUrl === undefined && !fields.some(f => f.key === 'imageUrl')) {
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH, height: 140, text: 'Main Image'});
    }
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH, height: parseInt(canvasHeightSetting.replace('px','')) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art'});
    }
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';

    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, templateId, templateName, canvasWidthSetting, canvasHeightSetting]);

  const templateForPreview = useMemo((): CardTemplate => {
    console.log('[DEBUG] TemplateDesigner: Recalculating templateForPreview.');
    return {
      id: (templateId || 'previewTemplateId') as CardTemplateId,
      name: templateName || 'Preview Template Name',
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition,
    };
  }, [templateId, templateName, fields, layoutDefinition]);

  const handleAddField = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: handleAddField called.');
    const newFieldBaseLabel = `New Field`;
    let newFieldLabel = `${newFieldBaseLabel} ${fields.length + 1}`;
    let counter = fields.length + 1;
    while(fields.some(f => f.label === newFieldLabel)) {
        counter++;
        newFieldLabel = `${newFieldBaseLabel} ${counter}`;
    }
    let baseKey = toCamelCase(newFieldLabel);
    if (!baseKey) baseKey = `newField${fields.length + 1}`; // Fallback if label results in empty key
    let newKey = baseKey;
    let keyCounter = 1;
    while (fields.some(f => f.key === newKey)) {
        newKey = `${baseKey}${keyCounter}`;
        keyCounter++;
    }
    const newUiId = `field-${mode}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  }, [fields, canvasWidthSetting, mode]);

  const handleRemoveField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] TemplateDesigner: handleRemoveField called for _uiId:', uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
    // Corresponding layoutElementGuiConfig will be removed by the useEffect watching 'fields'
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] TemplateDesigner: handleFieldChange called for _uiId:', uiIdToUpdate, 'with data:', updatedFieldDefinition);
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
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth ?? (parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH);
            modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight ?? 140;
          } else if (updatedFieldDefinition.type && updatedFieldDefinition.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
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

  const handleSizePresetChange = (value: string) => {
    console.log('[DEBUG] TemplateDesigner: handleSizePresetChange called with value:', value);
    setSelectedSizePreset(value);
     if (value === "custom") {
      // User will edit inputs directly
    } else if (value === "defaultFromLayout") {
        const parsed = JSON.parse(layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING);
        setCanvasWidthSetting(String(parsed.width || `${DEFAULT_CANVAS_WIDTH}px`));
        setCanvasHeightSetting(String(parsed.height || `${DEFAULT_CANVAS_HEIGHT}px`));
    } else {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
  };

  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: string) => {
    console.log('[DEBUG] TemplateDesigner: handleCustomDimensionChange for', dimension, 'to', value);
    if (dimension === 'width') {
      setCanvasWidthSetting(value);
    } else {
      setCanvasHeightSetting(value);
    }
    if (selectedSizePreset !== "custom") {
      setSelectedSizePreset("custom");
    }
  };
  
  const handleCanvasTailwindChange = (
    prop: 'tailwindCanvasBackgroundColor' | 'tailwindCanvasBorderRadius' | 'tailwindCanvasBorderColor' | 'tailwindCanvasBorderWidth',
    value: string
  ) => {
     console.log('[DEBUG] TemplateDesigner: handleCanvasTailwindChange for', prop, 'to', value);
     switch(prop) {
      case 'tailwindCanvasBackgroundColor': setTailwindCanvasBackgroundColor(value); break;
      case 'tailwindCanvasBorderRadius': setTailwindCanvasBorderRadius(value); break;
      case 'tailwindCanvasBorderColor': setTailwindCanvasBorderColor(value); break;
      case 'tailwindCanvasBorderWidth': setTailwindCanvasBorderWidth(value); break;
      default: console.warn("Unhandled canvas Tailwind property change:", prop);
    }
  };
  
  const handleCanvasDirectCSSChange = (
    prop: 'canvasDirectBackgroundColor' | 'canvasBorderStyle',
    value: string
  ) => {
    console.log('[DEBUG] TemplateDesigner: handleCanvasDirectCSSChange for', prop, 'to', value);
     switch(prop) {
      case 'canvasDirectBackgroundColor': setCanvasDirectBackgroundColor(value); break;
      case 'canvasBorderStyle': setCanvasBorderStyle(value); break;
      default: console.warn("Unhandled canvas direct CSS property change:", prop);
    }
  };

  const handleGuiConfigChange = useCallback((targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => {
    console.log('[DEBUG] TemplateDesigner: handleGuiConfigChange for _uiId:', targetUiId, 'property:', property, 'value:', value);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, [property]: value } : config
      )
    );
  }, []);

  const handleToggleGuiExpand = useCallback((targetUiId: string) => {
    console.log('[DEBUG] TemplateDesigner: handleToggleGuiExpand for _uiId:', targetUiId);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, isExpandedInGui: !config.isExpandedInGui } : { ...config, isExpandedInGui: false }
      )
    );
  }, []);

  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true) => {
    console.log('[DEBUG] TemplateDesigner: handleGenerateJsonFromBuilder called.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: React.CSSProperties & { [key: string]: any } = { position: "absolute" };

      const addStyleIfPresent = (key: keyof React.CSSProperties, value: string | undefined) => {
        if (value?.trim()) style[key] = value.trim();
      };

      addStyleIfPresent('top', config.styleTop);
      addStyleIfPresent('left', config.styleLeft);
      addStyleIfPresent('right', config.styleRight);
      addStyleIfPresent('bottom', config.styleBottom);
      addStyleIfPresent('maxHeight', config.styleMaxHeight);
      addStyleIfPresent('padding', config.stylePadding);
      if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim() as React.CSSProperties['fontStyle'];
      if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim() as React.CSSProperties['textAlign'];
      if (config.styleBorderTop?.trim()) style.borderTop = config.styleBorderTop.trim();
      if (config.styleBorderBottom?.trim()) style.borderBottom = config.styleBorderBottom.trim();
      
      const classNames: string[] = [];
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');
      
      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && !classNames.some(c => c.startsWith('text-'))) {
        classNames.push('text-black');
      }

      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && !classNames.some(c => c.startsWith('text-') && ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].some(s => c.includes(s)) )) {
          classNames.push('text-base');
      }
      
      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && !classNames.some(c => c.startsWith('font-'))) {
          classNames.push('font-normal');
      }

      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea') && !classNames.some(c => c.startsWith('leading-'))) {
          classNames.push('leading-normal');
      }

      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      else if ((config.elementType === 'text' || config.elementType === 'textarea') && !classNames.some(c => c.startsWith('overflow-'))) {
          classNames.push('overflow-visible');
      }
      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
      
      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);

      const sideBorderClasses = [
        getSideBorderWidthClass('t', config.tailwindBorderTopW, BORDER_SIDE_WIDTH_OPTIONS), getSideBorderColorClass('t', config.tailwindBorderTopColor, TAILWIND_BORDER_PALETTE_OPTIONS),
        getSideBorderWidthClass('r', config.tailwindBorderRightW, BORDER_SIDE_WIDTH_OPTIONS), getSideBorderColorClass('r', config.tailwindBorderRightColor, TAILWIND_BORDER_PALETTE_OPTIONS),
        getSideBorderWidthClass('b', config.tailwindBorderBottomW, BORDER_SIDE_WIDTH_OPTIONS), getSideBorderColorClass('b', config.tailwindBorderBottomColor, TAILWIND_BORDER_PALETTE_OPTIONS),
        getSideBorderWidthClass('l', config.tailwindBorderLeftW, BORDER_SIDE_WIDTH_OPTIONS), getSideBorderColorClass('l', config.tailwindBorderLeftColor, TAILWIND_BORDER_PALETTE_OPTIONS),
      ].filter(Boolean);
      
      if (sideBorderClasses.length > 0) {
          classNames.push(...sideBorderClasses);
      } else { // If no side borders, but global border color might have been picked for old system
          // This logic might need refinement if global border color is still a concept
      }
      if (classNames.some(c => c.startsWith('border-') && (c.includes('border-t') || c.includes('border-r') || c.includes('border-b') || c.includes('border-l'))) &&
        !classNames.some(c => TAILWIND_BORDER_PALETTE_OPTIONS.map(p => p.value).includes(c.replace(/border-(t|r|b|l)-/, '')) || c.startsWith('border-transparent') || c.startsWith('border-current'))
      ) {
        // If any side border width is set, and no specific side color is set, apply a default theme border color if no global color is chosen
        // For simplicity, let's assume the combined side border color logic correctly handles this.
      }
      
      const element: any = { fieldKey: config.fieldKey, type: config.elementType };
      if (Object.keys(style).length > 0) element.style = style;

      const finalClassName = classNames.filter(Boolean).join(' ').trim();
      if (finalClassName) element.className = finalClassName;
      if ((config.elementType === 'iconValue') && config.iconName?.trim()) element.icon = config.iconName.trim();

      return element;
    });
    
    const canvasClassesArray = [];
    if (tailwindCanvasBackgroundColor && tailwindCanvasBackgroundColor !== NONE_VALUE) canvasClassesArray.push(tailwindCanvasBackgroundColor);
    if (tailwindCanvasBorderRadius && tailwindCanvasBorderRadius !== NONE_VALUE) canvasClassesArray.push(tailwindCanvasBorderRadius);
    
    if (tailwindCanvasBorderWidth && tailwindCanvasBorderWidth !== NONE_VALUE && BORDER_SIDE_WIDTH_OPTIONS.find(o => o.value === tailwindCanvasBorderWidth && !o.label.includes("Side"))) {
        const widthClass = tailwindCanvasBorderWidth === 'default' ? 'border' : `border-${tailwindCanvasBorderWidth}`;
        canvasClassesArray.push(widthClass);
        if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE && TAILWIND_BORDER_PALETTE_OPTIONS.find(o => o.value === tailwindCanvasBorderColor)) {
            canvasClassesArray.push(`border-${tailwindCanvasBorderColor}`);
        } else if (tailwindCanvasBorderWidth !== BORDER_SIDE_WIDTH_OPTIONS.find(o => o.label.includes("0px"))?.value) {
             // Apply default border color from theme if width is set and no specific color chosen
            canvasClassesArray.push('border-border');
        }
    }
    const canvasClassNameString = canvasClassesArray.join(' ').trim();

    const newLayout = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: (tailwindCanvasBackgroundColor === NONE_VALUE || !tailwindCanvasBackgroundColor) ? canvasDirectBackgroundColor : undefined,
      borderStyle: canvasBorderStyle || "solid",
      canvasClassName: canvasClassNameString || undefined, // Store as undefined if empty
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    setLayoutJsonError(null);
    // guiBuilderLastUpdateRef.current = Date.now();
    if (showSuccessToast) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in the textarea."});
    }
  }, [
      layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
      tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
      tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth,
      canvasBorderStyle, toast
  ]);

  const handleLayoutDefinitionChangeFromTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    console.log('[DEBUG] TemplateDesigner: Layout JSON changed by user in textarea.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null); // Clear error as user is typing
    // jsonEditorLastUpdateRef.current = Date.now();
  };

  const validateAndFormatLayoutJson = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: Validating and formatting JSON from textarea.');
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI active, skipping format from blur. Will re-parse for GUI when switching.');
      return true; // Don't validate/format if GUI is active, to avoid overwriting GUI-driven changes
    }
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      // jsonEditorLastUpdateRef.current = Date.now();
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] TemplateDesigner: Invalid JSON from textarea', e.message);
      return false;
    }
  }, [layoutDefinition, activeEditorView]);

  // Debounced effect for GUI -> JSON updates (for live preview)
  const debouncedGuiUpdate = useCallback(() => {
    if (guiBuilderLastUpdateRef.current) {
      clearTimeout(guiBuilderLastUpdateRef.current);
    }
    guiBuilderLastUpdateRef.current = window.setTimeout(() => {
      console.log('[DEBUG] TemplateDesigner: GUI state changed, auto-generating JSON for preview (debounced).');
      handleGenerateJsonFromBuilder(false); // Don't show toast for auto-updates
    }, 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGenerateJsonFromBuilder]); // handleGenerateJsonFromBuilder is stable

  // Watch GUI state for changes to trigger debounced JSON update
  useEffect(() => {
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI state change detected, triggering debounced JSON update.');
      debouncedGuiUpdate();
    }
    return () => {
      if (guiBuilderLastUpdateRef.current) {
        clearTimeout(guiBuilderLastUpdateRef.current);
      }
    };
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth,
    canvasBorderStyle, activeEditorView, debouncedGuiUpdate
  ]);

  const handleSave = async () => {
    console.log('[DEBUG] TemplateDesigner: handleSave called.');
    const currentId = mode === 'edit' && initialTemplate ? initialTemplate.id : templateId;
    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!currentId && mode === 'create') { // Should be set by toCamelCase from name
      toast({ title: "Missing ID", description: "Template ID could not be generated. Please ensure template name is valid.", variant: "destructive" });
      return;
    }
    if (mode === 'create' && existingTemplateIds?.includes(currentId as CardTemplateId)) {
        toast({
            title: "Duplicate ID",
            description: `A template with ID '${currentId}' (generated from name '${templateName}') already exists. Please choose a unique name.`,
            variant: "destructive",
            duration: 7000,
        });
        return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Please add at least one field to the template.", variant: "destructive" });
      return;
    }
    const fieldKeys = fields.map(f => f.key);
    const duplicateFieldKeys = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicateFieldKeys.length > 0) {
        toast({
            title: "Duplicate Field Keys",
            description: `Field keys must be unique. Duplicates: ${duplicateFieldKeys.join(', ')}. Please adjust field labels.`,
            variant: "destructive",
            duration: 7000
        });
        return;
    }

    let finalLayoutDefToSave = layoutDefinition.trim();
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI active on save, ensuring JSON from GUI state.');
      // Force generate JSON from GUI state before saving
      handleGenerateJsonFromBuilder(false); // No toast, but need to await state update
      // This is tricky. handleGenerateJsonFromBuilder calls setLayoutDefinition which is async.
      // For robust save, we might need to get the string *from* handleGenerateJsonFromBuilder or use a ref for the latest.
      // Or, ensure the debounced update has run.
      // For now, we rely on the latest state of `layoutDefinition` which should have been updated.
    }
    
    if (!finalLayoutDefToSave) {
       finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else {
      try {
        JSON.parse(finalLayoutDefToSave);
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        toast({
          title: "Invalid Layout JSON",
          description: `The JSON in 'Layout Definition' is invalid. Error: ${e.message}. Please correct it before saving.`,
          variant: "destructive",
          duration: 7000,
        });
        setActiveEditorView('json');
        return;
      }
    }

    const templateToSave: CardTemplate = {
      id: currentId as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };
    
    console.log('[DEBUG] TemplateDesigner: Calling props.onSave with:', templateToSave);
    await onSave(templateToSave, mode === 'edit' ? initialTemplate?.id : undefined);
    // Parent (route page) will handle toast and navigation after onSave promise resolves
  };

  const handleCopyIconName = useCallback(async (iconName: string) => {
    console.log('[DEBUG] TemplateDesigner: handleCopyIconName for icon:', iconName);
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

  const isPageLoading = isLoadingContexts || (mode === 'edit' && !initialTemplate);
  
  const isGenerateJsonDisabled = isSavingTemplate || (activeEditorView === 'gui' && layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0);
  const isSaveDisabled = isSavingTemplate || !templateName.trim() || fields.length === 0 || (activeEditorView === 'json' && !!layoutJsonError);


  if (isPageLoading && mode === 'edit') { // Only show full page loader for edit mode initial load
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p>Loading template...</p>
      </div>
    );
  }
  
  const pageTitle = mode === 'create' ? "Template Designer" : "Edit Template";
  const saveButtonText = mode === 'create' ? "Save Template" : "Save Changes";

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
         <CardHeader>
           <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center">
            <div>
                <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
                <CardDescription className="text-md pt-1 text-muted-foreground">
                  {mode === 'create' 
                    ? "Define the data structure and visual layout for a new card template."
                    : `Modify the template's name, fields, and layout.`}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><Palette className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <EllipsisVertical className="h-4 w-4" /> <span className="sr-only">Page Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleGenerateJsonFromBuilder(true)}
                    disabled={isGenerateJsonDisabled}
                  >
                    <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSave}
                    disabled={isSaveDisabled || isSavingTemplate}
                  >
                     {isSavingTemplate ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> ) : ( <> <Save className="mr-2 h-4 w-4" /> {saveButtonText} </>)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="text-sm pt-4 text-muted-foreground">
            {mode === 'create' 
              ? "Template ID will be auto-generated from the name. Field Keys are auto-generated from Field Labels. Templates are saved to browser local storage."
              : `Template ID (<code className="bg-muted px-1 rounded-sm">${templateId}</code>) is auto-generated and cannot be changed.`
            }
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
                placeholder={mode === 'create' ? "e.g., 'Hero Unit Card'" : initialTemplate?.name}
                disabled={isSavingTemplate || isLoadingContexts}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="templateIdDisplay" className="font-semibold">Template ID {mode === 'create' ? '(auto-generated)' : '(Read-only)'}</Label>
              <Input
                id="templateIdDisplay"
                value={templateId}
                readOnly
                disabled // Always disabled as it's auto-generated or immutable
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
           <div>
            <h3 className="text-lg font-semibold mb-3">Data Fields</h3>
            <ScrollArea className="pr-3">
                <div className="space-y-2">
                    {fields.map((field) => (
                    <FieldRow
                        key={field._uiId} // Use stable _uiId
                        field={field}
                        onChange={(updatedField) => handleFieldChange(field._uiId!, updatedField)}
                        onRemove={() => handleRemoveField(field._uiId!)}
                        isSaving={isSavingTemplate || isLoadingContexts}
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
              disabled={isSavingTemplate || isLoadingContexts}
              className="mt-4"
              title={"Add a new data field"}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Builder & Preview */}
      <div className="flex flex-col md:flex-row md:gap-6 items-start">
        {/* Left Column: Layout Definition */}
        <Card className="md:w-[65%] flex flex-col shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
                 <div className="flex items-center space-x-2">
                    <Label htmlFor={`editor-view-toggle-${mode}`} className="text-xs text-muted-foreground">
                        {activeEditorView === 'gui' ? 'GUI Builder' : 'JSON Editor'}
                    </Label>
                    <Switch
                        id={`editor-view-toggle-${mode}`}
                        checked={activeEditorView === 'gui'}
                        onCheckedChange={(checked) => {
                            const newView = checked ? 'gui' : 'json';
                            console.log(`[DEBUG] TemplateDesigner: Switching editor view to: ${newView}`);
                            if (newView === 'json' && activeEditorView === 'gui') {
                                // When switching from GUI to JSON, ensure JSON is up-to-date from GUI
                                handleGenerateJsonFromBuilder(false); // No toast, just update
                            }
                            setActiveEditorView(newView);
                        }}
                        aria-label="Toggle editor view"
                        disabled={isSavingTemplate || isLoadingContexts}
                    />
                </div>
            </div>
            <CardDescription className="text-sm pt-2">
              {activeEditorView === 'gui'
                ? "Use the GUI to configure canvas properties and layout elements. The JSON output updates to reflect GUI changes, feeding the Live Preview. You can also click 'Generate/Update JSON' from page actions to manually sync."
                : "Directly edit the Layout Definition JSON. Changes here will update the preview. GUI controls will reflect these changes if you switch back to GUI mode (if JSON is valid)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {activeEditorView === 'gui' && (
              <>
                {/* Card Canvas Setup */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <h4 className="text-base font-semibold mb-2">Card Canvas Setup</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                    <div>
                        <Label htmlFor={`canvasSizePreset-${mode}`} className="text-xs font-medium">Canvas Size Preset</Label>
                        <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSavingTemplate || isLoadingContexts}>
                            <SelectTrigger id={`canvasSizePreset-${mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select size preset" /></SelectTrigger>
                            <SelectContent>{COMMON_CARD_SIZES.map(size => (<SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    {selectedSizePreset === 'custom' ? (
                        <>
                            <div><Label htmlFor={`canvasWidth-${mode}`} className="text-xs font-medium">Custom Width (CSS)</Label><Input id={`canvasWidth-${mode}`} value={canvasWidthSetting} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} disabled={isSavingTemplate || isLoadingContexts} className="mt-1 h-8 text-xs"/></div>
                            <div><Label htmlFor={`canvasHeight-${mode}`} className="text-xs font-medium">Custom Height (CSS)</Label><Input id={`canvasHeight-${mode}`} value={canvasHeightSetting} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} disabled={isSavingTemplate || isLoadingContexts} className="mt-1 h-8 text-xs"/></div>
                        </>
                    ) : COMMON_CARD_SIZES.find(s=>s.value === selectedSizePreset) && (
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                           <div><Label className="text-xs font-medium text-muted-foreground">Width</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.width || canvasWidthSetting}</p></div>
                           <div><Label className="text-xs font-medium text-muted-foreground">Height</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.height || canvasHeightSetting}</p></div>
                        </div>
                    )}
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end mt-2">
                    <div> <Label htmlFor={`tailwindCanvasBgColor-${mode}`} className="text-xs font-medium">Background Color (Tailwind)</Label> <Select value={tailwindCanvasBackgroundColor} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBackgroundColor', v)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBgColor-${mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select color"/></SelectTrigger> <SelectContent>{TAILWIND_BACKGROUND_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasDirectBgColor-${mode}`} className="text-xs font-medium">Direct Background Color (CSS)</Label> <Input id={`canvasDirectBgColor-${mode}`} value={canvasDirectBackgroundColor} onChange={(e) => handleCanvasDirectCSSChange('canvasDirectBackgroundColor', e.target.value)} placeholder="e.g., #RRGGBB or hsl(...)" disabled={isSavingTemplate || isLoadingContexts || (tailwindCanvasBackgroundColor !== NONE_VALUE && !!tailwindCanvasBackgroundColor)} className="mt-1 h-8 text-xs"/> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderRadius-${mode}`} className="text-xs font-medium">Border Radius (Tailwind)</Label> <Select value={tailwindCanvasBorderRadius} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderRadius',v)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderRadius-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderWidth-${mode}`} className="text-xs font-medium">Border Width (Tailwind)</Label> <Select value={tailwindCanvasBorderWidth} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderWidth',v)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderWidth-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.filter(o => !o.label.includes("Side")).map(opt => (<SelectItem key={opt.value} value={opt.value }>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderColor-${mode}`} className="text-xs font-medium">Border Color (Tailwind)</Label> <Select value={tailwindCanvasBorderColor} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderColor',v)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderColor-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasBorderStyle-${mode}`} className="text-xs font-medium">Border Style (CSS)</Label> <Select value={canvasBorderStyle} onValueChange={(value) => handleCanvasDirectCSSChange('canvasBorderStyle', value)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`canvasBorderStyle-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem> <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem> </SelectContent> </Select> </div>
                  </div>
                </div>

                {/* Layout Elements Configuration */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30 flex-grow">
                  <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
                  <ScrollArea className="pr-2"> {/* Removed max-h */}
                      <div className="space-y-2">
                        {layoutElementGuiConfigs.map((config) => (
                          <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Switch id={`enable-${mode}-${config._uiId}`} checked={config.isEnabledOnCanvas} onCheckedChange={(checked) => handleGuiConfigChange(config._uiId, 'isEnabledOnCanvas', checked)} disabled={isSavingTemplate || isLoadingContexts} />
                                <Label htmlFor={`enable-${mode}-${config._uiId}`} className="text-sm font-medium cursor-pointer"> {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span> </Label>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId)} className="h-7 w-7 text-muted-foreground" disabled={!config.isEnabledOnCanvas || isSavingTemplate || isLoadingContexts}> {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} </Button>
                            </div>
                            {config.isExpandedInGui && config.isEnabledOnCanvas && (
                              <div className="mt-3 pt-3 border-t border-dashed space-y-3">
                                <details className="space-y-1.5 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1"><Settings className="mr-1 h-3 w-3"/> Element Type & Icon Name <ChevronRight className="ml-auto h-3 w-3 group-open:rotate-90 transition-transform" /></summary>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                        <div>
                                            <Label htmlFor={`el-type-${mode}-${config._uiId}`} className="text-xs">Element Type</Label>
                                            <Select value={config.elementType} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'elementType', value as LayoutElementGuiConfig['elementType'])} disabled={isSavingTemplate || isLoadingContexts}>
                                                <SelectTrigger id={`el-type-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                                <SelectContent> <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem> <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem> <SelectItem value="iconFromData">Icon from Data</SelectItem> </SelectContent>
                                            </Select>
                                        </div>
                                        {config.elementType === 'iconValue' && (
                                            <div className="space-y-1">
                                                <Label htmlFor={`el-icon-${mode}-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                                <Input id={`el-icon-${mode}-${config._uiId}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSavingTemplate || isLoadingContexts}/>
                                                <Accordion type="single" collapsible className="w-full text-xs" defaultValue="">
                                                    <AccordionItem value={`icon-browser-inline-${mode}-${config._uiId}`} className="border-b-0">
                                                        <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5"><Copy className="mr-1 h-3 w-3" /> Browse Icons</AccordionTrigger>
                                                        <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                                            <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                                            <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                                                                <div className={cn("grid gap-1", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                                                                    {commonLucideIconsForGuide.map(iconKey => (
                                                                        <TooltipProvider key={`${iconKey}-${mode}-${config._uiId}`} delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey as string)} className="h-7 w-7 p-1" ><IconComponent name={iconKey as string} className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent></Tooltip></TooltipProvider>
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
                                <details className="space-y-1.5 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1"><Settings className="mr-1 h-3 w-3"/> Position & Sizing (CSS) <ChevronRight className="ml-auto h-3 w-3 group-open:rotate-90 transition-transform" /></summary>
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                        {(['styleTop', 'styleLeft', 'styleRight', 'styleBottom'] as const).map(prop => (
                                            <div key={prop}>
                                                <Label htmlFor={`el-${prop}-${mode}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS)</Label>
                                                <Input id={`el-${prop}-${mode}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId, prop, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSavingTemplate || isLoadingContexts}/>
                                            </div>
                                        ))}
                                        <div><Label htmlFor={`el-styleMaxHeight-${mode}-${config._uiId}`} className="text-xs">Max Height (CSS)</Label><Input id={`el-styleMaxHeight-${mode}-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px or auto" disabled={isSavingTemplate || isLoadingContexts}/></div>
                                        <div><Label htmlFor={`el-stylePadding-${mode}-${config._uiId}`} className="text-xs">Padding (CSS)</Label><Input id={`el-stylePadding-${mode}-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => handleGuiConfigChange(config._uiId, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px or 2px 4px" disabled={isSavingTemplate || isLoadingContexts}/></div>
                                    </div>
                                </details>
                                {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                                <details className="space-y-1.5 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1"><Settings className="mr-1 h-3 w-3"/> Typography <ChevronRight className="ml-auto h-3 w-3 group-open:rotate-90 transition-transform" /></summary>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                        <div><Label htmlFor={`el-twTextColor-${mode}-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label><Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextColor', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twTextColor-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select color" /></SelectTrigger><SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twFontSize-${mode}-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label><Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontSize', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twFontSize-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select size" /></SelectTrigger><SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twFontWeight-${mode}-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label><Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindFontWeight', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twFontWeight-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select weight" /></SelectTrigger><SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twLineHeight-${mode}-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label><Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindLineHeight', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twLineHeight-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select line height" /></SelectTrigger><SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-styleFontStyle-${mode}-${config._uiId}`} className="text-xs">Font Style (CSS)</Label><Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleFontStyle', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-styleFontStyle-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent></Select></div>
                                        <div><Label htmlFor={`el-styleTextAlign-${mode}-${config._uiId}`} className="text-xs">Text Align (CSS)</Label><Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'styleTextAlign', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-styleTextAlign-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem></SelectContent></Select></div>
                                    </div>
                                </details>
                                )}
                                {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                <details className="space-y-1.5 group" open>
                                    <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1"><Settings className="mr-1 h-3 w-3"/> Overflow & Display (Text - Tailwind) <ChevronRight className="ml-auto h-3 w-3 group-open:rotate-90 transition-transform" /></summary>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                    <div><Label htmlFor={`el-twOverflow-${mode}-${config._uiId}`} className="text-xs">Overflow</Label><Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindOverflow', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select overflow" /></SelectTrigger><SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twTextOverflow-${mode}-${config._uiId}`} className="text-xs">Text Overflow</Label><Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindTextOverflow', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twTextOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select text overflow" /></SelectTrigger><SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                </details>
                                )}
                                <details className="space-y-1.5 group" open>
                                <summary className="text-xs text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 group-open:mb-1"><Settings className="mr-1 h-3 w-3"/> Borders <ChevronRight className="ml-auto h-3 w-3 group-open:rotate-90 transition-transform" /></summary>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                    <div><Label htmlFor={`el-twBorderRadius-${mode}-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label><Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, 'tailwindBorderRadius', value)} disabled={isSavingTemplate || isLoadingContexts}><SelectTrigger id={`el-twBorderRadius-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pl-1 mt-2">
                                      {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => {
                                        const widthPropKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
                                        const colorPropKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
                                        return (
                                        <React.Fragment key={side}>
                                            <div> <Label htmlFor={`el-twBorder${side}W-${mode}-${config._uiId}`} className="text-xs">Border {side} W</Label> <Select value={(config as any)[widthPropKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, widthPropKey, value)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}W-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                                            <div> <Label htmlFor={`el-twBorder${side}Color-${mode}-${config._uiId}`} className="text-xs">{side} Color</Label> <Select value={(config as any)[colorPropKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId, colorPropKey, value)} disabled={isSavingTemplate || isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}Color-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                                        </React.Fragment>
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
              </>
            )}
            {activeEditorView === 'json' && (
              <div className="mt-4 flex-grow flex flex-col">
                  <div>
                    <Label htmlFor={`layoutDefinition-${mode}`} className="text-sm font-medium">Layout Definition JSON (Editable)</Label>
                    <Textarea
                      id={`layoutDefinition-${mode}`}
                      value={layoutDefinition}
                      onChange={handleLayoutDefinitionChangeFromTextarea}
                      onBlur={validateAndFormatLayoutJson}
                      placeholder="Click \"Generate/Update JSON from Builder\" (in page actions menu) to populate, or paste/edit your JSON here."
                      rows={15}
                      className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                      disabled={isSavingTemplate || isLoadingContexts}
                    />
                  </div>
                  {layoutJsonError && ( <Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4 !text-destructive-foreground" /><AlertTitle>JSON Error</AlertTitle><AlertDescription className="text-xs">{layoutJsonError}</AlertDescription></Alert> )}
              </div>
            )}
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
                    <Label htmlFor={`show-pixel-grid-${mode}`} className="text-xs text-muted-foreground">Pixel Grid</Label>
                    <Switch id={`show-pixel-grid-${mode}`} checked={showPixelGrid} onCheckedChange={setShowPixelGrid} aria-label="Show pixel grid" disabled={isSavingTemplate || isLoadingContexts} />
                 </div>
            </div>
            <CardDescription className="text-sm">
              This preview updates as you modify the {activeEditorView === 'gui' ? 'GUI builder' : 'JSON editor'}. Uses sample data based on your field definitions.
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
