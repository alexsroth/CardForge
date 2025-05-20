
// src/hooks/useTemplateDesigner.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CardTemplate, CardTemplateId, LayoutDefinition, LayoutElement as CardLayoutElement } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
  // TAILWIND_BACKGROUND_COLORS, // For canvas, not elements directly via this list
  toCamelCase,
  generateSamplePlaceholderUrl,
  findTailwindClassValue,
  findSideBorderClassValue,
  mapFieldDefinitionToTemplateField,
  mapTemplateFieldToFieldDefinition,
  type TemplateFieldDefinition,
  type LayoutElementGuiConfig,
} from '@/lib/card-designer';

console.log('[DEBUG] useTemplateDesigner.ts: Hook loaded');

export interface UseTemplateDesignerProps {
  mode: "create" | "edit";
  initialTemplate?: CardTemplate;
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{ success: boolean, message?: string }>;
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

export function useTemplateDesigner({
  mode,
  initialTemplate,
  onSave: onSaveProp,
  isLoadingContexts = false,
  existingTemplateIds = [],
}: UseTemplateDesignerProps) {
  const { toast } = useToast();
  console.log('[DEBUG] useTemplateDesigner: Initializing. Mode:', mode, 'isLoadingContexts:', isLoadingContexts);

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
  
  const [canvasDirectBackgroundColor, setCanvasDirectBackgroundColor] = useState<string>('hsl(var(--card))');
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");
  const [canvasBorderRadius, setCanvasBorderRadius] = useState<string>('calc(var(--radius) - 2px)');
  const [canvasBorderWidth, setCanvasBorderWidth] = useState<string>('1px');
  // New state for Tailwind canvas border color
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE);


  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);
  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const jsonEditedManuallyRef = useRef<boolean>(false);


  const parseLayoutDefinitionToGuiState = useCallback((jsonStringToParse: string, currentFields: TemplateFieldDefinition[]) => {
    console.log('[DEBUG] useTemplateDesigner: parseLayoutDefinitionToGuiState called. JSON length:', jsonStringToParse.length, "Fields count:", currentFields.length);
    let parsedLayout: Partial<LayoutDefinition> = {};
    const defaultParsedLayout = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);

    try {
      parsedLayout = jsonStringToParse.trim() ? JSON.parse(jsonStringToParse) : defaultParsedLayout;
      if (typeof parsedLayout !== 'object' || parsedLayout === null) {
        parsedLayout = defaultParsedLayout;
      }
      setLayoutJsonError(null);
    } catch (e: any) {
      console.error("[DEBUG] useTemplateDesigner: Error parsing layoutDefinition for GUI state:", e);
      setLayoutJsonError(`Invalid JSON for GUI: ${e.message}. Using default canvas settings.`);
      parsedLayout = defaultParsedLayout;
    }

    // Canvas Setup
    setCanvasWidthSetting(String(parsedLayout.width || defaultParsedLayout.width || `${DEFAULT_CANVAS_WIDTH}px`));
    setCanvasHeightSetting(String(parsedLayout.height || defaultParsedLayout.height || `${DEFAULT_CANVAS_HEIGHT}px`));
    const matchingPreset = COMMON_CARD_SIZES.find(s => String(s.width) === String(parsedLayout.width) && String(s.height) === String(parsedLayout.height));
    setSelectedSizePreset(matchingPreset ? matchingPreset.value : "custom");

    setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || defaultParsedLayout.backgroundColor || 'hsl(var(--card))'));
    setCanvasBorderRadius(String(parsedLayout.borderRadius || defaultParsedLayout.borderRadius || 'calc(var(--radius) - 2px)'));
    setCanvasBorderWidth(String(parsedLayout.borderWidth || defaultParsedLayout.borderWidth || '1px'));
    setCanvasBorderStyle(String(parsedLayout.borderStyle || defaultParsedLayout.borderStyle || "solid"));
    
    // For Tailwind border color on canvas, parse canvasClassName
    const canvasClasses = (parsedLayout.canvasClassName || '').split(' ');
    setTailwindCanvasBorderColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_PALETTE_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE));


    // Layout Elements GUI Configs
    const elementsFromJsonMap = new Map((Array.isArray(parsedLayout.elements) ? parsedLayout.elements : []).map((el: CardLayoutElement) => [el.fieldKey, el]));

    const newGuiConfigs = currentFields.map((fieldDef, index) => {
      const existingLayoutElement = elementsFromJsonMap.get(fieldDef.key);
      const config: LayoutElementGuiConfig = { // Initialize with full structure
        _uiId: fieldDef._uiId || `gui-${fieldDef.key}-${Date.now()}-${index}`,
        fieldKey: fieldDef.key,
        label: fieldDef.label,
        originalType: fieldDef.type,
        isEnabledOnCanvas: false,
        isExpandedInGui: false,
        elementType: 'text',
        iconName: '',
        styleTop: '', styleLeft: '', styleRight: '', styleBottom: '',
        styleMaxHeight: '', stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
        // styleBorderTop: '', styleBorderBottom: '', // Removed for per-side Tailwind borders
        tailwindTextColor: NONE_VALUE, tailwindFontSize: NONE_VALUE,
        tailwindFontWeight: NONE_VALUE, tailwindLineHeight: NONE_VALUE,
        tailwindOverflow: NONE_VALUE, tailwindTextOverflow: NONE_VALUE,
        tailwindBorderRadius: NONE_VALUE,
        // tailwindBorderColor: NONE_VALUE, // Removed global element border color
        tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
        tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
        tailwindBorderTopColor: NONE_VALUE, tailwindBorderRightColor: NONE_VALUE,
        tailwindBorderBottomColor: NONE_VALUE, tailwindBorderLeftColor: NONE_VALUE,
      };

      if (existingLayoutElement) {
        config.isEnabledOnCanvas = true;
        config.elementType = existingLayoutElement.type || 'text';
        config.iconName = existingLayoutElement.icon || '';

        const style = existingLayoutElement.style || {};
        config.styleTop = style.top || '';
        config.styleLeft = style.left || '';
        config.styleRight = style.right || '';
        config.styleBottom = style.bottom || '';
        config.styleMaxHeight = style.maxHeight || '';
        config.stylePadding = style.padding || '';
        config.styleFontStyle = style.fontStyle || 'normal';
        config.styleTextAlign = style.textAlign || 'left';
        // No longer parsing style.borderTop or style.borderBottom for GUI

        const className = existingLayoutElement.className || '';
        config.tailwindTextColor = findTailwindClassValue(className, TAILWIND_TEXT_COLORS, NONE_VALUE);
        config.tailwindFontSize = findTailwindClassValue(className, TAILWIND_FONT_SIZES, NONE_VALUE);
        config.tailwindFontWeight = findTailwindClassValue(className, TAILWIND_FONT_WEIGHTS, NONE_VALUE);
        config.tailwindLineHeight = findTailwindClassValue(className, TAILWIND_LINE_HEIGHTS, NONE_VALUE);
        config.tailwindOverflow = findTailwindClassValue(className, TAILWIND_OVERFLOW, NONE_VALUE);
        config.tailwindTextOverflow = findTailwindClassValue(className, TAILWIND_TEXT_OVERFLOW, NONE_VALUE);
        config.tailwindBorderRadius = findTailwindClassValue(className, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE);
        
        // Per-side border widths
        config.tailwindBorderTopW = findSideBorderClassValue(className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderRightW = findSideBorderClassValue(className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderBottomW = findSideBorderClassValue(className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderLeftW = findSideBorderClassValue(className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);

        // Per-side border colors
        config.tailwindBorderTopColor = findSideBorderClassValue(className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderRightColor = findSideBorderClassValue(className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderBottomColor = findSideBorderClassValue(className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);
        config.tailwindBorderLeftColor = findSideBorderClassValue(className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS, NONE_VALUE);

      } else {
        // Field is not in current JSON layout elements. Initialize with defaults for GUI.
        config.isEnabledOnCanvas = false;
        const defaultTopValue = `${10 + (index % 8) * 35}px`;
        config.styleTop = defaultTopValue;
        config.styleLeft = '10px';
        // Other style... and tailwind... properties default to values set in initial config object.
      }
      return config;
    });
    setLayoutElementGuiConfigs(newGuiConfigs);
    console.log('[DEBUG] useTemplateDesigner: GUI state updated from parsed JSON.');
  }, [setLayoutJsonError, setCanvasWidthSetting, setCanvasHeightSetting, setSelectedSizePreset, setCanvasDirectBackgroundColor, setCanvasBorderRadius, setCanvasBorderWidth, setCanvasBorderStyle, setTailwindCanvasBorderColor]);


  // Initialization effect
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Initialization effect running. Mode:', mode);
    if (isLoadingContexts && mode === 'edit' && !initialTemplate) {
      console.log('[DEBUG] useTemplateDesigner: Contexts loading for edit mode, initialTemplate not yet ready. Deferring setup.');
      return;
    }

    let newLayoutDef = DEFAULT_CARD_LAYOUT_JSON_STRING;
    let newFields: TemplateFieldDefinition[] = [];
    let newTemplateName = '';
    let newTemplateIdForDisplay = '';
    let newTemplateIdToEditFromProp: CardTemplateId | undefined = undefined;

    if (mode === 'edit' && initialTemplate) {
      console.log('[DEBUG] useTemplateDesigner: Edit mode setup from initialTemplate:', initialTemplate.name);
      newTemplateName = initialTemplate.name;
      newTemplateIdForDisplay = initialTemplate.id;
      newTemplateIdToEditFromProp = initialTemplate.id;
      newFields = initialTemplate.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, `edit-${initialTemplate.id}-${idx}`));
      newLayoutDef = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else if (mode === 'create') {
      console.log('[DEBUG] useTemplateDesigner: Create mode setup.');
      // Defaults for create mode are already set by useState initial values.
      // newLayoutDef will be DEFAULT_CARD_LAYOUT_JSON_STRING with empty elements array
      // ensuring a clean slate for the GUI builder.
      const parsedDefault = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);
      parsedDefault.elements = []; // Ensure elements is empty for create mode GUI
      newLayoutDef = JSON.stringify(parsedDefault, null, 2);
    }

    setTemplateName(newTemplateName);
    setTemplateId(newTemplateIdForDisplay);
    setTemplateIdToEdit(newTemplateIdToEditFromProp);
    setFields(newFields); // This triggers effect to build initial layoutElementGuiConfigs
    setLayoutDefinition(newLayoutDef); // This triggers effect to parse JSON for GUI state

    // Explicitly call parse for initial load in edit mode AFTER fields and layoutDef are set
    if (mode === 'edit' && initialTemplate) {
      parseLayoutDefinitionToGuiState(newLayoutDef, newFields);
    } else if (mode === 'create') {
        // For create mode, ensure GUI configs are built for potentially empty fields array
        // and empty layout elements
        parseLayoutDefinitionToGuiState(newLayoutDef, newFields);
    }


    jsonEditedManuallyRef.current = false;
    console.log('[DEBUG] useTemplateDesigner: Initialization complete.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialTemplate, isLoadingContexts]); // Removed parseLayoutDefinitionToGuiState from here


  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(templateName ? toCamelCase(templateName) : '');
    }
  }, [templateName, mode]);

  // Effect to sync layoutElementGuiConfigs with data fields (fields state)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Syncing layoutElementGuiConfigs with fields. Fields count:', fields.length);
    if (isLoadingContexts && mode === 'edit' && !initialTemplate) return; // Avoid running too early

    // Only call parseLayoutDefinitionToGuiState if layoutDefinition is already set
    // This effect's main job is to ensure layoutElementGuiConfigs reflect the *data fields*
    // and then `parseLayoutDefinitionToGuiState` will ensure these configs are updated
    // based on the *current layout JSON*.
    if (layoutDefinition && fields.length > 0) {
        // Re-parse the current layout JSON using the potentially updated fields.
        // This is important if fields were added/removed, as layoutElementGuiConfigs
        // needs to be rebuilt to match, and then their state populated from JSON.
        parseLayoutDefinitionToGuiState(layoutDefinition, fields);
    } else if (layoutDefinition && fields.length === 0) {
        // If all fields are removed, ensure GUI configs are also cleared.
        setLayoutElementGuiConfigs([]);
        // Also, likely reset the elements in the JSON definition to an empty array
        try {
            const parsed = JSON.parse(layoutDefinition);
            if (parsed.elements && parsed.elements.length > 0) {
                const updatedLayout = { ...parsed, elements: [] };
                setLayoutDefinition(JSON.stringify(updatedLayout, null, 2));
            }
        } catch (e) {
            // If JSON is invalid, do nothing here, error is shown elsewhere
        }
    }

  }, [fields, mode, initialTemplate, isLoadingContexts, parseLayoutDefinitionToGuiState, layoutDefinition]); // Added layoutDefinition

  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true) => {
    console.log('[DEBUG] useTemplateDesigner: handleGenerateJsonFromBuilder called.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: any = { position: "absolute" };
      const classNames: string[] = [config.originalType === 'textarea' ? 'whitespace-pre-wrap' : ''].filter(Boolean);

      if (config.styleTop?.trim()) style.top = config.styleTop.trim();
      if (config.styleLeft?.trim()) style.left = config.styleLeft.trim();
      if (config.styleRight?.trim()) style.right = config.styleRight.trim();
      if (config.styleBottom?.trim()) style.bottom = config.styleBottom.trim();
      if (config.styleMaxHeight?.trim()) style.maxHeight = config.styleMaxHeight.trim();
      if (config.stylePadding?.trim()) style.padding = config.stylePadding.trim();
      if (config.styleFontStyle?.trim() && config.styleFontStyle !== 'normal') style.fontStyle = config.styleFontStyle.trim();
      if (config.styleTextAlign?.trim() && config.styleTextAlign !== 'left') style.textAlign = config.styleTextAlign.trim();
      
      // Tailwind typography
      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);

      // Tailwind overflow
      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
      
      // Tailwind borders for element
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
          sideBorderClasses.push(widthValue); 
          if (colorValue && colorValue !== NONE_VALUE) {
            sideBorderClasses.push(`border-${side.toLowerCase()}-${colorValue}`);
          }
        }
      });
      if (hasAnySideBorderWidth) classNames.push(...sideBorderClasses);


      const element: Partial<CardLayoutElement> = { fieldKey: config.fieldKey, type: config.elementType };
      if (Object.keys(style).length > 0) element.style = style;
      const finalClassName = classNames.filter(Boolean).join(' ').trim();
      if (finalClassName) element.className = finalClassName;
      if ((config.elementType === 'iconValue') && config.iconName?.trim()) element.icon = config.iconName.trim();

      return element;
    });
    
    let canvasClassNameString = "";
    const canvasClassesArray = [];
    if (tailwindCanvasBorderRadius && tailwindCanvasBorderRadius !== NONE_VALUE) canvasClassesArray.push(tailwindCanvasBorderRadius);
    if (tailwindCanvasBorderWidth && tailwindCanvasBorderWidth !== NONE_VALUE ) {
      canvasClassesArray.push(tailwindCanvasBorderWidth); // This is the full class like 'border' or 'border-2'
      if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE) {
        canvasClassesArray.push(tailwindCanvasBorderColor); // This is the full class like 'border-primary'
      } else {
        canvasClassesArray.push('border-border'); // Default border color if width is set but no color
      }
    }
    canvasClassNameString = canvasClassesArray.filter(Boolean).join(' ').trim();


    const newLayoutData: LayoutDefinition = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: canvasDirectBackgroundColor, // Direct CSS for canvas BG
      borderRadius: canvasBorderRadius,
      borderWidth: canvasBorderWidth,
      borderStyle: canvasBorderStyle,
      canvasClassName: canvasClassNameString || undefined, // Tailwind classes for canvas border radius/width/color
      elements: generatedElements as CardLayoutElement[]
    };

    const newLayoutJsonString = JSON.stringify(newLayoutData, null, 2);
    setLayoutDefinition(newLayoutJsonString); // Update the main JSON state
    if (showSuccessToast) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated." });
    }
    jsonEditedManuallyRef.current = false;
    return newLayoutJsonString;
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    canvasDirectBackgroundColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth, // Canvas tailwind states
    toast
  ]);

  // Debounced GUI -> JSON sync (for live preview)
  useEffect(() => {
    if (activeEditorView === 'gui') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // console.log('[DEBUG] useTemplateDesigner: Scheduling debounced GUI -> JSON update.');
      debounceTimerRef.current = setTimeout(() => {
        console.log('[DEBUG] useTemplateDesigner: Debounced GUI -> JSON update executing.');
        handleGenerateJsonFromBuilder(false);
        jsonEditedManuallyRef.current = false;
      }, 700);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    activeEditorView, handleGenerateJsonFromBuilder, // This callback now has all GUI states as deps
    canvasWidthSetting, canvasHeightSetting, selectedSizePreset,
    canvasDirectBackgroundColor, canvasBorderRadius, canvasBorderWidth, canvasBorderStyle,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth,
    layoutElementGuiConfigs
  ]);

  // JSON -> GUI Sync (on view switch or external JSON change)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: JSON -> GUI sync effect. Active view:', activeEditorView, 'JSON manual edit flag:', jsonEditedManuallyRef.current, 'LayoutDef length:', layoutDefinition.length);
    if (activeEditorView === 'gui' && (jsonEditedManuallyRef.current || mode === 'edit' || mode === 'create')) { // Always parse on switching to GUI or on initial load
      console.log('[DEBUG] useTemplateDesigner: Switched to GUI view or layoutDefinition changed, re-parsing JSON to GUI state.');
      parseLayoutDefinitionToGuiState(layoutDefinition, fields); // Pass current fields
      jsonEditedManuallyRef.current = false;
    }
  }, [activeEditorView, layoutDefinition, mode, fields, parseLayoutDefinitionToGuiState]);


  const handleLayoutDefinitionChangeFromTextarea = useCallback((newJson: string) => {
    setLayoutDefinition(newJson);
    jsonEditedManuallyRef.current = true;
    if (layoutJsonError) setLayoutJsonError(null);
  }, [layoutJsonError]);

  const validateAndFormatLayoutJsonOnBlur = useCallback(() => {
    console.log('[DEBUG] useTemplateDesigner: Validating and formatting JSON from textarea on blur.');
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] useTemplateDesigner: GUI active, skipping format on blur for JSON textarea.');
      return true;
    }
    try {
      const parsed = JSON.parse(layoutDefinition);
      const formattedJson = JSON.stringify(parsed, null, 2);
      setLayoutDefinition(formattedJson);
      setLayoutJsonError(null);
      jsonEditedManuallyRef.current = true;
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] useTemplateDesigner: Invalid JSON from textarea on blur', e.message);
      return false;
    }
  }, [layoutDefinition, activeEditorView]);

  // Sample card for preview
  useEffect(() => {
    // console.log('[DEBUG] useTemplateDesigner: Generating sampleCardForPreview.');
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
      imageUrl: generateSamplePlaceholderUrl({ width: parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)), height: 140, text: 'Main Image' }),
      dataAiHint: 'card art sample',
      cardType: 'Creature - Goblin',
      effectText: 'Sample effect: Draw a card.',
      attack: 2,
      defense: 2,
      artworkUrl: generateSamplePlaceholderUrl({ width: parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)), height: parseInt(String(canvasHeightSetting).replace('px', '') || String(DEFAULT_CANVAS_HEIGHT)), text: 'Background Art' }),
      statusIcon: 'ShieldCheck',
      rarity: 'common',
      flavorText: "A witty remark.",
      description: "A general description."
    };
    for (const key in baseSampleValues) {
      if (generatedSampleCard[key as keyof CardData] === undefined && !fields.some(f => f.key === key)) {
        generatedSampleCard[key as keyof CardData] = baseSampleValues[key as keyof CardData];
      }
    }
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

  const addField = useCallback(() => {
    console.log('[DEBUG] useTemplateDesigner: addField called.');
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
    setFields(prevFields => [
      ...prevFields,
      {
        _uiId: newUiId, key: newKey, label: newFieldLabel, type: 'text',
        placeholder: '', defaultValue: '', previewValue: '', optionsString: '',
        placeholderConfigWidth: parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)),
        placeholderConfigHeight: 140,
      }
    ]);
  }, [fields, canvasWidthSetting, mode]);

  const removeField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] useTemplateDesigner: removeField called for _uiId:', uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldData: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] useTemplateDesigner: handleFieldChange for _uiId:', uiIdToUpdate);
    setFields(prevFields =>
      prevFields.map(field => {
        if (field._uiId === uiIdToUpdate) {
          const oldField = { ...field };
          let modifiedField = { ...field, ...updatedFieldData };

          if (updatedFieldData.label !== undefined && updatedFieldData.label !== oldField.label) {
            let baseKey = toCamelCase(updatedFieldData.label);
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
          if (updatedFieldData.type === 'placeholderImage' && oldField.type !== 'placeholderImage') {
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth ?? (parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)));
            modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight ?? 140;
          } else if (updatedFieldData.type && updatedFieldData.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
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

  const handleSizePresetChange = useCallback((value: string) => {
    console.log('[DEBUG] useTemplateDesigner: handleSizePresetChange called with value:', value);
    setSelectedSizePreset(value);
    if (value !== "custom") {
      const preset = COMMON_CARD_SIZES.find(s => s.value === value);
      if (preset) {
        setCanvasWidthSetting(preset.width || `${DEFAULT_CANVAS_WIDTH}px`);
        setCanvasHeightSetting(preset.height || `${DEFAULT_CANVAS_HEIGHT}px`);
      }
    }
  }, []);
  
  const handleCanvasDirectCSSChange = useCallback((
    prop: 'canvasDirectBackgroundColor' | 'canvasBorderRadius' | 'canvasBorderWidth' | 'canvasBorderStyle',
    value: string
  ) => {
    console.log('[DEBUG] useTemplateDesigner: handleCanvasDirectCSSChange for', prop, 'to', value);
    switch (prop) {
      case 'canvasDirectBackgroundColor': setCanvasDirectBackgroundColor(value); break;
      case 'canvasBorderRadius': setCanvasBorderRadius(value); break;
      case 'canvasBorderWidth': setCanvasBorderWidth(value); break;
      case 'canvasBorderStyle': setCanvasBorderStyle(value); break;
    }
  }, []);

  const handleCanvasTailwindBorderColorChange = useCallback((value: string) => {
    console.log('[DEBUG] useTemplateDesigner: handleCanvasTailwindBorderColorChange to', value);
    setTailwindCanvasBorderColor(value);
  }, []);


  const handleGuiConfigChange = useCallback((targetUiId: string, property: keyof LayoutElementGuiConfig, value: any) => {
    console.log('[DEBUG] useTemplateDesigner: handleGuiConfigChange for _uiId:', targetUiId, 'property:', property, 'value:', value);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, [property]: value } : config
      )
    );
  }, []);

  const handleToggleGuiExpand = useCallback((targetUiId: string) => {
    console.log('[DEBUG] useTemplateDesigner: handleToggleGuiExpand for _uiId:', targetUiId);
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config._uiId === targetUiId ? { ...config, isExpandedInGui: !config.isExpandedInGui } : { ...config, isExpandedInGui: false }
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    console.log('[DEBUG] useTemplateDesigner: handleSave called. Active view:', activeEditorView);
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
    // Field key uniqueness check (already done by label->key generation logic usually)
    // ...

    let finalLayoutDefToSave = layoutDefinition;
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] useTemplateDesigner: GUI active on save, ensuring JSON reflects final GUI state.');
      finalLayoutDefToSave = handleGenerateJsonFromBuilder(false); // Get latest JSON from GUI
      setLayoutDefinition(finalLayoutDefToSave); // Ensure state is updated
    }

    if (!finalLayoutDefToSave.trim()) {
      finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else {
      try {
        JSON.parse(finalLayoutDefToSave);
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        toast({ title: "Invalid Layout JSON", description: `JSON is invalid: ${e.message}. Correct before saving.`, variant: "destructive", duration: 7000 });
        if (activeEditorView === 'gui') setActiveEditorView('json');
        setIsSaving(false); return;
      }
    }

    const templateToSave: CardTemplate = {
      id: currentIdForSave as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: finalLayoutDefToSave,
    };

    console.log('[DEBUG] useTemplateDesigner: Calling props.onSave for ID:', currentIdForSave);
    try {
      const result = await onSaveProp(templateToSave, mode === 'edit' ? templateIdToEdit : undefined);
      if (!result.success) {
        console.warn('[DEBUG] useTemplateDesigner: props.onSave reported failure from parent:', result.message);
      }
    } catch (err) {
      console.error('[DEBUG] useTemplateDesigner: props.onSave promise rejected', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during save.";
      toast({ title: "Save Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    templateName, templateId, templateIdToEdit, fields, layoutDefinition, mode, existingTemplateIds, 
    activeEditorView, handleGenerateJsonFromBuilder, 
    onSaveProp, toast
  ]);


  return {
    templateName, setTemplateName,
    templateId,
    fields, addField, removeField, handleFieldChange,
    layoutDefinition, setLayoutDefinition: handleLayoutDefinitionChangeFromTextarea,
    layoutJsonError, validateAndFormatLayoutJsonOnBlur,
    canvasWidthSetting, setCanvasWidthSetting,
    canvasHeightSetting, setCanvasHeightSetting,
    selectedSizePreset, handleSizePresetChange,
    canvasDirectBackgroundColor, 
    canvasBorderRadius, 
    canvasBorderWidth, 
    canvasBorderStyle,
    handleCanvasDirectCSSChange,
    tailwindCanvasBorderColor, setTailwindCanvasBorderColor: handleCanvasTailwindBorderColorChange,
    layoutElementGuiConfigs, handleGuiConfigChange, handleToggleGuiExpand,
    activeEditorView, setActiveEditorView,
    showPixelGrid, setShowPixelGrid,
    sampleCardForPreview,
    templateForPreview,
    handleGenerateJsonFromBuilder,
    handleSave,
    isSaving,
    mode, // Pass mode through for UI text
  };
}

    