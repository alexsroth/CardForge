// src/hooks/useTemplateDesigner.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toCamelCase } from '@/lib/card-designer';
import type { CardTemplate, CardTemplateId } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import { mapFieldDefinitionToTemplateField, mapTemplateFieldToFieldDefinition, type TemplateFieldDefinition, type LayoutElementGuiConfig } from '@/lib/card-designer';
import { generateSamplePlaceholderUrl } from '@/lib/card-designer';
import { useToast } from '@/hooks/use-toast';

/**
 * Extracted hook from the original (very large) TemplateDesigner component.
 * Only the minimal essentials are included to keep this file readable.
 * Re‑integrate more of the original logic as needed!
 */

export interface UseTemplateDesignerArgs {
  mode: 'create' | 'edit';
  initialTemplate?: CardTemplate;
  existingTemplateIds?: CardTemplateId[];
}

export function useTemplateDesigner({
  mode,
  initialTemplate,
  existingTemplateIds = [],
}: UseTemplateDesignerArgs) {
  const { toast } = useToast();

  /* ------------------------------------------------------------------ */
  /*  Core state (trimmed from original – add more as you migrate code) */
  /* ------------------------------------------------------------------ */

  // Basic meta
  const [templateName, setTemplateName] = useState(initialTemplate?.name ?? '');
  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? '');

  // Field definitions
  const [fields, setFields] = useState<TemplateFieldDefinition[]>(
    initialTemplate ? initialTemplate.fields.map(mapTemplateFieldToFieldDefinition) : []
  );

  // Layout JSON
  const [layoutDefinition, setLayoutDefinition] = useState(
    initialTemplate?.layoutDefinition ?? DEFAULT_CARD_LAYOUT_JSON_STRING
  );

  // Live‑preview sample card
  const [sampleCard, setSampleCard] = useState<CardData>({
    id: 'preview-card',
    templateId: (initialTemplate?.id || 'previewTemplateId') as CardTemplateId,
    name: initialTemplate?.name || 'Preview Card',
    imageUrl: generateSamplePlaceholderUrl({ width: 300, height: 180, text: 'Image' }),
    // Initialize other potential CardData properties with default values if needed
    // e.g., description: '', cost: 0, attributes: [], etc.
  });

  // Track saving
  const [isSaving, setIsSaving] = useState(false);

  // Keep the original gigantic GUI/Layout state in one big ref for now.
  // You can progressively migrate each section into its own smaller hook.
  const guiRef = useRef<{ [k: string]: any }>({});

  /* ------------------------------------------------------------- */
  /* derive templateId from templateName for CREATE mode           */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    if (mode === 'create') {
      setTemplateId(templateName ? toCamelCase(templateName) : '');
    }
  }, [templateName, mode]);

  /* ------------------------------------------------------------- */
  /* Generate (very naive) sample‑card data for live preview       */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    const idForPreview = (templateId || 'previewTemplateId') as CardTemplateId;
    const result: Partial<CardData> = {
      id: 'preview-card',
      templateId: idForPreview,
      name: templateName || 'Preview Card',
      imageUrl: generateSamplePlaceholderUrl({ width: 300, height: 180, text: 'Image' }),
    };
    fields.forEach(f => {
      result[f.key as keyof CardData] = f.previewValue ?? f.defaultValue ?? '…';
    });
    setSampleCard(result as CardData);
  }, [fields, templateName, templateId]);

  /* ------------------------------------------------------------- */
  /* Helpers exposed to UI                                         */
  /* ------------------------------------------------------------- */
  const addField = useCallback(() => {
    const baseLabel = `Field ${fields.length + 1}`;
    const newField: TemplateFieldDefinition = {
      _uiId: `field-${Date.now()}`,
      key: toCamelCase(baseLabel),
      label: baseLabel,
      type: 'text',
      placeholder: '',
      defaultValue: '',
      previewValue: '',
    };
    setFields(prev => [...prev, newField]);
  }, [fields]);

  const removeField = useCallback((uiId: string) => {
    setFields(prev => prev.filter(f => f._uiId !== uiId));
  }, []);

  /* ------------------------------------------------------------- */
  /* Save template logic                                           */
  /* ------------------------------------------------------------- */
  const saveTemplate = useCallback(async () => {
    setIsSaving(true);
    try {
      const templateData: CardTemplate = {
        id: templateId as CardTemplateId, // Cast as CardTemplateId
        name: templateName,
        fields: fields.map(mapFieldDefinitionToTemplateField),
        layoutDefinition,
      };

      // TODO: Add your actual save logic here.
      // This could involve making an API call to save the template data
      // or interacting with your chosen data storage mechanism.
      // console.log('Saving template:', templateData); // Placeholder log
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save time

      toast({
        title: "Template saved!",
        description: `Template "${templateName}" has been saved.`,
      });

    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error saving template",
        description: "There was a problem saving the template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [templateId, templateName, fields, layoutDefinition, toast]);


  /* ------------------------------------------------------------- */
  /* Memo – build CardTemplate for preview                         */
  /* ------------------------------------------------------------- */
  const templateForPreview = useMemo<CardTemplate>(() => ({
    id: (templateId || 'previewTemplateId') as CardTemplateId,
    name: templateName || 'Preview Template',
    fields: fields.map(mapFieldDefinitionToTemplateField),
    layoutDefinition,
  }), [templateId, templateName, fields, layoutDefinition]);

  /* ------------------------------------------------------------- */
  /* Public API – return everything the UI layer needs            */
  /* ------------------------------------------------------------- */
  return {
    /* state */
    templateName, setTemplateName,
    templateId,
    fields, setFields,
    layoutDefinition, setLayoutDefinition,

    /* derived */
    templateForPreview,
    sampleCard,

    /* helpers */
    addField,
    removeField,
    saveTemplate,

    /* misc */
    isSaving, setIsSaving,
  };
}