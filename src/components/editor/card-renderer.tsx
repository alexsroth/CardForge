"use client";

import type { CardData } from '@/lib/types';
import GenericCardTemplate from './templates/generic-card-template';
import CreatureCardTemplate from './templates/creature-card-template';
import SpellCardTemplate from './templates/spell-card-template';
import ItemCardTemplate from './templates/item-card-template';

interface CardRendererProps {
  card: CardData;
}

export default function CardRenderer({ card }: CardRendererProps) {
  switch (card.templateId) {
    case 'creature':
      return <CreatureCardTemplate card={card} />;
    case 'spell':
      return <SpellCardTemplate card={card} />;
    case 'item':
      return <ItemCardTemplate card={card} />;
    case 'generic':
    default:
      return <GenericCardTemplate card={card} />;
  }
}
