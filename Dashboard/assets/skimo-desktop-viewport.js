/**
 * 1:1 med computer: sætter layout-viewport til fast desktop-bredde og initial-scale,
 * så CSS (inkl. @media) matcher desktop. Opdateres ved resize og orientationchange.
 * Kun på touch / mobil — ikke på almindelig desktop-browser.
 */
(function () {
  var DESIGN_WIDTH = 1920;
  /* Inkl. store telefoner i landskab og mindre tablets — stadig “mobil” */
  var MAX_APPLY_WIDTH = 1366;

  function isTouchDevice() {
    try {
      return (
        ('ontouchstart' in window) ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      );
    } catch (e) {
      return false;
    }
  }

  function shouldUseDesktop1to1Viewport() {
    try {
      var w = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 0;
      if (w <= 0 || w > MAX_APPLY_WIDTH) return false;
      return isTouchDevice();
    } catch (e) {
      return false;
    }
  }

  function applyViewport() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    var w = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 0;

    if (!shouldUseDesktop1to1Viewport()) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
      try {
        document.documentElement.removeAttribute('data-skimo-desktop-1to1');
      } catch (e) {}
      return;
    }

    var scale = Math.max(0.04, Math.min(5, w / DESIGN_WIDTH));
    meta.setAttribute(
      'content',
      'width=' +
        DESIGN_WIDTH +
        ', initial-scale=' +
        scale.toFixed(4) +
        ', minimum-scale=0.04, maximum-scale=5, viewport-fit=cover, user-scalable=yes'
    );
    try {
      document.documentElement.setAttribute('data-skimo-desktop-1to1', '1');
    } catch (e) {}

    if (!document.getElementById('skimo-desktop-1to1-style')) {
      var st = document.createElement('style');
      st.id = 'skimo-desktop-1to1-style';
      st.textContent =
        'html[data-skimo-desktop-1to1="1"] body{overflow-x:hidden;}' +
        'html[data-skimo-desktop-1to1="1"]{-webkit-text-size-adjust:100%;}';
      document.head.appendChild(st);
    }
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  applyViewport();

  var onResize = debounce(applyViewport, 120);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(applyViewport, 280);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyViewport, { once: true });
  }
})();
