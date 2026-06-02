# NetVerse Protocol Lab Product Requirements

> Last updated: 2026-06-02

## Product Positioning

NetVerse Protocol Lab is an immersive computer-network training project for the
network practice course. It upgrades the required "computer network knowledge
interactive display system" into a 3D protocol laboratory with cinematic
transitions, scroll-driven scenes, and controllable protocol simulations.

The product must still satisfy the course requirements: protocol visualization,
integrated network scenario simulation, and TCP/IP knowledge-system interaction.
Visual effects are valuable only when they make packet paths, protocol states,
tables, and knowledge relationships easier to understand.

## Target Users

- Students learning computer network principles after the course.
- Teachers evaluating whether the project explains protocol processes clearly.
- Presenters recording the final demonstration video.

## Scope

### Module 1: Protocol Lab

Selected topics:

- DNS domain-name resolution.
- TCP three-way handshake and four-way connection release.

Each experiment must support user input and controlled playback.

DNS input examples:

- `www.abc.com`
- `www.baidu.com`
- a custom domain that falls back to a simulated result.

TCP input examples:

- client initial sequence number.
- server initial sequence number.
- connection action: establish or release.

Expected behaviors:

- Start, pause, next step, previous step, reset, and speed control.
- Animated packet movement across a topology.
- Current step explanation.
- Packet field inspector.
- DNS cache table or TCP state table updates.
- Execution log.

### Module 2: Network Scenario

Simulate H1 visiting `www.abc.com` from `t0` until switch S first receives an
Ethernet frame encapsulating the HTTP request at `t1`.

The simulation should show:

- H1, H2, local DNS server, switch S, router R, and Web server.
- ARP, DNS, TCP, and HTTP-related steps.
- source/destination MAC address.
- source/destination IP address.
- broadcast/unicast type.
- highlighted topology path.
- H1 ARP table updates.
- switch MAC table updates.
- final state and conclusion.

### Module 3: Knowledge Atlas

Build an interactive TCP/IP five-layer knowledge atlas.

Required tabs or areas:

- Application layer.
- Transport layer.
- Network layer.
- Data link layer.
- Physical layer.
- Knowledge graph.

Knowledge points must be persisted in a database and support:

- create.
- update.
- delete.
- fuzzy search.
- pagination.
- detail view.

The knowledge graph should show hierarchy and relationships between layers,
protocols, devices, data units, and key concepts. Clicking a node should show
details.

## Homepage Experience

The homepage is not a normal dashboard. It is an immersive 3D gateway with three
entry points:

1. Protocol Lab.
2. Network Scenario.
3. Knowledge Atlas.

The page should support scroll-driven 3D camera motion and mouse-responsive
depth. Clicking an entry should trigger a cinematic camera transition into the
selected module.

## Priorities

### P0

- Durable documentation and project structure.
- React front-end shell with routes.
- Immersive 3D homepage with three entries.
- DNS experiment driven by mock `SimulationStep` data.
- Shared step playback controls.

### P1

- Spring Boot backend.
- MySQL schema and seed data.
- DNS resolve API with cache-hit/cache-miss logic.
- TCP handshake/release API.
- Front-end integration for DNS and TCP.

### P2

- Integrated network scenario API and visualization.
- Knowledge CRUD and knowledge graph.
- Simulation logs.
- README, screenshots, design report material, and optional Docker Compose.

### P3

- Theatre.js or more advanced GSAP camera choreography.
- Additional packet structure parser interactions.
- More domain records and failure scenarios.

## Non-Goals

- Do not build a real DNS server.
- Do not rely on real external DNS/network requests for core grading behavior.
- Do not make the app require Docker to run.
- Do not build a generic admin system as the primary experience.
- Do not let decorative effects obscure protocol correctness.

## Success Criteria

- The project runs locally from documented commands.
- The homepage feels immersive and has clear entry transitions.
- Each required module accepts input and can demonstrate a protocol or knowledge
  workflow.
- DNS and TCP visualizations explain both packet movement and state changes.
- Database-backed knowledge points persist after refresh.
- README includes project intro, stack, environment, installation, run commands,
  major functions, and screenshots.
