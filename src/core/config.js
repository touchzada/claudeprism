// Claude Prism — Configuration Store, Presets & Live Broadcast
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const STORAGE_KEY = 'claudePrismConfigV1';

  const DEFAULTS = Object.freeze({
    enabled: true,
    palette: 'warm',           // 'warm' | 'obsidian' | 'crystal' | 'alabaster' | 'auto'
    darkPalette: 'warm',       // used when palette === 'auto' and Claude is dark
    lightPalette: 'alabaster', // used when palette === 'auto' and Claude is light
    accentTone: 'follow',      // 'follow' | 'terracotta' | 'cobalt' | 'iris' | 'amber' | 'mono'
    cornerStyle: 'balanced',   // 'sharp' | 'balanced' | 'soft'
    motionLevel: 'ultra',      // 'off' | 'subtle' | 'standard' | 'ultra'
    ambientIntensity: 100,     // 0..100
    smoothCaret: true,
    inkStream: true,
    prismRim: true,
    homeRipple: true,
    contextVial: true,
    turnNav: true,
    codeFold: true,
    mascotMode: 'dual',        // 'off' | 'clawd' | 'dual' | 'quad' | 'quad-minis'
    semanticCue: true,
  });

  const SCENE_PRESETS = Object.freeze({
    ultra: Object.freeze({
      motionLevel: 'ultra',
      ambientIntensity: 100,
      smoothCaret: true,
      inkStream: true,
      prismRim: true,
      homeRipple: true,
      contextVial: true,
      mascotMode: 'dual',
      semanticCue: true,
    }),
    focus: Object.freeze({
      motionLevel: 'subtle',
      ambientIntensity: 35,
      smoothCaret: true,
      inkStream: true,
      prismRim: false,
      homeRipple: false,
      contextVial: true,
      mascotMode: 'off',
      semanticCue: true,
    }),
    eco: Object.freeze({
      motionLevel: 'off',
      ambientIntensity: 0,
      smoothCaret: false,
      inkStream: false,
      prismRim: false,
      homeRipple: false,
      contextVial: false,
      mascotMode: 'off',
      semanticCue: false,
    }),
  });

  const VALID = {
    palette: new Set(['warm', 'obsidian', 'crystal', 'alabaster', 'auto']),
    darkPalette: new Set(['warm', 'obsidian']),
    lightPalette: new Set(['crystal', 'alabaster']),
    accentTone: new Set(['follow', 'terracotta', 'cobalt', 'iris', 'amber', 'mono']),
    cornerStyle: new Set(['sharp', 'balanced', 'soft']),
    motionLevel: new Set(['off', 'subtle', 'standard', 'ultra']),
    mascotMode: new Set(['off', 'clawd', 'dual', 'quad', 'quad-minis']),
  };

  function sanitizeConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = { ...DEFAULTS };
    for (const [k, defVal] of Object.entries(DEFAULTS)) {
      if (!(k in src)) continue;
      const v = src[k];
      if (typeof defVal === 'boolean') {
        out[k] = Boolean(v);
      } else if (typeof defVal === 'number') {
        const n = Number(v);
        if (Number.isFinite(n)) out[k] = Math.max(0, Math.min(100, Math.round(n)));
      } else if (VALID[k]) {
        if (typeof v === 'string' && VALID[k].has(v)) out[k] = v;
      }
    }
    return out;
  }

  let currentConfig = { ...DEFAULTS };
  const listeners = new Set();

  function notify(prev) {
    for (const fn of Array.from(listeners)) {
      try {
        fn(currentConfig, prev);
      } catch (err) {
        console.warn('[Claude Prism] config listener error:', err);
      }
    }
  }

  function readLocalMirror() {
    try {
      const raw = root.localStorage?.getItem(STORAGE_KEY);
      if (raw) return sanitizeConfig(JSON.parse(raw));
    } catch {}
    return null;
  }

  function writeLocalMirror(cfg) {
    try {
      root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {}
  }

  async function loadConfig() {
    const mirrored = readLocalMirror();
    if (mirrored) currentConfig = mirrored;

    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      try {
        const stored = await new Promise((resolve) => {
          chrome.storage.sync.get([STORAGE_KEY], (res) => resolve(res?.[STORAGE_KEY] || null));
        });
        if (stored) {
          const prev = currentConfig;
          currentConfig = sanitizeConfig(stored);
          writeLocalMirror(currentConfig);
          notify(prev);
        }
      } catch {}
    }
    return currentConfig;
  }

  function setConfig(patch) {
    const prev = currentConfig;
    currentConfig = sanitizeConfig({ ...currentConfig, ...patch });
    writeLocalMirror(currentConfig);
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      try {
        chrome.storage.sync.set({ [STORAGE_KEY]: currentConfig });
      } catch {}
    }
    notify(prev);
    return currentConfig;
  }

  function applyPreset(name) {
    if (!SCENE_PRESETS[name]) return currentConfig;
    return setConfig(SCENE_PRESETS[name]);
  }

  function getConfig() {
    return currentConfig;
  }

  function onConfigChange(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // Sync changes triggered from the toolbar popup or another claude.ai tab
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[STORAGE_KEY]) return;
      const next = sanitizeConfig(changes[STORAGE_KEY].newValue);
      const prev = currentConfig;
      if (JSON.stringify(prev) === JSON.stringify(next)) return;
      currentConfig = next;
      writeLocalMirror(currentConfig);
      notify(prev);
    });
  }

  CP.config = {
    STORAGE_KEY,
    DEFAULTS,
    SCENE_PRESETS,
    sanitizeConfig,
    loadConfig,
    getConfig,
    setConfig,
    applyPreset,
    onConfigChange,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
