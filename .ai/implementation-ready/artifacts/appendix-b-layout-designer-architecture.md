# Appendix B: Card Layout Designer Architecture (V1)

## 1. Objective

Define a production-ready architecture for a container-first card layout designer where users:

1. configure card canvas size/grid
2. see print overlays (bleed, safe zone, trim)
3. draw/transform containers
4. assign container type and map fields from a Card Data Template
5. keep pure design elements unbound

This document assumes a ground-up rebuild and aligns with current V1 schema contracts.

## 2. Library Evaluation

## 2.1 Candidate: `react-konva` + `konva` (Recommended)

Strengths:

1. Native fit for shape drawing and transform handles.
2. Supports drag/resize/rotate with `Transformer`.
3. Has proven snapping patterns for objects and resize.
4. Works cleanly with React and Electron renderer process.

Tradeoffs:

1. You build editor behavior (selection model, snapping policy, commands) yourself.
2. Need explicit strategy for text measurement and export parity testing.

## 2.2 Candidate: `fabric`

Strengths:

1. Rich interactive canvas object model.
2. Built-in event system and control customization.
3. Strong serialization/export capabilities.

Tradeoffs:

1. More opinionated object model than needed for strict schema-first contracts.
2. Event-heavy patterns can become harder to reason about at scale.

## 2.3 Candidate: `tldraw` SDK

Strengths:

1. Fast path to polished canvas UX.
2. Good extensibility for custom shapes/tools.

Tradeoffs:

1. Production licensing key and commercial terms need deliberate handling.
2. Extra abstraction versus a narrowly-scoped template editor.

## 2.4 Candidate: `pixi.js`

Strengths:

1. Excellent rendering performance.
2. Good long-term option for advanced digital runtime rendering.

Tradeoffs:

1. More low-level editor work for a business-layout tool.
2. Slower V1 delivery for authoring-centric requirements.

## 2.5 Recommendation

Use `react-konva` + `konva` for V1 layout authoring.

Add supporting packages:

1. `zustand` for editor document/view state.
2. `xstate` for complex modal flows (draw/create/bind, remap, warnings).
3. `zod` + `ajv` for schema validation before save/export.
4. `nanoid` for local element IDs.

## 3. Proposed Package Set (V1)

1. `react-konva`, `konva`
2. `zustand`, `xstate`
3. `zod`, `ajv`
4. `nanoid`
5. `@radix-ui/react-*` (inspector/dialog primitives)
6. `clsx` (UI utilities)

Optional helpers:

1. `react-konva-utils` only if HTML overlays/tooltips are needed in-canvas.

## 4. Designer Runtime Architecture

## 4.1 Feature Module Structure

```text
apps/desktop/src/renderer/features/layout-designer/
  components/
    LayoutDesignerPage.tsx
    CanvasStage.tsx
    CanvasViewport.tsx
    GridLayer.tsx
    PrintGuideLayer.tsx
    ElementLayer.tsx
    SelectionLayer.tsx
    SnapGuidesLayer.tsx
    InspectorPanel.tsx
    FieldBindingPanel.tsx
    LayersPanel.tsx
    Toolbar.tsx
    StatusBar.tsx
  state/
    layoutDesignerStore.ts
    selectors.ts
    commands.ts
    history.ts
  machines/
    drawContainerMachine.ts
    bindFieldMachine.ts
    unassignGuardMachine.ts
  domain/
    snapping.ts
    geometry.ts
    printPreflight.ts
    mappingValidation.ts
    elementFactories.ts
    coordinateTransforms.ts
  adapters/
    layoutTemplateAdapter.ts
    printGeometryAdapter.ts
```

## 4.2 Rendering Layers

Layer order (bottom to top):

1. Canvas background
2. Grid layer
3. Print guides (bleed/safe-zone/trim)
4. Element layer (containers + decorations)
5. Selection/transform handles
6. Snap guide overlays
7. Interaction overlays (drag marquee, temporary tool hints)

## 4.3 Key UI Components

1. `Toolbar`

- Select tool, Pan tool, Draw Rectangle tool, Duplicate/Delete, Undo/Redo.

1. `CanvasStage`

- Owns zoom/pan and pointer-to-canvas coordinate transforms.

1. `GridLayer`

- Renders grid ticks from active size profile and grid step.

1. `PrintGuideLayer`

- Renders bleed box, trim line, safe zone from `print.geometry` data.

1. `ElementLayer`

- Renders each container with style and mapped field metadata.

1. `SelectionLayer`

- Multi-select, marquee, transform handles, keyboard nudge.

1. `InspectorPanel`

- Element type, dimensions, typography, stroke/fill, z-index, lock/visibility.

1. `FieldBindingPanel`

- Shows compatible fields from selected Card Data Template by element type.
- Allows `field`, `static`, or `none` binding depending on kind.

1. `LayersPanel`

