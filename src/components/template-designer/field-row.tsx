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
import { generateSamplePlaceholderUrl, type TemplateFieldDefinition } from '@/lib/card-designer';

interface FieldRowProps {
  field: TemplateFieldDefinition;
  onChange: (updatedField: TemplateFieldDefinition) => void;
  onRemove: () => void;
  isSaving?: boolean;
}

export default function FieldRow({ field, onChange, onRemove, isSaving }: FieldRowProps) {
  const [isSecondaryVisible, setIsSecondaryVisible] = useState(false);
  const [generatedPlaceholderUrl, setGeneratedPlaceholderUrl] = useState('');

  // console.log('[DEBUG] FieldRow rendering for field:', field.label, field._uiId);

  useEffect(() => {
    // console.log('[DEBUG] FieldRow useEffect for placeholder URL, field type:', field.type);
    if (field.type === 'placeholderImage') {
      const url = generateSamplePlaceholderUrl({
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
            newFieldData.placeholderConfigWidth = field.placeholderConfigWidth || 280; // Default width
            newFieldData.placeholderConfigHeight = field.placeholderConfigHeight || 140; // Default height
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

  // The chevron for expanding secondary options should always be visible.
  const alwaysShowExpandToggle = true; 

  return (
    <div className="p-3 border rounded-md bg-card shadow-sm space-y-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {alwaysShowExpandToggle ? (
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
        ) : (
          <div className="w-9 shrink-0"></div> 
        )}
         <div className="flex-grow min-w-[180px] basis-full sm:basis-auto">
          <Label htmlFor={`field-label-${field._uiId}`} className="text-sm font-medium">Field Label</Label>
          <Input
            id={`field-label-${field._uiId}`}
            name="label"
            value={field.label}
            onChange={handleInputChange}
            placeholder="e.g., Card Title"
            className="h-9 text-sm"
            disabled={isSaving}
          />
        </div>
        <div className="flex-grow min-w-[130px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-44">
          <Label htmlFor={`field-key-display-${field._uiId}`} className="text-sm font-medium">Field Key</Label>
          <Input
            id={`field-key-display-${field._uiId}`}
            name="key"
            value={field.key}
            readOnly
            className="h-9 text-sm bg-muted/50"
            disabled={isSaving}
          />
        </div>
        <div className="flex-grow min-w-[120px] basis-1/2 sm:basis-auto sm:flex-grow-0 sm:w-36">
          <Label htmlFor={`field-type-${field._uiId}`} className="text-sm font-medium">Field Type</Label>
          <Select
            name="type"
            value={field.type}
            onValueChange={(value) => handleSelectChange('type', value)}
            disabled={isSaving}
          >
            <SelectTrigger id={`field-type-${field._uiId}`} className="h-9 text-sm">
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
        <div className="pt-2 mt-1 border-t border-dashed space-y-3 pl-9"> {/* Added pl-9 to align with inputs above toggle */}
          
          {/* Preview Value - Always available */}
          <div>
            <Label htmlFor={`field-previewValue-${field._uiId}`} className="text-xs text-muted-foreground">
              Preview Value (for live layout preview)
            </Label>
            <Input
              id={`field-previewValue-${field._uiId}`}
              name="previewValue"
              value={field.previewValue || ''}
              onChange={handleInputChange}
              placeholder={field.type === 'boolean' ? 'true or false' : (field.type === 'number' ? 'e.g., 10' : 'Enter text for preview')}
              className="h-8 text-xs"
              disabled={isSaving}
            />
          </div>

          {/* Placeholder and Default Value - Grouped and conditional on type */}
          {field.type !== 'placeholderImage' && (
             <div className={cn("grid grid-cols-1 gap-y-2", (field.type === 'text' || field.type === 'textarea') ? 'sm:grid-cols-1' : 'sm:grid-cols-2 gap-x-3')}>
                {/* Input Placeholder - Not for boolean unless it specifically has a placeholder prop in future */}
                {(field.type !== 'boolean') && (
                  <div>
                    <Label htmlFor={`field-placeholder-${field._uiId}`} className="text-xs text-muted-foreground">Input Placeholder</Label>
                    <Input
                      id={`field-placeholder-${field._uiId}`}
                      name="placeholder"
                      value={field.placeholder || ''}
                      onChange={handleInputChange}
                      className="h-8 text-xs"
                      disabled={isSaving}
                    />
                  </div>
                )}
                
                {/* Default Value */}
                {field.type === 'boolean' ? (
                  <div className="flex items-center space-x-2 self-end pb-1 min-h-[2rem] mt-3 sm:mt-0">
                    <Input
                      type="checkbox"
                      id={`field-defaultValue-bool-${field._uiId}`}
                      name="defaultValue"
                      checked={field.defaultValue === true || String(field.defaultValue).toLowerCase() === 'true'}
                      onChange={handleInputChange}
                      className="h-4 w-4"
                      disabled={isSaving}
                    />
                    <Label htmlFor={`field-defaultValue-bool-${field._uiId}`} className="font-normal text-xs text-muted-foreground">
                      Default to checked?
                    </Label>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor={`field-defaultValue-${field._uiId}`} className="text-xs text-muted-foreground">Default Value</Label>
                    <Input
                      id={`field-defaultValue-${field._uiId}`}
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
              <Label htmlFor={`field-options-${field._uiId}`} className="text-xs text-muted-foreground">Options (comma-separated value:label pairs)</Label>
              <Textarea
                id={`field-options-${field._uiId}`}
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
                  <Label htmlFor={`field-ph-width-${field._uiId}`} className="text-xs text-muted-foreground">Width (px)</Label>
                  <Input
                    id={`field-ph-width-${field._uiId}`}
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
                  <Label htmlFor={`field-ph-height-${field._uiId}`} className="text-xs text-muted-foreground">Height (px)</Label>
                  <Input
                    id={`field-ph-height-${field._uiId}`}
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
                  <Label htmlFor={`field-ph-bgcolor-${field._uiId}`} className="text-xs text-muted-foreground">Background Color (hex, no #)</Label>
                  <Input
                    id={`field-ph-bgcolor-${field._uiId}`}
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
                  <Label htmlFor={`field-ph-textcolor-${field._uiId}`} className="text-xs text-muted-foreground">Text Color (hex, no #)</Label>
                  <Input
                    id={`field-ph-textcolor-${field._uiId}`}
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
                  <Label htmlFor={`field-ph-text-${field._uiId}`} className="text-xs text-muted-foreground">Display Text (optional)</Label>
                  <Input
                    id={`field-ph-text-${field._uiId}`}
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
