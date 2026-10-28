/* ============================================================
   LA PUERTA — EL LIENZO (gate-gl.js; lo usa gate.js)
   Todo lo que se ve en el <canvas> de la puerta: el muñeco en holograma
   y la pantalla de vigilancia (three.js). Corre en un worker
   (gate-worker.js, con OffscreenCanvas): así nada de lo que haga la
   página mientras tanto (preparar la home, estrenar los shaders del
   muñeco de la home, pintarla debajo) le quita un fotograma. Donde no
   hay worker con WebGL (Safari) corre en la página, igual.
   La salida es un render: al entrar, la cámara del holograma va a
   encajar justo en la del muñeco de la home (su sitio, su tamaño y su
   giro: gate.js le pasa su «view» en cada fotograma) y una línea baja de
   arriba abajo: por encima ya está la home, y al pasar por el muñeco el
   holograma se vuelve el de verdad, que está debajo en el mismo sitio.
   gate.js le cuenta lo que pasa con set() (el cursor, «ya está a
   100», lo que va de la entrada, «entra», la view) y él avisa con post():
   'on' (el lienzo ya pinta), 'glbP' (lo que ha llegado del modelo),
   'fig' (el muñeco ya está), 'cue' (dónde va el aviso, bajo los pies),
   'fail'. Cada uno lleva su reloj: las fases empiezan cuando llega el
   aviso.
   ============================================================ */
