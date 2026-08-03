import './style.css';
import { ARExperience, type SuitPhase } from './ar/experience';
import { createAtmosphere } from './ui/atmosphere';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

app.innerHTML = `
  <section class="landing" id="landing" aria-label="HAVE FUN armor experience">
    <div class="landing-atmosphere" aria-hidden="true">
      <div class="landing-gradient"></div>
      <canvas id="atmosphere"></canvas>
      <div class="landing-noise"></div>
    </div>
    <p class="landing-footer">STARK-INSPIRED · WEBAR</p>
    <div class="landing-content">
      <div class="eyebrow">EXPERIMENT 02 // NANOTECH</div>
      <h1 class="brand">SUIT UP</h1>
      <p class="headline">Become the armor.</p>
      <p class="subcopy">A cinematic AI armor sequence mapped to your face. Activate with one click—or raise a fist.</p>
      <div class="cta-row">
        <button class="btn-primary" id="start-btn" type="button">
          <span class="pulse" aria-hidden="true"></span>
          Initialize system
        </button>
        <span class="hint">Camera + WebGL required</span>
      </div>
    </div>
  </section>

  <section class="ar-stage" id="ar-stage" aria-label="Armor suit-up AR" aria-hidden="true">
    <div id="ar-container"></div>
    <div class="cinema-bars" aria-hidden="true"></div>
    <div class="hud-grid" aria-hidden="true"></div>
    <div class="hud-vignette" aria-hidden="true"></div>
    <div class="hud-reticle" id="hud-reticle" aria-hidden="true">
      <i></i><i></i><i></i>
      <span class="reticle-axis axis-x"></span>
      <span class="reticle-axis axis-y"></span>
    </div>
    <div class="holo-rings" id="holo-rings" aria-hidden="true">
      <i></i><i></i><i></i><i></i>
    </div>
    <div class="energy-column" id="energy-column" aria-hidden="true"></div>
    <div class="armor-silhouette" id="armor-silhouette" aria-hidden="true">
      <div class="shoulder left"></div><div class="shoulder right"></div>
      <div class="chest-core"><i></i></div>
    </div>
    <div class="flash" id="flash" aria-hidden="true"></div>
    <div class="toast" id="toast" role="status"></div>
    <div class="error-banner" id="error-banner" role="alert"></div>
    <div class="loading-veil" id="loading-veil">
      <div class="loader">
        <div class="loader-ring" aria-hidden="true"></div>
        <p>CALIBRATING NEURAL OPTICS</p>
      </div>
    </div>

    <div class="ar-hud">
      <div class="ar-top">
        <button class="hud-back" id="back-btn" type="button" aria-label="Exit AR">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          ABORT
        </button>
        <div class="system-id">
          <strong>HAVE FUN // MK-02</strong>
          <span id="gesture-status">MEDIAPIPE INITIALIZING</span>
        </div>
        <div class="ar-status" id="ar-status">SYSTEM IDLE</div>
      </div>

      <aside class="telemetry left" aria-hidden="true">
        <span>OPTICAL LINK</span><b>98.7%</b>
        <span>ARC REACTOR</span><b id="arc-reading">0.00 TW</b>
        <span>NANO CELLS</span><b id="nano-reading">STANDBY</b>
      </aside>
      <aside class="telemetry right" aria-hidden="true">
        <span>TRACKING</span><b id="track-reading">SEARCHING</b>
        <span>THREAT LEVEL</span><b>MINIMAL</b>
        <span>ATMOSPHERE</span><b>NOMINAL</b>
      </aside>

      <div class="phase-copy" id="phase-copy">
        <span id="phase-kicker">PILOT ACQUISITION</span>
        <h2 id="phase-title">Step into frame</h2>
        <p id="phase-desc">Center your face inside the targeting reticle.</p>
      </div>

      <div class="ar-bottom">
        <div class="sequence-panel">
          <div class="charge-meter">
            <div class="meter-meta"><span id="meter-label">SUIT ASSEMBLY</span><b id="meter-value">00%</b></div>
            <div class="meter-track"><i id="meter-fill"></i></div>
          </div>
          <div class="control-row suit-controls">
            <button class="activate-btn" id="activate-btn" type="button" disabled>
              <span class="arc-icon"><i></i></span>
              <span><small>CLICK OR MAKE A FIST</small><strong>ACTIVATE ARMOR</strong></span>
            </button>
            <button class="icon-btn capture" id="capture-btn" type="button" aria-label="Capture armor photo" disabled>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M4 8h3l1.5-2h7L17 8h3v12H4z"/></svg>
            </button>
            <button class="icon-btn" id="reset-btn" type="button" aria-label="Reset armor sequence" disabled>
              <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5"/><path d="M18 4v4h-4"/><path d="M20 12a8 8 0 0 1-14 5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const landing = query<HTMLElement>('#landing');
const arStage = query<HTMLElement>('#ar-stage');
const arContainer = query<HTMLElement>('#ar-container');
const startBtn = query<HTMLButtonElement>('#start-btn');
const backBtn = query<HTMLButtonElement>('#back-btn');
const activateBtn = query<HTMLButtonElement>('#activate-btn');
const captureBtn = query<HTMLButtonElement>('#capture-btn');
const resetBtn = query<HTMLButtonElement>('#reset-btn');
const arStatus = query<HTMLElement>('#ar-status');
const gestureStatus = query<HTMLElement>('#gesture-status');
const trackReading = query<HTMLElement>('#track-reading');
const arcReading = query<HTMLElement>('#arc-reading');
const nanoReading = query<HTMLElement>('#nano-reading');
const phaseKicker = query<HTMLElement>('#phase-kicker');
const phaseTitle = query<HTMLElement>('#phase-title');
const phaseDesc = query<HTMLElement>('#phase-desc');
const meterLabel = query<HTMLElement>('#meter-label');
const meterValue = query<HTMLElement>('#meter-value');
const meterFill = query<HTMLElement>('#meter-fill');
const flash = query<HTMLElement>('#flash');
const toast = query<HTMLElement>('#toast');
const errorBanner = query<HTMLElement>('#error-banner');
const loadingVeil = query<HTMLElement>('#loading-veil');
const atmosphereCanvas = query<HTMLCanvasElement>('#atmosphere');

const disposeAtmosphere = createAtmosphere(atmosphereCanvas);
let experience: ARExperience | null = null;
let toastTimer = 0;

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function updatePhase(phase: SuitPhase, progress: number): void {
  const percent = Math.round(progress * 100);
  arStage.dataset.phase = phase;
  meterValue.textContent = `${String(percent).padStart(2, '0')}%`;
  meterFill.style.width = `${percent}%`;

  if (phase === 'idle') {
    meterLabel.textContent = 'SUIT ASSEMBLY';
    phaseKicker.textContent = 'BIOMETRIC LOCK';
    phaseTitle.textContent = activateBtn.disabled ? 'Step into frame' : 'Pilot confirmed';
    phaseDesc.textContent = activateBtn.disabled
      ? 'Center your face inside the targeting reticle.'
      : 'Activate manually or hold a closed fist toward the camera.';
    activateBtn.disabled = !arStage.classList.contains('is-tracking');
    captureBtn.disabled = true;
    resetBtn.disabled = true;
    arcReading.textContent = '0.00 TW';
    nanoReading.textContent = 'STANDBY';
  } else if (phase === 'charging') {
    meterLabel.textContent = 'ARC ENERGY';
    phaseKicker.textContent = 'SEQUENCE 01';
    phaseTitle.textContent = 'Charging reactor';
    phaseDesc.textContent = 'Energy lattice synchronizing with pilot biometrics.';
    activateBtn.disabled = true;
    nanoReading.textContent = 'PRIMING';
    arcReading.textContent = `${(progress * 8.4).toFixed(2)} TW`;
  } else if (phase === 'assembling') {
    meterLabel.textContent = 'NANOTECH DEPLOYMENT';
    phaseKicker.textContent = 'SEQUENCE 02';
    phaseTitle.textContent = 'Armor assembling';
    phaseDesc.textContent = 'Titanium-gold nanoplates locking to facial geometry.';
    nanoReading.textContent = `${percent}% DEPLOYED`;
    arcReading.textContent = '8.40 TW';
  } else {
    meterLabel.textContent = 'SYSTEM INTEGRITY';
    phaseKicker.textContent = 'SEQUENCE COMPLETE';
    phaseTitle.textContent = 'Armor online';
    phaseDesc.textContent = 'All systems nominal. AI co-pilot standing by.';
    meterValue.textContent = '100%';
    meterFill.style.width = '100%';
    captureBtn.disabled = false;
    resetBtn.disabled = false;
    nanoReading.textContent = 'LOCKED';
    arcReading.textContent = '8.40 TW';
  }
}

async function enterAR(): Promise<void> {
  errorBanner.classList.remove('is-visible');
  landing.classList.add('is-exiting');
  arStage.classList.add('is-active');
  arStage.setAttribute('aria-hidden', 'false');
  loadingVeil.classList.add('is-visible');
  arStatus.textContent = 'BOOTING';

  experience?.stop();
  experience = new ARExperience({
    container: arContainer,
    onStatus: (status) => (arStatus.textContent = status),
    onTracking: (tracking) => {
      trackReading.textContent = tracking ? 'LOCKED' : 'SEARCHING';
      arStage.classList.toggle('is-tracking', tracking);
      activateBtn.disabled = !tracking;
      if (experience?.suitPhase === 'idle') updatePhase('idle', 0);
    },
    onGestureReady: () => {
      gestureStatus.textContent = 'FIST GESTURE ARMED';
      gestureStatus.classList.add('online');
    },
    onPhase: updatePhase,
    onError: (message) => {
      errorBanner.textContent = message;
      errorBanner.classList.add('is-visible');
    },
  });

  try {
    await experience.start();
  } catch {
    experience.stop();
    experience = null;
    arStatus.textContent = 'CAMERA OFFLINE';
  } finally {
    loadingVeil.classList.remove('is-visible');
  }
}

function activateArmor(): void {
  if (!experience) return;
  if (!experience.activate()) {
    showToast('Face lock required before activation');
  }
}

function exitAR(): void {
  experience?.stop();
  experience = null;
  arStage.className = 'ar-stage';
  arStage.removeAttribute('data-phase');
  arStage.setAttribute('aria-hidden', 'true');
  landing.classList.remove('is-exiting');
  loadingVeil.classList.remove('is-visible');
  errorBanner.classList.remove('is-visible');
  gestureStatus.textContent = 'MEDIAPIPE INITIALIZING';
  gestureStatus.classList.remove('online');
  updatePhase('idle', 0);
}

startBtn.addEventListener('click', () => void enterAR());
backBtn.addEventListener('click', exitAR);
activateBtn.addEventListener('click', activateArmor);
resetBtn.addEventListener('click', () => experience?.reset());

captureBtn.addEventListener('click', () => {
  const dataUrl = experience?.capture();
  if (!dataUrl) return showToast('Capture unavailable');
  flash.classList.add('is-on');
  window.setTimeout(() => flash.classList.remove('is-on'), 120);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `armor-online-${Date.now()}.png`;
  link.click();
  showToast('Armor scan captured');
});

window.addEventListener('keydown', (event) => {
  if (!arStage.classList.contains('is-active')) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    activateArmor();
  } else if (event.key === 'Escape') {
    exitAR();
  }
});

window.addEventListener('beforeunload', () => {
  disposeAtmosphere();
  experience?.stop();
});
