/* ============================================================
   УБЕЖАВШИЕ ЗАЙЦЫ — уровень 6 игры «Числа-друзья» (6–7 лет)

   «Ага»: вычесть — узнать, сколько осталось.

   На огороде сидят зайцы. Ребёнок зачёркивает зайца чертой (новый жест —
   провести линию, как зачёркивают в тетради 1 класса), и зачёркнутый
   убегает в дыру в заборе. На его месте остаются следы: видно и сколько
   осталось, и сколько убежало. На карточке сверху — пример и точки:
   убежавшие становятся пустыми кружками.

   Раунды:
   1. «5 − 2»: зачеркни двоих — карточка сама допишет «= 3».
   2. «7 − 3 = ?»: зачеркни троих, потом выбери, сколько осталось.
   3. «8 − ? = 5»: зачёркивай, пока не останется пять, потом выбери,
      сколько убежало (пустые следы можно пересчитать).

   Без слов и звука. Графика — Higgsfield: огород, заяц (сидит/бежит).
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var GAP = [54, 34];                    // дыра в заборе — сюда убегают

  var ROUNDS = [
    { kind: 'show', tasks: [[5, 2], [6, 3]] },
    { kind: 'left', tasks: [[7, 3], [6, 4]] },
    { kind: 'gone', tasks: [[8, 5], [9, 6]] },
  ];

  var round = 0, task = 0, hares = [], out = 0, busy = false, idleT = null, demoDone = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  var card = M.el('div', 'mhp-card');
  stage.appendChild(card);
  var cards = M.el('div', 'mf-cards mhp-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  /* меловая черта поверх сцены */
  var NS = 'http://www.w3.org/2000/svg';
  var ink = document.createElementNS(NS, 'svg');
  ink.setAttribute('class', 'mz-ink');
  stage.appendChild(ink);

  function cur() { return ROUNDS[round].tasks[task]; }
  function need() {                       // сколько зайцев должно убежать в этом задании
    var R = ROUNDS[round], t = cur();
    return R.kind === 'gone' ? t[0] - t[1] : t[1];
  }

  /* зайцы рядами по траве; чуть вразнобой, чтобы не было строя */
  function layout(n) {
    var rows = n <= 5 ? 1 : 2;
    var ys = rows === 1 ? [57] : [50, 63];
    var per = Math.ceil(n / rows), out = [];
    for (var r = 0; r < rows; r++) {
      var k = Math.min(per, n - r * per);
      for (var i = 0; i < k; i++) {
        var x = 50 + (i - (k - 1) / 2) * Math.min(20, 76 / Math.max(1, k - 1));
        out.push([x + (Math.random() - .5) * 4, ys[r] + (Math.random() - .5) * 3]);
      }
    }
    return out;
  }

  function makeHare(p) {
    var h = { el: M.el('div', 'mz-hare'), pos: p, gone: false };
    var img = M.el('img'); img.src = 'math/hare.webp'; img.alt = ''; img.draggable = false;
    h.img = img;
    h.el.appendChild(img);
    h.el.style.left = p[0] + '%'; h.el.style.top = p[1] + '%';
    h.el.style.setProperty('--delay', (-Math.random() * 2).toFixed(2) + 's');
    stage.appendChild(h.el);
    return h;
  }

  function drawCard() {
    var R = ROUNDS[round], t = cur(), left = t[0] - out;
    var text = R.kind === 'show' ? t[0] + ' − ' + t[1]
      : R.kind === 'left' ? t[0] + ' − ' + t[1] + ' = ?'
      : t[0] + ' − ? = ' + t[1];
    card.innerHTML = '<b>' + text + '</b>';
    card.appendChild(M.dots(left, { total: t[0], size: 9, color: '#B07A4A' }));
  }

  /* ── жест: провести черту через зайца ─────────────────────── */
  var path = null, line = null, len = 0;
  function pt(e) {
    var r = stage.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function inside(h, p) {
    var r = h.img.getBoundingClientRect(), s = stage.getBoundingClientRect();
    var padX = r.width * .12, padY = r.height * .12;
    return p[0] > r.left - s.left + padX && p[0] < r.right - s.left - padX &&
           p[1] > r.top - s.top + padY && p[1] < r.bottom - s.top - padY;
  }
  stage.addEventListener('pointerdown', function (e) {
    if (busy || e.target.closest('button')) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    stopHint();
    path = [pt(e)]; len = 0;
    hares.forEach(function (h) { h.hit = inside(h, path[0]); });
    line = document.createElementNS(NS, 'polyline');
    ink.appendChild(line);
    line.setAttribute('points', path[0].join(','));
  });
  stage.addEventListener('pointermove', function (e) {
    if (!path) return;
    var p = pt(e), q = path[path.length - 1];
    len += Math.hypot(p[0] - q[0], p[1] - q[1]);
    path.push(p);
    line.setAttribute('points', path.map(function (x) { return x.join(','); }).join(' '));
    hares.forEach(function (h) {
      if (h.gone) return;
      var now = inside(h, p);
      if (now) h.hit = true;
      else if (h.hit && len > 30) { h.hit = false; strike(h); }   // черта прошла насквозь
    });
  });
  function up() {
    if (!path) return;
    var short = len < 12;
    hares.forEach(function (h) {
      if (h.gone || !h.hit) return;
      h.hit = false;
      if (!short) strike(h);
      else { h.el.classList.remove('nope'); void h.el.offsetWidth; h.el.classList.add('nope'); }   // просто ткнули — покажем черту
    });
    var l = line; l.classList.add('fade'); setTimeout(function () { l.remove(); }, 600);
    path = null; line = null;
    if (!busy) idle(short ? 600 : 2600);
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  /* зачёркнутый заяц убегает в дыру в заборе, на месте — следы */
  function strike(h) {
    if (busy || h.gone || out >= need()) return;
    h.gone = true;
    out++;
    var spot = M.el('div', 'mz-spot');
    spot.style.left = h.pos[0] + '%'; spot.style.top = h.pos[1] + '%';
    stage.insertBefore(spot, h.el);
    h.spot = spot;
    h.img.src = 'math/hare-run.webp';
    h.el.classList.add('run');
    if (GAP[0] < h.pos[0]) h.el.classList.add('left');
    requestAnimationFrame(function () {
      h.el.style.left = GAP[0] + '%'; h.el.style.top = GAP[1] + '%';
    });
    setTimeout(function () { h.el.classList.add('away'); }, 650);
    drawCard();
    if (out === need()) done();
  }

  function done() {
    var R = ROUNDS[round], t = cur();
    busy = true;
    stopHint();
    setTimeout(function () {
      if (R.kind === 'show') {
        card.innerHTML = '<b>' + t[0] + ' − ' + t[1] + ' = ' + (t[0] - t[1]) + '</b>';
        card.appendChild(M.dots(t[0] - t[1], { total: t[0], size: 9, color: '#B07A4A' }));
        win();
        return setTimeout(nextTask, 2300);
      }
      /* «сколько осталось?» / «сколько убежало?» — три карточки */
      var want = R.kind === 'left' ? t[0] - t[1] : t[0] - t[1];
      var opts = [want - 1, want, want + 1].filter(function (o) { return o > 0; });
      cards.innerHTML = '';
      opts.forEach(function (o) {
        var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
        c.type = 'button';
        c.onclick = function () {
          if (c.classList.contains('ok')) return;
          if (o === want) {
            c.classList.add('ok');
            card.innerHTML = '<b>' + t[0] + ' − ' + (R.kind === 'left' ? t[1] + ' = ' + want : want + ' = ' + t[1]) + '</b>';
            card.appendChild(M.dots(t[0] - out, { total: t[0], size: 9, color: '#B07A4A' }));
            win();
            setTimeout(function () { cards.hidden = true; nextTask(); }, 1900);
          } else {
            c.classList.add('bad');
            /* подсказка: подпрыгивают те, кого надо посчитать */
            var who = R.kind === 'left' ? hares.filter(function (h) { return !h.gone; }).map(function (h) { return h.el; })
                                        : hares.filter(function (h) { return h.gone; }).map(function (h) { return h.spot; });
            who.forEach(function (x, k) { setTimeout(function () { x.classList.remove('hop'); void x.offsetWidth; x.classList.add('hop'); }, k * 220); });
            setTimeout(function () { c.classList.remove('bad'); }, 900);
          }
        };
        cards.appendChild(c);
      });
      cards.hidden = false;
    }, 900);
  }

  /* оставшиеся радуются */
  function win() {
    card.classList.add('ok');
    hares.forEach(function (h, k) {
      if (h.gone) return;
      setTimeout(function () { h.el.classList.remove('hop'); void h.el.offsetWidth; h.el.classList.add('hop'); }, k * 90);
    });
    M.sparks(stage, 50, 18, 12);
  }

  /* ── подсказки рукой: черта через первого незачёркнутого ── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function slashHint(h, repeat) {
    var p = h.pos;
    hand.drag([p[0] - 11, p[1] - 9], [p[0] + 11, p[1] + 1], repeat);
  }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var h = hares.filter(function (x) { return !x.gone; })[0];
      if (h) slashHint(h);
    }, ms || 3000);
  }

  /* «смотри — повтори»: игра сама зачёркивает первого зайца */
  function demo() {
    demoDone = true;
    busy = true;
    var h = hares[0];
    slashHint(h, false);
    setTimeout(function () {
      var s = stage.getBoundingClientRect(), p = h.pos;
      var a = [(p[0] - 11) / 100 * s.width, (p[1] - 7) / 100 * s.height], b = [(p[0] + 11) / 100 * s.width, (p[1] + 3) / 100 * s.height];
      var l = document.createElementNS(NS, 'polyline');
      l.setAttribute('points', a.join(',') + ' ' + b.join(','));
      ink.appendChild(l);
      setTimeout(function () { l.classList.add('fade'); setTimeout(function () { l.remove(); }, 600); }, 500);
    }, 1500);
    setTimeout(function () { busy = false; strike(h); }, 1700);
    setTimeout(function () { if (!busy) idle(2400); }, 2600);
  }

  function startTask() {
    var t = cur();
    busy = false; out = 0;
    hares.forEach(function (h) { h.el.remove(); if (h.spot) h.spot.remove(); });
    hares = layout(t[0]).map(makeHare);
    card.classList.remove('ok');
    cards.hidden = true;
    drawCard();
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 1000);
    idle(2800);
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
      '<h2>Вычесть — узнать, сколько осталось</h2><p>7 − 3: было семь, трое убежали — осталось четыре</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma6', 60, { nextLabel: 'В Арену →', onNext: function () { location.href = 'math-arena.html'; } });
      else location.href = 'math-arena.html';
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mz = {
      strike: function (k) { var h = hares.filter(function (x) { return !x.gone; })[k || 0]; if (h) strike(h); },
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { return { round: round, task: task, out: out, need: ROUNDS[round] && need(), busy: busy, card: card.textContent, cards: cards.hidden ? [] : [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
