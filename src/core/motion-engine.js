// Claude Prism — Damped Spring Physics Engine (compiles exact spring curves to CSS linear())
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const PRESETS = Object.freeze({
    snappy: { stiffness: 420, damping: 30, mass: 0.9 },
    bouncy: { stiffness: 380, damping: 20, mass: 1.0 },
    default: { stiffness: 380, damping: 26, mass: 1.0 },
    gentle: { stiffness: 260, damping: 26, mass: 1.05 },
    micro: { stiffness: 440, damping: 24, mass: 0.85 },
    indicator: { stiffness: 430, damping: 32, mass: 0.9 },
  });

  const curveCache = new Map();

  function prefersReducedMotion() {
    try {
      return Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    } catch {
      return false;
    }
  }

  function solveSpringLinear(presetName = 'default') {
    if (curveCache.has(presetName)) return curveCache.get(presetName);
    const p = PRESETS[presetName] || PRESETS.default;
    const k = p.stiffness;
    const c = p.damping;
    const m = p.mass;
    const dt = 1 / 120;
    let x = 0;
    let v = 0;
    let t = 0;
    const points = [0];
    const maxSteps = 240;

    for (let i = 1; i <= maxSteps; i++) {
      const a = (-k * (x - 1) - c * v) / m;
      v += a * dt;
      x += v * dt;
      t = i * dt;
      if (i % 3 === 0) points.push(Number(x.toFixed(4)));
      if (Math.abs(1 - x) < 0.0015 && Math.abs(v) < 0.008 && i > 12) break;
    }
    points.push(1);
    const durationMs = Math.round(Math.max(140, Math.min(900, t * 1000)));
    const easing = `linear(${points.join(', ')})`;
    const res = { easing, durationMs };
    curveCache.set(presetName, res);
    return res;
  }

  function applySpringVars() {
    if (typeof document === 'undefined') return;
    const supportsLinear = typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)');
    const rootStyle = document.documentElement.style;
    if (!supportsLinear) return;
    for (const key of ['snappy', 'bouncy', 'default', 'gentle', 'micro']) {
      const { easing, durationMs } = solveSpringLinear(key);
      rootStyle.setProperty(`--cp-spring-${key}`, easing);
      rootStyle.setProperty(`--cp-spring-${key}-ms`, `${durationMs}ms`);
    }
  }

  function getMotionTier(cfg) {
    if (prefersReducedMotion()) return 'off';
    const raw = cfg?.motionLevel || 'ultra';
    return ['off', 'subtle', 'standard', 'ultra'].includes(raw) ? raw : 'ultra';
  }

  CP.motion = {
    PRESETS,
    prefersReducedMotion,
    solveSpringLinear,
    applySpringVars,
    getMotionTier,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
