
/* ============================================================
   PAGE TRANSITION (curtain) — fluid navigation between pages.
   Defined first so it works even if later scripts (GSAP) fail.
   La cortina anuncia el DESTINO: al salir hacia una página, su
   ::before muestra el nombre de donde vas (attr(data-label)).
   ============================================================ */
(function() {
  /* Cortina teatral en paleta corporativa (tinta + beige): anuncia el
     destino con su nombre en grande; el rótulo viaja con parallax
     interno y el filo beige barre la pantalla. */
  var PAGES_FX = {
    'index.html':   { label: 'CÉSAR DEL VALLE' },
    'about.html':   { label: 'SOBRE MÍ' },
    'contact.html': { label: 'CONTACTO' },
    '404.html':     { label: 'CÉSAR DEL VALLE' },
    'img1.html':    { label: 'COFFEE RITUALS' },
    'img2.html':    { label: 'OTTOLINGER × MYKITA' },
    'img3.html':    { label: 'CATALALATA' },
    'img4.html':    { label: 'EL RASTRILLO' },
    'img5.html':    { label: 'LOEWE 001' }
  };
  function fx() { return document.getElementById('page-fx'); }
  function pageOf(url) {
    var file = (url || '').split(/[?#]/)[0].split('/').pop() || 'index.html';
    return PAGES_FX[file] || PAGES_FX['index.html'];
  }
  function dress(el, p) {
    el.setAttribute('data-label', p.label);
    var n = el.querySelector('.fx-num');
    if (n) n.remove();   // limpieza por si quedó de una versión anterior (bfcache)
  }
  window.PageFX = {
    reveal: function() {
      var el = fx(); if (!el) return;
      // al llegar (o volver por bfcache) la cortina viste la página actual
      dress(el, pageOf(location.pathname));
      requestAnimationFrame(function() { el.classList.add('fx-anim'); el.classList.add('fx-reveal'); });
    },
    leave: function(url) {
      var el = fx();
      if (!el) { window.location.href = url; return; }
      var done = false;
      var go = function() { if (done) return; done = true; window.location.href = url; };
      dress(el, pageOf(url)); // la cortina cae con el nombre del destino
      el.classList.add('fx-anim');
      void el.offsetWidth;
      el.classList.remove('fx-reveal'); // drop the curtain to cover
      el.addEventListener('transitionend', go, { once: true });
      setTimeout(go, 860); // safety fallback
    }
  };
  // Reveal on load and on back/forward (bfcache) restore
  window.addEventListener('pageshow', function() { window.PageFX.reveal(); });
  // Intercept internal .html links for a smooth out-transition
  document.addEventListener('click', function(e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
    if (href.charAt(0) === '#' || /^(mailto:|tel:|https?:|\/\/)/i.test(href)) return;
    if (/\.html(\?|#|$)/.test(href)) { e.preventDefault(); window.PageFX.leave(href); }
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 'ontouchstart' in window;

  const topBarLeft = document.querySelector('.top-bar-left');
  if (topBarLeft) {
    topBarLeft.addEventListener('click', () => { window.PageFX.leave('index.html'); });
  }

  const eggCursor = document.getElementById('egg-cursor');
  let isGrabbing = false;
  let lastClientX = 0, lastClientY = 0;
  
  if (!isMobileDevice && eggCursor) {
    document.addEventListener('mousemove', e => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      eggCursor.style.left = lastClientX + 'px';
      eggCursor.style.top = lastClientY + 'px';
      if (isGrabbing) {
        eggCursor.style.backgroundImage = "url('img/GRAB.svg')";
      } else {
        const selectable = e.target.closest('.img-drag, a, button, input, textarea, .top-bar-left, .hero-btn, .theme-toggle, .control-btn, .player-toggle, .player-minimize, .progress-bar, .genre-trigger, .genre-option, .volume-slider, .contact-link, .contact-card, .cta-button, .card-link, .minimal-card img, [data-lightbox]');
        eggCursor.style.backgroundImage = selectable ? "url('img/HOVER.svg')" : "url('img/DEFAULT.svg')";
      }
    });
  }

  const imgLinks = ['img1.html','img2.html','img3.html','img4.html','img5.html'];
  function isMobile() { 
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 'ontouchstart' in window;
  }

  document.querySelectorAll('.img-drag').forEach((img, i) => {
    if (isMobile()) {
      let touchStartTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let isSwiping = false;
      
      img.addEventListener('touchstart', (e) => { 
        touchStartTime = Date.now(); 
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
      }, { passive: true });
      
      img.addEventListener('touchmove', (e) => { 
        const touchMoveX = e.touches[0].clientX;
        const touchMoveY = e.touches[0].clientY;
        const diffX = Math.abs(touchMoveX - touchStartX);
        const diffY = Math.abs(touchMoveY - touchStartY);
        if (diffX > 10 || diffY > 10) {
          isSwiping = true;
        }
      }, { passive: true });
      
      img.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 400 && !isSwiping) { 
          e.preventDefault();
          window.PageFX.leave(imgLinks[i]);
        }
      }, { passive: false });
    } else {
      img.addEventListener('dblclick', () => { window.PageFX.leave(imgLinks[i]); });
    }
  });

  const btn = document.querySelector('.hero-btn');
  const btnText = document.querySelector('.hero-btn-text');
  const subtitle = document.querySelector('.hero-subtitle');
  if (btn && btnText) {
    if (!isMobile()) {
      btn.addEventListener('mouseenter', () => { btnText.classList.remove('animate'); void btnText.offsetWidth; btnText.classList.add('animate'); });
      btn.addEventListener('mouseleave', () => { btnText.classList.remove('animate'); });
    }
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      btn.classList.add('clicked');
      setTimeout(() => btn.classList.remove('clicked'), 400);
      setTimeout(() => { window.PageFX.leave('about.html'); }, 140);
    });
    btn.addEventListener('touchstart', () => {
      btn.style.transform = 'scale(0.95)';
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      btn.style.transform = '';
    }, { passive: true });
  }

  if (subtitle) {
    if (!isMobile()) {
      subtitle.addEventListener('mouseenter', () => { subtitle.classList.remove('animate'); void subtitle.offsetWidth; subtitle.classList.add('animate'); });
      subtitle.addEventListener('mouseleave', () => { subtitle.classList.remove('animate'); });
    }
  }

  function playHeroTitleAnimation() {
    const title = document.querySelector('.hero-title');
    const btn = document.querySelector('.hero-btn');
    const subtitle = document.querySelector('.hero-subtitle');
    if (!title || typeof gsap === 'undefined') return; // páginas sin hero de la home / sin GSAP
    gsap.set(title, {opacity: 0, y: 80, scale: 0.98, filter: 'blur(16px)', pointerEvents: 'none'});
    gsap.set(btn, {opacity: 0, y: 60, scale: 0.92, filter: 'blur(10px)'});
    gsap.set(subtitle, {opacity: 0, y: 40, scale: 0.98, filter: 'blur(10px)', visibility: 'hidden'});
    const tl = gsap.timeline();
    tl.to(title, {opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.32, ease: 'expo.out',
      onStart: () => { title.style.pointerEvents = 'none'; },
      onComplete: () => { title.style.pointerEvents = 'auto'; }
    })
      .to(subtitle, {opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', visibility: 'visible', duration: 0.18, ease: 'power3.out',
        onStart: () => { subtitle.style.pointerEvents = 'none'; subtitle.style.visibility = 'visible'; },
        onComplete: () => { subtitle.style.pointerEvents = 'auto'; }
      }, '-=0.12')
      .to(btn, {opacity: 1, y: 0, scale: 1.08, filter: 'blur(0px)', duration: 0.14, ease: 'back.out(2)',
        onStart: () => { btn.style.pointerEvents = 'none'; },
        onComplete:()=>{ btn.style.pointerEvents = 'auto'; gsap.to(btn, {scale:1, duration:0.12, ease:'power1.out'}); }
      }, '-=0.18')
      .add(() => animateStackedImages(), '-=0.25');
  }

  function startInitialAnimations() { playHeroTitleAnimation(); }
  window.startInitialAnimations = startInitialAnimations;

  const modelViewer = document.querySelector('model-viewer');
  if (modelViewer) {
    modelViewer.addEventListener('load', () => { if (!document.getElementById('loading-screen')) { playHeroTitleAnimation(); } });
  } else { if (!document.getElementById('loading-screen')) { playHeroTitleAnimation(); } }

  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) { heroTitle.addEventListener('dblclick', playHeroTitleAnimation); }

  function animateStackedImages() {
    const stackedImgs = document.querySelectorAll('.stacked-images .img-drag');
    stackedImgs.forEach(img => { img.style.setProperty('opacity', '0', ''); img.style.setProperty('transform', (img.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(0)').trim(), ''); });
    stackedImgs.forEach((img, i) => {
      const delayMs = 60 + i * 90;
      gsap.delayedCall(delayMs / 1000, () => {
        gsap.to(img, { scale: 1.06, opacity: 1, duration: 0.18, ease: 'back.out(1.3)', overwrite: true, onComplete: () => { gsap.to(img, { scale: 1, duration: 0.06, ease: 'power1.out' }); } });
      });
    });
  }

  document.body.style.cursor = 'none';

  document.addEventListener('mouseup', () => { isGrabbing = false; });

  window._setGrabbingCursor = function(state) {
    isGrabbing = state;
    if (state) {
      eggCursor.style.backgroundImage = "url('img/GRAB.svg')";
      eggCursor.style.left = lastClientX + 'px';
      eggCursor.style.top = lastClientY + 'px';
    }
  };

  // La burbuja "DRAG ME" solo existe en la home: guard para el resto de páginas
  const dragmeBubble = document.getElementById('dragme-bubble');
  if (dragmeBubble) {
    document.addEventListener('mousemove', e => {
      const target = e.target;
      if (target.classList && target.classList.contains('img-drag')) {
        dragmeBubble.style.opacity = '1'; dragmeBubble.style.visibility = 'visible'; dragmeBubble.style.left = (e.clientX + 8) + 'px'; dragmeBubble.style.top = (e.clientY + 8) + 'px';
      } else { dragmeBubble.style.opacity = '0'; dragmeBubble.style.visibility = 'hidden'; }
    });

    (function() {
      const bubble = dragmeBubble;
      let isGrabbing = false;
      document.addEventListener('mousedown', function(e) { if (e.target.classList && e.target.classList.contains('img-drag')) { isGrabbing = true; } });
      document.addEventListener('mouseup', function() { isGrabbing = false; });
      document.addEventListener('mousemove', function(e) {
        if ((e.target.classList && e.target.classList.contains('img-drag')) || isGrabbing) { bubble.style.display = 'block'; bubble.style.left = (e.clientX + 8) + 'px'; bubble.style.top = (e.clientY + 8) + 'px'; } else { bubble.style.display = 'none'; }
      });
    })();
  }
});

/* Draggables de la home — SOLO si GSAP + plugins están cargados (index).
   En las demás páginas estos globals no existen y una ReferenceError aquí
   mataría todo el JS posterior (cursor, reveals, tilt, menú…). */
if (typeof gsap !== 'undefined' && typeof Draggable !== 'undefined' && typeof InertiaPlugin !== 'undefined') {

gsap.registerPlugin(Draggable, InertiaPlugin);

let clampSkew = gsap.utils.clamp(-20, 20);

class DraggableImg {
  constructor(Image) {
    const proxy = document.createElement("div"),
      tracker = InertiaPlugin.track(proxy, "x")[0],
      updateSkew = () => {},
    align = () => gsap.set(proxy, {attr:{class:'proxy'}, x: gsap.getProperty(Image, "x"), y: gsap.getProperty(Image, "y"), width: Image.offsetWidth, height: Image.offsetHeight, position: "absolute", pointerEvents: "none", top: Image.offsetTop, left: Image.offsetLeft});

    align();
    Image.parentNode.append(proxy);
    Image.style.borderRadius = "12px";
    window.addEventListener('resize', align);

    this.drag = Draggable.create(proxy, {
      type: "x,y",
      trigger: Image,
      bounds: ".content-drag-area",
      edgeResistance: 0.6,
      onPressInit() { align(); },
      onClick() {
        // Tap sin arrastre → abrir el proyecto. En táctil sustituye al doble clic de escritorio.
        var coarse = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 768;
        if (!coarse) return;
        var m = Image.className.match(/img-(\d)/);
        if (m && window.PageFX) window.PageFX.leave('img' + m[1] + '.html');
      },
      onPress() { Image.style.zIndex = proxy.style.zIndex; window._setGrabbingCursor(true); },
      onDrag(e) {
        gsap.set(Image, {x: this.x, y: this.y});
        const evt = (e && e.type && e.clientX !== undefined) ? e : (window.event || {});
        if (evt.clientX !== undefined && evt.clientY !== undefined) {
          const eggCursor = document.getElementById('egg-cursor'); eggCursor.style.left = evt.clientX + 'px'; eggCursor.style.top = evt.clientY + 'px';
          const dragmeBubble = document.getElementById('dragme-bubble'); dragmeBubble.style.left = (evt.clientX + 8) + 'px'; dragmeBubble.style.top = (evt.clientY + 8) + 'px'; dragmeBubble.style.opacity = '1'; dragmeBubble.style.visibility = 'visible';
        }
      },
      onRelease() { window._setGrabbingCursor(false); const dragmeBubble = document.getElementById('dragme-bubble'); dragmeBubble.style.opacity = '0'; dragmeBubble.style.visibility = 'hidden'; },
      onThrowUpdate() { gsap.set(Image, {x: this.x, y: this.y}); },
      inertia: true
    })[0];
  }
}

let draggables = gsap.utils.toArray(".img-drag").map(el => new DraggableImg(el));

}

window.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('animated-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = window.innerWidth; let h = window.innerHeight; canvas.width = w; canvas.height = h;
  function resize() { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; }
  window.addEventListener('resize', resize);

  const particles = []; const COLORS = ['#fff', '#c7b299', '#a99a83', '#8a7f6b', '#bcae95']; const PARTICLE_COUNT = 48;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({ x: Math.random() * w, y: Math.random() * h, r: 1.5 + Math.random() * 2.5, alpha: 0.13 + Math.random() * 0.18, dx: -0.2 + Math.random() * 0.4, dy: -0.2 + Math.random() * 0.4, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i]; const p2 = particles[j]; const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 120) { ctx.save(); ctx.globalAlpha = 0.08; ctx.strokeStyle = p1.color; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore(); }
      }
    }
    for (const p of particles) { ctx.save(); ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12; ctx.fill(); ctx.restore(); }
  }

  function update() {
    for (const p of particles) { p.x += p.dx; p.y += p.dy; if (p.x < 0 || p.x > w) p.dx *= -1; if (p.y < 0 || p.y > h) p.dy *= -1; }
  }

  function animate() { update(); draw(); requestAnimationFrame(animate); }
  animate();
});

