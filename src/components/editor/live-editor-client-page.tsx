
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
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/contexts/ProjectContext'; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LayoutGrid, Loader2 } from 'lucide-react'; // Removed LayoutGrid as it's not used anymore

interface LiveEditorClientPageProps {
  initialProjectData: EditorProjectData; 
}

function EditorClientPageSkeleton() {
  console.log('[DEBUG] LiveEditorClientPage/EditorClientPageSkeleton: Rendering skeleton.');
  return (
    <div className="flex h-full bg-muted/40">
      {/* Left Panel Skeleton */}
      <div className="w-[550px] flex flex-col border-r bg-background">
        <div className="p-4 border-b space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-1/2" /> {/* Deck Name Placeholder */}
            {/* Removed View Deck Button Placeholder */}
          </div>
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
  
  useEffect(() => {
    console.log('[DEBUG] LiveEditorClientPage: Mounted.');
    setIsMounted(true);
    if (initialProjectData.cards && initialProjectData.cards.length > 0 && !selectedCardId) {
      setSelectedCardId(initialProjectData.cards[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    console.log('[DEBUG] LiveEditorClientPage: initialProjectData prop changed or editorProjectId changed.', {
      newId: initialProjectData.id,
      currentEditorId: editorProjectId,
      newName: initialProjectData.name,
      currentName: projectName,
    });
    if (initialProjectData.id !== editorProjectId) {
      console.log('[DEBUG] LiveEditorClientPage: Project ID changed. Full re-initialization.', initialProjectData.id);
      setEditorProjectId(initialProjectData.id);
      setProjectName(initialProjectData.name);
      const currentCards = initialProjectData.cards || [];
      setCards(currentCards);
      setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);
      setSelectedCardId(currentCards.length > 0 && currentCards[0]?.id ? currentCards[0].id : null);
    } else {
      // Same project ID, check for metadata updates
      if (initialProjectData.name !== projectName) {
        console.log('[DEBUG] LiveEditorClientPage: Project name updated from prop.', initialProjectData.name);
        setProjectName(initialProjectData.name);
      }
      if (JSON.stringify(initialProjectData.associatedTemplateIds || []) !== JSON.stringify(associatedTemplateIds)) {
         console.log('[DEBUG] LiveEditorClientPage: Associated templates updated from prop.');
         setAssociatedTemplateIds(initialProjectData.associatedTemplateIds || []);
      }
    }
  }, [initialProjectData, editorProjectId, projectName, associatedTemplateIds]);


  // Debounced save effect for project data
  useEffect(() => {
    if (!isMounted || !editorProjectId) {
      return;
    }
    console.log('[DEBUG] LiveEditorClientPage: Save effect triggered. Dependencies changed:', { cardsLength: cards.length, projectName, associatedTemplateIdsLength: associatedTemplateIds.length });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('[DEBUG] LiveEditorClientPage: Debounce timer expired. Attempting to save project:', editorProjectId);
      const projectToUpdate = getProjectById(editorProjectId);
      if (projectToUpdate) {
        const updatedFullProject: Project = {
          ...projectToUpdate,
          name: projectName,
          cards: cards,
          associatedTemplateIds: associatedTemplateIds,
          // lastModified will be updated by ProjectContext.updateProject
        };
        console.log('[DEBUG] LiveEditorClientPage: Calling updateProject for', editorProjectId, 'with', cards.length, 'cards.');
        updateProject(updatedFullProject).then(result => {
          if (!result.success) {
            toast({ title: "Save Error", description: `Failed to save project changes: ${result.message}`, variant: "destructive" });
            console.error('[DEBUG] LiveEditorClientPage: Project update failed', result.message);
          } else {
            // console.log('[DEBUG] LiveEditorClientPage: Project update successful.');
          }
        });
      } else {
        console.warn(`[DEBUG] LiveEditorClientPage: Debounced save - Project with ID ${editorProjectId} not found in context.`);
      }
    }, 1000);

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
    console.log('[DEBUG] LiveEditorClientPage/handleSelectCard: Selected card ID:', cardId);
    setSelectedCardId(cardId);
  }, []);

  const handleUpdateCard = useCallback((updatedCard: CardData) => {
    console.log('[DEBUG] LiveEditorClientPage/handleUpdateCard: Updating card ID:', updatedCard.id, 'New name:', updatedCard.name);
    setCards(prevCards => 
      prevCards.map(card => card.id === updatedCard.id ? updatedCard : card)
    );
  }, []);

  const handleAddCard = useCallback(() => {
    const newCardId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCard: CardData = {
      id: newCardId,
      templateId: NEW_CARD_TEMPLATE_ID_PLACEHOLDER, 
      name: 'Untitled Card', 
      description: '', 
      imageUrl: 'https://placehold.co/280x400.png', 
      dataAiHint: 'new card art',
    };
    console.log('[DEBUG] LiveEditorClientPage/handleAddCard: Adding new card ID:', newCardId);
    setCards(prevCards => [...prevCards, newCard]);
    setSelectedCardId(newCardId);
  }, []);

  const handleDeleteCard = useCallback((cardIdToDelete: string) => {
    console.log('[DEBUG] LiveEditorClientPage/handleDeleteCard: Deleting card ID:', cardIdToDelete);
    setCards(currentCards => {
      const newCardsList = currentCards.filter(card => card.id !== cardIdToDelete);
      if (selectedCardId === cardIdToDelete) {
        setSelectedCardId(newCardsList.length > 0 ? newCardsList[0].id : null);
      }
      return newCardsList;
    });
  }, [selectedCardId]);
  
  const handleGenerateName = useCallback(async (description: string): Promise<string> => {
    console.log('[DEBUG] LiveEditorClientPage/handleGenerateName: Generating name for description:', description.substring(0, 30) + '...');
    if (!description.trim()) {
      toast({ title: "Cannot generate name", description: "Card description is empty.", variant: "destructive" });
      return '';
    }
    setIsLoadingName(true);
    try {
      const name = await generateCardNameAction({ cardDescription: description });
      toast({ title: "Name Generated!", description: `Suggested name: ${name}` });
      console.log('[DEBUG] LiveEditorClientPage/handleGenerateName: Success - Generated name:', name);
      return name;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to generate name:", errorMessage);
      toast({ title: "Error", description: `Could not generate card name: ${errorMessage}`, variant: "destructive" });
      return '';
    } finally {
      setIsLoadingName(false);
    }
  }, [toast]);

  const handleImportData = useCallback((importedCards: CardData[]) => {
    console.log('[DEBUG] LiveEditorClientPage/handleImportData: Importing', importedCards.length, 'cards.');
    const validImportedCards = importedCards.map(card => ({
      ...card,
      templateId: associatedTemplateIds.includes(card.templateId as CardTemplateId) 
                    ? card.templateId as CardTemplateId
                    : (associatedTemplateIds.length > 0 ? associatedTemplateIds[0] : NEW_CARD_TEMPLATE_ID_PLACEHOLDER)
    }));
    setCards(validImportedCards);
    setSelectedCardId(validImportedCards.length > 0 ? validImportedCards[0].id : null);
    toast({ title: "Data Imported", description: `${validImportedCards.length} cards loaded.` });
  }, [toast, associatedTemplateIds]);


  if (!isMounted) {
    console.log('[DEBUG] LiveEditorClientPage: Not mounted yet, showing skeleton.');
    return <EditorClientPageSkeleton />;
  }

  const selectedEditorCard = cards.find(card => card.id === selectedCardId);
  console.log('[DEBUG] LiveEditorClientPage: Rendering. Selected card ID:', selectedCardId, 'Found:', !!selectedEditorCard);

  return (
      <div className="flex h-full bg-muted/40">
        <div className="w-[550px] flex flex-col border-r bg-background">
          <div className="p-4 border-b space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{projectName}</h2>
              {/* "View Deck" button removed */}
            </div>
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
  );
}
    
