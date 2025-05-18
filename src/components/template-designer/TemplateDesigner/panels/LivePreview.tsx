
// src/components/template-designer/TemplateDesigner/panels/LivePreview.tsx
import React from 'react';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import type { CardTemplate } from '@/lib/card-templates';
import type { CardData } from '@/lib/types';

interface Props {
  template: CardTemplate;
  card: CardData | null;
}

export const LivePreviewPanel: React.FC<Props> = ({ template, card }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
    {card ? (
      <DynamicCardRenderer card={card} template={template} />
    ) : (
      <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
    )}
  </div>
);
