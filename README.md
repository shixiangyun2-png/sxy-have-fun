# HAVE FUN — AI Transformation WebAR

Interactive face-tracking WebAR experience. Morph through five neural identities in the browser — no app install.

## Features

- **Face WebAR** via MindAR + Three.js
- **Five AI transformations**: Neural Glow, Liquid Chrome, Identity Glitch, Prism Mind, Wireframe AI
- Intensity control, effect cycling, and photo capture
- Branded landing with animated atmosphere

## Quick start

```bash
npm install
npm run dev
```

Open the local URL on a device with a camera. Webcam access requires **HTTPS** (or `localhost`).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |

## Stack

- Vite + TypeScript
- [MindAR](https://github.com/hiukim/mind-ar-js) face tracking
- Three.js custom shader materials
