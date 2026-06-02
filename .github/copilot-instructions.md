# Copilot Instructions

This project is NetVerse Protocol Lab, an immersive computer-network protocol
visualization system.

Use the project documents as source of truth:

- `PRODUCT_REQUIREMENTS.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT_PLAN.md`

Frontend code should favor React + TypeScript, Tailwind, React Three Fiber,
drei, GSAP, and reusable simulation-step playback. Avoid generic dashboard
layouts when an immersive protocol visualization is more appropriate.

Backend code should treat DNS/TCP/scenario features as protocol simulations. It
does not need to perform real DNS or TCP networking. Generate structured steps,
persist useful tables/logs, and return JSON that the frontend can animate.
