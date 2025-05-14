
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
}

export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName }: CardDataFormProps) {
  const [formData, setFormData] = useState<CardData>(cardData);
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate | undefined>(undefined);

  useEffect(() => {
    setFormData(cardData);
    setCurrentTemplate(getTemplateById(cardData.templateId));
  }, [cardData]);

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
    const newTemplate = getTemplateById(newTemplateId);
    if (!newTemplate) return;

    setCurrentTemplate(newTemplate);
    setFormData(prev => {
      const updatedFormData: Partial<CardData> = { ...prev };
      
      // Apply default values from the new template
      newTemplate.fields.forEach(field => {
        if (field.defaultValue !== undefined && updatedFormData[field.key as keyof CardData] === undefined) {
          (updatedFormData as any)[field.key] = field.defaultValue;
        }
      });

      // Preserve essential fields if they exist, or set them if not
      updatedFormData.id = prev.id;
      updatedFormData.name = prev.name || ''; // Ensure name is preserved or empty string
      updatedFormData.description = prev.description || ''; // Ensure description is preserved or empty string

      return {
        ...(updatedFormData as CardData), // Cast back to CardData
        templateId: newTemplateId,
      };
    });
  }, []);
  
  useEffect(() => {
    onUpdateCard(formData);
  }, [formData, onUpdateCard]);

  const availableTemplates = getAvailableTemplatesForSelect();
  const fieldsToRender = currentTemplate?.fields || [];
  
  const nameGenerationSourceText = formData.effectText || formData.flavorText || formData.description || '';

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="templateId">Card Template</Label>
        <Select 
          value={formData.templateId} 
          onValueChange={(value) => handleTemplateChange(value as CardTemplateId)}
        >
          <SelectTrigger id="templateId">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map(template => (
              <SelectItem key={template.value} value={template.value}>{template.label}</SelectItem>
            ))}
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
                  type="text" // Name is always text
                  value={value as string | number} // Keep as is for controlled input
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
                value={value as number}
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
            {field.key !== 'name' && field.type === 'select' && field.options && (
              <Select
                value={value as string}
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
                    onChange={(e) => setFormData(prev => ({...prev, [field.key]: e.target.checked }))}
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
