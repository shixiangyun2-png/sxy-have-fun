import './style.css';
import { ARExperience } from './ar/experience';
import { EFFECTS, EffectId } from './ar/shaders';
import { createAtmosphere } from './ui/atmosphere';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

app.innerHTML = `
  <section class="landing" id="landing" aria-label="HAVE FUN landing">
    <div class="landing-atmosphere" aria-hidden="true">
      <div class="landing-gradient"></div>
      <canvas id="atmosphere"></canvas>
      <div class="landing-noise"></div>
    </div>
    <p class="landing-footer">WebAR · Face AI</p>
    <div class="landing-content">
      <h1 class="brand">HAVE FUN</h1>
      <p class="headline">AI transformation you can wear on your face.</p>
      <p class="subcopy">Open the camera, lock onto your features, and morph through five neural identities in real time.</p>
      <div class="cta-row">
        <button class="btn-primary" id="start-btn" type="button">
          <span class="pulse" aria-hidden="true"></span>
          Enter WebAR
        </button>
        <span class="hint">Works best on mobile · HTTPS required</span>
      </div>
    </div>
  </section>

  <section class="ar-stage" id="ar-stage" aria-label="AR experience" aria-hidden="true">
    <div id="ar-container"></div>
    <div class="scan-ring" id="scan-ring" aria-hidden="true"></div>
    <div class="flash" id="flash" aria-hidden="true"></div>
    <div class="toast" id="toast" role="status"></div>
    <div class="error-banner" id="error-banner" role="alert"></div>
    <div class="loading-veil" id="loading-veil">
      <div class="loader">
        <div class="loader-ring" aria-hidden="true"></div>
        <p>Warming up face tracker…</p>
      </div>
    </div>
    <div class="ar-hud">
      <div class="ar-top">
        <div class="ar-brand-mark">HAVE FUN</div>
        <div class="ar-status" id="ar-status">Idle</div>
      </div>
      <div class="ar-bottom">
        <div class="effect-panel">
          <div class="effect-label">
            <h2 class="effect-name" id="effect-name">Neural Glow</h2>
            <p class="effect-desc" id="effect-desc">Soft bioluminescent mesh mapped to your face.</p>
          </div>
          <div class="effect-rail" id="effect-rail" role="listbox" aria-label="Transformation effects"></div>
          <div class="control-row">
            <button class="icon-btn" id="back-btn" type="button" aria-label="Exit AR">
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="intensity-wrap">
              <label for="intensity">Intensity</label>
              <input id="intensity" type="range" min="15" max="100" value="85" />
            </div>
            <button class="icon-btn" id="cycle-btn" type="button" aria-label="Next transformation">
              <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5"/><path d="M18 4v4h-4"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="M6 20v-4h4"/></svg>
            </button>
            <button class="icon-btn capture" id="capture-btn" type="button" aria-label="Capture photo">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M4 8h3l1.5-2h7L17 8h3v12H4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

const landing = document.querySelector<HTMLElement>('#landing')!;
const arStage = document.querySelector<HTMLElement>('#ar-stage')!;
const arContainer = document.querySelector<HTMLElement>('#ar-container')!;
const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const backBtn = document.querySelector<HTMLButtonElement>('#back-btn')!;
const cycleBtn = document.querySelector<HTMLButtonElement>('#cycle-btn')!;
const captureBtn = document.querySelector<HTMLButtonElement>('#capture-btn')!;
const intensity = document.querySelector<HTMLInputElement>('#intensity')!;
const effectRail = document.querySelector<HTMLElement>('#effect-rail')!;
const effectName = document.querySelector<HTMLElement>('#effect-name')!;
const effectDesc = document.querySelector<HTMLElement>('#effect-desc')!;
const arStatus = document.querySelector<HTMLElement>('#ar-status')!;
const scanRing = document.querySelector<HTMLElement>('#scan-ring')!;
const flash = document.querySelector<HTMLElement>('#flash')!;
const toast = document.querySelector<HTMLElement>('#toast')!;
const errorBanner = document.querySelector<HTMLElement>('#error-banner')!;
const loadingVeil = document.querySelector<HTMLElement>('#loading-veil')!;
const atmosphereCanvas = document.querySelector<HTMLCanvasElement>('#atmosphere')!;

const disposeAtmosphere = createAtmosphere(atmosphereCanvas);

let experience: ARExperience | null = null;
let toastTimer = 0;

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function setEffectUI(id: EffectId): void {
  const effect = EFFECTS.find((e) => e.id === id);
  if (!effect) return;
  effectName.textContent = effect.name;
  effectDesc.textContent = effect.description;
  effectRail.querySelectorAll('.effect-chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.getAttribute('data-id') === id);
  });
}

function renderEffectChips(): void {
  effectRail.innerHTML = EFFECTS.map(
    (effect, index) => `
      <button
        class="effect-chip${index === 0 ? ' is-active' : ''}"
        type="button"
        role="option"
        data-id="${effect.id}"
        aria-selected="${index === 0}"
      >${effect.name}</button>
    `,
  ).join('');
}

renderEffectChips();

effectRail.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.effect-chip');
  if (!target || !experience) return;
  const id = target.dataset.id as EffectId;
  experience.setEffect(id);
  setEffectUI(id);
});

intensity.addEventListener('input', () => {
  experience?.setIntensity(Number(intensity.value) / 100);
});

cycleBtn.addEventListener('click', () => {
  if (!experience) return;
  const id = experience.cycleEffect(1);
  setEffectUI(id);
});

captureBtn.addEventListener('click', () => {
  if (!experience) return;
  flash.classList.add('is-on');
  window.setTimeout(() => flash.classList.remove('is-on'), 120);

  const dataUrl = experience.capture();
  if (!dataUrl) {
    showToast('Capture unavailable');
    return;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `have-fun-${experience.currentEffect}-${Date.now()}.png`;
  link.click();
  showToast('Saved your transformation');
});

async function enterAR(): Promise<void> {
  errorBanner.classList.remove('is-visible');
  landing.classList.add('is-exiting');
  arStage.classList.add('is-active');
  arStage.setAttribute('aria-hidden', 'false');
  loadingVeil.classList.add('is-visible');
  scanRing.classList.add('is-visible');
  arStatus.textContent = 'Booting…';

  experience?.stop();
  experience = new ARExperience({
    container: arContainer,
    onStatus: (status) => {
      arStatus.textContent = status;
    },
    onTracking: (tracking) => {
      scanRing.classList.toggle('is-visible', !tracking);
    },
    onError: (message) => {
      errorBanner.textContent = message;
      errorBanner.classList.add('is-visible');
    },
  });

  try {
    await experience.start();
    experience.setEffect('neural');
    experience.setIntensity(Number(intensity.value) / 100);
    setEffectUI('neural');
  } catch {
    // error surfaced via onError
  } finally {
    loadingVeil.classList.remove('is-visible');
  }
}

function exitAR(): void {
  experience?.stop();
  experience = null;
  arContainer.replaceChildren();
  arStage.classList.remove('is-active');
  arStage.setAttribute('aria-hidden', 'true');
  landing.classList.remove('is-exiting');
  scanRing.classList.remove('is-visible');
  errorBanner.classList.remove('is-visible');
  loadingVeil.classList.remove('is-visible');
  arStatus.textContent = 'Idle';
}

startBtn.addEventListener('click', () => {
  void enterAR();
});

backBtn.addEventListener('click', () => {
  exitAR();
});

window.addEventListener('keydown', (event) => {
  if (!arStage.classList.contains('is-active') || !experience) return;
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault();
    setEffectUI(experience.cycleEffect(1));
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    setEffectUI(experience.cycleEffect(-1));
  } else if (event.key === 'Escape') {
    exitAR();
  }
});

window.addEventListener('beforeunload', () => {
  disposeAtmosphere();
  experience?.stop();
});
