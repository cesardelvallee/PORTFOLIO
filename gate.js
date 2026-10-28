/* ============================================================
   LA PUERTA DE LA HOME (gate.js; css/style.css «LA PUERTA»)
   La pantalla de carga de la primera visita: el muñeco de César en una
   pantalla de vigilancia que, al estar listo, entra sola en la home.
   · Negro, datos en los bordes y un contador 000 → 100 que cuenta toda
     la entrada: mientras carga sube con lo que de verdad llega (el modelo
     y el muñeco de la home); en cuanto el muñeco está, salta un glitch
     (SIGNAL // ACQUIRED) y se construye de los pies a la cabeza con una
     línea de barrido, mientras el contador sigue.
   · El muñeco, en holograma: luces cálidas (arena) y sombras azul
     eléctrico, borde iridiscente; encima, líneas de barrido, colores
     separados en los bordes, cortes horizontales de glitch, trama de
     puntos en el fondo y grano. Gira hacia el cursor.
   · Sin parar de contar, el muñeco da casi una vuelta mientras van
     apareciendo frases que se descifran letra a letra. Al llegar a 100,
     sale.
   · La salida es un render: la cámara del holograma va a encajar en la
     del muñeco de la home (que está debajo, en su sitio) y una línea baja
     de arriba abajo; por encima ya está la home, y al pasar por el muñeco
     el holograma se vuelve el de verdad. La home entra (título, cards)
     mientras la línea la descubre (avisa a script.js: «gate:cover»,
     «gate:reveal» y «gate:done»). Está pintada debajo desde el 100
     (gate:cover, en el glitch de la señal), para que el paso no dé tirones. Quien no quiera
     esperar se lo salta: bajar (rueda o dedo), Enter o pulsar el aviso
     (bajo los pies del muñeco, con lo que falta) entran ya.
   · Fluida desde el primer fotograma: aquí van los datos, el contador y
     las fases, y arrancan en cuanto se lee la página (sin esperar
     a three.js, ya pedido desde el <head>). El lienzo (gate-gl.js) va en
     un worker (gate-worker.js): lo que la página haga mientras (preparar
     la home y estrenar los shaders de su muñeco, en el glitch de la señal;
     pintarla debajo, al estar lista) no lo para. Sin worker con WebGL
     (Safari), el lienzo va en la página. Lo pesado de la home que no
     hace falta para entrar (tocadiscos, tinta) espera a que se vaya.
   Si no hay WebGL (o three.js no llega), lo mismo sin el muñeco (los
   datos, las frases y un fundido). Con movimiento reducido, sin glitch ni
   descifrado.
   script.js decide si se muestra (primera visita o recarga): si no, ya
   ha quitado #loading-screen y aquí no se hace nada.
   ============================================================ */
