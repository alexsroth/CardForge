
// src/components/template-designer/TemplateDesigner/panels/TemplateInfo.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  templateName: string;
  templateId: string;
  mode: 'create' | 'edit';
  onNameChange: (s: string) => void;
}

export const TemplateInfo: React.FC<Props> = ({
  templateName,
  templateId,
  mode,
  onNameChange
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Template Name</Label>
      <Input
        value={templateName}
        placeholder="My Awesome Template"
        onChange={(e) => onNameChange(e.target.value)}
      />
    </div>
    <div>
      <Label>Template ID {mode === 'create' ? '(auto)' : '(read‑only)'}</Label>
      <Input value={templateId} readOnly disabled />
    </div>
  </div>
);
