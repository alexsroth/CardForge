# CardForge Rebuild Decision Log (Detailed)

## Purpose

This file records product decisions with context, alternatives, chosen direction, and rationale.
It is meant to guide rebuild planning, not to document implementation details.
Decisions should optimize for user outcomes first, then technical convenience.

## Legend

- `Current behavior`: what the previous app attempted/did from the audit.
- `Options considered`: options discussed during review.
- `Decision`: selected direction.
- `Why`: rationale for the decision.
- `Problem solved / Impact`: concrete effect of choosing this path.
- `User story reference(s)`: which user workflow(s) this decision supports (from `.ai/user-stories.md`).
- `Release target`: intended phase (`V1`, `V2`, or later).

## Decision Rule (User-First)

Before finalizing any new decision:

1. Identify the primary user story it supports.
2. State expected positive user impact (speed, clarity, safety, flexibility).
3. Reject options that mainly optimize implementation but harm usability.
4. If no existing story maps cleanly, create or refine a user story in `.ai/user-stories.md` before locking the decision.

## Story Mapping Status

- Existing decisions D-001 to D-023 were made before story IDs were formalized.
- Going forward, every new decision should include `User story reference(s)`.
- If story coverage is missing, decision status should be `Draft` until a matching story is added.

---

## D-001: Rename "Projects" to "Games"

- Date: 2026-02-08
- Current behavior:
  - The app used the term `Project` for game/deck containers.
- Options considered:
  1. Keep `Project`
  2. Rename to `Game`
- Decision:
  - Rename user-facing concept to `Game`.
- Why:
  - Better matches user mental model and long-term collaboration framing.
- Problem solved / Impact:
  - Eliminates terminology mismatch and improves UX clarity for future shared-library workflows.
- Release target:
  - V1

## D-002: Games Home Should Be Rich (Not Minimal)

- Date: 2026-02-08
- Current behavior:
  - Dashboard existed with project cards and basic actions.
- Options considered:
  1. Minimal list page for V1
  2. Rich home with sort/filter controls
- Decision:
  - Rich Games Home with filtering and sorting.
- Why:
  - Games Home is the primary operational hub; users need navigation control as libraries grow.
- Problem solved / Impact:
  - Reduces navigation friction and scales better as users accumulate many games.
- Release target:
  - V1

## D-003: Recycle Bin as Default Deletion Pattern

- Date: 2026-02-08
- Current behavior:
  - Hard-delete oriented flows were present.
- Options considered:
  1. Hard delete by default
  2. Archive/recycle-bin first, hard delete secondary
- Decision:
  - Use recycle-bin/archive pattern broadly.
- Why:
  - Safer iteration, fewer destructive mistakes, aligns with design-heavy workflows.
- Problem solved / Impact:
  - Prevents accidental irreversible loss and enables recovery-based workflows.
- Release target:
  - V1 baseline pattern

## D-004: Expand Game Metadata and Local Asset Ownership

- Date: 2026-02-08
- Current behavior:
  - Game metadata existed but was shallow.
  - Placeholder images were commonly used.
- Options considered:
  1. Keep minimal game metadata
  2. Expand metadata and allow game-owned artifacts/assets
- Decision:
  - Expand games to include notes, rules, playtest artifacts, and game-owned images.
  - Allow users to upload images into game folder.
- Why:
  - Supports real design workflows and reduces dependence on placeholders.
- Problem solved / Impact:
  - Centralizes design context per game and makes asset pipelines portable and self-contained.
- Release target:
  - V1 core model

## D-005: Multi-Library Architecture

- Date: 2026-02-08
- Current behavior:
  - Single local data store model.
- Options considered:
  1. Single library only
  2. Multi-library model (owned now, shared/rental later)
- Decision:
  - Architect for multiple libraries from the start.
- Why:
  - Enables future collaboration/share semantics without reworking core data boundaries.
- Problem solved / Impact:
  - Avoids a future migration trap when adding owned/shared library permissions.
- Release target:
  - V1 architecture, V2+ collaboration UX

## D-006: Templates Are Global

- Date: 2026-02-08
- Current behavior:
  - Templates were treated as globally managed and assigned to projects.
- Options considered:
  1. Game-scoped templates only
  2. Global templates reusable across games
- Decision:
  - Templates remain global.
- Why:
  - Reuse is central; avoids recreating schemas repeatedly.
- Problem solved / Impact:
  - Increases template reuse and consistency across games while lowering authoring overhead.
- Release target:
  - V1

## D-007: Template Usage Visibility Across Games

- Date: 2026-02-08
- Current behavior:
  - Some visibility existed, but not formalized as decision criteria.
- Options considered:
  1. No usage surface
  2. Show where each template is used
