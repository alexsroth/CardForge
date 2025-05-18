
// src/app/templates/new/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { CardTemplate } from '@/lib/card-templates';
import { TemplateDesigner } from '@/components/template-designer/TemplateDesigner';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function NewTemplatePage() {
  console.log('[DEBUG] NewTemplatePage: Rendering.');
  const router = useRouter();
  const { toast } = useToast();
  const { addTemplate, isLoading: templatesLoading, templates } = useTemplates();
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateTemplate = useCallback(async (
    newTemplateData: CardTemplate,
    // existingTemplateId is not used in create mode for onSave from TemplateDesigner
    _existingTemplateId?: CardTemplateId 
  ): Promise<{ success: boolean, message?: string }> => {
    console.log('[DEBUG] NewTemplatePage: handleCreateTemplate called for', newTemplateData.name);
    setIsSaving(true);
    const result = await addTemplate(newTemplateData);
    if (result.success) {
      toast({
        title: "Template Created!",
        description: result.message || `Template "${newTemplateData.name}" saved successfully.`,
      });
      router.push('/templates');
    } else {
      toast({
        title: "Creation Failed",
        description: result.message || "Could not create the template.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
    return result;
  }, [addTemplate, router, toast]);

  if (templatesLoading && !isSaving) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading templates context...</p>
      </div>
    );
  }

  return (
    <TemplateDesigner
      mode="create"
      onSave={handleCreateTemplate}
      isSavingTemplate={isSaving}
      isLoadingContexts={templatesLoading}
      existingTemplateIds={templates.map(t => t.id