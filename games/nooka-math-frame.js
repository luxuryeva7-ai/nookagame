/* ============================================================
   РАМКА ДЕСЯТИ — уровень 3 игры «Числа-друзья» (6–7 лет)

   «Ага»: десять — это два ряда по пять. Сколько мест пустых —
   столько не хватает до десяти.

   Лавочка на десять мест, два ряда по пять. Пушик садится на первое
   свободное место по порядку, поэтому ряд из пяти заполняется первым,
   и 7 видно как «пять и ещё два», не пересчитывая.

   Раунды, у каждого свой жест:
   1. Посади 7, потом 9 — перетаскиваешь на лавочку.
   2. До десяти — на лавочке уже сидят, досаживаешь до полной;
      пара «6 и 4» улетает в альбом. Три пары.
   3. Вспышка — лавочку показывают на секунду и закрывают облаком;
      из трёх карточек выбираешь, сколько было. Число узнаётся по рядам.

   Графика — та же, что у «Домика» и Арены (Higgsfield): пушики и фон
   полянки. Лавочка — схема, а не персонаж, поэтому нарисована стилями.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');

  /* Лавочка: 5 мест в ряд, 2 ряда, в процентах сцены */
  var FRAME = { x0: 8, x1: 92, rows: [39.5, 51.5] };
  var CELLS = [];
  FRAME.rows.forEach(function (y) {
    for (var i = 0; i < 5; i++) CELLS.push([FRAME.x0 + (FRAME.x1 - FRAME.x0) * (i + .5) / 5, y]);
  });
  var GRASS = { x0: 8, x1: 70, y0: 72, y1: 87 };
  var BADGE = [50, 20];

  var ROUNDS = [
    { kind: 'seat', tasks: [7, 9] },
    { kind: 'fill', tasks: [6, 8, 3] },
    { kind: 'flash', tasks: [7, 5, 9, 6] },
  ];

  var round = 0, task = 0, pals = [], busy = false, idleT = null, found = [], firstTry = true;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  /* ── разметка ───────────────────────────────────────────── */
  var badge = M.el('div', 'mh__roof');
  badge.style.left = BADGE[0] + '%'; badge.style.top = BADGE[1] + '%';
  stage.appendChild(badge);

  var frame = M.el('div', 'mf-frame');
  frame.style.left = FRAME.x0 + '%';
  frame.style.width = (FRAME.x1 - FRAME.x0) + '%';
  frame.style.top = (FRAME.rows[0] - 7.5) + '%';
  frame.style.height = (FRAME.rows[1] - FRAME.rows[0] + 13) + '%';
  var fTop = FRAME.rows[0] - 7.5, fH = FRAME.rows[1] - FRAME.rows[0] + 13;
  CELLS.forEach(function (c) {
    var cell = M.el('i');
    cell.style.left = (c[0] - FRAME.x0) / (FRAME.x1 - FRAME.x0) * 100 + '%';
    cell.style.top = (c[1] - fTop) / fH * 100 + '%';
    frame.appendChild(cell);
  });
  stage.appendChild(frame);

  var cloud = M.el('div', 'mf-cloud', '<b>?</b>');
  cloud.style.left = frame.style.left; cloud.style.width = frame.style.width;
  cloud.style.top = frame.style.top; cloud.style.height = frame.style.height;
  cloud.hidden = true;
  stage.appendChild(cloud);

  var cards = M.el('div', 'mf-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  var album = M.el('div', 'mh__album');
  stage.appendChild(album);

  var neuro = M.el('img', 'mh__neuro');
  neuro.src = '../mascot/hello.webp'; neuro.alt = '';
  neuro.style.left = 'auto'; neuro.style.right = '3%';
  stage.appendChild(neuro);

  /* ── пушики ─────────────────────────────────────────────── */
  function makePal(i, seated) {
    var p = { el: M.el('div', 'mh-pal' + (seated ? ' in fixed' : '')), cell: -1, fixed: !!seated, home: null };
    var img = M.el('img'); img.src = 'math/pal-' + (i % 8 + 1) + '.webp'; img.alt = ''; img.draggable = false;
    p.el.appendChild(img);
    stage.appendChild(p.el);
    if (!seated) bindDrag(p);
    pals.push(p);
    return p;
  }
  function place(p, x, y) { p.el.style.left = x + '%'; p.el.style.top = y + '%'; }
  function seated() { return pals.filter(function (p) { return p.cell >= 0; }); }

  function layout() {
    var free = pals.filter(function (p) { return p.cell < 0; }), n = free.length;
    free.forEach(function (p, k) {
      var cols = Math.max(4, Math.ceil(n / 2)), row = k % 2, col = Math.floor(k / 2);
      var x = GRASS.x0 + (GRASS.x1 - GRASS.x0) * ((col + (row ? .5 : 0) + .5) / (cols + .5));
      var y = row ? GRASS.y0 + 2 : GRASS.y1 - 2;
      p.home = [x, y];
      p.el.classList.remove('in', 'seat');
      place(p, x, y);
    });
    seated().forEach(function (p) {
      var c = CELLS[p.cell];
      p.el.classList.add('in', 'seat');
      place(p, c[0], c[1] + 4);
    });
    Array.prototype.forEach.call(frame.children, function (cell, i) {
      cell.className = pals.some(function (p) { return p.cell === i; }) ? 'on' : '';
    });
  }

  /* садится на первое свободное место по порядку: ряд из пяти — первым */
  function firstFree() {
    for (var i = 0; i < CELLS.length; i++) {
      if (!pals.some(function (p) { return p.cell === i; })) return i;
    }
    return -1;
  }

  function pct(e) {
    var r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100];
  }
  function onFrame(pt) {
    return pt[0] > FRAME.x0 - 3 && pt[0] < FRAME.x1 + 3 && pt[1] > FRAME.rows[0] - 10 && pt[1] < FRAME.rows[1] + 8;
  }

  function bindDrag(p) {
    var start = null, moved = false;
    p.el.addEventListener('pointerdown', function (e) {
      if (busy || p.fixed) return;
      e.preventDefault();
      p.el.setPointerCapture(e.pointerId);
      start = pct(e); moved = false;
      p.el.classList.add('carry');
      stopHint();
    });
    p.el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var pt = pct(e);
      if (Math.abs(pt[0] - start[0]) + Math.abs(pt[1] - start[1]) > 2) moved = true;
      place(p, pt[0], pt[1] + 4);
      frame.classList.toggle('hot', onFrame(pt));
    });
    function end(e) {
      if (!start) return;
      var pt = pct(e); start = null;
      p.el.classList.remove('carry');
      frame.classList.remove('hot');
      /* касание без сдвига: с лавочки — на траву, с травы — на лавочку */
      var toFrame = moved ? onFrame(pt) : p.cell < 0;
      drop(p, toFrame);
    }
    p.el.addEventListener('pointerup', end);
    p.el.addEventListener('pointercancel', end);
  }

  function drop(p, toFrame) {
    if (busy) return;                                  // идёт анимация успеха — ход не принимаем
    var R = ROUNDS[round], want = R.tasks[task];
    if (toFrame && p.cell < 0) {
      var cell = firstFree();
      var limit = R.kind === 'seat' ? want : 10;
      if (cell < 0 || seated().length >= limit) nope(p);
      else { p.cell = cell; hop(p); }
    } else if (!toFrame && p.cell >= 0) {
      p.cell = -1;
      /* после ухода — сдвигаем остальных, чтобы дырок не было */
      seated().sort(function (a, b) { return a.cell - b.cell; }).forEach(function (q, i) { q.cell = i; });
    }
    layout();
    refresh();
    check();
    idle();
  }

  function hop(p) { p.el.classList.remove('hop'); void p.el.offsetWidth; p.el.classList.add('hop'); }
  function nope(p) {
    p.el.classList.remove('nope'); void p.el.offsetWidth; p.el.classList.add('nope');
    badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');
  }

  function refresh() {
    var R = ROUNDS[round], want = R.tasks[task], n = seated().length;
    badge.innerHTML = '<b>' + (R.kind === 'fill' ? 10 : R.kind === 'flash' ? '?' : want) + '</b>';
    if (R.kind === 'seat') badge.appendChild(M.dots(n, { total: want, size: 8 }));
  }

  /* ── проверка раундов с лавочкой ────────────────────────── */
  function check() {
    if (busy) return;                                  // одна задача — одна победа
    var R = ROUNDS[round], want = R.tasks[task], n = seated().length;
    if (R.kind === 'seat' && n === want) {
      busy = true;
      frame.classList.add('five');                   // подсветить полный ряд из пяти
      M.sparks(stage, 50, 45, 14);
      cheer();
      big(want, 5, want - 5);
      setTimeout(function () { frame.classList.remove('five'); nextTask(); }, 2400);
    }
    if (R.kind === 'fill' && n === 10) {
      busy = true;
      M.sparks(stage, 50, 45, 16);
      cheer();
      var slot = album.children[task];
      big(10, want, 10 - want, slot);
      setTimeout(nextTask, 2400);
    }
  }

  /* большая схема — выскакивает и улетает в альбом (или просто гаснет) */
  function big(w, a, b, slot) {
    var el = M.el('div', 'mh__big');
    el.appendChild(M.bond(w, a, b));
    stage.appendChild(el);
    setTimeout(function () {
      if (!slot) { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; return setTimeout(function () { el.remove(); }, 420); }
      var ra = el.getBoundingClientRect(), rb = slot.getBoundingClientRect();
      el.style.transition = 'transform .55s cubic-bezier(.5,0,.3,1), opacity .55s';
      el.style.transform = 'translate(' + (rb.left + rb.width / 2 - ra.left - ra.width / 2) + 'px,' +
        (rb.top + rb.height / 2 - ra.top - ra.height / 2) + 'px) scale(.35)';
      el.style.opacity = '.3';
      setTimeout(function () { el.remove(); slot.classList.add('got'); slot.innerHTML = ''; slot.appendChild(M.bond(w, a, b)); }, 560);
    }, 1100);
  }

  /* ── вспышка ────────────────────────────────────────────── */
  function flash() {
    var R = ROUNDS[round], want = R.tasks[task];
    busy = true;
    cards.hidden = true;
    cloud.hidden = true;
    pals.forEach(function (p) { p.el.remove(); });
    pals = [];
    for (var i = 0; i < want; i++) { var p = makePal(i, true); p.cell = i; }
    layout();
    refresh();
    setTimeout(function () {
      cloud.hidden = false;
      pals.forEach(function (p) { p.el.style.visibility = 'hidden'; });
      Array.prototype.forEach.call(frame.children, function (c) { c.className = ''; });
      showCards(want);
    }, 1400);
  }

  function showCards(want) {
    var opts = [want];
    while (opts.length < 3) {
      var o = want + (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
      if (o >= 1 && o <= 10 && opts.indexOf(o) < 0) opts.push(o);
    }
    opts.sort(function (a, b) { return a - b; });
    cards.innerHTML = '';
    opts.forEach(function (o) {
      var b = M.el('button', 'mf-card', '<b>' + o + '</b>');
      b.type = 'button';
      b.onclick = function () { pick(o, b, want); };
      cards.appendChild(b);
    });
    cards.hidden = false;
    busy = false;
  }

  function pick(o, btn, want) {
    if (busy) return;
    busy = true;
    /* ответ или нет — лавочку открываем: ребёнок видит, как выглядит это число */
    cloud.hidden = true;
    pals.forEach(function (p) { p.el.style.visibility = ''; });
    layout();
    if (o === want) {
      btn.classList.add('ok');
      if (firstTry) found.push(want);
      M.sparks(stage, 50, 45, 12);
      cheer();
      big(want, Math.min(5, want), Math.max(0, want - 5));
      setTimeout(nextTask, 2200);
    } else {
      btn.classList.add('bad');
      firstTry = false;
      think();
      setTimeout(function () {                     // ещё раз то же число: вспышка покороче не нужна
        btn.classList.remove('bad');
        cloud.hidden = false;
        pals.forEach(function (p) { p.el.style.visibility = 'hidden'; });
        Array.prototype.forEach.call(frame.children, function (c) { c.className = ''; });
        busy = false;
      }, 1800);
    }
  }

  /* ── Нейро ──────────────────────────────────────────────── */
  function cheer() {
    neuro.src = '../mascot/win.webp';
    neuro.classList.remove('cheer'); void neuro.offsetWidth; neuro.classList.add('cheer');
    clearTimeout(cheer.t); cheer.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1600);
  }
  function think() {
    neuro.src = '../mascot/think.webp';
    clearTimeout(cheer.t); cheer.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1400);
  }

  /* ── подсказка рукой ────────────────────────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy || ROUNDS[round].kind === 'flash') return;
      var free = pals.filter(function (p) { return p.cell < 0; })[0], cell = firstFree();
      if (free && cell >= 0) hand.drag([free.home[0], free.home[1] - 6], [CELLS[cell][0], CELLS[cell][1]]);
    }, ms || 2600);
  }

  /* ── раунды и задачи ────────────────────────────────────── */
  function startTask() {
    var R = ROUNDS[round], want = R.tasks[task];
    busy = false; firstTry = true;
    cloud.hidden = true; cards.hidden = true;
    pals.forEach(function (p) { p.el.remove(); });
    pals = [];
    if (R.kind === 'flash') return flash();
    if (R.kind === 'fill') {
      for (var i = 0; i < want; i++) { var p = makePal(i, true); p.cell = i; }
      for (var j = 0; j < 10 - want + 2; j++) makePal(j + want, false);
    } else {
      for (var k = 0; k < want + 2; k++) makePal(k, false);
    }
    layout();
    refresh();
    badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');
    idle(round === 0 && task === 0 ? 1600 : 2600);
  }

  function startRound() {
    var R = ROUNDS[round];
    task = 0;
    album.innerHTML = '';
    if (R.kind === 'fill') R.tasks.forEach(function () { album.appendChild(M.el('div', 'mh-slot')); });
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
    cards.hidden = true; cloud.hidden = true; album.style.display = 'none';
    var end = M.el('div', 'mh__end',
      '<h2>Десять — два ряда по пять</h2><p>Сколько мест пустых — столько не хватает до десяти</p>');
    var all = M.el('div', 'mh__all');
    /* итог — из тех же задач, что и раунды: пары до десяти и «пять и ещё» */
    var sums = [];
    ROUNDS.forEach(function (R) {
      if (R.kind === 'fill') R.tasks.forEach(function (t) { sums.push([10, t, 10 - t]); });
      if (R.kind === 'seat') R.tasks.forEach(function (t) { sums.push([t, 5, t - 5]); });
    });
    sums.forEach(function (b) { all.appendChild(M.bond(b[0], b[1], b[2])); });
    end.appendChild(all);
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); album.style.display = ''; round = 0; startRound(); };
    next.onclick = function () {
      M.finishLevel('ma3', 60);
    };
  }

  /* ?debug=1 — ходы без мыши для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mf = {
      seat: function (n) { pals.filter(function (p) { return p.cell < 0; }).slice(0, n).forEach(function (p) { drop(p, true); }); },
      pick: function (o) { var b = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (b) b.click(); },
      state: function () { return { round: round, task: task, want: ROUNDS[round] && ROUNDS[round].tasks[task], seated: seated().length, cards: [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