- Decision:
  - Must show template usage by game.
- Why:
  - Needed for safe edits, deprecation, and migration impact understanding.
- Problem solved / Impact:
  - Makes change impact visible before edits, reducing accidental cross-game regressions.
- Release target:
  - V1

## D-008: Dual Editing Modes for Templates (Visual + JSON)

- Date: 2026-02-08
- Current behavior:
  - Visual builder and JSON editing both existed.
- Options considered:
  1. Visual only
  2. JSON only
  3. Both
- Decision:
  - Keep both modes.
- Why:
  - Visual mode serves most users; JSON mode enables power-user bulk/precision edits.
- Problem solved / Impact:
  - Supports both beginner and advanced workflows without forcing either audience into one mode.
- Release target:
  - V1

## D-009: Evolve Visual Editor to Drag-and-Drop + Snap Grid

- Date: 2026-02-08
- Current behavior:
  - Visual editing existed but felt more like guarded form editing of JSON.
- Options considered:
  1. Keep form-style editor only
  2. Move to direct manipulation (drag/drop) with snap system
- Decision:
  - Move toward drag-and-drop placement with snap-to-grid; keep side panels for style controls.
- Why:
  - Better authoring UX and closer to designer expectations.
- Problem solved / Impact:
  - Speeds layout creation and reduces manual coordinate/styling errors.
- Release target:
  - V1 direction, polish can continue post-V1

## D-010: Template Evolution Supports Global Update or Fork/Version

- Date: 2026-02-08
- Current behavior:
  - Updating templates risks broad downstream impact.
- Options considered:
  1. Single mutable template only
  2. Immutable templates with forced duplication
  3. User choice: update globally or fork/version for specific games
- Decision:
  - Support both global update and fork/version flows.
- Why:
  - Needed to balance reuse with game-specific divergence.
- Problem solved / Impact:
  - Prevents global-template lock-in while preserving shared-template benefits.
- Release target:
  - V1 capability

## D-011: Mandatory Data Remap When Template Shape Changes

- Date: 2026-02-08
- Current behavior:
  - Template changes could leave mismatched card fields.
- Options considered:
  1. Best-effort silent migration
  2. Block changes unless manual cleanup first
  3. Guided remap flow
- Decision:
  - Use guided remap flow whenever schema changes affect cards.
- Why:
  - Prevents silent data loss and keeps edits intentional.
- Problem solved / Impact:
  - Enforces safe schema evolution and preserves card data integrity during template changes.
- Release target:
  - V1

## D-012: Template Asset Slots, Not High-Fidelity Asset Preview for V1

- Date: 2026-02-08
- Current behavior:
  - Layouts included image/placeholder concepts.
- Options considered:
  1. Full final-image fidelity preview in V1
  2. Template-level asset slots and practical preview only
- Decision:
  - V1 focuses on slot placement/dimensions and practical preview; full fidelity can come later.
- Why:
  - Keeps V1 scope focused while preserving core layout intent.
- Problem solved / Impact:
  - Delivers essential template composition without blocking on advanced render fidelity.
- Release target:
  - V1

## D-013: Template-to-Game Assignment Is Manual

- Date: 2026-02-08
- Current behavior:
  - Template assignment controls existed and were explicit.
- Options considered:
  1. Auto-assign templates implicitly
  2. Manual assignment
- Decision:
  - Manual assignment only.
- Why:
  - Keeps game scope intentional and predictable.
- Problem solved / Impact:
  - Prevents implicit scope creep and unintended template availability inside games.
- Release target:
  - V1

## D-014: Unassign Guardrail for In-Use Templates

- Date: 2026-02-08
- Current behavior:
  - Assignment/removal pathways could create dangling references.
- Options considered:
  1. Allow unassign and leave cards broken
  2. Hard block forever
  3. Block unassign until user resolves impact via explicit flow
- Decision:
  - Cannot unassign if cards still use that template, unless user resolves via:
    - bulk migrate/remap to another template, or
    - remove affected cards.
- Why:
  - Preserves data integrity and keeps user in control.
- Problem solved / Impact:
  - Stops orphaned card states and forces explicit resolution for in-use template changes.
- Release target:
  - V1

## D-015: Assignment Management Owned by Game Settings

- Date: 2026-02-08
- Current behavior:
  - Assignment operations existed in library context.
- Options considered:
  1. Manage only from template side
  2. Manage only from game side
  3. Source-of-truth on game side, visible from template side
- Decision:
  - Define assignment in game settings; expose usage from template views.
- Why:
  - Assignment is a game scope rule, not a template property.
- Problem solved / Impact:
  - Establishes a clear source of truth and reduces conflicting assignment edits.
