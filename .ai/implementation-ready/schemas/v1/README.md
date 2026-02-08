# CardForge V1 JSON Schemas

## Design Model
CardForge V1 uses a two-layer model:
1. **Card Data Template** (what data a card holds)
2. **Layout Templates** (how that data is visually presented per target)

This keeps print and digital layout experiences separate while reusing the same structured card data.

## Structure
1. `core/`
   - `game.schema.json`
   - `card-data-template.schema.json`
   - `layout-template-core.schema.json`
   - `export-package-manifest.schema.json`

2. `modules/`
   - `print.geometry.schema.json`
   - `digital.runtime.schema.json`
   - `layout.print.schema.json`
   - `layout.digital.schema.json`
   - `layout.components.schema.json`

3. `manifests/`
   - `capability-registry.json`

4. `examples/`
   - `game.example.json`
   - `export-package-manifest.example.json`

5. top-level
   - `card-deck.schema.json`
   - `card-template-layout.schema.json` (deprecated compatibility alias)

## Key Contracts

## Schema Relationship Diagram
```text
game.schema.json
  ├─ settings.assignedDataTemplateIds ────────┐
  ├─ settings.assignedLayoutTemplateIds ──────┼──> card-data-template.schema.json
  ├─ deckRefs --------------------------------┘
  └─ assetIndex
                   ┌─────────────────────────────────────────────────────┐
card-deck.schema.json                                              layout-template-core.schema.json
  ├─ dataTemplates[*].dataTemplateId ------------------------------------> dataTemplateId
  ├─ layoutTemplates[*].layoutTemplateId --------------------------------> target + dataTemplateId
  └─ cards[*].dataTemplateId --------------------------------------------> card-data-template fields

layout.print.schema.json  = layout-template-core + print.geometry.schema.json
layout.digital.schema.json = layout-template-core + digital.runtime.schema.json

export-package-manifest.schema.json
  ├─ game (required)
  ├─ includes.cardDataTemplates/layoutTemplates/decks/assets/checkpoints
  └─ files[*] (path + kind + checksum) for portable import validation
```

### 1) Card Data Template
`core/card-data-template.schema.json`

Defines hard game-design data only:
1. field identity (`fieldId`, `key`, `label`)
2. field types (`singleLineText`, `areaText`, `number`, `category`, `image`, `icon`)
3. category options with stable IDs (for CSV-safe references)
4. optional image dimension guidance and icon/category mapping metadata

### 2) Layout Template Core
`core/layout-template-core.schema.json`

Defines shared layout container model and field mapping:
1. references `dataTemplateId`
2. container-first element set
3. target declared as `print` or `digital`
4. includes reusable component instance support
5. includes basic decoration elements (borders/boxes/etc.)

### 3) Print Layout Module
`modules/layout.print.schema.json` + `modules/print.geometry.schema.json`

Adds print-specific constraints:
1. physical unit (`mm`/`in`)
2. dimensions and DPI
3. bleed/safe-zone/trim geometry
4. print output settings and preflight-compatible fields

### 4) Digital Layout Module
`modules/layout.digital.schema.json` + `modules/digital.runtime.schema.json`

Adds digital-specific metadata:
1. logical resolution
2. render profile
3. optional interaction/state binding hints (V2+ target use)

### 5) Layout Components Library
`modules/layout.components.schema.json`

Defines reusable layout building blocks for rapid composition and variant workflows.

### 6) Game
`core/game.schema.json`

Defines game-level organization and intent:
1. library/game identity
2. game settings (manual data/layout template assignment)
3. game metadata (rules, playtest notes/templates, reference assets)
4. game-owned asset index and deck references
5. active/archive lifecycle status

### 7) Export Package Manifest
`core/export-package-manifest.schema.json`

Defines portable package metadata:
1. export scope (`current` or named `checkpoint`)
2. included entities (game, data templates, layout templates, decks, assets, checkpoints)
3. file manifest with checksum for integrity checks
4. preflight summary and import hints for deterministic round-trip behavior

## Deck Contract
`card-deck.schema.json`

Stores:
1. `dataTemplates` references
2. optional `layoutTemplates` references
3. cards linked to `dataTemplateId`
4. optional preferred layout reference per card

## Compatibility
`card-template-layout.schema.json` remains as a deprecated alias for legacy references.  
New implementations should use:
1. `card-data-template`
2. `layout.print` and/or `layout.digital`

## Versioning
All current schemas use `schemaVersion: "1.0.0"`.  
When contracts evolve:
1. increment schema version
2. add migration coverage
3. update compatibility behavior explicitly
