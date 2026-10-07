
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
    'img5.html':    { label: 'LOEWE 001' },
    'img6.html':    { label: 'THE GRMPS' }
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

  // el logo de la cabecera de la home: ya estás en la home, así que en
  // vez de recargar, la cara saluda (se ladea y parpadea)
  const topLogo = document.querySelector('.top-logo');
  if (topLogo) {
    topLogo.addEventListener('click', (e) => {
      e.preventDefault();
      topLogo.classList.remove('is-hi');
      void topLogo.offsetWidth;
      topLogo.classList.add('is-hi');
    });
    topLogo.addEventListener('animationend', (e) => { if (e.target === topLogo.firstElementChild) topLogo.classList.remove('is-hi'); });
  }

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
        const selectable = e.target.closest && e.target.closest('.img-drag, a, button, input, textarea, .top-bar-left, .hero-btn, .theme-toggle, .contact-link, .contact-card, .cta-button, .card-link, .minimal-card img, [data-lightbox]');
        eggCursor.style.backgroundImage = selectable ? "url('img/HOVER.svg')" : "url('img/DEFAULT.svg')";
      }
    });
  }

  const imgLinks = ['img1.html','img2.html','img3.html','img4.html','img5.html','img6.html'];
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

  // botón "About me": mismo comportamiento que el del menú (el press lo
  // hace el :active del CSS; la cortina de PageFX es la respuesta)
  const btn = document.querySelector('.hero-btn');
  if (btn) {
    btn.addEventListener('touchstart', () => {}, { passive: true }); // :active en iOS
    btn.addEventListener('click', () => { window.PageFX.leave('about.html'); });
  }

  /* (sin hover en el subtítulo: la animación de rebote solo en la entrada) */

  /* Entrada del hero. PORTFOLIO sube letra a letra desde detrás de su
     línea base, del centro hacia fuera (nace del muñeco), estirada; al
     llegar se asienta con un pequeño aplastamiento. Después el subtítulo
     sube igual, más rápido, y entran el botón, las cards y el punto.
     Con movimiento reducido: solo fundidos. */
  function playHeroTitleAnimation() {
    const title = document.querySelector('.hero-title');
    const btn = document.querySelector('.hero-btn');
    const subtitle = document.querySelector('.hero-subtitle');
    if (!title || typeof gsap === 'undefined') return; // páginas sin hero de la home / sin GSAP
    if (window.heroSplit) window.heroSplit();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const letters = title.querySelectorAll('.ht-l');
    const subLetters = subtitle ? subtitle.querySelectorAll('.ht-l') : [];
    const EASE_IN = 'power4.out';
    gsap.set(btn, {opacity: 0, y: 60, scale: 0.92, filter: 'blur(10px)'});
    const tl = gsap.timeline();

    if (reduce || !letters.length) {
      // (el CSS antiguo deja el subtítulo desplazado y borroso: se fija a mano)
      gsap.set([title, subtitle], {opacity: 0, visibility: 'visible', y: 0, scale: 1, filter: 'blur(0px)'});
      tl.to(title, {opacity: 1, duration: 0.6, ease: 'power2.out', onComplete: () => { title.style.pointerEvents = 'auto'; }}, 0)
        .to(subtitle, {opacity: 1, duration: 0.6, ease: 'power2.out', onComplete: () => { subtitle.style.pointerEvents = 'auto'; }}, 0.2);
    } else {
      // mientras dura la entrada, GSAP es dueño de los transforms (los
      // muelles del cursor esperan a que se borre la bandera)
      title.dataset.entering = '1';
      gsap.killTweensOf([...letters, ...subLetters]);
      title.classList.add('is-masking');
      if (subtitle) subtitle.classList.add('is-masking');
      gsap.set([title, subtitle], {opacity: 1, visibility: 'visible', y: 0, scale: 1, filter: 'blur(0px)', pointerEvents: 'none'});
      gsap.set(letters, {yPercent: 112, scaleY: 1.45, opacity: 1});
      gsap.set(subLetters, {yPercent: 120, opacity: 1});
      const from = {each: 0.07, from: 'center'};
      tl.to(letters, {yPercent: 0, duration: 1.3, ease: EASE_IN, stagger: from}, 0)
        .to(letters, {scaleY: 1, duration: 0.95, ease: 'back.out(2.4)', stagger: from}, 0.16)
        .to(subLetters, {yPercent: 0, duration: 0.85, ease: EASE_IN, stagger: 0.016}, 0.62)
        .add(() => {
          delete title.dataset.entering;
          gsap.set([...letters, ...subLetters], {clearProps: 'transform'});
          title.classList.remove('is-masking');
          if (subtitle) subtitle.classList.remove('is-masking');
          title.style.pointerEvents = 'auto';
          if (subtitle) subtitle.style.pointerEvents = 'auto';
          if (window.heroRemeasure) window.heroRemeasure();
        });
    }

    tl.to(btn, {opacity: 1, y: 0, scale: 1.08, filter: 'blur(0px)', duration: 0.14, ease: 'back.out(2)',
        onStart: () => { btn.style.pointerEvents = 'none'; },
        onComplete:()=>{ btn.style.pointerEvents = 'auto'; gsap.to(btn, {scale:1, duration:0.12, ease:'power1.out', clearProps:'transform,filter'}); }
      }, 0.75)
      .add(() => animateStackedImages(), 0.85)
      .add(() => { if (window.initWhatsitIn) window.initWhatsitIn(); }, 2.1);
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

/* Física de las cards. Cada card lleva muelles para su giro, su escala y
   su inclinación 3D, y GSAP lo compone con la x/y del arrastre:
   · cursor encima → se levanta un poco y se inclina hacia él; las que
     siguen en el montón se abren en abanico para que se vea que hay más;
   · al cogerla → se levanta del todo, como una foto que coges de la mesa;
   · al arrastrarla o lanzarla → se balancea según la velocidad, como si
     la llevaras cogida por una esquina;
   · al soltarla → se asienta con un giro nuevo, como caída sobre la mesa.
   Solo transform, y el muelle reapunta desde donde esté (interrumpible).
   Con reduced-motion no hay física: se arrastran como siempre. */
const CARD_K = 0.12, CARD_D = 0.76;            // rigidez y amortiguación del muelle
const cardFine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
const cardReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const clampSwing = gsap.utils.clamp(-12, 12);
const clampDrop = gsap.utils.clamp(-4, 4);
const clampRest = gsap.utils.clamp(-9, 9);
const cards = [];
let cardsRunning = false, stackHover = false;

function inStack(c) {
  return Math.abs(gsap.getProperty(c.img, 'x')) < 40 && Math.abs(gsap.getProperty(c.img, 'y')) < 40;
}
// un paso del muelle; al llegar (dentro de eps) se clava en el destino
function cardSpring(c, key, vkey, target, eps) {
  c[vkey] = (c[vkey] + (target - c[key]) * CARD_K) * CARD_D;
  c[key] += c[vkey];
  if (Math.abs(target - c[key]) < eps && Math.abs(c[vkey]) < eps) { c[key] = target; c[vkey] = 0; return 1; }
  return 0;
}
function cardsStep() {
  let active = false;
  cards.forEach(c => {
    if (gsap.isTweening(c.img)) { active = true; return; }   // la entrada de las cards manda
    const moving = c.dragging || c.throwing;
    const v = moving ? c.tracker.get('x') : 0;              // px/s en horizontal
    const fan = stackHover && !moving && inStack(c) ? Math.sign(c.base || 1) * 3.2 : 0;
    const tilt = c.hover && !moving;
    const done =
      cardSpring(c, 'r', 'vr', c.base + clampSwing(v * 0.01) + fan, 0.02) &
      cardSpring(c, 's', 'vs', c.dragging ? 1.06 : (c.hover ? 1.03 : 1), 0.0005) &
      cardSpring(c, 'rx', 'vrx', tilt ? (0.5 - c.hy) * 14 : 0, 0.02) &
      cardSpring(c, 'ry', 'vry', tilt ? (c.hx - 0.5) * 14 : 0, 0.02);
    gsap.set(c.img, { rotation: c.r, scale: c.s, rotationX: c.rx, rotationY: c.ry });
    if (!done || moving) active = true;
  });
  cardsRunning = active;
  if (active) requestAnimationFrame(cardsStep);
}
// un destello suave cruza la card una sola vez (al entrar el cursor); si
// ya está pasando, no se reinicia
function playSweep(c) {
  if (cardReduce || !c.sweep || !c.sweep.animate) return;
  if (c.sweepAnim && c.sweepAnim.playState === 'running') return;
  c.sweepAnim = c.sweep.animate([
    { transform: 'translateX(-30%)', opacity: 0 },        // ±30% de una capa 4 veces la card = ±1.2 cards
    { opacity: 1, offset: 0.2 },
    { opacity: 1, offset: 0.75 },
    { transform: 'translateX(30%)', opacity: 0 }
  ], { duration: 1100, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });   // ease-out suave: cruza a ritmo casi constante
}
/* Título del proyecto encima de la card al pasar el cursor (solo con ratón).
   Una sola etiqueta para todas, con el estilo del botón del menú: cada
   fotograma se coloca sobre el borde de arriba de su card (que se mueve,
   gira y se inclina); si la card está pegada arriba, va debajo. */
const cardTitle = (() => {
  if (!cardFine) return null;
  const el = document.createElement('div');
  el.className = 'card-title';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="ct-in"><span class="ct-n"></span><span class="ct-t"></span></span>';
  document.body.appendChild(el);
  return { el, inner: el.firstChild, n: el.querySelector('.ct-n'), t: el.querySelector('.ct-t'), card: null, raf: 0, off: 0 };
})();
function titleFollow() {
  const T = cardTitle;
  T.raf = 0;
  if (!T.card) return;
  const r = T.card.img.getBoundingClientRect();
  const below = r.top < 64;
  const x = r.left + r.width / 2, y = below ? r.bottom + 14 : r.top - 14;
  T.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,' + (below ? '0' : '-100%') + ')';
  T.el.classList.toggle('is-below', below);
  T.raf = requestAnimationFrame(titleFollow);
}
function showTitle(c) {
  const T = cardTitle;
  if (!T) return;
  clearTimeout(T.off);
  const swap = T.card && T.card !== c && T.el.classList.contains('is-on');
  T.card = c;
  T.n.textContent = c.num;
  T.t.textContent = c.title;
  if (!T.raf) titleFollow();
  T.el.classList.add('is-on');
  // de una card a otra: el texto cambia con un pequeño relevo, sin apagarse
  if (swap && !cardReduce && T.inner.animate) {
    T.inner.animate([{ transform: 'translateY(4px)', opacity: 0.35 }, { transform: 'none', opacity: 1 }],
      { duration: 180, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
  }
}
function hideTitle(c) {
  const T = cardTitle;
  if (!T || (c && T.card !== c)) return;
  T.el.classList.remove('is-on');
  clearTimeout(T.off);
  T.off = setTimeout(() => { cancelAnimationFrame(T.raf); T.raf = 0; T.card = null; }, 220);
}
function kickCards() {
  if (cardReduce || cardsRunning) return;
  cardsRunning = true;
  requestAnimationFrame(cardsStep);
}

class DraggableImg {
  constructor(Image) {
    const proxy = document.createElement("div"),
      tracker = InertiaPlugin.track(proxy, "x")[0],
    align = () => gsap.set(proxy, {attr:{class:'proxy'}, x: gsap.getProperty(Image, "x"), y: gsap.getProperty(Image, "y"), width: Image.offsetWidth, height: Image.offsetHeight, position: "absolute", pointerEvents: "none", top: Image.offsetTop, left: Image.offsetLeft});

    align();
    Image.parentNode.append(proxy);
    Image.style.borderRadius = "12px";
    window.addEventListener('resize', align);

    // estado físico de la card (el giro de partida es el de su CSS)
    const base = gsap.getProperty(Image, 'rotation') || 0;
    const c = { img: Image, tracker, base, r: base, vr: 0, s: 1, vs: 0, rx: 0, vrx: 0, ry: 0, vry: 0,
                hx: 0.5, hy: 0.5, hover: false, dragging: false, throwing: false,
                num: ((Image.className.match(/img-(\d)/) || [0, 0])[1] + '').padStart(2, '0'),
                title: (Image.alt || '').split(' — ')[0] };
    cards.push(c);
    gsap.set(Image, { transformPerspective: 1000 });

    // destello: capa hermana de la imagen (un <img> no admite capas dentro)
    // que copia su transform en cada fotograma (ver glossLoop)
    const gloss = document.createElement('span');
    gloss.className = 'card-gloss';
    gloss.setAttribute('aria-hidden', 'true');
    gloss.innerHTML = '<i class="cg-sweep"></i>';
    Image.after(gloss);
    Object.assign(c, { gloss, sweep: gloss.firstChild, sweepAnim: null, gT: null, gO: null, gZ: null });
    const placeGloss = () => {
      c.w = Image.offsetWidth; c.h = Image.offsetHeight;
      Object.assign(gloss.style, { left: Image.offsetLeft + 'px', top: Image.offsetTop + 'px', width: c.w + 'px', height: c.h + 'px' });
    };
    placeGloss();
    window.addEventListener('resize', placeGloss);

    if (cardFine) {
      Image.addEventListener('mouseenter', () => { playSweep(c); if (!c.dragging) showTitle(c); });
      Image.addEventListener('mousemove', (e) => {
        if (c.dragging) return;
        const r = Image.getBoundingClientRect();
        c.hx = (e.clientX - r.left) / r.width;
        c.hy = (e.clientY - r.top) / r.height;
        c.hover = true;
        stackHover = inStack(c);
        kickCards();
        // tras soltarla (o si entró arrastrando otra) la etiqueta vuelve al moverse
        if (cardTitle && (cardTitle.card !== c || !cardTitle.el.classList.contains('is-on'))) showTitle(c);
      });
      Image.addEventListener('mouseleave', () => { c.hover = false; stackHover = false; kickCards(); hideTitle(c); });
    }

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
      onPress() {
        Image.style.zIndex = proxy.style.zIndex; window._setGrabbingCursor(true);
        c.dragging = true; c.throwing = false; stackHover = false; kickCards();
        if (!cardFine) playSweep(c);                // en táctil no hay hover: el destello sale al tocarla
        hideTitle();                                // arrastrando, la etiqueta estorba
      },
      onDrag(e) {
        gsap.set(Image, {x: this.x, y: this.y});
        const evt = (e && e.type && e.clientX !== undefined) ? e : (window.event || {});
        if (evt.clientX !== undefined && evt.clientY !== undefined) {
          const eggCursor = document.getElementById('egg-cursor'); eggCursor.style.left = evt.clientX + 'px'; eggCursor.style.top = evt.clientY + 'px';
          const dragmeBubble = document.getElementById('dragme-bubble'); dragmeBubble.style.left = (evt.clientX + 8) + 'px'; dragmeBubble.style.top = (evt.clientY + 8) + 'px'; dragmeBubble.style.opacity = '1'; dragmeBubble.style.visibility = 'visible';
        }
      },
      onDragEnd() {
        // cae sobre la mesa con un giro nuevo, algo empujado por la velocidad
        c.base = clampRest(c.base + clampDrop(tracker.get('x') * 0.003) + (Math.random() * 6 - 3));
      },
      onRelease() {
        window._setGrabbingCursor(false); const dragmeBubble = document.getElementById('dragme-bubble'); dragmeBubble.style.opacity = '0'; dragmeBubble.style.visibility = 'hidden';
        c.dragging = false; kickCards();
        if (cardFine && Image.matches(':hover')) showTitle(c);
      },
      onThrowUpdate() { gsap.set(Image, {x: this.x, y: this.y}); c.throwing = true; kickCards(); },
      onThrowComplete() { c.throwing = false; kickCards(); },
      inertia: true
    })[0];
  }
}

