
// src/components/template-designer/TemplateDesigner/types.ts
import type { CardTemplate, CardTemplateId } from '@/lib/card-templates';

export interface TemplateDesignerProps {
  mode: 'create' | 'edit';
  initialTemplate?: CardTemplate;
  existingTemplateIds?: CardTemplateId[];
}
