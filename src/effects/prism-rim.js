// Claude Prism — React-Safe Fixed Overlay GPU Canvas Cursor-Reactive Prism Rim
// Mounts a single viewport-aligned canvas on document.body (ZERO DOM mutations inside claude.ai's React tree!)
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
    let canvas = null;
    let ctx = null;
    let rafId = 0;
    let idleTimer = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let destroyed = false;

    function resolveToneKey(cfg) {
      const accent = cfg.accentTone || 'follow';
      if (accent === 'terracotta') return 'warm';
      if (RIM_PALETTES[accent]) return accent;
      const pal = document.documentElement.getAttribute('data-cp-palette') || 'warm';
      return pal === 'warm' || pal === 'alabaster' ? 'warm' : 'default';
    }

    function ensureCanvas() {
      if (canvas && canvas.isConnected && ctx) return canvas;
      canvas = document.createElement('canvas');
      canvas.className = 'cp-prism-rim-overlay';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = 0;
      canvas.height = 0;
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      return canvas;
    }

    function shrink() {
      clearTimeout(idleTimer);
      idleTimer = 0;
      if (canvas && (canvas.width || canvas.height)) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    function armIdleShrink() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(shrink, 1800);
    }

    function draw() {
      rafId = 0;
      if (destroyed || !isEnabled() || document.hidden) {
        shrink();
        return;
      }
      const cfg = getConfig();
      const ambient = Math.max(0, Math.min(1, Number(cfg.ambientIntensity ?? 100) / 100));
      if (ambient <= 0.01) { shrink(); return; }

      const targets = getTargets().filter((el) => el && el.isConnected);
      if (targets.length === 0) { shrink(); return; }

      const isDark = document.documentElement.getAttribute('data-cp-mode') !== 'light';
      const toneKey = resolveToneKey(cfg);
      const stops = (RIM_PALETTES[toneKey] || RIM_PALETTES.warm)[isDark ? 'dark' : 'light'];
      const dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      const vw = root.innerWidth || 1280;
      const vh = root.innerHeight || 720;

      // Check if pointer is near any target before allocating canvas VRAM
      const litList = [];
      for (const host of targets) {
        const rect = host.getBoundingClientRect();
        if (rect.width < 24 || rect.height < 24) continue;
        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
        const localX = pointerX - rect.left;
        const localY = pointerY - rect.top;
        const dx = localX < 0 ? -localX : localX > rect.width ? localX - rect.width : 0;
        const dy = localY < 0 ? -localY : localY > rect.height ? localY - rect.height : 0;
        const dist = Math.hypot(dx, dy);
        if (dist <= 165) {
          litList.push({ host, rect, dist });
        }
      }

      if (litList.length === 0) {
        if (ctx && canvas && canvas.width > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        armIdleShrink();
        return;
      }

      clearTimeout(idleTimer);
      idleTimer = 0;

      const cv = ensureCanvas();
      if (!ctx) return;
      const tw = Math.max(4, Math.round(vw * dpr));
      const th = Math.max(4, Math.round(vh * dpr));
      if (cv.width !== tw || cv.height !== th) {
        cv.width = tw;
        cv.height = th;
      }
      ctx.clearRect(0, 0, tw, th);

      const gx = pointerX * dpr;
      const gy = pointerY * dpr;

      for (const item of litList) {
        const { host, rect, dist } = item;
        const cs = getComputedStyle(host);
        const radius = parseFloat(cs.borderTopLeftRadius) || 20;
        const strength = ambient * Math.max(0, 1 - dist / 165) * (toneKey === 'mono' ? 0.58 : 1);
        const gr = Math.max(125, Math.min(235, rect.width * 0.30)) * dpr;

        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        for (const [offset, color] of stops) grad.addColorStop(offset, color);

        const x = rect.left * dpr;
        const y = rect.top * dpr;
        const w = rect.width * dpr;
        const h = rect.height * dpr;
        const rr = Math.min(w * 0.5, h * 0.5, radius * dpr);

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rr);
        } else {
          ctx.rect(x, y, w, h);
        }

        // Pass 1: subtle chromatic border halo
        ctx.globalAlpha = Math.min(0.30, strength * (isDark ? 0.30 : 0.16));
        ctx.lineWidth = 3.4 * dpr;
        ctx.strokeStyle = grad;
        ctx.stroke();

        // Pass 2: razor-sharp specular hairline
        ctx.globalAlpha = Math.min(0.95, strength * (isDark ? 0.92 : 0.74));
        ctx.lineWidth = 1.45 * dpr;
        ctx.strokeStyle = grad;
        ctx.stroke();
        ctx.restore();
      }
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

    function onScrollOrResize() { schedule(); }

    function start() {
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave, { passive: true });
      document.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
      root.addEventListener('resize', onScrollOrResize, { passive: true });
      root.addEventListener('blur', onPointerLeave, { passive: true });
    }

    function sync() {
      if (!isEnabled()) shrink();
      else schedule();
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('scroll', onScrollOrResize, true);
      root.removeEventListener('resize', onScrollOrResize);
      root.removeEventListener('blur', onPointerLeave);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      shrink();
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
    }

    return { start, sync, destroy };
  }

  CP.createPrismRimController = createPrismRimController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
