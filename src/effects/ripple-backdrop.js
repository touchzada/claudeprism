// Claude Prism — Silk Glyph Wavefield & Horizon Aurora Backdrop
// Features smooth multi-wave pointer ripples, prismatic crest glow, clean cutout around the composer
// (zero dots bleeding over typed text!), and strict 0fps idle sleep.
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const GLYPHS = '·.:+*◦∘∙▫▪';
  const PRISM_WAVE_COLORS = ['#669DF6', '#9B72CB', '#D97757', '#F6BD60'];

  function createRippleBackdropController({ isEnabled, isHomeScreen, getConfig, getComposerCard }) {
    let canvas = null;
    let ctx = null;
    let rafId = 0;
    let idleTimer = 0;
    let lastDrawAt = 0;
    let phase = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let destroyed = false;
    let lastRect = { left: 0, top: 0, width: 1280, height: 720 };
    const ripples = [];

    function measureMainBounds() {
      const main = document.querySelector('main');
      if (main) {
        const r = main.getBoundingClientRect();
        if (r.width >= 320 && r.height >= 240) {
          return {
            left: Math.round(r.left),
            top: Math.round(r.top),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
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
      }, 1500);
    }

    function drawFrame(ts) {
      rafId = 0;
      if (destroyed || !isEnabled() || !isHomeScreen() || document.hidden) {
        stopLoop(true);
        return;
      }
      if (ts - lastDrawAt < 28) {
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
      const palName = document.documentElement.getAttribute('data-cp-palette') || 'warm';
      const cs = getComputedStyle(document.documentElement);
      const inkColor = (cs.getPropertyValue('--cp-ripple-ink') || '#92949C').trim();
      const waveColor = (cs.getPropertyValue('--cp-ripple-wave') || '#D97757').trim();

      ctx.clearRect(0, 0, tw, th);

      // 1. Multi-stop horizon aurora ribbon gently breathing behind greeting
      const driftX = Math.sin(phase * 0.35) * tw * 0.04;
      const auroraGrad = ctx.createRadialGradient(
        tw * 0.5 + driftX, th * 0.27, tw * 0.02,
        tw * 0.5, th * 0.34, tw * 0.52
      );
      ctx.save();
      ctx.globalAlpha = ambient * (isDark ? 0.19 : 0.09);
      auroraGrad.addColorStop(0, waveColor);
      auroraGrad.addColorStop(0.38, palName === 'warm' || palName === 'alabaster' ? 'rgba(246, 189, 96, 0.22)' : 'rgba(155, 114, 203, 0.26)');
      auroraGrad.addColorStop(0.72, isDark ? 'rgba(66, 133, 244, 0.10)' : 'rgba(59, 130, 246, 0.06)');
      auroraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, tw, th);
      ctx.restore();

      // 2. Subtle pointer lantern bloom
      if (pointerX >= bounds.left && pointerX <= bounds.left + bounds.width && pointerY >= bounds.top) {
        const lx = (pointerX - bounds.left) * dpr;
        const ly = (pointerY - bounds.top) * dpr;
        const pGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 165 * dpr);
        ctx.save();
        ctx.globalAlpha = ambient * (isDark ? 0.13 : 0.06);
        pGrad.addColorStop(0, waveColor);
        pGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = pGrad;
        ctx.fillRect(0, 0, tw, th);
        ctx.restore();
      }

      // Advance active pointer ripples
      const now = performance.now();
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t > 1450) ripples.splice(i, 1);
      }

      // 3. Finer, silkier ASCII/glyph wavefield matrix
      const stepX = 22 * dpr;
      const stepY = 22 * dpr;
      const cols = Math.ceil(tw / stepX);
      const rows = Math.ceil(th / stepY);

      ctx.font = `${Math.round(10 * dpr)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const curLx = (pointerX - bounds.left) * dpr;
      const curLy = (pointerY - bounds.top) * dpr;

      for (let r = 0; r < rows; r++) {
        const y = (r + 0.5) * stepY;
        const ny = y / th;
        const edgeFade = Math.sin(Math.min(1, ny) * Math.PI);
        if (edgeFade < 0.05) continue;

        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * stepX;
          const nx = x / tw;
          const xFade = Math.sin(Math.min(1, nx) * Math.PI);
          const mask = edgeFade * Math.pow(xFade, 0.5);
          if (mask < 0.07) continue;

          // Two-harmonic organic breathing field
          const breath =
            0.5 +
            0.32 * Math.sin(phase * 0.72 + c * 0.18 + r * 0.15) +
            0.18 * Math.cos(phase * 0.45 - c * 0.12 + r * 0.21);

          let energy = 0;
          let colorSeed = 0;

          // Subtle proximity wake around cursor
          if (pointerX >= bounds.left) {
            const pDist = Math.hypot(x - curLx, y - curLy);
            if (pDist < 120 * dpr) {
              energy = Math.max(energy, (1 - pDist / (120 * dpr)) * 0.42);
            }
          }

          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const age = (now - rp.t) / 1000;
            const ringR = age * 390 * dpr;
            const lx = (rp.x - bounds.left) * dpr;
            const ly = (rp.y - bounds.top) * dpr;
            const dist = Math.hypot(x - lx, y - ly);
            const band = Math.abs(dist - ringR);
            if (band < 76 * dpr) {
              const e = (1 - band / (76 * dpr)) * Math.max(0, 1 - age / 1.45);
              if (e > energy) {
                energy = e;
                colorSeed = (k + Math.floor(dist / (48 * dpr))) % PRISM_WAVE_COLORS.length;
              }
            }
          }

          const baseAlpha = (isDark ? 0.105 : 0.085) * mask * (0.45 + 0.55 * breath) * ambient;
          const waveAlpha = energy * 0.72 * ambient;
          if (baseAlpha + waveAlpha < 0.016) continue;

          const gIdx = Math.min(
            GLYPHS.length - 1,
            Math.floor(((breath * 0.45 + energy * 1.15) % 1) * GLYPHS.length)
          );
          if (energy > 0.24) {
            ctx.fillStyle = palName === 'obsidian' ? PRISM_WAVE_COLORS[colorSeed] : waveColor;
          } else {
            ctx.fillStyle = inkColor;
          }
          ctx.globalAlpha = Math.min(0.82, baseAlpha + waveAlpha);
          ctx.fillText(GLYPHS[gIdx], x, y);
        }
      }
      ctx.globalAlpha = 1;

      // 4. Punch a clean cutout over the composer card so NO dots ever bleed over typed text!
      const card = typeof getComposerCard === 'function' ? getComposerCard() : null;
      if (card && card.isConnected) {
        const cr = card.getBoundingClientRect();
        if (cr.width > 40 && cr.height > 30) {
          const pad = 2 * dpr;
          const cx = (cr.left - bounds.left) * dpr - pad;
          const cy = (cr.top - bounds.top) * dpr - pad;
          const cw = cr.width * dpr + pad * 2;
          const ch = cr.height * dpr + pad * 2;
          const rad = (parseFloat(getComputedStyle(card).borderTopLeftRadius) || 20) * dpr;

          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(cx, cy, cw, ch, rad);
          } else {
            ctx.rect(cx, cy, cw, ch);
          }
          ctx.fill();
          ctx.restore();
        }
      }

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
      pointerX = ev.clientX;
      pointerY = ev.clientY;
      if (destroyed || !isEnabled() || !isHomeScreen()) return;
      if (ev.clientX < lastRect.left) return;
      const now = performance.now();
      if (now - lastSpawn < 85) return;
      lastSpawn = now;
      ripples.push({ x: ev.clientX, y: ev.clientY, t: now });
      if (ripples.length > 7) ripples.shift();
      wake();
    }

    function onPointerDown(ev) {
      if (destroyed || !isEnabled() || !isHomeScreen()) return;
      if (ev.clientX < lastRect.left) return;
      ripples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
      if (ripples.length > 7) ripples.shift();
      wake();
    }

    function onResize() { wake(); }

    function start() {
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerdown', onPointerDown, { passive: true });
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
      document.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('resize', onResize);
      stopLoop(true);
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
    }

    return { start, sync, destroy };
  }

  CP.createRippleBackdropController = createRippleBackdropController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
