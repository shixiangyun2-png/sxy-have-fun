import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export interface HandTrackerOptions {
  video: HTMLVideoElement;
  onFist: () => void;
  onReady?: () => void;
}

export class HandTracker {
  private video: HTMLVideoElement;
  private onFist: () => void;
  private onReady?: () => void;
  private landmarker: HandLandmarker | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private fistFrames = 0;
  private latched = false;
  private running = false;

  constructor(options: HandTrackerOptions) {
    this.video = options.video;
    this.onFist = options.onFist;
    this.onReady = options.onReady;
  }

  async start(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.65,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    this.running = true;
    this.onReady?.();
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.landmarker?.close();
    this.landmarker = null;
  }

  private loop = (): void => {
    if (!this.running || !this.landmarker) return;

    if (
      this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = this.video.currentTime;
      const result = this.landmarker.detectForVideo(this.video, performance.now());
      const landmarks = result.landmarks[0];
      const fist = landmarks ? this.isFist(landmarks) : false;

      if (fist) {
        this.fistFrames += 1;
        if (this.fistFrames >= 7 && !this.latched) {
          this.latched = true;
          this.onFist();
        }
      } else {
        this.fistFrames = Math.max(0, this.fistFrames - 2);
        if (this.fistFrames === 0) this.latched = false;
      }
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private isFist(points: NormalizedLandmark[]): boolean {
    const wrist = points[0];
    if (!wrist) return false;

    // For each finger, a curled fingertip sits closer to the palm/wrist than
    // its proximal joint. This remains reliable when the hand is rotated.
    const fingers: Array<[number, number]> = [
      [8, 6],
      [12, 10],
      [16, 14],
      [20, 18],
    ];
    let folded = 0;

    for (const [tipIndex, pipIndex] of fingers) {
      const tip = points[tipIndex];
      const pip = points[pipIndex];
      if (!tip || !pip) continue;
      if (this.distance(tip, wrist) < this.distance(pip, wrist) * 1.12) folded += 1;
    }

    const indexMcp = points[5];
    const pinkyMcp = points[17];
    if (!indexMcp || !pinkyMcp) return false;
    const palmWidth = this.distance(indexMcp, pinkyMcp);
    return folded >= 3 && palmWidth > 0.025;
  }

  private distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
  }
}
