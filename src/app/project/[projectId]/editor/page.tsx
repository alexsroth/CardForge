
"use client";

import LiveEditorClientPage from '@/components/editor/live-editor-client-page';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EditorProjectData, Project } from '@/lib/types';
import { useProjects } from '@/contexts/ProjectContext';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface EditorPageProps {
  // params are no longer needed via props if using useParams hook
}

export default function EditorPage({ }: EditorPageProps) {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;

  const { getProjectById, isLoading: projectsLoading } = useProjects();
  const [projectData, setProjectData] = useState<EditorProjectData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'loaded' | 'error' | 'not_found'>('loading');

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing from the URL.");
      setPageStatus('error');
      return;
    }

    if (projectsLoading) {
      setPageStatus('loading');
      return;
    }
    
    // The "new-project" case is largely obsolete due to direct navigation with real IDs.
    // Kept for robustness if somehow encountered.
    if (projectId === 'new-project') {
        toast({
            title: "Create a New Project",
            description: "Please use the 'New Project' button on the dashboard to start.",
            variant: "default",
        });
        router.push('/');
        return;
    }

    const foundProject = getProjectById(projectId);

    if (foundProject) {
      const currentEditorData: EditorProjectData = {
        id: foundProject.id,
        name: foundProject.name,
        cards: foundProject.cards || [],
        associatedTemplateIds: foundProject.associatedTemplateIds || [],
      };

      // Only update projectData state if the actual data has changed
      // This prevents re-renders if foundProject reference changes but content is the same for these fields
      if (
        !projectData ||
        projectData.id !== currentEditorData.id || // Should only change if projectId changes
        projectData.name !== currentEditorData.name ||
        projectData.cards !== currentEditorData.cards || // Compare references; context ensures new ref on change
        projectData.associatedTemplateIds !== currentEditorData.associatedTemplateIds // Compare references
      ) {
        setProjectData(currentEditorData);
      }
      setPageStatus('loaded');
      setError(null);
    } else {
      // Project not found for the given projectId, and projects are loaded
      setError(`Project with ID "${projectId}" not found.`);
      setProjectData(undefined); // Clear any existing project data
      setPageStatus('not_found');
    }
  }, [projectId, projectsLoading, getProjectById, router, toast, projectData]); // projectData added to dependencies

  if (pageStatus === 'loading') {
    return <EditorLoadingSkeleton title="Loading project data..." />;
  }

  if (pageStatus === 'error' || pageStatus === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-destructive">
        <h2 className="text-xl font-semibold">{pageStatus === 'error' ? "Error Loading Project" : "Project Not Found"}</h2>
        <p>{error || `The project with ID "${projectId}" could not be found or is still loading.`}</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  // If projectData is loaded and status is 'loaded'
  if (projectData && pageStatus === 'loaded') {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
        <Suspense fallback={<EditorLoadingSkeleton title="Initializing Editor..." />}>
          <LiveEditorClientPage initialProjectData={projectData} />
        </Suspense>
      </div>
    );
  }
  
  // Fallback for any other unexpected state, though above conditions should cover all.
  return <EditorLoadingSkeleton title={`Preparing editor for project "${projectId}"...`} showContentSkeleton={false} />;
}


function EditorLoadingSkeleton({ title = "Loading Editor...", showContentSkeleton = true }: { title?: string, showContentSkeleton?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground mb-6">{title}</p>
      {showContentSkeleton && (
        <div className="flex w-full h-full max-w-6xl border rounded-lg shadow overflow-hidden">
          {/* Left Panel Skeleton */}
          <div className="w-1/3 lg:w-1/4 border-r p-4 space-y-4 bg-card">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          </div>
          {/* Right Panel Skeleton */}
          <div className="flex-grow p-4 flex flex-col items-center justify-center bg-muted/30">
            <Skeleton className="h-10 w-1/2 mb-4" />
            <Skeleton style={{ width: '280px', height: '400px' }} className="rounded-lg bg-card" />
          </div>
        </div>
      )}
    </div>
  );
}
