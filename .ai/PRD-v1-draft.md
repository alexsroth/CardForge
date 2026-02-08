# CardForge Product Requirements Document (V1)

## 1. Product Overview
CardForge is a desktop application for designing and iterating on card games. It enables creators to define reusable card templates, author cards at scale, preview final card visuals, and export portable game packages for handoff and collaboration.

V1 is a macOS Electron release focused on reliability, usability, and portability.  
V2 expands to Windows and deeper collaboration capabilities.

## 2. Product Goals
1. Reduce time from concept to playable test deck.
2. Support both visual authoring and high-volume data workflows.
3. Make template evolution safe for existing card data.
4. Guarantee predictable rendering and export behavior.
5. Provide portable game packages that can be imported and edited by others.
6. Enable an inexperienced user to reach a viable playtest deck in ~30 minutes with guided flow.

## 3. Target Users
1. Solo game designers iterating on mechanics quickly.
2. Content-heavy designers managing large sets via spreadsheets.
3. Collaborators who import and continue work on shared game packages.

## 4. V1 Platform and Constraints
1. Runtime: Electron desktop app.
2. Target OS: macOS.
3. Data model must be forward-compatible with Windows support and collaboration workflows.
4. AI is not part of core V1 functionality.
5. V1 is print-first, but data/layout contracts must be digital-ready without requiring separate authoring modes.

## 5. Product Principles
1. Trustworthy behavior over maximum flexibility.
2. Deterministic systems over silent best-effort behavior.
3. User safety and recoverability by default.
4. Progressive complexity: approachable for new users, powerful for advanced users.
5. Portability as a first-class requirement.

## 6. Functional Requirements

### 6.1 Games Workspace
1. Use `Games` as the primary container concept.
2. Provide a rich Games Home with sort and filter controls.
3. Support multiple selectable libraries.
4. Use recycle-bin style deletion rather than immediate hard-delete.
5. Store game-level metadata including rules, playtest notes/artifacts, and associated assets.

### 6.2 Global Template System
1. Templates are globally reusable across games.
2. Show where each template is used.
3. Separate template concerns into two linked artifacts:
   - **Card Data Template** (what data a card holds)
   - **Layout Template** (how data is visually presented)
4. Card Data Template designer defines field schema and types:
   - category (with stable option IDs)
   - single line text
   - area text
   - image (with image dimension guidance)
   - number
   - icon (including optional category mapping)
5. Layout Template designer maps data fields to visual containers.
6. Support target-specific layout experiences:
   - print layout templates
   - digital layout templates (separate experience; V2+ runtime depth)
7. Layout designer uses container-first authoring:
   - user places/draws containers first
   - user maps defined data fields to containers second
8. V1 container types:
   - single line text
   - text with icon
   - area text
   - image
   - layout (group/frame only)
   - decoration (borders/boxes/outlines)
9. Include a component builder/library for reusable layout starting blocks.
10. Support template evolution:
   - update globally, or
   - fork/version for game-specific divergence
11. Require guided remapping when data template/schema changes impact existing cards.
12. In V1 print layout templates, each layout is bound to a single card size profile.
13. V1 supports multiple layout versions for that single size (A/B layout testing).
14. A game may include multiple templates/layouts of different sizes.
15. Print canvas contract must include geometry inputs:
   - physical unit (`mm` or `in`)
   - width/height
   - DPI target
   - bleed margins
   - safe-zone margins
   - optional trim/corner settings

### 6.3 Template Assignment to Games
1. Template assignment is manual.
2. Assignment source of truth is Game Settings.
3. Unassignment guardrail:
   - if a template is in use by cards in that game, block direct unassignment
   - require user to resolve by:
     - bulk migrate cards to another template with remapping, or
     - remove affected cards
4. Show impact dialogs with affected-card counts before destructive assignment changes.

### 6.4 Card Editing and Organization
1. Group cards by template type in the editor.
2. Keep architecture ready for future tag support.
3. V1 bulk operations include:
   - CSV import workflow
   - bulk template switch with mandatory remap
