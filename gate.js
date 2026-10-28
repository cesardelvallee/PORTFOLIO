/* ============================================================
   LA PUERTA DE LA HOME (gate.js, módulo; css/style.css «LA PUERTA»)
   La pantalla de carga de la primera visita: el muñeco de César en una
   pantalla de vigilancia y, para entrar, hay que bajar (scroll).
   · Carga: negro, datos en los bordes, un contador 000 → 100 que sigue la
     carga real del modelo y una tinta beige que sube desde abajo.
   · Al llegar a 100 la tinta baja, salta un glitch y el muñeco se
     construye de los pies a la cabeza con una línea de barrido.
   · El muñeco, en holograma: luces cálidas (arena) y sombras azul
     eléctrico, borde iridiscente; encima, líneas de barrido, colores
     separados en los bordes, cortes horizontales de glitch, trama de
     puntos en el fondo y grano. Gira hacia el cursor.
   · Bajar (rueda, dedo o teclado; o pulsar el aviso, bajo los pies del
     muñeco) lo gira y van apareciendo frases que se descifran letra a
     letra; al final asoma por abajo una banda de ruido. Al llegar, la
     banda sube sola de un tirón y deja la home detrás: un solo
     movimiento, con los bordes suaves (avisa a script.js: «gate:ready»,
     «gate:reveal» y «gate:done»). La home ya está pintada debajo desde
     que el muñeco está listo, para que el paso no dé tirones.
   Si no hay WebGL, lo mismo sin el muñeco (los datos, las frases y un
   fundido). Con movimiento reducido, sin glitch ni descifrado.
   script.js decide si se muestra (primera visita o recarga): si no, ya
   ha quitado #loading-screen y aquí no se hace nada.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gate = document.getElementById('loading-screen');

function run() {
  const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s) => gate.querySelector(s);
  const html = document.documentElement;
  html.classList.add('gt-on');

  /* ---------- letras que se descifran ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_\\<>*+=';
  function decode(el, text, dur) {
    if (!el) return;
    if (REDUCE) { el.textContent = text; return; }
    const t0 = performance.now(), n = text.length;
    cancelAnimationFrame(el._dec);
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur);
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
  let mx = innerWidth / 2, my = innerHeight / 2, mvx = 0, mvy = 0;
  const pad4 = (v) => String(Math.max(0, Math.round(v))).padStart(4, '0');
  function onMove(e) {
    mvx += e.clientX - mx; mvy += e.clientY - my;
    mx = e.clientX; my = e.clientY;
    if (xEl) xEl.textContent = pad4(mx);
    if (yEl) yEl.textContent = pad4(my);
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  let fmt = null;
  try { fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Madrid' }); } catch (e) {}
  const clock = setInterval(() => { if (timeEl && fmt) timeEl.textContent = fmt.format(new Date()); }, 1000);
  if (timeEl && fmt) timeEl.textContent = fmt.format(new Date());

  /* ---------- WebGL ---------- */
  const canvas = $('.gt-gl');
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch (e) { renderer = null; }
  if (!renderer) gate.classList.add('gt-flat');

  const mobile = innerWidth <= 768;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  let W = innerWidth, H = innerHeight;
  let rt = null, scene = null, camera = null, post = null, postCam = null, postMat = null;
  const U = {
    tScene: { value: null }, uRes: { value: new THREE.Vector2(W * DPR, H * DPR) }, uTime: { value: 0 },
    uGlitch: { value: 0 }, uInk: { value: 0 }, uFront: { value: -1 }, uFade: { value: 1 }, uCalm: { value: REDUCE ? 1 : 0 },
    uCover: { value: new THREE.Color() }, uMott: { value: 0.1 }
  };
  // la banda acaba en el color del fondo de la home (claro u oscuro)
  function coverTone() {
    const light = document.body.classList.contains('theme-light');
    U.uCover.value.setRGB(...(light ? [0.925, 0.886, 0.82] : [0.063, 0.059, 0.051]));
    U.uMott.value = light ? 0.16 : 0.05;
  }
  coverTone();
  const figU = { uTime: U.uTime, uCut: { value: -10 }, uEdge: { value: 0.05 } };

  if (renderer) {
    renderer.setPixelRatio(DPR);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { depthBuffer: true });
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(26, W / H, 0.05, 60);
    U.tScene.value = rt.texture;
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: POST,
      // el shader ya da el color multiplicado por su alfa y pinta toda la
      // pantalla: se escribe tal cual (mezclarlo otra vez oscurecía los
      // bordes semitransparentes)
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false
    });
    post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    post.frustumCulled = false;
    const postScene = new THREE.Scene();
    postScene.add(post);
    post.userData.scene = postScene;
  }

  /* ---------- el muñeco ---------- */
  let fig = null, target = new THREE.Vector3(0, 1, 0), dist = 4, box = null;
  let glbP = 0, glbDone = false;
  if (renderer) {
    new GLTFLoader().load(gate.dataset.model || 'assets/CESAR_3D.glb', (gltf) => {
      fig = gltf.scene;
      fig.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        o.material = new THREE.ShaderMaterial({
          uniforms: Object.assign({ map: { value: m.map || null }, uHasMap: { value: m.map ? 1 : 0 }, uTint: { value: m.color ? m.color.clone() : new THREE.Color(1, 1, 1) } }, figU),
          vertexShader: FIG_VERT,
          fragmentShader: FIG_FRAG,
          side: m.side
        });
        m.dispose();
        o.frustumCulled = false;
      });
      relaxArms(fig);
      scene.add(fig);
      fig.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(fig, true);
      target = box.getCenter(new THREE.Vector3());
      fit();
      figU.uCut.value = box.min.y - 0.05;
      glbDone = true;
    }, (ev) => { if (ev.total) glbP = ev.loaded / ev.total; }, () => { glbDone = true; });
    // si el modelo no llega (red muy lenta), se entra sin él
    setTimeout(() => { glbDone = true; }, 15000);
  } else {
    glbDone = true;
  }
  // la distancia: el muñeco ocupa ~62 % del alto (y cabe a lo ancho en el móvil)
  function fit() {
    if (!box || !camera) return;
    const size = box.getSize(new THREE.Vector3());
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const fill = mobile ? 0.6 : 0.7;
    const byH = (size.y / 2) / (fill * Math.tan(vfov / 2));
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const byW = (size.x / 2) / (0.42 * Math.tan(hfov / 2));
    dist = Math.max(byH, byW) + size.z / 2;
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    if (!renderer) return;
    renderer.setSize(W, H, false);
    rt.setSize(W * DPR, H * DPR);
    U.uRes.value.set(W * DPR, H * DPR);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    fit();
  }
  window.addEventListener('resize', resize);

  /* ---------- carga: contador y tinta ---------- */
  const srEl = $('.gt-sr'), countEl = $('.gt-count'), stateEl = $('.gt-state'), barEl = $('.gt-bar');
  const bar = (k, n) => '/'.repeat(Math.round(k * n)).padEnd(n, '·');
  const put = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  let shown = 0, phase = 'load', t0 = performance.now(), fontsOk = false;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsOk = true; });

  /* ---------- entrar: el scroll ---------- */
  let p = 0, ps = 0, commit = false, lastInput = 0, vel = 0;
  // cuánto hay que bajar para entrar: ~12 golpes de rueda, o dos deslizamientos
  const K = 1 / (mobile ? 1100 : 1400);
  const lines = Array.prototype.slice.call(gate.querySelectorAll('.gt-line'));
  const lineText = lines.map((l) => { const t = l.textContent; l.textContent = ''; return t; });
  const lineOn = lines.map(() => false);
  const AT = [0.06, 0.18, 0.3, 0.42, 0.54];
  const COMMIT = 0.8;           // a partir de aquí se entra
  const progEl = $('.gt-prog'), veil = $('.gt-veil'), cueWrap = $('.gt-cue-wrap'), cueBtn = $('.gt-cue');

  function push(d) {
    if (phase !== 'ready' || commit) return;
    p = Math.max(0, Math.min(1, p + d));
    vel = Math.min(1, vel + Math.abs(d) * 6);
    lastInput = performance.now();
    if (p >= COMMIT) enter();
  }
  function onWheel(e) {
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    push(e.deltaY * k * K);
  }
  let ty = null;
  function onTouchStart(e) { ty = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (ty === null) return;
    const y = e.touches[0].clientY;
    push((ty - y) * K);
    ty = y;
  }
  function onKey(e) {
    if (phase !== 'ready') return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); push(0.12); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); push(-0.12); }
    else if (e.key === 'Enter') { e.preventDefault(); enter(); }
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('keydown', onKey);
  if (cueBtn) cueBtn.addEventListener('click', () => { if (phase === 'ready') enter(); });

  /* ---------- el barrido ----------
     front: por dónde va el borde de delante de la banda (0 abajo, 1
     arriba). Antes de entrar solo asoma (sigue a lo que se baja y vuelve
     si se sube); al entrar sube sola hasta que su borde de detrás sale
     por arriba. Su curva arranca suave, acelera y se posa despacio: un
     movimiento grande por la pantalla, sin golpe al empezar ni al acabar */
  const PEEK0 = -0.35, PEEK1 = 0.12, F_END = 1.62, REVEAL_AT = 0.5;
  const SWEEP_MS = REDUCE ? 600 : mobile ? 1500 : 1700;
  const sweepEase = bezier(0.4, 0.12, 0.18, 1);
  let tCommit = 0, front = PEEK0, F0 = PEEK0, revealed = false;
  function enter() {
    if (commit) return;
    commit = true;
    tCommit = performance.now();
    F0 = front;
    if (!REDUCE) burst = Math.max(burst, 0.5);
    gate.classList.add('is-entering');
    if (cueBtn) cueBtn.disabled = true;
  }

  /* ---------- glitch: ráfagas al azar, más al moverse o bajar ---------- */
  let burst = 0, nextBurst = performance.now() + 1800;
  function glitchLevel(now, dt) {
    if (REDUCE) return 0;
    if (now > nextBurst) { burst = 0.55 + Math.random() * 0.45; nextBurst = now + 2400 + Math.random() * 3800; }
    burst = Math.max(0, burst - dt * 3.2);
    const move = Math.min(1, Math.hypot(mvx, mvy) / 260);
    mvx *= 0.82; mvy *= 0.82;
    vel = Math.max(0, vel - dt * 1.6);
    return Math.min(1, burst * 0.7 + move * 0.25 + vel * 0.6);
  }

  /* ---------- el bucle ---------- */
  let raf = 0, last = performance.now(), yaw = 0, yawT = 0, pitch = 0, alive = true, readyT = 0, cueY = -1;
  const feet = new THREE.Vector3(), restCam = new THREE.PerspectiveCamera();
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  // si algo falla a mitad, se entra a la home sin más (script.js: gate:fail)
  function tick(now) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    try { frame(now); } catch (e) { console.error(e); finish(true); }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    U.uTime.value = now / 1000;

    /* carga */
    if (phase === 'load') {
      const tgt = 0.18 + 0.72 * (glbDone ? 1 : glbP) + (fontsOk ? 0.1 : 0);
      const minT = Math.min(1, (now - t0) / (REDUCE ? 600 : 1600));
      const want = Math.min(tgt, minT) * 100;
      shown += (want - shown) * Math.min(1, dt * 6);
      if (glbDone && fontsOk && minT >= 1 && want >= 99.5) shown = Math.max(shown, 99.6);
      const v = Math.round(shown);
      put(countEl, String(v).padStart(3, '0'));
      put(barEl, bar(shown / 100, 24));
      U.uInk.value = (shown / 100) * 0.32;
      if (v >= 100) {
        phase = 'build'; readyT = now;
        burst = 1;
        if (stateEl) decode(stateEl, 'SIGNAL // ACQUIRED', 420);
        gate.classList.add('is-loaded');
      }
    }
    /* el muñeco se construye; la tinta baja */
    if (phase === 'build') {
      const k = Math.min(1, (now - readyT) / (REDUCE ? 300 : 1300));
      U.uInk.value = 0.32 * (1 - easeOut(Math.min(1, k * 1.6)));
      if (box) figU.uCut.value = box.min.y - 0.05 + (box.max.y - box.min.y + 0.2) * easeOut(k);
      if (k >= 1) {
        phase = 'ready';
        figU.uCut.value = 99;
        gate.classList.add('is-ready');
        put(srEl, 'Portfolio listo. Baja o pulsa Enter para entrar.');
        // el lienzo ya lo tapa todo (es negro y opaco): fuera el negro de
        // detrás. Así el navegador pinta la home debajo ahora, mientras se
        // mira el muñeco, y no cuando la banda empieza a destaparla
        if (renderer) gate.classList.add('is-revealing');
        window.dispatchEvent(new Event('gate:ready'));
      }
    }
    /* entrar */
    if (commit) p = Math.min(1, p + dt * 0.6);
    ps += (p - ps) * Math.min(1, dt * 7);
    put(progEl, bar(Math.min(1, ps / COMMIT), 20));
    let cur = -1;
    lines.forEach((l, i) => {
      const on = ps >= AT[i];
      if (on) cur = i;
      if (on !== lineOn[i]) {
        lineOn[i] = on;
        l.classList.toggle('is-on', on);
        if (on) decode(l, lineText[i], 520);
      }
    });
    // en el móvil solo se lee la última (todas van en el mismo sitio)
    lines.forEach((l, i) => { if (l.classList.contains('is-cur') !== (i === cur)) l.classList.toggle('is-cur', i === cur); });
    let sweep = 0;
    if (!commit) {
      front = REDUCE ? PEEK0 : PEEK0 + (PEEK1 - PEEK0) * smooth(0.6, COMMIT, ps);
    } else {
      sweep = Math.min(1, (now - tCommit) / SWEEP_MS);
      if (REDUCE) U.uFade.value = 1 - easeOut(sweep);
      else front = F0 + (F_END - F0) * sweepEase(sweep);
      // la home se pone en marcha justo antes de que la banda empiece a
      // destaparla: así su entrada se ve mientras aparece
      if (!revealed && (REDUCE || front >= REVEAL_AT)) {
        revealed = true;
        coverTone();
        html.classList.remove('gt-on');
        window.dispatchEvent(new Event('gate:reveal'));
      }
    }
    U.uFront.value = front;
    if (commit && sweep >= 1) { finish(); return; }

    /* cámara: gira con el cursor y con lo que se ha bajado */
    if (renderer && camera) {
      const mxN = (mx / W - 0.5), myN = (my / H - 0.5);
      // al entrar sigue girando y la cámara se le acerca mientras pasa la banda
      const sk = commit && !REDUCE ? sweepEase(sweep) : 0;
      yawT = (FINE ? mxN * 0.7 : Math.sin(now / 2600) * 0.25) + Math.sin(now / 3100) * 0.08 + ps * (REDUCE ? 0.6 : 2.6) + sk * 0.5;
      yaw += (yawT - yaw) * Math.min(1, dt * 3);
      pitch += ((FINE ? -myN * 0.12 : 0) - pitch) * Math.min(1, dt * 3);
      const d = dist * (1 - ps * 0.06 - sk * 0.22);
      const PHI = Math.PI / 2 - 0.12 + pitch;
      camera.position.set(target.x + d * Math.sin(PHI) * Math.sin(yaw), target.y + d * Math.cos(PHI), target.z + d * Math.sin(PHI) * Math.cos(yaw));
      camera.lookAt(target.x, target.y, target.z);
      // el aviso, justo bajo los pies (con la cámara en reposo: no baila con el ratón)
      if (box && cueWrap && !commit) {
        restCam.copy(camera);
        restCam.position.set(target.x, target.y + d * Math.cos(Math.PI / 2 - 0.12), target.z + d * Math.sin(Math.PI / 2 - 0.12));
        restCam.lookAt(target);
        restCam.updateMatrixWorld();
        feet.set(target.x, box.min.y, target.z).project(restCam);
        const y = Math.round(Math.min(H - 72, Math.max(H * 0.55, (0.5 - feet.y * 0.5) * H + (mobile ? 18 : 26))));
        if (y !== cueY) { cueY = y; cueWrap.style.transform = 'translate3d(-50%,' + y + 'px,0)'; }
      }
      U.uGlitch.value = phase === 'load' ? glitchLevel(now, dt) * 0.4 : glitchLevel(now, dt);
      renderer.setRenderTarget(rt);
      renderer.clear();
      // cuando la banda ya lo tapa todo, el muñeco no hace falta
      if (front - 0.17 < 1.02) renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(post.userData.scene, postCam);
    } else if (veil) {
      // sin WebGL: un velo del color de la home sube y la pantalla se funde
      veil.style.transform = 'translateY(' + ((1 - Math.min(1, Math.max(0, front))) * 100).toFixed(2) + '%)';
      if (commit) gate.style.opacity = String(REDUCE ? U.uFade.value : 1 - smooth(1, F_END, front));
    }
  }
  raf = requestAnimationFrame(tick);
  window.dispatchEvent(new Event('gate:alive'));
  function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(e) < 1e-5 || !d) break;
        t -= e / d;
      }
      t = Math.min(1, Math.max(0, t));
      return ((ay * t + by) * t + cy) * t;
    };
  }

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
    // se limpia cuando la home ya ha entrado y el navegador está libre
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 0));
    setTimeout(() => idle(() => {
      if (!renderer) return;
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      rt.dispose();
      postMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }, { timeout: 4000 }), 2800);
  }
}

