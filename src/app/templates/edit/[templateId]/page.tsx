
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, ArrowLeft, Eye, HelpCircle } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate } from '@/lib/card-templates';
import { DEFAULT_CARD_LAYOUT_JSON_STRING } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to convert TemplateField (from storage) to TemplateFieldDefinition (for UI)
function mapTemplateFieldToFieldDefinition(field: TemplateField): TemplateFieldDefinition {
    const definition: TemplateFieldDefinition = {
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue,
        placeholderConfigWidth: field.placeholderConfigWidth,
        placeholderConfigHeight: field.placeholderConfigHeight,
        placeholderConfigBgColor: field.placeholderConfigBgColor,
        placeholderConfigTextColor: field.placeholderConfigTextColor,
        placeholderConfigText: field.placeholderConfigText,
    };
    if (field.type === 'select' && field.options) {
        definition.optionsString = field.options.map(opt => `${opt.value}:${opt.label}`).join(',');
    }
    return definition;
}

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
    if (def.defaultValue !== undefined && def.defaultValue !== '') {
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

  if (words.length === 0) return 'untitledField';

  let result = [words[0].toLowerCase(), ...words.slice(1).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )].join('');

  if (!result) result = 'untitledField';

   if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  return result;
};

function generateSamplePlaceholderUrl(fieldDef: TemplateFieldDefinition): string {
  const width = fieldDef.placeholderConfigWidth || 100;
  const height = fieldDef.placeholderConfigHeight || 100;
  
  let path = `${width}x${height}`;
  const cleanBgColor = fieldDef.placeholderConfigBgColor?.replace('#', '').trim();
  const cleanTextColor = fieldDef.placeholderConfigTextColor?.replace('#', '').trim();
  const cleanText = fieldDef.placeholderConfigText?.trim();

  if (cleanBgColor) {
    path += `/${cleanBgColor}`;
    if (cleanTextColor) {
      path += `/${cleanTextColor}`;
    }
  }
  path += '.png'; // Always request PNG for preview

  let fullUrl = `https://placehold.co/${path}`;

  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  return fullUrl;
}


