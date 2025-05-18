// src/lib/card-designer/mappers.ts
import type { TemplateField } from '@/lib/card-templates';
import type { TemplateFieldDefinition } from './types';

export const mapFieldDefinitionToTemplateField = (def: TemplateFieldDefinition): TemplateField => {
  console.log('[DEBUG] card-designer/mappers.ts: mapFieldDefinitionToTemplateField called for:', def.label);
  const field: TemplateField = {
    key: def.key,
    label: def.label,
    type: def.type,
  };
  if (def.placeholder) field.placeholder = def.placeholder;
  if (def.defaultValue !== undefined && String(def.defaultValue).trim() !== '') {
    if (def.type === 'number') {
      field.defaultValue = Number(def.defaultValue) || 0;
    } else if (def.type === 'boolean') {
      field.defaultValue = def.defaultValue === true || String(def.defaultValue).toLowerCase() === 'true';
    } else {
      field.defaultValue = String(def.defaultValue);
    }
  }
  if (def.type === 'select' && def.optionsString) {
    field.options = def.optionsString.split(',').map(pair => {
      const parts = pair.split(':');
      return {
        value: parts[0]?.trim() || '',
        label: parts[1]?.trim() || parts[0]?.trim() || '',
      };
    }).filter(opt => opt.value);
  }
   if (def.type === 'placeholderImage') {
    field.placeholderConfigWidth = def.placeholderConfigWidth;
    field.placeholderConfigHeight = def.placeholderConfigHeight;
    field.placeholderConfigBgColor = def.placeholderConfigBgColor;
    field.placeholderConfigTextColor = def.placeholderConfigTextColor;
    field.placeholderConfigText = def.placeholderConfigText;
  }
  return field;
};

export const mapTemplateFieldToFieldDefinition = (field: TemplateField, index: number): TemplateFieldDefinition => {
  console.log('[DEBUG] card-designer/mappers.ts: mapTemplateFieldToFieldDefinition called for:', field.label);
  return {
    _uiId: `field-edit-${field.key}-${Date.now()}-${index}-${Math.random().toString(36).substring(2,7)}`,
    key: field.key,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue !== undefined ? String(field.defaultValue) : '', // Ensure string for input
    previewValue: field.defaultValue !== undefined ? String(field.defaultValue) : (field.placeholder || ''),
    optionsString: field.options?.map(opt => `${opt.value}:${opt.label}`).join(','),
    placeholderConfigWidth: field.placeholderConfigWidth,
    placeholderConfigHeight: field.placeholderConfigHeight,
    placeholderConfigBgColor: field.placeholderConfigBgColor,
    placeholderConfigTextColor: field.placeholderConfigTextColor,
    placeholderConfigText: field.placeholderConfigText,
  };
};

console.log('[DEBUG] card-designer/mappers.ts: Module loaded');
