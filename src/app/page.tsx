
"use client"; // Mark as client component because it uses ProjectContext

import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext'; // Import useProjects
import { Skeleton } from '@/components/ui/skeleton';

// Mock data for projects - this will now primarily serve as SEED DATA for ProjectContext
// if localStorage is empty. The page itself will consume projects from the context.
export const mockProjects: Project[] = [
  {
    id: 'project-alpha',
    name: 'Alpha Beasts',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'fantasy creature',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    associatedTemplateIds: ['creature', 'spell', 'generic'],
    cards: [ // Example card data for this project
        { id: 'card-alpha-1', templateId: 'creature', name: 'Alpha Wolf', description: 'A leader of the pack.', cost: 3, attack: 3, defense: 2, imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'wolf illustration' },
        { id: 'card-alpha-2', templateId: 'spell', name: 'Nature\'s Call', description: 'Summon a beast.', cost: 2, effectText: 'Search your deck for a creature card.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'forest magic' },
    ]
  },
  {
    id: 'project-beta',
    name: 'Cyber Spells',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'abstract technology',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    associatedTemplateIds: ['spell', 'item', 'generic'],
    cards: [
        { id: 'card-beta-1', templateId: 'spell', name: 'Overload', description: 'Deal damage to all enemies.', cost: 5, effectText: 'Deals 3 damage to all opponent creatures.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'electric shock' },
    ]
  },
  {
    id: 'project-gamma',
    name: 'Medieval Items',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'medieval weapon',
    lastModified: new Date().toISOString(),
    associatedTemplateIds: ['item', 'creature', 'generic'],
    cards: [
        { id: 'card-gamma-1', templateId: 'item', name: 'Knight\'s Shield', description: 'A sturdy shield.', cost: 2, effectText: 'Target creature gets +0/+2.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'metal shield' },
    ]
  },
];


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
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
        <Button> {/* This button's functionality (creating new project) will need ProjectContext integration */}
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
          <Button className="mt-4"> {/* This button's functionality will also need ProjectContext integration */}
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
}
