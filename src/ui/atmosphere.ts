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
    const isNarrow = width < 720;
    const cx = isNarrow ? width * 0.5 : width * 0.7;
    const cy = isNarrow ? height * 0.32 : height * 0.4;
    const scale = Math.min(width, height) * (isNarrow ? 0.38 : 0.42);
    const breathe = 1 + Math.sin(t * 0.0012) * 0.025;
    const sweep = (t * 0.00035) % 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breathe, breathe);

    const grad = ctx.createRadialGradient(0, -scale * 0.1, scale * 0.08, 0, 0, scale * 1.45);
    grad.addColorStop(0, 'rgba(46, 230, 168, 0.38)');
    grad.addColorStop(0.4, 'rgba(240, 163, 90, 0.16)');
    grad.addColorStop(1, 'rgba(6, 16, 24, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 1.05, scale * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face outline
    ctx.strokeStyle = 'rgba(232, 244, 242, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0.04 * scale, scale * 0.58, scale * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Mesh lattice
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const alpha = 0.12 + (1 - Math.abs(i) / 4) * 0.28;
      ctx.strokeStyle = `rgba(46, 230, 168, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(i * scale * 0.12, -scale * 0.72);
      ctx.quadraticCurveTo(i * scale * 0.06, 0, i * scale * 0.11, scale * 0.78);
      ctx.stroke();
    }
    for (let j = -5; j <= 5; j++) {
      const wobble = Math.sin(t * 0.001 + j * 0.7) * 6;
      ctx.strokeStyle = `rgba(232, 244, 242, ${0.08 + (1 - Math.abs(j) / 5) * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(-scale * 0.55, j * scale * 0.12);
      ctx.quadraticCurveTo(0, j * scale * 0.09 + wobble, scale * 0.55, j * scale * 0.12);
      ctx.stroke();
    }

    // Scanning highlight across the mesh
    const scanY = -scale * 0.7 + sweep * scale * 1.5;
    const scanGrad = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
    scanGrad.addColorStop(0, 'rgba(46, 230, 168, 0)');
    scanGrad.addColorStop(0.5, 'rgba(46, 230, 168, 0.35)');
    scanGrad.addColorStop(1, 'rgba(46, 230, 168, 0)');
    ctx.fillStyle = scanGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0.04 * scale, scale * 0.56, scale * 0.76, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillRect(-scale, scanY - 18, scale * 2, 36);

    // Feature nodes
    const nodes: Array<[number, number]> = [
      [-0.22, -0.12],
      [0.22, -0.12],
      [0, 0.05],
      [-0.16, 0.32],
      [0.16, 0.32],
      [0, 0.42],
    ];
    for (const [nx, ny] of nodes) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(240, 163, 90, 0.85)';
      ctx.arc(nx * scale, ny * scale, 2.4, 0, Math.PI * 2);
      ctx.fill();
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
