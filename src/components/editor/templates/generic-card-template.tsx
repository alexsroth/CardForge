"use client";

import type { CardData } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GenericCardTemplateProps {
  card: CardData;
}

export default function GenericCardTemplate({ card }: GenericCardTemplateProps) {
  return (
    <Card className="w-[280px] min-h-[400px] shadow-xl flex flex-col bg-card border-2 border-primary/20 overflow-hidden select-none">
      <CardHeader className="p-3">
        <CardTitle className="text-lg leading-tight truncate">
          {card.name || "Untitled Card"}
        </CardTitle>
        {card.cost !== undefined && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold">
            {card.cost}
          </div>
        )}
      </CardHeader>

      {card.imageUrl && (
        <div className="aspect-[16/10] w-full relative overflow-hidden mx-auto mt-1 mb-2 px-3">
          <Image
            src={card.imageUrl}
            alt={card.name || 'Card image'}
            layout="fill"
            objectFit="cover"
            className="rounded"
            data-ai-hint={card.dataAiHint || 'card art'}
          />
        </div>
      )}
      {!card.imageUrl && (
         <div className="aspect-[16/10] w-full relative overflow-hidden mx-auto mt-1 mb-2 px-3 flex items-center justify-center bg-muted rounded">
            <span className="text-sm text-muted-foreground">No Image</span>
        </div>
      )}

      <CardContent className="p-3 text-sm flex-grow min-h-[80px]">
        <ScrollArea className="h-full max-h-[120px]">
          <CardDescription className="whitespace-pre-wrap">
            {card.description || "No description."}
          </CardDescription>
        </ScrollArea>
      </CardContent>
      
      {(card.attack !== undefined || card.defense !== undefined) && (
        <CardFooter className="p-3 mt-auto border-t bg-muted/50 flex justify-around text-sm font-semibold">
          {card.attack !== undefined && <span>ATK: {card.attack}</span>}
          {card.defense !== undefined && <span>DEF: {card.defense}</span>}
        </CardFooter>
      )}
    </Card>
  );
}
