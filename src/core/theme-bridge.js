// Claude Prism — Adaptive Theme Bridge (handles HSL triplets, full colors, nested [data-mode]/[data-theme])
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const STYLE_ID = 'cp-dynamic-theme-tokens';

  const PALETTES = Object.freeze({
    warm: Object.freeze({
      mode: 'dark',
      bg000: '#10100F', // sidebar / deepest chrome
      bg100: '#141413', // main canvas
      bg200: '#1B1A18', // raised card / composer
      bg300: '#23201D', // hover / secondary surface
      bg400: '#2B2723', // active / elevated chip
      bg500: '#35302B',
      text000: '#FAF7F2',
      text100: '#F2EFE9',
      text200: '#CEC8BC',
      text300: '#A39E93',
      text400: '#7D786E',
      text500: '#646058',
      border100: 'rgba(245, 240, 230, 0.085)',
      border200: 'rgba(245, 240, 230, 0.135)',
      border300: 'rgba(245, 240, 230, 0.20)',
      accent: '#D97757',
      accentSoft: '#E59377',
      accentGlow: 'rgba(217, 119, 87, 0.45)',
      specular: 'rgba(255, 248, 236, 0.095)',
      rippleInk: '#B4AEA2',
      rippleWave: '#D97757',
    }),
    obsidian: Object.freeze({
      mode: 'dark',
      bg000: '#09090B',
      bg100: '#0E0E11',
      bg200: '#141418',
      bg300: '#1C1C22',
      bg400: '#232530',
      bg500: '#2D3040',
      text000: '#FFFFFF',
      text100: '#F2F2F5',
      text200: '#C4C4CE',
      text300: '#8A8A98',
      text400: '#686878',
      text500: '#525260',
      border100: 'rgba(218, 228, 255, 0.068)',
      border200: 'rgba(218, 228, 255, 0.115)',
      border300: 'rgba(218, 228, 255, 0.18)',
      accent: '#669DF6',
      accentSoft: '#8AB4F8',
      accentGlow: 'rgba(92, 198, 252, 0.45)',
      specular: 'rgba(255, 255, 255, 0.095)',
      rippleInk: '#92949C',
      rippleWave: '#669DF6',
    }),
    crystal: Object.freeze({
      mode: 'light',
      bg000: '#E8EEF6',
      bg100: '#F4F7FB',
      bg200: '#FFFFFF',
      bg300: '#ECF1F9',
      bg400: '#E1E9F5',
      bg500: '#D2DFEF',
      text000: '#081020',
      text100: '#0F172A',
      text200: '#334155',
      text300: '#4B5B73',
      text400: '#64748B',
      text500: '#8192AA',
      border100: 'rgba(15, 23, 42, 0.10)',
      border200: 'rgba(15, 23, 42, 0.15)',
      border300: 'rgba(15, 23, 42, 0.22)',
      accent: '#2563EB',
      accentSoft: '#3B82F6',
      accentGlow: 'rgba(37, 99, 235, 0.32)',
      specular: 'rgba(255, 255, 255, 0.94)',
      rippleInk: '#556682',
      rippleWave: '#2563EB',
    }),
    alabaster: Object.freeze({
      mode: 'light',
      bg000: '#EBE6DC',
      bg100: '#F6F4EE',
      bg200: '#FFFFFF',
      bg300: '#F1EEE6',
      bg400: '#E8E2D6',
      bg500: '#DDD5C7',
      text000: '#14110E',
      text100: '#1C1814',
      text200: '#3F3830',
      text300: '#574F45',
      text400: '#6E6458',
      text500: '#8A7E70',
      border100: 'rgba(42, 32, 20, 0.105)',
      border200: 'rgba(42, 32, 20, 0.155)',
      border300: 'rgba(42, 32, 20, 0.225)',
      accent: '#C25934',
      accentSoft: '#D97757',
      accentGlow: 'rgba(194, 89, 52, 0.30)',
      specular: 'rgba(255, 255, 255, 0.94)',
      rippleInk: '#665C4E',
      rippleWave: '#C25934',
    }),
  });

  const ACCENTS = Object.freeze({
    terracotta: { dark: '#D97757', light: '#C25934', soft: '#E59377', glow: 'rgba(217, 119, 87, 0.52)' },
    cobalt: { dark: '#669DF6', light: '#2563EB', soft: '#7CE2FF', glow: 'rgba(92, 198, 252, 0.52)' },
    iris: { dark: '#A58AF8', light: '#7C3AED', soft: '#C4B5FD', glow: 'rgba(155, 114, 203, 0.52)' },
    amber: { dark: '#F2B84B', light: '#D97706', soft: '#FDE68A', glow: 'rgba(242, 184, 75, 0.52)' },
    mono: { dark: '#E2E8F0', light: '#334155', soft: '#CBD5E1', glow: 'rgba(203, 213, 225, 0.42)' },
  });

  function hexToHslTriplet(hex) {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return null;
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
  }

  let detectedTokenFormat = null;

  function detectHostTokenFormat() {
    if (detectedTokenFormat) return detectedTokenFormat;
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return 'hsl-triplet';
    const probes = [
      document.documentElement,
      document.body,
      typeof document.querySelector === 'function' ? document.querySelector('[data-mode], [data-theme]') : null,
    ];
    for (const el of probes) {
      if (!el) continue;
      const val = (getComputedStyle(el).getPropertyValue('--bg-100') || '').trim();
      if (!val) continue;
      if (/^\d+(?:\.\d+)?(?:\s+|,\s*)\d+(?:\.\d+)?%(?:\s+|,\s*)\d+(?:\.\d+)?%/.test(val)) {
        detectedTokenFormat = 'hsl-triplet';
        return detectedTokenFormat;
      }
      if (/^(?:#|rgb|hsl|oklch|color)/i.test(val)) {
        detectedTokenFormat = 'color';
        return detectedTokenFormat;
      }
    }
    detectedTokenFormat = 'hsl-triplet';
    return detectedTokenFormat;
  }

  function detectHostLightMode() {
    if (typeof document === 'undefined') return false;
    const html = document.documentElement;
    const body = document.body;
    const mode = html.getAttribute('data-mode') || html.getAttribute('data-theme') || body?.getAttribute('data-mode') || '';
    if (mode === 'light') return true;
    if (mode === 'dark') return false;
    if (html.classList.contains('light') || body?.classList.contains('light')) return true;
    if (html.classList.contains('dark') || body?.classList.contains('dark')) return false;
    try {
      return Boolean(root.matchMedia?.('(prefers-color-scheme: light)')?.matches);
    } catch {
      return false;
    }
  }

  function resolveEffectivePaletteName(cfg) {
    const p = cfg.palette || 'warm';
    if (p === 'auto') {
      return detectHostLightMode() ? (cfg.lightPalette || 'alabaster') : (cfg.darkPalette || 'warm');
    }
    return PALETTES[p] ? p : 'warm';
  }

  function resolveAccent(cfg, paletteObj) {
    const tone = cfg.accentTone || 'follow';
    const palName = resolveEffectivePaletteName(cfg);
    if (tone === 'follow' || !ACCENTS[tone]) {
      return {
        main: paletteObj.accent,
        soft: paletteObj.accentSoft,
        glow: paletteObj.accentGlow,
        toneKey: palName === 'warm' || palName === 'alabaster' ? 'warm' : 'default',
      };
    }
    const spec = ACCENTS[tone];
    return {
      main: paletteObj.mode === 'light' ? spec.light : spec.dark,
      soft: spec.soft,
      glow: spec.glow,
      toneKey: tone === 'terracotta' ? 'warm' : tone,
    };
  }

  function upsertStyleOverride(cssText) {
    if (typeof document === 'undefined' || !document.head) return;
    let el = document.getElementById(STYLE_ID);
    if (!cssText) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    if (el.textContent !== cssText) el.textContent = cssText;
  }

  function applyTheme(cfg) {
    if (typeof document === 'undefined') return null;
    const html = document.documentElement;
    if (!cfg || !cfg.enabled) {
      clearTheme();
      return null;
    }

    const fmt = detectHostTokenFormat();
    const palName = resolveEffectivePaletteName(cfg);
    const pal = PALETTES[palName] || PALETTES.warm;
    const accent = resolveAccent(cfg, pal);

    html.setAttribute('data-cp-enabled', '1');
    html.setAttribute('data-cp-palette', palName);
    html.setAttribute('data-cp-mode', pal.mode);
    html.setAttribute('data-cp-corners', cfg.cornerStyle || 'balanced');
    html.setAttribute('data-cp-motion', cfg.motionLevel || 'ultra');
    html.setAttribute('data-cp-accent', cfg.accentTone || 'follow');

    const s = html.style;
    const ambientMul = Math.max(0, Math.min(1, Number(cfg.ambientIntensity ?? 100) / 100));
    s.setProperty('--cp-ambient-mul', String(ambientMul));
    s.setProperty('--cp-bg-0', pal.bg000);
    s.setProperty('--cp-bg-1', pal.bg100);
    s.setProperty('--cp-bg-2', pal.bg200);
    s.setProperty('--cp-bg-3', pal.bg300);
    s.setProperty('--cp-bg-4', pal.bg400);
    s.setProperty('--cp-text-0', pal.text000);
    s.setProperty('--cp-text-1', pal.text100);
    s.setProperty('--cp-text-2', pal.text200);
    s.setProperty('--cp-text-3', pal.text300);
    s.setProperty('--cp-border-1', pal.border100);
    s.setProperty('--cp-border-2', pal.border200);
    s.setProperty('--cp-border-3', pal.border300);
    s.setProperty('--cp-accent', accent.main);
    s.setProperty('--cp-accent-soft', accent.soft);
    s.setProperty('--cp-accent-glow', accent.glow);
    s.setProperty('--cp-specular', pal.specular);
    s.setProperty('--cp-ripple-ink', pal.rippleInk);
    s.setProperty('--cp-ripple-wave', pal.rippleWave);

    const fmtVal = (hex) => (fmt === 'hsl-triplet' ? hexToHslTriplet(hex) : hex);
    const hostVars = {
      '--bg-000': fmtVal(pal.bg000),
      '--bg-100': fmtVal(pal.bg100),
      '--bg-200': fmtVal(pal.bg200),
      '--bg-300': fmtVal(pal.bg300),
      '--bg-400': fmtVal(pal.bg400),
      '--bg-500': fmtVal(pal.bg500),
      '--text-000': fmtVal(pal.text000),
      '--text-100': fmtVal(pal.text100),
      '--text-200': fmtVal(pal.text200),
      '--text-300': fmtVal(pal.text300),
      '--text-400': fmtVal(pal.text400),
      '--text-500': fmtVal(pal.text500),
      '--accent-main-000': fmtVal(accent.main),
      '--accent-main-100': fmtVal(accent.main),
      '--accent-main-200': fmtVal(accent.soft),
    };

    const decls = [];
    for (const [k, v] of Object.entries(hostVars)) {
      if (!v) continue;
      s.setProperty(k, v);
      decls.push(`${k}:${v} !important;`);
    }

    // Inject high-specificity token override so nested [data-mode]/[data-theme] wrappers inherit our palette
    upsertStyleOverride(
      `html[data-cp-enabled="1"],` +
      `html[data-cp-enabled="1"] body,` +
      `html[data-cp-enabled="1"] [data-mode],` +
      `html[data-cp-enabled="1"] [data-theme]{` +
      `color-scheme:${pal.mode} !important;${decls.join('')}` +
      `}`
    );

    return { palName, pal, accent, fmt };
  }

  function clearTheme() {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    for (const attr of ['data-cp-enabled', 'data-cp-palette', 'data-cp-mode', 'data-cp-corners', 'data-cp-motion', 'data-cp-accent']) {
      html.removeAttribute(attr);
    }
    const s = html.style;
    for (const prop of Array.from(s)) {
      if (prop.startsWith('--cp-') || prop.startsWith('--bg-') || prop.startsWith('--text-') || prop.startsWith('--accent-main-')) {
        s.removeProperty(prop);
      }
    }
    upsertStyleOverride('');
  }

  CP.theme = {
    PALETTES,
    ACCENTS,
    hexToHslTriplet,
    detectHostLightMode,
    resolveEffectivePaletteName,
    resolveAccent,
    applyTheme,
    clearTheme,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
