
// src/components/template-designer/TemplateDesigner/panels/LayoutBuilder.tsx
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  layoutDefinition: string;
  onChange: (value: string) => void;
}

export const LayoutBuilderPanel: React.FC<Props> = ({ layoutDefinition, onChange }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Layout JSON</h3>
    <Textarea
      className="font-mono text-xs"
      value={layoutDefinition}
      onChange={(e) => onChange(e.target.value)}
      rows={15}
    />
  </div>
);
