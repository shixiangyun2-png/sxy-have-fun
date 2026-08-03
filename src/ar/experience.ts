import * as THREE from 'three';
import { HandTracker, type GestureDebug } from './hand-tracker';
import { armorFragmentShader, armorVertexShader } from './shaders';

type MindARThreeInstance = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  start: () => Promise<void>;
  stop: () => void;
  addFaceMesh: () => THREE.Mesh;
  addAnchor: (landmarkIndex: number) => { group: THREE.Group };
};

export type SuitPhase = 'idle' | 'charging' | 'assembling' | 'online';

export interface ARExperienceOptions {
  container: HTMLElement;
  onStatus?: (status: string) => void;
  onTracking?: (tracking: boolean) => void;
  onPhase?: (phase: SuitPhase, progress: number) => void;
  onGestureReady?: () => void;
  onGestureStatus?: (status: string, state: 'loading' | 'ready' | 'error' | 'off') => void;
  onGestureDebug?: (debug: GestureDebug) => void;
  onError?: (message: string) => void;
}

type ArmorPiece = THREE.Mesh & {
  userData: {
    origin: THREE.Vector3;
    target: THREE.Vector3;
    delay: number;
  };
};

export class ARExperience {
  private container: HTMLElement;
  private mindar: MindARThreeInstance | null = null;
  private faceMesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private armorPieces: ArmorPiece[] = [];
  private energyRings: THREE.Mesh[] = [];
  private particles: THREE.Points | null = null;
  private handTracker: HandTracker | null = null;
  private clock = new THREE.Clock();
  private running = false;
  private phase: SuitPhase = 'idle';
  private phaseStarted = 0;
  private lastVisible = false;
  private trackingRaf = 0;
  private onStatus?: (status: string) => void;
  private onTracking?: (tracking: boolean) => void;
  private onPhase?: (phase: SuitPhase, progress: number) => void;
  private onGestureReady?: () => void;
  private onGestureStatus?: ARExperienceOptions['onGestureStatus'];
  private onGestureDebug?: ARExperienceOptions['onGestureDebug'];
  private onError?: (message: string) => void;

  constructor(options: ARExperienceOptions) {
    this.container = options.container;
    this.onStatus = options.onStatus;
    this.onTracking = options.onTracking;
    this.onPhase = options.onPhase;
    this.onGestureReady = options.onGestureReady;
    this.onGestureStatus = options.onGestureStatus;
    this.onGestureDebug = options.onGestureDebug;
    this.onError = options.onError;
  }

