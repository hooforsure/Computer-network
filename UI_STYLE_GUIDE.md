# NetVerse UI Style Guide

> Last updated: 2026-06-04
> Purpose: internal design and component reference for the next frontend polish phase.

## Core Direction

NetVerse should feel like a cinematic network experiment cockpit, not a normal
admin dashboard. The 3D scene is the spatial background and learning stage;
UI components are HUD overlays used to control, inspect, and explain the scene.

Keywords:

- immersive
- readable
- technical
- layered
- controllable
- cinematic

Do not make pages feel like independent templates. DNS/TCP, Scenario, and
Knowledge Atlas must look like three rooms in the same product.

## Refactor Order

1. Define shared visual tokens.
2. Extract shared components.
3. Apply shared components to existing pages without changing behavior.
4. Rework page layouts using the shared components.
5. Add GSAP page and state transition motion.
6. Only then add more decorative effects.

This order prevents layout changes from forcing repeated style rewrites.

## Page Layout Contract

Experiment pages should follow this hierarchy:

1. Hero title area.
2. Timeline rail.
3. Playback controls directly below or attached to the timeline.
4. Main scene row:
   - 3D scene occupies the background and visual center.
   - right detail dock is pinned near the viewport right edge.
   - the scene focal axis sits center-left, leaving space for the dock.
5. Secondary work area:
   - inputs
   - cache tables
   - ARP/MAC tables
   - device state panels
   - CRUD forms

Avoid placing the main scene inside a visibly framed card. Panels may float over
the scene, but the scene should remain open and full-bleed.

## Shared Components To Build

### `HudPanel`

Base glass panel for timeline, inspectors, device popovers, cache panels, and
knowledge details.

Rules:

- dark translucent surface
- thin low-contrast border
- subtle blur
- no nested card look unless it is a table or repeated data row
- radius: 20-28px depending on size

### `DetailDock`

Right-side inspector panel.

Rules:

- viewport-right aligned on desktop
- fixed width around 400-440px
- scrollable internally if content is long
- never centered inside a max-width page container
- used by Protocol Lab, Scenario, and Knowledge Atlas

### `TimelineRail`

Step navigation.

Rules:

- appears below title area
- can wrap when steps are many
- active step glows
- locked steps are visibly disabled
- clicking a step updates scene, inspector, tables, and logs together

### `ControlBar`

Playback controls.

Rules:

- placed directly below timeline or visually attached to it
- includes previous, play/pause, next, reset, current step, speed
- should not cover the 3D focal scene

### `ModeSwitch`

DNS/TCP or Flow/Device segmented control.

Rules:

- compact segmented button
- active option uses strong accent fill
- inactive option remains quiet

### `DataTablePanel`

Cache, ARP, MAC, and future database tables.

Rules:

- table header is clear
- empty state is explicit
- row actions use icon buttons where possible
- important changes can glow briefly

### `MetricPill`

Small metrics such as steps, ARP/MAC, endpoint, cache rows.

Rules:

- compact
- data-like typography
- no big card treatment

## Visual Tokens

Colors:

- app background: `#05070d`
- deep panel: `rgba(8, 13, 28, 0.72)`
- elevated panel: `rgba(15, 23, 42, 0.72)`
- border: `rgba(148, 163, 184, 0.22)`
- text primary: `#f8fafc`
- text secondary: `#a7b0c0`
- muted text: `#64748b`

Protocol accents:

- DNS: `#22d3ee`
- TCP: `#8b5cf6`
- ARP: `#34d399`
- HTTP: `#f59e0b`
- Error: `#fb7185`
- Physical/neutral: `#94a3b8`

Rules:

- Do not let the whole UI become only cyan or only violet.
- Use accents semantically.
- Background can be dark, but panels must remain readable.

## Typography

Roles:

- display title: large, bold, high contrast
- UI label: small uppercase tracking
- body: readable Chinese text, 14-16px
- data: monospace for IP, MAC, ports, TTL, flags, sequence numbers

Rules:

- Chinese course content should primarily be Chinese.
- Keep protocol abbreviations in English: DNS, TCP, ARP, HTTP, MAC, IP.
- Avoid tiny text in dense panels unless it is metadata.

## Motion Rules

GSAP should control page-level and sequence-level motion:

- page entry reveal
- module mode switch
- timeline step transition
- detail dock update
- table row update
- completion notice

React Bits may be used as a source for component-level effects:

- animated text
- glow buttons
- spotlight cards
- reveal blocks
- shimmer borders

Rules:

- Use React Bits as a component/effect reference, not as the whole design system.
- Effects must support learning, not distract from protocol steps.
- Experiment animations must remain controllable: play, pause, next, previous, reset.

## 3D Scene Rules

The 3D scene is a full-bleed background layer.

Rules:

- Empty layout overlays must use `pointer-events: none`.
- Real controls and cards must use `pointer-events: auto`.
- OrbitControls should work in open scene areas.
- The scene focal axis should usually sit center-left on experiment pages.
- Right detail docks reserve space on the visual right edge.
- Camera depth should be moderate; avoid making the scene feel like a deep tunnel.

## Page-Specific Notes

### Protocol Lab

Required visible functions:

- DNS/TCP mode switch
- domain or TCP sequence inputs
- playback controls
- timeline
- 3D packet/path visualization
- packet inspector
- DNS cache table
- node state panel when a device is selected

Layout:

- title first
- timeline second
- playback under timeline
- scene center-left
- inspector dock viewport-right
- inputs and cache below

### Scenario

Required visible functions:

- t0 to t1 timeline
- step playback
- 3D topology
- flow/device detail dock
- current frame/packet details
- H1 ARP table
- Switch S MAC table
- clickable devices

Layout:

- title first
- timeline second
- playback under timeline
- scene center-left
- flow/device dock viewport-right
- dynamic tables below

### Knowledge Atlas

Required visible functions:

- top full-bleed 3D knowledge graph
- clickable graph nodes
- node detail dock
- five-layer vertical model
- search
- pagination
- add/edit/delete
- local mock persistence now, backend CRUD later

Layout:

- 3D graph as hero
- detail dock viewport-right
- five-layer knowledge management below

## Acceptance Checklist

Before calling a UI pass done:

- The page has one clear visual hierarchy.
- Right detail dock is aligned to the viewport right edge on desktop.
- Timeline and playback controls are visually connected.
- Open 3D areas can be dragged/rotated with the mouse.
- No major text overlaps.
- No essential panel hides the main animation path.
- Inputs, tables, and CRUD controls remain discoverable.
- Build passes.
- At least one desktop screenshot is checked.
