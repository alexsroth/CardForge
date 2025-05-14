// src/components/template-designer/field-row.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  optionsString?: string; // Comma-separated value:label pairs, e.g., "val1:Label 1,val2:Label 2"
}

interface FieldRowProps {
  field: TemplateFieldDefinition;
  onChange: (updatedField: TemplateFieldDefinition) => void;
  onRemove: () => void;
}

export default function FieldRow({ field, onChange, onRemove }: FieldRowProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      processedValue = e.target.checked;
    } else if (field.type === 'number') {
      processedValue = value === '' ? '' : Number(value)
    }
    onChange({ ...field, [name]: processedValue });
  };

  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...field, [name]: value });
  };

  return (
    <div className="p-4 border rounded-md space-y-3 bg-card shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
        <div>
          <Label htmlFor={`field-key-${field.key}`}>Field Key (Programmatic)</Label>
          <Input
            id={`field-key-${field.key}`}
            name="key"
            value={field.key}
            onChange={handleInputChange}
            placeholder="e.g., cardTitle"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`field-label-${field.key}`}>Field Label (Display)</Label>
          <Input
            id={`field-label-${field.key}`}
            name="label"
            value={field.label}
            onChange={handleInputChange}
            placeholder="e.g., Card Title"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`field-type-${field.key}`}>Field Type</Label>
          <Select
            name="type"
            value={field.type}
            onValueChange={(value) => handleSelectChange('type', value)}
          >
            <SelectTrigger id={`field-type-${field.key}`} className="text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean (Checkbox)</SelectItem>
              <SelectItem value="select">Select (Dropdown)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div>
          <Label htmlFor={`field-placeholder-${field.key}`}>Placeholder</Label>
          <Input
            id={`field-placeholder-${field.key}`}
            name="placeholder"
            value={field.placeholder || ''}
            onChange={handleInputChange}
            className="text-sm"
          />
        </div>
        {field.type === 'boolean' ? (
          <div className="flex items-center space-x-2 pt-7">
            <Input
              type="checkbox"
              id={`field-defaultValue-bool-${field.key}`}
              name="defaultValue"
              checked={field.defaultValue === true || field.defaultValue === 'true'}
              onChange={(e) => onChange({...field, defaultValue: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor={`field-defaultValue-bool-${field.key}`} className="font-normal">
              Default to checked?
            </Label>
          </div>
        ) : (
          <div>
            <Label htmlFor={`field-defaultValue-${field.key}`}>Default Value</Label>
            <Input
              id={`field-defaultValue-${field.key}`}
              name="defaultValue"
              type={field.type === 'number' ? 'number' : 'text'}
              value={field.defaultValue === undefined ? '' : String(field.defaultValue)}
              onChange={handleInputChange}
              className="text-sm"
            />
          </div>
        )}
      </div>


      {field.type === 'select' && (
        <div>
          <Label htmlFor={`field-options-${field.key}`}>Options (comma-separated value:label pairs)</Label>
          <Textarea
            id={`field-options-${field.key}`}
            name="optionsString"
            value={field.optionsString || ''}
            onChange={handleInputChange}
            placeholder="e.g., common:Common,uncommon:Uncommon,rare:Rare"
            className="text-sm"
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">Example: <code>opt1:Option 1,opt2:Option 2</code></p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onRemove} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1 h-4 w-4" /> Remove Field
        </Button>
      </div>
    </div>
  );
}
