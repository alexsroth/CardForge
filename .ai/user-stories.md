# CardForge User Stories (Decision Anchor)

## Purpose
These user stories define the outcomes CardForge should prioritize.
Use these IDs in `.ai/decisions.md` under `User story reference(s)` for all new decisions.

## Primary Stories

### US-01: Start Fast
As a game designer, I want to create a new game and begin adding card content quickly, so I can test ideas without setup friction.

### US-02: Reuse Structure
As a game designer, I want reusable global templates, so I can keep card systems consistent across games and reduce duplicate setup.

### US-03: Design Visually With Control
As a game designer, I want drag-and-drop layout editing with guard rails and advanced JSON access, so I can work quickly and still make precise edits.

### US-04: Bulk Authoring From Spreadsheets
As a content-heavy designer, I want to bulk import cards from CSV with mapping and error reporting, so I can iterate large sets efficiently.

### US-05: Safe Changes at Scale
As a game designer, I want impact warnings and guided migrations when changing templates or assignments, so I avoid breaking existing cards.

### US-06: Never Lose Work
As a game designer, I want autosave and named checkpoints, so I can experiment safely and roll back when needed.

### US-07: Keep Game Context Together
As a game designer, I want game metadata, notes, rules, and assets stored with the game, so everything needed for playtesting and handoff is in one place.

### US-08: Organize Growing Libraries
As a multi-project designer, I want sort/filter and multiple libraries, so I can manage many games without navigation overhead.

### US-09: Export Portable Game Packages
As a collaborator, I want exported games to include their template schemas, so others can open/edit the game reliably in another workspace.

### US-10: Collaborate Later Without Rework
As a future team user, I want data models that can support shared/rental libraries, so collaboration can be added without breaking existing data.

## Secondary Stories

### US-11: Preview Confidence
As a designer, I want reliable card previews that reflect template + card data clearly, so I can trust what I’m testing.

### US-12: Recover From Mistakes
As a designer, I want recycle-bin style recovery instead of immediate destructive deletes, so accidental actions are reversible.

### US-13: Optional BYO AI Assistance
As a cost-conscious designer, I want optional bring-your-own AI integrations for assistive workflows, so I can use AI help without platform lock-in or mandatory usage costs.

### US-14: Print-Accurate Template Design
As a designer preparing physical prototypes, I want template canvas sizing to match real print card dimensions, so layout decisions hold up when exported or printed.

### US-15: One Authoring Flow for Print and Digital
As a designer, I want to author once without choosing a separate print vs digital mode, so I can reuse the same card data/template work across multiple output targets.

## How To Use in Decisions
- Add a line like:
  - `User story reference(s): US-04, US-05`
- If a decision does not map to at least one story, revisit whether it should be made.
- If no existing story maps cleanly, add a new story (or refine an existing one) before finalizing the decision.

## Story Governance (Research-Driven)
1. Every product decision must map to one or more story IDs.
2. No clean story match means story gap, not decision bypass.
3. Add stories incrementally as new workflows, pain points, or personas emerge from research.
4. Prefer small, specific stories over broad catch-all stories.
5. Keep story text user-outcome focused (what the user achieves and why).

## New Story Template
Use this structure when adding a new story:

`US-XX: <Short title>`

`As a <persona>, I want <goal>, so I can <outcome>.`

Optional metadata:
- Trigger/context:
- Pain today:
- Success signal:
