
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
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper to convert TemplateField (from storage) to TemplateFieldDefinition (for UI)
function mapTemplateFieldToFieldDefinition(field: TemplateField): TemplateFieldDefinition {
    const definition: TemplateFieldDefinition = {
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue,
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
  
  if (!result) result = 'untitledField'; // Fallback if cleaning results in empty string

   if (/^[0-9]/.test(result)) { // Ensure it doesn't start with a number
    result = '_' + result;
  }
  return result;
};


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
      setLayoutDefinition(templateToEdit.layoutDefinition || ''); // Default to empty string if undefined
      setErrorLoading(null);
    } else {
      setErrorLoading(`Template with ID "${templateIdToEdit}" not found.`);
    }
    setIsLoadingPage(false);
  }, [templateIdToEdit, getTemplateById, templatesLoading]);

  // Effect to update sampleCardForPreview when fields or originalTemplateId/templateName change
  useEffect(() => {
    const currentTemplateIdForPreview = originalTemplateId || 'previewTemplateId';
    const generatedSampleCard: CardData = {
      id: 'preview-card',
      templateId: currentTemplateIdForPreview as CardTemplateId,
      // Sensible defaults for preview, especially for fields in the default layout
      name: 'Awesome Card Name',
      description: 'This is a sample description for the card preview. It can contain multiple lines and will be used to test the layout of text areas.',
      cost: 3,
      attack: 2,
      defense: 2,
      imageUrl: 'https://placehold.co/250x140.png', // Used by default layout's image element
      dataAiHint: 'card art sample',
      rarity: 'rare',
      effectText: 'Sample effect: Draw a card. This unit gets +1/+1 until end of turn. This text might be long to test scrolling in a textarea layout element.',
      flavorText: 'This is some italicized flavor text.',
      artworkUrl: 'https://placehold.co/280x400.png', // Used by default layout's backgroundImageField
      cardType: 'Creature - Goblin', // Used by default layout's type line
      // ... any other common fields you expect in a default layout
    };

    // Override with values from defined fields
    fields.forEach(fieldDef => {
      const key = fieldDef.key as keyof CardData;
       if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
        if (fieldDef.type === 'number') {
          (generatedSampleCard as any)[key] = Number(fieldDef.defaultValue);
        } else if (fieldDef.type === 'boolean') {
          (generatedSampleCard as any)[key] = String(fieldDef.defaultValue).toLowerCase() === 'true';
        } else {
          (generatedSampleCard as any)[key] = fieldDef.defaultValue;
        }
      } else {
         // If no default value, but the key is one of our common preview fields, ensure it's not overwritten by generic placeholders
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
       // Ensure specific known fields are correctly populated, especially image URLs
      if (['name', 'description', 'cost', 'attack', 'defense', 'imageUrl', 'dataAiHint', 'rarity', 'effectText', 'flavorText', 'artworkUrl', 'cardType'].includes(fieldDef.key)) {
        if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
            (generatedSampleCard as any)[key] = fieldDef.defaultValue;
             if((fieldDef.key === 'imageUrl' || fieldDef.key === 'artworkUrl') && typeof fieldDef.defaultValue === 'string' && !fieldDef.defaultValue.startsWith('http')) {
                (generatedSampleCard as any)[key] = `https://placehold.co/${fieldDef.key === 'imageUrl' ? '250x140' : '280x400'}.png`;
             }
        } else if(fieldDef.key === 'imageUrl' && !(generatedSampleCard as any)[key]) {
             (generatedSampleCard as any)[key] = 'https://placehold.co/250x140.png';
        } else if(fieldDef.key === 'artworkUrl' && !(generatedSampleCard as any)[key]) {
             (generatedSampleCard as any)[key] = 'https://placehold.co/280x400.png';
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

    const updatedTemplateData: CardTemplate = {
      id: originalTemplateId, 
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
      layoutDefinition: layoutDefinition.trim() ? layoutDefinition.trim() : undefined,
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
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Section */}
        <div className="lg:w-1/2 xl:w-3/5">
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
                Use the live preview on the right to test your layout JSON.
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
                  placeholder='Enter JSON for card layout, e.g., { "width": "280px", "elements": [...] }'
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
                        <li><code>backgroundImageField</code>: (Optional) Key of a data field (e.g., "artworkUrl") to use for the card's full background image. **This key must match one of your defined Data Field keys.**</li>
                      </ul>
                      <p className="font-semibold mb-1"><code>elements</code> array (each object defines one visual piece):</p>
                      <ul className="list-disc list-inside pl-2 space-y-0.5">
                        <li><code>fieldKey</code>: String that **must exactly match a 'Field Key'** from your "Data Fields" section above (e.g., if you have a field labeled "Card Title" with an auto-generated key "cardTitle", you would use <code>"cardTitle"</code> here).</li>
                        <li><code>type</code>: "text", "textarea", "image", or "iconValue".</li>
                        <li><code>style</code>: CSS-in-JS object (e.g., <code>{'{ "position": "absolute", "top": "10px", "fontSize": "1.2em" }'}</code>). Use camelCase for CSS properties (<code>fontSize</code> not <code>font-size</code>).</li>
                        <li><code>className</code>: (Optional) Tailwind CSS classes.</li>
                        <li><code>prefix</code>, <code>suffix</code>: (Optional, for "text", "iconValue") Text to add before/after the field's value.</li>
                        <li><code>icon</code>: (For "iconValue") Name of a Lucide icon (e.g., "Coins", "Sword"). **Ensure the icon exists in <code>lucide-react</code>.**</li>
                      </ul>
                       <p className="mt-2 italic">The live preview updates as you edit. Ensure your JSON is valid. Customize <code>fieldKey</code> values to match your defined data fields.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter>
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
                <p className="text-muted-foreground">Loading preview or define fields...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    
