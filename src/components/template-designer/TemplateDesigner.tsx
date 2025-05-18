
// src/components/template-designer/TemplateDesigner.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, Palette, HelpCircle, Copy, ChevronDown, ChevronRight, Settings, AlertTriangle, EllipsisVertical } from 'lucide-react';
import FieldRow from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import type { CardTemplate, CardTemplateId } from '@/lib/card-templates'; // Ensure TemplateField is not imported if not used directly
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  IconComponent,
  mapFieldDefinitionToTemplateField,
  mapTemplateFieldToFieldDefinition,
  type TemplateFieldDefinition,
  type LayoutElementGuiConfig,
} from '@/lib/card-designer';

console.log('[DEBUG] TemplateDesigner.tsx: Module loaded');


// Props interface
export interface TemplateDesignerProps {
  mode: "create" | "edit";
  initialTemplate?: CardTemplate;
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{success: boolean, message?: string}>;
  isSavingTemplate?: boolean; 
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

export function TemplateDesigner({
  mode,
  initialTemplate,
  onSave,
  isSavingTemplate: isSavingProp = false,
  isLoadingContexts = false,
  existingTemplateIds = [],
}: TemplateDesignerProps) {
  console.log('[DEBUG] TemplateDesigner: Rendering. Mode:', mode, 'Initial Template Name:', initialTemplate?.name, 'isLoadingContexts:', isLoadingContexts);

  const { toast } = useToast();

  // Core template data
  const [templateName, setTemplateName] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>(''); 
  const [templateIdToEdit, setTemplateIdToEdit] = useState<CardTemplateId | undefined>(undefined);

  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);

  // GUI Builder State for Canvas
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(
    COMMON_CARD_SIZES.find(s => s.width === `${DEFAULT_CANVAS_WIDTH}px` && s.height === `${DEFAULT_CANVAS_HEIGHT}px`)?.value || COMMON_CARD_SIZES[0].value
  );
  
  const [tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor] = useState<string>(TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE);
  const [canvasDirectBackgroundColor, setCanvasDirectBackgroundColor] = useState<string>('hsl(var(--card))');
  const [tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius] = useState<string>(TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-lg")?.value || NONE_VALUE);
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE);
  const [tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth] = useState<string>(BORDER_SIDE_WIDTH_OPTIONS.find(opt => opt.label === "1px" && opt.value === "default")?.value || NONE_VALUE);
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");

  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(isSavingProp);
  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  
  const guiBuilderLastUpdateRef = useRef<number>(0);

  useEffect(() => {
    setIsSaving(isSavingProp);
  }, [isSavingProp]);

  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Initial setup effect running. Mode:', mode, 'isLoadingContexts:', isLoadingContexts, 'initialTemplate changed:', !!initialTemplate);
    if (isLoadingContexts && mode === 'edit' && !initialTemplate) {
      console.log('[DEBUG] TemplateDesigner: Contexts loading for edit mode, initialTemplate not yet ready. Deferring setup.');
      return; 
    }
    
    let newLayoutDefinition = DEFAULT_CARD_LAYOUT_JSON_STRING;
    let newFields: TemplateFieldDefinition[] = [];
    let newTemplateName = '';
    let newTemplateIdForDisplay = ''; // For local templateId state used for display/generation in create mode
    let newTemplateIdToEdit: CardTemplateId | undefined = undefined;


