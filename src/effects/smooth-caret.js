// Claude Prism — Sub-Pixel Fixed-Overlay FastDOM Smooth Typing Caret
// Mounted on document.body (position: fixed) so Tailwind space-x/space-y margins,
// parent transforms, or overflow:hidden on claude.ai NEVER shift or clip the caret.
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  function snapDevicePx(val, dpr = 1) {
    const d = Number.isFinite(dpr) && dpr > 0 ? Math.min(4, dpr) : 1;
    return Math.round((Number(val) || 0) * d) / d;
  }

  function createSmoothCaretController({ isEnabled }) {
    let caretEl = null;
    let activeEditor = null;
    let rafId = 0;
    let typingTimer = 0;
    let pendingTyping = false;
    let pendingInstant = false;
    let lastPos = null;
    let destroyed = false;
    const metricsCache = new WeakMap();

    function ensureCaretEl() {
      if (caretEl && caretEl.isConnected) return caretEl;
      caretEl = document.createElement('div');
      caretEl.className = 'cp-smooth-caret';
      caretEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(caretEl);
      return caretEl;
    }

    function isValidEditor(el) {
      if (!el || el.nodeType !== 1 || !el.isConnected) return false;
      if (el.closest?.('.cp-settings-modal, .cp-vial-popover')) return false;
      return Boolean(el.classList?.contains('ProseMirror') || el.getAttribute?.('contenteditable') === 'true');
    }

    function getMetrics(ed) {
      const cached = metricsCache.get(ed);
      if (cached && Date.now() - cached.at < 2000) return cached;
      const cs = getComputedStyle(ed);
      const fontSize = parseFloat(cs.fontSize) || 16;
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padT = parseFloat(cs.paddingTop) || 0;
      // Tight glyph height so the caret aligns cleanly with cap-height + baseline (no low hanging tail)
      const caretH = Math.max(14, Math.min(22, Math.round(fontSize * 1.18)));
      const rec = { fontSize, padL, padT, caretH, at: Date.now() };
      metricsCache.set(ed, rec);
      return rec;
    }

    function measureCaret(ed) {
      const edRect = ed.getBoundingClientRect();
      if (!edRect || edRect.width < 10 || edRect.height < 10) return null;
      const sel = document.getSelection?.();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (!range || !range.collapsed) return { collapsed: false };
      if (!ed.contains(range.startContainer)) return null;

      const { padL, padT, caretH } = getMetrics(ed);

      const clampToViewportAndEditor = (box) => {
        if (!box) return null;
        if (box.top < edRect.top - 4 || box.top + box.height > edRect.bottom + 6) {
          return { collapsed: false };
        }
        if (box.left < edRect.left - 4 || box.left > edRect.right + 4) {
          return { collapsed: false };
        }
        return box;
      };

      const centerBox = (rect) => {
        // Align slightly higher (0.38) so bottom sits cleanly on text baseline rather than descender bottom
        const top = rect.top + (rect.height - caretH) * 0.38;
        return clampToViewportAndEditor({
          collapsed: true,
          left: rect.left,
          top,
          height: caretH,
        });
      };

      // 1. Exact Range client rect (for text nodes, use a 1-char probe when collapsed rect is missing)
      const rects = range.getClientRects?.();
      const r0 = rects && rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect?.();
      if (r0 && r0.height > 0 && (r0.left > 0 || r0.top > 0)) {
        return centerBox(r0);
      }

      // 2. Text node end fallback (measure preceding glyph's right edge)
      const sc = range.startContainer;
      const so = range.startOffset;
      if (sc && sc.nodeType === 3 && so > 0) {
        try {
          const probe = document.createRange();
          probe.setStart(sc, so - 1);
          probe.setEnd(sc, so);
          const pr = probe.getBoundingClientRect();
          if (pr && pr.height > 0 && (pr.right > 0 || pr.top > 0)) {
            return centerBox({ left: pr.right, top: pr.top, height: pr.height });
          }
        } catch {}
      }

      // 3. Empty paragraph / ProseMirror <p><br class="ProseMirror-trailingBreak"></p>
      if (sc && sc.nodeType === 1) {
        const at = sc.childNodes[so] || sc.childNodes[so - 1] || sc.querySelector?.('br');
        if (at && at.nodeName === 'BR') {
          const br = at.getBoundingClientRect();
          if (br && br.height > 0 && (br.left > 0 || br.top > 0)) {
            return centerBox(br);
          }
        }
        const scRect = sc.getBoundingClientRect?.();
        if (scRect && scRect.height > 0 && (scRect.left > 0 || scRect.top > 0)) {
          const scCs = getComputedStyle(sc);
          const scPadL = parseFloat(scCs.paddingLeft) || 0;
          const scPadT = parseFloat(scCs.paddingTop) || 0;
          return clampToViewportAndEditor({
            collapsed: true,
            left: scRect.left + scPadL,
            top: scRect.top + scPadT + Math.max(0, (Math.min(scRect.height, caretH + 6) - caretH) * 0.38),
            height: caretH,
          });
        }
      }

      // 4. Final fallback: editor padding box origin
      return clampToViewportAndEditor({
        collapsed: true,
        left: edRect.left + padL,
        top: edRect.top + padT,
        height: caretH,
      });
    }

    function hideCaret() {
      if (caretEl) {
        caretEl.removeAttribute('data-cp-caret-visible');
        caretEl.removeAttribute('data-cp-caret-typing');
      }
      if (activeEditor) {
        activeEditor.removeAttribute('data-cp-smooth-caret');
        activeEditor = null;
      }
      lastPos = null;
    }

    function tick() {
      rafId = 0;
      const isTyping = pendingTyping;
      const isInstant = pendingInstant;
      pendingTyping = false;
      pendingInstant = false;

      if (destroyed || !isEnabled() || document.hidden) {
        teardownDom();
        return;
      }

      const active = document.activeElement;
      const ed = isValidEditor(active)
        ? active
        : active?.closest?.('.ProseMirror, [contenteditable="true"]') || null;

      if (!isValidEditor(ed)) {
        hideCaret();
        return;
      }

      // MEASURE PHASE (pure reads)
      const box = measureCaret(ed);
      const dpr = root.devicePixelRatio || 1;

      // MUTATE PHASE (pure writes)
      if (activeEditor && activeEditor !== ed) {
        activeEditor.removeAttribute('data-cp-smooth-caret');
      }
      activeEditor = ed;

      if (!box || !box.collapsed) {
        hideCaret();
        return;
      }

      const caret = ensureCaretEl();
      const x = snapDevicePx(box.left, dpr);
      const y = snapDevicePx(box.top, dpr);
      const h = snapDevicePx(box.height, dpr);

      const jumpDist = lastPos ? Math.hypot(x - lastPos.x, y - lastPos.y) : Infinity;
      const hugeJump = isInstant || !lastPos || jumpDist > 260 || Math.abs(y - lastPos.y) > 72;
      lastPos = { x, y, h };

      if (hugeJump) {
        caret.setAttribute('data-cp-caret-instant', '1');
      } else {
        caret.removeAttribute('data-cp-caret-instant');
      }

      if (ed.getAttribute('data-cp-smooth-caret') !== '1') {
        ed.setAttribute('data-cp-smooth-caret', '1');
      }

      caret.style.height = `${h}px`;
      caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      caret.setAttribute('data-cp-caret-visible', '1');

      if (isTyping) {
        caret.setAttribute('data-cp-caret-typing', '1');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          if (caret.isConnected) caret.removeAttribute('data-cp-caret-typing');
        }, 420);
      }

      if (hugeJump) {
        requestAnimationFrame(() => {
          if (caret.isConnected) caret.removeAttribute('data-cp-caret-instant');
        });
      }
    }

    function schedule(typing = false, instant = false) {
      if (destroyed || !isEnabled()) return;
      if (typing) pendingTyping = true;
      if (instant) pendingInstant = true;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function onSelectionChange() { schedule(false, false); }
    function onInput() { schedule(true, false); }
    function onKeyUp(ev) {
      if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) schedule(true, false);
      else schedule(false, false);
    }
    function onMouseUp() { schedule(false, false); }
    function onFocusIn() { schedule(false, true); }
    function onFocusOut() { schedule(false, true); }
    function onScroll() { schedule(false, true); }
    function onResize() { schedule(false, true); }

    function teardownDom() {
      clearTimeout(typingTimer);
      typingTimer = 0;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (caretEl) { caretEl.remove(); caretEl = null; }
      document.querySelectorAll('[data-cp-smooth-caret]').forEach((n) => n.removeAttribute('data-cp-smooth-caret'));
      activeEditor = null;
      lastPos = null;
    }

    function start() {
      document.addEventListener('selectionchange', onSelectionChange, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('keyup', onKeyUp, true);
      document.addEventListener('mouseup', onMouseUp, true);
      document.addEventListener('focusin', onFocusIn, true);
      document.addEventListener('focusout', onFocusOut, true);
      document.addEventListener('scroll', onScroll, true);
      root.addEventListener('resize', onResize, { passive: true });
      schedule(false, true);
    }

    function sync() {
      if (!isEnabled()) teardownDom();
      else schedule(false, true);
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('selectionchange', onSelectionChange, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('resize', onResize);
      teardownDom();
    }

    return { start, sync, destroy };
  }

  CP.createSmoothCaretController = createSmoothCaretController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
