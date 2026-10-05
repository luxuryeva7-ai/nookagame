/* ============================================================
   ГОЛОДНЫЙ КРОКОДИЛ — уровень 4 игры «Числа-друзья» (6–7 лет)

   «Ага»: сравниваем, где больше. Пасть открыта к большему — это и есть
   школьный знак «>» / «<».

   На берегу две кучки яблок, посередине крокодил. Ребёнок тянет
   крокодила к той кучке, которую тот должен съесть (новый жест —
   потянуть вбок). Крокодил ест только БОЛЬШУЮ: потянули к меньшей —
   мотает головой и остаётся голодным. После еды наверху появляется
   запись «3 < 6»: пасть знака открыта к большему, как у крокодила.

   Раунды: кучки сильно разные (3 и 6) → почти одинаковые (5 и 6),
   тут надо посчитать; последняя пара — ловушка: шесть яблок вытянуты
   в длинный ряд, семь сложены плотной горкой. Шестилетки часто
   выбирают «где длиннее» (Пиаже, сохранение числа). Не та кучка —
   крокодил не ест, а над яблоками появляются номера: посчитай.
   → вместо кучек числа на табличках.

   Графика — Higgsfield: берег реки, крокодил (рот закрыт/открыт),
   яблоко. Без слов и звука.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var SIDES = [[23, 58], [77, 58]];            // центры кучек слева и справа
  var CROC = [50, 79];

  var ROUNDS = [
    { kind: 'pile', tasks: [[3, 6], [7, 2]] },
    { kind: 'pile', tasks: [[5, 6], [8, 7], [6, 7, 'trap']] },   // trap: левая кучка длинным рядом, правая плотной горкой
    { kind: 'digit', tasks: [[8, 6], [4, 9], [7, 5]] },
  ];

  var round = 0, task = 0, busy = false, idleT = null, demoDone = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  var croc = M.el('div', 'mcr-croc');
  var cimg = M.el('img'); cimg.src = 'math/croc.webp'; cimg.alt = ''; cimg.draggable = false;
  croc.appendChild(cimg);
  croc.style.left = CROC[0] + '%'; croc.style.top = CROC[1] + '%';
  stage.appendChild(croc);

  var piles = SIDES.map(function (p) {
    var el = M.el('div', 'mcr-pile');
    el.style.left = p[0] + '%'; el.style.top = p[1] + '%';
    stage.appendChild(el);
    return el;
  });

  var strip = M.el('div', 'mcr-strip');
  stage.appendChild(strip);

  var neuro = M.el('img', 'mh__neuro');
  neuro.src = '../mascot/hello.webp'; neuro.alt = '';
  neuro.style.left = '3%'; neuro.style.right = 'auto'; neuro.style.bottom = '4%'; neuro.style.width = '19%';
  stage.appendChild(neuro);

  /* кучка: яблоки горкой — ряды снизу вверх, как их сложил бы ребёнок */
  /* mode: 'spread' — длинный ряд с промежутками, 'tight' — плотная горка */
  function drawPile(el, n, kind, mode) {
    el.innerHTML = '';
    el.className = 'mcr-pile' + (kind === 'digit' ? ' mcr-pile--digit' : '');
    if (kind === 'digit') { el.appendChild(M.el('b', '', String(n))); return; }
    var rows = mode === 'spread' ? [n] : [4, 3, 2, 1], gap = mode === 'spread' ? 24 : mode === 'tight' ? 15 : 23, k = 0, r = 0;
    while (k < n) {
      var inRow = Math.min(rows[r] || 1, n - k);
      for (var i = 0; i < inRow; i++) {
        var a = M.el('img', 'mcr-apple'); a.src = 'math/apple.webp'; a.alt = '';
        a.style.left = (50 + (i - (inRow - 1) / 2) * gap) + '%';
        a.style.bottom = (r * (mode === 'tight' ? 15 : 20)) + '%';
        a.style.zIndex = 10 - r;
        el.appendChild(a);
        k++;
      }
      r++;
    }
  }

  function current() { return ROUNDS[round].tasks[task]; }

  /* ── жест: тянем крокодила вбок ─────────────────────────── */
  var start = null, side = 0;
  croc.addEventListener('pointerdown', function (e) {
    if (busy) return;
    e.preventDefault();
    croc.setPointerCapture(e.pointerId);
    start = e.clientX; side = 0;
    stopHint();
  });
  croc.addEventListener('pointermove', function (e) {
    if (start == null) return;
    var dx = e.clientX - start, w = stage.getBoundingClientRect().width;
    var t = Math.max(-1, Math.min(1, dx / (w * .25)));
    side = t < -.3 ? -1 : t > .3 ? 1 : 0;
    croc.style.left = (CROC[0] + t * 14) + '%';
    face(side || (dx < 0 ? -1 : 1), Math.abs(t) > .3);
  });
  function end() {
    if (start == null) return;
    start = null;
    if (side) eat(side < 0 ? 0 : 1);
    else back();
  }
  croc.addEventListener('pointerup', end);
  croc.addEventListener('pointercancel', end);

  function face(dir, open) {
    croc.classList.toggle('left', dir < 0);
    cimg.src = open ? 'math/croc-open.webp' : 'math/croc.webp';
  }
  function back() {
    croc.style.left = CROC[0] + '%';
    face(croc.classList.contains('left') ? -1 : 1, false);
  }

  function eat(i) {
    var t = current(), big = t[0] > t[1] ? 0 : 1;
    busy = true;
    face(i === 0 ? -1 : 1, true);
    croc.style.left = (i === 0 ? 33 : 67) + '%';
    if (i !== big) {
      /* к меньшей — не ест: мотает головой, кучка вздрагивает */
      setTimeout(function () {
        croc.classList.remove('nope'); void croc.offsetWidth; croc.classList.add('nope');
        piles[i].classList.remove('shake'); void piles[i].offsetWidth; piles[i].classList.add('shake');
        think();
        if (t[2] === 'trap') countUp();
      }, 300);
      return setTimeout(function () { back(); busy = false; idle(2000); }, 1300);
    }
    /* ест большую: яблоки летят в пасть по одному */
    var apples = [].slice.call(piles[i].querySelectorAll('.mcr-apple'));
    apples.reverse().forEach(function (a, k) {
      setTimeout(function () { a.classList.add('gone'); }, 120 * k);
    });
    if (!apples.length) piles[i].classList.add('gone');
    setTimeout(function () {
      cimg.src = 'math/croc.webp';
      croc.classList.add('full');
      M.sparks(stage, i === 0 ? 33 : 67, 72, 12);
      cheer();
      showSign(t);
    }, 120 * apples.length + 450);
    setTimeout(nextTask, 120 * apples.length + 2600);
  }

  /* не на глаз, а счётом: над каждым яблоком — его номер */
  function countUp() {
    piles.forEach(function (el) {
      [].slice.call(el.querySelectorAll('.mcr-apple')).forEach(function (a, k) {
        var b = M.el('b', 'mcr-num', String(k + 1));
        b.style.left = a.style.left; b.style.bottom = (parseFloat(a.style.bottom) * 2.2 + 26) + '%';   // верхние ряды — выше, номера не налезают
        b.style.animationDelay = (k * 0.12) + 's';
        el.appendChild(b);
      });
    });
  }

  /* запись сравнения: пасть знака открыта к большему, как у крокодила */
  function showSign(t) {
    strip.innerHTML = '<span>' + t[0] + '</span><i class="' + (t[0] > t[1] ? 'gt' : 'lt') + '">' +
      (t[0] > t[1] ? '&gt;' : '&lt;') + '</i><span>' + t[1] + '</span>';
    strip.classList.remove('on'); void strip.offsetWidth; strip.classList.add('on');
  }

  function cheer() {
    neuro.src = '../mascot/win.webp';
    neuro.classList.remove('cheer'); void neuro.offsetWidth; neuro.classList.add('cheer');
    clearTimeout(cheer.t); cheer.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1600);
  }
  function think() {
    neuro.src = '../mascot/think.webp';
    clearTimeout(cheer.t); cheer.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1400);
  }

  /* рука показывает: потяни крокодила вбок */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var t = current(), big = t[0] > t[1] ? 0 : 1;
      hand.drag([CROC[0], CROC[1] - 4], [big === 0 ? 30 : 70, CROC[1] - 4]);
    }, ms || 3000);
  }

  /* «смотри — повтори»: игра сама тянет крокодила к большой кучке */
  function demo() {
    demoDone = true;
    busy = true;
    var t = current(), big = t[0] > t[1] ? 0 : 1;
    hand.drag([CROC[0], CROC[1] - 4], [big === 0 ? 30 : 70, CROC[1] - 4], false);
    setTimeout(function () {
      croc.style.transition = 'left .9s ease-in-out';
      croc.style.left = (CROC[0] + (big === 0 ? -14 : 14)) + '%';
      face(big === 0 ? -1 : 1, true);
    }, 500);
    setTimeout(function () { croc.style.transition = ''; eat(big); }, 1500);
  }

  function startTask() {
    var R = ROUNDS[round], t = current();
    busy = false;
    croc.classList.remove('full', 'nope');
    back();
    strip.classList.remove('on');
    piles.forEach(function (el, i) { drawPile(el, t[i], R.kind, t[2] === 'trap' ? (i === 0 ? 'spread' : 'tight') : null); });
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 1000);
    idle(round === 0 && task === 1 ? 2000 : 3200);
  }

  function startRound() {
    task = 0;
    Array.prototype.forEach.call(steps, function (d, k) { d.className = k < round ? 'done' : (k === round ? 'on' : ''); });
    startTask();
  }

  function nextTask() {
    task++;
    if (task < ROUNDS[round].tasks.length) return startTask();
    round++;
    if (round < ROUNDS.length) return startRound();
    finish();
  }

  function finish() {
    stopHint();
    busy = true;
    var end = M.el('div', 'mh__end',
      '<h2>Крокодил выбирает, где больше</h2><p>Считай, а не смотри на глаз: длинный ряд не значит «больше». Пасть знака открыта к большему: 6 &lt; 7</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma4', 60, { nextLabel: 'В Арену →', onNext: function () { location.href = 'math-arena.html'; } });
      else location.href = 'math-arena.html';
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mcr = {
      eat: function (i) { if (!busy) eat(i); },
      state: function () { return { round: round, task: task, t: ROUNDS[round] && current(), busy: busy, sign: strip.textContent }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