- Release target:
  - V1

## D-016: Impact Dialogs Required for Risky Assignment Changes

- Date: 2026-02-08
- Current behavior:
  - Limited impact preview in destructive flows.
- Options considered:
  1. Lightweight warnings only
  2. Structured impact dialogs with counts + required next action
- Decision:
  - Use impact dialogs with affected-card counts and explicit resolution actions.
- Why:
  - Reduces accidental destructive operations.
- Problem solved / Impact:
  - Improves operator safety by surfacing blast radius before destructive actions.
- Release target:
  - V1

## D-017: CSV Round-Trip as Core Workflow

- Date: 2026-02-08
- Current behavior:
  - Import/export existed, but CSV handling was simplistic.
- Options considered:
  1. JSON-only in V1
  2. CSV import/export as first-class workflow
- Decision:
  - CSV round-trip is first-class:
    - download template CSV per card template
    - author rows offline
    - upload for bulk creation
- Why:
  - Spreadsheet workflow is central to rapid content authoring.
- Problem solved / Impact:
  - Enables high-volume content creation outside the app with predictable re-import.
- Release target:
  - V1

## D-018: CSV Import Must Include Mapping and Error Reporting

- Date: 2026-02-08
- Current behavior:
  - Naive parse behavior and limited reporting.
- Options considered:
  1. Strict fail on first error
  2. Best-effort import without visibility
  3. Map columns, skip bad rows, issue report
- Decision:
  - Import flow requires:
    - explicit column-to-field mapping
    - skip invalid rows
    - "cards with issues importing" report
- Why:
  - Keeps velocity high while preserving auditability.
- Problem solved / Impact:
  - Prevents whole-import failures and gives designers actionable diagnostics for bad rows.
- Release target:
  - V1

## D-019: V1 Bulk Actions Scope

- Date: 2026-02-08
- Current behavior:
  - Bulk capabilities were limited.
- Options considered:
  1. Broad bulk editor in V1
  2. Keep bulk scope narrow
- Decision:
  - V1 bulk scope is narrow: import workflows + bulk template change/remap.
- Why:
  - Prioritizes high-value operations while controlling complexity.
- Problem solved / Impact:
  - Avoids overbuilding bulk UX early while still covering the highest ROI workflows.
- Release target:
  - V1

## D-020: Bulk Template Switching Is Allowed With Grouped Remap

- Date: 2026-02-08
- Current behavior:
  - Template changes were possible per card but not formalized for mixed-source bulk sets.
- Options considered:
  1. Disallow bulk template change
  2. Allow but without robust remap handling
  3. Allow and require remap by source-template group
- Decision:
  - Allow bulk template switching.
  - If selected cards span multiple source templates, remap each source group separately.
- Why:
  - Enables realistic migration workflows while preserving schema correctness.
- Problem solved / Impact:
  - Supports large-scale template migration without corrupting mixed-template card sets.
- Release target:
  - V1

## D-021: Formal JSON Schemas for Core Data Structures

- Date: 2026-02-08
- Current behavior:
  - Types existed, but schema governance was not formalized.
- Options considered:
  1. Rely only on runtime code conventions
  2. Define explicit schema JSON files for core entities
- Decision:
  - Define formal schemas (including explicit card-template linkage).
- Why:
  - Supports portability, validation, and future collaboration pipelines.
- Problem solved / Impact:
  - Creates a contract-first data model for export/import compatibility and cross-client safety.
- Release target:
  - V1 architecture requirement

## D-022: Card Organization in Editor

- Date: 2026-02-08
- Current behavior:
  - Cards were grouped by template in editor flows.
- Options considered:
  1. Flat card list
  2. Group by template type
  3. Full tag-based organization now
- Decision:
  - Group cards by template type in V1.
  - Prepare data model for future tag support.
- Why:
  - Keeps present UX clear while reserving future extensibility.
- Problem solved / Impact:
  - Maintains usable organization now while reducing future rework for tag features.
- Release target:
  - V1 grouping, V2+ tags

## D-023: Save Strategy = Autosave + Named Checkpoints

- Date: 2026-02-08
- Current behavior:
  - Autosave-oriented behavior existed.
- Options considered:
  1. Manual save only
  2. Autosave only
  3. Autosave + user-created named rollback checkpoints
- Decision:
  - Continuous autosave plus named checkpoints.
- Why:
  - Prevents data loss while supporting intentional version rollback.
- Problem solved / Impact:
  - Balances safety (continuous persistence) with creative control (named restore points).
- Release target:
  - V1

## D-024: V1 Renderer Prioritizes Deterministic Consistency

- Date: 2026-02-08
- Current behavior:
  - Rendering supported dynamic layouts but could be affected by broad style/input variation.
