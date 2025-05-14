
// src/components/template-designer/field-row.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';

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
  isSaving?: boolean;
}

export default function FieldRow({ field, onChange, onRemove, isSaving }: FieldRowProps) {
  
  const handleGenericChange = (name: keyof TemplateFieldDefinition, value: any) => {
    onChange({ ...field, [name]: value });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement; // type assertion for checkbox
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = e.target.checked;
    } else if (field.type === 'number') {
      processedValue = value === '' ? '' : (isNaN(Number(value)) ? field.defaultValue || '' : Number(value));
    }
    handleGenericChange(name as keyof TemplateFieldDefinition, processedValue);
  };

  const handleSelectChange = (name: keyof TemplateFieldDefinition, value: string) => {
    handleGenericChange(name, value);
  };

  return (
    <div className="p-3 border rounded-md bg-card shadow-sm space-y-2">
      {/* Main Info Row */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex-grow min-w-[200px] basis-full sm:basis-auto">
          <Label htmlFor={`field-label-${field.key}`} className="text-sm font-medium">Field Label</Label>
          <Input
            id={`field-label-${field.key}`}
            name="label"
            value={field.label}
            onChange={handleInputChange}
            placeholder="e.g., Card Title"
            className="h-9 text-sm"
            disabled={isSaving}
          />
        </div>
        <div className="flex-grow min-w-[150px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-48">
          <Label htmlFor={`field-key-${field.key}`} className="text-sm font-medium">Field Key</Label>
          <Input
            id={`field-key-${field.key}`}
            name="key"
            value={field.key}
            readOnly
            className="h-9 text-sm bg-muted/50"
            disabled={isSaving}
          />
        </div>
        <div className="flex-grow min-w-[120px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-40">
          <Label htmlFor={`field-type-${field.key}`} className="text-sm font-medium">Field Type</Label>
          <Select
            name="type"
            value={field.type}
            onValueChange={(value) => handleSelectChange('type', value)}
            disabled={isSaving}
          >
            <SelectTrigger id={`field-type-${field.key}`} className="h-9 text-sm">
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
        <Button 
          onClick={onRemove} 
          variant="ghost" 
          size="icon" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 shrink-0" 
          disabled={isSaving}
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary Info Section - always visible but more compact */}
      <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pt-2 mt-1",
          (field.type === 'select' || field.type === 'boolean' || field.placeholder || field.defaultValue) && "border-t border-dashed"
        )}
      >
        {(field.type !== 'boolean' || field.placeholder) && // Show placeholder for all except boolean unless it also has a default val
          <div className={cn(field.type === 'boolean' && "sm:col-span-1")}>
            <Label htmlFor={`field-placeholder-${field.key}`} className="text-xs text-muted-foreground">Placeholder</Label>
            <Input
              id={`field-placeholder-${field.key}`}
              name="placeholder"
              value={field.placeholder || ''}
              onChange={handleInputChange}
              className="h-8 text-xs"
              disabled={isSaving}
            />
          </div>
        }

        {field.type === 'boolean' ? (
          <div className="flex items-center space-x-2 self-end pb-1 min-h-[2rem] mt-3 sm:mt-0"> {/* Ensure it aligns well */}
            <Input
              type="checkbox"
              id={`field-defaultValue-bool-${field.key}`}
              name="defaultValue"
              checked={field.defaultValue === true || String(field.defaultValue).toLowerCase() === 'true'}
              onChange={handleInputChange}
              className="h-4 w-4"
              disabled={isSaving}
            />
            <Label htmlFor={`field-defaultValue-bool-${field.key}`} className="font-normal text-xs text-muted-foreground">
              Default to checked?
            </Label>
          </div>
        ) : (
          // Only show Default Value input if it's not boolean, or if it's boolean AND also has a placeholder (covered by above condition)
          // This avoids showing Default Value input twice for boolean in some grid configs.
          // Effectively, for non-booleans, it's always shown here.
          <div className={cn(field.type === 'boolean' && !field.placeholder && "hidden")}> 
            <Label htmlFor={`field-defaultValue-${field.key}`} className="text-xs text-muted-foreground">Default Value</Label>
            <Input
              id={`field-defaultValue-${field.key}`}
              name="defaultValue"
              type={field.type === 'number' ? 'number' : 'text'}
              value={field.defaultValue === undefined || field.defaultValue === null ? '' : String(field.defaultValue)}
              onChange={handleInputChange}
              className="h-8 text-xs"
              disabled={isSaving}
            />
          </div>
        )}
      </div>
      
      {field.type === 'select' && (
        <div className="pt-2 border-t border-dashed mt-1">
          <Label htmlFor={`field-options-${field.key}`} className="text-xs text-muted-foreground">Options (comma-separated value:label pairs)</Label>
          <Textarea
            id={`field-options-${field.key}`}
            name="optionsString"
            value={field.optionsString || ''}
            onChange={handleInputChange}
            placeholder="e.g., common:Common,rare:Rare"
            className="text-xs min-h-[2.5rem]" // Slightly taller for better usability
            rows={1}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Ex: <code>opt1:Option 1,opt2:Option 2</code></p>
        </div>
      )}
    </div>
  );
}
