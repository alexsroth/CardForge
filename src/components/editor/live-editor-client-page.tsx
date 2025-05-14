
"use client";

import type { EditorProjectData, CardData, CardTemplateId, Project } from '@/lib/types';
import { NEW_CARD_TEMPLATE_ID_PLACEHOLDER } from '@/lib/types';
import { useState, useEffect, useCallback, useRef } from 'react';
import CardListPanel from './card-list-panel';
import CardDetailPanel from './card-detail-panel';
import CardPreviewPanel from './card-preview-panel';
import DataControls from './data-controls';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { generateCardNameAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/contexts/ProjectContext'; 

interface LiveEditorClientPageProps {
  initialProjectData: EditorProjectData; 
}

function EditorClientPageSkeleton() {
  return (
    <div className="flex h-full bg-muted/40">
      {/* Left Panel Skeleton */}
      <div className="w-[550px] flex flex-col border-r bg-background">
        <div className="p-4 border-b">
          <Skeleton className="h-7 w-1/2 mb-3" /> {/* Deck Name Placeholder */}
          <div className="flex gap-2"> {/* DataControls Placeholder */}
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex flex-grow min-h-0">
          {/* Card List Panel Skeleton */}
          <div className="w-[250px] border-r flex flex-col bg-card">
            <div className="p-3 border-b">
              <Skeleton className="h-9 w-full" /> {/* Add Card Button Placeholder */}
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-2 space-y-1">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)} {/* Card List Item Placeholders */}
              </div>
            </ScrollArea>
          </div>
          <Separator orientation="vertical" />
          {/* Card Detail Panel Skeleton */}
          <div className="flex-grow p-1"> 
            <div className="p-3"> 
              <Skeleton className="h-6 w-3/4 mb-4" /> 
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right Panel Skeleton: Card Preview */}
      <div className="flex-grow bg-muted/20 flex flex-col items-center justify-center p-4 md:p-8 min-h-full">
         <Skeleton className="h-10 w-1/2 mb-4" /> 
        <Skeleton style={{ width: '280px', height: '400px' }} className="rounded-lg" /> 
      </div>
    </div>
  );
}


