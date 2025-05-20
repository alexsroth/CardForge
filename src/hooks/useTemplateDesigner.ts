
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
  TAILWIND_BACKGROUND_COLORS,
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
  onSaveProp: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{ success: boolean, message?: string }>;
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

export function useTemplateDesigner({
  mode,
  initialTemplate,
  onSaveProp,
  isLoadingContexts = false,
  existingTemplateIds = [],
}: UseTemplateDesignerProps) {
  const { toast } = useToast();
  console.log('[DEBUG] useTemplateDesigner: Initializing. Mode:', mode, 'isLoadingContexts:', isLoadingContexts, "Initial Template:", initialTemplate?.name);

  // Core template data
  const [templateName, setTemplateName] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>(''); // Auto-generated in create, read-only in edit
  const [templateIdToEdit, setTemplateIdToEdit] = useState<CardTemplateId | undefined>(undefined); // Stores the original ID for updates
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);

  // Layout definition (JSON string)
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);

  // GUI Builder State - Canvas Setup
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>(
    COMMON_CARD_SIZES.find(s => s.width === `${DEFAULT_CANVAS_WIDTH}px` && s.height === `${DEFAULT_CANVAS_HEIGHT}px`)?.value || COMMON_CARD_SIZES[0].value
  );
  const [tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor] = useState<string>(TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE);
  const [canvasDirectBackgroundColor, setCanvasDirectBackgroundColor] = useState<string>('hsl(var(--card))'); // Fallback if Tailwind BG is NONE
  const [tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius] = useState<string>(TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-lg")?.value || NONE_VALUE);
  const [tailwindCanvasBorderColor, setTailwindCanvasBorderColor] = useState<string>(TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE);
  const [tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth] = useState<string>(BORDER_SIDE_WIDTH_OPTIONS.find(opt => opt.value === "default" && !opt.classPrefix.includes("?"))?.value || NONE_VALUE);
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");

  // GUI Builder State - Layout Elements
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);
  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for managing updates and avoiding loops
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const jsonEditedManuallyRef = useRef<boolean>(false); // Tracks if JSON textarea was directly edited
  const lastSyncedLayoutDefForGui = useRef<string | null>(null); // Tracks last JSON used to update GUI

  // Sample card for live preview
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);

  const parseLayoutDefinitionToGuiState = useCallback((jsonStringToParse: string, currentFields: TemplateFieldDefinition[]) => {
    console.log('[DEBUG] useTemplateDesigner: parseLayoutDefinitionToGuiState. JSON length:', jsonStringToParse.length, "Fields count:", currentFields.length);
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

    const canvasClasses = (parsedLayout.canvasClassName || '').split(' ');
    setTailwindCanvasBackgroundColor(findTailwindClassValue(canvasClasses.join(' '), TAILWIND_BACKGROUND_COLORS, NONE_VALUE));
    setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || defaultParsedLayout.backgroundColor || 'hsl(var(--card))'));
    setTailwindCanvasBorderRadius(findTailwindClassValue(canvasClasses.join(' '), TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE));
    setTailwindCanvasBorderColor(findTailwindClassValue(canvasClasses.join(' '), TAILWIND_BORDER_PALETTE_OPTIONS.filter(opt => opt.value === NONE_VALUE || opt.value === 'border' || !opt.value.includes('-')), NONE_VALUE));
    setTailwindCanvasBorderWidth(findTailwindClassValue(canvasClasses.join(' '), BORDER_SIDE_WIDTH_OPTIONS.filter(o => !o.label.includes("Side") && o.value !== NONE_VALUE), NONE_VALUE));
    setCanvasBorderStyle(String(parsedLayout.borderStyle || defaultParsedLayout.borderStyle || "solid"));
    
    const elementsFromJsonMap = new Map((Array.isArray(parsedLayout.elements) ? parsedLayout.elements : []).map((el: CardLayoutElement) => [el.fieldKey, el]));
    
    const newGuiConfigs = currentFields.map((fieldDef, index) => {
        const existingUiConfig = layoutElementGuiConfigs.find(p => p._uiId === fieldDef._uiId); // Check current GUI state
        const jsonElement = elementsFromJsonMap.get(fieldDef.key);
        const defaultTop = `${10 + (index % 8) * 25}px`;
        const defaultLeft = '10px';
        const defaultWidth = '120px';
        const defaultHeight = '20px';

        let config: LayoutElementGuiConfig = {
            _uiId: fieldDef._uiId || `gui-new-${fieldDef.key}-${Date.now()}-${index}`,
            fieldKey: fieldDef.key,
            label: fieldDef.label,
            originalType: fieldDef.type,
            isEnabledOnCanvas: false,
            isExpandedInGui: existingUiConfig?.isExpandedInGui || false,
            elementType: 'text',
            iconName: '',
            styleTop: defaultTop, styleLeft: defaultLeft, styleRight: '', styleBottom: '',
            styleMaxHeight: '', stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
            tailwindTextColor: TAILWIND_TEXT_COLORS.find(c => c.value === "text-black")?.value || NONE_VALUE,
            tailwindFontSize: NONE_VALUE, tailwindFontWeight: NONE_VALUE,
            tailwindLineHeight: NONE_VALUE, tailwindOverflow: NONE_VALUE,
            tailwindTextOverflow: NONE_VALUE,
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

            config.elementType = jsonElement.type || 'text';
            config.iconName = jsonElement.icon || '';
            config.styleTop = style.top || defaultTop;
            config.styleLeft = style.left || defaultLeft;
            config.styleRight = style.right || '';
            config.styleBottom = style.bottom || '';
            config.styleMaxHeight = style.maxHeight || '';
            config.stylePadding = style.padding || '';
            config.styleFontStyle = style.fontStyle || 'normal';
            config.styleTextAlign = style.textAlign || 'left';
            
            config.tailwindTextColor = findTailwindClassValue(className, TAILWIND_TEXT_COLORS, config.tailwindTextColor);
            config.tailwindFontSize = findTailwindClassValue(className, TAILWIND_FONT_SIZES, NONE_VALUE);
            config.tailwindFontWeight = findTailwindClassValue(className, TAILWIND_FONT_WEIGHTS, NONE_VALUE);
            config.tailwindLineHeight = findTailwindClassValue(className, TAILWIND_LINE_HEIGHTS, NONE_VALUE);
            config.tailwindOverflow = findTailwindClassValue(className, TAILWIND_OVERFLOW, NONE_VALUE);
            config.tailwindTextOverflow = findTailwindClassValue(className, TAILWIND_TEXT_OVERFLOW, NONE_VALUE);
            config.tailwindBorderRadius = findTailwindClassValue(className, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE);
            
            config.tailwindBorderTopW = findSideBorderClassValue(className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderRightW = findSideBorderClassValue(className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderBottomW = findSideBorderClassValue(className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderLeftW = findSideBorderClassValue(className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderTopColor = findSideBorderClassValue(className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderRightColor = findSideBorderClassValue(className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderBottomColor = findSideBorderClassValue(className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
            config.tailwindBorderLeftColor = findSideBorderClassValue(className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE;
        }
        return config;
    });
    setLayoutElementGuiConfigs(newGuiConfigs);
    lastSyncedLayoutDefForGui.current = jsonStringToParse; // Mark this JSON as synced to GUI
    console.log('[DEBUG] useTemplateDesigner: GUI state updated from parsed JSON.');
  }, [layoutElementGuiConfigs]); // Added layoutElementGuiConfigs to potentially preserve isExpandedInGui

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
      const parsedDefault = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);
      parsedDefault.elements = []; // Ensure elements is empty for create mode
      newLayoutDef = JSON.stringify(parsedDefault, null, 2);
    }

    setTemplateName(newTemplateName);
    setTemplateId(newTemplateIdForDisplay);
    setTemplateIdToEdit(newTemplateIdToEditFromProp);
    setFields(newFields); 
    setLayoutDefinition(newLayoutDef); 

    // Initial parse of layoutDefinition to GUI state (important for edit mode)
    // This needs `newFields` to correctly map fieldKeys
    parseLayoutDefinitionToGuiState(newLayoutDef, newFields);
    
    jsonEditedManuallyRef.current = false;
    console.log('[DEBUG] useTemplateDesigner: Initialization complete.');
  }, [mode, initialTemplate, isLoadingContexts, parseLayoutDefinitionToGuiState]);


  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(templateName ? toCamelCase(templateName) : '');
    }
  }, [templateName, mode]);

  // Sync LayoutElementGuiConfigs with Data Fields (main `fields` array)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Syncing layoutElementGuiConfigs with fields. Fields count:', fields.length);
    if (isLoadingContexts && mode === 'edit' && !initialTemplate && fields.length === 0) {
        // Avoid premature sync if fields haven't loaded for edit mode
        return;
    }
  
    setLayoutElementGuiConfigs(prevConfigs => {
      const existingConfigsMap = new Map(prevConfigs.map(c => [c.fieldKey, c]));
      const newUiConfigs = fields.map((fieldDef, index) => {
        const existingConfig = existingConfigsMap.get(fieldDef.key);
        if (existingConfig) {
          return {
            ...existingConfig,
            label: fieldDef.label, // Update label if it changed
            originalType: fieldDef.type, // Update original type
          };
        }
        // This is a new field, initialize its GUI config
        const defaultTop = `${10 + (index % 8) * 25}px`; // Simple cascade
        return {
          _uiId: fieldDef._uiId || `gui-new-${fieldDef.key}-${Date.now()}-${index}`,
          fieldKey: fieldDef.key,
          label: fieldDef.label,
          originalType: fieldDef.type,
          isEnabledOnCanvas: true, // Default to true for new fields
          isExpandedInGui: false,
          elementType: fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text'),
          iconName: fieldDef.type === 'number' ? 'Coins' : '',
          styleTop: defaultTop, styleLeft: '10px', styleRight: '', styleBottom: '',
          styleMaxHeight: '', stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
          tailwindTextColor: TAILWIND_TEXT_COLORS.find(c => c.value === "text-black")?.value || NONE_VALUE,
          tailwindFontSize: NONE_VALUE, tailwindFontWeight: NONE_VALUE,
          tailwindLineHeight: NONE_VALUE, tailwindOverflow: NONE_VALUE,
          tailwindTextOverflow: NONE_VALUE,
          tailwindBorderRadius: NONE_VALUE, 
          tailwindBorderTopW: NONE_VALUE, tailwindBorderRightW: NONE_VALUE,
          tailwindBorderBottomW: NONE_VALUE, tailwindBorderLeftW: NONE_VALUE,
          tailwindBorderTopColor: NONE_VALUE, tailwindBorderRightColor: NONE_VALUE,
          tailwindBorderBottomColor: NONE_VALUE, tailwindBorderLeftColor: NONE_VALUE,
        };
      });
  
      // Filter out configs for fields that no longer exist
      const currentFieldKeys = new Set(fields.map(f => f.key));
      const filteredConfigs = newUiConfigs.filter(config => currentFieldKeys.has(config.fieldKey));
  
      if (JSON.stringify(filteredConfigs) !== JSON.stringify(prevConfigs.filter(config => currentFieldKeys.has(config.fieldKey)))) {
        console.log('[DEBUG] useTemplateDesigner: layoutElementGuiConfigs updated due to field changes.');
        return filteredConfigs;
      }
      return prevConfigs; // No structural change in relation to fields
    });
  }, [fields, mode, initialTemplate, isLoadingContexts]);


  const handleGenerateJsonFromBuilder = useCallback((showSuccessToast = true): string => {
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
      if (config.styleBorderTop?.trim()) style.borderTop = config.styleBorderTop.trim();
      if (config.styleBorderBottom?.trim()) style.borderBottom = config.styleBorderBottom.trim();

      if (config.tailwindTextColor && config.tailwindTextColor !== NONE_VALUE) classNames.push(config.tailwindTextColor);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) classNames.push(TAILWIND_TEXT_COLORS.find(c => c.value === "text-black")?.value || 'text-black');
      
      if (config.tailwindFontSize && config.tailwindFontSize !== NONE_VALUE) classNames.push(config.tailwindFontSize);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) classNames.push(TAILWIND_FONT_SIZES.find(s => s.value === 'text-base')?.value || 'text-base');

      if (config.tailwindFontWeight && config.tailwindFontWeight !== NONE_VALUE) classNames.push(config.tailwindFontWeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue')) classNames.push(TAILWIND_FONT_WEIGHTS.find(w => w.value === 'font-normal')?.value || 'font-normal');

      if (config.tailwindLineHeight && config.tailwindLineHeight !== NONE_VALUE) classNames.push(config.tailwindLineHeight);
      else if ((config.elementType === 'text' || config.elementType === 'textarea')) classNames.push(TAILWIND_LINE_HEIGHTS.find(lh => lh.value === 'leading-normal')?.value || 'leading-normal');

      if (config.tailwindOverflow && config.tailwindOverflow !== NONE_VALUE) classNames.push(config.tailwindOverflow);
      else if ((config.elementType === 'text' || config.elementType === 'textarea')) classNames.push(TAILWIND_OVERFLOW.find(o => o.value === 'overflow-visible')?.value || 'overflow-visible');
      
      if (config.tailwindTextOverflow && config.tailwindTextOverflow !== NONE_VALUE) classNames.push(config.tailwindTextOverflow);
      if (config.tailwindBorderRadius && config.tailwindBorderRadius !== NONE_VALUE) classNames.push(config.tailwindBorderRadius);

      let hasAnySideBorderWidth = false;
      const sideBorderWidthClasses: string[] = [];
      (['Top', 'Right', 'Bottom', 'Left'] as const).forEach(side => {
          const widthKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
          const widthValue = config[widthKey] as string | undefined;
          if (widthValue && widthValue !== NONE_VALUE) {
              hasAnySideBorderWidth = true;
              sideBorderWidthClasses.push(widthValue);
          }
      });
      if (hasAnySideBorderWidth) {
          classNames.push(...sideBorderWidthClasses);
          // Add per-side colors only if corresponding width is set
          (['Top', 'Right', 'Bottom', 'Left'] as const).forEach(side => {
            const widthKey = `tailwindBorder${side}W`as keyof LayoutElementGuiConfig;
            const colorKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
            if (config[widthKey] && config[widthKey] !== NONE_VALUE && config[colorKey] && config[colorKey] !== NONE_VALUE) {
              classNames.push(`border-${side.toLowerCase()}-${config[colorKey]}`);
            }
          });
          // Fallback global border color if any width is set but no side colors are specifically set for those sides
          if (!classNames.some(cls => cls.startsWith('border-t-') || cls.startsWith('border-r-') || cls.startsWith('border-b-') || cls.startsWith('border-l-')) ) {
            //This logic is tricky. If a global border color should apply when any side width is set but no specific colors are.
            //For now, if no side color is set for an active side width, it relies on default CSS or theme border color.
          }
      }

      const element: Partial<CardLayoutElement> = { fieldKey: config.fieldKey, type: config.elementType };
      if (Object.keys(style).length > 0) element.style = style;
      const finalClassName = classNames.filter(Boolean).join(' ').trim();
      if (finalClassName) element.className = finalClassName;
      if ((config.elementType === 'iconValue') && config.iconName?.trim()) element.icon = config.iconName.trim();

      return element;
    });

    // Canvas properties
    const canvasClassesArray = [];
    if (tailwindCanvasBackgroundColor && tailwindCanvasBackgroundColor !== NONE_VALUE) canvasClassesArray.push(tailwindCanvasBackgroundColor);
    if (tailwindCanvasBorderRadius && tailwindCanvasBorderRadius !== NONE_VALUE) canvasClassesArray.push(tailwindCanvasBorderRadius);
    if (tailwindCanvasBorderWidth && tailwindCanvasBorderWidth !== NONE_VALUE) {
        canvasClassesArray.push(tailwindCanvasBorderWidth === 'default' ? 'border' : `border-${tailwindCanvasBorderWidth}`);
        if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE) {
            canvasClassesArray.push(`border-${tailwindCanvasBorderColor}`);
        } else {
           canvasClassesArray.push('border-border'); // Default border color if width is set but no color
        }
    }
    const canvasClassNameString = canvasClassesArray.filter(Boolean).join(' ').trim();

    const newLayoutData: LayoutDefinition = {
      width: canvasWidthSetting || `${DEFAULT_CANVAS_WIDTH}px`,
      height: canvasHeightSetting || `${DEFAULT_CANVAS_HEIGHT}px`,
      backgroundColor: (tailwindCanvasBackgroundColor === NONE_VALUE || !tailwindCanvasBackgroundColor) ? canvasDirectBackgroundColor : undefined,
      borderStyle: canvasBorderStyle || "solid",
      canvasClassName: canvasClassNameString || undefined,
      elements: generatedElements as CardLayoutElement[]
    };

    const newLayoutJsonString = JSON.stringify(newLayoutData, null, 2);
    setLayoutDefinition(newLayoutJsonString); // Update the main JSON state
    if (showSuccessToast) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated." });
    }
    jsonEditedManuallyRef.current = false; // GUI has updated the JSON
    return newLayoutJsonString;
  }, [
    layoutElementGuiConfigs, canvasWidthSetting, canvasHeightSetting,
    tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth,
    canvasBorderStyle, toast
  ]);


  // Debounced GUI -> JSON sync (for live preview)
  useEffect(() => {
    if (activeEditorView === 'gui') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log('[DEBUG] useTemplateDesigner: Debounced: GUI state changed, auto-generating JSON for preview.');
        handleGenerateJsonFromBuilder(false); // false to suppress toast for auto-updates
      }, 700); // 700ms debounce
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [ // Extensive list of dependencies that drive the GUI
    activeEditorView, handleGenerateJsonFromBuilder,
    canvasWidthSetting, canvasHeightSetting, selectedSizePreset,
    tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth, canvasBorderStyle,
    layoutElementGuiConfigs 
  ]);

  // JSON -> GUI Sync (on view switch or external JSON change)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: JSON -> GUI sync effect. Active view:', activeEditorView, 'LayoutDef changed:', layoutDefinition !== lastSyncedLayoutDefForGui.current);
    if (activeEditorView === 'gui' && layoutDefinition !== lastSyncedLayoutDefForGui.current) {
      console.log('[DEBUG] useTemplateDesigner: Switched to GUI view or layoutDefinition changed by JSON editor, re-parsing JSON to GUI state.');
      parseLayoutDefinitionToGuiState(layoutDefinition, fields); // Pass current fields
      jsonEditedManuallyRef.current = false; // GUI is now synced from this JSON
    }
  }, [activeEditorView, layoutDefinition, fields, parseLayoutDefinitionToGuiState]);


  const handleLayoutDefinitionChangeFromTextarea = useCallback((newJson: string) => {
    console.log('[DEBUG] useTemplateDesigner: Layout JSON changed by user in textarea.');
    setLayoutDefinition(newJson);
    jsonEditedManuallyRef.current = true; // Mark that JSON was edited
    if (layoutJsonError) setLayoutJsonError(null); // Clear error on type
  }, [layoutJsonError]); // Added layoutJsonError to deps

  const validateAndFormatLayoutJsonOnBlur = useCallback(() => {
    console.log('[DEBUG] useTemplateDesigner: Validating and formatting JSON from textarea on blur.');
    if (activeEditorView === 'json') { // Only format/validate if JSON editor is active and blurred
      try {
        const parsed = JSON.parse(layoutDefinition);
        const formattedJson = JSON.stringify(parsed, null, 2);
        setLayoutDefinition(formattedJson); // Update with formatted JSON
        setLayoutJsonError(null);
        jsonEditedManuallyRef.current = true; // Confirm it was manually edited
        return true;
      } catch (e: any) {
        setLayoutJsonError(`Invalid JSON: ${e.message}`);
        console.warn('[DEBUG] useTemplateDesigner: Invalid JSON from textarea on blur', e.message);
        return false;
      }
    }
    return true; // If not in JSON view, no validation needed here
  }, [layoutDefinition, activeEditorView]);


  // Generate sample card data for live preview
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Generating sampleCardForPreview.');
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
        valueForPreview = generateSamplePlaceholderUrl({
          width: fieldDef.placeholderConfigWidth, height: fieldDef.placeholderConfigHeight,
          bgColor: fieldDef.placeholderConfigBgColor, textColor: fieldDef.placeholderConfigTextColor,
          text: fieldDef.placeholderConfigText,
        });
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
      (generatedSampleCard as any)[key] = valueForPreview;
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
        (generatedSampleCard as any)[key] = (baseSampleValues as any)[key];
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
        _uiId: newUiId, key: newKey, label: newFieldLabel, type: 'text',
        placeholder: '', defaultValue: '', previewValue: '', optionsString: '',
        placeholderConfigWidth: parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)),
        placeholderConfigHeight: 140,
      }
    ]);
  }, [fields, canvasWidthSetting, mode]);

  const removeField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] useTemplateDesigner: removeField called for _uiId:', uiIdToRemove);
    const fieldToRemove = fields.find(f => f._uiId === uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
    if (fieldToRemove) {
        setLayoutElementGuiConfigs(prevConfigs => prevConfigs.filter(c => c.fieldKey !== fieldToRemove.key));
    }
  }, [fields]);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldData: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] useTemplateDesigner: handleFieldChange for _uiId:', uiIdToUpdate);
    setFields(prevFields =>
      prevFields.map(field => {
        if (field._uiId === uiIdToUpdate) {
          const oldField = { ...field };
          let modifiedField = { ...field, ...updatedFieldData };

          if (updatedFieldData.label !== undefined && updatedFieldData.label !== oldField.label) {
            const oldKey = oldField.key;
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
            
            // Update corresponding LayoutElementGuiConfig key and label
            setLayoutElementGuiConfigs(prevConfigs => prevConfigs.map(config =>
              config.fieldKey === oldKey ? { ...config, fieldKey: newKey, label: modifiedField.label } : config
            ));
          }
          if (updatedFieldData.type === 'placeholderImage' && oldField.type !== 'placeholderImage') {
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth ?? (parseInt(String(canvasWidthSetting).replace('px', '') || String(DEFAULT_CANVAS_WIDTH)));
            modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight ?? 140;
          } else if (updatedFieldData.type && updatedFieldData.type !== 'placeholderImage' && oldField.type === 'placeholderImage') {
            modifiedField.placeholderConfigWidth = undefined; modifiedField.placeholderConfigHeight = undefined;
            modifiedField.placeholderConfigBgColor = undefined; modifiedField.placeholderConfigTextColor = undefined;
            modifiedField.placeholderConfigText = undefined;
          }
          if (updatedFieldData.type && updatedFieldData.type !== oldField.type) {
             setLayoutElementGuiConfigs(prevConfigs => prevConfigs.map(config =>
                config.fieldKey === modifiedField.key ? { ...config, originalType: modifiedField.type, elementType: modifiedField.type === 'textarea' ? 'textarea' : (modifiedField.type === 'placeholderImage' ? 'image' : 'text') } : config
            ));
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
    prop: 'canvasDirectBackgroundColor' | 'canvasBorderStyle',
    value: string
  ) => {
    console.log('[DEBUG] useTemplateDesigner: handleCanvasDirectCSSChange for', prop, 'to', value);
    switch (prop) {
      case 'canvasDirectBackgroundColor': setCanvasDirectBackgroundColor(value); break;
      case 'canvasBorderStyle': setCanvasBorderStyle(value); break;
    }
  }, []);

  const handleCanvasTailwindChange = useCallback((
    prop: 'tailwindCanvasBackgroundColor' | 'tailwindCanvasBorderRadius' | 'tailwindCanvasBorderColor' | 'tailwindCanvasBorderWidth',
    value: string
  ) => {
    console.log('[DEBUG] useTemplateDesigner: handleCanvasTailwindChange for', prop, 'to', value);
    switch (prop) {
      case 'tailwindCanvasBackgroundColor': setTailwindCanvasBackgroundColor(value); break;
      case 'tailwindCanvasBorderRadius': setTailwindCanvasBorderRadius(value); break;
      case 'tailwindCanvasBorderColor': setTailwindCanvasBorderColor(value); break;
      case 'tailwindCanvasBorderWidth': setTailwindCanvasBorderWidth(value); break;
    }
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
    if (activeEditorView === 'gui') {
      console.log('[DEBUG] useTemplateDesigner: GUI active on save, ensuring JSON reflects final GUI state.');
      finalLayoutDefToSave = handleGenerateJsonFromBuilder(false); // Get latest JSON string from GUI
      setLayoutDefinition(finalLayoutDefToSave); // Ensure state is updated if it changed
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

    console.log('[DEBUG] useTemplateDesigner: Calling props.onSaveProp for ID:', currentIdForSave);
    try {
      const result = await onSaveProp(templateToSave, mode === 'edit' ? templateIdToEdit : undefined);
      if (!result.success) {
        console.warn('[DEBUG] useTemplateDesigner: props.onSaveProp reported failure from parent:', result.message);
         toast({ title: "Save Failed (from parent)", description: result.message || "Could not save template via context.", variant: "destructive"});
      }
    } catch (err) {
      console.error('[DEBUG] useTemplateDesigner: props.onSaveProp promise rejected', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during save.";
      toast({ title: "Save Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    templateName, templateId, templateIdToEdit, fields, layoutDefinition, mode, existingTemplateIds, 
    activeEditorView, handleGenerateJsonFromBuilder, 
    onSaveProp, toast, layoutElementGuiConfigs, // Added missing layoutElementGuiConfigs
    canvasWidthSetting, canvasHeightSetting, // and canvas settings
    tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth, canvasBorderStyle
  ]);


  return {
    // Core template data
    templateName, setTemplateName,
    templateId,
    fields, addField, removeField, handleFieldChange,
    // Layout definition and JSON editor
    layoutDefinition, setLayoutDefinition: handleLayoutDefinitionChangeFromTextarea, // Expose the direct setter for JSON mode
    layoutJsonError, validateAndFormatLayoutJsonOnBlur,
    // GUI Builder - Canvas Setup
    canvasWidthSetting, setCanvasWidthSetting,
    canvasHeightSetting, setCanvasHeightSetting,
    selectedSizePreset, handleSizePresetChange,
    tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor,
    canvasDirectBackgroundColor, setCanvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius,
    tailwindCanvasBorderColor, setTailwindCanvasBorderColor,
    tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth,
    canvasBorderStyle, setCanvasBorderStyle,
    // GUI Builder - Layout Elements
    layoutElementGuiConfigs, handleGuiConfigChange, handleToggleGuiExpand,
    // Editor View Toggle
    activeEditorView, setActiveEditorView,
    // Preview
    showPixelGrid, setShowPixelGrid,
    sampleCardForPreview,
    templateForPreview,
    // Actions
    handleGenerateJsonFromBuilder,
    handleSave,
    isSaving,
    mode,
  };
}
