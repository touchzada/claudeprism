// Claude Prism — FastDOM Smooth Typing Caret for claude.ai ProseMirror & Textarea Inputs
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  function snapDevicePx(val, dpr = 1) {
    const d = Number.isFinite(dpr) && dpr > 0 ? Math.min(4, dpr) : 1;
    return Math.round((Number(val) || 0) * d) / d;
  }

  function createSmoothCaretController({ isEnabled }) {
    let rafId = 0;
    let typingTimer = 0;
    let pendingTyping = false;
    let pendingScroll = false;
    let destroyed = false;

    const caretNodes = new WeakMap();
    const prevCoords = new WeakMap();
    const metricsCache = new WeakMap();

    function findEditableHost(ed) {
      if (!ed) return null;
      // Attach to immediate positioned wrapper around ProseMirror
      return ed.parentElement || ed;
    }

    function isValidEditor(el) {
      if (!el || el.nodeType !== 1 || !el.isConnected) return false;
      if (el.closest?.('.cp-settings-modal, .cp-vial-popover')) return false;
      if (el.classList?.contains('ProseMirror') || el.getAttribute?.('contenteditable') === 'true') {
        return true;
      }
      return false;
    }

    function getMetrics(ed) {
      const cached = metricsCache.get(ed);
      if (cached && Date.now() - cached.at < 2500) return cached;
      const cs = getComputedStyle(ed);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padT = parseFloat(cs.paddingTop) || 0;
      const fontSize = parseFloat(cs.fontSize) || 15;
      const lineH = parseFloat(cs.lineHeight) || fontSize * 1.48;
      const glyphH = Math.max(16, Math.min(26, Math.round(fontSize * 1.32)));
      const rec = { padL, padT, fontSize, lineH, glyphH, at: Date.now() };
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

      const { padL, padT, glyphH } = getMetrics(ed);

      const clampBounds = (box) => {
        if (!box) return null;
        if (ed.scrollHeight > ed.clientHeight + 2) {
          if (box.top < edRect.top - 4 || box.top + box.height > edRect.bottom + 6) {
            return { collapsed: false };
          }
        }
        return box;
      };

      // 1. Primary accurate range rect (works for text nodes with content)
      const rects = range.getClientRects?.();
      const r0 = rects && rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect?.();
      if (r0 && r0.height > 0 && (r0.left > 0 || r0.top > 0)) {
        const h = Math.max(15, Math.min(24, glyphH));
        const centeredTop = r0.top + (r0.height - h) * 0.45;
        return clampBounds({ collapsed: true, left: r0.left, top: centeredTop, height: h });
      }

      // 2. Empty paragraph / ProseMirror <p><br class="ProseMirror-trailingBreak"></p>
      const sc = range.startContainer;
      const so = range.startOffset;
      if (sc && sc.nodeType === 1) {
        const at = sc.childNodes[so] || sc.childNodes[so - 1] || sc.querySelector?.('br');
        if (at && at.nodeName === 'BR') {
          const br = at.getBoundingClientRect();
          if (br && br.height > 0 && (br.left > 0 || br.top > 0)) {
            const h = Math.max(15, Math.min(24, glyphH));
            const centeredTop = br.top + (br.height - h) * 0.45;
            return clampBounds({ collapsed: true, left: br.left, top: centeredTop, height: h });
          }
        }
        const scRect = sc.getBoundingClientRect?.();
        if (scRect && scRect.height > 0 && (scRect.left > 0 || scRect.top > 0)) {
          const scCs = getComputedStyle(sc);
          const scPadL = parseFloat(scCs.paddingLeft) || 0;
          const scPadT = parseFloat(scCs.paddingTop) || 0;
          return clampBounds({
            collapsed: true,
            left: scRect.left + scPadL,
            top: scRect.top + scPadT + Math.max(0, (Math.min(scRect.height, glyphH + 4) - glyphH) / 2),
            height: glyphH,
          });
        }
      }

      // 3. Fallback top-left of editor content box
      return clampBounds({
        collapsed: true,
        left: edRect.left + padL,
        top: edRect.top + padT,
        height: glyphH,
      });
    }

    function hideAllCarets(exceptHost = null) {
      document.querySelectorAll('.cp-smooth-caret[data-cp-caret-visible="1"]').forEach((node) => {
        if (exceptHost && node.parentElement === exceptHost) return;
        node.removeAttribute('data-cp-caret-visible');
        node.removeAttribute('data-cp-caret-typing');
      });
      document.querySelectorAll('[data-cp-smooth-caret="1"]').forEach((ed) => {
        if (exceptHost && findEditableHost(ed) === exceptHost) return;
        ed.removeAttribute('data-cp-smooth-caret');
      });
    }

    function ensureCaretNode(host) {
      let node = caretNodes.get(host);
      if (!node || !node.isConnected || node.parentElement !== host) {
        node = host.querySelector(':scope > .cp-smooth-caret');
        if (!node) {
          node = document.createElement('div');
          node.className = 'cp-smooth-caret';
          node.setAttribute('aria-hidden', 'true');
          host.appendChild(node);
        }
        caretNodes.set(host, node);
      }
      return node;
    }

    function tick() {
      rafId = 0;
      const isTyping = pendingTyping;
      const isScroll = pendingScroll;
      pendingTyping = false;
      pendingScroll = false;

      if (destroyed || !isEnabled() || document.hidden) {
        teardownDom();
        return;
      }

      const active = document.activeElement;
      const ed = isValidEditor(active)
        ? active
        : active?.closest?.('.ProseMirror, [contenteditable="true"]') || null;

      if (!isValidEditor(ed)) {
        hideAllCarets(null);
        return;
      }

      const host = findEditableHost(ed);
      if (!host) return;

      // MEASURE PHASE (zero writes)
      const box = measureCaret(ed);
      const hostRect = box && box.collapsed ? host.getBoundingClientRect() : null;
      const dpr = root.devicePixelRatio || 1;
      const clientLeft = host.clientLeft || 0;
      const clientTop = host.clientTop || 0;
      const scrollLeft = host.scrollLeft || 0;
      const scrollTop = host.scrollTop || 0;

      // MUTATE PHASE (zero reads)
      hideAllCarets(host);
      if (host.getAttribute('data-cp-caret-host') !== '1') {
        host.setAttribute('data-cp-caret-host', '1');
      }
      const caret = ensureCaretNode(host);

      if (!box || !box.collapsed || !hostRect) {
        caret.removeAttribute('data-cp-caret-visible');
        caret.removeAttribute('data-cp-caret-typing');
        ed.removeAttribute('data-cp-smooth-caret');
        return;
      }

      const x = snapDevicePx(box.left - hostRect.left - clientLeft + scrollLeft, dpr);
      const y = snapDevicePx(box.top - hostRect.top - clientTop + scrollTop, dpr);
      const h = snapDevicePx(box.height, dpr);

      const prev = prevCoords.get(ed);
      const hugeJump = !prev || isScroll || Math.abs(x - prev.x) > 260 || Math.abs(y - prev.y) > 96;
      prevCoords.set(ed, { x, y, h });

      if (hugeJump) {
        caret.setAttribute('data-cp-caret-instant', '1');
      } else {
        caret.removeAttribute('data-cp-caret-instant');
      }

      ed.setAttribute('data-cp-smooth-caret', '1');
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

    function schedule(typing = false, scroll = false) {
      if (destroyed || !isEnabled()) return;
      if (typing) pendingTyping = true;
      if (scroll) pendingScroll = true;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function onSelectionChange() { schedule(false, false); }
    function onInput() { schedule(true, false); }
    function onKeyDown(ev) {
      if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) schedule(true, false);
      else schedule(false, false);
    }
    function onMouseUp() { schedule(false, false); }
    function onFocusIn() { schedule(false, true); }
    function onFocusOut() { schedule(false, false); }
    function onScroll() { schedule(false, true); }
    function onResize() { schedule(false, true); }

    function teardownDom() {
      clearTimeout(typingTimer);
      typingTimer = 0;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      document.querySelectorAll('.cp-smooth-caret').forEach((n) => n.remove());
      document.querySelectorAll('[data-cp-smooth-caret]').forEach((n) => n.removeAttribute('data-cp-smooth-caret'));
      document.querySelectorAll('[data-cp-caret-host]').forEach((n) => n.removeAttribute('data-cp-caret-host'));
    }

    function start() {
      document.addEventListener('selectionchange', onSelectionChange, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('keydown', onKeyDown, true);
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
      document.removeEventListener('keydown', onKeyDown, true);
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
