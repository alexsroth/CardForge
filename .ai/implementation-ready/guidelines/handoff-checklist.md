# Implementation Handoff Checklist

## Product and UX
- [ ] PRD reviewed and accepted by product + engineering.
- [ ] User flows (onboarding, CSV import, template migration, export) aligned.
- [ ] Basic/Advanced UX mode strategy agreed.

## Contracts and Data
- [ ] `schemas/v1` adopted as baseline contract set.
- [ ] Schema versioning + migration policy defined in code.
- [ ] Export package manifest integrated into import/export pipeline.

## Architecture
- [ ] Architecture blueprint reviewed and approved.
- [ ] Layout designer architecture accepted (react-konva stack).
- [ ] IPC boundaries and main/renderer responsibilities documented.

## Reliability and Validation
- [ ] Atomic writes implemented for file mutations.
- [ ] Single-writer lock implemented per library.
- [ ] Print preflight checks integrated and tested.
- [ ] Preview/export parity test strategy in CI.

## Implementation Readiness
- [ ] Milestone plan created from build phases.
- [ ] Owners assigned per subsystem.
- [ ] Definition of done includes contract and E2E coverage.
