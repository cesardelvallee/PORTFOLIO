/* ============================================================
   ARCADE (solo en la home) — tres minijuegos en el mismo modal. Al abrir,
   un menú para elegir: Break Time, Egg Ninja y Snake. Cada uno con su
   inicio (tu nombre + su top 3), su partida y su fin (puntuación + top 3).
   Comparten el modal, el sonido, los colores y el ranking (una colección
   de Firestore por juego). Los motores de Egg Ninja y Snake están más
   abajo (bloque «LOS OTROS DOS JUEGOS»); lo que sigue es Break Time.

   BREAK TIME. Al estilo de BBTAN: apuntas, sueltas, y una ráfaga con todas tus bolas
   rebota por el tablero restando 1 a cada bloque que toca. Cuando vuelven,
   todo baja una fila y entra otra nueva cuyos bloques aguantan tantos
   golpes como la ronda (1, 2, 3…). Cada +1 que tocas es una bola más para
   la siguiente tirada; si un bloque llega abajo, se acabó y tu puntuación
   es la ronda a la que has llegado.
   · Se abre en un modal desde la consolita que hay junto al reproductor
     (su pantalla muestra una partida en miniatura; el juego crece desde
     ella al abrir y vuelve a meterse al cerrar): pones tu nombre, juegas
     y al perder sale el top 3.
   · Filas al azar (unas casi vacías, otras llenas, algunas «de respiro»)
     y, si el tablero se llena, las siguientes vienen más ligeras: la
     partida no se convierte en un muro. Bloques cuadrados y triangulares
     (desvían en diagonal), con golpes variados y alguno doble.
   · Objetos: +1 (una bola más), láser horizontal / vertical / en cruz
     (golpea su fila, su columna o las dos), rebote (desvía la bola al
     azar) y bomba (revienta lo que la rodea). Si una ronda se alarga, se
     acelera sola y aparece «Recoger».
   · Monedas: salen de vez en cuando; se guardan en el dispositivo y en la
     tienda se cambian por bolas nuevas (la bola César, con la forma del
     logo de la cabecera, cuesta 20).
   · Ranking global en Firebase (Firestore por su API REST, sin SDK).
     Mientras FIREBASE esté vacío, o si no hay red, ranking local.
   · Canvas 2D con la física a paso fijo (240 Hz): ninguna bola atraviesa
     un bloque por rápido que vaya.
   · Ratón (apuntar y clic), dedo (arrastrar hacia abajo y soltar, como un
     tirachinas) o teclado (← → y espacio). Sigue el tema día / noche y
     respeta reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  /* Ranking global (Firestore). Basta con el ID del proyecto de Firebase;
     apiKey es opcional (las reglas de Firestore son las que protegen los
     datos). Vacío = ranking local, en el navegador de cada uno. */
  const FIREBASE = { projectId: 'break-time-4b68f', apiKey: '' };

  const trigger = document.querySelector('.gb');
  if (!trigger) return;

  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const REDUCE = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const STEP = 1 / 240;
  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado: sin memoria */ } },
  };
  /* los tres juegos: nombre, textos y dónde se guardan sus puntuaciones */
  const GAMES = {
    bbtan: {
      name: 'Break Time', title: ['Break', 'Time'], label: 'Ronda', units: 'Rondas',
      coll: 'scores', local: 'cdv_bbtan_scores', best: 'cdv_bbtan_best',
      desc: 'Apunta, suelta la ráfaga y rompe los bloques antes de que lleguen abajo.',
      how: FINE
        ? 'Un respiro entre proyecto y proyecto. Apunta con el ratón y haz clic: sale una ráfaga con todas tus bolas. Cada golpe resta 1 al bloque y cada <b>+1</b> que tocas es una bola más. Si un bloque llega abajo, se acabó. Las <b>monedas</b> se guardan para la tienda.<span class="bk-keys">← → para afinar · Espacio lanza · P pausa</span>'
        : 'Un respiro entre proyecto y proyecto. Arrastra el dedo <b>hacia abajo</b> para apuntar (como un tirachinas) y suelta. Cada golpe resta 1 al bloque y cada <b>+1</b> es una bola más. Si un bloque llega abajo, se acabó. Las <b>monedas</b> se guardan para la tienda.',
      hint: FINE ? 'Apunta y haz clic' : 'Arrastra hacia abajo y suelta',
      aria: 'Tablero: apunta y lanza las bolas contra los bloques',
    },
    egg: {
      name: 'Egg Ninja', title: ['Egg', 'Ninja'], label: 'Puntos', units: 'Puntos',
      coll: 'scores_egg', local: 'cdv_egg_scores', best: 'cdv_egg_best',
      desc: 'Corta los huevos al vuelo. Ni se te ocurra tocar las bombas.',
      how: FINE
        ? 'Pasa el ratón <b>deprisa</b> por encima de los huevos para cortarlos (no hace falta hacer clic). Tres o más de un tajo, combo. Los <b>dorados</b> valen 5. Si se te escapan tres huevos, o cortas una <b>bomba</b>, se acabó.<span class="bk-keys">P pausa</span>'
        : 'Desliza el dedo por los huevos para cortarlos. Tres o más de un tajo, combo. Los <b>dorados</b> valen 5. Si se te escapan tres huevos, o cortas una <b>bomba</b>, se acabó.',
      hint: FINE ? 'Pasa el ratón deprisa para cortar' : 'Desliza para cortar',
      aria: 'Tablero: corta los huevos que saltan sin tocar las bombas',
    },
    snake: {
      name: 'Snake', title: ['Snake'], label: 'Puntos', units: 'Puntos',
      coll: 'scores_snake', local: 'cdv_snake_scores', best: 'cdv_snake_best',
      desc: 'El clásico: come café, crece y no te muerdas la cola.',
      how: FINE
        ? 'Muévete con las <b>flechas</b> (o WASD) y come granos de café para crecer. Cada vez vas más rápido. Las <b>estrellas</b> valen 5, pero se van. Si chocas con el borde o contigo mismo, se acabó.<span class="bk-keys">Flechas / WASD · P pausa</span>'
        : 'Desliza el dedo hacia donde quieras ir y come granos de café para crecer. Cada vez vas más rápido. Las <b>estrellas</b> valen 5, pero se van. Si chocas con el borde o contigo mismo, se acabó.',
      hint: FINE ? 'Pulsa una flecha para empezar' : 'Desliza para empezar',
      aria: 'Tablero: guía a la serpiente hasta los granos de café',
    },
  };


  /* ---------- ranking: Firestore por REST, o local ---------- */
  const Board = (() => {
    const on = !!FIREBASE.projectId;
    const qs = FIREBASE.apiKey ? '?key=' + encodeURIComponent(FIREBASE.apiKey) : '';
    let warned = false;
    const base = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FIREBASE.projectId)
      + '/databases/(default)/documents';
    function post(path, body) {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = setTimeout(() => { if (ctl) ctl.abort(); }, 7000);
      return fetch(base + path + qs, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctl ? ctl.signal : undefined,
      }).then(r => {
        clearTimeout(t);
        if (!r.ok) {
          // una vez, para depurar: 403 = reglas de Firestore; 404 = ID mal o base de datos sin crear
          if (!warned) { warned = true; console.warn('[Arcade] Firestore respondió ' + r.status + ': se usa el ranking local.'); }
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      }, e => { clearTimeout(t); throw e; });
    }
    const localAll = (g) => { try { return JSON.parse(store.get(GAMES[g].local)) || []; } catch (e) { return []; } };
    function localAdd(name, score, g) {
      const l = localAll(g);
      l.push({ name, score });
      l.sort((a, b) => b.score - a.score);
      store.set(GAMES[g].local, JSON.stringify(l.slice(0, 50)));
    }
    async function top(n, g) {
      if (on) {
        try {
          const res = await post(':runQuery', { structuredQuery: {
            from: [{ collectionId: GAMES[g].coll }],
            orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
            limit: n,
          } });
          const rows = (Array.isArray(res) ? res : []).filter(r => r.document && r.document.fields).map(r => {
            const f = r.document.fields;
            return { name: String((f.name && f.name.stringValue) || '—'), score: +((f.score && f.score.integerValue) || 0) };
          });
          return { scope: 'global', rows };
        } catch (e) { /* sin red o sin permiso: el local */ }
      }
      return { scope: on ? 'offline' : 'local', rows: localAll(g).slice(0, n) };
    }
    async function count(where, g) {
      const q = { from: [{ collectionId: GAMES[g].coll }] };
      if (where) q.where = where;
      const res = await post(':runAggregationQuery', {
        structuredAggregationQuery: { structuredQuery: q, aggregations: [{ alias: 'n', count: {} }] },
      });
      const f = res && res[0] && res[0].result && res[0].result.aggregateFields;
      return f && f.n ? +f.n.integerValue : 0;
    }
    async function submit(name, score, g) {
      localAdd(name, score, g);
      if (!on) return 'local';
      try {
        await post('/' + GAMES[g].coll, { fields: { name: { stringValue: name }, score: { integerValue: String(score) } } });
        return 'global';
      } catch (e) { return 'offline'; }
    }
    async function rank(score, scope, g) {
      if (scope === 'global') {
        try {
          const gt = { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: { integerValue: String(score) } } };
          const [above, total] = await Promise.all([count(gt, g), count(null, g)]);
          return { pos: above + 1, total: Math.max(total, above + 1) };
        } catch (e) { /* cae al local */ }
      }
      const l = localAll(g);
      return { pos: l.filter(x => x.score > score).length + 1, total: Math.max(1, l.length) };
    }
    return { on, top, submit, rank };
  })();


  /* ---------- sonido: sintetizado (WebAudio), sin archivos ---------- */
  const Sfx = (() => {
    let ac = null, out = null;
    let muted = store.get('cdv_bk_mute') === '1';
    let lastHit = 0, lastBrk = 0;
    const VOL = 0.2;
    function init() {
      try {
        if (!ac) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ac = new AC();
          out = ac.createGain();
          out.gain.value = muted ? 0 : VOL;
          out.connect(ac.destination);
        }
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { ac = null; }
    }
    function tone(f, d, type, v, at, f2) {
      if (!ac || muted) return;
      const t = ac.currentTime + (at || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + d + 0.03);
    }
    // cada bloque roto en la misma ronda sube un paso de la escala pentatónica
    const PENTA = [0, 2, 4, 7, 9];
    const note = i => 523.25 * Math.pow(2, (PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
    // con muchas bolas a la vez, como mucho un golpe cada 30 ms (si no, satura)
    const free = (last, gap) => ac && !muted && ac.currentTime - last > gap;
    return {
      init,
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        store.set('cdv_bk_mute', muted ? '1' : '0');
        if (out) out.gain.value = muted ? 0 : VOL;
        return muted;
      },
      shoot() { tone(260, 0.12, 'triangle', 0.3, 0, 620); },
      hit() { if (!free(lastHit, 0.03)) return; lastHit = ac.currentTime; tone(480 + Math.random() * 120, 0.04, 'triangle', 0.16); },
      brk(n) {
        if (!free(lastBrk, 0.02)) return;
        lastBrk = ac.currentTime;
        const f = note(Math.min(n - 1, 14));
        tone(f, 0.14, 'triangle', 0.4);
        tone(f * 2, 0.05, 'square', 0.035);
      },
      plus() { [0, 7, 12].forEach((s, i) => tone(784 * Math.pow(2, s / 12), 0.1, 'triangle', 0.3, i * 0.045)); },
      laser() { tone(1400, 0.16, 'sawtooth', 0.06, 0, 260); },
      scatter() { tone(640, 0.09, 'triangle', 0.22, 0, 1500); },
      bomb() { tone(160, 0.42, 'sawtooth', 0.2, 0, 38); tone(90, 0.5, 'triangle', 0.45, 0.01, 45); },
      shift() { tone(140, 0.16, 'sine', 0.35, 0, 90); },
      coin() { tone(1318.5, 0.06, 'triangle', 0.3); tone(1975.5, 0.2, 'triangle', 0.24, 0.06); },
      buy() { [0, 4, 7, 11, 14].forEach((q, i) => tone(659.25 * Math.pow(2, q / 12), 0.14, 'triangle', 0.32, i * 0.055)); },
      record() { [0, 4, 7, 12].forEach((s, i) => tone(523.25 * Math.pow(2, s / 12), 0.18, 'triangle', 0.35, i * 0.07)); },
      over() { tone(262, 0.25, 'triangle', 0.35); tone(196, 0.5, 'triangle', 0.35, 0.22); },
      // Egg Ninja: el tajo (un silbido) y la nota del combo; el huevo que se escapa
      slice(n) {
        if (!free(lastBrk, 0.02)) return;
        lastBrk = ac.currentTime;
        tone(1100 + Math.random() * 200, 0.07, 'sawtooth', 0.045, 0, 300);
        tone(note(Math.min(n - 1, 14)), 0.13, 'triangle', 0.32, 0.015);
      },
      miss() { tone(330, 0.24, 'square', 0.06, 0, 120); },
    };
  })();


  /* ---------- monedas y bolas: se guardan en el dispositivo ---------- */
  const SKINS = [
    { id: 'classic', name: 'Clásica', price: 0 },
    { id: 'logo', name: 'César', price: 20 },
  ];
  const Wallet = (() => {
    const v = parseInt(store.get('cdv_bbtan_coins'), 10);
    let coins = isFinite(v) && v > 0 ? v : 0;
    let owned;
    try { owned = JSON.parse(store.get('cdv_bbtan_owned')) || []; } catch (e) { owned = []; }
    if (owned.indexOf('classic') === -1) owned.unshift('classic');
    let skin = store.get('cdv_bbtan_skin') || 'classic';
    if (owned.indexOf(skin) === -1) skin = 'classic';
    const save = () => {
      store.set('cdv_bbtan_coins', String(coins));
      store.set('cdv_bbtan_owned', JSON.stringify(owned));
      store.set('cdv_bbtan_skin', skin);
    };
    return {
      get coins() { return coins; },
      get skin() { return skin; },
      owns: id => owned.indexOf(id) !== -1,
      add(k) { coins += k; save(); },
      buy(sk) {
        if (owned.indexOf(sk.id) !== -1 || coins < sk.price) return false;
        coins -= sk.price;
        owned.push(sk.id);
        skin = sk.id;
        save();
        return true;
      },
      use(id) { if (owned.indexOf(id) !== -1) { skin = id; save(); } },
    };
  })();
  // la primera bola que ya te puedes comprar (o null)
  const affordable = () => SKINS.find(sk => !Wallet.owns(sk.id) && Wallet.coins >= sk.price) || null;


  /* ---------- reglas ---------- */
  const COLS = 7, ROWS = 10;     // 7 columnas; la última fila ya toca el suelo: si un bloque llega ahí, se acabó
  const MIN_A = 0.14;            // ángulo mínimo sobre la horizontal (~8°): nada de tiros planos
  const GAP_T = 0.065;           // segundos entre bola y bola de la ráfaga

  // nombres: lo justo para no ensuciar el ranking de un portfolio
  const RUDE = ['puta', 'puto', 'mierda', 'polla', 'joder', 'cabron', 'gilipollas', 'maricon', 'zorra',
    'fuck', 'shit', 'bitch', 'nazi', 'hitler'];
  function cleanName(s) {
    return (s || '').normalize('NFC')
      .replace(/[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ ._-]/g, '')
      .replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 12);
  }
  function rude(s) {
    const t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
      .replace(/[^a-z]/g, '');
    return RUDE.some(w => t.indexOf(w) !== -1);
  }


  /* ---------- estado ---------- */
  let root, panel, stage, cv, ctx;
  const ui = {};
  let built = false, opened = false, raf = 0, last = 0, token = 0, lastFocus = null;
  let W = 0, H = 0, DPR = 1, narrow = false;
  let cell = 0, gx = 0, gy = 0, floorY = 0, br = 5, speed = 600;
  let state = 'idle', prevState = 'aim', shiftT = 0, doomed = false;
  let round = 1, ballsN = 1, gained = 0, broken = 0, brokeRound = 0, best = 0, bestToast = false, coinsGame = 0;
  let screenNow = null, shopFrom = 'start', shownCoins = 0;
  let items = [], at = [];
  const shooter = { x: 0, nx: null };
  let balls = [], toFire = 0, fireT = 0, dirX = 0, dirY = -1, flyT = 0, tscale = 1, landed = 0;
  const aim = { on: false, a: Math.PI / 2, press: false, kind: '', sx: 0, sy: 0, mx: null, my: null };
  let parts = [], pops = [], beams = [], waves = [], shake = 0;
  let playerName = cleanName(store.get('cdv_bk_name') || '');
  const keys = { l: 0, r: 0 };
  let COL = {}, LIGHT = [0, 0, 0], DARK = [0, 0, 0];
  const PLAYING = { aim: 1, fly: 1, shift: 1, play: 1, ready: 1 };
  // el juego elegido (null en el menú) y, si no es Break Time, su motor
  let game = null, E = null, recToast = false;


  /* ---------- modal ---------- */
  const ICON_ON = '<svg class="bk-on" viewBox="0 0 16 16"><path d="M2.5 6h2.6L8.5 3v10L5.1 10H2.5z"/><path d="M11 5.6c.85.65 1.35 1.5 1.35 2.4s-.5 1.75-1.35 2.4M12.9 3.7c1.45 1.1 2.25 2.6 2.25 4.3s-.8 3.2-2.25 4.3"/></svg>';
  const ICON_OFF = '<svg class="bk-off" viewBox="0 0 16 16"><path d="M2.5 6h2.6L8.5 3v10L5.1 10H2.5z"/><path d="M11.2 6.2l3.6 3.6M14.8 6.2l-3.6 3.6"/></svg>';
  const ICON_X = '<svg viewBox="0 0 16 16"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  const ICON_DOWN = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5v7M2 5.5l3 3 3-3"/></svg>';
  const ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 5h7M5.5 2l3 3-3 3"/></svg>';
  const ICON_COIN = '<svg class="bk-coin-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><circle class="bk-coin-in" cx="8" cy="8" r="4.3"/></svg>';
  const ICON_BACK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M8.5 5h-7M4.5 2l-3 3 3 3"/></svg>';
  /* las tarjetas del menú, con un dibujo de cada juego */
  const ART = {
    bbtan: '<svg viewBox="0 0 64 64"><rect class="bk-art-high" x="6" y="6" width="15" height="15" rx="3.5"/><rect class="bk-art-low" x="24.5" y="6" width="15" height="15" rx="3.5"/><path class="bk-art-high" d="M43 6h11.5A3.5 3.5 0 0 1 58 9.5V21z"/><rect class="bk-art-low" x="43" y="24.5" width="15" height="15" rx="3.5"/><circle class="bk-art-ink" cx="17" cy="38" r="1.6"/><circle class="bk-art-ink" cx="14" cy="45" r="1.6"/><circle class="bk-art-ink" cx="11" cy="52" r="1.6"/><circle class="bk-art-ink" cx="21" cy="30.5" r="1.6"/><circle class="bk-art-gold" cx="8.5" cy="58" r="3.6"/></svg>',
    egg: '<svg viewBox="0 0 64 64"><path class="bk-art-shell" d="M30 10c8.5 0 12.5 12.6 12.5 20.3C42.5 39.8 37 46 30 46s-12.5-6.2-12.5-15.7C17.5 22.6 21.5 10 30 10z" transform="rotate(-14 30 28)"/><ellipse class="bk-art-low" cx="44" cy="53" rx="11" ry="5.6"/><circle class="bk-art-gold" cx="44" cy="52.5" r="3.4"/><path class="bk-art-slash" d="M10 44L52 12"/><circle class="bk-art-gold" cx="54.5" cy="10.5" r="2"/></svg>',
    snake: '<svg viewBox="0 0 64 64"><path class="bk-art-body" d="M8 50h14V32h16V18h8"/><circle class="bk-art-ink" cx="49" cy="18" r="7"/><circle class="bk-art-bg" cx="51" cy="16.5" r="1.8"/><circle class="bk-art-bg" cx="51" cy="21" r="1.4"/><ellipse class="bk-art-gold" cx="51" cy="44" rx="4.2" ry="5.4" transform="rotate(-28 51 44)"/></svg>',
  };
  function gameCard(g, i) {
    return '<button type="button" class="bk-game" data-game="' + g + '" style="--i:' + i + '">'
      + '<span class="bk-game-art" aria-hidden="true">' + ART[g] + '</span>'
      + '<span class="bk-game-txt"><b>' + GAMES[g].name + '</b><span>' + GAMES[g].desc + '</span></span>'
      + '<span class="bk-game-best"><small>Tu mejor</small><b>—</b></span>'
      + '<span class="bk-game-go" aria-hidden="true">' + ARROW + '</span>'
      + '</button>';
  }
  const BOARD = '<div class="bk-board"><p class="bk-board-h"><span>Top 3</span><span class="bk-scope">Global</span></p><ol class="bk-list"></ol></div>';

  function build() {
    root = document.createElement('div');
    root.className = 'bk';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Arcade: tres minijuegos');
    root.innerHTML = ''
      + '<div class="bk-backdrop"></div>'
      + '<div class="bk-panel" tabindex="-1">'
      +   '<header class="bk-hud">'
      +     '<div class="bk-hud-l">'
      +       '<span class="bk-brand">Arcade</span>'
      +       '<button type="button" class="bk-tohub" aria-label="Volver a los juegos">' + ICON_BACK + 'Juegos</button>'
      +       '<span class="bk-scorebox" aria-hidden="true"><span class="bk-lbl">Ronda</span><b class="bk-score">1</b></span>'
      +     '</div>'
      +     '<div class="bk-hud-c"><span class="bk-best"></span></div>'
      +     '<div class="bk-hud-r">'
      +       '<button type="button" class="bk-coins" aria-label="Monedas: 0. Abrir la tienda de bolas">' + ICON_COIN + '<b class="bk-coins-n">0</b></button>'
      +       '<button type="button" class="bk-ibtn bk-mute" aria-label="Silenciar" aria-pressed="false">' + ICON_ON + ICON_OFF + '</button>'
      +       '<button type="button" class="bk-ibtn bk-x" aria-label="Cerrar el juego">' + ICON_X + '</button>'
      +     '</div>'
      +   '</header>'
      +   '<div class="bk-stage">'
      +     '<canvas class="bk-cv" role="img" aria-label="Tablero de juego"></canvas>'
      +     '<p class="bk-hint" aria-hidden="true"></p>'
      +     '<span class="bk-speed" aria-hidden="true"></span>'
      +     '<button type="button" class="bk-recall">' + ICON_DOWN + 'Recoger</button>'
      +     '<div class="bk-toast" aria-hidden="true"><span></span><b></b></div>'
      +     '<section class="bk-screen bk-s-hub" aria-label="Elige un juego">'
      +       '<p class="bk-k">Elige un juego</p>'
      +       '<h2 class="bk-title bk-title-hub">Arcade</h2>'
      +       '<div class="bk-games">' + gameCard('bbtan', 0) + gameCard('egg', 1) + gameCard('snake', 2) + '</div>'
      +       '<p class="bk-hub-note">Cada juego tiene su propio top 3.</p>'
      +     '</section>'
      +     '<section class="bk-screen bk-s-start" aria-label="Inicio">'
      +       '<h2 class="bk-title bk-g-title"></h2>'
      +       '<p class="bk-how"></p>'
      +       '<form class="bk-form" novalidate>'
      +         '<label class="bk-name"><span class="bk-sr">Tu nombre</span>'
      +           '<input type="text" name="name" maxlength="12" placeholder="Tu nombre" autocomplete="nickname" autocapitalize="characters" spellcheck="false" enterkeyhint="go"></label>'
      +         '<button type="submit" class="bk-btn bk-go">Jugar' + ARROW + '</button>'
      +       '</form>'
      +       '<p class="bk-err" role="alert"></p>'
      +       BOARD
      +     '</section>'
      +     '<section class="bk-screen bk-s-pause" aria-label="Pausa">'
      +       '<p class="bk-k">Pausa</p>'
      +       '<div class="bk-actions"><button type="button" class="bk-btn bk-resume">Continuar' + ARROW + '</button><button type="button" class="bk-btn bk-ghost bk-hub-b">Juegos</button></div>'
      +     '</section>'
      +     '<section class="bk-screen bk-s-over" aria-label="Fin de la partida">'
      +       '<p class="bk-k">Fin de la partida</p>'
      +       '<b class="bk-final">0</b>'
      +       '<p class="bk-unit">Rondas</p>'
      +       '<span class="bk-badge"></span>'
      +       '<p class="bk-stats"></p>'
      +       BOARD
      +       '<p class="bk-rank"></p>'
      +       '<div class="bk-actions"><button type="button" class="bk-btn bk-again">Otra partida' + ARROW + '</button><button type="button" class="bk-btn bk-ghost bk-shop-b">Tienda</button><button type="button" class="bk-btn bk-ghost bk-hub-b">Juegos</button></div>'
      +     '</section>'
      +     '<section class="bk-screen bk-s-shop" aria-label="Tienda de bolas">'
      +       '<p class="bk-k">Tienda</p>'
      +       '<h2 class="bk-title bk-title-s">Bolas</h2>'
      +       '<p class="bk-wallet">' + ICON_COIN + '<span><b class="bk-wallet-n">0</b> monedas</span></p>'
      +       '<div class="bk-skins"></div>'
      +       '<p class="bk-shop-note">Las monedas salen de vez en cuando en el tablero: tócalas con una bola y se guardan para siempre.</p>'
      +       '<div class="bk-actions"><button type="button" class="bk-btn bk-ghost bk-back">Volver</button></div>'
      +     '</section>'
      +     '<p class="bk-sr" aria-live="polite"></p>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(root);

    const $ = s => root.querySelector(s);
    panel = $('.bk-panel');
    stage = $('.bk-stage');
    cv = $('.bk-cv');
    ctx = cv.getContext('2d');
    Object.assign(ui, {
      score: $('.bk-score'), best: $('.bk-best'), mute: $('.bk-mute'), x: $('.bk-x'),
      hint: $('.bk-hint'), speed: $('.bk-speed'), recall: $('.bk-recall'),
      toast: $('.bk-toast'), live: $('.bk-stage > .bk-sr'),
      form: $('.bk-form'), input: $('.bk-name input'), go: $('.bk-go'), err: $('.bk-err'),
      startBoard: $('.bk-s-start .bk-board'), overBoard: $('.bk-s-over .bk-board'),
      final: $('.bk-final'), badge: $('.bk-badge'), stats: $('.bk-stats'), rank: $('.bk-rank'),
      resume: $('.bk-resume'), again: $('.bk-again'),
      coins: $('.bk-coins'), coinsN: $('.bk-coins-n'), walletN: $('.bk-wallet-n'), skins: $('.bk-skins'),
      shopBtn: $('.bk-shop-b'), back: $('.bk-back'),
      games: $('.bk-games'), gTitle: $('.bk-g-title'), how: $('.bk-how'), lbl: $('.bk-lbl'), unit: $('.bk-unit'),
      tohub: $('.bk-tohub'),
      screens: { hub: $('.bk-s-hub'), start: $('.bk-s-start'), pause: $('.bk-s-pause'), over: $('.bk-s-over'), shop: $('.bk-s-shop') },
    });
    buildShop();
    ui.input.value = playerName;
    ui.mute.setAttribute('aria-pressed', Sfx.isMuted() ? 'true' : 'false');

    ui.x.addEventListener('click', close);
    ui.resume.addEventListener('click', resume);
    ui.again.addEventListener('click', startGame);
    ui.tohub.addEventListener('click', showHub);
    root.querySelectorAll('.bk-hub-b').forEach(b => b.addEventListener('click', showHub));
    ui.games.querySelectorAll('.bk-game').forEach(b => b.addEventListener('click', () => { Sfx.init(); selectGame(b.dataset.game); }));
    ui.recall.addEventListener('click', recall);
    ui.coins.addEventListener('click', () => { if (!ui.coins.disabled) openShop(); });
    ui.shopBtn.addEventListener('click', openShop);
    ui.back.addEventListener('click', closeShop);
    ui.mute.addEventListener('click', () => {
      Sfx.init();
      ui.mute.setAttribute('aria-pressed', Sfx.toggle() ? 'true' : 'false');
    });
    $('.bk-backdrop').addEventListener('click', () => { if (PLAYING[state]) pause(); else if (state !== 'pause') close(); });
    ui.form.addEventListener('submit', onSubmit);
    ui.input.addEventListener('input', () => { ui.err.textContent = ''; });

    // apuntar: con ratón, la guía sigue al cursor y el clic lanza; con el dedo,
    // se arrastra hacia abajo desde cualquier sitio (tirachinas) y se suelta
    stage.addEventListener('pointerdown', e => {
      if (!opened || state !== 'aim' || (e.button != null && e.button > 0) || e.target.closest('button')) return;
      const p = local(e);
      aim.press = true;
      aim.kind = e.pointerType === 'mouse' ? 'mouse' : 'touch';
      aim.sx = p.x;
      aim.sy = p.y;
      if (aim.kind === 'mouse') pointAt(p);
      else { aim.on = false; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* nada */ } }
    });
    window.addEventListener('pointermove', e => {
      if (!opened || state !== 'aim') return;
      const p = local(e);
      if (e.pointerType === 'mouse') {
        aim.mx = p.x;
        aim.my = p.y;
        if (aim.press || inside(e)) { aim.kind = 'mouse'; pointAt(p); } else if (aim.kind !== 'key') aim.on = false;
      } else if (aim.press) {
        pull(p);
      }
    }, { passive: true });
    window.addEventListener('pointerup', e => {
      if (!aim.press) return;
      aim.press = false;
      if (!opened || state !== 'aim') return;
      if (e.pointerType === 'mouse') pointAt(local(e)); else pull(local(e));
      if (aim.on) shoot(aim.a);
    });
    window.addEventListener('pointercancel', () => { aim.press = false; if (aim.kind === 'touch') aim.on = false; });

    // Egg Ninja y Snake: cada uno decide qué hacer con el puntero (cortar, deslizar)
    stage.addEventListener('pointerdown', e => {
      if (!opened || !E || !PLAYING[state] || (e.button != null && e.button > 0) || e.target.closest('button')) return;
      if (e.pointerType !== 'mouse') { try { stage.setPointerCapture(e.pointerId); } catch (_) { /* nada */ } }
      E.down(local(e), e);
    });
    window.addEventListener('pointermove', e => { if (opened && E) E.move(local(e), e, inside(e)); }, { passive: true });
    window.addEventListener('pointerup', () => { if (E) E.up(); });
    window.addEventListener('pointercancel', () => { if (E) E.up(); });

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', () => { if (opened) layout(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && opened && PLAYING[state]) pause(); });
    window.addEventListener('blur', () => { if (opened && (state === 'fly' || state === 'play')) pause(); });
    built = true;
  }

  // del puntero a coordenadas del tablero (mientras el modal entra está escalado)
  function local(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / (r.width || W)), y: (e.clientY - r.top) * (H / (r.height || H)) };
  }
  function inside(e) {
    const r = cv.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  // ratón: apuntar directamente a donde está el cursor
  function pointAt(p) {
    const dy = floorY - br - p.y, dx = p.x - shooter.x;
    if (dy < br) { aim.on = false; return; }       // por debajo de la línea de tiro no vale
    aim.on = true;
    aim.a = clamp(Math.atan2(dy, dx), MIN_A, Math.PI - MIN_A);
  }
  // dedo: tirachinas, se tira hacia el lado contrario del arrastre
  function pull(p) {
    const dx = aim.sx - p.x, dy = aim.sy - p.y;
    if (Math.hypot(dx, dy) < 14 || dy >= -4) { aim.on = false; return; }
    aim.on = true;
    aim.a = clamp(Math.atan2(-dy, dx), MIN_A, Math.PI - MIN_A);
  }

  function readColors() {
    const cs = getComputedStyle(root);
    const v = n => cs.getPropertyValue(n).trim();
    COL = {
      bg: v('--bk-bg'), ink: v('--bk-ink'), line: v('--bk-line'), num: v('--bk-num'), fire: v('--bk-fire'), acc: v('--bk-acc'),
      mute: v('--bk-mute'), shell: v('--bk-shell'), shellLine: v('--bk-shell-line'), bomb: v('--bk-bomb'), bombLine: v('--bk-bomb-line'),
    };
    LIGHT = rgb(v('--bk-low'));
    DARK = rgb(v('--bk-high'));
  }
  function rgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // el color del bloque va del claro al oscuro según los golpes que le quedan
  function tone(hp) {
    const t = clamp(hp / Math.max(4, round * 1.6), 0.08, 1);
    return 'rgb(' + LIGHT.map((c, i) => Math.round(c + (DARK[i] - c) * t)).join(',') + ')';
  }

  function open() {
    if (opened) return;
    if (!built) build();
    opened = true;
    token++;
    lastFocus = document.activeElement;
    root.classList.toggle('is-light', document.body.classList.contains('theme-light'));
    readColors();
    root.hidden = false;
    document.body.classList.add('bk-open');
    if (window._holdModel) window._holdModel('game', true);   // el 3D de la home deja de girar mientras tanto
    cell = 0;
    layout();
    syncCoins();
    showHub();
    void root.offsetWidth;
    // crece desde la pantallita de la consola (sin transición CSS que le pise)
    const sr = screenRect();
    if (sr) root.classList.add('is-zoom');
    root.classList.add('is-open');
    if (sr) zoom(sr, true);
    mini.stop();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    // con ratón, el foco en el primer juego; en táctil, en el panel
    setTimeout(() => {
      if (!opened) return;
      const first = ui.games.querySelector('.bk-game');
      if (FINE && first) first.focus({ preventScroll: true });
      else panel.focus({ preventScroll: true });
    }, 60);
  }

  function close() {
    if (!opened) return;
    opened = false;
    token++;
    state = 'idle';
    keys.l = keys.r = 0;
    aim.press = false;
    root.classList.remove('is-open', 'is-game');
    document.body.classList.remove('bk-open');
    if (window._holdModel) window._holdModel('game', false);
    // y vuelve a meterse en la pantallita
    const sr = screenRect();
    if (sr) zoom(sr, false);
    setTimeout(() => {
      if (opened) return;
      root.hidden = true;
      if (zoomAnim) { zoomAnim.cancel(); zoomAnim = null; }
      root.classList.remove('is-zoom');
      cancelAnimationFrame(raf);
      mini.start();
    }, sr ? 360 : 260);
    const back = lastFocus && document.contains(lastFocus) ? lastFocus : trigger;
    try { back.focus({ preventScroll: true }); } catch (e) { /* nada */ }
  }

  // el juego crece desde la pantallita de la consola y vuelve a ella al cerrar
  let zoomAnim = null;
  function screenRect() {
    if (REDUCE) return null;
    const el = trigger.querySelector('.gb-screen');
    const r = el && el.getBoundingClientRect();
    return r && r.width > 2 ? r : null;
  }
  function zoom(sr, opening) {
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const pl = (window.innerWidth - w) / 2, pt = (window.innerHeight - h) / 2;
    const s = clamp(sr.width / w, 0.02, 1);
    const dx = sr.left + sr.width / 2 - (pl + w / 2), dy = sr.top + sr.height / 2 - (pt + h / 2);
    const small = { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')', opacity: 0 };
    const full = { transform: 'none', opacity: 1 };
    if (zoomAnim) zoomAnim.cancel();
    root.classList.add('is-zoom');
    zoomAnim = opening
      ? panel.animate([small, { opacity: 1, offset: 0.3 }, full], { duration: 560, easing: EASE })
      : panel.animate([full, { opacity: 1, offset: 0.5 }, small], { duration: 340, easing: EASE, fill: 'forwards' });
    if (opening) zoomAnim.onfinish = () => { root.classList.remove('is-zoom'); zoomAnim = null; };
  }

  function setScreen(name) {
    screenNow = name;
    Object.keys(ui.screens).forEach(k => {
      const el = ui.screens[k], on = k === name;
      el.classList.toggle('is-on', on);
      el.inert = !on;
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  }

  function announce(t) { ui.live.textContent = t; }

  /* ---------- monedas y tienda ---------- */
  // el contador de arriba; con bump, la moneda que llega hace saltar el icono
  function syncCoins(bump) {
    if (bump) shownCoins = Math.min(Wallet.coins, shownCoins + 1); else shownCoins = Wallet.coins;
    ui.coinsN.textContent = fmt(shownCoins);
    ui.coins.setAttribute('aria-label', 'Monedas: ' + Wallet.coins + '. Abrir la tienda de bolas');
    const ready = !!affordable();
    ui.coins.classList.toggle('has-new', ready);
    ui.shopBtn.classList.toggle('has-new', ready);
    if (bump && !REDUCE && ui.coins.animate) {
      ui.coins.firstChild.animate([{ transform: 'scale(1.45) rotate(-20deg)' }, { transform: 'none' }], { duration: 320, easing: EASE });
    }
  }
  // la moneda vuela del tablero al contador
  function flyCoin(x, y) {
    if (REDUCE || !document.body.animate) { syncCoins(true); return; }
    const r = cv.getBoundingClientRect(), k = r.width / (W || 1);
    const sx = r.left + x * k, sy = r.top + y * k;
    const t = ui.coins.firstChild.getBoundingClientRect();
    const tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    const el = document.createElement('i');
    el.className = 'bk-fly';
    root.appendChild(el);
    const at2 = (px, py, sc) => 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc + ')';
    const an = el.animate([
      { transform: at2(sx, sy, 1) },
      { transform: at2(sx + (tx - sx) * 0.35, Math.min(sy, ty) - 36, 1.2), offset: 0.4 },
      { transform: at2(tx, ty, 0.6) },
    ], { duration: 640, easing: EASE });
    an.onfinish = () => { el.remove(); syncCoins(true); };
  }

  // las tarjetas: la clásica (un círculo) y la del logo (el SVG de la cabecera)
  function buildShop() {
    const logo = document.querySelector('.top-logo svg');
    SKINS.forEach(sk => {
      const card = document.createElement('article');
      card.className = 'bk-skin';
      card.dataset.skin = sk.id;
      const pv = document.createElement('span');
      pv.className = 'bk-skin-pv';
      pv.setAttribute('aria-hidden', 'true');
      if (sk.id === 'logo' && logo) {
        const svg = logo.cloneNode(true);
        svg.removeAttribute('class');
        svg.classList.add('bk-skin-logo');
        pv.appendChild(svg);
      } else {
        const dot = document.createElement('i');
        dot.className = 'bk-skin-dot';
        pv.appendChild(dot);
      }
      const name = document.createElement('span');
      name.className = 'bk-skin-n';
      name.textContent = sk.name;
      const meta = document.createElement('span');
      meta.className = 'bk-skin-p';
      const bar = document.createElement('span');
      bar.className = 'bk-skin-bar';
      bar.appendChild(document.createElement('i'));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bk-btn bk-skin-b';
      btn.addEventListener('click', () => pickSkin(sk, card));
      card.append(pv, name, meta, bar, btn);
      ui.skins.appendChild(card);
    });
  }
  function renderShop() {
    ui.walletN.textContent = fmt(Wallet.coins);
    ui.skins.querySelectorAll('.bk-skin').forEach(card => {
      const sk = SKINS.find(q => q.id === card.dataset.skin);
      const owned = Wallet.owns(sk.id), on = Wallet.skin === sk.id, can = !owned && Wallet.coins >= sk.price;
      const btn = card.querySelector('.bk-skin-b'), meta = card.querySelector('.bk-skin-p');
      card.classList.toggle('is-on', on);
      card.classList.toggle('is-locked', !owned);
      card.classList.toggle('is-ready', can);
      card.querySelector('.bk-skin-bar i').style.transform = 'scaleX(' + (owned ? 1 : Math.min(1, Wallet.coins / sk.price)).toFixed(3) + ')';
      meta.textContent = owned ? (on ? 'En juego' : 'Tuya') : fmt(Math.min(Wallet.coins, sk.price)) + ' / ' + fmt(sk.price) + ' monedas';
      btn.classList.toggle('bk-ghost', !can);
      btn.classList.toggle('is-on', on);
      btn.disabled = on || (!owned && !can);
      if (on) btn.textContent = 'Equipada';
      else if (owned) btn.textContent = 'Usar';
      else if (can) btn.innerHTML = 'Comprar · ' + ICON_COIN + fmt(sk.price);
      else btn.textContent = 'Te faltan ' + fmt(sk.price - Wallet.coins);
      btn.setAttribute('aria-label', on ? 'Bola ' + sk.name + ': equipada'
        : owned ? 'Usar la bola ' + sk.name
        : can ? 'Comprar la bola ' + sk.name + ' por ' + sk.price + ' monedas'
        : 'Bola ' + sk.name + ': te faltan ' + (sk.price - Wallet.coins) + ' monedas');
    });
  }
  function pickSkin(sk, card) {
    Sfx.init();
    if (!Wallet.owns(sk.id)) {
      const before = Wallet.coins;
      if (!Wallet.buy(sk)) return;
      Sfx.buy();
      announce('Bola ' + sk.name + ' comprada y equipada');
      // la tarjeta salta, la bola da una vuelta y el saldo baja contando
      if (!REDUCE && card.animate) {
        card.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 520, easing: EASE });
        card.querySelector('.bk-skin-pv > *').animate([
          { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-14px) rotate(-200deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(-360deg)' },
        ], { duration: 720, easing: EASE });
        const t0 = performance.now(), to = Wallet.coins;
        const tick = now => {
          const p = Math.min(1, (now - t0) / 600);
          ui.walletN.textContent = fmt(Math.round(before + (to - before) * easeOut(p)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    } else {
      Wallet.use(sk.id);
      Sfx.plus();
      announce('Bola ' + sk.name + ' equipada');
    }
    const wn = ui.walletN.textContent;
    renderShop();
    if (!REDUCE) ui.walletN.textContent = wn;   // lo termina la cuenta atrás
    syncCoins();
    ui.back.focus({ preventScroll: true });
  }
  function openShop() {
    if (PLAYING[state] || state === 'pause' || screenNow === 'shop') return;
    shopFrom = screenNow || 'start';
    renderShop();
    setScreen('shop');
    setTimeout(() => {
      const b = ui.skins.querySelector('.bk-skin-b:not(:disabled)') || ui.back;
      b.focus({ preventScroll: true });
    }, 60);
  }
  function closeShop() {
    if (screenNow !== 'shop') return;
    setScreen(shopFrom);
    setTimeout(() => {
      const f = shopFrom === 'over' ? ui.shopBtn : (FINE ? (ui.input.value ? ui.go : ui.input) : ui.coins);
      f.focus({ preventScroll: true });
    }, 60);
  }

  function toast(small, big) {
    ui.toast.firstChild.textContent = small;
    ui.toast.lastChild.textContent = big;
    ui.toast.classList.remove('is-on');
    void ui.toast.offsetWidth;
    ui.toast.classList.add('is-on');
  }

  function loadTop(box) {
    box.classList.add('is-loading');
    fillRows(box, [], true);
    const my = token;
    Board.top(3, game).then(res => { if (my === token) fillBoard(box, res); });
  }
  function fillRows(box, rows, loading, me) {
    const list = box.querySelector('.bk-list');
    list.textContent = '';
    let marked = false;
    for (let i = 0; i < 3; i++) {
      const r = rows[i];
      const li = document.createElement('li');
      const a = document.createElement('span');
      const n = document.createElement('span');
      const p = document.createElement('span');
      a.className = 'bk-r';
      n.className = 'bk-n';
      p.className = 'bk-p';
      a.textContent = '0' + (i + 1);
      n.textContent = r ? r.name : (loading ? '· · ·' : '—');   // textContent: nada del ranking se interpreta como HTML
      p.textContent = r ? fmt(r.score) : '—';
      if (!r) li.className = 'is-empty';
      else if (me && !marked && r.name === me.name && r.score === me.score) { li.className = 'is-me'; marked = true; }
      li.append(a, n, p);
      list.appendChild(li);
    }
  }
  function fillBoard(box, res, me) {
    box.classList.remove('is-loading');
    box.querySelector('.bk-scope').textContent =
      res.scope === 'global' ? 'Global' : res.scope === 'offline' ? 'Sin conexión · local' : 'En este dispositivo';
    fillRows(box, res.rows, false, me);
  }

  function onSubmit(e) {
    e.preventDefault();
    const n = cleanName(ui.input.value);
    if (n.length < 2) return bad('Escribe tu nombre (mínimo 2 letras).');
    if (rude(n)) return bad('Ese nombre mejor no. Prueba con otro.');
    playerName = n;
    ui.input.value = n;
    store.set('cdv_bk_name', n);
    startGame();
  }
  function bad(msg) {
    ui.err.textContent = msg;
    ui.form.classList.remove('is-bad');
    void ui.form.offsetWidth;
    ui.form.classList.add('is-bad');
    ui.input.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (!opened) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      if (screenNow === 'shop') closeShop();
      else if (state === 'pause') resume();
      else if (PLAYING[state]) pause();
      else if (screenNow === 'start' || screenNow === 'over') showHub();
      else close();
      return;
    }
    if (k === 'Tab') { trapFocus(e); return; }
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT') return;
    if (tag === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
    if ((k === 'p' || k === 'P') && (PLAYING[state] || state === 'pause')) { if (state === 'pause') resume(); else pause(); return; }
    if (!game) { if (state === 'hub' && hubKey(k)) e.preventDefault(); return; }
    if (game !== 'bbtan') { if (E && PLAYING[state] && E.key(k)) e.preventDefault(); return; }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.l = 1; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.r = 1; e.preventDefault(); }
    else if ((k === ' ' || k === 'Enter') && state === 'aim') { e.preventDefault(); shoot(aim.on ? aim.a : Math.PI / 2); }
    else if ((k === 'ArrowDown' || k === 's' || k === 'S') && state === 'fly') { e.preventDefault(); recall(); }
  }
  function onKeyUp(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.l = 0;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.r = 0;
  }
  function trapFocus(e) {
    const f = Array.prototype.filter.call(root.querySelectorAll('button, input'),
      el => !el.disabled && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey ? i <= 0 : i === f.length - 1) {
      e.preventDefault();
      f[e.shiftKey ? f.length - 1 : 0].focus();
    }
  }


  /* ---------- tablero ---------- */
  function layout() {
    // tamaño de maqueta, sin la escala de la animación de entrada
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    narrow = W < 520;
    const oc = cell, ogx = gx, ogy = gy;
    const pad = narrow ? 10 : 18;
    cell = Math.max(24, Math.floor(Math.min((W - 2 * pad) / COLS, (H - 20) / (ROWS + 1.7))));
    gx = Math.round((W - COLS * cell) / 2);
    gy = Math.round(Math.max(10, (H - (ROWS + 1.7) * cell) * 0.32));
    floorY = gy + ROWS * cell;
    br = Math.max(4, Math.round(cell * 0.11));
    speed = cell * 15;
    // lo que está en juego se reescala con el tablero
    if (oc && (oc !== cell || ogx !== gx || ogy !== gy)) {
      const k = cell / oc;
      const mx = x => gx + (x - ogx) * k, my = y => gy + (y - ogy) * k;
      balls.forEach(b => { b.x = mx(b.x); b.y = my(b.y); b.vx *= k; b.vy *= k; });
      shooter.x = mx(shooter.x);
      if (shooter.nx != null) shooter.nx = mx(shooter.nx);
      parts.length = 0;
      pops.length = 0;
      beams.length = 0;
    } else if (!oc) {
      shooter.x = gx + COLS * cell / 2;
    }
    if (game === 'bbtan' && state === 'attract' && root) root.style.setProperty('--bk-gb', Math.round(gy + DEMO.length * cell) + 'px');
    if (E) E.size();
  }
  const cx = k => gx + k.c * cell + cell / 2;
  const cy = k => gy + k.r * cell + cell / 2;
  const gapPx = () => Math.max(1.5, cell * 0.06);

  function rebuildAt() {
    at = new Array(COLS * ROWS).fill(null);
    items.forEach(k => { if (!k.gone && k.r >= 0 && k.r < ROWS) at[k.r * COLS + k.c] = k; });
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* objetos especiales: desde qué ronda salen y con qué peso */
  const SPECIALS = [
    { kind: 'laserH', from: 3, w: 22 },
    { kind: 'laserV', from: 3, w: 22 },
    { kind: 'scatter', from: 5, w: 18 },
    { kind: 'bomb', from: 6, w: 20 },
    { kind: 'laserX', from: 9, w: 12 },
  ];
  function pickSpecial(n) {
    const pool = SPECIALS.filter(x => n >= x.from);
    let r = Math.random() * pool.reduce((a, x) => a + x.w, 0);
    for (const x of pool) { r -= x.w; if (r < 0) return x.kind; }
    return pool[0].kind;
  }
  /* una fila nueva. Cada columna tiene una probabilidad de bloque que sube
     despacio con la ronda (así unas filas salen casi vacías y otras llenas)
     y que baja si la mitad de abajo del tablero ya está cargada: la partida
     aprieta, pero no se convierte en un muro. De vez en cuando, una fila de
     respiro: un solo bloque, bolas extra y un objeto. Los bloques aguantan
     la ronda en golpes; algunos menos, alguno el doble, y algunos son
     triángulos. Calibrado con partidas simuladas: antes el tablero llegaba
     a ~30 bloques hacia la ronda 40 y las partidas morían en la 27-30;
     ahora la presión sube de ~6 a ~11-15 bloques y llegan a la 40-60. */
  function makeRow(n, r, delay) {
    const cols = shuffle([0, 1, 2, 3, 4, 5, 6]);
    const now = performance.now() / 1000 + (delay || 0);
    const low = items.filter(k => k.kind === 'block' && !k.gone && k.r >= 4).length;
    const p = clamp(0.3 + n * 0.006, 0.3, 0.58) * (low > 12 ? 0.6 : low > 7 ? 0.8 : 1);
    const breather = n >= 8 && Math.random() < 0.1;
    let count = 0;
    for (let q = 0; q < 6; q++) if (Math.random() < p) count++;
    count = breather ? 1 : Math.max(1, count);
    let i = 0;
    const put = (o) => { o.c = cols[i]; o.r = r; o.from = r; o.born = now + i * 0.035; items.push(o); i++; };
    while (i < count) {
      let hp = n;
      if (n >= 6 && Math.random() < 0.3) hp = Math.max(1, Math.round(n * (0.4 + Math.random() * 0.45)));
      else if (n >= 12 && Math.random() < 0.09) hp = n * 2;
      const tri = n >= 4 && Math.random() < 0.16 ? Math.floor(Math.random() * 4) : null;
      put({ kind: 'block', hp, max: hp, hit: 0, tri });
    }
    put({ kind: 'plus' });
    if (i < COLS && (breather || Math.random() < 0.25)) put({ kind: 'plus' });
    const specials = n < 3 ? 0 : breather ? 2 : Math.random() < clamp(0.26 + n * 0.004, 0.26, 0.42) ? 1 : 0;
    for (let q = 0; q < specials && i < COLS; q++) put({ kind: pickSpecial(n), flash: 0 });
    // de vez en cuando, una moneda (siempre en las filas de respiro). Medido con
    // partidas simuladas: ~10 en una partida de 50 rondas; la bola César, en 2-4
    if (n >= 2 && i < COLS && (breather || Math.random() < 0.12)) put({ kind: 'coin' });
  }


  /* ---------- flujo de la partida ---------- */
  /* en la pantalla de inicio, tres filas de muestra hacen de cabecera:
     bloques (alguno triangular: t0-t3 = la esquina que le falta), aros +1
     y objetos (v láser, o bomba, s rebote), entrando en cascada */
  const DEMO = [
    ['b', 'b', '+', 't2', 'b', 'v', 'b'],
    ['+', 't1', 'b', 'b', 'o', 'b', 'c'],
    ['b', '.', 's', 'b', 'b', 't3', '+'],
  ];
  const DEMO_KIND = { v: 'laserV', o: 'bomb', s: 'scatter', c: 'coin' };
  function attract() {
    state = 'attract';
    round = 3;
    items = [];
    const now = performance.now() / 1000 + 0.15;
    DEMO.forEach((row, r) => row.forEach((k, c) => {
      const born = now + r * 0.1 + c * 0.04;
      if (k === 'b' || k[0] === 't') items.push({ kind: 'block', c, r, from: r, hp: 3 - r, max: 3 - r, hit: 0, born, tri: k[0] === 't' ? +k[1] : null });
      else if (k === '+') items.push({ kind: 'plus', c, r, from: r, born });
      else if (DEMO_KIND[k]) items.push({ kind: DEMO_KIND[k], c, r, from: r, born, flash: 0 });
    }));
    rebuildAt();
    root.style.setProperty('--bk-gb', Math.round(gy + DEMO.length * cell) + 'px');
    balls = []; parts = []; pops = []; beams = []; waves = []; shake = 0;
    toFire = 0;
    ballsN = 1;
    shooter.x = gx + COLS * cell / 2;
    shooter.nx = null;
    aim.on = false;
    root.classList.remove('is-game');
    ui.hint.classList.remove('is-on');
    ui.recall.classList.remove('is-on');
    ui.speed.classList.remove('is-on');
    ui.coins.disabled = false;
    setBest();
  }

  function newGame() {
    token++;
    round = 1; ballsN = 1; gained = 0; broken = 0; bestToast = false; coinsGame = 0;
    ui.coins.disabled = true;
    items = []; balls = []; parts = []; pops = []; beams = []; waves = []; shake = 0;
    toFire = 0; landed = 0; flyT = 0; tscale = 1;
    shooter.x = gx + COLS * cell / 2;
    shooter.nx = null;
    aim.on = false;
    aim.a = Math.PI / 2;
    aim.kind = '';
    aim.mx = aim.my = null;
    ui.score.textContent = '1';
    setBest();
    root.classList.add('is-game');
    setScreen(null);
    makeRow(1, 0, 0.1);
    rebuildAt();
    state = 'aim';
    ui.hint.classList.add('is-on');
    panel.focus({ preventScroll: true });
    announce('Ronda 1');
  }
  function setBest() {
    ui.best.textContent = best > 0 ? 'Mejor · ' + fmt(best) : '';
  }

  function shoot(a) {
    if (state !== 'aim') return;
    dirX = Math.cos(a);
    dirY = -Math.sin(a);
    aim.a = a;
    aim.on = false;
    state = 'fly';
    toFire = ballsN;
    fireT = 0;
    landed = 0;
    flyT = 0;
    tscale = 1;
    gained = 0;
    brokeRound = 0;
    balls = [];
    shooter.nx = null;
    ui.hint.classList.remove('is-on');
    Sfx.shoot();
  }

  // «Recoger»: las que faltan no salen y las que vuelan bajan directas a la pila
  function recall() {
    if (state !== 'fly') return;
    if (shooter.nx == null) shooter.nx = shooter.x;
    landed += toFire;
    toFire = 0;
    balls.forEach(b => { if (!b.done) { b.done = true; b.back = true; landed++; } });
    ui.recall.classList.remove('is-on');
  }

  function endRound() {
    state = 'shift';
    shiftT = 0;
    if (shooter.nx != null) shooter.x = shooter.nx;
    shooter.nx = null;
    ui.recall.classList.remove('is-on');
    ui.speed.classList.remove('is-on');
    // fuera lo roto y los láseres ya usados; todo baja una fila
    items = items.filter(k => !k.gone && !k.fired);
    items.forEach(k => { k.from = k.r; k.r += 1; });
    // los +1 que llegan al suelo se cogen solos; un láser que llega, se pierde
    let auto = 0;
    items = items.filter(k => {
      if (k.kind === 'block' || k.r < ROWS - 1) return true;
      if (k.kind === 'plus') auto++;
      return false;
    });
    const plus = gained + auto;
    if (plus) {
      ballsN += plus;
      pops.push({ x: shooter.x, y: floorY - cell * 0.7, t: '+' + plus, life: 1.3, big: true });
      announce(plus === 1 ? 'Una bola más' : plus + ' bolas más');
    }
    gained = 0;
    doomed = items.some(k => k.kind === 'block' && k.r >= ROWS - 1);
    rebuildAt();
    Sfx.shift();
  }

  // la primera vez que aparece cada cosa, un rótulo dice qué hace
  const NEWS = {
    tri: ['Rebota en diagonal', 'Triángulo'],
    laserH: ['Golpea toda la fila', 'Láser'],
    laserV: ['Golpea toda la columna', 'Láser'],
    laserX: ['Fila y columna a la vez', 'Cruz'],
    scatter: ['Desvía la bola al azar', 'Rebote'],
    bomb: ['Revienta lo que la rodea', 'Bomba'],
    coin: ['Júntalas para la tienda', 'Moneda'],
  };
  let seen = null;
  function news() {
    if (!seen) { try { seen = JSON.parse(store.get('cdv_bbtan_seen')) || []; } catch (e) { seen = []; } }
    for (const k of items) {
      if (k.r !== 0 || k.gone) continue;
      const id = k.kind === 'block' ? (k.tri != null ? 'tri' : null) : NEWS[k.kind] ? k.kind : null;
      if (!id || seen.indexOf(id) !== -1) continue;
      seen.push(id);
      store.set('cdv_bbtan_seen', JSON.stringify(seen));
      return NEWS[id];
    }
    return null;
  }

  function nextRound() {
    round++;
    ui.score.textContent = fmt(round);
    makeRow(round, 0, 0.02);
    rebuildAt();
    const fresh = news();
    // la primera vez que llegas al precio de una bola, se avisa (una sola vez)
    let told = [];
    try { told = JSON.parse(store.get('cdv_bbtan_told')) || []; } catch (e) { told = []; }
    let ready = affordable();
    if (ready && told.indexOf(ready.id) !== -1) ready = null;
    state = 'aim';
    // la guía vuelve sola: al cursor (desde la nueva salida) o al ángulo del teclado
    if (aim.kind === 'mouse' && aim.mx != null) pointAt({ x: aim.mx, y: aim.my });
    else if (aim.kind === 'key') aim.on = true;
    if (round <= 3) ui.hint.classList.add('is-on');
    if (best > 0 && round > best && !bestToast) {
      bestToast = true;
      toast('Nuevo récord', 'Ronda ' + round);
      Sfx.record();
    } else if (ready) {
      toast('Ya puedes comprarla en la tienda', 'Bola ' + ready.name);
      told.push(ready.id);
      store.set('cdv_bbtan_told', JSON.stringify(told));
      Sfx.buy();
    } else if (fresh) {
      toast('Nuevo · ' + fresh[0], fresh[1]);
    } else if (round % 10 === 0) {
      toast('Ronda', String(round));
    }
    announce('Ronda ' + round);
  }

  function gameOver() {
    state = 'over';
    balls = [];
    Sfx.over();
    // lo que queda se desmorona
    for (const k of items) {
      if (k.kind !== 'block') continue;
      parts.push({
        x: cx(k), y: cy(k), vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 200,
        s: cell - 2 * gapPx(), r: 0, vr: (Math.random() - 0.5) * 4, life: 1.5, col: tone(k.hp), big: true,
      });
    }
    items = [];
    rebuildAt();
    const stats = fmt(broken) + (broken === 1 ? ' bloque' : ' bloques') + ' · ' + fmt(ballsN) + (ballsN === 1 ? ' bola' : ' bolas')
      + (coinsGame ? ' · ' + fmt(coinsGame) + (coinsGame === 1 ? ' moneda' : ' monedas') : '');
    const my = ++token;
    setTimeout(() => { if (my === token && opened) showOver(my, round, stats); }, REDUCE ? 250 : 950);
  }

  async function showOver(my, score, stats) {
    const G = GAMES[game];
    root.classList.remove('is-game');
    setScreen('over');
    const prev = +store.get(G.best) || 0;
    const record = score > prev;
    if (record) { store.set(G.best, String(score)); best = score; }
    countUp(ui.final, score);
    ui.unit.textContent = G.units;
    ui.stats.textContent = stats;
    ui.coins.disabled = false;
    syncCoins();
    ui.badge.classList.remove('is-on');
    ui.badge.textContent = '';
    ui.rank.textContent = '';
    ui.overBoard.classList.add('is-loading');
    fillRows(ui.overBoard, [], true);
    announce('Fin de la partida: ' + fmt(score) + ' ' + G.units.toLowerCase());
    setTimeout(() => { if (my === token && opened) ui.again.focus({ preventScroll: true }); }, 120);

    // con 0 no se sube nada (las reglas de Firestore piden más de 0)
    const scope = score > 0 ? await Board.submit(playerName, score, game) : 'local';
    if (my !== token) return;
    const [top, rk] = await Promise.all([Board.top(3, game), score > 0 ? Board.rank(score, scope, game) : Promise.resolve(null)]);
    if (my !== token) return;
    fillBoard(ui.overBoard, top, { name: playerName, score });
    if (rk) ui.rank.textContent = 'Tu puesto: ' + fmt(rk.pos) + ' de ' + fmt(rk.total);
    const inTop = !!(rk && rk.pos <= 3);
    if (inTop || record) {
      ui.badge.textContent = inTop ? '¡Estás en el top 3!' : 'Nuevo récord personal';
      ui.badge.classList.add('is-on');
      if (inTop) { if (game === 'bbtan') confetti(W / 2, H * 0.3, 70); else if (E) E.confetti(); }
    }
  }

  function countUp(el, to) {
    if (REDUCE || to < 5) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 800;
    const tick = now => {
      const p = Math.min(1, (now - t0) / d);
      el.textContent = fmt(to * easeOut(p));
      if (p < 1 && opened) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  }

  function pause() {
    if (!PLAYING[state]) return;
    prevState = state;
    state = 'pause';
    keys.l = keys.r = 0;
    aim.press = false;
    if (E) E.pause();
    setScreen('pause');
    setTimeout(() => { if (state === 'pause') ui.resume.focus({ preventScroll: true }); }, 60);
  }
  function resume() {
    if (state !== 'pause') return;
    state = prevState;
    setScreen(null);
    last = performance.now();
    panel.focus({ preventScroll: true });
  }


  /* ---------- física ---------- */
  function update(dt) {
    // teclado: afinar el ángulo
    if (state === 'aim' && (keys.l || keys.r)) {
      aim.kind = 'key';
      aim.on = true;
      aim.a = clamp(aim.a + (keys.l - keys.r) * 1.1 * dt, MIN_A, Math.PI - MIN_A);
    }
    if (state === 'fly') {
      flyT += dt;
      // si la ronda se alarga, se acelera sola (y aparece «Recoger»)
      const ts = flyT > 10 ? 3 : flyT > 5 ? 2 : 1;
      if (ts !== tscale) {
        tscale = ts;
        ui.speed.textContent = '×' + ts;
        ui.speed.classList.toggle('is-on', ts > 1);
      }
      if (flyT > 2.5 && !ui.recall.classList.contains('is-on')) ui.recall.classList.add('is-on');
      const sdt = dt * tscale;
      // la ráfaga: una bola cada GAP_T
      if (toFire > 0) {
        fireT -= sdt;
        while (fireT <= 0 && toFire > 0) {
          balls.push({ x: shooter.x, y: floorY - br, vx: dirX * speed, vy: dirY * speed, done: false, back: false, merged: false, inItem: null });
          toFire--;
          fireT += GAP_T;
        }
      }
      const n = Math.min(48, Math.ceil(sdt / STEP));
      const h = sdt / n;
      for (let i = 0; i < n; i++) stepBalls(h);
    }
    // las que han caído ruedan hasta donde cayó la primera
    if (state === 'fly' || state === 'shift') {
      const tx = shooter.nx != null ? shooter.nx : shooter.x;
      for (const b of balls) {
        if (!b.done || b.merged) continue;
        const k = Math.min(1, dt * (b.back ? 9 : 14));
        b.rot = (b.rot || 0) + (tx - b.x) * k / br;   // rueda hasta la pila
        b.x += (tx - b.x) * k;
        b.y += (floorY - br - b.y) * k;
        if (Math.abs(tx - b.x) < 0.8 && Math.abs(floorY - br - b.y) < 0.8) b.merged = true;
      }
    }
    if (state === 'fly' && toFire === 0 && landed >= ballsN) endRound();
    if (state === 'shift') {
      shiftT += dt / (REDUCE ? 0.12 : 0.3);
      if (shiftT >= 1) {
        shiftT = 1;
        items.forEach(k => { k.from = k.r; });
        if (doomed) gameOver(); else nextRound();
      }
    }
    for (const k of items) {
      if (k.hit > 0) k.hit = Math.max(0, k.hit - dt * 6);
      if (k.flash > 0) k.flash = Math.max(0, k.flash - dt * 3);
    }
    for (let i = beams.length - 1; i >= 0; i--) { beams[i].life -= dt * 4; if (beams[i].life <= 0) beams.splice(i, 1); }
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].life -= dt * 2.6; if (waves[i].life <= 0) waves.splice(i, 1); }
    shake = Math.max(0, shake - dt * 30);
    stepParts(dt);
  }

  function stepBalls(dt) {
    const L = gx + br, R = gx + COLS * cell - br, T = gy + br;
    for (const b of balls) {
      if (b.done) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot = (b.rot || 0) + (b.vx < 0 ? -9 : 9) * dt;
      if (b.x < L) { b.x = L; b.vx = Math.abs(b.vx); }
      else if (b.x > R) { b.x = R; b.vx = -Math.abs(b.vx); }
      if (b.y < T) { b.y = T; b.vy = Math.abs(b.vy); }
      collide(b);
      touchItems(b);
      if (b.vy > 0 && b.y >= floorY - br) {
        b.y = floorY - br;
        b.done = true;
        landed++;
        // la primera que cae marca desde dónde se tira la próxima vez
        if (shooter.nx == null) shooter.nx = clamp(b.x, L, R);
      }
    }
  }

  // las tres esquinas de un bloque triangular (tri = la esquina del cuadrado
  // que le falta: 0 arriba izq., 1 arriba der., 2 abajo der., 3 abajo izq.),
  // en el sentido de las agujas del reloj
  function triVerts(x0, y0, s, tri) {
    const q = [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]];
    q.splice(tri, 1);
    return q;
  }
  // bola contra triángulo: punto más cercano y normal hacia fuera (o null)
  function triContact(k, bx, by) {
    const g = gapPx(), s = cell - 2 * g;
    const v = triVerts(gx + k.c * cell + g, gy + k.r * cell + g, s, k.tri);
    let bd = Infinity, px = 0, py = 0, ex = 0, ey = 0, inside = true;
    for (let i = 0; i < 3; i++) {
      const a = v[i], z = v[(i + 1) % 3];
      const dx = z[0] - a[0], dy = z[1] - a[1];
      if (dx * (by - a[1]) - dy * (bx - a[0]) < 0) inside = false;
      const t = clamp(((bx - a[0]) * dx + (by - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      const qx = a[0] + t * dx, qy = a[1] + t * dy;
      const d = (bx - qx) * (bx - qx) + (by - qy) * (by - qy);
      if (d < bd) { bd = d; px = qx; py = qy; ex = dx; ey = dy; }
    }
    if (inside) {
      const l = Math.hypot(ex, ey) || 1;
      return { d2: -1, nx: ey / l, ny: -ex / l, px, py };
    }
    if (bd >= br * br) return null;
    const d = Math.sqrt(bd) || 1e-6;
    return { d2: bd, nx: (bx - px) / d, ny: (by - py) / d, px, py };
  }
  // ¿la bola (en x, y) toca este bloque? (para la guía de tiro)
  function touches(k, x, y) {
    if (k.tri != null) return !!triContact(k, x, y);
    const g = gapPx(), s = cell - 2 * g, x0 = gx + k.c * cell + g, y0 = gy + k.r * cell + g;
    const nx = clamp(x, x0, x0 + s), ny = clamp(y, y0, y0 + s);
    return (x - nx) * (x - nx) + (y - ny) * (y - ny) < br * br;
  }
  // que ninguna bola vaya casi en horizontal (se quedaría rebotando de pared a pared)
  function steep(b) {
    const sp = Math.hypot(b.vx, b.vy) || speed, m = Math.sin(MIN_A) * sp;
    if (Math.abs(b.vy) < m) {
      b.vy = (b.vy > 0 ? 1 : -1) * m;
      b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - m * m);
    }
  }

  function collide(b) {
    const c0 = Math.max(0, Math.floor((b.x - br - gx) / cell)), c1 = Math.min(COLS - 1, Math.floor((b.x + br - gx) / cell));
    const r0 = Math.max(0, Math.floor((b.y - br - gy) / cell)), r1 = Math.min(ROWS - 1, Math.floor((b.y + br - gy) / cell));
    if (c0 > c1 || r0 > r1) return;
    const g = gapPx(), s = cell - 2 * g;
    let best = null, bd = Infinity, bc = null;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = at[r * COLS + c];
        if (!k || k.kind !== 'block') continue;
        if (k.tri != null) {
          const ct = triContact(k, b.x, b.y);
          if (ct && ct.d2 < bd) { bd = ct.d2; best = k; bc = ct; }
          continue;
        }
        const x0 = gx + c * cell + g, y0 = gy + r * cell + g;
        const nx = clamp(b.x, x0, x0 + s), ny = clamp(b.y, y0, y0 + s);
        const d = (b.x - nx) * (b.x - nx) + (b.y - ny) * (b.y - ny);
        if (d < br * br && d < bd) { bd = d; best = k; bc = null; }
      }
    }
    if (!best) return;
    if (bc) {
      // triángulo: refleja como en un espejo inclinado
      const dot = b.vx * bc.nx + b.vy * bc.ny;
      if (dot < 0) { b.vx -= 2 * dot * bc.nx; b.vy -= 2 * dot * bc.ny; }
      b.x = bc.px + bc.nx * (br + 0.05);
      b.y = bc.py + bc.ny * (br + 0.05);
      steep(b);
    } else {
      // cuadrado: rebota en el eje en el que menos se ha metido
      const kx = cx(best), ky = cy(best), hs = s / 2;
      const px = hs + br - Math.abs(b.x - kx), py = hs + br - Math.abs(b.y - ky);
      if (px < py) { b.vx = b.x < kx ? -Math.abs(b.vx) : Math.abs(b.vx); b.x += b.x < kx ? -px : px; }
      else { b.vy = b.y < ky ? -Math.abs(b.vy) : Math.abs(b.vy); b.y += b.y < ky ? -py : py; }
    }
    damage(best);
  }

  // los objetos no frenan la bola: se activan al entrar en ellos
  function touchItems(b) {
    const c = Math.floor((b.x - gx) / cell), r = Math.floor((b.y - gy) / cell);
    let it = null;
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
      const k = at[r * COLS + c];
      if (k && k.kind !== 'block' && Math.hypot(b.x - cx(k), b.y - cy(k)) < cell * 0.3 + br) it = k;
    }
    if (it === b.inItem) return;
    b.inItem = it;
    if (!it) return;
    if (it.kind === 'plus') collectPlus(it);
    else if (it.kind === 'coin') collectCoin(it);
    else if (it.kind === 'scatter') scatter(b, it);
    else if (it.kind === 'bomb') explode(it);
    else fireLaser(it);
  }

  function damage(k, n) {
    k.hp -= n || 1;
    k.hit = 1;
    if (k.hp > 0) { Sfx.hit(); return; }
    k.gone = true;
    at[k.r * COLS + k.c] = null;
    broken++;
    brokeRound++;
    burst(k.tri != null ? cx(k) + ([0, 3].indexOf(k.tri) !== -1 ? 1 : -1) * cell * 0.12 : cx(k), cy(k), tone(1), 9);
    Sfx.brk(brokeRound);
  }

  function collectPlus(it) {
    it.gone = true;
    at[it.r * COLS + it.c] = null;
    gained++;
    pops.push({ x: cx(it), y: cy(it), t: '+1', life: 1 });
    burst(cx(it), cy(it), COL.ink, 6);
    Sfx.plus();
  }

  // moneda: va al monedero (se guarda ya, aunque cierres a mitad de partida)
  function collectCoin(it) {
    it.gone = true;
    at[it.r * COLS + it.c] = null;
    coinsGame++;
    Wallet.add(1);
    pops.push({ x: cx(it), y: cy(it), t: '+1', life: 1, col: COL.fire });
    burst(cx(it), cy(it), COL.fire, 6);
    Sfx.coin();
    flyCoin(cx(it), cy(it));
  }

  // láser: cada bola que lo cruza golpea toda su fila, su columna o las dos (cruz)
  function fireLaser(it) {
    it.fired = true;
    it.flash = 1;
    const row = it.kind !== 'laserV', col = it.kind !== 'laserH';
    if (row) beams.push({ horiz: true, c: it.c, r: it.r, life: 1 });
    if (col) beams.push({ horiz: false, c: it.c, r: it.r, life: 1 });
    items.forEach(k => {
      if (k.kind !== 'block' || k.gone) return;
      if ((row && k.r === it.r) || (col && k.c === it.c)) damage(k);
    });
    Sfx.laser();
  }

  // rebote: cada bola que lo cruza sale en una dirección al azar
  function scatter(b, it) {
    it.fired = true;
    it.flash = 1;
    const sp = Math.hypot(b.vx, b.vy) || speed, a = Math.random() * Math.PI * 2;
    b.vx = Math.cos(a) * sp;
    b.vy = Math.sin(a) * sp;
    steep(b);
    burst(cx(it), cy(it), COL.fire, 4);
    Sfx.scatter();
  }

  // bomba: la primera bola que la toca la hace estallar; golpea fuerte los 8 de alrededor
  function explode(it) {
    it.gone = true;
    at[it.r * COLS + it.c] = null;
    const x = cx(it), y = cy(it);
    waves.push({ x, y, life: 1 });
    shake = REDUCE ? 0 : 6;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = it.r + dr, c = it.c + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const k = at[r * COLS + c];
        if (k && k.kind === 'block' && !k.gone) damage(k, round);
      }
    }
    burst(x, y, COL.fire, 14);
    Sfx.bomb();
  }

  function burst(x, y, col, n) {
    if (REDUCE) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * cell * 0.6, y: y + (Math.random() - 0.5) * cell * 0.6,
        vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 260,
        s: 2 + Math.random() * cell * 0.12, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, life: 1, col,
      });
    }
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }
  function confetti(x, y, n) {
    if (REDUCE) return;
    const cs = [tone(1), tone(round * 2), COL.acc, COL.ink, COL.fire];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 280 + Math.random() * 420;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 16, life: 1.6, col: cs[i % cs.length] });
    }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 980 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.life -= dt * (p.big ? 1.1 : 1.7);
      if (p.life <= 0 || p.y > H + 60) parts.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= dt * 1.3;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
  }

  // la guía de tiro: hasta el primer choque (pared, techo o bloque)
  function guideEnd() {
    const dx = Math.cos(aim.a), dy = -Math.sin(aim.a);
    const L = gx + br, R = gx + COLS * cell - br, T = gy + br;
    let x = shooter.x, y = floorY - br, d = 0;
    const max = H * 1.6;
    while (d < max) {
      x += dx * 3;
      y += dy * 3;
      d += 3;
      if (x <= L || x >= R || y <= T) break;
      const c = Math.floor((x - gx) / cell), r = Math.floor((y - gy) / cell);
      let hit = false;
      for (let rr = r - 1; rr <= r + 1 && !hit; rr++) {
        for (let cc = c - 1; cc <= c + 1 && !hit; cc++) {
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
          const k = at[rr * COLS + cc];
          if (k && k.kind === 'block' && touches(k, x, y)) hit = true;
        }
      }
      if (hit) break;
    }
    return { x: clamp(x, L, R), y: Math.max(y, T), d };
  }


  /* ---------- dibujo ---------- */
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
  }

  // polígono con las esquinas redondeadas (los triángulos)
  function roundPoly(c, v, r) {
    const n = v.length, a = v[n - 1], z = v[0];
    c.beginPath();
    c.moveTo((a[0] + z[0]) / 2, (a[1] + z[1]) / 2);
    for (let i = 0; i < n; i++) c.arcTo(v[i][0], v[i][1], v[(i + 1) % n][0], v[(i + 1) % n][1], r);
    c.closePath();
  }

  function render(now) {
    const c = ctx, t = now / 1000;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    if (shake > 0.2) c.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
    // en el inicio, la muestra de bloques es parte de la misma página que el
    // texto: si no cabe y se hace scroll, sube con él (si no, el título la pisa)
    if (state === 'attract' && screenNow === 'start') {
      const sy = ui.screens.start.scrollTop;
      if (sy) c.translate(0, -sy);
    }
    const fw = COLS * cell;

    const demo = state === 'attract';
    // retícula de puntos, como un lienzo de diseño (en el inicio, nada: solo la muestra)
    c.fillStyle = COL.line;
    for (let r = 0; r <= (demo ? -1 : ROWS); r++) {
      for (let q = 0; q <= COLS; q++) {
        c.beginPath();
        c.arc(gx + q * cell, gy + r * cell, 1.1, 0, Math.PI * 2);
        c.fill();
      }
    }
    // suelo: si un bloque está a una fila, avisa
    const danger = state === 'aim' && items.some(k => k.kind === 'block' && k.r >= ROWS - 2);
    if (!demo) {
      c.globalAlpha = danger && !REDUCE ? 0.55 + 0.45 * Math.sin(t * 6) : 1;
      c.fillStyle = danger ? COL.acc : COL.line;
      c.fillRect(gx, floorY, fw, danger ? 2 : 1);
      c.globalAlpha = 1;
    }

    // rayos de láser
    for (const bm of beams) {
      c.globalAlpha = bm.life;
      c.fillStyle = COL.fire;
      if (bm.horiz) c.fillRect(gx, gy + bm.r * cell + cell / 2 - 1.5 * bm.life, fw, 3 * bm.life);
      else c.fillRect(gx + bm.c * cell + cell / 2 - 1.5 * bm.life, gy, 3 * bm.life, ROWS * cell);
    }
    c.globalAlpha = 1;
    // ondas de las bombas
    for (const w of waves) {
      c.globalAlpha = w.life;
      c.strokeStyle = COL.fire;
      c.lineWidth = Math.max(1, 3 * w.life);
      c.beginPath();
      c.arc(w.x, w.y, cell * (0.3 + 1.3 * easeOut(1 - w.life)), 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    // bloques y objetos (bajan una fila animados; los nuevos aparecen creciendo)
    const g = gapPx(), s = cell - 2 * g, rad = cell * 0.16;
    const e = state === 'shift' ? easeOut(shiftT) : 1;
    const numSize = Math.round(cell * 0.34);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const k of items) {
      if (k.gone) continue;
      const row = state === 'shift' ? k.from + (k.r - k.from) * e : k.r;
      const x = gx + k.c * cell + cell / 2, y = gy + row * cell + cell / 2;
      let a = 1, sc = 1;
      if (k.born) {
        const p = clamp((t - k.born) / 0.32, 0, 1);
        if (p < 1) { if (REDUCE) { a = p; } else { const q = easeOut(p); a = q; sc = 0.6 + 0.4 * q; } }
      }
      if (a <= 0) continue;
      c.globalAlpha = a;
      if (k.kind === 'block') {
        const hs = (s / 2) * sc * (1 - 0.07 * k.hit);
        const isTri = k.tri != null;
        let lx = x, ly = y, room = s * 0.78, fs = numSize * sc;
        c.fillStyle = tone(k.hp);
        if (isTri) {
          const v = triVerts(x - hs, y - hs, hs * 2, k.tri);
          roundPoly(c, v, rad * sc * 0.75);
          // el número, en la parte gruesa del triángulo
          lx = (v[0][0] + v[1][0] + v[2][0]) / 3;
          ly = (v[0][1] + v[1][1] + v[2][1]) / 3;
          room = s * 0.4;
          fs *= 0.78;
        } else {
          rr(c, x - hs, y - hs, hs * 2, hs * 2, rad * sc);
        }
        c.fill();
        if (k.hit > 0) { c.globalAlpha = a * k.hit * 0.45; c.fillStyle = COL.ink; c.fill(); c.globalAlpha = a; }
        // el número de golpes que le quedan
        const label = k.hp >= 1000 ? fmt(k.hp) : String(k.hp);
        c.font = '600 ' + fs.toFixed(1) + 'px "Clash Display", Inter, sans-serif';
        const tw = c.measureText(label).width;
        if (tw > room) { fs *= room / tw; c.font = '600 ' + fs.toFixed(1) + 'px "Clash Display", Inter, sans-serif'; }
        c.fillStyle = COL.num;
        c.fillText(label, lx, ly + fs * 0.04);
      } else if (k.kind === 'scatter') {
        // rebote: un aro dorado de trazos que gira
        const ra = cell * 0.2 * sc, rot = REDUCE ? 0 : t * 1.6;
        c.globalAlpha = a * (k.fired ? 0.55 + 0.45 * (k.flash || 0) : 1);
        c.strokeStyle = COL.fire;
        c.lineWidth = Math.max(1.5, cell * 0.045);
        c.lineCap = 'round';
        for (let q = 0; q < 6; q++) {
          c.beginPath();
          c.arc(x, y, ra, rot + q * Math.PI / 3, rot + q * Math.PI / 3 + Math.PI / 6);
          c.stroke();
        }
        c.fillStyle = COL.fire;
        c.beginPath();
        c.arc(x, y, cell * 0.06 * sc, 0, Math.PI * 2);
        c.fill();
      } else if (k.kind === 'bomb') {
        // bomba: un disco dorado con su estallido alrededor, latiendo
        const pulse = REDUCE ? 0.5 : 0.5 + 0.5 * Math.sin(t * 5 + k.c);
        const ra = cell * 0.13 * sc;
        c.fillStyle = COL.fire;
        c.beginPath();
        c.arc(x, y, ra, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = COL.fire;
        c.lineWidth = Math.max(1.5, cell * 0.035);
        c.lineCap = 'round';
        c.globalAlpha = a * (0.45 + 0.55 * pulse);
        const r1 = ra * 1.5, r2 = ra * (1.85 + 0.2 * pulse);
        for (let q = 0; q < 8; q++) {
          const an = q * Math.PI / 4 + Math.PI / 8;
          c.beginPath();
          c.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1);
          c.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2);
          c.stroke();
        }
      } else if (k.kind === 'coin') {
        // moneda: un disco dorado que gira sobre sí mismo
        const ra = cell * 0.16 * sc;
        const flip = REDUCE ? 1 : 0.22 + 0.78 * Math.abs(Math.cos(t * 2.4 + k.c * 0.9));
        c.save();
        c.translate(x, y);
        c.scale(flip, 1);
        c.fillStyle = COL.fire;
        c.beginPath();
        c.arc(0, 0, ra, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = a * 0.5;
        c.strokeStyle = COL.bg;
        c.lineWidth = Math.max(1, cell * 0.024);
        c.beginPath();
        c.arc(0, 0, ra * 0.6, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      } else if (k.kind === 'plus') {
        const pulse = REDUCE ? 1 : 1 + 0.07 * Math.sin(t * 4 + k.c);
        const ra = cell * 0.21 * sc * pulse;
        c.strokeStyle = COL.ink;
        c.lineWidth = Math.max(1.5, cell * 0.035);
        c.beginPath();
        c.arc(x, y, ra, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = COL.ink;
        c.font = '700 ' + Math.round(cell * 0.17 * sc) + 'px Inter, sans-serif';
        c.fillText('+1', x + 0.5, y + 0.5);
      } else {
        // láser: una barra dorada con su dirección (la cruz, las dos)
        const len = cell * 0.5 * sc, th = Math.max(2, cell * 0.06);
        c.globalAlpha = a * (k.fired ? 0.55 + 0.45 * (k.flash || 0) : 1);
        c.fillStyle = COL.fire;
        if (k.kind !== 'laserV') { rr(c, x - len / 2, y - th / 2, len, th, th / 2); c.fill(); }
        if (k.kind !== 'laserH') { rr(c, x - th / 2, y - len / 2, th, len, th / 2); c.fill(); }
        c.beginPath();
        c.arc(x, y, cell * 0.09 * sc, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;

    // guía de tiro
    if (state === 'aim' && aim.on) {
      const end = guideEnd();
      const dx = Math.cos(aim.a), dy = -Math.sin(aim.a);
      const sp = Math.max(12, cell * 0.24);
      c.fillStyle = COL.ink;
      for (let d = sp; d < end.d - br; d += sp) {
        c.globalAlpha = 0.85 - 0.6 * (d / Math.max(end.d, 1));
        c.beginPath();
        c.arc(shooter.x + dx * d, floorY - br + dy * d, Math.max(1.4, br * 0.42), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 0.7;
      c.strokeStyle = COL.ink;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(end.x, end.y, br, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
    }

    // bolas en vuelo y las que vuelven
    c.fillStyle = COL.ink;
    for (const b of balls) {
      if (b.merged) continue;
      drawBall(c, b.x, b.y, REDUCE ? 0 : b.rot || 0);
    }
    // la pila: en la salida mientras quedan por salir; luego, donde cayó la primera
    // (nunca las dos cuentas a la vez: se pisarían)
    if (state === 'aim' || (state === 'fly' && toFire > 0)) {
      stack(c, shooter.x, state === 'fly' ? toFire : ballsN);
    } else if ((state === 'fly' || state === 'shift') && shooter.nx != null) {
      let m = 0;
      for (const b of balls) if (b.merged) m++;
      if (m) stack(c, shooter.nx, m);
    }
    if (state === 'shift' && shooter.nx == null) stack(c, shooter.x, ballsN);

    // trocitos
    for (const p of parts) {
      c.globalAlpha = Math.min(1, p.life);
      c.fillStyle = p.col;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.r);
      if (p.big) { rr(c, -p.s / 2, -p.s / 2, p.s, p.s, rad); c.fill(); }
      else c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      c.restore();
    }
    c.globalAlpha = 1;

    // +1 y +N que suben (los de las monedas, en dorado)
    if (pops.length) {
      for (const p of pops) {
        c.fillStyle = p.col || COL.ink;
        c.font = (p.big ? '700 ' + Math.round(cell * 0.3) + 'px "Clash Display", Inter' : '700 ' + Math.round(cell * 0.2) + 'px Inter') + ', sans-serif';
        c.globalAlpha = clamp(p.life * 1.4, 0, 1);
        c.fillText(p.t, p.x, p.y - (1.3 - p.life) * cell * 0.5);
      }
      c.globalAlpha = 1;
    }
  }

  /* la bola con la forma del logo: el logo de la cabecera pintado una vez en
     un canvas pequeño (a la resolución de la pantalla, en el color de la
     tinta) y estampado en cada bola, girando. Un poco más grande que la
     bola de verdad para que se lea; la física no cambia. */
  let logoPath = null, sprite = null, spriteKey = '';
  // el logo de la cabecera como Path2D (cara, ojos y silueta), una sola vez
  function ensureLogo() {
    if (logoPath === null) {
      logoPath = false;
      try {
        const fp = document.querySelector('.top-logo .tl-face'), ep = document.querySelector('.top-logo .tl-eyes');
        const svg = fp && fp.ownerSVGElement;
        if (svg && typeof Path2D === 'function') {
          // el primer trazo de la cara es su silueta exterior (con ella se rellena la cabeza de la serpiente)
          const d = fp.getAttribute('d'), cut = d.indexOf('M', 1);
          logoPath = {
            vb: svg.viewBox.baseVal, face: new Path2D(d), eyes: ep ? new Path2D(ep.getAttribute('d')) : null,
            outer: new Path2D(cut > 0 ? d.slice(0, cut) : d),
          };
        }
      } catch (e) { logoPath = false; }
    }
    return logoPath;
  }
  function logoSprite() {
    const key = br + '|' + DPR + '|' + COL.ink;
    if (sprite && spriteKey === key) return sprite;
    if (!ensureLogo()) return null;
    const vb = logoPath.vb, h = br * 2.6, w = h * vb.width / vb.height;
    const cvs = document.createElement('canvas');
    cvs.width = Math.ceil(w * DPR) + 2;
    cvs.height = Math.ceil(h * DPR) + 2;
    const g = cvs.getContext('2d');
    const k = (h * DPR) / vb.height;
    g.setTransform(k, 0, 0, k, 1 - vb.x * k, 1 - vb.y * k);
    g.fillStyle = COL.ink;
    g.fill(logoPath.face);
    if (logoPath.eyes) g.fill(logoPath.eyes);
    sprite = { c: cvs, w: cvs.width / DPR, h: cvs.height / DPR };
    spriteKey = key;
    return sprite;
  }
  function drawBall(c, x, y, rot) {
    const sp = Wallet.skin === 'logo' ? logoSprite() : null;
    if (!sp) {
      c.beginPath();
      c.arc(x, y, br, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.save();
    c.translate(x, y);
    if (rot) c.rotate(rot);
    c.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    c.restore();
  }

  // la bola de salida con su contador (×N)
  function stack(c, x, n) {
    if (n <= 0) return;
    c.fillStyle = COL.ink;
    drawBall(c, x, floorY - br, 0);
    c.font = '600 ' + Math.max(10, Math.round(cell * 0.18)) + 'px Inter, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.globalAlpha = 0.85;
    c.fillText('×' + fmt(n), clamp(x, gx + 16, gx + COLS * cell - 16), floorY + 8);
    c.globalAlpha = 1;
    c.textBaseline = 'middle';
  }

  /* ============================================================
     EL MENÚ Y LOS OTROS DOS JUEGOS
     Egg Ninja y Snake comparten con Break Time el modal, los colores, el
     sonido y el ranking. Cada uno es un motor con la misma forma (attract,
     start, update, render, down / move / up, key, size, pause, confetti)
     y el bucle llama al del juego elegido.
     ============================================================ */

  /* ---------- el menú: elegir juego ---------- */
  function showHub() {
    const from = game;
    token++;
    game = null;
    E = null;
    state = 'hub';
    keys.l = keys.r = 0;
    aim.press = false;
    root.classList.remove('is-game');
    delete root.dataset.game;
    root.setAttribute('aria-label', 'Arcade: tres minijuegos');
    ui.hint.classList.remove('is-on');
    ui.recall.classList.remove('is-on');
    ui.speed.classList.remove('is-on');
    ui.toast.classList.remove('is-on');
    ui.coins.disabled = false;
    ui.best.textContent = '';
    // el récord de cada uno, en su tarjeta
    ui.games.querySelectorAll('.bk-game').forEach(b => {
      const v = +store.get(GAMES[b.dataset.game].best) || 0;
      b.querySelector('.bk-game-best b').textContent = v ? fmt(v) : '—';
    });
    ui.screens.hub.scrollTop = 0;
    setScreen('hub');
    announce('Elige un juego');
    // al volver de un juego, el foco en su tarjeta
    if (from) {
      setTimeout(() => {
        if (state !== 'hub') return;
        const b = ui.games.querySelector('[data-game="' + from + '"]');
        if (FINE && b) b.focus({ preventScroll: true }); else panel.focus({ preventScroll: true });
      }, 60);
    }
  }
  // ↑ ↓ entre las tarjetas
  function hubKey(k) {
    if (k !== 'ArrowDown' && k !== 'ArrowUp') return false;
    const list = Array.prototype.slice.call(ui.games.querySelectorAll('.bk-game'));
    let i = list.indexOf(document.activeElement);
    i = i < 0 ? 0 : (i + (k === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
    list[i].focus({ preventScroll: true });
    return true;
  }

  function selectGame(g) {
    const G = GAMES[g];
    if (!G) return;
    token++;
    game = g;
    E = g === 'bbtan' ? null : ENGINES[g];
    root.dataset.game = g;
    root.setAttribute('aria-label', 'Minijuego: ' + G.name);
    ui.gTitle.innerHTML = G.title.map(w => '<span>' + w + '</span>').join(' ');
    ui.how.innerHTML = G.how;
    ui.hint.textContent = G.hint;
    ui.lbl.textContent = G.label;
    cv.setAttribute('aria-label', G.aria);
    ui.hint.classList.remove('is-on');
    ui.recall.classList.remove('is-on');
    ui.speed.classList.remove('is-on');
    ui.coins.disabled = false;
    best = +store.get(G.best) || 0;
    if (E) E.attract(); else attract();
    setBest();
    ui.screens.start.scrollTop = 0;
    setScreen('start');
    loadTop(ui.startBoard);
    // con ratón, directo al nombre; en táctil no (abriría el teclado de golpe)
    setTimeout(() => {
      if (!opened || screenNow !== 'start') return;
      if (FINE) (ui.input.value ? ui.go : ui.input).focus({ preventScroll: true });
      else panel.focus({ preventScroll: true });
    }, 60);
  }

  function startGame() {
    Sfx.init();
    if (game === 'bbtan') { newGame(); return; }
    if (!E) return;
    token++;
    recToast = false;
    ui.score.textContent = '0';
    setBest();
    root.classList.add('is-game');
    setScreen(null);
    E.start();
    ui.hint.classList.add('is-on');
    panel.focus({ preventScroll: true });
    announce(GAMES[game].name + ': empieza la partida');
  }
  // los motores avisan de cada punto; el récord se celebra una vez por partida
  function setScore(n) {
    ui.score.textContent = fmt(n);
    if (best > 0 && n > best && !recToast) {
      recToast = true;
      toast('Nuevo récord', fmt(n));
      Sfx.record();
    }
  }
  function finish(score, stats) {
    state = 'over';
    ui.hint.classList.remove('is-on');
    const my = ++token;
    setTimeout(() => { if (my === token && opened) showOver(my, score, stats); }, REDUCE ? 250 : 1100);
  }

  // en el inicio, si se hace scroll, la cabecera dibujada sube con el texto
  const startScroll = () => (state === 'attract' && screenNow === 'start' ? ui.screens.start.scrollTop : 0);
  const lerp = (a, b, k) => a + (b - a) * k;


  /* ---------- efectos compartidos por los dos ---------- */
  const fx = { parts: [], pops: [], shake: 0, flash: 0 };
  function fxReset() { fx.parts.length = 0; fx.pops.length = 0; fx.shake = 0; fx.flash = 0; }
  function fxBurst(x, y, col, n, sp, sz) {
    if (REDUCE) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * (sp || 260);
      fx.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, s: (sz || 4) * (0.6 + Math.random() * 0.8),
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, life: 1, col, dot: Math.random() < 0.5,
      });
    }
    if (fx.parts.length > 400) fx.parts.splice(0, fx.parts.length - 400);
  }
  function fxPop(x, y, t, col, big) {
    fx.pops.push({ x: clamp(x, 44, W - 44), y, t, col: col || COL.ink, big: !!big, life: 1 });
  }
  function fxConfetti() {
    if (REDUCE) return;
    const cs = [COL.acc, COL.ink, COL.fire, COL.shell];
    for (let i = 0; i < 70; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 280 + Math.random() * 420;
      fx.parts.push({ x: W / 2, y: H * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 16, life: 1.6, col: cs[i % cs.length] });
    }
  }
  function fxStep(dt) {
    for (let i = fx.parts.length - 1; i >= 0; i--) {
      const p = fx.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.life -= dt * 1.7;
      if (p.life <= 0 || p.y > H + 40) fx.parts.splice(i, 1);
    }
    for (let i = fx.pops.length - 1; i >= 0; i--) {
      fx.pops[i].life -= dt * (fx.pops[i].big ? 0.9 : 1.3);
      if (fx.pops[i].life <= 0) fx.pops.splice(i, 1);
    }
    fx.shake = Math.max(0, fx.shake - dt * 30);
    fx.flash = Math.max(0, fx.flash - dt * 2.4);
  }
  function fxDraw(c) {
    for (const p of fx.parts) {
      c.globalAlpha = Math.min(1, p.life);
      c.fillStyle = p.col;
      if (p.dot) {
        c.beginPath();
        c.arc(p.x, p.y, p.s / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        c.restore();
      }
    }
    c.globalAlpha = 1;
    if (!fx.pops.length) return;
    const big = Math.round(clamp(W * 0.058, 20, 30)), small = Math.round(clamp(W * 0.034, 13, 16));
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const p of fx.pops) {
      const k = 1 - p.life;
      // los grandes entran con un pequeño salto; todos suben y se desvanecen
      const sc = p.big && !REDUCE ? 1 + 0.3 * (1 - easeOut(Math.min(1, k * 5))) : 1;
      c.globalAlpha = clamp(p.life * 1.6, 0, 1);
      c.fillStyle = p.col;
      c.font = p.big ? '600 ' + big + 'px "Clash Display", Inter, sans-serif' : '700 ' + small + 'px Inter, sans-serif';
      c.save();
      c.translate(p.x, p.y - easeOut(k) * (p.big ? 22 : 30));
      if (sc !== 1) c.scale(sc, sc);
      c.fillText(p.t, 0, 0);
      c.restore();
    }
    c.globalAlpha = 1;
  }
  function fxShake(c) {
    if (fx.shake > 0.2) c.translate((Math.random() * 2 - 1) * fx.shake, (Math.random() * 2 - 1) * fx.shake);
  }

  // la retícula de puntos (como en Break Time), pintada una vez en un canvas aparte
  let dotsCv = null, dotsKey = '';
  function dots(c, x0, y0, nx, ny, step) {
    const key = [W, H, DPR, COL.line, x0, y0, nx, ny, step].join('|');
    if (dotsKey !== key) {
      dotsCv = dotsCv || document.createElement('canvas');
      dotsCv.width = Math.round(W * DPR);
      dotsCv.height = Math.round(H * DPR);
      const g = dotsCv.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, W, H);
      g.fillStyle = COL.line;
      for (let i = 0; i <= nx; i++) {
        for (let j = 0; j <= ny; j++) {
          g.beginPath();
          g.arc(x0 + i * step, y0 + j * step, 1.1, 0, Math.PI * 2);
          g.fill();
        }
      }
      dotsKey = key;
    }
    c.drawImage(dotsCv, 0, 0, W, H);
  }

  // destello de cuatro puntas (la chispa de la mecha, el brillo del huevo dorado)
  function sparkle(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
  }


  /* ---------- EGG NINJA ----------
     Los huevos saltan desde abajo en tandas; los cortas pasando el ratón
     deprisa (o deslizando el dedo). Cada uno vale 1, los dorados 5, y tres
     o más de un tajo suman el combo. Se te escapan tres, o cortas una
     bomba, y se acabó. Las tandas crecen y se aceleran con los puntos, y
     de vez en cuando llega una ráfaga de huevos a la vez. */
  const Egg = (() => {
    const TRAIL = 0.13;                    // lo que dura la estela del tajo (s)
    let eggs = [], halves = [], splats = [], trail = [], queue = [];
    let time = 0, score = 0, lives = 3, cut = 0, golds = 0, bestCombo = 0;
    let combo = 0, comboT = 0, comboX = 0, comboY = 0, waveT = 0;
    let er = 24, G = 900, band = 180, demoT = 0, auto = null;
    let px = 0, py = 0, pt = 0, has = false, pressed = false, stroke = 0, inStroke = false;
    const lost = [0, 0, 0];
    let eggPath = null;

    function size() {
      er = clamp(Math.min(W, H) * 0.062, 19, 32);
      G = H * 1.25;
      band = Math.round(clamp(H * 0.26, 150, 210));
      if (state === 'attract' && game === 'egg') root.style.setProperty('--bk-gb', band + 'px');
    }
    // el huevo, a tamaño 1 (medio ancho = 1): más estrecho arriba
    function shape() {
      if (eggPath) return eggPath;
      const p = new Path2D();
      p.moveTo(0, -1.32);
      p.bezierCurveTo(0.6, -1.32, 1, -0.62, 1, 0.12);
      p.bezierCurveTo(1, 0.68, 0.58, 1.02, 0, 1.02);
      p.bezierCurveTo(-0.58, 1.02, -1, 0.68, -1, 0.12);
      p.bezierCurveTo(-1, -0.62, -0.6, -1.32, 0, -1.32);
      p.closePath();
      eggPath = p;
      return p;
    }
    const outlined = () => COL.shellLine && COL.shellLine !== 'transparent' && COL.shellLine !== 'rgba(0, 0, 0, 0)';

    function reset() {
      eggs = []; halves = []; splats = []; trail = []; queue = [];
      combo = 0; auto = null; inStroke = false; has = false; pressed = false;
      lost[0] = lost[1] = lost[2] = 0;
      fxReset();
    }

    /* en el inicio: huevos, uno dorado y una bomba flotando en la cabecera;
       cada poco, un tajo de muestra corta uno (y con el ratón puedes probar) */
    function attract() {
      state = 'attract';
      reset();
      size();
      const kinds = narrow ? ['egg', 'bomb', 'gold', 'egg'] : ['egg', 'bomb', 'egg', 'gold', 'egg'];
      kinds.forEach((k, i) => eggs.push({
        kind: k, float: true, hx: (i + 0.5) / kinds.length, ph: i * 1.7, r0: (i % 2 ? 1 : -1) * 0.22,
        x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, born: time + 0.15 + i * 0.07, gone: 0,
      }));
      demoT = 1.4;
    }

    function start() {
      reset();
      state = 'play';
      score = 0; lives = 3; cut = 0; golds = 0; bestCombo = 0;
      waveT = 0.7;
    }

    // un huevo (o bomba) sale desde abajo: sube hasta una altura al azar y cae
    function launch(kind, fan) {
      const x0 = fan != null ? W * (0.2 + fan * 0.6) : W * (0.18 + Math.random() * 0.64);
      const xt = clamp(x0 + (Math.random() - 0.5) * W * 0.6, W * 0.1, W * 0.9);
      const apex = H * (0.1 + Math.random() * 0.3);
      const y0 = H + er * 1.6;
      const vy = -Math.sqrt(2 * G * (y0 - apex));
      const tUp = -vy / G;
      eggs.push({ kind, x: x0, y: y0, vx: (xt - x0) / (2 * tUp), vy, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3.2, ph: Math.random() * 9 });
    }
    // una tanda: crece con los puntos; desde 5 puntos, alguna bomba (nunca solo bombas)
    function wave() {
      if (score >= 20 && Math.random() < 0.08) {
        // ráfaga: un abanico de huevos a la vez, para hacer combo
        const n = 5 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) queue.push({ kind: 'egg', at: time + i * 0.06, fan: i / (n - 1) });
        return n;
      }
      let n = score < 3 ? 1 : 1 + Math.floor(Math.random() * Math.min(4, 1 + score / 10));
      const pb = score < 5 ? 0 : Math.min(0.22, 0.07 + score * 0.003);
      let good = 0;
      for (let i = 0; i < n; i++) {
        let kind = Math.random() < pb ? 'bomb' : 'egg';
        if (kind === 'egg' && score >= 12 && Math.random() < 0.06) kind = 'gold';
        if (i === n - 1 && !good) kind = 'egg';
        if (kind !== 'bomb') good++;
        queue.push({ kind, at: time + i * (0.16 + Math.random() * 0.2) });
      }
      return n;
    }

    function update(dt) {
      time += dt;
      if (state === 'attract') demo(dt);
      if (state === 'play') {
        waveT -= dt;
        let flying = 0;
        for (const e of eggs) if (!e.float) flying++;
        if (waveT <= 0 && flying < 8) {
          const n = wave();
          waveT = Math.max(0.8, 1.6 - score * 0.011) + n * 0.1;
        }
        for (let i = queue.length - 1; i >= 0; i--) {
          if (queue[i].at <= time) { launch(queue[i].kind, queue[i].fan); queue.splice(i, 1); }
        }
        if (combo && time - comboT > 0.3) endCombo();
      }
      for (let i = eggs.length - 1; i >= 0; i--) {
        const e = eggs[i];
        if (e.float) continue;
        e.vy += G * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot += e.vr * dt;
        if (e.vy > 0 && e.y > H + er * 2) {
          eggs.splice(i, 1);
          if (state === 'play' && e.kind !== 'bomb') miss(e);
        }
      }
      for (let i = halves.length - 1; i >= 0; i--) {
        const h = halves[i];
        h.vy += G * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.rot += h.vr * dt;
        if (h.y > H + er * 3) halves.splice(i, 1);
      }
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i];
        s.life -= dt * 0.75;
        s.y += 16 * dt;               // escurre un poco hacia abajo
        if (s.life <= 0) splats.splice(i, 1);
      }
      while (trail.length && time - trail[0].t > TRAIL) trail.shift();
      fxStep(dt);
    }

    function demo(dt) {
      for (const e of eggs) {
        if (!e.float) continue;
        if (e.gone && time >= e.gone) { e.gone = 0; e.born = time; }
        e.x = e.hx * W;
        e.y = band * 0.5 + (REDUCE ? 0 : Math.sin(time * 1.5 + e.ph) * 6);
        e.rot = e.r0 + (REDUCE ? 0 : Math.sin(time * 1.1 + e.ph) * 0.12);
      }
      if (REDUCE) return;
      demoT -= dt;
      if (demoT <= 0 && !auto) {
        const pool = eggs.filter(e => e.float && e.kind !== 'bomb' && !e.gone && time - e.born > 0.4);
        if (pool.length) {
          const e = pool[Math.floor(Math.random() * pool.length)];
          const a = -0.55 + (Math.random() - 0.5) * 0.7, L = er * 2.6;
          auto = { x0: e.x - Math.cos(a) * L, y0: e.y - Math.sin(a) * L, x1: e.x + Math.cos(a) * L, y1: e.y + Math.sin(a) * L, k: 0 };
          stroke++;
          trail.push({ x: auto.x0, y: auto.y0, t: time, s: stroke });
        }
        demoT = 2.3 + Math.random() * 1.2;
      }
      if (auto) {
        const k0 = auto.k;
        auto.k = Math.min(1, auto.k + dt / 0.16);
        const ax = lerp(auto.x0, auto.x1, k0), ay = lerp(auto.y0, auto.y1, k0);
        const bx = lerp(auto.x0, auto.x1, auto.k), by = lerp(auto.y0, auto.y1, auto.k);
        trail.push({ x: bx, y: by, t: time, s: stroke });
        slash(ax, ay, bx, by);
        if (auto.k >= 1) auto = null;
      }
    }

    // distancia del punto al segmento
    function segDist(x, y, x0, y0, x1, y1) {
      const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy;
      const t = l ? clamp(((x - x0) * dx + (y - y0) * dy) / l, 0, 1) : 0;
      return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
    }
    function slash(x0, y0, x1, y1) {
      const a = Math.atan2(y1 - y0, x1 - x0);
      for (let i = eggs.length - 1; i >= 0; i--) {
        if (state !== 'play' && state !== 'attract') return;
        const e = eggs[i];
        if (e.gone || (e.float && time - e.born < 0.25)) continue;
        if (segDist(e.x, e.y, x0, y0, x1, y1) > er * (e.kind === 'bomb' ? 0.85 : 1.12)) continue;
        if (e.float) e.gone = time + 1.4; else eggs.splice(i, 1);
        hit(e, a);
      }
    }

    function hit(e, a) {
      if (e.kind === 'bomb') {
        if (state === 'attract') {
          // en la muestra, la bomba solo hace «puf»
          fxBurst(e.x, e.y, COL.fire, 12, 260, er * 0.16);
          fx.flash = 0.35;
          return;
        }
        boom(e);
        return;
      }
      // dos mitades que se separan, perpendiculares al tajo
      const nx = -Math.sin(a), ny = Math.cos(a), push = 70 + Math.random() * 50;
      for (const s of [1, -1]) {
        halves.push({
          x: e.x, y: e.y, vx: e.vx + nx * push * s + Math.cos(a) * 50, vy: Math.min(e.vy, 0) * 0.35 + ny * push * s - 70,
          rot: e.rot, vr: e.vr + s * (1.6 + Math.random()), cut: a - e.rot, side: s, gold: e.kind === 'gold',
        });
      }
      // la mancha de huevo frito que se queda detrás
      const blobs = [{ x: 0, y: 0, r: er * 0.72 }];
      for (let q = 0; q < 5; q++) {
        const an = q * 1.257 + Math.random() * 0.8, d = er * (0.42 + Math.random() * 0.3);
        blobs.push({ x: Math.cos(an) * d, y: Math.sin(an) * d, r: er * (0.24 + Math.random() * 0.2) });
      }
      splats.push({ x: e.x, y: e.y, blobs, yx: (Math.random() - 0.5) * er * 0.3, yy: (Math.random() - 0.5) * er * 0.3, life: 1, gold: e.kind === 'gold' });
      fxBurst(e.x, e.y, COL.fire, 7, 230, er * 0.16);
      fxBurst(e.x, e.y, COL.shell, 6, 260, er * 0.14);
      if (state !== 'play') return;
      const pts = e.kind === 'gold' ? 5 : 1;
      if (e.kind === 'gold') golds++;
      score += pts;
      cut++;
      combo++;
      comboT = time;
      comboX = e.x;
      comboY = e.y;
      Sfx.slice(combo);
      fxPop(e.x, e.y - er * 1.3, '+' + pts, e.kind === 'gold' ? COL.fire : COL.ink);
      setScore(score);
      if (cut === 1) ui.hint.classList.remove('is-on');
    }
    function endCombo() {
      if (combo >= 3) {
        score += combo;
        bestCombo = Math.max(bestCombo, combo);
        fxPop(comboX, Math.max(er * 3, comboY - er * 2.4), 'Combo ×' + combo, COL.fire, true);
        Sfx.plus();
        setScore(score);
        announce('Combo de ' + combo);
      }
      combo = 0;
    }
    function miss(e) {
      lives = Math.max(0, lives - 1);
      lost[lives] = time;
      Sfx.miss();
      fxPop(e.x, H - 30, '×', COL.acc, true);
      announce(lives ? (lives === 1 ? 'Queda un huevo' : 'Quedan ' + lives + ' huevos') : 'Sin huevos');
      if (!lives) over();
    }
    // la bomba: fogonazo, temblor y se acabó
    function boom(e) {
      fx.flash = 1;
      fx.shake = REDUCE ? 0 : 12;
      fxBurst(e.x, e.y, COL.fire, 26, 460, er * 0.2);
      fxBurst(e.x, e.y, COL.ink, 12, 320, er * 0.14);
      Sfx.bomb();
      over(true);
    }
    function over(bomb) {
      if (combo) endCombo();
      queue = [];
      trail = [];
      if (!bomb) Sfx.over();
      const stats = fmt(cut) + (cut === 1 ? ' huevo' : ' huevos')
        + (bestCombo >= 3 ? ' · combo ×' + bestCombo : '')
        + (golds ? ' · ' + golds + (golds === 1 ? ' dorado' : ' dorados') : '');
      finish(score, stats);
    }

    /* puntero: corta si se mueve deprisa. Con ratón basta con pasar por
       encima (sin clic); con el dedo, deslizando */
    function down(p) {
      if (state !== 'play') return;
      pressed = true;
      px = p.x; py = p.y; pt = performance.now(); has = true;
      inStroke = false;
    }
    function move(p, e) {
      if (state !== 'play' && state !== 'attract') return;
      const mouse = e.pointerType === 'mouse';
      if (state === 'attract') {
        if (!mouse || screenNow !== 'start') return;
        p.y += startScroll();
        if (p.y > band) { has = false; return; }
      } else if (!mouse && !pressed) return;
      const now = performance.now();
      if (!has || now - pt > 90) { px = p.x; py = p.y; pt = now; has = true; inStroke = false; return; }
      const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy);
      const fast = d / Math.max(1, now - pt) > (mouse && !pressed ? 0.5 : 0.22);
      if (fast && d > 1) {
        if (!inStroke) { stroke++; trail.push({ x: px, y: py, t: time, s: stroke }); inStroke = true; }
        trail.push({ x: p.x, y: p.y, t: time, s: stroke });
        slash(px, py, p.x, p.y);
      } else inStroke = false;
      px = p.x; py = p.y; pt = now;
    }
    function up() { pressed = false; inStroke = false; }
    function pause() { pressed = false; inStroke = false; has = false; trail = []; }

    /* ---- dibujo ---- */
    function drawEgg(c, e, s) {
      const gold = e.kind === 'gold';
      c.save();
      c.translate(e.x, e.y);
      c.rotate(e.rot);
      c.scale(er * s, er * s);
      const p = shape();
      c.fillStyle = gold ? COL.fire : COL.shell;
      c.fill(p);
      if (!gold && outlined()) { c.lineWidth = 1.5 / (er * s); c.strokeStyle = COL.shellLine; c.stroke(p); }
      // un brillo plano arriba a la izquierda
      c.globalAlpha = gold ? 0.45 : 0.6;
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(-0.42, -0.48, 0.13, 0.28, 0.4, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.restore();
      if (gold && !REDUCE) {
        const tw = Math.max(0, Math.sin(time * 4 + e.ph));
        if (tw > 0.05) { c.fillStyle = COL.fire; sparkle(c, e.x + er * 0.9 * s, e.y - er * 1.1 * s, er * 0.32 * s * tw); }
      }
    }
    function drawBomb(c, e, s) {
      const r = er * 0.92 * s;
      c.save();
      c.translate(e.x, e.y);
      c.rotate(e.rot * 0.5);
      // la mecha y su chispa
      c.strokeStyle = COL.mute;
      c.lineWidth = Math.max(1.5, er * 0.09);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, -r * 0.95);
      c.quadraticCurveTo(r * 0.12, -r * 1.5, r * 0.62, -r * 1.42);
      c.stroke();
      c.fillStyle = COL.bomb;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      const line = COL.bombLine && COL.bombLine !== 'transparent' && COL.bombLine !== 'rgba(0, 0, 0, 0)';
      if (line) { c.lineWidth = Math.max(1.5, er * 0.075); c.strokeStyle = COL.bombLine; c.stroke(); }
      rr(c, -r * 0.3, -r * 1.12, r * 0.6, r * 0.34, r * 0.08);
      c.fill();
      if (line) c.stroke();
      c.globalAlpha = 0.3;
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(-r * 0.4, -r * 0.36, r * 0.14, r * 0.26, 0.7, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      const fl = REDUCE ? 1 : 0.65 + 0.35 * Math.sin(time * 38 + (e.ph || 0));
      c.fillStyle = COL.fire;
      sparkle(c, r * 0.62, -r * 1.42, er * 0.34 * fl);
      c.restore();
    }
    // media cáscara: el huevo recortado por la línea del tajo, con la yema a la vista
    function drawHalf(c, h) {
      c.save();
      c.translate(h.x, h.y);
      c.rotate(h.rot);
      c.scale(er, er);
      c.rotate(h.cut);
      c.beginPath();
      c.rect(-3, h.side > 0 ? 0 : -3, 6, 3);
      c.clip();
      c.rotate(-h.cut);
      const p = shape();
      c.fillStyle = h.gold ? COL.fire : COL.shell;
      c.fill(p);
      if (!h.gold && outlined()) { c.lineWidth = 1.5 / er; c.strokeStyle = COL.shellLine; c.stroke(p); }
      c.fillStyle = h.gold ? COL.shell : COL.fire;
      c.beginPath();
      c.arc(0, 0.1, 0.46, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    function drawSplat(c, s) {
      c.globalAlpha = Math.min(1, s.life * 1.6) * 0.85;
      c.fillStyle = COL.shell;
      c.beginPath();
      for (const b of s.blobs) { c.moveTo(s.x + b.x + b.r, s.y + b.y); c.arc(s.x + b.x, s.y + b.y, b.r, 0, Math.PI * 2); }
      c.fill();
      c.fillStyle = s.gold ? COL.acc : COL.fire;
      c.beginPath();
      c.arc(s.x + s.yx, s.y + s.yy, er * 0.36, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    function drawTrail(c) {
      c.lineCap = 'round';
      c.strokeStyle = COL.ink;
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        if (a.s !== b.s) continue;
        const k = 1 - (time - b.t) / TRAIL;
        if (k <= 0) continue;
        c.globalAlpha = k;
        c.lineWidth = Math.max(1, er * 0.2 * k);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // las vidas: tres huevos arriba a la derecha; el que se pierde se queda rajado
    function drawLives(c) {
      const s = clamp(er * 0.36, 7, 11);
      for (let i = 0; i < 3; i++) {
        const x = W - 18 - s - i * (s * 2 + 9), y = 16 + s * 1.32;
        const alive = i < lives;
        const k = !alive && lost[i] ? clamp((time - lost[i]) / 0.4, 0, 1) : 1;
        c.save();
        c.translate(x, y);
        const sc = s * (REDUCE ? 1 : 1 + 0.45 * (1 - easeOut(k)));
        c.scale(sc, sc);
        if (alive) {
          c.fillStyle = COL.shell;
          c.fill(shape());
          if (outlined()) { c.lineWidth = 1.4 / sc; c.strokeStyle = COL.shellLine; c.stroke(shape()); }
        } else {
          c.lineWidth = 1.4 / sc;
          c.strokeStyle = k < 1 ? COL.acc : COL.mute;
          c.stroke(shape());
          c.beginPath();
          c.moveTo(-0.95, -0.12); c.lineTo(-0.4, 0.2); c.lineTo(0, -0.2); c.lineTo(0.45, 0.16); c.lineTo(0.95, -0.06);
          c.stroke();
        }
        c.restore();
      }
    }

    function render() {
      const c = ctx;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, W, H);
      const demoOn = state === 'attract';
      if (fx.flash > 0) {
        c.globalAlpha = fx.flash * 0.45;
        c.fillStyle = COL.fire;
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
      fxShake(c);
      if (demoOn) {
        c.translate(0, -startScroll());
        c.save();
        c.beginPath();
        c.rect(0, 0, W, band);
        c.clip();
      } else {
        const step = Math.round(clamp(W / 11, 34, 48));
        const nx = Math.floor((W - 24) / step), ny = Math.floor((H - 24) / step);
        dots(c, Math.round((W - nx * step) / 2), Math.round((H - ny * step) / 2), nx, ny, step);
      }
      for (const s of splats) drawSplat(c, s);
      for (const h of halves) drawHalf(c, h);
      for (const e of eggs) {
        if (e.gone) continue;
        let s = 1;
        if (e.float && e.born) {
          const k = clamp((time - e.born) / 0.35, 0, 1);
          s = REDUCE ? (k > 0 ? 1 : 0) : easeOut(k);
          if (s < 0.02) continue;
        }
        if (e.kind === 'bomb') drawBomb(c, e, s); else drawEgg(c, e, s);
      }
      drawTrail(c);
      fxDraw(c);
      if (demoOn) c.restore();
      else drawLives(c);
    }

    return {
      attract, start, update, render, down, move, up, pause, size,
      key: () => false,
      confetti: fxConfetti,
    };
  })();


  /* ---------- SNAKE ----------
     El de siempre, con la cara del logo de cabeza (sus ojos miran hacia
     donde va). Come granos de café para crecer (+1) y cada vez va más
     rápido; de vez en cuando sale una estrella (+5) que se va si tardas.
     Si chocas con el borde o contigo mismo, se acabó. Flechas / WASD, o
     deslizando el dedo.
     · Se mueve suave entre casilla y casilla, con la cabeza por delante:
       lo que ves es dónde está (come el grano justo al llegar a él).
     · Las flechas responden en el mismo fotograma: si la cabeza está en
       la primera mitad del paso, gira ya desde la casilla que acaba de
       dejar (como si hubieras pulsado en el centro); si está en la
       segunda, termina el paso ya y gira. El pequeño salto que eso
       supone se suaviza en unos pocos fotogramas.
     · Si el siguiente paso es contra el borde o contra sí misma, la
       cabeza se queda pegada un instante (un paso) antes de chocar: da
       tiempo a esquivar en el último momento. */
  const Snake = (() => {
    const STAR_LIFE = 6;
    const EARLY = 0.42, LATE = 0.42;   // antes: gira desde la casilla que deja; después: completa el paso y gira
    let cols = 17, rows = 24, cs = 24, ox = 0, oy = 0;
    // dir: hacia dónde va el paso en curso; moved: el último paso hecho
    let body = [], dir = { x: 1, y: 0 }, moved = { x: 1, y: 0 }, facing = 1, queue = [], acc = 0, ivl = 130, grow = 0, blocked = false;
    let food = null, star = null, eaten = 0, score = 0, stars = 0, chomp = 0, dead = 0, crumbled = 0;
    let time = 0, band = 170, sw = null, kx = 0, ky = 0;
    const demo = { lap: -1, beans: [], chomp: 0 };

    function grid(fresh) {
      const pad = narrow ? 12 : 20;
      if (fresh) {
        cols = narrow ? 15 : 17;
        const c0 = Math.max(12, Math.floor((W - pad * 2) / cols));
        rows = clamp(Math.floor((H - pad - 38) / c0), 12, Math.round(cols * 1.55));
      }
      // en mitad de una partida el tablero no cambia de casillas: solo de tamaño
      cs = Math.max(8, Math.floor(Math.min((W - pad * 2) / cols, (H - pad - 38) / rows)));
      ox = Math.round((W - cols * cs) / 2);
      oy = Math.round(Math.max(pad, (H - 26 - rows * cs) / 2));
    }
    function size() {
      grid(state === 'attract' || state === 'hub' || state === 'idle');
      band = Math.round(clamp(H * 0.22, 130, 190));
      if (state === 'attract' && game === 'snake') root.style.setProperty('--bk-gb', band + 'px');
    }
    const cxs = x => ox + x * cs + cs / 2;
    const cys = y => oy + y * cs + cs / 2;

    function attract() {
      state = 'attract';
      fxReset();
      demo.lap = -1;
      size();
    }

    function start() {
      fxReset();
      grid(true);
      const y = Math.floor(rows / 2), x = Math.floor(cols / 2) - 1;
      body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }];
      dir = { x: 1, y: 0 };
      moved = { x: 1, y: 0 };
      facing = 1;
      queue = [];
      acc = 0;
      grow = 0;
      blocked = false;
      kx = ky = 0;
      eaten = 0; score = 0; stars = 0; chomp = 0; dead = 0; crumbled = 0;
      ivl = 130;
      star = null;
      food = null;
      placeFood();
      state = 'ready';            // quieta hasta la primera flecha
    }

    function free(x, y) {
      for (const s of body) if (s.x === x && s.y === y) return false;
      if (food && food.x === x && food.y === y) return false;
      if (star && star.x === x && star.y === y) return false;
      return true;
    }
    function spot() {
      const h = body[0];
      for (let n = 0; n < 300; n++) {
        const x = Math.floor(Math.random() * cols), y = Math.floor(Math.random() * rows);
        if (free(x, y) && Math.abs(x - h.x) + Math.abs(y - h.y) > 2) return { x, y };
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (free(x, y)) return { x, y };
      return null;
    }
    function placeFood() { food = spot(); if (food) food.born = time; }
    function placeStar() { star = spot(); if (star) { star.born = time; star.life = STAR_LIFE; } }

    // ¿la casilla a la que va la cabeza la mata? (la cola deja la suya en ese paso, salvo si crece)
    function deadly(d) {
      const nx = body[0].x + d.x, ny = body[0].y + d.y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return true;
      const upto = body.length - (grow > 0 ? 0 : 1);
      for (let i = 1; i < upto; i++) if (body[i].x === nx && body[i].y === ny) return true;
      return false;
    }
    // lo que ha avanzado el paso en curso (contra un obstáculo, apenas se asoma)
    function prog() {
      const live = state === 'play' || (state === 'pause' && prevState === 'play');
      if (!live) return state === 'over' ? 0.15 : 0;
      const p = clamp(acc / ivl, 0, 1);
      return blocked ? Math.min(p, 0.15) : p;
    }
    function headAt(p) {
      const h = body[0];
      return { x: cxs(h.x) + dir.x * cs * p, y: cys(h.y) + dir.y * cs * p };
    }
    // el salto de la cabeza al girar antes de tiempo se reparte en unos fotogramas
    function smooth(before) {
      const a = headAt(prog());
      kx += before.x - a.x;
      ky += before.y - a.y;
    }
    function setDir(d) {
      dir = d;
      if (d.x) facing = d.x;
      blocked = deadly(d);
    }

    // cambio de dirección: se aplica ya si se puede; si no, a la cola (como mucho tres)
    function turn(dx, dy) {
      const d = { x: dx, y: dy };
      if (state === 'ready') {
        if (dx === -moved.x && dy === -moved.y) {
          // de salida sí puede dar la vuelta: la cola pasa a ser la cabeza
          body.reverse();
          moved = { x: body[0].x - body[1].x, y: body[0].y - body[1].y };
        }
        queue = [];
        acc = 0;
        setDir(d);
        state = 'play';
        ui.hint.classList.remove('is-on');
        return;
      }
      if (state !== 'play') return;
      // pegada a un obstáculo: el giro de última hora manda sobre lo que hubiera en cola
      if (blocked && !(dx === -moved.x && dy === -moved.y) && !(dx === dir.x && dy === dir.y)) {
        const before = headAt(prog());
        queue = [];
        setDir(d);
        smooth(before);
        return;
      }
      if (queue.length) {
        const last = queue[queue.length - 1];
        if ((dx === last.x && dy === last.y) || (dx === -last.x && dy === -last.y)) return;
        if (queue.length < 3) queue.push(d);
        return;
      }
      if (dx === dir.x && dy === dir.y) return;
      const p = acc / ivl, before = headAt(prog());
      // recién salida de la casilla (o pegada a un obstáculo): gira ya, desde el centro
      if ((p < EARLY || blocked) && !(dx === -moved.x && dy === -moved.y)) {
        setDir(d);
        smooth(before);
        return;
      }
      if (dx === -dir.x && dy === -dir.y) return;
      queue.push(d);
      // casi en la siguiente: termina el paso ya y gira
      if (p > LATE) {
        acc = 0;
        advance();
        if (state === 'play') smooth(before);
      }
    }

    // un paso: la cabeza entra en la casilla a la que iba
    function advance() {
      if (deadly(dir)) { die(); return; }
      const h = body[0], nx = h.x + dir.x, ny = h.y + dir.y;
      body.unshift({ x: nx, y: ny });
      if (grow > 0) grow--; else body.pop();
      moved = dir;
      if (food && nx === food.x && ny === food.y) eat();
      if (star && nx === star.x && ny === star.y) eatStar();
      // el siguiente paso: el giro que esperaba, si es válido
      let next = dir;
      while (queue.length) {
        const q = queue.shift();
        if (!(q.x === -moved.x && q.y === -moved.y)) { next = q; break; }
      }
      setDir(next);
    }
    function eat() {
      eaten++;
      score++;
      grow++;
      chomp = 1;
      ivl = Math.max(68, 130 - eaten * 1.8);
      fxBurst(cxs(food.x), cys(food.y), COL.fire, 8, 160, cs * 0.14);
      fxPop(cxs(food.x), cys(food.y) - cs * 0.7, '+1', COL.ink);
      Sfx.brk(1 + ((eaten - 1) % 10));
      setScore(score);
      placeFood();
      if (eaten % 6 === 0 && !star) placeStar();
    }
    function eatStar() {
      score += 5;
      stars++;
      chomp = 1;
      fxBurst(cxs(star.x), cys(star.y), COL.fire, 14, 240, cs * 0.16);
      fxPop(cxs(star.x), cys(star.y) - cs * 0.8, '+5', COL.fire, true);
      Sfx.coin();
      star = null;
      setScore(score);
    }
    function die() {
      state = 'over';
      dead = 0;
      crumbled = 0;
      fx.shake = REDUCE ? 0 : 7;
      Sfx.over();
      const stats = fmt(eaten) + (eaten === 1 ? ' grano' : ' granos')
        + (stars ? ' · ' + stars + (stars === 1 ? ' estrella' : ' estrellas') : '')
        + ' · ' + body.length + ' de largo';
      finish(score, stats);
    }

    function update(dt) {
      time += dt;
      if (state === 'attract') { demoStep(dt); fxStep(dt); return; }
      if (state === 'play') {
        acc += dt * 1000;
        while (acc >= ivl && state === 'play') { acc -= ivl; advance(); }
      }
      const k = Math.exp(-dt * 30);
      kx *= k;
      ky *= k;
      if (star && (state === 'play' || state === 'ready')) {
        star.life -= dt;
        if (star.life <= 0) { fxBurst(cxs(star.x), cys(star.y), COL.mute, 6, 90, cs * 0.1); star = null; }
      }
      // al chocar, se deshace de la cabeza a la cola
      if (state === 'over' && crumbled < body.length) {
        dead += dt;
        const per = Math.min(0.045, 0.75 / body.length);
        while (crumbled < body.length && dead >= crumbled * per) {
          const s = body[crumbled];
          fxBurst(cxs(s.x), cys(s.y), crumbled ? COL.acc : COL.ink, crumbled ? 4 : 10, crumbled ? 120 : 220, cs * 0.16);
          crumbled++;
        }
      }
      chomp = Math.max(0, chomp - dt * 6);
      fxStep(dt);
    }

    /* la cabeza: el logo de la cabecera (su silueta rellena con el fondo,
       para que el cuerpo no se vea por dentro) mirando hacia donde va */
    function head(c, x, y, h, face, tilt, lx, ly) {
      const L = ensureLogo();
      c.save();
      c.translate(x, y);
      c.scale(face, 1);
      c.rotate(tilt);
      if (!L) {
        c.fillStyle = COL.ink;
        c.beginPath();
        c.arc(0, 0, h * 0.42, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = COL.bg;
        c.beginPath();
        c.arc(h * 0.12 + lx * 0.01 * h, -h * 0.08 + ly * 0.01 * h, h * 0.08, 0, Math.PI * 2);
        c.arc(h * 0.28 + lx * 0.01 * h, -h * 0.08 + ly * 0.01 * h, h * 0.08, 0, Math.PI * 2);
        c.fill();
        c.restore();
        return;
      }
      const vb = L.vb, k = h / vb.height;
      c.scale(k, k);
      c.translate(-(vb.x + vb.width / 2), -(vb.y + vb.height / 2));
      c.fillStyle = COL.bg;
      c.fill(L.outer);
      c.fillStyle = COL.ink;
      c.fill(L.face);
      if (L.eyes) { c.translate(lx, ly); c.fill(L.eyes); }
      c.restore();
    }
    function bean(c, x, y, r, born) {
      const k = born != null ? easeOut(clamp((time - born) / 0.3, 0, 1)) : 1;
      const R = r * k * (REDUCE ? 1 : 1 + 0.06 * Math.sin(time * 5));
      if (R < 0.3) return;
      c.save();
      c.translate(x, y);
      c.rotate(-0.55);
      c.fillStyle = COL.fire;
      c.beginPath();
      c.ellipse(0, 0, R * 0.78, R, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = COL.bg;
      c.globalAlpha = 0.55;
      c.lineWidth = Math.max(1, R * 0.16);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, -R * 0.7);
      c.bezierCurveTo(R * 0.34, -R * 0.24, -R * 0.34, R * 0.24, 0, R * 0.7);
      c.stroke();
      c.restore();
    }
    function starShape(c, x, y, R, rot) {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R;
        if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    }
    // el cuerpo, una línea gruesa redondeada por los centros de las casillas
    function line(c, pts, w) {
      if (pts.length < 2) return;
      c.strokeStyle = COL.acc;
      c.lineWidth = w;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }

    // la de muestra: ondula por la cabecera de izquierda a derecha comiéndose los granos
    const dS = () => clamp(W / 17, 18, 28);
    const dY = x => band * 0.52 + Math.sin(x * 0.028 + 0.8) * band * 0.16;
    const dX = () => {
      const s = dS(), span = W + s * 12;
      return REDUCE ? W * 0.62 : (time * 105) % span - s * 3;
    };
    function demoStep(dt) {
      const s = dS(), span = W + s * 12;
      const lap = REDUCE ? 0 : Math.floor((time * 105) / span);
      if (lap !== demo.lap) {
        demo.lap = lap;
        demo.beans = [0.36, 0.74].map(f => ({ x: W * f + (Math.random() - 0.5) * W * 0.08, eaten: false, born: time }));
      }
      const hx = dX();
      for (const b of demo.beans) {
        if (!b.eaten && !REDUCE && hx >= b.x) {
          b.eaten = true;
          demo.chomp = 1;
          fxBurst(b.x, dY(b.x), COL.fire, 7, 150, s * 0.14);
        }
      }
      demo.chomp = Math.max(0, demo.chomp - dt * 6);
    }
    function demoDraw(c) {
      const s = dS(), hx = dX(), L = s * 7;
      c.save();
      c.beginPath();
      c.rect(0, 0, W, band);
      c.clip();
      for (const b of demo.beans) if (!b.eaten) bean(c, b.x, dY(b.x), s * 0.3, b.born);
      const pts = [];
      for (let x = hx; x >= hx - L; x -= 5) pts.push([x, dY(x)]);
      line(c, pts, s * 0.64);
      const slope = Math.cos(hx * 0.028 + 0.8) * 0.028 * band * 0.16;
      head(c, hx, dY(hx), s * 1.6 * (1 + 0.16 * demo.chomp), 1, Math.atan(slope) * 0.8, 12, slope * 10);
      fxDraw(c);
      c.restore();
    }

    function render() {
      const c = ctx;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, W, H);
      if (state === 'attract') {
        c.translate(0, -startScroll());
        demoDraw(c);
        return;
      }
      fxShake(c);
      // el tablero: puntos en las esquinas de las casillas y un borde
      dots(c, ox + cs, oy + cs, cols - 2, rows - 2, cs);
      c.strokeStyle = COL.line;
      c.lineWidth = 1;
      rr(c, ox - 0.5, oy - 0.5, cols * cs + 1, rows * cs + 1, Math.min(12, cs * 0.4));
      c.stroke();
      if (food) bean(c, cxs(food.x), cys(food.y), cs * 0.3, food.born);
      if (star) {
        const x = cxs(star.x), y = cys(star.y);
        const k = easeOut(clamp((time - star.born) / 0.3, 0, 1));
        c.globalAlpha = 0.45;
        c.strokeStyle = COL.fire;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, cs * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (star.life / STAR_LIFE));
        c.stroke();
        c.globalAlpha = star.life < 1.5 && !REDUCE ? 0.35 + 0.65 * Math.abs(Math.sin(time * 9)) : 1;
        c.fillStyle = COL.fire;
        starShape(c, x, y, cs * 0.44 * k, REDUCE ? 0 : time * 0.8);
        c.globalAlpha = 1;
      }
      // la serpiente: la cabeza avanza hacia su siguiente casilla y la cola deja la suya
      const n = body.length;
      if (n) {
        const p = prog(), from = crumbled;
        const tail = grow <= 0 && state !== 'over' && n > 1;
        const pts = [];
        if (from === 0) { const h = headAt(p); pts.push([h.x + kx, h.y + ky]); }
        for (let i = from; i < (tail ? n - 1 : n); i++) pts.push([cxs(body[i].x), cys(body[i].y)]);
        if (tail && from < n) pts.push([lerp(cxs(body[n - 1].x), cxs(body[n - 2].x), p), lerp(cys(body[n - 1].y), cys(body[n - 2].y), p)]);
        if (pts.length === 1) pts.push(pts[0]);
        line(c, pts, cs * 0.64);
        if (from === 0) {
          // los ojos miran ya hacia el giro que has pedido, aunque aún no lo haya dado
          const look = queue[0] || dir;
          const lx = look.x ? 14 * look.x * facing : 5, ly = look.y < 0 ? -11 : look.y > 0 ? 15 : 0;
          head(c, pts[0][0], pts[0][1], cs * 1.62 * (1 + 0.16 * chomp), facing, dir.y * 0.22, lx, ly);
        }
      }
      fxDraw(c);
    }

    // dedo (o arrastrando el ratón): cada 18 px de deslizamiento, un giro
    function down(p) { sw = { x: p.x, y: p.y }; }
    function move(p) {
      if (!sw || (state !== 'play' && state !== 'ready')) return;
      const dx = p.x - sw.x, dy = p.y - sw.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
      sw = { x: p.x, y: p.y };
    }
    function up() { sw = null; }
    const KEYS = {
      ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
      ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    };
    function key(k) {
      const v = KEYS[k];
      if (!v) return false;
      turn(v[0], v[1]);
      return true;
    }

    return {
      attract, start, update, render, down, move, up, key, size,
      pause() { sw = null; },
      confetti: fxConfetti,
    };
  })();

  const ENGINES = { egg: Egg, snake: Snake };

  function loop(now) {
    if (!opened) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!game) {                       // en el menú, el lienzo vacío
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      return;
    }
    if (game === 'bbtan') {
      if (state !== 'pause') update(dt);
      render(now);
    } else {
      if (state !== 'pause') E.update(dt);
      E.render(now);
    }
  }


  /* ---------- la consolita: botón de acceso ---------- */
  /* En ordenador, junto al título y en espejo del puntito de «Don’t click!»
     (script.js lo coloca abajo a la izquierda): su nota «Break time!» y su
     flecha van al otro lado, con las mismas medidas pero algo más hacia el
     centro, y la consola donde acaba la flecha. Entra a la vez que el puntito. Si el reproductor queda debajo,
     sube todo junto lo justo. En móvil va en la esquina (CSS). */
  const vinyl = document.getElementById('music-player');
  const ws = document.querySelector('.whatsit');
  const hint = document.querySelector('.gb-hint');
  function placeTrigger() {
    const desk = window.innerWidth > 768 && !!ws && !!hint && getComputedStyle(ws).display !== 'none';
    trigger.classList.toggle('is-spot', desk);
    if (!desk) {
      trigger.style.removeProperty('left');
      trigger.style.removeProperty('top');
      return;
    }
    const fs = parseFloat(ws.style.getPropertyValue('--fs')) || Math.min(window.innerWidth * 0.063, 110);
    const r = ws.getBoundingClientRect();
    const w = trigger.offsetWidth, h = trigger.offsetHeight;
    // el ancla del puntito, en espejo y desplazada a la izquierda (2.2·fs, ~200px
    // a 1440); la flecha acaba a (0.76, -0.25)·fs de ella
    const ax = window.innerWidth - r.left - 2.2 * fs;
    let ay = r.top;
    const place = () => ({ x: ax + 0.76 * fs - 14 - w / 2, y: ay - 0.25 * fs + 14 + h / 2 });
    let c = place();
    const v = vinyl && vinyl.getBoundingClientRect();
    if (v && v.height && c.x + w / 2 > v.left - 8) {
      const over = c.y + h / 2 + 18 - v.top;
      if (over > 0) { ay -= over; c = place(); }
    }
    hint.style.setProperty('--fs', fs + 'px');
    hint.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px)';
    trigger.style.left = Math.round(c.x - w / 2) + 'px';
    trigger.style.top = Math.round(c.y - h / 2) + 'px';
  }
  // después de que script.js recoloque el puntito
  const replace = () => requestAnimationFrame(placeTrigger);
  placeTrigger();
  window.addEventListener('resize', replace);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(replace);
  if (vinyl && 'ResizeObserver' in window) new ResizeObserver(replace).observe(vinyl);
  // entra con el puntito (su clase is-in la pone script.js al acabar la entrada del título)
  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    placeTrigger();
    trigger.classList.add('is-in');
    if (hint) {
      hint.classList.add('is-in');
      setTimeout(() => hint.classList.add('is-settled'), 1300);
    }
  }
  if (!ws || ws.classList.contains('is-in')) enter();
  else if ('MutationObserver' in window) {
    const mo = new MutationObserver(() => { if (ws.classList.contains('is-in')) { mo.disconnect(); enter(); } });
    mo.observe(ws, { attributes: true, attributeFilter: ['class'] });
  }
  setTimeout(enter, 7000);   // por si la entrada del título no llega a avisar

  /* su pantalla: una partida en miniatura jugándose sola (un BBTAN de 6
     columnas en 32 × 24 px: apunta, ráfaga de 5 bolas, los bloques bajan).
     A 30 fps, parada mientras el juego está abierto; con reduced-motion,
     un fotograma quieto. */
  const mini = (() => {
    const cvs = trigger.querySelector('.gb-screen');
    const g = cvs && cvs.getContext ? cvs.getContext('2d') : null;
    if (!g) return { start() {}, stop() {} };
    const SW = 32, SH = 24, K = cvs.width / SW, FLOOR = SH - 2.5;
    const BG = '#13110e', PX = '#e6d6ad', INK = '#f6f0e4';
    let blocks = [], balls = [], phase = 'aim', t = 0, a = 1.3, fired = 0, landed = 0, sx = 16, nx = null;
    let raf = 0, last = 0, acc = 0;
    const pick = () => 0.55 + Math.random() * 2.03;
    function addRow(y) {
      let n = 0;
      for (let c = 0; c < 6; c++) {
        if (Math.random() < 0.5) { blocks.push({ x: 1 + c * 5, y, hp: Math.random() < 0.3 ? 2 : 1, f: 0 }); n++; }
      }
      if (!n) blocks.push({ x: 1 + Math.floor(Math.random() * 6) * 5, y, hp: 1, f: 0 });
    }
    function reset() {
      blocks = [];
      addRow(2);
      addRow(7);
      balls = [];
      phase = 'aim';
      t = 0;
      sx = 16;
      a = pick();
    }
    function step(dt) {
      t += dt;
      if (phase === 'aim') {
        if (t > 0.8) { phase = 'fly'; t = 0; fired = 0; landed = 0; nx = null; balls = []; }
      } else if (phase === 'fly') {
        while (fired < 5 && t >= fired * 0.08) {
          balls.push({ x: sx, y: FLOOR, vx: Math.cos(a) * 54, vy: -Math.sin(a) * 54, done: false });
          fired++;
        }
        for (const b of balls) {
          if (b.done) continue;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < 1) { b.x = 1; b.vx = Math.abs(b.vx); } else if (b.x > SW - 1) { b.x = SW - 1; b.vx = -Math.abs(b.vx); }
          if (b.y < 1) { b.y = 1; b.vy = Math.abs(b.vy); }
          for (const k of blocks) {
            if (k.hp <= 0 || b.x < k.x - 0.7 || b.x > k.x + 4.7 || b.y < k.y - 0.7 || b.y > k.y + 4.7) continue;
            const dx = b.x - (k.x + 2), dy = b.y - (k.y + 2);
            if (Math.abs(dx) > Math.abs(dy)) b.vx = (dx < 0 ? -1 : 1) * Math.abs(b.vx);
            else b.vy = (dy < 0 ? -1 : 1) * Math.abs(b.vy);
            k.hp--;
            k.f = 1;
            break;
          }
          if (b.vy > 0 && b.y >= FLOOR) {
            b.y = FLOOR;
            b.done = true;
            landed++;
            if (nx == null) nx = b.x;
          }
        }
        if (fired === 5 && landed === 5) { phase = 'shift'; t = 0; sx = clamp(nx, 3, SW - 3); }
      } else if (phase === 'shift' && t >= 0.32) {
        // todo baja una fila y entra otra; si se llena (o se vacía), vuelta a empezar
        blocks = blocks.filter(k => k.hp > 0);
        blocks.forEach(k => { k.y += 5; });
        if (!blocks.length || blocks.some(k => k.y >= 17)) reset();
        else addRow(2);
        balls = [];
        phase = 'aim';
        t = 0;
        a = pick();
      }
      // las que caen ruedan hasta la primera
      if (nx != null) for (const b of balls) if (b.done) b.x += (nx - b.x) * Math.min(1, dt * 10);
      for (const k of blocks) if (k.f > 0) k.f = Math.max(0, k.f - dt * 5);
    }
    function draw() {
      g.setTransform(K, 0, 0, K, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = BG;
      g.fillRect(0, 0, SW, SH);
      const off = phase === 'shift' ? Math.min(1, t / 0.32) * 5 : 0;
      for (const k of blocks) {
        if (k.hp <= 0 && k.f <= 0) continue;
        g.globalAlpha = k.hp <= 0 ? k.f : k.hp > 1 ? 1 : 0.6;
        g.fillStyle = k.f > 0.4 ? INK : PX;
        g.fillRect(k.x, k.y + off, 4, 4);
      }
      g.fillStyle = INK;
      if (phase === 'aim') {
        for (let i = 1; i <= 4; i++) {
          g.globalAlpha = 0.85 - i * 0.16;
          g.fillRect(sx + Math.cos(a) * i * 3.6 - 0.5, FLOOR - Math.sin(a) * i * 3.6 - 0.5, 1, 1);
        }
      }
      g.globalAlpha = 1;
      for (const b of balls) g.fillRect(b.x - 0.75, b.y - 0.75, 1.5, 1.5);
      if (phase === 'aim' || (phase === 'fly' && fired < 5)) g.fillRect(sx - 0.75, FLOOR - 0.75, 1.5, 1.5);
      g.globalAlpha = 0.22;
      g.fillRect(0, FLOOR + 1.25, SW, 0.5);
      g.globalAlpha = 1;
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      acc += Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (acc < 1 / 30) return;          // a 30 fps sobra para una pantalla así
      step(Math.min(acc, 0.05));
      acc = 0;
      draw();
    }
    reset();
    return {
      start() {
        if (raf) return;
        if (REDUCE) { reset(); for (let i = 0; i < 45; i++) step(1 / 30); draw(); return; }
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  })();
  mini.start();
  trigger.addEventListener('click', open);
})();