/* los brazos, un poco más cerca del cuerpo (como el muñeco de la home) */
function relaxArms(root) {
  const V = THREE.Vector3, Q = THREE.Quaternion;
  const at = (o) => o.getWorldPosition(new V());
  root.updateMatrixWorld(true);
  ['Left', 'Right'].forEach((side) => {
    const arm = root.getObjectByName(side + 'Arm'), fore = root.getObjectByName(side + 'ForeArm');
    if (!arm || !fore) return;
    const dir = at(fore).sub(at(arm)).normalize();
    const q = new Q().setFromAxisAngle(new V().crossVectors(dir, new V(0, -1, 0)).normalize(), 12 * Math.PI / 180);
    const parent = arm.parent.getWorldQuaternion(new Q()).invert();
    arm.quaternion.copy(parent.multiply(q).multiply(arm.getWorldQuaternion(new Q())));
    arm.updateMatrixWorld(true);
  });
}

/* el holograma: luz cálida (arena) y sombra azul eléctrico, con el detalle
   de la textura, borde iridiscente y un filo cian en lo que se ve de canto.
   uCut: hasta dónde se ha construido (altura del mundo), con su línea */
const FIG_VERT = `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vY;
void main() {
  vUv = uv;
  vec3 objectNormal = vec3(normal);
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformed = vec3(position);
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(normalMatrix * objectNormal);
  vV = -mv.xyz;
  vY = (modelMatrix * vec4(transformed, 1.0)).y;
  gl_Position = projectionMatrix * mv;
}`;
const FIG_FRAG = `
uniform sampler2D map;
uniform float uHasMap;
uniform vec3 uTint;
uniform float uTime;
uniform float uCut;
uniform float uEdge;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vY;
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
void main() {
  if (vY > uCut) discard;
  vec3 n = normalize(vN), v = normalize(vV);
  if (!gl_FrontFacing) n = -n;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  // dos luces de color fijas a la cámara: cálida arriba a la izquierda y
  // azul desde la derecha. Cada punto es de una o de otra (dos tonos, no
  // una mezcla gris); la textura solo pone el detalle (su brillo)
  vec3 Lw = normalize(vec3(-0.6, 0.55, 0.55));
  vec3 Lb = normalize(vec3(0.8, -0.1, 0.45));
  float kw = dot(n, Lw), kb = dot(n, Lb);
  float side = smoothstep(-0.25, 0.35, kw - kb * 0.7);
  float shade = 0.3 + 0.7 * smoothstep(-0.1, 0.9, max(kw, kb));
  vec3 tex = uHasMap > 0.5 ? pow(texture2D(map, vUv).rgb, vec3(0.4545)) : uTint;
  float lum = dot(tex, vec3(0.299, 0.587, 0.114));
  float alb = 0.55 + 0.6 * lum;
  vec3 warm = vec3(1.0, 0.68, 0.42) * 1.2;
  vec3 blue = vec3(0.2, 0.42, 1.0);
  vec3 col = alb * mix(blue * 1.15, warm * 1.1, side) * shade + blue * 0.06;
  float rim = pow(1.0 - ndv, 2.4);
  col += pal(ndv * 1.3 + vY * 0.55 + uTime * 0.04) * rim * 0.4;
  col += vec3(0.3, 0.6, 1.0) * pow(1.0 - ndv, 6.0) * 0.8;
  // la línea de construcción
  float e = 1.0 - smoothstep(0.0, uEdge, uCut - vY);
  col = mix(col, vec3(0.75, 0.95, 1.0) * 1.6, e);
  gl_FragColor = vec4(col, 1.0);
}`;

