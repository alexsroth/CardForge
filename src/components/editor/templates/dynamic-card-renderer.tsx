
"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition, LayoutElement } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicCardRendererProps {
  card: CardData;
  template: CardTemplate;
  showElementOutlines?: boolean; // New prop
}

const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon || typeof Icon !== 'function') {
    console.warn(`Lucide icon "${name}" not found or is not a component. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle {...props} />;
  }
  return <Icon {...props} />;
};


export default function DynamicCardRenderer({ card, template, showElementOutlines = false }: DynamicCardRendererProps) {
  let layout: LayoutDefinition | null = null;

  if (template.layoutDefinition) {
    try {
      layout = JSON.parse(template.layoutDefinition) as LayoutDefinition;
    } catch (error) {
      console.error(`Error parsing layoutDefinition for template "${template.id}":`, error, "\nLayout Definition:", template.layoutDefinition);
      return (
        <div className="w-[280px] h-[400px] border border-destructive bg-destructive/10 flex flex-col items-center justify-center p-4 text-center text-xs">
          <p className="font-semibold mb-1">Layout Error!</p>
          <p>Template: "{template.name}" (ID: {template.id})</p>
          <p>Failed to parse layout JSON. Check console for details.</p>
        </div>
      );
    }
  }

  if (!layout) {
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
    color: 'hsl(var(--card-foreground))',
  };

  return (
    <div style={cardStyle} className="select-none">
      {layout.elements.map((element, index) => {
        const value = card[element.fieldKey as keyof CardData];
        let elementStyle = { ...(element.style || {}), zIndex: 1 };

        if (showElementOutlines) {
          elementStyle = {
            ...elementStyle,
            outline: '1px dashed rgba(255,0,0,0.7)', // Red dashed outline
            outlineOffset: '-1px',
          };
        }
        
        const title = `fieldKey: ${element.fieldKey}`;

        if (value === undefined && element.type !== 'image' && !(element.prefix || element.suffix) && element.type !== 'iconValue' && element.type !== 'iconFromData') {
           return null;
        }

        let content: React.ReactNode = String(value ?? '');
        if (element.prefix) content = element.prefix + content;
        // Suffix logic might need adjustment if prefix already prepends value
        if (element.suffix) content = String(value ?? '') + element.suffix; 
        // If both prefix and suffix, ensure value is between them
        if (element.prefix && element.suffix) content = element.prefix + String(value ?? '') + element.suffix;


        switch (element.type) {
          case 'text':
            return (
              <div key={index} style={elementStyle} className={element.className} title={title}>
                {content}
              </div>
            );
          case 'textarea':
            return (
              <ScrollArea key={index} style={elementStyle} className={element.className} title={title}>
                 <div className="whitespace-pre-wrap p-1">{content}</div>
              </ScrollArea>
            );
          case 'image':
            const rawImgValue = card[element.fieldKey as keyof CardData];
            let srcForImage: string;

            if (typeof rawImgValue === 'string' &&
                (rawImgValue.startsWith('http://') ||
                 rawImgValue.startsWith('https://') ||
                 rawImgValue.startsWith('/') ||
                 rawImgValue.startsWith('data:'))) {
              srcForImage = rawImgValue;
            } else {
              const imgStyle = element.style || {};
              const widthStr = String(imgStyle.width || '100').replace(/px|%|em|rem|vw|vh/gi, '');
              const heightStr = String(imgStyle.height || '100').replace(/px|%|em|rem|vw|vh/gi, '');
              const widthNum = parseInt(widthStr, 10);
              const heightNum = parseInt(heightStr, 10);
              const placeholderWidth = isNaN(widthNum) || widthNum <= 0 ? 100 : widthNum;
              const placeholderHeight = isNaN(heightNum) || heightNum <= 0 ? 100 : heightNum;
              srcForImage = `https://placehold.co/${placeholderWidth}x${placeholderHeight}.png`;

              if (typeof rawImgValue === 'string' && rawImgValue.trim() !== '') {
                console.warn(`DynamicCardRenderer: fieldKey "${element.fieldKey}" (value: "${rawImgValue}") used as image type but is not a valid URL. Using placeholder: ${srcForImage}`);
              }
            }
            const altText = card.name || `Image for ${element.fieldKey}`;
            return (
              <div key={index} style={elementStyle} className={cn("relative", element.className)} title={title}>
                <Image
                    src={srcForImage}
                    alt={altText}
                    fill
                    style={{ objectFit: (element.style?.objectFit as any) || 'contain' }}
                    data-ai-hint={card.dataAiHint || `${element.fieldKey} illustration`}
                />
              </div>
            );
          case 'iconValue':
            return (
              <div key={index} style={elementStyle} className={cn("flex items-center gap-1", element.className)} title={title}>
                {element.icon && <IconComponent name={element.icon} className="h-full w-auto" />}
                <span>{content}</span>
              </div>
            );
          case 'iconFromData':
            const iconNameFromData = String(value || '');
            return (
              <div key={index} style={elementStyle} className={cn("flex items-center justify-center", element.className)} title={title}>
                 {iconNameFromData && <IconComponent name={iconNameFromData} className="h-full w-auto" />}
              </div>
            );
          default:
            console.warn(`DynamicCardRenderer: Unknown element type "${(element as any).type}" for fieldKey "${element.fieldKey}"`);
            return null;
        }
      })}
    </div>
  );
}
