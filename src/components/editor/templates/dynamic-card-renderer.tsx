
"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { lucideIconsMap } from '@/lib/icons'; 
import { HelpCircle as FallbackIcon } from 'lucide-react'; 
import { cn } from '@/lib/utils';

// Explicitly import commonly used icons and the fallback icon
import { 
  Coins, Sword, Shield, Moon, Pencil, HelpCircle, // HelpCircle is already aliased
  Zap, Brain, Heart, Skull, Star, Gem, Settings, PlusCircle, MinusCircle, XCircle, CheckCircle2, 
  AlertTriangle, Info, Wand2, Sparkles, Sun, Cloud, Flame, Leaf, Droplets, Feather, Eye, Swords, ShieldCheck, 
  ShieldAlert, Aperture, Book, Camera, Castle, Crown, Diamond, Dice5, Flag, Flower, Gift, Globe, KeyRound, Lightbulb, Lock, 
  MapPin, Medal, Mountain, Music, Package, Palette, PawPrint, Phone, Puzzle, Rocket, Save, Search, Ship, Sprout, Ticket, Trash2, 
  TreePine, Trophy, Umbrella, User, Video, Wallet, Watch, Wifi, Wrench
} from 'lucide-react';
import type * as LucideIconsAll from 'lucide-react'; // For general lookup


// Create a registry for explicitly imported icons
const iconRegistry: { [key: string]: React.ElementType<LucideIconsAll.LucideProps> } = {
  "Coins": Coins, "Sword": Sword, "Shield": Shield, "Moon": Moon, "Pencil": Pencil, "HelpCircle": HelpCircle,
  "Zap": Zap, "Brain": Brain, "Heart": Heart, "Skull": Skull, "Star": Star, "Gem": Gem, "Settings": Settings,
  "PlusCircle": PlusCircle, "MinusCircle": MinusCircle, "XCircle": XCircle, "CheckCircle2": CheckCircle2,
  "AlertTriangle": AlertTriangle, "Info": Info, "Wand2": Wand2, "Sparkles": Sparkles, "Sun": Sun,
  "Cloud": Cloud, "Flame": Flame, "Leaf": Leaf, "Droplets": Droplets, "Feather": Feather, "Eye": Eye,
  "Swords": Swords, "ShieldCheck": ShieldCheck, "ShieldAlert": ShieldAlert, "Aperture": Aperture,
  "Book": Book, "Camera": Camera, "Castle": Castle, "Crown": Crown, "Diamond": Diamond, "Dice5": Dice5,
  "Flag": Flag, // Flash was removed due to build issues
  "Flower": Flower, "Gift": Gift, "Globe": Globe, "KeyRound": KeyRound, "Lightbulb": Lightbulb,
  "Lock": Lock, "MapPin": MapPin, "Medal": Medal, "Mountain": Mountain, "Music": Music,
  "Package": Package, "Palette": Palette, "PawPrint": PawPrint, "Phone": Phone, "Puzzle": Puzzle,
  "Rocket": Rocket, "Save": Save, "Search": Search, "Ship": Ship, "Sprout": Sprout,
  "Ticket": Ticket, "Trash2": Trash2, "TreePine": TreePine, "Trophy": Trophy, "Umbrella": Umbrella,
  "User": User, "Video": Video, "Wallet": Wallet, "Watch": Watch, "Wifi": Wifi, "Wrench": Wrench,
  // FallbackIcon is not needed as a key here since HelpCircle is already mapped
};


const IconComponent = ({ name, ...props }: { name: string } & LucideIconsAll.LucideProps) => {
  const IconToRender = iconRegistry[name] || (LucideIconsAll as any)[name]; 
  if (!IconToRender || typeof IconToRender !== 'function') {
    // console.warn(`[DynamicCardRenderer] Lucide icon "${name}" not found or not a function. Fallback 'HelpCircle' will be used.`);
    return <FallbackIcon {...props} />; // Use aliased FallbackIcon
  }
  return <IconToRender {...props} />;
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

  const cardStyle: React.CSSProperties = {
    width: layout.width || '280px',
    height: layout.height || '400px',
    // backgroundColor: layout.backgroundColor || 'hsl(var(--card))', // Handled by canvasClassName
    // borderColor: layout.borderColor || 'hsl(var(--border))', // Handled by canvasClassName
    // borderRadius: layout.borderRadius || 'var(--radius)', // Handled by canvasClassName
    borderStyle: layout.borderStyle || 'solid', // Retain direct border style
    // borderWidth: layout.borderWidth || '1px', // Handled by canvasClassName
    position: 'relative',
    overflow: 'hidden', // Important for containing absolute elements
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    color: 'hsl(var(--card-foreground))', // Default text color for elements
  };

  const gridOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1, // Below elements but above card background
    backgroundImage: `
      linear-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.15) 1px, transparent 1px),
      linear-gradient(rgba(128, 128, 128, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(128, 128, 128, 0.3) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
  };


 return (
    <div style={cardStyle} className={cn("select-none", layout.canvasClassName)} title={`Card ID: ${card.id} | Template: ${template.name} (${template.id})`}>
        {showPixelGrid && <div style={gridOverlayStyle} />}
        {layout.elements.map((element, index) => {
            try {
                const rawValue = card[element.fieldKey as keyof CardData];
                let valueForDisplay: any;

                if ( (element.type === 'text' || element.type === 'textarea' || element.type === 'iconValue') && typeof rawValue === 'object' && rawValue !== null ) {
                  try {
                    console.warn(`[DynamicCardRenderer] fieldKey "${element.fieldKey}" (type: "${element.type}") received an object value. Stringifying. Value:`, rawValue);
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
                if (showPixelGrid) { // Add outline if pixel grid is active
                  elementStyle.outline = '1px dashed rgba(255,0,0,0.7)';
                }
                
                const hoverTitle = `fieldKey: ${element.fieldKey}`;
                let elementContent: React.ReactNode;

                switch (element.type) {
                    case 'text':
                        elementContent = <>{typeof finalContentNode === 'string' ? finalContentNode : JSON.stringify(finalContentNode)}</>;
                        break;
                    case 'textarea':
                        elementContent = <div className="whitespace-pre-wrap p-1">{typeof finalContentNode === 'string' ? finalContentNode : JSON.stringify(finalContentNode)}</div>;
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
                            <span>{typeof finalContentNode === 'string' ? finalContentNode : JSON.stringify(finalContentNode)}</span>
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
