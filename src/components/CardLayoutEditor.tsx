
// src/components/CardLayoutEditor.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Tldraw,
  Editor,
  createShapeId,
  TLGeoShape, 
  TLShape,    
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

export interface LayoutElement { 
  fieldKey: string;
  type: 'text' | 'image' | 'textarea' | 'iconValue' | 'iconFromData';
  style: LayoutElementStyle;
  className?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
}

// 2. Define props for the CardLayoutEditor component
export interface CardLayoutEditorProps { 
  fieldKeys: string[];
  initialElements?: LayoutElement[];
  onChange: (elements: LayoutElement[]) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

// Constants 
const DEFAULT_SHAPE_WIDTH = 100;
const DEFAULT_SHAPE_HEIGHT = 30;
const DEFAULT_FONT_SIZE = '12px'; 

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
  // console.log('[DEBUG] CardLayoutEditor/layoutElementToInitialShape: Converting element', element);
  return {
    id: createShapeId(`${element.fieldKey}-${index}-${Date.now()}`), 
    type: 'geo',
    x: parseFloat(element.style.left || '10'),
    y: parseFloat(element.style.top || '10'),
    props: {
      geo: 'rectangle',
      w: parseFloat(element.style.width || `${DEFAULT_SHAPE_WIDTH}`),
      h: parseFloat(element.style.height || `${DEFAULT_SHAPE_HEIGHT}`),
      text: element.fieldKey,
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
      fieldKey: element.fieldKey,
      isLayoutElement: true,
      customFontSize: element.style.fontSize || DEFAULT_FONT_SIZE,
    },
  };
}

