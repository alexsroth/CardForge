
// src/app/templates/new/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye, HelpCircle } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper to convert TemplateFieldDefinition (from UI) to TemplateField (for storage)
function mapFieldDefinitionToTemplateField(def: TemplateFieldDefinition): TemplateField {
    const field: TemplateField = {
        key: def.key,
        label: def.label,
        type: def.type,
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

const defaultLayoutJson = `{
  "width": "280px",
  "height": "400px",
  "backgroundColor": "hsl(var(--card))",
  "borderColor": "hsl(var(--border))",
  "borderRadius": "calc(var(--radius) - 2px)",
  "backgroundImageField": "artworkUrl", 
  "elements": [
    {
      "fieldKey": "name", "type": "text",
      "style": { "position": "absolute", "top": "15px", "left": "15px", "right": "60px", "fontSize": "1.1em", "fontWeight": "bold", "lineHeight": "1.2", "maxHeight": "40px", "overflow": "hidden", "textOverflow": "ellipsis" },
      "className": "text-card-foreground"
    },
    {
      "fieldKey": "cost", "type": "iconValue", "icon": "Coins",
      "style": { "position": "absolute", "top": "15px", "right": "15px", "fontSize": "1.1em", "fontWeight": "bold", "padding": "5px", "backgroundColor": "hsla(var(--primary-foreground), 0.1)", "borderRadius": "9999px", "border": "1px solid hsla(var(--primary), 0.5)" },
      "className": "text-primary"
    },
    {
      "fieldKey": "imageUrl", "type": "image",
      "style": { "position": "absolute", "top": "60px", "left": "15px", "right": "15px", "height": "140px", "objectFit": "cover", "borderRadius": "calc(var(--radius) - 4px)" }
    },
    {
        "fieldKey": "cardType", "type": "text",
        "style": { "position": "absolute", "top": "210px", "left": "15px", "right": "15px", "fontSize": "0.8em", "fontStyle": "italic", "textAlign": "center", "padding": "2px 0", "borderTop": "1px solid hsl(var(--border))", "borderBottom": "1px solid hsl(var(--border))" },
        "className": "text-muted-foreground"
    },
    {
      "fieldKey": "effectText", "type": "textarea",
      "style": { "position": "absolute", "top": "240px", "left": "15px", "right": "15px", "bottom": "55px", "fontSize": "0.85em", "lineHeight": "1.4" },
      "className": "text-card-foreground"
    },
    {
      "fieldKey": "attack", "type": "iconValue", "icon": "Sword",
      "style": { "position": "absolute", "bottom": "15px", "left": "15px", "fontSize": "1em", "fontWeight": "bold" },
      "className": "text-destructive"
    },
    {
      "fieldKey": "defense", "type": "iconValue", "icon": "Shield",
      "style": { "position": "absolute", "bottom": "15px", "right": "15px", "fontSize": "1em", "fontWeight": "bold" },
      "className": "text-blue-500"
    }
  ]
}`;


export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(defaultLayoutJson); 
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

  // Effect to update sampleCardForPreview when fields or templateId change
  useEffect(() => {
    const generatedSampleCard: CardData = {
      id: 'preview-card',
      templateId: (templateId || 'previewTemplateId') as CardTemplateId,
      // Defaults for common fields in the default layout
      name: 'Awesome Card Name',
      description: 'This is a sample description for the card preview. It can contain multiple lines and will be used to test the layout of text areas.',
      cost: 3,
      attack: 2,
      defense: 2,
      imageUrl: 'https://placehold.co/250x140.png',
      dataAiHint: 'card art sample',
      rarity: 'common',
      effectText: 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.',
      flavorText: 'This is some italicized flavor text.',
      // Specific fields likely in default layout
      artworkUrl: 'https://placehold.co/280x400.png', // For full card background
      cardType: 'Creature - Goblin',
      // Populate from defined fields
      ...fields.reduce((acc, fieldDef) => {
        const key = fieldDef.key as keyof CardData;
        if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
          if (fieldDef.type === 'number') {
            (acc as any)[key] = Number(fieldDef.defaultValue);
          } else if (fieldDef.type === 'boolean') {
            (acc as any)[key] = String(fieldDef.defaultValue).toLowerCase() === 'true';
          } else {
            (acc as any)[key] = fieldDef.defaultValue;
          }
        } else {
          // Sensible defaults if no explicit default value for preview
          if (!Object.prototype.hasOwnProperty.call(acc, key)) {
             switch (fieldDef.type) {
              case 'text': (acc as any)[key] = `Sample ${fieldDef.label}`; break;
              case 'textarea': (acc as any)[key] = `Sample content for ${fieldDef.label}.`; break;
              case 'number': (acc as any)[key] = 0; break;
              case 'boolean': (acc as any)[key] = false; break;
              case 'select': 
                const firstOptionValue = fieldDef.optionsString?.split(',')[0]?.split(':')[0]?.trim();
                (acc as any)[key] = firstOptionValue || ''; 
                break;
              default: (acc as any)[key] = `Sample ${fieldDef.label}`;
            }
          }
        }
        // Ensure specific known fields in generatedSampleCard are updated if also in template fields
        if (['name', 'description', 'cost', 'attack', 'defense', 'imageUrl', 'dataAiHint', 'rarity', 'effectText', 'flavorText', 'artworkUrl', 'cardType'].includes(fieldDef.key)) {
          if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
              (acc as any)[key] = fieldDef.defaultValue;
               if((fieldDef.key === 'imageUrl' || fieldDef.key === 'artworkUrl') && typeof fieldDef.defaultValue === 'string' && !fieldDef.defaultValue.startsWith('http')) {
                  (acc as any)[key] = `https://placehold.co/${fieldDef.key === 'imageUrl' ? '250x140' : '280x400'}.png`; // Fallback for invalid image default
               }
          } else if(fieldDef.key === 'imageUrl') {
               (acc as any)[key] = 'https://placehold.co/250x140.png';
          } else if(fieldDef.key === 'artworkUrl') {
               (acc as any)[key] = 'https://placehold.co/280x400.png';
          }
        }
        return acc;
      }, {} as Partial<CardData>),
    };
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
        optionsString: '' 
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
    
    newFields[index] = modifiedField;
    setFields(newFields);
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
    
    if (layoutDefinition.trim()) {
      try {
        JSON.parse(layoutDefinition);
      } catch (e) {
        toast({
          title: "Invalid Layout JSON",
          description: "The Layout Definition is not valid JSON. Please correct it or leave it empty.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    const newTemplate: CardTemplate = {
      id: finalTemplateId as CardTemplateId, 
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition.trim() ? layoutDefinition.trim() : undefined,
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
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Section */}
        <div className="lg:w-1/2 xl:w-3/5">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
              <CardDescription>
                Define the structure for a new card template. Template ID is auto-generated from the name.
                Field Keys are auto-generated from Field Labels. Templates are saved to browser local storage.
                Use the live preview on the right to test your layout JSON.
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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Fields</h3>
                {fields.map((field, index) => (
                  <FieldRow
                    key={index} 
                    field={field}
                    onChange={(updatedField) => handleFieldChange(index, updatedField)}
                    onRemove={() => handleRemoveField(index)}
                    isSaving={isSaving}
                  />
                ))}
                <Button onClick={handleAddField} variant="outline" size="sm" disabled={isSaving}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                </Button>
                {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fields added yet. Click "Add Field" to begin.
                    </p>
                )}
              </div>

              <div>
                <Label htmlFor="layoutDefinition">Layout Definition (JSON)</Label>
                <Textarea
                  id="layoutDefinition"
                  value={layoutDefinition}
                  onChange={(e) => setLayoutDefinition(e.target.value)}
                  placeholder='Enter JSON for card layout or use the default provided.'
                  rows={15}
                  className="font-mono text-xs"
                  disabled={isSaving}
                />
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
                        <li><code>backgroundImageField</code>: (Optional) Key of a data field (e.g., "artworkUrl") to use for the card's full background image.</li>
                      </ul>
                      <p className="font-semibold mb-1"><code>elements</code> array (each object defines one visual piece):</p>
                      <ul className="list-disc list-inside pl-2 space-y-0.5">
                        <li><code>fieldKey</code>: String matching a key from your "Data Fields" (e.g., "name", "cost").</li>
                        <li><code>type</code>: "text", "textarea", "image", or "iconValue".</li>
                        <li><code>style</code>: CSS-in-JS object (e.g., <code>{'{ "position": "absolute", "top": "10px", "fontSize": "1.2em" }'}</code>). Use camelCase for CSS properties (<code>fontSize</code> not <code>font-size</code>).</li>
                        <li><code>className</code>: (Optional) Tailwind CSS classes.</li>
                        <li><code>prefix</code>, <code>suffix</code>: (Optional, for "text", "iconValue") Text to add before/after the field's value.</li>
                        <li><code>icon</code>: (For "iconValue") Name of a Lucide icon (e.g., "Coins", "Sword").</li>
                      </ul>
                       <p className="mt-2 italic">The live preview updates as you edit. Ensure your JSON is valid.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter>
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
        </div>

        {/* Preview Section */}
        <div className="lg:w-1/2 xl:w-2/5">
          <Card className="sticky top-20"> {/* Make preview sticky */}
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
    </div>
  );
}

    
