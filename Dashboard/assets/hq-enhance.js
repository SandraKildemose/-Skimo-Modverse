(() => {
  /** Sandt = hent billeder/video-buffere tidligt (mere data/CPU/batteri, hurtigere synlig kvalitet). */
  const PREFER_IMMEDIATE_MEDIA = true;

  function safePlay(video) {
    if (!video) return;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  function optimizeAutoplayVideos(videos) {
    if (!('IntersectionObserver' in window)) {
      videos.forEach((video) => {
        if (!video.autoplay) return;
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        safePlay(video);
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!(video instanceof HTMLVideoElement) || !video.autoplay) return;

        if (entry.isIntersecting) {
          video.preload = 'auto';
          video.muted = true;
          video.playsInline = true;
          safePlay(video);
          return;
        }

        // Failsafe: lad autoplay-videoer i vores produkt-bokse køre,
        // ellers risikerer vi at de bliver pauset og ender “sorte/blanke”.
        const isCinemaWired = video.hasAttribute('data-skimo-cinema-wired') ||
          (typeof video.closest === 'function' &&
            !!video.closest('.game-media[data-skimo-cinema-wired]'));
        if (isCinemaWired) return;

        try {
          video.pause();
        } catch {}
      });
    }, { rootMargin: '2400px 0px', threshold: 0 });

    videos.forEach((video) => {
      if (!video.autoplay) return;
      video.preload = 'auto';
      observer.observe(video);
    });
  }

  function primeAutoplayVideos(videos) {
    videos.forEach((video) => {
      const isAuto = video.autoplay || video.hasAttribute('autoplay');
      if (!isAuto) return;
      try { video.muted = true; } catch {}
      try { video.setAttribute('muted', ''); } catch {}
      try { if (!video.hasAttribute('playsinline')) video.setAttribute('playsinline', ''); } catch {}
      try { if (!video.hasAttribute('webkit-playsinline')) video.setAttribute('webkit-playsinline', ''); } catch {}
      try { if (!video.hasAttribute('preload')) video.setAttribute('preload', 'auto'); } catch {}
      try { video.preload = 'auto'; } catch {}
      try { video.load(); } catch {}
      safePlay(video);
    });
  }

  function injectCinemaPresentationLayer() {
    if (document.getElementById('skimo-cinema-layer')) return;
    const style = document.createElement('style');
    style.id = 'skimo-cinema-layer';
    // Kun produkt-ruder (.game-media) — ikke .page-hero-media (abonnement/kontakt/guide: ModGuard-billede øverst).
    style.textContent = `
      .game-media:not([data-skimo-cinema-wired]) {
        position: relative;
        isolation: isolate;
      }
      .game-media:not([data-skimo-cinema-wired])::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
        z-index: 1;
        background:
          radial-gradient(ellipse 96% 88% at 50% 40%, transparent 26%, rgba(2, 8, 18, 0.38) 100%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.065), transparent 26%);
      }
      .game-media:not([data-skimo-cinema-wired]) video {
        position: relative;
        z-index: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function applyHqEnhancements() {
    const root = document.documentElement;
    root.setAttribute('data-hq', 'on');
    root.setAttribute('data-skimo-cinema', 'on');
    injectCinemaPresentationLayer();

    const images = Array.from(document.querySelectorAll('img'));
    images.forEach((img, index) => {
      if (!img.getAttribute('decoding')) {
        img.decoding = 'async';
      }
      if (PREFER_IMMEDIATE_MEDIA) {
        img.loading = 'eager';
      } else if (!img.getAttribute('loading')) {
        img.loading = index < 2 ? 'eager' : 'lazy';
      }
      if (!img.getAttribute('fetchpriority')) {
        const pr = PREFER_IMMEDIATE_MEDIA ? (index < 16 ? 'high' : 'auto') : index === 0 ? 'high' : 'auto';
        img.setAttribute('fetchpriority', pr);
      }
      if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      if (!img.getAttribute('draggable')) img.setAttribute('draggable', 'false');
      if (PREFER_IMMEDIATE_MEDIA) {
        img.style.imageRendering = 'auto';
      }
    });

    const videos = Array.from(document.querySelectorAll('video'));

    videos.forEach((video) => {
      if (!video.hasAttribute('playsinline')) video.setAttribute('playsinline', '');
      if (!video.hasAttribute('webkit-playsinline')) video.setAttribute('webkit-playsinline', '');

      const isAuto = video.hasAttribute('autoplay') || video.autoplay;
      if (isAuto && PREFER_IMMEDIATE_MEDIA) {
        video.setAttribute('preload', 'auto');
        video.preload = 'auto';
      } else if (!video.getAttribute('preload')) {
        video.preload = isAuto ? 'auto' : 'metadata';
      }

      if (!video.hasAttribute('disablepictureinpicture')) {
        video.setAttribute('disablepictureinpicture', '');
      }

      video.style.imageRendering = 'auto';
      video.style.backfaceVisibility = 'hidden';
    });

    optimizeAutoplayVideos(videos);

    applyChromeHoverBehavior();

    // Mobile Safari/iOS sometimes blocks autoplay until a user gesture happens.
    // We don't show a play button; instead we prime video playback once
    // after the first touch/pointer interaction.
    try {
      let didPrime = false;
      const allVideos = Array.from(document.querySelectorAll('video'));
      const prime = () => {
        if (didPrime) return;
        didPrime = true;
        primeAutoplayVideos(allVideos);
        window.removeEventListener('touchstart', prime, true);
        window.removeEventListener('pointerdown', prime, true);
        window.removeEventListener('click', prime, true);
      };
      window.addEventListener('touchstart', prime, { passive: true, capture: true, once: true });
      window.addEventListener('pointerdown', prime, { passive: true, capture: true, once: true });
      window.addEventListener('click', prime, { passive: true, capture: true, once: true });
    } catch {}
  }

  function applyChromeHoverBehavior() {
    const path = (window.location.pathname || '').toLowerCase();
    const isIndex = path.endsWith('/index.html') || path === '/index.html' || path === '/' || path.endsWith('/skimo%20/');
    const isDashboard = path.endsWith('/dashboard.html');
    if (isIndex || isDashboard) return;

    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    if (!header || !nav) return;
    document.body.classList.add('chrome-dashboard-match');

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    const styleId = 'skimo-chrome-hover-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        header {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: linear-gradient(180deg, rgba(6, 9, 13, 0.92), rgba(6, 9, 13, 0.64)) !important;
          backdrop-filter: blur(18px) !important;
          border-bottom: 1px solid rgba(191, 222, 235, 0.08) !important;
          padding: 10px 0 8px !important;
          z-index: 1400 !important;
          box-shadow: none !important;
          text-align: center !important;
          width: 100% !important;
          overflow: visible !important;
        }

        header::before,
        header::after {
          content: none !important;
        }

        header h1 {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
          font-size: 48px !important;
          margin: 0 !important;
          visibility: hidden !important;
          text-shadow: none !important;
          animation: none !important;
        }

        header p {
          position: static !important;
          top: -22px !important;
          margin: 0 !important;
          width: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          font-size: 0.88rem !important;
          letter-spacing: 0.04em !important;
          text-align: center !important;
          transform: translateX(11px) !important;
        }

        html[lang="fr"] header p[data-i18n="index.tagline"] {
          transform: translateX(30px) !important;
        }

        nav {
          position: fixed !important;
          top: 34px !important;
          left: 0 !important;
          right: 0 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          background: rgba(17, 22, 28, 0.9) !important;
          backdrop-filter: blur(18px) !important;
          padding: 16.5px 20px !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5) !important;
          border-top: 1px solid rgba(154, 202, 202, 0.24) !important;
          border-bottom: 1px solid rgba(154, 202, 202, 0.24) !important;
          z-index: 1390 !important;
          gap: 0 !important;
        }

        nav .nav-left,
        nav .nav-right {
          display: flex !important;
          align-items: center !important;
        }

        nav .nav-left {
          flex: 0 0 auto !important;
          gap: 20px !important;
        }

        nav .nav-right {
          flex: 0 0 auto !important;
          gap: 0 !important;
          justify-content: flex-start !important;
        }

        nav .language-selector {
          margin-left: 0 !important;
          flex: 0 0 auto !important;
        }

        nav .logo {
          font-size: 20px !important;
          font-weight: bold !important;
          color: #9acaca !important;
          text-shadow: none !important;
          letter-spacing: normal !important;
          text-transform: none !important;
        }

        nav a {
          color: rgba(221, 221, 221, 0.72) !important;
          font-size: 16px !important;
          font-weight: 400 !important;
          letter-spacing: normal !important;
          text-transform: none !important;
          margin: 0 10px !important;
          padding: 10px !important;
          position: relative !important;
          text-decoration: none !important;
          text-shadow: none !important;
        }

        nav a:hover {
          color: #ffffff !important;
          text-shadow: none !important;
        }

        nav a::before {
          content: '' !important;
          position: absolute !important;
          bottom: -5px !important;
          left: 0 !important;
          width: 0 !important;
          height: 2px !important;
          background: #9acaca !important;
          transition: width 0.09s ease !important;
        }

        nav a:hover::before {
          width: 100% !important;
        }

        .chrome-dashboard-match {
          padding-top: 88px !important;
        }

        body.chrome-hover-hidden header,
        body.chrome-hover-hidden nav {
          opacity: 0;
          transform: translateY(-140%);
          pointer-events: none;
          transition: opacity 0.07s ease, transform 0.07s ease;
        }

        header,
        nav {
          transition: opacity 0.07s ease, transform 0.07s ease;
        }

        @media (max-width: 720px) {
          .chrome-dashboard-match {
            padding-top: 90px !important;
          }

          header p {
            font-size: 11px !important;
            margin: 3px 0 !important;
          }

          nav {
            top: 42px !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 8px 10px !important;
          }

          nav .nav-left,
          nav .nav-right {
            width: 100% !important;
            justify-content: center !important;
          }

          nav .nav-right {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }

          nav a {
            font-size: 12px !important;
            margin: 0 5px !important;
            padding: 6px !important;
          }

          nav .language-selector {
            margin-top: 8px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    let mouseIdleTimer = 0;
    let pointerOverChrome = false;
    const mouseIdleDelay = 340;
    const scrollKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Space']);
    const chromeNodes = Array.from(document.querySelectorAll('header, nav'));

    function showChrome() {
      document.body.classList.remove('chrome-hover-hidden');
    }

    function hideChrome() {
      if (pointerOverChrome) return;
      document.body.classList.add('chrome-hover-hidden');
    }

    function scheduleHide() {
      window.clearTimeout(mouseIdleTimer);
      if (pointerOverChrome) return;
      mouseIdleTimer = window.setTimeout(hideChrome, mouseIdleDelay);
    }

    window.addEventListener('mousemove', () => {
      showChrome();
      scheduleHide();
    }, { passive: true });

    window.addEventListener('scroll', hideChrome, { passive: true });
    window.addEventListener('wheel', hideChrome, { passive: true });
    window.addEventListener('touchmove', hideChrome, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (scrollKeys.has(event.code)) {
        hideChrome();
      }
    });
    window.addEventListener('mouseleave', hideChrome, { passive: true });
    chromeNodes.forEach((node) => {
      node.addEventListener('mouseenter', () => {
        pointerOverChrome = true;
        window.clearTimeout(mouseIdleTimer);
        showChrome();
      });
      node.addEventListener('mouseleave', () => {
        pointerOverChrome = false;
        scheduleHide();
      });
    });
    scheduleHide();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHqEnhancements, { once: true });
  } else {
    applyHqEnhancements();
  }
})();
