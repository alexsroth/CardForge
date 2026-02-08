# CardForge Review Context

## Why This Review Exists
This review is being used to separate product intent from legacy implementation details, so the app can be rebuilt cleanly with better usability, stronger data portability, and clearer feature scope.

The goal is not to patch the old codebase feature-by-feature.  
The goal is to define what the product should do, why it should do it, and what should ship in V1 vs later.

## Primary Intent
Build a desktop-first card-game design tool that helps users:
1. Start quickly
2. Design templates visually
3. Author cards at scale (especially via CSV workflows)
4. Evolve templates safely without data loss
5. Export portable game packages for sharing/collaboration pipelines

## Platform Direction
- Target runtime: Electron desktop app
- V1: macOS
- V2: Windows expansion
- Architecture should support future collaborative/shared libraries

## Review Artifacts (Source of Truth)
- `.ai/current-features-state.md`: intent-focused summary of what the original app attempted
- `.ai/user-stories.md`: user outcome anchor for all product decisions
- `.ai/decisions.md`: detailed decision log with context/options/impact
- `.ai/PRD-restart.md`: initial restart PRD draft (to be replaced with a new PRD once feature review is complete)

## Decisions Already Locked
Highlights already decided in review:
1. Rename `Projects` to `Games`
2. Rich Games Home with sort/filter
3. Recycle-bin-first deletion model
4. Expanded game metadata + game-owned assets
5. Multi-library architecture path (owned now, shared/rental later)
6. Global templates with usage visibility across games
7. Card Data Template and Layout Template are separate but linked
8. Drag/drop + snap-to-grid direction for template layout UX
9. Template change model supports global update or fork/version
10. Mandatory remap flow when schema/template changes impact cards
11. Manual template assignment to games
12. Guardrails for unassigning in-use templates
13. CSV template download + mapped bulk import + error report
14. Autosave + named checkpoints
15. AI name generation is out of V1 scope
16. Print and digital layouts are separate experiences sharing the same card data template

See `.ai/decisions.md` for full rationale and impact details.

## Process Rules Going Forward
1. Every new decision must map to at least one user story.
2. If no story maps cleanly, add/refine a story before locking the decision.
3. Prioritize user impact over implementation convenience.
4. Keep review/planning docs in `.ai/` (separate from original product docs).

## Current Status
- Feature review is in progress.
- Early feature areas have been decided (games, templates, assignment, bulk import strategy, save model).
- Remaining feature areas still need decisions (renderer, persistence details, onboarding, etc.).

## What Happens Next
1. Finish decision review for all major feature areas.
2. Produce final V1 scope and explicit V2 backlog.
3. Define target data schemas and portability model.
4. Evaluate and select best technical stack for Electron V1/V2 needs.
5. Author a new PRD for restart development, replacing the interim restart draft.

## PRD Replacement Plan
The current `.ai/PRD-restart.md` is an interim synthesis.  
After the feature review and stack decision are complete, create a new PRD that includes:
1. Final product vision and UX principles
2. Final V1 feature contract
3. V2 expansion contract (including Windows)
4. Data model + schema contract
5. Technical architecture and delivery milestones
6. Validation/test plan tied to user stories
