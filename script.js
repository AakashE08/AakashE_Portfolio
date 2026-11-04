(() => {
  'use strict';

  // Fire effect settings, matching the design's defaults.
  const INTENSITY = 1;
  const TRAIL = true;
  const HOVER_EMBERS = true;
  const CURSOR_GLOW = true;

  const $ = (id) => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Experience toggle ---------- */
  const exp = $('exp');
  const expDetails = $('exp-details');
  const expSign = $('exp-sign');

  function toggleExp() {
    const open = expDetails.hidden;
    expDetails.hidden = !open;
    expSign.textContent = open ? '−' : '+';
    exp.setAttribute('aria-expanded', String(open));
  }

  exp.addEventListener('click', toggleExp);
  exp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExp();
    }
  });

  /* ---------- Scroll reveal ---------- */
  function setupReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.opacity = '1';
        el.style.filter = 'blur(0)';
        el.style.translate = '0 0';
        io.unobserve(el);
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('[data-reveal]').forEach((el, i) => {
      const delay = Math.min(i, 6) * 0.06;
      // Keep any hover transition the element already has in the stylesheet.
      const cs = getComputedStyle(el);
      const own = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ? `, ${cs.transition}` : '';
      el.style.transition = `opacity .6s ease ${delay}s, filter .6s ease ${delay}s, translate .6s ease ${delay}s${own}`;
      el.style.opacity = '0';
      el.style.filter = 'blur(6px)';
      el.style.translate = '0 10px';
      io.observe(el);
    });
  }

  /* ---------- Fire particles ---------- */
  const canvas = $('fire');
  const ctx = canvas.getContext('2d');
  let parts = [];
  let last = null;
  let lastEl = null;

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function spark(x, y, sp, up) {
    const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
    const v = sp * (0.4 + Math.random());
    const life = 30 + Math.random() * 45;
    parts.push({ t: 's', x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up ? 0 : 1.2), life, max: life, w: 0.8 + Math.random() * 1.6 });
  }

  function ember(x, y, s) {
    const life = 50 + Math.random() * 70;
    parts.push({ t: 'e', x, y, vx: (Math.random() - 0.5) * 1.2, vy: -0.4 - Math.random() * 1.4, life, max: life, r: (1 + Math.random() * 2.2) * (s || 1) });
  }

  function burst(x, y, scale) {
    const k = INTENSITY * scale;
    for (let i = 0; i < 48 * k; i++) spark(x, y, 6.5);
    for (let i = 0; i < 16 * k; i++) ember(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16);
    parts.push({ t: 'r', x, y, r: 2, R: 46 + 30 * k, life: 26, max: 26 });
    parts.push({ t: 'f', x, y, life: 10, max: 10 });
  }

  function move(e) {
    const x = e.clientX, y = e.clientY, k = INTENSITY;
    const sp = last ? Math.hypot(x - last.x, y - last.y) : 0;
    last = { x, y };
    if (TRAIL && sp > 3 && Math.random() < 0.55 * k) ember(x, y, 0.6);
    const el = e.target && e.target.closest ? e.target.closest('[data-fire]') : null;
    if (el !== lastEl) {
      if (lastEl) lastEl.style.filter = '';
      if (el && CURSOR_GLOW) el.style.filter = 'drop-shadow(0 0 10px rgba(255,70,15,0.55)) drop-shadow(0 0 2px rgba(255,130,40,0.75))';
    }
    if (HOVER_EMBERS) {
      if (el && el !== lastEl) for (let i = 0; i < 12 * k; i++) spark(x, y, 3, true);
      if (el && Math.random() < 0.5 * k) spark(x, y, 2, true);
    }
    lastEl = el;
  }

  function col(t, a) {
    const S = [[150, 25, 5], [235, 70, 15], [255, 140, 35], [255, 205, 110], [255, 248, 225]];
    const f = Math.max(0, Math.min(0.999, t)) * (S.length - 1), i = Math.floor(f), m = f - i;
    const c = S[i].map((v, j) => Math.round(v + (S[i + 1][j] - v) * m));
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function draw() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    if (introActive) glowIntro();
    if (last && CURSOR_GLOW) {
      const { x, y } = last, fl = 0.8 + Math.random() * 0.2, R = 110 * (0.95 + Math.random() * 0.05);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,120,40,${0.32 * fl})`);
      g.addColorStop(0.25, `rgba(230,55,15,${0.16 * fl})`);
      g.addColorStop(1, 'rgba(150,20,5,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
    }
    if (!parts.length) return;
    ctx.lineCap = 'round';
    const next = [];
    for (const p of parts) {
      p.life--;
      if (p.life <= 0) continue;
      const t = p.life / p.max;
      if (p.t === 's') {
        p.px = p.x; p.py = p.y;
        p.vx *= 0.965; p.vy = p.vy * 0.965 + 0.13;
        p.x += p.vx; p.y += p.vy;
        const fl = 0.65 + Math.random() * 0.35;
        ctx.strokeStyle = col(t, t * fl);
        ctx.lineWidth = p.w * (0.5 + t);
        ctx.beginPath(); ctx.moveTo(p.px - p.vx, p.py - p.vy); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else if (p.t === 'e') {
        p.vx += (Math.random() - 0.5) * 0.18; p.vx *= 0.98;
        p.vy = p.vy * 0.99 - 0.012;
        p.x += p.vx; p.y += p.vy;
        const fl = 0.55 + Math.random() * 0.45, r = p.r * (0.4 + t * 0.8);
        ctx.fillStyle = col(t * 0.85, 0.12 * t * fl);
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = col(t, t * fl);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
      } else if (p.t === 'r') {
        p.r += (p.R - p.r) * 0.16;
        ctx.strokeStyle = col(t * 0.8, 0.55 * t);
        ctx.lineWidth = 1.5 * t + 0.3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
      } else if (p.t === 'f') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 60);
        g.addColorStop(0, col(0.95, 0.5 * t));
        g.addColorStop(1, 'rgba(255,80,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 60, 0, 6.283); ctx.fill();
      }
      next.push(p);
    }
    parts = next.length > 1500 ? next.slice(-1500) : next;
  }

  /* ---------- Intro ---------- */
  const intro = $('intro');
  const introQuote = $('intro-quote');
  const introTag = $('intro-tag');
  let introActive = false;
  let introStart = 0;
  let timers = [];

  function runIntro() {
    introActive = true;
    introStart = performance.now();
    document.body.style.overflow = 'hidden';
    const show = (el, t) => timers.push(setTimeout(() => {
      el.style.opacity = '1';
      el.style.filter = 'blur(0)';
      el.style.transform = 'none';
    }, t));
    show($('intro-avatar'), 200);
    show($('intro-name'), 900);
    show(introQuote, 1700);
    show(introTag, 2600);
    timers.push(setTimeout(exitIntro, 5600));
  }

  function exitIntro() {
    if (!introActive) return;
    introActive = false;
    timers.forEach(clearTimeout);
    timers = [];
    intro.style.opacity = '0';
    intro.style.filter = 'blur(10px)';
    intro.style.transform = 'scale(1.04)';
    intro.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    setupReveal();
    timers.push(setTimeout(() => intro.remove(), 950));
  }

  function glowIntro() {
    const f = 0.75 + Math.random() * 0.25;
    const sh = `0 0 ${4 * f}px rgba(255,200,120,0.9), 0 0 ${12 * f}px rgba(255,120,30,0.8), 0 0 ${26 * f}px rgba(230,50,10,0.6), 0 0 ${48 * f}px rgba(160,20,5,0.45)`;
    introQuote.style.textShadow = sh;
    introTag.style.textShadow = sh;
    if (performance.now() - introStart > 1900 && Math.random() < 0.6 * INTENSITY) {
      const r = introQuote.getBoundingClientRect();
      ember(r.left + Math.random() * r.width, r.top + r.height * (0.3 + Math.random() * 0.6), 0.8);
    }
  }

  intro.addEventListener('click', () => {
    if (performance.now() - introStart > 1200) exitIntro();
  });

  /* ---------- Start ---------- */
  if (reducedMotion) {
    // No intro, reveal or particles for visitors who ask for less motion.
    intro.remove();
    canvas.remove();
    return;
  }

  resize();
  addEventListener('resize', resize);
  addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY, 1));
  addEventListener('pointermove', move);
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) last = null; });

  const loop = () => { draw(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  runIntro();
})();
