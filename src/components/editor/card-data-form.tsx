
"use client";

import type { CardData, CardTemplateId, NewCardTemplateIdPlaceholder } from '@/lib/types';
import { NEW_CARD_TEMPLATE_ID_PLACEHOLDER } from '@/lib/types';
import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NameGeneratorButton from './name-generator-button';
import type { CardTemplate, TemplateField } from '@/lib/card-templates'; 
import { useTemplates } from '@/contexts/TemplateContext';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CardDataFormProps {
  cardData: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
  associatedTemplateIds: CardTemplateId[];
}

// Helper function to generate placehold.co URL
function generatePlaceholderUrl(fieldConfig: TemplateField): string | undefined {
  if (fieldConfig.type !== 'placeholderImage') return undefined;

  const width = fieldConfig.placeholderConfigWidth || 250; 
  const height = fieldConfig.placeholderConfigHeight || 140; 
  let pathSegments = `${width}x${height}`;

  if (fieldConfig.placeholderConfigBgColor && fieldConfig.placeholderConfigBgColor.trim() !== '') {
    pathSegments += `/${fieldConfig.placeholderConfigBgColor.replace('#', '').trim()}`;
    if (fieldConfig.placeholderConfigTextColor && fieldConfig.placeholderConfigTextColor.trim() !== '') {
      pathSegments += `/${fieldConfig.placeholderConfigTextColor.replace('#', '').trim()}`;
    }
  }
  
  let fullUrl = `https://placehold.co/${pathSegments}.png`;

  if (fieldConfig.placeholderConfigText && fieldConfig.placeholderConfigText.trim() !== '') {
    fullUrl += `?text=${encodeURIComponent(fieldConfig.placeholderConfigText.trim())}`;
  }
  return fullUrl;
}