// Helper to convert a tldraw shape back to our LayoutElement
function tldrawShapeToLayoutElement(shape: CardFieldTldrawShape): LayoutElement {
  const round = (num: number) => Math.round(num); 
  // console.log('[DEBUG] CardLayoutEditor/tldrawShapeToLayoutElement: Converting shape', shape);
  return {
    fieldKey: shape.meta.fieldKey,
    type: 'text', 
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
    // console.log('[DEBUG] FieldBankItem/handleDragStart: Dragging fieldKey', fieldKey);
    e.dataTransfer.setData('application/x-cardforge-fieldkey', fieldKey); 
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
  canvasWidth = DEFAULT_CANVAS_WIDTH, 
  canvasHeight = DEFAULT_CANVAS_HEIGHT, 
}: CardLayoutEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  // This state stores the elements derived from the tldraw canvas.
  // It is ONLY updated by the tldraw store listener.
  const [currentLayoutJsonElements, setCurrentLayoutJsonElements] = useState<LayoutElement[]>(initialElements);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onEditorMount = useCallback((editorInstance: Editor) => {
    console.log('[DEBUG] CardLayoutEditor/onEditorMount: Editor mounted.');
    setEditor(editorInstance);
    editorInstance.updateInstanceState({ isGridMode: true }); 

    // Initial population handled by the useEffect watching `initialElements`
    // This was moved to avoid direct initialElements dependency in onEditorMount's useCallback
  }, [setEditor]); // Removed initialElements to stabilize onEditorMount reference


  useEffect(() => {
    if (!editor) return;
    console.log('[DEBUG] CardLayoutEditor: initialElements prop effect running. Length:', initialElements.length);
    
    // Guard against undefined currentPageShapesArray during early renders
    if (!editor.currentPageShapesArray) {
        console.log('[DEBUG] CardLayoutEditor: editor.currentPageShapesArray not ready in initialElements effect.');
        return;
    }

    const currentShapesOnCanvas = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
    const currentElementsOnCanvas = currentShapesOnCanvas.map(tldrawShapeToLayoutElement);

    if (JSON.stringify(initialElements) !== JSON.stringify(currentElementsOnCanvas)) {
      console.log('[DEBUG] CardLayoutEditor: initialElements differ from canvas. Re-syncing canvas. Initial:', initialElements.length, 'Canvas:', currentElementsOnCanvas.length);
      editor.batch(() => {
        const idsToDelete = currentShapesOnCanvas.map(s => s.id);
        if (idsToDelete.length > 0) {
            editor.deleteShapes(idsToDelete);
        }
        
        const shapesToCreate = initialElements.map((el, index) => layoutElementToInitialShape(el, index) as CardFieldTldrawShape);
        if (shapesToCreate.length > 0) {
            const validShapesToCreate = shapesToCreate.filter(shape => shape && shape.id && shape.type);
            if (validShapesToCreate.length > 0) {
              editor.createShapes(validShapesToCreate);
            }
        }
      });
    }
  }, [editor, initialElements]); 


  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      // console.log('[DEBUG] CardLayoutEditor: tldraw store change detected.');
      if (!editor.currentPageShapesArray) {
        // console.log('[DEBUG] CardLayoutEditor: editor.currentPageShapesArray not ready in store listener.');
        return;
      }
      
      const shapes = editor.currentPageShapesArray.filter(isCardFieldTldrawShape) as CardFieldTldrawShape[];
      const newLayoutElements = shapes.map(tldrawShapeToLayoutElement);
      
      // Only update internal state and call external onChange if the elements array structurally changed
      if (JSON.stringify(newLayoutElements) !== JSON.stringify(currentLayoutJsonElements)) {
        // console.log('[DEBUG] CardLayoutEditor: Layout changed. New elements count:', newLayoutElements.length);
        setCurrentLayoutJsonElements(newLayoutElements); 
        onChangeRef.current(newLayoutElements);
      }
    };

    const cleanup = editor.store.listen(handleChange, {
      source: 'user', 
      scope: 'document', 
    });
    
    return () => cleanup(); 
  }, [editor, currentLayoutJsonElements]); // Depend on internal representation to avoid unnecessary external calls

  const handleDropOnCanvasContainer = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!editor) return;

      const fieldKey = e.dataTransfer.getData('application/x-cardforge-fieldkey');
      console.log('[DEBUG] CardLayoutEditor/handleDropOnCanvasContainer: Dropped fieldKey', fieldKey);
      if (!fieldKeys.includes(fieldKey)) {
        console.warn('[DEBUG] CardLayoutEditor/handleDropOnCanvasContainer: Dropped unknown fieldKey', fieldKey);
        return;
      }

      const tldrawContainer = editor.getContainer(); 
      if (!tldrawContainer) {
        console.warn('[DEBUG] CardLayoutEditor/handleDropOnCanvasContainer: tldraw container not found.');
        return;
      }
      
      const rect = tldrawContainer.getBoundingClientRect();
      const xOnCanvas = e.clientX - rect.left;
      const yOnCanvas = e.clientY - rect.top;

      const pointInPageSpace = editor.screenToPage({ x: xOnCanvas, y: yOnCanvas });
      console.log('[DEBUG] CardLayoutEditor/handleDropOnCanvasContainer: Drop at page coords', pointInPageSpace);

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
        className="flex-grow relative flex items-center justify-center bg-muted/20 p-4" 
        onDrop={handleDropOnCanvasContainer}
        onDragOver={handleDragOverCanvasContainer}
      >
        <div 
          style={{ width: canvasWidth, height: canvasHeight }}
          className="bg-card shadow-lg border border-input overflow-hidden" 
        >
          <Tldraw
            key={`tldraw-editor-${canvasWidth}-${canvasHeight}-${JSON.stringify(initialElements.map(e => e.fieldKey))}`}
            persistenceKey={`card_layout_editor_instance_${canvasWidth}x${canvasHeight}`} 
            onMount={onEditorMount}
            assetUrls={{
                baseUrl: typeof window !== 'undefined' ? window.location.origin + '/tldraw-assets/' : '/tldraw-assets/'
            }}
             // Hide most of the default UI to simplify
            components={{
                HelpMenu: () => null,
                MenuPanel: () => null,
                PageMenu: () => null,
                ZoomMenu: () => null,
                MainMenu: () => null,
                Minimap: () => null,
                StylePanel: () => null,
                // DebugMenu: () => null, // Keep for debugging if needed locally
                // NavigationPanel: () => null, // Usually contains zoom, undo/redo
                // Toolbar: () => null, // Contains shape tools, select, draw, erase
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

