
// src/components/CardLayoutEditor.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Tldraw,
  Editor,
  createShapeId,
  TLGeoShape, // Represents shapes like rectangles, ellipses, etc.
  TLShape,    // Base type for all shapes
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/card-templates';


// 1. Define the output structure for an element (matches existing app structure)
interface LayoutElementStyle extends React.CSSProperties {
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  fontWeight?: string;
  // position will always be 'absolute'
}

export interface LayoutElement { // Export this if parent needs it
  fieldKey: string;
  type: 'text' | 'image' | 'textarea' | 'iconValue' | 'iconFromData';
  style: LayoutElementStyle;
  className?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
}

// 2. Define props for the CardLayoutEditor component
export interface CardLayoutEditorProps { // Export this if parent needs it
  fieldKeys: string[];
  initialElements?: LayoutElement[];
  onChange: (elements: LayoutElement[]) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

// Constants (defaults if not provided in props)
const DEFAULT_SHAPE_WIDTH = 100;
const DEFAULT_SHAPE_HEIGHT = 30;
const DEFAULT_FONT_SIZE = '12px'; // Default font size for JSON output

// --- Custom Shape for representing layout fields ---
type CardFieldTldrawShape = TLGeoShape & {
  meta: {
    fieldKey: string;
    isLayoutElement: true;
    customFontSize?: string;
  };
};

// Type guard to identify our specific shapes
function isCardFieldTldrawShape(shape: TLShape): shape is CardFieldTldrawShape {
  return shape.type === 'geo' && !!shape.meta && (shape.meta as any).isLayoutElement === true && typeof (shape.meta as any).fieldKey === 'string';
}


// Helper to convert our LayoutElement to something tldraw can create
function layoutElementToInitialShape(element: LayoutElement, index: number): Omit<CardFieldTldrawShape, 'parentId' | 'index' | 'rotation' | 'isLocked'> {
  return {
    id: createShapeId(`${element.fieldKey}-${index}-${Date.now()}`), // Ensure unique IDs
    type: 'geo',
    x: parseFloat(element.style.left || '10'),
    y: parseFloat(element.style.top || '10'),
    props: {
      geo: 'rectangle',
      w: parseFloat(element.style.width || `${DEFAULT_SHAPE_WIDTH}`),
      h: parseFloat(element.style.height || `${DEFAULT_SHAPE_HEIGHT}`),
      text: element.fieldKey,
      font: 'sans', // tldraw default font
      size: 's',     // tldraw default small size. Options: 's', 'm', 'l', 'xl'
      color: 'black', // Default shape outline/text color
      fill: 'solid',  // Make it slightly visible
      fillOpacity: 0.05,
      dash: 'draw',   // Default dash style
      verticalAlign: 'middle',
      align: 'middle',
    },
    meta: {
      fieldKey: element.fieldKey,
      isLayoutElement: true,
      customFontSize: element.style.fontSize || DEFAULT_FONT_SIZE,
    },
  };
}

// Helper to convert a tldraw shape back to our LayoutElement
function tldrawShapeToLayoutElement(shape: CardFieldTldrawShape): LayoutElement {
  const round = (num: number) => Math.round(num); // Helper to round pixels
  return {
    fieldKey: shape.meta.fieldKey,
    type: 'text', // Defaulting to 'text' as per minimal requirement
    style: {
      position: 'absolute',
      top: `${round(shape.y)}px`,
      left: `${round(shape.x)}px`,
      width: `${round(shape.props.w || DEFAULT_SHAPE_WIDTH)}px`,
      height: `${round(shape.props.h || DEFAULT_SHAPE_HEIGHT)}px`,
      fontSize: shape.meta.customFontSize || DEFAULT_FONT_SIZE,
    },
  };
}


// --- FieldBankItem Component ---
interface FieldBankItemProps {
  fieldKey: string;
}

const FieldBankItem: React.FC<FieldBankItemProps> = ({ fieldKey }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/x-cardforge-fieldkey', fieldKey); // Use a custom type
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-2 mb-2 border border-border rounded-md bg-card hover:bg-muted cursor-grab active:cursor-grabbing text-sm"
      title={`Drag to add "${fieldKey}"`}
    >
      {fieldKey}
    </div>
  );
};