let draggables = gsap.utils.toArray(".img-drag").map(el => new DraggableImg(el));

/* Destello de las cards: cada capa copia transform, opacidad y z-index de
   su imagen, así el destello viaja con la card (giro, inclinación, entrada). */
(function glossLoop() {
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], st = c.img.style;
    if (st.transform !== c.gT) { c.gT = st.transform; c.gloss.style.transform = st.transform; }
    if (st.opacity !== c.gO) { c.gO = st.opacity; c.gloss.style.opacity = st.opacity; }
    const z = st.zIndex || getComputedStyle(c.img).zIndex;
    if (z !== c.gZ) { c.gZ = z; c.gloss.style.zIndex = z; }
  }
  requestAnimationFrame(glossLoop);
})();

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
    const ld = document.getElementById('loading-screen');
    const zoom = ld && ld.querySelector('.ld-zoom');
    const mark = ld && ld.querySelector('.ld-mark');
    const hole = ld && ld.querySelector('.ld-hole');
    const glint = ld && ld.querySelector('.ld-glint');
    if (!(ld && zoom && mark && hole && glint)) { showInstant(); return; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const yy = String(new Date().getFullYear()).slice(-2);
    ld.querySelectorAll('.ld-year').forEach((y) => { y.textContent = 'Portfolio — ’' + yy; });

    // el brillo grande del ojo izquierdo, recortado en el fondo justo
    // debajo de la cara (algo agrandado, para que su borde quede bajo el
    // beige del ojo). Solo se recorta al entrar: por ahí se ve la home.
    // VB es el viewBox del logo.
    const VB = { x: 122.89, y: 71.46, w: 714.21 };
    const GLINT = { x: 544.87, y: 551.08 };              // centro del brillo
    let geo = null;
    const placeHole = () => {
      const m = mark.getBoundingClientRect(), z = zoom.getBoundingClientRect();
      const s = m.width / VB.w, ox = m.left - z.left, oy = m.top - z.top;
      const t = 'translate(' + ox.toFixed(2) + ' ' + oy.toFixed(2) + ') scale(' + s.toFixed(6) + ') translate(' + (-VB.x) + ' ' + (-VB.y) + ')';
      hole.setAttribute('transform', t);
      glint.setAttribute('transform', t);
      geo = { s, ox, oy, w: z.width, h: z.height };
    };
    placeHole();
    window.addEventListener('resize', placeHole);

    // cuánto tiene que crecer el escenario, desde el centro del brillo, para
    // que el agujero cubra toda la pantalla (se comprueba con su forma real)
    const zoomTarget = () => {
      const { s, ox, oy, w, h } = geo;
      const Ox = ox + (GLINT.x - VB.x) * s, Oy = oy + (GLINT.y - VB.y) * s;
      const pt = glint.ownerSVGElement.createSVGPoint();
      const probe = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]];
      const covers = (S) => probe.every(([px, py]) => {
        pt.x = VB.x + (Ox + (px - Ox) / S - ox) / s;
        pt.y = VB.y + (Oy + (py - Oy) / S - oy) / s;
        return glint.isPointInFill(pt);
      });
      let lo = 1, hi = 3000;
      if (!covers(hi)) return { S: 400, Ox, Oy };
      for (let i = 0; i < 28; i++) { const mid = Math.sqrt(lo * hi); if (covers(mid)) hi = mid; else lo = mid; }
      return { S: hi * 1.1, Ox, Oy };
    };

    // contador de rodillos
    const counters = Array.prototype.map.call(ld.querySelectorAll('.ld-count'), (el) => [0, 1, 2].map(() => {
      const d = document.createElement('span');
      d.className = 'ld-digit';
      const strip = document.createElement('span');
      strip.className = 'ld-strip';
      for (let n = 0; n <= 9; n++) { const s = document.createElement('span'); s.textContent = n; strip.appendChild(s); }
      d.appendChild(strip);
      el.appendChild(d);
      return { d, strip };
    }));
    const msgs = ld.querySelectorAll('.ld-msg');
    const STEPS = ['Trazando el contorno', 'Dibujando los ojos', 'Afinando la sonrisa', 'Listo'];
    let msgIdx = 0;
    const setCount = (v) => {
      const str = String(Math.round(v)).padStart(3, '0');
      counters.forEach((cols) => {
        let lead = true;
        cols.forEach((col, i) => {
          const n = +str[i];
          if (n !== 0 || i === 2) lead = false;
          col.d.classList.toggle('is-lead', lead);
          col.strip.style.transform = 'translateY(' + (-n) + 'em)';
        });
      });
      const idx = v >= 100 ? 3 : v >= 66 ? 2 : v >= 30 ? 1 : 0;
      if (idx !== msgIdx) { msgIdx = idx; msgs.forEach((m) => { m.textContent = STEPS[idx]; }); }
    };
    setCount(0);

    ld.classList.add('is-run');

    // contador: entra lento, corre en medio y se asienta (acaba cuando la
    // cara ya está montada)
    const START = reduce ? 150 : 350;
    const FILL = reduce ? 900 : 2600;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    let t0 = null;
    const step = (ts) => {
      if (t0 === null) t0 = ts;
      const x = Math.min(1, (ts - t0) / FILL);
      setCount(ease(x) * 100);
      if (x < 1) requestAnimationFrame(step); else finish();
    };
    setTimeout(() => requestAnimationFrame(step), START);

    function done() {
      try { sessionStorage.setItem(visitedKey, '1'); } catch (e) {}
      window.removeEventListener('resize', placeHole);
      setTimeout(() => { try { ld.remove(); } catch (e) { ld.style.display = 'none'; } }, 700);
    }

    // la entrada: se destapa el brillo, la home ya está detrás y el
    // escenario crece desde ese punto. Un leve retroceso al principio y
    // luego cada vez más deprisa (la escala sube de forma exponencial y su
    // logaritmo acelera, así el viaje se siente continuo). Hasta 120
    // aumentos como mucho: a esas alturas el brillo ya llena casi toda la
    // pantalla y la pantalla de carga se funde. Solo transform y opacidad.
    function enter() {
      const target = zoomTarget();
      const S = Math.min(target.S, 120);
      zoom.style.transformOrigin = target.Ox.toFixed(2) + 'px ' + target.Oy.toFixed(2) + 'px';
      ld.classList.add('is-exit');
      revealMain();
      const T = 1400, A = 0.94, t1 = 0.16, n = 12, p = 1.5;
      const frames = [{ offset: 0, transform: 'scale(1)', easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
                      { offset: t1, transform: 'scale(' + A + ')' }];
      for (let i = 1; i <= n; i++) {
        frames.push({ offset: t1 + (1 - t1) * Math.pow(i / n, 1 / p), transform: 'scale(' + (A * Math.pow(S / A, i / n)).toFixed(4) + ')' });
      }
      if (zoom.animate) zoom.animate(frames, { duration: T, fill: 'forwards' });
      setTimeout(triggerStartAnimations, T * 0.45);     // la home entra mientras se llega
      setTimeout(() => ld.classList.add('is-gone'), T * 0.76);
      setTimeout(done, T);
    }

    function finish() {
      setCount(100);
      if (reduce) {
        setTimeout(() => {
          revealMain();
          ld.classList.add('is-gone');
          triggerStartAnimations();
          done();
        }, 300);
        return;
      }
      // 1) parpadea  2) entra por el brillo del ojo
      setTimeout(() => ld.classList.add('is-blink'), 160);
      setTimeout(enter, 700);
    }
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

/* ============================================================
   DISCOS — la "sound palette" de César. Única fuente para el
   tocadiscos de la home y la caja de discos del about.
   label: color de la galleta de cada disco (tonos apagados de la paleta)
   ============================================================ */
var SITE_TRACKS = [
  { title: 'I Still Haven\'t Found What I\'m Looking For', artist: 'U2', label: '#c7b299', src: 'music/U2 - I Still Haven\'t Found What I\'m Looking For (Official Music Video).mp3' },
  { title: 'Llamando a la tierra', artist: 'M-Clan', label: '#b48a68', src: 'music/M-Clan - Llamando a la Tierra (letra).mp3' },
  { title: 'Guaya', artist: 'Don Omar', label: '#929b7f', src: 'music/Don Omar - Guaya Guaya (Audio).mp3' },
  { title: 'Snow Crystal', artist: 'Babalos', label: '#9198a1', src: 'music/Babalos - Snow Crystal [HQ] - Babalos.mp3' },
  { title: 'Vagabond', artist: 'Caamp', label: '#d6c8b0', src: 'music/Vagabond.mp3' },
  { title: 'Si Algo Es Puro Vale El Doble', artist: 'West Srk', label: '#a3877a', src: 'music/West Srk - Si Algo Es Puro Vale El Doble (Video Oficial) - West Srk.mp3' },
  { title: 'Moonlights Puppet Remix', artist: 'Al Safir, Interferencias', label: '#7a746c', src: 'music/Interferencias - MOONLIGHT\'S PUPPET (REMIX) feat. Al Safir (Videoclip Oficial).mp3' },
  { title: 'Somebody That I Used to Know', artist: 'Gotye ft. Kimbra', label: '#c39c7e', src: 'music/Gotye - Somebody That I Used To Know (feat. Kimbra) [Official Music Video].mp3' }
];

/* ============================================================
   REPRODUCTOR — tocadiscos 3D + título + anterior/pausa/siguiente
   El audio manda: los botones responden al instante y el tocadiscos
   "actúa" detrás (el brazo se levanta, gira y baja; el plato acelera
   y frena; el disco se cambia). Three.js se carga en diferido; sin
   WebGL o sin red queda el vinilo CSS como respaldo.
   ============================================================ */
(function() {
  const widget = document.getElementById('music-player');
  const audio = document.getElementById('audio-player');
  // El reproductor solo existe en la home
  if (!widget || !audio) return;

  const tracks = SITE_TRACKS;

  const stage = document.getElementById('tt-stage');
  const canvas = widget.querySelector('.tt-canvas');
  const disc = widget.querySelector('.vinyl-disc');
  const meta = widget.querySelector('.vinyl-meta');
  const titleWrap = widget.querySelector('.vinyl-title-wrap');
  const titleEl = document.getElementById('song-title');
  const artistEl = document.getElementById('song-artist');
  const playBtn = document.getElementById('play-pause');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let deck = null;

  /* ---- Vinilo CSS de respaldo: una vuelta cada 1.8s (33⅓ rpm) ---- */
  let spin = null, rate = 0, rateRAF = null;
  if (!reduceMotion && disc && disc.animate) {
    spin = disc.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      { duration: 1800, iterations: Infinity }
    );
    spin.pause();
  }

  // arranque corto, frenada más larga: así se comporta un plato al soltarlo
  function setSpin(target) {
    if (!spin) return;
    cancelAnimationFrame(rateRAF);
    if (target > 0 && spin.playState !== 'running') spin.play();
    const from = rate, t0 = performance.now(), dur = target > 0 ? 600 : 1100;
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      rate = from + (target - from) * (1 - Math.pow(1 - p, 3));
      spin.playbackRate = Math.max(rate, 0.001);
      if (p < 1) rateRAF = requestAnimationFrame(step);
      else if (target === 0) { rate = 0; spin.pause(); }
    }
    step(t0);
  }

  function setPlaying(on) {
    widget.classList.toggle('is-playing', on);
    const label = on ? 'Pausar' : 'Reproducir';
    playBtn.setAttribute('aria-label', label);
    stage.setAttribute('aria-label', label);
    if (deck) deck.setPlaying(on); else setSpin(on ? 1 : 0);
  }

  function play() {
    const p = audio.play();
    // al cambiar de pista la promesa anterior se rechaza: manda el estado real
    if (p && p.catch) p.catch(function() { setPlaying(!audio.paused); });
  }

  /* ---- Título: si no cabe, se desliza al pasar el ratón ---- */
  function measureTitle() {
    titleWrap.classList.remove('is-long');
    const overflow = titleEl.scrollWidth - titleWrap.clientWidth;
    if (overflow > 2) {
      titleEl.style.setProperty('--shift', (overflow + 10) + 'px');
      titleEl.style.setProperty('--dur', Math.max(1.6, overflow / 28).toFixed(2) + 's');
      titleWrap.classList.add('is-long');
    }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function renderMeta(dir) {
    const t = tracks[index];
    function apply() {
      titleEl.textContent = t.title;
      artistEl.textContent = t.artist;
      measureTitle();
    }
    if (!dir || reduceMotion || !meta.animate) { apply(); return; }

    // parte del estado actual para que los clics rápidos no salten
    const cs = getComputedStyle(meta);
    const fromO = cs.opacity, fromT = cs.transform;
    meta.getAnimations().forEach(function(a) { a.cancel(); });
    const out = meta.animate(
      [{ opacity: fromO, transform: fromT }, { opacity: 0, transform: 'translateX(' + (-6 * dir) + 'px)' }],
      { duration: 120, easing: EASE, fill: 'forwards' }
    );
    out.onfinish = function() {
      apply();
      meta.animate(
        [{ opacity: 0, transform: 'translateX(' + (6 * dir) + 'px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: EASE }
      );
      out.cancel();
    };
  }

  function load(i, dir) {
    const wasPlaying = !audio.paused;
    index = (i + tracks.length) % tracks.length;
    audio.src = tracks[index].src;
    renderMeta(dir);
    if (deck) deck.setTrack(index, dir);
    if (wasPlaying) play();
  }

  function toggle() { if (audio.paused) play(); else audio.pause(); }

  playBtn.addEventListener('click', toggle);
  stage.addEventListener('click', toggle);
  // como en cualquier reproductor: pasados 3s, "anterior" reinicia la pista
  prevBtn.addEventListener('click', function() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    load(index - 1, -1);
  });
  nextBtn.addEventListener('click', function() { load(index + 1, 1); });

  audio.addEventListener('play', function() { setPlaying(true); });
  audio.addEventListener('pause', function() { setPlaying(false); });
  audio.addEventListener('ended', function() { load(index + 1, 1); play(); });
  audio.addEventListener('error', function() {
    console.warn('No se pudo cargar el audio:', audio.src);
    setPlaying(false);
  });

  audio.volume = 0.7;
  audio.src = tracks[index].src;
  renderMeta(0);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureTitle);
  window.addEventListener('resize', measureTitle);

  /* ---- Tocadiscos 3D: se carga tras el load y solo en escritorio ---- */
  const hasWebGL = (function() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  })();
  const isDesktop = !(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  if (hasWebGL && isDesktop && canvas) {
    const start = function() {
      import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
        .then(function(THREE) {
          deck = createDeck(THREE);
          deck.setTrack(index, 0);
          if (spin) { cancelAnimationFrame(rateRAF); spin.cancel(); spin = null; }
          deck.setPlaying(!audio.paused);
          widget.classList.add('has-3d');
        })
        .catch(function(err) { console.warn('Tocadiscos 3D no disponible:', err); });
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  }

  function createDeck(THREE) {
    const W = stage.clientWidth, H = stage.clientHeight;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 60);
    const CAM = new THREE.Vector3(0.6, 8.6, 8.4);
    const LOOK = new THREE.Vector3(0.05, 0.15, 0.15);
    camera.position.copy(CAM);
    camera.lookAt(LOOK);

    /* luz: un estudio cálido como entorno (da reflejo a los metales y al
       vinilo) + una luz principal arriba a la izquierda con sombra suave */
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3d3730, side: THREE.BackSide })));
    function panel(w, h, x, y, z, k) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.88).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
    }
    panel(7, 3, -2.5, 5.8, 1.5, 4);
    panel(3, 5, 5.8, 1.5, -1, 1.6);
    panel(5, 2, 0, 1, 5.8, 0.8);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2e2822, 0.5));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
    key.position.set(-3.5, 8, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 20;
    key.shadow.radius = 5;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    function mat(color, roughness, metalness) {
      return new THREE.MeshStandardMaterial({ color: color, roughness: roughness, metalness: metalness || 0 });
    }
    const M = {
      plinth: mat(0xd8cab4, 0.78),
      dark: mat(0x26221e, 0.5, 0.25),
      metal: mat(0xd9d3c9, 0.28, 0.9),
      platter: mat(0x8f877c, 0.35, 0.85),
      mat: mat(0x1b1917, 0.95),
      accent: mat(0xc7b299, 0.55, 0.1)
    };
    function add(geo, material, x, y, z, parent) {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      (parent || scene).add(m);
      return m;
    }

    /* ---- peana con cantos redondeados ---- */
    function roundedSlab(w, d, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
      s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const b = 0.05;
      const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
      g.rotateX(-Math.PI / 2);
      g.translate(0, b, 0);
      return g;
    }
    const TOP = 0.5;
    add(roundedSlab(4.8, 3.7, TOP, 0.26), M.plinth, 0, 0, 0);

    // sombra de contacto sobre el "suelo" (solo la sombra, sin plano visible)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ---- plato ---- */
    const C = new THREE.Vector3(-0.42, 0, 0.02);
    const PLATTER_H = 0.13;
    add(new THREE.CylinderGeometry(1.5, 1.5, 0.03, 64), M.dark, C.x, TOP + 0.015, C.z);
    add(new THREE.CylinderGeometry(1.6, 1.6, PLATTER_H - 0.03, 96), M.platter, C.x, TOP + 0.03 + (PLATTER_H - 0.03) / 2, C.z);
    add(new THREE.CylinderGeometry(1.5, 1.5, 0.006, 64), M.mat, C.x, TOP + PLATTER_H + 0.003, C.z);
    const RECORD_Y = TOP + PLATTER_H + 0.006 + 0.0125;
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 16), M.metal, C.x, RECORD_Y + 0.06, C.z);

    /* ---- detalles: selector de velocidad + piloto ---- */
    add(new THREE.CylinderGeometry(0.2, 0.21, 0.08, 40), M.dark, -1.95, TOP + 0.04, 1.47);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32), M.metal, -1.95, TOP + 0.09, 1.47);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x3a2f24, emissive: 0xe0a85a, emissiveIntensity: 0, roughness: 0.4 });
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), ledMat, -1.5, TOP + 0.01, 1.55);

    /* ---- textura de surcos (compartida) ---- */
    const grooveTex = (function() {
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      const g = c.getContext('2d'), R = 512;
      g.fillStyle = '#131110'; g.fillRect(0, 0, 1024, 1024);
      for (let r = R * 0.36; r < R * 0.975; r += 1.7) {
        const gap = (r > R * 0.6 && r < R * 0.615) || (r > R * 0.78 && r < R * 0.792);
        g.strokeStyle = gap ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,' + (0.025 + Math.random() * 0.035).toFixed(3) + ')';
        g.lineWidth = 0.9;
        g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    })();

    /* ---- galleta impresa de cada disco ---- */
    const labelCache = {};
    function labelTexture(i) {
      if (labelCache[i]) return labelCache[i];
      const t = tracks[i];
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = t.label;
      g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(40,32,24,0.22)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(36,29,22,0.82)';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 17px Inter, Arial, sans-serif';
      g.fillText(t.artist.toUpperCase(), 128, 70);
      g.font = '500 10px Inter, Arial, sans-serif';
      g.fillText('CÉSAR DEL VALLE · ' + pad(i + 1), 128, 92);
      // título en dos líneas como mucho, debajo del agujero
      g.font = '400 13px Inter, Arial, sans-serif';
      const words = t.title.split(' '), lines = [''];
      words.forEach(function(w) {
        const cand = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w;
        if (g.measureText(cand).width > 150 && lines[lines.length - 1]) lines.push(w);
        else lines[lines.length - 1] = cand;
      });
      lines.slice(0, 2).forEach(function(l, k) { g.fillText(l, 128, 168 + k * 17); });
      g.font = '500 9px Inter, Arial, sans-serif';
      g.fillText('33⅓ RPM', 128, 214);
      g.fillStyle = '#131110';
      g.beginPath(); g.arc(128, 128, 6, 0, Math.PI * 2); g.fill();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return (labelCache[i] = tex);
    }

    function makeRecord() {
      const g = new THREE.Group();
      const edge = new THREE.MeshStandardMaterial({ color: 0x131110, roughness: 0.5, transparent: true });
      const face = new THREE.MeshStandardMaterial({ map: grooveTex, roughness: 0.32, transparent: true });
      const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.46, 0.025, 96), [edge, face, face]);
      vinyl.castShadow = true; vinyl.receiveShadow = true;
      const labelMat = new THREE.MeshStandardMaterial({ roughness: 0.85, transparent: true });
      const label = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), labelMat);
      label.rotation.x = -Math.PI / 2;
      label.position.y = 0.0128;
      label.receiveShadow = true;
      g.add(vinyl, label);
      g.userData.mats = [edge, face, labelMat];
      g.userData.labelMat = labelMat;
      scene.add(g);
      return g;
    }
    function place(rec, x, y, z, opacity) {
      rec.position.set(x, y, z);
      rec.visible = opacity > 0.002;
      rec.userData.mats.forEach(function(m) { m.opacity = opacity; m.depthWrite = opacity > 0.98; });
    }

    let current = makeRecord();
    let incoming = null;
    place(current, C.x, RECORD_Y, C.z, 1);

    /* ---- brazo ---- */
    const PIVOT = new THREE.Vector3(1.72, 0, -1.22);
    const ARM_H = 0.34, L = 2.55, LIFT = -0.075;
    add(new THREE.CylinderGeometry(0.26, 0.28, 0.07, 40), M.dark, PIVOT.x, TOP + 0.035, PIVOT.z);
    add(new THREE.CylinderGeometry(0.07, 0.08, ARM_H, 24), M.metal, PIVOT.x, TOP + ARM_H / 2, PIVOT.z);
    add(new THREE.CylinderGeometry(0.035, 0.035, ARM_H - 0.06, 12), M.dark, PIVOT.x, TOP + (ARM_H - 0.06) / 2, PIVOT.z + 2.02);
    add(new THREE.BoxGeometry(0.12, 0.03, 0.08), M.dark, PIVOT.x, TOP + ARM_H - 0.045, PIVOT.z + 2.02);

    const arm = new THREE.Group();
    arm.rotation.order = 'YXZ';
    arm.position.set(PIVOT.x, TOP + ARM_H, PIVOT.z);
    scene.add(arm);
    const tube = add(new THREE.CylinderGeometry(0.032, 0.032, L + 0.3, 16), M.metal, 0, 0, (L - 0.3) / 2, arm);
    tube.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.1, 24, 16), M.dark, 0, 0, 0, arm);
    const weight = add(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 32), M.dark, 0, 0, -0.44, arm);
    weight.rotation.x = Math.PI / 2;
    const head = new THREE.Group();
    head.position.set(0, 0, L);
    head.rotation.y = 0.32;
    arm.add(head);
    add(new THREE.BoxGeometry(0.2, 0.035, 0.38), M.dark, 0, -0.02, 0.04, head);
    add(new THREE.BoxGeometry(0.12, 0.11, 0.2), M.accent, 0, -0.1, 0.06, head);
    add(new THREE.BoxGeometry(0.03, 0.02, 0.16), M.metal, 0.12, -0.01, 0.0, head);

    // ángulo del brazo para que la aguja caiga a radio r del centro del plato
    function yawForRadius(r) {
      let lo = -1.0, hi = 0;
      for (let k = 0; k < 20; k++) {
        const m = (lo + hi) / 2;
        const dx = PIVOT.x + L * Math.sin(m) - C.x, dz = PIVOT.z + L * Math.cos(m) - C.z;
        if (Math.hypot(dx, dz) > r) hi = m; else lo = m;
      }
      return (lo + hi) / 2;
    }
    const R_OUT = 1.36, R_IN = 0.8;

    /* ---- estado animado (todo persigue un objetivo: siempre interrumpible) ---- */
    const S = { playing: false, rate: 0, angle: 0, yaw: 0, lift: 0, led: 0, tx: 0, ty: 0, ttx: 0, tty: 0 };
    let swap = null;
    const SWAP_MS = reduceMotion ? 260 : 680;

    function approach(v, target, k, dt) {
      if (reduceMotion) return target;
      return v + (target - v) * (1 - Math.exp(-k * dt));
    }
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

    function finishSwap() {
      if (!swap) return;
      scene.remove(current);
      current.traverse(function(o) { if (o.geometry) o.geometry.dispose(); });
      current.userData.mats.forEach(function(m) { m.dispose(); });
      current = incoming;
      incoming = null;
      swap = null;
      place(current, C.x, RECORD_Y, C.z, 1);
    }

    function updateSwap(now) {
      if (!swap) return;
      // el disco no se mueve hasta que la aguja está levantada
      if (!swap.t0) {
        if (S.lift > LIFT * 0.85 && S.yaw < -0.02) return;
        swap.t0 = now;
      }
      const p = Math.min(1, (now - swap.t0) / SWAP_MS), e = easeOut(p);
      // recorridos cortos: el disco se desvanece antes de tocar el borde del lienzo
      const fadeOut = Math.max(0, 1 - p * 1.8), fadeIn = Math.min(1, Math.max(0, p * 1.8 - 0.4));
      if (reduceMotion) {
        place(current, C.x, RECORD_Y, C.z, 1 - p);
        place(incoming, C.x, RECORD_Y, C.z, p);
      } else if (swap.dir > 0) {
        // siguiente: el disco se levanta hacia la izquierda y el nuevo baja desde arriba
        place(current, C.x - 1.2 * e, RECORD_Y + 0.9 * e, C.z, fadeOut);
        place(incoming, C.x, RECORD_Y + 1.1 * (1 - e), C.z, fadeIn);
      } else {
        // anterior: el disco sube y el que vuelve llega desde la izquierda
        place(current, C.x, RECORD_Y + 1.1 * e, C.z, fadeOut);
        place(incoming, C.x - 1.2 * (1 - e), RECORD_Y + 0.9 * (1 - e), C.z, fadeIn);
      }
      if (p >= 1) finishSwap();
    }

    function update(dt, now) {
      // plato: arranca rápido y frena despacio
      const rateT = (S.playing && !reduceMotion) ? 1 : 0;
      S.rate = approach(S.rate, rateT, rateT > S.rate ? 4.2 : 1.9, dt);
      if (S.rate < 0.0005 && rateT === 0) S.rate = 0;
      S.angle -= S.rate * (Math.PI * 2 / 1.8) * dt;
      current.rotation.y = S.angle;
      if (incoming) incoming.rotation.y = S.angle;

      // brazo: levantar → girar → bajar
      const down = S.playing && !swap;
      const progress = audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0;
      const yawT = down ? yawForRadius(R_OUT - (R_OUT - R_IN) * progress) : 0;
      const far = Math.abs(S.yaw - yawT) > 0.012;
      S.lift = approach(S.lift, far ? LIFT : 0, 13, dt);
      if (!far || S.lift < LIFT * 0.8) S.yaw = approach(S.yaw, yawT, far ? 4.5 : 20, dt);
      arm.rotation.y = S.yaw;
      arm.rotation.x = S.lift;

      updateSwap(now);

      S.led = approach(S.led, S.playing ? 1 : 0, 6, dt);
      ledMat.emissiveIntensity = S.led * 2.2;

      // leve paralaje de cámara con el cursor sobre el tocadiscos
      S.tx = approach(S.tx, S.ttx, 5, dt);
      S.ty = approach(S.ty, S.tty, 5, dt);
      camera.position.set(CAM.x + S.tx * 0.9, CAM.y - S.ty * 0.6, CAM.z + S.ty * 0.3);
      camera.lookAt(LOOK);

      return S.playing || !!swap || S.rate > 0 ||
        Math.abs(S.yaw - yawT) > 0.0005 || Math.abs(S.lift - (far ? LIFT : 0)) > 0.0005 ||
        Math.abs(S.led - (S.playing ? 1 : 0)) > 0.002 ||
        Math.abs(S.tx - S.ttx) > 0.001 || Math.abs(S.ty - S.tty) > 0.001;
    }

    let raf = 0, last = 0;
    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const busy = update(dt, now);
      renderer.render(scene, camera);
      if (busy) raf = requestAnimationFrame(frame);
    }
    function kick() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      stage.addEventListener('pointermove', function(e) {
        const r = stage.getBoundingClientRect();
        S.ttx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        S.tty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
      });
      stage.addEventListener('pointerleave', function() { S.ttx = 0; S.tty = 0; kick(); });
    }

    kick();

    return {
      setPlaying: function(on) { S.playing = on; kick(); },
      setTrack: function(i, dir) {
        if (!dir) {
          finishSwap();
          current.userData.labelMat.map = labelTexture(i);
          current.userData.labelMat.needsUpdate = true;
          kick();
          return;
        }
        finishSwap();
        incoming = makeRecord();
        incoming.userData.labelMat.map = labelTexture(i);
        place(incoming, C.x, RECORD_Y, C.z, 0);
        swap = { dir: dir, t0: 0 };
        kick();
      }
    };
  }
})();

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
    document.querySelectorAll('.back-btn').forEach(function(el) {
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
    var t0 = performance.now();
    document.addEventListener('mousemove', function(e) {
      px = (e.clientX / window.innerWidth - 0.5);
      py = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
    (function pLoop() {
      tx += ((px * 16) - tx) * 0.06; ty += ((py * 16) - ty) * 0.06;
      sx += ((px * 36) - sx) * 0.06; sy += ((py * 36) - sy) * 0.06;
      bx += ((px * -14) - bx) * 0.05; by += ((py * -14) - by) * 0.05;
      // respiración en reposo: el wordmark flota ±5px en un ciclo de ~7 s,
      // en sintonía con el modelo (se suma al parallax del cursor)
      var bob = Math.sin((performance.now() - t0) / 1150) * 5;
      text.style.transform = 'translate(-50%,-50%) translate(' + tx.toFixed(2) + 'px,' + (ty + bob).toFixed(2) + 'px)';
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
            + ' .theme-toggle, .contact-link, .c-card, .cta-button, .card-link,'
            + ' .minimal-card img, .sf-mail, .sf-nav a, .back-btn, [data-lightbox]';

    /* el halo mide 88px de layout; el estado de reposo es scale(0.5) (44px
       visuales). Nunca se escala por encima de 1: rasterizado siempre nítido. */
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, rs = 0.5, targetS = 0.5, shown = false;

    document.addEventListener('mousemove', function(e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; ring.classList.add('is-visible'); }
      var hot = e.target.closest && e.target.closest(HOT);
      // etiqueta contextual: el halo crece y muestra el texto de [data-cursor]
      var lab = e.target.closest && e.target.closest('[data-cursor]');
      if (lab) ring.setAttribute('data-label', lab.getAttribute('data-cursor') || '');
      ring.classList.toggle('has-label', !!lab);
      ring.classList.toggle('is-hot', !!hot && !lab);
      if (targetS !== 0.4) targetS = lab ? 1 : (hot ? 0.7 : 0.5);
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function() { ring.classList.remove('is-visible'); });
    document.documentElement.addEventListener('mouseenter', function() { if (shown) ring.classList.add('is-visible'); });

    document.addEventListener('mousedown', function(e) {
      targetS = 0.4;
      var r = document.createElement('div');
      r.className = 'click-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(function() { if (r.parentNode) r.parentNode.removeChild(r); }, 640);
    });
    document.addEventListener('mouseup', function() {
      targetS = ring.classList.contains('has-label') ? 1
              : ring.classList.contains('is-hot') ? 0.7 : 0.5;
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
        '.ab-lead',
        '.ab-body',
        '.ab-ledger > .ab-line',
        '.ab-tools',
        '.ab-cta-link',
        '.ab-cta-meta'
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
   MENÚ GLOBAL — botón píldora + overlay en persianas.
   Abrir: dos capas de columnas suben escalonadas (beige y luego
   tinta) y el contenido entra con máscara. Cerrar: lo mismo en
   orden inverso y más rápido. Solo transform/opacity.
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
      { href: 'img5.html', n: '05', t: 'Loewe 001',           c: '3D · Spot' },
      { href: 'img6.html', n: '06', t: 'The Grmps',           c: 'TFG · Art Toys' }
    ];
    var COLS = 5;
    var here = location.pathname.split('/').pop() || 'index.html';
    function cur(href) { return href === here ? ' aria-current="page"' : ''; }
    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // cada letra en su caja: el hover las hace rodar una a una
    function letters(text) {
      return Array.prototype.map.call(text, function(ch, i) {
        return '<span class="sm-ch" style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
      }).join('');
    }

    // marquesina de la banda: dos mitades idénticas para que el bucle no se note
    function marquee(w) {
      var unit = '<span class="mq-u"><span class="mq-t">' + w.t + '</span>'
        + '<span class="mq-c">' + w.c + '</span><i class="mq-dot"></i></span>';
      var half = unit + unit + unit;
      return '<span class="sm-band" aria-hidden="true"><span class="sm-band-in">'
        + '<span class="sm-marq">' + half + half + '</span></span></span>';
    }
    var ARROW = '<svg class="sm-arrow" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9L9 3M4.2 3H9v4.8"/></svg>';

    /* ---- botón ---- */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'site-menu');
    btn.innerHTML = '<span class="mb-ico" aria-hidden="true"></span>'
      + '<span class="mb-label" aria-hidden="true"><span>Menú</span><span>Cerrar</span></span>';
    // en el index la esquina derecha es del reproductor: botón a la izquierda
    var btnLeft = !!document.querySelector('.content-drag-area');
    if (btnLeft) btn.classList.add('mb-left');

    /* ---- overlay ---- */
    var menu = document.createElement('nav');
    menu.id = 'site-menu';
    // el pie del menú deja hueco al botón en su mismo lado
    if (btnLeft) menu.classList.add('sm-btn-left');
    menu.setAttribute('aria-label', 'Menú del sitio');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;

    var html = '';
    ['a', 'b'].forEach(function(layer) {
      html += '<div class="sm-sh sm-sh-' + layer + '" aria-hidden="true">';
      for (var i = 0; i < COLS; i++) html += '<i style="--c:' + i + '"></i>';
      html += '</div>';
    });

    html += '<div class="sm-inner">'
      + '<header class="sm-top sm-in">'
      +   '<span class="sm-brand">César del Valle</span>'
      +   '<span class="sm-role">Graphic designer — Madrid</span>'
      +   '<span class="sm-clock">MAD <b class="sm-time">--:--</b></span>'
      + '</header>'
      + '<div class="sm-body"><ul class="sm-primary">';
    PAGES.forEach(function(p, i) {
      html += '<li><a class="sm-link" href="' + p.href + '"' + cur(p.href) + ' aria-label="' + p.label + '">'
        + '<span class="sm-num sm-in" aria-hidden="true">' + pad(i + 1) + '</span>'
        + '<span class="sm-line" aria-hidden="true"><span class="sm-word">' + letters(p.label) + '</span></span>'
        + '</a></li>';
    });
    html += '</ul><div class="sm-work">'
      + '<div class="sm-work-head sm-in" aria-hidden="true"><span>Nº</span>'
      +   '<span>Selected work <em>(' + pad(WORK.length) + ')</em></span><span>Disciplina</span></div>'
      + '<ol class="sm-work-list">';
    WORK.forEach(function(w) {
      html += '<li class="sm-in"><a class="sm-proj" href="' + w.href + '"' + cur(w.href) + '>'
        + '<span class="sm-n">' + w.n + '</span>'
        + '<span class="sm-t">' + w.t + '</span>'
        + '<span class="sm-cat">' + w.c + '</span>'
        + ARROW + marquee(w)
        + '</a></li>';
    });
    html += '</ol></div>'
      + '</div>'
      + '<footer class="sm-foot sm-in">'
      +   '<span class="sm-status"><i aria-hidden="true"></i>Disponible para nuevos proyectos</span>'
      +   '<a class="sm-mail" href="mailto:cesardelvallefuentes@gmail.com">cesardelvallefuentes@gmail.com</a>'
      +   '<div class="sm-social">'
      +     '<a href="https://linkedin.com/in/cesar-del-valle-fuentes-518834275" target="_blank" rel="noopener">LinkedIn</a>'
      +     '<a href="https://www.instagram.com/cesardelvalle.jpg/" target="_blank" rel="noopener">Instagram</a>'
      +   '</div>'
      + '</footer>'
      + '</div>';
    menu.innerHTML = html;

    document.body.appendChild(menu);
    document.body.appendChild(btn);

    /* ---- coreografía de entrada: cuándo aparece cada pieza (ms) ---- */
    function delay(el, ms) { el.style.setProperty('--o', ms + 'ms'); }
    delay(menu.querySelector('.sm-top'), 380);
    Array.prototype.forEach.call(menu.querySelectorAll('.sm-link'), function(a, i) {
      delay(a.querySelector('.sm-word'), 400 + i * 70);
      delay(a.querySelector('.sm-num'), 520 + i * 70);
    });
    delay(menu.querySelector('.sm-work-head'), 460);
    Array.prototype.forEach.call(menu.querySelectorAll('.sm-work-list .sm-in'), function(li, i) {
      delay(li, 480 + i * 45);
    });
    delay(menu.querySelector('.sm-foot'), 660);

    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // botón magnético (mismo factor que .back-btn; se inyecta tarde y no
    // llega al binding del bloque de micro-interacciones)
    if (fine) {
      btn.addEventListener('mousemove', function(e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (mx * 0.2).toFixed(1) + 'px,' + (my * 0.25).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
    }

    /* ---- proyectos: la banda beige entra por el borde por el que llega el
       cursor y sale por el que se va. Al recorrer la lista parece pasar de
       fila en fila. Banda e interior se mueven en sentidos opuestos, así
       el texto se descubre en vez de desplazarse. ---- */
    var rows = menu.querySelectorAll('.sm-proj');
    function sideOf(e, a) {
      var r = a.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2 ? -1 : 1;
    }
    function hidden(band, inner, d) {
      band.style.transform = 'translateY(' + (101 * d) + '%)';
      inner.style.transform = 'translateY(' + (-101 * d) + '%)';
    }
    function setBand(a, d, on) {
      var band = a.querySelector('.sm-band'), inner = band.firstChild;
      if (on === a.classList.contains('is-on')) return;
      // si aún se está yendo, se reengancha desde donde está (sin saltos)
      if (on && performance.now() - (a._leftAt || 0) > 520) {
        band.style.transition = inner.style.transition = 'none';
        hidden(band, inner, d);
        void band.offsetWidth;
        band.style.transition = inner.style.transition = '';
      }
      a.classList.toggle('is-on', on);
      if (on) band.style.transform = inner.style.transform = 'translateY(0%)';
      else { a._leftAt = performance.now(); hidden(band, inner, d); }
    }
    Array.prototype.forEach.call(rows, function(a) {
      if (fine) {
        a.addEventListener('mouseenter', function(e) { setBand(a, sideOf(e, a), true); });
        a.addEventListener('mouseleave', function(e) { setBand(a, sideOf(e, a), false); });
      }
      a.addEventListener('focus', function() { if (a.matches(':focus-visible')) setBand(a, 1, true); });
      a.addEventListener('blur', function() { setBand(a, 1, false); });
    });
    function resetBands() {
      Array.prototype.forEach.call(rows, function(a) {
        if (!a.classList.contains('is-on')) return;
        var band = a.querySelector('.sm-band'), inner = band.firstChild;
        band.style.transition = inner.style.transition = 'none';
        a.classList.remove('is-on');
        hidden(band, inner, 1);
        void band.offsetWidth;
        band.style.transition = inner.style.transition = '';
      });
    }

    /* ---- hora local ---- */
    var timeEl = menu.querySelector('.sm-time');
    var clockTimer = null;
    var fmt = null;
    try { fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }); } catch (e) {}
    function tickClock() {
      var d = new Date();
      timeEl.textContent = fmt ? fmt.format(d) : pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    /* ---- abrir / cerrar ---- */
    // overflow:hidden en <html> no basta en iOS: con el dedo la página de
    // detrás se sigue moviendo. Se fija el body donde estaba y, al cerrar,
    // se devuelve el scroll a su sitio sin animación.
    var lockedY = 0;
    function lockPage(lock) {
      var bs = document.body.style;
      if (lock) {
        lockedY = window.scrollY;
        bs.position = 'fixed';
        bs.top = -lockedY + 'px';
        bs.left = '0';
        bs.right = '0';
        bs.width = '100%';
      } else {
        bs.position = bs.top = bs.left = bs.right = bs.width = '';
        window.scrollTo({ top: lockedY, left: 0, behavior: 'instant' });
      }
    }
    function isOpen() { return document.body.classList.contains('menu-open'); }
    function setOpen(open) {
      if (open === isOpen()) return;
      document.body.classList.toggle('menu-open', open);
      // candado de scroll en <html>, que es el contenedor que scrollea
      document.documentElement.classList.toggle('menu-open', open);
      lockPage(open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      clearInterval(clockTimer);
      if (!open) setTimeout(resetBands, 300);
      if (open) {
        tickClock();
        clockTimer = setInterval(tickClock, 15000);
        var first = menu.querySelector('.sm-link');
        if (first) first.focus({ preventScroll: true });
      }
    }

    btn.addEventListener('click', function() { setOpen(!isOpen()); });

    document.addEventListener('keydown', function(e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
      if (e.key !== 'Tab') return;
      // el foco no sale del menú mientras está abierto
      var f = [btn].concat(Array.prototype.slice.call(menu.querySelectorAll('a')));
      var i = f.indexOf(document.activeElement);
      if (i === -1) { e.preventDefault(); f[0].focus(); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });

    // clic en la página actual: solo cierra el menú (sin recargar)
    menu.addEventListener('click', function(e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && a.getAttribute('aria-current') === 'page') {
        e.preventDefault();
        setOpen(false);
        btn.focus();
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

    // en el about el héroe desaparece del todo antes de llegar a la barra
    // superior (si no, el blíster se ve a medias detrás de ATRÁS/CONTACT ME)
    var fade = hero.classList.contains('abx-hero') ? 1.06 : 0.55;
    var h = 1, cur = 0, raf = 0;
    function measure() { h = Math.max(1, hero.offsetHeight); }
    // el bucle solo corre mientras el héroe se está moviendo
    function frame() {
      raf = 0;
      var sc = Math.min(Math.max(window.scrollY, 0), h);
      var target = sc * 0.24;
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.1) cur = target;
      var p = Math.min(1, sc / h);
      inner.style.transform = 'translateY(' + cur.toFixed(2) + 'px)';
      inner.style.opacity = Math.max(0, 1 - p * fade).toFixed(3);
      if (cur !== target) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    measure();
    window.addEventListener('resize', function() { measure(); kick(); });
    window.addEventListener('scroll', kick, { passive: true });
    kick();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   ABOUT — el muñeco en su blíster + el documento (perfil,
   trayectoria, herramientas, especialidades, contacto) con un
   índice fijo que sigue la lectura. Solo transform/opacity; en
   táctil y con reduced-motion todo sigue funcionando.
   ============================================================ */
(function() {
  function init() {
    var page = document.querySelector('.ab3');
    if (!page) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasIO = 'IntersectionObserver' in window;
    var each = function(list, fn) { Array.prototype.forEach.call(list, fn); };

    // añade una clase la primera vez que el elemento entra en vista
    function once(el, cls, threshold) {
      if (!el) return;
      if (!hasIO) { el.classList.add(cls); return; }
      var io = new IntersectionObserver(function(es) {
        es.forEach(function(en) { if (en.isIntersecting) { el.classList.add(cls); io.disconnect(); } });
      }, { threshold: threshold || 0.2 });
      io.observe(el);
    }

    /* ---- la caja 3D vive en about-box.js (módulo). Si no llega a cargar
       (sin red, sin WebGL), se dice en vez de quedarse "cargando". ---- */
    (function boxFallback() {
      var stage = page.querySelector('.ab-stage');
      if (!stage) return;
      setTimeout(function() { if (!stage.classList.contains('is-loaded')) stage.classList.add('is-failed'); }, 15000);
    })();

    /* ---- índice + barra superior: marca la sección que se está leyendo y,
       pasado el muñeco, da fondo a la barra fija. Una sola comprobación
       por frame, en scroll y al cambiar el tamaño. ---- */
    (function index() {
      var nav = page.querySelector('.ab-index');
      var links = nav ? nav.querySelectorAll('a') : [];
      var bar = nav ? nav.querySelector('.ab-index-bar') : null;
      var parts = page.querySelectorAll('.ab-part[id]');
      var hero = page.querySelector('.ab-hero');
      var current = '', raf = 0;
      function activate(id) {
        if (id === current) return;
        current = id;
        each(links, function(a) {
          if (a.getAttribute('href') === '#' + id) {
            a.setAttribute('aria-current', 'location');
            if (bar) bar.style.transform = 'translateY(' + (a.offsetTop + a.offsetHeight / 2 - 8) + 'px)';
          } else {
            a.removeAttribute('aria-current');
          }
        });
      }
      function spy() {
        raf = 0;
        if (hero) document.body.classList.toggle('ab-past-hero', hero.getBoundingClientRect().bottom < 80);
        if (!parts.length) return;
        var id = parts[0].id;
        var doc = document.documentElement;
        if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
          id = parts[parts.length - 1].id;
        } else {
          each(parts, function(s) { if (s.getBoundingClientRect().top <= window.innerHeight * 0.42) id = s.id; });
        }
        activate(id);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(spy); }
      each(links, function(a) {
        a.addEventListener('click', function(e) {
          var t = document.getElementById(a.getAttribute('href').slice(1));
          if (!t) return;
          e.preventDefault();
          t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', a.getAttribute('href'));
        });
      });
      window.addEventListener('scroll', kick, { passive: true });
      window.addEventListener('resize', function() { current = ''; kick(); });
      spy();
    })();

    /* ---- herramientas: los medidores se llenan al entrar en vista ---- */
    each(page.querySelectorAll('.ab-tool-group'), function(g) { once(g, 'is-in', 0.35); });

    /* ---- copiar el correo (y decirlo también a los lectores de pantalla) ---- */
    (function copy() {
      var btn = page.querySelector('.ab-copy');
      var mail = page.querySelector('.ab-mail');
      var sr = page.querySelector('.ab-cta .ab-sr');
      if (!btn || !mail) return;
      btn.addEventListener('click', function() {
        var text = mail.textContent.trim();
        function done(cls, msg) {
          btn.classList.remove('is-copied', 'is-select');
          btn.classList.add(cls);
          if (sr) sr.textContent = msg;
          clearTimeout(btn._t);
          btn._t = setTimeout(function() {
            btn.classList.remove('is-copied', 'is-select');
            if (sr) sr.textContent = '';
          }, 1600);
        }
        function select() {
          var r = document.createRange();
          r.selectNodeContents(mail);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
          done('is-select', 'Correo seleccionado, pulsa Ctrl+C para copiarlo');
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(function() { done('is-copied', 'Correo copiado'); }, select);
        } else {
          select();
        }
      });
    })();
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
    Array.prototype.forEach.call(document.querySelectorAll('.gx-title, .ab-h'), function(t) {
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

/* ============================================================
   HERO KINÉTICO (home) — PORTFOLIO y su subtítulo, letra a letra.
   1) Trocea los dos textos en letras en todos los dispositivos (la
      entrada de playHeroTitleAnimation las necesita).
   2) Escritorio con puntero fino y sin reduced-motion: cada letra es un
      muelle. Cerca del cursor se estira desde su base, sube y se inclina
      hacia él; si el ratón pasa deprisa se deja arrastrar un poco y
      vuelve con un rebote corto. Transform puro, interrumpible: el muelle
      siempre reapunta desde donde está.
   ============================================================ */
(function() {
  function mq(q) { return window.matchMedia && window.matchMedia(q).matches; }
  var title, groups = [];

  // trocea el texto en letras (los espacios quedan como texto normal)
  function split(el) {
    if (!el) return [];
    if (!el.dataset.kinetic) {
      el.dataset.kinetic = '1';
      var text = el.textContent;
      el.textContent = '';
      for (var i = 0; i < text.length; i++) {
        if (text[i] === ' ') { el.appendChild(document.createTextNode(' ')); continue; }
        var s = document.createElement('span');
        s.className = 'ht-l';
        s.textContent = text[i];
        el.appendChild(s);
      }
    }
    return Array.prototype.slice.call(el.querySelectorAll('.ht-l'));
  }
  window.heroSplit = function() {
    split(document.querySelector('.hero-title'));
    split(document.querySelector('.hero-subtitle'));
  };

  function init() {
    title = document.querySelector('.hero-title');
    if (!title) return;
    var sub = document.querySelector('.hero-subtitle');
    // cada grupo: cuánto sube, se estira y se inclina, y su radio (en em
    // del propio texto, para que escale con el tamaño del título)
    groups = [
      { el: title, letters: split(title), lift: 0.06, stretch: 0.13, lean: 7, drag: 9, r: 0.62, reach: 0.95 },
      { el: sub, letters: split(sub), lift: 0.35, stretch: 0.3, lean: 12, drag: 14, r: 6, reach: 3.2 }
    ].filter(function(g) { return g.el && g.letters.length; });

    if (mq('(prefers-reduced-motion: reduce)') || mq('(hover: none)') || mq('(pointer: coarse)') || window.innerWidth <= 900) return;

    groups.forEach(function(g) {
      g.letters = g.letters.map(function(el) { return { el: el, y: 0, s: 0, k: 0, vy: 0, vs: 0, vk: 0, on: false }; });
    });

    // centros de cada letra respecto a su texto (offsetLeft no ve los
    // transforms de la letra, así que no hace falta medir en reposo)
    function remeasure() {
      groups.forEach(function(g) {
        var fs = parseFloat(getComputedStyle(g.el).fontSize) || 16;
        g.px = { lift: g.lift * fs, r: g.r * fs, reach: g.reach * fs };
        g.letters.forEach(function(l) {
          l.ox = l.el.offsetLeft + l.el.offsetWidth / 2;
          l.oy = l.el.offsetTop + l.el.offsetHeight / 2;
        });
      });
    }
    window.heroRemeasure = remeasure;
    remeasure();
    window.addEventListener('resize', remeasure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

    var mx = -1e4, my = -1e4, pmx = null, vx = 0;
    document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function() { mx = -1e4; my = -1e4; });

    var K = 0.1, D = 0.76;                      // rigidez y amortiguación: rebote corto, sin temblar
    function spring(l, key, vkey, target) {
      l[vkey] = (l[vkey] + (target - l[key]) * K) * D;
      l[key] += l[vkey];
    }
    var clamp1 = function(v) { return v < -1 ? -1 : v > 1 ? 1 : v; };

    (function loop() {
      // velocidad horizontal del cursor, suavizada
      var live = mx > -1e3;
      vx += ((live && pmx !== null ? mx - pmx : 0) - vx) * 0.22;
      pmx = live ? mx : null;

      if (!title.dataset.entering) {
        for (var gi = 0; gi < groups.length; gi++) {
          var g = groups[gi], box = g.el.getBoundingClientRect();
          for (var i = 0; i < g.letters.length; i++) {
            var l = g.letters[i];
            var dx = mx - (box.left + l.ox), dy = my - (box.top + l.oy);
            var f = Math.exp(-(dx * dx) / (2 * g.px.r * g.px.r)) * Math.max(0, 1 - Math.abs(dy) / g.px.reach);
            // la cabeza de la letra se va hacia el cursor; si pasa deprisa, con él
            var lean = -(clamp1(dx / g.px.r) * g.lean + clamp1(vx / 30) * g.drag) * f;
            spring(l, 'y', 'vy', -g.px.lift * f);
            spring(l, 's', 'vs', g.stretch * f);
            spring(l, 'k', 'vk', lean);
            var still = f < 0.001 && Math.abs(l.y) < 0.05 && Math.abs(l.s) < 0.0008 && Math.abs(l.k) < 0.04 &&
                        Math.abs(l.vy) < 0.05 && Math.abs(l.vs) < 0.0008 && Math.abs(l.vk) < 0.04;
            if (still) {
              if (l.on) { l.el.style.transform = ''; l.on = false; }
              l.y = l.s = l.k = l.vy = l.vs = l.vk = 0;
            } else {
              l.on = true;
              l.el.style.transform = 'translateY(' + l.y.toFixed(2) + 'px) scaleY(' + (1 + l.s).toFixed(4) + ') skewX(' + l.k.toFixed(2) + 'deg)';
            }
          }
        }
      }
      requestAnimationFrame(loop);
    })();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   THE GRMPS (img6) — figura 3D interactiva y film del drop.
   El visor es un <model-viewer> (mismo motor que el busto de la
   home): arrastre nativo con inercia. Aquí solo se gobierna el
   auto-rotate (fuera con reduced-motion, y en pausa mientras el
   usuario lo agarra para no pelearse con su gesto).
   ============================================================ */
(function() {
  function init() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* --- figura 3D --- */
    var model = document.getElementById('gr-model');
    if (model) {
      if (reduce) model.removeAttribute('auto-rotate');

      /* huevo de pascua: tres vueltas seguidas del usuario y el GRMP se marea */
      var dizzy = document.querySelector('.gr-dizzy');
      var spun = 0, lastTheta = null, dizzyTimer = null;
      model.addEventListener('camera-change', function(e) {
        if (!e.detail || e.detail.source !== 'user-interaction') { lastTheta = null; return; }
        if (!model.getCameraOrbit) return;
        var th = model.getCameraOrbit().theta; // radianes
        if (lastTheta !== null) {
          var d = Math.abs(th - lastTheta);
          if (d > Math.PI) d = 2 * Math.PI - d; // salto de -π a π
          spun += d;
          if (spun > Math.PI * 6 && dizzy && !dizzy.classList.contains('on')) {
            dizzy.classList.add('on');
            clearTimeout(dizzyTimer);
            dizzyTimer = setTimeout(function() {
              dizzy.classList.remove('on');
              spun = 0;
            }, 3800);
          }
        }
        lastTheta = th;
      });
    }

    /* --- comparador trazo ↔ vinilo --- */
    var mix = document.getElementById('gr-mix');
    if (mix) {
      var mixTop = mix.querySelector('.gr-mix-top');
      var mixBar = mix.querySelector('.gr-mix-bar');
      /* arranca casi todo trazo; la presentación barre hasta la mitad.
         Sin observer o con reduced-motion, directo al 50/50. */
      var mp = (reduce || !('IntersectionObserver' in window)) ? 50 : 94;
      var mixDown = false;

      function mixPaint() {
        mixTop.style.clipPath = 'inset(0 ' + (100 - mp) + '% 0 0)';
        mixBar.style.transform = 'translateX(' + (mp / 100) * mix.clientWidth + 'px)';
        mix.setAttribute('aria-valuenow', String(Math.round(mp)));
      }
      function mixFrom(e) {
        var r = mix.getBoundingClientRect();
        mp = Math.min(94, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
        mixPaint();
      }
      mix.addEventListener('pointerdown', function(e) {
        mixDown = true;
        if (mix.setPointerCapture) { try { mix.setPointerCapture(e.pointerId); } catch (err) {} }
        mixFrom(e);
      });
      mix.addEventListener('pointermove', function(e) { if (mixDown) mixFrom(e); });
      mix.addEventListener('pointerup', function() { mixDown = false; });
      mix.addEventListener('pointercancel', function() { mixDown = false; });
      mix.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          mp = Math.min(94, Math.max(6, mp + (e.key === 'ArrowRight' ? 4 : -4)));
          mixPaint();
        }
      });
      window.addEventListener('resize', mixPaint, { passive: true });

      /* presentación al entrar: el vinilo barre desde la derecha (una vez) */
      if (!reduce && 'IntersectionObserver' in window) {
        var mixSwept = false;
        var mio = new IntersectionObserver(function(entries) {
          entries.forEach(function(en) {
            if (!en.isIntersecting || mixSwept) return;
            mixSwept = true;
            mio.disconnect();
            var t0 = null, from = mp, dur = 950;
            function sweep(ts) {
              if (mixDown) return; // el usuario ya lo controla
              if (t0 === null) t0 = ts;
              var k = Math.min(1, (ts - t0) / dur);
              k = 1 - Math.pow(1 - k, 3); // ease-out fuerte, como la curva de la casa
              mp = from + (50 - from) * k;
              mixPaint();
              if (k < 1) requestAnimationFrame(sweep);
            }
            requestAnimationFrame(sweep);
          });
        }, { threshold: 0.5 });
        mio.observe(mix);
      }
      mixPaint();
    }

    /* guiño en la pestaña: si te vas, el GRMP se queda esperando */
    if (document.body && document.body.classList.contains('grmps-page')) {
      var grTitle = document.title;
      document.addEventListener('visibilitychange', function() {
        document.title = document.visibilityState === 'hidden' ? '👴 El GRMP te espera…' : grTitle;
      });
    }

    /* --- film del drop: reproduce a la vista, en pausa fuera --- */
    var vid = document.getElementById('gr-film-video');
    if (vid) {
      if (!reduce && 'IntersectionObserver' in window) {
        var vio = new IntersectionObserver(function(entries) {
          entries.forEach(function(en) {
            if (en.isIntersecting) { var p = vid.play(); if (p && p.catch) p.catch(function() {}); }
            else vid.pause();
          });
        }, { threshold: 0.35 });
        vio.observe(vid);
      }
      /* clic sobre el vídeo: alterna reproducción (gesto explícito, vale
         también como único disparador cuando hay reduced-motion) */
      vid.addEventListener('click', function() {
        if (vid.paused) { var p = vid.play(); if (p && p.catch) p.catch(function() {}); }
        else vid.pause();
      });
      var sBtn = document.getElementById('gr-film-sound');
      if (sBtn) {
        function syncSound() {
          var on = !vid.muted;
          sBtn.classList.toggle('is-on', on);
          sBtn.setAttribute('aria-pressed', String(on));
          sBtn.setAttribute('aria-label', on ? 'Silenciar el film' : 'Activar sonido del film');
        }
        vid.addEventListener('volumechange', syncSound);
        sBtn.addEventListener('click', function() {
          vid.muted = !vid.muted;
          if (!vid.muted) { var p = vid.play(); if (p && p.catch) p.catch(function() {}); }
          syncSound();
        });
        syncSound();
      }
    }
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
/* ============================================================
   WHATSIT — el puntito de la home. Cada clic lo agranda y le pone
   otra frase en círculo (SVG textPath, gira con CSS). La última se
   queda; a partir de ahí el punto solo dice que no con la cabeza.
   Aparece cuando termina la entrada del título (initWhatsitIn).
   ============================================================ */
(function() {
  var PHRASES = [
    'What is that?',
    'Stop clicking it!',
    'Stop! Really, please stop!',
    'I warned you!',
    'Last chance!',
    'Happy now?'
  ];
  var NS = 'http://www.w3.org/2000/svg';

  function init() {
    var ws = document.querySelector('.whatsit');
    var title = document.querySelector('.hero-title');
    if (!ws || !title) return;
    var btn = ws.querySelector('.ws-btn');
    var spin = ws.querySelector('.ws-spin');
    var dot = ws.querySelector('.ws-dot');
    var egg = ws.querySelector('.ws-egg');
    var sr = ws.querySelector('.ws-sr');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // un anillo SVG por frase: texto sobre un círculo alrededor del punto
    var rings = PHRASES.map(function(text, i) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'ws-phrase');
      svg.setAttribute('viewBox', '0 0 88 88');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('id', 'ws-c' + i);
      path.setAttribute('d', 'M44,44 m-28,0 a28,28 0 1,1 56,0 a28,28 0 1,1 -56,0');
      path.setAttribute('fill', 'none');
      var t = document.createElementNS(NS, 'text');
      var tp = document.createElementNS(NS, 'textPath');
      tp.setAttribute('href', '#ws-c' + i);
      tp.textContent = text;
      t.appendChild(tp);
      svg.appendChild(path);
      svg.appendChild(t);
      spin.appendChild(svg);
      return svg;
    });

    // abajo a la izquierda, bajo el subtítulo: la nota arranca en el margen
    // y su flecha baja hasta el punto. --fs escala nota y flecha (el tamaño
    // del título antiguo, con el que se ajustaron). En móvil no se muestra (CSS).
    var sub = document.querySelector('.hero-subtitle');
    function place() {
      var fs = Math.min(window.innerWidth * 0.063, 110);
      ws.style.setProperty('--fs', fs + 'px');
      var below = sub ? sub.offsetTop + sub.offsetHeight : title.offsetTop + title.offsetHeight;
      ws.style.left = ((sub ? sub.offsetLeft : title.offsetLeft) + fs * 1.7) + 'px';
      ws.style.top = (below + fs * 0.5 + fs * 1.19) + 'px';
    }
    place();
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

    var step = 0;
    btn.addEventListener('click', function() {
      if (step >= PHRASES.length) {
        // ya está todo dicho: el punto (o lo que queda de él) niega con la cabeza
        var target = ws.classList.contains('is-broken') ? egg : dot;
        if (!reduce && target.animate) {
          target.animate([
            { translate: '0 0' }, { translate: '-5px 0' }, { translate: '4px 0' },
            { translate: '-3px 0' }, { translate: '0 0' }
          ], { duration: 360, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
        }
        return;
      }
      if (step > 0) rings[step - 1].classList.remove('is-on');
      rings[step].classList.add('is-on');
      ws.classList.add('is-open');
      sr.textContent = PHRASES[step];
      step++;
      // la última frase ("Happy now?"): el punto se tensa, se agrieta y se rompe como un huevo
      if (step === PHRASES.length) {
        if (!reduce && dot.animate) {
          dot.animate([{ scale: '1' }, { scale: '1.14' }, { scale: '0.92' }, { scale: '1' }], { duration: 260, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
        }
        setTimeout(function() { ws.classList.add('is-cracked'); }, reduce ? 0 : 230);
        setTimeout(function() { ws.classList.add('is-broken'); }, reduce ? 0 : 560);
      }
      btn.setAttribute('aria-label', step < PHRASES.length ? PHRASES[step - 1] + ' Pulsa otra vez' : PHRASES[step - 1]);
    });

    window.initWhatsitIn = function() { place(); ws.classList.add('is-in'); };
    // sin GSAP o sin entrada del título (otras rutas): aparece igualmente
    setTimeout(window.initWhatsitIn, 6000);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

/* ============================================================
   404 — la cara busca la página perdida. Los ojos siguen al cursor;
   si no se mueve (o en táctil), miran a un lado y a otro, como
   buscando. Parpadea cada pocos segundos y, al tocarla, saluda.
   Solo mueve el grupo de los ojos (unidades del logo).
   ============================================================ */
(function() {
  function init() {
    var face = document.querySelector('.nf-face');
    var look = face && face.querySelector('.nf-look');
    if (!look) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function blink() { face.classList.remove('is-blink'); void face.offsetWidth; face.classList.add('is-blink'); }
    (function nextBlink() {
      setTimeout(function() { if (!document.hidden) blink(); nextBlink(); }, 2600 + Math.random() * 3200);
    })();
    face.addEventListener('click', function() {
      face.classList.remove('is-hi'); void face.offsetWidth; face.classList.add('is-hi'); blink();
    });
    face.addEventListener('animationend', function(e) { if (e.target === face.firstElementChild) face.classList.remove('is-hi'); });
    if (reduce) return;

    // hasta dónde se mueven los ojos: a la derecha y hacia arriba menos, que
    // ahí la cara se acaba antes y está el flequillo
    var MX_L = 22, MX_R = 13, MY_UP = 10, MY_DN = 16;
    var tx = 0, ty = 0, x = 0, y = 0, lastMove = -1e9, hop = 0, spot = 0;
    var SPOTS = [[-1, 0.2], [0.9, -0.1], [-0.4, -0.9], [1, 0.7], [-0.9, 0.8], [0.1, -0.6]];
    document.addEventListener('pointermove', function(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = face.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width * 0.66), dy = e.clientY - (r.top + r.height * 0.58);
      var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 280);
      tx = dx / d * k * (dx < 0 ? MX_L : MX_R);
      ty = dy / d * k * (dy < 0 ? MY_UP : MY_DN);
      lastMove = performance.now();
    }, { passive: true });

    (function loop(now) {
      // quieto un rato: busca (salta de un sitio a otro y se queda mirando)
      if (now - lastMove > 2400 && now - hop > 950) {
        hop = now;
        spot = (spot + 1) % SPOTS.length;
        tx = SPOTS[spot][0] * (SPOTS[spot][0] < 0 ? MX_L : MX_R);
        ty = SPOTS[spot][1] * (SPOTS[spot][1] < 0 ? MY_UP : MY_DN);
      }
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      look.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
      requestAnimationFrame(loop);
    })(performance.now());
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
