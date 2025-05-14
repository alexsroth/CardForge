// src/app/templates/new/page.tsx
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, ClipboardCopy, AlertTriangle, CheckCircle } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { generateTemplateCode, generateTemplateObjectString } from '@/lib/template-code-helpers';
import { useToast } from '@/hooks/use-toast';
import { saveTemplateDefinitionAction } from '@/app/actions';

export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

    setIsSaving(true);
    setShowManualInstructions(false);
    setGeneratedCode('');

    const result = await saveTemplateDefinitionAction(templateId, templateName, fields);

    if (result.success) {
      toast({
        title: "Template Saved!",
        description: (
            <div>
                <p>{result.message}</p>
                <p className="font-semibold mt-2">Important: A server restart may be required for changes to fully apply.</p>
            </div>
        ),
        variant: "default",
        duration: 10000, // Keep toast longer
      });
      // Optionally clear the form or redirect
      // setTemplateId('');
      // setTemplateName('');
      // setFields([]);
    } else {
      toast({
        title: "Save Failed",
        description: (
            <div>
                <p>{result.message}</p>
                <p className="mt-2">The generated code is available below for manual addition.</p>
            </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
      if (result.generatedCode) {
        // Fallback to showing generated code for manual copy
        const fullGeneratedCode = generateTemplateCode(templateId, templateName, fields, result.generatedCode);
        setGeneratedCode(fullGeneratedCode);
        setShowManualInstructions(true);
      } else {
        // Fallback if even object string generation failed (should be rare)
        const justObjectString = generateTemplateObjectString(templateId, templateName, fields);
        const fullGeneratedCode = generateTemplateCode(templateId, templateName, fields, justObjectString);
        setGeneratedCode(fullGeneratedCode);
        setShowManualInstructions(true);
      }
    }
    setIsSaving(false);
  };
  
  const handleCopyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          toast({ title: "Copied!", description: "Template code copied to clipboard." });
        })
        .catch(err => {
          toast({ title: "Error", description: "Could not copy code to clipboard.", variant: "destructive" });
          console.error('Failed to copy: ', err);
        });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Template Designer</CardTitle>
          <CardDescription>
            Define the structure for a new card template. Saving will attempt to update 
            <code> src/lib/card-templates.ts</code> directly.
            <br />
            <span className="text-destructive font-medium">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              A server restart may be required after saving for changes to fully apply in the editor.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateId">Template ID (programmatic, e.g., 'heroUnit')</Label>
              <Input
                id="templateId"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value.replace(/\s+/g, ''))} // Prevent spaces
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
                key={index} // Consider more stable keys if fields can be reordered
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

          {generatedCode && showManualInstructions && (
            <div className="space-y-2 p-4 border border-destructive/50 rounded-md bg-destructive/5">
              <h3 className="text-lg font-semibold text-destructive flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" /> Manual Action Required
              </h3>
              <p className="text-sm text-destructive-foreground">
                Automatic saving failed. Please copy the code below and manually add it to 
                <code> src/lib/card-templates.ts</code>.
              </p>
              <div className="relative mt-2">
                <Textarea
                  value={generatedCode}
                  readOnly
                  rows={15}
                  className="font-mono text-xs bg-muted/30 border-destructive/30"
                  aria-label="Generated template code for manual addition"
                />
                <Button
                  onClick={handleCopyToClipboard}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  aria-label="Copy code to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTemplate} className="w-full md:w-auto" disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Template to File
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
