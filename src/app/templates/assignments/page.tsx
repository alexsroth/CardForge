
// src/app/templates/assignments/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CardTemplateId } from '@/lib/types';
import { useTemplates } from '@/contexts/TemplateContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ProjectTemplateAssociations = Record<string, CardTemplateId[]>;

export default function ManageTemplateAssignmentsPage() {
  const { projects, isLoading: projectsLoading, updateProjectAssociatedTemplates } = useProjects();
  const { templates: globalTemplates, isLoading: templatesLoading } = useTemplates();
  
  const [projectAssociations, setProjectAssociations] = useState<ProjectTemplateAssociations>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!projectsLoading) {
      const initialAssociations: ProjectTemplateAssociations = {};
      projects.forEach(project => {
        initialAssociations[project.id] = [...(project.associatedTemplateIds || [])];
      });
      setProjectAssociations(initialAssociations);
    }
  }, [projects, projectsLoading]);

  const handleAssociationChange = (projectId: string, templateId: CardTemplateId, isAssociated: boolean) => {
    setProjectAssociations(prev => {
      const currentAssociations = prev[projectId] ? [...prev[projectId]] : [];
      if (isAssociated) {
        if (!currentAssociations.includes(templateId)) {
          currentAssociations.push(templateId);
        }
      } else {
        const index = currentAssociations.indexOf(templateId);
        if (index > -1) {
          currentAssociations.splice(index, 1);
        }
      }
      return { ...prev, [projectId]: currentAssociations };
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    let allSavesSuccessful = true;
    let firstErrorMessage = "";

    for (const projectId of Object.keys(projectAssociations)) {
      const result = await updateProjectAssociatedTemplates(projectId, projectAssociations[projectId]);
      if (!result.success) {
        allSavesSuccessful = false;
        if (!firstErrorMessage) firstErrorMessage = result.message;
        console.error(`Failed to save associations for project ${projectId}: ${result.message}`);
      }
    }

    setIsSaving(false);
    if (allSavesSuccessful) {
      toast({
        title: "Assignments Saved!",
        description: "Project template associations have been updated and saved to localStorage.",
        duration: 5000,
      });
    } else {
      toast({
        title: "Some Saves Failed",
        description: `Could not save all associations. First error: ${firstErrorMessage || 'Unknown error.'}`,
        variant: "destructive",
        duration: 7000,
      });
    }
  };

  if (projectsLoading || templatesLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading project and template data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Manage Template Assignments</CardTitle>
          <CardDescription>
            Associate global card templates with your game projects. Changes are saved to your browser's local storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Live Updates</AlertTitle>
            <AlertDescription className="text-primary/80">
              Changes made here are saved to your browser's local storage and will be reflected immediately in the editor and project dashboards.
            </AlertDescription>
          </Alert>

          {projects.length === 0 && (
            <p className="text-muted-foreground">No projects found to manage. <Link href="/" className="text-primary hover:underline">Go to dashboard?</Link></p>
          )}

          <Accordion type="multiple" className="w-full space-y-2">
            {projects.map(project => (
              <AccordionItem key={project.id} value={project.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline px-4 py-3 bg-muted/50 rounded-md">
                  {project.name}
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-4 px-4 border rounded-b-md">
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the card templates available for the "{project.name}" project:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {globalTemplates.map(template => (
                      <div key={template.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={`${project.id}-${template.id}`}
                          checked={projectAssociations[project.id]?.includes(template.id as CardTemplateId) || false}
                          onCheckedChange={(checked) => 
                            handleAssociationChange(project.id, template.id as CardTemplateId, Boolean(checked))
                          }
                          disabled={isSaving}
                        />
                        <Label 
                          htmlFor={`${project.id}-${template.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {template.name} (<code>{template.id}</code>)
                        </Label>
                      </div>
                    ))}
                  </div>
                  {globalTemplates.length === 0 && (
                     <p className="text-sm text-muted-foreground">No global templates defined yet. <Link href="/templates/new" className="text-primary hover:underline">Create one?</Link></p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {projects.length > 0 && globalTemplates.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Assignments</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
