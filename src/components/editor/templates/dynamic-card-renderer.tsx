
"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { lucideIconsMap } from '@/lib/icons'; // Use centralized map
import { HelpCircle as FallbackIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';


const IconComponent = ({ name, ...props }: { name: string } & React.ComponentProps<typeof FallbackIcon>) => {
  const Icon = lucideIconsMap[name] || FallbackIcon;
  if (Icon === FallbackIcon && name !== 'HelpCircle') { // Avoid warning for intentional fallback
    console.warn(`[DynamicCardRenderer] Lucide icon "${name}" not found. Fallback 'HelpCircle' will be used.`);
  }
  return <Icon {...props} />;
};


export default function DynamicCardRenderer({ card, template, showPixelGrid = false }: {
  card: CardData;
  template: CardTemplate;
  showPixelGrid?: boolean;
}) {
  // console.log('[DEBUG] DynamicCardRenderer: Rendering card', card?.id, 'with template', template?.id, 'Show Grid:', showPixelGrid);
  let layout: LayoutDefinition | null = null;

  if (template.layoutDefinition) {
    try {
      layout = JSON.parse(template.layoutDefinition) as LayoutDefinition;
    } catch (error) {
      console.error(`[DynamicCardRenderer] Error parsing layoutDefinition for template "${template.id}":`, error, "\nLayout Definition:", template.layoutDefinition);
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

  // Check if canvasClassName contains a Tailwind background utility
  const hasTailwindBgClass = layout.canvasClassName && /\bbg-\S+/.test(layout.canvasClassName);

  const cardStyle: React.CSSProperties = {
    width: layout.width || `${DEFAULT_CANVAS_WIDTH}px`,
    height: layout.height || `${DEFAULT_CANVAS_HEIGHT}px`,
    ...(hasTailwindBgClass
      ? {} // If a bg- class exists in canvasClassName, let Tailwind handle it
      : { backgroundColor: layout.backgroundColor || "hsl(var(--card))" }), // Else, use direct CSS or default theme
    borderStyle: layout.borderStyle || 'solid',
    // For border color, radius, and width, Tailwind classes in canvasClassName will usually take precedence
    // over these direct styles if both are applied, due to specificity.
    // However, it's good to keep them as fallbacks if no Tailwind border classes are in canvasClassName.
    borderColor: layout.borderColor || 'hsl(var(--border))',
    borderRadius: layout.borderRadius || 'calc(var(--radius) - 2px)',
    borderWidth: layout.borderWidth || '1px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    color: 'hsl(var(--card-foreground))',
  };

  const gridOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1, // Ensure grid is behind elements
    backgroundImage: `
      linear-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(rgba(128, 128, 128, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.3) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
  };


 return (
    <div
      style={cardStyle}
      className={cn("select-none", layout.canvasClassName)}
      title={`Card ID: ${card.id} | Template: ${template.name} (${template.id})`}
    >
        {showPixelGrid && <div style={gridOverlayStyle} />}
        {layout.elements.map((element, index) => {
            try {
                const rawValue = card[element.fieldKey as keyof CardData];
                let valueForDisplay: any;

                if (
                  (element.type === 'text' || element.type === 'textarea' || element.type === 'iconValue') &&
                  typeof rawValue === 'object' &&
                  rawValue !== null
                ) {
                  try {
                    // console.warn(`[DynamicCardRenderer] fieldKey "${element.fieldKey}" (type: "${element.type}") received an object. Stringifying. Value:`, rawValue);
                    valueForDisplay = JSON.stringify(rawValue, null, 2);
                  } catch (stringifyError) {
                    // console.error(`[DynamicCardRenderer] Error stringifying object for fieldKey "${element.fieldKey}":`, stringifyError);
                    valueForDisplay = "[Unstringifiable Object]";
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
                if (element.suffix) processedText = processedText + String(element.suffix || '');
                
                const finalContentNode: string = processedText;

                const elementStyle: React.CSSProperties = { ...(element.style || {}), zIndex: index + 2 };
                if (showPixelGrid) {
                  elementStyle.outline = '1px dashed rgba(255,0,0,0.7)';
                }
                
                const hoverTitle = `fieldKey: ${element.fieldKey}`;
                let elementContent: React.ReactNode;

                switch (element.type) {
                    case 'text':
                        elementContent = <>{String(finalContentNode)}</>;
                        break;
                    case 'textarea':
                        elementContent = <div className="whitespace-pre-wrap p-1">{String(finalContentNode)}</div>;
                        break;
                    case 'image':
                        let imageUrl: string;
                        const isRawValueValidUrl = typeof valueForDisplay === 'string' && (valueForDisplay.startsWith('http://') || valueForDisplay.startsWith('https://') || valueForDisplay.startsWith('/') || valueForDisplay.startsWith('data:'));

                        if (isRawValueValidUrl) {
                            imageUrl = valueForDisplay as string;
                        } else {
                            const imgStyle = element.style || {};
                            const widthStr = String(imgStyle.width || String(DEFAULT_CANVAS_WIDTH)).replace(/px|%|em|rem|vw|vh/gi, '');
                            const heightStr = String(imgStyle.height || '100').replace(/px|%|em|rem|vw|vh/gi, '');
                            const widthNum = parseInt(widthStr, 10);
                            const heightNum = parseInt(heightStr, 10);
                            const placeholderWidth = isNaN(widthNum) || widthNum <= 0 ? 100 : widthNum;
                            const placeholderHeight = isNaN(heightNum) || heightNum <= 0 ? 100 : heightNum;
                            
                            if (typeof valueForDisplay === 'string' && valueForDisplay.trim() !== '') {
                                // console.warn(`[DynamicCardRenderer] fieldKey "${element.fieldKey}" (value: "${valueForDisplay}") used as image type but is not a valid URL. Using placeholder.`);
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
                            <span>{String(finalContentNode)}</span>
                        </>
                        );
                        break;
                    case 'iconFromData':
                        const iconNameFromData = String(valueForDisplay || '');
                        elementContent = <>{iconNameFromData.trim() && <IconComponent name={iconNameFromData.trim()} className="h-[1em] w-[1em] shrink-0" />}</>;
                        break;
                    default:
                        // console.warn(`[DynamicCardRenderer] Unknown element type "${(element as any).type}" for fieldKey "${element.fieldKey}"`);
                        return null;
                }

                const wrapperClasses = cn(
                    element.className,
                    (element.type === 'iconValue' || element.type === 'iconFromData') && 'flex items-center',
                    element.type === 'iconValue' && 'gap-1', // Add gap for iconValue
                    element.type === 'iconFromData' && 'justify-center' // Example: center iconFromData if it's standalone
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
                        {showPixelGrid && (
                           <div style={{
                            position: 'absolute', 
                            top: typeof elementStyle.top === 'string' ? elementStyle.top : '0px',
                            left: typeof elementStyle.left === 'string' ? elementStyle.left : '0px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '1px 4px',
                            fontSize: '9px',
                            borderRadius: '3px',
                            zIndex: (index + 2) + 100, 
                            pointerEvents: 'none',
                            lineHeight: '1',
                            whiteSpace: 'nowrap',
                            transform: 'translateY(-100%)', 
                          }}>
                            {element.fieldKey}
                          </div>
                        )}
                    </React.Fragment>
                );
            } catch (error) {
                 console.error(
                    `[DynamicCardRenderer] Error rendering element for fieldKey "${element.fieldKey}":`, error, 
                    "\nElement definition:", element, 
                    "\nCard data for key:", card[element.fieldKey as keyof CardData]
                );
                return (
                    <div key={`error-${index}`} style={{
                        position: 'absolute', top: element.style?.top || '0px', left: element.style?.left || '0px',
                        backgroundColor: 'rgba(255, 0, 0, 0.3)', color: 'white', fontSize: '9px',
                        border: '1px dashed red', padding: '2px', overflow: 'hidden', zIndex: 9999,
                        width: element.style?.width || 'auto', height: element.style?.height || 'auto'
                    }}>
                        Error: {element.fieldKey}
                    </div>
                );
            }
        })}
    </div>
 );
}
