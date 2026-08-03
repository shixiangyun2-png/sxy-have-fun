# SUIT UP — Cinematic Armor WebAR

Interactive face- and hand-tracking WebAR armor experience. Charge the reactor and watch metallic nanoplates assemble over your face in the browser.

## Features

- **Face WebAR** via MindAR + Three.js
- **Fist activation** via MediaPipe Tasks Vision
- Four-stage sequence: idle, energy charge, nanotech assembly, armor online
- Custom GLSL armor material, physical 3D plates, holograms, particles, and camera shake
- Responsive cinematic HUD, reset, and photo capture

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
