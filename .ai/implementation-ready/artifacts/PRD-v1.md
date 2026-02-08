# CardForge V1 Product Requirements Document

## 1. Purpose
This document is the **primary implementation artifact** for CardForge V1.

It defines product behavior, scope, and acceptance criteria for a **ground-up rebuild**.
The previous CardForge codebase is not an implementation dependency.

## 2. How to Use This PRD
If you are implementing V1, follow this order:
1. Read Sections 1-8 to understand product intent and required behavior.
2. Use Sections 9-12 to build feature-by-feature.
3. Use Section 13 as your done criteria.
4. Use Section 14 build phases to execute in sequence.
5. Use appendices only when deeper implementation detail is needed.

## 3. Platform and Delivery Scope
1. Application type: Electron desktop app.
2. V1 target: macOS.
3. Planned V2 target: Windows.
4. V1 is print-first.
5. V1 must remain digital-ready at the data contract level.
6. AI is non-core in V1.

## 4. Product Goals
1. First-time users can create a playable prototype deck in about 30 minutes.
2. Users can work either visually or through CSV at scale.
3. Template changes are safe and controlled.
4. Preview and export outputs are consistent.
5. Exports are portable and importable by other users.

## 5. Product Principles
1. Usability first.
2. Deterministic behavior over silent fallback.
3. Reversible operations whenever possible.
4. Progressive complexity (basic and advanced usage).
5. Portability as a core requirement.

## 6. Domain Model (Core Concepts)
CardForge separates card data definition from visual layout.

1. **Library**
- A container of games.
- Future-ready for owned/shared/rental models.

2. **Game**
- Contains metadata, settings, assets, templates, and decks.

3. **Card Data Template**
- Defines what fields cards contain.
- Example fields: name, rules text, category, number value, image, icon.

4. **Layout Template**
- Defines how fields are placed on canvas.
- Supports print and digital targets as separate layout experiences.

5. **Card**
- Concrete field values tied to a card data template.

6. **Deck**
- Collection of cards for a game.

7. **Checkpoint**
- Named snapshot of state for rollback/export selection.

8. **Export Package**
- Portable bundle containing game data + templates + assets.

## 7. V1 Feature Scope

### 7.1 Games Workspace
Required behavior:
1. Primary object name is `Games`.
2. Games Home supports sort and filter.
3. Multiple libraries are supported.
4. Deletion uses recycle-bin behavior.
5. Game metadata includes rules, playtest notes/templates, and assets.

### 7.2 Template System
Required behavior:
1. Templates are global and reusable across games.
2. UI shows where each template is used.
3. Two-template model is required:
- Card Data Template
- Layout Template
4. Card data field types in V1:
- `category` (stable option IDs)
- `singleLineText`
- `areaText`
- `number`
- `image` (dimension guidance)
- `icon` (optional category mapping)
5. Layout authoring is container-first:
- draw/place container first
- map data field second
6. V1 layout elements:
- single line text
- text with icon
- area text
- image
- layout/group container
- decoration (borders/boxes/outlines)
7. Reusable layout component library is in scope for V1.

### 7.3 Layout Targets (Print and Digital)
Required behavior:
1. V1 prioritizes print workflows and outputs.
2. Print and digital layouts are separate template experiences.
3. Shared layer is card data templates and field mapping rules.
4. Interactive digital runtime behavior is out of scope in V1.
5. V1 schemas/exports must retain digital metadata for future adapters.

### 7.4 Print Canvas Rules
Required behavior:
1. A print layout template is bound to one card size profile.
2. A game may contain multiple sizes via different templates.
3. A template can have multiple layout versions for A/B testing.
4. Print canvas configuration includes:
- unit (`mm` or `in`)
- width/height
- DPI
- bleed margins
- safe-zone margins
- optional trim/corner settings
5. Export preflight must block critical print failures.

### 7.5 Template Assignment Guardrails
Required behavior:
1. Assignment is manual.
2. Source of truth is Game Settings.
3. Unassigning an in-use template is blocked.
4. User must choose one resolution:
- bulk migrate affected cards with field remap, or
- remove affected cards
5. Impact dialog must show affected-card counts before confirmation.

### 7.6 Card Editing and Bulk Workflows
Required behavior:
1. Card list groups by template type.
2. V1 bulk operations include:
- CSV import
- bulk template switch with required remap
3. Mixed-template selection requires remap per source template group.
4. CSV workflow must support:
- template CSV export
- column mapping at import
- skip invalid rows
- import issues report
5. Save model:
- autosave enabled
- named checkpoints
- rollback to checkpoint

### 7.7 Rendering Requirements
Required behavior:
1. Rendering must be deterministic.
2. Unsupported behavior must fail explicitly.
3. V1 primitive set:
- text
- image slot
- icon
- stat value
- shape/container
4. Preview/export parity is required.
5. Save operation validates data-field bindings.

### 7.8 Import/Export and Portability
Required behavior:
1. Full export includes:
- game metadata
- data templates used by game
- layout templates used by game
- decks/cards
- assets
2. Partial exports include:
- cards only
- templates only
- full game
3. Export can target:
- current state
- selected named checkpoint
4. Import conflict handling is explicit and fail-fast.
5. Schema versioning and explicit migration are required.
6. Export package must be app-consumable (round-trip import).

### 7.9 Onboarding and Guidance
Required behavior:
1. First-run onboarding wizard.
2. Starter sample game.
3. Guided CSV walkthrough.
4. Basic and advanced workspace modes.
5. Actionable error messages with recovery actions.

