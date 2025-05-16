
// src/components/CardLayoutEditor.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Tldraw,
  Editor,
  createShapeId,
  // For v2, many core types are directly available
  // TLGeoShape is a good candidate for our use case
  // We might need to define our custom shape type if we need more specific props
  // but for minimal, 'geo' with text and metadata should work.
  TLGeoShape, // Represents shapes like rectangles, ellipses, etc.
  TLShape,    // Base type for all shapes
  // For snapping or specific interactions, these might be useful:
  // useEditor,
  // track
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

// 1. Define the output structure for an element (matches existing app structure)
interface LayoutElementStyle extends React.CSSProperties {
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  fontWeight?: string;
  position?: 'absolute'; // Ensure this is always part of the style
}

export interface LayoutElement { // Export for use in parent component
  fieldKey: string;
  type: 'text' | 'image' | 'textarea' | 'iconValue' | 'iconFromData';
  style: LayoutElementStyle;
  className?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
}

// 2. Define props for the CardLayoutEditor component
export interface CardLayoutEditorProps { // Export for use in parent component
  fieldKeys: string[];
  initialElements?: LayoutElement[];
  onChange: (elements: LayoutElement[]) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const DEFAULT_CANVAS_WIDTH = 280;
const DEFAULT_CANVAS_HEIGHT = 400;
const DEFAULT_SHAPE_WIDTH = 120; // Default width for a new shape
const DEFAULT_SHAPE_HEIGHT = 36; // Default height for a new shape
const DEFAULT_FONT_SIZE = '12px';

// Define a type for the shapes we'll manage on the canvas
// Using TLGeoShape as a base and adding our custom metadata via `meta`
type CardFieldTldrawShape = TLGeoShape & {
  meta: {
    fieldKey: string;
    isLayoutElement: true; // Flag to identify our managed shapes
    // We can store other style-related info here if we extend functionality
    // e.g., customFontSize: string;
  };
};

function isCardFieldTldrawShape(shape: TLShape): shape is CardFieldTldrawShape {
  return shape.meta?.isLayoutElement === true && 'fieldKey' in shape.meta;
}


// Helper to convert our LayoutElement to tldraw shape properties for creation
function layoutElementToInitialShape(element: LayoutElement, index: number): Omit<CardFieldTldrawShape, 'parentId' | 'index' | 'rotation' | 'isLocked'> {
  return {
    id: createShapeId(element.fieldKey + index), // Create a somewhat stable ID
    type: 'geo',
    x: parseFloat(element.style.left || '10'),
    y: parseFloat(element.style.top || '10'),
    props: {
      geo: 'rectangle',
      w: parseFloat(element.style.width || `${DEFAULT_SHAPE_WIDTH}`),
      h: parseFloat(element.style.height || `${DEFAULT_SHAPE_HEIGHT}`),
      text: element.fieldKey, // Display fieldKey on the shape
      font: 'sans',
      size: 'm', // tldraw's medium size
      color: 'black',
      fill: 'solid', // Add a light fill to make it more visible
      fillOpacity: 0.1,
      dash: 'draw',
      verticalAlign: 'middle',
      align: 'middle',
    },
    meta: {
      fieldKey: element.fieldKey,
      isLayoutElement: true,
    },
  };
}

// Helper to convert a tldraw shape back to our LayoutElement
function tldrawShapeToLayoutElement(shape: CardFieldTldrawShape): LayoutElement {
  // Round coordinates and dimensions to nearest integer for cleaner output
  const round = (num: number) => Math.round(num);

  return {
    fieldKey: shape.meta.fieldKey,
    type: 'text', // Defaulting to 'text' as per minimal requirement
    style: {
      position: 'absolute',
      top: `${round(shape.y)}px`,
      left: `${round(shape.x)}px`,
      width: `${round(shape.props.w || DEFAULT_SHAPE_WIDTH)}px`,
      height: `${round(shape.props.h || DEFAULT_SHAPE_HEIGHT)}px`,
      fontSize: DEFAULT_FONT_SIZE, // Could later come from shape.meta.customFontSize
    },
  };
}

// --- FieldBankItem Component ---
interface FieldBankItemProps {
  fieldKey: string;
}

const FieldBankItem: React.FC<FieldBankItemProps> = ({ fieldKey }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/x-cardforge-fieldkey', fieldKey); // Custom data type
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
  // This state will hold the JSON array for the preview
  const [currentLayoutJsonElements, setCurrentLayoutJsonElements] = useState<LayoutElement[]>(initialElements);

  // Ref to keep onChange stable for tldraw listener, preventing re-subscriptions
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onEditorMount = useCallback(
    (editorInstance: Editor) => {
      setEditor(editorInstance);
      editorInstance.updateInstanceState({ isGridMode: true }); // Enable grid snapping
      
      // Load initial elements onto the canvas
      if (initialElements.length > 0) {
        editorInstance.batch(() => {
          // Clear any existing shapes if necessary, or ensure IDs are unique
          // For simplicity, assume initialElements are fresh if editor is new
          const shapesToCreate = initialElements.map((el, index) => layoutElementToInitialShape(el, index) as CardFieldTldrawShape);
          editorInstance.createShapes(shapesToCreate);
        });
      }
      // Trigger initial JSON generation
      const shapes = editorInstance.currentPageShapesArray;
      const layoutShapes = shapes.filter(isCardFieldTldrawShape);
      const newJsonElements = layoutShapes.map(tldrawShapeToLayoutElement);
      setCurrentLayoutJsonElements(newJsonElements);
      onChangeRef.current(newJsonElements);
    },
    [initialElements] // Dependencies for onEditorMount
  );


  useEffect(() => {
    if (!editor) return;

    const handleEditorChange = () => {
      const shapes = editor.currentPageShapesArray;
      const layoutShapes = shapes.filter(isCardFieldTldrawShape); // Use type guard
      const newJsonElements = layoutShapes.map(tldrawShapeToLayoutElement);
      
      // Only update if there's an actual change to avoid potential loops
      if (JSON.stringify(newJsonElements) !== JSON.stringify(currentLayoutJsonElements)) {
        setCurrentLayoutJsonElements(newJsonElements);
        onChangeRef.current(newJsonElements);
      }
    };

    // Listen to changes: 'change' event for any document change (shapes, camera, etc.)
    // 'change-history' might be better if we only care about user undo/redo/commits
    // For live updates on move/resize, 'change' with source 'user' and scope 'document' is good.
    const cleanup = editor.store.listen(handleEditorChange, {
      source: 'user',
      scope: 'document',
    });
    
    return () => cleanup();
  }, [editor, currentLayoutJsonElements]); // currentLayoutJsonElements added to avoid stale closure

  const handleDropOnCanvasContainer = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!editor) return;

