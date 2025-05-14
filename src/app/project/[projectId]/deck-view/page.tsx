
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '@/contexts/ProjectContext';
import type { Project } from '@/lib/types';
import CardRenderer from '@/components/editor/card-renderer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function DeckViewLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-48 mb-2" /> {/* Back to Editor Button Skeleton */}
      <Skeleton className="h-10 w-3/4 mb-8" /> {/* Project Name Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
  const { getProjectById, isLoading: projectsLoading } = useProjects();
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
    } else {
      setProject(null); // No projectId, so project not found
    }
  }, [projectId, getProjectById, projectsLoading]);

  if (project === undefined || projectsLoading) {
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

      {project.cards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">This project has no cards yet.</p>
           <Button variant="secondary" asChild className="mt-4">
            <Link href={`/project/${project.id}/editor`}>
              Add Cards in Editor
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8 place-items-center">
          {project.cards.map((card) => (
            <div key={card.id} className="transform hover:scale-105 transition-transform duration-200">
              <CardRenderer card={card} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
    