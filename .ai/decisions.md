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

---

## Open Items (Pending Decision)
- Feature 5: Dynamic Card Rendering
- Feature 6: Data Import/Export (beyond CSV decisions already made)
- Feature 7: Persistence model details for Electron filesystem design
- Feature 8: Onboarding/getting-started experience
- Feature 9: AI features (currently out of V1)
