
"use client";

import type { CardData } from '@/lib/types';
import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NameGeneratorButton from './name-generator-button';
import type { CardTemplate, TemplateField } from '@/lib/card-templates'; // Using CardTemplate from lib
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext'; // Use TemplateContext

interface CardDataFormProps {
  cardData: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
  associatedTemplateIds: CardTemplateId[];
}

export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName, associatedTemplateIds }: CardDataFormProps) {
  const [formData, setFormData] = useState<CardData>(cardData);
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate | undefined>(undefined);
  const { getTemplateById, getAvailableTemplatesForSelect: getContextTemplatesForSelect, isLoading: templatesLoading } = useTemplates();

  useEffect(() => {
    if (templatesLoading) return;

    let effectiveTemplateId = cardData.templateId;
    if (!associatedTemplateIds.includes(cardData.templateId)) {
      effectiveTemplateId = associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic';
    }
    
    const initialFormData = { ...cardData, templateId: effectiveTemplateId };
    setFormData(initialFormData);
    setCurrentTemplate(getTemplateById(effectiveTemplateId));
  }, [cardData, associatedTemplateIds, getTemplateById, templatesLoading]);

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
    if (templatesLoading || !associatedTemplateIds.includes(newTemplateId)) {
      console.warn(`Attempted to switch to template ID "${newTemplateId}" which is not associated or templates are loading.`);
      return;
    }
    const newTemplate = getTemplateById(newTemplateId);
    if (!newTemplate) return;

    setCurrentTemplate(newTemplate);
    setFormData(prev => {
      const updatedFormData: Partial<CardData> = { };
      
      updatedFormData.id = prev.id;
      updatedFormData.name = prev.name || '';
      updatedFormData.description = prev.description || '';
      updatedFormData.imageUrl = prev.imageUrl;
      updatedFormData.dataAiHint = prev.dataAiHint;
      
      newTemplate.fields.forEach(field => {
        const key = field.key as keyof CardData;
        if (updatedFormData[key] === undefined && field.defaultValue !== undefined) {
          (updatedFormData as any)[field.key] = field.defaultValue;
        } else if (updatedFormData[key] === undefined) {
          (updatedFormData as any)[field.key] = undefined;
        }
      });

      return {
        ...(updatedFormData as CardData),
        templateId: newTemplateId,
      };
    });
  }, [associatedTemplateIds, getTemplateById, templatesLoading]);
  
  useEffect(() => {
    onUpdateCard(formData);
  }, [formData, onUpdateCard]);

  const availableTemplatesForProject = getContextTemplatesForSelect(associatedTemplateIds);
  
  const fieldsToRender: TemplateField[] = currentTemplate?.fields || [];
  const nameGenerationSourceText = formData.effectText || formData.flavorText || formData.description || '';

  if (templatesLoading) {
    return <p>Loading template definitions...</p>;
  }

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="templateId">Card Template</Label>
        <Select 
          value={formData.templateId} 
          onValueChange={(value) => handleTemplateChange(value as CardTemplateId)}
          disabled={availableTemplatesForProject.length <= 1}
        >
          <SelectTrigger id="templateId">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplatesForProject.map(template => (
              <SelectItem key={template.value} value={template.value}>{template.label}</SelectItem>
            ))}
            {availableTemplatesForProject.length === 0 && (
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
                value={value as number | string}
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
            {field.key !== 'name' && field.type === 'select' && field.options && (
              <Select
                value={String(value)}
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