  get suitPhase(): SuitPhase {
    return this.phase;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.onStatus?.('REQUESTING CAMERA');

    try {
      if (!window.isSecureContext) {
        throw new DOMException(
          'Camera access requires HTTPS when testing from another device.',
          'SecurityError',
        );
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('This browser does not support camera capture.', 'NotSupportedError');
      }

      const { MindARThree } = await import('mind-ar/dist/mindar-face-three.prod.js');
      const mindar = new MindARThree({
        container: this.container,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0.0001,
        filterBeta: 9000,
      }) as MindARThreeInstance;

      this.mindar = mindar;
      const { renderer, scene, camera } = mindar;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.HemisphereLight(0xa8edff, 0x140003, 1.6));
      const key = new THREE.DirectionalLight(0x7feaff, 2.4);
      key.position.set(0.2, 1, 1.5);
      scene.add(key);
      const rim = new THREE.PointLight(0xff2b17, 2.2, 5);
      rim.position.set(-0.8, 0.5, 1);
      scene.add(rim);

      this.material = new THREE.ShaderMaterial({
        vertexShader: armorVertexShader,
        fragmentShader: armorFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uCharge: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      this.faceMesh = mindar.addFaceMesh();
      this.faceMesh.material = this.material;
      scene.add(this.faceMesh);

      const anchor = mindar.addAnchor(168);
      this.buildArmorAssembly(anchor.group);

      this.onStatus?.('CALIBRATING OPTICS');
      await mindar.start();
      this.running = true;
      this.watchFaceVisibility();
      this.startHandTracking();
      this.setPhase('idle');

      renderer.setAnimationLoop(() => {
        const elapsed = this.clock.getElapsedTime();
        if (this.material) this.material.uniforms.uTime.value = elapsed;
        this.updateSequence(performance.now());
        renderer.render(scene, camera);
      });
    } catch (error) {
      const message = this.describeCameraError(error);
      this.onError?.(message);
      this.onStatus?.('CAMERA OFFLINE');
      throw error;
    }
  }

  activate(): boolean {
    if (!this.running || this.phase !== 'idle' || !this.lastVisible) return false;
    this.phaseStarted = performance.now();
    this.setPhase('charging');
    return true;
  }

  reset(): void {
    this.phaseStarted = 0;
    this.setPhase('idle');
    if (this.material) {
      this.material.uniforms.uProgress.value = 0;
      this.material.uniforms.uCharge.value = 0;
    }
    this.resetArmorPieces();
  }

  capture(): string | null {
    if (!this.mindar) return null;
    const canvas = this.mindar.renderer.domElement;
    const video = this.container.querySelector('video');
    const out = document.createElement('canvas');
    out.width = canvas.width || window.innerWidth;
    out.height = canvas.height || window.innerHeight;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    if (video) {
      ctx.save();
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, out.width, out.height);
      ctx.restore();
    }
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.trackingRaf);
    this.handTracker?.stop();
    this.handTracker = null;
    if (this.mindar) {
      this.mindar.renderer.setAnimationLoop(null);
      try {
        this.mindar.stop();
      } catch {
        // MindAR may already have released the stream.
      }
    }
    this.mindar = null;
    this.faceMesh = null;
    this.material = null;
    this.armorPieces = [];
    this.energyRings = [];
    this.particles = null;
    this.container.replaceChildren();
  }

  private buildArmorAssembly(group: THREE.Group): void {
    const red = new THREE.MeshPhysicalMaterial({
      color: 0x7d0707,
      metalness: 0.92,
      roughness: 0.19,
      clearcoat: 1,
      emissive: 0x260000,
      emissiveIntensity: 0.8,
    });
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xd69a2e,
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 1,
      emissive: 0x4a2100,
      emissiveIntensity: 0.7,
    });

    const specs = [
      { size: [0.32, 0.16], target: [-0.21, 0.29, 0.05], angle: 0.18, gold: false },
      { size: [0.32, 0.16], target: [0.21, 0.29, 0.05], angle: -0.18, gold: false },
      { size: [0.2, 0.3], target: [-0.33, 0.02, 0.02], angle: 0.08, gold: true },
      { size: [0.2, 0.3], target: [0.33, 0.02, 0.02], angle: -0.08, gold: true },
      { size: [0.28, 0.18], target: [-0.18, -0.29, 0.04], angle: -0.12, gold: false },
      { size: [0.28, 0.18], target: [0.18, -0.29, 0.04], angle: 0.12, gold: false },
      { size: [0.22, 0.16], target: [0, 0.42, 0.03], angle: 0, gold: true },
    ] as const;

    specs.forEach((spec, index) => {
      const geometry = new THREE.BoxGeometry(spec.size[0], spec.size[1], 0.045, 2, 2, 1);
      const piece = new THREE.Mesh(geometry, spec.gold ? gold : red) as unknown as ArmorPiece;
      const target = new THREE.Vector3(...spec.target);
      const angle = (index / specs.length) * Math.PI * 2;
      const origin = new THREE.Vector3(Math.cos(angle) * 2.4, Math.sin(angle) * 2, 1.2 + index * 0.1);
      piece.userData = { origin, target, delay: index * 0.075 };
      piece.position.copy(origin);
      piece.rotation.set(angle * 0.4, angle * 0.25, spec.angle + angle);
      piece.scale.setScalar(0.15);
      piece.visible = false;
      group.add(piece);
      this.armorPieces.push(piece);
    });

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x39e8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.58 + i * 0.14, 0.008, 8, 72),
        ringMaterial.clone(),
      );
      ring.rotation.x = Math.PI / 2 + i * 0.3;
      ring.visible = false;
      group.add(ring);
      this.energyRings.push(ring);
    }

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      const radius = 0.4 + Math.random() * 1.4;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x68eeff,
        size: 0.022,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.particles.visible = false;
    group.add(this.particles);
  }

  private updateSequence(now: number): void {
    if (!this.material || this.phase === 'idle') return;
    const elapsed = now - this.phaseStarted;

    if (this.phase === 'charging') {
      const progress = Math.min(1, elapsed / 1450);
      this.material.uniforms.uCharge.value = progress;
      this.energyRings.forEach((ring, index) => {
        ring.visible = true;
        ring.rotation.z += 0.015 * (index % 2 ? -1 : 1);
        ring.scale.setScalar(0.55 + progress * (0.65 + index * 0.08));
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.75;
      });
      if (this.particles) {
        this.particles.visible = true;
        this.particles.rotation.z += 0.025;
        (this.particles.material as THREE.PointsMaterial).opacity = progress * 0.9;
      }
      this.onPhase?.('charging', progress);
      if (progress >= 1) {
        this.phaseStarted = now;
        this.setPhase('assembling');
      }
      return;
    }

    if (this.phase === 'assembling') {
      const progress = Math.min(1, elapsed / 2600);
      this.material.uniforms.uProgress.value = this.easeOut(Math.max(0, (progress - 0.18) / 0.82));
      this.armorPieces.forEach((piece) => {
        const local = Math.min(1, Math.max(0, (progress - piece.userData.delay) / 0.5));
        const eased = this.easeOut(local);
        piece.visible = local > 0;
        piece.position.lerpVectors(piece.userData.origin, piece.userData.target, eased);
        piece.rotation.x *= 1 - local * 0.12;
        piece.rotation.y *= 1 - local * 0.12;
        piece.rotation.z *= 1 - local * 0.12;
        piece.scale.setScalar(0.15 + eased * 0.85);
      });
      this.energyRings.forEach((ring, index) => {
        ring.rotation.z += 0.035 * (index % 2 ? -1 : 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.7;
      });
      if (this.particles) {
        this.particles.rotation.z += 0.055;
        this.particles.scale.setScalar(1 - progress * 0.72);
      }
      this.onPhase?.('assembling', progress);
      if (progress >= 1) {
        this.setPhase('online');
        this.material.uniforms.uProgress.value = 1;
        this.energyRings.forEach((ring) => (ring.visible = false));
        if (this.particles) this.particles.visible = false;
      }
      return;
    }

    this.material.uniforms.uCharge.value = 0.25 + Math.sin(now * 0.002) * 0.12;
    this.onPhase?.('online', 1);
  }

  private setPhase(phase: SuitPhase): void {
    this.phase = phase;
    const labels: Record<SuitPhase, string> = {
      idle: this.lastVisible ? 'TARGET LOCKED' : 'SCANNING PILOT',
      charging: 'ARC ENERGY CHARGING',
      assembling: 'NANOTECH ASSEMBLY',
      online: 'MK // ARMOR ONLINE',
    };
    this.onStatus?.(labels[phase]);
    this.onPhase?.(phase, phase === 'online' ? 1 : 0);
  }

  private resetArmorPieces(): void {
    this.armorPieces.forEach((piece) => {
      piece.position.copy(piece.userData.origin);
      piece.scale.setScalar(0.15);
      piece.visible = false;
    });
    this.energyRings.forEach((ring) => (ring.visible = false));
    if (this.particles) {
      this.particles.visible = false;
      this.particles.scale.setScalar(1);
    }
  }

  private async startHandTracking(): Promise<void> {
    const video = this.container.querySelector('video');
    if (!video) return;
    this.handTracker = new HandTracker({
      video,
      onFist: () => this.activate(),
      onReady: this.onGestureReady,
      onStatus: (status) => {
        const states = {
          'loading-wasm': ['Loading MediaPipe runtime…', 'loading'],
          'loading-model': ['Loading hand gesture model…', 'loading'],
          ready: ['Gesture model ready', 'ready'],
          stopped: ['Gesture model stopped', 'off'],
        } as const;
        const next = states[status];
        this.onGestureStatus?.(next[0], next[1]);
      },
      onDebug: this.onGestureDebug,
    });
    try {
      await this.handTracker.start();
    } catch (error) {
      // Button activation remains available if MediaPipe assets are blocked.
      const detail = error instanceof Error ? error.message : 'Model download failed';
      this.onGestureStatus?.(`MediaPipe unavailable: ${detail}`, 'error');
      this.onStatus?.(this.lastVisible ? 'TARGET LOCKED' : 'SCANNING PILOT');
    }
  }

  private watchFaceVisibility(): void {
    const check = () => {
      if (!this.running || !this.faceMesh) return;
      const visible = this.faceMesh.visible;
      if (visible !== this.lastVisible) {
        this.lastVisible = visible;
        this.onTracking?.(visible);
        if (this.phase === 'idle') this.onStatus?.(visible ? 'TARGET LOCKED' : 'SCANNING PILOT');
      }
      this.trackingRaf = requestAnimationFrame(check);
    };
    this.trackingRaf = requestAnimationFrame(check);
  }

  private easeOut(value: number): number {
    return 1 - Math.pow(1 - value, 4);
  }

  private describeCameraError(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.toLowerCase();

    if (name === 'NotAllowedError' || message.includes('permission') || message.includes('denied')) {
      return 'Camera permission is blocked. Click the camera/lock icon in the address bar, choose Allow, then reload.';
    }
    if (name === 'NotFoundError' || message.includes('requested device not found')) {
      return 'No camera was found. Connect or enable a webcam, then reload this page.';
    }
    if (name === 'NotReadableError' || message.includes('could not start video')) {
      return 'The camera is busy. Close Zoom, Meet, or other camera apps, then try again.';
    }
    if (name === 'OverconstrainedError') {
      return 'The selected camera cannot provide the requested video mode. Try another camera.';
    }
    if (name === 'SecurityError' || !window.isSecureContext) {
      return 'Camera access requires HTTPS on phones. Run npm run dev:https and open the HTTPS network URL.';
    }
    if (name === 'NotSupportedError') {
      return 'Camera capture is not supported in this browser. Use a current version of Chrome, Edge, or Safari.';
    }
    return `Camera initialization failed: ${raw || 'Unknown error'}. Check browser permissions and reload.`;
  }
}