(function() {
  const btn = document.querySelector('.hero-btn'); const btnText = document.querySelector('.hero-btn-text');
  if (btn && btnText) { btn.addEventListener('mouseenter', function() { btnText.classList.remove('hover-animate'); void btnText.offsetWidth; btnText.classList.add('hover-animate'); }); btn.addEventListener('mouseleave', function() { btnText.classList.remove('hover-animate'); }); }
})();

(function() {
  // Single source of truth for the intro / loading screen.
  // Replays the intro only on the first visit of the session or a manual reload;
  // skips it (instant reveal) on internal navigation / back-forward so returning
  // to the home doesn't replay the 2s loader.
  const visitedKey = 'cestudio_visited_main_v1';

  function getNavType() {
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length) return navEntries[0].type;
      if (performance.navigation && typeof performance.navigation.type !== 'undefined') {
        if (performance.navigation.type === 1) return 'reload';
        if (performance.navigation.type === 2) return 'back_forward';
      }
    } catch (e) {}
    return 'navigate';
  }

  function triggerStartAnimations() {
    if (typeof window.startInitialAnimations === 'function') {
      window.startInitialAnimations();
    } else {
      document.addEventListener('DOMContentLoaded', function onReady() {
        document.removeEventListener('DOMContentLoaded', onReady);
        if (typeof window.startInitialAnimations === 'function') window.startInitialAnimations();
      });
    }
  }

  function revealMain() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) { mainContent.style.opacity = '1'; mainContent.style.visibility = 'visible'; }
  }

  function showInstant() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) { try { loadingScreen.remove(); } catch (e) { loadingScreen.style.display = 'none'; } }
    revealMain();
    triggerStartAnimations();
  }

  function runLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    const loadingPercent = document.getElementById('loading-percent');
    if (!(loadingScreen && loadingProgress && loadingText)) { showInstant(); return; }

    // Timed, smoothly eased intro so it can be appreciated.
    const fillDuration = 3300;   // ms for 0 -> 100
    const startDelay = 650;      // let the wordmark reveal first
    const holdAtFull = 480;      // small beat at 100%
    const loadingMessages = ['Cargando experiencia', 'Preparando el portfolio', 'Afinando detalles', 'Listo'];
    loadingText.style.opacity = '1';

    const setProgress = (value) => {
      const v = Math.max(0, Math.min(100, value));
      loadingProgress.style.width = v + '%';
      if (loadingPercent) loadingPercent.textContent = Math.round(v) + '%';
    };
    // easeInOutCubic — slow start, fluid middle, gentle settle
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    let lastMsg = -1;
    const updateMessage = (pct) => {
      let idx = pct < 28 ? 0 : pct < 62 ? 1 : pct < 96 ? 2 : 3;
      if (idx !== lastMsg) { loadingText.textContent = loadingMessages[idx]; lastMsg = idx; }
    };

    const finish = () => {
      setProgress(100); updateMessage(100);
      setTimeout(() => {
        revealMain();                                   // hero sits behind the curtain
        loadingScreen.classList.add('fade-out');        // curtain wipes up
        triggerStartAnimations();                       // hero reveals as it rises
        try { sessionStorage.setItem(visitedKey, '1'); } catch (e) {}
        setTimeout(() => {
          try { loadingScreen.remove(); } catch (e) { loadingScreen.style.display = 'none'; }
        }, 1000);
      }, holdAtFull);
    };

    let startTs = null;
    const step = (ts) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / fillDuration);
      const pct = ease(t) * 100;
      setProgress(pct); updateMessage(pct);
      if (t < 1) { requestAnimationFrame(step); } else { finish(); }
    };

    setTimeout(() => { requestAnimationFrame(step); }, startDelay);
  }

  function initializeLoading() {
    if (!document.getElementById('loading-screen')) return; // pages without a loader manage their own reveal
    const navType = getNavType();
    let visited = false; try { visited = !!sessionStorage.getItem(visitedKey); } catch (e) {}
    if (navType !== 'reload' && visited) { showInstant(); } else { runLoader(); }
  }

  if (document.getElementById('loading-screen')) { initializeLoading(); } else { document.addEventListener('DOMContentLoaded', initializeLoading); }
})();

