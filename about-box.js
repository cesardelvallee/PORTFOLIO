/* ============================================================
   ABOUT — la caja de la figura coleccionable (three.js)
   Una caja de cartón impreso con ventana troquelada y acetato; dentro,
   el muñeco de pie sobre su bandeja, delante del fondo impreso. Se gira
   la caja entera arrastrando (con inercia); en reposo flota y se mece un
   poco. Las caras se pintan en canvas con la tipografía y la paleta de
   la web, así que todo el diseño de la caja vive aquí.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---- medidas (unidades de escena) y paleta ---- */
const W = 1.0, H = 1.5, D = 0.62;          // ancho, alto y fondo de la caja
const WX = 0.39;                           // media anchura de la ventana
const WB = -0.30;                          // base de la ventana (y la bandeja)
const WT = 0.62;                           // arriba del arco
const AC = WT - WX;                        // centro del arco
const PX = 1200;                           // píxeles de textura por unidad
const C = {
  // cartón amarillo impreso en negro; por dentro, un amarillo pálido
  board: '#f2c230', paper: '#f4c73a', ink: '#151311', beige: '#f2c230',
  inner: '#f1e0a6', shelf: '#e8d08a', edge: '#d39f1b', insert: '#f6e6b0',
  mute: 'rgba(21, 19, 17, 0.55)', line: 'rgba(21, 19, 17, 0.16)', fold: 'rgba(60, 50, 38, 0.22)'
};
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

const stage = document.querySelector('.ab-stage');
if (stage) init(stage).catch(() => stage.classList.add('is-failed'));

async function init(stage) {
  const canvas = stage.querySelector('.ab-canvas');
  const hint = document.querySelector('.ab-hint');
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  // algo por encima, como una foto de producto: se ve un poco la tapa
  camera.position.set(0, 1.38, 4.18);
  camera.lookAt(0, -0.02, 0);

  // luz principal cálida desde delante-arriba-izquierda (da las tres caras
  // en tonos distintos) y un contraluz suave que despega los cantos
  const key = new THREE.DirectionalLight(0xfff3e2, 1.25);
  key.position.set(-2.4, 3.2, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1; key.shadow.camera.right = 1;
  key.shadow.camera.top = 1.2; key.shadow.camera.bottom = -1;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.45);
  rim.position.set(2.5, 1.2, -3);
  scene.add(rim);

  // las caras se pintan con Inter: esperar a que esté cargada
  if (document.fonts && document.fonts.load) {
    await Promise.all(['800', '700', '600', '300'].map((w) => document.fonts.load(w + ' 60px Inter'))).catch(() => {});
  }

  const spin = new THREE.Group();      // giro del usuario
  const float = new THREE.Group();     // flotación y vaivén en reposo
  const box = buildBox(renderer);
  const glare = box.userData.glare;
  float.add(box);
  spin.add(float);
  scene.add(spin);

  /* ---- el muñeco, dentro ---- */
  const loader = new GLTFLoader();
  loader.load('assets/CESAR_3D.glb', (gltf) => {
    const fig = gltf.scene;
    const b = new THREE.Box3().setFromObject(fig);
    const size = b.getSize(new THREE.Vector3());
    const s = 0.84 / size.y;
    fig.scale.setScalar(s);
    const c = b.getCenter(new THREE.Vector3());
    fig.position.set(-c.x * s, WB - b.min.y * s + 0.004, -c.z * s - 0.02);
    fig.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    box.add(fig);
    ready();
  }, undefined, () => { stage.classList.add('is-nofig'); ready(); });

  /* ---- tamaño ---- */
  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    kick();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);

  /* ---- giro: se arrastra la caja entera, con inercia ---- */
  const BASE_X = 0;
  let rotY = -0.55, velY = 0, rotX = BASE_X, tiltT = BASE_X;
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, acc = 0, eggT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; velY = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    stage.classList.add('is-grab');
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    const now = performance.now(), dt = Math.max(8, now - lastT);
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    const d = dx * 0.0115;
    rotY += d;
    velY = d * (16 / dt);                               // por fotograma de 16 ms
    if (e.pointerType === 'mouse') tiltT = Math.max(-0.28, Math.min(0.34, tiltT + dy * 0.004));
    acc += Math.abs(d);
    if (hint && acc >= Math.PI * 6) {                   // tres vueltas: premio
      acc = 0;
      hint.classList.add('is-egg');
      clearTimeout(eggT);
      eggT = setTimeout(() => hint.classList.remove('is-egg'), 3200);
    }
    kick();
  });
  const release = () => { if (!dragging) return; dragging = false; tiltT = BASE_X; stage.classList.remove('is-grab'); kick(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);

  /* ---- bucle: solo mientras se ve ---- */
  let visible = true, running = false, t0 = performance.now();
  if (window.IntersectionObserver) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(stage);
  }
  function kick() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }
  function frame(now) {
    running = false;
    if (!visible) return;
    if (!dragging) {
      rotY += velY;
      velY *= 0.95;
      if (Math.abs(velY) < 0.0002) velY = 0;
    }
    rotX += (tiltT - rotX) * 0.12;
    spin.rotation.set(rotX, rotY, 0);
    if (glare) glare.offset.x = (rotY + float.rotation.y) * 0.42;
    const t = (now - t0) / 1000;
    if (!reduce) {
      float.position.y = Math.sin(t * 0.9) * 0.022;
      float.rotation.z = Math.sin(t * 0.55) * 0.012;
      float.rotation.y = Math.sin(t * 0.4) * 0.05;
    }
    renderer.render(scene, camera);
    // en reposo con movimiento reducido no hace falta seguir pintando
    if (!reduce || dragging || velY || Math.abs(tiltT - rotX) > 0.001) kick();
  }

  function ready() {
    resize();
    renderer.render(scene, camera);
    stage.classList.add('is-loaded');
    kick();
  }
}