4. For mixed-template bulk switching, remapping must run per source-template group.
5. Save model:
   - continuous autosave
   - named checkpoints
   - rollback to checkpoint

### 6.5 Rendering Engine
1. Rendering must be deterministic in V1.
2. Safe rendering mode is required:
   - unsupported rules fail explicitly
   - no silent fallback for unsupported style behavior
3. V1 supported primitives:
   - text
   - image slot
   - icon
   - stat value
   - shape/container
4. Preview/export parity is required: rendered preview must match exported visual output.
5. Container-first layout contracts must validate field mapping compatibility before save.
6. Rendering contracts must enforce data-template to layout-template compatibility.
7. Print layout contracts must enforce size consistency (no mixed-size print layout binding in one print layout template).

### 6.6 Import/Export and Portability
1. CSV is a core authoring workflow:
   - export template-specific CSV template
   - import CSV with field mapping
   - skip invalid rows
   - produce “cards with issues importing” report
2. Full game export must include:
   - game metadata
   - card data templates used by the game
   - layout templates used by the game
   - card/deck data
3. Support partial exports:
   - cards only
   - templates only
   - full game package
4. Include managed asset files in exported package.
5. Import ID conflicts must fail fast and require explicit user resolution.
6. Export target options:
   - current state
   - selected named checkpoint
7. Use strict schema versioning with explicit migrations for compatibility.
8. Include collaboration-ready metadata groundwork in export/import contracts.
9. Export preflight must validate print-readiness and flag:
   - text/content outside safe zone
   - assets below minimum DPI
   - unsupported rules for selected output profile
10. V1 export contracts must preserve digital-target metadata for future adapters, even when using print-first workflows.

### 6.9 Digital-Ready Baseline (V1)
1. Users author card data and layouts in a single flow (no print vs digital mode switch).
2. V1 supports separate digital layout contracts and metadata in schemas/exports.
3. V1 does not include interactive digital runtime features (animations/stateful behaviors).
4. V1 may include basic digital-oriented export adapters where they do not introduce runtime behavior complexity.

### 6.7 Onboarding and Guidance
1. Provide interactive first-run onboarding wizard.
2. Include starter sample game on first run.
3. Include guided CSV mini-flow.
4. Track onboarding progress and allow reset/replay.
5. Provide Basic and Advanced workspace modes.
6. Use actionable error messages with clear recovery guidance.

### 6.8 Persistence and Data Safety
1. Use hybrid persistence:
   - SQLite for operational state/indexing
   - JSON contract artifacts for portability
   - managed assets on disk
2. Use crash-safe atomic writes.
3. Run startup auto-migrations for schema updates.
4. Use single-writer lock per library in V1.
5. Store named checkpoints as full snapshots.

## 7. Out of Scope (V1)
1. Core AI-assisted authoring features.
2. Real-time collaboration editing.
3. Shared/rental library permissions UX.
4. Extended renderer plugin ecosystem.
5. Full tag management feature set.
6. Multi-size layout-set management inside a single template.
7. Interactive digital runtime behavior (state-driven animations/triggers/effects).

## 8. V2+ Direction
1. Windows release and distribution.
2. Collaboration model and shared/rental library UX.
3. Optional bring-your-own AI provider integrations.
4. Expanded rendering primitives and advanced layout capabilities.
5. Advanced library-scale tagging/search systems.
6. Optional multi-size layout sets within a single template, with strict per-layout size binding.
7. Interactive digital runtime adapters and target-specific digital pipelines.

## 9. User Stories

### US-01 Start Fast
As a game designer, I want to create a new game and begin adding card content quickly, so I can test ideas without setup friction.

### US-02 Reuse Structure
As a game designer, I want reusable global templates, so I can keep card systems consistent across games and reduce duplicate setup.

### US-03 Design Visually With Control
As a game designer, I want drag-and-drop layout editing with guard rails and advanced JSON access, so I can work quickly and still make precise edits.

### US-04 Bulk Authoring From Spreadsheets
As a content-heavy designer, I want to bulk import cards from CSV with mapping and error reporting, so I can iterate large sets efficiently.

