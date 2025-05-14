"use client";

import type { CardData } from '@/lib/types';
import CardRenderer from './card-renderer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CardPreviewPanelProps {
  card: CardData | undefined | null;
}

export default function CardPreviewPanel({ card }: CardPreviewPanelProps) {
  return (
    <ScrollArea className="flex-grow bg-muted/20">
      <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-full">
        {card ? (
          <CardRenderer card={card} />
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
