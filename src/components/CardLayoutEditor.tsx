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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
// DEFAULT_CANVAS_WIDTH and DEFAULT_CANVAS_HEIGHT are now imported from @/lib/card-templates
const DEFAULT_SHAPE_WIDTH = 120;
const DEFAULT_SHAPE_HEIGHT = 32;
const DEFAULT_FONT_SIZE = '12px'; 
const SHAPE_CASCADE_OFFSET_X = 15;
const SHAPE_CASCADE_OFFSET_Y = 15;


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
function layoutElementToShapeProps(element: LayoutElement, editor: Editor | null, index: number): Omit<CardFieldTldrawShape, 'parentId' | 'index' | 'rotation' | 'isLocked'> {
  // console.log('[DEBUG] CardLayoutEditor/layoutElementToShapeProps: Converting element', element, 'at index', index);
  // Determine a cascading default position if not provided
  const defaultX = 10 + (index % 3) * (DEFAULT_SHAPE_WIDTH + SHAPE_CASCADE_OFFSET_X);
  const defaultY = 10 + Math.floor(index / 3) * (DEFAULT_SHAPE_HEIGHT + SHAPE_CASCADE_OFFSET_Y);
  
  return {
    id: createShapeId(`${element.fieldKey}-${index}-${Date.now()}`), 
    type: 'geo',
    x: parseFloat(element.style.left || `${defaultX}`),
    y: parseFloat(element.style.top || `${defaultY}`),
    props: {
      geo: 'rectangle',
      w: parseFloat(element.style.width || `${DEFAULT_SHAPE_WIDTH}`),
      h: parseFloat(element.style.height || `${DEFAULT_SHAPE_HEIGHT}`),
      text: element.fieldKey,
      font: 'sans', 
      size: 's',     // tldraw small size
      color: 'black', // Default shape outline/text color from tldraw theme
      fill: 'solid',  // Enable fill
      fillOpacity: 0.05, // Make fill very light
      dash: 'draw',   // Dashed outline
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
  // // console.log('[DEBUG] CardLayoutEditor/tldrawShapeToLayoutElement: Converting shape', shape);
  return {
    fieldKey: shape.meta.fieldKey,
    type: 'text', // Defaulting to 'text' as type is not stored on tldraw shape for minimal version
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


// --- FieldToggleItem Component ---
interface FieldToggleItemProps {
  fieldKey: string;
  isChecked: boolean;
  onToggle: (fieldKey: string, isChecked: boolean) => void;
}

const FieldToggleItem: React.FC<FieldToggleItemProps> = ({ fieldKey, isChecked, onToggle }) => {
  const uniqueId = `toggle-${fieldKey}`;
  return (
    <div className="flex items-center p-1.5 mb-1 border-b border-border last:border-b-0 hover:bg-muted/50 rounded-sm transition-colors">
      <Checkbox
        id={uniqueId}
        checked={isChecked}
        onCheckedChange={(checked) => {
          // console.log(`[DEBUG] FieldToggleItem: ${fieldKey} toggled to ${Boolean(checked)}`);
          onToggle(fieldKey, Boolean(checked));
        }}
        className="mr-2 h-4 w-4"
      />
      <Label htmlFor={uniqueId} className="text-xs font-medium cursor-pointer flex-grow">
        {fieldKey}
      </Label>
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
  const [currentLayoutJsonElements, setCurrentLayoutJsonElements] = useState<LayoutElement[]>(initialElements);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onEditorMount = useCallback((editorInstance: Editor) => {
    // console.log('[DEBUG] CardLayoutEditor/onEditorMount: Editor mounted.');
    setEditor(editorInstance);
    editorInstance.updateInstanceState({ isGridMode: true }); 
    editorInstance.updateInstanceState({
        isReadonly: false,
        isDebugMode: false,
    });
    // Initial population is now solely handled by the useEffect watching [editor, initialElements]
  }, [setEditor]); // Removed initialElements dependency


  // Effect to synchronize initialElements prop with the tldraw canvas
  useEffect(() => {
    if (!editor) {
        // console.log('[DEBUG] CardLayoutEditor: initialElements prop effect: editor not ready.');
        return;
    }
     if (!editor.currentPageShapesArray) {
        // console.log('[DEBUG] CardLayoutEditor: initialElements prop effect: editor.currentPageShapesArray not ready.');
        return;
    }
    // console.log('[DEBUG] CardLayoutEditor: initialElements prop effect running. Prop length:', initialElements.length);
    
    const currentShapesOnCanvas = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
    const currentElementsOnCanvas = currentShapesOnCanvas.map(tldrawShapeToLayoutElement);

    // Basic deep comparison for arrays of objects.
    if (JSON.stringify(initialElements) !== JSON.stringify(currentElementsOnCanvas)) {
      // console.log('[DEBUG] CardLayoutEditor: initialElements differ from canvas. Re-syncing canvas. Initial:', initialElements.length, 'Canvas Elements:', currentElementsOnCanvas.length);
      editor.batch(() => {
        const idsToDelete = editor.currentPageShapesArray.map(s => s.id); 
        if (idsToDelete.length > 0) {
            editor.deleteShapes(idsToDelete);
        }
        
        const shapesToCreate = initialElements.map((el, index) => layoutElementToShapeProps(el, editor, index) as CardFieldTldrawShape);
        if (shapesToCreate.length > 0) {
            const validShapesToCreate = shapesToCreate.filter(shape => shape && shape.id && shape.type);
            if (validShapesToCreate.length > 0) {
              editor.createShapes(validShapesToCreate);
            } else {
              // console.log('[DEBUG] CardLayoutEditor: No valid shapes to create from initialElements.');
            }
        } else {
          // console.log('[DEBUG] CardLayoutEditor: initialElements was empty, nothing to create.');
        }
      });
    } else {
      // console.log('[DEBUG] CardLayoutEditor: initialElements are same as on canvas. No re-sync needed.');
    }
     // After syncing canvas, update currentLayoutJsonElements from the source of truth (initialElements)
    setCurrentLayoutJsonElements([...initialElements]);

  }, [editor, initialElements]); // Rerun if editor instance or initialElements from prop change


  // Effect to listen to tldraw store changes and update JSON output
  useEffect(() => {
    if (!editor) return;

    const handleChangeEventInDocument = () => {
      if (!editor.currentPageShapesArray) {
        return;
      }
      
      const shapes = editor.currentPageShapesArray.filter(isCardFieldTldrawShape) as CardFieldTldrawShape[];
      const newLayoutElements = shapes.map(tldrawShapeToLayoutElement);
      
      if (JSON.stringify(newLayoutElements) !== JSON.stringify(currentLayoutJsonElements)) {
        // console.log('[DEBUG] CardLayoutEditor: Layout changed (from store listener). New elements count:', newLayoutElements.length, 'Calling onChange prop.');
        setCurrentLayoutJsonElements(newLayoutElements); 
        onChangeRef.current(newLayoutElements);
      }
    };

    const cleanup = editor.store.listen(handleChangeEventInDocument, {
      source: 'user', 
      scope: 'document', 
    });
    
    return () => cleanup(); 
  }, [editor, currentLayoutJsonElements]); // Depend on internal representation to avoid unnecessary external calls

  const handleToggleFieldOnCanvas = useCallback((fieldKeyToToggle: string, isChecked: boolean) => {
    if (!editor) {
      console.warn('[DEBUG] CardLayoutEditor/handleToggleFieldOnCanvas: Editor not available.');
      return;
    }
    // console.log(`[DEBUG] CardLayoutEditor/handleToggleFieldOnCanvas: fieldKey: ${fieldKeyToToggle}, isChecked: ${isChecked}`);

    editor.batch(() => {
      const existingShapesForFieldKey = editor.currentPageShapesArray
        .filter(isCardFieldTldrawShape)
        .filter(shape => shape.meta.fieldKey === fieldKeyToToggle);

      if (isChecked) {
        if (existingShapesForFieldKey.length === 0) {
          const currentFieldShapesCount = editor.currentPageShapesArray.filter(isCardFieldTldrawShape).length;
          
          // Basic cascading placement for new shapes
          const x = 10 + (currentFieldShapesCount % 2) * (DEFAULT_SHAPE_WIDTH + SHAPE_CASCADE_OFFSET_X);
          const y = 10 + Math.floor(currentFieldShapesCount / 2) * (DEFAULT_SHAPE_HEIGHT + SHAPE_CASCADE_OFFSET_Y);

          const newShapeProps = layoutElementToShapeProps({
            fieldKey: fieldKeyToToggle,
            type: 'text', 
            style: {
              left: `${x}px`,
              top: `${y}px`,
              width: `${DEFAULT_SHAPE_WIDTH}px`,
              height: `${DEFAULT_SHAPE_HEIGHT}px`,
              fontSize: DEFAULT_FONT_SIZE,
            }
          }, editor, currentFieldShapesCount) as CardFieldTldrawShape; // Pass index for potential use in ID generation
          editor.createShape(newShapeProps);
          // console.log('[DEBUG] CardLayoutEditor: Created shape for', fieldKeyToToggle, 'at', x, y);
        } else {
          // console.log('[DEBUG] CardLayoutEditor: Shape for', fieldKeyToToggle, 'already exists. Toggle ON, no action.');
        }
      } else {
        if (existingShapesForFieldKey.length > 0) {
          editor.deleteShapes(existingShapesForFieldKey.map(s => s.id));
          // console.log('[DEBUG] CardLayoutEditor: Deleted shapes for', fieldKeyToToggle);
        } else {
            // console.log('[DEBUG] CardLayoutEditor: No shape found for', fieldKeyToToggle, 'to delete. Toggle OFF, no action.');
        }
      }
    });

    // After tldraw's internal store updates (from create/delete), we need to trigger our JSON update.
    // The store listener should pick this up, but to be safe if no other "user" event follows.
    setTimeout(() => {
        if (!editor || !editor.currentPageShapesArray) return;
        const shapes = editor.currentPageShapesArray.filter(isCardFieldTldrawShape);
        const newLayoutElements = shapes.map(tldrawShapeToLayoutElement);
        // Check if this state update is redundant given the store listener
        if (JSON.stringify(newLayoutElements) !== JSON.stringify(currentLayoutJsonElements)) {
            // console.log('[DEBUG] CardLayoutEditor/handleToggleFieldOnCanvas: Forcing JSON update after toggle.');
            setCurrentLayoutJsonElements(newLayoutElements);
            onChangeRef.current(newLayoutElements);
        }
    }, 50); // Small delay

  }, [editor, canvasWidth, canvasHeight, currentLayoutJsonElements]); // Added currentLayoutJsonElements to deps for the comparison

  const activeFieldKeysOnCanvas = new Set(currentLayoutJsonElements.map(el => el.fieldKey));

  return (
    <div className="flex h-[550px] w-full border border-border rounded-md bg-background text-foreground shadow-sm">
      {/* 1. Field Bank (left panel) */}
      <div className="w-[160px] p-3 border-r border-border overflow-y-auto flex flex-col shrink-0">
        <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background pt-1 pb-2 z-10 border-b border-border">
          Canvas Elements
        </h3>
        <div className="flex-grow">
          {fieldKeys.length > 0 ? (
            fieldKeys.map((key) => (
              <FieldToggleItem
                key={key}
                fieldKey={key}
                isChecked={activeFieldKeysOnCanvas.has(key)}
                onToggle={handleToggleFieldOnCanvas}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No fields defined for template.</p>
          )}
        </div>
      </div>

      {/* 2. Canvas (center panel) */}
      <div
        className="flex-grow relative flex items-center justify-center bg-muted/20 p-4"
      >
        <div 
          style={{ width: canvasWidth, height: canvasHeight }}
          className="bg-card shadow-lg border border-input overflow-hidden" 
        >
          <Tldraw
            key={`tldraw-editor-${canvasWidth}-${canvasHeight}`} 
            persistenceKey={`card_layout_editor_instance_${canvasWidth}x${canvasHeight}`} 
            onMount={onEditorMount}
            assetUrls={{
                baseUrl: '/tldraw-assets/' // ENSURE tldraw-assets folder is in public/
            }}
            components={{
                HelpMenu: null,
                MenuPanel: null,
                PageMenu: null,
                ZoomMenu: null,
                MainMenu: null,
                Minimap: null,
                StylePanel: null, // Hides the style panel, good for minimal
                // DebugMenu: null, // Can be useful during dev
                // NavigationPanel: null, // Hides undo/redo. tldraw uses cmd/ctrl+z
                // Toolbar: null, // Hides the main drawing tools
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

// Ensure tldraw assets (fonts, cursors) are in `public/tldraw-assets/`.
// You might need to copy them from `node_modules/@tldraw/tldraw/public/`.
