
// src/components/template-designer/field-row.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState } from 'react'; // Import useState
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'; // Import Chevron icons
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'placeholderImage';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  optionsString?: string; // Comma-separated value:label pairs, e.g., "val1:Label 1,val2:Label 2"
  // Config for 'placeholderImage'
  placeholderConfigWidth?: number;
  placeholderConfigHeight?: number;
  placeholderConfigBgColor?: string;
  placeholderConfigTextColor?: string;
  placeholderConfigText?: string;
}

interface FieldRowProps {
  field: TemplateFieldDefinition;
  onChange: (updatedField: TemplateFieldDefinition) => void;
  onRemove: () => void;
  isSaving?: boolean;
}

export default function FieldRow({ field, onChange, onRemove, isSaving }: FieldRowProps) {
  const [isSecondaryVisible, setIsSecondaryVisible] = useState(false); // State for visibility

  const handleGenericChange = (name: keyof TemplateFieldDefinition, value: any) => {
    onChange({ ...field, [name]: value });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement; // type assertion for checkbox
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = e.target.checked;
    } else if (field.type === 'number' || name === 'placeholderConfigWidth' || name === 'placeholderConfigHeight') {
      processedValue = value === '' ? '' : (isNaN(Number(value)) ? (field[name as keyof TemplateFieldDefinition] || '') : Number(value));
    }
    handleGenericChange(name as keyof TemplateFieldDefinition, processedValue);
  };

  const handleSelectChange = (name: keyof TemplateFieldDefinition, value: string) => {
    // When changing type, reset placeholder config if not changing to placeholderImage
    if (name === 'type' && value !== 'placeholderImage') {
      onChange({ 
        ...field, 
        [name]: value,
        placeholderConfigWidth: undefined,
        placeholderConfigHeight: undefined,
        placeholderConfigBgColor: undefined,
        placeholderConfigTextColor: undefined,
        placeholderConfigText: undefined,
      });
    } else {
      handleGenericChange(name, value);
    }
  };

  const hasSecondaryContent = field.placeholder || field.defaultValue !== undefined || field.type === 'select' || field.type === 'placeholderImage';

  return (
    <div className="p-3 border rounded-md bg-card shadow-sm space-y-2">
      {/* Main Info Row */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {hasSecondaryContent && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSecondaryVisible(!isSecondaryVisible)}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-muted-foreground"
            aria-label={isSecondaryVisible ? "Hide additional options" : "Show additional options"}
            disabled={isSaving}
          >
            {isSecondaryVisible ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
         <div className={cn("flex-grow min-w-[180px] basis-full sm:basis-auto", !hasSecondaryContent && "sm:pl-12")}>
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
        <div className="flex-grow min-w-[130px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-44">
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
        <div className="flex-grow min-w-[120px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-36">
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
              <SelectItem value="placeholderImage">Placeholder Image</SelectItem>
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

      {/* Secondary Info Section - Collapsible */}
      {isSecondaryVisible && hasSecondaryContent && field.type !== 'placeholderImage' && (
        <div className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pt-2 mt-1 border-t border-dashed"
          )}
        >
          {(field.type !== 'boolean' || field.placeholder) && 
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
            <div className="flex items-center space-x-2 self-end pb-1 min-h-[2rem] mt-3 sm:mt-0">
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
      )}
      
      {isSecondaryVisible && field.type === 'select' && (
        <div className={cn("pt-2 mt-1", !hasSecondaryContent || !(field.placeholder || field.defaultValue !== undefined) || field.type === 'placeholderImage' ? "" : "border-t border-dashed")}>
           {(!(field.placeholder || field.defaultValue !== undefined)) && <div className="border-t border-dashed -mx-3 mb-2"></div>}
          <Label htmlFor={`field-options-${field.key}`} className="text-xs text-muted-foreground">Options (comma-separated value:label pairs)</Label>
          <Textarea
            id={`field-options-${field.key}`}
            name="optionsString"
            value={field.optionsString || ''}
            onChange={handleInputChange}
            placeholder="e.g., common:Common,rare:Rare"
            className="text-xs min-h-[2.5rem]"
            rows={1}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Ex: <code>opt1:Option 1,opt2:Option 2</code></p>
        </div>
      )}

      {/* Placeholder Image Configuration */}
      {isSecondaryVisible && field.type === 'placeholderImage' && (
        <div className="pt-2 mt-1 border-t border-dashed space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Placeholder Image Configuration:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <Label htmlFor={`field-ph-width-${field.key}`} className="text-xs text-muted-foreground">Width (px)</Label>
              <Input
                id={`field-ph-width-${field.key}`}
                name="placeholderConfigWidth"
                type="number"
                value={field.placeholderConfigWidth || ''}
                onChange={handleInputChange}
                placeholder="e.g., 300"
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor={`field-ph-height-${field.key}`} className="text-xs text-muted-foreground">Height (px)</Label>
              <Input
                id={`field-ph-height-${field.key}`}
                name="placeholderConfigHeight"
                type="number"
                value={field.placeholderConfigHeight || ''}
                onChange={handleInputChange}
                placeholder="e.g., 200"
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor={`field-ph-bgcolor-${field.key}`} className="text-xs text-muted-foreground">Background Color (hex, no #)</Label>
              <Input
                id={`field-ph-bgcolor-${field.key}`}
                name="placeholderConfigBgColor"
                type="text"
                value={field.placeholderConfigBgColor || ''}
                onChange={handleInputChange}
                placeholder="e.g., cccccc"
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor={`field-ph-textcolor-${field.key}`} className="text-xs text-muted-foreground">Text Color (hex, no #)</Label>
              <Input
                id={`field-ph-textcolor-${field.key}`}
                name="placeholderConfigTextColor"
                type="text"
                value={field.placeholderConfigTextColor || ''}
                onChange={handleInputChange}
                placeholder="e.g., 969696"
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`field-ph-text-${field.key}`} className="text-xs text-muted-foreground">Display Text (optional)</Label>
              <Input
                id={`field-ph-text-${field.key}`}
                name="placeholderConfigText"
                type="text"
                value={field.placeholderConfigText || ''}
                onChange={handleInputChange}
                placeholder="e.g., My Card Art"
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
