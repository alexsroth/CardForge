# CardForge Architecture Blueprint (V1)

## 1. Architecture Goals
1. Support a ground-up Electron rebuild aligned to the V1 PRD.
2. Keep core behavior deterministic, portable, and schema-driven.
3. Separate concerns cleanly across desktop shell, domain logic, data contracts, and UI.
4. Preserve forward compatibility for Windows and collaboration features.

## 2. Core Technology Choices
1. Desktop shell: Electron
2. Build/runtime: Vite + electron-vite
3. UI: React + Tailwind + Radix UI
4. State/workflows: Zustand + XState
5. Data contracts: Zod + JSON Schema + Ajv
6. Operational persistence: SQLite (`better-sqlite3` + `kysely`)
7. CSV: PapaParse
8. File safety: `fs-extra` + `write-file-atomic` + `proper-lockfile`
9. Test stack: Vitest + Playwright

## 3. High-Level System Layers
1. Renderer layer (React UI)
   - Views, form flows, template editor, card editor, onboarding, import/export dialogs
2. Application layer (use-cases + state machines)
   - Orchestrates flows: remap, migration, import, export, checkpoints
3. Domain layer (pure logic)
   - Rules for templates/cards/games, validations, mapping, deterministic render rules
4. Infrastructure layer
   - SQLite repo, file storage, package import/export, migration engine, locking
5. Desktop boundary layer
   - Electron main/preload IPC contracts

## 4. Process Model (Electron)
1. Main process
   - Owns filesystem access, DB access, library locks, migrations, export/import pipelines.
2. Preload
   - Exposes typed, minimal API surface to renderer.
3. Renderer
   - No direct Node/FS/DB access.
   - Calls use-cases via preload API.

## 5. Proposed Monorepo Layout
```text
cardforge/
  apps/
    desktop/
      src/
        main/                 # Electron main process
          app-lifecycle/
          ipc/
          services/
            library-service/
            migration-service/
            export-service/
            import-service/
            checkpoint-service/
            asset-service/
          db/
            client/
            migrations/
            repositories/
          storage/
            atomic/
            locking/
            paths/
        preload/              # Typed bridge
          index.ts
          api/
        renderer/             # React app
          app/
          pages/
          features/
            games/
            templates/
            cards/
            import-export/
            onboarding/
            settings/
          components/
          state/
            stores/           # zustand
            machines/         # xstate
          lib/
            ipc-client/
            formatting/
  packages/
    domain/                  # Pure business logic (no Electron deps)
      src/
        games/
        templates/
        cards/
        rendering/
        migrations/
        import-export/
    contracts/               # Zod schemas + JSON Schema outputs
      src/
        schema/
          game.ts
          template.ts
          card.ts
          checkpoint.ts
          export-package.ts
        versions/
          v1/
    render-engine/           # Deterministic renderer primitives + adapters
      src/
        primitives/
        layout/
        validators/
        preview/
        export/
    ui-kit/                  # Shared presentational components/tokens
      src/
  tooling/
    scripts/
      build-schemas.ts
      validate-export.ts
```

## 6. Module Boundaries

### 6.1 `packages/contracts`
Responsibility:
1. Canonical Zod schemas for all persisted and portable entities.
2. Schema version constants.
3. JSON Schema generation artifacts for import/export validation.

No dependency on:
1. Electron
2. UI
3. DB runtime

### 6.2 `packages/domain`
Responsibility:
1. Business rules and invariants:
   - template assignment guardrails
   - remap requirements
   - conflict rules
   - checkpoint semantics
2. Pure transformation logic:
   - CSV row -> card mapping result
   - migration planning
   - import issue reports

### 6.3 `packages/render-engine`
Responsibility:
1. Deterministic primitive rendering contract.
2. Safe-mode validator for unsupported rules.
3. Shared render path for preview/export parity.

### 6.4 `apps/desktop/src/main`
Responsibility:
1. Own all side effects: DB/file IO, locks, migrations, import/export packaging.
2. Execute use-cases through services.
3. Expose IPC API to renderer.

