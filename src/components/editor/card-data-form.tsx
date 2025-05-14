
"use client";

import type { CardData } from '@/lib/types';
import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NameGeneratorButton from './name-generator-button';
import type { CardTemplate, TemplateField } from '@/lib/card-templates'; 
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';

interface CardDataFormProps {
  cardData: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
  associatedTemplateIds: CardTemplateId[];
}

export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName, associatedTemplateIds }: CardDataFormProps) {
  // Initialize formData from cardData prop. This happens on mount/remount (due to key change on CardDetailPanel).
  const [formData, setFormData] = useState<CardData>(cardData);
  const { getTemplateById, getAvailableTemplatesForSelect: getContextTemplatesForSelect, isLoading: templatesLoading } = useTemplates();

  // Initialize currentTemplate based on the initial formData.
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate | undefined>(() => {
    if (templatesLoading) return undefined;
    let initialId = formData.templateId; // Use formData's templateId for initialization
    if (!associatedTemplateIds.includes(initialId)) {
        initialId = associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic';
    }
    return getTemplateById(initialId);
  });

  // Effect to react to changes in project's associated templates or if templates finish loading.
  // This ensures the form's current template is valid and currentTemplate state is updated.
  useEffect(() => {
    if (templatesLoading) {
      setCurrentTemplate(undefined); // Clear template if templates are loading
      return;
    }

    let currentFormTemplateId = formData.templateId;
    let newEffectiveTemplateId = currentFormTemplateId;
    let needsFormUpdateForTemplateSwitch = false;

    if (!associatedTemplateIds.includes(currentFormTemplateId)) {
        newEffectiveTemplateId = associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic';
        needsFormUpdateForTemplateSwitch = true;
    }
    
    const newTemplateDefinition = getTemplateById(newEffectiveTemplateId);
    setCurrentTemplate(newTemplateDefinition);

    if (needsFormUpdateForTemplateSwitch) {
        // If the templateId in formData became invalid, update it and apply new template defaults.
        setFormData(prev => {
            const updatedData: Partial<CardData> = { ...prev, templateId: newEffectiveTemplateId };
            if (newTemplateDefinition) {
                newTemplateDefinition.fields.forEach(field => {
                    const key = field.key as keyof CardData;
                    // Apply default from new template ONLY if the field doesn't exist or is undefined in current form data.
                    if ((updatedData as any)[key] === undefined && field.defaultValue !== undefined) {
                         (updatedData as any)[key] = field.defaultValue;
                    }
                });
            }
            return updatedData as CardData;
        });
    }
  }, [formData.templateId, associatedTemplateIds, getTemplateById, templatesLoading, setFormData]); // setFormData added as it's used

  // This effect calls onUpdateCard when formData changes. This is generally fine.
  useEffect(() => {
    // Only call onUpdateCard if formData is not identical to cardData prop
    // This is a shallow comparison, might not be perfect but helps prevent initial redundant update.
    if (formData !== cardData) { 
      onUpdateCard(formData);
    }
  }, [formData, onUpdateCard, cardData]);


  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // currentTemplate might be stale here due to closure if not in deps, but it's used for field type lookup
    const fieldDefinition = currentTemplate?.fields.find(f => f.key === name);
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldDefinition?.type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
  }, [currentTemplate]); // Include currentTemplate if its fields are used to process value
  
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

    setCurrentTemplate(newTemplate); // Update current template state

    // Rebuild formData: preserve common fields, apply new template defaults for missing fields.
    setFormData(prevExistingData => {
      const updatedFormData: Partial<CardData> = { };
      
      // Preserve essential and common fields from previous data state
      updatedFormData.id = prevExistingData.id;
      updatedFormData.name = prevExistingData.name || '';
      updatedFormData.description = prevExistingData.description || '';
      updatedFormData.imageUrl = prevExistingData.imageUrl;
      updatedFormData.dataAiHint = prevExistingData.dataAiHint;
      
      // Apply fields from the new template, using defaults if value not in prevExistingData
      newTemplate.fields.forEach(field => {
        const key = field.key as keyof CardData;
        if ((prevExistingData as any)[key] !== undefined) {
          (updatedFormData as any)[key] = (prevExistingData as any)[key];
        } else if (field.defaultValue !== undefined) {
          (updatedFormData as any)[field.key] = field.defaultValue;
        } else {
          // Field exists in new template, but no prior value and no default.
          // Set to a sensible blank based on type, or undefined.
           switch(field.type) {
            case 'text': (updatedFormData as any)[key] = ''; break;
            case 'textarea': (updatedFormData as any)[key] = ''; break;
            case 'number': (updatedFormData as any)[key] = undefined; break; // Or 0 if preferred
            case 'boolean': (updatedFormData as any)[key] = false; break;
            case 'select': (updatedFormData as any)[key] = field.options?.[0]?.value || ''; break;
            default: (updatedFormData as any)[key] = undefined;
          }
        }
      });

      return {
        ...(updatedFormData as CardData),
        templateId: newTemplateId, // Set the new template ID
      };
    });
  }, [associatedTemplateIds, getTemplateById, templatesLoading]);
  
  const availableTemplatesForProject = getContextTemplatesForSelect(associatedTemplateIds);
  
  const fieldsToRender: TemplateField[] = currentTemplate?.fields || [];
  const nameGenerationSourceText = formData.effectText || formData.flavorText || formData.description || '';

  if (templatesLoading && !currentTemplate) { // Show loading only if currentTemplate isn't set yet
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
              <div className="p-2 text-sm text-muted-foreground">No templates associated with this project. Check "Manage Assignments".</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {fieldsToRender.map(field => {
        const fieldKey = field.key as keyof CardData;
        // Ensure value is appropriately blank if undefined, especially for controlled inputs
        let value = formData[fieldKey];
        if (value === undefined || value === null) {
            if (field.type === 'number') value = ''; // Render numbers as empty string if undefined
            else if (field.type === 'boolean') value = false;
            else value = '';
        }


        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.key === 'name' && (
              <div className="flex items-center gap-2">
                <Input
                  id={field.key}
                  name={field.key}
                  type="text" 
                  value={value as string} 
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
                value={value as string} // Input type number handles string conversion
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
