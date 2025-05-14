
"use client";

import type { CardData } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Wrench } from 'lucide-react'; // Example icons for item

interface ItemCardTemplateProps {
  card: CardData;
}

export default function ItemCardTemplate({ card }: ItemCardTemplateProps) {
  return (
    <Card className="w-[280px] min-h-[400px] shadow-xl flex flex-col bg-card border-2 border-yellow-600 dark:border-yellow-400 overflow-hidden select-none rounded-lg">
      <CardHeader className="p-3 bg-yellow-100 dark:bg-yellow-800 relative">
        <CardTitle className="text-base font-bold leading-tight truncate text-yellow-800 dark:text-yellow-100">
          {card.name || "Item Name"}
        </CardTitle>
        {card.cost !== undefined && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card">
            {card.cost}
          </div>
        )}
      </CardHeader>

      <div className="aspect-[4/3] w-full relative overflow-hidden">
         {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.name || 'Item image'}
            fill
            style={{ objectFit: 'cover' }}
            data-ai-hint={card.dataAiHint || "fantasy item art"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Wrench className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      {card.rarity && (
        <div className="px-3 py-1 text-xs text-center font-medium uppercase tracking-wider bg-yellow-200 dark:bg-yellow-700 text-yellow-600 dark:text-yellow-300">
          {card.rarity}
        </div>
      )}

      <CardContent className="p-3 text-xs flex-grow min-h-[120px] bg-yellow-50 dark:bg-yellow-900/50">
        <ScrollArea className="h-full max-h-[150px]">
          {card.effectText && <p className="mb-1 whitespace-pre-wrap">{card.effectText}</p>}
          {card.flavorText && <p className="italic text-muted-foreground whitespace-pre-wrap">{card.flavorText}</p>}
          {!card.effectText && !card.flavorText && !card.description && <p className="text-muted-foreground">No item effect or description.</p>}
          {!card.effectText && !card.flavorText && card.description && <p className="whitespace-pre-wrap">{card.description}</p>}
        </ScrollArea>
      </CardContent>
      
      <CardDescription className="p-2 mt-auto border-t bg-yellow-100 dark:bg-yellow-800 text-center text-xs text-yellow-600 dark:text-yellow-300 font-semibold">
        <ShieldCheck className="inline h-3 w-3 mr-1" /> Item Card
      </CardDescription>
    </Card>
  );
}