document.addEventListener('DOMContentLoaded', function() {});

(function() {
  // ── 2 modos: Noche (oscuro) · Día (claro), ambos con blobs animados ──
  var THEME_KEY = 'cdv_theme';
  var current = null;

  function paint(isDay) {
    var el = document.getElementById('vanta-bg');
    if (!el) return;
    if (isDay) {
      document.body.classList.add('theme-light');
      el.style.background = 'radial-gradient(125% 92% at 50% -8%, #f6f1e7 0%, #ece2d1 55%, #e1d5c0 100%)';
    } else {
      document.body.classList.remove('theme-light');
      el.style.background = '#0e0d0b';
    }
    el.innerHTML = '<div class="bg-drift"><span class="bg-blob bg-blob-1"></span><span class="bg-blob bg-blob-2"></span><span class="bg-blob bg-blob-3"></span></div>';
  }

  function syncToggle(isDay) {
    var t = document.getElementById('themeToggle');
    if (t) { t.classList.toggle('is-day', isDay); t.setAttribute('aria-pressed', isDay ? 'true' : 'false'); }
  }

  function setTheme(mode, animate) {
    var el = document.getElementById('vanta-bg');
    var isDay = (mode === 'day');
    current = mode;
    syncToggle(isDay);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    if (!el) return;
    if (animate && window.gsap) {
      gsap.to(el, { opacity: 0, duration: 0.4, ease: 'power2.inOut', onComplete: function() {
        paint(isDay);
        gsap.to(el, { opacity: 1, duration: 0.6, ease: 'power2.inOut' });
      } });
    } else {
      paint(isDay);
      el.style.opacity = '0';
      requestAnimationFrame(function() { if (window.gsap) gsap.to(el, { opacity: 1, duration: 0.6, ease: 'power2.out' }); else el.style.opacity = '1'; });
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var t = document.getElementById('themeToggle');
    if (!t) return;
    var busy = false;
    function doToggle() {
      if (busy) return;            // evita doble disparo (touchend + click fantasma)
      busy = true; setTimeout(function() { busy = false; }, 450);
      t.classList.add('clicked'); setTimeout(function() { t.classList.remove('clicked'); }, 400);
      setTheme(current === 'day' ? 'night' : 'day', true);
    }
    t.addEventListener('click', doToggle);
    // En táctil el click sintético a veces no llega: respondemos también al touchend.
    t.addEventListener('touchend', function(e) { e.preventDefault(); doToggle(); }, { passive: false });
  });

  (function init() {
    if (!document.getElementById('vanta-bg')) return;
    var saved = 'night';
    try { saved = localStorage.getItem(THEME_KEY) || 'night'; } catch (e) {}
    setTheme(saved, false);
  })();
})();

