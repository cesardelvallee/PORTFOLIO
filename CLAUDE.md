# CESTUDIO_PORTFOLIO

Portfolio personal de César del Valle. Sitio **estático** (HTML + CSS + JS vanilla,
sin build step). Se abre directamente o con un static server. No hay framework.

## Estructura

- `index.html` — home (hero con modelo 3D, parallax de cursor, selected work).
- `about.html` — About v2 (editorial, sección `.abx-*`).
- `contact.html` — contacto.
- `img1.html`…`img5.html` — páginas de proyecto (hero con tilt 3D + glare).
- `css/style.css` — hoja principal (~3800 líneas). `css/contact.css`, `css/dragme.css`.
- `script.js` — toda la interacción/animación (cursor, parallax, tilt, reveals, loader).
- `assets/`, `img/`, `video/`, `music/` — media.

Cómo previsualizar: servir la carpeta (`python -m http.server` o equivalente) y abrir
el `.html`. No ejecutar `npm`/`npx` salvo necesidad real; si hace falta, este entorno
usa un proxy con CA que intercepta TLS, así que exporta `NODE_OPTIONS=--use-system-ca`.

---

## Estética (no negociable)

**Minimalista beige, plano y fluido.** Editorial, neutro, con micro-interacciones que
se sienten bien. NO es el gradiente coral/teal genérico de IA.

- **Paleta** (de facto en el código, hardcodeada): beige `#c7b299` /
  `rgba(199,178,153,…)`, tinta cálida `rgba(60,50,38,…)`, fondos crema/neutros.
  Páginas de proyecto añaden acentos propios (verde `#2d4a1f`, oro `#d4a947`) por
  proyecto. About v2 es la excepción deliberada: editorial oscuro (`#100f0d`).
- **Plano**: nada de gradientes decorativos, ni sombras pesadas tipo "card de IA".
  Sombras solo si son sutiles y justificadas (p. ej. `drop-shadow` del producto).
- **Tipografía**: Inter. Contraste de pesos (200 ligero ↔ 800 display), tracking
  negativo en titulares grandes (`-0.03em`…`-0.05em`).
- **Transiciones fluidas y micro-interacciones**: todo estado tiene transición; los
  hovers responden; la página entra/sale sin saltos. La curva de la casa es un
  ease-out fuerte: `cubic-bezier(0.22, 0.61, 0.36, 1)`.

Antes de añadir UI nueva, hazla parecer parte de este sistema: misma curva, mismas
densidades de color, mismos pesos tipográficos. Si algo necesita un gradiente o una
sombra grande para verse bien, probablemente no encaja.

---

## Filosofía de Design Engineering (Emil Kowalski)

Cada sesión aplica esto. Detalle = producto. (Skills: `emil-design-eng`,
`review-animations`.)

- **El gusto se entrena.** No es preferencia: es reconocer qué eleva una interfaz.
  Estudia por qué lo bueno se siente bien; ingeniería inversa de las interacciones.
- **Los detalles invisibles se acumulan.** Lo que el usuario no nota conscientemente
  es justo el objetivo. La corrección invisible agregada es lo que hace que algo
  "se sienta bien".
- **La belleza es palanca.** La gente elige herramientas por la experiencia completa,
  no solo por la función. Buenos defaults + buenas animaciones diferencian.

### Reglas de animación (el listón)

Aplícalas al escribir o revisar movimiento. Catálogo completo en
`.claude/skills/review-animations/STANDARDS.md`.

1. **Movimiento justificado.** Cada animación responde "¿por qué se mueve?"
   (consistencia espacial, estado, feedback, explicación, evitar saltos). "Se ve cool"
   en algo que se ve a diario = eliminar.
2. **Según frecuencia.** Acciones 100+/día o por teclado: **sin** animación. Decenas/día:
   reducir. Ocasional (modal/drawer): estándar. Raro/primera vez: puede deleitar.
3. **Easing responsivo.** Entradas/salidas → `ease-out` o curva fuerte. **Nunca
   `ease-in` en UI** (retrasa el momento que el usuario mira). Las curvas nativas son
   débiles; usa la curva de la casa `cubic-bezier(0.22, 0.61, 0.36, 1)`.
4. **UI < 300ms.** Botón 100–160ms · tooltip 125–200ms · dropdown 150–250ms ·
   modal/drawer 200–500ms. Marketing/explicativo puede ser más largo (heroes, reveals).
5. **Origen y física.** Popovers/dropdowns escalan desde su trigger
   (`transform-origin`), no del centro. **Nunca `scale(0)`** — parte de
   `scale(0.95)` + `opacity:0`. Los modales sí van centrados.
6. **Interrumpible.** Lo que se dispara rápido o por gesto (toasts, toggles, drag) usa
   transiciones/springs que reapuntan desde el estado actual, no keyframes que
   reinician en cero.
7. **Solo GPU.** Anima **únicamente `transform` y `opacity`**. Animar
   `width/height/margin/padding/top/left` es un hallazgo de rendimiento. No conduzcas
   transforms de hijos vía variable CSS del padre (recalc en cascada); pon el
   `transform` directo en el elemento.
8. **Accesibilidad.** Respeta `prefers-reduced-motion` siendo **más suave, no cero**
   (conserva opacidad/color, quita desplazamiento). Gatea hover tras
   `@media (hover: hover) and (pointer: fine)` (el táctil dispara hovers falsos).
9. **Tiempos asimétricos.** Acciones deliberadas (press, hold) más lentas; la respuesta
   del sistema, instantánea.
10. **Cohesión.** El movimiento coincide con la personalidad del componente y del resto
    del sitio. Ante la duda, el movimiento más fuerte suele ser **borrarlo**.

### Curvas y valores de la casa

```css
--ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);   /* curva principal: entradas, reveals, hovers */
/* press feedback: transform: scale(0.97) en :active, ~160ms ease-out */
/* stagger de grupos: 30–80ms entre items (aquí se usa 80ms en reveals) */
```

Prefiere CSS (`transition`, `@starting-style`, WAAPI) para movimiento predeterminado;
JS/springs solo para lo dinámico/interrumpible/gestual. CSS gana a JS bajo carga.

---

## Convenciones de este repo

- Comentarios en español (como el código existente). Mantén el tono.
- `script.js` está organizado en IIFEs por feature con cabeceras de bloque en
  comentarios; sigue ese patrón al añadir interacción.
- Cursor: el sitio oculta el cursor nativo (`cursor: none`) y usa `#egg-cursor` +
  `#cursor-ring` (halo). Si tocas el cursor, recuerda que ya hay dos seguidores.
- Reduced motion / táctil: toda animación nueva debe degradar bien en ambos.
