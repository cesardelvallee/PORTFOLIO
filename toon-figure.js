/* ============================================================
   EL MUÑECO DE LA HOME, DIBUJADO (toon-figure.js, módulo)
   <toon-figure src="assets/CESAR_3D.glb"> sustituye al <model-viewer>
   de la home: el mismo modelo pintado como una ilustración, igual que el
   tocadiscos (toon shading): cada material en tres tonos planos (luz,
   medio, sombra) sobre su textura, sin reflejos, y un contorno de tinta
   cálida de grosor fijo en pantalla.
   Entiende lo mismo que el visor al que sustituye, así script.js no
   cambia de lógica:
   · camera-orbit="Xdeg 78deg auto": el giro (en escritorio lo lleva el
     cursor, script.js)
   · auto-rotate: gira solo (en táctil); script.js lo quita mientras se
     reparten o se tocan las cards
   · evento 'load' cuando el modelo ya está pintado
   Solo pinta cuando algo cambia. Three.js es el mismo módulo que usa el
   tocadiscos (import map de index.html).
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHI = 78 * Math.PI / 180;           // la cámara, 12° por encima del horizonte (como antes)
const SPIN = 32 * Math.PI / 180;          // giro solo: 32°/s, el de model-viewer
const FILL = 0.94;                        // alto del muñeco en su caja (como antes)
const INK = 0x2a2019;                     // la tinta: la del tocadiscos

// las tres bandas de luz (sombra, medio, luz), con salto y sin degradado.
// Más suaves que las del tocadiscos: en una cara, una sombra muy oscura
// parece una mancha
const bands = new Uint8Array([148, 210, 255]);
const gradientMap = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

/* el trazo: la pieza del revés, hinchada en pantalla a lo largo de sus
   normales (suavizadas, para que no se abra en las aristas) un número
   fijo de píxeles. Sigue al esqueleto del modelo (está "posado" sobre él).
   Va un poco por detrás (en profundidad): en las zonas hundidas (ojos,
   boca) el trazo asomaba por delante de la piel; así solo queda en la
   silueta. */