/* ============================================================
   La caja: seis caras impresas, ventana con canto de cartón, acetato,
   interior, fondo impreso y bandeja, y la pestaña para colgarla.
   ============================================================ */
function buildBox(renderer) {
  const g = new THREE.Group();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const card = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.58, metalness: 0 });
  const tex = (w, h, draw) => {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * PX); cv.height = Math.round(h * PX);
    const c = cv.getContext('2d');
    draw(c, cv.width, cv.height);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  // frontal con la ventana troquelada
  const front = new THREE.Shape();
  front.moveTo(-W / 2, -H / 2); front.lineTo(W / 2, -H / 2); front.lineTo(W / 2, H / 2); front.lineTo(-W / 2, H / 2); front.lineTo(-W / 2, -H / 2);
  front.holes.push(archPath(new THREE.Path(), 0));
  const fg = new THREE.ShapeGeometry(front, 64);
  planarUV(fg, W, H);
  const fm = new THREE.Mesh(fg, card(tex(W, H, drawFront)));
  fm.position.z = D / 2;
  g.add(fm);

  const face = (w, h, t, place) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), card(t)); place(m); g.add(m); return m; };
  face(W, H, tex(W, H, drawBack), (m) => { m.rotation.y = Math.PI; m.position.z = -D / 2; });
  face(D, H, tex(D, H, drawRight), (m) => { m.rotation.y = Math.PI / 2; m.position.x = W / 2; });
  face(D, H, tex(D, H, drawLeft), (m) => { m.rotation.y = -Math.PI / 2; m.position.x = -W / 2; });
  face(W, D, tex(W, D, drawTop), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = H / 2; });
  face(W, D, tex(W, D, drawBottom), (m) => { m.rotation.x = Math.PI / 2; m.position.y = -H / 2; });

  // interior: cartón liso visto desde dentro
  const inner = new THREE.Mesh(new THREE.BoxGeometry(W - 0.006, H - 0.006, D - 0.006),
    new THREE.MeshStandardMaterial({ color: C.inner, roughness: 0.9, side: THREE.BackSide }));
  inner.receiveShadow = true;
  g.add(inner);

  // fondo impreso detrás del muñeco
  const backH = H / 2 - WB;
  const insert = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, backH - 0.006),
    new THREE.MeshStandardMaterial({ map: tex(W, backH, drawInsert), roughness: 0.75 }));
  insert.position.set(0, WB + backH / 2, -D / 2 + 0.008);
  insert.receiveShadow = true;
  g.add(insert);

  // bandeja donde está de pie
  const shelf = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, D - 0.012),
    new THREE.MeshStandardMaterial({ color: C.shelf, roughness: 0.85 }));
  shelf.rotation.x = -Math.PI / 2;
  shelf.position.y = WB;
  shelf.receiveShadow = true;
  g.add(shelf);

  // canto de cartón alrededor de la ventana
  const ring = archPath(new THREE.Shape(), 0.007);
  ring.holes.push(archPath(new THREE.Path(), 0));
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.014, bevelEnabled: false, curveSegments: 48 }),
    new THREE.MeshStandardMaterial({ color: C.edge, roughness: 0.92 }));
  rim.position.z = D / 2 - 0.0145;
  g.add(rim);

  // acetato: una lámina casi invisible con un punto de brillo del entorno
  // (la transmisión real emborronaba al muñeco); el reflejo lo dan las franjas
  const acet = new THREE.Mesh(new THREE.ShapeGeometry(archPath(new THREE.Shape(), 0), 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.07, depthWrite: false, envMapIntensity: 2 }));
  acet.position.z = D / 2 - 0.007;
  g.add(acet);

  // reflejo del estudio en el acetato: dos franjas suaves que se deslizan
  // por la ventana al girar la caja (about-box mueve offset.x)
  const glareTex = new THREE.CanvasTexture(drawGlare());
  glareTex.colorSpace = THREE.SRGBColorSpace;
  glareTex.wrapS = THREE.RepeatWrapping;
  const glareGeo = new THREE.ShapeGeometry(archPath(new THREE.Shape(), 0), 48);
  planarUV(glareGeo, WX * 2, WT - WB, (WT + WB) / 2);
  const gl = new THREE.Mesh(glareGeo, new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, depthWrite: false, toneMapped: false }));
  gl.position.z = D / 2 - 0.0035;
  g.add(gl);
  g.userData.glare = glareTex;

  // pestaña para colgar, con su ranura (sale de la trasera)
  const tab = new THREE.Shape();
  const tw = 0.44, th = 0.22, r = 0.05;
  tab.moveTo(-tw / 2, 0); tab.lineTo(tw / 2, 0); tab.lineTo(tw / 2, th - r);
  tab.quadraticCurveTo(tw / 2, th, tw / 2 - r, th); tab.lineTo(-tw / 2 + r, th);
  tab.quadraticCurveTo(-tw / 2, th, -tw / 2, th - r); tab.lineTo(-tw / 2, 0);
  const slot = new THREE.Path();
  const sw = 0.2, sh = 0.05, sy = 0.13;
  slot.absarc(-sw / 2 + sh / 2, sy, sh / 2, Math.PI / 2, Math.PI * 1.5, false);
  slot.absarc(sw / 2 - sh / 2, sy, sh / 2, Math.PI * 1.5, Math.PI / 2, false);
  tab.holes.push(slot);
  const tabM = new THREE.Mesh(new THREE.ShapeGeometry(tab, 24),
    new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.6, side: THREE.DoubleSide }));
  tabM.position.set(0, H / 2, -D / 2 + 0.002);
  g.add(tabM);

  return g;
}

