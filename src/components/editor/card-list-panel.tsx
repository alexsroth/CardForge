"use client";

import type { CardData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';


interface SortableCardListItemProps {
  card: CardData;
  isSelected: boolean;
  onSelectCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

function SortableCardListItem({ card, isSelected, onSelectCard, onDeleteCard }: SortableCardListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: card.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined, // Ensure dragging item is on top
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
        isDragging && "shadow-lg opacity-75"
      )}
    >
      <div {...attributes} {...listeners} className="p-1 cursor-grab touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <span onClick={() => onSelectCard(card.id)} className="flex-grow truncate ml-2">
        {card.name || "Untitled Card"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}
        aria-label={`Delete ${card.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}


interface CardListPanelProps {
  cards: CardData[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onAddCard: () => void;
  onDeleteCard: (cardId: string) => void;
}

export default function CardListPanel({ cards, selectedCardId, onSelectCard, onAddCard, onDeleteCard }: CardListPanelProps) {
  return (
    <div className="w-[250px] border-r flex flex-col bg-card">
      <div className="p-3 border-b">
        <Button onClick={onAddCard} className="w-full" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 space-y-1">
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <SortableCardListItem
                key={card.id}
                card={card}
                isSelected={card.id === selectedCardId}
                onSelectCard={onSelectCard}
                onDeleteCard={onDeleteCard}
              />
            ))}
          </SortableContext>
          {cards.length === 0 && (
            <p className="p-4 text-sm text-center text-muted-foreground">
              No cards in this deck yet. Add one to get started!
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