- Options considered:
  1. Strict deterministic rendering with narrower supported behavior
  2. More expressive rendering with broader style flexibility in V1
- Decision:
  - Choose strict deterministic rendering behavior for V1.
- Why:
  - V1 should optimize trust and predictable outcomes over maximum styling freedom.
- Problem solved / Impact:
  - Reduces rendering surprises and makes large card sets safer to author/import.
- User story reference(s):
  - US-03, US-11, US-05
- Release target:
  - V1

## D-025: Safe Rendering Mode Required in V1

- Date: 2026-02-08
- Current behavior:
  - Unsupported rules could be handled inconsistently depending on renderer behavior.
- Options considered:
  1. Safe mode: reject unsupported rules with explicit validation errors
  2. Best-effort mode: attempt render and silently ignore unsupported rules
- Decision:
  - Use safe rendering mode in V1.
- Why:
  - Explicit failures are preferable to silent visual drift.
- Problem solved / Impact:
  - Improves user confidence and shortens debugging by surfacing invalid layout rules immediately.
- User story reference(s):
  - US-11, US-05
- Release target:
  - V1

## D-026: V1 Renderer Primitive Set Is Minimal

- Date: 2026-02-08
- Current behavior:
  - Template layouts used common primitives with room for expansion.
- Options considered:
  1. Minimal primitive set now
  2. Broader primitive/plugin model in V1
- Decision:
  - V1 primitive set remains minimal:
    - text
    - image slot
    - icon
    - stat value
    - shape/container
- Why:
  - Keeps renderer stable and testable while still covering common card-game needs.
- Problem solved / Impact:
  - Delivers practical layout capability without introducing high-risk rendering complexity in V1.
- User story reference(s):
  - US-03, US-11
- Release target:
  - V1

## D-027: Editor Preview and Export Render Must Match in V1

- Date: 2026-02-08
- Current behavior:
  - Preview and output fidelity could diverge depending on rendering path.
- Options considered:
  1. Render parity between editor preview and export
  2. Data-only export with deferred rendering elsewhere
- Decision:
  - Require render parity in V1 (what users see is what exported visuals produce).
- Why:
  - Trust in output is core to playtest and sharing workflows.
- Problem solved / Impact:
  - Prevents handoff surprises and increases reliability of external review/playtest outputs.
- User story reference(s):
  - US-11, US-09
- Release target:
  - V1

## D-028: Full Game Export Is Multi-Part and Portable

- Date: 2026-02-08
- Current behavior:
  - Export/import existed, but full-game portability contract was not finalized.
- Options considered:
  1. Single monolithic export artifact
  2. Multi-part export with separable components
- Decision:
  - Full-game export must include:
    - game metadata (rules, playtest artifacts, etc.)
    - card templates used by the game
    - deck/card data
  - Components should be separable (e.g., export only cards, only templates, or full game).
- Why:
  - Users need both targeted exports and complete shareable handoff packages.
- Problem solved / Impact:
  - Supports modular workflows while preserving full portability for collaboration/handoff.
- User story reference(s):
  - US-07, US-09, US-10, US-04
- Release target:
  - V1

## D-029: Export Packaging Includes Asset Files (Not References Only)

- Date: 2026-02-08
- Current behavior:
  - Asset handling for portable exports was not locked.
- Options considered:
  1. References-only exports
  2. Package and include asset files with export
- Decision:
  - Include uploaded game assets with export package.
  - Use packaged-file approach (Option B from review) for transportability.
- Why:
  - Imported games must be editable by another user without broken asset links.
- Problem solved / Impact:
  - Ensures shared imports are self-contained and collaboration-ready.
- User story reference(s):
  - US-07, US-09, US-10
- Release target:
  - V1

## D-030: Import ID Conflicts Are Fail-Fast and Explicit

- Date: 2026-02-08
- Current behavior:
  - Conflict behavior on import was not standardized.
- Options considered:
  1. Fail and ask user to resolve
  2. Auto-rename copies
  3. Auto-merge
- Decision:
  - Use fail-fast conflict handling (Option A), requiring explicit user resolution.
- Why:
  - Protects data integrity and avoids silent collisions/overwrites.
- Problem solved / Impact:
  - Prevents ambiguous merges and keeps imports deterministic and auditable.
- User story reference(s):
  - US-05, US-09
- Release target:
  - V1

## D-031: Export Scope Supports Current State or Named Save State

- Date: 2026-02-08
- Current behavior:
  - Save/checkpoint behavior existed, but export-state selection was not formalized.
- Options considered:
  1. Export latest/current only
  2. Offer export of current or selected named checkpoint
- Decision:
  - Export flow must allow:
    - export current state, or
    - export a named save checkpoint.
