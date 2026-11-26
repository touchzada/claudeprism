// Claude Prism — Main Content Script Bootstrap & Lifecycle Orchestrator
(function (root) {
  'use strict';
  const CP = root.ClaudePrism;
  if (!CP || root.__claudePrismMounted) return;
  root.__claudePrismMounted = true;

  const { config: configApi, motion, theme } = CP;

  let workbench = null;
  let settingsPanel = null;
  let smoothCaret = null;
  let inkStream = null;
  let prismRim = null;
  let ripple = null;
  let mascots = null;

  function syncAll() {
    const cfg = configApi.getConfig();
    theme.applyTheme(cfg);
    if (cfg.enabled) motion.applySpringVars();
    workbench?.sync();
    smoothCaret?.sync();
    inkStream?.sync();
    prismRim?.sync();
    ripple?.sync();
    mascots?.sync();
  }

  async function init() {
    await configApi.loadConfig();

    settingsPanel = CP.createSettingsPanelController({ configApi });

    workbench = CP.createWorkbenchController({
      getConfig: () => configApi.getConfig(),
      onOpenSettings: () => settingsPanel.open(),
      onStreamFinished: () => mascots?.celebrateDone(),
    });

    smoothCaret = CP.createSmoothCaretController({
      isEnabled: () => {
        const c = configApi.getConfig();
        return c.enabled && c.smoothCaret && motion.getMotionTier(c) !== 'off';
      },
    });

    inkStream = CP.createInkStreamController({
      isEnabled: () => {
        const c = configApi.getConfig();
        return c.enabled && c.inkStream && motion.getMotionTier(c) !== 'off';
      },
      isStreaming: () => Boolean(workbench?.isStreaming()),
    });

    prismRim = CP.createPrismRimController({
      isEnabled: () => {
        const c = configApi.getConfig();
        return c.enabled && c.prismRim && motion.getMotionTier(c) !== 'off' && c.ambientIntensity > 0;
      },
      getConfig: () => configApi.getConfig(),
      getTargets: () => {
        const list = [];
        const composer = workbench?.findComposerCard();
        if (composer) list.push(composer);
        const modal = settingsPanel?.getModalEl();
        if (modal) list.push(modal);
        return list;
      },
    });

    ripple = CP.createRippleBackdropController({
      isEnabled: () => {
        const c = configApi.getConfig();
        return c.enabled && c.homeRipple && motion.getMotionTier(c) !== 'off' && c.ambientIntensity > 0;
      },
      isHomeScreen: () => Boolean(workbench?.isHomeScreen()),
      getConfig: () => configApi.getConfig(),
      getComposerCard: () => workbench?.findComposerCard(),
    });

    mascots = CP.createMascotController({
      isEnabled: () => {
        const c = configApi.getConfig();
        return c.enabled && c.mascotMode !== 'off';
      },
      getConfig: () => configApi.getConfig(),
      getComposerCard: () => workbench?.findComposerCard(),
      isStreaming: () => Boolean(workbench?.isStreaming()),
    });

    configApi.onConfigChange(syncAll);

    // Watch host light/dark mode toggles when palette === 'auto'
    const modeObs = new MutationObserver(() => {
      if (configApi.getConfig().palette === 'auto') {
        theme.applyTheme(configApi.getConfig());
      }
    });
    modeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme', 'class'] });

    // Strict 0fps pause on visibility change
    document.addEventListener('visibilitychange', () => {
      syncAll();
    });

    // React to SPA navigation on claude.ai (Home '/' -> '/chat/<id>')
    let lastHref = root.location.href;
    const onRouteChange = () => {
      syncAll();
      setTimeout(syncAll, 200);
      setTimeout(syncAll, 750);
    };
    root.addEventListener('popstate', onRouteChange);
    setInterval(() => {
      if (root.location.href !== lastHref) {
        lastHref = root.location.href;
        onRouteChange();
      }
    }, 300);

    // Handle commands from extension toolbar popup
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === 'CP_OPEN_SETTINGS') {
          if (!configApi.getConfig().enabled) configApi.setConfig({ enabled: true });
          settingsPanel.open();
          sendResponse?.({ ok: true });
        }
      });
    }

    settingsPanel.start();
    workbench.start();
    smoothCaret.start();
    inkStream.start();
    prismRim.start();
    ripple.start();
    mascots.start();
    syncAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
