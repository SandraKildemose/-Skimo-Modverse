/**
 * Mobil-specifik videostien: samme oplevelse som desktop (autoplay, ingen synlig play-knap),
 * med ekstra attributter, CSS og gentagne play-forsøg til Safari/Chrome på touch.
 */
(() => {
  function shouldUseMobileVideoPipeline() {
    try {
      // Ved 1:1 desktop-viewport er innerWidth ~1920 — brug touch, ikke max-width.
      if (document.documentElement.getAttribute('data-skimo-desktop-1to1') === '1') {
        const touch =
          typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
        return touch || 'ontouchstart' in window;
      }
      const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
      const narrow =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 1024px)').matches;
      const coarse =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      return (touch && narrow) || coarse;
    } catch {
      return false;
    }
  }

  if (!shouldUseMobileVideoPipeline()) return;

  function safePlay(video) {
    if (!video || !(video instanceof HTMLVideoElement)) return;
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
    } catch {}
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  function stripControlsAndArm(video) {
    try {
      video.removeAttribute('controls');
      video.controls = false;
    } catch {}
    try {
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
    } catch {}
    try {
      video.setAttribute('muted', '');
      video.muted = true;
      video.defaultMuted = true;
    } catch {}
    try {
      video.setAttribute('preload', 'auto');
      video.preload = 'auto';
    } catch {}
    try {
      video.setAttribute('disablepictureinpicture', '');
      video.disablePictureInPicture = true;
    } catch {}
    try {
      if ('disableRemotePlayback' in video) video.disableRemotePlayback = true;
    } catch {}
    try {
      if (video.controlsList && typeof video.controlsList.add === 'function') {
        video.controlsList.add('nodownload');
        video.controlsList.add('noremoteplayback');
        video.controlsList.add('noplaybackrate');
      }
    } catch {}
    video.classList.add('skimo-mobile-ambient');
  }

  function collectVideos() {
    return Array.from(document.querySelectorAll('video'));
  }

  function primeAllVideos(videos) {
    videos.forEach((video) => {
      stripControlsAndArm(video);
      try {
        video.load();
      } catch {}
      safePlay(video);
    });
  }

  function startPlayRetryLoop(videos, durationMs) {
    const start = Date.now();
    const id = window.setInterval(() => {
      videos.forEach((v) => {
        if (v.paused || v.readyState < 2) safePlay(v);
      });
      if (Date.now() - start >= durationMs) window.clearInterval(id);
    }, 200);
  }

  function wireGestureUnlock(videos) {
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      primeAllVideos(collectVideos());
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('click', unlock, true);
    };
    window.addEventListener('touchstart', unlock, { passive: true, capture: true, once: true });
    window.addEventListener('pointerdown', unlock, { passive: true, capture: true, once: true });
    window.addEventListener('click', unlock, { passive: true, capture: true, once: true });
  }

  function wireVisibility() {
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) collectVideos().forEach((v) => safePlay(v));
      },
      { passive: true }
    );
  }

  function injectCss() {
    if (document.head.querySelector('link[data-skimo-mobile-video-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-skimo-mobile-video-css', '1');
    let v = '';
    try {
      const nodes = document.querySelectorAll('script[src*="skimo-mobile-video.js"]');
      const el = nodes[nodes.length - 1];
      if (el && el.src) {
        const m = el.src.match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
      }
    } catch {}
    link.href = v ? 'assets/skimo-mobile-video.css?v=' + encodeURIComponent(v) : 'assets/skimo-mobile-video.css';
    document.head.appendChild(link);
  }

  function scheduleReprime() {
    const delays = [0, 120, 400, 1200, 3200];
    delays.forEach((ms) => {
      window.setTimeout(() => {
        const v = collectVideos();
        v.forEach(stripControlsAndArm);
        primeAllVideos(v);
      }, ms);
    });
  }

  function run() {
    document.documentElement.setAttribute('data-skimo-mobile-video', '1');
    injectCss();

    const videos = collectVideos();
    videos.forEach(stripControlsAndArm);
    primeAllVideos(videos);
    startPlayRetryLoop(collectVideos(), 8000);
    wireGestureUnlock(videos);
    wireVisibility();
    scheduleReprime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