      const fieldKey = e.dataTransfer.getData('application/x-cardforge-fieldkey');
      if (!fieldKeys.includes(fieldKey)) return;

      // Get the bounding rect of the tldraw container div itself,
      // NOT the div that has the onDrop handler if they are different.
      // Here, e.currentTarget is the div with onDrop.
      const tldrawContainer = editor.getContainer(); // This is the direct <canvas> parent
      if (!tldrawContainer) return;
      
      const rect = tldrawContainer.getBoundingClientRect();
      const xOnCanvas = e.clientX - rect.left;
      const yOnCanvas = e.clientY - rect.top;

      // Convert to page coordinates (tldraw's world space)
      const pointInPageSpace = editor.screenToPage({ x: xOnCanvas, y: yOnCanvas });

      editor.batch(() => {
        editor.createShape<CardFieldTldrawShape>({
          id: createShapeId(fieldKey + Date.now()), // More unique ID
          type: 'geo',
          x: pointInPageSpace.x - DEFAULT_SHAPE_WIDTH / 2,
          y: pointInPageSpace.y - DEFAULT_SHAPE_HEIGHT / 2,
          props: {
            geo: 'rectangle',
            w: DEFAULT_SHAPE_WIDTH,
            h: DEFAULT_SHAPE_HEIGHT,
            text: fieldKey,
            font: 'sans',
            size: 's', // smaller text size on shapes
            color: 'black',
            fill: 'solid',
            fillOpacity: 0.05, // Very light fill
            dash: 'draw',
            verticalAlign: 'middle',
            align: 'middle',
          },
          meta: {
            fieldKey: fieldKey,
            isLayoutElement: true,
          },
        });
      });
    },
    [editor, fieldKeys]
  );

  // Allow dropping by preventing default drag over behavior
  const handleDragOverCanvasContainer = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
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
      {/* This outer div is for drop handling and centering the fixed-size canvas div */}
      <div
        className="flex-grow relative flex items-center justify-center bg-muted/20 p-4"
        onDrop={handleDropOnCanvasContainer}
        onDragOver={handleDragOverCanvasContainer}
      >
        {/* This div defines the actual 280x400 card canvas appearance */}
        <div 
          style={{ width: canvasWidth, height: canvasHeight }}
          className="bg-card shadow-lg border border-border overflow-hidden" // Added overflow-hidden
        >
          <Tldraw
            persistenceKey={`card_layout_editor_${canvasWidth}x${canvasHeight}`}
            onMount={onEditorMount}
            // Hide most of the default tldraw UI for a cleaner "canvas" feel
            // Individual components can be hidden by passing `components={{ UiComponent: null }}`
            // For a quick minimal setup, we can try to hide major panels.
            // Note: `hideUi` is a very broad switch.
            // components={{
            //   HelpMenu: null,
            //   MenuPanel: null, // Hides main menu
            //   NavigationPanel: null, // Hides zoom controls
            //   StylePanel: null, // Hides style options for selected shapes
            //   Toolbar: null, // Hides drawing tools
            //   KeyboardShortcutsHelpMenu: null,
            //   QuickActions: null,
            //   DebugMenu: null,
            //   Print 메뉴: null, // Example: this might not be the exact name
            // }}
            // For minimal, the user might need to select and move shapes, so some UI is needed.
            // Let's keep default UI for now and they can explore tldraw's customization later.
            assetUrls={{
                baseUrl: typeof window !== 'undefined' ? window.location.origin + '/tldraw-assets/' : '/tldraw-assets/'
            }}
            // forceMobile={false} // Ensure desktop UI
            // autoFocus
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

