// Claude Prism — Smoked Obsidian Floating Settings Control Panel
(function (root) {
  'use strict';
  const CP = (root.ClaudePrism = root.ClaudePrism || {});

  function createSettingsPanelController({ configApi }) {
    let backdrop = null;
    let modal = null;
    let bodyEl = null;
    let destroyed = false;

    function buildSeg(options, currentVal, onPick) {
      const seg = document.createElement('div');
      seg.className = 'cp-seg';
      for (const opt of options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-active', String(opt.val === currentVal ? 1 : 0));
        if (opt.dot) {
          const dot = document.createElement('span');
          dot.className = 'cp-dot';
          dot.style.background = opt.dot;
          b.appendChild(dot);
        }
        const lbl = document.createElement('span');
        lbl.textContent = opt.label;
        b.appendChild(lbl);
        b.addEventListener('click', () => onPick(opt.val));
        seg.appendChild(b);
      }
      return seg;
    }

    function buildSwitch(checked, onToggle) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'cp-switch';
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', checked ? 'true' : 'false');
      sw.addEventListener('click', () => onToggle(!checked));
      return sw;
    }

    function buildRow(title, desc, controlEl) {
      const row = document.createElement('div');
      row.className = 'cp-row';
      const meta = document.createElement('div');
      meta.className = 'cp-row-meta';
      const t = document.createElement('div');
      t.className = 'cp-row-title';
      t.textContent = title;
      const d = document.createElement('div');
      d.className = 'cp-row-desc';
      d.textContent = desc;
      meta.append(t, d);
      row.append(meta, controlEl);
      return row;
    }

    function renderBody() {
      if (!bodyEl) return;
      const cfg = configApi.getConfig();
      bodyEl.innerHTML = '';

      // Scene Presets Bar
      const presetBar = document.createElement('div');
      presetBar.className = 'cp-preset-bar';
      const pLabel = document.createElement('span');
      pLabel.textContent = 'Presets Rápidos';
      const pSeg = buildSeg(
        [
          { val: 'ultra', label: 'Full Optical' },
          { val: 'focus', label: 'Deep Focus' },
          { val: 'eco', label: 'Silent Eco' },
        ],
        cfg.motionLevel === 'off' ? 'eco' : cfg.motionLevel === 'subtle' ? 'focus' : 'ultra',
        (p) => { configApi.applyPreset(p); renderBody(); }
      );
      presetBar.append(pLabel, pSeg);
      bodyEl.appendChild(presetBar);

      // Card 1: Themes & Optical Style
      const themeCard = document.createElement('div');
      themeCard.className = 'cp-card';

      themeCard.appendChild(buildRow(
        'Tema Óptico',
        '4 paletas Smoked Obsidian / Daylight ou seguir o tema do Claude.',
        buildSeg(
          [
            { val: 'warm', label: 'Warm', dot: '#D97757' },
            { val: 'obsidian', label: 'Obsidian', dot: '#669DF6' },
            { val: 'crystal', label: 'Crystal', dot: '#E8EEF6' },
            { val: 'alabaster', label: 'Alabaster', dot: '#EBE6DC' },
            { val: 'auto', label: 'Auto' },
          ],
          cfg.palette,
          (v) => { configApi.setConfig({ palette: v }); renderBody(); }
        )
      ));

      themeCard.appendChild(buildRow(
        'Cor de Destaque',
        'Controla cursor, brilho prismático, frasco e seleção.',
        buildSeg(
          [
            { val: 'follow', label: 'Tema' },
            { val: 'terracotta', label: 'Claude', dot: '#D97757' },
            { val: 'cobalt', label: 'Cobalt', dot: '#669DF6' },
            { val: 'iris', label: 'Iris', dot: '#A58AF8' },
            { val: 'amber', label: 'Amber', dot: '#F2B84B' },
            { val: 'mono', label: 'Mono', dot: '#CBD5E1' },
          ],
          cfg.accentTone,
          (v) => { configApi.setConfig({ accentTone: v }); renderBody(); }
        )
      ));

      themeCard.appendChild(buildRow(
        'Arredondamento',
        'Geometria dos cards, botões e caixa de mensagem.',
        buildSeg(
          [
            { val: 'sharp', label: 'Sharp' },
            { val: 'balanced', label: 'Balanced' },
            { val: 'soft', label: 'Soft' },
          ],
          cfg.cornerStyle,
          (v) => { configApi.setConfig({ cornerStyle: v }); renderBody(); }
        )
      ));

      const ambWrap = document.createElement('div');
      ambWrap.className = 'cp-slider-wrap';
      const ambInput = document.createElement('input');
      ambInput.type = 'range';
      ambInput.min = '0';
      ambInput.max = '100';
      ambInput.step = '5';
      ambInput.value = String(cfg.ambientIntensity);
      const ambVal = document.createElement('span');
      ambVal.className = 'cp-slider-val';
      ambVal.textContent = `${cfg.ambientIntensity}%`;
      ambInput.addEventListener('input', () => {
        const v = Number(ambInput.value);
        ambVal.textContent = `${v}%`;
        configApi.setConfig({ ambientIntensity: v });
      });
      ambWrap.append(ambInput, ambVal);
      themeCard.appendChild(buildRow(
        'Intensidade de Brilho',
        'Força do brilho prismático nas bordas e aurora de fundo.',
        ambWrap
      ));

      bodyEl.appendChild(themeCard);

      // Card 2: Tactile Motion & Visual Effects
      const fxCard = document.createElement('div');
      fxCard.className = 'cp-card';

      fxCard.appendChild(buildRow(
        'Cursor Deslizante (Smooth Caret)',
        'Substitui o cursor duro por um tracinho luminoso com deslize suave.',
        buildSwitch(cfg.smoothCaret, (v) => { configApi.setConfig({ smoothCaret: v }); renderBody(); })
      ));

      fxCard.appendChild(buildRow(
        'Texto Nascendo Suave (Ink Streaming)',
        'Efeito de tinta em 5 passos nas respostas do Claude sem pesar no DOM.',
        buildSwitch(cfg.inkStream, (v) => { configApi.setConfig({ inkStream: v }); renderBody(); })
      ));

      fxCard.appendChild(buildRow(
        'Borda Prismática no Mouse',
        'Reflexo luminoso nas bordas do composer que acompanha o ponteiro.',
        buildSwitch(cfg.prismRim, (v) => { configApi.setConfig({ prismRim: v }); renderBody(); })
      ));

      fxCard.appendChild(buildRow(
        'Ondas / Aurora na Tela Inicial',
        'Fundo interativo suave na Home com modo 0fps quando ocioso.',
        buildSwitch(cfg.homeRipple, (v) => { configApi.setConfig({ homeRipple: v }); renderBody(); })
      ));

      fxCard.appendChild(buildRow(
        'Brilho Semântico na Borda',
        'Indica discretamente quando o Claude está gerando ou terminou.',
        buildSwitch(cfg.semanticCue, (v) => { configApi.setConfig({ semanticCue: v }); renderBody(); })
      ));

      bodyEl.appendChild(fxCard);

      // Card 3: Mascots & Productivity
      const playCard = document.createElement('div');
      playCard.className = 'cp-card';

      playCard.appendChild(buildRow(
        'Mascotes Pixelados',
        'Arraste, jogue ou empilhe em cima da caixa de prompt! (Gato empilhado + 4 cliques = 🌈)',
        buildSeg(
          [
            { val: 'off', label: 'Off' },
            { val: 'clawd', label: 'Clawd' },
            { val: 'dual', label: 'Duo' },
            { val: 'quad', label: 'Quad' },
            { val: 'quad-minis', label: 'Quad + Crabs' },
          ],
          cfg.mascotMode,
          (v) => { configApi.setConfig({ mascotMode: v }); renderBody(); }
        )
      ));

      playCard.appendChild(buildRow(
        'Frasco de Contexto Estimado',
        'Frasquinho líquido no canto inferior direito estimando o tamanho do chat.',
        buildSwitch(cfg.contextVial, (v) => { configApi.setConfig({ contextVial: v }); renderBody(); })
      ));

      playCard.appendChild(buildRow(
        'Índice Lateral + Alt+↑/↓',
        'Trilha lateral com preview dos seus prompts e navegação rápida por teclado.',
        buildSwitch(cfg.turnNav, (v) => { configApi.setConfig({ turnNav: v }); renderBody(); })
      ));

      playCard.appendChild(buildRow(
        'Recolher Blocos de Código Longos',
        'Adiciona botão para recolher/expandir blocos com mais de 38 linhas.',
        buildSwitch(cfg.codeFold, (v) => { configApi.setConfig({ codeFold: v }); renderBody(); })
      ));

      bodyEl.appendChild(playCard);
    }

    function ensureDom() {
      if (backdrop && backdrop.isConnected) return;
      backdrop = document.createElement('div');
      backdrop.className = 'cp-settings-backdrop';
      backdrop.addEventListener('click', (ev) => {
        if (ev.target === backdrop) close();
      });

      modal = document.createElement('div');
      modal.className = 'cp-settings-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-label', 'Claude Prism Settings');

      const head = document.createElement('div');
      head.className = 'cp-settings-head';
      head.innerHTML =
        '<div class="cp-settings-brand">' +
        '<svg width="22" height="22" viewBox="0 0 16 16" fill="none">' +
        '<rect x="1" y="1" width="14" height="14" rx="4" fill="#18191E" stroke="rgba(255,255,255,0.16)"/>' +
        '<path d="M8 3.2L9.3 6.7L12.8 8L9.3 9.3L8 12.8L6.7 9.3L3.2 8L6.7 6.7L8 3.2Z" fill="var(--cp-accent)"/>' +
        '</svg>' +
        '<div><h2>Claude Prism</h2><span>Optical UI &amp; Motion Suite · v1.0.0</span></div>' +
        '</div>';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'cp-close-btn';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', close);
      head.appendChild(closeBtn);

      bodyEl = document.createElement('div');
      bodyEl.className = 'cp-settings-body';

      const foot = document.createElement('div');
      foot.className = 'cp-settings-foot';
      const hint = document.createElement('span');
      hint.textContent = 'Atalho: Alt+Shift+P · 100% local, 0fps ocioso';
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '6px';

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'cp-foot-btn';
      resetBtn.textContent = 'Restaurar Padrão';
      resetBtn.addEventListener('click', () => {
        configApi.setConfig({ ...configApi.DEFAULTS });
        renderBody();
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'cp-foot-btn';
      toggleBtn.textContent = 'Desativar Mod';
      toggleBtn.addEventListener('click', () => {
        configApi.setConfig({ enabled: false });
        close();
      });

      actions.append(resetBtn, toggleBtn);
      foot.append(hint, actions);

      modal.append(head, bodyEl, foot);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
    }

    function open() {
      if (destroyed) return;
      ensureDom();
      renderBody();
      backdrop.setAttribute('data-open', '1');
    }

    function close() {
      if (backdrop) backdrop.removeAttribute('data-open');
    }

    function onEsc(ev) {
      if (ev.key === 'Escape' && backdrop?.getAttribute('data-open') === '1') {
        close();
      }
    }

    function start() {
      document.addEventListener('keydown', onEsc, true);
    }

    function getModalEl() {
      return modal && backdrop?.getAttribute('data-open') === '1' ? modal : null;
    }

    function destroy() {
      destroyed = true;
      document.removeEventListener('keydown', onEsc, true);
      if (backdrop) { backdrop.remove(); backdrop = modal = bodyEl = null; }
    }

    return { start, open, close, getModalEl, destroy };
  }

  CP.createSettingsPanelController = createSettingsPanelController;
})(typeof globalThis !== 'undefined' ? globalThis : window);
