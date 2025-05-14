
// src/app/templates/assignments/page.tsx
"use client";

import { useState, useEffect } from 'react';
import type { Project, CardTemplateId } from '@/lib/types';
import { cardTemplates, type CardTemplate } from '@/lib/card-templates';
import { mockProjects } from '@/app/page'; // Using mock projects as the source
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper type for managing associations in state
type ProjectTemplateAssociations = Record<string, CardTemplateId[]>;

export default function ManageTemplateAssignmentsPage() {
  const [projectAssociations, setProjectAssociations] = useState<ProjectTemplateAssociations>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize associations from mockProjects
    const initialAssociations: ProjectTemplateAssociations = {};
    mockProjects.forEach(project => {
      initialAssociations[project.id] = [...(project.associatedTemplateIds || [])];
    });
    setProjectAssociations(initialAssociations);
    setIsLoading(false);
  }, []);

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

  const handleSaveChanges = () => {
    // In a real application, you would send 'projectAssociations' to your backend here.
    // For now, we'll just show a toast.
    console.log('Updated Associations (would be saved):', projectAssociations);
    toast({
      title: "Save Submitted (Mock)",
      description: "Project template associations have been updated in the local state. Persistence is not yet implemented.",
      duration: 5000,
    });
    // Potentially, you could update the mockProjects array in a higher-level state or context
    // if you wanted these changes to reflect elsewhere in the app during the current session.
    // For this example, changes are self-contained to this page's state after initial load.
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
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
            Associate global card templates with your game projects. Changes made here are currently only reflected in this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">Developer Note</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400">
              This page demonstrates managing template-project associations.
              Currently, "Save Changes" only updates client-side state and does not persist data.
              For changes to reflect in the editor or project dashboard, you'd typically need to update the underlying data source (e.g., `mockProjects` if it were mutable and global, or a backend).
            </AlertDescription>
          </Alert>

          {mockProjects.length === 0 && (
            <p className="text-muted-foreground">No projects found to manage.</p>
          )}

          <Accordion type="multiple" className="w-full space-y-2">
            {mockProjects.map(project => (
              <AccordionItem key={project.id} value={project.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline px-4 py-3 bg-muted/50 rounded-md">
                  {project.name}
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-4 px-4 border rounded-b-md">
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the card templates available for the "{project.name}" project:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {cardTemplates.map(template => (
                      <div key={template.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={`${project.id}-${template.id}`}
                          checked={projectAssociations[project.id]?.includes(template.id as CardTemplateId) || false}
                          onCheckedChange={(checked) => 
                            handleAssociationChange(project.id, template.id as CardTemplateId, Boolean(checked))
                          }
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
                  {cardTemplates.length === 0 && (
                     <p className="text-sm text-muted-foreground">No global templates defined yet. <Link href="/templates/new" className="text-primary hover:underline">Create one?</Link></p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {mockProjects.length > 0 && cardTemplates.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save Assignments (Mock)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
