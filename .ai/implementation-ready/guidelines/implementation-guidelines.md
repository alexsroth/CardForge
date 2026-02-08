# Implementation Guidelines (V1)

## 1. Build Intent

Implement CardForge V1 as a greenfield Electron app.
Do not depend on legacy code behavior unless explicitly restated in the PRD.

## 2. Non-Negotiable Contracts

1. Schema-first persistence and portability.
2. Deterministic rendering with preview/export parity.
3. Guardrailed template assignment and migration flows.
4. Crash-safe write patterns and single-writer library lock.

## 3. Recommended Technical Baseline

1. Electron + Vite + React
2. Zustand + XState
3. Zod + Ajv
4. better-sqlite3 + Kysely
5. react-konva + konva for layout designer

## 4. Delivery Sequence

1. Contracts package and schema validation pipeline
2. Persistence, migrations, and locking
3. Games workspace + template assignment flow
4. Card authoring + CSV import/mapping
5. Layout designer MVP (grid/guides/draw/bind)
6. Render engine + preview/export parity
7. Export/import round-trip + preflight
8. Onboarding and usability hardening

## 5. Layout Designer Minimum Bar

1. Canvas size from print geometry profile
2. Grid + safe-zone/bleed overlays
3. Draw/resize/move rectangle containers
4. Assign element kind + map to data fields
5. Support pure design elements (no field binding)
6. Save blocked on critical validation failures

## 6. Data Safety Requirements

1. No silent overwrites on import ID conflicts
2. Autosave enabled by default
3. Named checkpoints and rollback supported
4. Explicit migration/remap steps before destructive template changes

## 7. Quality Gates

1. Contract tests for all persisted/exported structures
2. Workflow machine tests for high-risk flows
3. Integration tests for import/export round-trip
4. Print preflight tests for safe-zone and DPI violations
5. E2E happy-path from onboarding to export
