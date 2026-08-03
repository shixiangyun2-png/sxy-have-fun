/** Soft morphing particle field for the landing atmosphere. */
export function createAtmosphere(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let raf = 0;
  let running = true;

  type Particle = {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    hue: number;
    alpha: number;
  };

  const particles: Particle[] = [];

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spawn = (count: number) => {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.2 + Math.random() * 3.4,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.12 - Math.random() * 0.35,
        hue: Math.random() > 0.55 ? 158 : 28,
        alpha: 0.15 + Math.random() * 0.45,
      });
    }
  };

  const drawFaceSilhouette = (t: number) => {
    const cx = width * 0.68;
    const cy = height * 0.38;
    const scale = Math.min(width, height) * 0.28;
    const breathe = 1 + Math.sin(t * 0.0012) * 0.02;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breathe, breathe);

    const grad = ctx.createRadialGradient(0, 0, scale * 0.1, 0, 0, scale * 1.35);
    grad.addColorStop(0, 'rgba(46, 230, 168, 0.22)');
    grad.addColorStop(0.45, 'rgba(240, 163, 90, 0.1)');
    grad.addColorStop(1, 'rgba(6, 16, 24, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 0.95, scale * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(232, 244, 242, 0.18)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(0, 0.05 * scale, scale * 0.55, scale * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Mesh lattice suggestion
    ctx.strokeStyle = 'rgba(46, 230, 168, 0.16)';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * scale * 0.14, -scale * 0.65);
      ctx.quadraticCurveTo(i * scale * 0.08, 0, i * scale * 0.12, scale * 0.7);
      ctx.stroke();
    }
    for (let j = -4; j <= 4; j++) {
      ctx.beginPath();
      ctx.moveTo(-scale * 0.5, j * scale * 0.14);
      ctx.quadraticCurveTo(0, j * scale * 0.1 + Math.sin(t * 0.001 + j) * 4, scale * 0.5, j * scale * 0.14);
      ctx.stroke();
    }

    ctx.restore();
  };

  const frame = (t: number) => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    drawFaceSilhouette(t);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  };

  resize();
  spawn(Math.floor((width * height) / 18000) + 28);
  raf = requestAnimationFrame(frame);

  const onResize = () => {
    resize();
  };
  window.addEventListener('resize', onResize);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}
