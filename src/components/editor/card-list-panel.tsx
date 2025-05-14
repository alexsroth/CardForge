
"use client";

import type { CardData } from '@/lib/types';
import { NEW_CARD_TEMPLATE_ID_PLACEHOLDER } from '@/lib/types';
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

// Color mapping for templates
const templateColorMap: Record<string, string> = {
  creature: 'bg-red-100 dark:bg-red-900/70 hover:bg-red-200 dark:hover:bg-red-800/80 text-red-800 dark:text-red-100',
  spell: 'bg-purple-100 dark:bg-purple-900/70 hover:bg-purple-200 dark:hover:bg-purple-800/80 text-purple-800 dark:text-purple-100',
  item: 'bg-amber-100 dark:bg-amber-900/70 hover:bg-amber-200 dark:hover:bg-amber-800/80 text-amber-800 dark:text-amber-100',
  generic: 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100',
  [NEW_CARD_TEMPLATE_ID_PLACEHOLDER]: 'bg-sky-100 dark:bg-sky-900/70 hover:bg-sky-200 dark:hover:bg-sky-800/80 text-sky-800 dark:text-sky-100',
};

const getBaseTemplateColorClass = (templateId: CardData['templateId']): string => {
  return templateColorMap[templateId] || templateColorMap.generic; // Fallback to generic
};


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
  
  const baseColorClass = getBaseTemplateColorClass(card.templateId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors duration-150",
        !isSelected && baseColorClass, // Apply template color if not selected
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90", // Selected state takes precedence
        isDragging && "shadow-lg opacity-75" // Dragging state
      )}
    >
      <div {...attributes} {...listeners} className="p-1 cursor-grab touch-none">
        <GripVertical className={cn("h-5 w-5", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")} />
      </div>
      <span onClick={() => onSelectCard(card.id)} className="flex-grow truncate ml-2">
        {card.name || "Untitled Card"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
            "h-7 w-7 shrink-0",
            isSelected ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" : "text-muted-foreground hover:text-foreground"
        )}
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