export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getTemplateById, updateTemplate, isLoading: templatesLoading } = useTemplates();

  const templateIdToEdit = typeof params.templateId === 'string' ? params.templateId as CardTemplateId : undefined;

  const [originalTemplateId, setOriginalTemplateId] = useState<CardTemplateId | undefined>(templateIdToEdit);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>('');
  const [layoutJsonError, setLayoutJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [sampleCardForPreview, setSampleCardForPreview] = useState<CardData | null>(null);


  useEffect(() => {
    if (templatesLoading || !templateIdToEdit) {
      setIsLoadingPage(templatesLoading);
      return;
    }

    const templateToEdit = getTemplateById(templateIdToEdit);
    if (templateToEdit) {
      setOriginalTemplateId(templateToEdit.id as CardTemplateId);
      setTemplateName(templateToEdit.name);
      setFields(templateToEdit.fields.map(mapTemplateFieldToFieldDefinition));
      setLayoutDefinition(templateToEdit.layoutDefinition?.trim() ? templateToEdit.layoutDefinition : DEFAULT_CARD_LAYOUT_JSON_STRING);
      setErrorLoading(null);
    } else {
      setErrorLoading(`Template with ID "${templateIdToEdit}" not found.`);
    }
    setIsLoadingPage(false);
  }, [templateIdToEdit, getTemplateById, templatesLoading]);

  useEffect(() => {
    const currentTemplateIdForPreview = originalTemplateId || 'previewTemplateId';
    const generatedSampleCard: CardData = {
      id: 'preview-card',
      templateId: currentTemplateIdForPreview as CardTemplateId,
      name: 'Awesome Card Name',
      description: 'This is a sample description for the card preview. It can contain multiple lines and will be used to test the layout of text areas.',
      cost: 3,
      attack: 2,
      defense: 2,
      imageUrl: 'https://placehold.co/250x140.png',
      dataAiHint: 'card art sample',
      rarity: 'rare',
      effectText: 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.',
      flavorText: 'This is some italicized flavor text.',
      artworkUrl: 'https://placehold.co/280x400.png', 
      cardType: 'Creature - Goblin', 
      statusIcon: 'ShieldCheck', 
    };

    fields.forEach(fieldDef => {
      const key = fieldDef.key as keyof CardData;
       if (fieldDef.type === 'placeholderImage') {
          (generatedSampleCard as any)[key] = generateSamplePlaceholderUrl(fieldDef);
       } else if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
        if (fieldDef.type === 'number') {
          (generatedSampleCard as any)[key] = Number(fieldDef.defaultValue);
        } else if (fieldDef.type === 'boolean') {
          (generatedSampleCard as any)[key] = String(fieldDef.defaultValue).toLowerCase() === 'true';
        } else {
          (generatedSampleCard as any)[key] = fieldDef.defaultValue;
        }
      } else {
         if (!Object.prototype.hasOwnProperty.call(generatedSampleCard, key) || generatedSampleCard[key] === undefined) {
           switch (fieldDef.type) {
            case 'text': (generatedSampleCard as any)[key] = `Sample ${fieldDef.label}`; break;
            case 'textarea': (generatedSampleCard as any)[key] = `Sample content for ${fieldDef.label}.`; break;
            case 'number': (generatedSampleCard as any)[key] = 0; break;
            case 'boolean': (generatedSampleCard as any)[key] = false; break;
            case 'select':
              const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
              (generatedSampleCard as any)[key] = firstOptionValue || '';
              break;
            default: (generatedSampleCard as any)[key] = `Sample ${fieldDef.label}`;
          }
        }
      }
      if (['name', 'description', 'cost', 'attack', 'defense', 'imageUrl', 'dataAiHint', 'rarity', 'effectText', 'flavorText', 'artworkUrl', 'cardType', 'statusIcon'].includes(fieldDef.key)) {
         if ((fieldDef.type !== 'placeholderImage' && (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '')) ) {
             if((fieldDef.key === 'imageUrl' || fieldDef.key === 'artworkUrl') && typeof fieldDef.defaultValue === 'string' && !fieldDef.defaultValue.startsWith('http') && !fieldDef.defaultValue.startsWith('https')) {
                (generatedSampleCard as any)[key] = `https://placehold.co/${fieldDef.key === 'imageUrl' ? '250x140' : '280x400'}.png`;
             }
        } else if (fieldDef.type !== 'placeholderImage') {
            if(fieldDef.key === 'imageUrl' && !(generatedSampleCard as any)[key]) { 
                (generatedSampleCard as any)[key] = 'https://placehold.co/250x140.png';
            } else if(fieldDef.key === 'artworkUrl' && !(generatedSampleCard as any)[key]) {
                (generatedSampleCard as any)[key] = 'https://placehold.co/280x400.png';
            } else if(fieldDef.key === 'statusIcon' && !(generatedSampleCard as any)[key]) {
                (generatedSampleCard as any)[key] = 'ShieldCheck';
            }
        }
      }
    });
    setSampleCardForPreview(generatedSampleCard as CardData);
  }, [fields, originalTemplateId, templateName]);

  const templateForPreview = useMemo((): CardTemplate => ({
    id: (originalTemplateId || 'previewTemplateId') as CardTemplateId,
    name: templateName || 'Preview Template Name',
    fields: fields.map(mapFieldDefinitionToTemplateField),
    layoutDefinition: layoutDefinition,
  }), [originalTemplateId, templateName, fields, layoutDefinition]);


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
    if (!originalTemplateId) {
        toast({ title: "Error", description: "Original template ID is missing. Cannot update.", variant: "destructive" });
        return;
    }
    if (!templateName.trim()) {
      toast({ title: "Missing Name", description: "Template Name cannot be empty.", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "No Fields", description: "Add at least one field to the template.", variant: "destructive" });
      return;
    }

    const fieldKeys = fields.map(f => f.key);
    const duplicateFieldKeys = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicateFieldKeys.length > 0) {
        toast({
            title: "Duplicate Field Keys",
            description: `Field keys must be unique. Duplicates: ${duplicateFieldKeys.join(', ')}. Please adjust field labels.`,
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

    const updatedTemplateData: CardTemplate = {
      id: originalTemplateId,
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition.trim() ? layoutDefinition.trim() : DEFAULT_CARD_LAYOUT_JSON_STRING,
    };

    const result = await updateTemplate(updatedTemplateData);

    if (result.success) {
      toast({
        title: "Template Updated!",
        description: result.message,
        variant: "default",
      });
      router.push('/templates');
    } else {
      toast({
        title: "Update Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  if (isLoadingPage) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading template data...</p>
      </div>
    );
  }

  if (errorLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <p className="mt-4 text-destructive-foreground">{errorLoading}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Top Section: Template Info & Data Fields */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Edit Template</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
            </div>
            <CardDescription>
              Modify the template's name, fields, and layout definition. The Template ID (<code>{originalTemplateId}</code>) cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Hero Unit Card"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="templateId">Template ID (Read-only)</Label>
                <Input
                  id="templateId"
                  value={originalTemplateId || ''}
                  readOnly
                  disabled={isSaving}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Data Fields</h3>
              <ScrollArea className="h-auto pr-3"> 
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
                placeholder='Enter JSON for card layout, e.g., { "width": "280px", "elements": [...] }'
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
                      <p className="italic text-muted-foreground">No data fields defined yet for this template.</p>
                    )}
                    <p className="text-xs mt-1 mb-2">Use these keys in the <code>fieldKey</code> property of elements below.</p>

                    <p className="font-semibold mb-1 mt-3"><code>elements</code> array (each object defines one visual piece):</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li>
                        <strong><code>fieldKey</code></strong>: (String) **Must exactly match** a 'Field Key' from the list above.
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
                     <p className="mt-3 italic">The live preview updates as you edit. Ensure your JSON is valid. Customize <code>fieldKey</code> values to match your defined data fields.</p>
                    
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
}`}
                     </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                onClick={handleSaveTemplate}
                className="w-full md:w-auto"
                disabled={isSaving || !templateName.trim() || fields.length === 0 || !originalTemplateId}
              >
                {isSaving ? (
                  <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes... </>
                ) : (
                  <> <Save className="mr-2 h-4 w-4" /> Save Changes </>
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
                <p className="text-muted-foreground">Loading preview or define fields...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
