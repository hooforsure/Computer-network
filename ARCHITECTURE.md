# NetVerse Protocol Lab Architecture

> Last updated: 2026-06-02

## Repository Layout

```text
.
├── frontend/                 React immersive UI
├── backend/                  Spring Boot API
├── docs/
│   └── sql/                  schema and seed data
├── PRODUCT_REQUIREMENTS.md
├── DESIGN.md
├── ARCHITECTURE.md
└── DEVELOPMENT_PLAN.md
```

## Technology Stack

### Frontend

- React + Vite + TypeScript.
- Tailwind CSS.
- React Three Fiber.
- `@react-three/drei`.
- GSAP + ScrollTrigger.
- Zustand for simulation playback state.
- React Router for modules.
- Axios or TanStack Query for API calls.

### Backend

- Spring Boot.
- MyBatis Plus or standard MyBatis.
- MySQL.
- Maven.

### Database Runtime

MySQL is the primary database. Docker Compose can be provided as an optional
developer convenience, but the project must also run with a normal local MySQL
installation because the grading environment may not have Docker.

## Core Backend Idea

The backend is a protocol script engine, not a real DNS/TCP server.

It receives experiment inputs, reads persistent tables when useful, generates a
structured list of simulation steps, writes logs/cache/table changes, and returns
JSON that the frontend plays as a cinematic animation.

## Simulation Step Contract

The frontend animation is driven by `SimulationStep`.

```json
{
  "id": "dns-03",
  "title": "Query root DNS server",
  "protocol": "DNS",
  "packetType": "DNS_QUERY",
  "fromNode": "localDns",
  "toNode": "rootDns",
  "path": ["localDns", "router", "rootDns"],
  "broadcast": false,
  "cameraFocus": "rootDns",
  "highlightNodes": ["localDns", "rootDns"],
  "highlightLinks": [["localDns", "router"], ["router", "rootDns"]],
  "packetFields": {
    "query": "www.abc.com",
    "type": "A",
    "ttl": null
  },
  "stateUpdates": {
    "dnsCache": [],
    "clientState": null,
    "serverState": null,
    "arpTable": [],
    "switchTable": []
  },
  "explanation": "The local DNS server starts recursive resolution because the cache missed."
}
```

## Main API Plan

```http
POST   /api/dns/resolve
GET    /api/dns/cache
DELETE /api/dns/cache

POST   /api/tcp/handshake
POST   /api/tcp/release

POST   /api/scenarios/web-visit

GET    /api/knowledge/points
POST   /api/knowledge/points
PUT    /api/knowledge/points/{id}
DELETE /api/knowledge/points/{id}
GET    /api/knowledge/graph

GET    /api/logs
```

## Database Tables

### `knowledge_point`

- `id`
- `layer`
- `title`
- `category`
- `summary`
- `detail`
- `created_at`
- `updated_at`

### `knowledge_relation`

- `id`
- `source_id`
- `target_id`
- `relation_type`

### `dns_record`

- `id`
- `domain`
- `record_type`
- `value`
- `ttl`
- `description`

### `dns_cache`

- `id`
- `domain`
- `ip`
- `ttl`
- `cached_at`
- `expire_at`

### `protocol_step_template`

- `id`
- `protocol`
- `scene`
- `step_order`
- `title`
- `from_node`
- `to_node`
- `packet_type`
- `description`

### `simulation_log`

- `id`
- `module`
- `action`
- `input_text`
- `result_text`
- `created_at`

## Frontend State Model

Shared simulation playback state:

- current experiment.
- step list.
- current step index.
- playing/paused.
- playback speed.
- selected packet.
- table snapshots.

This state should be reusable by DNS, TCP, and integrated scenario pages.

## Implementation Strategy

1. Build the frontend shell and mock-driven simulation playback first.
2. Make DNS the first vertical slice.
3. Add backend DNS cache logic and connect it to the frontend.
4. Reuse the same `SimulationStep` rendering model for TCP and the integrated
   scenario.
5. Add database-backed knowledge CRUD and graph last.
