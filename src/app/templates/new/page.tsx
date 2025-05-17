// src/app/templates/new/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, HelpCircle, AlertTriangle, ArrowLeft, Copy, Palette } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId as ContextCardTemplateId } from '@/lib/card-templates'; // Renamed import alias
import { DEFAULT_CARD_LAYOUT_JSON_STRING, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useRouter } from 'next/navigation';
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

// Use ContextCardTemplateId as CardTemplateId locally if needed, or just use ContextCardTemplateId
type CardTemplateId = ContextCardTemplateId;


// Define the structure for the GUI configuration of layout elements
interface LayoutElementGuiConfig {
  fieldKey: string;
  label: string; // From the original data field
  originalType: TemplateFieldDefinition['type']; // Original type of the data field
  isEnabledOnCanvas: boolean; // Is this field included in the layout?
}


function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
    console.log('[DEBUG] TemplateDesignerPage/mapFieldDefinitionToTemplateField: Mapping def', def);
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
    console.log('[DEBUG] TemplateDesignerPage/mapFieldDefinitionToTemplateField: Resulting field', field);
    return field;
}

const toCamelCase = (str: string): string => {
  if (!str) return '';
  const cleaned = str
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, ' ');

  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'untitled';
  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  let result = [firstWord, ...restWords].join('');
  if (!result) return 'untitled';
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  console.log(`[DEBUG] TemplateDesignerPage/toCamelCase: Input: "${str}", Output: "${result}"`);
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
  console.log('[DEBUG] TemplateDesignerPage/generateSamplePlaceholderUrl: Generated URL', fullUrl, 'from config', config);
  return fullUrl;
}

