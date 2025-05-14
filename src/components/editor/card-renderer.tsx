
"use client";

import type { CardData } from '@/lib/types';
import GenericCardTemplate from './templates/generic-card-template';
import CreatureCardTemplate from './templates/creature-card-template';
import SpellCardTemplate from './templates/spell-card-template';
import ItemCardTemplate from './templates/item-card-template';
import DynamicCardRenderer from './templates/dynamic-card-renderer'; // Import new renderer
import { useTemplates } from '@/contexts/TemplateContext'; // To get template definition

interface CardRendererProps {
  card: CardData;
}

export default function CardRenderer({ card }: CardRendererProps) {
  const { getTemplateById, isLoading: templatesLoading } = useTemplates();

  if (templatesLoading) {
    // You might want a more sophisticated loading skeleton here
    return <div className="w-[280px] h-[400px] flex items-center justify-center bg-muted rounded-lg shadow-md"><p>Loading template...</p></div>;
  }

  const template = getTemplateById(card.templateId);

  if (template?.layoutDefinition) {
    try {
      // Attempt to parse, DynamicCardRenderer will also parse and handle errors
      JSON.parse(template.layoutDefinition); 
      return <DynamicCardRenderer card={card} template={template} />;
    } catch (e) {
      console.warn(`Invalid layoutDefinition for template ${template.id}, falling back. Error: ${e}`);
      // Fallback to hardcoded or generic if layout is invalid
    }
  }
  
  // Fallback to existing hardcoded templates if no valid layoutDefinition
  switch (card.templateId) {
    case 'creature':
      return <CreatureCardTemplate card={card} />;
    case 'spell':
      return <SpellCardTemplate card={card} />;
    case 'item':
      return <ItemCardTemplate card={card} />;
    // The 'generic' case might now be handled by DynamicCardRenderer if 'generic' template has a layoutDefinition
    // If not, GenericCardTemplate will be used.
    case 'generic':
    default:
      // If the generic template also has a layout definition and it passed the check above, it would have been rendered.
      // This means either generic has no layout, or we are falling back for some other templateId.
      if (template) { // A template object exists but no (valid) layoutDefinition
         return <GenericCardTemplate card={card} />; // Fallback to generic if template exists but no/invalid layout
      }
      // If no template object found at all for card.templateId
      return (
        <div className="w-[280px] h-[400px] border border-destructive bg-destructive/10 flex items-center justify-center p-4 text-center rounded-lg shadow-md">
          Template "{card.templateId}" not found or has no valid layout.
        </div>
      );
  }
}