/* la pantalla: glitch (cortes horizontales), colores separados, líneas de
   barrido, trama de puntos en el fondo, grano, viñeta; la tinta de la
   carga (beige, desde abajo), el ruido crema que tapa al entrar y la
   disolución que deja ver la home */
const POST = `
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uGlitch;
uniform float uInk;
uniform float uFront;
uniform float uFade;
uniform float uCalm;
uniform vec3 uCover;
uniform float uMott;
// (sin seno: con coordenadas grandes el seno pierde precisión y salen bloques)
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}
float fbm3(vec2 p) { return 0.5 * noise(p) + 0.25 * noise(p * 2.03) + 0.125 * noise(p * 4.12) + 0.0625; }
void main() {
  // por debajo de la banda ya está la home: nada que calcular
  float yt = -9.0;
  if (uFront > -0.3) {
    yt = uFront - 0.42 + (fbm(vec2(vUv.x * 2.0 + 7.0, vUv.y * 1.2 - uTime * 0.176)) - 0.5) * 0.34;
    if (vUv.y < yt - 0.03) { gl_FragColor = vec4(0.0); return; }
  }
  vec2 uv = vUv;
  float g = uGlitch;
  float tq = floor(uTime * 14.0);
  float band = floor(uv.y * 34.0);
  float r = hash(vec2(band, tq));
  if (r < g * 0.32) uv.x += (hash(vec2(tq, band * 1.7)) - 0.5) * 0.09 * g;
  if (r > 1.0 - g * 0.06) uv.y += (hash(vec2(band, tq + 3.0)) - 0.5) * 0.02;
  vec2 off = vec2((0.0022 + 0.014 * g) * (0.55 + length(vUv - 0.5)), 0.0);
  vec4 sg = texture2D(tScene, uv);
  float cr = texture2D(tScene, uv + off).r;
  float cb = texture2D(tScene, uv - off).b;
  float ar = texture2D(tScene, uv + off).a, ab = texture2D(tScene, uv - off).a;
  vec3 col = vec3(cr, sg.g, cb);
  float fig = max(sg.a, max(ar, ab));
  // líneas de barrido (cada 3 px) y una banda clara que baja despacio
  float sl = 0.74 + 0.26 * sin(gl_FragCoord.y * 3.14159 / 1.5);
  col *= sl;
  float scan = exp(-pow((fract(vUv.y * 0.6 + uTime * 0.07) - 0.5) * 40.0, 2.0));
  col *= 1.0 + scan * 0.35 * (1.0 - uCalm);
  // trama de puntos en el fondo, que parpadea en manchas
  vec2 cell = mod(gl_FragCoord.xy, 6.0) - 3.0;
  float dotm = 1.0 - smoothstep(0.7, 1.3, length(cell));
  float fl = fbm3(gl_FragCoord.xy * 0.0035 + vec2(0.0, uTime * 0.04));
  vec3 bg = vec3(0.93, 0.90, 0.85) * dotm * (0.022 + 0.06 * smoothstep(0.5, 0.78, fl));
  col = col * fig + bg * (1.0 - fig);
  // grano
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * (0.05 + 0.04 * g);
  // viñeta
  col *= 1.0 - 0.38 * pow(length(vUv - 0.5) * 1.3, 2.2);
  // la tinta de la carga: beige, en manchas, desde abajo
  if (uInk > 0.001) {
    float n = fbm(vec2(vUv.x * 3.2, vUv.y * 2.2 - uTime * 0.12));
    col = mix(col, vec3(0.78, 0.70, 0.60), 1.0 - step(uInk * 1.25, vUv.y + (n - 0.5) * 0.4));
  }
  // el paso a la home: una banda de ruido sube desde abajo. Delante es
  // beige y hacia atrás se vuelve del color de fondo de la home; por
  // debajo de ella ya está la home (transparente). Los dos bordes son
  // suaves y su forma hierve despacio
  float alpha = 1.0;
  if (uFront > -0.3) {
    float t = uTime * 0.22;
    float yl = uFront + (fbm(vec2(vUv.x * 2.4, vUv.y * 1.4 - t)) - 0.5) * 0.34;
    float gr = (hash(gl_FragCoord.xy + fract(uTime) * 57.0) - 0.5) * 0.006;
    float inB = smoothstep(yl + 0.01, yl - 0.01, vUv.y + gr);
    float past = smoothstep(yt + 0.014, yt - 0.014, vUv.y + gr);
    float k = clamp((yl - vUv.y) / max(yl - yt, 0.05), 0.0, 1.0);
    float m = fbm3(vUv * vec2(5.0, 3.6) - vec2(0.0, uTime * 0.15));
    vec3 band = mix(vec3(0.78, 0.70, 0.60), uCover, smoothstep(0.05, 0.75, k + (m - 0.5) * 0.45));
    band += (m - 0.5) * uMott;
    band *= mix(0.94 + 0.06 * sl, 1.0, k);
    col = mix(col, band, inB);
    alpha = 1.0 - past;
  }
  alpha *= uFade;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

if (gate && gate.dataset.run === '1') {
  try { run(); } catch (e) {
    console.error(e);
    document.documentElement.classList.remove('gt-on');
    window.dispatchEvent(new Event('gate:fail'));
  }
}
