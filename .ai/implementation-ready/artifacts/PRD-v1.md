# CardForge V1 Product Requirements Document

## 1. Document Purpose
This PRD defines the target product for a full CardForge rebuild.

This is a **greenfield implementation**. The previous codebase is not a technical dependency. Legacy behavior is used only as product inspiration and historical context.

## 2. Product Summary
CardForge is a desktop app for designing, iterating, and exporting tabletop card games.

V1 focuses on:
1. Fast path from idea to playable prototype.
2. Safe, deterministic editing for templates and card data.
3. Portable game packages for handoff and continued work.

## 3. Platform Scope
1. App shell: Electron desktop.
2. Initial platform: macOS.
3. Planned next platform: Windows (V2).
4. Collaboration and AI are future-ready in data contracts, but not core V1 runtime features.

## 4. Product Goals
1. Let a first-time user reach a playtestable deck in about 30 minutes.
2. Support both visual creation and high-volume CSV workflows.
3. Make template changes safe for existing cards.
4. Ensure preview/export consistency.
5. Make exports portable and importable across users and machines.

## 5. Product Principles
1. Usability first.
2. Deterministic behavior over hidden fallback.
3. Reversible user actions by default.
4. Progressive complexity: beginner-friendly core, advanced controls available.
5. Portability as a first-class concern.

## 6. Core Domain Model
CardForge separates **what a card is** from **how it looks**.

1. Card Data Template: schema of card fields.
2. Layout Template: visual mapping of fields to a canvas.
3. Card: field values bound to a Card Data Template.
4. Game: container for metadata, assets, templates, decks, and settings.
5. Library: container for games (foundation for future shared/rental models).

## 7. Functional Requirements

### 7.1 Games Workspace
1. Primary container term is `Games`.
2. Games Home supports sorting and filtering.
3. Multiple libraries are supported.
4. Recycle-bin deletion pattern (no immediate destructive delete).
5. Game metadata is first-class:
   - rules
   - playtest notes/templates
   - attached game assets

### 7.2 Template System
1. Templates are global and reusable across games.
2. Template usage is visible (where each template is used).
3. Two linked template layers:
   - Card Data Template
   - Layout Template
4. Card Data Template field types in V1:
   - category (stable option IDs)
   - single line text
   - area text
   - number
   - image (with dimension guidance)
   - icon (optional category mapping)
5. Layout authoring is container-first:
   - draw/place container
   - map data field to container
6. V1 layout element types:
   - single line text
   - text with icon
   - area text
   - image
   - layout/group container
   - basic decoration (boxes, borders, outlines)
7. Reusable layout component library is included in V1.

### 7.3 Print and Digital Layout Direction
1. V1 is print-first in workflow and output priorities.
2. Print and digital layouts are separate template experiences.
3. Shared layer is card data templates and field mapping model.
4. V1 does not ship interactive digital runtime behavior.
5. Digital-ready metadata is preserved in schemas for future adapters.

### 7.4 Canvas and Print Constraints
1. Each print layout template is bound to one card size profile.
2. A game can include multiple templates/layouts with different sizes.
3. A given template can have multiple layout versions for A/B testing.
4. Print canvas contract includes:
   - unit (`mm` or `in`)
   - width/height
   - target DPI
   - bleed margins
   - safe-zone margins
   - optional trim/corner settings
5. Export preflight blocks critical print violations.

### 7.5 Template Assignment and Guardrails
1. Assignment to a game is manual.
2. Assignment source of truth is Game Settings.
3. Unassigning a template in use is blocked.
4. User must choose one resolution path:
   - bulk migrate affected cards to another template (with remap), or
   - remove affected cards
5. Impact dialogs must show affected-card counts before confirm.

### 7.6 Card Editing and Bulk Workflows
1. Cards are grouped by template type in-editor.
2. V1 bulk operations:
   - CSV import flow
   - bulk template switch with required remapping
3. Mixed-template bulk switch requires remap per source template group.
4. CSV workflow requirements:
   - export template-specific CSV template
   - column mapping on import
   - invalid rows skipped
   - explicit import issues report
5. Save behavior:
   - autosave by default
   - named checkpoints
   - rollback to checkpoint

### 7.7 Rendering
1. Rendering is deterministic.
2. Safe mode rejects unsupported behavior explicitly.
3. V1 primitive set:
   - text
   - image slot
   - icon
   - stat value
   - shape/container
4. Preview/export parity is required.
5. Layout save requires field-mapping compatibility validation.

