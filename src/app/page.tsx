import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

// Mock data for projects - replace with actual data fetching later
const mockProjects: Project[] = [
  {
    id: 'project-alpha',
    name: 'Alpha Beasts',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'fantasy creature',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'project-beta',
    name: 'Cyber Spells',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'abstract technology',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
  },
  {
    id: 'project-gamma',
    name: 'Medieval Items',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'medieval weapon',
    lastModified: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
      {mockProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-muted-foreground">No projects yet.</h2>
          <p className="text-muted-foreground mt-2">Get started by creating a new project.</p>
          <Button className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
}
