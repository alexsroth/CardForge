# CardForge Current Features State (Intent-Focused)

## Purpose

CardForge is intended to be a rapid card-game prototyping workspace where a designer can go from idea to playtestable deck quickly, without needing custom scripts or manual layout tooling.

## Product Intention

- Reduce friction in early card-game design.
- Let non-programmer-friendly workflows coexist with power-user workflows.
- Keep iteration loop tight: define data -> design layout -> enter cards -> preview instantly -> export.
- Prioritize local-first workflow so users can start without backend setup.

## Intended Core Workflow

1. Define reusable card templates (data fields + visual layout rules).
2. Create a project (a game/deck container) and assign one or more templates.
3. Add/edit cards inside the project using those templates.
4. See live card rendering while editing card data.
5. Import/export deck data for external editing, playtesting, or engine integration.

## Intended Feature Areas

### 1. Project Dashboard

Intention:

- Act as the home for multiple game ideas/prototypes.
- Show project metadata at a glance (name, thumbnail, recent activity, rough composition).
- Provide fast entry into editing.

### 2. Template System

Intention:

- Treat templates as reusable card "schemas + presentation".
- Allow each card type (creature/spell/item/etc.) to define its own fields.
- Support visual layout authoring and direct JSON editing for power users.
- Make templates globally reusable across projects.

### 3. Template-Project Assignment

Intention:

- Explicitly control which templates are valid in each project.
- Prevent random card structures from mixing into a deck unless intentionally allowed.
- Support project-specific curation of available card types.

### 4. Live Card Editor

Intention:

- Split-screen authoring: data entry + immediate render.
- Enable fast per-card iteration without context switching.
- Support multiple templates in one deck and render each card with its mapped template.

### 5. Dynamic Card Rendering

Intention:

- Render cards from template layout definitions, not hardcoded per-card components.
- Allow layout elements (text/image/icon/value blocks) to map to arbitrary fields.
- Keep rendering generic enough to support many game styles.

### 6. Data Import / Export

Intention:

- Enable spreadsheet-first workflows.
- Allow round-tripping deck data via JSON/CSV.
- Make content generation/editing possible outside the app, then sync back in.

### 7. AI Name Assistance

Intention:

- Provide optional creative assist for naming cards from descriptions/effect text.
- Speed up ideation, not replace designer control.

### 8. Persistence Model

Intention:

- Keep user data persistent between sessions without requiring accounts.
- Favor local storage for zero-friction startup.
- Defer cloud sync to a later maturity phase.

## Intended User Experience Principles

- Fast feedback over heavy setup.
- Visual-first design tools with optional low-level control.
- Progressive complexity: simple defaults for beginners, deeper controls for advanced users.
- Prototype-safe: easy experimentation, quick edits, reversible iteration.

## Intended Data Concepts

- `Template`: field schema + layout definition.
- `Project`: deck container + allowed template set.
- `Card`: data row tied to a specific template.
- `Layout Definition`: rendering instructions that map card fields to canvas elements.

## Intended Expansion Direction

- Cloud sync and multi-device continuity.
- Stronger deck validation and design rules.
- Better production outputs (print-ready/PDF).
- More AI-assisted authoring (names, effects, imagery).

## Rebuild Guidance (Intent Preserved)

If rebuilding in another language/stack, preserve these invariants:

- Template-driven rendering is the core differentiator.
- Separate data-template design from layout-template design:
  - card data fields are shared
  - print and digital layouts are target-specific experiences
- Project-level template assignment should remain explicit.
- Live preview during editing is mandatory.
- Import/export should remain first-class, not a secondary utility.
- Local-first should remain available even if cloud features are added.
