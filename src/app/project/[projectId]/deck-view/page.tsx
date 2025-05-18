
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '@/contexts/ProjectContext';
import type { Project } from '@/lib/types';
import { useTemplates } from '@/contexts/TemplateContext'; // Import useTemplates
import { Button } from '@/components/ui/button';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import { ArrowLeft, Loader2, AlertTriangle, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function DeckViewLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-48 mb-2" /> {/* Back to Editor Button Skeleton */}
      <Skeleton className="h-10 w-3/4 mb-8" /> {/* Project Name Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-2.5 gap-y-6 place-items-center"> {/* Adjusted gap */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton style={{ width: '280px', height: '400px' }} className="rounded-lg bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeckViewPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById, isLoading: projectsLoading } = useProjects(); // Use only project-related hooks
  const { isLoading: templatesLoading, getTemplateById, templates } = useTemplates(); // Use template-related hooks from useTemplates
  const [project, setProject] = useState<Project | undefined | null>(undefined); // null for not found, undefined for loading

  const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;

  useEffect(() => {
    if (projectsLoading) {
      setProject(undefined); // Still loading projects
      return;
    }
    if (projectId) {
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null); // Set to null if not found after loading
      console.log("Project loaded:", foundProject);
    } else {
      setProject(null); // No projectId, so project not found
    }
    console.log("[DEBUG] DeckViewPage: Templates from context:", templates);

    // Removed return statements with JSX from here.
    // The rendering logic based on project, projectsLoading, and templatesLoading
    // is now handled outside this useEffect.

    if (project === undefined || projectsLoading || templatesLoading) {
      return <DeckViewLoadingSkeleton />;
    }

    if (project === null) {
      return (
        <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The project you're looking for doesn't exist or could not be loaded.
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/project/${project.id}/editor`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center">
          <LayoutGrid className="mr-3 h-7 w-7 text-primary" />
          Deck View: {project.name}
        </h1>
        <p className="text-muted-foreground mb-8">
          Viewing all {project.cards.length} card(s) in this project. This is a read-only view.
        </p>

        {(!project.cards || !Array.isArray(project.cards) || project.cards.length === 0) && !projectsLoading ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">This project has no cards yet.</p>
            <Button variant="secondary" asChild className="mt-4">
              <Link href={`/project/${project.id}/editor`}>Add Cards in Editor</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-2.5 gap-y-6 place-items-center">
            {project.cards.map((card) => {
              let template = undefined;
              try {
                template = getTemplateById(card.templateId);
              } catch (error) {
                console.error(`Error getting template for card ${card.id} with templateId ${card.templateId}:`, error);
                // Optionally, you could set template to null or a default error template here
              }
              // Keep the console logs for debugging if needed, or remove them if not necessary
              // console.log("Card:", card);
              console.log("Template found:", template);

              return (
                <div
                  key={card.id}
                  className="relative transform hover:scale-105 hover:z-10 transition-transform duration-200"
                >
                  {template ? (
                    <DynamicCardRenderer card={card} template={template} />
                  ) : (
                    <div className="w-[280px] h-[400px] border border-destructive bg-destructive/10 flex items-center justify-center p-4 text-center rounded-lg shadow-md">Template "{card.templateId}" not found.</div>
                  )}
                </div>);
            })}
          </div>
        )}
      </div>
    );
  }
}

