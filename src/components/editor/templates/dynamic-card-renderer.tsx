
"use client";

import type { CardData } from '@/lib/types';
import type { CardTemplate, LayoutDefinition } from '@/lib/card-templates';
import Image from 'next/image';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIconsAll from 'lucide-react'; // For general lookup
// Explicitly import commonly used icons and the fallback icon
import {
  Sword, Moon, Pencil, Coins,
  Zap, Brain, Heart, Skull, Star, Gem, Settings, PlusCircle, MinusCircle, XCircle, CheckCircle2,
  AlertTriangle, Info, Wand2, Sparkles, Sun, Cloud, Flame, Leaf, Droplets, Feather, Eye, Swords, ShieldCheck,
  ShieldAlert, Aperture, Book, Camera, Castle, Crown, Diamond, Dice5, Flag, Flower, Gift, Globe, KeyRound, Lightbulb, Lock,
  MapPin, Medal, Mountain, Music, Package, Palette, PawPrint, Phone, Puzzle, Rocket, Save, Search, Ship, Sprout, Ticket, Trash2,
  TreePine, Trophy, Umbrella, User, Video, Wallet, Watch, Wifi, Wrench, HelpCircle as FallbackIcon
} from 'lucide-react';
import { Shield as ShieldIcon } from 'lucide-react'; // Import Shield with an alias
import { cn } from '@/lib/utils';

// Create a registry for explicitly imported icons
const iconRegistry: { [key: string]: React.ElementType<LucideIconsAll.LucideProps> } = {
  Sword, Shield, Moon, Pencil, Coins,
  Zap, Brain, Heart, Skull, Star, Gem, Settings, PlusCircle, MinusCircle, XCircle, CheckCircle2, 
  AlertTriangle, Info, Wand2, Sparkles, Sun, Cloud, Flame, Leaf, Droplets, Feather, Eye, Swords, 
  ShieldCheck, ShieldAlert, Aperture, Book, Camera, Castle, Crown, Diamond, Dice5, Flag, ShieldIcon,
  Flower, Gift, Globe, KeyRound, Lightbulb, Lock, MapPin, Medal, Mountain, Music, Package, 
  Palette, PawPrint, Phone, Puzzle, Rocket, Save, Search, Ship, Sprout, Ticket, Trash2, TreePine, 
  Trophy, Umbrella, User, Video, Wallet, Watch, Wifi, Wrench, HelpCircle: FallbackIcon
};

const IconComponent = ({ name, ...props }: { name: string } & LucideIconsAll.LucideProps) => {
  // Prioritize the registry, then fall back to dynamic lookup
  const IconToRender = iconRegistry[name] || (LucideIconsAll as any)[name];

  if (!IconToRender || typeof IconToRender !== 'function') {
    console.warn(`Lucide icon "${name}" not found or is not a component. Fallback 'HelpCircle' will be used.`);
    return <FallbackIcon {...props} />; // Use the explicitly imported FallbackIcon
  }
  return <IconToRender {...props} />;
};


export default function DynamicCardRenderer({ card, template, showElementOutlines = false }: {
  card: CardData;
  template: CardTemplate;
  showElementOutlines?: boolean;
}) {
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
 try {
 const rawValue = card[element.fieldKey as keyof CardData];
 let elementStyle = { ...(element.style || {}), zIndex: index + 1 };
 if (showElementOutlines) {

 elementStyle = {
 ...elementStyle,
 outline: '1px dashed rgba(255,0,0,0.7)',
 outlineOffset: '-1px',
 };
 }

 const hoverTitle = `fieldKey: ${element.fieldKey}`;
 let valueForDisplay: any = rawValue;
 if (rawValue === undefined || rawValue === null) {

 if (element.type === 'number') valueForDisplay = '';
 else if (element.type === 'boolean') valueForDisplay = false;
 else valueForDisplay = '';
 }

 let content: React.ReactNode = String(valueForDisplay ?? '');
 if (element.prefix) content = element.prefix + String(valueForDisplay ?? '');
 if (element.suffix) content = String(valueForDisplay ?? '') + element.suffix;
 if (element.prefix && element.suffix) content = element.prefix + String(valueForDisplay ?? '') + element.suffix;

 let elementContent: React.ReactNode;

 switch (element.type) {
 case 'text':
 elementContent = <>{content}</>;
 break;
 case 'textarea':
 elementContent = <div className="whitespace-pre-wrap p-1">{content}</div>;
 break;
 case 'image':
 let imageUrl: string;
 if (typeof rawValue === 'string' && (rawValue.startsWith('http://') || rawValue.startsWith('https://') || rawValue.startsWith('/') || rawValue.startsWith('data:'))) {
 imageUrl = rawValue;

 } else {
 const imgStyle = element.style || {};
 const widthStr = String(imgStyle.width || '100').replace(/px|%|em|rem|vw|vh/gi, '');
 const heightStr = String(imgStyle.height || '100').replace(/px|%|em|rem|vw|vh/gi, '');
 const widthNum = parseInt(widthStr, 10);
 const heightNum = parseInt(heightStr, 10);

 const placeholderWidth = isNaN(widthNum) || widthNum <= 0 ? 100 : widthNum;
 const placeholderHeight = isNaN(heightNum) || heightNum <= 0 ? 100 : heightNum;

 if (typeof rawValue === 'string' && rawValue.trim() !== '' && !(rawValue.startsWith('http://') || rawValue.startsWith('https://') || rawValue.startsWith('/') || rawValue.startsWith('data:'))) {
 console.warn(`DynamicCardRenderer: fieldKey "${element.fieldKey}" (value: "${rawValue}") used as image type but is not a valid URL. Using placeholder.`);
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
 <span>{content}</span>
 </>
 );
 break;
 case 'iconFromData':
 const iconNameFromData = String(valueForDisplay || '');
 elementContent = <>{iconNameFromData.trim() && <IconComponent name={iconNameFromData.trim()} className="h-[1em] w-[1em] shrink-0" />}</>;
 break;
 default:
 console.warn(`DynamicCardRenderer: Unknown element type "${(element as any).type}" for fieldKey "${element.fieldKey}"`);
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
 {showElementOutlines && (
 <div style={{
 position: 'absolute',
 top: typeof elementStyle.top === 'string' ? `calc(${elementStyle.top} + 0px)` : '0px',
 left: typeof elementStyle.left === 'string' ? `calc(${elementStyle.left} + 0px)` : '0px',
 backgroundColor: 'rgba(0, 0, 0, 0.7)',
 color: 'white',
 padding: '1px 4px',
 fontSize: '9px',
 borderRadius: '3px',
 zIndex: 10000,
 pointerEvents: 'none',
 lineHeight: '1',
 whiteSpace: 'nowrap',
 }}>
 {element.fieldKey}
 </div>
 )}
 </React.Fragment>
 );
 } catch (error) {
 console.error(`Error rendering element for fieldKey "${element.fieldKey}" in DynamicCardRenderer:`, error);
 return (
 <div key={`error-${index}`} style={{
 position: 'absolute',
 top: '0',
 left: '0',
 width: '100%',
 height: '100%',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: 'rgba(255, 0, 0, 0.2)',
 color: 'red',
 fontSize: '12px',
 zIndex: 9999,
 }}>
 Error rendering element "{element.fieldKey}". See console.
 </div>
 );
 }
 })}
 </div>
  );
}
