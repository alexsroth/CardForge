
// src/components/template-designer/TemplateDesigner/panels/TemplateInfo.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface Props {
  templateName: string;
  templateId: string;
  mode: 'create' | 'edit';
  onNameChange: (s: string) => void;
 backgroundColor: string;
 borderColor: string;
 onBackgroundColorChange: (color: string) => void;
 onBorderColorChange: (color: string) => void;
}

export const TemplateInfo: React.FC<Props> = ({
  templateName,
  templateId,
  mode,
  onNameChange,
 backgroundColor,
 borderColor,
 onBackgroundColorChange,
 onBorderColorChange,
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
    <div>
 <Label>Background Color</Label>
 <Input type="color" value={backgroundColor} onChange={(e) => onBackgroundColorChange(e.target.value)} />
    </div>
    <div>
 <Label>Border Color</Label>
 <Input type="color" value={borderColor} onChange={(e) => onBorderColorChange(e.target.value)} />
    </div>
  </div>
);
