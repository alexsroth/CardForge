import LiveEditorClientPage from '@/components/editor/live-editor-client-page';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface EditorPageProps {
  params: {
    projectId: string;
  };
}

// Mock project data fetching - replace with actual data source later
async function getProjectData(projectId: string) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500)); 
  if (projectId === 'new-project') { // Example for a new, empty project
    return {
      id: 'new-project',
      name: 'New Project',
      cards: [],
    };
  }
  // For existing projects, you would fetch from a database or file
  // For this example, let's return some mock data for a specific ID
  if (projectId === 'project-alpha') {
    return {
      id: 'project-alpha',
      name: 'Alpha Beasts Deck',
      cards: [
        { id: 'card-1', templateId: 'creature', name: 'Grizzly Bear', description: 'A fearsome bear from the northern wilds.', cost: 2, attack: 2, defense: 2, imageUrl: 'https://placehold.co/280x400.png?text=Bear', dataAiHint: 'bear illustration' },
        { id: 'card-2', templateId: 'spell', name: 'Fireball', description: 'Hurls a searing ball of fire.', cost: 3, effectText: 'Deals 3 damage to any target.', imageUrl: 'https://placehold.co/280x400.png?text=Fireball', dataAiHint: 'fire magic' },
        { id: 'card-3', templateId: 'item', name: 'Healing Potion', description: 'Restores a small amount of health.', cost: 1, effectText: 'Heal 2 damage from a creature or player.', imageUrl: 'https://placehold.co/280x400.png?text=Potion', dataAiHint: 'potion bottle' },
      ],
    };
  }
  // Default fallback or error handling
  return {
    id: projectId,
    name: `Project ${projectId}`,
    cards: [],
  };
}


export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = params;
  const initialDeckData = await getProjectData(projectId);

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden"> {/* Adjust height based on header */}
       <Suspense fallback={<EditorLoadingSkeleton />}>
        <LiveEditorClientPage initialDeckData={initialDeckData} />
      </Suspense>
    </div>
  );
}

function EditorLoadingSkeleton() {
  return (
    <div className="flex h-full">
      {/* Left Panel Skeleton */}
      <div className="w-1/3 lg:w-1/4 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-1/2" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
      {/* Right Panel Skeleton */}
      <div className="flex-grow p-4 flex flex-col items-center justify-center">
         <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton style={{ width: '280px', height: '400px' }} className="rounded-lg" />
      </div>
    </div>
  );
}
