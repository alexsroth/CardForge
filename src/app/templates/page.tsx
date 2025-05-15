
// src/app/templates/page.tsx
"use client"; 

import { useState } from 'react';
import type { CardTemplate, TemplateField } from '@/lib/card-templates';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext'; 
import { useProjects } from '@/contexts/ProjectContext'; 
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { PlusCircle, AlertTriangle, Info, Settings2, Loader2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function TemplateFieldDetail({ field }: { field: TemplateField }) {
  return (
    <div className="text-sm py-1.5 px-2 rounded-sm hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors group">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{field.label}</span>
          <span className="text-xs text-muted-foreground ml-1">({field.key})</span>
        </div>
        <Badge variant="secondary" className="text-xs capitalize">{field.type}</Badge>
      </div>
      {field.defaultValue !== undefined && (
        <div className="text-xs text-muted-foreground mt-0.5">
          Default: <code className="bg-muted text-muted-foreground px-1 py-0.5 rounded-sm text-[0.7rem]">{String(field.defaultValue)}</code>
        </div>
      )}
      {field.type === 'select' && field.options && field.options.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          <span className="font-medium">Options:</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {field.options.map(opt => (
              <Badge key={opt.value} variant="outline" className="text-xs font-normal px-1.5 py-0.5">
                {opt.label} <span className="text-muted-foreground/70 ml-0.5">({opt.value})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function TemplateLibraryPage() {
  const { templates, deleteTemplate, isLoading: templatesLoading } = useTemplates();
  const { projects, isLoading: projectsLoading, updateProjectAssociatedTemplates } = useProjects();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTogglingAssociation, setIsTogglingAssociation] = useState<Record<string, boolean>>({});


  const handleDeleteTemplate = async (templateIdToDelete: CardTemplateId) => {
    setIsDeleting(templateIdToDelete);
    const result = await deleteTemplate(templateIdToDelete);
    if (result.success) {
      toast({
        title: "Template Deleted",
        description: result.message,
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsDeleting(null);
  };

  const handleToggleAssociation = async (project: Project, templateIdToToggle: CardTemplateId, currentlyAssociated: boolean) => {
    const toggleKey = `${project.id}-${templateIdToToggle}`;
    setIsTogglingAssociation(prev => ({ ...prev, [toggleKey]: true }));

    let newAssociatedIds: CardTemplateId[];
    if (currentlyAssociated) {
      newAssociatedIds = project.associatedTemplateIds.filter(id => id !== templateIdToToggle);
    } else {
      newAssociatedIds = [...project.associatedTemplateIds, templateIdToToggle];
    }

    const result = await updateProjectAssociatedTemplates(project.id, newAssociatedIds);

    if (result.success) {
      toast({
        title: "Association Updated",
        description: `Template ${currentlyAssociated ? 'disassociated from' : 'associated with'} project "${project.name}".`,
      });
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update template association.",
        variant: "destructive",
      });
    }
    setIsTogglingAssociation(prev => ({ ...prev, [toggleKey]: false }));
  };


  if (templatesLoading || projectsLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading library data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Template Library</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/templates/assignments">
              <Settings2 className="mr-2 h-4 w-4" />
              Manage Assignments
            </Link>
          </Button>
          <Button asChild>
            <Link href="/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Template
            </Link>
          </Button>
        </div>
      </div>

      <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Template Management Note</AlertTitle>
        <AlertDescription className="text-primary/80 dark:text-primary/90">
          This library displays templates currently stored in your browser's local storage.
          You can directly manage which projects use a template from here.
        </AlertDescription>
      </Alert>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: CardTemplate) => {
            const projectsUsingThisTemplate = projects.filter(p => p.associatedTemplateIds?.includes(template.id as CardTemplateId));
            const isTemplateInUse = projectsUsingThisTemplate.length > 0;
            
            return (
              <Card key={template.id} className="flex flex-col shadow-md">
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>ID: <code>{template.id}</code></CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Fields:</h4>
                    {template.fields.length > 0 ? (
                      <ScrollArea className="h-[120px] pr-0 border rounded-md bg-muted/20 dark:bg-muted/10">
                        <div className="p-1 space-y-0.5">
                          {template.fields.map((field) => (
                            <TemplateFieldDetail key={field.key} field={field} />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fields defined for this template.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Project Associations:</h4>
                    {projects.length > 0 ? (
                      <ScrollArea className="h-[100px] pr-2 border rounded-md bg-muted/20 dark:bg-muted/10">
                        <div className="p-2 space-y-1.5">
                          {projects.map(project => {
                            const isAssociated = project.associatedTemplateIds?.includes(template.id as CardTemplateId);
                            const toggleKey = `${project.id}-${template.id}`;
                            return (
                              <div key={project.id} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/50 transition-colors">
                                <span className="text-sm text-foreground truncate mr-2">{project.name}</span>
                                <Button
                                  size="sm"
                                  variant={isAssociated ? "default" : "outline"}
                                  className={cn(
                                    "px-2 py-0.5 h-auto text-xs min-w-[100px]", // Compact button with min-width
                                    isAssociated 
                                      ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                                      : "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  )}
                                  onClick={() => handleToggleAssociation(project, template.id as CardTemplateId, isAssociated)}
                                  disabled={isTogglingAssociation[toggleKey]}
                                >
                                  {isTogglingAssociation[toggleKey] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isAssociated ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ) : (
                                    <PlusCircle className="h-3 w-3 mr-1" />
                                  )}
                                  <span className="ml-1">{isAssociated ? "Associated" : "Associate"}</span>
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground italic p-2 border rounded-md">No projects available to associate.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/templates/edit/${template.id}`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit Template
                    </Link>
                  </Button>
                  {!isTemplateInUse && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full" disabled={isDeleting === template.id}>
                          {isDeleting === template.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete Template
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the template
                            "{template.name}" (ID: {template.id}).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTemplate(template.id as CardTemplateId)}>
                            Confirm Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                   {isTemplateInUse && (
                     <Button variant="outline" size="sm" className="w-full" disabled={true} title="Cannot delete: template is associated with one or more projects.">
                        <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Delete Template</span>
                     </Button>
                   )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No Templates Found</h2>
          <p className="text-muted-foreground mt-2">
            It looks like there are no card templates currently stored.
          </p>
          <Button asChild className="mt-4">
            <Link href="/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Template
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
    