    if (mode === 'edit' && initialTemplate) {
      console.log('[DEBUG] TemplateDesigner: Edit mode setup, using initialTemplate:', initialTemplate.name);
      newTemplateName = initialTemplate.name;
      newTemplateIdForDisplay = initialTemplate.id; // This is the fixed ID for edit mode
      newTemplateIdToEdit = initialTemplate.id;
      newFields = initialTemplate.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, idx));
      newLayoutDefinition = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else if (mode === 'create') {
      console.log('[DEBUG] TemplateDesigner: Create mode setup, setting defaults.');
      // Defaults are already set by useState initial values for layoutDefinition, fields, name etc.
      // The newTemplateId will be derived from newTemplateName by another effect.
    }
    
    setTemplateName(newTemplateName);
    setTemplateId(newTemplateIdForDisplay); 
    setTemplateIdToEdit(newTemplateIdToEdit);
    setFields(newFields); 
    
    // This will trigger the other useEffect that parses layoutDefinition for GUI controls
    // It's important this runs *after* fields might have been set, so GUI configs can be synced
    if (layoutDefinition !== newLayoutDefinition) {
      setLayoutDefinition(newLayoutDefinition);
    } else {
      // If layoutDefinition string hasn't changed, but mode/initialTemplate did,
      // we still might need to re-parse for GUI controls if fields changed or it's initial load.
      // The effect listening to [fields, layoutDefinition, mode] handles this.
      // For canvas setup, explicitly trigger re-parse if it's an edit load.
      if(mode === 'edit' && initialTemplate) {
         try {
            const parsedLayout = JSON.parse(newLayoutDefinition || '{}');
            setCanvasWidthSetting(String(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`));
            setCanvasHeightSetting(String(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`));
            const matchingPreset = COMMON_CARD_SIZES.find(s => String(s.width) === String(parsedLayout.width) && String(s.height) === String(parsedLayout.height));
            setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

            const canvasClasses = (parsedLayout.canvasClassName || '').split(' ');
            setTailwindCanvasBackgroundColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BACKGROUND_COLORS, TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE));
            setTailwindCanvasBorderRadius(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_RADIUS_OPTIONS, TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-lg")?.value || NONE_VALUE));
            
            const twBorderWidthClass = canvasClasses.find((cls: string) => BORDER_SIDE_WIDTH_OPTIONS.some(opt => opt.value === (cls === 'border' ? 'default' : cls.replace(/^border-/, '')) && !cls.startsWith('border-t') && !cls.startsWith('border-b') && !cls.startsWith('border-l') && !cls.startsWith('border-r')));
            setTailwindCanvasBorderWidth(twBorderWidthClass ? (twBorderWidthClass === 'border' ? 'default' : twBorderWidthClass.replace(/^border-/, '')) : (BORDER_SIDE_WIDTH_OPTIONS.find(w => w.value === 'default')?.value || NONE_VALUE));
            
            const twBorderColorClass = canvasClasses.find((cls: string) => TAILWIND_BORDER_PALETTE_OPTIONS.some(opt => `border-${opt.value}` === cls && opt.value !== NONE_VALUE && !opt.value.startsWith('t-') && !opt.value.startsWith('r-') && !opt.value.startsWith('b-') && !opt.value.startsWith('l-')));
            setTailwindCanvasBorderColor(twBorderColorClass ? twBorderColorClass.replace(/^border-/, '') : (TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE) );
            
            setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || 'hsl(var(--card))'));
            setCanvasBorderStyle(String(parsedLayout.borderStyle || "solid"));
         } catch (e) {
            console.error("Error parsing layoutDefinition during initial setup for edit:", e);
         }
      }
    }
    
    setActiveEditorView('gui');
    console.log('[DEBUG] TemplateDesigner: Initial setup effect finished.');
  }, [mode, initialTemplate, isLoadingContexts]); // Removed layoutDefinition from here to avoid loop


  useEffect(() => {
    if (mode === 'create') {
      if (templateName.trim()) {
        const newId = toCamelCase(templateName.trim());
        setTemplateId(newId || 'untitledTemplate');
      } else {
        setTemplateId('');
      }
    }
  }, [templateName, mode]);

  // Sync LayoutElementGuiConfigs with Data Fields (main `fields` array)
  // Also populates GUI configs from layoutDefinition when it changes or in edit mode.
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Syncing/Parsing GUI configs. Mode:', mode, 'Fields count:', fields.length, 'LayoutDef Length:', layoutDefinition.length);
    
    let parsedLayoutForElements: any;
    try {
        parsedLayoutForElements = JSON.parse(layoutDefinition || '{}');
    } catch (e) {
        console.warn('[DEBUG] TemplateDesigner: Invalid JSON for element GUI config sync, using empty elements array for parsing GUI.');
        parsedLayoutForElements = { elements: [] };
    }
    const elementsFromJsonMap = new Map((parsedLayoutForElements.elements || []).map((el: any) => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigs = fields.map((fieldDef, index) => {
        const existingUiConfig = prevConfigs.find(p => p._uiId === fieldDef._uiId);
        const jsonElement = elementsFromJsonMap.get(fieldDef.key);
        const defaultTop = `${10 + (index % 8) * 35}px`; // Fallback default top

        let config: LayoutElementGuiConfig = {
          _uiId: fieldDef._uiId || `gui-new-${fieldDef.key}-${Date.now()}-${index}`,
          fieldKey: fieldDef.key,
          label: fieldDef.label,
          originalType: fieldDef.type,
          isEnabledOnCanvas: false,
          isExpandedInGui: existingUiConfig?.isExpandedInGui || false, // Preserve expansion if config existed
          elementType: fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text'),
          iconName: fieldDef.type === 'number' ? 'Coins' : '',
          styleTop: defaultTop, styleLeft: '10px', styleRight: '', styleBottom: '',
          styleMaxHeight: fieldDef.type === 'textarea' ? '100px' : '',
          stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
          tailwindTextColor: TAILWIND_TEXT_COLORS.find(c => c.value === "text-black")?.value || NONE_VALUE,
          tailwindFontSize: TAILWIND_FONT_SIZES.find(s => s.value === 'text-base')?.value || NONE_VALUE,
          tailwindFontWeight: TAILWIND_FONT_WEIGHTS.find(w => w.value === 'font-normal')?.value || NONE_VALUE,
          tailwindLineHeight: TAILWIND_LINE_HEIGHTS.find(lh => lh.value === 'leading-normal')?.value || NONE_VALUE,
          tailwindOverflow: TAILWIND_OVERFLOW.find(o => o.value === 'overflow-visible')?.value || NONE_VALUE,
          tailwindTextOverflow: TAILWIND_TEXT_OVERFLOW.find(to => to.value === NONE_VALUE)?.value || NONE_VALUE,
          tailwindBorderRadius: NONE_VALUE,
          tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
          tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
          tailwindBorderTopColor: NONE_VALUE, tailwindBorderRightColor: NONE_VALUE,
          tailwindBorderBottomColor: NONE_VALUE, tailwindBorderLeftColor: NONE_VALUE,
        };

        if (jsonElement) {
          config.isEnabledOnCanvas = true;
          const style = jsonElement.style || {};
          const className = jsonElement.className || '';

          config.elementType = jsonElement.type || config.elementType;
          config.iconName = jsonElement.icon || config.iconName;
          
          config.styleTop = style.top || defaultTop;
          config.styleLeft = style.left || '10px';
          config.styleRight = style.right || '';
          config.styleBottom = style.bottom || '';
          config.styleMaxHeight = style.maxHeight || config.styleMaxHeight;
          config.stylePadding = style.padding || '';
          config.styleFontStyle = style.fontStyle || 'normal';
          config.styleTextAlign = style.textAlign || 'left';

          config.tailwindTextColor = findTailwindClassValue(className, TAILWIND_TEXT_COLORS, config.tailwindTextColor);
          config.tailwindFontSize = findTailwindClassValue(className, TAILWIND_FONT_SIZES, config.tailwindFontSize);
          config.tailwindFontWeight = findTailwindClassValue(className, TAILWIND_FONT_WEIGHTS, config.tailwindFontWeight);
          config.tailwindLineHeight = findTailwindClassValue(className, TAILWIND_LINE_HEIGHTS, config.tailwindLineHeight);
          config.tailwindOverflow = findTailwindClassValue(className, TAILWIND_OVERFLOW, config.tailwindOverflow);
          config.tailwindTextOverflow = findTailwindClassValue(className, TAILWIND_TEXT_OVERFLOW, config.tailwindTextOverflow);
          config.tailwindBorderRadius = findTailwindClassValue(className, TAILWIND_BORDER_RADIUS_OPTIONS, config.tailwindBorderRadius);

          config.tailwindBorderTopW = findSideBorderClassValue(className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderTopColor = findSideBorderClassValue(className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderRightW = findSideBorderClassValue(className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderRightColor = findSideBorderClassValue(className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderBottomW = findSideBorderClassValue(className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderBottomColor = findSideBorderClassValue(className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderLeftW = findSideBorderClassValue(className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
          config.tailwindBorderLeftColor = findSideBorderClassValue(className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
        }
        return config;
      });
      
      if (JSON.stringify(newConfigs) !== JSON.stringify(prevConfigs)) {
        return newConfigs;
      }
      return prevConfigs;
    });
  }, [fields, layoutDefinition, mode]);


  // Effect to parse layoutDefinition string for Canvas Setup GUI state (when layoutDefinition string changes from textarea or load)
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Parsing layoutDefinition for Canvas Setup GUI. Current layoutDef length:', layoutDefinition.length);
    
    // Avoid re-parsing and setting state if GUI is active and has initiated the change to layoutDefinition
    // This check might be too simplistic if debouncing causes delays.
    if (activeEditorView === 'gui' && guiBuilderLastUpdateRef.current > (Date.now() - 1000)) { // 1 sec threshold
        console.log('[DEBUG] TemplateDesigner: GUI likely source of recent layoutDefinition change, skipping Canvas Setup parse for now.');
        return;
    }

    let parsedLayout: any;
    try {
      parsedLayout = JSON.parse(layoutDefinition || '{}'); 
      setLayoutJsonError(null); // Clear previous errors if parsing succeeds
    } catch (e) {
      console.error("[DEBUG] TemplateDesigner: Failed to parse layoutDefinition for canvas setup:", e);
      // Don't set an error here if user is in JSON mode, as they might be typing invalid JSON.
      // The onBlur validation for the textarea will handle this.
      // If in GUI mode and this happens, it's an issue.
      if (activeEditorView === 'gui') {
        setLayoutJsonError(`Internal Error: Could not parse layout for GUI. ${String(e)}`);
      }
      return; // Don't proceed if parsing fails
    }

    // Populate Canvas Setup GUI State
    setCanvasWidthSetting(String(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`));
    setCanvasHeightSetting(String(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`));
    const matchingPreset = COMMON_CARD_SIZES.find(s => String(s.width) === String(parsedLayout.width) && String(s.height) === String(parsedLayout.height));
    setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

    const canvasClasses = (parsedLayout.canvasClassName || '').split(' ');
    setTailwindCanvasBackgroundColor(findTailwindClassValue(canvasClasses.join(' '), TAILWIND_BACKGROUND_COLORS, TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE));
    setTailwindCanvasBorderRadius(findTailwindClassValue(canvasClasses.join(' '), TAILWIND_BORDER_RADIUS_OPTIONS, TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-lg")?.value || NONE_VALUE));
    
    const twBorderWidthClass = canvasClasses.find((cls: string) => BORDER_SIDE_WIDTH_OPTIONS.some(opt => opt.value === (cls === 'border' ? 'default' : cls.replace(/^border-/, '')) && !cls.startsWith('border-t') && !cls.startsWith('border-b') && !cls.startsWith('border-l') && !cls.startsWith('border-r')));
    setTailwindCanvasBorderWidth(twBorderWidthClass ? (twBorderWidthClass === 'border' ? 'default' : twBorderWidthClass.replace(/^border-/, '')) : (BORDER_SIDE_WIDTH_OPTIONS.find(w => w.value === 'default')?.value || NONE_VALUE));
    
    const twBorderColorClass = canvasClasses.find((cls: string) => TAILWIND_BORDER_PALETTE_OPTIONS.some(opt => `border-${opt.value}` === cls && opt.value !== NONE_VALUE && !opt.value.startsWith('t-') && !opt.value.startsWith('r-') && !opt.value.startsWith('b-') && !opt.value.startsWith('l-')));
    setTailwindCanvasBorderColor(twBorderColorClass ? twBorderColorClass.replace(/^border-/, '') : (TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE) );
    
    setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || 'hsl(var(--card))'));
    setCanvasBorderStyle(String(parsedLayout.borderStyle || "solid"));

    console.log('[DEBUG] TemplateDesigner: Canvas Setup GUI controls populated from parsed layoutDefinition.');
  }, [layoutDefinition, activeEditorView]); // Re-run if layoutDefinition string or activeEditorView changes


  // Generate sample card data for live preview
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Generating sampleCardForPreview.');
    const currentTemplateIdForPreview = templateIdToEdit || templateId || 'previewTemplateId';
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
             text: fieldDef.placeholderConfigText,
           });
         }
      } else if (hasPreviewValue) {
        const pv = fieldDef.previewValue as string;
        if (fieldDef.type === 'number') {
          valueForPreview = !isNaN(Number(pv)) ? Number(pv) : (hasDefaultValue ? Number(fieldDef.defaultValue) : 0);
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
          valueForPreview = String(fieldDef.defaultValue);
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
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.statusIcon === undefined && !fields.some(f => f.key === 'statusIcon')) generatedSampleCard.statusIcon = 'ShieldCheck';
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';

    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, templateName, templateId, templateIdToEdit, canvasWidthSetting, canvasHeightSetting]);


  const templateForPreview = useMemo((): CardTemplate => {
    return {
      id: (templateIdToEdit || templateId || 'previewTemplateId') as CardTemplateId,
      name: templateName || 'Preview Template Name',
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition, 
    };
  }, [templateId, templateIdToEdit, templateName, fields, layoutDefinition]);

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
    if (!baseKey) baseKey = `newField${fields.length + 1}`;
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
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] TemplateDesigner: handleFieldChange for _uiId:', uiIdToUpdate, 'with data:', updatedFieldDefinition);
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
    } else {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
    guiBuilderLastUpdateRef.current = Date.now();
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
    guiBuilderLastUpdateRef.current = Date.now();
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
    }
    guiBuilderLastUpdateRef.current = Date.now();
  };
  
  const handleCanvasDirectCSSChange = (
    prop: 'canvasDirectBackgroundColor' | 'canvasBorderStyle',
    value: string
  ) => {
    console.log('[DEBUG] TemplateDesigner: handleCanvasDirectCSSChange for', prop, 'to', value);
     switch(prop) {
      case 'canvasDirectBackgroundColor': setCanvasDirectBackgroundColor(value); break;
      case 'canvasBorderStyle': setCanvasBorderStyle(value); break;
    }
    guiBuilderLastUpdateRef.current = Date.now();
  };


  const handleGuiConfigChange = useCallback((targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => {
    console.log('[DEBUG] TemplateDesigner: handleGuiConfigChange for _uiId:', targetUiId, 'property:', property, 'value:', value);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, [property]: value } : config
      )
    );
    guiBuilderLastUpdateRef.current = Date.now();
  }, []);

  const handleToggleGuiExpand = useCallback((targetUiId: string) => {
    console.log('[DEBUG] TemplateDesigner: handleToggleGuiExpand for _uiId:', targetUiId);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, isExpandedInGui: !config.isExpandedInGui } : { ...config, isExpandedInGui: false } // Only one expanded at a time
      )
    );
  }, []);

  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true) => {
    console.log('[DEBUG] TemplateDesigner: handleGenerateJsonFromBuilder called.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: React.CSSProperties & { [key: string]: any } = { position: "absolute" };
      const classNames: string[] = [];
      
      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) { classNames.push(TAILWIND_TEXT_COLORS.find(c => c.value === "text-black")?.value || 'text-black');}
      
      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) { classNames.push(TAILWIND_FONT_SIZES.find(s => s.value === 'text-base')?.value || 'text-base');}
      
      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) { classNames.push(TAILWIND_FONT_WEIGHTS.find(w => w.value === 'font-normal')?.value || 'font-normal');}
      
      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea')) { classNames.push(TAILWIND_LINE_HEIGHTS.find(lh => lh.value === 'leading-normal')?.value || 'leading-normal');}
      
      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      else if ((config.elementType === 'text' || config.elementType === 'textarea')) { classNames.push(TAILWIND_OVERFLOW.find(o => o.value === 'overflow-visible')?.value || 'overflow-visible');}

      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
      if (config.originalType === 'textarea') classNames.push('whitespace-pre-wrap');
      
      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);
      
      const sideBorderClasses: string[] = [];
      let hasAnySideBorderWidth = false;
      (['Top', 'Right', 'Bottom', 'Left'] as const).forEach(side => {
        const widthKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
        const colorKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
        const widthValue = config[widthKey] as string | undefined;
        const colorValue = config[colorKey] as string | undefined;

        if (widthValue && widthValue !== NONE_VALUE) {
          hasAnySideBorderWidth = true;
          sideBorderClasses.push(widthValue); // This now stores the full class like 'border-t-2'
          if (colorValue && colorValue !== NONE_VALUE) {
            sideBorderClasses.push(`border-${side.toLowerCase()}-${colorValue}`);
          }
        }
      });
      
      if (hasAnySideBorderWidth) {
        classNames.push(...sideBorderClasses);
        // Apply a default border color if widths are set but no side colors are set
        if (!sideBorderClasses.some(cls => cls.startsWith('border-t-') || cls.startsWith('border-r-') || cls.startsWith('border-b-') || cls.startsWith('border-l-'))) {
           // This logic might need refinement if a global border color should apply when only side widths are set.
           // For now, if no side color is set, it will rely on the theme's default border color if a border width class like `border-t` is present.
        }
      }


      const addStyleIfPresent = (key: keyof React.CSSProperties | string, value: string | undefined) => {
        if (value?.trim()) style[key as keyof React.CSSProperties] = value.trim();
      };
      
      addStyleIfPresent('top', config.styleTop);
      addStyleIfPresent('left', config.styleLeft);
      addStyleIfPresent('right', config.styleRight);
      addStyleIfPresent('bottom', config.styleBottom);
      addStyleIfPresent('maxHeight', config.styleMaxHeight);
      addStyleIfPresent('padding', config.stylePadding);
      
      if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim() as React.CSSProperties['fontStyle'];
      if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim() as React.CSSProperties['textAlign'];
      
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
        if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE && TAILWIND_BORDER_PALETTE_OPTIONS.map(p=>p.value).includes(tailwindCanvasBorderColor)) {
            canvasClassesArray.push(`border-${tailwindCanvasBorderColor}`);
        } else if (tailwindCanvasBorderWidth !== (BORDER_SIDE_WIDTH_OPTIONS.find(o => o.value === "0")?.value) ) { 
             canvasClassesArray.push('border-border');
        }
    }
    const canvasClassNameString = canvasClassesArray.filter(Boolean).join(' ').trim();

    const newLayout = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: (tailwindCanvasBackgroundColor === NONE_VALUE || !tailwindCanvasBackgroundColor) ? canvasDirectBackgroundColor : undefined,
      borderStyle: canvasBorderStyle || "solid",
      canvasClassName: canvasClassNameString || undefined,
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    if (showSuccessToast) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated."});
    }
  }, [
      layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
      tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
      tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth,
      canvasBorderStyle, toast
  ]);

  const debouncedGuiUpdate = useCallback(() => {
    if (guiBuilderLastUpdateRef.current) {
      clearTimeout(guiBuilderLastUpdateRef.current);
    }
    guiBuilderLastUpdateRef.current = window.setTimeout(() => {
      if (activeEditorView === 'gui') {
        console.log('[DEBUG] TemplateDesigner: GUI state changed, auto-generating JSON for preview (debounced).');
        handleGenerateJsonFromBuilder(false);
      }
    }, 700);
  }, [activeEditorView, handleGenerateJsonFromBuilder]);

  useEffect(() => {
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI related state changed, calling debouncedGuiUpdate.');
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

  const handleLayoutDefinitionChangeFromTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    console.log('[DEBUG] TemplateDesigner: Layout JSON changed by user in textarea.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJsonOnBlur = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: Validating and formatting JSON from textarea on blur. Active view:', activeEditorView);
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI active, skipping format on blur for textarea.');
      return true;
    }
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] TemplateDesigner: Invalid JSON from textarea on blur', e.message);
      return false;
    }
  }, [layoutDefinition, activeEditorView]);

  const handleSave = async () => {
    console.log('[DEBUG] TemplateDesigner: handleSave called. Current active view:', activeEditorView);
    setIsSaving(true);

    let currentIdForSave = mode === 'edit' ? templateIdToEdit : templateId;
    if (!currentIdForSave && mode === 'create' && templateName.trim()) {
      // Regenerate ID if it's somehow blank in create mode but name is present
      currentIdForSave = toCamelCase(templateName.trim()) || 'untitledTemplate';
    }


    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    if (!currentIdForSave) { // Check after potential regeneration
      toast({ title: "Missing ID", description: "Template ID could not be determined.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    if (mode === 'create' && existingTemplateIds?.includes(currentIdForSave as CardTemplateId)) {
        toast({ title: "Duplicate ID", description: `A template with ID '${currentIdForSave}' already exists. Choose a unique name.`, variant: "destructive", duration: 7000 });
        setIsSaving(false);
        return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Add at least one data field.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    const fieldKeysSet = new Set<string>();
    let hasDuplicateKeys = false;
    let duplicateKeyValues: string[] = [];
    for (const field of fields) {
      if (!field.key || !field.key.trim()) {
        toast({ title: "Empty Field Key", description: `Field "${field.label}" has an empty key. Ensure all fields have valid labels.`, variant: "destructive", duration: 7000 });
        setIsSaving(false);
        return;
      }
      if (fieldKeysSet.has(field.key)) {
        hasDuplicateKeys = true;
        if (!duplicateKeyValues.includes(field.key)) {
          duplicateKeyValues.push(field.key);
        }
      } else {
        fieldKeysSet.add(field.key);
      }
    }
    if (hasDuplicateKeys) {
        toast({ title: "Duplicate Field Keys", description: `Field keys must be unique. Duplicates: ${duplicateKeyValues.join(', ')}. Adjust field labels.`, variant: "destructive", duration: 7000 });
        setIsSaving(false);
        return;
    }

    let finalLayoutDefToSave = layoutDefinition; // Start with current layoutDefinition
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] TemplateDesigner: GUI active on save, ensuring JSON reflects final GUI state before save.');
      // Generate JSON based on current GUI state to ensure it's up-to-date
      // This part relies on handleGenerateJsonFromBuilder correctly updating layoutDefinition state
      // For safety, we explicitly call it here if not debounced.
      handleGenerateJsonFromBuilder(false); // Update layoutDefinition state from GUI
      finalLayoutDefToSave = layoutDefinition; // Use the fresh state
    }
    
    if (!finalLayoutDefToSave.trim()) {
       finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING; // Ensure it's not empty
    } else {
      try {
        JSON.parse(finalLayoutDefToSave); // Final validation before save
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        toast({ title: "Invalid Layout JSON", description: `JSON is invalid: ${e.message}. Correct before saving.`, variant: "destructive", duration: 7000 });
        if(activeEditorView === 'gui') setActiveEditorView('json');
        setIsSaving(false);
        return;
      }
    }

    const templateToSave: CardTemplate = {
      id: currentIdForSave as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };
    
    console.log('[DEBUG] TemplateDesigner: Calling props.onSave with ID:', currentIdForSave);
    onSave(templateToSave, mode === 'edit' ? templateIdToEdit : undefined)
      .then(result => {
        if (!result.success) {
          console.warn('[DEBUG] TemplateDesigner: onSave reported failure', result.message);
          // Toast for actual save failure is handled by parent page (new/edit route)
        } else {
          console.log('[DEBUG] TemplateDesigner: onSave reported success');
        }
      })
      .catch(err => {
        console.error('[DEBUG] TemplateDesigner: onSave promise rejected', err);
        toast({title: "Save Error", description: "An unexpected error occurred during save.", variant: "destructive"});
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleCopyIconName = useCallback(async (iconName: string) => {
    console.log('[DEBUG] TemplateDesigner: handleCopyIconName for icon:', iconName);
    try {
      await navigator.clipboard.writeText(iconName);
      toast({ title: "Copied!", description: `Icon name "${iconName}" copied.`, duration: 2000 });
    } catch (err) {
      console.error("Failed to copy icon name: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy icon name to clipboard.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toast]);

  const isPageLoading = isLoadingContexts && mode === 'edit' && !initialTemplate; // More precise loading for edit
  const isGenerateJsonDisabled = isSaving || isLoadingContexts || layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0;
  const isSaveButtonDisabled = isSaving || isLoadingContexts || !templateName.trim() || fields.length === 0 || (activeEditorView === 'json' && !!layoutJsonError);

  const pageTitle = mode === 'create' ? "Create New Template" : `Edit Template: ${initialTemplate?.name || '...'}`;
  const saveButtonText = mode === 'create' ? "Save Template" : "Save Changes";

  if (isPageLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading template data...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
         <CardHeader>
           <div className="sticky top-[calc(3.5rem+1px)] md:top-[calc(3.5rem+1px)] z-30 bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center">
            <div>
                <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><Palette className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" disabled={isLoadingContexts || isSaving}>
                    <EllipsisVertical className="h-4 w-4" /> <span className="sr-only">Page Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleGenerateJsonFromBuilder(true)}
                    disabled={isGenerateJsonDisabled || activeEditorView === 'json'}
                    title={activeEditorView === 'json' ? "Switch to GUI Builder view to use this effectively" : 
                           (layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0 ? "Enable at least one element in GUI builder first" : undefined)}
                  >
                    <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSave}
                    disabled={isSaveButtonDisabled}
                  >
                     {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> ) : ( <> <Save className="mr-2 h-4 w-4" /> {saveButtonText} </>)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="text-sm pt-4 text-muted-foreground">
            {mode === 'create' 
              ? "Define template name and data fields. Then, use the Visual Layout Builder to configure how card data is displayed, or switch to the JSON editor for direct control. Template ID is auto-generated from name."
              : `Template ID (<code className="bg-muted px-1 rounded-sm">${templateIdToEdit || templateId}</code>) is fixed. Edit name, data fields, and use the builder or JSON editor for the visual layout.`
            }
           </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor={`templateName-${mode}`} className="font-semibold">Template Name</Label>
              <Input
                id={`templateName-${mode}`}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={mode === 'create' ? "e.g., 'Hero Unit Card'" : initialTemplate?.name}
                disabled={isSaving || isLoadingContexts}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`templateIdDisplay-${mode}`} className="font-semibold">Template ID {mode === 'create' ? '(auto-generated)' : '(Auto-generated, Read-only)'}</Label>
              <Input
                id={`templateIdDisplay-${mode}`}
                value={templateIdToEdit || templateId}
                readOnly
                disabled 
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
           <div>
            <h3 className="text-lg font-semibold mb-3">Data Fields</h3>
            <div className="space-y-2">
                {fields.map((field) => (
                <FieldRow
                    key={field._uiId} 
                    field={field}
                    onChange={(updatedField) => handleFieldChange(field._uiId!, updatedField)}
                    onRemove={() => handleRemoveField(field._uiId!)}
                    isSaving={isSaving || isLoadingContexts}
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
              disabled={isSaving || isLoadingContexts}
              className="mt-4"
              title="Add a new data field"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Builder & Preview */}
      <div className="flex flex-col md:flex-row md:gap-6 items-start">
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
                                handleGenerateJsonFromBuilder(false); 
                            }
                            setActiveEditorView(newView);
                        }}
                        aria-label="Toggle editor view"
                        disabled={isSaving || isLoadingContexts}
                    />
                </div>
            </div>
            <CardDescription className="text-sm pt-2 text-muted-foreground">
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
                        <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving || isLoadingContexts}>
                            <SelectTrigger id={`canvasSizePreset-${mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select size preset" /></SelectTrigger>
                            <SelectContent>{COMMON_CARD_SIZES.map(size => (<SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    {selectedSizePreset === 'custom' ? (
                        <>
                            <div><Label htmlFor={`canvasWidth-${mode}`} className="text-xs font-medium">Custom Width (CSS)</Label><Input id={`canvasWidth-${mode}`} value={canvasWidthSetting} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs"/></div>
                            <div><Label htmlFor={`canvasHeight-${mode}`} className="text-xs font-medium">Custom Height (CSS)</Label><Input id={`canvasHeight-${mode}`} value={canvasHeightSetting} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs"/></div>
                        </>
                    ) : (
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                           <div><Label className="text-xs font-medium text-muted-foreground">Width</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.width || canvasWidthSetting}</p></div>
                           <div><Label className="text-xs font-medium text-muted-foreground">Height</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.height || canvasHeightSetting}</p></div>
                        </div>
                    )}
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end mt-2">
                    <div> <Label htmlFor={`tailwindCanvasBgColor-${mode}`} className="text-xs font-medium">BG Color (Tailwind)</Label> <Select value={tailwindCanvasBackgroundColor} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBackgroundColor', v)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBgColor-${mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select color"/></SelectTrigger> <SelectContent>{TAILWIND_BACKGROUND_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasDirectBgColor-${mode}`} className="text-xs font-medium">BG Color (CSS)</Label> <Input id={`canvasDirectBgColor-${mode}`} value={canvasDirectBackgroundColor} onChange={(e) => handleCanvasDirectCSSChange('canvasDirectBackgroundColor', e.target.value)} placeholder="e.g., #RRGGBB or hsl(...)" disabled={isSaving || isLoadingContexts || (tailwindCanvasBackgroundColor !== NONE_VALUE && !!tailwindCanvasBackgroundColor)} className="mt-1 h-8 text-xs"/> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderRadius-${mode}`} className="text-xs font-medium">Border Radius (Tailwind)</Label> <Select value={tailwindCanvasBorderRadius} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderRadius',v)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderRadius-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderWidth-${mode}`} className="text-xs font-medium">Border Width (Tailwind)</Label> <Select value={tailwindCanvasBorderWidth} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderWidth',v)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderWidth-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.filter(o => !o.label.includes("Side") && o.value !== NONE_VALUE).map(opt => (<SelectItem key={opt.value} value={opt.value }>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderColor-${mode}`} className="text-xs font-medium">Border Color (Tailwind)</Label> <Select value={tailwindCanvasBorderColor} onValueChange={(v) => handleCanvasTailwindChange('tailwindCanvasBorderColor',v)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderColor-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.filter(opt => opt.value === NONE_VALUE || opt.value === 'border' || !opt.value.includes('-')).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasBorderStyle-${mode}`} className="text-xs font-medium">Border Style (CSS)</Label> <Select value={canvasBorderStyle} onValueChange={(value) => handleCanvasDirectCSSChange('canvasBorderStyle', value)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`canvasBorderStyle-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem> <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem> </SelectContent> </Select> </div>
                  </div>
                </div>

                {/* Layout Elements Configuration */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30 flex-grow min-h-0 flex flex-col">
                  <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
                  <ScrollArea className="pr-2"> 
                      <div className="space-y-2">
                        {layoutElementGuiConfigs.map((config) => (
                          <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Switch id={`enable-${mode}-${config._uiId}`} checked={config.isEnabledOnCanvas} onCheckedChange={(checked) => handleGuiConfigChange(config._uiId!, 'isEnabledOnCanvas', checked)} disabled={isSaving || isLoadingContexts} />
                                <Label htmlFor={`enable-${mode}-${config._uiId}`} className="text-sm font-medium cursor-pointer"> {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span> </Label>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId!)} className="h-7 w-7 text-muted-foreground" disabled={!config.isEnabledOnCanvas || isSaving || isLoadingContexts}> {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} </Button>
                            </div>
                            {config.isExpandedInGui && config.isEnabledOnCanvas && (
                              <div className="mt-3 pt-3 border-t border-dashed space-y-4">
                                
                                <div className="space-y-1.5">
                                  <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3"/> Element Type & Icon Name</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                        <div>
                                            <Label htmlFor={`el-type-${mode}-${config._uiId}`} className="text-xs">Element Type</Label>
                                            <Select value={config.elementType} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'elementType', value as LayoutElementGuiConfig['elementType'])} disabled={isSaving || isLoadingContexts}>
                                                <SelectTrigger id={`el-type-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                                <SelectContent> <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem> <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem> <SelectItem value="iconFromData">Icon from Data</SelectItem> </SelectContent>
                                            </Select>
                                        </div>
                                        {config.elementType === 'iconValue' && (
                                            <div>
                                                <Label htmlFor={`el-icon-${mode}-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                                <Input id={`el-icon-${mode}-${config._uiId}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSaving || isLoadingContexts}/>
                                                 <Accordion type="single" collapsible className="w-full text-xs mt-1" defaultValue="">
                                                    <AccordionItem value={`icon-browser-inline-${config._uiId}`} className="border-b-0">
                                                        <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5"><Copy className="mr-1 h-3 w-3" /> Browse Icons</AccordionTrigger>
                                                        <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                                            <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                                            <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                                                                <div className="grid gap-1 grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16">
                                                                    {commonLucideIconsForGuide.map(iconKey => (
                                                                        <TooltipProvider key={`${iconKey}-${config._uiId}-tooltip`} delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCopyIconName(iconKey as string)} className="h-7 w-7 p-1" ><IconComponent name={iconKey as string} className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent></Tooltip></TooltipProvider>
                                                                    ))}
                                                                </div>
                                                            </ScrollArea>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3"/> Position & Sizing (CSS)</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 pl-1">
                                        {(['styleTop', 'styleLeft', 'styleRight', 'styleBottom'] as const).map(prop => (
                                            <div key={prop}>
                                                <Label htmlFor={`el-${prop}-${mode}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS)</Label>
                                                <Input id={`el-${prop}-${mode}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, prop, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving || isLoadingContexts}/>
                                            </div>
                                        ))}
                                        <div><Label htmlFor={`el-styleMaxHeight-${mode}-${config._uiId}`} className="text-xs">Max Height (CSS)</Label><Input id={`el-styleMaxHeight-${mode}-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px or auto" disabled={isSaving || isLoadingContexts}/></div>
                                        <div><Label htmlFor={`el-stylePadding-${mode}-${config._uiId}`} className="text-xs">Padding (CSS)</Label><Input id={`el-stylePadding-${mode}-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px or 2px 4px" disabled={isSaving || isLoadingContexts}/></div>
                                    </div>
                                </div>
                                
                                {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                                <div className="space-y-1.5">
                                    <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3"/> Typography</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                        <div><Label htmlFor={`el-twTextColor-${mode}-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label><Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindTextColor', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twTextColor-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twFontSize-${mode}-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label><Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindFontSize', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twFontSize-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twFontWeight-${mode}-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label><Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindFontWeight', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twFontWeight-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-twLineHeight-${mode}-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label><Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindLineHeight', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twLineHeight-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div><Label htmlFor={`el-styleFontStyle-${mode}-${config._uiId}`} className="text-xs">Font Style (CSS)</Label><Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'styleFontStyle', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-styleFontStyle-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent></Select></div>
                                        <div><Label htmlFor={`el-styleTextAlign-${mode}-${config._uiId}`} className="text-xs">Text Align (CSS)</Label><Select value={config.styleTextAlign || 'left'} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'styleTextAlign', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-styleTextAlign-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem></SelectContent></Select></div>
                                    </div>
                                </div>
                                )}
                                
                                {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                <div className="space-y-1.5">
                                    <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3"/> Overflow & Display (Text - Tailwind)</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                      <div><Label htmlFor={`el-twOverflow-${mode}-${config._uiId}`} className="text-xs">Overflow</Label><Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindOverflow', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                      <div><Label htmlFor={`el-twTextOverflow-${mode}-${config._uiId}`} className="text-xs">Text Overflow</Label><Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindTextOverflow', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twTextOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                </div>
                                )}

                                <div className="space-y-1.5">
                                  <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3"/> Borders</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                    <div><Label htmlFor={`el-twBorderRadius-${mode}-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label><Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindBorderRadius', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twBorderRadius-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 pl-1 mt-2">
                                      {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => {
                                        const widthPropKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
                                        const colorPropKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
                                        return (
                                        <React.Fragment key={side}>
                                            <div> <Label htmlFor={`el-twBorder${side}W-${mode}-${config._uiId}`} className="text-xs">Border {side} W</Label> <Select value={(config as any)[widthPropKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, widthPropKey, value)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}W-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                                            <div> <Label htmlFor={`el-twBorder${side}Color-${mode}-${config._uiId}`} className="text-xs">{side} Color</Label> <Select value={(config as any)[colorPropKey] || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, colorPropKey, value)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}Color-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                                        </React.Fragment>
                                        );
                                      })}
                                  </div>
                                </div>
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
                      onBlur={validateAndFormatLayoutJsonOnBlur}
                      placeholder="Click \"Generate/Update JSON from Builder\" (in page actions menu) to populate, or paste/edit your JSON here."
                      rows={15}
                      className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                      disabled={isSaving || isLoadingContexts}
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
                    <Switch id={`show-pixel-grid-${mode}`} checked={showPixelGrid} onCheckedChange={setShowPixelGrid} aria-label="Show pixel grid" disabled={isSaving || isLoadingContexts} />
                 </div>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              This preview updates as you modify the {activeEditorView === 'gui' ? 'GUI builder settings' : 'JSON editor content'}. Uses sample data based on your field definitions.
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