### 7.10 Persistence and Reliability
Required behavior:
1. Hybrid persistence:
- SQLite for operational data
- JSON contracts for portability
- managed assets on disk
2. Crash-safe atomic writes.
3. Startup migrations before write operations.
4. Single-writer lock per library.
5. Checkpoints stored as full snapshots in V1.

## 8. Out of Scope (V1)
1. Core AI-assisted authoring.
2. Real-time collaboration editing.
3. Shared/rental permissions UX.
4. Renderer plugin ecosystem.
5. Full tags feature set.
6. Interactive digital runtime behavior.

## 9. User Stories
1. As a game designer, I want to create a game quickly so I can test ideas immediately.
2. As a designer, I want reusable global templates so I can keep card systems consistent.
3. As a designer, I want visual layout editing with advanced controls so I can work quickly and precisely.
4. As a content-heavy user, I want CSV import with mapping and error reporting so I can scale card creation.
5. As a designer, I want safe migration flows for template changes so cards do not break.
6. As a designer, I want autosave and checkpoints so I can experiment safely.
7. As a designer, I want game notes/rules/assets stored together so handoff is complete.
8. As a multi-project user, I want sorting/filtering and multiple libraries so navigation stays manageable.
9. As a collaborator, I want portable exports with schemas so imports remain editable and reliable.
10. As a future team user, I want data models ready for shared/rental evolution.
11. As a designer, I want preview/export parity so I can trust outputs.
12. As a designer, I want recycle-bin recovery so mistakes are reversible.
13. As a cost-conscious user, I want optional BYO AI later so AI is assistive, not required.
14. As a print-focused designer, I want real print constraints so exported layouts hold up physically.
15. As a cross-target designer, I want shared data with separate print/digital layout experiences.

## 10. Core User Flows

### Flow A: First Run to First Deck
1. Launch app and complete onboarding.
2. Create game.
3. Assign templates in Game Settings.
4. Add cards manually or via CSV.
5. Preview cards and export for playtest.

### Flow B: CSV Deck Creation
1. Export template-specific CSV.
2. Fill rows in spreadsheet tool.
3. Import and map columns.
4. Import valid rows and skip invalid rows.
5. Review issues report and retry.

### Flow C: Safe Template Evolution
1. Edit template in use.
2. Review impact summary.
3. Choose global update or fork/version path.
4. Complete remapping.
5. Validate and apply.

### Flow D: Portable Handoff
1. Choose current state or named checkpoint.
2. Export package.
3. Recipient imports package.
4. App validates version/schema/conflicts before finalize.

## 11. Implementation Notes (Beginner-Friendly)
This section translates requirements into concrete implementation expectations.

1. Implement contracts first.
- Build and validate JSON schemas before feature screens.
- Reject invalid data at boundaries (save/import/export).

2. Build with strict feature boundaries.
- Start with Games, Templates, Cards, Import/Export modules.
- Keep each module independently testable.

3. Treat state changes as workflows.
- Use state machines for high-risk flows (CSV import, template remap, export, unassignment).
- Avoid hidden side effects in UI components.

4. Keep renderer deterministic.
- Use one rendering pipeline for preview and export.
- Do not maintain separate visual logic branches.

5. Design errors for user recovery.
- Every blocking error should suggest the next action.
- Never silently drop conflicting data.

6. Implement reliability early.
- Add atomic writes and library locking before broad feature expansion.
- Ensure restart safety and migration checks at startup.

## 12. Suggested Build Plan
1. Foundation
- Project scaffolding, IPC contracts, schema package.

2. Data Layer
- SQLite model, migration framework, asset storage paths, locking.

3. Games and Templates
- Games workspace and settings.
- Data template + layout template CRUD.

4. Cards and CSV
- Card editor, grouping by template, CSV import/export pipeline.

5. Layout Designer MVP
- Grid, print guides, draw containers, field binding, validation.

6. Rendering and Export
- Deterministic renderer, preview/export parity, export package pipeline.

7. Reliability and Onboarding
- Checkpoints, recycle bin, onboarding wizard, actionable error UX.

## 13. Acceptance Criteria
1. End-to-end flow works: create game, assign templates, import cards, preview, export.
2. Template changes affecting cards always trigger explicit remap/migration.
3. Unsupported rendering behavior fails explicitly.
4. Preview output equals export output for V1 primitives.
5. Import conflicts never overwrite silently.
6. Export/import round-trip preserves templates, cards, metadata, and assets.
7. Print preflight catches critical bleed/safe-zone/DPI failures.
8. New user can reach a basic playtest deck in about 30 minutes.

## 14. Risks and Mitigations
1. Schema drift across features.
- Mitigation: central contracts package and CI schema validation.

2. Rendering mismatch between preview/export.
- Mitigation: single render path and parity snapshot tests.

3. Complex migration flows.
- Mitigation: explicit workflow states and impact previews.

4. Data corruption risk in desktop filesystem workflows.
- Mitigation: atomic writes, locking, startup integrity checks.

## 15. Appendices
These are supporting deep-dive documents. This PRD remains the source of truth.

### Appendix A: Architecture Blueprint
- File: `appendix-a-architecture-blueprint.md`
- Purpose: system structure, module boundaries, persistence and testing architecture.

### Appendix B: Layout Designer Architecture
- File: `appendix-b-layout-designer-architecture.md`
- Purpose: canvas subsystem design, library choices, layer model, state model, and validation pipeline.
