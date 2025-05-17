"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle as FallbackIcon } from 'lucide-react'; // Keep FallbackIcon if used elsewhere
import { lucideIconsMap } from '@/lib/icons'; // Import the centralized map
import { cn } from '@/lib/utils';

// IconComponent now uses the centralized map
const IconComponent = ({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) => {
  const IconToRender = lucideIconsMap[name as keyof typeof lucideIconsMap]; // Use the map for lookup
  if (!IconToRender || typeof IconToRender !== 'function') {
    console.warn(`[DynamicCardRenderer] Lucide icon "${name}" not found or not a function. Fallback 'HelpCircle' will be used.`);
    return <FallbackIcon {...props} />;
  }
  return <IconToRender {...props} />;
};


export default function DynamicCardRenderer({ card, template, showPixelGrid = false }: {
  card: CardData;
  template: CardTemplate;
  showPixelGrid?: boolean;
}) {
  console.log('[DEBUG] DynamicCardRenderer: Rendering card', card?.id, 'with template', template?.id);
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

  const gridOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
    backgroundImage: `
      linear-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(rgba(128, 128, 128, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.3) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
  };


 return (
    <div style={cardStyle} className="select-none" title={`Card ID: ${card.id} | Template: ${template.name} (${template.id})`}>
        {showPixelGrid && <div style={gridOverlayStyle} />}
        {layout.elements.map((element, index) => {
            try {
                const rawValue = card[element.fieldKey as keyof CardData];
                let valueForDisplay: any;

                if ( (element.type === 'text' || element.type === 'textarea' || element.type === 'iconValue') && typeof rawValue === 'object' && rawValue !== null ) {
                  console.warn(`[DynamicCardRenderer] fieldKey "${element.fieldKey}" (type: "${element.type}") received an object value. Stringifying. Value:`, rawValue );
                  try {
                    valueForDisplay = JSON.stringify(rawValue, null, 2);
                  } catch (stringifyError) {
                    console.error(`[DynamicCardRenderer] Error stringifying object for fieldKey "${element.fieldKey}":`, stringifyError);
                    valueForDisplay = "[Error: Unstringifiable Object]";
                  }
                } else if (rawValue === undefined || rawValue === null) {
                  if (element.type === 'number') valueForDisplay = '';
                  else if (element.type === 'boolean') valueForDisplay = false;
                  else valueForDisplay = '';
                } else {
                  valueForDisplay = rawValue;
                }
                
                let textualContent: string = String(valueForDisplay ?? '');
                let processedText = textualContent;

                if (element.prefix) processedText = String(element.prefix || '') + textualContent;
                if (element.suffix) processedText = textualContent + String(element.suffix || '');
                if (element.prefix && element.suffix) processedText = String(element.prefix || '') + textualContent + String(element.suffix || '');
                
                const finalContentNode: string = processedText;
                const elementStyle = { ...(element.style || {}), zIndex: index + 2 };
                const hoverTitle = `fieldKey: ${element.fieldKey}`;
                let elementContent: React.ReactNode;

                switch (element.type) {
                    case 'text':
                        elementContent = <>{typeof finalContentNode === 'string' ? finalContentNode : String(finalContentNode)}</>;
                        break;
                    case 'textarea':
                        elementContent = <div className="whitespace-pre-wrap p-1">{typeof finalContentNode === 'string' ? finalContentNode : String(finalContentNode)}</div>;
                        break;
                    case 'image':
                        let imageUrl: string;
                        const isRawValueValidUrl = typeof valueForDisplay === 'string' && (valueForDisplay.startsWith('http://') || valueForDisplay.startsWith('https://') || valueForDisplay.startsWith('/') || valueForDisplay.startsWith('data:'));

                        if (isRawValueValidUrl) {
                            imageUrl = valueForDisplay as string;
                        } else {
                            const imgStyle = element.style || {};
                            const widthStr = String(imgStyle.width || '100').replace(/px|%|em|rem|vw|vh/gi, '');
                            const heightStr = String(imgStyle.height || '100').replace(/px|%|em|rem|vw|vh/gi, '');
                            const widthNum = parseInt(widthStr, 10);
                            const heightNum = parseInt(heightStr, 10);
                            const placeholderWidth = isNaN(widthNum) || widthNum <= 0 ? 100 : widthNum;
                            const placeholderHeight = isNaN(heightNum) || heightNum <= 0 ? 100 : heightNum;
                            
                            if (typeof valueForDisplay === 'string' && valueForDisplay.trim() !== '') {
                                console.warn(`[DynamicCardRenderer] fieldKey "${element.fieldKey}" (value: "${valueForDisplay}") used as image type but is not a valid URL. Using placeholder.`);
                            }
                            imageUrl = `https://placehold.co/${placeholderWidth}x${placeholderHeight}.png/E8E8E8/AAAAAA?text=Invalid+Src`;
                        }
                        const altText = card.name || `Image for ${element.fieldKey}`;
                        elementContent = (
                        <div style={{position: 'relative', width: '100%', height: '100%'}}>
                            <Image
                                src={imageUrl}
                                alt={altText}
                                sizes="100vw" 
                                fill
                                style={{ objectFit: (element.style?.objectFit as any) || 'contain' }}
                                data-ai-hint={card.dataAiHint || `${element.fieldKey} illustration`}
                                priority={index < 3} 
                            />
                        </div>
                        );
                        break;
                    case 'iconValue':
                        elementContent = (
                        <>
                            {element.icon && <IconComponent name={element.icon.trim()} className="h-[1em] w-[1em] shrink-0" />}
                            <span>{typeof finalContentNode === 'string' ? finalContentNode : String(finalContentNode)}</span>
                        </>
                        );
                        break;
                    case 'iconFromData':
                        const iconNameFromData = String(valueForDisplay || '');
                        elementContent = <>{iconNameFromData.trim() && <IconComponent name={iconNameFromData.trim()} className="h-[1em] w-[1em] shrink-0" />}</>;
                        break;
                    default:
                        console.warn(`[DynamicCardRenderer] Unknown element type "${(element as any).type}" for fieldKey "${element.fieldKey}"`);
                        return null;
                }

                const wrapperClasses = cn(
                    element.className,
                    (element.type === 'iconValue' || element.type === 'iconFromData') && 'flex items-center',
                    element.type === 'iconValue' && 'gap-1',
                    element.type === 'iconFromData' && 'justify-center' 
                );

                const finalElement = element.type === 'textarea' ? (
                    <ScrollArea key={index} style={elementStyle} className={wrapperClasses} title={hoverTitle}>
                        {elementContent}
                    </ScrollArea>
                ) : (
                    <div key={index} style={elementStyle} className={wrapperClasses} title={hoverTitle}>
                        {elementContent}
                    </div>
                );

                return (
                    <React.Fragment key={`frag-${index}`}>
                        {finalElement}
                    </React.Fragment>
                );
            } catch (error) {
                console.error(`[DynamicCardRenderer] Error rendering element for fieldKey "${element.fieldKey}":`, error, "\nElement definition:", element, "\nCard data for key:", card[element.fieldKey as keyof CardData]);
                return (
                    <div key={`error-${index}`} style={{
                        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(255, 0, 0, 0.2)', color: 'red', fontSize: '10px',
                        border: '1px solid red', padding: '2px', overflow: 'hidden', zIndex: 9999
                    }}>
                        Error: {element.fieldKey}
                    </div>
                );
            }
        })}
    </div>
 );
}