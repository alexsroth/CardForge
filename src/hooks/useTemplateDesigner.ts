
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
  onSave: (templateData: CardTemplate, existingTemplateId?: CardTemplateId) => Promise<{ success: boolean, message?: string }>;
  isLoadingContexts?: boolean;
  existingTemplateIds?: CardTemplateId[];
}

export function useTemplateDesigner({
  mode,
  initialTemplate,
  onSave: onSaveProp, // Renamed to avoid conflict with internal save function name
  isLoadingContexts = false,
  existingTemplateIds = [],
}: UseTemplateDesignerProps) {
  const { toast } = useToast();
  console.log('[DEBUG] useTemplateDesigner: Initializing. Mode:', mode);

  // Core template data
  const [templateName, setTemplateName] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>(''); // Programmatic ID
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
  const [tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth] = useState<string>(BORDER_SIDE_WIDTH_OPTIONS.find(w => w.value === 'default' && !w.label.includes("Side"))?.value || NONE_VALUE);
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>("solid");


  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [activeEditorView, setActiveEditorView] = useState<'gui' | 'json'>('gui');
  const [showPixelGrid, setShowPixelGrid] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const jsonEditedManuallyRef = useRef<boolean>(false); // Tracks if JSON textarea was last focused/edited

  const parseLayoutDefinitionToGuiState = useCallback((jsonStringToParse: string) => {
    console.log('[DEBUG] useTemplateDesigner: parseLayoutDefinitionToGuiState called.');
    let parsedLayout: Partial<LayoutDefinition> = {};
    const defaultParsedLayout = JSON.parse(DEFAULT_CARD_LAYOUT_JSON_STRING);

    try {
      if (jsonStringToParse.trim() === '') {
        parsedLayout = defaultParsedLayout;
      } else {
        parsedLayout = JSON.parse(jsonStringToParse);
      }
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
    setTailwindCanvasBackgroundColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BACKGROUND_COLORS, TAILWIND_BACKGROUND_COLORS.find(opt => opt.value === "bg-card")?.value || NONE_VALUE));
    setTailwindCanvasBorderRadius(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_RADIUS_OPTIONS, TAILWIND_BORDER_RADIUS_OPTIONS.find(opt => opt.value === "rounded-lg")?.value || NONE_VALUE));
    
    const twBorderWidthClass = canvasClasses.find((cls: string) => BORDER_SIDE_WIDTH_OPTIONS.some(opt => opt.value === (cls === 'border' ? 'default' : cls.replace(/^border-/, '')) && !cls.startsWith('border-t') && !cls.startsWith('border-b') && !cls.startsWith('border-l') && !cls.startsWith('border-r') && opt.value !== NONE_VALUE ));
    setTailwindCanvasBorderWidth(twBorderWidthClass ? (twBorderWidthClass === 'border' ? 'default' : twBorderWidthClass.replace(/^border-/, '')) : (BORDER_SIDE_WIDTH_OPTIONS.find(w => w.value === 'default' && !w.label.includes("Side"))?.value || NONE_VALUE));
    
    setTailwindCanvasBorderColor(findTailwindClassValue(parsedLayout.canvasClassName, TAILWIND_BORDER_PALETTE_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || NONE_VALUE));

    setCanvasDirectBackgroundColor(String(parsedLayout.backgroundColor || defaultParsedLayout.backgroundColor || 'hsl(var(--card))'));
    setCanvasBorderStyle(String(parsedLayout.borderStyle || defaultParsedLayout.borderStyle || "solid"));


    // Layout Elements GUI Configs
    const elementsFromJson = Array.isArray(parsedLayout.elements) ? parsedLayout.elements : [];
    const elementsFromJsonMap = new Map(elementsFromJson.map((el: CardLayoutElement) => [el.fieldKey, el]));

    setLayoutElementGuiConfigs(currentFields => currentFields.map((fieldDef, index) => {
      const existingLayoutElement = elementsFromJsonMap.get(fieldDef.key);
      const defaultTopValue = `${10 + (index % 8) * 35}px`;

      const config: LayoutElementGuiConfig = {
        _uiId: fieldDef._uiId || `gui-${fieldDef.key}-${Date.now()}-${index}`,
        fieldKey: fieldDef.key,
        label: fieldDef.label,
        originalType: fieldDef.type,
        isEnabledOnCanvas: !!existingLayoutElement,
        isExpandedInGui: false, // Always start collapsed
        elementType: existingLayoutElement?.type || (fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text')),
        iconName: existingLayoutElement?.icon || (fieldDef.type === 'number' ? 'Coins' : ''),
        styleTop: existingLayoutElement?.style?.top || (existingLayoutElement ? '' : defaultTopValue),
        styleLeft: existingLayoutElement?.style?.left || (existingLayoutElement ? '' : '10px'),
        styleRight: existingLayoutElement?.style?.right || '',
        styleBottom: existingLayoutElement?.style?.bottom || '',
        styleMaxHeight: existingLayoutElement?.style?.maxHeight || (existingLayoutElement ? '' : (fieldDef.type === 'textarea' ? 'auto' : '')),
        stylePadding: existingLayoutElement?.style?.padding || '',
        styleFontStyle: existingLayoutElement?.style?.fontStyle || (existingLayoutElement ? '' : 'normal'),
        styleTextAlign: existingLayoutElement?.style?.textAlign || (existingLayoutElement ? '' : 'left'),
        styleBorderTop: existingLayoutElement?.style?.borderTop || '',
        styleBorderBottom: existingLayoutElement?.style?.borderBottom || '',
        tailwindTextColor: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_TEXT_COLORS, 'text-black'),
        tailwindFontSize: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_FONT_SIZES, 'text-base'),
        tailwindFontWeight: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_FONT_WEIGHTS, 'font-normal'),
        tailwindLineHeight: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_LINE_HEIGHTS, 'leading-normal'),
        tailwindOverflow: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_OVERFLOW, 'overflow-visible'),
        tailwindTextOverflow: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_TEXT_OVERFLOW, NONE_VALUE),
        tailwindBorderRadius: findTailwindClassValue(existingLayoutElement?.className, TAILWIND_BORDER_RADIUS_OPTIONS, NONE_VALUE),
        
        tailwindBorderTopW: findSideBorderClassValue(existingLayoutElement?.className, 't', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderTopColor: findSideBorderClassValue(existingLayoutElement?.className, 't', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderRightW: findSideBorderClassValue(existingLayoutElement?.className, 'r', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderRightColor: findSideBorderClassValue(existingLayoutElement?.className, 'r', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderBottomW: findSideBorderClassValue(existingLayoutElement?.className, 'b', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderBottomColor: findSideBorderClassValue(existingLayoutElement?.className, 'b', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderLeftW: findSideBorderClassValue(existingLayoutElement?.className, 'l', 'width', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
        tailwindBorderLeftColor: findSideBorderClassValue(existingLayoutElement?.className, 'l', 'color', BORDER_SIDE_WIDTH_OPTIONS, TAILWIND_BORDER_PALETTE_OPTIONS) || NONE_VALUE,
      };
      return config;
    }));

    console.log('[DEBUG] useTemplateDesigner: GUI state updated from parsed JSON.');
  }, [ /* No direct dependencies here, called imperatively by other effects */ ]);


  // Initialization effect (once on mount, or if mode/initialTemplate changes)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Initialization effect. Mode:', mode, 'isLoadingContexts:', isLoadingContexts, 'Initial Template ID:', initialTemplate?.id);
    if (isLoadingContexts && mode === 'edit' && !initialTemplate) {
      console.log('[DEBUG] useTemplateDesigner: Contexts loading for edit mode, initialTemplate not yet ready. Deferring setup.');
      return;
    }

    let newLayoutDef = DEFAULT_CARD_LAYOUT_JSON_STRING;
    let newFields: TemplateFieldDefinition[] = [];
    let newTemplateName = '';
    let newTemplateIdForDisplay = '';
    let newTemplateIdToEdit: CardTemplateId | undefined = undefined;

    if (mode === 'edit' && initialTemplate) {
      console.log('[DEBUG] useTemplateDesigner: Edit mode setup from initialTemplate:', initialTemplate.name);
      newTemplateName = initialTemplate.name;
      newTemplateIdForDisplay = initialTemplate.id;
      newTemplateIdToEdit = initialTemplate.id;
      newFields = initialTemplate.fields.map((f, idx) => mapTemplateFieldToFieldDefinition(f, `edit-${initialTemplate.id}-${idx}`));
      newLayoutDef = initialTemplate.layoutDefinition || DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else if (mode === 'create') {
      console.log('[DEBUG] useTemplateDesigner: Create mode setup.');
      newTemplateName = '';
      newTemplateIdForDisplay = '';
      newTemplateIdToEdit = undefined;
      newFields = [];
      newLayoutDef = DEFAULT_CARD_LAYOUT_JSON_STRING;
    }

    setTemplateName(newTemplateName);
    setTemplateId(newTemplateIdForDisplay);
    setTemplateIdToEdit(newTemplateIdToEdit);
    setFields(newFields); // This will trigger the fields -> layoutElementGuiConfigs sync
    setLayoutDefinition(newLayoutDef); // This will trigger the layoutDefinition -> GUI states sync

    jsonEditedManuallyRef.current = false;
    setActiveEditorView('gui'); // Default to GUI view
    console.log('[DEBUG] useTemplateDesigner: Initialization complete.');
  }, [mode, initialTemplate, isLoadingContexts]); // parseLayoutDefinitionToGuiState removed from deps

  // Auto-generate templateId from templateName for CREATE mode
  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(templateName ? toCamelCase(templateName) : '');
    }
  }, [templateName, mode]);


  // Sync LayoutElementGuiConfigs with Data Fields (main `fields` array)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: Syncing layoutElementGuiConfigs with fields. Fields count:', fields.length);
    if (isLoadingContexts) return; // Don't run if still loading context (which might trigger initialTemplate change)

    setLayoutElementGuiConfigs(prevConfigs => {
      const existingConfigsMap = new Map(prevConfigs.map(c => [c.fieldKey, c]));
      const newUiConfigs = fields.map((fieldDef, index) => {
        const existingConfig = existingConfigsMap.get(fieldDef.key);
        if (existingConfig) {
          return {
            ...existingConfig,
            _uiId: existingConfig._uiId || fieldDef._uiId || `gui-sync-${fieldDef.key}-${Date.now()}`, // Ensure _uiId
            label: fieldDef.label, // Update label
            originalType: fieldDef.type // Update original type
          };
        }
        // New field, create default GUI config
        const defaultTopValue = `${10 + (index % 8) * 35}px`;
        return {
          _uiId: fieldDef._uiId || `gui-new-${fieldDef.key}-${Date.now()}-${index}`,
          fieldKey: fieldDef.key,
          label: fieldDef.label,
          originalType: fieldDef.type,
          isEnabledOnCanvas: false,
          isExpandedInGui: false,
          elementType: fieldDef.type === 'textarea' ? 'textarea' : (fieldDef.type === 'placeholderImage' ? 'image' : 'text'),
          iconName: fieldDef.type === 'number' ? 'Coins' : '',
          styleTop: defaultTopValue, styleLeft: '10px', styleRight: '', styleBottom: '',
          styleMaxHeight: fieldDef.type === 'textarea' ? 'auto' : '',
          stylePadding: '', styleFontStyle: 'normal', styleTextAlign: 'left',
          styleBorderTop: '', styleBorderBottom: '',
          tailwindTextColor: 'text-black',
          tailwindFontSize: 'text-base',
          tailwindFontWeight: 'font-normal',
          tailwindLineHeight: 'leading-normal',
          tailwindOverflow: 'overflow-visible',
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
      return prevConfigs;
    });
  }, [fields, isLoadingContexts]);


  const handleGenerateJsonFromBuilder = useCallback((showToastMessage = true) => {
    console.log('[DEBUG] useTemplateDesigner: handleGenerateJsonFromBuilder called.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);

    const generatedElements = elementsToInclude.map(config => {
      const style: any = { position: "absolute" };
      const classNames: string[] = [config.originalType === 'textarea' ? 'whitespace-pre-wrap' : ''].filter(Boolean);

      // Direct CSS styles from GUI config
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


      // Tailwind classes from GUI config
      const typographyClasses = [
        config.tailwindTextColor !== 'text-black' ? config.tailwindTextColor : '', // Only add if not default black for text
        config.tailwindFontSize !== 'text-base' ? config.tailwindFontSize : '',
        config.tailwindFontWeight !== 'font-normal' ? config.tailwindFontWeight : '',
        config.tailwindLineHeight !== 'leading-normal' ? config.tailwindLineHeight : '',
      ].filter(cls => cls && cls !== NONE_VALUE);
      classNames.push(...typographyClasses);

      const overflowClasses = [
        config.tailwindOverflow !== 'overflow-visible' ? config.tailwindOverflow : '',
        config.tailwindTextOverflow,
      ].filter(cls => cls && cls !== NONE_VALUE);
      classNames.push(...overflowClasses);
      
      const borderClasses = [
        config.tailwindBorderRadius,
        config.tailwindBorderTopW, config.tailwindBorderRightW,
        config.tailwindBorderBottomW, config.tailwindBorderLeftW,
      ].filter(cls => cls && cls !== NONE_VALUE);

      const hasAnySideBorderWidth = [config.tailwindBorderTopW, config.tailwindBorderRightW, config.tailwindBorderBottomW, config.tailwindBorderLeftW].some(w => w && w !== NONE_VALUE);

      if (hasAnySideBorderWidth) {
        const sideColorClasses = [
          config.tailwindBorderTopColor && config.tailwindBorderTopW !== NONE_VALUE ? `border-t-${config.tailwindBorderTopColor}` : '',
          config.tailwindBorderRightColor && config.tailwindBorderRightW !== NONE_VALUE ? `border-r-${config.tailwindBorderRightColor}` : '',
          config.tailwindBorderBottomColor && config.tailwindBorderBottomW !== NONE_VALUE ? `border-b-${config.tailwindBorderBottomColor}` : '',
          config.tailwindBorderLeftColor && config.tailwindBorderLeftW !== NONE_VALUE ? `border-l-${config.tailwindBorderLeftColor}` : '',
        ].filter(c => c && c !== NONE_VALUE);
        
        borderClasses.push(...sideColorClasses);
        if (sideColorClasses.length === 0) { // If widths are set but no side colors, apply global border color
           if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE && !TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === tailwindCanvasBorderColor)?.label.includes("Side Specific")) {
               borderClasses.push(tailwindCanvasBorderColor); //This was tailwindBorderColor before, which is not for elements
           } else if (!TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.label.includes("Side Specific")) {
             // Fallback to theme default if no element-specific or canvas-specific global border color
             borderClasses.push(TAILWIND_BORDER_PALETTE_OPTIONS.find(opt => opt.value === "border")?.value || 'border-border');
           }
        }
      }
      classNames.push(...borderClasses);


      const element: Partial<CardLayoutElement> = { fieldKey: config.fieldKey, type: config.elementType };
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
      if (tailwindCanvasBorderColor && tailwindCanvasBorderColor !== NONE_VALUE && TAILWIND_BORDER_PALETTE_OPTIONS.map(p => p.value).includes(tailwindCanvasBorderColor)) {
         canvasClassesArray.push(tailwindCanvasBorderColor); // Keep as is, it's like border-red-500
      } else if (tailwindCanvasBorderWidth !== (BORDER_SIDE_WIDTH_OPTIONS.find(o => o.value === "0")?.value)) {
        canvasClassesArray.push('border-border'); 
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
    setLayoutDefinition(newLayoutJsonString);
    if (showToastMessage) {
      toast({ title: "Layout JSON Updated", description: "JSON generated from GUI builder and updated." });
    }
    return newLayoutJsonString; // Return the generated string
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
      console.log('[DEBUG] useTemplateDesigner: Scheduling debounced GUI -> JSON update.');
      debounceTimerRef.current = setTimeout(() => {
        console.log('[DEBUG] useTemplateDesigner: Debounced GUI -> JSON update executing.');
        handleGenerateJsonFromBuilder(false); // false to suppress toast for auto-updates
        jsonEditedManuallyRef.current = false;
      }, 700);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    activeEditorView, handleGenerateJsonFromBuilder, // All GUI state variables that affect JSON output
    canvasWidthSetting, canvasHeightSetting, selectedSizePreset,
    tailwindCanvasBackgroundColor, canvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, tailwindCanvasBorderColor, tailwindCanvasBorderWidth, canvasBorderStyle,
    layoutElementGuiConfigs
  ]);

  // JSON -> GUI Sync (on view switch or external JSON change)
  useEffect(() => {
    console.log('[DEBUG] useTemplateDesigner: JSON -> GUI sync effect. Active view:', activeEditorView, 'JSON manual edit flag:', jsonEditedManuallyRef.current);
    if (activeEditorView === 'gui' && (jsonEditedManuallyRef.current || mode === 'edit')) { // Also re-parse if in edit mode and layoutDefinition changes (e.g. on load)
      console.log('[DEBUG] useTemplateDesigner: Switched to GUI view or layoutDefinition changed, re-parsing JSON to GUI state.');
      parseLayoutDefinitionToGuiState(layoutDefinition);
      jsonEditedManuallyRef.current = false;
    }
  }, [activeEditorView, layoutDefinition, mode, parseLayoutDefinitionToGuiState]);


  const handleLayoutDefinitionChangeFromTextarea = useCallback((newJson: string) => {
    setLayoutDefinition(newJson);
    jsonEditedManuallyRef.current = true;
    if (layoutJsonError) setLayoutJsonError(null);
  }, [layoutJsonError]);

  const validateAndFormatLayoutJsonOnBlur = useCallback(() => {
    console.log('[DEBUG] useTemplateDesigner: Validating and formatting JSON from textarea on blur.');
    if (activeEditorView !== 'json') {
        console.log('[DEBUG] useTemplateDesigner: GUI active, skipping format on blur for JSON textarea.');
        return true; 
    }
    try {
      const parsed = JSON.parse(layoutDefinition);
      const formattedJson = JSON.stringify(parsed, null, 2);
      setLayoutDefinition(formattedJson); // Update state with formatted version
      setLayoutJsonError(null);
      jsonEditedManuallyRef.current = true; // User edited it
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] useTemplateDesigner: Invalid JSON from textarea on blur', e.message);
      return false;
    }
  }, [layoutDefinition, activeEditorView]);

  // Sample card for preview
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
        else if (fieldDef.type === 'boolean') String(fieldDef.defaultValue).toLowerCase() === 'true';
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
      imageUrl: generateSamplePlaceholderUrl({ width: parseInt(canvasWidthSetting.replace('px', '') || String(DEFAULT_CANVAS_WIDTH)), height: 140, text: 'Main Image' }),
      dataAiHint: 'card art sample',
      cardType: 'Creature - Goblin',
      effectText: 'Sample effect: Draw a card.',
      attack: 2,
      defense: 2,
      artworkUrl: generateSamplePlaceholderUrl({ width: parseInt(canvasWidthSetting.replace('px', '') || String(DEFAULT_CANVAS_WIDTH)), height: parseInt(canvasHeightSetting.replace('px', '') || String(DEFAULT_CANVAS_HEIGHT)), text: 'Background Art' }),
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


  // Callbacks for UI interaction
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
        placeholderConfigWidth: parseInt(canvasWidthSetting.replace('px', '') || String(DEFAULT_CANVAS_WIDTH)),
        placeholderConfigHeight: 140,
      }
    ]);
  }, [fields, canvasWidthSetting, mode]);

  const removeField = useCallback((uiIdToRemove: string) => {
    console.log('[DEBUG] useTemplateDesigner: removeField called for _uiId:', uiIdToRemove);
    setFields(prevFields => prevFields.filter(f => f._uiId !== uiIdToRemove));
    // Corresponding GUI config will be removed by the useEffect watching `fields`
  }, []);

  const handleFieldChange = useCallback((uiIdToUpdate: string, updatedFieldDefinition: Partial<TemplateFieldDefinition>) => {
    console.log('[DEBUG] useTemplateDesigner: handleFieldChange for _uiId:', uiIdToUpdate);
    setFields(prevFields =>
      prevFields.map(field => {
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
            modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth ?? (parseInt(canvasWidthSetting.replace('px', '') || String(DEFAULT_CANVAS_WIDTH)));
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

  const handleCopyIconName = useCallback(async (iconName: string) => {
    console.log('[DEBUG] useTemplateDesigner: handleCopyIconName for icon:', iconName);
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
    // If GUI is active, ensure JSON is up-to-date from GUI state before saving
    // But if JSON editor is active, its content is the source of truth
    if (activeEditorView === 'gui') {
        console.log('[DEBUG] useTemplateDesigner: GUI active on save, calling handleGenerateJsonFromBuilder to ensure JSON is latest.');
        const generatedJson = handleGenerateJsonFromBuilder(false); // Suppress toast, get the string
        finalLayoutDefToSave = generatedJson; // Use the freshly generated JSON
        // Update the layoutDefinition state as well, so the textarea reflects this if user switches back
        setLayoutDefinition(generatedJson); 
    }


    if (!finalLayoutDefToSave.trim()) {
      finalLayoutDefToSave = DEFAULT_CARD_LAYOUT_JSON_STRING;
    } else {
      try {
        JSON.parse(finalLayoutDefToSave); // Final validation
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
      // The onSaveProp is the function passed from the parent page (NewTemplatePage or EditTemplatePage)
      await onSaveProp(templateToSave, mode === 'edit' ? templateIdToEdit : undefined);
      // Parent page (NewTemplatePage/EditTemplatePage) will handle success toast and navigation
    } catch (err) {
      console.error('[DEBUG] useTemplateDesigner: props.onSave promise rejected', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during save.";
      toast({ title: "Save Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    templateName, templateId, templateIdToEdit, fields, layoutDefinition, mode, existingTemplateIds, 
    activeEditorView, handleGenerateJsonFromBuilder, // Added activeEditorView & handleGenerateJsonFromBuilder
    onSaveProp, toast // onSaveProp instead of onSave
  ]);


  return {
    // Core template data
    templateName, setTemplateName,
    templateId, // Display only for create mode, fixed for edit mode
    fields, setFields,
    layoutDefinition, setLayoutDefinition: handleLayoutDefinitionChangeFromTextarea, // Expose specific setter for textarea
    layoutJsonError, setLayoutJsonError,

    // GUI Builder State for Canvas
    canvasWidthSetting, setCanvasWidthSetting,
    canvasHeightSetting, setCanvasHeightSetting,
    selectedSizePreset, setSelectedSizePreset,
    
    tailwindCanvasBackgroundColor, setTailwindCanvasBackgroundColor,
    canvasDirectBackgroundColor, setCanvasDirectBackgroundColor,
    tailwindCanvasBorderRadius, setTailwindCanvasBorderRadius,
    tailwindCanvasBorderColor, setTailwindCanvasBorderColor,
    tailwindCanvasBorderWidth, setTailwindCanvasBorderWidth,
    canvasBorderStyle, setCanvasBorderStyle,

    // GUI Builder State for Elements
    layoutElementGuiConfigs, setLayoutElementGuiConfigs,
    
    // Editor View Toggle
    activeEditorView, setActiveEditorView,
    showPixelGrid, setShowPixelGrid,

    // Derived data for preview
    sampleCardForPreview,
    templateForPreview,

    // Actions / Callbacks
    addField,
    removeField,
    handleFieldChange,
    handleSave, // This is the main save action for the parent
    handleGenerateJsonFromBuilder, // For the button in the GUI builder
    validateAndFormatLayoutJsonOnBlur, // For the JSON textarea
    
    handleSizePresetChange,
    handleCanvasDirectCSSChange,
    handleCanvasTailwindChange,
    handleGuiConfigChange,
    handleToggleGuiExpand,
    handleCopyIconName,

    // Misc
    isSaving,
    jsonEditedManuallyRef // For internal sync logic
  };
}

