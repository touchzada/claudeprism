// Claude Prism — Zero-StyleRecalc GPU Canvas Cursor-Reactive Prism Rim
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const RIM_PALETTES = {
    warm: {
      dark: [[0, 'rgba(255,246,238,0.95)'], [0.26, '#F6BD60'], [0.54, '#F0A37E'], [0.82, '#D97757'], [1, 'rgba(217,119,87,0)']],
      light: [[0, '#9A3412'], [0.34, '#C25934'], [0.68, '#D97757'], [0.9, '#D97706'], [1, 'rgba(217,119,6,0)']],
    },
    default: {
      dark: [[0, 'rgba(255,255,255,0.96)'], [0.24, '#4285F4'], [0.5, '#9B72CB'], [0.74, '#EA4335'], [0.92, '#FBBC04'], [1, 'rgba(251,188,4,0)']],
      light: [[0, '#2563EB'], [0.32, '#7C3AED'], [0.64, '#EA4335'], [0.88, '#D97706'], [1, 'rgba(217,119,6,0)']],
    },
    cobalt: {
      dark: [[0, 'rgba(240,249,255,0.96)'], [0.26, '#7CE2FF'], [0.56, '#4285F4'], [0.86, '#1B49B2'], [1, 'rgba(27,73,178,0)']],
      light: [[0, '#1D4ED8'], [0.35, '#2563EB'], [0.7, '#0284C7'], [0.92, '#38BDF8'], [1, 'rgba(56,189,248,0)']],
    },
    iris: {
      dark: [[0, 'rgba(245,243,255,0.95)'], [0.26, '#DDD6FE'], [0.56, '#A58AF8'], [0.86, '#6D28D9'], [1, 'rgba(109,40,217,0)']],
      light: [[0, '#5B21B6'], [0.36, '#7C3AED'], [0.7, '#8B5CF6'], [0.92, '#A855F7'], [1, 'rgba(168,85,247,0)']],
    },
    amber: {
      dark: [[0, 'rgba(255,251,235,0.95)'], [0.26, '#FDE68A'], [0.56, '#F2B84B'], [0.86, '#D97706'], [1, 'rgba(217,119,6,0)']],
      light: [[0, '#92400E'], [0.36, '#B45309'], [0.7, '#D97706'], [0.92, '#F59E0B'], [1, 'rgba(245,158,11,0)']],
    },
    mono: {
      dark: [[0, 'rgba(248,250,252,0.92)'], [0.28, '#E2E8F0'], [0.6, '#94A3B8'], [0.88, '#64748B'], [1, 'rgba(100,116,139,0)']],
      light: [[0, '#1E293B'], [0.36, '#334155'], [0.7, '#64748B'], [0.92, '#94A3B8'], [1, 'rgba(148,163,184,0)']],
    },
  };

  function createPrismRimController({ isEnabled, getConfig, getTargets }) {
    let rafId = 0;
    let idleTimer = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let destroyed = false;
    const canvasMap = new WeakMap();
    const trackedCanvases = new Set();

    function resolveToneKey(cfg) {
      const accent = cfg.accentTone || 'follow';
      if (accent === 'terracotta') return 'warm';
      if (RIM_PALETTES[accent]) return accent;
      const pal = document.documentElement.getAttribute('data-cp-palette') || 'warm';
      return pal === 'warm' || pal === 'alabaster' ? 'warm' : 'default';
    }

    function ensureCanvas(host) {
      let rec = canvasMap.get(host);
      if (rec && rec.cv.isConnected && rec.cv.parentElement === host) return rec;
      const existing = host.querySelector(':scope > .cp-prism-rim-cv');
      const cv = existing || document.createElement('canvas');
      if (!existing) {
        cv.className = 'cp-prism-rim-cv';
        cv.setAttribute('aria-hidden', 'true');
        cv.width = 0;
        cv.height = 0;
        host.appendChild(cv);
      }
      const ctx = cv.getContext('2d');
      if (!ctx) { cv.remove(); return null; }
      rec = { cv, ctx, cleared: true };
      canvasMap.set(host, rec);
      trackedCanvases.add(cv);
      return rec;
    }

    function shrinkAll() {
      clearTimeout(idleTimer);
      idleTimer = 0;
      for (const cv of Array.from(trackedCanvases)) {
        if (!cv.isConnected) { trackedCanvases.delete(cv); continue; }
        if (cv.width || cv.height) { cv.width = 0; cv.height = 0; }
      }
    }

    function armIdleShrink() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(shrinkAll, 1800);
    }

    function draw() {
      rafId = 0;
      if (destroyed || !isEnabled() || document.hidden) {
        shrinkAll();
        return;
      }
      const cfg = getConfig();
      const ambient = Math.max(0, Math.min(1, Number(cfg.ambientIntensity ?? 100) / 100));
      if (ambient <= 0.01) { shrinkAll(); return; }

      const isDark = document.documentElement.getAttribute('data-cp-mode') !== 'light';
      const toneKey = resolveToneKey(cfg);
      const stops = (RIM_PALETTES[toneKey] || RIM_PALETTES.warm)[isDark ? 'dark' : 'light'];
      const dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      const targets = getTargets();
      let anyLit = false;

      for (const host of targets) {
        if (!host || !host.isConnected) continue;
        const rect = host.getBoundingClientRect();
        if (rect.width < 24 || rect.height < 24) continue;
        const localX = pointerX - rect.left;
        const localY = pointerY - rect.top;
        const dx = localX < 0 ? -localX : localX > rect.width ? localX - rect.width : 0;
        const dy = localY < 0 ? -localY : localY > rect.height ? localY - rect.height : 0;
        const dist = Math.hypot(dx, dy);

        const rec = ensureCanvas(host);
        if (!rec) continue;

        if (dist > 150) {
          if (!rec.cleared && rec.cv.width > 0) {
            rec.ctx.clearRect(0, 0, rec.cv.width, rec.cv.height);
            rec.cleared = true;
          }
          continue;
        }

        anyLit = true;
        const w = Math.max(4, Math.round((rect.width + 2) * dpr));
        const h = Math.max(4, Math.round((rect.height + 2) * dpr));
        if (rec.cv.width !== w || rec.cv.height !== h) {
          rec.cv.width = w;
          rec.cv.height = h;
        }
        const ctx = rec.ctx;
        ctx.clearRect(0, 0, w, h);

        const cs = getComputedStyle(host);
        const radius = parseFloat(cs.borderTopLeftRadius) || 18;
        const strength = ambient * Math.max(0, 1 - dist / 150) * (toneKey === 'mono' ? 0.58 : 1);
        const gx = (localX + 1) * dpr;
        const gy = (localY + 1) * dpr;
        const gr = Math.max(110, Math.min(210, rect.width * 0.28)) * dpr;

        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        for (const [offset, color] of stops) grad.addColorStop(offset, color);

        // Razor-sharp hairline specular rim ONLY (no muddy full-card fill!)
        const inset = 0.85 * dpr;
        const rr = Math.min((w - inset * 2) * 0.5, (h - inset * 2) * 0.5, radius * dpr);

        ctx.save();
        ctx.globalAlpha = Math.min(0.92, strength * (isDark ? 0.86 : 0.68));
        ctx.lineWidth = 1.35 * dpr;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, rr);
        } else {
          ctx.rect(inset, inset, w - inset * 2, h - inset * 2);
        }
        ctx.stroke();
        ctx.restore();
        rec.cleared = false;
      }

      if (!anyLit) armIdleShrink();
      else { clearTimeout(idleTimer); idleTimer = 0; }
    }

    function schedule() {
      if (destroyed || !isEnabled()) return;
      if (!rafId) rafId = requestAnimationFrame(draw);
    }

    function onPointerMove(ev) {
      pointerX = ev.clientX;
      pointerY = ev.clientY;
      schedule();
    }

    function onPointerLeave() {
      pointerX = -9999;
      pointerY = -9999;
      schedule();
    }

    function start() {
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave, { passive: true });
      root.addEventListener('blur', onPointerLeave, { passive: true });
    }

    function sync() {
      if (!isEnabled()) shrinkAll();
      else schedule();
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('blur', onPointerLeave);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      shrinkAll();
      for (const cv of Array.from(trackedCanvases)) cv.remove();
      trackedCanvases.clear();
    }

    return { start, sync, destroy };
  }

  CP.createPrismRimController = createPrismRimController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
