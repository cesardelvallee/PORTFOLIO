/* ============================================================
   LA PUERTA — EL WORKER DEL LIENZO (gate-worker.js, módulo)
   Pinta gate-gl.js en el OffscreenCanvas que le pasa gate.js, fuera del
   hilo de la página: aunque la página esté ocupada, el muñeco, el
   glitch y la banda no se paran. Three.js, el mismo archivo que usa la
   página (import map de index.html; aquí no hay import map: va la URL).
   Avisa 'hello' al estar cargado; gate.js le pasa entonces el lienzo.
   ============================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { createGateGL } from './gate-gl.js?v=7';

let gl = null;
const next = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(() => f(performance.now()), 16);
function tick(now) {
  if (!gl) return;
  next(tick);
  try { gl.frame(now); } catch (e) { self.postMessage({ type: 'fail', stage: 'frame', msg: String(e) }); gl = null; }
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      gl = createGateGL(Object.assign({ THREE, GLTFLoader, post: (msg) => self.postMessage(msg) }, m));
    } catch (err) { self.postMessage({ type: 'fail', stage: 'gl', msg: String(err) }); return; }
    next(tick);
  } else if (!gl) {
    if (m.type === 'dispose') self.close();
  } else if (m.type === 'set') gl.set(m);
  else if (m.type === 'resize') gl.resize(m.W, m.H);
  else if (m.type === 'dispose') { gl.dispose(); gl = null; self.close(); }
};
self.postMessage({ type: 'hello' });
