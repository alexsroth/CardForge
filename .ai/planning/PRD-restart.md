# CardForge Product Requirements Document (Restart)

## 1. Document Info

- Product: CardForge
- Date: 2026-02-08
- Status: Draft for restart planning
- Repo analyzed: `/Users/alsaro/CardForge`

## 2. Executive Summary

CardForge is a local-first web app for creating tabletop card-game prototypes. The core loop exists: create templates, create projects, add/edit cards, and preview cards live. The codebase is functional in parts but has drift from product docs, duplicate implementation paths, and broken engineering baseline checks (typecheck/lint/build reliability), which currently make velocity risky.

This PRD defines a restart plan that preserves validated concepts while resetting architecture quality, developer ergonomics, and data integrity.

## 3. Current State Audit

### 3.1 Working Today

- Project dashboard with create/edit/delete and project cards.
- Template library with preview and project-template association controls.
- Template designer with field schema + visual layout + JSON layout definition.
- Live card editor with list/detail/preview split panels.
- Local import/export (JSON/CSV).
- Local persistence via `localStorage`.
- AI card-name generation action wired through Genkit flow.

### 3.2 Gaps / Drift

- Documentation is outdated vs implementation (`README.md` references missing `docs/architecture.md`, wrong dev port, and deprecated deck-grid messaging).
- Multiple overlapping template-designer code paths exist (legacy, active, and partially extracted variants).
- No automated tests.
- Lint setup is incomplete (interactive ESLint init prompt).
- Build reliability depends on external font fetches.

## 4. Product Vision (Restart)

Enable solo designers and small teams to go from card idea to playtest-ready deck in under 30 minutes, with deterministic local data, stable template rendering, and frictionless iteration.

## 5. Target Users

- Primary: Indie tabletop game designer prototyping mechanics quickly.
- Secondary: Hobbyists using CSV/JSON workflows.
- Tertiary: Small teams iterating card balance/content before art lock.

## 6. Product Goals

1. Re-establish a stable MVP baseline (build, lint, typecheck, basic tests).
2. Preserve and simplify the existing high-value workflow (Template -> Project -> Cards -> Export).
3. Prevent data corruption and dangling references.
4. Prepare architecture for optional cloud sync later without blocking local-first usage.

## 7. Out of Scope (for Restart MVP)

- Multiplayer collaboration.
- Full art-generation pipeline.
- Print-ready PDF engine.
- Marketplace/sharing platform.

## 8. Functional Requirements

### 8.1 Template System

- Users can create/edit/delete templates with typed fields.
- Users can visually place field render elements and/or edit JSON layout directly.
- Template IDs are stable and unique.
- Deleting templates must enforce referential integrity (block or migrate affected cards/projects).

### 8.2 Project Management

- Users can create projects and assign one or more templates.
- Users can update metadata (name, thumbnail hints).
- Users can delete projects with confirmation.

### 8.3 Card Editor

- Users can add/remove cards and edit fields based on selected template.
- Template selection behavior for a card must be explicit and reversible policy-driven (lock or allow change with migration rules).
- Live preview must always reflect selected card + template state.

### 8.4 Import/Export

- JSON import/export must be lossless for supported schema.
- CSV import/export must correctly handle quoted commas/newlines and schema mapping.
- Import must validate and report row-level errors.

### 8.5 AI Assist

- Card name generation from description is optional enhancement.
- If AI is unavailable, app remains fully usable.

### 8.6 Persistence

- Local-first persistence remains default.
- Versioned storage schema with migrations is required.

## 9. Non-Functional Requirements

- Type safety: `npm run typecheck` must pass.
- Linting: non-interactive lint command in CI.
- Build: production build succeeds in CI with deterministic setup.
- Performance: editor interactions feel real-time on decks up to 500 cards.
- Reliability: no silent data mutation on import/template changes.
- UX: clear error messages for invalid template/layout/data states.

## 10. Success Metrics

- Time to first playable deck: < 30 min (new user).
- Runtime/editor crashes: 0 known reproducible crashes in smoke suite.
- Data import success: > 95% valid-row import completion with explicit errors for invalid rows.
- Engineering baseline: CI green on PRs (typecheck + lint + tests + build).

## 11. Milestones

### Milestone 0: Stabilize Foundation (1-2 weeks)

- Remove/archive duplicate/dead implementations.
- Fix compile blockers and lint configuration.
- Add CI using one package manager and lockfile policy.
- Update README + architecture docs.

### Milestone 1: Core Workflow Hardening (2-3 weeks)

- Enforce template-project-card referential integrity.
- Replace naive CSV parser with robust implementation.
- Add storage schema versioning and migration path.
- Add smoke tests for primary flow.

### Milestone 2: UX and Export Quality (1-2 weeks)

- Improve import error reporting UX.
- Polish template deletion/disassociation flows.
- Finalize deck overview route (restore or remove from UX/docs consistently).

### Milestone 3: Optional Enhancements (post-MVP)

- Cloud sync spike (Supabase/Firebase).
- Advanced validation rules (deck constraints).
- Print-ready export exploration.

## 12. Immediate Technical Backlog (from repository review)

1. Fix syntax error blocking typecheck in `src/components/template-designer/original-TemplateDesigner.tsx`.
2. Decide canonical template designer path and remove/ignore duplicates:
   - `src/components/template-designer/TemplateDesigner.tsx`
   - `src/components/template-designer/TemplateDesigner/` (and nested hook with TODO save stub)
   - `src/components/template-designer/original-TemplateDesigner.tsx`
3. Finalize ESLint setup so `npm run lint` is non-interactive.
4. Resolve package-management inconsistency (repo uses npm lockfile; CI uses pnpm).
5. Replace CSV import/export logic in `src/components/editor/data-controls.tsx` with robust parsing/stringifying.
6. Add integrity checks when toggling/removing template associations to protect existing cards.
7. Update docs to reflect reality:
   - dev URL/port (`9002`),
   - deck-view deprecation,
   - missing architecture doc reference.

## 13. Risks and Mitigations

- Risk: Hidden regressions due duplicated code paths.
  - Mitigation: single-source module ownership + deletion of legacy paths.
- Risk: LocalStorage schema drift corrupts old user data.
  - Mitigation: schema version + migration tests.
- Risk: AI dependency instability.
  - Mitigation: strict fallback behavior and feature flagging.

## 14. Open Decisions

1. Should card template assignment be immutable per card after creation?
2. Should template deletion be blocked if any card references it, or provide migration wizard?
3. Preferred long-term package manager (`npm` vs `pnpm`)?
4. Keep local-only architecture for v1 restart, or include auth/cloud in v1.1?

## 15. Recommended Restart Order

1. Engineering baseline (compile/lint/CI/docs).
2. Data integrity and import/export correctness.
3. UX consistency and route cleanup.
4. Optional platform enhancements.