- Why:
  - Users need controlled rollback/snapshot sharing in playtest and review cycles.
- Problem solved / Impact:
  - Improves reproducibility and collaboration around specific test versions.
- User story reference(s):
  - US-06, US-09
- Release target:
  - V1

## D-032: Collaboration Metadata Groundwork Starts in V1

- Date: 2026-02-08
- Current behavior:
  - Collaboration model was future-facing but not yet encoded in export contracts.
- Options considered:
  1. Defer collaboration metadata entirely to V2
  2. Include foundational collaboration metadata now
- Decision:
  - Include collaboration-readiness groundwork in V1 data/export models.
- Why:
  - Avoids disruptive schema migration when shared/rental libraries are introduced.
- Problem solved / Impact:
  - De-risks future collaboration rollout and preserves forward compatibility.
- User story reference(s):
  - US-10, US-09
- Release target:
  - V1 architecture groundwork

## D-033: Schema-Versioning Strategy for Import/Export Is Pending

- Date: 2026-02-08
- Current behavior:
  - No final decision yet between strict migration-first vs tolerant parsing.
- Options considered:
  1. Strict schema version + explicit migration
  2. Best-effort tolerant parsing
- Decision:
  - Use strict schema versioning with explicit migration requirements (Option 1).
- Why:
  - Deterministic compatibility and safe portability are higher priority than permissive parsing.
- Problem solved / Impact:
  - Prevents ambiguous import behavior and reduces hidden corruption risk across app versions.
- User story reference(s):
  - US-09, US-10, US-05
- Release target:
  - V1 (must be finalized before implementation)

## D-034: Persistence Model Is Hybrid (SQLite + Portable JSON + Asset Files)

- Date: 2026-02-08
- Current behavior:
  - Prior app was local-storage centered and lacked a formal desktop persistence contract.
- Options considered:
  1. File-first JSON
  2. SQLite-first
  3. Hybrid model
- Decision:
  - Use hybrid persistence:
    - SQLite for app state/indexing and operational reliability
    - Structured JSON artifacts for import/export portability
    - Managed asset files on disk
- Why:
  - Balances robust desktop behavior with portable/shareable data contracts.
- Problem solved / Impact:
  - Provides reliable local performance while preserving long-term collaboration portability.
- User story reference(s):
  - US-09, US-10, US-07, US-08
- Release target:
  - V1

## D-035: Multiple Selectable Libraries

- Date: 2026-02-08
- Current behavior:
  - Single-library assumptions were common in the legacy app.
- Options considered:
  1. Single app-managed library
  2. Multiple user-selectable libraries
- Decision:
  - Support multiple libraries.
- Why:
  - Aligns with future owned/shared/rental library workflows.
- Problem solved / Impact:
  - Improves organization at scale and reduces future migration cost for collaboration features.
- User story reference(s):
  - US-08, US-10
- Release target:
  - V1

## D-036: Crash-Safe Atomic Write Strategy

- Date: 2026-02-08
- Current behavior:
  - Previous architecture did not define a strong crash-safe write contract.
- Options considered:
  1. Immediate in-place writes
  2. Atomic writes with durability safeguards
- Decision:
  - Use atomic write strategy for persistence operations.
- Why:
  - Data safety is critical with autosave and frequent edit operations.
- Problem solved / Impact:
  - Reduces corruption risk from crashes/interrupted writes and increases trust in autosave.
- User story reference(s):
  - US-06, US-05
- Release target:
  - V1

## D-037: Checkpoints Stored as Full Snapshots

- Date: 2026-02-08
- Current behavior:
  - Checkpoint model existed conceptually but storage strategy was not formalized.
- Options considered:
  1. Full snapshot checkpoints
  2. Delta/diff checkpoints
- Decision:
  - Store named checkpoints as full snapshots in V1.
- Why:
  - Simpler and safer restore behavior for early versions.
- Problem solved / Impact:
  - Improves rollback reliability and reduces restore-chain failure complexity.
- User story reference(s):
  - US-06, US-12
- Release target:
  - V1

## D-038: Managed Asset Copy Strategy

- Date: 2026-02-08
- Current behavior:
  - Legacy approach included placeholders and non-portable asset pathways.
- Options considered:
  1. Copy assets into managed game/library folders
  2. Reference external absolute paths
- Decision:
  - Copy/import assets into managed storage.
- Why:
  - Portable, shareable game packages require self-contained assets.
- Problem solved / Impact:
  - Prevents broken references when transferring games between users/machines.
- User story reference(s):
  - US-07, US-09
- Release target:
  - V1

## D-039: Startup Auto-Migration for Schema Changes

