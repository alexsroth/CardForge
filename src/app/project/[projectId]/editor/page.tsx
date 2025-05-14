
import LiveEditorClientPage from '@/components/editor/live-editor-client-page';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { CardData, EditorProjectData, CardTemplateId } from '@/lib/types'; // Import EditorProjectData
import { CARD_TEMPLATE_IDS } from '@/lib/card-templates'; // Import card template IDs

interface EditorPageProps {
  params: {
    projectId: string;
  };
}

// Mock project data fetching - replace with actual data source later
async function getProjectData(projectId: string): Promise<EditorProjectData> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  const defaultCards: CardData[] = [
    { id: 'card-1', templateId: 'creature', name: 'Grizzly Bear', description: '', flavorText: 'A fearsome bear from the northern wilds.', cost: 2, attack: 2, defense: 2, imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'bear illustration', effectText: 'Roars loudly when it enters the battlefield.' , rarity: 'common'},
    { id: 'card-2', templateId: 'spell', name: 'Fireball', description: '', flavorText: 'Hotter than a summer day.', cost: 3, effectText: 'Deals 3 damage to any target.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'fire magic', rarity: 'uncommon' },
    { id: 'card-3', templateId: 'item', name: 'Healing Potion', description: '', flavorText: 'Gulp it down!', cost: 1, effectText: 'Heal 2 damage from a creature or player.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'potion bottle', rarity: 'common' },
  ];
  
  if (projectId === 'new-project') { 
    return {
      id: 'new-project',
      name: 'New Project',
      cards: [
        { 
          id: `card-${Date.now()}`,
          templateId: 'generic', // Ensure new cards start with a valid default template
          name: 'My First Card',
          description: 'This is a generic card. Change its template and edit its properties!',
          imageUrl: 'https://placehold.co/280x400.png',
          dataAiHint: 'card game concept',
        }
      ],
      associatedTemplateIds: ['generic', 'creature'], // Example: new projects can use generic and creature
    };
  }
  
  // Example project data matching mockProjects in app/page.tsx for consistency
  if (projectId === 'project-alpha') {
    return {
      id: 'project-alpha',
      name: 'Alpha Beasts Deck',
      cards: defaultCards,
      associatedTemplateIds: ['creature', 'spell', 'generic'],
    };
  }
  if (projectId === 'project-beta') {
    return {
      id: 'project-beta',
      name: 'Cyber Spells Deck',
      cards: [ /* different set of cards or filter defaultCards */ 
        { id: 'card-cb1', templateId: 'spell', name: 'Plasma Bolt', description: '', flavorText: 'Zap!', cost: 2, effectText: 'Deals 2 damage, draws a card.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'energy blast', rarity: 'common'},
        { id: 'card-cb2', templateId: 'item', name: 'Cybernetic Arm', description: '', flavorText: 'Enhance your reach.', cost: 4, effectText: '+2 Attack to equipped creature.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'robotic arm', rarity: 'uncommon' },
      ],
      associatedTemplateIds: ['spell', 'item', 'generic'],
    };
  }
   if (projectId === 'project-gamma') {
    return {
      id: 'project-gamma',
      name: 'Medieval Items Deck',
      cards: [
        { id: 'card-mg1', templateId: 'item', name: 'Longsword', description: '', flavorText: 'A trusty blade.', cost: 3, effectText: 'Equipped creature gets +2/+1.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'sword medieval', rarity: 'common'},
      ],
      associatedTemplateIds: ['item', 'creature', 'generic'],
    };
  }

  // Default fallback or error handling for other project IDs
  return {
    id: projectId,
    name: `Project ${projectId}`,
    cards: [ 
        {
          id: `card-default-${Date.now()}`,
          templateId: 'generic', // Default to generic
          name: 'Sample Card',
          description: 'This is a sample card for this project.',
          imageUrl: 'https://placehold.co/280x400.png',
          dataAiHint: 'sample abstract',
        }
    ],
    associatedTemplateIds: ['generic'], // Fallback project only gets generic
  };
}


export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = params;
  const initialProjectData = await getProjectData(projectId);

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden"> {/* Adjust height based on header */}
       <Suspense fallback={<EditorLoadingSkeleton />}>
        <LiveEditorClientPage initialProjectData={initialProjectData} />
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
