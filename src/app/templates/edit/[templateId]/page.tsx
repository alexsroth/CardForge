
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter }
  from 'next/navigation';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { CardTemplate } from '@/lib/card-templates';
import { TemplateDesigner } from '@/components/template-designer/TemplateDesigner';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditTemplatePage() {
  console.log('[DEBUG] EditTemplatePage: Rendering.');
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getTemplateById, updateTemplate, isLoading: templatesLoading, templates } = useTemplates();

  const templateIdToEdit = typeof params.templateId === 'string' ? params.templateId as CardTemplateId : undefined;

  const [templateToEdit, setTemplateToEdit] = useState<CardTemplate | undefined>(undefined);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('[DEBUG] EditTemplatePage: useEffect to load template. ID:', templateIdToEdit, 'Templates loading:', templatesLoading);
    if (templatesLoading) {
      // Still waiting for templates to load from context
      return;
    }
    if (!templateIdToEdit) {
      setErrorLoading("No template ID provided in URL.");
      console.error('[DEBUG] EditTemplatePage: No templateIdToEdit.');
      return;
    }

    const foundTemplate = getTemplateById(templateIdToEdit);
    if (foundTemplate) {
      setTemplateToEdit(foundTemplate);
      setErrorLoading(null);
      console.log('[DEBUG] EditTemplatePage: Found template to edit:', foundTemplate.name);
    } else {
      setErrorLoading(`Template with ID "${templateIdToEdit}" not found.`);
      console.error('[DEBUG] EditTemplatePage: Template not found in context for ID:', templateIdToEdit);
    }
  }, [templateIdToEdit, getTemplateById, templatesLoading]);

  const handleUpdateTemplate = useCallback(async (
    updatedTemplateData: CardTemplate,
    // existingTemplateId is not strictly needed for update as ID is immutable, but kept for consistent onSave signature
    _existingTemplateId?: CardTemplateId 
  ): Promise<{ success: boolean, message?: string }> => {
    console.log('[DEBUG] EditTemplatePage: handleUpdateTemplate called for ID:', updatedTemplateData.id);
    setIsSaving(true);
    const result = await updateTemplate(updatedTemplateData);
    if (result.success) {
      toast({
        title: "Template Updated!",
        description: result.message || `Template "${updatedTemplateData.name}" saved successfully.`,
      });
      router.push('/templates');
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update the template.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
    return result;
  }, [updateTemplate, router, toast]);


  if (templatesLoading || (templateIdToEdit && !templateToEdit && !errorLoading)) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading template data...</p>
      </div>
    );
  }

  if (errorLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Error Loading Template</h2>
        <p className="text-muted-foreground">{errorLoading}</p>
        <Button asChild className="mt-4">
          <Link href="/templates">Back to Library</Link>
        </Button>
      </div>
    );
  }

  if (!templateToEdit) {
     // This case should ideally be covered by errorLoading or templatesLoading,
     // but acts as a fallback if templateIdToEdit exists but templateToEdit is still undefined after loading.
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Template Not Found</h2>
        <p className="text-muted-foreground">The template with ID "{templateIdToEdit}" could not be found or is still loading.</p>
        <Button asChild className="mt-4">
          <Link href="/templates">Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <TemplateDesigner
      mode="edit"
      initialTemplate={templateToEdit}
      onSave={handleUpdateTemplate}
      isSavingTemplate={isSaving}
      isLoadingContexts={templatesLoading}
      // For edit mode, duplicate ID check is against OTHER templates if name changes.
      // However, the ID itself is immutable. For simplicity, pass all template IDs excluding the current one.
      existingTemplateIds={templates.filter(t => t.id !== templateIdToEdit).map(t => t.id)}
    />
  );
}
