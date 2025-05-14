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

interface LiveEditorClientPageProps {
  initialDeckData: DeckData;
}

export default function LiveEditorClientPage({ initialDeckData }: LiveEditorClientPageProps) {
  const [deck, setDeck] = useState<DeckData>(initialDeckData);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setDeck(initialDeckData);
    if (initialDeckData.cards.length > 0) {
      setSelectedCardId(initialDeckData.cards[0].id);
    } else {
      setSelectedCardId(null);
    }
  }, [initialDeckData]);

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleUpdateCard = (updatedCard: CardData) => {
    setDeck(prevDeck => ({
      ...prevDeck,
      cards: prevDeck.cards.map(card => card.id === updatedCard.id ? updatedCard : card)
    }));
  };

  const handleAddCard = () => {
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
  };

  const handleDeleteCard = (cardId: string) => {
    setDeck(prevDeck => ({
      ...prevDeck,
      cards: prevDeck.cards.filter(card => card.id !== cardId)
    }));
    if (selectedCardId === cardId) {
      setSelectedCardId(prevDeck.cards.length > 1 ? prevDeck.cards.find(c => c.id !== cardId)!.id : null);
    }
  };
  
  const handleGenerateName = async (description: string): Promise<string> => {
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
  };

  const handleImportData = (importedCards: CardData[]) => {
    setDeck(prevDeck => ({ ...prevDeck, cards: importedCards }));
    setSelectedCardId(importedCards.length > 0 ? importedCards[0].id : null);
    toast({ title: "Data Imported", description: `${importedCards.length} cards loaded.` });
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
  };

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
          <div className="flex flex-grow min-h-0">
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
                key={selectedCardId} // Force re-render on card selection to reset form state if needed
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
