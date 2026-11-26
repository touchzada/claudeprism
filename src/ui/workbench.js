// Claude Prism — Workbench Enhancements (Composer Tagging, Liquid Context Vial,
// Conversation Outline Rail, Alt+Up/Down Turn Navigation, Code Folding & Semantic Edge Cue)
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  const EST_CONTEXT_LIMIT = 200000;

  function createWorkbenchController({ getConfig, onOpenSettings, onStreamFinished }) {
    let dockEl = null;
    let vialBtn = null;
    let vialFill = null;
    let vialPctEl = null;
    let vialPopover = null;
    let prismPill = null;
    let outlineRail = null;
    let outlineTooltip = null;
    let edgeEl = null;
    let scanTimer = 0;
    let edgeDoneTimer = 0;
    let wasStreaming = false;
    let currentTurnIndex = -1;
    let cachedComposerCard = null;
    let destroyed = false;

    function findComposerEditor() {
      return (
        document.querySelector('div.ProseMirror[contenteditable="true"]') ||
        document.querySelector('fieldset [contenteditable="true"]') ||
        document.querySelector('[data-testid="chat-input"]') ||
        null
      );
    }

    function isVisibleBoxStyle(cs) {
      if (!cs) return false;
      const bg = cs.backgroundColor || '';
      const hasBg = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
      const borderW = parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth) || 0;
      const hasBorder = borderW > 0 && cs.borderTopStyle !== 'none';
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      return radius >= 12 && (hasBg || hasBorder || hasShadow);
    }

    function findComposerCard() {
      const ed = findComposerEditor();
      if (!ed) {
        cachedComposerCard = null;
        return null;
      }
      // Climb up and select the OUTERMOST rounded visual card enclosing the editor & toolbar
      // (avoids grabbing inner padding wrappers that caused double borders & clipped mascots!)
      let cur = ed.parentElement;
      const visualCards = [];
      let fallback = ed.parentElement;

      for (let i = 0; i < 8 && cur && cur !== document.body && cur !== document.documentElement; i++) {
        const tag = cur.tagName;
        if (tag === 'MAIN' || tag === 'SECTION' || tag === 'HEADER' || tag === 'NAV' || tag === 'ASIDE') break;
        const rect = cur.getBoundingClientRect();
        if (rect.width > 980 || rect.height > 440) break;
        const hasBtn = Boolean(cur.querySelector('button'));
        if (rect.width >= 260 && rect.height >= 48 && hasBtn) {
          fallback = cur;
          const cs = getComputedStyle(cur);
          if (isVisibleBoxStyle(cs)) {
            visualCards.push({ el: cur, rect });
          }
        }
        cur = cur.parentElement;
      }

      // Prefer the outermost visual card (last in visualCards)
      const best = visualCards.length > 0 ? visualCards[visualCards.length - 1].el : fallback;

      if (cachedComposerCard && cachedComposerCard !== best && cachedComposerCard.isConnected) {
        cachedComposerCard.removeAttribute('data-cp-composer-card');
      }
      if (best && best.isConnected) {
        if (best.getAttribute('data-cp-composer-card') !== '1') {
          best.setAttribute('data-cp-composer-card', '1');
        }
        cachedComposerCard = best;
      }
      return cachedComposerCard;
    }

    function isHomeScreen() {
      const p = root.location?.pathname || '/';
      return p === '/' || p === '/new' || !p.startsWith('/chat/');
    }

    function isStreaming() {
      if (document.querySelector('[data-is-streaming="true"]')) return true;
      const stopBtn = document.querySelector(
        'button[aria-label*="Stop" i], button[aria-label*="Parar" i], button[aria-label*="Cancel" i]'
      );
      return Boolean(stopBtn && stopBtn.offsetParent !== null);
    }

    function getUserTurns() {
      const selectors = [
        '[data-testid="user-message"]',
        '[data-testid*="user-message"]',
        '.font-user-message',
      ];
      for (const sel of selectors) {
        const list = Array.from(document.querySelectorAll(sel)).filter((el) => el.isConnected && el.offsetHeight > 0);
        if (list.length > 0) return list;
      }
      return [];
    }

    function estimateContextUsage() {
      const main = document.querySelector('main') || document.body;
      const text = main ? (main.innerText || '') : '';
      // ~3.8 chars per token average for PT/EN + code
      const estTokens = Math.round(text.length / 3.8);
      const turns = getUserTurns().length;
      const codeBlocks = document.querySelectorAll('main pre').length;
      const pct = Math.min(100, Math.max(0, (estTokens / EST_CONTEXT_LIMIT) * 100));
      return { estTokens, turns, codeBlocks, pct };
    }

    function formatK(n) {
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
      return String(n);
    }

    function ensureDock() {
      const cfg = getConfig();
      if (!cfg.enabled) {
        removeDock();
        return;
      }
      if (!dockEl || !dockEl.isConnected) {
        dockEl = document.createElement('div');
        dockEl.className = 'cp-dock-cluster';

        vialBtn = document.createElement('button');
        vialBtn.type = 'button';
        vialBtn.className = 'cp-vial-btn';
        vialBtn.title = 'Estimativa do contexto da conversa atual';
        vialBtn.innerHTML =
          '<span class="cp-vial-glass"><span class="cp-vial-liquid"></span></span>' +
          '<span class="cp-vial-pct">0%</span>';
        vialFill = vialBtn.querySelector('.cp-vial-liquid');
        vialPctEl = vialBtn.querySelector('.cp-vial-pct');

        vialPopover = document.createElement('div');
        vialPopover.className = 'cp-vial-popover';
        vialPopover.setAttribute('role', 'dialog');
        document.body.appendChild(vialPopover);

        vialBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const open = vialPopover.getAttribute('data-open') === '1';
          if (open) {
            vialPopover.removeAttribute('data-open');
          } else {
            updateVial(true);
            vialPopover.setAttribute('data-open', '1');
          }
        });

        prismPill = document.createElement('button');
        prismPill.type = 'button';
        prismPill.className = 'cp-prism-pill';
        prismPill.title = 'Abrir Claude Prism (Alt+Shift+P)';
        prismPill.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<path d="M8 1.2L9.8 6.2L14.8 8L9.8 9.8L8 14.8L6.2 9.8L1.2 8L6.2 6.2L8 1.2Z" fill="var(--cp-accent)"/>' +
          '</svg><span>Prism</span>';
        prismPill.addEventListener('click', (ev) => {
          ev.stopPropagation();
          vialPopover?.removeAttribute('data-open');
          onOpenSettings?.();
        });

        dockEl.append(vialBtn, prismPill);
        document.body.appendChild(dockEl);
      }

      if (vialBtn) vialBtn.style.display = cfg.contextVial ? '' : 'none';
      if (!cfg.contextVial) vialPopover?.removeAttribute('data-open');
    }

    function updateVial(forcePopover = false) {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.contextVial || !vialBtn) return;
      const stats = estimateContextUsage();
      if (vialFill) vialFill.style.height = `${Math.max(8, Math.round(stats.pct))}%`;
      if (vialPctEl) vialPctEl.textContent = `${stats.pct < 1 && stats.estTokens > 0 ? '<1' : Math.round(stats.pct)}%`;

      if (vialPopover && (forcePopover || vialPopover.getAttribute('data-open') === '1')) {
        vialPopover.innerHTML =
          `<div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--cp-text-0)">` +
          `<span>Contexto Estimado</span><span>${formatK(stats.estTokens)} / 200k</span></div>` +
          `<div class="cp-vial-bar"><div class="cp-vial-bar-fill" style="width:${Math.max(2, stats.pct).toFixed(1)}%"></div></div>` +
          `<div class="cp-vial-grid">` +
          `<span>Ocupação aproximada</span><strong>${stats.pct.toFixed(1)}%</strong>` +
          `<span>Seus turnos</span><strong>${stats.turns}</strong>` +
          `<span>Blocos de código</span><strong>${stats.codeBlocks}</strong>` +
          `</div>` +
          `<div style="margin-top:9px;font-size:10.5px;color:var(--cp-text-3)">Estimativa local baseada no texto visível da conversa.</div>`;
      }
    }

    function removeDock() {
      if (dockEl) { dockEl.remove(); dockEl = null; }
      if (vialPopover) { vialPopover.remove(); vialPopover = null; }
      vialBtn = vialFill = vialPctEl = prismPill = null;
    }

    function ensureOutlineRail() {
      const cfg = getConfig();
      const turns = cfg.enabled && cfg.turnNav ? getUserTurns() : [];
      if (turns.length < 2) {
        if (outlineRail) { outlineRail.remove(); outlineRail = null; }
        if (outlineTooltip) { outlineTooltip.remove(); outlineTooltip = null; }
        return;
      }

      if (!outlineRail || !outlineRail.isConnected) {
        outlineRail = document.createElement('div');
        outlineRail.className = 'cp-outline-rail';
        outlineRail.setAttribute('aria-label', 'Índice de mensagens');
        document.body.appendChild(outlineRail);
      }
      if (!outlineTooltip || !outlineTooltip.isConnected) {
        outlineTooltip = document.createElement('div');
        outlineTooltip.className = 'cp-outline-tooltip';
        document.body.appendChild(outlineTooltip);
      }

      const sig = turns.map((t) => (t.innerText || '').slice(0, 24)).join('|');
      if (outlineRail.dataset.cpSig === sig) return;
      outlineRail.dataset.cpSig = sig;
      outlineRail.innerHTML = '';

      turns.forEach((turnEl, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cp-outline-tick';
        btn.setAttribute('data-cp-no-spring', '1');
        const preview = (turnEl.innerText || `Turno ${idx + 1}`).replace(/\s+/g, ' ').trim().slice(0, 72);
        btn.addEventListener('mouseenter', () => {
          const r = btn.getBoundingClientRect();
          outlineTooltip.textContent = `${idx + 1}. ${preview}`;
          outlineTooltip.style.top = `${Math.round(r.top - 10)}px`;
          outlineTooltip.setAttribute('data-show', '1');
        });
        btn.addEventListener('mouseleave', () => {
          outlineTooltip.removeAttribute('data-show');
        });
        btn.addEventListener('click', () => {
          currentTurnIndex = idx;
          turnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          outlineRail.querySelectorAll('.cp-outline-tick').forEach((t, j) => {
            if (j === idx) t.setAttribute('data-active', '1');
            else t.removeAttribute('data-active');
          });
        });
        outlineRail.appendChild(btn);
      });
    }

    let foldBtnEl = null;
    let hoveredPre = null;

    function hideFoldBtn() {
      if (foldBtnEl) foldBtnEl.style.display = 'none';
      hoveredPre = null;
    }

    function ensureFoldBtn() {
      if (foldBtnEl && foldBtnEl.isConnected) return foldBtnEl;
      foldBtnEl = document.createElement('button');
      foldBtnEl.type = 'button';
      foldBtnEl.className = 'cp-code-fold-btn';
      foldBtnEl.style.display = 'none';
      foldBtnEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!hoveredPre || !hoveredPre.isConnected) return;
        const nextFold = hoveredPre.getAttribute('data-cp-folded') !== '1';
        if (nextFold) hoveredPre.setAttribute('data-cp-folded', '1');
        else hoveredPre.removeAttribute('data-cp-folded');
        positionFoldBtn(hoveredPre);
      });
      document.body.appendChild(foldBtnEl);
      return foldBtnEl;
    }

    function positionFoldBtn(pre) {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.codeFold || !pre || !pre.isConnected) {
        hideFoldBtn();
        return;
      }
      const lines = (pre.innerText || '').split('\n').length;
      if (lines < 38) {
        hideFoldBtn();
        return;
      }
      const r = pre.getBoundingClientRect();
      if (r.width < 120 || r.height < 60 || r.bottom < 40 || r.top > (root.innerHeight || 900) - 40) {
        hideFoldBtn();
        return;
      }
      const btn = ensureFoldBtn();
      hoveredPre = pre;
      const folded = pre.getAttribute('data-cp-folded') === '1';
      btn.textContent = folded ? `Expandir (${lines} linhas)` : 'Recolher código';
      btn.style.display = 'inline-flex';
      btn.style.top = `${Math.round(Math.min((root.innerHeight || 900) - 44, r.bottom - 36))}px`;
      btn.style.left = `${Math.round(Math.max(12, r.right - (folded ? 148 : 118)))}px`;
    }

    function onHoverCode(ev) {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.codeFold) { hideFoldBtn(); return; }
      const target = ev.target;
      if (foldBtnEl && (target === foldBtnEl || foldBtnEl.contains(target))) return;
      const pre = target?.closest?.('main pre') || null;
      if (pre) {
        positionFoldBtn(pre);
      } else if (hoveredPre) {
        hideFoldBtn();
      }
    }

    function enhanceCodeBlocks() {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.codeFold) {
        hideFoldBtn();
        document.querySelectorAll('pre[data-cp-folded]').forEach((p) => p.removeAttribute('data-cp-folded'));
      } else if (hoveredPre && hoveredPre.isConnected) {
        positionFoldBtn(hoveredPre);
      } else {
        hideFoldBtn();
      }
    }

    function syncSemanticEdge() {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.semanticCue) {
        if (edgeEl) { edgeEl.remove(); edgeEl = null; }
        wasStreaming = false;
        return;
      }
      if (!edgeEl || !edgeEl.isConnected) {
        edgeEl = document.createElement('div');
        edgeEl.className = 'cp-semantic-edge';
        edgeEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(edgeEl);
      }
      const streaming = isStreaming();
      if (streaming) {
        clearTimeout(edgeDoneTimer);
        edgeEl.setAttribute('data-state', 'streaming');
        wasStreaming = true;
      } else if (wasStreaming) {
        wasStreaming = false;
        edgeEl.setAttribute('data-state', 'done');
        onStreamFinished?.();
        clearTimeout(edgeDoneTimer);
        edgeDoneTimer = setTimeout(() => {
          if (edgeEl?.isConnected && edgeEl.getAttribute('data-state') === 'done') {
            edgeEl.removeAttribute('data-state');
          }
        }, 2200);
      }
    }

    function onKeyDown(ev) {
      const cfg = getConfig();
      if (!cfg.enabled) return;

      // Alt+Shift+P opens Claude Prism Settings
      if (ev.altKey && ev.shiftKey && (ev.key === 'P' || ev.key === 'p')) {
        ev.preventDefault();
        onOpenSettings?.();
        return;
      }

      // Alt+ArrowUp / Alt+ArrowDown jumps between user turns
      if (cfg.turnNav && ev.altKey && !ev.shiftKey && !ev.ctrlKey && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
        const turns = getUserTurns();
        if (turns.length === 0) return;
        ev.preventDefault();
        if (currentTurnIndex < 0 || currentTurnIndex >= turns.length) {
          currentTurnIndex = ev.key === 'ArrowUp' ? turns.length - 1 : 0;
        } else {
          currentTurnIndex = ev.key === 'ArrowUp'
            ? Math.max(0, currentTurnIndex - 1)
            : Math.min(turns.length - 1, currentTurnIndex + 1);
        }
        turns[currentTurnIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function onDocClick(ev) {
      if (vialPopover && vialPopover.getAttribute('data-open') === '1') {
        if (!vialPopover.contains(ev.target) && !vialBtn?.contains(ev.target)) {
          vialPopover.removeAttribute('data-open');
        }
      }
    }

    function scan() {
      if (destroyed) return;
      const cfg = getConfig();
      const html = document.documentElement;
      if (cfg.enabled) {
        html.setAttribute('data-cp-home', isHomeScreen() ? '1' : '0');
        html.setAttribute('data-cp-mascots-on', cfg.mascotMode !== 'off' ? '1' : '0');
      } else {
        html.removeAttribute('data-cp-home');
        html.removeAttribute('data-cp-mascots-on');
      }
      findComposerCard();
      ensureDock();
      updateVial(false);
      ensureOutlineRail();
      enhanceCodeBlocks();
      syncSemanticEdge();
    }

    function start() {
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('pointerover', onHoverCode, { passive: true });
      scan();
      scanTimer = setInterval(scan, 800);
    }

    function sync() {
      scan();
    }

    function destroy() {
      destroyed = true;
      clearInterval(scanTimer);
      clearTimeout(edgeDoneTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('pointerover', onHoverCode);
      removeDock();
      if (foldBtnEl) { foldBtnEl.remove(); foldBtnEl = null; }
      if (outlineRail) { outlineRail.remove(); outlineRail = null; }
      if (outlineTooltip) { outlineTooltip.remove(); outlineTooltip = null; }
      if (edgeEl) { edgeEl.remove(); edgeEl = null; }
      document.querySelectorAll('[data-cp-composer-card]').forEach((el) => el.removeAttribute('data-cp-composer-card'));
      document.querySelectorAll('pre[data-cp-folded]').forEach((p) => p.removeAttribute('data-cp-folded'));
    }

    return {
      start,
      sync,
      destroy,
      findComposerCard,
      isHomeScreen,
      isStreaming,
    };
  }

  CP.createWorkbenchController = createWorkbenchController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