### 7.8 Import/Export and Portability
1. Full game export includes:
   - game metadata
   - data templates used by the game
   - layout templates used by the game
   - deck/card data
   - managed assets
2. Partial exports supported:
   - cards only
   - templates only
   - full game package
3. Export source can be:
   - current state
   - selected named checkpoint
4. Import conflicts fail fast and require explicit resolution.
5. Schema versions are strict with explicit migrations.
6. Export package remains app-consumable for round-trip handoff.

### 7.9 Onboarding and UX Guidance
1. First-run onboarding wizard.
2. Starter sample game.
3. Guided CSV walkthrough.
4. Basic mode and advanced mode UX tiers.
5. Actionable error messaging and recovery steps.

### 7.10 Data Safety and Storage
1. Hybrid persistence:
   - SQLite for operational state/indexing
   - JSON contracts for portability
   - managed asset files
2. Crash-safe atomic writes.
3. Startup migrations for schema updates.
4. Single-writer lock per library in V1.
5. Named checkpoints stored as full snapshots in V1.

## 8. V1 Out of Scope
1. Core AI-assisted authoring workflows.
2. Real-time multi-user editing.
3. Shared/rental permission UX.
4. Plugin ecosystem for custom renderer logic.
5. Full tag management UI.
6. Interactive digital runtime behavior.

## 9. V2+ Direction
1. Windows desktop release.
2. Shared/rental libraries and collaboration UX.
3. Optional bring-your-own AI integrations.
4. Expanded rendering primitives.
5. Deeper digital runtime adapters.

## 10. User Stories
1. As a game designer, I want to create a game quickly so I can start testing ideas immediately.
2. As a designer, I want reusable global templates so I can maintain consistent card systems.
3. As a designer, I want visual layout editing plus advanced controls so I can work fast and still fine-tune.
4. As a content-heavy creator, I want CSV import with mapping and error reporting so I can build large sets efficiently.
5. As a designer, I want safe migration flows for template changes so I do not break existing cards.
6. As a designer, I want autosave and named checkpoints so I can experiment without losing work.
7. As a designer, I want game metadata and assets stored with the game so handoff/playtest context stays complete.
8. As a multi-project user, I want sorting/filtering and multiple libraries so I can manage scale.
9. As a collaborator, I want portable exports with schema-backed templates so imported projects stay editable and reliable.
10. As a future team user, I want a model that can evolve to shared/rental libraries without breaking old data.
11. As a designer, I want preview/export parity so I can trust what I am validating.
12. As a designer, I want recycle-bin recovery so accidental deletes are reversible.
13. As a cost-conscious user, I want optional BYO AI in the future so AI is helpful, not mandatory.
14. As a print-focused designer, I want card-size and bleed-safe canvas rules so outputs are physically reliable.
15. As a cross-target designer, I want shared card data with separate print/digital layouts so each medium can be optimized.

## 11. Core User Flows

### Flow A: First Run to First Playtest Deck
1. Launch app and complete onboarding.
2. Create game.
3. Assign templates in Game Settings.
4. Add cards manually or via CSV.
5. Preview and export for playtest.

### Flow B: CSV-Driven Deck Build
1. Export template-specific CSV file.
2. Fill rows externally.
3. Import and map columns to fields.
4. Create valid cards; skip invalid rows.
5. Review import issues report and retry.

### Flow C: Safe Template Evolution
1. Edit template used by existing cards.
2. Review impact summary.
3. Choose global update or fork/version path.
4. Complete required remapping.
5. Validate and apply changes.

### Flow D: Portable Handoff
1. Choose current state or named checkpoint.
2. Export package with metadata, templates, decks/cards, and assets.
3. Recipient imports package.
4. App validates schema/version/conflicts before finalize.

## 12. Acceptance Criteria
1. End-to-end flow succeeds: create game, assign templates, import cards, preview, export.
2. Template changes that affect cards always require explicit migration/remap path.
3. Unsupported rendering rules fail explicitly.
4. Preview output matches export output for V1 primitives.
5. Import never silently overwrites conflicts.
6. Export/import round-trip preserves data, templates, and assets.
7. Print preflight catches critical bleed/safe-zone/DPI failures.
8. New users can produce a basic playable deck in approximately 30 minutes.

## 13. Delivery Notes
1. This PRD defines product behavior and contracts for a fresh implementation.
2. Existing repository code is not required to satisfy this document.
3. Any implementation may change internals as long as these behaviors and contracts are met.
4. Companion implementation artifacts:
   - `architecture-blueprint.md`
   - `layout-designer-architecture.md`
   - `../schemas/v1/`
