
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { useToast } from '@/hooks/use-toast';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { TemplateField, CardTemplate } from '@/lib/card-templates';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
        key: def.key, // Key is critical and should be stable or carefully managed if regenerated
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

  if (words.length === 0) return '';

  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  let result = [firstWord, ...restWords].join('');
  
  if (!result) return 'untitledField';
  if (/^[0-9]/.test(result)) {
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);


  useEffect(() => {
    if (templatesLoading || !templateIdToEdit) {
      setIsLoadingPage(templatesLoading);
      return;
    }

    const templateToEdit = getTemplateById(templateIdToEdit);
    if (templateToEdit) {
      setOriginalTemplateId(templateToEdit.id as CardTemplateId); // Store the original, non-derived ID
      setTemplateName(templateToEdit.name);
      setFields(templateToEdit.fields.map(mapTemplateFieldToFieldDefinition));
      setErrorLoading(null);
    } else {
      setErrorLoading(`Template with ID "${templateIdToEdit}" not found.`);
    }
    setIsLoadingPage(false);
  }, [templateIdToEdit, getTemplateById, templatesLoading]);


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

    setIsSaving(true);

    const updatedTemplateData: CardTemplate = {
      id: originalTemplateId, // Use the original, immutable ID
      name: templateName.trim(),
      fields: fields.map(mapFieldDefinitionToTemplateField),
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
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Edit Template</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
            </Button>
          </div>
          <CardDescription>
            Modify the template's name and fields. The Template ID (<code>{originalTemplateId}</code>) cannot be changed.
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
             {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No fields added yet. Click "Add Field" to begin.
                </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveTemplate} 
            className="w-full md:w-auto" 
            disabled={isSaving || !templateName.trim() || fields.length === 0 || !originalTemplateId}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    