### 6.5 `apps/desktop/src/renderer`
Responsibility:
1. UX flows and state.
2. Calls typed IPC client.
3. Never bypasses domain constraints.

## 7. Data Model Blueprint

## 7.1 Core Entities
1. Library
   - identity, path, metadata, lock state
2. Game
   - metadata, settings, assigned template IDs, asset index
3. Template
   - global template definition + version metadata + usage refs
4. Card
   - data payload + template reference + audit fields
5. Checkpoint
   - named snapshot references and metadata
6. ExportPackageManifest
   - schema version, included components, checksums, metadata

## 7.2 Persistence Split
1. SQLite stores:
   - operational indexes
   - search/sort metadata
   - usage edges (game<->template, card->template)
   - checkpoint catalog
2. Filesystem stores:
   - assets
   - exported package artifacts
   - optional snapshot payload blobs
3. Contracts enforce:
   - strict schema versioning
   - deterministic migration path

## 8. Export/Import Package Blueprint

## 8.1 Package Shape (conceptual)
```text
<game-export>.cardforge/
  manifest.json
  game.json
  templates/
    template-<id>.json
  cards/
    cards.json
  checkpoints/              # optional when exporting named state/history
    checkpoint-<id>.json
  assets/
    ...
```

## 8.2 Import Pipeline
1. Validate manifest + schema version.
2. Resolve version migration plan (required before load).
3. Validate component schemas (game/templates/cards/checkpoints).
4. Check ID conflicts (fail-fast).
5. Preview impact summary to user.
6. Execute import transaction + asset copy.
7. Emit structured import report (successes/issues).

## 9. Workflow State Machines (XState)
Use explicit machines for high-risk workflows:
1. Template unassignment resolution flow.
2. Bulk template switch/remap flow.
3. CSV import mapping + validation flow.
4. Export selection flow (current vs checkpoint).
5. Migration execution flow.

Each machine should define:
1. Entry guards
2. Retry/error branches
3. User-resolvable failure states

## 10. Rendering Architecture
1. Primitive registry (V1 fixed set).
2. Layout parser -> validated render tree.
3. Safe-mode validator rejects unsupported style/primitive usage.
4. Single render engine used by:
   - editor preview
   - export renderer

Result:
1. Preview/export parity by design, not by convention.

## 11. Reliability and Safety
1. Single-writer lock per library.
2. Atomic write wrappers for file mutations.
3. SQLite transactions for multi-step persistence changes.
4. Startup migration gate before app becomes writable.
5. Automatic crash recovery checks on next launch.

## 12. Testing Strategy

## 12.1 Domain/Contract Tests
1. Schema validation tests (Zod + Ajv)
2. Migration tests across schema versions
3. Remap logic property tests

## 12.2 Integration Tests
1. Import/export round-trip test (with assets)
2. Conflict fail-fast behavior test
3. Locking behavior test (single-writer enforcement)

## 12.3 E2E Tests
1. First-run onboarding path
2. CSV bulk workflow path
3. Template migration path
4. Preview/export parity snapshots

## 13. Build Phases
1. Foundation
   - repo scaffolding, contracts package, IPC skeleton, library path model
2. Core Data
   - SQLite schema, repositories, migrations, locking, checkpoints
3. Authoring
   - Games Home, templates, assignment rules, card editor
4. Import/Export
   - CSV mapping pipeline, package export/import pipeline
5. Rendering
   - deterministic primitive engine + parity validation
6. Onboarding + hardening
   - wizard, sample game, actionable errors, test coverage

## 14. V1 Architecture Exit Criteria
1. Contracts package versioned and enforced on all import/export boundaries.
2. All high-risk workflows implemented via state machines.
3. Preview/export parity validated in automated tests.
4. Full game package round-trip passes with assets/checkpoints.
5. Crash-safe write and lock behavior verified in integration tests.