// Example Usage (conceptual, would go in another file like a template edit page)
//
// import { CardLayoutEditor, LayoutElement } from '@/components/CardLayoutEditor';
//
// function MyTemplateEditorPage() {
//   const [layoutElements, setLayoutElements] = useState<LayoutElement[]>([]);
//   const templateFieldKeys = ['name', 'cost', 'imageUrl', 'description']; // from template data
//
//   const handleLayoutChange = (newElements: LayoutElement[]) => {
//     setLayoutElements(newElements);
//     // You would then use these newElements to update your full layoutDefinition string
//     // const fullLayoutObject = {
//     //   width: "280px",
//     //   height: "400px",
//     //   elements: newElements,
//     //   // ... other top-level properties
//     // };
//     // const layoutDefinitionString = JSON.stringify(fullLayoutObject, null, 2);
//     // saveTemplate({ ...template, layoutDefinition: layoutDefinitionString });
//     console.log("Updated elements:", newElements);
//   };
//
//   // Load initial elements from existing layout definition string
//   // useEffect(() => {
//   //   try {
//   //     const parsed = JSON.parse(existingLayoutDefinitionString || '{}');
//   //     if (Array.isArray(parsed.elements)) {
//   //       setLayoutElements(parsed.elements);
//   //     }
//   //   } catch (e) { console.error("Failed to parse initial layout", e); }
//   // }, [existingLayoutDefinitionString]);
//
//   return (
//     <div>
//       <CardLayoutEditor
//         fieldKeys={templateFieldKeys}
//         initialElements={layoutElements}
//         onChange={handleLayoutChange}
//       />
//       {/* Other parts of your template editor page */}
//     </div>
//   );
// }