- Date: 2026-02-08
- Current behavior:
  - Migration timing strategy was not finalized.
- Options considered:
  1. Auto-migrate on startup
  2. Lazy migrate per game on open
- Decision:
  - Use startup auto-migration.
- Why:
  - Maintains consistent library state and avoids mixed-schema behavior.
- Problem solved / Impact:
  - Reduces version skew bugs and creates predictable upgrade behavior.
- User story reference(s):
  - US-09, US-10, US-05
- Release target:
  - V1

## D-040: Single-Writer Lock Per Library

- Date: 2026-02-08
- Current behavior:
  - Concurrency behavior was not formalized for desktop filesystem workflows.
- Options considered:
  1. Single-writer lock per library
  2. Optimistic local multi-writer
- Decision:
  - Use single-writer locking per library in V1.
- Why:
  - Prioritizes integrity over complex conflict resolution in early versions.
- Problem solved / Impact:
  - Prevents simultaneous-write corruption and reduces conflict-handling complexity.
- User story reference(s):
  - US-05, US-10
- Release target:
  - V1

## D-041: V1 Onboarding Uses Interactive Step-by-Step Wizard

- Date: 2026-02-08
- Current behavior:
  - Legacy onboarding was documentation-oriented and less flow-driven.
- Options considered:
  1. Static docs page only
  2. Guided checklist
  3. Interactive wizard that creates a sample path
- Decision:
  - Use an interactive step-by-step onboarding wizard in V1.
- Why:
  - New users need guided, in-product setup to reach first success quickly.
- Problem solved / Impact:
  - Reduces early confusion and shortens time-to-first-playtestable outcome.
- User story reference(s):
  - US-01, US-03
- Release target:
  - V1

## D-042: Include a Starter Sample Game on First Run

- Date: 2026-02-08
- Current behavior:
  - Starting state could be sparse and require users to discover workflow manually.
- Options considered:
  1. Empty app
  2. Starter sample game
  3. Template gallery only
- Decision:
  - Provide a starter sample game (templates + sample cards) on first run.
- Why:
  - Concrete examples improve comprehension of templates, cards, and rendering flow.
- Problem solved / Impact:
  - Gives users an immediate working reference they can inspect, modify, and learn from.
- User story reference(s):
  - US-01, US-11
- Release target:
  - V1

## D-043: CSV Onboarding Includes Guided Mini-Flow

- Date: 2026-02-08
- Current behavior:
  - CSV was available but onboarding depth was limited.
- Options considered:
  1. Docs link only
  2. Guided CSV template/export/import flow
  3. Omit CSV onboarding in V1
- Decision:
  - Include guided mini-flow for:
    - downloading template CSV
    - populating/importing CSV
    - reviewing import outcomes
- Why:
  - CSV is a core high-volume authoring path and must be discoverable early.
- Problem solved / Impact:
  - Increases adoption of efficient bulk workflows and reduces import misuse.
- User story reference(s):
  - US-04, US-01
- Release target:
  - V1

## D-044: Track Onboarding Progress and Allow Reset

- Date: 2026-02-08
- Current behavior:
  - Onboarding progress state was not a formal product contract.
- Options considered:
  1. No progress tracking
  2. Track progress + reset option
  3. Force completion gate before normal use
- Decision:
  - Persist onboarding progress and allow users to reset/replay onboarding.
- Why:
  - Supports both first-time guidance and later relearning without hard lock-in.
- Problem solved / Impact:
  - Balances flexibility with guidance; avoids both user lockout and onboarding abandonment.
- User story reference(s):
  - US-01, US-08
- Release target:
  - V1

## D-045: Basic and Advanced Workspace Modes

- Date: 2026-02-08
- Current behavior:
  - Advanced capabilities existed but discoverability and cognitive load needed clearer structure.
- Options considered:
  1. Hide advanced features initially
  2. Show everything with hints
  3. Separate basic and advanced workspace modes
- Decision:
  - Provide explicit Basic and Advanced workspace modes in V1.
- Why:
  - Keeps entry path approachable while preserving power-user control.
- Problem solved / Impact:
  - Reduces cognitive overload for new users without limiting expert workflows.
- User story reference(s):
  - US-01, US-03
- Release target:
  - V1

## D-046: Actionable Errors With Fix Guidance

- Date: 2026-02-08
- Current behavior:
  - Error messages could be technical and not always recovery-oriented.
- Options considered:
  1. Generic errors only
  2. Actionable errors with fix links/hints
  3. Full diagnostics panel in V1
- Decision:
  - Use actionable, user-facing errors with clear next steps and fix guidance.
- Why:
  - Recoverability is essential for import/template workflows and first-run success.
- Problem solved / Impact:
  - Reduces frustration and improves task completion after failures.
