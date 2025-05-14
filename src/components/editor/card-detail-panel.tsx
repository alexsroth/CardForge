
"use client";

import type { CardData, CardTemplateId } from '@/lib/types';
import CardDataForm from './card-data-form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CardDetailPanelProps {
  card: CardData;
  onUpdateCard: (updatedCard: CardData) => void;
  onGenerateName: (description: string) => Promise<string>;
  isGeneratingName: boolean;
  associatedTemplateIds: CardTemplateId[]; // Added prop
}

export default function CardDetailPanel({ card, onUpdateCard, onGenerateName, isGeneratingName, associatedTemplateIds }: CardDetailPanelProps) {
  return (
    <ScrollArea className="flex-grow p-1"> {/* Reduced padding here */}
      <div className="p-3"> {/* Added inner div for padding */}
        <h3 className="text-lg font-semibold mb-4">Edit Card: {card.name || "Untitled"}</h3>
        <CardDataForm
          key={card.id} // Ensure form resets if card changes
          cardData={card}
          onUpdateCard={onUpdateCard}
          onGenerateName={onGenerateName}
          isGeneratingName={isGeneratingName}
          associatedTemplateIds={associatedTemplateIds} // Pass down
        />
      </div>
    </ScrollArea>
  );
}
