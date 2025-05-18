
// src/components/template-designer/TemplateDesigner.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PlusCircle, Save, Loader2, Eye, Palette, HelpCircle, Copy, ChevronDown, ChevronRight, Settings, EllipsisVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import type { CardTemplate, CardTemplateId, TemplateField, LayoutDefinition } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import FieldRow from '@/components/template-designer/field-row';

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
  findTailwindClassValue,
  findSideBorderClassValue,
  IconComponent
} from '@/lib/card-designer';

import type { TemplateFieldDefinition, LayoutElementGuiConfig } from '@/lib/card-designer';
import { mapFieldDefinitionToTemplateField, mapTemplateFieldToFieldDefinition } from '@/lib/card-designer';

console.log('[DEBUG] TemplateDesigner.tsx: Module loaded');

export interface TemplateDesignerProps {
  mode: "create" | "edit";
  initialTemplate?: CardTemplate;
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{ success: boolean, message?: string }>;
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

export function TemplateDesigner({
  mode,
  initialTemplate,
  onSave,
  isLoadingContexts = false,
  existingTemplateIds = [],
}: TemplateDesignerProps) {
  console.log('[DEBUG] TemplateDesigner: Rendering. Mode:', mode);
  if (initialTemplate) {
    console.log('[DEBUG] TemplateDesigner: Initial Template Name:', initialTemplate.name);
  }

  const { toast } = useToast();

  const [templateName, setTemplateName] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [templateIdToEdit, setTemplateIdToEdit] = useState<CardTemplateId | undefined>(undefined);

  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);

