
"use client"; 

import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext'; 
import type { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import CreateProjectDialog from '@/components/project/create-project-dialog';
import EditProjectDialog from '@/components/project/edit-project-dialog'; // Import EditProjectDialog
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <Skeleton className="aspect-[3/2] w-full" />
      <div className="p-4 flex-grow">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-3" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="p-3 border-t grid grid-cols-2 gap-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}


export default function DashboardPage() {
  const { projects, isLoading, addProject, updateProject, getProjectById } = useProjects();
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateProject = async (projectName: string) => {
    if (!projectName.trim()) {
      toast({
        title: "Project Name Required",
        description: "Please enter a name for your new project.",
        variant: "destructive",
      });
      return;
    }

    const result = await addProject({ name: projectName });
    if (result.success && result.newProject) {
      toast({
        title: "Project Created!",
        description: `Project "${result.newProject.name}" has been successfully created.`,
      });
      setIsCreateProjectDialogOpen(false);
      router.push(`/project/${result.newProject.id}/editor`);
    } else {
      toast({
        title: "Creation Failed",
        description: result.message || "Could not create the project.",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditDialog = (project: Project) => {
    setProjectToEdit(project);
    setIsEditProjectDialogOpen(true);
  };

  const handleEditProject = async (updatedData: Partial<Omit<Project, 'id' | 'cards' | 'lastModified' | 'associatedTemplateIds'>>) => {
    if (!projectToEdit) return;

    // Retrieve the full project data from context to ensure we don't overwrite cards or other non-editable fields
    const fullProjectData = getProjectById(projectToEdit.id);
    if (!fullProjectData) {
      toast({ title: "Error", description: "Original project data not found.", variant: "destructive" });
      return;
    }

    const projectWithUpdates: Project = {
      ...fullProjectData, // Start with all original data
      name: updatedData.name || fullProjectData.name,
      thumbnailUrl: updatedData.thumbnailUrl || fullProjectData.thumbnailUrl,
      dataAiHint: updatedData.dataAiHint || fullProjectData.dataAiHint,
      // lastModified will be updated by the updateProject function in the context
    };

    const result = await updateProject(projectWithUpdates);
    if (result.success) {
      toast({
        title: "Project Updated!",
        description: `Project "${projectWithUpdates.name}" has been successfully updated.`,
      });
      setIsEditProjectDialogOpen(false);
      setProjectToEdit(null);
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update the project.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <Button onClick={() => setIsCreateProjectDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onEditDetailsClick={() => handleOpenEditDialog(project)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-muted-foreground">No projects yet.</h2>
            <p className="text-muted-foreground mt-2">Get started by creating a new project.</p>
            <Button className="mt-4" onClick={() => setIsCreateProjectDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </div>
        )}
      </div>
      <CreateProjectDialog
        isOpen={isCreateProjectDialogOpen}
        onClose={() => setIsCreateProjectDialogOpen(false)}
        onSubmit={handleCreateProject}
      />
      {projectToEdit && (
        <EditProjectDialog
          isOpen={isEditProjectDialogOpen}
          onClose={() => {
            setIsEditProjectDialogOpen(false);
            setProjectToEdit(null);
          }}
          onSubmit={handleEditProject}
          projectToEdit={projectToEdit}
        />
      )}
    </>
  );
}
