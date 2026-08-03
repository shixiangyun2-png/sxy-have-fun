/// <reference types="vite/client" />

declare module 'mind-ar/dist/mindar-face-three.prod.js' {
  import type { WebGLRenderer, Scene, Camera, Mesh } from 'three';

  export class MindARThree {
    renderer: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    constructor(options: {
      container: HTMLElement;
      uiLoading?: string;
      uiScanning?: string;
      uiError?: string;
      filterMinCF?: number;
      filterBeta?: number;
    });
    start(): Promise<void>;
    stop(): void;
    addFaceMesh(): Mesh;
  }
}
