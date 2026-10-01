/* ============================================================
   ЧЕРЕЗ ДЕСЯТОК — уровень 7 игры «Числа-друзья» (6–7 лет)

   «Ага»: 8 + 5 — сначала до десяти, потом дальше: 8 + 5 = 10 + 3.

   Станция. Вагон — та же рамка десяти: два ряда по пять окон. В первом
   уже сидят пассажиры, на платформе ждут ещё. Ребёнок зажимает кнопку
   (новый жест — нажать и держать): пока держит, пассажиры заходят по
   одному. Первый вагон полон — на нём загорается «10», подъезжает второй
   вагон, остальные садятся туда. Под примером видно разложение «10 + 3».

   Раунды:
   1. «8 + 5»: посади всех — пример сам допишет «= 13» и «10 + 3».
   2. «7 + 6 = ?»: посади всех и выбери ответ: полный вагон и ещё сколько.
   3. «8 + ? = 12»: отпусти кнопку, когда в поезде станет ровно 12.
      Лишние выходят из второго вагона обратно — пробуй ещё.

   Графика — Higgsfield: станция; пассажиры — пушики из «Домика».
   Вагоны — схема, поэтому нарисованы стилями.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var X0 = 8, X1 = 92, TOPS = [27, 47], WH = 15;     // вагоны: края и верх, высота — в процентах сцены
  var QUEUE_Y = 80, STEP = 650;                       // где ждут на платформе; темп посадки, мс

  var ROUNDS = [
    { kind: 'go', tasks: [[8, 5], [9, 4]] },
    { kind: 'ask', tasks: [[7, 6], [8, 6]] },
    { kind: 'stop', tasks: [[8, 6, 12], [7, 8, 13]] },   // сидят, ждут, сколько должно стать
  ];

  var round = 0, task = 0, pals = [], busy = false, idleT = null, demoDone = false;
  var holding = false, timer = null, rolling = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  /* ── вагоны ─────────────────────────────────────────────── */
  function seatXY(w, k) {
    var row = k < 5 ? 0 : 1, col = k % 5;
    return [X0 + (X1 - X0) * (col + .5) / 5, TOPS[w] + (row ? 11.2 : 5.2)];
  }
  var wagons = TOPS.map(function (top, w) {
    var el = M.el('div', 'mt-wagon');
    el.style.left = X0 + '%'; el.style.width = (X1 - X0) + '%';
    el.style.top = top + '%'; el.style.height = WH + '%';
    for (var k = 0; k < 10; k++) {
      var win = M.el('i'), p = seatXY(w, k);
      win.style.left = (p[0] - X0) / (X1 - X0) * 100 + '%';
      win.style.top = (p[1] - top) / WH * 100 + '%';
      el.appendChild(win);
    }
    el.appendChild(M.el('span', 'mt-wheel'));
    el.appendChild(M.el('span', 'mt-wheel mt-wheel--r'));
    var chip = M.el('b', 'mt-chip');
    el.appendChild(chip);
    stage.appendChild(el);
    return { el: el, chip: chip };
  });

  var card = M.el('div', 'mhp-card mt-card');
  stage.appendChild(card);
  var cards = M.el('div', 'mf-cards mhp-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  /* кнопка: нажать и держать — пассажиры идут */
  var go = M.el('button', 'mt-go',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 38V12M13 22l11-11 11 11" fill="none" stroke="#5A3A08" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  go.type = 'button';
  go.setAttribute('aria-label', 'Держи — пассажиры заходят');
  stage.appendChild(go);

  function cur() { return ROUNDS[round].tasks[task]; }
  function inWagon(w) { return pals.filter(function (p) { return p.wagon === w; }); }
  function waiting() { return pals.filter(function (p) { return p.wagon < 0; }); }
  function total() { return inWagon(0).length + inWagon(1).length; }

  function makePal(i) {
    var p = { el: M.el('div', 'mh-pal mt-pal'), wagon: -1, seat: -1 };
    var img = M.el('img'); img.src = 'math/pal-' + (i % 8 + 1) + '.webp'; img.alt = ''; img.draggable = false;
    p.el.appendChild(img);
    stage.appendChild(p.el);
    pals.push(p);
    return p;
  }
  function place(p) {
    if (p.wagon >= 0) {
      var s = seatXY(p.wagon, p.seat);
      p.el.classList.add('in');
      p.el.style.left = s[0] + '%'; p.el.style.top = (s[1] + 3.4) + '%';
    } else {
      p.el.classList.remove('in');
    }
  }
  function lineUp() {
    var q = waiting(), n = q.length;
    q.forEach(function (p, k) {
      var gap = Math.min(12, 80 / Math.max(1, n));
      p.el.style.left = (50 + (k - (n - 1) / 2) * gap) + '%';
      p.el.style.top = (QUEUE_Y + (k % 2) * 3) + '%';
    });
    go.hidden = !n;                 // на платформе пусто — кнопка не нужна, не закрывает карточки
  }

  function drawChips() {
    var a = inWagon(0).length, b = inWagon(1).length;
    wagons[0].chip.textContent = a === 10 ? '10' : '';
    wagons[0].el.classList.toggle('full', a === 10);
    wagons[1].chip.textContent = b ? String(b) : '';
  }

  /* пример сверху; когда первый вагон полон — под ним разложение «10 + …» */
  function drawCard(done) {
    var R = ROUNDS[round], t = cur(), a = inWagon(0).length, b = inWagon(1).length, sum = a + b;
    var text = R.kind === 'go' ? t[0] + ' + ' + t[1] + (done ? ' = ' + sum : '')
      : R.kind === 'ask' ? t[0] + ' + ' + t[1] + ' = ' + (done ? sum : '?')
      : t[0] + ' + ' + (done ? t[2] - t[0] : '?') + ' = ' + t[2];
    card.innerHTML = '<b>' + text + '</b>' + (a === 10 ? '<small>10 + ' + b + '</small>' : '');
  }

  /* ── посадка: один пассажир за шаг ──────────────────────── */
  function board() {
    if (rolling || busy) return;
    var q = waiting();
    if (!q.length) return stopHold(true);
    var p = q[0];
    if (inWagon(0).length < 10) { p.seat = inWagon(0).length; p.wagon = 0; }
    else if (!wagons[1].here) return arrive();
    else { p.seat = inWagon(1).length; p.wagon = 1; }
    place(p);
    lineUp();
    drawChips();
    drawCard(false);
    if (inWagon(0).length === 10 && !wagons[1].here) {
      /* первый вагон полон: «10» и подъезжает второй */
      wagons[0].el.classList.remove('ring'); void wagons[0].el.offsetWidth; wagons[0].el.classList.add('ring');
      M.sparks(stage, 50, TOPS[0] + 7, 10);
      if (waiting().length) arrive();
    }
    if (!waiting().length) stopHold(true);
  }

  function arrive() {
    rolling = true;
    wagons[1].here = true;
    wagons[1].el.classList.remove('away');
    setTimeout(function () { rolling = false; }, 850);
  }

  function startHold() {
    if (busy || holding) return;
    holding = true;
    go.classList.add('on');
    stopHint();
    board();
    timer = setInterval(board, STEP);
  }
  function stopHold(empty) {
    if (!holding && !empty) return;
    holding = false;
    clearInterval(timer);
    go.classList.remove('on');
    released(empty);
  }
  go.addEventListener('pointerdown', function (e) { e.preventDefault(); try { go.setPointerCapture(e.pointerId); } catch (x) {} startHold(); });
  go.addEventListener('pointerup', function () { stopHold(false); });
  go.addEventListener('pointercancel', function () { stopHold(false); });
  go.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* отпустили кнопку (или пассажиры кончились) */
  function released(empty) {
    if (busy) return;
    var R = ROUNDS[round], t = cur(), sum = total();
    if (R.kind === 'stop') {
      if (sum === t[2]) return success();
      if (sum > t[2]) return overshoot();
      return idle(2400);
    }
    if (!waiting().length) return R.kind === 'go' ? success() : ask();
    idle(2400);
  }

  function success() {
    busy = true;
    stopHint();
    drawCard(true);
    card.classList.add('ok');
    inWagon(1).forEach(function (p, k) { setTimeout(function () { hop(p.el); }, k * 120); });
    M.sparks(stage, 50, 18, 12);
    setTimeout(nextTask, 2600);
  }

  /* лишние выходят из второго вагона обратно на платформу */
  function overshoot() {
    busy = true;
    card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse', 'try');
    var extra = inWagon(1);
    extra.forEach(function (p, k) {
      setTimeout(function () {
        hop(p.el);
        p.wagon = -1; p.seat = -1; place(p);
        pals.splice(pals.indexOf(p), 1); pals.push(p);       // встаёт в конец очереди
        lineUp(); drawChips(); drawCard(false);
      }, 500 + k * 260);
    });
    setTimeout(function () { card.classList.remove('try'); busy = false; idle(1800); }, 700 + extra.length * 260);
  }

  /* «сколько всего?» — три карточки */
  function ask() {
    busy = true;
    stopHint();
    var t = cur(), want = t[0] + t[1];
    var opts = [want - 1, want, want + 1];
    cards.innerHTML = '';
    opts.forEach(function (o) {
      var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
      c.type = 'button';
      c.onclick = function () {
        if (c.classList.contains('ok')) return;
        if (o === want) {
          c.classList.add('ok');
          setTimeout(function () { cards.hidden = true; success(); }, 500);
        } else {
          c.classList.add('bad');
          /* подсказка: «10» на полном вагоне и пассажиры второго по одному */
          var ch = wagons[0].chip;
          ch.classList.remove('pulse'); void ch.offsetWidth; ch.classList.add('pulse');
          inWagon(1).forEach(function (p, k) { setTimeout(function () { hop(p.el); }, 400 + k * 260); });
          setTimeout(function () { c.classList.remove('bad'); }, 900);
        }
      };
      cards.appendChild(c);
    });
    setTimeout(function () { cards.hidden = false; }, 400);
  }

  function hop(el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }

  /* ── подсказки рукой: нажать и держать ─────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy || holding) return;
      hand.drag([51, 90], [51, 90.6]);
    }, ms || 2800);
  }

  /* «смотри — повтори»: игра сама держит кнопку, пока не сядут двое */
  function demo() {
    demoDone = true;
    hand.drag([51, 90], [51, 90.6], false);
    setTimeout(function () { startHold(); }, 700);
    setTimeout(function () { stopHold(false); hand.stop(); idle(2200); }, 700 + STEP + 80);
  }

  function startTask() {
    var R = ROUNDS[round], t = cur();
    busy = false; holding = false; clearInterval(timer);
    pals.forEach(function (p) { p.el.remove(); });
    pals = [];
    for (var i = 0; i < t[0] + t[1]; i++) makePal(i + round * 3 + task);
    for (var s = 0; s < t[0]; s++) { pals[s].wagon = 0; pals[s].seat = s; place(pals[s]); }
    wagons[1].here = false;
    wagons[1].el.classList.add('away');
    wagons[0].el.classList.remove('full', 'ring');
    lineUp();
    drawChips();
    card.classList.remove('ok', 'try', 'pulse');
    cards.hidden = true;
    drawCard(false);
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 1000);
    idle(2400);
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
      '<h2>Сначала до десяти, потом дальше</h2><p>8 + 5: двое заполнят вагон до десяти, и ещё трое — 13</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma7', 60, { nextLabel: 'В Арену →', onNext: function () { location.href = 'math-arena.html'; } });
      else location.href = 'math-arena.html';
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mt = {
      hold: function (n) { holding = true; for (var i = 0; i < n; i++) { rolling = false; board(); } stopHold(false); },
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { return { round: round, task: task, w1: inWagon(0).length, w2: inWagon(1).length, wait: waiting().length, busy: busy, card: card.textContent, cards: cards.hidden ? [] : [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
