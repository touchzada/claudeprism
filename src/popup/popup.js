(function () {
  'use strict';
  const STORAGE_KEY = 'claudePrismConfigV1';
  const DEFAULTS = {
    enabled: true,
    palette: 'warm',
    mascotMode: 'dual',
  };

  let cfg = { ...DEFAULTS };

  function render() {
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.dataset.on = cfg.enabled ? '1' : '0';
    toggleBtn.textContent = cfg.enabled ? 'Ativo' : 'Pausado';

    document.querySelectorAll('#paletteGrid .btn').forEach((b) => {
      b.dataset.active = b.dataset.palette === cfg.palette ? '1' : '0';
    });
    document.querySelectorAll('#mascotGrid .btn').forEach((b) => {
      b.dataset.active = b.dataset.mascot === cfg.mascotMode ? '1' : '0';
    });
  }

  function save(patch) {
    cfg = { ...cfg, ...patch };
    chrome.storage.sync.set({ [STORAGE_KEY]: cfg });
    render();
  }

  chrome.storage.sync.get([STORAGE_KEY], (res) => {
    if (res && res[STORAGE_KEY]) cfg = { ...DEFAULTS, ...res[STORAGE_KEY] };
    render();
  });

  document.getElementById('toggleBtn').addEventListener('click', () => {
    save({ enabled: !cfg.enabled });
  });

  document.querySelectorAll('#paletteGrid .btn').forEach((b) => {
    b.addEventListener('click', () => save({ enabled: true, palette: b.dataset.palette }));
  });

  document.querySelectorAll('#mascotGrid .btn').forEach((b) => {
    b.addEventListener('click', () => save({ enabled: true, mascotMode: b.dataset.mascot }));
  });

  document.getElementById('openPanelBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.url && tab.url.startsWith('https://claude.ai')) {
        chrome.tabs.sendMessage(tab.id, { type: 'CP_OPEN_SETTINGS' }, () => {
          void chrome.runtime.lastError;
          window.close();
        });
      } else {
        chrome.tabs.create({ url: 'https://claude.ai' });
      }
    });
  });
})();