const commonLucideIconsForGuide: (keyof typeof LucideIcons)[] = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) {
    console.warn(`[DEBUG] IconComponent (TemplateDesigner): Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} />;
  }
  return <Icon {...props} />;
};


export default function TemplateDesignerPage() {
  console.log('[DEBUG] TemplateDesignerPage: Component rendering/re-rendering.');
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  
  // State for the new Visual Layout Builder
  const [canvasWidthSetting, setCanvasWidthSetting] = useState<string>(`${DEFAULT_CANVAS_WIDTH}px`);
  const [canvasHeightSetting, setCanvasHeightSetting] = useState<string>(`${DEFAULT_CANVAS_HEIGHT}px`);
  const [layoutElementGuiConfigs, setLayoutElementGuiConfigs] = useState<LayoutElementGuiConfig[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);
  const [showElementOutlines, setShowElementOutlines] = useState(false);


  const { toast } = useToast();
  const { addTemplate: saveTemplateToContext, templates: existingTemplates, isLoading: templatesLoading } = useTemplates();
  const router = useRouter();

  useEffect(() => {
    console.log('[DEBUG] TemplateDesignerPage: templateName effect running. Name:', templateName);
    if (templateName) {
      setTemplateId(toCamelCase(templateName));
    } else {
      setTemplateId('');
    }
  }, [templateName]);

  // Sync fields state with layoutElementGuiConfigs
  useEffect(() => {
    console.log('[DEBUG] TemplateDesignerPage: Syncing fields to layoutElementGuiConfigs. Fields count:', fields.length);
    setLayoutElementGuiConfigs(prevConfigs => {
      const newConfigs = fields.map(field => {
        const existingConfig = prevConfigs.find(c => c.fieldKey === field.key);
        return {
          fieldKey: field.key,
          label: field.label,
          originalType: field.type,
          isEnabledOnCanvas: existingConfig ? existingConfig.isEnabledOnCanvas : true, // Default to true for new fields
        };
      });
      // Filter out configs for fields that no longer exist (if a field was removed)
      return newConfigs.filter(nc => fields.some(f => f.key === nc.fieldKey));
    });
  }, [fields]);


  useEffect(() => {
    console.log('[DEBUG] TemplateDesignerPage: Generating sampleCardForPreview. Fields count:', fields.length, 'Template ID:', templateId);
    const currentTemplateIdForPreview = templateId || 'previewTemplateId';
    const generatedSampleCard: Partial<CardData> = {
      id: 'preview-card',
      templateId: currentTemplateIdForPreview as CardTemplateId,
    };
    fields.forEach(fieldDef => {
      const key = fieldDef.key as keyof CardData;
      let valueForPreview: any;
      const hasPreviewValue = fieldDef.previewValue !== undefined && fieldDef.previewValue.trim() !== '';
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
    // Ensure some very common fields have sample data for the default layout preview
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
  }, [fields, templateId, templateName]); 

  const templateForPreview = useMemo((): CardTemplate => ({
    id: (templateId || 'previewTemplateId') as CardTemplateId,
    name: templateName || 'Preview Template Name',
    fields: fields.map(mapFieldDefinitionToTemplateField),
    layoutDefinition: layoutDefinition,
  }), [templateId, templateName, fields, layoutDefinition]);

  const handleAddField = () => {
    console.log('[DEBUG] TemplateDesignerPage/handleAddField: Adding new field.');
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
    console.log('[DEBUG] TemplateDesignerPage/handleRemoveField: Removing field at index', index);
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, updatedFieldDefinition: TemplateFieldDefinition) => {
    console.log('[DEBUG] TemplateDesignerPage/handleFieldChange: Updating field at index', index, updatedFieldDefinition);
    const newFields = [...fields];
    const oldField = newFields[index];
    let modifiedField = { ...oldField, ...updatedFieldDefinition };
    if (updatedFieldDefinition.label !== undefined && updatedFieldDefinition.label !== oldField.label) {
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
    console.log('[DEBUG] TemplateDesignerPage/handleLayoutDefinitionChange: Layout string changed.');
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJson = () => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      console.log('[DEBUG] TemplateDesignerPage/validateAndFormatLayoutJson: JSON is valid and formatted.');
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      console.warn('[DEBUG] TemplateDesignerPage/validateAndFormatLayoutJson: Invalid JSON', e.message);
      return false;
    }
  };

  const handleLayoutElementToggle = (fieldKey: string, checked: boolean) => {
    setLayoutElementGuiConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.fieldKey === fieldKey ? { ...config, isEnabledOnCanvas: checked } : config
      )
    );
  };

  const handleGenerateJsonFromBuilder = () => {
    console.log('[DEBUG] TemplateDesignerPage/handleGenerateJsonFromBuilder: Generating JSON from GUI configs.');
    const elementsToInclude = layoutElementGuiConfigs.filter(config => config.isEnabledOnCanvas);
    let yOffset = 10;
    const xOffset = 10;
    const elementHeight = 20; 
    const elementWidth = 120; 
    const verticalGap = 5;

    const generatedElements = elementsToInclude.map(config => {
      const element = {
        fieldKey: config.fieldKey,
        type: config.originalType === 'textarea' ? 'textarea' : 'text', 
        style: {
          position: "absolute",
          top: `${yOffset}px`,
          left: `${xOffset}px`,
          width: `${elementWidth}px`,
          height: `${elementHeight}px`,
          fontSize: "12px", 
        },
        className: "text-card-foreground" 
      };
      yOffset += elementHeight + verticalGap;
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
    toast({ title: "Layout JSON Updated", description: "JSON generated from builder and updated in the textarea and preview."});
  };


  const handleSaveTemplate = async () => {
    console.log('[DEBUG] TemplateDesignerPage/handleSaveTemplate: Attempting to save.');
    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    const finalTemplateId = toCamelCase(templateName.trim());
     if (!finalTemplateId) {
        toast({ title: "Invalid Name", description: "Template Name generates an empty ID. Please provide a valid name.", variant: "destructive" });
        return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Please add at least one field to the template.", variant: "destructive" });
      return;
    }
     if (existingTemplates.some(t => t.id === finalTemplateId)) {
        toast({
            title: "Duplicate ID",
            description: `A template with ID '${finalTemplateId}' (generated from name '${templateName}') already exists. Please choose a unique name.`,
            variant: "destructive",
        });
        return;
    }
    const fieldKeys = fields.map(f => f.key);
    const duplicateFieldKeys = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicateFieldKeys.length > 0) {
        toast({
            title: "Duplicate Field Keys",
            description: `Field keys must be unique within a template. Duplicates found: ${duplicateFieldKeys.join(', ')}. This usually auto-corrects, but please review labels.`,
            variant: "destructive",
        });
        return;
    }
    if (layoutDefinition.trim() && !validateAndFormatLayoutJson()) { 
        toast({
          title: "Invalid Layout JSON",
          description: `Please correct the Layout Definition JSON in the textarea. Error: ${layoutJsonError || 'Unknown JSON error.'}`,
          variant: "destructive",
        });
        return;
    }
    setIsSaving(true);
    const newTemplate: CardTemplate = {
      id: finalTemplateId as CardTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition.trim() ? layoutDefinition.trim() : DEFAULT_CARD_LAYOUT_JSON_STRING,
    };
    console.log('[DEBUG] TemplateDesignerPage/handleSaveTemplate: Calling saveTemplateToContext with:', newTemplate);
    const result = await saveTemplateToContext(newTemplate);
    if (result.success) {
      toast({
        title: "Template Saved!",
        description: result.message + " It's now available in your current browser session.",
        variant: "default",
        duration: 7000,
      });
      router.push('/templates');
    } else {
      toast({
        title: "Save Failed",
        description: result.message,
        variant: "destructive",
        duration: 7000,
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


  if (templatesLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading template context...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Card for Template Info and Data Fields */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
            </Button>
          </div>
          <CardDescription>
            Define the structure for a new card template. Template ID is auto-generated from the name. Field Keys are auto-generated from Field Labels. Templates are saved to browser local storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateName">Template Name (e.g., 'Hero Unit Card')</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Hero Unit Card"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="templateId">Template ID (auto-generated)</Label>
              <Input
                id="templateId"
                value={templateId}
                placeholder="heroUnitCard"
                readOnly
                disabled={isSaving}
                className="bg-muted/50"
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Data Fields</h3>
            <ScrollArea className="h-auto pr-0">
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
              className="mt-3"
              title={"Add a new data field"}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Row for Visual Layout Builder and Live Preview */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Visual Layout Builder & JSON Output Card */}
        <Card className="md:w-[65%] flex flex-col shadow-md">
          <CardHeader>
              <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
              <CardDescription>
                Configure canvas size and select fields to include. Then generate basic JSON to refine in the textarea or copy.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {/* Card Canvas Setup */}
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <h4 className="text-md font-semibold mb-1">Card Canvas Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="canvasWidth" className="text-xs">Canvas Width (e.g., 280px)</Label>
                  <Input id="canvasWidth" value={canvasWidthSetting} onChange={(e) => setCanvasWidthSetting(e.target.value)} disabled={isSaving} className="h-8 text-xs"/>
                </div>
                <div>
                  <Label htmlFor="canvasHeight" className="text-xs">Canvas Height (e.g., 400px)</Label>
                  <Input id="canvasHeight" value={canvasHeightSetting} onChange={(e) => setCanvasHeightSetting(e.target.value)} disabled={isSaving} className="h-8 text-xs"/>
                </div>
              </div>
            </div>

            {/* Layout Elements Selection */}
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <h4 className="text-md font-semibold mb-1">Layout Elements (Toggle to Include)</h4>
              {layoutElementGuiConfigs.length > 0 ? (
                <ScrollArea className="max-h-[250px] pr-2"> {/* Constrained height */}
                  <div className="space-y-1.5">
                    {layoutElementGuiConfigs.map(config => (
                      <div key={config.fieldKey} className="flex items-center justify-between p-1.5 hover:bg-muted/70 rounded-sm">
                        <Label htmlFor={`toggle-${config.fieldKey}`} className="text-sm cursor-pointer">
                          {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span>
                        </Label>
                        <Switch
                          id={`toggle-${config.fieldKey}`}
                          checked={config.isEnabledOnCanvas}
                          onCheckedChange={(checked) => handleLayoutElementToggle(config.fieldKey, checked)}
                          disabled={isSaving}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-xs text-muted-foreground">No data fields defined yet to build layout elements.</p>
              )}
            </div>
            
            <Button onClick={handleGenerateJsonFromBuilder} variant="secondary" size="sm" disabled={isSaving || layoutElementGuiConfigs.length === 0} className="self-start">
              <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON from Builder
            </Button>

            {/* JSON Output & Guides Section */}
            <div className="mt-2 flex-grow flex flex-col min-h-0">
              <div>
                <Label htmlFor="layoutDefinition" className="text-sm font-medium">Layout Definition JSON (Read-Only after generating from builder)</Label>
                <Textarea
                  id="layoutDefinition"
                  value={layoutDefinition}
                  onChange={handleLayoutDefinitionChange}
                  onBlur={validateAndFormatLayoutJson}
                  placeholder='Click "Generate/Update JSON from Builder" above, or paste your JSON here.'
                  rows={15}
                  className="font-mono text-xs flex-grow min-h-[200px] max-h-[300px] bg-muted/20" 
                  disabled={isSaving}
                  readOnly 
                />
              </div>
              {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
              )}
              <Accordion type="single" collapsible className="w-full mt-2" defaultValue="layout-guide">
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
                      <li><strong><code>style</code></strong>: (Object) CSS-in-JS (e.g., {`{ "position": "absolute", "top": "10px", "fontSize": "1.2em" }`}). Use camelCase for CSS properties.</li>
                      <li><strong><code>className</code></strong>: (String, Optional) Tailwind CSS classes.</li>
                      <li><strong><code>prefix</code> / <code>suffix</code></strong>: (String, Optional) For "text", "iconValue". Text added before/after the field's value.</li>
                      <li><strong><code>icon</code></strong>: (String, Optional) For "iconValue" type. Name of a Lucide icon. **Ensure the icon exists in `lucide-react`.**</li>
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
              disabled={isSaving || !templateName.trim() || fields.length === 0}
            >
              {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> ) : ( <> <Save className="mr-2 h-4 w-4" /> Save Template </>)}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Live Preview Card */}
        <Card className="md:w-[35%] sticky top-20 self-start shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center">
                    <Eye className="mr-2 h-5 w-5" /> Live Layout Preview
                </CardTitle>
                <div className="flex items-center space-x-2">
                    <Switch id="show-outlines" checked={showElementOutlines} onCheckedChange={setShowElementOutlines} aria-label="Show element outlines" />
                    <Label htmlFor="show-outlines" className="text-xs text-muted-foreground">Outlines</Label>
                </div>
            </div>
            <CardDescription>
              This preview updates as you modify the Layout Definition JSON or template fields.
              Uses sample data based on your field definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 rounded-b-md">
            {sampleCardForPreview && templateForPreview ? (
              <DynamicCardRenderer
                card={sampleCardForPreview}
                template={templateForPreview}
                showElementOutlines={showElementOutlines}
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
