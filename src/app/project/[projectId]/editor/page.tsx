
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

  const { projects, isLoading: projectsLoading } = useProjects(); // Get projects array directly
  const [projectData, setProjectData] = useState<EditorProjectData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'loaded' | 'error' | 'not_found'>('loading');

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing from the URL.");
      setPageStatus('error');
      toast({ title: "Error", description: "Project ID missing.", variant: "destructive" });
      router.push('/'); // Redirect if no project ID
      return;
    }

    if (projectsLoading) {
      setPageStatus('loading');
      return;
    }
    
    const foundProject = projects.find(p => p.id === projectId);

    if (foundProject) {
      // Pass the latest foundProject data to LiveEditorClientPage.
      // LiveEditorClientPage's internal useEffect will handle whether to fully re-initialize
      // or just update parts like name/associatedTemplates based on its own editorProjectId state.
      setProjectData({
        id: foundProject.id,
        name: foundProject.name,
        cards: foundProject.cards || [], 
        associatedTemplateIds: foundProject.associatedTemplateIds || [],
      });
      setPageStatus('loaded');
      setError(null);
    } else {
      // This means the project ID is in the URL, but no such project exists in the context
      setError(`Project with ID "${projectId}" not found.`);
      setProjectData(undefined); 
      setPageStatus('not_found');
    }
  // Key dependencies:
  // - projectId: If the route changes to a new project.
  // - projectsLoading: To wait until projects are loaded from context.
  // - projects: The actual array of projects. If this array reference changes in the context
  //   (e.g., a project was updated), this effect should re-run to get the latest data for `foundProject`.
  }, [projectId, projectsLoading, projects, router, toast]);


  if (pageStatus === 'loading') {
    return <EditorLoadingSkeleton title="Loading project data..." />;
  }

  if (pageStatus === 'error' || pageStatus === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-destructive">
        <h2 className="text-xl font-semibold">{pageStatus === 'error' ? "Error Loading Project" : "Project Not Found"}</h2>
        <p>{error || `The project with ID "${projectId}" could not be found.`}</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (projectData && pageStatus === 'loaded') {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
        <Suspense fallback={<EditorLoadingSkeleton title="Initializing Editor..." />}>
          {/* Pass projectData which will serve as initialProjectData */}
          <LiveEditorClientPage initialProjectData={projectData} />
        </Suspense>
      </div>
    );
  }
  
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

