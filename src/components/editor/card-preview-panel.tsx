"use client";

import type { CardData } from '@/lib/types';
import DynamicCardRenderer from './templates/dynamic-card-renderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTemplates } from '@/contexts/TemplateContext';
import { useEffect, useState } from 'react';

interface CardPreviewPanelProps {
  card: CardData | undefined | null;
}

export default function CardPreviewPanel({ card }: CardPreviewPanelProps) {
  const { getTemplateById } = useTemplates();
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    if (card && card.templateId) {
      const foundTemplate = getTemplateById(card.templateId);
      if (foundTemplate) {
        setTemplate(foundTemplate);
      } else {
        setTemplate(null); // Template not found
      }
    } else {
      setTemplate(null); // No card or templateId
    }
  }, [card, getTemplateById]);

  return (
    <ScrollArea className="flex-grow bg-muted/20">
      <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-full">
        {card && template ? (
          <DynamicCardRenderer card={card} template={template} />
        ) : card ? (
          <div className="text-center text-muted-foreground">
            <p className="text-lg">No card selected</p>
            <p>Select a card from the list or add a new one to see its preview.</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
             <p className="text-lg">No card selected</p>
             <p>Select a card from the list or add a new one to see its preview.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