  // Canvas Setup State - Direct CSS for overall card
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(
     COMMON_CARD_SIZES.find(s => s.width === `${DEFAULT_CANVAS_WIDTH}px` && s.height === `${DEFAULT_CANVAS_HEIGHT}px`)?.value || "custom"
  );
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('hsl(var(--card))');
  const [canvasBorderColor, setCanvasBorderColor] = useState<string>('hsl(var(--border))');
  const [canvasBorderRadius, setCanvasBorderRadius] = useState<string>('calc(var(--radius) - 2px)');
  const [canvasBorderWidth, setCanvasBorderWidth] = useState<string>('1px');
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");
  
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialization effect
  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Initialization effect. Mode:', mode, 'InitialTemplate provided:', !!initialTemplate);
    if (mode === 'edit' && initialTemplate) {
      setTemplateName(initialTemplate.name);
      setTemplateId(initialTemplate.id); // For display
      setTemplateIdToEdit(initialTemplate.id);
      setFields(initialTemplate.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, `edit-${initialTemplate.id}-${idx}`)));
      const initialLayoutDef = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
      setLayoutDefinition(initialLayoutDef);

      try {
        const parsedLayout = JSON.parse(initialLayoutDef);
        setCanvasWidthSetting(parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`);
        const preset = COMMON_CARD_SIZES.find(s => String(s.width) === String(parsedLayout.width) && String(s.height) === String(parsedLayout.height));
        setSelectedSizePreset(preset ? preset.value : "custom");
        setCanvasBackgroundColor(parsedLayout.backgroundColor || 'hsl(var(--card))');
        setCanvasBorderColor(parsedLayout.borderColor || 'hsl(var(--border))');
        setCanvasBorderRadius(parsedLayout.borderRadius || 'calc(var(--radius) - 2px)');
        setCanvasBorderWidth(parsedLayout.borderWidth || '1px');
        setCanvasBorderStyle(parsedLayout.borderStyle || 'solid');
      } catch (e) {
        console.error("[DEBUG] TemplateDesigner: Error parsing initial layoutDefinition for canvas setup (edit mode):", e);
        // Fallback to defaults from DEFAULT_CARD_LAYOUT_JSON_STRING
        const defaultParsed = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);
        setCanvasWidthSetting(defaultParsed.width);
        setCanvasHeightSetting(defaultParsed.height);
        setSelectedSizePreset(COMMON_CARD_SIZES.find(s => s.width === defaultParsed.width && s.height === defaultParsed.height)?.value || "custom");
        setCanvasBackgroundColor(defaultParsed.backgroundColor);
        setCanvasBorderColor(defaultParsed.borderColor);
        setCanvasBorderRadius(defaultParsed.borderRadius);
        setCanvasBorderWidth(defaultParsed.borderWidth);
        setCanvasBorderStyle(defaultParsed.borderStyle);
      }
    } else if (mode === 'create') {
      setTemplateName('');
      setTemplateId('');
      setTemplateIdToEdit(undefined);
      setFields([]);
      setLayoutDefinition(DEFAULT_CARD_LAYOUT_JSON_STRING); // Minimal default
      const defaultParsed = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);
      setCanvasWidthSetting(defaultParsed.width);
      setCanvasHeightSetting(defaultParsed.height);
      setSelectedSizePreset(COMMON_CARD_SIZES.find(s => s.width === defaultParsed.width && s.height === defaultParsed.height)?.value || "custom");
      setCanvasBackgroundColor(defaultParsed.backgroundColor);
      setCanvasBorderColor(defaultParsed.borderColor);
      setCanvasBorderRadius(defaultParsed.borderRadius);
      setCanvasBorderWidth(defaultParsed.borderWidth);
      setCanvasBorderStyle(defaultParsed.borderStyle);
    }
  }, [mode, initialTemplate]);

  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(templateName ? toCamelCase(templateName) : '');
    }
  }, [templateName, mode]);

  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Syncing GUI configs. Fields count:', fields.length, 'LayoutDef changed.');
    let parsedLayout: LayoutDefinition;
    try {
      parsedLayout = JSON.parse(layoutDefinition || '{}');
      if (!Array.isArray(parsedLayout.elements)) {
        parsedLayout.elements = [];
      }
    } catch (e) {
      console.warn('[DEBUG] TemplateDesigner: Invalid JSON for element GUI config sync, using empty elements array.');
      parsedLayout = { width: canvasWidthSetting, height: canvasHeightSetting, elements: [] };
    }
    const elementsFromJsonMap = new Map(parsedLayout.elements.map((el: any) => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigs = fields.map((fieldDef, index) => {
        const existingJsonElement = elementsFromJsonMap.get(fieldDef.key);
        const defaultTop = `${10 + (index % 8) * 35}px`; // Default cascaded top
        const defaultLeft = '10px';

        let config: LayoutElementGuiConfig = {
          _uiId: fieldDef._uiId || `gui-field-${fieldDef.key}-${index}`,
          fieldKey: fieldDef.key,
          label: fieldDef.label,
          originalType: fieldDef.type,
          isEnabledOnCanvas: !!existingJsonElement,
          isExpandedInGui: prevConfigs.find(p => p._uiId === fieldDef._uiId)?.isExpandedInGui || false,
          
          elementType: existingJsonElement?.type || (fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text')),
          iconName: existingJsonElement?.icon || '',
          
          styleTop: existingJsonElement?.style?.top || (existingJsonElement ? '' : defaultTop),
          styleLeft: existingJsonElement?.style?.left || (existingJsonElement ? '' : defaultLeft),
          styleRight: existingJsonElement?.style?.right || '',
          styleBottom: existingJsonElement?.style?.bottom || '',
          styleMaxHeight: existingJsonElement?.style?.maxHeight || (fieldDef.type === 'textarea' ? 'auto' : ''),
          stylePadding: existingJsonElement?.style?.padding || '',
          styleFontStyle: existingJsonElement?.style?.fontStyle || 'normal',
          styleTextAlign: existingJsonElement?.style?.textAlign || 'left',
          
          tailwindTextColor: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_TEXT_COLORS, TAILWIND_TEXT_COLORS.find(c => c.value === 'text-black')?.value || NONE_VALUE) : (TAILWIND_TEXT_COLORS.find(c => c.value === 'text-black')?.value || NONE_VALUE),
          tailwindFontSize: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_FONT_SIZES) : (TAILWIND_FONT_SIZES.find(s => s.value === 'text-base')?.value || NONE_VALUE),
          tailwindFontWeight: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_FONT_WEIGHTS) : (TAILWIND_FONT_WEIGHTS.find(w => w.value === 'font-normal')?.value || NONE_VALUE),
          tailwindLineHeight: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_LINE_HEIGHTS) : (TAILWIND_LINE_HEIGHTS.find(lh => lh.value === 'leading-normal')?.value || NONE_VALUE),
          tailwindOverflow: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_OVERFLOW) : (TAILWIND_OVERFLOW.find(o => o.value === 'overflow-visible')?.value || NONE_VALUE),
          tailwindTextOverflow: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_TEXT_OVERFLOW) : NONE_VALUE,
          
          tailwindBorderRadius: existingJsonElement ? findTailwindClassValue(existingJsonElement.className, TAILWIND_BORDER_RADIUS_OPTIONS) : NONE_VALUE,
          tailwindBorderTopW: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderTopColor: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderRightW: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderRightColor: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderBottomW: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderBottomColor: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderLeftW: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
          tailwindBorderLeftColor: existingJsonElement ? findSideBorderClassValue(existingJsonElement.className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
        };
        return config;
      });

      if (JSON.stringify(newConfigs) !== JSON.stringify(prevConfigs)) {
        return newConfigs;
      }
      return prevConfigs;
    });
  }, [fields, layoutDefinition, mode]); // Removed canvasWidthSetting etc as direct deps for this specific sync

  useEffect(() => {
    console.log('[DEBUG] TemplateDesigner: Generating sampleCardForPreview.');
    const currentId = templateIdToEdit || templateId || 'previewTemplateId';
    const generatedSampleCard: Partial<CardData> & { [key: string]: any } = {
      id: 'preview-card',
      templateId: currentId as CardTemplateId,
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
            width: fieldDef.placeholderConfigWidth, height: fieldDef.placeholderConfigHeight,
            bgColor: fieldDef.placeholderConfigBgColor, textColor: fieldDef.placeholderConfigTextColor,
            text: fieldDef.placeholderConfigText,
          });
        }
      } else if (hasPreviewValue) {
        const pv = fieldDef.previewValue as string;
        if (fieldDef.type === 'number') valueForPreview = !isNaN(Number(pv)) ? Number(pv) : (hasDefaultValue ? Number(fieldDef.defaultValue) : 0);
        else if (fieldDef.type === 'boolean') valueForPreview = pv.toLowerCase() === 'true';
        else valueForPreview = pv;
      } else if (hasDefaultValue) {
        if (fieldDef.type === 'number') valueForPreview = Number(fieldDef.defaultValue) || 0;
        else if (fieldDef.type === 'boolean') valueForPreview = String(fieldDef.defaultValue).toLowerCase() === 'true';
        else valueForPreview = String(fieldDef.defaultValue);
      } else {
        switch (fieldDef.type) {
          case 'text': valueForPreview = `Sample ${fieldDef.label}`; break;
          case 'textarea': valueForPreview = `Sample content for ${fieldDef.label}.`; break;
          case 'number': valueForPreview = Math.floor(Math.random() * 10); break;
          case 'boolean': valueForPreview = Math.random() > 0.5; break;
          case 'select':
            const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
            valueForPreview = firstOptionValue || `Option Sample`; break;
          default: valueForPreview = `Value for ${fieldDef.label}`;
        }
      }
      generatedSampleCard[key] = valueForPreview;
    });

    const baseSampleValues: Partial<CardData> = {
        name: templateName || 'Awesome Card Name',
        cost: 3,
        imageUrl: generateSamplePlaceholderUrl({ width: 280, height: 140, text: 'Main Image' }),
        dataAiHint: 'card art sample',
        cardType: 'Creature - Goblin',
        effectText: 'Sample effect: Draw a card.',
        attack: 2,
        defense: 2,
        artworkUrl: generateSamplePlaceholderUrl({ width: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH, height: parseInt(canvasHeightSetting.replace('px','')) || DEFAULT_CANVAS_HEIGHT, text: 'Background Art' }),
        statusIcon: 'ShieldCheck',
        rarity: 'common',
        flavorText: 'A witty remark.',
        description: 'A general description.'
    };
    for (const key in baseSampleValues) {
        if (generatedSampleCard[key as keyof CardData] === undefined && !fields.some(f => f.key === key)) {
            generatedSampleCard[key as keyof CardData] = baseSampleValues[key as keyof CardData];
        }
    }
    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, templateName, templateId, templateIdToEdit, canvasWidthSetting, canvasHeightSetting]);

  const templateForPreview = useMemo((): CardTemplate => {
    console.log('[DEBUG] TemplateDesigner: Recalculating templateForPreview.');
    return {
      id: (templateIdToEdit || templateId || 'previewTemplateId') as CardTemplateId,
      name: templateName || 'Preview Template Name',
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition,
    };
  }, [templateId, templateIdToEdit, templateName, fields, layoutDefinition]);

  const handleAddField = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: handleAddField');
    const newFieldBaseLabel = `New Field`;
    let newFieldLabel = `${newFieldBaseLabel} ${fields.length + 1}`;
    let counter = fields.length + 1;
    while (fields.some(f => f.label === newFieldLabel)) {
      counter++; newFieldLabel = `${newFieldBaseLabel} ${counter}`;
    }
    let baseKey = toCamelCase(newFieldLabel);
    if (!baseKey) baseKey = `newField${fields.length + 1}`;
    let newKey = baseKey;
    let keyCounter = 1;
    while (fields.some(f => f.key === newKey)) {
      newKey = `${baseKey}${keyCounter}`; keyCounter++;
    }
    const newUiId = `field-${mode}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setFields(prevFields => [...prevFields, {
        _uiId: newUiId, key: newKey, label: newFieldLabel, type: 'text',
        placeholder: '', defaultValue: '', previewValue: '', optionsString: '',
        placeholderConfigWidth: parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH,
        placeholderConfigHeight: 140,
    }]);
    // Corresponding LayoutElementGuiConfig will be added by the sync effect
  }, [fields, canvasWidthSetting, mode]);

  const handleRemoveField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] TemplateDesigner: handleRemoveField for _uiId:', uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
    // Corresponding LayoutElementGuiConfig will be removed by the sync effect
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] TemplateDesigner: handleFieldChange for _uiId:', uiIdToUpdate);
    setFields(prevFields => prevFields.map(field => {
        if (field._uiId === uiIdToUpdate) {
          const oldField = { ...field };
          let modifiedField = { ...field, ...updatedFieldDefinition };
          if (updatedFieldDefinition.label !== undefined && updatedFieldDefinition.label !== oldField.label) {
            let baseKey = toCamelCase(updatedFieldDefinition.label);
            if (!baseKey) {
              const prefix = 'field'; let fallbackCounter = 1; let potentialKey = `${prefix}${fallbackCounter}`;
              while (prevFields.some(f => f._uiId !== uiIdToUpdate && f.key === potentialKey)) {
                fallbackCounter++; potentialKey = `${prefix}${fallbackCounter}`;
              }
              baseKey = potentialKey;
            }
            let newKey = baseKey; let keyCounter = 1;
            while (prevFields.some(f => f._uiId !== uiIdToUpdate && f.key === newKey)) {
              newKey = `${baseKey}${keyCounter}`; keyCounter++;
            }
            modifiedField.key = newKey;
          }
          if (updatedFieldDefinition.type === 'placeholderImage' && oldField.type !== 'placeholderImage') {
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth ?? (parseInt(canvasWidthSetting.replace('px','')) || DEFAULT_CANVAS_WIDTH);
            modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight ?? 140;
          } else if (updatedFieldDefinition.type && updatedFieldDefinition.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
            modifiedField.placeholderConfigWidth = undefined; modifiedField.placeholderConfigHeight = undefined;
            modifiedField.placeholderConfigBgColor = undefined; modifiedField.placeholderConfigTextColor = undefined;
            modifiedField.placeholderConfigText = undefined;
          }
          return modifiedField;
        }
        return field;
      })
    );
  }, [canvasWidthSetting]);

  const handleSizePresetChange = (value: string) => {
    console.log('[DEBUG] TemplateDesigner: handleSizePresetChange:', value);
    setSelectedSizePreset(value);
    if (value !== "custom") {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
  };
  
  const handleCanvasDirectCSSChange = (prop: 'canvasBackgroundColor' | 'canvasBorderColor' | 'canvasBorderRadius' | 'canvasBorderWidth' | 'canvasBorderStyle', value: string) => {
    console.log('[DEBUG] TemplateDesigner: handleCanvasDirectCSSChange:', prop, value);
    switch (prop) {
      case 'canvasBackgroundColor': setCanvasBackgroundColor(value); break;
      case 'canvasBorderColor': setCanvasBorderColor(value); break;
      case 'canvasBorderRadius': setCanvasBorderRadius(value); break;
      case 'canvasBorderWidth': setCanvasBorderWidth(value); break;
      case 'canvasBorderStyle': setCanvasBorderStyle(value); break;
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

  const handleGenerateJsonFromBuilder = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: handleGenerateJsonFromBuilder');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: React.CSSProperties & { [key: string]: any } = { position: "absolute" };
      const classNames: string[] = [];

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
      if (config.originalType === 'textarea' || config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');

      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);
      
      let hasAnyActiveSideBorder = false;
      (['Top', 'Right', 'Bottom', 'Left'] as const).forEach(side => {
        const widthKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
        const colorKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
        const widthValue = config[widthKey] as string | undefined;
        const colorValue = config[colorKey] as string | undefined;

        if (widthValue && widthValue !== NONE_VALUE) {
            hasAnyActiveSideBorder = true;
            const sideChar = side.charAt(0).toLowerCase() as 't'|'r'|'b'|'l';
            classNames.push(getSideBorderWidthClass(sideChar, widthValue, BORDER_SIDE_WIDTH_OPTIONS));
            if (colorValue && colorValue !== NONE_VALUE) {
                 classNames.push(`border-${sideChar}-${colorValue}`);
            }
        }
      });
      if (hasAnyActiveSideBorder && !classNames.some(cls => cls.startsWith('border-t-') || cls.startsWith('border-r-') || cls.startsWith('border-b-') || cls.startsWith('border-l-') || cls.startsWith('border-primary') || cls.startsWith('border-slate') )) {
          // If side widths are set but no specific side colors or global color from palette, apply default border color
          // This depends on how BORDER_SIDE_WIDTH_OPTIONS returns classes (e.g. 'border-t-2')
          // And assumes tailwindBorderColor is the global one from the GUI config for borders
          // This part might need refinement if tailwindBorderColor state is removed/changed.
          // For now, let's assume if any side border is on, and no palette color is applied, use default.
          // This is tricky because individual side colors are now possible.
          // Let's simplify: if any side has width, and no specific color for THAT side, use a default if no global color.
          // The BORDER_SIDE_WIDTH_OPTIONS now directly returns full class like 'border-t-2'.
          // The side color logic above (e.g. `border-${sideChar}-${colorValue}`) should handle colors correctly.
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
      
      // addStyleIfPresent('borderTop', config.styleBorderTop); // Removed, handled by Tailwind classes
      // addStyleIfPresent('borderBottom', config.styleBorderBottom); // Removed

      const element: any = { fieldKey: config.fieldKey, type: config.elementType };
      if (Object.keys(style).length > 0) element.style = style;
      const finalClassName = classNames.filter(Boolean).join(' ').trim();
      if (finalClassName) element.className = finalClassName;
      if ((config.elementType === 'iconValue') && config.iconName?.trim()) element.icon = config.iconName.trim();

      return element;
    });

    const newLayout: LayoutDefinition = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: canvasBackgroundColor,
      borderColor: canvasBorderColor,
      borderRadius: canvasBorderRadius,
      borderWidth: canvasBorderWidth,
      borderStyle: canvasBorderStyle,
      elements: generatedElements
    };

    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    setLayoutDefinition(newLayoutJsonString);
    toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated in the textarea." });
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    canvasBackgroundColor, canvasBorderColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
    toast
  ]);

  const validateAndFormatLayoutJsonOnBlur = useCallback(() => {
    console.log('[DEBUG] TemplateDesigner: Validating and formatting JSON from textarea on blur.');
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
  }, [layoutDefinition]);

  const handleSave = async () => {
    console.log('[DEBUG] TemplateDesigner: handleSave called.');
    setIsSaving(true);

    let currentIdForSave = mode === 'edit' ? templateIdToEdit : templateId;
    if (!currentIdForSave && mode === 'create' && templateName.trim()) {
      currentIdForSave = toCamelCase(templateName.trim()) || 'untitledTemplate';
    }

    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      setIsSaving(false); return;
    }
    if (!currentIdForSave) {
      toast({ title: "Missing ID", description: "Template ID could not be determined.", variant: "destructive" });
      setIsSaving(false); return;
    }
    if (mode === 'create' && existingTemplateIds?.includes(currentIdForSave as CardTemplateId)) {
      toast({ title: "Duplicate ID", description: `A template with ID '${currentIdForSave}' already exists. Choose a unique name.`, variant: "destructive", duration: 7000 });
      setIsSaving(false); return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Add at least one data field.", variant: "destructive" });
      setIsSaving(false); return;
    }
    // Duplicate field key check within `fields` state
    const fieldKeysSet = new Set<string>();
    let hasDuplicateKeys = false;
    let duplicateKeyValues: string[] = [];
    for (const field of fields) {
      if (!field.key || !field.key.trim()) {
        toast({ title: "Empty Field Key", description: `Field "${field.label}" has an empty key. Ensure all fields have valid labels.`, variant: "destructive", duration: 7000 });
        setIsSaving(false); return;
      }
      if (fieldKeysSet.has(field.key)) {
        hasDuplicateKeys = true;
        if (!duplicateKeyValues.includes(field.key)) duplicateKeyValues.push(field.key);
      } else {
        fieldKeysSet.add(field.key);
      }
    }
    if (hasDuplicateKeys) {
      toast({ title: "Duplicate Field Keys", description: `Field keys must be unique. Duplicates: ${duplicateKeyValues.join(', ')}. Adjust field labels.`, variant: "destructive", duration: 7000 });
      setIsSaving(false); return;
    }

    let finalLayoutDefToSave = layoutDefinition;
    if (!finalLayoutDefToSave.trim()) {
      finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else {
      try {
        JSON.parse(finalLayoutDefToSave);
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        toast({ title: "Invalid Layout JSON", description: `JSON is invalid: ${e.message}. Correct before saving.`, variant: "destructive", duration: 7000 });
        setIsSaving(false); return;
      }
    }

    const templateToSave: CardTemplate = {
      id: currentIdForSave as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };

    console.log('[DEBUG] TemplateDesigner: Calling props.onSave with ID:', currentIdForSave);
    try {
      await onSave(templateToSave, mode === 'edit' ? templateIdToEdit : undefined);
    } catch (err) {
      console.error('[DEBUG] TemplateDesigner: props.onSave promise rejected', err);
      toast({ title: "Save Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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

  const isGenerateJsonDisabled = isSaving || isLoadingContexts || layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0;
  const isSaveButtonDisabled = isSaving || isLoadingContexts || !templateName.trim() || fields.length === 0 || !!layoutJsonError;

  const pageTitle = mode === 'create' ? "Create New Template" : `Edit Template: ${initialTemplate?.name || '...'}`;
  const saveButtonText = mode === 'create' ? "Save Template" : "Save Changes";

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
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
                    onClick={() => handleGenerateJsonFromBuilder()}
                    disabled={isGenerateJsonDisabled}
                    title={layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0 ? "Enable at least one element in GUI builder first" : undefined}
                  >
                    <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSave}
                    disabled={isSaveButtonDisabled}
                  >
                    {isSaving ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>) : (<> <Save className="mr-2 h-4 w-4" /> {saveButtonText} </>)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="text-sm pt-4 text-muted-foreground">
            {mode === 'create'
              ? "Define template name and data fields. Then, use the Visual Layout Builder to configure how card data is displayed. Template ID is auto-generated from name."
              : `Template ID (${templateIdToEdit || templateId}) is fixed. Edit name, data fields, and use the builder for the visual layout.`
            }
            Templates are saved to browser local storage.
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
            <ScrollArea> {/* No max-h, allow full scroll */}
              <div className="space-y-2 pr-1"> {/* Added pr-1 for scrollbar */}
                {fields.map((field, index) => (
                  <FieldRow
                    key={field._uiId || `field-${index}`}
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
            </ScrollArea>
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

      <div className="grid grid-cols-1 md:grid-cols-1 lg:flex lg:gap-6 items-start">
        <Card className="lg:w-[65%] flex flex-col shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
            </div>
            <CardDescription className="text-sm pt-2 text-muted-foreground">
              Configure canvas settings and enable data fields to include them in the layout. 
              Use the controls below each field to define its appearance. 
              Click "Generate/Update JSON" (in page actions menu) to see the JSON output.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            <div className="space-y-3 p-3 border rounded-md bg-muted/30 dark:bg-muted/10">
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
                    <div><Label htmlFor={`canvasWidth-${mode}`} className="text-xs font-medium">Width (CSS)</Label><Input id={`canvasWidth-${mode}`} value={canvasWidthSetting} onChange={(e) => { setCanvasWidthSetting(e.target.value); setSelectedSizePreset("custom"); }} disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /></div>
                    <div><Label htmlFor={`canvasHeight-${mode}`} className="text-xs font-medium">Height (CSS)</Label><Input id={`canvasHeight-${mode}`} value={canvasHeightSetting} onChange={(e) => { setCanvasHeightSetting(e.target.value); setSelectedSizePreset("custom"); }} disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /></div>
                  </>
                ) : (
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div><Label className="text-xs font-medium text-muted-foreground">Width</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.width || canvasWidthSetting}</p></div>
                    <div><Label className="text-xs font-medium text-muted-foreground">Height</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === selectedSizePreset)?.height || canvasHeightSetting}</p></div>
                  </div>
                )}
                 <div> <Label htmlFor={`canvasBgColor-${mode}`} className="text-xs font-medium">Background Color (CSS)</Label> <Input id={`canvasBgColor-${mode}`} value={canvasBackgroundColor} onChange={(e) => handleCanvasDirectCSSChange('canvasBackgroundColor', e.target.value)} placeholder="e.g., hsl(var(--card))" disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /> </div>
                 <div> <Label htmlFor={`canvasBorderRadius-${mode}`} className="text-xs font-medium">Border Radius (CSS)</Label> <Input id={`canvasBorderRadius-${mode}`} value={canvasBorderRadius} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderRadius', e.target.value)} placeholder="e.g., 8px or 0.5rem" disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /> </div>
                 <div> <Label htmlFor={`canvasBorderWidth-${mode}`} className="text-xs font-medium">Border Width (CSS)</Label> <Input id={`canvasBorderWidth-${mode}`} value={canvasBorderWidth} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderWidth', e.target.value)} placeholder="e.g., 1px" disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /> </div>
                 <div> <Label htmlFor={`canvasBorderColor-${mode}`} className="text-xs font-medium">Border Color (CSS)</Label> <Input id={`canvasBorderColor-${mode}`} value={canvasBorderColor} onChange={(e) => handleCanvasDirectCSSChange('canvasBorderColor', e.target.value)} placeholder="e.g., hsl(var(--border))" disabled={isSaving || isLoadingContexts} className="mt-1 h-8 text-xs" /> </div>
                 <div> <Label htmlFor={`canvasBorderStyle-${mode}`} className="text-xs font-medium">Border Style (CSS)</Label> <Select value={canvasBorderStyle} onValueChange={(value) => handleCanvasDirectCSSChange('canvasBorderStyle', value)} disabled={isSaving || isLoadingContexts}> <SelectTrigger id={`canvasBorderStyle-${mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem> <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem> </SelectContent> </Select> </div>
              </div>
            </div>

            <div className="space-y-3 p-3 border rounded-md bg-muted/30 dark:bg-muted/10 flex-grow min-h-0 flex flex-col">
              <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
              <ScrollArea className="pr-2"> {/* No max-h */}
                <div className="space-y-2">
                  {layoutElementGuiConfigs.map((config, index) => (
                    <div key={config._uiId || `gui-config-${index}`} className="p-2.5 border rounded-md bg-card/80 dark:bg-card/50 hover:bg-card transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch id={`enable-layout-el-${mode}-${config._uiId}`} checked={config.isEnabledOnCanvas} onCheckedChange={(checked) => handleGuiConfigChange(config._uiId!, 'isEnabledOnCanvas', checked)} disabled={isSaving || isLoadingContexts} />
                          <Label htmlFor={`enable-layout-el-${mode}-${config._uiId}`} className="text-sm font-medium cursor-pointer"> {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span> </Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleGuiExpand(config._uiId!)} className="h-7 w-7 text-muted-foreground" disabled={!config.isEnabledOnCanvas || isSaving || isLoadingContexts}> {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} </Button>
                      </div>
                      {config.isExpandedInGui && config.isEnabledOnCanvas && (
                        <div className="mt-3 pt-3 border-t border-dashed space-y-4">
                          <div className="space-y-1.5">
                            <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Element Type & Icon</h5>
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
                                  <Input id={`el-icon-${mode}-${config._uiId}`} value={config.iconName || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={isSaving || isLoadingContexts} />
                                  <Accordion type="single" collapsible className="w-full text-xs mt-1" defaultValue="">
                                    <AccordionItem value={`icon-browser-inline-${config._uiId}`} className="border-b-0">
                                      <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5"><Copy className="mr-1 h-3 w-3" /> Browse Icons</AccordionTrigger>
                                      <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                        <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                        <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                                          <div className="grid gap-1 grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16">
                                            {commonLucideIconsForGuide.map(iconKey => (
                                              <TooltipProvider key={`${iconKey}-${config._uiId}-tooltip-inline`} delayDuration={100}>
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
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Position & Sizing (CSS)</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 pl-1">
                              {(['styleTop', 'styleLeft', 'styleRight', 'styleBottom'] as const).map(prop => (
                                <div key={prop}>
                                  <Label htmlFor={`el-${prop}-${mode}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS)</Label>
                                  <Input id={`el-${prop}-${mode}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, prop, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={isSaving || isLoadingContexts} />
                                </div>
                              ))}
                              <div><Label htmlFor={`el-styleMaxHeight-${mode}-${config._uiId}`} className="text-xs">Max Height (CSS)</Label><Input id={`el-styleMaxHeight-${mode}-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px or auto" disabled={isSaving || isLoadingContexts} /></div>
                              <div><Label htmlFor={`el-stylePadding-${mode}-${config._uiId}`} className="text-xs">Padding (CSS)</Label><Input id={`el-stylePadding-${mode}-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => handleGuiConfigChange(config._uiId!, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px or 2px 4px" disabled={isSaving || isLoadingContexts} /></div>
                            </div>
                          </div>
                          {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                            <div className="space-y-1.5">
                              <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Typography</h5>
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
                              <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Overflow & Display (Text - Tailwind)</h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                <div><Label htmlFor={`el-twOverflow-${mode}-${config._uiId}`} className="text-xs">Overflow</Label><Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindOverflow', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label htmlFor={`el-twTextOverflow-${mode}-${config._uiId}`} className="text-xs">Text Overflow</Label><Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => handleGuiConfigChange(config._uiId!, 'tailwindTextOverflow', value)} disabled={isSaving || isLoadingContexts}><SelectTrigger id={`el-twTextOverflow-${mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Borders</h5>
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

            <div className="mt-4 flex-grow flex flex-col">
              <div>
                <Label htmlFor={`layoutDefinition-${mode}`} className="text-sm font-medium">Layout Definition JSON (Builder output updates here)</Label>
                <Textarea
                  id={`layoutDefinition-${mode}`}
                  value={layoutDefinition}
                  onChange={(e) => {
                    setLayoutDefinition(e.target.value);
                    if (layoutJsonError) setLayoutJsonError(null);
                  }}
                  onBlur={validateAndFormatLayoutJsonOnBlur}
                  placeholder='Click "Generate/Update JSON from Builder" (in page actions menu) to populate, or paste/edit your JSON here.'
                  rows={15}
                  className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 dark:bg-muted/10 mt-1"
                  disabled={isSaving || isLoadingContexts}
                />
              </div>
              {layoutJsonError && (<Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4 !text-destructive-foreground" /><AlertTitle>JSON Error</AlertTitle><AlertDescription className="text-xs">{layoutJsonError}</AlertDescription></Alert>)}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:w-[35%] sticky top-20 self-start shadow-lg">
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
              This preview updates as you modify the Layout Definition JSON or GUI builder settings. Uses sample data based on your field definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 dark:bg-muted/10 rounded-b-md">
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

    