import * as THREE from 'three';
import {
  EFFECTS,
  EffectId,
  MODE_COLORS,
  fragmentShader,
  modeIndex,
  vertexShader,
} from './shaders';

type MindARThreeInstance = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  start: () => Promise<void>;
  stop: () => void;
  addFaceMesh: () => THREE.Mesh;
};

export interface ARExperienceOptions {
  container: HTMLElement;
  onStatus?: (status: string) => void;
  onTracking?: (tracking: boolean) => void;
  onError?: (message: string) => void;
}

export class ARExperience {
  private container: HTMLElement;
  private mindar: MindARThreeInstance | null = null;
  private faceMesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private clock = new THREE.Clock();
  private effectId: EffectId = 'neural';
  private intensity = 0.85;
  private running = false;
  private onStatus?: (status: string) => void;
  private onTracking?: (tracking: boolean) => void;
  private onError?: (message: string) => void;
  private lastVisible = false;
  private trackingRaf = 0;

  constructor(options: ARExperienceOptions) {
    this.container = options.container;
    this.onStatus = options.onStatus;
    this.onTracking = options.onTracking;
    this.onError = options.onError;
  }

  get currentEffect(): EffectId {
    return this.effectId;
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.onStatus?.('Requesting camera…');

    try {
      const { MindARThree } = await import('mind-ar/dist/mindar-face-three.prod.js');

      const mindar = new MindARThree({
        container: this.container,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0.0001,
        filterBeta: 10000,
      }) as MindARThreeInstance;

      this.mindar = mindar;
      const { renderer, scene, camera } = mindar;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const hemi = new THREE.HemisphereLight(0xe8f4f2, 0x061018, 1.1);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0x2ee6a8, 0.55);
      key.position.set(0.4, 1.2, 0.8);
      scene.add(key);

      const colors = MODE_COLORS.neural;
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: this.intensity },
          uMode: { value: 0 },
          uColorA: { value: new THREE.Color(...colors.a) },
          uColorB: { value: new THREE.Color(...colors.b) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      this.faceMesh = mindar.addFaceMesh();
      this.faceMesh.material = this.material;
      scene.add(this.faceMesh);

      this.watchFaceVisibility();

      this.onStatus?.('Starting tracker…');
      await mindar.start();
      this.running = true;
      this.onStatus?.('Look at the camera');

      renderer.setAnimationLoop(() => {
        if (!this.material) return;
        this.material.uniforms.uTime.value = this.clock.getElapsedTime();
        renderer.render(scene, camera);
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Camera access failed. Allow camera permissions and retry over HTTPS.';
      this.onError?.(message);
      this.onStatus?.('Camera unavailable');
      throw err;
    }
  }

  setEffect(id: EffectId): void {
    this.effectId = id;
    if (!this.material) return;
    const colors = MODE_COLORS[id];
    this.material.uniforms.uMode.value = modeIndex(id);
    this.material.uniforms.uColorA.value.setRGB(...colors.a);
    this.material.uniforms.uColorB.value.setRGB(...colors.b);
  }

  setIntensity(value: number): void {
    this.intensity = Math.min(1, Math.max(0.15, value));
    if (this.material) {
      this.material.uniforms.uIntensity.value = this.intensity;
    }
  }

  cycleEffect(direction = 1): EffectId {
    const index = EFFECTS.findIndex((e) => e.id === this.effectId);
    const next = EFFECTS[(index + direction + EFFECTS.length) % EFFECTS.length];
    this.setEffect(next.id);
    return next.id;
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
      // Mirror selfie feed to match on-screen orientation
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
    if (this.trackingRaf) cancelAnimationFrame(this.trackingRaf);
    this.trackingRaf = 0;
    if (this.mindar) {
      this.mindar.renderer.setAnimationLoop(null);
      try {
        this.mindar.stop();
      } catch {
        // ignore stop errors when already torn down
      }
      this.mindar = null;
    }
    this.faceMesh = null;
    this.material = null;
    this.running = false;
    this.container.replaceChildren();
  }

  private watchFaceVisibility(): void {
    const check = () => {
      if (!this.running || !this.faceMesh) return;
      const visible = this.faceMesh.visible;
      if (visible !== this.lastVisible) {
        this.lastVisible = visible;
        this.onTracking?.(visible);
        this.onStatus?.(
          visible
            ? (EFFECTS.find((e) => e.id === this.effectId)?.name ?? 'Tracking')
            : 'Searching for face…',
        );
      }
      this.trackingRaf = requestAnimationFrame(check);
    };
    this.trackingRaf = requestAnimationFrame(check);
  }
}