(function() {
  const musicDatabase = {
    'rock-ingles': { title: 'I Still Haven\'t Found What I\'m Looking For', artist: 'U2', src: 'music/U2 - I Still Haven\'t Found What I\'m Looking For (Official Music Video).mp3' },
    'espanolada': { title: 'Llamando a la tierra', artist: 'M-Clan', src: 'music/M-Clan - Llamando a la Tierra (letra).mp3' },
    'reggaeton': { title: 'Guaya', artist: 'Don Omar', src: 'music/Don Omar - Guaya Guaya (Audio).mp3' },
    'techno': { title: 'Snow Crystal', artist: 'Babalos', src: 'music/Babalos - Snow Crystal [HQ] - Babalos.mp3' },
    'folk': { title: 'Vagabond', artist: 'Caamp', src: 'music/Vagabond.mp3' },
    'indie': { title: 'Si Algo Es Puro Vale El Doble', artist: 'West Srk', src: 'music/West Srk - Si Algo Es Puro Vale El Doble (Video Oficial) - West Srk.mp3' },
    'trap-urbano': { title: 'Moonlights Puppet Remix', artist: 'Al Safir, Interferencias', src: 'music/Interferencias - MOONLIGHT\'S PUPPET (REMIX) feat. Al Safir (Videoclip Oficial).mp3' },
    'pop-ingles': { title: 'Somebody That I Used to Know', artist: 'Gotye ft. Kimbra', src: 'music/Gotye - Somebody That I Used To Know (feat. Kimbra) [Official Music Video].mp3' }
  };

  // color de acento por género (desaturado, elegante) para disco + glow + visualizador
  const genreColors = {
    'rock-ingles': '#c0685a',
    'espanolada': '#c79a4a',
    'reggaeton': '#4f9e86',
    'techno': '#6f7fc0',
    'folk': '#8a9a55',
    'indie': '#a06ab5',
    'trap-urbano': '#8088a0',
    'pop-ingles': '#c77a9a'
  };

  let currentGenre = 'rock-ingles'; let isPlaying = false; let isMinimized = false;
  const genreList = ['rock-ingles','espanolada','reggaeton','techno','folk','indie','trap-urbano','pop-ingles']; let currentGenreIndex = 0;

  const musicWidget = document.getElementById('music-player'); const audio = document.getElementById('audio-player'); const playPauseBtn = document.getElementById('play-pause'); const playPauseIcon = document.getElementById('play-pause-icon'); const prevBtn = document.getElementById('prev-btn'); const nextBtn = document.getElementById('next-btn'); const genreSelect = document.getElementById('genre-select'); const currentGenreText = document.getElementById('current-genre-text'); const songTitle = document.getElementById('song-title'); const songArtist = document.getElementById('song-artist'); const progressFill = document.getElementById('progress-fill'); const currentTimeSpan = document.getElementById('current-time'); const totalTimeSpan = document.getElementById('total-time'); const volumeSlider = document.getElementById('volume-slider'); const minimizeBtn = document.getElementById('player-minimize'); const playerToggle = document.getElementById('player-toggle'); const progressBar = document.querySelector('.progress-bar');
  const vizCanvas = document.getElementById('audio-viz');
  const genreSelector = document.querySelector('.genre-selector');
  const genreTrigger = document.getElementById('genre-trigger');
  const genreListEl = document.getElementById('genre-list');
  const genreTriggerLabel = document.getElementById('genre-trigger-label');
  let isDragging = false;
  let audioCtx = null, analyser = null, vizData = null, vizRAF = null, vizReady = false;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initPlayer() {
    updateCurrentSong(); 
    audio.volume = volumeSlider.value / 100; 
    playPauseBtn.addEventListener('click', togglePlayPause); 
    
    if (prevBtn) prevBtn.addEventListener('click', previousSong); 
    if (nextBtn) nextBtn.addEventListener('click', nextSong);
    
    // Mejorar touch en móvil
    const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileDevice && playPauseBtn) {
      playPauseBtn.style.minHeight = '44px';
      playPauseBtn.style.minWidth = '44px';
    }
    
    if (prevBtn) {
      prevBtn.style.minHeight = '36px';
      prevBtn.style.minWidth = '36px';
    }
    if (nextBtn) {
      nextBtn.style.minHeight = '36px';
      nextBtn.style.minWidth = '36px';
    }
    
    genreSelect.addEventListener('change', changeGenre);

    // Desplegable de género custom
    if (genreTrigger && genreListEl && genreSelector) {
      genreTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const open = genreSelector.classList.toggle('open');
        genreTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      genreListEl.addEventListener('click', function(e) {
        const opt = e.target.closest('.genre-option');
        if (!opt) return;
        genreSelect.value = opt.dataset.value;
        genreSelect.dispatchEvent(new Event('change'));
        genreSelector.classList.remove('open');
        genreTrigger.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('click', function(e) {
        if (!genreSelector.contains(e.target)) { genreSelector.classList.remove('open'); genreTrigger.setAttribute('aria-expanded', 'false'); }
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { genreSelector.classList.remove('open'); genreTrigger.setAttribute('aria-expanded', 'false'); }
      });
    }
    volumeSlider.addEventListener('input', changeVolume); 
    minimizeBtn.addEventListener('click', toggleMinimize); 
    playerToggle.addEventListener('click', togglePlayPause); 
    progressBar.addEventListener('pointerdown', startSeek);
    progressBar.addEventListener('pointermove', moveSeek);
    progressBar.addEventListener('pointerup', endSeek);
    progressBar.addEventListener('pointercancel', endSeek);
    window.addEventListener('resize', function() { updateMarquee(); if (!vizRAF) drawIdle(); });
    
    document.addEventListener('keydown', (e) => { 
      if (musicWidget && !musicWidget.style.display === 'none') { 
        switch(e.key) { 
          case 'ArrowLeft': e.preventDefault(); previousSong(); break; 
          case 'ArrowRight': e.preventDefault(); nextSong(); break; 
          case ' ': e.preventDefault(); togglePlayPause(); break; 
        } 
      } 
    });
    
    audio.addEventListener('timeupdate', updateProgress); 
    audio.addEventListener('loadedmetadata', updateDuration); 
    audio.addEventListener('ended', () => { nextSong(); });
    audio.addEventListener('play', () => { musicWidget.classList.add('is-playing'); setupViz(); startViz(); });
    audio.addEventListener('pause', () => { musicWidget.classList.remove('is-playing'); stopViz(); });
    
    audio.addEventListener('error', (e) => { 
      console.error('Error al cargar audio:', e); 
      console.error('Archivo problemático:', audio.src); 
      showNotification('Error al cargar la canción'); 
      playPauseIcon.src = 'img/PLAY.svg'; 
      playPauseIcon.alt = 'Play'; 
      isPlaying = false; 
    });
    
    audio.addEventListener('loadstart', () => { 
      console.log('Iniciando carga de:', audio.src); 
    }); 
    
    audio.addEventListener('canplay', () => { 
      console.log('Audio listo para reproducir:', audio.src); 
    }); 
    
    updateMarquee();
    drawIdle();
    console.log('🎵 Reproductor musical personal inicializado');
  }

  function updateCurrentSong() { const song = musicDatabase[currentGenre]; songTitle.textContent = song.title; songArtist.textContent = song.artist; audio.src = song.src; const genreNames = { 'rock-ingles': 'Rock Inglés', 'espanolada': 'Españolada', 'reggaeton': 'Reggaetón', 'techno': 'Techno', 'folk': 'Folk', 'indie': 'Indie', 'trap-urbano': 'Trap/Urbano', 'pop-ingles': 'Pop Inglés' }; currentGenreText.textContent = genreNames[currentGenre]; musicWidget.style.setProperty('--genre-color', genreColors[currentGenre] || '#c7b299'); syncGenreUI(); updateMarquee(); }

  function syncGenreUI() {
    if (!genreListEl) return;
    let activeText = '';
    genreListEl.querySelectorAll('.genre-option').forEach(function(o) {
      const on = o.dataset.value === currentGenre;
      o.classList.toggle('is-active', on);
      o.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) activeText = o.textContent;
    });
    if (genreTriggerLabel && activeText) genreTriggerLabel.textContent = activeText;
  }

  function togglePlayPause() { setupViz(); if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); } if (isPlaying) { audio.pause(); playPauseIcon.src = 'img/PLAY.svg'; playPauseIcon.alt = 'Play'; playerToggle.innerHTML = '<img src="img/MUSIC_LOGO.svg" alt="Music" style="width: 24px; height: 24px;">'; isPlaying = false; } else { audio.play().then(() => { playPauseIcon.src = 'img/PAUSE.svg'; playPauseIcon.alt = 'Pause'; playerToggle.innerHTML = '<img src="img/MUSIC_LOGO.svg" alt="Music" style="width: 24px; height: 24px;">'; isPlaying = true; }).catch(error => { console.log('Error al reproducir:', error); showNotification('Haz clic para reproducir música'); }); } }

  function changeGenre() { const wasPlaying = isPlaying; if (isPlaying) { audio.pause(); isPlaying = false; } currentGenre = genreSelect.value; currentGenreIndex = genreList.indexOf(currentGenre); updateCurrentSong(); if (wasPlaying) { setTimeout(() => { audio.play().then(() => { playPauseIcon.src = 'img/PAUSE.svg'; playPauseIcon.alt = 'Pause'; playerToggle.innerHTML = '<img src="img/MUSIC_LOGO.svg" alt="Music" style="width: 24px; height: 24px;">'; isPlaying = true; }).catch(error => { console.error('Error al reproducir nueva canción:', error); showNotification('Error al reproducir esta canción'); playPauseIcon.src = 'img/PLAY.svg'; playPauseIcon.alt = 'Play'; isPlaying = false; }); }, 100); } const genreNames = { 'rock-ingles': 'Rock Inglés', 'espanolada': 'Españolada', 'reggaeton': 'Reggaetón', 'techno': 'Techno', 'folk': 'Folk', 'indie': 'Indie', 'trap-urbano': 'Trap/Urbano', 'pop-ingles': 'Pop Inglés' }; showNotification(`Ahora: ${genreNames[currentGenre]}`); }

  function changeVolume() { audio.volume = volumeSlider.value / 100; }
  function previousSong() { currentGenreIndex = (currentGenreIndex - 1 + genreList.length) % genreList.length; currentGenre = genreList[currentGenreIndex]; genreSelect.value = currentGenre; updateCurrentSong(); if (isPlaying) { audio.play(); } const genreNames = { 'rock-ingles': 'Rock Inglés', 'espanolada': 'Españolada', 'reggaeton': 'Reggaetón', 'techno': 'Techno', 'folk': 'Folk', 'indie': 'Indie', 'trap-urbano': 'Trap/Urbano', 'pop-ingles': 'Pop Inglés' }; showNotification(`← ${genreNames[currentGenre]}`); }
  function nextSong() { currentGenreIndex = (currentGenreIndex + 1) % genreList.length; currentGenre = genreList[currentGenreIndex]; genreSelect.value = currentGenre; updateCurrentSong(); if (isPlaying) { audio.play(); } const genreNames = { 'rock-ingles': 'Rock Inglés', 'espanolada': 'Españolada', 'reggaeton': 'Reggaetón', 'techno': 'Techno', 'folk': 'Folk', 'indie': 'Indie', 'trap-urbano': 'Trap/Urbano', 'pop-ingles': 'Pop Inglés' }; showNotification(`${genreNames[currentGenre]} →`); }
  function toggleMinimize() { isMinimized = !isMinimized; musicWidget.classList.toggle('minimized', isMinimized); minimizeBtn.textContent = isMinimized ? '+' : '−'; }
  function posFromEvent(clientX) { const rect = progressBar.getBoundingClientRect(); const pos = (clientX - rect.left) / rect.width; return Math.max(0, Math.min(1, pos)); }
  function paintSeek(pos) { progressFill.style.width = (pos * 100) + '%'; if (audio.duration) currentTimeSpan.textContent = formatTime(pos * audio.duration); }
  function startSeek(e) { isDragging = true; try { progressBar.setPointerCapture(e.pointerId); } catch (err) {} paintSeek(posFromEvent(e.clientX)); }
  function moveSeek(e) { if (!isDragging) return; paintSeek(posFromEvent(e.clientX)); }
  function endSeek(e) { if (!isDragging) return; isDragging = false; const pos = posFromEvent(e.clientX); if (audio.duration) audio.currentTime = pos * audio.duration; }

  function updateProgress() { if (isDragging) return; if (audio.duration) { const progress = (audio.currentTime / audio.duration) * 100; progressFill.style.width = progress + '%'; currentTimeSpan.textContent = formatTime(audio.currentTime); } }

  function updateMarquee() {
    if (!songTitle || !songTitle.parentElement) return;
    const wrap = songTitle.parentElement;
    songTitle.classList.remove('marquee');
    songTitle.style.removeProperty('--shift');
    songTitle.style.removeProperty('--dur');
    if (reduceMotion) return;
    requestAnimationFrame(function() {
      const overflow = songTitle.scrollWidth - wrap.clientWidth;
      if (overflow > 4) {
        songTitle.style.setProperty('--shift', overflow + 'px');
        songTitle.style.setProperty('--dur', Math.max(5, overflow / 22).toFixed(1) + 's');
        songTitle.classList.add('marquee');
      }
    });
  }

  /* ---- Visualizador de audio en vivo (Web Audio API) ---- */
  function setupViz() {
    if (vizReady || !vizCanvas || reduceMotion) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      vizData = new Uint8Array(analyser.frequencyBinCount);
      vizReady = true;
    } catch (err) { console.warn('Visualizador no disponible:', err); }
  }
  function startViz() {
    if (!vizReady || vizRAF || reduceMotion) return;
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    drawViz();
  }
  function stopViz() {
    if (vizRAF) { cancelAnimationFrame(vizRAF); vizRAF = null; }
    drawIdle();
  }
  function drawIdle() {
    if (!vizCanvas) return;
    const ctx2d = vizCanvas.getContext('2d');
    if (!ctx2d) return;
    const dpr = window.devicePixelRatio || 1;
    const w = vizCanvas.clientWidth, h = vizCanvas.clientHeight;
    if (!w || !h) return;
    vizCanvas.width = Math.round(w * dpr); vizCanvas.height = Math.round(h * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, w, h);
    const col = (getComputedStyle(musicWidget).getPropertyValue('--genre-color') || '#c7b299').trim();
    const bars = 26, gap = 3;
    const bw = (w - gap * (bars - 1)) / bars;
    ctx2d.fillStyle = col;
    ctx2d.globalAlpha = 0.2;
    for (let i = 0; i < bars; i++) { ctx2d.fillRect(i * (bw + gap), h - 2, bw, 2); }
    ctx2d.globalAlpha = 1;
  }
  function drawViz() {
    if (!analyser || !vizCanvas) return;
    const ctx2d = vizCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = vizCanvas.clientWidth, h = vizCanvas.clientHeight;
    if (vizCanvas.width !== Math.round(w * dpr) || vizCanvas.height !== Math.round(h * dpr)) {
      vizCanvas.width = Math.round(w * dpr); vizCanvas.height = Math.round(h * dpr);
    }
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, w, h);
    analyser.getByteFrequencyData(vizData);
    const col = (getComputedStyle(musicWidget).getPropertyValue('--genre-color') || '#c7b299').trim();
    const bars = 26, gap = 3;
    const bw = (w - gap * (bars - 1)) / bars;
    const step = Math.max(1, Math.floor(vizData.length / bars));
    ctx2d.fillStyle = col;
    for (let i = 0; i < bars; i++) {
      const v = vizData[i * step] / 255;
      const bh = Math.max(2, v * h);
      const x = i * (bw + gap), y = h - bh;
      ctx2d.globalAlpha = 0.32 + v * 0.68;
      if (ctx2d.roundRect) { ctx2d.beginPath(); ctx2d.roundRect(x, y, bw, bh, Math.min(bw / 2, 2)); ctx2d.fill(); }
      else { ctx2d.fillRect(x, y, bw, bh); }
    }
    ctx2d.globalAlpha = 1;
    vizRAF = requestAnimationFrame(drawViz);
  }
  function updateDuration() { totalTimeSpan.textContent = formatTime(audio.duration); }
  function formatTime(seconds) { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }

  function showNotification(message) { const notification = document.createElement('div'); notification.style.cssText = `position: fixed; bottom: 90px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 10px 16px; border-radius: 20px; font-family: 'Inter', sans-serif; font-size: 0.75rem; z-index: 4000; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);`; notification.textContent = message; document.body.appendChild(notification); setTimeout(() => notification.style.opacity = '1', 10); setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => notification.remove(), 300); }, 3000); }

  // El reproductor solo existe en la home: en el resto de páginas no se inicializa
  document.addEventListener('DOMContentLoaded', () => { if (musicWidget && audio) setTimeout(initPlayer, 500); });
})();

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('about-page')) return;
  function elegantAnimations() { const elements = [ { selector: '.elegant-title', delay: 0 }, { selector: '.title-accent', delay: 200 }, { selector: '.name-elegant', delay: 400 }, { selector: '.role-elegant', delay: 500 }, { selector: '.description-elegant', delay: 600 }, { selector: '.visual-element', delay: 300 }, { selector: '.section-title-elegant', delay: 800 }, { selector: '.section-line', delay: 900 }, { selector: '.skill-block', delay: 1000 }, { selector: '.info-grid-elegant', delay: 1200 } ]; elements.forEach(({ selector, delay }) => { const els = document.querySelectorAll(selector); els.forEach((el, index) => { el.style.opacity = '0'; el.style.transform = 'translateY(40px)'; el.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, delay + (index * 100)); }); }); }
  function addHoverEffects() { const skillBlocks = document.querySelectorAll('.skill-block'); skillBlocks.forEach(block => { block.addEventListener('mouseenter', () => { block.style.transform = 'translateY(-4px)'; block.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; }); block.addEventListener('mouseleave', () => { block.style.transform = 'translateY(0)'; }); }); }
  setTimeout(() => { elegantAnimations(); addHoverEffects(); }, 100);
});

  /* Loewe spot — activa el audio cuando el vídeo entra en pantalla y lo silencia al salir.
     Usa IntersectionObserver (no la dirección del scroll). Refuerzo en el 1er gesto
     porque el navegador exige interacción del usuario para reproducir sonido. */
  setTimeout(() => {
    const loeweVideo = document.getElementById('kaleo-video');
    if (!loeweVideo || !('IntersectionObserver' in window)) return;
    let inView = false;
    const tryUnmute = () => {
      loeweVideo.muted = false;
      const p = loeweVideo.play();
      if (p && p.catch) p.catch(() => {});
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        inView = en.isIntersecting && en.intersectionRatio >= 0.5;
        if (inView) tryUnmute();
        else loeweVideo.muted = true;
      });
    }, { threshold: [0, 0.5, 1] });
    io.observe(loeweVideo);
    // si el navegador bloqueó el sonido por falta de gesto, lo reintenta al primer toque/clic/tecla
    const unlock = () => { if (inView) tryUnmute(); };
    ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, unlock, { passive: true });
    });
  }, 300);