- Reorder, lock, hide, and group containers.

## 5. Core State Model (TypeScript)

```ts
export type ElementKind =
  | 'singleLineText'
  | 'textWithIcon'
  | 'areaText'
  | 'image'
  | 'layout'
  | 'decoration';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldBinding {
  type: 'field';
  fieldKey: string;
}

export interface StaticBinding {
  type: 'static';
  value: string;
}

export interface LayoutElementDraft {
  id: string;
  kind: ElementKind;
  rect: Rect;
  zIndex: number;
  binding?: FieldBinding | StaticBinding;
  textBinding?: FieldBinding | StaticBinding;
  iconBinding?: FieldBinding | StaticBinding;
  style?: Record<string, unknown>;
  locked?: boolean;
  visible?: boolean;
}

export interface CanvasGuideState {
  unit: 'mm' | 'in';
  width: number;
  height: number;
  dpi: number;
  bleed: { top: number; right: number; bottom: number; left: number };
  safeZone: { top: number; right: number; bottom: number; left: number };
  trimLineInset?: { top: number; right: number; bottom: number; left: number };
}

export interface LayoutDesignerState {
  layoutTemplateId: string;
  target: 'print' | 'digital';
  dataTemplateId: string;
  canvas: CanvasGuideState;
  grid: { enabled: boolean; stepPx: number; snap: boolean };
  elements: LayoutElementDraft[];
  selection: { elementIds: string[] };
  viewport: { zoom: number; panX: number; panY: number };
  dirty: boolean;
}
```

## 6. Container-First Creation Flow

1. User selects Draw Container tool.
2. Drag on canvas creates rectangle snapped to grid.
3. User chooses element kind.
4. Inspector opens contextual settings.
5. If kind supports binding, field picker lists compatible data fields.
6. If pure design element, no data binding required.
7. On save, run schema validation + mapping validation + print preflight checks.

## 7. Binding Compatibility Rules

1. `singleLineText` accepts `singleLineText`, `category`, `number` (stringified for display).
2. `areaText` accepts `areaText`, optionally `singleLineText`.
3. `image` accepts `image`.
4. `textWithIcon` accepts text binding + icon binding, where icon may map from `icon` field or category option map.
5. `decoration` and `layout` do not require data binding.

## 8. Validation Pipeline

Before persist:

1. Validate layout core schema (`layout-template-core`).
2. Validate target extension (`layout.print` or `layout.digital`).
3. Verify every field binding exists in referenced Card Data Template.
4. Enforce element bounds and minimum sizes.
5. For print target, run preflight:
   - safe-zone overflow checks
   - bleed policy checks
   - minimum image DPI checks for mapped image regions
6. Block save on critical errors; allow warnings with explicit confirmation.

## 9. Command Model (Undo/Redo)

Use command objects to avoid brittle event replay.

Required commands:

1. add element
2. remove element
3. move/resize element
4. change element kind
5. set binding
6. set style
7. reorder z-index
8. group/ungroup

Each command stores `before` and `after` payload to support deterministic undo/redo.

## 10. Performance Baseline

1. Keep canvas render at 60fps for typical template size (<200 elements).
2. Debounce expensive validation while dragging/resizing.
3. Run full preflight on save/export, not every pointer move.
4. Use memoized selectors for selected element-derived UI.

## 11. Accessibility and Usability

1. Keyboard nudging (1px, Shift+arrow for larger step).
2. Zoom shortcuts and fit-to-canvas action.
3. High-contrast guide colors for safe-zone/bleed.
4. Explicit conflict/error messaging with direct fix actions.

## 12. Implementation Milestones

1. Milestone A: Canvas + grid + print guides + draw/select/move/resize.
2. Milestone B: Inspector + element kinds + binding panel.
3. Milestone C: snapping + command history + layers panel.
4. Milestone D: validation + preflight integration + save pipeline.
5. Milestone E: component library insertion + template version workflows.

## 13. Sources

1. react-konva package: <https://www.npmjs.com/package/react-konva>
2. Konva Transformer: <https://konvajs.org/api/Konva.Transformer.html>
3. Konva React Transformer usage: <https://konvajs.org/docs/react/Transformer.html>
4. Konva object snapping demo: <https://konvajs.org/docs/sandbox/Objects_Snapping.html>
5. Konva resize snapping demo: <https://konvajs.org/docs/select_and_transform/Resize_Snaps.html>
6. Fabric core concepts: <https://fabricjs.com/docs/core-concepts/>
7. Fabric events guidance: <https://fabricjs.com/docs/events/>
8. Fabric control configuration: <https://fabricjs.com/docs/configuring-controls/>
9. tldraw SDK license key docs: <https://tldraw.dev/sdk-features/license-key>
10. tldraw license terms: <https://tldraw.dev/community/license>
11. PixiJS release notes (v8 line): <https://pixijs.com/blog/8.13.0>
