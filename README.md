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

Open `http://localhost:5173` on the same computer. Browsers treat localhost as a secure camera origin.

### Test on a phone or another computer

Camera access over a LAN IP requires HTTPS:

```bash
npm run dev:https
```

1. Connect both devices to the same network.
2. Open the `https://<network-ip>:5173` URL printed by Vite.
3. Accept the local development certificate warning.
4. Choose **Allow** when the browser requests camera access.

If camera access fails:

- Click the camera or lock icon in the address bar and set Camera to **Allow**.
- Close Zoom, Meet, Teams, or other applications using the webcam.
- Confirm the operating system allows camera access for your browser.
- Reload after changing permissions.

The in-app **DEBUG** panel reports the secure-context, camera, face-tracking, MediaPipe, hand, and fist-hold states.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start Vite dev server    |
| `npm run dev:https` | Start HTTPS server for testing on phones |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run preview:https` | Preview production build over HTTPS |

## Stack

- Vite + TypeScript
- [MindAR](https://github.com/hiukim/mind-ar-js) face tracking
- Three.js custom shader materials
