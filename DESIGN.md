# NetVerse Protocol Lab Design System

> Last updated: 2026-06-02

## Direction

NetVerse is an immersive WebGL protocol journey. It should feel like moving
through a luminous network space rather than operating a traditional management
dashboard.

Mood:

- cinematic.
- focused.
- technical.
- spatial.
- high contrast.

The UI should avoid ordinary card-heavy admin pages. Controls remain practical,
but the visual center is the animated network scene, packet movement, state
changes, and timeline playback.

## Visual Principles

- Effects must explain protocol behavior.
- Animation should be controllable: play, pause, step, scrub, reset.
- Every glowing packet or highlighted path corresponds to a specific protocol
  step.
- Text panels must be readable over dark 3D scenes.
- Module pages should feel immersive but not chaotic.

## Layout System

### Homepage

- Full-viewport WebGL canvas.
- Scroll-driven camera movement.
- Three spatial entry portals.
- Minimal overlay copy.
- Entry click triggers camera focus and route transition.

### Experiment Pages

Recommended structure:

- Main 3D scene as the primary surface.
- Floating but restrained control rail.
- Right-side packet/state inspector.
- Bottom cinematic timeline.
- Optional log drawer.

Avoid nesting cards inside cards. Use glass panels only for functional overlays,
not decoration.

## Typography

Preferred font roles:

- Display: `Sora` or `Orbitron` for title accents.
- Body/UI: `Manrope` or `Plus Jakarta Sans`.
- Data/code: `JetBrains Mono`.

Use tabular numbers for sequence numbers, TTL, ports, IP addresses, and packet
fields.

## Color

Base:

- Background: `#05070d`
- Deep surface: `#0b1020`
- Elevated surface: `#111827`
- Border: `rgba(148, 163, 184, 0.22)`
- Text primary: `#f8fafc`
- Text secondary: `#a7b0c0`

Protocol accents:

- DNS cyan: `#22d3ee`
- TCP violet: `#8b5cf6`
- HTTP amber: `#f59e0b`
- ARP green: `#34d399`
- Error red: `#fb7185`

The app should not become a one-color blue/purple theme. Cyan, amber, green, and
violet should each represent distinct network concepts.

## Motion

Motion style:

- camera movement: cinematic, smooth, 700-1600 ms.
- packet movement: visible and traceable, 600-1200 ms.
- UI transitions: quick, 160-260 ms.
- step changes: synchronized between scene, inspector, tables, and timeline.

Tools:

- GSAP for timelines, route transitions, and ScrollTrigger.
- React Three Fiber for scene updates.
- Optional Theatre.js only after the core interactions work.

## 3D Scene Language

Nodes:

- client nodes: compact terminal-like capsules.
- servers: taller luminous blocks or towers.
- switch/router: geometric hubs with port lines.
- knowledge graph nodes: layered or orbital points.

Packets:

- DNS Query: cyan pulse.
- DNS Response: cyan pulse with brighter trailing line.
- SYN/ACK/FIN: violet packets with label flags.
- ARP: green broadcast ring.
- HTTP: amber request beam.

Camera:

- Homepage camera moves through the network space.
- Module camera focuses on current communication path.
- Entry transitions should push forward into the selected experiment, not fade
  like a normal web page.

## Interaction Rules

- Every experiment must support both automatic playback and manual step control.
- Hover or click on packets reveals packet fields.
- Clicking timeline steps should update the 3D scene, explanation, tables, and
  logs together.
- Inputs should remain simple and close to the experiment: domain, URL, sequence
  numbers, and action type.

## Quality Bar

- No overlapping UI text.
- No unreadable panels over 3D content.
- No blank WebGL scene.
- No route transition that traps the user.
- No animation that cannot be paused or reset on experiment pages.
