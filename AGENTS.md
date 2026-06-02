# Agent Guide

## Project Truth

This repository is for a computer-network practice project named NetVerse
Protocol Lab. It must be one unified project with three modules:

1. Protocol Lab: DNS and TCP.
2. Network Scenario: H1 visits `www.abc.com`.
3. Knowledge Atlas: TCP/IP five-layer knowledge graph and CRUD.

Read these files before changing product or UI behavior:

- `PRODUCT_REQUIREMENTS.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT_PLAN.md`

## Implementation Priorities

- Protocol accuracy before decorative animation.
- Immersive WebGL presentation before generic admin UI.
- DNS first, then TCP, then integrated scenario, then knowledge atlas.
- Backend returns protocol simulation steps; frontend plays them cinematically.

## Expected Structure

```text
frontend/       React + Vite + TypeScript + Tailwind + R3F
backend/        Spring Boot API
docs/sql/       database scripts
```

## Quality Bar

- Do not ship blank or broken WebGL scenes.
- Experiment pages must have controllable playback.
- UI text must remain readable and not overlap.
- Effects must map to protocol steps, packet paths, or state changes.
- Docker must remain optional, not required.

## Definition of Done

- Relevant route or API works locally.
- The change matches `DESIGN.md`.
- Data shape matches `ARCHITECTURE.md` unless the docs are updated.
- Run/build command has been verified when practical.
