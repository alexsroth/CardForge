// src/components/template-designer/field-row.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';

export interface TemplateFieldDefinition {
  _uiId?: string; // Stable unique ID for React key purposes
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'placeholderImage';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  previewValue?: string; // Stores the user-defined preview value as a string
  optionsString?: string;
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

function generatePreviewPlaceholderUrl(config: {
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  text?: string;
}): string {
  const {
    width = 100,
    height = 100,
    bgColor,
    textColor,
    text,
  } = config;

  let path = `${width}x${height}`;
  const cleanBgColor = bgColor?.replace('#', '').trim();
  const cleanTextColor = textColor?.replace('#', '').trim();

  if (cleanBgColor) {
    path += `/${cleanBgColor}`;
    if (cleanTextColor) {
      path += `/${cleanTextColor}`;
    }
  }
  path += `.png`; // Always request PNG

  let fullUrl = `https://placehold.co/${path}`;
  const cleanText = text?.trim();
  if (cleanText) {
    fullUrl += `?text=${encodeURIComponent(cleanText)}`;
  }
  // console.log('[DEBUG] FieldRow/generatePreviewPlaceholderUrl: Generated URL', fullUrl, 'from config', config);
  return fullUrl;
}


export default function FieldRow({ field, onChange, onRemove, isSaving }: FieldRowProps) {
  const [isSecondaryVisible, setIsSecondaryVisible] = useState(false);
  const [generatedPlaceholderUrl, setGeneratedPlaceholderUrl] = useState('');

  // console.log('[DEBUG] FieldRow rendering for field:', field.label, field.key, field._uiId);


  useEffect(() => {
    // console.log('[DEBUG] FieldRow useEffect for placeholder URL, field type:', field.type);
    if (field.type === 'placeholderImage') {
      const url = generatePreviewPlaceholderUrl({
        width: field.placeholderConfigWidth,
        height: field.placeholderConfigHeight,
        bgColor: field.placeholderConfigBgColor,
        textColor: field.placeholderConfigTextColor,
        text: field.placeholderConfigText,
      });
      setGeneratedPlaceholderUrl(url);
    } else {
      setGeneratedPlaceholderUrl('');
    }
  }, [
    field.type,
    field.placeholderConfigWidth,
    field.placeholderConfigHeight,
    field.placeholderConfigBgColor,
    field.placeholderConfigTextColor,
    field.placeholderConfigText,
  ]);

  const handleGenericChange = (name: keyof TemplateFieldDefinition, value: any) => {
    onChange({ ...field, [name]: value });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = e.target.checked;
    } else if (name === 'defaultValue' && field.type === 'number') {
      processedValue = value === '' ? '' : (isNaN(Number(value)) ? (field[name as keyof TemplateFieldDefinition] || '') : Number(value));
    } else if (name === 'placeholderConfigWidth' || name === 'placeholderConfigHeight') {
      processedValue = value === '' ? '' : (isNaN(Number(value)) ? (field[name as keyof TemplateFieldDefinition] || '') : Number(value));
    }
    handleGenericChange(name as keyof TemplateFieldDefinition, processedValue);
  };

  const handleSelectChange = (name: keyof TemplateFieldDefinition, value: string) => {
    const newFieldData: Partial<TemplateFieldDefinition> = { [name]: value };
    if (name === 'type') {
        if (value === 'placeholderImage') {
            newFieldData.placeholderConfigWidth = field.placeholderConfigWidth || 250;
            newFieldData.placeholderConfigHeight = field.placeholderConfigHeight || 140;
        } else {
            newFieldData.placeholderConfigWidth = undefined;
            newFieldData.placeholderConfigHeight = undefined;
            newFieldData.placeholderConfigBgColor = undefined;
            newFieldData.placeholderConfigTextColor = undefined;
            newFieldData.placeholderConfigText = undefined;
        }
    }
    onChange({ ...field, ...newFieldData });
  };

  const hasSecondaryContentInput = field.placeholder || field.defaultValue !== undefined || field.type === 'select' || field.previewValue !== undefined;
  const hasAnySecondaryContent = hasSecondaryContentInput || field.type === 'placeholderImage';


  return (
    <div className="p-3 border rounded-md bg-card shadow-sm space-y-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {hasAnySecondaryContent && (
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
         <div className={cn("flex-grow min-w-[180px] basis-full sm:basis-auto", !hasAnySecondaryContent && "sm:pl-12")}>
          <Label htmlFor={`field-label-${field.key}`} className="text-sm font-medium">Field Label</Label>
          <Input
            id={`field-label-${field.key}`} // This ID can still use field.key as it's for label association
            name="label"
            value={field.label}
            onChange={handleInputChange}
            placeholder="e.g., Card Title"
            className="h-9 text-sm"
            disabled={isSaving}
          />
        </div>
        <div className="flex-grow min-w-[130px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-44">
          <Label htmlFor={`field-key-display-${field.key}`} className="text-sm font-medium">Field Key</Label>
          <Input
            id={`field-key-display-${field.key}`} // Display-only, so field.key is fine
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

      {isSecondaryVisible && (
        <div className="pt-2 mt-1 border-t border-dashed space-y-3">
          {field.type !== 'placeholderImage' && (
            <div>
              <Label htmlFor={`field-previewValue-${field.key}`} className="text-xs text-muted-foreground">
                Preview Value (for live layout preview)
              </Label>
              <Input
                id={`field-previewValue-${field.key}`}
                name="previewValue"
                value={field.previewValue || ''}
                onChange={handleInputChange}
                placeholder={field.type === 'boolean' ? 'true or false' : (field.type === 'number' ? 'e.g., 10' : 'Enter text for preview')}
                className="h-8 text-xs"
                disabled={isSaving}
              />
            </div>
          )}

          {(field.placeholder || field.defaultValue !== undefined || field.type === 'boolean' || field.type === 'number') && field.type !== 'placeholderImage' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                {(field.type !== 'boolean' || field.placeholder) && (
                  <div className={cn(field.type === 'boolean' && "sm:col-span-1")}>
                    <Label htmlFor={`field-placeholder-${field.key}`} className="text-xs text-muted-foreground">Input Placeholder</Label>
                    <Input
                      id={`field-placeholder-${field.key}`}
                      name="placeholder"
                      value={field.placeholder || ''}
                      onChange={handleInputChange}
                      className="h-8 text-xs"
                      disabled={isSaving}
                    />
                  </div>
                )}

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
                  <div className={cn((field.type === 'boolean' && !field.placeholder) && "hidden")}>
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
          
          {field.type === 'select' && (
            <div className="pt-2">
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

          {field.type === 'placeholderImage' && (
            <div className="space-y-3">
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
                    placeholder="e.g., cccccc or orange"
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
                    placeholder="e.g., 969696 or white"
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
              {generatedPlaceholderUrl && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Generated URL (for reference):</Label>
                  <Input
                    type="text"
                    value={generatedPlaceholderUrl}
                    readOnly
                    className="h-8 text-xs bg-muted/50 font-mono"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
