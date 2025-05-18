// src/components/template-designer/TemplateDesigner/index.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { useTemplateDesigner } from '@/hooks/useTemplateDesigner';

import { TopToolbar } from './panels/TopToolbar';
import { TemplateInfo } from './panels/TemplateInfo';
import { DataFieldsPanel } from './panels/DataFields';
import { LayoutBuilderPanel } from './panels/LayoutBuilder';
import { LivePreviewPanel } from './panels/LivePreview';

import type { TemplateDesignerProps } from './types';

export const TemplateDesigner: React.FC<TemplateDesignerProps> = (props) => {
  const designer = useTemplateDesigner(props);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Toolbar */}
      <TopToolbar
        mode={props.mode}
        onGenerateJson={() => {/* TODO connect */}}
        onSave={() => {/* TODO connect */}}
        isSaving={designer.isSaving}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <TemplateInfo
              mode={props.mode}
              templateName={designer.templateName}
              templateId={designer.templateId}
              onNameChange={designer.setTemplateName}
            />
          </CardHeader>
          <CardContent>
            <DataFieldsPanel
              fields={designer.fields}
              onAddField={designer.addField}
              onRemoveField={designer.removeField}
            />
          </CardContent>
        </Card>

        <LayoutBuilderPanel
          layoutDefinition={designer.layoutDefinition}
          onChange={designer.setLayoutDefinition}
        />
      </div>

      <LivePreviewPanel
        template={designer.templateForPreview}
        card={designer.sampleCard}
      />
    </div>
  );
};
