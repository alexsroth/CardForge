
"use client";

import type { EditorProjectData, CardData, CardTemplateId, Project } from '@/lib/types';
import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
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
  const [editorProjectId, setEditorProjectId] = useState<string>(initialProjectData.id); // Tracks the ID this editor instance is for
  const [projectName, setProjectName] = useState<string>(initialProjectData.name);
  const [cards, setCards] = useState<CardData[]>(initialProjectData.cards || []);
  const [associatedTemplateIds, setAssociatedTemplateIds] = useState<CardTemplateId[]>(initialProjectData.associatedTemplateIds || []);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Effect to re-initialize state ONLY if initialProjectData.id changes (navigating to a new project)
  useEffect(() => {
    // If the project ID from props is different from the one this editor instance is currently managing,
    // then it's a navigation to a new project, so reset the editor state.
    if (initialProjectData.id !== editorProjectId) {
      setEditorProjectId(initialProjectData.id);
      setProjectName(initialProjectData.name);
      const currentCards = initialProjectData.cards || [];
      setCards(currentCards);
      setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);

      if (currentCards.length > 0 && currentCards[0]?.id) {
        setSelectedCardId(currentCards[0].id);
      } else {
        setSelectedCardId(null);
        // If navigating to a new project that has no cards (e.g. just created)
        // we might want to add a default card here if the context didn't already.
        // However, addProject in context already adds one.
      }
    } else {
      // If it's the same project ID, but other details (like name or associated templates) might have changed
      // from an external update (e.g., assignments page), update those.
      // Cards are managed internally by this component after initial load for this project ID.
      setProjectName(initialProjectData.name);
      setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);
    }
  }, [initialProjectData, editorProjectId]); // editorProjectId helps detect actual project navigation

  const saveProjectToContext = useCallback((updatedCards: CardData[]) => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      const projectToUpdate = getProjectById(editorProjectId); // Use editorProjectId
      if (projectToUpdate) {
        const updatedFullProject: Project = {
          ...projectToUpdate,
          name: projectName, // Ensure current project name is saved
          cards: updatedCards,
          associatedTemplateIds: associatedTemplateIds, // Ensure current associations are saved
        };
        updateProject(updatedFullProject).then(result => {
          if (!result.success) {
            toast({ title: "Save Error", description: `Failed to save project changes: ${result.message}`, variant: "destructive" });
          }
        });
      }
    }, 500); // 500ms debounce
  }, [editorProjectId, projectName, associatedTemplateIds, getProjectById, updateProject, toast]);
  
  // Cleanup debounce timer on unmount
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
    setCards(prevCards => {
      const newCards = prevCards.map(card => card.id === updatedCard.id ? updatedCard : card);
      saveProjectToContext(newCards); 
      return newCards;
    });
  }, [saveProjectToContext]);

  const handleAddCard = useCallback(() => {
    const newCardId = `card-${Date.now()}`;
    const defaultTemplateIdForNewCard = associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic';
    const newCard: CardData = {
      id: newCardId,
      templateId: defaultTemplateIdForNewCard,
      name: 'New Card',
      description: '',
      imageUrl: 'https://placehold.co/280x400.png',
      dataAiHint: 'new card concept',
    };
    setCards(prevCards => {
      const newCards = [...prevCards, newCard];
      saveProjectToContext(newCards);
      return newCards;
    });
    setSelectedCardId(newCardId);
  }, [associatedTemplateIds, saveProjectToContext]);

  const handleDeleteCard = useCallback((cardIdToDelete: string) => {
    setCards(currentCards => {
      const newCardsList = currentCards.filter(card => card.id !== cardIdToDelete);
      saveProjectToContext(newCardsList);
      if (selectedCardId === cardIdToDelete) {
        setSelectedCardId(newCardsList.length > 0 ? newCardsList[0].id : null);
      }
      return newCardsList;
    });
  }, [selectedCardId, saveProjectToContext]);
  
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
      templateId: associatedTemplateIds.includes(card.templateId) 
                    ? card.templateId 
                    : (associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : 'generic')
    }));
    setCards(validImportedCards);
    saveProjectToContext(validImportedCards);
    setSelectedCardId(validImportedCards.length > 0 ? validImportedCards[0].id : null);
    toast({ title: "Data Imported", description: `${validImportedCards.length} cards loaded.` });
  }, [toast, associatedTemplateIds, saveProjectToContext]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setCards((prevCards) => {
        const oldIndex = prevCards.findIndex((card) => card.id === active.id);
        const newIndex = prevCards.findIndex((card) => card.id === over.id);
        const newSortedCards = arrayMove(prevCards, oldIndex, newIndex);
        saveProjectToContext(newSortedCards);
        return newSortedCards;
      });
    }
  }, [saveProjectToContext]);

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

