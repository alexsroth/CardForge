// src/app/templates/new/page.tsx
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, ClipboardCopy } from 'lucide-react';
import FieldRow, { type TemplateFieldDefinition } from '@/components/template-designer/field-row';
import { generateTemplateCode } from '@/lib/template-code-helpers';
import { useToast } from '@/hooks/use-toast';

export default function TemplateDesignerPage() {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [generatedCode, setGeneratedCode] = useState('');
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

  const handleGenerateCode = () => {
    if (!templateId.trim() || !templateName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a Template ID and Template Name.",
        variant: "destructive",
      });
      return;
    }
    const code = generateTemplateCode(templateId, templateName, fields);
    setGeneratedCode(code);
    toast({
      title: "Code Generated",
      description: "Template code is ready to be copied.",
    });
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
            Define the structure for a new card template. After generating the code,
            copy it into <code>src/lib/card-templates.ts</code> and update the <code>CARD_TEMPLATE_IDS</code> array.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateId">Template ID (programmatic, e.g., 'heroUnit')</Label>
              <Input
                id="templateId"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                placeholder="heroUnit"
              />
            </div>
            <div>
              <Label htmlFor="templateName">Template Name (display, e.g., 'Hero Unit Card')</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Hero Unit Card"
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
              />
            ))}
            <Button onClick={handleAddField} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>

          {generatedCode && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Generated Template Code</h3>
              <div className="relative">
                <Textarea
                  value={generatedCode}
                  readOnly
                  rows={15}
                  className="font-mono text-xs bg-muted/50"
                  aria-label="Generated template code"
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
              <p className="text-sm text-muted-foreground">
                Remember to add <code>'{templateId}'</code> to the <code>CARD_TEMPLATE_IDS</code> array in <code>src/lib/card-templates.ts</code>.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateCode} className="w-full md:w-auto">Generate Template Code</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
