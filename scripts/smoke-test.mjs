#!/usr/bin/env node
// Automated smoke test & validation for Claude Prism Chrome Extension
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 1. Validate manifest.json & referenced assets
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3, 'manifest_version must be 3');
assert.ok(manifest.content_scripts?.length === 1);

const referencedFiles = [
  ...Object.values(manifest.icons),
  manifest.action.default_popup,
  ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts[0].css,
  ...manifest.content_scripts[0].js,
];
for (const rel of referencedFiles) {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full), `Missing referenced file: ${rel}`);
  assert.ok(fs.statSync(full).size > 0, `Empty referenced file: ${rel}`);
}

// 2. Verify JS syntax on every JS file
const jsFiles = [
  ...manifest.content_scripts[0].js,
  'src/popup/popup.js',
  'scripts/generate-icons.mjs',
  'scripts/smoke-test.mjs',
];
for (const rel of jsFiles) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'pipe' });
}

// 3. Verify CSS brace balance
const css = fs.readFileSync(path.join(ROOT, 'src/styles/prism.css'), 'utf8');
let depth = 0;
for (const ch of css) {
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
  assert.ok(depth >= 0, 'Unmatched closing brace in prism.css');
}
assert.equal(depth, 0, 'Unclosed brace in prism.css');

// 4. Execute core modules in a minimal sandbox and verify contracts
const attrs = new Map();
const styles = new Map();
const sandbox = {
  console,
  CSS: { supports: () => true },
  getComputedStyle: () => ({
    getPropertyValue: (k) => (k === '--bg-100' ? '60 2.6% 7.6%' : ''),
  }),
  document: {
    documentElement: {
      setAttribute: (k, v) => attrs.set(k, v),
      getAttribute: (k) => attrs.get(k) || null,
      removeAttribute: (k) => attrs.delete(k),
      classList: { contains: () => false },
      style: {
        setProperty: (k, v) => styles.set(k, v),
        removeProperty: (k) => styles.delete(k),
        [Symbol.iterator]: () => styles.keys(),
      },
    },
    body: null,
  },
  localStorage: {
    _m: new Map(),
    getItem(k) { return this._m.get(k) ?? null; },
    setItem(k, v) { this._m.set(k, String(v)); },
  },
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const rel of ['src/core/config.js', 'src/core/motion-engine.js', 'src/core/theme-bridge.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const CP = sandbox.ClaudePrism;
assert.ok(CP.config && CP.motion && CP.theme, 'Core namespaces must attach to globalThis.ClaudePrism');

// Test config sanitization & presets
const clean = CP.config.sanitizeConfig({ palette: 'obsidian', ambientIntensity: 999, mascotMode: 'invalid' });
assert.equal(clean.palette, 'obsidian');
assert.equal(clean.ambientIntensity, 100);
assert.equal(clean.mascotMode, 'dual');

CP.config.applyPreset('eco');
assert.equal(CP.config.getConfig().motionLevel, 'off');
assert.equal(CP.config.getConfig().mascotMode, 'off');
CP.config.applyPreset('ultra');
assert.equal(CP.config.getConfig().smoothCaret, true);

// Test damped spring curve generation
const spring = CP.motion.solveSpringLinear('snappy');
assert.ok(spring.easing.startsWith('linear(0,'), 'Spring must compile to CSS linear()');
assert.ok(spring.durationMs >= 140 && spring.durationMs <= 900);

// Test HSL triplet bridge & theme application
const hsl = CP.theme.hexToHslTriplet('#D97757');
assert.match(hsl, /^\d+\.\d \d+\.\d% \d+\.\d%$/);

const applied = CP.theme.applyTheme(CP.config.getConfig());
assert.equal(applied.palName, 'warm');
assert.equal(applied.fmt, 'hsl-triplet');
assert.equal(attrs.get('data-cp-enabled'), '1');
assert.match(styles.get('--bg-100'), /^\d+\.\d \d+\.\d% \d+\.\d%$/, 'Must emit HSL triplet for claude.ai');
assert.equal(styles.get('--cp-bg-1'), '#141413');

CP.theme.clearTheme();
assert.equal(attrs.has('data-cp-enabled'), false);

console.log('[OK] All Claude Prism manifest, syntax, CSS, config, motion & theme-bridge checks passed!');
