
"use client"; // Changed to client component to use ProjectContext

import LiveEditorClientPage from '@/components/editor/live-editor-client-page';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EditorProjectData, Project } from '@/lib/types';
import { useProjects } from '@/contexts/ProjectContext';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface EditorPageProps {
  // params are no longer needed via props if using useParams hook
}

// This server-side data fetching (getProjectData) is replaced by client-side context fetching.
// async function getProjectData(projectId: string): Promise<EditorProjectData> { ... }


export default function EditorPage({ }: EditorPageProps) {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;
  
  const { getProjectById, isLoading: projectsLoading } = useProjects();
  const [projectData, setProjectData] = useState<Project | EditorProjectData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectsLoading && projectId) {
      const foundProject = getProjectById(projectId);
      if (foundProject) {
        // Map to EditorProjectData if necessary, or ensure Project type is directly usable
        // For now, assuming Project from context includes 'cards' and 'associatedTemplateIds'
        setProjectData({
            id: foundProject.id,
            name: foundProject.name,
            cards: foundProject.cards || [], // Ensure cards array exists
            associatedTemplateIds: foundProject.associatedTemplateIds || [], // Ensure associatedTemplateIds exists
        });
      } else if (projectId === 'new-project') { // Handle "new-project" case explicitly if desired
        setProjectData({
            id: 'new-project', // Consider generating a unique ID here or on save
            name: 'New Project',
            cards: [
              { 
                id: `card-${Date.now()}`,
                templateId: 'generic',
                name: 'My First Card',
                description: 'This is a generic card. Change its template and edit its properties!',
                imageUrl: 'https://placehold.co/280x400.png',
                dataAiHint: 'card game concept',
              }
            ],
            associatedTemplateIds: ['generic', 'creature'],
          });
      } else {
        setError(`Project with ID "${projectId}" not found.`);
        setProjectData(undefined); // Clear any previous project data
      }
    }
  }, [projectId, projectsLoading, getProjectById]);

  if (projectsLoading) {
    return <EditorLoadingSkeleton title="Loading project data..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-destructive">
        <h2 className="text-xl font-semibold">Error Loading Project</h2>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!projectData && !projectsLoading) { // Case where project ID is invalid or not 'new-project' after loading
     return <EditorLoadingSkeleton title={`Project "${projectId}" not found or not yet loaded.`} showContentSkeleton={false} />;
  }


  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      <Suspense fallback={<EditorLoadingSkeleton title="Initializing Editor..." />}>
        {projectData ? (
          // Ensure the projectData passed to LiveEditorClientPage matches EditorProjectData type
          <LiveEditorClientPage initialProjectData={projectData as EditorProjectData} />
        ) : (
          // This state should ideally be covered by the loading/error states above
          <EditorLoadingSkeleton title="Preparing editor..." />
        )}
      </Suspense>
    </div>
  );
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
