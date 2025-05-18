
// src/components/template-designer/TemplateDesigner/panels/DataFields.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { TemplateFieldDefinition } from '@/lib/card-designer';

interface Props {
  fields: TemplateFieldDefinition[];
  onAddField: () => void;
  onRemoveField: (uiId: string) => void;
}

export const DataFieldsPanel: React.FC<Props> = ({
  fields,
  onAddField,
  onRemoveField
}) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Data Fields</h3>
    {fields.length === 0 && (
      <p className="text-sm text-muted-foreground">No fields yet – add one!</p>
    )}
    {fields.map(f => (
      <div key={f._uiId} className="flex justify-between items-center py-1">
        <span>{f.label}</span>
        <Button variant="ghost" size="icon" onClick={() => onRemoveField(f._uiId!)}>
          ✕
        </Button>
      </div>
    ))}
    <Button variant="outline" size="sm" className="mt-2" onClick={onAddField}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add Field
    </Button>
  </div>
);