export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName, associatedTemplateIds }: CardDataFormProps) {
  const [formData, setFormData] = useState<CardData>(cardData);
  const { getTemplateById, getAvailableTemplatesForSelect: getContextTemplatesForSelect, isLoading: templatesLoading } = useTemplates();
  
  const [isTemplateFinalized, setIsTemplateFinalized] = useState(
    cardData.templateId !== NEW_CARD_TEMPLATE_ID_PLACEHOLDER
  );
  
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate | undefined>(() => {
    if (templatesLoading || cardData.templateId === NEW_CARD_TEMPLATE_ID_PLACEHOLDER) return undefined;
    
    let initialTemplateIdToUse = cardData.templateId as CardTemplateId;
    if (!associatedTemplateIds.includes(initialTemplateIdToUse) && associatedTemplateIds.length > 0) {
        initialTemplateIdToUse = associatedTemplateIds[0];
    } else if (!associatedTemplateIds.includes(initialTemplateIdToUse) && associatedTemplateIds.length === 0) {
        const genericTemplate = getTemplateById('generic');
        if (genericTemplate) initialTemplateIdToUse = 'generic';
        else return undefined;
    }
    return getTemplateById(initialTemplateIdToUse);
  });

  // Effect to initialize or re-initialize form when cardData.id (from key prop) changes
  useEffect(() => {
    setFormData(cardData);
    const newIsFinalized = cardData.templateId !== NEW_CARD_TEMPLATE_ID_PLACEHOLDER;
    setIsTemplateFinalized(newIsFinalized);

    if (templatesLoading) {
        setCurrentTemplate(undefined);
        return;
    }
    
    if (newIsFinalized) {
        let templateToUse = getTemplateById(cardData.templateId as CardTemplateId);
        // Fallback logic if current templateId isn't in associated or doesn't exist
        if (!templateToUse || (associatedTemplateIds.length > 0 && !associatedTemplateIds.includes(cardData.templateId as CardTemplateId))) {
            if (associatedTemplateIds.length > 0) {
                templateToUse = getTemplateById(associatedTemplateIds[0]);
            } else {
                templateToUse = getTemplateById('generic') || undefined; // Last resort generic
            }
        }
        setCurrentTemplate(templateToUse);

        // If template changed due to fallback, update formData's templateId
        if (templateToUse && templateToUse.id !== cardData.templateId) {
            setFormData(prev => ({...prev, templateId: templateToUse!.id as CardTemplateId}));
        }

    } else { // Not finalized, means it's a NEW_CARD_TEMPLATE_ID_PLACEHOLDER
        setCurrentTemplate(undefined); 
    }
  // cardData is the main prop triggering re-initialization due to key change
  // templatesLoading and getTemplateById for context readiness
  // associatedTemplateIds if project-level associations change while form is open (less common for *this* effect, but good for consistency)
  }, [cardData, templatesLoading, getTemplateById, associatedTemplateIds]);


  // Effect to propagate formData changes up to the parent
  useEffect(() => {
    // Only call onUpdateCard if the template is finalized AND formData differs from the original prop
    // This prevents loops when the parent re-renders with the same cardData after an update
    if (isTemplateFinalized && formData !== cardData) { 
      onUpdateCard(formData);
    }
  }, [formData, onUpdateCard, cardData, isTemplateFinalized]);


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

  const handleTemplateSelection = useCallback((newTemplateId: CardTemplateId) => {
    if (templatesLoading || !newTemplateId || newTemplateId === NEW_CARD_TEMPLATE_ID_PLACEHOLDER) return;

    const newSelectedTemplate = getTemplateById(newTemplateId);
    if (!newSelectedTemplate) {
      console.warn(`Template with ID ${newTemplateId} not found during selection.`);
      return;
    }
    
    setCurrentTemplate(newSelectedTemplate); 

    setFormData(prevExistingData => {
      const updatedFormData: Partial<CardData> = {
        id: prevExistingData.id, 
        name: prevExistingData.name || 'Untitled Card', 
        description: prevExistingData.description || '', 
        imageUrl: prevExistingData.imageUrl, // Keep existing imageUrl initially
        dataAiHint: prevExistingData.dataAiHint, // Keep existing hint
        templateId: newTemplateId, 
      };
      
      newSelectedTemplate.fields.forEach(field => {
        const key = field.key as keyof CardData;
        if (field.type === 'placeholderImage') {
          // Only set placeholder URL if the existing field value is empty or matches a generic placeholder
          const currentFieldValue = (prevExistingData as any)[key];
          const isGenericPlaceholder = typeof currentFieldValue === 'string' && currentFieldValue.startsWith('https://placehold.co/');
          if (!currentFieldValue || isGenericPlaceholder) {
            (updatedFormData as any)[key] = generatePlaceholderUrl(field) || '';
          } else {
            (updatedFormData as any)[key] = currentFieldValue; // Keep user's specific URL
          }
        } else if ((prevExistingData as any)[key] === undefined && field.defaultValue !== undefined) {
             (updatedFormData as any)[key] = field.defaultValue;
        } else if ((prevExistingData as any)[key] !== undefined) {
            // Preserve existing data if it's already there
            (updatedFormData as any)[key] = (prevExistingData as any)[key];
        } else {
            // If no existing data and no default, initialize based on type
            switch(field.type) {
                case 'text': (updatedFormData as any)[key] = ''; break;
                case 'textarea': (updatedFormData as any)[key] = ''; break;
                case 'number': (updatedFormData as any)[key] = undefined; break; // Or 0, depending on desired behavior
                case 'boolean': (updatedFormData as any)[key] = false; break;
                case 'select': (updatedFormData as any)[key] = field.options?.[0]?.value || ''; break;
                default: (updatedFormData as any)[key] = undefined;
            }
        }
      });
      return updatedFormData as CardData;
    });

    setIsTemplateFinalized(true); 
  }, [getTemplateById, templatesLoading]);
  
  const availableTemplatesForProject = getContextTemplatesForSelect(associatedTemplateIds);
  
  const fieldsToRender: TemplateField[] = isTemplateFinalized && currentTemplate ? currentTemplate.fields : [];
  const nameGenerationSourceText = formData.effectText || formData.flavorText || formData.description || '';

  if (templatesLoading && !currentTemplate && cardData.templateId !== NEW_CARD_TEMPLATE_ID_PLACEHOLDER && cardData.templateId !== undefined) { 
    return <p>Loading template definitions...</p>;
  }

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="templateId">Card Template</Label>
        <Select 
          value={formData.templateId === NEW_CARD_TEMPLATE_ID_PLACEHOLDER || formData.templateId === undefined ? '' : formData.templateId} 
          onValueChange={(value) => {
            if (value) handleTemplateSelection(value as CardTemplateId);
          }}
          disabled={isTemplateFinalized || availableTemplatesForProject.length === 0}
        >
          <SelectTrigger id="templateId">
            <SelectValue placeholder={isTemplateFinalized ? (currentTemplate?.name || "Template Finalized") : "Choose a template..."} />
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

      {!isTemplateFinalized && availableTemplatesForProject.length > 0 && (
         <Alert variant="default" className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary">Select a Template</AlertTitle>
            <AlertDescription className="text-primary/80">
              Please choose a card template from the dropdown above to begin editing this card. Once selected, the template cannot be changed for this card.
            </AlertDescription>
          </Alert>
      )}
       {!isTemplateFinalized && availableTemplatesForProject.length === 0 && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Templates Available</AlertTitle>
            <AlertDescription>
              There are no card templates associated with this project. Please go to "Template Library" &gt; "Manage Assignments" to associate templates with this project before adding cards.
            </AlertDescription>
          </Alert>
      )}


      {isTemplateFinalized && fieldsToRender.map(field => {
        const fieldKey = field.key as keyof CardData;
        let value = formData[fieldKey];
        if (value === undefined || value === null) {
            if (field.type === 'number') value = ''; 
            else if (field.type === 'boolean') value = false;
            else value = '';
        }

        const inputType = field.type === 'placeholderImage' ? 'text' : field.type;

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
            {field.key !== 'name' && inputType === 'textarea' && (
              <Textarea
                id={field.key}
                name={field.key}
                value={value as string}
                onChange={handleChange}
                placeholder={field.placeholder}
                rows={field.key === 'description' || field.key === 'flavorText' ? 3 : 5}
              />
            )}
            {field.key !== 'name' && (inputType === 'text' || inputType === 'placeholderImage') && (
              <Input
                id={field.key}
                name={field.key}
                type="text"
                value={value as string}
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
             {field.key !== 'name' && inputType === 'number' && (
              <Input
                id={field.key}
                name={field.key}
                type="number"
                value={String(value)} 
                onChange={handleChange}
                placeholder={field.placeholder}
              />
            )}
            {field.key !== 'name' && inputType === 'select' && field.options && (
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
             {field.key !== 'name' && inputType === 'boolean' && (
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