(function () {
'use strict';

const gate = document.getElementById('loading-screen');

function run() {
  const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s) => gate.querySelector(s);
  const html = document.documentElement;
  html.classList.add('gt-on');
  let alive = true;

  /* ---------- letras que se descifran ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_\\<>*+=';
  function decode(el, text, dur) {
    if (!el) return;
    if (REDUCE) { el.textContent = text; return; }
    const t0 = performance.now(), n = text.length;
    cancelAnimationFrame(el._dec);
    (function step(now) {
      const k = Math.min(1, Math.max(0, now - t0) / dur);
      let out = '';
      for (let i = 0; i < n; i++) {
        const c = text[i];
        if (c === ' ' || i / n < k * 1.15 - 0.15) out += c;
        else if (i / n < k * 1.15 + 0.1) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += ' ';
      }
      el.textContent = out;
      if (k < 1) el._dec = requestAnimationFrame(step); else el.textContent = text;
    })(t0);
  }
  gate.querySelectorAll('[data-dec]').forEach((el, i) => {
    const text = el.textContent;
    el.textContent = '';
    setTimeout(() => decode(el, text, 520), 80 + i * 55);
  });

  /* ---------- datos vivos: cursor y hora de Madrid ---------- */
  const xEl = $('.gt-x'), yEl = $('.gt-y'), timeEl = $('.gt-time');
  let mx = innerWidth / 2, my = innerHeight / 2;
  const pad4 = (v) => String(Math.max(0, Math.round(v))).padStart(4, '0');
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (xEl) xEl.textContent = pad4(mx);
    if (yEl) yEl.textContent = pad4(my);
    send({ mx, my });
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  let fmt = null;
  try { fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Madrid' }); } catch (e) {}
  const clock = setInterval(() => { if (timeEl && fmt) timeEl.textContent = fmt.format(new Date()); }, 1000);
  if (timeEl && fmt) timeEl.textContent = fmt.format(new Date());

  /* ---------- el lienzo (gate-gl.js): en un worker o en la página ----------
     GL: lo que le habla (set, resize, dispose y, en la página, frame).
     on: ya pinta (su shader está listo); sin él, al llegar a 100, la
     puerta va sin muñeco (gt-flat) */
  let canvas = $('.gt-gl');
  const mobile = innerWidth <= 768;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  let W = innerWidth, H = innerHeight;
  let GL = null, on = false, onT = 0, flat = false, glbP = 0, glbDone = false, worker = null, mainTried = false;
  const cfg = () => ({
    W, H, DPR, mobile, REDUCE, FINE, mx, my,
    model: new URL(gate.dataset.model || 'assets/CESAR_3D.glb', document.baseURI).href
  });
  function send(m) { if (GL) GL.set(m); }
  function goFlat() {
    if (on || flat) return;
    flat = true;
    glbDone = true;   // (no hay muñeco que esperar)
    gate.classList.add('gt-flat');
  }
  // lo que avisa el lienzo
  function onGL(m) {
    if (!alive) return;
    if (m.type === 'on') { on = true; onT = performance.now(); canvas.classList.add('is-on'); }
    else if (m.type === 'glbP') glbP = m.v;
    else if (m.type === 'cue') { if (cueWrap && !commit) cueWrap.style.transform = 'translate3d(-50%,' + m.y + 'px,0)'; }
    // el muñeco ya está; la cuenta espera también al de la home
    else if (m.type === 'fig') homeWarm().then(() => { glbDone = true; });
    else if (m.type === 'fail') {
      console.warn('La puerta:', m.stage, m.msg);
      // (si se rompe ya pintando, a la home sin más)
      if (on) { if (m.stage === 'frame') finish(true); else glbDone = true; return; }
      // el worker no puede: el lienzo, en la página (en uno nuevo: el otro ya es del worker)
      if (worker) { worker.terminate(); worker = null; GL = null; freshCanvas(); startMain(); }
      else goFlat();
    }
  }
  function freshCanvas() {
    const c = document.createElement('canvas');
    c.className = 'gt-gl';
    c.setAttribute('aria-hidden', 'true');
    canvas.replaceWith(c);
    canvas = c;
  }
  // el muñeco de la home (toon-figure.js) también se prepara detrás: la
  // cuenta no llega a 100 hasta que está (como mucho 6 s)
  function homeWarm() {
    const el = document.querySelector('toon-figure');
    if (!el || el.warm) return Promise.resolve();
    return new Promise((res) => {
      window.addEventListener('toon:warm', res, { once: true });
      setTimeout(res, 6000);
    });
  }

  // en un worker, si se puede (Safari no: su cargador de texturas necesita la página)
  const SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (canvas && canvas.transferControlToOffscreen && window.Worker && !SAFARI) startWorker();
  else startMain();

  function startWorker() {
    let w;
    try { w = new Worker('gate-worker.js?v=7', { type: 'module' }); } catch (e) { startMain(); return; }
    worker = w;
    let sent = false;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type !== 'hello') { if (worker === w) onGL(m); return; }
      if (!alive) { w.terminate(); return; }
      const off = canvas.transferControlToOffscreen();
      sent = true;
      w.postMessage(Object.assign({ type: 'init', canvas: off }, cfg()), [off]);
    };
    // no ha llegado a arrancar (o three.js no llega): en la página
    w.onerror = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      w.terminate();
      if (worker !== w) return;
      if (on) { finish(true); return; }
      worker = null; GL = null;
      if (sent) freshCanvas();
      startMain();
    };
    GL = {
      set: (m) => w.postMessage(Object.assign({ type: 'set' }, m)),
      resize: (w_, h_) => w.postMessage({ type: 'resize', W: w_, H: h_ }),
      // (en el worker se suelta ya: no le cuesta nada a la página)
      dispose: () => { w.postMessage({ type: 'dispose' }); setTimeout(() => w.terminate(), 1500); }
    };
  }
  async function startMain() {
    if (mainTried) return;
    mainTried = true;
    try {
      const mods = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js'), import('./gate-gl.js?v=7')]);
      if (!alive || flat) return;
      const core = mods[2].createGateGL(Object.assign({ THREE: mods[0], GLTFLoader: mods[1].GLTFLoader, canvas, post: onGL }, cfg()));
      GL = core;
    } catch (e) { console.warn('La puerta va sin 3D:', e); goFlat(); }
  }
  // si el modelo no llega (red muy lenta), se entra sin él
  setTimeout(() => { glbDone = true; }, 15000);

  function resize() {
    W = innerWidth; H = innerHeight;
    if (GL) GL.resize(W, H);
  }
  window.addEventListener('resize', resize);

  /* ---------- el contador ----------
     Cuenta toda la entrada. Mientras carga sube con lo que de verdad
     llega, hasta LOAD_TO; en cuanto el muñeco está (y como pronto a los
     ACQ_MIN), la señal: el muñeco se construye (BUILD), una pausa (HOLD)
     y la parte sola (AUTO_MS), y en todo ese rato el contador sigue, a
     ritmo constante, hasta 100. Ahí se entra */
  const srEl = $('.gt-sr'), countEl = $('.gt-count'), stateEl = $('.gt-state'), barEl = $('.gt-bar');
  const bar = (k, n) => '/'.repeat(Math.round(k * n)).padEnd(n, '·');
  const put = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  let shown = 0, c0 = 0, phase = 'load', fontsOk = false, covered = false;
  const LOAD_TO = 30, ACQ_MIN = REDUCE ? 300 : 600, BUILD = REDUCE ? 300 : 900;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsOk = true; });

  /* ---------- entrar: solo ----------
     Con el muñeco ya hecho, tras una pausa corta p sube de 0 a COMMIT en
     AUTO_MS, a ritmo constante (el muñeco gira y salen las frases, una
     cada ~0.4 s; en el móvil, algo más despacio: allí se leen de una en
     una) y entonces sale (el render, abajo). Desde la señal, bajar, Enter
     o pulsar el aviso se lo saltan y entran ya */
  let p = 0, ps = 0, commit = false, autoT = 0;
  const HOLD = 150, AUTO_MS = mobile ? 3300 : 2600;
  const lines = Array.prototype.slice.call(gate.querySelectorAll('.gt-line'));
  const lineText = lines.map((l) => { const t = l.textContent; l.textContent = ''; return t; });
  const lineOn = lines.map(() => false);
  const AT = [0.06, 0.18, 0.3, 0.42, 0.54];
  const COMMIT = 0.8;           // a partir de aquí se entra
  const cueWrap = $('.gt-cue-wrap'), cueBtn = $('.gt-cue');

  function skip() { if (phase !== 'load') enter(); }
  function onWheel(e) { if (e.deltaY > 0) skip(); }
  let ty = null;
  function onTouchStart(e) { ty = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (ty !== null && ty - e.touches[0].clientY > 24) { ty = null; skip(); }
  }
  function onKey(e) {
    if (phase === 'load' || commit) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); skip(); }
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('keydown', onKey);
  if (cueBtn) cueBtn.addEventListener('click', skip);

  /* ---------- la salida: un render ----------
     Al entrar, el encaje (MATCH_MS: la cámara del holograma va a la del
     muñeco de la home) y, empezando a su 70 %, la línea que baja
     (SCAN_MS). El lienzo lleva la misma cuenta (gate-gl.js); aquí se le
     pasa en cada fotograma la cámara del muñeco de la home, se destapa la
     home cuando la línea empieza (su entrada se ve mientras la descubre)
     y se acaba. Con movimiento reducido o sin lienzo, un fundido */
  const MATCH_MS = mobile ? 760 : 820, SCAN_AT = MATCH_MS * 0.7, SCAN_MS = mobile ? 980 : 1100, FADE_MS = 600;
  let tCommit = 0, revealed = false;
  const toon = () => document.querySelector('.model-3d-bg toon-figure');
  function enter() {
    if (commit) return;
    commit = true;
    tCommit = tl;
    send({ commit: true });
    gate.classList.add('is-entering');
    if (cueBtn) cueBtn.disabled = true;
    // el muñeco de la home vuelve a pintarse (debajo, tapado): el
    // holograma va a encajar en él
    html.classList.remove('gt-on');
    const f = toon();
    if (f && f.kick) { f.dirty = true; f.kick(); }
  }

  /* ---------- el bucle ---------- */
  // tl: el reloj de las fases (carga, construcción, barrido). Avanza como
  // mucho 50 ms por fotograma: tras un parón, la animación sigue donde iba
  // en vez de saltar (el lienzo lleva el mismo)
  let raf = 0, last = performance.now(), readyT = 0, tl = 0;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  // si algo falla a mitad, se entra a la home sin más (script.js: gate:fail)
  function tick(now) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    try { frame(now); } catch (e) { console.error(e); finish(true); }
  }
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000);
    last = now;
    tl += dt * 1000;

    /* carga: el contador sube con lo que llega; con el muñeco listo (y el
       lienzo ya del todo dentro), la señal */
    let want = 0;
    if (phase === 'load') {
      const tgt = 0.18 + 0.72 * (glbDone ? 1 : glbP) + (fontsOk ? 0.1 : 0);
      want = Math.min(tgt, tl / ACQ_MIN) * LOAD_TO;
      if (glbDone && fontsOk && tl >= ACQ_MIN && (!on || performance.now() - onT > 650)) {
        phase = 'build'; readyT = tl; c0 = shown;
        // sin lienzo a estas alturas (sin WebGL, o three.js no llegó): sin muñeco
        if (!on) goFlat();
        send({ phase: 'build' });
        gate.classList.add('is-loaded');
        // el muñeco de la home pinta aquí su primer fotograma (toon-figure.js):
        // en la página, cuesta un momento; el lienzo, en su worker, sigue.
        // Las letras se descifran después
        window.dispatchEvent(new Event('gate:loaded'));
        if (stateEl) decode(stateEl, 'SIGNAL // ACQUIRED', 360);
      }
    }
    // desde la señal, hasta 100 a ritmo constante (al entrar, ya)
    if (phase !== 'load') want = commit ? 100 : c0 + (100 - c0) * Math.min(1, (tl - readyT) / (BUILD + HOLD + AUTO_MS));
    shown += (want - shown) * Math.min(1, dt * 10);
    put(countEl, String(Math.round(shown)).padStart(3, '0'));
    put(barEl, bar(shown / 100, 24));
    /* el muñeco se construye (en el lienzo); aquí, la cuenta del tiempo */
    if (phase === 'build') {
      const k = Math.min(1, (tl - readyT) / BUILD);
      if (k >= 1) {
        phase = 'ready'; autoT = tl;
        gate.classList.add('is-ready');
        put(srEl, 'Portfolio listo: entrando. Pulsa Enter para entrar ya.');
        window.dispatchEvent(new Event('gate:ready'));
      }
    }
    // el lienzo ya lo tapa todo (negro y opaco, y ya del todo fundido):
    // fuera el negro de detrás y la home se pinta debajo (gate:cover;
    // script.js). Lo que cuesta pintarla por primera vez cae aquí, en el
    // glitch de la señal (con el primer fotograma del muñeco de la home), y
    // no luego, con el muñeco ya girando ni cuando la línea la destapa. Sin
    // lienzo, al estar lista (debajo del negro)
    if (!covered && phase !== 'load' && (on ? performance.now() - onT > 650 : phase === 'ready')) {
      covered = true;
      if (on) gate.classList.add('is-revealing');
      window.dispatchEvent(new Event('gate:cover'));
    }
    /* entrar: la parte sola y, al acabarla (o al saltarla), el barrido */
    if (phase === 'ready' && !commit) {
      const a = Math.min(1, Math.max(0, (tl - autoT - HOLD) / AUTO_MS));
      if (a * COMMIT !== p) { p = a * COMMIT; send({ p }); }
      if (a >= 1) enter();
    }
    if (commit) p = Math.min(1, p + dt * 0.6);
    ps += (p - ps) * Math.min(1, dt * 7);
    let cur = -1;
    lines.forEach((l, i) => {
      const on_ = ps >= AT[i];
      if (on_) cur = i;
      if (on_ !== lineOn[i]) {
        lineOn[i] = on_;
        l.classList.toggle('is-on', on_);
        if (on_) decode(l, lineText[i], 400);
      }
    });
    // en el móvil solo se lee la última (todas van en el mismo sitio)
    lines.forEach((l, i) => { if (l.classList.contains('is-cur') !== (i === cur)) l.classList.toggle('is-cur', i === cur); });
    if (commit) {
      const te = tl - tCommit, soft = REDUCE || !on;
      // la cámara del muñeco de la home, para el encaje (null si no se ve)
      if (!soft) {
        const f = toon();
        send({ view: f && f.view && !html.classList.contains('hv-index') ? f.view() : null });
      }
      // la home se pone en marcha cuando la línea empieza a bajar
      if (!revealed && te >= (soft ? 0 : SCAN_AT)) { revealed = true; window.dispatchEvent(new Event('gate:reveal')); }
      // sin lienzo, la puerta entera se funde
      if (!on) gate.style.opacity = String(1 - easeOut(Math.min(1, te / FADE_MS)));
      if (te >= (soft ? FADE_MS : SCAN_AT + SCAN_MS)) { finish(); return; }
    }

    // el lienzo, en la página (sin worker): se pinta aquí
    if (GL && GL.frame) GL.frame(now);
  }
  raf = requestAnimationFrame(tick);
  window.dispatchEvent(new Event('gate:alive'));

  function finish(failed) {
    alive = false;
    cancelAnimationFrame(raf);
    clearInterval(clock);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', resize);
    html.classList.remove('gt-on');
    window.dispatchEvent(new Event(failed ? 'gate:fail' : 'gate:done'));
    if (!GL) return;
    if (!GL.frame) { GL.dispose(); return; }
    // en la página, se limpia cuando la home ya ha entrado y el navegador está libre
    const g = GL, idle = window.requestIdleCallback || ((f) => setTimeout(f, 0));
    setTimeout(() => idle(() => g.dispose(), { timeout: 4000 }), 2800);
  }
}

if (gate && gate.dataset.run === '1') {
  try { run(); } catch (e) {
    console.error(e);
    document.documentElement.classList.remove('gt-on');
    window.dispatchEvent(new Event('gate:fail'));
  }
}
})();