- User story reference(s):
  - US-05, US-04, US-01
- Release target:
  - V1

## D-047: No Core AI Features in V1 Product Scope

- Date: 2026-02-08
- Current behavior:
  - Legacy app included an AI name-generation path.
- Options considered:
  1. Ship AI in V1
  2. Keep AI out of core V1 scope
- Decision:
  - AI features are out of V1 core scope.
- Why:
  - Core authoring reliability and usability take priority over assistive AI features.
- Problem solved / Impact:
  - Reduces complexity and delivery risk in V1 while preserving focus on core workflows.
- User story reference(s):
  - US-01, US-05
- Release target:
  - V1

## D-048: Future AI Model Is BYO Provider (No Platform-Funded Usage)

- Date: 2026-02-08
- Current behavior:
  - AI provider/cost ownership model was not formalized.
- Options considered:
  1. App-managed shared AI billing
  2. Bring-your-own AI provider/key model
- Decision:
  - Use a BYO AI integration model for future AI features.
- Why:
  - Avoids mandatory platform-side AI costs and keeps user/provider choice open.
- Problem solved / Impact:
  - Lowers operational cost risk and avoids lock-in for users.
- User story reference(s):
  - US-13
- Release target:
  - V2+

## D-049: AI Features Must Degrade Gracefully Offline

- Date: 2026-02-08
- Current behavior:
  - AI was optional but offline behavior contract was not explicit.
- Options considered:
  1. AI blocks or degrades core workflows when unavailable
  2. AI is optional and simply unavailable when offline/disconnected
- Decision:
  - AI features are optional helpers only and should be unavailable (without blocking core flows) when offline.
- Why:
  - Core app capabilities must remain independent of AI connectivity.
- Problem solved / Impact:
  - Preserves a dependable offline-first workflow and prevents AI outages from impacting core usage.
- User story reference(s):
  - US-01, US-13
- Release target:
  - V2+ behavior contract

## D-050: Future AI Feature Candidates Prioritized for Exploration

- Date: 2026-02-08
- Current behavior:
  - Legacy AI focus was mainly card-name generation.
- Options considered:
  1. Keep name generation as first AI priority
  2. Prioritize broader assistive workflows
- Decision:
  - Prioritize exploration of:
    - image generation assistance
    - bulk deck maker assistance
  - over standalone name generation.
- Why:
  - These candidates potentially provide higher leverage for content velocity.
- Problem solved / Impact:
  - Focuses future AI work on features with larger workflow impact.
- User story reference(s):
  - US-04, US-13
- Release target:
  - V2+ exploration backlog

## D-051: Do Not Persist AI Prompt Payloads by Default

- Date: 2026-02-08
- Current behavior:
  - Prompt/result persistence policy was unspecified.
- Options considered:
  1. Do not persist prompt payloads by default
  2. Persist prompts/results for full reproducibility
- Decision:
  - Default to non-persistence of raw AI prompt payloads.
- Why:
  - Minimizes stored sensitive context and keeps baseline privacy posture conservative.
- Problem solved / Impact:
  - Reduces privacy/compliance surface for future AI integrations.
- User story reference(s):
  - US-13
- Release target:
  - V2+ behavior contract

## D-052: Layout Designer Uses Container-First Authoring With Group-Only Layout Container

- Date: 2026-02-08
- Current behavior:
  - Template layout behavior supported element placement, but authoring sequence was not explicitly locked as container-first.
- Options considered:
  1. `layout` container acts as group/frame only
  2. `layout` container acts as repeater/data-driven list
  3. Support both in V1
- Decision:
  - Use container-first flow in template designer:
    1. draw container
    2. map data field to container
  - Supported container types for this flow:
    - single line text
    - text with icon
    - area text
    - image
    - layout
  - In V1, `layout` is group/frame only (no repeater semantics).
- Why:
  - Keeps authoring intuitive and visual while reducing V1 complexity/risk.
- Problem solved / Impact:
  - Improves usability for non-technical users and avoids premature complexity in data-driven nested layout behaviors.
- User story reference(s):
  - US-03, US-01, US-11
- Release target:
  - V1

## D-053: Template Canvas Designer With Single Size per Template in V1

- Date: 2026-02-08
- Current behavior:
  - Template layouts supported size-like properties but real print-oriented size governance was not a locked product rule.
- Options considered:
  1. Allow one template to contain multiple sizes in V1
  2. Enforce one card size per template in V1
- Decision:
  - Add explicit canvas design step in template authoring.
  - In V1, each template is bound to a single card size profile.
  - A game may still include multiple templates with different sizes.
- Why:
  - Supports real print constraints while keeping rendering/export behavior deterministic.
