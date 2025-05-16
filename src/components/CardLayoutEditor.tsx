// src/components/CardLayoutEditor.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Tldraw,
  Editor,
  createShapeId,
  TLGeoShape,
  TLShape,
  // TLBaseShape, // TLShape is generally preferred for type guards
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

interface LayoutElementStyle extends React.CSSProperties {
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  fontWeight?: string;
  position?: 'absolute';
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

export interface CardLayoutEditorProps {
  fieldKeys: string[];
  initialElements?: LayoutElement[];
  onChange: (elements: LayoutElement[]) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const DEFAULT_CANVAS_WIDTH = 280;
const DEFAULT_CANVAS_HEIGHT = 400;
const DEFAULT_SHAPE_WIDTH = 120; 
const DEFAULT_SHAPE_HEIGHT = 36; 
const DEFAULT_FONT_SIZE = '12px';

type CardFieldTldrawShape = TLGeoShape & {
  meta: {
    fieldKey: string;
    isLayoutElement: true;
    customFontSize?: string;
  };
};

function isCardFieldTldrawShape(shape: TLShape): shape is CardFieldTldrawShape {
  return shape.type === 'geo' && !!shape.meta && (shape.meta as any).isLayoutElement === true && typeof (shape.meta as any).fieldKey === 'string';
}

function layoutElementToInitialShape(element: LayoutElement, index: number): Omit<CardFieldTldrawShape, 'parentId' | 'index' | 'rotation' | 'isLocked'> {
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

function tldrawShapeToLayoutElement(shape: CardFieldTldrawShape): LayoutElement {
  const round = (num: number) => Math.round(num);
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

interface FieldBankItemProps {
  fieldKey: string;
}

const FieldBankItem: React.FC<FieldBankItemProps> = ({ fieldKey }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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

export function CardLayoutEditor({
  fieldKeys,
  initialElements = [], // Default to empty array
  onChange,
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
}: CardLayoutEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [currentLayoutJsonElements, setCurrentLayoutJsonElements] = useState<LayoutElement[]>(initialElements);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // This onMount is for tldraw's initialization.
  // It should be stable and not cause re-mounts if its reference changes.
  const onEditorMount = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
    editorInstance.updateInstanceState({ isGridMode: true });
    // Load initial elements ONCE on mount
    // `initialElements` here is captured from the props at the time of mount
    // If `initialElements` changes later, the `useEffect` below handles it.
    const shapesToCreate = initialElements.map((el, index) => layoutElementToInitialShape(el, index) as CardFieldTldrawShape);
    if (shapesToCreate.length > 0) {
        editorInstance.batch(() => {
            editorInstance.createShapes(shapesToCreate);
        });
    }
    // Reflect this initial canvas state to parent
    const currentShapesOnCanvas = editorInstance.currentPageShapesArray.filter(isCardFieldTldrawShape);
    const currentElementsOnCanvas = currentShapesOnCanvas.map(tldrawShapeToLayoutElement);
    setCurrentLayoutJsonElements(currentElementsOnCanvas);
    onChangeRef.current(currentElementsOnCanvas);
  }, [setEditor, initialElements]); // `initialElements` needed here for correct closure on mount if it has a default

  // Effect to react to changes in `initialElements` prop from parent
  // This is crucial for when the parent updates elements (e.g., from textarea or loading a new template)
  useEffect(() => {
    if (!editor || !initialElements) return;

    // Get current elements from tldraw canvas for comparison
    const currentShapesOnCanvas = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
    const currentElementsOnCanvas = currentShapesOnCanvas.map(tldrawShapeToLayoutElement);

    // Only update tldraw if the incoming `initialElements` from parent
    // is actually different from what's currently rendered on the canvas.
    if (JSON.stringify(initialElements) !== JSON.stringify(currentElementsOnCanvas)) {
      console.log("CardLayoutEditor: initialElements prop changed, updating tldraw canvas.");
      editor.batch(() => {
        const idsToDelete = editor.currentPageShapesArray
            .filter(isCardFieldTldrawShape)
            .map(s => s.id);
        if (idsToDelete.length > 0) {
            editor.deleteShapes(idsToDelete);
        }
        
        const shapesToCreate = initialElements.map((el, index) => layoutElementToInitialShape(el, index) as CardFieldTldrawShape);
        if (shapesToCreate.length > 0) {
            editor.createShapes(shapesToCreate);
        }
      });
      // After updating tldraw, also update the internal JSON preview to match the new initialElements
      setCurrentLayoutJsonElements(initialElements);
    }
  }, [editor, initialElements]); // This effect now handles syncing prop changes to tldraw


  // Effect to listen to tldraw store changes and propagate them outwards
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      const shapes = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
      const newLayoutElements = shapes.map(tldrawShapeToLayoutElement);
      
      // Only call onChange (and update internal preview) if the elements have actually changed
      if (JSON.stringify(newLayoutElements) !== JSON.stringify(currentLayoutJsonElements)) {
        setCurrentLayoutJsonElements(newLayoutElements);
        onChangeRef.current(newLayoutElements);
      }
    };

    const cleanup = editor.store.listen(handleChange, {
      source: 'user', // Listen to user-driven changes (drag, resize, create, delete)
      scope: 'document', // Listen to shape/document changes
    });
    
    return () => cleanup(); // Unsubscribe on component unmount or when editor changes
  }, [editor, currentLayoutJsonElements]); // currentLayoutJsonElements is a dependency to re-evaluate string comparison

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
            // Using a more dynamic key to encourage re-mount if critical aspects change,
            // though ideally useEffect for initialElements handles updates.
            // If tldraw has issues with prop updates, a key change can force full re-initialization.
            key={`tldraw-editor-${canvasWidth}-${canvasHeight}-${JSON.stringify(initialElements.map(e => e.fieldKey))}`}
            persistenceKey={`card_layout_editor_instance_${canvasWidth}x${canvasHeight}`} // Unique persistence key
            onMount={onEditorMount}
            assetUrls={{
                baseUrl: typeof window !== 'undefined' ? window.location.origin + '/tldraw-assets/' : '/tldraw-assets/'
            }}
          />
        </div>
      </div>
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
