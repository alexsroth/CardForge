
// src/components/template-designer/TemplateDesigner/panels/TopToolbar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Palette, Save } from 'lucide-react';

interface Props {
  mode: 'create' | 'edit';
  onGenerateJson: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const TopToolbar: React.FC<Props> = ({
  mode,
  onGenerateJson,
  onSave,
  isSaving,
}) => (
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={onGenerateJson}>
      <Palette className="mr-2 h-4 w-4" />
      Generate JSON
    </Button>
    <Button size="sm" onClick={onSave} disabled={isSaving}>
      <Save className="mr-2 h-4 w-4" />
      {mode === 'create' ? 'Save Template' : 'Save Changes'}
    </Button>
  </div>
);
