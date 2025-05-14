// src/lib/template-code-helpers.ts

import type { TemplateFieldDefinition } from '@/components/template-designer/field-row';

function escapeString(value: any): string {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return String(value); // For numbers and booleans
}

function parseOptionsString(optionsString?: string): Array<{ value: string; label: string }> {
  if (!optionsString) return [];
  return optionsString.split(',').map(pair => {
    const parts = pair.split(':');
    return {
      value: parts[0]?.trim() || '',
      label: parts[1]?.trim() || parts[0]?.trim() || '',
    };
  }).filter(opt => opt.value);
}

export function generateTemplateCode(
  templateId: string,
  templateName: string,
  fields: TemplateFieldDefinition[]
): string {
  const fieldsCode = fields.map(field => {
    let fieldString = `      { key: '${field.key}', label: '${field.label}', type: '${field.type}'`;
    if (field.placeholder) {
      fieldString += `, placeholder: ${escapeString(field.placeholder)}`;
    }
    if (field.defaultValue !== undefined && field.defaultValue !== '') {
       if (field.type === 'number') {
        fieldString += `, defaultValue: ${Number(field.defaultValue) || 0}`;
      } else if (field.type === 'boolean') {
        fieldString += `, defaultValue: ${field.defaultValue === true || field.defaultValue === 'true'}`;
      } else {
        fieldString += `, defaultValue: ${escapeString(field.defaultValue)}`;
      }
    }
    if (field.type === 'select' && field.optionsString) {
      const options = parseOptionsString(field.optionsString);
      if (options.length > 0) {
        const optionsCode = options.map(opt => `{ value: ${escapeString(opt.value)}, label: ${escapeString(opt.label)} }`).join(', ');
        fieldString += `, options: [${optionsCode}]`;
      }
    }
    fieldString += ` }`;
    return fieldString;
  }).join(',\n');

  return `
// Add this to your src/lib/card-templates.ts file

// 1. Add the new template object to the 'cardTemplates' array:
/*
{
  id: '${templateId}',
  name: '${templateName}',
  fields: [
${fieldsCode}
  ],
},
*/

// 2. Update the 'CARD_TEMPLATE_IDS' array to include your new template ID:
/*
export const CARD_TEMPLATE_IDS = [..., '${templateId}'] as const;
*/

// -------- Generated Template Object (for easy copy-pasting) --------
{
  id: '${templateId}',
  name: '${templateName}',
  fields: [
${fieldsCode}
  ],
}
// --------------------------------------------------------------------
`;
}
