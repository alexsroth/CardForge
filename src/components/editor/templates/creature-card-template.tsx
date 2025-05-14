
"use client";

import type { CardData } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Sword, Gem } from 'lucide-react';


interface CreatureCardTemplateProps {
  card: CardData;
}

export default function CreatureCardTemplate({ card }: CreatureCardTemplateProps) {
  return (
    <Card className="w-[280px] min-h-[400px] shadow-xl flex flex-col bg-card border-2 border-slate-700 dark:border-slate-400 overflow-hidden select-none rounded-lg">
      <CardHeader className="p-3 bg-slate-100 dark:bg-slate-800 relative">
        <CardTitle className="text-base font-bold leading-tight truncate text-slate-800 dark:text-slate-100">
          {card.name || "Creature Name"}
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
            alt={card.name || 'Creature image'}
            fill // Replaced layout="fill" and objectFit="cover"
            style={{ objectFit: 'cover' }} // Explicit style for objectFit
            data-ai-hint={card.dataAiHint || "fantasy creature art"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Gem className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      {card.rarity && (
        <div className="px-3 py-1 text-xs text-center font-medium uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {card.rarity}
        </div>
      )}

      <CardContent className="p-3 text-xs flex-grow min-h-[70px] bg-slate-50 dark:bg-slate-900/50">
        <ScrollArea className="h-full max-h-[100px]">
          {card.effectText && <p className="mb-1 whitespace-pre-wrap">{card.effectText}</p>}
          {card.flavorText && <p className="italic text-muted-foreground whitespace-pre-wrap">{card.flavorText}</p>}
          {!card.effectText && !card.flavorText && !card.description && <p className="text-muted-foreground">No special abilities or description.</p>}
          {!card.effectText && !card.flavorText && card.description && <p className="whitespace-pre-wrap">{card.description}</p>}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-2 mt-auto border-t bg-slate-100 dark:bg-slate-800 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200">
        <div className="flex items-center">
          <Sword className="h-4 w-4 mr-1 text-red-500" />
          <span>{card.attack ?? 'X'}</span>
        </div>
        <div className="flex items-center">
          <Shield className="h-4 w-4 mr-1 text-blue-500" />
          <span>{card.defense ?? 'Y'}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