### US-05 Safe Changes at Scale
As a game designer, I want impact warnings and guided migrations when changing templates or assignments, so I avoid breaking existing cards.

### US-06 Never Lose Work
As a game designer, I want autosave and named checkpoints, so I can experiment safely and roll back when needed.

### US-07 Keep Game Context Together
As a game designer, I want game metadata, notes, rules, and assets stored with the game, so everything needed for playtesting and handoff is in one place.

### US-08 Organize Growing Libraries
As a multi-project designer, I want sort/filter and multiple libraries, so I can manage many games without navigation overhead.

### US-09 Export Portable Game Packages
As a collaborator, I want exported games to include their data template and layout template schemas, so others can open/edit the game reliably in another workspace.

### US-10 Collaborate Later Without Rework
As a future team user, I want data models that can support shared/rental libraries, so collaboration can be added without breaking existing data.

### US-11 Preview Confidence
As a designer, I want reliable card previews that reflect template + card data clearly, so I can trust what I’m testing.

### US-12 Recover From Mistakes
As a designer, I want recycle-bin style recovery instead of immediate destructive deletes, so accidental actions are reversible.

### US-13 Optional BYO AI Assistance
As a cost-conscious designer, I want optional bring-your-own AI integrations for assistive workflows, so I can use AI help without platform lock-in or mandatory usage costs.

### US-14 Print-Accurate Template Design
As a designer preparing physical prototypes, I want layout canvas sizing to match real print card dimensions, so layout decisions hold up when exported or printed.

### US-15 One Authoring Flow for Print and Digital
As a designer, I want to author card data once without choosing a separate print vs digital mode, so I can reuse the same card data across output targets while keeping layout experiences separate.

## 10. Core User Flows

### Flow A: First Run to First Deck
1. Launch app and complete onboarding wizard.
2. Open sample game and create a new game.
3. Assign templates in Game Settings.
4. Add cards manually or via CSV import.
5. Preview cards and export current state for playtest.

### Flow B: Spreadsheet-Driven Card Authoring
1. Export template-specific CSV template.
2. Populate rows in spreadsheet tool.
3. Import CSV and map columns to template fields.
4. Import valid rows; skip invalid rows.
5. Review import issues report and re-import corrections.

### Flow C: Safe Template Evolution
1. Modify a template used by existing cards.
2. Review impact summary.
3. Choose global update or fork/version.
4. Perform required field remapping.
5. Validate and apply migration.

### Flow D: Safe Template Unassignment
1. Attempt to unassign template from game.
2. App blocks unassignment if template is in use.
3. Choose migration or card removal path.
4. Confirm and apply resolution.

### Flow E: Versioned Export and Handoff
1. Create named checkpoint.
2. Choose export scope (current or checkpoint).
3. Export package with metadata, templates, cards, and assets.
4. Recipient imports package with schema validation/migration.

## 11. Acceptance Criteria
1. User can complete end-to-end flow: create game, assign templates, import CSV, preview cards, export package.
2. Template/schema changes affecting cards always require explicit migration/remap workflow.
3. Preview and export visual output match for all V1 primitives.
4. Import conflicts never overwrite silently; resolution is explicit.
5. Crash/restart does not corrupt persisted game data under normal usage.
6. Assets in exported package remain valid after import on another machine.
7. Canvas preflight catches unsafe print layouts before export.
8. A first-time user can complete guided onboarding and produce a basic playtest deck within 30 minutes.

## 12. Risks and Mitigations
1. Hybrid storage complexity:
   - Mitigation: strict schema contracts, migration tests, single-writer locking.
2. Renderer scope pressure:
   - Mitigation: fixed V1 primitive set + safe rendering mode.
3. Onboarding complexity:
   - Mitigation: constrain wizard to first-success path and defer optional depth.
4. Portability regressions:
   - Mitigation: contract tests for export/import, including assets and versioning.

## 13. Pre-Implementation Clarifications
1. Final export package extension and internal file layout standard.
2. JSON contract file boundaries and naming conventions.
3. Checkpoint retention defaults (count/size policy).
4. Library path handling for missing/unmounted locations.
