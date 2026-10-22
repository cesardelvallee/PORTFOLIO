/* ============================================================
   TRANSICIONES ENTRE PÁGINAS (transition.js, css/style.css
   «TRANSICIONES ENTRE PÁGINAS»).
   Va en el <head> de todas las páginas: tiene que estar escuchando
   antes de que la página nueva se pinte por primera vez.

   · Con View Transitions entre documentos (Chrome / Edge 126+,
     Safari 18.2+) el navegador fotografía la página que se va y anima
     hacia la que llega, sin pantalla en blanco ni cortina:
       – Hacia dentro (home → página → proyecto): la página nueva sube
         como una hoja por encima y la anterior se queda atrás, en
         sombra.
       – Hacia fuera (volver a la home, botón atrás del navegador): al
         revés, la hoja baja y deja ver la de debajo.
       – Lo que se repite no se mueve: la cabecera, el menú, el botón de
         volver y el cursor se quedan donde están.
       – Lo que es lo mismo viaja: el título de «Siguiente proyecto» sube
         a ser el título del proyecto, y la card que se abre en la home
         crece hasta ser la portada (ahí el resto de la página se funde
         en su sitio, sin hoja).
       – Al pulsar, la página ya empieza a irse (se apaga y sube un poco)
         mientras llega la nueva.
     La página que se va le cuenta a la que llega de dónde viene, qué se
     pulsó y dónde estaba el cursor (sessionStorage): Safari no tiene la
     Navigation API.
   · Sin ellas (Firefox): la cortina (#page-fx), más rápida y con el
     nombre del destino también al llegar.
   · En Chrome, al pasar por encima de un enlace interno la página se
     pide antes (speculation rules): llega antes y la transición arranca
     casi al pulsar.
   ============================================================ */
