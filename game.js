/* ============================================================
   MINIJUEGO — BREAK TIME (solo en la home)
   Al estilo de BBTAN: apuntas, sueltas, y una ráfaga con todas tus bolas
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
  const KEY_LOCAL = 'cdv_bbtan_scores', KEY_BEST = 'cdv_bbtan_best';


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
          if (!warned) { warned = true; console.warn('[Break Time] Firestore respondió ' + r.status + ': se usa el ranking local.'); }
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      }, e => { clearTimeout(t); throw e; });
    }
    const localAll = () => { try { return JSON.parse(store.get(KEY_LOCAL)) || []; } catch (e) { return []; } };
    function localAdd(name, score) {
      const l = localAll();
      l.push({ name, score });
      l.sort((a, b) => b.score - a.score);
      store.set(KEY_LOCAL, JSON.stringify(l.slice(0, 50)));
    }
    async function top(n) {
      if (on) {
        try {
          const res = await post(':runQuery', { structuredQuery: {
            from: [{ collectionId: 'scores' }],
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
      return { scope: on ? 'offline' : 'local', rows: localAll().slice(0, n) };
    }
    async function count(where) {
      const q = { from: [{ collectionId: 'scores' }] };
      if (where) q.where = where;
      const res = await post(':runAggregationQuery', {
        structuredAggregationQuery: { structuredQuery: q, aggregations: [{ alias: 'n', count: {} }] },
      });
      const f = res && res[0] && res[0].result && res[0].result.aggregateFields;
      return f && f.n ? +f.n.integerValue : 0;
    }
    async function submit(name, score) {
      localAdd(name, score);
      if (!on) return 'local';
      try {
        await post('/scores', { fields: { name: { stringValue: name }, score: { integerValue: String(score) } } });
        return 'global';
      } catch (e) { return 'offline'; }
    }
    async function rank(score, scope) {
      if (scope === 'global') {
        try {
          const gt = { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: { integerValue: String(score) } } };
          const [above, total] = await Promise.all([count(gt), count(null)]);
          return { pos: above + 1, total: Math.max(total, above + 1) };
        } catch (e) { /* cae al local */ }
      }
      const l = localAll();
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
  const PLAYING = { aim: 1, fly: 1, shift: 1 };


  /* ---------- modal ---------- */
  const ICON_ON = '<svg class="bk-on" viewBox="0 0 16 16"><path d="M2.5 6h2.6L8.5 3v10L5.1 10H2.5z"/><path d="M11 5.6c.85.65 1.35 1.5 1.35 2.4s-.5 1.75-1.35 2.4M12.9 3.7c1.45 1.1 2.25 2.6 2.25 4.3s-.8 3.2-2.25 4.3"/></svg>';
  const ICON_OFF = '<svg class="bk-off" viewBox="0 0 16 16"><path d="M2.5 6h2.6L8.5 3v10L5.1 10H2.5z"/><path d="M11.2 6.2l3.6 3.6M14.8 6.2l-3.6 3.6"/></svg>';
  const ICON_X = '<svg viewBox="0 0 16 16"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  const ICON_DOWN = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5v7M2 5.5l3 3 3-3"/></svg>';
  const ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 5h7M5.5 2l3 3-3 3"/></svg>';
  const ICON_COIN = '<svg class="bk-coin-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><circle class="bk-coin-in" cx="8" cy="8" r="4.3"/></svg>';
  const BOARD = '<div class="bk-board"><p class="bk-board-h"><span>Top 3</span><span class="bk-scope">Global</span></p><ol class="bk-list"></ol></div>';

  function build() {
    root = document.createElement('div');
    root.className = 'bk';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Minijuego: Break Time');
    const how = FINE
      ? 'Un respiro entre proyecto y proyecto. Apunta con el ratón y haz clic: sale una ráfaga con todas tus bolas. Cada golpe resta 1 al bloque y cada <b>+1</b> que tocas es una bola más. Si un bloque llega abajo, se acabó. Las <b>monedas</b> se guardan para la tienda.<span class="bk-keys">← → para afinar · Espacio lanza · P pausa</span>'
      : 'Un respiro entre proyecto y proyecto. Arrastra el dedo <b>hacia abajo</b> para apuntar (como un tirachinas) y suelta. Cada golpe resta 1 al bloque y cada <b>+1</b> es una bola más. Si un bloque llega abajo, se acabó. Las <b>monedas</b> se guardan para la tienda.';
    root.innerHTML = ''
      + '<div class="bk-backdrop"></div>'
      + '<div class="bk-panel" tabindex="-1">'
      +   '<header class="bk-hud">'
      +     '<div class="bk-hud-l">'
      +       '<span class="bk-brand">Minijuego</span>'
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
      +     '<canvas class="bk-cv" role="img" aria-label="Tablero: apunta y lanza las bolas contra los bloques"></canvas>'
      +     '<p class="bk-hint" aria-hidden="true">' + (FINE ? 'Apunta y haz clic' : 'Arrastra hacia abajo y suelta') + '</p>'
      +     '<span class="bk-speed" aria-hidden="true"></span>'
      +     '<button type="button" class="bk-recall">' + ICON_DOWN + 'Recoger</button>'
      +     '<div class="bk-toast" aria-hidden="true"><span></span><b></b></div>'
      +     '<section class="bk-screen bk-s-start" aria-label="Inicio">'
      +       '<h2 class="bk-title"><span>Break</span> <span>Time</span></h2>'
      +       '<p class="bk-how">' + how + '</p>'
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
      +       '<div class="bk-actions"><button type="button" class="bk-btn bk-resume">Continuar' + ARROW + '</button><button type="button" class="bk-btn bk-ghost bk-quit">Salir</button></div>'
      +     '</section>'
      +     '<section class="bk-screen bk-s-over" aria-label="Fin de la partida">'
      +       '<p class="bk-k">Fin de la partida</p>'
      +       '<b class="bk-final">0</b>'
      +       '<p class="bk-unit">Rondas</p>'
      +       '<span class="bk-badge"></span>'
      +       '<p class="bk-stats"></p>'
      +       BOARD
      +       '<p class="bk-rank"></p>'
      +       '<div class="bk-actions"><button type="button" class="bk-btn bk-again">Otra partida' + ARROW + '</button><button type="button" class="bk-btn bk-ghost bk-shop-b">Tienda</button><button type="button" class="bk-btn bk-ghost bk-quit">Salir</button></div>'
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
      screens: { start: $('.bk-s-start'), pause: $('.bk-s-pause'), over: $('.bk-s-over'), shop: $('.bk-s-shop') },
    });
    buildShop();
    ui.input.value = playerName;
    ui.mute.setAttribute('aria-pressed', Sfx.isMuted() ? 'true' : 'false');

    ui.x.addEventListener('click', close);
    root.querySelectorAll('.bk-quit').forEach(b => b.addEventListener('click', close));
    ui.resume.addEventListener('click', resume);
    ui.again.addEventListener('click', () => { Sfx.init(); newGame(); });
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

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', () => { if (opened) layout(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && opened && PLAYING[state]) pause(); });
    window.addEventListener('blur', () => { if (opened && state === 'fly') pause(); });
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
    COL = { bg: v('--bk-bg'), ink: v('--bk-ink'), line: v('--bk-line'), num: v('--bk-num'), fire: v('--bk-fire'), acc: v('--bk-acc') };
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
    best = +store.get(KEY_BEST) || 0;
    cell = 0;
    layout();
    attract();
    syncCoins();
    setScreen('start');
    loadTop(ui.startBoard);
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
    // con ratón, directo al nombre; en táctil no (abriría el teclado de golpe)
    setTimeout(() => {
      if (!opened) return;
      if (FINE) (ui.input.value ? ui.go : ui.input).focus({ preventScroll: true });
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
    Board.top(3).then(res => { if (my === token) fillBoard(box, res); });
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
    Sfx.init();
    newGame();
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
      else close();
      return;
    }
    if (k === 'Tab') { trapFocus(e); return; }
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT') return;
    if (tag === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.l = 1; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.r = 1; e.preventDefault(); }
    else if ((k === ' ' || k === 'Enter') && state === 'aim') { e.preventDefault(); shoot(aim.on ? aim.a : Math.PI / 2); }
    else if ((k === 'ArrowDown' || k === 's' || k === 'S') && state === 'fly') { e.preventDefault(); recall(); }
    else if ((k === 'p' || k === 'P') && (PLAYING[state] || state === 'pause')) { if (state === 'pause') resume(); else pause(); }
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
    if (state === 'attract' && root) root.style.setProperty('--bk-gb', Math.round(gy + DEMO.length * cell) + 'px');
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
    const my = ++token;
    setTimeout(() => { if (my === token && opened) showOver(my); }, REDUCE ? 250 : 950);
  }

  async function showOver(my) {
    const score = round;
    root.classList.remove('is-game');
    setScreen('over');
    const prev = +store.get(KEY_BEST) || 0;
    const record = score > prev;
    if (record) { store.set(KEY_BEST, String(score)); best = score; }
    countUp(ui.final, score);
    ui.stats.textContent = fmt(broken) + (broken === 1 ? ' bloque' : ' bloques') + ' · ' + fmt(ballsN) + (ballsN === 1 ? ' bola' : ' bolas')
      + (coinsGame ? ' · ' + fmt(coinsGame) + (coinsGame === 1 ? ' moneda' : ' monedas') : '');
    ui.coins.disabled = false;
    syncCoins();
    ui.badge.classList.remove('is-on');
    ui.badge.textContent = '';
    ui.rank.textContent = '';
    ui.overBoard.classList.add('is-loading');
    fillRows(ui.overBoard, [], true);
    announce('Fin de la partida: ronda ' + score);
    setTimeout(() => { if (my === token && opened) ui.again.focus({ preventScroll: true }); }, 120);

    const scope = await Board.submit(playerName, score);
    if (my !== token) return;
    const [top, rk] = await Promise.all([Board.top(3), Board.rank(score, scope)]);
    if (my !== token) return;
    fillBoard(ui.overBoard, top, { name: playerName, score });
    if (rk) ui.rank.textContent = 'Tu puesto: ' + fmt(rk.pos) + ' de ' + fmt(rk.total);
    const inTop = !!(rk && rk.pos <= 3);
    if (inTop || record) {
      ui.badge.textContent = inTop ? '¡Estás en el top 3!' : 'Nuevo récord personal';
      ui.badge.classList.add('is-on');
      if (inTop) confetti(W / 2, H * 0.3, 70);
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
  function logoSprite() {
    const key = br + '|' + DPR + '|' + COL.ink;
    if (sprite && spriteKey === key) return sprite;
    if (logoPath === null) {
      logoPath = false;
      try {
        const fp = document.querySelector('.top-logo .tl-face'), ep = document.querySelector('.top-logo .tl-eyes');
        const svg = fp && fp.ownerSVGElement;
        if (svg && typeof Path2D === 'function') {
          logoPath = { vb: svg.viewBox.baseVal, face: new Path2D(fp.getAttribute('d')), eyes: ep ? new Path2D(ep.getAttribute('d')) : null };
        }
      } catch (e) { logoPath = false; }
    }
    if (!logoPath) return null;
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

  function loop(now) {
    if (!opened) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state !== 'pause') update(dt);
    render(now);
  }


  /* ---------- la consolita: botón de acceso ---------- */
  // en escritorio, apoyada en la misma línea que el reproductor, a su izquierda
  const vinyl = document.getElementById('music-player');
  function placeTrigger() {
    const r = vinyl && window.innerWidth > 768 ? vinyl.getBoundingClientRect() : null;
    if (!r || !r.width) {
      trigger.style.removeProperty('right');
      trigger.style.removeProperty('bottom');
      return;
    }
    trigger.style.right = Math.round(window.innerWidth - r.left + 14) + 'px';
    trigger.style.bottom = Math.round(window.innerHeight - r.bottom) + 'px';
  }
  if (vinyl) {
    placeTrigger();
    if ('ResizeObserver' in window) new ResizeObserver(placeTrigger).observe(vinyl);
    window.addEventListener('resize', placeTrigger);
  }

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
