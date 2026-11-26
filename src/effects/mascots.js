// Claude Prism — High-Craft Outlined Pixel Mascots (16x13 layered pixel sprites,
// ground shadow, blink, squash-stretch, drag/toss/stack tower & rainbow cat easter egg)
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const CHROMA_KEY = 'claudePrismChromaCatV1';

  // High-craft 16x13 pixel art sprites with crisp dark outlines ('o'),
  // top highlights ('h'/'q'), midtone body ('#'), underside shading ('s'),
  // cheeks/accents ('p'/'a'/'b'/'u'), and expressive eyes ('e'/'w').
  const SPRITES = {
    clawd: {
      palette: {
        o: '#141413',
        '#': '#D97757',
        s: '#B8593B',
        h: '#EEA78D',
        q: '#F8CAB9',
        e: '#141413',
        w: '#FFF9F5',
      },
      idle: [
        '................',
        '..oo........oo..',
        '.oqqo.oooo.oqqo.',
        '.o##oo####oo##o.',
        '..o#h######h#o..',
        '.o###e####e###o.',
        '.o###w####w###o.',
        '.o############o.',
        '..osssssssssso..',
        '..oo#o#oo#o#oo..',
        '..o#o.o##o.o#o..',
        '..oo...oo...oo..',
        '................',
      ],
      step: [
        '..oo........oo..',
        '.oqqo.oooo.oqqo.',
        '.o##oo####oo##o.',
        '..o#h######h#o..',
        '.o###e####e###o.',
        '.o###w####w###o.',
        '.o############o.',
        '..osssssssssso..',
        '..oo#o#oo#o#oo..',
        '...o#o....o#o...',
        '...oo......oo...',
        '................',
        '................',
      ],
      blink: [
        '................',
        '..oo........oo..',
        '.oqqo.oooo.oqqo.',
        '.o##oo####oo##o.',
        '..o#h######h#o..',
        '.o############o.',
        '.o##oo####oo##o.',
        '.o############o.',
        '..osssssssssso..',
        '..oo#o#oo#o#oo..',
        '..o#o.o##o.o#o..',
        '..oo...oo...oo..',
        '................',
      ],
      sleep: [
        '................',
        '................',
        '................',
        '...oooooooooo...',
        '..o#h######h#o..',
        '.o############o.',
        '.o##oo####oo##o.',
        '.o############o.',
        '.oossssssssssoo.',
        '..ooo......ooo..',
        '................',
        '................',
        '................',
      ],
      fx: '✨',
    },
    cat: {
      palette: {
        o: '#141413',
        '#': '#947FD6',
        s: '#6F59B5',
        h: '#B9A9EB',
        q: '#DFD6FC',
        e: '#141413',
        w: '#FFFFFF',
        p: '#F4A6C1',
      },
      idle: [
        '..oo........oo..',
        '.o#qo......oq#o.',
        '.o#poooooooop#o.',
        '.o##h######h##o.',
        '.o##e######e##o.',
        '.o##w##pp##w##o.',
        '.o############o.',
        '..o##########oo.',
        '..os#s####s#o#o.',
        '..oo#soooos#oo..',
        '...o##o..o##o...',
        '...ooo....ooo...',
        '................',
      ],
      step: [
        '..oo........oo..',
        '.o#qo......oq#o.',
        '.o#poooooooop#o.',
        '.o##h######h##o.',
        '.o##e######e##o.',
        '.o##w##pp##w##o.',
        '.o############o.',
        '..o##########oo.',
        '..os#s####s#o#o.',
        '...o##o..o##oo..',
        '....oo....oo....',
        '................',
        '................',
      ],
      blink: [
        '..oo........oo..',
        '.o#qo......oq#o.',
        '.o#poooooooop#o.',
        '.o##h######h##o.',
        '.o############o.',
        '.o#oo##pp##oo#o.',
        '.o############o.',
        '..o##########oo.',
        '..os#s####s#o#o.',
        '..oo#soooos#oo..',
        '...o##o..o##o...',
        '...ooo....ooo...',
        '................',
      ],
      sleep: [
        '................',
        '................',
        '..oo........oo..',
        '.o#poooooooop#o.',
        '.o##h######h##o.',
        '.o#oo##pp##oo#o.',
        '.o############o.',
        '.oossssssssssoo.',
        '..oooooooooooo..',
        '................',
        '................',
        '................',
        '................',
      ],
      fx: '💜',
    },
    dragon: {
      palette: {
        o: '#1B1833',
        '#': '#DCE4F4',
        s: '#9AA8C7',
        h: '#F4F7FF',
        q: '#FFFFFF',
        e: '#1B1833',
        w: '#5EEAD4',
        a: '#2DD4BF',
      },
      idle: [
        '.oo..........oo.',
        'oaoo........ooao',
        '.ooqo.oooo.oqoo.',
        '..o##h####h##o..',
        '.o###e####e###o.',
        '.o###w####w###o.',
        'oao##########oao',
        '.oo##########oo.',
        '..os#s####s#so..',
        '..oo#soooos#oo..',
        '...o##o..o##o...',
        '...ooo....ooo...',
        '................',
      ],
      step: [
        '.oo..........oo.',
        'oaoo........ooao',
        '.ooqo.oooo.oqoo.',
        '..o##h####h##o..',
        '.o###e####e###o.',
        '.o###w####w###o.',
        'oao##########oao',
        '.oo##########oo.',
        '..os#s####s#so..',
        '...o##o..o##o...',
        '....oo....oo....',
        '................',
        '................',
      ],
      blink: [
        '.oo..........oo.',
        'oaoo........ooao',
        '.ooqo.oooo.oqoo.',
        '..o##h####h##o..',
        '.o############o.',
        '.o##oo####oo##o.',
        'oao##########oao',
        '.oo##########oo.',
        '..os#s####s#so..',
        '..oo#soooos#oo..',
        '...o##o..o##o...',
        '...ooo....ooo...',
        '................',
      ],
      sleep: [
        '................',
        '................',
        '.oo..........oo.',
        '..oooooooooooo..',
        '.o##h######h##o.',
        '.o##oo####oo##o.',
        '.o############o.',
        '.oossssssssssoo.',
        '..oooooooooooo..',
        '................',
        '................',
        '................',
        '................',
      ],
      fx: '🔥',
    },
    whale: {
      palette: {
        o: '#121526',
        '#': '#4E6FFF',
        s: '#324EC8',
        h: '#84A3FF',
        q: '#C7D8FF',
        e: '#121526',
        w: '#FFFFFF',
        u: '#E8F2FF',
        b: '#38BDF8',
      },
      idle: [
        '.....b..b.......',
        '....b.bb.b......',
        '.....oooo.......',
        '...oohqqhoo.....',
        '..o########o....',
        '.o##e#######o.oo',
        '.o##w#######oo#o',
        '.o##########o#o.',
        '.o#uuuuuuuu#oo..',
        '..osuuuuuuuso...',
        '...ooooooooo....',
        '................',
        '................',
      ],
      step: [
        '....b....b......',
        '...b.b..b.b.....',
        '.....oooo.......',
        '...oohqqhoo.....',
        '..o########o..oo',
        '.o##e#######oo#o',
        '.o##w#######o#o.',
        '.o##########oo..',
        '.o#uuuuuuuu#o...',
        '..osuuuuuuuso...',
        '...ooooooooo....',
        '................',
        '................',
      ],
      blink: [
        '................',
        '......bb........',
        '.....oooo.......',
        '...oohqqhoo.....',
        '..o########o....',
        '.o##########o.oo',
        '.o##oo######oo#o',
        '.o##########o#o.',
        '.o#uuuuuuuu#oo..',
        '..osuuuuuuuso...',
        '...ooooooooo....',
        '................',
        '................',
      ],
      sleep: [
        '................',
        '................',
        '................',
        '....oooooo......',
        '..ooh####hoo....',
        '.o##oo######o.oo',
        '.o##########oo#o',
        '.o#uuuuuuuu#oo..',
        '..ooooooooooo...',
        '................',
        '................',
        '................',
        '................',
      ],
      fx: '💦',
    },
    mini: {
      palette: {
        o: '#141413',
        '#': '#FB923C',
        s: '#C25934',
        h: '#FDBA74',
        e: '#141413',
      },
      idle: [
        '................',
        '................',
        '................',
        '................',
        '...oo......oo...',
        '..o#o.oooo.o#o..',
        '..o#oh####ho#o..',
        '..o##e####e##o..',
        '...osssssssso...',
        '...oo#oooo#oo...',
        '....oo....oo....',
        '................',
        '................',
      ],
      step: [
        '................',
        '................',
        '................',
        '...oo......oo...',
        '..o#o.oooo.o#o..',
        '..o#oh####ho#o..',
        '..o##e####e##o..',
        '...osssssssso...',
        '...o#o....o#o...',
        '...oo......oo...',
        '................',
        '................',
        '................',
      ],
      blink: [
        '................',
        '................',
        '................',
        '................',
        '...oo......oo...',
        '..o#o.oooo.o#o..',
        '..o#oh####ho#o..',
        '..o##########o..',
        '...osssssssso...',
        '...oo#oooo#oo...',
        '....oo....oo....',
        '................',
        '................',
      ],
      sleep: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '....oooooooo....',
        '...o#h####h#o...',
        '...osssssssso...',
        '....oooooooo....',
        '................',
        '................',
        '................',
        '................',
      ],
      fx: '🦀',
    },
  };

  const RAINBOW_HEX = ['#4285F4', '#9B72CB', '#EA4335', '#FBBC04', '#34A853', '#5CC6FC'];

  function renderSprite(canvas, kind, pose, flipX, chromaPhase, grounded) {
    const spec = SPRITES[kind] || SPRITES.clawd;
    const grid = spec[pose] || spec.idle;
    const px = kind === 'mini' ? 2 : 2.5;
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    const cssW = Math.round(16 * px);
    const cssH = Math.round(13 * px);
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // Subtle grounded contact shadow right on the composer top border
    if (grounded) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h - 1.5 * dpr, w * 0.34, 2.2 * dpr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const cell = px * dpr;
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        let color = spec.palette[ch];
        if (chromaPhase !== null && (ch === '#' || ch === 'h' || ch === 's')) {
          const idx = Math.floor(((x * 0.6 + y * 0.5 + chromaPhase) % RAINBOW_HEX.length + RAINBOW_HEX.length) % RAINBOW_HEX.length);
          color = RAINBOW_HEX[idx];
        }
        if (!color) continue;
        const drawX = flipX ? (15 - x) * cell : x * cell;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(drawX), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
  }

  function createMascotController({ isEnabled, getConfig, getComposerCard, isStreaming }) {
    let stageEl = null;
    let hostCard = null;
    let actors = [];
    let rafId = 0;
    let lastTs = 0;
    let lastActivityAt = performance.now();
    let destroyed = false;
    let rainbowCat = false;
    let catClicks = [];

    try {
      rainbowCat = root.localStorage?.getItem(CHROMA_KEY) === '1';
    } catch {}

    function resolveSpeciesList(mode) {
      if (mode === 'off') return [];
      if (mode === 'clawd') return ['clawd'];
      if (mode === 'dual') return ['clawd', 'cat'];
      if (mode === 'quad') return ['clawd', 'cat', 'dragon', 'whale'];
      if (mode === 'quad-minis') return ['clawd', 'cat', 'dragon', 'whale', 'mini', 'mini', 'mini'];
      return ['clawd', 'cat'];
    }

    function spawnFx(actor, symbol) {
      const fx = document.createElement('span');
      fx.className = 'cp-mascot-fx';
      fx.textContent = symbol;
      actor.el.appendChild(fx);
      setTimeout(() => fx.remove(), 980);
    }

    function wake() {
      lastActivityAt = performance.now();
      if (!rafId && actors.length > 0 && !destroyed && isEnabled() && !document.hidden) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(step);
      }
    }

    function buildActors() {
      if (!stageEl) return;
      stageEl.innerHTML = '';
      actors = [];
      const cfg = getConfig();
      const species = resolveSpeciesList(cfg.mascotMode);
      const stageW = Math.max(260, stageEl.clientWidth || 540);

      species.forEach((kind, i) => {
        const el = document.createElement('div');
        el.className = 'cp-mascot-actor';
        el.title = kind === 'clawd'
          ? 'Clawd (arraste ou empilhe!)'
          : kind === 'cat'
          ? 'Gemini Cat (empilhe e clique 4x para 🌈!)'
          : kind === 'dragon'
          ? 'GPT Dragon (clique para fogo 🔥!)'
          : kind === 'whale'
          ? 'Deepy Whale (clique para esguicho 💦!)'
          : 'Mini Crab';
        const cv = document.createElement('canvas');
        el.appendChild(cv);
        stageEl.appendChild(el);

        const sizeW = kind === 'mini' ? 32 : 40;
        const sizeH = kind === 'mini' ? 26 : 33;
        // Place neatly near right-center so they never crowd Claude's greeting text
        const startBase = Math.max(16, Math.min(stageW - species.length * 52 - 16, stageW * 0.52));
        const spread = Math.min(stageW - sizeW - 8, Math.max(8, startBase + i * 50));

        const actor = {
          id: `${kind}-${i}`,
          kind,
          el,
          cv,
          w: sizeW,
          h: sizeH,
          x: spread,
          y: 0,
          vx: (i % 2 === 0 ? 1 : -1) * (12 + (i % 3) * 5),
          vy: 0,
          flip: i % 2 === 1,
          dragging: false,
          stackedOn: null,
          nextDecisionAt: performance.now() + 1800 + i * 700,
          nextBlinkAt: performance.now() + 2400 + i * 1100,
          blinkUntil: 0,
          sleeping: false,
          hopUntil: 0,
          lastFrameSig: '',
        };

        let dragStartX = 0;
        let dragStartY = 0;
        let origX = 0;
        let origY = 0;
        let moved = false;
        let lastMoveT = 0;
        let lastMoveX = 0;
        let lastMoveY = 0;

        el.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          el.setPointerCapture?.(ev.pointerId);
          actor.dragging = true;
          actor.stackedOn = null;
          for (const other of actors) {
            if (other.stackedOn === actor) other.stackedOn = null;
          }
          el.setAttribute('data-dragging', '1');
          dragStartX = ev.clientX;
          dragStartY = ev.clientY;
          origX = actor.x;
          origY = actor.y;
          lastMoveX = ev.clientX;
          lastMoveY = ev.clientY;
          lastMoveT = performance.now();
          moved = false;
          actor.sleeping = false;
          wake();
        });

        el.addEventListener('pointermove', (ev) => {
          if (!actor.dragging) return;
          const dx = ev.clientX - dragStartX;
          const dy = ev.clientY - dragStartY;
          if (Math.hypot(dx, dy) > 4) moved = true;
          const maxW = Math.max(200, (stageEl?.clientWidth || 540) - actor.w);
          actor.x = Math.max(0, Math.min(maxW, origX + dx));
          actor.y = Math.max(0, Math.min(180, origY - dy));
          const now = performance.now();
          const dt = Math.max(8, now - lastMoveT) / 1000;
          actor.vx = Math.max(-280, Math.min(280, (ev.clientX - lastMoveX) / dt));
          actor.vy = Math.max(-220, Math.min(260, -(ev.clientY - lastMoveY) / dt));
          lastMoveX = ev.clientX;
          lastMoveY = ev.clientY;
          lastMoveT = now;
          wake();
        });

        const endDrag = () => {
          if (!actor.dragging) return;
          actor.dragging = false;
          el.removeAttribute('data-dragging');

          if (!moved) {
            actor.vy = 115;
            actor.hopUntil = performance.now() + 420;
            spawnFx(actor, SPRITES[actor.kind]?.fx || '✨');

            if (actor.kind === 'cat') {
              const inTower = Boolean(actor.stackedOn) || actors.some((o) => o.stackedOn === actor);
              if (inTower || rainbowCat) {
                const now = performance.now();
                catClicks = catClicks.filter((t) => now - t < 2600);
                catClicks.push(now);
                if (catClicks.length >= 4) {
                  catClicks = [];
                  rainbowCat = !rainbowCat;
                  try { root.localStorage?.setItem(CHROMA_KEY, rainbowCat ? '1' : '0'); } catch {}
                  spawnFx(actor, rainbowCat ? '🌈' : '💜');
                }
              }
            }
          } else {
            const target = actors.find((other) => {
              if (other === actor || other.dragging) return false;
              const overlapX = Math.abs((actor.x + actor.w / 2) - (other.x + other.w / 2)) < (actor.w + other.w) * 0.45;
              const aboveY = actor.y >= other.y + other.h * 0.3 && actor.y <= other.y + other.h + 28;
              return overlapX && aboveY;
            });
            if (target) {
              actor.stackedOn = target;
              actor.vx = 0;
              actor.vy = 0;
              spawnFx(actor, '⭐');
            }
          }
          wake();
        };

        el.addEventListener('pointerup', endDrag);
        el.addEventListener('pointercancel', endDrag);

        renderSprite(cv, kind, 'idle', actor.flip, kind === 'cat' && rainbowCat ? 0 : null, true);
        el.style.transform = `translate3d(${Math.round(actor.x)}px, 0px, 0)`;
        actors.push(actor);
      });

      wake();
    }

    function step(ts) {
      rafId = 0;
      if (destroyed || !isEnabled() || !stageEl || !stageEl.isConnected || document.hidden || actors.length === 0) {
        return;
      }

      const dt = Math.min(0.05, Math.max(0.008, (ts - lastTs) / 1000));
      lastTs = ts;

      const maxW = Math.max(200, stageEl.clientWidth || 540);
      const streaming = isStreaming();
      if (streaming) lastActivityAt = ts;

      const idleMs = ts - lastActivityAt;
      const shouldSleep = idleMs > 18000 && actors.every((a) => !a.dragging && a.y <= 0.5);

      const animStep = Math.floor(ts / 200);
      const chromaShift = (ts / 150) % RAINBOW_HEX.length;

      for (const a of actors) {
        if (ts >= a.nextBlinkAt) {
          a.blinkUntil = ts + 140;
          a.nextBlinkAt = ts + 2800 + Math.random() * 3400;
        }
        const isBlinking = ts < a.blinkUntil;

        if (a.dragging) {
          renderSprite(a.cv, a.kind, 'step', a.flip, a.kind === 'cat' && rainbowCat ? chromaShift : null, false);
          a.el.style.transform = `translate3d(${Math.round(a.x)}px, ${-Math.round(a.y)}px, 0)`;
          continue;
        }

        if (a.stackedOn) {
          const base = a.stackedOn;
          if (!actors.includes(base) || base.dragging) {
            a.stackedOn = null;
          } else {
            a.x = base.x + (base.w - a.w) * 0.5;
            a.y = base.y + base.h - 7;
            a.flip = base.flip;
            a.sleeping = shouldSleep;
            const pose = shouldSleep ? 'sleep' : isBlinking ? 'blink' : (animStep % 2 === 0 ? 'idle' : 'step');
            const frameSig = `${pose}|${a.flip ? 1 : 0}|0|${a.kind === 'cat' && rainbowCat ? Math.floor(chromaShift * 2) : 0}`;
            if (a.lastFrameSig !== frameSig) {
              a.lastFrameSig = frameSig;
              renderSprite(a.cv, a.kind, pose, a.flip, a.kind === 'cat' && rainbowCat ? chromaShift : null, false);
            }
            a.el.style.transform = `translate3d(${Math.round(a.x)}px, ${-Math.round(a.y)}px, 0)`;
            continue;
          }
        }

        if (a.y > 0 || a.vy > 0) {
          a.vy -= 540 * dt;
          a.y += a.vy * dt;
          a.x += a.vx * dt;
          if (a.y <= 0) {
            a.y = 0;
            if (Math.abs(a.vy) > 90) a.vy = -a.vy * 0.25;
            else a.vy = 0;
            a.vx *= 0.65;
          }
        } else if (!shouldSleep) {
          if (ts >= a.nextDecisionAt) {
            a.nextDecisionAt = ts + 2400 + Math.random() * 2800;
            const r = Math.random();
            if (r < 0.4) a.vx = 0;
            else a.vx = (r < 0.7 ? 1 : -1) * (12 + Math.random() * 15);
            if (streaming && Math.random() < 0.3) a.vy = 76;
          }
          a.x += a.vx * dt;
        } else {
          a.vx = 0;
        }

        if (a.x < 4) { a.x = 4; a.vx = Math.abs(a.vx); }
        if (a.x > maxW - a.w - 4) { a.x = maxW - a.w - 4; a.vx = -Math.abs(a.vx); }
        if (Math.abs(a.vx) > 2) a.flip = a.vx < 0;

        a.sleeping = shouldSleep;
        const grounded = a.y <= 1;
        const moving = Math.abs(a.vx) > 2 || !grounded || ts < a.hopUntil;
        const pose = shouldSleep ? 'sleep' : isBlinking && !moving ? 'blink' : (moving && animStep % 2 === 1 ? 'step' : 'idle');

        const frameSig = `${pose}|${a.flip ? 1 : 0}|${grounded ? 1 : 0}|${a.kind === 'cat' && rainbowCat ? Math.floor(chromaShift * 2) : 0}`;
        if (a.lastFrameSig !== frameSig) {
          a.lastFrameSig = frameSig;
          renderSprite(a.cv, a.kind, pose, a.flip, a.kind === 'cat' && rainbowCat ? chromaShift : null, grounded);
        }
        const scaleY = !grounded && a.vy > 40 ? 1.07 : 1;
        const scaleX = !grounded && a.vy > 40 ? 0.94 : 1;
        a.el.style.transform = `translate3d(${Math.round(a.x)}px, ${-Math.round(a.y)}px, 0) scale(${scaleX}, ${scaleY})`;
      }

      if (shouldSleep) {
        for (const a of actors) {
          renderSprite(a.cv, a.kind, 'sleep', a.flip, a.kind === 'cat' && rainbowCat ? 0 : null, a.y <= 1);
        }
        return;
      }

      rafId = requestAnimationFrame(step);
    }

    function mountToComposer() {
      const cfg = getConfig();
      if (!isEnabled() || cfg.mascotMode === 'off') {
        unmount();
        return;
      }
      const card = getComposerCard();
      if (!card || !card.isConnected) return;

      const currentSpeciesSig = resolveSpeciesList(cfg.mascotMode).join(',');
      if (hostCard === card && stageEl && stageEl.isConnected && stageEl.dataset.cpSig === currentSpeciesSig) {
        return;
      }

      unmount();
      hostCard = card;
      stageEl = document.createElement('div');
      stageEl.className = 'cp-mascot-stage';
      stageEl.dataset.cpSig = currentSpeciesSig;
      hostCard.appendChild(stageEl);
      buildActors();
    }

    function unmount() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (stageEl) { stageEl.remove(); stageEl = null; }
      hostCard = null;
      actors = [];
    }

    function celebrateDone() {
      if (!actors.length) return;
      wake();
      for (const a of actors) {
        if (!a.dragging && !a.stackedOn) a.vy = 110;
        spawnFx(a, SPRITES[a.kind]?.fx || '✨');
      }
    }

    function onUserActivity() {
      if (actors.length > 0 && actors.some((a) => a.sleeping)) wake();
      else lastActivityAt = performance.now();
    }

    function start() {
      document.addEventListener('keydown', onUserActivity, { passive: true });
      mountToComposer();
    }

    function sync() {
      mountToComposer();
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('keydown', onUserActivity);
      unmount();
    }

    return { start, sync, destroy, celebrateDone, wake };
  }

  CP.createMascotController = createMascotController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
