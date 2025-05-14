
"use client";

import type { DeckData, CardData, CardTemplateId } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
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

interface LiveEditorClientPageProps {
  initialDeckData: DeckData;
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
          <div className="flex-grow p-1"> {/* Matching CardDetailPanel's ScrollArea */}
            <div className="p-3"> {/* Matching CardDetailPanel's inner div */}
              <Skeleton className="h-6 w-3/4 mb-4" /> {/* Edit Card Title Placeholder */}
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
         <Skeleton className="h-10 w-1/2 mb-4" /> {/* "No card selected" or card name placeholder */}
        <Skeleton style={{ width: '280px', height: '400px' }} className="rounded-lg" /> {/* Card Renderer Placeholder */}
      </div>
    </div>
  );
}


export default function LiveEditorClientPage({ initialDeckData }: LiveEditorClientPageProps) {
  const [deck, setDeck] = useState<DeckData>(initialDeckData);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setDeck(initialDeckData);
    if (initialDeckData.cards.length > 0 && initialDeckData.cards[0]?.id) {
      setSelectedCardId(initialDeckData.cards[0].id);
    } else {
      setSelectedCardId(null);
    }
  }, [initialDeckData]);

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []); // No external dependencies needed for setSelectedCardId

  const handleUpdateCard = useCallback((updatedCard: CardData) => {
    setDeck(prevDeck => ({
      ...prevDeck,
      cards: prevDeck.cards.map(card => card.id === updatedCard.id ? updatedCard : card)
    }));
  }, []); // No external dependencies needed for setDeck

  const handleAddCard = useCallback(() => {
    const newCardId = `card-${Date.now()}`;
    const newCard: CardData = {
      id: newCardId,
      templateId: 'generic',
      name: 'New Card',
      description: '',
    };
    setDeck(prevDeck => ({
      ...prevDeck,
      cards: [...prevDeck.cards, newCard]
    }));
    setSelectedCardId(newCardId);
  }, []); // No external dependencies needed for setDeck, setSelectedCardId

  const handleDeleteCard = useCallback((cardIdToDelete: string) => {
    setDeck(currentDeck => {
      const newCards = currentDeck.cards.filter(card => card.id !== cardIdToDelete);
      // Use functional update for setSelectedCardId if it depends on previous state
      setSelectedCardId(prevSelectedId => {
        if (prevSelectedId === cardIdToDelete) {
          return newCards.length > 0 ? newCards[0].id : null;
        }
        return prevSelectedId;
      });
      return { ...currentDeck, cards: newCards };
    });
  }, []); // No external dependencies needed for setDeck, setSelectedCardId
  
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
  }, [toast]); // setIsLoadingName is stable, toast is from context

  const handleImportData = useCallback((importedCards: CardData[]) => {
    setDeck(prevDeck => ({ ...prevDeck, cards: importedCards }));
    setSelectedCardId(importedCards.length > 0 ? importedCards[0].id : null);
    toast({ title: "Data Imported", description: `${importedCards.length} cards loaded.` });
  }, [toast]); // setDeck, setSelectedCardId are stable

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setDeck((prevDeck) => {
        const oldIndex = prevDeck.cards.findIndex((card) => card.id === active.id);
        const newIndex = prevDeck.cards.findIndex((card) => card.id === over.id);
        return {
          ...prevDeck,
          cards: arrayMove(prevDeck.cards, oldIndex, newIndex),
        };
      });
    }
  }, []); // setDeck is stable

  if (!isMounted) {
    return <EditorClientPageSkeleton />;
  }

  const selectedEditorCard = deck.cards.find(card => card.id === selectedCardId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex h-full bg-muted/40">
        {/* Left Panel: Card List and Details */}
        <div className="w-[550px] flex flex-col border-r bg-background">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">{deck.name}</h2>
             <DataControls cards={deck.cards} onImport={handleImportData} />
          </div>
          <div className="flex flex-grow min-h-0"> {/* min-h-0 is important for flex children with scroll */}
            <CardListPanel
              cards={deck.cards}
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
              />
            ) : (
              <div className="p-4 text-center text-muted-foreground flex-grow flex items-center justify-center">
                <p>Select a card to edit or add a new one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Card Preview */}
        <CardPreviewPanel card={selectedEditorCard} />
      </div>
    </DndContext>
  );
}

