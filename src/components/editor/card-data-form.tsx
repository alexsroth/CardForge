
"use client";

import type { CardData } from '@/lib/types';
import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NameGeneratorButton from './name-generator-button';
import { getTemplateById, getAvailableTemplatesForSelect, type CardTemplate, type TemplateField, type CardTemplateId } from '@/lib/card-templates';

interface CardDataFormProps {
  cardData: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
  associatedTemplateIds: CardTemplateId[]; // Added prop
}

export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName, associatedTemplateIds }: CardDataFormProps) {
  const [formData, setFormData] = useState<CardData>(cardData);
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate | undefined>(undefined);

  useEffect(() => {
    // Ensure the card's current templateId is valid for this project, or default if not.
    // This is important if a card is loaded with a templateId not in associatedTemplateIds.
    let effectiveTemplateId = cardData.templateId;
    if (!associatedTemplateIds.includes(cardData.templateId)) {
      effectiveTemplateId = associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic';
    }
    
    const initialFormData = { ...cardData, templateId: effectiveTemplateId };
    setFormData(initialFormData);
    setCurrentTemplate(getTemplateById(effectiveTemplateId));
  }, [cardData, associatedTemplateIds]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldDefinition = currentTemplate?.fields.find(f => f.key === name);
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldDefinition?.type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
  }, [currentTemplate]);
  
  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleTemplateChange = useCallback((newTemplateId: CardTemplateId) => {
    if (!associatedTemplateIds.includes(newTemplateId)) {
      // This should not happen if the dropdown is correctly filtered, but as a safeguard:
      console.warn(`Attempted to switch to template ID "${newTemplateId}" which is not associated with this project.`);
      return;
    }
    const newTemplate = getTemplateById(newTemplateId);
    if (!newTemplate) return;

    setCurrentTemplate(newTemplate);
    setFormData(prev => {
      const updatedFormData: Partial<CardData> = { }; // Start fresh for template-specific fields
      
      // Preserve essential universal fields
      updatedFormData.id = prev.id;
      updatedFormData.name = prev.name || '';
      updatedFormData.description = prev.description || ''; // Keep if it exists, useful for generic description
      updatedFormData.imageUrl = prev.imageUrl;
      updatedFormData.dataAiHint = prev.dataAiHint;
      
      // Apply default values from the new template for its specific fields
      newTemplate.fields.forEach(field => {
        // Only set default if field is not one of the preserved universal ones above,
        // or if the preserved value is undefined/empty for that key.
        const key = field.key as keyof CardData;
        if (updatedFormData[key] === undefined && field.defaultValue !== undefined) {
          (updatedFormData as any)[field.key] = field.defaultValue;
        } else if (updatedFormData[key] === undefined) {
           // Ensure all fields from the new template exist on formData, even if undefined
          (updatedFormData as any)[field.key] = undefined;
        }
      });

      return {
        ...(updatedFormData as CardData), // Cast back to CardData
        templateId: newTemplateId,
      };
    });
  }, [associatedTemplateIds]); // Ensure handleTemplateChange updates if associatedTemplateIds change
  
  useEffect(() => {
    onUpdateCard(formData);
  }, [formData, onUpdateCard]);

  // Filter available templates based on the project's associations
  const availableTemplates = getAvailableTemplatesForSelect(associatedTemplateIds);
  
  const fieldsToRender = currentTemplate?.fields || [];
  const nameGenerationSourceText = formData.effectText || formData.flavorText || formData.description || '';

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="templateId">Card Template</Label>
        <Select 
          value={formData.templateId} 
          onValueChange={(value) => handleTemplateChange(value as CardTemplateId)}
          disabled={availableTemplates.length <= 1} // Disable if only one or no templates available
        >
          <SelectTrigger id="templateId">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map(template => (
              <SelectItem key={template.value} value={template.value}>{template.label}</SelectItem>
            ))}
            {availableTemplates.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">No templates associated with this project.</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {fieldsToRender.map(field => {
        const fieldKey = field.key as keyof CardData;
        const value = formData[fieldKey] ?? field.defaultValue ?? '';

        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.key === 'name' && (
              <div className="flex items-center gap-2">
                <Input
                  id={field.key}
                  name={field.key}
                  type="text" 
                  value={value as string | number} 
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="flex-grow"
                />
                <NameGeneratorButton
                  currentDescription={nameGenerationSourceText}
                  onGenerateName={onGenerateName}
                  isLoading={isGeneratingName}
                  onNameGenerated={(newName) => setFormData(prev => ({...prev, name: newName}))}
                />
              </div>
            )}
            {field.key !== 'name' && field.type === 'textarea' && (
              <Textarea
                id={field.key}
                name={field.key}
                value={value as string}
                onChange={handleChange}
                placeholder={field.placeholder}
                rows={field.key === 'description' || field.key === 'flavorText' ? 3 : 5}
              />
            )}
            {field.key !== 'name' && field.type === 'text' && (
              <Input
                id={field.key}
                name={field.key}
                type="text"
                value={value as string}
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
             {field.key !== 'name' && field.type === 'number' && (
              <Input
                id={field.key}
                name={field.key}
                type="number"
                value={value as number | string} // Allow string for empty input
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
            {field.key !== 'name' && field.type === 'select' && field.options && (
              <Select
                value={String(value)} // Ensure value is string for Select
                onValueChange={(selectValue) => handleSelectChange(field.key, selectValue)}
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
             {field.key !== 'name' && field.type === 'boolean' && (
              <div className="flex items-center space-x-2 mt-2">
                 <Input
                    type="checkbox"
                    id={field.key}
                    name={field.key}
                    checked={value as boolean}
                    onChange={(e) => setFormData(prev => ({...prev, [field.key]: (e.target as HTMLInputElement).checked }))}
                    className="h-4 w-4"
                  />
                <Label htmlFor={field.key} className="font-normal">
                  {field.placeholder || field.label} 
                </Label>
              </div>
            )}
          </div>
        )
      })}
    </form>
  );
}
