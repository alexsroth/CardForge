
// src/app/templates/new/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate } from '@/lib/card-templates'; // Assuming CardTemplate type is here
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


export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { addTemplate: saveTemplateToContext, templates: existingTemplates } = useTemplates();
  const router = useRouter();

  const handleAddField = () => {
    setFields([
      ...fields,
      { 
        key: `field${fields.length + 1}`, 
        label: `New Field ${fields.length + 1}`, 
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

  const handleFieldChange = (index: number, updatedField: TemplateFieldDefinition) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const handleSaveTemplate = async () => {
    if (!templateId.trim() || !templateName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a Template ID and Template Name.",
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

    if (existingTemplates.some(t => t.id === templateId.trim())) {
        toast({
            title: "Duplicate ID",
            description: `A template with ID '${templateId.trim()}' already exists. Please choose a unique ID.`,
            variant: "destructive",
        });
        return;
    }

    setIsSaving(true);

    const newTemplate: CardTemplate = {
      id: templateId.trim() as any, // Cast as any for now, should align with CardTemplateId type later
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
    };

    const result = await saveTemplateToContext(newTemplate);

    if (result.success) {
      toast({
        title: "Template Saved!",
        description: result.message + " It's now available in your current browser session.",
        variant: "default",
        duration: 7000,
      });
      // Optionally clear the form or redirect to the library
      setTemplateId('');
      setTemplateName('');
      setFields([]);
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
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
          <CardDescription>
            Define the structure for a new card template. Templates are saved to your browser's local storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateId">Template ID (programmatic, e.g., 'heroUnit')</Label>
              <Input
                id="templateId"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value.replace(/\s+/g, ''))}
                placeholder="heroUnit"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="templateName">Template Name (display, e.g., 'Hero Unit Card')</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Hero Unit Card"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fields</h3>
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
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTemplate} className="w-full md:w-auto" disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Template
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
