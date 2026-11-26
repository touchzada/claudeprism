#!/usr/bin/env node
// Pure-Node zero-dependency PNG generator for Claude Prism extension icons.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'icons');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const half = size * 0.5;
  const rBadge = size * 0.44;
  const corner = size * 0.14;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5 - half;
      const py = y + 0.5 - half;

      // Rounded-square smoked obsidian badge SDF
      const qx = Math.abs(px) - (rBadge - corner);
      const qy = Math.abs(py) - (rBadge - corner);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - corner;
      if (sd > 1.2) continue;

      const badgeAlpha = clamp(1 - sd, 0, 1);
      const gradT = clamp((py + rBadge) / (2 * rBadge), 0, 1);

      // Smoked obsidian surface with subtle top specular rim
      let r = 16 + (1 - gradT) * 14;
      let g = 17 + (1 - gradT) * 14;
      let b = 22 + (1 - gradT) * 18;

      // Specular inner border highlight
      if (sd > -1.4 && sd <= 0.2) {
        const rimMix = py < 0 ? 0.36 : 0.12;
        r = r + (255 - r) * rimMix;
        g = g + (242 - g) * rimMix;
        b = b + (235 - b) * rimMix;
      }

      // Warm terracotta + prism ambient glow behind star
      const dist = Math.hypot(px, py) / rBadge;
      const halo = Math.exp(-dist * dist * 4.2) * 0.38;
      r = clamp(r + 217 * halo, 0, 255);
      g = clamp(g + 119 * halo, 0, 255);
      b = clamp(b + 87 * halo, 0, 255);

      // 4-pointed prismatic star
      const starR = size * 0.31;
      const sx = px / starR;
      const sy = py / starR;
      const starMetric = Math.pow(Math.abs(sx), 0.62) + Math.pow(Math.abs(sy), 0.62);
      if (starMetric <= 1.06) {
        const sa = starMetric <= 0.94 ? 1 : clamp((1.06 - starMetric) / 0.12, 0, 1);
        const core = Math.abs(sx) + Math.abs(sy);
        let sr, sg, sb;
        if (core <= 0.30) {
          sr = 255; sg = 251; sb = 247;
        } else if (sx <= 0 && sy <= 0) {
          sr = 217; sg = 119; sb = 87;  // Claude Terracotta
        } else if (sx > 0 && sy <= 0) {
          sr = 246; sg = 189; sb = 96;  // Warm Amber
        } else if (sx > 0 && sy > 0) {
          sr = 155; sg = 114; sb = 203; // Prism Iris
        } else {
          sr = 102; sg = 157; sb = 246; // Prism Cobalt
        }
        r = r * (1 - sa) + sr * sa;
        g = g * (1 - sa) + sg * sa;
        b = b * (1 - sa) + sb * sa;
      }

      rgba[idx] = Math.round(clamp(r, 0, 255));
      rgba[idx + 1] = Math.round(clamp(g, 0, 255));
      rgba[idx + 2] = Math.round(clamp(b, 0, 255));
      rgba[idx + 3] = Math.round(badgeAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });
for (const size of [16, 48, 128]) {
  const out = path.join(ICONS_DIR, `icon${size}.png`);
  fs.writeFileSync(out, renderIcon(size));
  console.log(`Generated ${out}`);
}
