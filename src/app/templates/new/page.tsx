// src/app/templates/new/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, HelpCircle, AlertTriangle, ArrowLeft, Copy } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper to convert TemplateFieldDefinition (from UI) to TemplateField (for storage)
function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
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
    return field;
}

// Helper function to generate camelCase strings, typically for IDs/keys
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
    bgColor,
    textColor,
    text,
  } = config;

  let path = `${width}x${height}`;
  const cleanBgColor = bgColor?.replace('#', '').trim();
  const cleanTextColor = textColor?.replace('#', '').trim();

  if (cleanBgColor) {
    path += `/${cleanBgColor}`;
    if (cleanTextColor) {
      path += `/${cleanTextColor}`;
    }
  }
  // Ensure .png is appended if colors are present, or as default if no colors
  path += `.png`;

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  return fullUrl;
}

const commonLucideIconsForGuide = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", "Flash", "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
];

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) {
    console.warn(`Lucide icon "${name}" not found. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} />; 
  }
  return <Icon {...props} />;
};


export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(DEFAULT_CARD_LAYOUT_JSON_STRING);
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);

  const { toast } = useToast();
  const { addTemplate: saveTemplateToContext, templates: existingTemplates, isLoading: templatesLoading } = useTemplates();
  const router = useRouter();

  useEffect(() => {
    if (templateName) {
      setTemplateId(toCamelCase(templateName));
    } else {
      setTemplateId('');
    }
  }, [templateName]);

  useEffect(() => {
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
        if (hasPreviewValue && typeof fieldDef.previewValue === 'string' && (fieldDef.previewValue.startsWith('http') || fieldDef.previewValue.startsWith('https://placehold.co'))) {
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
          valueForPreview = !isNaN(Number(pv)) ? Number(pv) : 0;
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
            valueForPreview = firstOptionValue || `Option for ${fieldDef.label}`;
            break;
          default: valueForPreview = `Sample ${fieldDef.label}`;
        }
      }
      (generatedSampleCard as any)[key] = valueForPreview;
    });
    
    if (generatedSampleCard.name === undefined && !fields.some(f => f.key === 'name')) generatedSampleCard.name = 'Awesome Card Name';
    if (generatedSampleCard.cost === undefined && !fields.some(f => f.key === 'cost')) generatedSampleCard.cost = 3;
    if (generatedSampleCard.imageUrl === undefined && !fields.some(f => f.key === 'imageUrl')) {
      generatedSampleCard.imageUrl = generateSamplePlaceholderUrl({width: 250, height: 140, text: 'Card Image'});
    }
    if (generatedSampleCard.dataAiHint === undefined && !fields.some(f => f.key === 'dataAiHint')) generatedSampleCard.dataAiHint = 'card art sample';
    if (generatedSampleCard.cardType === undefined && !fields.some(f => f.key === 'cardType')) generatedSampleCard.cardType = 'Creature - Goblin';
    if (generatedSampleCard.effectText === undefined && !fields.some(f => f.key === 'effectText')) generatedSampleCard.effectText = 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.';
    if (generatedSampleCard.attack === undefined && !fields.some(f => f.key === 'attack')) generatedSampleCard.attack = 2;
    if (generatedSampleCard.defense === undefined && !fields.some(f => f.key === 'defense')) generatedSampleCard.defense = 2;
    if (generatedSampleCard.artworkUrl === undefined && !fields.some(f => f.key === 'artworkUrl')) {
      generatedSampleCard.artworkUrl = generateSamplePlaceholderUrl({width: 280, height: 400, text: 'Artwork'});
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
        placeholderConfigWidth: 250,
        placeholderConfigHeight: 140,
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, updatedFieldDefinition: TemplateFieldDefinition) => {
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
        modifiedField.placeholderConfigWidth = modifiedField.placeholderConfigWidth || 250;
        modifiedField.placeholderConfigHeight = modifiedField.placeholderConfigHeight || 140;
    }

    newFields[index] = modifiedField;
    setFields(newFields);
  };

  const handleLayoutDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLayoutDef = e.target.value;
    setLayoutDefinition(newLayoutDef);
    if (layoutJsonError) setLayoutJsonError(null);
  };

  const validateAndFormatLayoutJson = () => {
    try {
      const parsed = JSON.parse(layoutDefinition);
      setLayoutDefinition(JSON.stringify(parsed, null, 2));
      setLayoutJsonError(null);
      return true;
    } catch (e: any) {
      setLayoutJsonError(`Invalid JSON: ${e.message}`);
      return false;
    }
  };


  const handleSaveTemplate = async () => {
    if (!templateId.trim() || !templateName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a Template Name (Template ID is auto-generated).",
        variant: "destructive",
      });
      return;
    }
    if (fields.length === 0) {
      toast({
        title: "No Fields",
        description: "Please add at least one field to the template.",
        variant: "destructive",
      });
      return;
    }

    const finalTemplateId = toCamelCase(templateName);
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
          description: `Please correct the Layout Definition JSON. Error: ${layoutJsonError || 'Unknown JSON error.'}`,
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
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="mb-8">
        <CardHeader>
            <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
                <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
                </Button>
            </div>
        <CardDescription>
            Define the structure for a new card template. Template ID is auto-generated from the name.
            Field Keys are auto-generated from Field Labels. Templates are saved to browser local storage.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Data Fields</h3>
            <ScrollArea className="h-auto pr-3 border rounded-md">
            <div className="p-2 space-y-3">
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
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fields added yet. Click "Add Field" to begin.
                    </p>
                )}
            </div>
            </ScrollArea>
            <Button onClick={handleAddField} variant="outline" size="sm" disabled={isSaving} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
        </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Editor (Left) and Preview (Right) */}
      <div className="flex flex-col md:flex-row gap-8">
        <Card className="md:w-[65%] flex flex-col">
            <CardHeader>
            <CardTitle className="text-xl font-bold">Layout Definition (JSON)</CardTitle>
            <CardDescription>
                Define how card data is visually presented. Use the live preview on the right.
                Field keys in the JSON must match the keys from your "Data Fields" section.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 flex flex-col">
            <Textarea
                id="layoutDefinition"
                value={layoutDefinition}
                onChange={handleLayoutDefinitionChange}
                onBlur={validateAndFormatLayoutJson}
                placeholder='Enter JSON for card layout or use the default provided.'
                rows={15}
                className="font-mono text-xs flex-grow min-h-[300px] max-h-[350px]" 
                disabled={isSaving}
            />
            {layoutJsonError && (
                <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>JSON Error</AlertTitle>
                <AlertDescription className="text-xs">{layoutJsonError}</AlertDescription>
                </Alert>
            )}
            <Accordion type="single" collapsible className="w-full mt-2">
                <AccordionItem value="layout-guide">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center text-muted-foreground">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Show Layout JSON Guide
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                        <p className="font-semibold mb-1">Top-level properties:</p>
                        <ul className="list-disc list-inside pl-2 mb-2 space-y-0.5">
                        <li><code>width</code>, <code>height</code>: Card dimensions (e.g., "280px").</li>
                        <li><code>backgroundColor</code>, <code>borderColor</code>, <code>borderRadius</code>: CSS values.</li>
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
                        <p className="text-xs mt-1 mb-2">Use these keys in the <code>fieldKey</code> property of elements below.</p>


                        <p className="font-semibold mb-1 mt-3"><code>elements</code> array (each object defines one visual piece):</p>
                        <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong><code>fieldKey</code></strong>: (String) **Must exactly match** a 'Field Key' from the list above (e.g., if you have "Card Title" with key "cardTitle", use <code>"cardTitle"</code>).
                        </li>
                        <li>
                            <strong><code>type</code></strong>: (String) One of: <code>"text"</code>, <code>"textarea"</code>, <code>"image"</code>, <code>"iconValue"</code>, <code>"iconFromData"</code>.
                            <ul className="list-['-_'] list-inside pl-4 mt-1 space-y-1 text-muted-foreground/90">
                                <li><code>text</code>: Single line text.</li>
                                <li><code>textarea</code>: Multi-line text, often scrollable.</li>
                                <li><code>image</code>: Displays an image from URL in <code>fieldKey</code>.</li>
                                <li><code>iconValue</code>: Displays text from <code>fieldKey</code> alongside a fixed <code>icon</code>.</li>
                                <li><code>iconFromData</code>: Displays an icon whose name is stored in <code>fieldKey</code>.</li>
                            </ul>
                        </li>
                        <li>
                            <strong><code>style</code></strong>: (Object) CSS-in-JS (e.g., <code>{'{ "position": "absolute", "top": "10px", "fontSize": "1.2em" }'}</code>). Use camelCase for CSS properties.
                        </li>
                        <li>
                            <strong><code>className</code></strong>: (String, Optional) Tailwind CSS classes.
                        </li>
                        <li>
                            <strong><code>prefix</code> / <code>suffix</code></strong>: (String, Optional) For "text", "iconValue". Text added before/after the field's value.
                        </li>
                        <li>
                            <strong><code>icon</code></strong>: (String, Optional) For "iconValue" type. Name of a Lucide icon (e.g., "Coins", "Sword"). **Ensure the icon exists in <code>lucide-react</code>.**
                        </li>
                        </ul>
                        <p className="mt-3 italic">The live preview updates as you edit. Ensure your JSON is valid. The default layout provided is a starting point; customize its <code>fieldKey</code> values to match your defined data fields.</p>
                        
                        <p className="font-semibold mb-1 mt-4">Example Element Snippets:</p>
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
    }
`}
                        </pre>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="lucide-icon-explorer">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center text-muted-foreground">
                      <Copy className="mr-2 h-4 w-4" />
                      Browse Lucide Icons
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs p-3 border rounded-md bg-muted/30">
                    <p className="font-semibold mb-1">Common Lucide Icons (Click to Copy Name):</p>
                      <ScrollArea className="max-h-[120px] bg-background/50 p-2 rounded border">
                         <div className={cn(
                          "grid gap-1",
                          "grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16" 
                        )}>
                        {commonLucideIconsForGuide.map(iconName => (
                          <TooltipProvider key={iconName}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyIconName(iconName)}
                                  className="h-7 w-7 p-1"
                                >
                                  <IconComponent name={iconName} className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{iconName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                      </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="mt-auto">
            <Button
                onClick={handleSaveTemplate}
                className="w-full md:w-auto"
                disabled={isSaving || !templateName.trim() || fields.length === 0}
            >
                {isSaving ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
                ) : (
                <> <Save className="mr-2 h-4 w-4" /> Save Template </>
                )}
            </Button>
            </CardFooter>
        </Card>

        <Card className="md:w-[35%] sticky top-20 self-start">
            <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Live Layout Preview
            </CardTitle>
            <CardDescription>
                This preview updates as you modify the Layout Definition JSON or template fields.
                Uses sample data based on your field definitions.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 rounded-b-md">
            {sampleCardForPreview && templateForPreview ? (
                <DynamicCardRenderer card={sampleCardForPreview} template={templateForPreview} />
            ) : (
                <p className="text-muted-foreground">Define fields to see a preview.</p>
            )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
