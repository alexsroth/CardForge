
// src/app/templates/page.tsx
"use client"; 

import type { CardTemplate, TemplateField, CardTemplateId as ImportedCardTemplateId } from '@/lib/card-templates';
import { useTemplates } from '@/contexts/TemplateContext'; 
import { useProjects } from '@/contexts/ProjectContext'; // Import useProjects
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, AlertTriangle, Info, Settings2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

type CardTemplateId = ImportedCardTemplateId; 

function TemplateFieldDetail({ field }: { field: TemplateField }) {
  return (
    <li className="text-sm py-1">
      <span className="font-semibold">{field.label}</span> ({field.key}): <Badge variant="outline" className="ml-1">{field.type}</Badge>
      {field.defaultValue !== undefined && (
        <span className="text-xs text-muted-foreground ml-2">Default: {String(field.defaultValue)}</span>
      )}
       {field.placeholder && (
        <span className="text-xs text-muted-foreground ml-2 italic">Placeholder: "{field.placeholder}"</span>
      )}
      {field.type === 'select' && field.options && (
        <div className="text-xs text-muted-foreground ml-4">
          Options: {field.options.map(opt => `${opt.label} (${opt.value})`).join(', ')}
        </div>
      )}
    </li>
  );
}

function getProjectsForTemplate(templateId: CardTemplateId, allProjects: Project[]): Project[] {
  return allProjects.filter(project => project.associatedTemplateIds?.includes(templateId));
}


export default function TemplateLibraryPage() {
  const { templates, isLoading: templatesLoading } = useTemplates();
  const { projects, isLoading: projectsLoading } = useProjects();

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

      <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Template Management Note</AlertTitle>
        <AlertDescription>
          This library displays templates currently stored in your browser's local storage.
          When you create new templates via the "Template Designer", they are saved here.
          Project associations are managed on the "Manage Assignments" page and are also stored locally.
        </AlertDescription>
      </Alert>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: CardTemplate) => {
            const associatedProjects = getProjectsForTemplate(template.id as CardTemplateId, projects);
            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>ID: <code>{template.id}</code></CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Fields:</h4>
                    {template.fields.length > 0 ? (
                      <ScrollArea className="h-[120px] pr-3 border rounded-md p-2 bg-muted/30">
                        <ul className="list-disc list-inside pl-2 space-y-1">
                          {template.fields.map((field) => (
                            <TemplateFieldDetail key={field.key} field={field} />
                          ))}
                        </ul>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fields defined for this template.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Used by Projects:</h4>
                    {associatedProjects.length > 0 ? (
                       <ScrollArea className="h-[60px] pr-3">
                        <div className="flex flex-wrap gap-1">
                          {associatedProjects.map(project => (
                            <Badge key={project.id} variant="secondary">{project.name}</Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not currently associated with any projects.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No Templates Found</h2>
          <p className="text-muted-foreground mt-2">
            It looks like there are no card templates currently stored or seeded.
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