// --- Main CardLayoutEditor Component ---
export function CardLayoutEditor({
  fieldKeys,
  initialElements = [],
  onChange,
  canvasWidth = DEFAULT_CANVAS_WIDTH, // Use imported default
  canvasHeight = DEFAULT_CANVAS_HEIGHT, // Use imported default
}: CardLayoutEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  // This state stores the elements derived from the tldraw canvas.
  const [currentLayoutJsonElements, setCurrentLayoutJsonElements] = useState<LayoutElement[]>(initialElements);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onEditorMount = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
    editorInstance.updateInstanceState({ isGridMode: true }); // Snap to grid

    // Initial population is handled by the useEffect watching `initialElements`
  }, [setEditor]); // Removed initialElements from here

  // Effect to sync `initialElements` prop with the tldraw canvas
  useEffect(() => {
    if (!editor || !editor.currentPageShapesArray) { // ADDED CHECK for editor.currentPageShapesArray
      // If editor or its shapes array isn't ready, wait for the next render.
      // This can happen during initial setup or if tldraw is still loading its state.
      return;
    }

    const currentShapesOnCanvas = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
    const currentElementsOnCanvas = currentShapesOnCanvas.map(tldrawShapeToLayoutElement);

    // Simple deep comparison for arrays of objects
    if (JSON.stringify(initialElements) !== JSON.stringify(currentElementsOnCanvas)) {
      editor.batch(() => {
        const idsToDelete = editor.currentPageShapesArray
            .filter(isCardFieldTldrawShape) // Only delete shapes managed by this editor
            .map(s => s.id);
        if (idsToDelete.length > 0) {
            editor.deleteShapes(idsToDelete);
        }
        
        const shapesToCreate = initialElements.map((el, index) => layoutElementToInitialShape(el, index) as CardFieldTldrawShape);
        if (shapesToCreate.length > 0) {
            // Ensure shapes are created with valid props before passing to createShapes
            const validShapesToCreate = shapesToCreate.filter(shape => shape && shape.id && shape.type);
            if (validShapesToCreate.length > 0) {
              editor.createShapes(validShapesToCreate);
            }
        }
      });
      // This effect syncs CANVAS from initialElements.
      // DO NOT call setCurrentLayoutJsonElements here as it creates a loop with the parent.
      // The state `currentLayoutJsonElements` is updated by the *other* useEffect listening to editor.store.
    }
  }, [editor, initialElements]); // Watch for changes in initialElements prop


  // Effect to listen to tldraw store changes and call the external onChange
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      // Guard against accessing currentPageShapesArray if editor state is not fully ready
      if (!editor.currentPageShapesArray) return;
      
      const shapes = editor.currentPageShapesArray.filter(isCardFieldTldrawShape) as CardFieldTldrawShape[];
      const newLayoutElements = shapes.map(tldrawShapeToLayoutElement);
      
      // Only call external onChange if the elements array structurally changed from what's on canvas
      if (JSON.stringify(newLayoutElements) !== JSON.stringify(currentLayoutJsonElements)) {
        setCurrentLayoutJsonElements(newLayoutElements); // Update internal representation for comparison
        onChangeRef.current(newLayoutElements);
      }
    };

    const cleanup = editor.store.listen(handleChange, {
      source: 'user', 
      scope: 'document', 
    });
    
    return () => cleanup(); 
  }, [editor, currentLayoutJsonElements]); // Depend on internal representation

  const handleDropOnCanvasContainer = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!editor) return;

      const fieldKey = e.dataTransfer.getData('application/x-cardforge-fieldkey');
      if (!fieldKeys.includes(fieldKey)) return;

      const tldrawContainer = editor.getContainer(); 
      if (!tldrawContainer) return;
      
      const rect = tldrawContainer.getBoundingClientRect();
      const xOnCanvas = e.clientX - rect.left;
      const yOnCanvas = e.clientY - rect.top;

      const pointInPageSpace = editor.screenToPage({ x: xOnCanvas, y: yOnCanvas });

      editor.batch(() => {
        editor.createShape<CardFieldTldrawShape>({
          id: createShapeId(fieldKey + Date.now()),
          type: 'geo',
          x: pointInPageSpace.x - DEFAULT_SHAPE_WIDTH / 2,
          y: pointInPageSpace.y - DEFAULT_SHAPE_HEIGHT / 2,
          props: {
            geo: 'rectangle',
            w: DEFAULT_SHAPE_WIDTH,
            h: DEFAULT_SHAPE_HEIGHT,
            text: fieldKey,
            font: 'sans',
            size: 's', 
            color: 'black',
            fill: 'solid',
            fillOpacity: 0.05,
            dash: 'draw',
            verticalAlign: 'middle',
            align: 'middle',
          },
          meta: {
            fieldKey: fieldKey,
            isLayoutElement: true,
            customFontSize: DEFAULT_FONT_SIZE,
          },
        });
      });
    },
    [editor, fieldKeys]
  );

  const handleDragOverCanvasContainer = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-[550px] w-full border border-border rounded-md bg-background text-foreground shadow-sm">
      {/* 1. Field Bank (left panel) */}
      <div className="w-[160px] p-3 border-r border-border overflow-y-auto flex flex-col shrink-0">
        <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background pt-1 pb-2 z-10 border-b border-border">
          Available Fields
        </h3>
        <div className="flex-grow">
          {fieldKeys.length > 0 ? (
            fieldKeys.map((key) => <FieldBankItem key={key} fieldKey={key} />)
          ) : (
            <p className="text-xs text-muted-foreground">No fields provided.</p>
          )}
        </div>
      </div>
      {/* 2. Canvas (center panel) */}
      <div
        className="flex-grow relative flex items-center justify-center bg-muted/20 p-4" // Updated for flex-grow and padding
        onDrop={handleDropOnCanvasContainer}
        onDragOver={handleDragOverCanvasContainer}
      >
        <div 
          style={{ width: canvasWidth, height: canvasHeight }}
          className="bg-card shadow-lg border border-input overflow-hidden" // Ensure tldraw canvas is visible
        >
          <Tldraw
            key={`tldraw-editor-${canvasWidth}-${canvasHeight}-${JSON.stringify(initialElements.map(e => e.fieldKey))}`}
            persistenceKey={`card_layout_editor_instance_${canvasWidth}x${canvasHeight}`} 
            onMount={onEditorMount}
            assetUrls={{
                baseUrl: typeof window !== 'undefined' ? window.location.origin + '/tldraw-assets/' : '/tldraw-assets/'
            }}
          />
        </div>
      </div>
      {/* 3. Live JSON Output (right panel) */}
      <div className="w-[220px] p-3 border-l border-border overflow-y-auto flex flex-col shrink-0">
        <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background pt-1 pb-2 z-10 border-b border-border">
          Layout Elements (JSON)
        </h3>
        <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap flex-grow border border-input font-mono">
          {JSON.stringify(currentLayoutJsonElements, null, 2)}
        </pre>
      </div>
    </div>
  );
}

