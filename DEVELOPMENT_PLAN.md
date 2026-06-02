# NetVerse Protocol Lab Development Plan

> Last updated: 2026-06-02

## Current Decision

Build one unified project with three main modules:

1. Protocol Lab: DNS and TCP.
2. Network Scenario: H1 visits `www.abc.com`.
3. Knowledge Atlas: TCP/IP five-layer knowledge graph and CRUD.

The visual direction is immersive, cinematic, and WebGL-first. The backend is a
protocol script engine plus persistence layer.

## Phase 0: Documentation and Project Base

- Write product, design, architecture, and development-plan docs.
- Scaffold `frontend/`, `backend/`, and `docs/sql/`.
- Keep Docker optional.

## Phase 1: Frontend Immersive Shell

- Create React + Vite + TypeScript project.
- Add Tailwind CSS.
- Add React Router.
- Add React Three Fiber and drei.
- Add GSAP.
- Create homepage with a 3D gateway scene and three entries.
- Add routes:
  - `/`
  - `/protocol-lab`
  - `/scenario`
  - `/knowledge`

## Phase 2: DNS Mock Vertical Slice

- Define `SimulationStep` TypeScript type.
- Create DNS mock steps.
- Build reusable playback controls.
- Build DNS input form.
- Animate DNS packet path and cache-state updates from mock data.
- Add inspector and timeline.

## Phase 3: Backend DNS Slice

- Create Spring Boot backend.
- Add MySQL connection settings.
- Add `dns_record`, `dns_cache`, and `simulation_log` tables.
- Implement `POST /api/dns/resolve`.
- Implement cache-hit/cache-miss behavior.
- Return `SimulationStep` compatible JSON.
- Connect the DNS page to the backend.

## Phase 4: TCP Lab

- Add TCP handshake and release mock steps.
- Add TCP input form and mode selector.
- Visualize packet flags and client/server states.
- Implement backend endpoints:
  - `POST /api/tcp/handshake`
  - `POST /api/tcp/release`

## Phase 5: Integrated Scenario

- Add web-visit scenario steps.
- Show H1, H2, DNS server, switch, router, and web server.
- Animate ARP, DNS, TCP, and HTTP-related paths.
- Show ARP table and switch MAC table snapshots.
- Implement `POST /api/scenarios/web-visit`.

## Phase 6: Knowledge Atlas

- Add knowledge CRUD UI.
- Add search and pagination.
- Add knowledge graph visualization.
- Implement:
  - `GET /api/knowledge/points`
  - `POST /api/knowledge/points`
  - `PUT /api/knowledge/points/{id}`
  - `DELETE /api/knowledge/points/{id}`
  - `GET /api/knowledge/graph`

## Phase 7: Polish and Submission

- Improve homepage camera transitions.
- Add screenshots to README.
- Add optional `docker-compose.yml` for MySQL.
- Write database scripts in `docs/sql/`.
- Prepare design report material.
- Verify local run commands.

## First Working Slice

The first slice must be:

```text
Homepage 3D entry
-> Protocol Lab
-> DNS input
-> mock SimulationStep playback
-> packet animation, cache table, inspector, timeline
```

This gives an early visible result and establishes the pattern for later backend
integration.
