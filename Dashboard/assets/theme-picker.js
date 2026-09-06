(() => {
  const STORAGE_KEY = 'skimo_theme_v1';
  const THEMES = ['dark', 'blue'];
  const DEFAULT_THEME =
    typeof document !== 'undefined' &&
    document.body &&
    document.body.classList.contains('faq-page')
      ? 'blue'
      : 'dark';

  function getStoredTheme() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null || String(raw).trim() === '') return DEFAULT_THEME;
      const v = String(raw || '').trim().toLowerCase();
      return THEMES.includes(v) ? v : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const t = THEMES.includes(theme) ? theme : DEFAULT_THEME;
    root.setAttribute('data-theme', t);

    try {
      const attr =
        t === 'dark' ? 'data-theme-src-dark' : 'data-theme-src-blue';
      document.querySelectorAll('img[data-theme-src-gray], img[data-theme-src-dark], img[data-theme-src-blue]').forEach((img) => {
        const next = img.getAttribute(attr) || img.getAttribute('data-theme-src-gray') || img.getAttribute('src');
        if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
      });
    } catch {}
  }

  function setTheme(theme) {
    const t = THEMES.includes(theme) ? theme : DEFAULT_THEME;
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyTheme(t);
    syncUi(t);
  }

  function syncUi(theme) {
    document.querySelectorAll('.skimo-theme-switcher').forEach((sw) => {
      sw.querySelectorAll('.skimo-theme-choice[data-theme]').forEach((btn) => {
        btn.classList.toggle('is-active', String(btn.getAttribute('data-theme')) === theme);
      });
      const toggle = sw.querySelector('.skimo-theme-btn');
      if (toggle) {
        const label =
          theme === 'dark' ? 'Tema: Mørk' :
          'Tema: Blå';
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('title', label);
      }
    });
  }

  function closeAll() {
    document.querySelectorAll('.skimo-theme-popover').forEach((p) => (p.hidden = true));
    document.querySelectorAll('.skimo-theme-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  function wireOne(switcher) {
    const toggle = switcher.querySelector('.skimo-theme-btn');
    const popover = switcher.querySelector('.skimo-theme-popover');
    if (!toggle || !popover) return;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = popover.hidden;
      closeAll();
      popover.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    switcher.querySelectorAll('.skimo-theme-choice[data-theme]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = String(btn.getAttribute('data-theme') || DEFAULT_THEME);
        setTheme(t);
        closeAll();
      });
    });
  }

  // Brug gemt tema — overskriv ikke localStorage ved hver sideindlæsning (det knækkede tema på domænet).
  const initial = getStoredTheme();
  applyTheme(initial);

  document.addEventListener('DOMContentLoaded', () => {
    const theme = getStoredTheme();
    applyTheme(theme);
    document.querySelectorAll('.skimo-theme-switcher').forEach((sw) => wireOne(sw));
    syncUi(theme);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.skimo-theme-switcher')) closeAll();
    });

    // Mobil og touch-enheder: luk ved tryk udenfor (pointerdown reagerer ofte mere stabilt end click alene).
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!e.target.closest('.skimo-theme-switcher')) closeAll();
      },
      { passive: true }
    );

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  });
})();
