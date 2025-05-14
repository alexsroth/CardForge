
// src/app/templates/new/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Loader2, Eye } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate, CardTemplateId } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { useRouter } from 'next/navigation';

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


export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [layoutDefinition, setLayoutDefinition] = useState<string>(''); 
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
      name: 'Sample Card Name',
      description: 'This is a sample description for the card preview. It can contain multiple lines and will be used to test the layout of text areas.',
      cost: 5,
      attack: 3,
      defense: 4,
      imageUrl: 'https://placehold.co/280x180.png',
      dataAiHint: 'card art sample',
      rarity: 'rare',
      effectText: 'Sample effect text: Draw a card, then discard a card.',
      flavorText: 'This is some italicized flavor text.',
    };

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
        // Sensible defaults if no explicit default value
        if (!Object.prototype.hasOwnProperty.call(generatedSampleCard, key)) {
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
      // Ensure specific known fields in generatedSampleCard are updated if also in template fields
      if (['name', 'description', 'cost', 'attack', 'defense', 'imageUrl', 'dataAiHint', 'rarity', 'effectText', 'flavorText'].includes(fieldDef.key)) {
        if (fieldDef.defaultValue !== undefined && fieldDef.defaultValue !== '') {
            (generatedSampleCard as any)[key] = fieldDef.defaultValue;
             if(fieldDef.key === 'imageUrl' && typeof fieldDef.defaultValue === 'string' && !fieldDef.defaultValue.startsWith('http')) {
                (generatedSampleCard as any)[key] = 'https://placehold.co/280x180.png'; // Fallback for invalid image default
             }
        } else if(fieldDef.key === 'imageUrl') {
             (generatedSampleCard as any)[key] = 'https://placehold.co/280x180.png';
        }
      }
    });
    setSampleCardForPreview(generatedSampleCard);
  }, [fields, templateId, templateName]); // Added templateName to dependencies

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
      // Clear form only on successful save and redirection
      // setTemplateId('');
      // setTemplateName('');
      // setFields([]);
      // setLayoutDefinition('');
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
                  placeholder='Enter JSON for card layout, e.g., { "width": "280px", "elements": [...] }'
                  rows={10}
                  className="font-mono text-xs"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Define visual elements like background, text blocks, images, and their styles/positions.
                  Refer to documentation for the expected JSON structure. Changes reflect in the live preview.
                </p>
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

    