- Problem solved / Impact:
  - Prevents cross-size layout ambiguity and improves confidence that designs map to physical card dimensions.
- User story reference(s):
  - US-14, US-11, US-09
- Release target:
  - V1

## D-054: Same-Size Layout Versioning in V1; Multi-Size Layout Sets Considered for V2

- Date: 2026-02-08
- Current behavior:
  - Layout variation behavior was not formally separated between same-size A/B testing and multi-size targeting.
- Options considered:
  1. No versioning in V1
  2. Same-size layout versions in V1; defer multi-size layout sets
  3. Full multi-size layout sets in V1
- Decision:
  - V1 supports multiple layout versions for the template’s single size (A/B testing).
  - V2 can introduce multi-size layout sets under strict size binding rules.
- Why:
  - Delivers useful experimentation without increasing V1 schema/render complexity too early.
- Problem solved / Impact:
  - Enables layout iteration while preserving predictable sizing and migration behavior.
- User story reference(s):
  - US-03, US-14, US-11
- Release target:
  - V1 (same-size versions), V2+ (multi-size layout sets)

## D-055: Print Geometry and Preflight Are Mandatory in V1 Canvas Contracts

- Date: 2026-02-08
- Current behavior:
  - Layout authoring captured size intent, but explicit print production constraints were not mandatory in contract and export checks.
- Options considered:
  1. Minimal canvas geometry with optional print checks
  2. Mandatory print-aware canvas contract and preflight
- Decision:
  - Require print-aware canvas schema fields in V1:
    - physical unit
    - physical dimensions
    - dpi target
    - bleed margins
    - safe-zone margins
    - optional trim/corner settings
  - Require export preflight checks for safe-zone, bleed policy, and minimum effective image DPI.
- Why:
  - CardForge should embed real-world print best practices so new creators can produce playable output quickly and safely.
- Problem solved / Impact:
  - Prevents common amateur print failures and increases confidence that exported decks are test-ready.
- User story reference(s):
  - US-14, US-11, US-01, US-09
- Release target:
  - V1

## D-056: V1 Is Print-First With Digital-Ready Non-Interactive Exports

- Date: 2026-02-08
- Current behavior:
  - Product direction included both print and future digital needs, but explicit V1 boundary was not captured as a single rule.
- Options considered:
  1. Print-only V1 with no digital contract groundwork
  2. Full digital runtime in V1
  3. Print-first V1 plus digital-ready, non-interactive export groundwork
- Decision:
  - Choose option 3.
  - V1 does not include interactive digital runtime behavior.
  - V1 does include digital capability metadata and adapter-ready export structure.
  - Users should not need to choose a separate print/digital authoring mode.
- Why:
  - Preserves V1 delivery focus while avoiding rework for digital expansion.
- Problem solved / Impact:
  - Enables single authoring flow across targets and reduces future migration cost.
- User story reference(s):
  - US-15, US-09, US-10, US-01
- Release target:
  - V1 (groundwork), V2+ (interactive runtime features)

## D-057: Split Template Model Into Data Template and Target-Specific Layout Templates

- Date: 2026-02-08
- Current behavior:
  - Earlier direction treated template definition and layout concerns as closely bundled, with print-primary assumptions.
- Options considered:
  1. Keep single combined template contract
  2. Separate data contract from presentation contracts
- Decision:
  - Use a two-layer template model:
    - Card Data Template (shared structured card fields/types)
    - Layout Templates (separate print and digital layout experiences)
  - Layout templates reference a data template via `dataTemplateId`.
  - Shared data can power multiple target-specific layouts without forcing a mode choice during authoring.
- Why:
  - Print and digital layout design have different constraints and should be optimized independently while preserving shared data continuity.
- Problem solved / Impact:
  - Enables one card dataset to support multiple output targets while reducing layout coupling and migration complexity.
- User story reference(s):
  - US-15, US-03, US-09, US-10
- Release target:
  - V1 architecture contract

## D-058: Component Builder Is a First-Class Layout Capability

- Date: 2026-02-08
- Current behavior:
  - Layout authoring supported container composition but reusable component contracts were not explicit.
- Options considered:
  1. No component library in V1
  2. Add reusable layout component contracts in V1
- Decision:
  - Add a reusable layout component builder/library contract, usable in print and digital layout templates.
- Why:
  - Supports rapid prototyping and structured variants (e.g., archetype frame differences) without re-authoring from scratch.
- Problem solved / Impact:
  - Speeds iterative design and helps amateurs reach playtest output faster.
- User story reference(s):
  - US-01, US-03, US-14
- Release target:
  - V1

---

## Open Items (Pending Decision)

- None (feature review complete; next phase is scope synthesis + stack selection)
