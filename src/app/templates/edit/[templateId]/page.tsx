
// src/app/templates/edit/[templateId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  const templateIdFromUrl = typeof params.templateId === 'string' ? params.templateId as CardTemplateId : undefined;

  const [templateToEdit, setTemplateToEdit] = useState<CardTemplate | undefined>(undefined);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); 

  useEffect(() => {
    console.log('[DEBUG] EditTemplatePage: useEffect to load template. ID from URL:', templateIdFromUrl, 'Templates loading:', templatesLoading);
    if (templatesLoading) {
      setIsLoadingPage(true); 
      return;
    }
    if (!templateIdFromUrl) {
      setErrorLoading("No template ID provided in URL.");
      setTemplateToEdit(undefined);
      setIsLoadingPage(false);
      console.error('[DEBUG] EditTemplatePage: No templateIdFromUrl.');
      return;
    }

    const foundTemplate = getTemplateById(templateIdFromUrl);
    if (foundTemplate) {
      setTemplateToEdit(foundTemplate);
      setErrorLoading(null);
      console.log('[DEBUG] EditTemplatePage: Found template to edit:', foundTemplate.name);
    } else {
      setErrorLoading(`Template with ID "${templateIdFromUrl}" not found.`);
      setTemplateToEdit(undefined);
      console.error('[DEBUG] EditTemplatePage: Template not found in context for ID:', templateIdFromUrl);
    }
    setIsLoadingPage(false);
  }, [templateIdFromUrl, getTemplateById, templatesLoading, templates]);


  const handleUpdateTemplate = useCallback(async (
    updatedTemplateData: CardTemplate,
    existingTemplateIdFromDesigner?: CardTemplateId 
  ): Promise<{ success: boolean, message?: string }> => {
    console.log('[DEBUG] EditTemplatePage: handleUpdateTemplate called for ID:', updatedTemplateData.id, 'Original ID was:', existingTemplateIdFromDesigner);
    
    const currentId = existingTemplateIdFromDesigner || templateIdFromUrl; // Prioritize what designer thought it was editing
    if (!currentId) {
        console.error("[DEBUG] EditTemplatePage: Original template ID is missing for update.");
        toast({ title: "Update Error", description: "Original template ID not found.", variant: "destructive" });
        return { success: false, message: "Cannot update: Original template ID is missing."};
    }

    setIsSaving(true);
    // Ensure the ID being updated is the one we're editing
    const result = await updateTemplate({ ...updatedTemplateData, id: currentId }); 
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
  }, [updateTemplate, router, toast, templateIdFromUrl]); // Use templateIdFromUrl for stability


  if (isLoadingPage || (templatesLoading && !templateToEdit && !!templateIdFromUrl)) { 
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
     // This can happen if ID is invalid or template was deleted after page link was generated
     // or if templates context hasn't loaded template yet but isLoadingPage is false.
     if (!templateIdFromUrl) { // No ID at all
        return (
             <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive">Invalid Template Route</h2>
                <p className="text-muted-foreground">No template ID specified in the URL.</p>
                <Button asChild className="mt-4">
                <Link href="/templates">Back to Library</Link>
                </Button>
            </div>
        )
     }
     // If ID was provided but template not found (and not loading)
     return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Template Not Found</h2>
        <p className="text-muted-foreground">The template with ID "{templateIdFromUrl}" could not be found.</p>
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
      existingTemplateIds={templates.filter(t => t.id !== templateIdFromUrl).map(t => t.id)}
    />
  );
}
