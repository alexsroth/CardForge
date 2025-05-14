
"use client";

import type { CardData, CardTemplateId, NewCardTemplateIdPlaceholder } from '@/lib/types';
import { NEW_CARD_TEMPLATE_ID_PLACEHOLDER } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTemplates } from '@/contexts/TemplateContext';
import { Badge } from '@/components/ui/badge';


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


interface CardListItemProps {
  card: CardData;
  isSelected: boolean;
  onSelectCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

function CardListItem({ card, isSelected, onSelectCard, onDeleteCard }: CardListItemProps) {
  const baseColorClass = getBaseTemplateColorClass(card.templateId);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors duration-150",
        !isSelected && baseColorClass,
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={() => onSelectCard(card.id)}
    >
      <span className="flex-grow truncate ml-2">
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
  const { getTemplateById, isLoading: templatesLoading } = useTemplates();

  const groupedCards = React.useMemo(() => {
    return cards.reduce<Record<string, CardData[]>>((acc, card) => {
      const key = card.templateId || NEW_CARD_TEMPLATE_ID_PLACEHOLDER; // Ensure placeholder is used if templateId is somehow null/undefined
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(card);
      return acc;
    }, {});
  }, [cards]);

  const sortedTemplateGroupIds = React.useMemo(() => {
    return Object.keys(groupedCards).sort((a, b) => {
      if (a === NEW_CARD_TEMPLATE_ID_PLACEHOLDER) return -1;
      if (b === NEW_CARD_TEMPLATE_ID_PLACEHOLDER) return 1;
      const templateA = getTemplateById(a as CardTemplateId);
      const templateB = getTemplateById(b as CardTemplateId);
      return (templateA?.name || 'Unknown Template').localeCompare(templateB?.name || 'Unknown Template');
    });
  }, [groupedCards, getTemplateById]);

  const defaultAccordionValues = sortedTemplateGroupIds; // Open all categories by default

  if (templatesLoading) {
    return (
      <div className="w-[250px] border-r flex flex-col bg-card p-4 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-[250px] border-r flex flex-col bg-card">
      <div className="p-3 border-b">
        <Button onClick={onAddCard} className="w-full" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </div>
      <ScrollArea className="flex-grow">
        {cards.length === 0 ? (
          <p className="p-4 text-sm text-center text-muted-foreground">
            No cards in this deck yet. Add one to get started!
          </p>
        ) : (
          <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full p-1">
            {sortedTemplateGroupIds.map((templateId) => {
              const template = getTemplateById(templateId as CardTemplateId);
              const categoryCards = groupedCards[templateId];
              let categoryTitle = "Untitled Template Category";

              if (templateId === NEW_CARD_TEMPLATE_ID_PLACEHOLDER) {
                categoryTitle = "New Cards - Select Template";
              } else if (template) {
                categoryTitle = template.name;
              } else if (categoryCards && categoryCards.length > 0) {
                // Fallback if template definition is missing but cards exist for this ID
                categoryTitle = `Unknown (${templateId.substring(0,10)}...)`;
              } else {
                // This case should ideally not be reached if sortedTemplateGroupIds is derived from groupedCards
                return null; 
              }

              if (!categoryCards || categoryCards.length === 0) return null;

              return (
                <AccordionItem value={templateId} key={templateId} className="border-b-0 mb-1 last:mb-0">
                  <AccordionTrigger className="py-2 px-2 text-sm hover:no-underline rounded-md hover:bg-accent/50 [&[data-state=open]>svg]:text-primary">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium truncate text-left mr-2">{categoryTitle}</span>
                      <Badge variant="secondary" className="text-xs h-5">{categoryCards.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-1 pl-1 pr-1"> {/* Reduced padding for content */}
                    <div className="space-y-1">
                      {categoryCards.map((card) => (
                        <CardListItem
                          key={card.id}
                          card={card}
                          isSelected={card.id === selectedCardId}
                          onSelectCard={onSelectCard}
                          onDeleteCard={onDeleteCard}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}
