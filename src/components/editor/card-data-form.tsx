"use client";

import type { CardData, CardTemplateId, TemplateFieldDefinition } from '@/lib/types';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NameGeneratorButton from './name-generator-button';

// Define field configurations for each template
// This could be moved to a more centralized config if it grows large
const templateFieldsConfig: Record<CardTemplateId, TemplateFieldDefinition[]> = {
  generic: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
  ],
  creature: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description (Flavor Text)', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'attack', label: 'Attack', type: 'number' },
    { key: 'defense', label: 'Defense', type: 'number' },
    { key: 'effectText', label: 'Effect Text', type: 'textarea' },
    { key: 'rarity', label: 'Rarity', type: 'select', options: [
        {value: 'common', label: 'Common'}, {value: 'uncommon', label: 'Uncommon'},
        {value: 'rare', label: 'Rare'}, {value: 'mythic', label: 'Mythic'}
      ]
    },
  ],
  spell: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description (Flavor Text)', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'effectText', label: 'Effect Text', type: 'textarea' },
    { key: 'rarity', label: 'Rarity', type: 'select', options: [
        {value: 'common', label: 'Common'}, {value: 'uncommon', label: 'Uncommon'},
        {value: 'rare', label: 'Rare'}, {value: 'mythic', label: 'Mythic'}
      ]
    },
  ],
  item: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description (Flavor Text)', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'effectText', label: 'Effect Text', type: 'textarea' },
     { key: 'rarity', label: 'Rarity', type: 'select', options: [
        {value: 'common', label: 'Common'}, {value: 'uncommon', label: 'Uncommon'},
        {value: 'rare', label: 'Rare'}, {value: 'mythic', label: 'Mythic'}
      ]
    },
  ],
};


interface CardDataFormProps {
  cardData: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
}

export default function CardDataForm({ cardData, onUpdateCard, onGenerateName, isGeneratingName }: CardDataFormProps) {
  const [formData, setFormData] = useState<CardData>(cardData);

  useEffect(() => {
    setFormData(cardData);
  }, [cardData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldType = (templateFieldsConfig[formData.templateId] || templateFieldsConfig.generic).find(f => f.key === name)?.type;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldType === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemplateChange = (newTemplateId: CardTemplateId) => {
    setFormData(prev => ({
      ...prev,
      templateId: newTemplateId,
      // Optionally, clear or migrate fields when template changes
    }));
  };
  
  // Debounced update or on blur/submit to avoid too many re-renders if typing fast
  // For simplicity, we'll update on every change for now.
  useEffect(() => {
    onUpdateCard(formData);
  }, [formData, onUpdateCard]);

  const fieldsToRender = templateFieldsConfig[formData.templateId] || templateFieldsConfig.generic;

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="templateId">Card Template</Label>
        <Select value={formData.templateId} onValueChange={(value: CardTemplateId) => handleTemplateChange(value)}>
          <SelectTrigger id="templateId">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="generic">Generic</SelectItem>
            <SelectItem value="creature">Creature</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
            <SelectItem value="item">Item</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fieldsToRender.map(field => {
        // Skip templateId as it's handled by the Select above
        if (field.key === 'templateId') return null;
        
        const value = formData[field.key as keyof CardData] ?? '';

        return (
          <div key={field.key as string}>
            <Label htmlFor={field.key as string}>{field.label}</Label>
            {field.key === 'name' && (
              <div className="flex items-center gap-2">
                <Input
                  id={field.key as string}
                  name={field.key as string}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={value as string | number}
                  onChange={handleChange}
                  className="flex-grow"
                />
                <NameGeneratorButton
                  currentDescription={formData.description}
                  onGenerateName={onGenerateName}
                  isLoading={isGeneratingName}
                  onNameGenerated={(newName) => setFormData(prev => ({...prev, name: newName}))}
                />
              </div>
            )}
            {field.key !== 'name' && field.type === 'textarea' && (
              <Textarea
                id={field.key as string}
                name={field.key as string}
                value={value as string}
                onChange={handleChange}
                rows={field.key === 'description' ? 3 : 5}
              />
            )}
            {field.key !== 'name' && field.type === 'text' && (
              <Input
                id={field.key as string}
                name={field.key as string}
                type="text"
                value={value as string}
                onChange={handleChange}
              />
            )}
             {field.key !== 'name' && field.type === 'number' && (
              <Input
                id={field.key as string}
                name={field.key as string}
                type="number"
                value={value as number}
                onChange={handleChange}
              />
            )}
            {field.key !== 'name' && field.type === 'select' && field.options && (
              <Select
                value={value as string}
                onValueChange={(selectValue) => handleSelectChange(field.key as string, selectValue)}
              >
                <SelectTrigger id={field.key as string}>
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )
      })}
    </form>
  );
}