// la ventana: rectángulo con arco arriba (off la agranda hacia fuera)
function archPath(p, off) {
  const x = WX + off, b = WB - off;
  p.moveTo(-x, b); p.lineTo(x, b); p.lineTo(x, AC);
  p.absarc(0, AC, x, 0, Math.PI, false);
  p.lineTo(-x, b);
  return p;
}
// UV plano para una geometría centrada de w x h
function planarUV(geo, w, h, cy = 0) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, (pos.getY(i) - cy) / h + 0.5);
  uv.needsUpdate = true;
}

/* ============================================================
   Impresión de las caras (canvas 2D)
   ============================================================ */
// texto con tracking (en em), alineado a izquierda, derecha o centro
function txt(c, s, x, y, o) {
  c.font = (o.weight || 600) + ' ' + o.size + 'px ' + SANS;
  c.fillStyle = o.color || C.ink;
  c.textBaseline = 'alphabetic';
  const tr = (o.track || 0) * o.size;
  const chars = Array.from(s);
  const ws = chars.map((ch) => c.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
  let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x;
  c.textAlign = 'left';
  chars.forEach((ch, i) => { c.fillText(ch, cx, y); cx += ws[i] + tr; });
  return total;
}
// cantos doblados: una línea fina y algo más oscura en el borde de cada cara
function folds(c, w, h) {
  c.strokeStyle = C.fold;
  c.lineWidth = 6;
  c.strokeRect(3, 3, w - 6, h - 6);
}
// faja negra que da la vuelta a toda la caja, abajo
function band(c, w, h, left, right) {
  const bh = 0.14 * PX;
  c.fillStyle = C.ink;
  c.fillRect(0, h - bh, w, bh);
  const y = h - bh / 2 + 11;
  if (left) txt(c, left, 0.06 * PX, y, { size: 30, weight: 600, track: 0.24, color: C.board });
  if (right) txt(c, right, w - 0.06 * PX, y, { size: 30, weight: 600, track: 0.24, color: C.board, align: 'right' });
}
function barcode(c, x, y, w, h, digits) {
  const seq = '3121121411312221212221431121211213114';
  let cx = x, i = 0, on = true;
  const unit = w / 95;
  c.fillStyle = C.ink;
  while (cx < x + w) {
    const n = +seq[i++ % seq.length];
    if (on) c.fillRect(cx, y, n * unit, h);
    cx += n * unit;
    on = !on;
  }
  if (digits) txt(c, digits, x + w / 2, y + h + 34, { size: 26, weight: 500, track: 0.18, align: 'center' });
}
// el arco de la ventana en píxeles de la textura del frontal
function archCanvas(c, off) {
  const X = (u) => (u + W / 2) * PX, Y = (v) => (H / 2 - v) * PX;
  const x = WX + off, b = WB - off;
  c.beginPath();
  c.moveTo(X(-x), Y(b)); c.lineTo(X(x), Y(b)); c.lineTo(X(x), Y(AC));
  c.arc(X(0), Y(AC), x * PX, 0, Math.PI, true);
  c.closePath();
}

function drawFront(c, w, h) {
  c.fillStyle = C.board; c.fillRect(0, 0, w, h);
  // marco impreso alrededor de la ventana
  archCanvas(c, 0.024);
  c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
  // cabecera
  txt(c, 'CÉSAR DEL VALLE', 0.06 * PX, 98, { size: 30, weight: 700, track: 0.24 });
  txt(c, 'SERIE 01', w - 0.06 * PX, 98, { size: 30, weight: 600, track: 0.24, color: C.mute, align: 'right' });
  // nombre y contenido bajo la ventana
  txt(c, 'César', 0.055 * PX, 1500, { size: 214, weight: 800, track: -0.045 });
  txt(c, '1 DISEÑADOR GRÁFICO', 0.064 * PX, 1572, { size: 30, weight: 600, track: 0.22, color: C.mute });
  // sello de edición
  const sx = w - 0.15 * PX, sy = 1408, sr = 92;
  c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(sx, sy, sr - 12, 0, Math.PI * 2); c.lineWidth = 1.5; c.stroke();
  txt(c, 'ED.', sx, sy - 22, { size: 26, weight: 700, track: 0.24, align: 'center' });
  txt(c, '1/1', sx, sy + 38, { size: 58, weight: 800, track: -0.02, align: 'center' });
  band(c, w, h, 'FIGURA COLECCIONABLE', 'MADRID');
  folds(c, w, h);
}

function drawBack(c, w, h) {
  c.fillStyle = C.board; c.fillRect(0, 0, w, h);
  const L = 0.08 * PX, R = w - 0.08 * PX;
  txt(c, 'SERIE 01 · ED. 1/1', L, 120, { size: 28, weight: 600, track: 0.24, color: C.mute });
  txt(c, 'César', L - 6, 290, { size: 150, weight: 800, track: -0.045 });
  txt(c, 'Diseñador gráfico en Madrid.', L, 380, { size: 44, weight: 300 });
  txt(c, 'Branding, packaging y dirección de arte.', L, 440, { size: 44, weight: 300 });
  // ficha de producto
  const rows = [['ORIGEN', 'MADRID'], ['CONTIENE', '1 DISEÑADOR GRÁFICO'], ['FORMATO', '.GLB · 1,2 MB'], ['SERIE', '01'], ['EDICIÓN', '1/1']];
  let y = 560;
  rows.forEach(([k, v]) => {
    c.fillStyle = C.line; c.fillRect(L, y, R - L, 2);
    txt(c, k, L, y + 62, { size: 28, weight: 600, track: 0.22, color: C.mute });
    txt(c, v, R, y + 62, { size: 30, weight: 600, track: 0.16, align: 'right' });
    y += 98;
  });
  c.fillStyle = C.line; c.fillRect(L, y, R - L, 2);
  txt(c, 'Le pongo cara a las cosas.', L, y + 120, { size: 46, weight: 300, color: C.ink });
  barcode(c, L, 1330, 380, 170, '8 435000 010019');
  txt(c, 'HECHO EN MADRID', R, 1420, { size: 26, weight: 700, track: 0.24, align: 'right' });
  txt(c, 'No apto para menores de 3 años.', R, 1470, { size: 26, weight: 400, color: C.mute, align: 'right' });
  band(c, w, h, 'CÉSAR DEL VALLE', 'SERIE 01');
  folds(c, w, h);
}

// laterales: el nombre en vertical, como el lomo de la caja
function side(c, w, h, bg, big, small, color) {
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2 - 0.07 * PX);
  c.rotate(-Math.PI / 2);
  txt(c, big, 0, 52, { size: 168, weight: 800, track: -0.04, color, align: 'center' });
  txt(c, small, 0, 150, { size: 30, weight: 600, track: 0.26, color, align: 'center' });
  c.restore();
}
function drawRight(c, w, h) {
  side(c, w, h, C.beige, 'César del Valle', 'FIGURA COLECCIONABLE · SERIE 01', C.ink);
  band(c, w, h, '', '01');
  folds(c, w, h);
}
function drawLeft(c, w, h) {
  side(c, w, h, C.board, 'Serie 01', 'LE PONGO CARA A LAS COSAS', C.ink);
  band(c, w, h, 'ED. 1/1', '');
  folds(c, w, h);
}
function drawTop(c, w, h) {
  c.fillStyle = C.paper; c.fillRect(0, 0, w, h);
  txt(c, 'César del Valle', w / 2, h / 2 + 20, { size: 92, weight: 800, track: -0.04, align: 'center' });
  txt(c, 'SERIE 01 · ED. 1/1', w / 2, h / 2 + 100, { size: 28, weight: 600, track: 0.26, color: C.mute, align: 'center' });
  folds(c, w, h);
}
function drawBottom(c, w, h) {
  c.fillStyle = C.board; c.fillRect(0, 0, w, h);
  txt(c, 'CdV — MADRID', w / 2, h / 2 + 12, { size: 30, weight: 600, track: 0.26, color: C.mute, align: 'center' });
  folds(c, w, h);
}
// el fondo de dentro: el número de la serie, enorme y suave, y los arcos de la ventana
function drawInsert(c, w, h) {
  c.fillStyle = C.insert; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(120, 82, 0, 0.12)'; c.lineWidth = 3;
  for (let i = 1; i <= 5; i++) {
    const r = (WX + i * 0.07) * PX;
    c.beginPath();
    c.arc(w / 2, (H / 2 - AC) * PX, r, Math.PI, 0);
    c.stroke();
  }
  txt(c, '01', w / 2, h - 30, { size: 760, weight: 800, track: -0.07, color: 'rgba(120, 82, 0, 0.1)', align: 'center' });
}

// el reflejo: textura con una franja ancha y otra fina, inclinadas, en blanco
// translúcido (se repite en horizontal y se desliza al girar)
function drawGlare() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const c = cv.getContext('2d');
  c.translate(256, 256);
  c.rotate(-0.32);
  const stripe = (x, w, a) => {
    const g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(x - w, -400, w * 2, 800);
  };
  stripe(-60, 70, 0.22);
  stripe(40, 14, 0.32);
  return cv;
}
