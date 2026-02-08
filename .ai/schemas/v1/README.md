# CardForge V1 JSON Schemas

## Files
1. `card-template-layout.schema.json`
   - Contract for deterministic V1 template layout definitions.
   - Supports V1 primitives:
     - `text`
     - `imageSlot`
     - `icon`
     - `statValue`
     - `shapeContainer`

2. `card-deck.schema.json`
   - Contract for deck payloads with explicit `templateId` linkage per card.
   - Includes template references and optional deck metadata.

## Notes
1. Both schemas currently use `schemaVersion: "1.0.0"` via `const`.
2. These are initial contract drafts for rebuild planning and should be validated against import/export flows before implementation freeze.
3. When schema evolution begins, increment version and add migration tests before changing compatibility behavior.
