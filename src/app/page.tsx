
"use client"; 

import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext'; 
import { Skeleton } from '@/components/ui/skeleton';
import CreateProjectDialog from '@/components/project/create-project-dialog'; // Import the dialog
import { useState } from 'react';
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
          <Card key={i} className="flex flex-col overflow-hidden">
            <Skeleton className="aspect-[3/2] w-full" />
            <CardContent className="p-4 flex-grow">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter className="p-4 border-t">
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
// Dummy Card and CardContent for Skeleton
const Card = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={className}>{children}</div>;
const CardContent =  ({className, children}: {className?: string, children: React.ReactNode}) => <div className={className}>{children}</div>;
const CardFooter =  ({className, children}: {className?: string, children: React.ReactNode}) => <div className={className}>{children}</div>;


export default function DashboardPage() {
  const { projects, isLoading, addProject } = useProjects();
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
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
              <ProjectCard key={project.id} project={project} />
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
    </>
  );
}
