
"use client";

import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertTriangle, LibrarySquare } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext'; // Import useTemplates
import type { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import CreateProjectDialog from '@/components/project/create-project-dialog';
import EditProjectDialog from '@/components/project/edit-project-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function DashboardLoadingSkeleton() {
  // console.log('[DEBUG] DashboardPage/DashboardLoadingSkeleton: Rendering skeleton.');
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
      <div className="p-3 border-t flex items-center justify-between">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )
}


export default function DashboardPage() {
  const { projects, isLoading: projectsLoading, addProject, updateProject, deleteProject, getProjectById } = useProjects();
  const { templates, isLoading: templatesLoading } = useTemplates(); // Fetch templates
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // console.log('[DEBUG] DashboardPage: Rendering. Projects loading:', projectsLoading, 'Templates loading:', templatesLoading, 'Templates count:', templates.length);

  const handleCreateProject = async (projectName: string, associatedTemplateIds: CardTemplateId[]) => {
    // console.log('[DEBUG] DashboardPage/handleCreateProject: Attempting to create project', projectName, 'with templates:', associatedTemplateIds);
    if (!projectName.trim()) {
      toast({
        title: "Project Name Required",
        description: "Please enter a name for your new project.",
        variant: "destructive",
      });
      return;
    }
    if (templates.length === 0 && associatedTemplateIds.length === 0) {
        toast({
            title: "No Templates Selected",
            description: "Please select at least one template to associate with the project, or create a template first if none exist.",
            variant: "destructive"
        });
        // Note: The CreateProjectDialog already prevents submission if no global templates exist and none are selected.
        // This is an additional safeguard.
    }


    const result = await addProject({ name: projectName, associatedTemplateIds });
    if (result.success && result.newProject) {
      toast({
        title: "Project Created!",
        description: `Project "${result.newProject.name}" has been successfully created.`,
      });
      setIsCreateProjectDialogOpen(false);
      // console.log('[DEBUG] DashboardPage/handleCreateProject: Success - Navigating to editor for project ID:', result.newProject.id);
      router.push(`/project/${result.newProject.id}/editor`);
    } else {
      toast({
        title: "Creation Failed",
        description: result.message || "Could not create the project.",
        variant: "destructive",
      });
      console.error('[DEBUG] DashboardPage/handleCreateProject: Failed -', result.message);
    }
  };

  const handleOpenEditDialog = (project: Project) => {
    // console.log('[DEBUG] DashboardPage/handleOpenEditDialog: Editing project', project.id);
    setProjectToEdit(project);
    setIsEditProjectDialogOpen(true);
  };

  const handleEditProject = async (updatedData: Partial<Omit<Project, 'id' | 'cards' | 'lastModified' | 'associatedTemplateIds'>>) => {
    // console.log('[DEBUG] DashboardPage/handleEditProject: Attempting to edit project', projectToEdit?.id, 'with data', updatedData);
    if (!projectToEdit) return;

    const fullProjectData = getProjectById(projectToEdit.id);
    if (!fullProjectData) {
      toast({ title: "Error", description: "Original project data not found.", variant: "destructive" });
      console.error('[DEBUG] DashboardPage/handleEditProject: Original project data not found for ID:', projectToEdit.id);
      return;
    }

    const projectWithUpdates: Project = {
      ...fullProjectData,
      name: updatedData.name || fullProjectData.name,
      thumbnailUrl: updatedData.thumbnailUrl || fullProjectData.thumbnailUrl,
      dataAiHint: updatedData.dataAiHint || fullProjectData.dataAiHint,
    };

    const result = await updateProject(projectWithUpdates);
    if (result.success) {
      toast({
        title: "Project Updated!",
        description: `Project "${projectWithUpdates.name}" has been successfully updated.`,
      });
      setIsEditProjectDialogOpen(false);
      setProjectToEdit(null);
      // console.log('[DEBUG] DashboardPage/handleEditProject: Success - Project updated', projectToEdit.id);
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update the project.",
        variant: "destructive",
      });
      console.error('[DEBUG] DashboardPage/handleEditProject: Failed -', result.message);
    }
  };

  const handleOpenDeleteDialog = (project: Project) => {
    // console.log('[DEBUG] DashboardPage/handleOpenDeleteDialog: Deleting project', project.id);
    setProjectToDelete(project);
    setIsDeleteProjectDialogOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    // console.log('[DEBUG] DashboardPage/handleConfirmDeleteProject: Confirmed delete for project', projectToDelete?.id);
    if (!projectToDelete) return;
    const result = await deleteProject(projectToDelete.id);
    if (result.success) {
      toast({
        title: "Project Deleted",
        description: result.message,
      });
      // console.log('[DEBUG] DashboardPage/handleConfirmDeleteProject: Success - Project deleted', projectToDelete.id);
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message,
        variant: "destructive",
      });
      console.error('[DEBUG] DashboardPage/handleConfirmDeleteProject: Failed -', result.message);
    }
    setIsDeleteProjectDialogOpen(false);
    setProjectToDelete(null);
  };

  const canCreateProject = !templatesLoading && templates.length > 0;

  if (projectsLoading || templatesLoading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <Button onClick={() => setIsCreateProjectDialogOpen(true)} disabled={!canCreateProject} title={!canCreateProject ? "Please create a card template first" : "Create a new project"}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {!canCreateProject && !projectsLoading && (
          <Alert variant="default" className="mb-6 bg-accent/10 border-accent/30">
            <LibrarySquare className="h-4 w-4 text-accent" />
            <AlertTitle className="text-accent">No Card Templates Found</AlertTitle>
            <AlertDescription className="text-accent/90">
              You need to define at least one card template before you can create a project.
              <Link href="/templates/new" className="font-semibold underline hover:text-accent ml-1">
                Create a template now.
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEditDetailsClick={() => handleOpenEditDialog(project)}
                onDeleteProjectClick={() => handleOpenDeleteDialog(project)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium text-muted-foreground">No projects yet.</h2>
            <p className="text-muted-foreground mt-2">
              {canCreateProject ? "Get started by creating a new project." : "Create a card template first, then you can create a project."}
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                if (canCreateProject) {
                  setIsCreateProjectDialogOpen(true);
                } else {
                  router.push('/templates/new');
                }
              }}
              title={!canCreateProject ? "Go to Template Designer" : "Create your first project"}
            >
              {canCreateProject ? (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Project
                </>
              ) : (
                <>
                  <LibrarySquare className="mr-2 h-4 w-4" />
                  Go Create a Template
                </>
              )}
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
      {projectToDelete && (
        <AlertDialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project
                "{projectToDelete.name}" and all its associated cards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteProject}>
                Yes, delete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