/* ============================================================
   MICRO-INTERACCIONES — botones magnéticos + progreso de scroll
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  // Botones magnéticos (solo con puntero fino / no táctil)
  var finePointer = !window.matchMedia || !window.matchMedia('(hover: none)').matches;
  if (finePointer) {
    document.querySelectorAll('.hero-btn, .back-btn').forEach(function(el) {
      el.addEventListener('mousemove', function(e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (mx * 0.25).toFixed(1) + 'px,' + (my * 0.25).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function() { el.style.transform = ''; });
    });
  }

  // Barra de progreso de scroll (se muestra solo en páginas con scroll)
  var bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.appendChild(bar);
  function updateScrollProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 60) {
      bar.classList.add('visible');
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.width = (p * 100) + '%';
    } else {
      bar.classList.remove('visible');
      bar.style.width = '0';
    }
  }
  updateScrollProgress();
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
});

/* ============================================================
   PARALLAX del hero — profundidad al mover el ratón (solo home)
   ============================================================ */
(function() {
  var fine = !(window.matchMedia && window.matchMedia('(hover: none)').matches) && window.innerWidth > 768;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  function initParallax() {
    var text = document.querySelector('.center-hero-text');
    var stack = document.querySelector('.stacked-images');
    if (!text) return;
    // El modelo 3D gira horizontalmente siguiendo el cursor (en escritorio).
    // Quitamos auto-rotate aquí; en móvil/táctil se conserva (esta función no corre).
    var mv = document.querySelector('.model-3d-bg model-viewer');
    if (mv) mv.removeAttribute('auto-rotate');
    var mt = 0;
    var tx = 0, ty = 0, sx = 0, sy = 0, bx = 0, by = 0, px = 0, py = 0;
    document.addEventListener('mousemove', function(e) {
      px = (e.clientX / window.innerWidth - 0.5);
      py = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
    (function pLoop() {
      tx += ((px * 16) - tx) * 0.06; ty += ((py * 16) - ty) * 0.06;
      sx += ((px * 36) - sx) * 0.06; sy += ((py * 36) - sy) * 0.06;
      bx += ((px * -14) - bx) * 0.05; by += ((py * -14) - by) * 0.05;
      text.style.transform = 'translate(-50%,-50%) translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
      if (stack) stack.style.transform = 'translate(-50%,-50%) translate(' + sx.toFixed(2) + 'px,' + sy.toFixed(2) + 'px)';
      var bg = document.querySelector('.bg-drift');
      if (bg) bg.style.transform = 'translate(' + bx.toFixed(2) + 'px,' + by.toFixed(2) + 'px)';
      if (mv) {
        mt += ((px * -60) - mt) * 0.09;  // giro horizontal ±30° en la dirección del cursor
        mv.setAttribute('camera-orbit', mt.toFixed(2) + 'deg 78deg auto');
      }
      requestAnimationFrame(pLoop);
    })();
  }
  if (document.readyState !== 'loading') initParallax();
  else document.addEventListener('DOMContentLoaded', initParallax);
})();

/* ============================================================
   PROJECT HERO — tilt 3D del producto siguiendo el cursor + flotación
   ============================================================ */
(function() {
  function init() {
    var hero = document.querySelector('.proj-hero');
    var img = hero && hero.querySelector('.proj-hero-visual img');
    if (!hero || !img) return;
    var tiltEl = hero.querySelector('.ph-tilt') || img;

    // indicador de scroll
    var cue = document.createElement('div');
    cue.className = 'proj-scroll-cue';
    cue.innerHTML = '<span class="sc-txt">Scroll</span><span class="sc-arrow">&#8595;</span>';
    hero.appendChild(cue);
    window.addEventListener('scroll', function() {
      if (window.scrollY > 80) cue.classList.add('hide'); else cue.classList.remove('hide');
    }, { passive: true });

    // Accesibilidad: sin tilt / flotación / glare con reduced-motion (la cue de scroll se mantiene).
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var fine = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
    var inside = false, cx = 0, cy = 0, rx = 0, ry = 0, fl = 0, t = 0;
    if (fine) {
      hero.addEventListener('mousemove', function(e) {
        var r = hero.getBoundingClientRect();
        cx = (e.clientX - r.left) / r.width - 0.5;
        cy = (e.clientY - r.top) / r.height - 0.5;
        inside = true;
      }, { passive: true });
      hero.addEventListener('mouseleave', function() { inside = false; });
    }
    var gx = 50, gy = 26, gxL = 50, gyL = 26;
    (function loop() {
      t += 0.02;
      var tRY = inside ? cx * 18 : Math.sin(t) * 3;          // rotateY
      var tRX = inside ? -cy * 13 : Math.cos(t * 0.8) * 1.5; // rotateX
      var tFL = inside ? 0 : Math.sin(t * 0.9) * 9;          // flotación idle
      ry += (tRY - ry) * 0.08;
      rx += (tRX - rx) * 0.08;
      fl += (tFL - fl) * 0.05;
      tiltEl.style.transform = 'rotateY(' + ry.toFixed(2) + 'deg) rotateX(' + rx.toFixed(2) + 'deg) translateY(' + fl.toFixed(2) + 'px)';
      // brillo/glare que recorre el producto siguiendo el cursor
      gx = inside ? (cx + 0.5) * 100 : 50 + Math.sin(t) * 16;
      gy = inside ? (cy + 0.5) * 100 : 24;
      gxL += (gx - gxL) * 0.1;
      gyL += (gy - gyL) * 0.1;
      tiltEl.style.setProperty('--gx', gxL.toFixed(1) + '%');
      tiltEl.style.setProperty('--gy', gyL.toFixed(1) + '%');
      requestAnimationFrame(loop);
    })();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   POLISH LAYER — halo de cursor + ripple, reveal al hacer scroll
   y barra de progreso. Aditivo y respetuoso con reduced-motion /
   punteros táctiles. No interfiere con las animaciones existentes.
   ============================================================ */
(function() {
  var mq = function(q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var coarse = mq('(hover: none)') || mq('(pointer: coarse)') || ('ontouchstart' in window) || window.innerWidth <= 768;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---- 1. Halo de cursor que sigue al puntero con retardo + ripple ---- */
  function initCursor() {
    if (reduce || coarse) return;

    var ring = document.createElement('div');
    ring.id = 'cursor-ring';
    document.body.appendChild(ring);

    var HOT = '.img-drag, a, button, input, textarea, select, .top-bar-left, .hero-btn,'
            + ' .theme-toggle, .control-btn, .player-toggle, .player-minimize, .progress-bar,'
            + ' .genre-trigger, .genre-option, .volume-slider, .contact-link, .c-card, .cta-button, .card-link,'
            + ' .minimal-card img, .sf-mail, .sf-nav a, .back-btn, [data-lightbox]';

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, rs = 1, targetS = 1, shown = false;

    document.addEventListener('mousemove', function(e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; ring.classList.add('is-visible'); }
      var hot = e.target.closest && e.target.closest(HOT);
      // etiqueta contextual: el halo crece y muestra el texto de [data-cursor]
      var lab = e.target.closest && e.target.closest('[data-cursor]');
      if (lab) ring.setAttribute('data-label', lab.getAttribute('data-cursor') || '');
      ring.classList.toggle('has-label', !!lab);
      ring.classList.toggle('is-hot', !!hot && !lab);
      if (targetS !== 0.8) targetS = lab ? 2 : (hot ? 1.4 : 1);
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function() { ring.classList.remove('is-visible'); });
    document.documentElement.addEventListener('mouseenter', function() { if (shown) ring.classList.add('is-visible'); });

    document.addEventListener('mousedown', function(e) {
      targetS = 0.8;
      var r = document.createElement('div');
      r.className = 'click-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(function() { if (r.parentNode) r.parentNode.removeChild(r); }, 640);
    });
    document.addEventListener('mouseup', function() {
      targetS = ring.classList.contains('has-label') ? 2
              : ring.classList.contains('is-hot') ? 1.4 : 1;
    });

    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      rs += (targetS - rs) * 0.2;
      ring.style.transform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px) translate(-50%,-50%) scale(' + rs.toFixed(3) + ')';
      requestAnimationFrame(loop);
    })();
  }

  /* ---- 2. Reveal al hacer scroll (fade + rise + desenfoque) ---- */
  function initReveal() {
    var sel = [];
    if (document.body.classList.contains('about-page')) {
      sel = [
        '.abx-sec-head',
        '.abx-path-block',
        '.abx-bar',
        '.abx-exp',
        '.abx-fact',
        '.abx-cta-inner'
      ];
    }
    // páginas de proyecto: créditos + bloque "siguiente proyecto"
    if (document.querySelector('.proj-hero')) {
      sel.push('.proj-showcase .ps-figure', '.proj-next-link');
    }
    // footer minimalista (páginas de proyecto)
    sel.push('.site-footer .sf-inner');

    var els = [];
    sel.forEach(function(s) {
      Array.prototype.forEach.call(document.querySelectorAll(s), function(el) { els.push(el); });
    });
    if (!els.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function(el) { el.classList.add('is-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-revealed');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    var vh = window.innerHeight || document.documentElement.clientHeight;
    els.forEach(function(el) {
      el.setAttribute('data-reveal', '');
      // escalonado según posición entre hermanos del mismo contenedor
      var p = el.parentElement || document.body;
      p.__rvIdx = (p.__rvIdx || 0) + 1;
      el.style.setProperty('--reveal-delay', ((p.__rvIdx - 1) * 80) + 'ms');

      var rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.classList.add('is-revealed'); // ya visible: sin parpadeo
      } else {
        io.observe(el);
      }
    });
  }

  ready(function() {
    initCursor();
    initReveal();
  });
})();

/* ============================================================
   PROJECT · TAKEOVER — el final de la página entrega el siguiente
   proyecto: panel sticky, la imagen del siguiente de fondo, su
   color subiendo con el scroll y una barra de progreso. Al llegar
   al fondo (y mantenerse un instante) navega solo con la cortina.
   El clic directo sigue funcionando en cualquier momento.
   ============================================================ */
(function() {
  function mq(q) { return window.matchMedia && window.matchMedia(q).matches; }
  function init() {
    var next = document.querySelector('.proj-next');
    if (!next) return;
    var link = next.querySelector('.proj-next-link');
    if (!link) return;
    var media = next.querySelector('.pn-media');
    var wash = next.querySelector('.pn-wash');
    // la imagen y el lavado viven DENTRO del panel sticky
    if (media) link.appendChild(media);
    if (wash) link.appendChild(wash);

    var reduce = mq('(prefers-reduced-motion: reduce)');

    var prog = document.createElement('span');
    prog.className = 'pn-progress';
    prog.setAttribute('aria-hidden', 'true');
    prog.innerHTML = '<span class="pp-txt">Sigue bajando</span><span class="pp-line"><i></i></span>';
    link.appendChild(prog);
    var bar = prog.querySelector('i');
    var txt = prog.querySelector('.pp-txt');

    var done = false;
    var dwell = null;
    var hasScrolled = false;   // evita el disparo si se llega ya al fondo (bfcache)
    var ticking = false;

    function update() {
      ticking = false;
      var r = next.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var total = r.height - vh;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;

      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (media && !reduce) media.style.transform = 'scale(' + (1.1 - p * 0.1).toFixed(4) + ')';
      if (wash) wash.style.opacity = (p * 0.55).toFixed(3);

      if (!reduce && !done && hasScrolled) {
        if (p >= 0.995) {
          if (!dwell) {
            dwell = setTimeout(function() {
              done = true;
              txt.textContent = 'Entrando';
              window.PageFX.leave(link.getAttribute('href'));
            }, 280);
          }
        } else if (dwell) {
          clearTimeout(dwell);
          dwell = null;
        }
      }
      if (!done) txt.textContent = p >= 0.995 ? 'Entrando' : 'Sigue bajando';
    }
    function tick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', function() { hasScrolled = true; tick(); }, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    // si se vuelve por bfcache, rearmar sin navegar
    window.addEventListener('pageshow', function() { done = false; hasScrolled = false; tick(); });
    update();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   MENÚ GLOBAL — botón flotante + overlay de navegación.
   Se inyecta aquí para que todas las páginas compartan una única
   fuente de verdad. Los enlaces .html pasan por PageFX (cortina)
   gracias al interceptor global de clics.
   ============================================================ */
(function() {
  function init() {
    if (document.getElementById('site-menu')) return;

    var PAGES = [
      { href: 'index.html',   label: 'Inicio' },
      { href: 'about.html',   label: 'Sobre mí' },
      { href: 'contact.html', label: 'Contacto' }
    ];
    var WORK = [
      { href: 'img1.html', n: '01', t: 'Coffee Rituals',      c: 'Packaging' },
      { href: 'img2.html', n: '02', t: 'Ottolinger × Mykita', c: '3D · Motion' },
      { href: 'img3.html', n: '03', t: 'Catalalata',          c: 'Packaging' },
      { href: 'img4.html', n: '04', t: 'El Rastrillo',        c: 'Campaña' },
      { href: 'img5.html', n: '05', t: 'Loewe 001',           c: '3D · Spot' }
    ];
    var here = location.pathname.split('/').pop() || 'index.html';
    function cur(href) { return href === here ? ' aria-current="page"' : ''; }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'site-menu');
    btn.innerHTML = '<span class="mb-ico" aria-hidden="true"></span>';
    // en el index la esquina derecha es del reproductor: botón a la izquierda
    if (document.querySelector('.content-drag-area')) btn.classList.add('mb-left');

    var menu = document.createElement('nav');
    menu.id = 'site-menu';
    menu.setAttribute('aria-label', 'Menú del sitio');
    menu.setAttribute('aria-hidden', 'true');

    var html = '<div class="sm-grid"><div class="sm-primary"><span class="sm-label sm-anim">Menú</span>';
    PAGES.forEach(function(p) {
      html += '<a class="sm-link sm-anim" href="' + p.href + '"' + cur(p.href) + '>' + p.label + '</a>';
    });
    html += '</div><div class="sm-work"><span class="sm-label sm-anim">Selected work</span><div class="sm-work-list">';
    WORK.forEach(function(w) {
      html += '<a class="sm-proj sm-anim" href="' + w.href + '"' + cur(w.href) + '><span class="sm-n">' + w.n + '</span>' + w.t + '<span class="sm-cat">' + w.c + '</span></a>';
    });
    html += '</div></div></div>';
    html += '<div class="sm-foot sm-anim">'
      + '<a class="sm-mail" href="mailto:cesardelvallefuentes@gmail.com">cesardelvallefuentes@gmail.com</a>'
      + '<div class="sm-social">'
      + '<a href="https://linkedin.com/in/cesar-del-valle-fuentes-518834275" target="_blank" rel="noopener">LinkedIn</a>'
      + '<a href="https://www.instagram.com/cesardelvalle.jpg/" target="_blank" rel="noopener">Instagram</a>'
      + '</div></div>';
    menu.innerHTML = html;

    document.body.appendChild(menu);
    document.body.appendChild(btn);

    // stagger de entrada (el delay solo aplica al abrir; ver .sm-anim en CSS)
    Array.prototype.forEach.call(menu.querySelectorAll('.sm-anim'), function(el, i) {
      el.style.setProperty('--d', (140 + i * 45) + 'ms');
    });

    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // botón magnético (mismo factor que .back-btn; se inyecta tarde y no
    // llega al binding del bloque de micro-interacciones)
    if (fine) {
      btn.addEventListener('mousemove', function(e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (mx * 0.25).toFixed(1) + 'px,' + (my * 0.25).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
    }

    // preview flotante del proyecto al pasar por "Selected work" (solo desktop)
    if (fine && !reduce) {
      var PREVIEWS = {
        'img1.html': 'img/CAFE_BOLSAS_web.jpg',
        'img2.html': 'img/POSTER_GAFAS_1_web.jpg',
        'img3.html': 'img/MOCKUP_ATUN_02.webp',
        'img4.html': 'img/RASTRILLO_INSTASTORIE2.webp',
        'img5.html': 'img/WhatsApp-Image-2025-09-24-at-15.47.46.webp'
      };
      var prev = document.createElement('div');
      prev.className = 'sm-preview';
      prev.setAttribute('aria-hidden', 'true');
      var pimg = document.createElement('img');
      pimg.alt = '';
      pimg.decoding = 'async';
      prev.appendChild(pimg);
      menu.appendChild(prev);

      var px = 0, py = 0, vx = -1e4, vy = 0;
      menu.addEventListener('mousemove', function(e) { px = e.clientX; py = e.clientY; }, { passive: true });
      Array.prototype.forEach.call(menu.querySelectorAll('.sm-proj'), function(a) {
        a.addEventListener('mouseenter', function() {
          var src = PREVIEWS[a.getAttribute('href')];
          if (!src) return;
          if (pimg.getAttribute('src') !== src) pimg.setAttribute('src', src);
          prev.classList.add('is-on');
        });
        a.addEventListener('mouseleave', function() { prev.classList.remove('is-on'); });
      });
      (function pvLoop() {
        if (document.body.classList.contains('menu-open')) {
          if (vx < -9000) { vx = px; vy = py; }  // primer frame: sin viaje desde 0,0
          vx += (px - vx) * 0.16;
          vy += (py - vy) * 0.16;
          prev.style.transform = 'translate(' + (vx + 28).toFixed(1) + 'px,' + (vy - 96).toFixed(1) + 'px)';
        } else {
          vx = -1e4;
        }
        requestAnimationFrame(pvLoop);
      })();
    }

    function isOpen() { return document.body.classList.contains('menu-open'); }
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      // candado de scroll en <html>, que es el contenedor que scrollea
      document.documentElement.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
    }

    btn.addEventListener('click', function() { setOpen(!isOpen()); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
    });
    // clic en la página actual: solo cierra el menú (sin recargar)
    menu.addEventListener('click', function(e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && a.getAttribute('aria-current') === 'page') {
        e.preventDefault();
        setOpen(false);
      }
    });
    // si se vuelve por bfcache, que no quede abierto
    window.addEventListener('pageshow', function() { setOpen(false); });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   HERO — salida con parallax al hacer scroll (proyectos + about).
   El contenido del hero "se queda atrás" y se funde al salir.
   Solo transform/opacity, escritorio con hover, sin reduced-motion.
   El .proj-hero ya recorta (overflow hidden); .abx-hero usa clip.
   ============================================================ */
(function() {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !fine) return;

  function init() {
    var hero = document.querySelector('.proj-hero') || document.querySelector('.abx-hero');
    if (!hero) return;
    var inner = hero.querySelector('.proj-hero-inner') || hero.querySelector('.abx-hero-inner');
    if (!inner) return;

    var h = 1, cur = 0;
    function measure() { h = Math.max(1, hero.offsetHeight); }
    measure();
    window.addEventListener('resize', measure);

    (function loop() {
      var sc = Math.min(Math.max(window.scrollY, 0), h);
      cur += ((sc * 0.24) - cur) * 0.12;
      var p = Math.min(1, sc / h);
      inner.style.transform = 'translateY(' + cur.toFixed(2) + 'px)';
      inner.style.opacity = (1 - p * 0.55).toFixed(3);
      requestAnimationFrame(loop);
    })();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   ABOUT — count-up de los números del toolbox al revelarse.
   Acompaña al llenado de la barra (misma duración y curva).
   ============================================================ */
(function() {
  function init() {
    if (!document.body.classList.contains('about-page')) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var bars = document.querySelectorAll('.abx-bar');
    if (!bars.length) return;

    function countUp(num) {
      var target = parseInt(num.textContent, 10);
      if (!target) return;
      var t0 = null;
      var DUR = 1150;
      function step(ts) {
        if (!t0) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR);
        var eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico, como la barra
        num.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(step);
      }
      num.textContent = '0';
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (!en.isIntersecting) return;
        var num = en.target.querySelector('.abx-bar-num');
        if (num && !en.target.__counted) { en.target.__counted = true; countUp(num); }
        io.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    bars.forEach(function(b) { io.observe(b); });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   RENDIMIENTO — pausa marquees y vídeos autoplay fuera de
   pantalla (nada visible cambia; se ahorra CPU/batería).
   ============================================================ */
(function() {
  function init() {
    if (!('IntersectionObserver' in window)) return;

    var tracks = document.querySelectorAll('.proj-marquee-track, .cafe-ticker-track, .film-marquee');
    if (tracks.length) {
      var iom = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) {
          en.target.classList.toggle('is-paused', !en.isIntersecting);
        });
      }, { rootMargin: '90px 0px' });
      tracks.forEach(function(t) { iom.observe(t); });
    }

    var vids = document.querySelectorAll('video[autoplay]');
    if (vids.length) {
      var iov = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) {
          var v = en.target;
          if (en.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function() {});
          } else {
            v.pause();
          }
        });
      }, { rootMargin: '140px 0px' });
      vids.forEach(function(v) { iov.observe(v); });
    }
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   FOOTER — fila meta inyectada: hora local de Madrid + volver
   arriba. Solo en páginas con .site-footer (proyectos).
   ============================================================ */
(function() {
  function init() {
    var inner = document.querySelector('.site-footer .sf-inner');
    if (!inner || inner.querySelector('.sf-meta')) return;

    var row = document.createElement('div');
    row.className = 'sf-meta';
    row.innerHTML =
      '<span class="sf-clock">Madrid · <b>--:--</b></span>' +
      '<button type="button" class="sf-top">Volver arriba' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' +
      '</button>';
    inner.insertBefore(row, inner.querySelector('.sf-copy'));

    var b = row.querySelector('.sf-clock b');
    if (window.Intl && Intl.DateTimeFormat) {
      var fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
      var tick = function() { b.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 30000);
    }

    row.querySelector('.sf-top').addEventListener('click', function() {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   TITULARES — reveal por palabras/letras con máscara (heroes).
   Progresivo: si no corre (reduced-motion, sin JS), el titular
   conserva su animación de bloque original o queda visible.
   ============================================================ */
(function() {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  /* envuelve cada palabra (o letra) en una máscara .tsplit-w > .tsplit-i,
     respetando la estructura interna (em, strong…) del titular */
  function wrapWords(root, mode) {
    var count = 0;
    function mask(text) {
      var w = document.createElement('span');
      w.className = 'tsplit-w';
      var i = document.createElement('span');
      i.className = 'tsplit-i';
      i.setAttribute('data-ti', count++);
      i.textContent = text;
      w.appendChild(i);
      return w;
    }
    function walk(node) {
      if (node.nodeType === 3) {
        if (!node.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function(part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          if (mode === 'letter') {
            var word = document.createElement('span');
            word.style.whiteSpace = 'nowrap';
            part.split('').forEach(function(ch) { word.appendChild(mask(ch)); });
            frag.appendChild(word);
          } else {
            frag.appendChild(mask(part));
          }
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1 && !node.classList.contains('tsplit-w')) {
        Array.prototype.slice.call(node.childNodes).forEach(walk);
      }
    }
    Array.prototype.slice.call(root.childNodes).forEach(walk);
    return count;
  }

  function split(el, mode, base, step, dur) {
    if (!el || el.classList.contains('is-split')) return;
    var n = wrapWords(el, mode);
    if (!n) return;
    Array.prototype.forEach.call(el.querySelectorAll('.tsplit-i'), function(i) {
      i.style.setProperty('--td', (base + (parseInt(i.getAttribute('data-ti'), 10) || 0) * step) + 'ms');
      i.style.setProperty('--tdur', dur + 'ms');
    });
    el.classList.add('is-split');
    // doble rAF: el estado oculto se pinta antes de disparar la transición
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { el.classList.add('tsplit-run'); });
    });
    // cuando la última palabra aterriza, las palabras pasan a responder
    // al cursor (transición corta, sin los delays de entrada)
    setTimeout(function() { el.classList.add('tsplit-done'); }, base + n * step + dur + 80);
  }

  /* como split(), pero arranca cuando el titular entra en el viewport
     (para los títulos de sección; conviven con el rise del contenedor) */
  function splitOnView(el, mode, base, step, dur) {
    if (!el || el.classList.contains('is-split')) return;
    var n = wrapWords(el, mode);
    if (!n) return;
    Array.prototype.forEach.call(el.querySelectorAll('.tsplit-i'), function(i) {
      i.style.setProperty('--td', (base + (parseInt(i.getAttribute('data-ti'), 10) || 0) * step) + 'ms');
      i.style.setProperty('--tdur', dur + 'ms');
    });
    el.classList.add('is-split');
    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      el.classList.add('tsplit-run');
      setTimeout(function() { el.classList.add('tsplit-done'); }, base + n * step + dur + 80);
    }
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (!('IntersectionObserver' in window) || (r.top < vh && r.bottom > 0)) {
      // sin observer o ya visible al cargar: arranca directamente
      requestAnimationFrame(function() { requestAnimationFrame(run); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting) { io.disconnect(); run(); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
  }

  function init() {
    split(document.querySelector('.proj-title'), 'word', 160, 70, 850);
    split(document.querySelector('.abx-name'), 'word', 140, 95, 900);
    split(document.querySelector('.contact-title'), 'letter', 110, 30, 750);
    // títulos de sección de las páginas de proyecto, al entrar en vista
    Array.prototype.forEach.call(document.querySelectorAll('.gx-title'), function(t) {
      splitOnView(t, 'word', 150, 60, 750);
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   WIPE DEL HERO — el visual del proyecto se revela con una máscara
   que sube (clip-path, compositable) mientras la foto asienta de
   1.07 a 1. Sustituye al ph-rise del visual; el parallax se arma
   igualmente por su red de seguridad de 1700 ms.
   ============================================================ */
(function() {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  function init() {
    var v = document.querySelector('.proj-hero-visual');
    if (!v) return;
    v.style.animation = 'none';        // el wipe reemplaza su ph-rise
    v.classList.add('ph-wipe');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { v.classList.add('ph-wipe-run'); });
    });
    // al terminar, fuera el clip (no debe recortar el glow ni el tilt)
    v.addEventListener('transitionend', function te(e) {
      if (e.target !== v) return;
      v.classList.add('ph-wipe-done');
      v.removeEventListener('transitionend', te);
    });
    setTimeout(function() { v.classList.add('ph-wipe-done'); }, 1800);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   MARQUESINAS VIVAS — las bandas .proj-marquee-track pasan a
   moverse por JS y aceleran con la velocidad del scroll (se
   sienten conectadas a la mano). Con reduced-motion no corre y
   queda la animación CSS (que el reduce global ya detiene).
   ============================================================ */
(function() {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  function init() {
    var tracks = document.querySelectorAll('.proj-marquee-track');
    if (!tracks.length) return;

    var items = Array.prototype.map.call(tracks, function(t) {
      t.style.animation = 'none';      // JS toma el control
      var it = { el: t, x: 0, w: 0, hover: false };
      var parent = t.closest('.proj-marquee') || t;
      parent.addEventListener('mouseenter', function() { it.hover = true; });
      parent.addEventListener('mouseleave', function() { it.hover = false; });
      return it;
    });
    function measure() {
      items.forEach(function(it) { it.w = it.el.scrollWidth / 2; });
    }
    measure();
    window.addEventListener('resize', measure, { passive: true });

    var lastY = window.scrollY || 0, vel = 0, lastT = 0;
    (function loop(ts) {
      var dt = lastT ? Math.min(48, ts - lastT) : 16;
      lastT = ts;
      var y = window.scrollY || 0;
      vel += ((y - lastY) - vel) * 0.12;    // suavizado
      lastY = y;
      items.forEach(function(it) {
        if (!it.w) return;
        // base ≈ paridad con la animación CSS (w/2 en 24 s) + boost por scroll
        var base = it.w / 24000;                        // px por ms
        var boost = Math.min(2.5, Math.abs(vel) * 0.05); // hasta ~3.5× al scrollear
        var speed = it.hover ? 0 : base * (1 + boost);
        it.x -= speed * dt;
        if (it.x <= -it.w) it.x += it.w;
        it.el.style.transform = 'translate3d(' + it.x.toFixed(1) + 'px,0,0)';
      });
      requestAnimationFrame(loop);
    })(0);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   PARALLAX DE SCROLL — el visual del hero y los números fantasma
   se desplazan un poco más lento que la página (profundidad).
   Solo desktop con puntero fino y sin reduced-motion. Transform
   directo sobre cada elemento (GPU) e interrumpible por diseño.
   ============================================================ */
(function() {
  function mq(q) { return window.matchMedia && window.matchMedia(q).matches; }
  function init() {
    if (mq('(prefers-reduced-motion: reduce)')) return;
    if (mq('(hover: none)') || mq('(pointer: coarse)') || window.innerWidth <= 900) return;

    var hero = document.querySelector('.proj-hero');
    var heroV = document.querySelector('.proj-hero-visual');
    var bgnums = document.querySelectorAll('.gx-bgnum');
    if (!(hero && heroV) && !bgnums.length) return;

    var items = [];
    // números gigantes de fondo (mantienen su translateY(-50%) propio);
    // con fade: sus secciones sí recortan (overflow hidden)
    Array.prototype.forEach.call(bgnums, function(el) {
      items.push({ el: el, box: el.parentElement, speed: 0.13, base: 'translateY(-50%) ', fade: true });
    });

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      items.forEach(function(it) {
        var r = it.box.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;   // fuera de vista
        var d = (r.top + r.height / 2) - vh / 2;          // distancia al centro
        // fade: en secciones que recortan, el desfase decae a cero al salir
        // (el hero no lo necesita: su overflow es visible y sangra sin corte)
        var k = 1;
        if (it.fade) {
          var vis = Math.max(0, Math.min(1, r.bottom / vh));
          k = vis * vis;
        }
        // signo negativo: el elemento "se queda atrás" respecto al scroll
        it.el.style.transform = it.base + 'translate3d(0,' + (-d * it.speed * k).toFixed(1) + 'px,0)';
      });
    }
    function tick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });

    // el visual del hero entra cuando termina su ph-rise: la animación
    // (fill both) pisaría el transform inline mientras siga aplicada.
    // Si el wipe ya la sustituyó (clase ph-wipe), se arma al instante
    // (evita el salto si el usuario scrollea en el primer segundo).
    if (hero && heroV) {
      var armed = false;
      var arm = function(e) {
        if (armed) return;
        if (e && e.animationName && e.animationName !== 'ph-rise') return;
        armed = true;
        heroV.style.animation = 'none';
        items.push({ el: heroV, box: hero, speed: 0.09, base: '' });
        update();
      };
      if (heroV.classList.contains('ph-wipe')) {
        arm();
      } else {
        heroV.addEventListener('animationend', arm);
        setTimeout(arm, 1700);   // red de seguridad (bfcache / animación perdida)
      }
    }
    update();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   LIGHTBOX COMPARTIDO — cualquier imagen con [data-lightbox] se
   amplía al hacer clic. Overlay con cursor "Cerrar", cierre por
   clic o Escape, candado de scroll y foco devuelto al origen.
   ============================================================ */
(function() {
  function init() {
    var imgs = document.querySelectorAll('img[data-lightbox]');
    if (!imgs.length) return;
    Array.prototype.forEach.call(imgs, function(img) {
      img.setAttribute('data-cursor', 'Ampliar');
    });

    document.addEventListener('click', function(e) {
      var img = e.target.closest && e.target.closest('img[data-lightbox]');
      if (!img) return;
      e.stopPropagation();

      var opener = img;
      var overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', img.alt || 'Imagen ampliada');
      overlay.setAttribute('data-cursor', 'Cerrar');
      overlay.tabIndex = -1;

      var big = document.createElement('img');
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || '';
      big.decoding = 'async';
      overlay.appendChild(big);
      document.body.appendChild(overlay);
      document.documentElement.classList.add('lightbox-open');
      overlay.focus({ preventScroll: true });

      requestAnimationFrame(function() {
        requestAnimationFrame(function() { overlay.classList.add('is-on'); });
      });

      function close() {
        overlay.classList.remove('is-on');
        document.documentElement.classList.remove('lightbox-open');
        document.removeEventListener('keydown', onEsc);
        setTimeout(function() { overlay.remove(); }, 320);
        if (opener && opener.focus) opener.focus({ preventScroll: true });
      }
      function onEsc(ev) { if (ev.key === 'Escape') close(); }
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', onEsc);
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   SKIP-LINK — accesibilidad de teclado: primer tab salta al
   contenido principal (invisible para ratón y táctil).
   ============================================================ */
(function() {
  function init() {
    if (document.querySelector('.skip-link')) return;
    var skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#';
    skip.textContent = 'Saltar al contenido';
    document.body.insertBefore(skip, document.body.firstChild);
    skip.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector('main, .proj-hero, h1');
      if (!target) return;
      target.setAttribute('tabindex', '-1');
      target.focus();
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* Firma en consola (guiño profesional, inofensivo) */
try {
  console.log(
    '%cCésar Del Valle %c— Graphic Designer\n%cBranding · Packaging · 3D · Motion   ·   cesardelvallefuentes@gmail.com',
    'font:800 14px Inter,sans-serif;color:#c7b299;',
    'font:300 14px Inter,sans-serif;color:#8d857a;',
    'font:400 11px Inter,sans-serif;color:#8d857a;'
  );
} catch (e) {}
