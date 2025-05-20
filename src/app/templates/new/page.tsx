
// src/app/templates/new/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import type { CardTemplate } from '@/lib/card-templates';
import { TemplateDesigner } from '@/components/template-designer/TemplateDesigner'; // Adjusted path
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";

// console.log('[DEBUG] /templates/new/page.tsx: Module loaded');

export default function NewTemplatePage() {
  // console.log("[DEBUG] NewTemplatePage: Rendering.");
  const router = useRouter();
  const { toast } = useToast();
  const { addTemplate, isLoading: templatesLoading, templates } = useTemplates();
  const [isSaving, setIsSaving] = useState(false); // Local saving state for this page's action

  const handleCreateTemplate = useCallback(
    async (
      newTemplateData: CardTemplate,
      _existingTemplateId?: CardTemplateId // Not used in create mode
    ): Promise<{ success: boolean; message?: string }> => {
      
      setIsSaving(true);
      let result: { success: boolean; message?: string };
      try {
        result = await addTemplate(newTemplateData);
        if (result.success) {
          toast({
            title: "Template Created!",
            description:
              result.message ||
              `Template "${newTemplateData.name}" saved successfully.`,
          });
          router.push("/templates");
        } else {
          toast({
            title: "Creation Failed",
            description: result.message || "Could not create the template.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("[DEBUG] NewTemplatePage: Error in handleCreateTemplate:", error);
        const errorMessage = error.message || "An unexpected error occurred.";
        toast({
            title: "Creation Error",
            description: errorMessage,
            variant: "destructive",
        });
        result = { success: false, message: errorMessage };
      } finally {
        setIsSaving(false);
      }
      return result;
    },
    [addTemplate, router, toast]
  );

  if (templatesLoading && !isSaving) { // Check templatesLoading but not local isSaving
    // console.log("[DEBUG] NewTemplatePage: Contexts loading, showing loader.");
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Loading templates context...
        </p>
      </div>
    );
  }

  // console.log("[DEBUG] NewTemplatePage: Rendering TemplateDesigner.");
  return (
    <TemplateDesigner
      mode="create"
      onSave={handleCreateTemplate}
      isLoadingContexts={templatesLoading} // Pass context loading state
      existingTemplateIds={templates.map((t) => t.id as CardTemplateId)}
    />
  );
}

    