export function createGateGL(o) {
  const { THREE, GLTFLoader, canvas, DPR, mobile, REDUCE, FINE, post } = o;
  let W = o.W, H = o.H, alive = true;

  /* ---------- el estado: lo que cuenta gate.js ---------- */
  let mx = o.mx, my = o.my, mvx = 0, mvy = 0;
  let p = 0, ps = 0, vel = 0;
  let phase = 'load', buildT0 = 0, commit = false, tCommit = 0;
  // los tiempos de la salida, los mismos que en gate.js: el encaje (la
  // cámara va a la de la home) y, empezando a su 70 %, la línea del render
  const MATCH_MS = mobile ? 760 : 820, SCAN_AT = MATCH_MS * 0.7, SCAN_MS = mobile ? 980 : 1100, FADE_MS = 600;
  // lo que gira mientras entra solo: casi una vuelta; el encaje la acaba
  const ROT = REDUCE ? 0.75 : (2 * Math.PI - 0.45) / 0.78;
  const matchEase = bezier(0.22, 0.61, 0.36, 1), scanEase = bezier(0.4, 0.06, 0.32, 1);
  let fade = 1, view = null, m0 = null, psRate = 0;
  let burst = 0, nextBurst = performance.now() + 1800;
  // tl: el reloj de las fases, como en gate.js (tras un parón no salta)
  let last = performance.now(), tl = 0, yaw = 0, yawB = 0, pitch = 0, cueY = -1;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  function set(m) {
    if ('mx' in m) { mvx += m.mx - mx; mvy += m.my - my; mx = m.mx; my = m.my; }
    if ('p' in m) { vel = Math.min(1, vel + Math.abs(m.p - p) * 6); p = m.p; }
    if (m.phase === 'build' && phase === 'load') { phase = 'build'; buildT0 = tl; burst = 1; }
    if (m.commit && !commit) { commit = true; tCommit = tl; }
    // la cámara del muñeco de la home: { x, y, w, h (su caja en pantalla),
    // theta, phi, dist, target, fov } o null (no se ve: vista índice…)
    if ('view' in m) view = m.view;
  }

  /* ---------- WebGL ---------- */
  let g = null;   // listo cuando el shader de la pantalla ya está compilado
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { depthBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, W / H, 0.05, 60);
  const restCam = new THREE.PerspectiveCamera(), feet = new THREE.Vector3();
  let fig = null, box = null, target = new THREE.Vector3(0, 1, 0), dist = 4;
  const U = {
    tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(W * DPR, H * DPR) }, uTime: { value: 0 },
    uGlitch: { value: 0 }, uScan: { value: 2 }, uFade: { value: 1 }, uCalm: { value: REDUCE ? 1 : 0 }
  };
  const figU = { uTime: U.uTime, uCut: { value: -10 }, uEdge: { value: 0.05 } };
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
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
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);

  (async () => {
    // el modelo se pide ya (llega mientras compila la pantalla)
    const glb = new Promise((res, rej) => {
      new GLTFLoader().load(o.model, res, (ev) => { if (ev.total) post({ type: 'glbP', v: ev.loaded / ev.total }); }, rej);
    });
    glb.catch(() => {});
    // la pantalla: su shader se compila aparte y, ya listo, el lienzo entra
    await renderer.compileAsync(postScene, postCam);
    if (!alive) return;
    g = true;
    post({ type: 'on' });

    /* ---------- el muñeco ---------- */
    let gltf;
    try { gltf = await glb; } catch (e) { post({ type: 'fail', stage: 'fig', msg: String(e) }); return; }
    if (!alive) return;
    const f = gltf.scene, maps = new Set();
    f.traverse((m) => {
      if (!m.isMesh) return;
      const mat = m.material;
      if (mat.map) maps.add(mat.map);
      m.material = new THREE.ShaderMaterial({
        uniforms: Object.assign({ map: { value: mat.map || null }, uHasMap: { value: mat.map ? 1 : 0 }, uTint: { value: mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1) } }, figU),
        vertexShader: FIG_VERT,
        fragmentShader: FIG_FRAG,
        side: mat.side
      });
      mat.dispose();
      m.frustumCulled = false;
    });
    floatJoints(THREE, f);
    relaxArms(THREE, f);
    f.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(f, true);
    target = box.getCenter(new THREE.Vector3());
    fit();
    figU.uCut.value = box.min.y - 0.05;
    // sus shaders, también aparte (en una escena de espera), y sus texturas
    // a la tarjeta de una en una (una por fotograma). Se estrena en la
    // señal (en el glitch)
    const hold = new THREE.Scene();
    hold.add(f);
    await renderer.compileAsync(hold, camera);
    for (const t of maps) {
      await new Promise((r) => setTimeout(r, 16));
      if (!alive) return;
      renderer.initTexture(t);
    }
    scene.add(f);
    fig = f;
    post({ type: 'fig' });
  })().catch((e) => { if (alive) post({ type: 'fail', stage: g ? 'fig' : 'gl', msg: String(e) }); });

  // la distancia: el muñeco ocupa ~62 % del alto (y cabe a lo ancho en el móvil)
  function fit() {
    if (!box) return;
    const size = box.getSize(new THREE.Vector3());
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const fill = mobile ? 0.6 : 0.7;
    const byH = (size.y / 2) / (fill * Math.tan(vfov / 2));
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const byW = (size.x / 2) / (0.42 * Math.tan(hfov / 2));
    dist = Math.max(byH, byW) + size.z / 2;
  }
  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(W, H, false);
    rt.setSize(W * DPR, H * DPR);
    U.uRes.value.set(W * DPR, H * DPR);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    fit();
  }

  /* ---------- glitch: ráfagas al azar, más al moverse o bajar ---------- */
  function glitchLevel(now, dt) {
    if (REDUCE) return 0;
    if (now > nextBurst) { burst = 0.55 + Math.random() * 0.45; nextBurst = now + 2400 + Math.random() * 3800; }
    burst = Math.max(0, burst - dt * 3.2);
    const move = Math.min(1, Math.hypot(mvx, mvy) / 260);
    mvx *= 0.82; mvy *= 0.82;
    vel = Math.max(0, vel - dt * 1.6);
    return Math.min(1, burst * 0.7 + move * 0.25 + vel * 0.6);
  }

  /* ---------- un fotograma ---------- */
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000);
    last = now;
    tl += dt * 1000;
    // (lo mismo que cuenta gate.js para las frases, con su suavizado)
    const ps0 = ps;
    if (commit) p = Math.min(1, p + dt * 0.6);
    ps += (p - ps) * Math.min(1, dt * 7);
    if (dt > 0) psRate = (ps - ps0) / dt;
    /* el muñeco se construye */
    if (phase === 'build') {
      const k = Math.min(1, (tl - buildT0) / (REDUCE ? 300 : 900));
      if (box) figU.uCut.value = box.min.y - 0.05 + (box.max.y - box.min.y + 0.2) * easeOut(k);
      if (k >= 1) { phase = 'ready'; figU.uCut.value = 99; }
    }
    /* la salida: con movimiento reducido, un fundido; si no, el encaje y la línea */
    const te = commit ? tl - tCommit : -1;
    let scan = 2;
    if (commit) {
      if (REDUCE) fade = 1 - easeOut(Math.min(1, te / FADE_MS));
      else if (te >= SCAN_AT) scan = 1.04 - 1.1 * scanEase(Math.min(1, (te - SCAN_AT) / SCAN_MS));
    }
    // (al entrar se calma: con el muñeco encajando, un corte lo descolocaría)
    const glitch = glitchLevel(now, dt) * (commit ? Math.max(0, 1 - te / 300) : 1);
    if (!g) return;

    /* cámara: gira con el cursor y con lo que va de la entrada */
    const mxN = (mx / W - 0.5), myN = (my / H - 0.5);
    const base = (FINE ? mxN * 0.7 : Math.sin(now / 2600) * 0.25) + Math.sin(now / 3100) * 0.08;
    yawB += (base - yawB) * Math.min(1, dt * 3);
    pitch += ((FINE ? -myN * 0.12 : 0) - pitch) * Math.min(1, dt * 3);
    const d0 = dist * (1 - ps * 0.06), PHI0 = Math.PI / 2 - 0.12 + pitch;
    const n = camera.near;
    if (commit && view && !REDUCE) {
      /* el encaje: de donde estaba a la cámara del muñeco de la home. El
         giro sigue con la velocidad que llevaba y se posa en el suyo (por
         el lado más corto); lo demás (altura, distancia, encuadre), con la
         curva de la casa. Al acabar, las dos cámaras son la misma */
      if (!m0) m0 = { yaw, phi: PHI0, d: d0, t: target.clone(), v: ROT * psRate, k: Math.round((yaw - view.theta) / (2 * Math.PI)) };
      const sm = Math.min(1, te / MATCH_MS), e = matchEase(sm), T = MATCH_MS / 1000;
      const Y = view.theta + 2 * Math.PI * m0.k;
      const s2 = sm * sm, s3 = s2 * sm;
      yaw = (2 * s3 - 3 * s2 + 1) * m0.yaw + (s3 - 2 * s2 + sm) * m0.v * T + (3 * s2 - 2 * s3) * Y;
      const phi = m0.phi + (view.phi - m0.phi) * e, d = m0.d + (view.dist - m0.d) * e;
      const tx = m0.t.x + (view.target[0] - m0.t.x) * e, ty = m0.t.y + (view.target[1] - m0.t.y) * e, tz = m0.t.z + (view.target[2] - m0.t.z) * e;
      camera.position.set(tx + d * Math.sin(phi) * Math.sin(yaw), ty + d * Math.cos(phi), tz + d * Math.sin(phi) * Math.cos(yaw));
      camera.lookAt(tx, ty, tz);
      // el encuadre: del de la puerta (toda la pantalla) al de la caja del
      // muñeco de la home (descentrado si su caja no está en el centro)
      const t0 = n * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), a0 = W / H;
      const t1 = n * Math.tan(THREE.MathUtils.degToRad(view.fov / 2)), upp = 2 * t1 / view.h, ar = view.w / view.h;
      const L = -(t1 * ar + view.x * upp), R = t1 * ar + (W - view.x - view.w) * upp;
      const Tp = t1 + view.y * upp, B = -(t1 + (H - view.y - view.h) * upp);
      camera.projectionMatrix.makePerspective(-t0 * a0 + (L + t0 * a0) * e, t0 * a0 + (R - t0 * a0) * e, t0 + (Tp - t0) * e, -t0 + (B + t0) * e, n, camera.far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    } else {
      yaw = yawB + ps * ROT;
      camera.position.set(target.x + d0 * Math.sin(PHI0) * Math.sin(yaw), target.y + d0 * Math.cos(PHI0), target.z + d0 * Math.sin(PHI0) * Math.cos(yaw));
      camera.lookAt(target.x, target.y, target.z);
    }
    // el aviso, justo bajo los pies (con la cámara en reposo: no baila con el ratón)
    if (box && !commit) {
      restCam.copy(camera);
      restCam.position.set(target.x, target.y + d0 * Math.cos(Math.PI / 2 - 0.12), target.z + d0 * Math.sin(Math.PI / 2 - 0.12));
      restCam.lookAt(target);
      restCam.updateMatrixWorld();
      feet.set(target.x, box.min.y, target.z).project(restCam);
      const y = Math.round(Math.min(H - 72, Math.max(H * 0.55, (0.5 - feet.y * 0.5) * H + (mobile ? 18 : 26))));
      if (y !== cueY) { cueY = y; post({ type: 'cue', y }); }
    }
    U.uTime.value = now / 1000;
    U.uGlitch.value = phase === 'load' ? glitch * 0.4 : glitch;
    U.uScan.value = scan;
    U.uFade.value = fade;
    renderer.setRenderTarget(rt);
    renderer.clear();
    // mientras carga aún no se ve (se estrena en la señal)
    if (fig && phase !== 'load') renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);
  }

  function dispose() {
    alive = false;
    scene.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
    rt.dispose();
    postMat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { set, frame, resize, dispose };
}

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