function inkMaterial(px, res) {
  return new THREE.ShaderMaterial({
    uniforms: { px: px, res: res, color: { value: new THREE.Color(INK) } },
    vertexShader: [
      '#include <common>',
      '#include <skinning_pars_vertex>',
      'attribute vec3 smoothNormal;',
      'uniform float px;',
      'uniform vec2 res;',
      'void main() {',
      '  vec3 objectNormal = smoothNormal;',
      '  #include <skinbase_vertex>',
      '  #include <skinnormal_vertex>',
      '  vec3 transformed = vec3(position);',
      '  #include <skinning_vertex>',
      '  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);',
      '  mv.z -= 0.025;',
      '  vec4 clip = projectionMatrix * mv;',
      '  vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * objectNormal), 0.0)).xy * res;',
      '  float l = length(d);',
      '  if (l > 1e-5) clip.xy += d / l * px * 2.0 / res * clip.w;',
      '  gl_Position = clip;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 color;',
      'void main() {',
      '  gl_FragColor = vec4(color, 1.0);',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    side: THREE.BackSide
  });
}
function smoothNormals(geo) {
  if (geo.getAttribute('smoothNormal')) return geo;
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
  const acc = new Map(), out = new Float32Array(pos.count * 3);
  const keyOf = (i) => Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
  for (let i = 0; i < pos.count; i++) {
    const k = keyOf(i);
    let a = acc.get(k);
    if (!a) acc.set(k, (a = [0, 0, 0]));
    a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i);
  }
  for (let i = 0; i < pos.count; i++) {
    const a = acc.get(keyOf(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute('smoothNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}
// piezas sin trazo: los ojos y los dientes van dentro de la cabeza
const NO_INK = /eye|teeth/i;

/* colores de dibujo: las texturas del avatar traen arrugas y sombras
   pintadas (son de foto). Cada material se acerca a su color medio:
   mucho en la ropa (queda plana, como pintada), poco en la cara (los
   rasgos se siguen leyendo). */
const FLAT = [[/outfit_top/i, 0.62], [/outfit_bottom/i, 0.72], [/footwear/i, 0.6], [/hair/i, 0.45], [/head|body|skin/i, 0.22]];
function flatness(name) { for (const [re, k] of FLAT) if (re.test(name)) return k; return 0; }
function averageColor(tex) {
  const img = tex && tex.image;
  if (!img) return null;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
  } catch (e) { return null; }
}
/* la ropa, más clara de noche: sobre el fondo oscuro, el jersey azul
   noche y el vaquero negro desaparecían. En el modo oscuro cambian a
   tonos de la paleta (arena y piedra) conservando el claroscuro de su
   tela; de día vuelven a los suyos. El cambio se funde (tintOn, 0 → 1). */
const NIGHT = [[/outfit_top/i, 0xb9a689], [/outfit_bottom/i, 0x6c6457]];
function nightColor(name) { for (const [re, c] of NIGHT) if (re.test(name)) return new THREE.Color(c); return null; }
const tintOn = { value: 0 };
function flatten(material, avg, k, night) {
  if (!avg) return;
  material.onBeforeCompile = (sh) => {
    sh.uniforms.flatColor = { value: avg };
    sh.uniforms.flatK = { value: k };
    sh.uniforms.nightColor = { value: night || new THREE.Color() };
    sh.uniforms.tintOn = night ? tintOn : { value: 0 };
    sh.fragmentShader = 'uniform vec3 flatColor;\nuniform float flatK;\nuniform vec3 nightColor;\nuniform float tintOn;\n' + sh.fragmentShader.replace(
      '#include <map_fragment>',
      [
        '#include <map_fragment>',
        '  vec3 texC = diffuseColor.rgb;',
        '  diffuseColor.rgb = mix(texC, flatColor * diffuse, flatK);',
        // el claroscuro de la tela (luz de cada punto frente a la media), sobre el color de noche
        '  float lumT = dot(texC, vec3(0.2126, 0.7152, 0.0722));',
        '  float lumA = max(dot(flatColor * diffuse, vec3(0.2126, 0.7152, 0.0722)), 1e-4);',
        '  vec3 nightC = nightColor * mix(1.0, clamp(lumT / lumA, 0.45, 1.7), 1.0 - flatK);',
        '  diffuseColor.rgb = mix(diffuseColor.rgb, nightC, tintOn);'
      ].join('\n')
    );
  };
  material.customProgramCacheKey = () => 'flat' + k + (night ? 'n' : '');
}
function isNight() { return !document.body.classList.contains('theme-light'); }

class ToonFigure extends HTMLElement {
  static get observedAttributes() { return ['camera-orbit', 'auto-rotate']; }

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.theta = this._orbit();
    this.auto = this.hasAttribute('auto-rotate') && !REDUCE;
    this.raf = 0;
    this.last = 0;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    this.appendChild(canvas);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { console.warn('Muñeco 3D no disponible:', e); return; }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    /* la luz es la del estudio, no la del muñeco: está quieta respecto a
       quien mira (arriba a la izquierda, y un contraluz suave detrás a la
       derecha) y el muñeco gira debajo de ella. Así, al girar, las bandas
       de luz y sombra recorren el cuerpo (_place recoloca las luces).
       Solo bandas planas, de dibujo: sin sombras proyectadas (ni en el
       suelo ni de una pieza sobre otra). */
    this.scene.add(new THREE.HemisphereLight(0xfff6ea, 0x7a6b58, 0.95));
    const key = new THREE.DirectionalLight(0xfff3e4, 2.25);
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xffe9cf, 0.6);
    this.scene.add(rim, rim.target);
    this.key = key;
    this.rim = rim;

    this.px = { value: 1.6 };
    this.res = { value: new THREE.Vector2(1, 1) };
    this._resize();
    new ResizeObserver(() => { this._resize(); this.kick(); }).observe(this);

    new GLTFLoader().load(this.getAttribute('src'), (gltf) => {
      const root = gltf.scene;
      const outlines = [];
      root.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        o.material = new THREE.MeshToonMaterial({
          map: m.map || null,
          color: m.color ? m.color.clone() : 0xffffff,
          gradientMap: gradientMap,
          side: m.side,
          transparent: m.transparent,
          alphaTest: m.alphaTest
        });
        o.material.name = m.name || o.name;
        flatten(o.material, averageColor(m.map), flatness(o.material.name), nightColor(o.material.name));
        m.dispose();
        o.frustumCulled = false;
        if (!NO_INK.test(o.name)) outlines.push(o);
      });
      const ink = inkMaterial(this.px, this.res);
      outlines.forEach((o) => {
        const geo = smoothNormals(o.geometry);
        const line = o.isSkinnedMesh ? new THREE.SkinnedMesh(geo, ink) : new THREE.Mesh(geo, ink);
        if (o.isSkinnedMesh) { line.bind(o.skeleton, o.bindMatrix); line.bindMode = o.bindMode; }
        line.position.copy(o.position); line.quaternion.copy(o.quaternion); line.scale.copy(o.scale);
        line.frustumCulled = false;
        o.parent.add(line);
      });
      this.scene.add(root);
      root.updateMatrixWorld(true);
      // encuadre: el centro de la caja del muñeco, a la distancia en la que
      // ocupa lo mismo que en el visor de antes
      const box = new THREE.Box3().setFromObject(root, true);
      this.target = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      this.dist = (size.y / 2) / (FILL * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) + size.z / 2;
      this.loaded = true;
      tintOn.value = isNight() ? 1 : 0;
      new MutationObserver(() => this._theme()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      this._place();
      renderer.render(this.scene, this.camera);
      this.dispatchEvent(new Event('load'));
      this.kick();
    }, undefined, (err) => console.warn('Muñeco 3D no disponible:', err));
  }

  attributeChangedCallback(name) {
    if (!this._ready) return;
    if (name === 'camera-orbit') this.theta = this._orbit();
    if (name === 'auto-rotate') this.auto = this.hasAttribute('auto-rotate') && !REDUCE;
    this.kick();
  }

  // de un tema al otro, la ropa se funde en 0.6 s (con la curva de la casa)
  _theme() {
    const to = isNight() ? 1 : 0;
    if (this.tintTo === to) return;
    this.tintTo = to;
    if (REDUCE) { tintOn.value = to; this.dirty = true; this.kick(); return; }
    this.tint = { from: tintOn.value, to: to, t0: performance.now() };
    this.kick();
  }

  // "Xdeg 78deg auto" → X en radianes (solo se usa el giro horizontal)
  _orbit() {
    const m = /(-?[\d.]+)deg/.exec(this.getAttribute('camera-orbit') || '');
    return m ? parseFloat(m[1]) * Math.PI / 180 : (this.theta || 0);
  }
  _resize() {
    const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const dpr = this.renderer.getPixelRatio();
    this.res.value.set(w * dpr, h * dpr);
    this.px.value = 1.6 * dpr;
    this.dirty = true;
  }
  _place() {
    const t = this.theta, c = this.camera, d = this.dist;
    c.position.set(
      this.target.x + d * Math.sin(PHI) * Math.sin(t),
      this.target.y + d * Math.cos(PHI),
      this.target.z + d * Math.sin(PHI) * Math.cos(t)
    );
    c.lookAt(this.target);
    // las luces, fijas respecto a la cámara: arriba a la izquierda y por
    // delante (la principal); detrás a la derecha (el contraluz)
    if (this.key) {
      c.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0);
      const up = new THREE.Vector3(0, 1, 0);
      const back = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 2);   // de la figura hacia la cámara
      back.y = 0; back.normalize();
      const at = (r, u, b) => this.target.clone().addScaledVector(right, r).addScaledVector(up, u).addScaledVector(back, b);
      this.key.position.copy(at(-1.8, 4.4, 2.8));
      this.key.target.position.copy(this.target);
      this.rim.position.copy(at(2.6, 1.6, -2.8));
      this.rim.target.position.copy(this.target);
      this.key.target.updateMatrixWorld();
      this.rim.target.updateMatrixWorld();
    }
  }
  kick() {
    if (this.raf || !this.loaded) return;
    this.raf = requestAnimationFrame((now) => this._frame(now));
  }
  _frame(now) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.auto) this.theta += SPIN * dt;
    if (this.tint) {
      const p = Math.min(1, (now - this.tint.t0) / 600);
      const e = 1 - Math.pow(1 - p, 3);
      tintOn.value = this.tint.from + (this.tint.to - this.tint.from) * e;
      this.dirty = true;
      if (p >= 1) this.tint = null;
    }
    if (this.drawn !== this.theta || this.dirty) {
      this._place();
      this.renderer.render(this.scene, this.camera);
      this.drawn = this.theta;
      this.dirty = false;
    }
    if (this.auto || this.tint) this.raf = requestAnimationFrame((n) => this._frame(n));
    else this.last = 0;
  }
}
customElements.define('toon-figure', ToonFigure);
