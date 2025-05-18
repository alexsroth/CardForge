// src/components/template-designer/TemplateDesigner.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, Loader2, HelpCircle, Palette, Save, Settings, ChevronDown, ChevronRight, Copy as CopyIcon } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { TemplateField as CoreTemplateField, CardTemplate, CardTemplateId, LayoutDefinition } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';

import {
  TemplateFieldDefinition,
  LayoutElementGuiConfig,
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
  IconComponent as LibIconComponent,
} from '@/lib/card-designer';

import FieldRow from '@/components/template-designer/field-row';
import { cn } from '@/lib/utils';


// Helper function to map TemplateFieldDefinition (UI state) to CoreTemplateField (storage format)
export const mapFieldDefinitionToTemplateField = (def: TemplateFieldDefinition): CoreTemplateField => {
  // console.log('[TemplateDesigner] mapFieldDefinitionToTemplateField:', def.label);
  const field: CoreTemplateField = {
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

// Helper function to map CoreTemplateField (storage format) to TemplateFieldDefinition (UI state)
export const mapTemplateFieldToFieldDefinition = (field: CoreTemplateField, index: number): TemplateFieldDefinition => {
  // console.log('[TemplateDesigner] mapTemplateFieldToFieldDefinition:', field.label);
  return {
    _uiId: `field-edit-${field.key}-${Date.now()}-${index}-${Math.random().toString(36).substring(2,7)}`,
    key: field.key,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue !== undefined ? String(field.defaultValue) : '',
    previewValue: field.defaultValue !== undefined ? String(field.defaultValue) : (field.placeholder || ''),
    optionsString: field.options?.map(opt => `${opt.value}:${opt.label}`).join(','),
    placeholderConfigWidth: field.placeholderConfigWidth,
    placeholderConfigHeight: field.placeholderConfigHeight,
    placeholderConfigBgColor: field.placeholderConfigBgColor,
    placeholderConfigTextColor: field.placeholderConfigTextColor,
    placeholderConfigText: field.placeholderConfigText,
  };
};

const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};


export interface TemplateDesignerProps {
  mode: "create" | "edit";
  initialTemplate?: CardTemplate;
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{success: boolean, message?: string}>;
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[]; 
}

export function TemplateDesigner(props: TemplateDesignerProps) {
  const { mode, initialTemplate, onSave, isLoadingContexts, existingTemplateIds = [] } = props;
  const { toast } = useToast();

  console.log(`[TemplateDesigner] Rendering. Mode: ${mode}. Initial Template Name: ${initialTemplate?.name}`);

  const [templateName, setTemplateName] = useState('');
  const [templateId, setTemplateId] = useState(''); // Auto-generated in create, read-only in edit
  const [templateIdToEdit, setTemplateIdToEdit] = useState<CardTemplateId | undefined>(undefined); // For edit mode
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [initialStatePopulated, setInitialStatePopulated] = useState(false);

  // GUI Builder State
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>('custom');
  
  const [tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius] = useState<string>(NONE_VALUE);
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(NONE_VALUE); // Overall color for borders defined by width
  const [tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth] = useState<string>(NONE_VALUE); // Overall width
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>('solid');

  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  
  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');


  // Effect to initialize state from initialTemplate (edit mode) or set defaults (create mode)
  useEffect(() => {
    console.log('[TemplateDesigner] Initializing state from props. Mode:', mode);
    if (mode === 'edit' && initialTemplate) {
      setTemplateName(initialTemplate.name);
      setTemplateId(initialTemplate.id); // This is read-only in UI for edit mode
      setTemplateIdToEdit(initialTemplate.id);
      setFields(initialTemplate.fields.map(mapTemplateFieldToFieldDefinition));
      const currentLayoutDef = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
      setLayoutDefinition(currentLayoutDef); // This will trigger the JSON -> GUI effect if view is GUI
      // GUI state will be populated by the effect watching layoutDefinition
    } else { // Create mode
      setTemplateName('');
      setTemplateId(''); // Will be derived from name
      setTemplateIdToEdit(undefined);
      setFields([]);
      setLayoutDefinition(DEFAULT_CARD_LAYOUT_JSON_STRING); // Start with minimal default
      // Set default canvas GUI states for create mode explicitly
      const defaultPreset = COMMON_CARD_SIZES.find(s => s.width === `${DEFAULT_CANVAS_WIDTH}px` && s.height === `${DEFAULT_CANVAS_HEIGHT}px`);
      setSelectedSizePreset(defaultPreset?.value || 'custom');
      setCanvasWidthSetting(`${DEFAULT_CANVAS_WIDTH}px`);
      setCanvasHeightSetting(`${DEFAULT_CANVAS_HEIGHT}px`);
      setTailwindCanvasBackgroundColor(TAILWIND_BACKGROUND_COLORS.find(c => c.value === 'bg-card')?.value || NONE_VALUE);
      setTailwindCanvasBorderRadius(TAILWIND_BORDER_RADIUS_OPTIONS.find(r => r.value === 'rounded-lg')?.value || NONE_VALUE);
      setTailwindCanvasBorderWidth(BORDER_SIDE_WIDTH_OPTIONS.find(w => w.value === 'default')?.value === 'default' ? 'border' : NONE_VALUE);
      setTailwindCanvasBorderColor(TAILWIND_BORDER_PALETTE_OPTIONS.find(c => c.value === 'border')?.value ? 'border-border' : NONE_VALUE); // map 'border' to 'border-border'
      setCanvasBorderStyle('solid');
    }
    setInitialStatePopulated(true); // Mark initial population as done
  }, [mode, initialTemplate]); // Only run when mode or initialTemplate changes


  // Auto-generate templateId from templateName in create mode
  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(toCamelCase(templateName));
    }
  }, [templateName, mode]);

  const validateAndFormatLayoutJson = useCallback((jsonString: string = layoutDefinition) => {
    try {
      const parsed = JSON.parse(jsonString);
      const formattedJson = JSON.stringify(parsed, null, 2);
      if (jsonString !== formattedJson) { // Only set if formatting changes, to avoid loops if called often
          setLayoutDefinition(formattedJson);
      }
      setLayoutJsonError(null);
      return true;
    } catch (err: any) {
      setLayoutJsonError(`Invalid JSON: ${err.message}`);
      return false;
    }
  }, [layoutDefinition, setLayoutDefinition, setLayoutJsonError]);


  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true) => {
    console.log('[TemplateDesigner] handleGenerateJsonFromBuilder called');
    const elements = layoutElementGuiConfigs
      .filter(config => config.isEnabledOnCanvas)
      .map(config => {
        const style: any = { position: 'absolute' };
        if (config.styleTop?.trim()) style.top = config.styleTop.trim();
        if (config.styleLeft?.trim()) style.left = config.styleLeft.trim();
        if (config.styleRight?.trim()) style.right = config.styleRight.trim();
        if (config.styleBottom?.trim()) style.bottom = config.styleBottom.trim();
        if (config.styleMaxHeight?.trim()) style.maxHeight = config.styleMaxHeight.trim();
        if (config.stylePadding?.trim()) style.padding = config.stylePadding.trim();
        if (config.styleFontStyle && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle;
        if (config.styleTextAlign && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign;

        const classNames = [];
        if (config.originalType === 'textarea' && config.elementType === 'textarea') classNames.push('whitespace-pre-wrap');

        if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
        else if (['text', 'textarea', 'iconValue'].includes(config.elementType)) classNames.push('text-black'); // Default to black if no GUI selection

        if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
        else if (['text', 'textarea', 'iconValue'].includes(config.elementType)) classNames.push('text-base');
        
        if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
        else if (['text', 'textarea', 'iconValue'].includes(config.elementType)) classNames.push('font-normal');

        if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
        else if (['text', 'textarea'].includes(config.elementType)) classNames.push('leading-normal');

        if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
        else if (['text', 'textarea'].includes(config.elementType)) classNames.push('overflow-visible');

        if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
        
        if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);
        
        let hasAnyBorderSideWidth = false;
        const borderSideClasses = [];
        if (config.tailwindBorderTopW && config.tailwindBorderTopW !== NONE_VALUE) { borderSideClasses.push(config.tailwindBorderTopW); hasAnyBorderSideWidth = true; if (config.tailwindBorderTopColor && config.tailwindBorderTopColor !== NONE_VALUE) borderSideClasses.push(getSideBorderColorClass('t', config.tailwindBorderTopColor, TAILWIND_BORDER_PALETTE_OPTIONS)); }
        if (config.tailwindBorderRightW && config.tailwindBorderRightW !== NONE_VALUE) { borderSideClasses.push(config.tailwindBorderRightW); hasAnyBorderSideWidth = true; if (config.tailwindBorderRightColor && config.tailwindBorderRightColor !== NONE_VALUE) borderSideClasses.push(getSideBorderColorClass('r', config.tailwindBorderRightColor, TAILWIND_BORDER_PALETTE_OPTIONS)); }
        if (config.tailwindBorderBottomW && config.tailwindBorderBottomW !== NONE_VALUE) { borderSideClasses.push(config.tailwindBorderBottomW); hasAnyBorderSideWidth = true; if (config.tailwindBorderBottomColor && config.tailwindBorderBottomColor !== NONE_VALUE) borderSideClasses.push(getSideBorderColorClass('b', config.tailwindBorderBottomColor, TAILWIND_BORDER_PALETTE_OPTIONS)); }
        if (config.tailwindBorderLeftW && config.tailwindBorderLeftW !== NONE_VALUE) { borderSideClasses.push(config.tailwindBorderLeftW); hasAnyBorderSideWidth = true; if (config.tailwindBorderLeftColor && config.tailwindBorderLeftColor !== NONE_VALUE) borderSideClasses.push(getSideBorderColorClass('l', config.tailwindBorderLeftColor, TAILWIND_BORDER_PALETTE_OPTIONS)); }

        if (hasAnyBorderSideWidth) {
            classNames.push(...borderSideClasses);
            // If any side width is set but no side colors were set, apply global border color or default
            if (borderSideClasses.every(cls => !cls.startsWith('border-t-') && !cls.startsWith('border-r-') && !cls.startsWith('border-b-') && !cls.startsWith('border-l-'))) {
               // This block might be redundant if getSideBorderColorClass handles default scenarios.
               // For now, ensure border-border if any width exists and no specific color for that side applied.
               if (!classNames.some(c => c.startsWith('border-') && c !== 'border-border' && c !== 'border-transparent' && !BORDER_SIDE_WIDTH_OPTIONS.map(o=>o.value).includes(c.replace('border-','')) && !BORDER_SIDE_WIDTH_OPTIONS.map(o=>o.value).includes(c.replace('border-t-','')).includes(c.replace('border-r-','')).includes(c.replace('border-b-','')).includes(c.replace('border-l-','')) )) {
                  classNames.push('border-border'); // Default fallback border color if widths are present
               }
            }
        }
        
        const element: any = { fieldKey: config.fieldKey, type: config.elementType };
        if (Object.keys(style).length > 0) element.style = style;
        if (classNames.filter(Boolean).length > 0) element.className = classNames.filter(Boolean).join(' ');
        if (config.elementType === 'iconValue' && config.iconName?.trim()) element.icon = config.iconName.trim();
        
        return element;
      });

    const newLayout: Partial<LayoutDefinition> = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      canvasClassName: [
        tailwindCanvasBackgroundColor !== NONE_VALUE ? tailwindCanvasBackgroundColor : 'bg-card',
        tailwindCanvasBorderRadius !== NONE_VALUE ? tailwindCanvasBorderRadius : 'rounded-lg',
        (tailwindCanvasBorderWidth !== NONE_VALUE && tailwindCanvasBorderWidth !== 'border-0') ? (tailwindCanvasBorderColor !== NONE_VALUE ? tailwindCanvasBorderColor : 'border-border') : '',
        (tailwindCanvasBorderWidth !== NONE_VALUE && tailwindCanvasBorderWidth !== 'border-0') ? tailwindCanvasBorderWidth : '',
      ].filter(Boolean).join(' '),
      borderStyle: canvasBorderStyle !== 'none' ? canvasBorderStyle : undefined, // Store undefined if 'none'
      elements,
    };
    
    const newLayoutJsonString = JSON.stringify(newLayout, null, 2);
    if (layoutDefinition !== newLayoutJsonString) {
      setLayoutDefinition(newLayoutJsonString); // This will trigger preview update and JSON->GUI sync if view changes
      if (showSuccessToast) {
        toast({ title: "JSON Updated", description: "Layout Definition JSON updated from GUI builder." });
      }
    } else if (showSuccessToast) {
      // toast({ title: "No Changes", description: "GUI settings already match current JSON." });
    }
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    tailwindCanvasBackgroundColor, tailwindCanvasBorderRadius, 
    tailwindCanvasBorderColor, tailwindCanvasBorderWidth, canvasBorderStyle,
    setLayoutDefinition, toast, layoutDefinition // Added layoutDefinition to compare before setting
  ]);

  // Effect to parse layoutDefinition JSON and populate GUI builder state (for edit mode or JSON edits)
  // This is the primary "JSON -> GUI" sync point.
  useEffect(() => {
    if (!initialStatePopulated && mode === 'edit') {
      console.log('[TemplateDesigner] JSON->GUI Sync: Waiting for initial state population.');
      return; 
    }
    // Only parse and update GUI if the source is the initial template or if we're switching to GUI view with potentially new JSON.
    // Avoid re-parsing if layoutDefinition was just updated by the GUI itself.
    if (mode === 'create' && !initialStatePopulated) { // For create mode, run once after defaults are set
        // This will populate layoutElementGuiConfigs based on the initial DEFAULT_CARD_LAYOUT_JSON_STRING and empty fields
    } else if (activeEditorView === 'json') {
        console.log('[TemplateDesigner] JSON->GUI Sync: In JSON view, skipping GUI update from layoutDefinition.');
        return; // Don't parse from JSON if user is actively editing JSON
    }


    console.log('[TemplateDesigner] useEffect: Parsing layoutDefinition to update GUI state. ActiveView:', activeEditorView, 'Source:', layoutDefinition.substring(0, 70) + '...');
    try {
        const parsedLayout = JSON.parse(layoutDefinition || '{}') as Partial<LayoutDefinition>;

        const newCanvasWidth = parsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`;
        const newCanvasHeight = parsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`;

        // Update canvas settings only if they differ from current state to avoid loops
        if (canvasWidthSetting !== newCanvasWidth) setCanvasWidthSetting(newCanvasWidth);
        if (canvasHeightSetting !== newCanvasHeight) setCanvasHeightSetting(newCanvasHeight);

        const foundPreset = COMMON_CARD_SIZES.find(p => p.width === newCanvasWidth && p.height === newCanvasHeight);
        const newSelectedPreset = foundPreset && foundPreset.value !== 'custom' ? foundPreset.value : 'custom';
        if (selectedSizePreset !== newSelectedPreset) setSelectedSizePreset(newSelectedPreset);
        
        const newTwBgColor = findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BACKGROUND_COLORS, NONE_VALUE);
        if (tailwindCanvasBackgroundColor !== newTwBgColor) setTailwindCanvasBackgroundColor(newTwBgColor);

        const newTwBorderRadius = findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE);
        if (tailwindCanvasBorderRadius !== newTwBorderRadius) setTailwindCanvasBorderRadius(newTwBorderRadius);
        
        const overallBorderWidthClass = findTailwindClassValue(
            parsedLayout.canvasClassName, 
            BORDER_SIDE_WIDTH_OPTIONS.map(o => ({ value: o.value === 'default' ? 'border' : (o.value === NONE_VALUE ? NONE_VALUE :`border-${o.value}`)})) , NONE_VALUE
        );
        if (tailwindCanvasBorderWidth !== overallBorderWidthClass) setTailwindCanvasBorderWidth(overallBorderWidthClass);
        
        const overallBorderColorClass = findTailwindClassValue(
          parsedLayout.canvasClassName,
          TAILWIND_BORDER_PALETTE_OPTIONS.map(o => ({value: o.value === NONE_VALUE ? NONE_VALUE : `border-${o.value}`})),
          NONE_VALUE
        );
        if (tailwindCanvasBorderColor !== overallBorderColorClass) setTailwindCanvasBorderColor(overallBorderColorClass);

        const newBorderStyle = parsedLayout.borderStyle || 'solid';
        if (canvasBorderStyle !== newBorderStyle) setCanvasBorderStyle(newBorderStyle);

        // Update layoutElementGuiConfigs based on parsed elements
        const existingElements = Array.isArray(parsedLayout.elements) ? parsedLayout.elements : [];
        setLayoutElementGuiConfigs(prevConfigs => { // Use functional update
            const updatedConfigs = fields.map((field, index) => {
                const currentGuiConfig = prevConfigs.find(c => c.fieldKey === field.key); // Get current GUI state for this field
                const existingLayoutElement = existingElements.find(el => el.fieldKey === field.key);
                const defaultTopValue = `${10 + (index % 10) * 25}px`; // Simpler cascading for default
                const defaultLeftValue = '10px';

                return {
                    _uiId: currentGuiConfig?._uiId || field._uiId || `gui-cfg-${field.key}-${Date.now()}`,
                    fieldKey: field.key,
                    label: field.label,
                    originalType: field.type,
                    isEnabledOnCanvas: !!existingLayoutElement,
                    isExpandedInGui: currentGuiConfig?.isExpandedInGui ?? false, // Preserve user's expansion choice
                    
                    elementType: existingLayoutElement?.type || 'text',
                    iconName: existingLayoutElement?.icon || '',

                    styleTop: existingLayoutElement?.style?.top ?? (existingLayoutElement ? '' : defaultTopValue),
                    styleLeft: existingLayoutElement?.style?.left ?? (existingLayoutElement ? '' : defaultLeftValue),
                    styleRight: existingLayoutElement?.style?.right ?? '',
                    styleBottom: existingLayoutElement?.style?.bottom ?? '',
                    styleMaxHeight: existingLayoutElement?.style?.maxHeight ?? '', // Default to blank, let user decide
                    stylePadding: existingLayoutElement?.style?.padding ?? '',
                    styleFontStyle: existingLayoutElement?.style?.fontStyle ?? 'normal',
                    styleTextAlign: existingLayoutElement?.style?.textAlign ?? 'left',
                    
                    tailwindTextColor: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_TEXT_COLORS) : "text-black",
                    tailwindFontSize: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_FONT_SIZES) : NONE_VALUE,
                    tailwindFontWeight: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_FONT_WEIGHTS) : NONE_VALUE,
                    tailwindLineHeight: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_LINE_HEIGHTS) : NONE_VALUE,
                    tailwindOverflow: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_OVERFLOW) : NONE_VALUE,
                    tailwindTextOverflow: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_TEXT_OVERFLOW) : NONE_VALUE,
                    
                    tailwindBorderRadius: existingLayoutElement ? findTailwindClassValue(existingLayoutElement.className, TAILWIND_BORDER_RADIUS_OPTIONS) : NONE_VALUE,
                    tailwindBorderTopW: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderRightW: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderBottomW: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderLeftW: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderTopColor: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderRightColor: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderBottomColor: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                    tailwindBorderLeftColor: existingLayoutElement ? findSideBorderClassValue(existingLayoutElement.className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) : NONE_VALUE,
                };
            });
            
            // Only update if the structure or key values actually changed to avoid loops
            if (JSON.stringify(updatedConfigs) !== JSON.stringify(prevConfigs)) {
                 setLayoutElementGuiConfigs(updatedConfigs);
            }
            return updatedConfigs; 
        });

    } catch (e) {
        console.warn("[TemplateDesigner] Error parsing layoutDefinition in useEffect (JSON->GUI), cannot update GUI state from JSON:", e);
        // Don't update GUI state if JSON is invalid. User must fix JSON or use Generate button.
        // setLayoutJsonError("Failed to parse JSON for GUI update. Please fix or use Generate button.");
    }
  // This effect should primarily react to layoutDefinition changes from external sources (initial load, direct JSON edit)
  // or when switching to 'gui' view. It also needs 'fields' to map correctly.
  }, [layoutDefinition, fields, mode, initialTemplate, initialStatePopulated, activeEditorView]);


  // Debounced effect to update JSON string from GUI changes (only when GUI is active)
  // This is the "GUI -> JSON" sync point.
  const debouncedGenerateJsonRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (activeEditorView === 'gui' && initialStatePopulated) {
      if (debouncedGenerateJsonRef.current) {
        clearTimeout(debouncedGenerateJsonRef.current);
      }
      debouncedGenerateJsonRef.current = setTimeout(() => {
        console.log('[TemplateDesigner] Debounced (GUI active): Calling handleGenerateJsonFromBuilder.');
        handleGenerateJsonFromBuilder(false); // false = don't show toast for these auto-updates
      }, 750); 
    }
    return () => {
      if (debouncedGenerateJsonRef.current) {
        clearTimeout(debouncedGenerateJsonRef.current);
      }
    };
  }, [
    activeEditorView, initialStatePopulated, handleGenerateJsonFromBuilder, // handleGenerateJsonFromBuilder is a useCallback
    canvasWidthSetting, canvasHeightSetting, 
    tailwindCanvasBackgroundColor, tailwindCanvasBorderRadius, 
    tailwindCanvasBorderColor, tailwindCanvasBorderWidth, canvasBorderStyle,
    layoutElementGuiConfigs
  ]);
  

  const handleAddField = useCallback(() => {
    console.log('[TemplateDesigner] handleAddField called');
    const newFieldKeyBase = `newField${fields.length + 1}`;
    const newField: TemplateFieldDefinition = {
      _uiId: `field-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      key: toCamelCase(newFieldKeyBase),
      label: `New Field ${fields.length + 1}`,
      type: 'text',
      placeholderConfigWidth: DEFAULT_CANVAS_WIDTH, 
      placeholderConfigHeight: DEFAULT_CANVAS_HEIGHT,
    };
    setFields(prev => [...prev, newField]);
  }, [fields]);

  const handleRemoveField = useCallback((uiIdToRemove: string) => {
    console.log('[TemplateDesigner] handleRemoveField:', uiIdToRemove);
    setFields(prev => prev.filter(f => f._uiId !== uiIdToRemove));
    setLayoutElementGuiConfigs(prev => prev.filter(cfg => cfg._uiId !== uiIdToRemove));
  }, []);

  const handleFieldChange = useCallback((updatedField: TemplateFieldDefinition) => {
    setFields(prevFields => {
      let keyConflict = false;
      const newKey = toCamelCase(updatedField.label) || updatedField.key; // Fallback to old key if label is empty

      // Check for key uniqueness if it changed
      if (newKey !== updatedField.key && prevFields.some(pf => pf.key === newKey && pf._uiId !== updatedField._uiId)) {
        keyConflict = true;
      }
      
      return prevFields.map(f => {
        if (f._uiId === updatedField._uiId) {
          if (keyConflict) {
            toast({ title: "Field Key Conflict", description: `Field key "${newKey}" (from label "${updatedField.label}") is already in use or invalid. Label change reverted for this field.`, variant: "destructive" });
            return { ...updatedField, key: f.key, label: f.label }; // Revert to old label/key
          }
          return { ...updatedField, key: newKey };
        }
        return f;
      });
    });
  }, [toast]);

  const handleGuiConfigChange = useCallback((_uiId: string, updatedConfigPartial: Partial<LayoutElementGuiConfig>) => {
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === _uiId ? { ...config, ...updatedConfigPartial } : config
      )
    );
  }, []);

  const handleSave = async () => {
    console.log('[TemplateDesigner] handleSave called');
    if (!templateName.trim()) {
      toast({ title: "Validation Error", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    if (mode === 'create' && !templateId.trim()) {
      toast({ title: "Validation Error", description: "Template ID cannot be empty (derived from name).", variant: "destructive" });
      return;
    }
    if (mode === 'create' && existingTemplateIds.includes(templateId as CardTemplateId)) {
      toast({ title: "Validation Error", description: `Template ID "${templateId}" already exists. Choose a different name.`, variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Validation Error", description: "A template must have at least one data field.", variant: "destructive" });
      return;
    }
    
    // Final validation of the JSON in the textarea before saving
    if (!validateAndFormatLayoutJson(layoutDefinition)) { 
      toast({ title: "Validation Error", description: `Layout Definition JSON is invalid. ${layoutJsonError}`, variant: "destructive" });
      setActiveEditorView('json'); // Switch to JSON view if error on save
      return;
    }

    setIsSaving(true);
    const templateToSave: CardTemplate = {
      id: (mode === 'edit' ? templateIdToEdit : templateId) as CardTemplateId,
      name: templateName,
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition, // Use the content of the string state
    };

    try {
        await onSave(templateToSave, mode === 'edit' ? templateIdToEdit : undefined);
        // Success toast and navigation are handled by the parent page (new/edit)
    } catch (error) {
        console.error("[TemplateDesigner] Error during onSave callback:", error);
        // Parent page should show its own toast for onSave failures
    } finally {
        setIsSaving(false);
    }
  };

  const sampleCardForPreview = useMemo<CardData | null>(() => {
    const idForPreview = (templateIdToEdit || templateId || 'previewTemplateId') as CardTemplateId;
    const data: Partial<CardData> & { [key: string]: any } = {
      id: 'preview-card',
      templateId: idForPreview,
      name: templateName || 'Awesome Card Name',
    };
    fields.forEach(fieldDef => { /* ... same logic as before ... */ 
      let value: any;
      const hasPreviewValue = fieldDef.previewValue !== undefined && String(fieldDef.previewValue).trim() !== '';
      const hasDefaultValue = fieldDef.defaultValue !== undefined && String(fieldDef.defaultValue).trim() !== '';

      if (hasPreviewValue) {
        if (fieldDef.type === 'number') value = Number(fieldDef.previewValue) || 0;
        else if (fieldDef.type === 'boolean') value = String(fieldDef.previewValue).toLowerCase() === 'true';
        else if (fieldDef.type === 'placeholderImage' && (String(fieldDef.previewValue).startsWith('http') || String(fieldDef.previewValue).startsWith('/'))) {
            value = String(fieldDef.previewValue);
        }
        else value = String(fieldDef.previewValue);
      } else if (hasDefaultValue) {
        if (fieldDef.type === 'number') value = Number(fieldDef.defaultValue) || 0;
        else if (fieldDef.type === 'boolean') value = String(fieldDef.defaultValue).toLowerCase() === 'true';
        else value = String(fieldDef.defaultValue);
      }

      if (value === undefined) {
        if (fieldDef.type === 'placeholderImage') {
          value = generateSamplePlaceholderUrl({
            width: fieldDef.placeholderConfigWidth,
            height: fieldDef.placeholderConfigHeight,
            bgColor: fieldDef.placeholderConfigBgColor,
            textColor: fieldDef.placeholderConfigTextColor,
            text: fieldDef.placeholderConfigText || fieldDef.label,
          });
        } else if (fieldDef.type === 'number') {
          value = 0;
        } else if (fieldDef.type === 'boolean') {
          value = false;
        } else {
          value = `Sample ${fieldDef.label}`;
        }
      }
      data[fieldDef.key as keyof CardData] = value;
    });
    if (data.cost === undefined) data.cost = 3;
    if (data.imageUrl === undefined) data.imageUrl = generateSamplePlaceholderUrl({ width: 280, height: 140, text: "Main Image" });
    if (data.dataAiHint === undefined) data.dataAiHint = "card art sample";
    if (data.cardType === undefined) data.cardType = "Creature - Goblin";
    if (data.effectText === undefined) data.effectText = "Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.";
    if (data.attack === undefined) data.attack = 2;
    if (data.defense === undefined) data.defense = 2;
    if (data.artworkUrl === undefined) data.artworkUrl = generateSamplePlaceholderUrl({ width: 280, height: 400, text: "Background Art"});
    if (data.statusIcon === undefined) data.statusIcon = 'ShieldCheck';
    return data as CardData;
  }, [templateIdToEdit, templateId, templateName, fields]);

  const templateForPreview = useMemo<CardTemplate>(() => {
    return {
      id: (templateIdToEdit || templateId || 'previewTemplateId') as CardTemplateId,
      name: templateName || 'Preview Template Name',
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition,
    };
  }, [templateIdToEdit, templateId, templateName, fields, layoutDefinition]);

  const handleSizePresetChange = (value: string) => {
    setSelectedSizePreset(value);
    if (value === 'custom') {
      setCanvasWidthSetting(prev => prev || `${DEFAULT_CANVAS_WIDTH}px`);
      setCanvasHeightSetting(prev => prev || `${DEFAULT_CANVAS_HEIGHT}px`);
    } else {
      const preset = COMMON_CARD_SIZES.find(p => p.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
  };
  
  const handleCustomDimensionChange = (type: 'width' | 'height', value: string) => {
    if (type === 'width') setCanvasWidthSetting(value);
    if (type === 'height') setCanvasHeightSetting(value);
    setSelectedSizePreset('custom');
  };

  const handleCopyIconName = useCallback(async (iconName: string) => {
    try {
      await navigator.clipboard.writeText(iconName);
      toast({
        title: "Copied!",
        description: `Icon name "${iconName}" copied to clipboard.`,
      });
    } catch (err) {
      console.error("Failed to copy icon name: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy icon name to clipboard.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const isSaveDisabled = isSaving || !templateName.trim() || fields.length === 0 || (mode === 'create' && !templateId.trim()) || (mode === 'create' && existingTemplateIds.includes(templateId as CardTemplateId));
  const isGenerateJsonDisabled = isSaving || layoutElementGuiConfigs.filter(cfg => cfg.isEnabledOnCanvas).length === 0;
  
  const pageActionsHeaderRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (pageActionsHeaderRef.current) {
      setHeaderHeight(pageActionsHeaderRef.current.offsetHeight);
    }
  }, []); // Runs once after mount to get header height


  // Unique IDs for accordion items
  const iconBrowserAccordionId = useMemo(() => `icon-browser-${props.mode}-${initialTemplate?.id || 'new'}`, [props.mode, initialTemplate?.id]);
  
  if (isLoadingContexts && !initialStatePopulated && mode === 'edit') {
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
         <CardHeader ref={pageActionsHeaderRef}> {/* Attach ref here */}
           <div 
             className="sticky bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center rounded-t-lg"
             style={{ top: `calc(var(--main-header-height, 56px) + 0.5rem)` }} // Adjust based on main header height
           >
            <CardTitle className="text-2xl font-bold">
              {mode === 'create' ? 'Create New Card Template' : `Edit Template: ${initialTemplate?.name || templateName || '...'}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Page Actions">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleGenerateJsonFromBuilder(true)}
                    disabled={isGenerateJsonDisabled || isSaving}
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Generate/Update JSON from Builder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSave} disabled={isSaveDisabled}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {mode === 'create' ? 'Save Template' : 'Save Changes'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardDescription className="px-6 pb-2 text-sm text-muted-foreground pt-4"> {/* Added pt-4 */}
          {mode === 'create' ?
            "Define the structure (data fields) and appearance (layout JSON or GUI builder) for a new type of card. Template ID is auto-generated. Fields are saved to browser local storage." :
            "Modify the data fields and layout for this card template. Changes are saved to browser local storage."
          }
        </CardDescription>
        <CardContent className="space-y-6">
          {/* TemplateInfo Component */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                placeholder="e.g., 'Hero Unit Card'"
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={isSaving || isLoadingContexts}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="templateId">Template ID {mode === 'create' ? '(auto-generated)' : '(read-only)'}</Label>
              <Input
                id="templateId"
                value={templateId}
                readOnly
                disabled // Always disabled as it's auto or fixed
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
          {/* DataFieldsPanel Component */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Data Fields</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddField} 
                disabled={isSaving || isLoadingContexts}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Field
              </Button>
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No data fields defined yet. Add fields to get started.</p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <FieldRow
                    key={field._uiId || index}
                    field={field}
                    onChange={handleFieldChange}
                    onRemove={() => handleRemoveField(field._uiId!)}
                    isSaving={isSaving}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Builder & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"> {/* Use lg for side-by-side */}
        {/* Visual Layout Builder & JSON Output Card */}
         <Card className="shadow-lg flex flex-col"> 
           <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">Visual Layout Builder &amp; JSON Output</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="editor-view-toggle" className="text-xs text-muted-foreground">JSON</Label>
                    <Switch
                        id="editor-view-toggle"
                        checked={activeEditorView === 'gui'}
                        onCheckedChange={(checked) => {
                            console.log('[TemplateDesigner] Editor view toggled to:', checked ? 'gui' : 'json');
                            setActiveEditorView(checked ? 'gui' : 'json');
                            if (!checked) { // Switched to JSON view
                                validateAndFormatLayoutJson(layoutDefinition); // Format JSON in textarea
                            }
                        }}
                        aria-label="Toggle between GUI builder and JSON editor"
                        disabled={isSaving}
                    />
                    <Label htmlFor="editor-view-toggle" className="text-xs text-muted-foreground">GUI</Label>
                </div>
            </div>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              {activeEditorView === 'gui' 
                ? "Use the GUI to configure canvas and layout elements. Live Preview updates from GUI changes. Use 'Generate/Update JSON' from page actions to finalize JSON from GUI settings."
                : "Directly edit the Layout Definition JSON. Changes here will update the preview. GUI controls will reflect these changes if you switch back (if JSON is valid)."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col min-h-0">
            {activeEditorView === 'gui' ? (
              <>
                {/* Card Canvas Setup */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <h4 className="text-md font-semibold text-foreground">Card Canvas Setup</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <Label htmlFor="canvasSizePreset" className="text-xs">Canvas Size Preset</Label>
                      <Select value={selectedSizePreset} onValueChange={handleSizePresetChange} disabled={isSaving}>
                        <SelectTrigger id="canvasSizePreset" className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_CARD_SIZES.map(size => (
                            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2">
                       <div>
                        <Label htmlFor="canvasWidth" className="text-xs">Width (CSS)</Label>
                        <Input id="canvasWidth" value={canvasWidthSetting} 
                               onChange={(e) => handleCustomDimensionChange('width', e.target.value)}
                               placeholder="e.g., 280px" disabled={isSaving || selectedSizePreset !== 'custom'} className="mt-1 h-8 text-xs"/>
                      </div>
                      <div>
                        <Label htmlFor="canvasHeight" className="text-xs">Height (CSS)</Label>
                        <Input id="canvasHeight" value={canvasHeightSetting}
                               onChange={(e) => handleCustomDimensionChange('height', e.target.value)} 
                               placeholder="e.g., 400px" disabled={isSaving || selectedSizePreset !== 'custom'} className="mt-1 h-8 text-xs"/>
                      </div>
                    </div>
                     <div>
                        <Label htmlFor="tailwindCanvasBgColor" className="text-xs">Background Color (Tailwind)</Label>
                        <Select value={tailwindCanvasBackgroundColor} onValueChange={setTailwindCanvasBackgroundColor} disabled={isSaving}>
                            <SelectTrigger id="tailwindCanvasBgColor" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{TAILWIND_BACKGROUND_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="tailwindCanvasBorderRadius" className="text-xs">Border Radius (Tailwind)</Label>
                        <Select value={tailwindCanvasBorderRadius} onValueChange={setTailwindCanvasBorderRadius} disabled={isSaving}>
                            <SelectTrigger id="tailwindCanvasBorderRadius" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="tailwindCanvasBorderWidth" className="text-xs">Border Width (Tailwind)</Label>
                        <Select value={tailwindCanvasBorderWidth} onValueChange={setTailwindCanvasBorderWidth} disabled={isSaving}>
                            <SelectTrigger id="tailwindCanvasBorderWidth" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {BORDER_SIDE_WIDTH_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value === 'default' ? 'border' : (opt.value === NONE_VALUE ? NONE_VALUE : `border-${opt.value}`)}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="tailwindCanvasBorderColor" className="text-xs">Border Color (Tailwind)</Label>
                        <Select value={tailwindCanvasBorderColor} onValueChange={setTailwindCanvasBorderColor} disabled={isSaving}>
                            <SelectTrigger id="tailwindCanvasBorderColor" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value === NONE_VALUE ? NONE_VALUE : `border-${opt.value}`}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="canvasBorderStyle" className="text-xs">Border Style (CSS)</Label>
                        <Select value={canvasBorderStyle} onValueChange={setCanvasBorderStyle} disabled={isSaving}>
                            <SelectTrigger id="canvasBorderStyle" className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="solid">Solid</SelectItem>
                                <SelectItem value="dashed">Dashed</SelectItem>
                                <SelectItem value="dotted">Dotted</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                </div>

                {/* Layout Elements Configuration */}
                <div className="space-y-2">
                  <h4 className="text-md font-semibold text-foreground">Layout Elements (Toggle to Include & Configure)</h4>
                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Add data fields above to configure their layout.</p>
                  ) : (
                    <ScrollArea className="pr-2"> {/* No max-h, let it expand */}
                      <div className="space-y-2">
                        {layoutElementGuiConfigs.map((config, index) => (
                          <div key={config._uiId || index} className="p-2.5 border rounded-md bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handleGuiConfigChange(config._uiId!, { isExpandedInGui: !config.isExpandedInGui })}
                                    disabled={isSaving || !config.isEnabledOnCanvas}
                                    aria-label={config.isExpandedInGui ? "Collapse element settings" : "Expand element settings"}
                                >
                                    {config.isExpandedInGui ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                                </Button>
                                <Label htmlFor={`enable-${config._uiId}`} className="font-medium text-sm text-foreground cursor-pointer">
                                  {config.label} <code className="text-xs text-muted-foreground">({config.fieldKey})</code>
                                </Label>
                              </div>
                              <Switch
                                id={`enable-${config._uiId}`}
                                checked={config.isEnabledOnCanvas}
                                onCheckedChange={(checked) => handleGuiConfigChange(config._uiId!, { isEnabledOnCanvas: checked, isExpandedInGui: checked ? config.isExpandedInGui : false })}
                                disabled={isSaving}
                              />
                            </div>

                            {config.isEnabledOnCanvas && config.isExpandedInGui && (
                              <div className="pl-8 pt-2 border-t border-dashed mt-2 space-y-3">
                                {/* Element Type & Icon */}
                                <div className="space-y-1">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Element Type & Icon Name</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 items-end">
                                    <div>
                                      <Label htmlFor={`el-type-${config._uiId}`} className="text-xs">Element Type</Label>
                                      <Select 
                                        value={config.elementType} 
                                        onValueChange={value => handleGuiConfigChange(config._uiId!, { elementType: value as LayoutElementGuiConfig['elementType'] })}
                                        disabled={isSaving}
                                      >
                                        <SelectTrigger id={`el-type-${config._uiId}`} className="h-8 text-xs mt-0.5">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="text">Text</SelectItem>
                                          <SelectItem value="textarea">Textarea</SelectItem>
                                          <SelectItem value="image">Image</SelectItem>
                                          <SelectItem value="iconValue">Icon & Value</SelectItem>
                                          <SelectItem value="iconFromData">Icon From Data</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {config.elementType === 'iconValue' && (
                                      <div>
                                        <Label htmlFor={`el-iconName-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                        <Input 
                                          id={`el-iconName-${config._uiId}`} 
                                          value={config.iconName || ''}
                                          onChange={e => handleGuiConfigChange(config._uiId!, { iconName: e.target.value })}
                                          className="h-8 text-xs mt-0.5" 
                                          placeholder="e.g., Coins"
                                          disabled={isSaving} 
                                        />
                                      </div>
                                    )}
                                  </div>
                                   {config.elementType === 'iconValue' && (
                                    <Accordion type="single" collapsible className="w-full mt-1" defaultValue="">
                                        <AccordionItem value={`icon-browser-inline-${config._uiId}`} className="border-b-0">
                                            <AccordionTrigger className="text-xs py-1 hover:no-underline [&[data-state=open]>svg]:text-primary text-muted-foreground hover:text-foreground">
                                                <div className="flex items-center gap-1">
                                                    <CopyIcon className="h-3 w-3"/> Browse Icons
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2 border rounded-md bg-background/70">
                                                <ScrollArea className="max-h-[120px] bg-background/50 p-2 rounded border">
                                                    <div className={cn("grid gap-0.5", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                                                        {commonLucideIconsForGuide.map(iconName => (
                                                            <TooltipProvider key={iconName} delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 p-1" onClick={() => handleCopyIconName(iconName)}>
                                                                    <LibIconComponent name={iconName} className="h-4 w-4" />
                                                                </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom"><p>{iconName}</p></TooltipContent>
                                                            </Tooltip>
                                                            </TooltipProvider>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                  )}
                                </div>
                                
                                {/* Position & Sizing */}
                                <div className="space-y-1 pt-2 border-t border-dashed">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Position & Sizing (CSS)</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
                                    {[
                                      { id: 'styleTop', label: 'Top', placeholder: "e.g., 10px" },
                                      { id: 'styleLeft', label: 'Left', placeholder: "e.g., 10px" },
                                      { id: 'styleRight', label: 'Right', placeholder: "e.g., 10px" },
                                      { id: 'styleBottom', label: 'Bottom', placeholder: "e.g., 10px" },
                                      { id: 'styleMaxHeight', label: 'Max Height', placeholder: "e.g., 40px" },
                                      { id: 'stylePadding', label: 'Padding', placeholder: "e.g., 5px" },
                                    ].map(item => (
                                      <div key={item.id}>
                                        <Label htmlFor={`el-${item.id}-${config._uiId}`} className="text-xs">{item.label}</Label>
                                        <Input 
                                          id={`el-${item.id}-${config._uiId}`} 
                                          value={(config as any)[item.id] || ''}
                                          onChange={e => handleGuiConfigChange(config._uiId!, { [item.id]: e.target.value })}
                                          className="h-8 text-xs mt-0.5" 
                                          placeholder={item.placeholder}
                                          disabled={isSaving} 
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Typography */}
                                {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                                  <div className="space-y-1 pt-2 border-t border-dashed">
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">Typography</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 items-end">
                                      <div>
                                        <Label htmlFor={`el-twTextColor-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label>
                                        <Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindTextColor: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twTextColor-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor={`el-twFontSize-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label>
                                        <Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindFontSize: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twFontSize-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                       <div>
                                        <Label htmlFor={`el-twFontWeight-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label>
                                        <Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindFontWeight: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twFontWeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                       <div>
                                        <Label htmlFor={`el-twLineHeight-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label>
                                        <Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindLineHeight: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twLineHeight-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor={`el-fontStyle-${config._uiId}`} className="text-xs">Font Style (CSS)</Label>
                                        <Select value={config.styleFontStyle || 'normal'} onValueChange={value => handleGuiConfigChange(config._uiId!, { styleFontStyle: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-fontStyle-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="italic">Italic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor={`el-textAlign-${config._uiId}`} className="text-xs">Text Align (CSS)</Label>
                                        <Select value={config.styleTextAlign || 'left'} onValueChange={value => handleGuiConfigChange(config._uiId!, { styleTextAlign: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-textAlign-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="left">Left</SelectItem>
                                                <SelectItem value="center">Center</SelectItem>
                                                <SelectItem value="right">Right</SelectItem>
                                                <SelectItem value="justify">Justify</SelectItem>
                                            </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Overflow & Display (Text) */}
                                {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                   <div className="space-y-1 pt-2 border-t border-dashed">
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">Overflow & Display (Text - Tailwind)</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                                      <div>
                                        <Label htmlFor={`el-twOverflow-${config._uiId}`} className="text-xs">Overflow</Label>
                                        <Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindOverflow: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor={`el-twTextOverflow-${config._uiId}`} className="text-xs">Text Overflow</Label>
                                        <Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindTextOverflow: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twTextOverflow-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Borders */}
                                <div className="space-y-1 pt-2 border-t border-dashed">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Borders</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2 items-end">
                                    <div>
                                        <Label htmlFor={`el-twBorderRadius-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label>
                                        <Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={value => handleGuiConfigChange(config._uiId!, { tailwindBorderRadius: value })} disabled={isSaving}>
                                            <SelectTrigger id={`el-twBorderRadius-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-end">
                                    {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => (
                                      <div key={side} className="grid grid-cols-2 gap-x-2 items-end">
                                        <div>
                                          <Label htmlFor={`el-twBorder${side}W-${config._uiId}`} className="text-xs">{`Border ${side} W`}</Label>
                                          <Select 
                                            value={(config as any)[`tailwindBorder${side}W`] || NONE_VALUE} 
                                            onValueChange={value => handleGuiConfigChange(config._uiId!, { [`tailwindBorder${side}W`]: value })}
                                            disabled={isSaving}
                                          >
                                            <SelectTrigger id={`el-twBorder${side}W-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {BORDER_SIDE_WIDTH_OPTIONS.map(opt => (
                                                <SelectItem 
                                                  key={opt.value} 
                                                  value={opt.value === NONE_VALUE ? NONE_VALUE : getSideBorderWidthClass(side.toLowerCase()[0] as 't'|'r'|'b'|'l', opt.value, BORDER_SIDE_WIDTH_OPTIONS)}
                                                >
                                                  {opt.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label htmlFor={`el-twBorder${side}Color-${config._uiId}`} className="text-xs">{`Color`}</Label>
                                          <Select 
                                            value={(config as any)[`tailwindBorder${side}Color`] || NONE_VALUE} 
                                            onValueChange={value => handleGuiConfigChange(config._uiId!, { [`tailwindBorder${side}Color`]: value })}
                                            disabled={isSaving || !((config as any)[`tailwindBorder${side}W`]) || ((config as any)[`tailwindBorder${side}W`] === NONE_VALUE) || ((config as any)[`tailwindBorder${side}W`].endsWith('-0'))}
                                          >
                                            <SelectTrigger id={`el-twBorder${side}Color-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            ) : ( // activeEditorView === 'json'
               <div className="flex flex-col flex-grow min-h-0">
                <Textarea
                    id="layoutDefinition"
                    value={layoutDefinition}
                    onChange={(e) => {
                        setLayoutDefinition(e.target.value);
                    }}
                    onBlur={() => validateAndFormatLayoutJson(layoutDefinition)}
                    placeholder="Click \"Generate/Update JSON from Builder\" (in page actions menu) to populate, or paste/edit your JSON here."
                    rows={15}
                    className="font-mono text-xs flex-grow min-h-[200px] bg-muted/20 mt-1" 
                    disabled={isSaving}
                />
                {layoutJsonError && (
                    <Alert variant="destructive" className="mt-2 text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>JSON Error</AlertTitle>
                    <AlertDescription>{layoutJsonError}</AlertDescription>
                    </Alert>
                )}
              </div>
            )}

            {/* Helper Accordions: Icon Browser */}
            <Accordion type="single" collapsible className="w-full mt-3" value={activeEditorView === 'gui' ? undefined : ''}> {/* Keep closed if JSON view */}
                <AccordionItem value={iconBrowserAccordionId} className="border-b-0">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline [&[data-state=open]>svg]:text-primary bg-muted/20 hover:bg-muted/30 px-3 rounded-t-md">
                        <div className="flex items-center gap-2">
                            <CopyIcon className="h-4 w-4"/> Browse Lucide Icons
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-xs p-3 border border-t-0 rounded-b-md bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Common Lucide Icons (Click icon to Copy Name):</p>
                        <ScrollArea className="max-h-[120px] bg-background/50 p-2 rounded border">
                            <div className={cn("grid gap-0.5", "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16")}>
                                {commonLucideIconsForGuide.map(iconName => (
                                <TooltipProvider key={iconName} delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 p-1" onClick={() => handleCopyIconName(iconName)}>
                                        <LibIconComponent name={iconName} className="h-4 w-4" />
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom"><p>{iconName}</p></TooltipContent>
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

        {/* Live Layout Preview Card */}
        <Card className="shadow-lg lg:sticky lg:self-start" style={{top: `calc(var(--main-header-height, 56px) + 1rem + ${headerHeight}px + 1.5rem)` }}>
           <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Live Layout Preview</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label htmlFor={`show-pixel-grid-${mode}`} className="text-xs">Pixel Grid</Label>
                    <Switch
                        id={`show-pixel-grid-${mode}`}
                        checked={showPixelGrid}
                        onCheckedChange={setShowPixelGrid}
                        aria-label="Show pixel grid"
                    />
                </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground pt-1">
                This preview updates as you use the GUI builder or edit the Layout Definition JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4">
            {sampleCardForPreview && templateForPreview ? (
              <DynamicCardRenderer card={sampleCardForPreview} template={templateForPreview} showPixelGrid={showPixelGrid} />
            ) : (
              <div className="w-[280px] h-[400px] border border-dashed flex items-center justify-center text-muted-foreground">
                <p>Preview Loading...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

And `src/app/templates/new/page.tsx`:
```typescript
// src/app/templates/new/page.tsx
"use client";

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { CardTemplate } from '@/lib/card-templates';
import { TemplateDesigner } from '@/components/template-designer/TemplateDesigner';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; 

function TemplateDesignerLoadingSkeleton({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}


export default function NewTemplatePage() {
  console.log('[NewTemplatePage] Rendering.');
  const router = useRouter();
  const { toast } = useToast();
  const { addTemplate, templates, isLoading: templatesLoading } = useTemplates();

  const handleCreateTemplate = useCallback(async (
    newTemplateData: CardTemplate,
    _existingTemplateId?: CardTemplateId // Not used in create mode
  ): Promise<{ success: boolean; message?: string }> => {
    console.log('[NewTemplatePage] handleCreateTemplate for:', newTemplateData.name);
    
    const result = await addTemplate(newTemplateData);

    if (result.success) {
      toast({
        title: "Template Created!",
        description: result.message || `Template "${newTemplateData.name}" saved successfully.`,
      });
      router.push('/templates');
    } else {
      toast({
        title: "Creation Failed",
        description: result.message || "Could not create the template.",
        variant: "destructive",
      });
    }
    return result;
  }, [addTemplate, router, toast]);

  if (templatesLoading) { // Show skeleton while context is loading initial templates
    return <TemplateDesignerLoadingSkeleton title="Initializing Template Designer..." />;
  }

  return (
    <TemplateDesigner
      mode="create"
      onSave={handleCreateTemplate}
      isLoadingContexts={templatesLoading}
      existingTemplateIds={templates.map(t => t.id as CardTemplateId)}
    />
  );
}
```

And `src/app/templates/edit/[templateId]/page.tsx`:
```typescript
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { CardTemplate } from '@/lib/card-templates';
import { TemplateDesigner } from '@/components/template-designer/TemplateDesigner';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

function TemplateDesignerLoadingSkeleton({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

export default function EditTemplatePage() {
  console.log('[EditTemplatePage] Rendering.');
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getTemplateById, updateTemplate, isLoading: templatesLoading, templates } = useTemplates();

  const templateIdFromUrl = typeof params.templateId === 'string' ? params.templateId as CardTemplateId : undefined;

  const [templateToEdit, setTemplateToEdit] = useState<CardTemplate | undefined>(undefined);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);


  useEffect(() => {
    console.log('[EditTemplatePage] useEffect to load template. ID:', templateIdFromUrl, 'Context Loading:', templatesLoading);
    if (templatesLoading && !templateToEdit) { // Only show page loading if context is loading AND we don't have template yet
      setIsPageLoading(true);
      return;
    }
    if (!templateIdFromUrl) {
      setErrorLoading("No template ID provided in URL.");
      setTemplateToEdit(undefined);
      setIsPageLoading(false);
      return;
    }

    const foundTemplate = getTemplateById(templateIdFromUrl);
    if (foundTemplate) {
      setTemplateToEdit(foundTemplate);
      setErrorLoading(null);
      console.log('[EditTemplatePage] Found template to edit:', foundTemplate.name);
    } else if (!templatesLoading) { // Only set error if context is done loading and template still not found
      setErrorLoading(`Template with ID "${templateIdFromUrl}" not found.`);
      setTemplateToEdit(undefined);
      console.error('[EditTemplatePage] Template not found in context for ID:', templateIdFromUrl);
    }
    setIsPageLoading(false); // Page is ready or has error
  }, [templateIdFromUrl, getTemplateById, templatesLoading, templates, templateToEdit]);

  const handleUpdateTemplate = useCallback(async (
    updatedTemplateData: CardTemplate,
    existingTemplateIdFromDesigner?: CardTemplateId 
  ): Promise<{ success: boolean, message?: string }> => {
    const currentIdToUpdate = existingTemplateIdFromDesigner || templateIdFromUrl;
    console.log('[EditTemplatePage] handleUpdateTemplate for ID:', currentIdToUpdate);

    if (!currentIdToUpdate) {
        console.error("[EditTemplatePage] Original template ID is missing for update.");
        toast({ title: "Update Error", description: "Original template ID not found.", variant: "destructive" });
        return { success: false, message: "Cannot update: Original template ID is missing."};
    }
    
    const result = await updateTemplate({ ...updatedTemplateData, id: currentIdToUpdate });
    
    if (result.success) {
      toast({
        title: "Template Updated!",
        description: result.message || `Template "${updatedTemplateData.name}" saved successfully.`,
      });
      router.push('/templates'); 
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update the template.",
        variant: "destructive",
      });
    }
    return result;
  }, [updateTemplate, router, toast, templateIdFromUrl]);


  if (isPageLoading) { // This covers initial context loading
    return <TemplateDesignerLoadingSkeleton title="Loading template data..." />;
  }

  if (errorLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Error Loading Template</h2>
        <p className="text-muted-foreground">{errorLoading}</p>
        <Button asChild className="mt-4">
          <Link href="/templates">Back to Library</Link>
        </Button>
      </div>
    );
  }
  
  if (!templateToEdit) { // Should be caught by errorLoading if templates are loaded and not found
     return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Template Not Found</h2>
        <p className="text-muted-foreground">The template with ID "{templateIdFromUrl}" could not be found.</p>
        <Button asChild className="mt-4">
          <Link href="/templates">Back to Library</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <TemplateDesigner
      mode="edit"
      initialTemplate={templateToEdit}
      onSave={handleUpdateTemplate}
      isLoadingContexts={templatesLoading} // Pass this to TemplateDesigner to disable inputs if needed
      existingTemplateIds={templates.filter(t => t.id !== templateIdFromUrl).map(t => t.id as CardTemplateId)}
    />
  );
}

```