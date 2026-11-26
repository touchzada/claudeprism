// Claude Prism — Ambient Character Ripple & Horizon Aurora Backdrop (blend-mode scoped to main canvas, 0fps idle)
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const GLYPHS = '·.:+*◦∘∙▫▪';

  function createRippleBackdropController({ isEnabled, isHomeScreen, getConfig }) {
    let canvas = null;
    let ctx = null;
    let rafId = 0;
    let idleTimer = 0;
    let lastDrawAt = 0;
    let phase = 0;
    let destroyed = false;
    let lastRect = { left: 0, top: 0, width: 1280, height: 720 };
    const ripples = [];

    function measureMainBounds() {
      const main = document.querySelector('main');
      if (main) {
        const r = main.getBoundingClientRect();
        if (r.width >= 320 && r.height >= 240) {
          return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
        }
      }
      return { left: 0, top: 0, width: root.innerWidth || 1280, height: root.innerHeight || 720 };
    }

    function ensureCanvas() {
      if (canvas && canvas.isConnected) return canvas;
      canvas = document.createElement('canvas');
      canvas.className = 'cp-ripple-backdrop';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = 0;
      canvas.height = 0;
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      return canvas;
    }

    function stopLoop(shrink = false) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      clearTimeout(idleTimer);
      idleTimer = 0;
      if (shrink && canvas) {
        canvas.removeAttribute('data-cp-active');
        if (canvas.width || canvas.height) {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    }

    function armIdleSleep() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      }, 1450);
    }

    function drawFrame(ts) {
      rafId = 0;
      if (destroyed || !isEnabled() || !isHomeScreen() || document.hidden) {
        stopLoop(true);
        return;
      }
      if (ts - lastDrawAt < 32) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      const dt = Math.min(0.08, (ts - (lastDrawAt || ts)) / 1000 || 0.033);
      lastDrawAt = ts;
      phase += dt;

      const cv = ensureCanvas();
      if (!ctx) return;

      const bounds = measureMainBounds();
      lastRect = bounds;
      cv.style.left = `${bounds.left}px`;
      cv.style.top = `${bounds.top}px`;
      cv.style.width = `${bounds.width}px`;
      cv.style.height = `${bounds.height}px`;

      const dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      const tw = Math.max(4, Math.round(bounds.width * dpr));
      const th = Math.max(4, Math.round(bounds.height * dpr));
      if (cv.width !== tw || cv.height !== th) {
        cv.width = tw;
        cv.height = th;
      }
      cv.setAttribute('data-cp-active', '1');

      const cfg = getConfig();
      const ambient = Math.max(0, Math.min(1, Number(cfg.ambientIntensity ?? 100) / 100));
      const isDark = document.documentElement.getAttribute('data-cp-mode') !== 'light';
      const cs = getComputedStyle(document.documentElement);
      const inkColor = (cs.getPropertyValue('--cp-ripple-ink') || '#92949C').trim();
      const waveColor = (cs.getPropertyValue('--cp-ripple-wave') || '#D97757').trim();

      ctx.clearRect(0, 0, tw, th);

      // Soft horizon aurora bloom centered behind greeting
      const auroraGrad = ctx.createRadialGradient(
        tw * 0.5, th * 0.24, tw * 0.03,
        tw * 0.5, th * 0.32, tw * 0.54
      );
      ctx.save();
      ctx.globalAlpha = ambient * (isDark ? 0.16 : 0.08);
      auroraGrad.addColorStop(0, waveColor);
      auroraGrad.addColorStop(0.5, isDark ? 'rgba(155, 114, 203, 0.22)' : 'rgba(99, 102, 241, 0.12)');
      auroraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, tw, th);
      ctx.restore();

      const now = performance.now();
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t > 1300) ripples.splice(i, 1);
      }

      const stepX = 32 * dpr;
      const stepY = 32 * dpr;
      const cols = Math.ceil(tw / stepX);
      const rows = Math.ceil(th / stepY);

      ctx.font = `${Math.round(11 * dpr)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r++) {
        const y = (r + 0.5) * stepY;
        const ny = y / th;
        const edgeFade = Math.sin(Math.min(1, ny) * Math.PI);
        if (edgeFade < 0.06) continue;

        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * stepX;
          const nx = x / tw;
          const xFade = Math.sin(Math.min(1, nx) * Math.PI);
          const mask = edgeFade * Math.pow(xFade, 0.55);
          if (mask < 0.08) continue;

          const breath = 0.5 + 0.5 * Math.sin(phase * 0.75 + c * 0.22 + r * 0.18);
          let energy = 0;

          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const age = (now - rp.t) / 1000;
            const ringR = age * 360 * dpr;
            const lx = (rp.x - bounds.left) * dpr;
            const ly = (rp.y - bounds.top) * dpr;
            const dist = Math.hypot(x - lx, y - ly);
            const band = Math.abs(dist - ringR);
            if (band < 70 * dpr) {
              const e = (1 - band / (70 * dpr)) * Math.max(0, 1 - age / 1.3);
              if (e > energy) energy = e;
            }
          }

          const baseAlpha = (isDark ? 0.11 : 0.095) * mask * (0.5 + 0.5 * breath) * ambient;
          const waveAlpha = energy * 0.62 * ambient;
          if (baseAlpha + waveAlpha < 0.015) continue;

          const gIdx = Math.min(
            GLYPHS.length - 1,
            Math.floor(((breath * 0.5 + energy * 1.1) % 1) * GLYPHS.length)
          );
          ctx.fillStyle = energy > 0.16 ? waveColor : inkColor;
          ctx.globalAlpha = Math.min(0.75, baseAlpha + waveAlpha);
          ctx.fillText(GLYPHS[gIdx], x, y);
        }
      }
      ctx.globalAlpha = 1;

      if (ripples.length > 0) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafId = requestAnimationFrame(drawFrame);
        armIdleSleep();
      }
    }

    function wake() {
      if (destroyed || !isEnabled() || !isHomeScreen() || document.hidden) {
        stopLoop(true);
        return;
      }
      clearTimeout(idleTimer);
      if (!rafId) rafId = requestAnimationFrame(drawFrame);
      armIdleSleep();
    }

    let lastSpawn = 0;
    function onPointerMove(ev) {
      if (destroyed || !isEnabled() || !isHomeScreen()) return;
      if (ev.clientX < lastRect.left) return;
      const now = performance.now();
      if (now - lastSpawn < 95) return;
      lastSpawn = now;
      ripples.push({ x: ev.clientX, y: ev.clientY, t: now });
      if (ripples.length > 6) ripples.shift();
      wake();
    }

    function onResize() { wake(); }

    function start() {
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      root.addEventListener('resize', onResize, { passive: true });
      wake();
    }

    function sync() {
      if (!isEnabled() || !isHomeScreen()) stopLoop(true);
      else wake();
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('resize', onResize);
      stopLoop(true);
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
    }

    return { start, sync, destroy };
  }

  CP.createRippleBackdropController = createRippleBackdropController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