export default function LiveEditorClientPage({ initialProjectData }: LiveEditorClientPageProps) {
  const { updateProject, getProjectById } = useProjects(); 
  const [editorProjectId, setEditorProjectId] = useState<string>(initialProjectData.id);
  const [projectName, setProjectName] = useState<string>(initialProjectData.name);
  const [cards, setCards] = useState<CardData[]>(initialProjectData.cards || []);
  const [associatedTemplateIds, setAssociatedTemplateIds] = useState<CardTemplateId[]>(initialProjectData.associatedTemplateIds || []);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialCardsRef = useRef<CardData[] | null>(null); 

  useEffect(() => {
    setIsMounted(true);
    initialCardsRef.current = initialProjectData.cards || [];
     // Select the first card if available, after initial mount and data load
    if (initialProjectData.cards && initialProjectData.cards.length > 0 && !selectedCardId) {
      setSelectedCardId(initialProjectData.cards[0].id);
    }
  }, [initialProjectData.id]); // Rerun only if project ID changes, initial select logic moved from effect below

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (initialProjectData.id !== editorProjectId) {
      // Switched to a new project
      setEditorProjectId(initialProjectData.id);
      setProjectName(initialProjectData.name);
      const currentCards = initialProjectData.cards || [];
      setCards(currentCards);
      initialCardsRef.current = currentCards;
      setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);
      setSelectedCardId(currentCards.length > 0 && currentCards[0]?.id ? currentCards[0].id : null);
    } else {
      // Potentially an update to the current project's metadata (name, associated templates)
      // from context, but not the cards themselves if editor is active.
      setProjectName(initialProjectData.name);
      setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);
      // Critical: Do not reset 'cards' or 'selectedCardId' here if editorProjectId is the same.
      // This component's internal 'cards' state is the source of truth while editing.
      // If initialProjectData.cards is different, it implies an external update.
      // A more sophisticated merge or conflict resolution might be needed for a multi-user scenario.
      // For single-user, we assume this component's 'cards' state is king.
    }
  }, [initialProjectData, editorProjectId]);


  // Debounced save effect
  useEffect(() => {
    if (!isMounted || !editorProjectId) { // Ensure project ID is set
      return; 
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const projectToUpdate = getProjectById(editorProjectId); // Get the latest version from context
      if (projectToUpdate) {
        // Construct the full project object to save, ensuring all parts are current
        const updatedFullProject: Project = {
          ...projectToUpdate, // Start with current project data from context (includes ID, potentially other metadata)
          name: projectName,  // Use current editor's project name state
          cards: cards,       // Use current editor's cards state
          associatedTemplateIds: associatedTemplateIds, // Use current editor's associated templates state
          // lastModified will be updated by updateProject in context
        };
        updateProject(updatedFullProject).then(result => {
          if (!result.success) {
            toast({ title: "Save Error", description: `Failed to save project changes: ${result.message}`, variant: "destructive" });
          }
          // else {
          //   toast({ title: "Project Saved", description: "Changes saved to local storage." });
          // }
        });
      } else {
        console.warn(`Debounced save: Project with ID ${editorProjectId} not found in context.`);
      }
    }, 750); 

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cards, projectName, associatedTemplateIds, editorProjectId, getProjectById, updateProject, toast, isMounted]);
  

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const handleUpdateCard = useCallback((updatedCard: CardData) => {
    setCards(prevCards => 
      prevCards.map(card => card.id === updatedCard.id ? updatedCard : card)
    );
  }, []);

  const handleAddCard = useCallback(() => {
    const newCardId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCard: CardData = {
      id: newCardId,
      templateId: NEW_CARD_TEMPLATE_ID_PLACEHOLDER, // Special placeholder ID
      name: 'Untitled Card', // Generic name for newly added cards
      description: '', // Minimal initial data
      imageUrl: 'https://placehold.co/280x400.png',
      dataAiHint: 'new card concept',
    };
    setCards(prevCards => [...prevCards, newCard]);
    setSelectedCardId(newCardId);
  }, []);

  const handleDeleteCard = useCallback((cardIdToDelete: string) => {
    setCards(currentCards => {
      const newCardsList = currentCards.filter(card => card.id !== cardIdToDelete);
      if (selectedCardId === cardIdToDelete) {
        setSelectedCardId(newCardsList.length > 0 ? newCardsList[0].id : null);
      }
      return newCardsList;
    });
  }, [selectedCardId]);
  
  const handleGenerateName = useCallback(async (description: string): Promise<string> => {
    if (!description.trim()) {
      toast({ title: "Cannot generate name", description: "Card description is empty.", variant: "destructive" });
      return '';
    }
    setIsLoadingName(true);
    try {
      const name = await generateCardNameAction({ cardDescription: description });
      toast({ title: "Name Generated!", description: `Suggested name: ${name}` });
      return name;
    } catch (error) {
      console.error("Failed to generate name:", error);
      toast({ title: "Error", description: "Could not generate card name.", variant: "destructive" });
      return '';
    } finally {
      setIsLoadingName(false);
    }
  }, [toast]);

  const handleImportData = useCallback((importedCards: CardData[]) => {
    const validImportedCards = importedCards.map(card => ({
      ...card,
      templateId: associatedTemplateIds.includes(card.templateId as CardTemplateId) // cast because imported wont be placeholder
                    ? card.templateId as CardTemplateId
                    : (associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic')
    }));
    setCards(validImportedCards);
    setSelectedCardId(validImportedCards.length > 0 ? validImportedCards[0].id : null);
    toast({ title: "Data Imported", description: `${validImportedCards.length} cards loaded.` });
  }, [toast, associatedTemplateIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setCards((prevCards) => {
        const oldIndex = prevCards.findIndex((card) => card.id === active.id);
        const newIndex = prevCards.findIndex((card) => card.id === over.id);
        return arrayMove(prevCards, oldIndex, newIndex);
      });
    }
  }, []);

  if (!isMounted) {
    return <EditorClientPageSkeleton />;
  }

  const selectedEditorCard = cards.find(card => card.id === selectedCardId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex h-full bg-muted/40">
        <div className="w-[550px] flex flex-col border-r bg-background">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">{projectName}</h2>
             <DataControls cards={cards} onImport={handleImportData} />
          </div>
          <div className="flex flex-grow min-h-0">
            <CardListPanel
              cards={cards}
              selectedCardId={selectedCardId}
              onSelectCard={handleSelectCard}
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
            />
            <Separator orientation="vertical" />
             {selectedEditorCard ? (
              <CardDetailPanel
                key={selectedCardId} 
                card={selectedEditorCard}
                onUpdateCard={handleUpdateCard} 
                onGenerateName={handleGenerateName}
                isGeneratingName={isLoadingName}
                associatedTemplateIds={associatedTemplateIds}
              />
            ) : (
              <div className="p-4 text-center text-muted-foreground flex-grow flex items-center justify-center">
                <p>Select a card to edit or add a new one.</p>
              </div>
            )}
          </div>
        </div>
        <CardPreviewPanel card={selectedEditorCard} />
      </div>
    </DndContext>
  );
}
