// Claude Prism — Velvet 5-Step Ink Streaming via CSS Custom Highlight API (zero DOM wrappers)
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const FADE_MS = 300;
  const STEP_MS = 60;
  const MAX_RANGES = 56;
  const BUCKET_NAMES = ['cp-ink-0', 'cp-ink-1', 'cp-ink-2', 'cp-ink-3', 'cp-ink-4'];

  function createInkStreamController({ isEnabled, isStreaming }) {
    let observer = null;
    let rafId = 0;
    let timerId = 0;
    let buckets = null;
    let items = [];
    let destroyed = false;
    const textLens = new WeakMap();

    function ensureBuckets() {
      if (buckets) return buckets;
      if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight !== 'function') return null;
      buckets = BUCKET_NAMES.map((name) => {
        const hl = new Highlight();
        CSS.highlights.set(name, hl);
        return hl;
      });
      return buckets;
    }

    function clearHighlights() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (timerId) { clearTimeout(timerId); timerId = 0; }
      items = [];
      if (buckets) {
        for (const hl of buckets) {
          try { hl.clear(); } catch {}
        }
      }
    }

    function removeFromBucket(it) {
      if (!buckets || it.b < 0 || it.b >= buckets.length) return;
      try { buckets[it.b].delete(it.r); } catch {}
      it.b = -1;
    }

    function scheduleStep() {
      if (rafId || timerId || items.length === 0) return;
      timerId = setTimeout(() => {
        timerId = 0;
        if (!rafId && !destroyed) rafId = requestAnimationFrame(stepFade);
      }, STEP_MS);
    }

    function stepFade(ts) {
      rafId = 0;
      if (destroyed || !isEnabled() || document.hidden || items.length === 0) {
        clearHighlights();
        return;
      }
      const bks = ensureBuckets();
      if (!bks) return;
      const now = typeof ts === 'number' ? ts : performance.now();
      const nextItems = [];
      for (const it of items) {
        const val = it.n?.nodeValue || '';
        const age = Math.max(0, now - it.t);
        if (!it.n?.isConnected || val.length < it.e || age >= FADE_MS) {
          removeFromBucket(it);
          continue;
        }
        const nb = Math.min(4, Math.floor(age / STEP_MS));
        if (it.b !== nb) {
          removeFromBucket(it);
          try {
            bks[nb].add(it.r);
            it.b = nb;
          } catch {
            continue;
          }
        }
        nextItems.push(it);
      }
      items = nextItems;
      if (items.length > 0) scheduleStep();
      else clearHighlights();
    }

    function enqueueRange(textNode, startOff, endOff, now) {
      if (!textNode || endOff <= startOff || document.hidden) return;
      const bks = ensureBuckets();
      if (!bks) return;
      const raw = textNode.nodeValue || '';
      if (endOff > raw.length || !/\S/.test(raw.slice(startOff, endOff))) return;

      // Coalesce contiguous tokens appended within 64ms
      const prev = items[items.length - 1];
      if (prev && prev.n === textNode && prev.e === startOff && now - prev.t <= 64) {
        try {
          prev.r.setEnd(textNode, endOff);
          prev.e = endOff;
          return;
        } catch {}
      }

      if (items.length >= MAX_RANGES) {
        const dropped = items.shift();
        if (dropped) removeFromBucket(dropped);
      }

      try {
        const range = document.createRange();
        range.setStart(textNode, startOff);
        range.setEnd(textNode, endOff);
        bks[0].add(range);
        items.push({ n: textNode, s: startOff, e: endOff, r: range, b: 0, t: now });
        scheduleStep();
      } catch {}
    }

    function isInsideConversation(node) {
      const el = node.nodeType === 1 ? node : node.parentElement;
      if (!el || !el.isConnected) return false;
      if (el.closest?.('.ProseMirror, [contenteditable="true"], nav, aside, header, .cp-settings-modal, .cp-vial-popover, .cp-dock-cluster, .cp-mascot-stage, pre, code')) {
        return false;
      }
      return Boolean(el.closest?.('main, [class*="font-claude"], [data-is-streaming]'));
    }

    function handleMutations(records) {
      if (destroyed || !isEnabled() || document.hidden) return;
      if (!isStreaming()) return;
      const now = performance.now();

      for (const rec of records) {
        if (rec.type === 'characterData') {
          const tn = rec.target;
          if (!tn || tn.nodeType !== 3 || !isInsideConversation(tn)) continue;
          const prevLen = textLens.get(tn) ?? (rec.oldValue ? rec.oldValue.length : 0);
          const curLen = (tn.nodeValue || '').length;
          textLens.set(tn, curLen);
          if (curLen > prevLen) {
            enqueueRange(tn, prevLen, curLen, now);
          }
        } else if (rec.type === 'childList' && rec.addedNodes.length > 0) {
          for (const added of rec.addedNodes) {
            if (!isInsideConversation(added)) continue;
            if (added.nodeType === 3) {
              const len = (added.nodeValue || '').length;
              textLens.set(added, len);
              if (len > 0) enqueueRange(added, 0, len, now);
            } else if (added.nodeType === 1) {
              const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
              let tn = walker.nextNode();
              let count = 0;
              while (tn && count < 12) {
                const len = (tn.nodeValue || '').length;
                textLens.set(tn, len);
                if (len > 0) enqueueRange(tn, 0, len, now);
                tn = walker.nextNode();
                count++;
              }
            }
          }
        }
      }
    }

    function start() {
      if (observer) return;
      observer = new MutationObserver(handleMutations);
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
      });
    }

    function sync() {
      if (!isEnabled()) clearHighlights();
    }

    function destroy() {
      destroyed = true;
      if (observer) { observer.disconnect(); observer = null; }
      clearHighlights();
      if (typeof CSS !== 'undefined' && CSS.highlights) {
        for (const name of BUCKET_NAMES) {
          try { CSS.highlights.delete(name); } catch {}
        }
      }
      buckets = null;
    }

    return { start, sync, destroy };
  }

  CP.createInkStreamController = createInkStreamController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
