"use client";

import type { CardData } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, BookOpen } from 'lucide-react';

interface SpellCardTemplateProps {
  card: CardData;
}

export default function SpellCardTemplate({ card }: SpellCardTemplateProps) {
  return (
    <Card className="w-[280px] min-h-[400px] shadow-xl flex flex-col bg-card border-2 border-purple-700 dark:border-purple-400 overflow-hidden select-none rounded-lg">
      <CardHeader className="p-3 bg-purple-100 dark:bg-purple-800 relative">
        <CardTitle className="text-base font-bold leading-tight truncate text-purple-800 dark:text-purple-100">
          {card.name || "Spell Name"}
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
            alt={card.name || 'Spell image'}
            layout="fill"
            objectFit="cover"
            data-ai-hint={card.dataAiHint as string || "magic spell art"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Zap className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {card.rarity && (
        <div className="px-3 py-1 text-xs text-center font-medium uppercase tracking-wider bg-purple-200 dark:bg-purple-700 text-purple-600 dark:text-purple-300">
          {card.rarity}
        </div>
      )}
      
      <CardContent className="p-3 text-xs flex-grow min-h-[120px] bg-purple-50 dark:bg-purple-900/50">
        <ScrollArea className="h-full max-h-[150px]">
          {card.effectText && <p className="mb-1 whitespace-pre-wrap">{card.effectText}</p>}
          {card.description && <p className="italic text-muted-foreground whitespace-pre-wrap">{card.description}</p>}
          {!card.effectText && !card.description && <p className="text-muted-foreground">No spell effect or description.</p>}
        </ScrollArea>
      </CardContent>
      
      <CardDescription className="p-2 mt-auto border-t bg-purple-100 dark:bg-purple-800 text-center text-xs text-purple-600 dark:text-purple-300 font-semibold">
        <BookOpen className="inline h-3 w-3 mr-1" /> Spell Card
      </CardDescription>
    </Card>
  );
}
