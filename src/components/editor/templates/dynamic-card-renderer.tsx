
"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition, LayoutElement } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react'; // Import all icons

interface DynamicCardRendererProps {
  card: CardData;
  template: CardTemplate;
}

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) {
    // Fallback or error handling if icon name is invalid
    console.warn(`Lucide icon "${name}" not found.`);
    return <LucideIcons.HelpCircle {...props} />; // Default fallback icon
  }
  return <Icon {...props} />;
};


export default function DynamicCardRenderer({ card, template }: DynamicCardRendererProps) {
  let layout: LayoutDefinition | null = null;

  if (template.layoutDefinition) {
    try {
      layout = JSON.parse(template.layoutDefinition) as LayoutDefinition;
    } catch (error) {
      console.error("Failed to parse layoutDefinition JSON:", error);
      return (
        <div className="w-[280px] h-[400px] border border-destructive bg-destructive/10 flex items-center justify-center p-4 text-center">
          Error parsing layout definition for template "{template.name}". Check console.
        </div>
      );
    }
  }

  if (!layout) {
    // Fallback to a very basic rendering if no layout is defined or parsing failed
    return (
      <div className="w-[280px] h-[400px] border border-muted-foreground bg-muted flex flex-col items-center justify-center p-4 text-center">
        <p className="font-semibold">{card.name || "Untitled Card"}</p>
        <p className="text-sm text-muted-foreground">No layout defined for template: "{template.name}"</p>
      </div>
    );
  }
  
  const cardStyle: React.CSSProperties = {
    width: layout.width || '280px',
    height: layout.height || '400px',
    backgroundColor: layout.backgroundColor || 'hsl(var(--card))',
    borderColor: layout.borderColor || 'hsl(var(--border))',
    borderRadius: layout.borderRadius || 'var(--radius)',
    borderWidth: layout.borderColor ? '2px' : '1px',
    borderStyle: 'solid',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    color: 'hsl(var(--card-foreground))', // Default text color
  };

  const backgroundImageUrl = layout.backgroundImageField && card[layout.backgroundImageField as keyof CardData]
    ? String(card[layout.backgroundImageField as keyof CardData])
    : null;

  return (
    <div style={cardStyle} className="select-none">
      {backgroundImageUrl && (
        <Image
          src={backgroundImageUrl}
          alt={`${card.name || 'Card'} background`}
          fill
          style={{ objectFit: 'cover', zIndex: 0 }}
          data-ai-hint={card.dataAiHint || "card background art"}
        />
      )}
      {layout.elements.map((element, index) => {
        const value = card[element.fieldKey as keyof CardData];
        const elementStyle = { ...(element.style || {}), zIndex: 1 }; // Ensure elements are above background

        if (!value && element.type !== 'image' && element.type !== 'iconValue' && !element.prefix && !element.suffix) { // Allow images/icons even if fieldKey value is empty, prefix/suffix might still be useful
           if(!(element.type === 'text' && (element.prefix || element.suffix))) { // Allow text if prefix/suffix
             return null; // Don't render if field value is missing and it's not an image or just prefix/suffix text
           }
        }
        
        let content: React.ReactNode = String(value ?? '');
        if (element.prefix) content = element.prefix + content;
        if (element.suffix) content = content + element.suffix;


        switch (element.type) {
          case 'text':
            return (
              <div key={index} style={elementStyle} className={element.className}>
                {content}
              </div>
            );
          case 'textarea': // Often implies multi-line and potentially scrollable
            return (
              <ScrollArea key={index} style={elementStyle} className={element.className}>
                 <div className="whitespace-pre-wrap p-1">{content}</div>
              </ScrollArea>
            );
          case 'image':
            const imageUrl = String(value || 'https://placehold.co/100x100.png');
            const altText = card.name || `Image for ${element.fieldKey}`;
            return (
              <div key={index} style={elementStyle} className={cn("relative", element.className)}>
                <Image 
                    src={imageUrl} 
                    alt={altText} 
                    fill 
                    style={{ objectFit: (element.style?.objectFit as any) || 'contain' }}
                    data-ai-hint={card.dataAiHint || `${element.fieldKey} illustration`}
                />
              </div>
            );
          case 'iconValue':
            return (
              <div key={index} style={elementStyle} className={cn("flex items-center gap-1", element.className)}>
                {element.icon && <IconComponent name={element.icon} className="h-4 w-4 shrink-0" />}
                <span>{content}</span>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