/* los índices de los huesos llegan como enteros (u8): en Windows (ANGLE
   sobre D3D11) eso pide otra versión del shader, que se compila al primer
   fotograma en el hilo de la GPU y para todo (la página, el worker, la
   pantalla) un buen rato. En float sirve la que ya se compiló aparte
   (lo mismo en toon-figure.js) */
function floatJoints(THREE, root) {
  const done = new Set();
  root.traverse((m) => {
    const geo = m.geometry, a = geo && geo.getAttribute('skinIndex');
    if (!a || done.has(geo) || a.array instanceof Float32Array) return;
    done.add(geo);
    const f = new Float32Array(a.count * 4);
    for (let i = 0; i < a.count; i++) { f[i * 4] = a.getX(i); f[i * 4 + 1] = a.getY(i); f[i * 4 + 2] = a.getZ(i); f[i * 4 + 3] = a.getW(i); }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(f, 4));
  });
}

/* los brazos, un poco más cerca del cuerpo (como el muñeco de la home) */
function relaxArms(THREE, root) {
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
   barrido, trama de puntos en el fondo, grano, viñeta; y la salida: la
   línea del render, que baja. Por encima de ella, la home (transparente)
   con el brillo corto de la línea; justo por debajo, la señal se tuerce
   un poco y lo que queda de holograma junto a ella se enciende */
const POST = `
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uGlitch;
uniform float uScan;
uniform float uFade;
uniform float uCalm;
// (sin seno: con coordenadas grandes el seno pierde precisión y salen bloques)
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm3(vec2 p) { return 0.5 * noise(p) + 0.25 * noise(p * 2.03) + 0.125 * noise(p * 4.12) + 0.0625; }
void main() {
  // la línea del render (dy, en píxeles: por encima de ella, positivo)
  float on = step(uScan, 1.04);
  float dy = (vUv.y - uScan) * uRes.y;
  float lineA = on * min(1.0, exp(-dy * dy / 2.4) + 0.3 * exp(-abs(dy) / 12.0));
  vec3 lineC = vec3(0.97, 0.93, 0.86);
  // por encima ya está la home: solo el brillo de la línea
  if (on > 0.5 && dy > 1.5) { gl_FragColor = vec4(lineC * lineA, lineA); return; }
  vec2 uv = vUv;
  float g = uGlitch;
  float tq = floor(uTime * 14.0);
  float band = floor(uv.y * 34.0);
  float r = hash(vec2(band, tq));
  if (r < g * 0.32) uv.x += (hash(vec2(tq, band * 1.7)) - 0.5) * 0.09 * g;
  if (r > 1.0 - g * 0.06) uv.y += (hash(vec2(band, tq + 3.0)) - 0.5) * 0.02;
  // la estela: justo por debajo de la línea, la señal se tuerce
  float wake = on * exp(-max(-dy, 0.0) / 22.0);
  if (wake > 0.01) uv.x += (hash(vec2(floor(gl_FragCoord.y / 3.0), floor(uTime * 30.0))) - 0.5) * 0.012 * wake;
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
  // el holograma, junto al frente de la línea, se enciende
  col += sg.a * wake * vec3(0.75, 0.95, 1.0) * 0.9;
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
  // por debajo de la línea, la puerta; encima de todo, la línea
  float alpha = uFade * (1.0 - on * smoothstep(-0.8, 0.8, dy));
  gl_FragColor = vec4(lineC * lineA + col * alpha * (1.0 - lineA), lineA + alpha * (1.0 - lineA));
}`;