(function() {
  var html = document.documentElement;
  var VT = 'PageRevealEvent' in window && 'PageSwapEvent' in window
    && !!(window.CSS && CSS.supports && CSS.supports('view-transition-class', 'a'));
  if (VT) html.classList.add('pt-vt');
  var KEY = 'pt-nav';

  // el nombre de cada página en la cortina (respaldo sin View Transitions)
  var LABELS = {
    index: 'CÉSAR DEL VALLE', about: 'SOBRE MÍ', contact: 'CONTACTO',
    dossier: 'DOSSIER', cv: 'CURRÍCULUM', '404': 'CÉSAR DEL VALLE',
    'coffee-rituals': 'COFFEE RITUALS', 'ottolinger-mykita': 'OTTOLINGER × MYKITA', catalalata: 'CATALALATA',
    'el-rastrillo': 'EL RASTRILLO', 'loewe-001': 'LOEWE 001', 'the-grmps': 'THE GRMPS'
  };
  // «catalalata.html», «/catalalata» (Cloudflare quita el .html) y «/» → catalalata, index
  function page(u) {
    var f = '';
    try { f = new URL(u, location.href).pathname.split('/').pop(); } catch (e) {}
    return f.replace(/\.html$/, '') || 'index';
  }
  // hacia fuera es volver a la home (o el botón atrás); todo lo demás, hacia dentro
  function isOut(to, from) { return to === 'index' && !!from && from !== 'index'; }
  function label(u) { return JSON.stringify(LABELS[page(u)] || LABELS.index); }
  html.style.setProperty('--pt-label', label(location.href));

  // al llegar con transición desde otra página de la web, la nueva no se
  // pinta hasta tener leído todo su HTML (y ejecutado script.js, que ya
  // está en caché): la foto de llegada sale con el menú, el tema y el
  // cursor puestos. #pt-fin no existe: espera al final del HTML.
  if (VT) {
    try {
      if (sessionStorage.getItem(KEY)) {
        var hold = document.createElement('link');
        hold.rel = 'expect';
        hold.href = '#pt-fin';
        hold.setAttribute('blocking', 'render');
        document.head.appendChild(hold);
      }
    } catch (e) {}
  }

  var PT = { to: null, src: null };

  function name(el, n) { el.style.viewTransitionName = n; el.setAttribute('data-pt', ''); }
  function clean() {
    html.classList.remove('pt-out', 'pt-in', 'pt-fwd', 'pt-back', 'pt-zoom', 'pt-out-next', 'pt-going');
    Array.prototype.forEach.call(document.querySelectorAll('[data-pt]'), function(el) {
      el.style.viewTransitionName = '';
      el.removeAttribute('data-pt');
    });
  }
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }

  /* ---- la página que se va: qué viaja y desde dónde ---- */
  function mark(dest) {
    if (document.body.classList.contains('menu-open')) return '';
    // el título de «Siguiente proyecto», si se ve
    var next = document.querySelector('.pj-next-link');
    if (next && page(next.href) === dest) {
      var t = next.querySelector('.pj-next-t > span');
      if (t && inView(t)) {
        html.classList.add('pt-out-next');          // sin la flecha (css)
        name(t, 'pt-title');
        return 'next';
      }
    }
    // la card de la home que se ha abierto
    if (PT.src && document.contains(PT.src) && inView(PT.src)) {
      name(PT.src, 'pt-cover');
      return 'card';
    }
    return '';
  }

  window.addEventListener('pageswap', function(e) {
    if (!e.viewTransition) return;
    var to = PT.to;
    var act = e.activation;
    if (act && act.entry && act.entry.url) to = act.entry.url;
    var info = { from: page(location.href), kind: '', t: Date.now() };
    var back = act && act.navigationType === 'traverse' && act.from && act.entry.index < act.from.index;
    if (to && !back && !isOut(page(to), info.from)) info.kind = mark(page(to));
    html.classList.add('pt-out');                    // nombres de cabecera, menú y cursor (css)
    var cur = document.getElementById('egg-cursor');
    if (cur && cur.style.left) { info.x = cur.style.left; info.y = cur.style.top; }
    try { sessionStorage.setItem(KEY, JSON.stringify(info)); } catch (err) {}
    PT.to = PT.src = null;
  });

  /* ---- la página que llega: hacia dónde va la hoja y qué recibe ---- */
  window.PageFX = window.PageFX || {};
  window.addEventListener('pagereveal', function(e) {
    clean();                                         // si vuelve la misma (bfcache), fuera las marcas de su salida
    var info = null;
    try { info = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (err) {}
    var vt = e.viewTransition;
    if (!vt) return;
    if (info && Date.now() - info.t > 8000) info = null;
    var here = page(location.href);
    var from = info ? info.from : (document.referrer ? page(document.referrer) : '');
    var back = false;
    var act = window.navigation && navigation.activation;
    if (act && act.navigationType === 'traverse' && act.from) back = act.entry.index < act.from.index;
    else back = isOut(here, from);
    // la card que se abre en portada: la página se funde en su sitio
    // alrededor de ella (con hoja, la portada volaría por encima del título)
    var c = info && info.kind === 'card' && !back && document.querySelector('.pj-cover-in');
    if (c) { name(c, 'pt-cover'); html.classList.add('pt-m-cover'); }
    html.classList.add('pt-in', 'pt-arrived', c ? 'pt-zoom' : back ? 'pt-back' : 'pt-fwd');   // pt-arrived se queda (ritmo de entrada, css)
    if (info && info.kind === 'next' && !back) {
      var t = document.querySelector('.pj-title .pj-line > span');
      if (t) { name(t, 'pt-title'); html.classList.add('pt-m-title'); }
    }
    // el botón del menú va a la izquierda en la home y a la derecha en el
    // resto: si cambia de lado se funde ahí mismo, no cruza la pantalla
    var mb = document.querySelector('.menu-btn');
    if (mb && from && (from === 'index') !== (here === 'index')) name(mb, 'none');
    // el cursor, donde estaba (y el halo arranca ahí, script.js)
    if (info && info.x) {
      html.style.setProperty('--pt-cx', info.x);
      html.style.setProperty('--pt-cy', info.y);
      window.PageFX.cursor = { x: parseFloat(info.x), y: parseFloat(info.y) };
    }
    vt.finished.then(clean, clean);
  });
  // la página que se fue y vuelve por bfcache sin transición
  window.addEventListener('pageshow', function(e) { if (e.persisted) clean(); });

  /* ---- respaldo: la cortina ---- */
  function fx() { return document.getElementById('page-fx'); }
  function curtain(url) {
    var el = fx();
    if (!el) { location.href = url; return; }
    html.style.setProperty('--pt-label', label(url));  // cae con el nombre del destino
    var done = false;
    var go = function() { if (done) return; done = true; location.href = url; };
    el.classList.add('fx-anim');
    void el.offsetWidth;
    el.classList.remove('fx-reveal');
    el.addEventListener('transitionend', go, { once: true });
    setTimeout(go, 700);                               // por si no llega el transitionend
  }
  // al llegar, o al volver por bfcache, la cortina (con el nombre de esta página) sube
  window.addEventListener('pageshow', function() {
    if (VT) return;
    var el = fx();
    if (!el) return;
    html.style.setProperty('--pt-label', label(location.href));
    requestAnimationFrame(function() { el.classList.add('fx-anim', 'fx-reveal'); });
  });

  /* ---- navegar ----
     window.PageFX.leave(url, src): para lo que navega desde código (la
     card de la home, el «siguiente proyecto» al llegar al final). src es
     lo que se ha pulsado, si debe viajar a la página nueva. */
  window.PageFX.leave = function(url, src) {
    PT.to = url;
    PT.src = src || null;
    if (VT) { going(url); location.href = url; }
    else curtain(url);
  };
  // al pulsar, la página ya empieza a irse mientras llega la nueva (css:
  // se apaga y sube un poco; la transición sigue desde ahí). Si lo que se
  // pulsó viaja a la página nueva, no: tiene que salir entero.
  var goingTimer = 0;
  function going(url) {
    if (PT.src) return;
    var next = document.querySelector('.pj-next-link');
    if (next && page(next.href) === page(url) && inView(next)) return;
    html.classList.add('pt-going');
    clearTimeout(goingTimer);
    goingTimer = setTimeout(function() { html.classList.remove('pt-going'); }, 6000);  // si la navegación no llega
  }
  window.addEventListener('pageshow', function() { html.classList.remove('pt-going'); });
  // los enlaces internos: con View Transitions navegan solos (solo se
  // apunta el destino, Safari no lo da en pageswap); sin ellas, cortina
  document.addEventListener('click', function(e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
    if (href.charAt(0) === '#' || /^(mailto:|tel:|https?:|\/\/)/i.test(href)) return;
    if (!/\.html(\?|#|$)/.test(href)) return;
    if (VT) {
      PT.to = href;
      // data-pt-cover: lo que se ve del proyecto en la home (la imagen de
      // la vista índice) crece hasta ser su portada
      var cov = a.getAttribute('data-pt-cover');
      PT.src = cov ? document.querySelector(cov) : null;
      going(href);
      return;
    }
    e.preventDefault();
    curtain(href);
  });

  /* ---- pedir antes la página a la que se va (Chrome) ---- */
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
    var sr = document.createElement('script');
    sr.type = 'speculationrules';
    sr.textContent = JSON.stringify({ prefetch: [{
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/assets/*' } }, { not: { href_matches: '/*.pdf' } }] },
      eagerness: 'moderate'
    }] });
    document.head.appendChild(sr);
  }
})();
