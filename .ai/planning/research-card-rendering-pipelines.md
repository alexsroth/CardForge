# Research: Card Rendering Pipelines (Digital + Print)

## Scope
Identify proven pipeline patterns and best practices relevant to CardForge’s future roadmap, especially for:
1. Print-ready output workflows
2. Digital tabletop / digital game rendering handoff workflows

## Common Pipeline Pattern Across Tools
Most mature card pipelines follow the same shape:
1. Data source (CSV/JSON/database)
2. Template/layout definition
3. Renderer/compositor
4. Target export (print PDFs/images, digital sheets/assets)

This appears consistently in:
1. InDesign Data Merge workflows
2. nanDECK spreadsheet-driven deck generation
3. Tabletop Simulator deck-sheet workflows

## Evidence and Observations

### A) Data-driven merge is standard in print tooling
1. Adobe InDesign Data Merge is explicitly designed around source data + target document + merged output.
   - Source: https://helpx.adobe.com/indesign/using/data-merge.html

Implication:
1. CardForge should continue treating content data and layout definitions as separate concerns.

### B) Spreadsheet-first card generation is widely adopted
1. nanDECK supports spreadsheet inputs (Excel/ODS/Google Sheets), real-time rendering, and print/PDF/image outputs.
   - Source: https://nandeck.com/features

Implication:
1. CSV template export/import with mapping is a high-value core feature, not a niche feature.

### C) Digital tabletop pipelines rely on prepared card sheets
1. Tabletop Simulator custom decks are built from card sheets and have practical resolution guidance.
   - Source: https://kb.tabletopsimulator.com/custom-content/custom-deck/
   - Source: https://kb.tabletopsimulator.com/custom-content/asset-creation/

2. Community tooling exists to generate TTS-ready decks from card image sets/data.
   - Source: https://github.com/jeandeaual/tts-deckconverter

Implication:
1. Future CardForge digital exports should include “target adapters” (e.g., TTS deck sheet export profile).

### D) Print production constraints are strict and predictable
1. Print shops emphasize bleed/safe zones and drift tolerance (often ~1/8").
   - Source: https://help.thegamecrafter.com/article/391-bleed
   - Source: https://help.thegamecrafter.com/article/39-templates
   - Source: https://www.makeplayingcards.com/faq-photo.aspx/faq-photo.aspx
   - Source: https://www.makeplayingcards.com/pops/faq-photo.html

Implication:
1. Canvas design must explicitly model card size, bleed, safe zone, and print DPI assumptions.

### E) Digital game engines separate data containers from runtime views
1. Unity ScriptableObject is used as reusable data container patterns.
   - Source: https://docs.unity3d.com/ru/2020.2/Manual/class-ScriptableObject.html

2. Godot docs position Resource/JSON as serializable data containers.
   - Source: https://docs.godotengine.org/en/3.5/classes/class_resource.html
   - Source: https://docs.godotengine.org/en/4.2/classes/class_json.html

Implication:
1. CardForge should preserve engine-agnostic exports where card data and layout metadata can be consumed by Unity/Godot pipelines.

## Recommended Best Practices for CardForge

## 1) Keep “Data” and “Layout” as Separate Contracts
1. Card data payload should never be coupled to pixel coordinates directly.
2. Layout template/version should map fields to containers.

Why:
1. Enables one dataset to render to multiple targets (print, digital tabletop, game engine UI).

## 2) Introduce Render Profiles Early
Define explicit profiles like:
1. `print-300dpi`
2. `tts-sheet`
3. `digital-16:9-card-ui` (future)

Why:
1. Prevents overloading one layout contract with conflicting output assumptions.

## 3) Treat Print Geometry as First-Class Metadata
For each size profile:
1. finished size (mm/in)
2. bleed margin
3. safe margin
4. corner radius (if relevant)
5. dpi target

Why:
1. Prevents common print drift/cropping failures.

## 4) Use Preflight Validation Before Export
Validate:
1. missing asset references
2. text outside safe zone (for print profile)
3. unsupported primitives for target profile
4. insufficient source resolution for target DPI

Why:
1. Catch failures before generating unusable outputs.

## 5) Keep Source-of-Truth as Structured Data
1. Store canonical game/template/card contracts.
2. Treat generated images/sheets/PDFs as derived artifacts.

Why:
1. Better migration, better collaboration, easier deterministic rebuild.

## 6) Add Target-Specific Export Adapters (V2+)
1. Print adapter (PDF/sheet packs with trim assumptions)
2. TTS adapter (deck sheets + metadata)
3. Engine adapters (Unity/Godot-friendly package conventions)

Why:
1. Maintains one authoring model while supporting many runtime destinations.

## 7) Version Layouts and Exports Explicitly
1. schema version
2. layout version
3. export adapter version

Why:
1. Deterministic compatibility and reproducible handoff.

## Suggested Near-Term Additions (Planning)
1. Add a `renderProfile` field to layout/export contracts.
2. Add print preflight checks to V1 backlog if schedule allows.
3. Reserve schema slots for target adapters in export manifest.
