# CardForge AI Workspace

## Executive Summary

CardForge has been redesigned as a ground-up rebuild, using the legacy app only
for product direction and not as a code dependency.

The redesign effort produced:

1. A primary V1 PRD focused on usability, deterministic behavior, and
   portability.
2. Appendix-level architecture artifacts for system design and the card layout
   designer.
3. Versioned JSON schema contracts for games, templates, decks, exports, and
   print/digital-ready metadata.
4. Implementation guidelines and a handoff checklist for engineering kickoff.

Current V1 direction:

1. Electron desktop app for macOS first, Windows expansion in V2.
2. Print-first workflow with digital-ready contracts.
3. Container-first layout designer with grid + print safety overlays.
4. Safe template assignment/migration flows, CSV-first bulk workflows, autosave,
   and named checkpoints.

Document split:

This workspace is split into two tracks:

1. `implementation-ready/`

- Export-ready artifacts and build guidelines for the implementation team.

1. `planning/`

- Product review, discovery, decision history, and exploratory research.

Use `implementation-ready/` as the source for execution.
Use `planning/` for rationale and historical context.
