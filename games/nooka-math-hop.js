/* ============================================================
   ПРЫЖКИ КУЗНЕЧИКА — уровень 5 игры «Числа-друзья» (6–7 лет)

   «Ага»: +3 — это три прыжка вперёд. Числовая дорожка — кувшинки
   на пруду от 0 у берега до 10 вдали.

   Раунды, у каждого свой жест:
   1. Прыгай: задание «+3» — три следа-точки; смахни кузнечика вверх —
      прыжок на соседнюю кувшинку, след тратится. Кончились следы —
      приземлился: 0 + 3 = 3.
   2. Куда приземлится: кузнечик на 4, задание «+3». Ребёнок касается
      кувшинки, где ждёт приземления, — потом кузнечик прыгает и
      показывает, как на самом деле.
   3. Сколько прыжков: на кувшинке 8 — цветок. Допрыгай до него, а потом
      выбери из трёх карточек, сколько было прыжков (3 + ? = 8).

   Координаты кувшинок сняты с pond-bg.webp по сетке. Графика —
   Higgsfield: пруд и кузнечик (сидит/прыгает).
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');

  /* центры кувшинок 0…10 и их ширина (перспектива: дальние меньше) */
  var PADS = [77.5, 67.5, 60.5, 54.8, 49.8, 45.8, 42.3, 39.0, 36.2, 33.6, 31.0].map(function (y, i) {
    return { x: 50, y: y, w: 27 - i * 1.2 };
  });

  var ROUNDS = [
    { kind: 'go', tasks: [[0, 3], [2, 4]] },
    { kind: 'guess', tasks: [[4, 3], [1, 5]] },
    { kind: 'reach', tasks: [[3, 8], [5, 9]] },
  ];

  var round = 0, task = 0, at = 0, left = 0, jumps = 0, busy = false, idleT = null, demoDone = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  /* номера на кувшинках — это и есть числовая дорожка */
  var marks = PADS.map(function (p, i) {
    var b = M.el('button', 'mhp-pad');
    b.type = 'button';
    b.style.left = p.x + '%'; b.style.top = p.y + '%'; b.style.width = p.w + '%';
    b.style.setProperty('--f', (.62 + .38 * p.w / 27).toFixed(2));
    b.innerHTML = '<b>' + i + '</b>';
    b.onclick = function () { pickPad(i); };
    stage.appendChild(b);
    return b;
  });

  var flag = M.el('div', 'mhp-flag', '<span></span>');
  flag.hidden = true;
  stage.appendChild(flag);

  var hop = M.el('div', 'mhp-hop');
  var himg = M.el('img'); himg.src = 'math/hop.webp'; himg.alt = ''; himg.draggable = false;
  hop.appendChild(himg);
  stage.appendChild(hop);

  var card = M.el('div', 'mhp-card');
  stage.appendChild(card);
  var cards = M.el('div', 'mf-cards mhp-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  function placeHop(i, anim) {
    var p = PADS[i];
    hop.style.width = (p.w * .62) + '%';
    hop.style.left = p.x + '%';
    hop.style.top = (p.y + 1.5) + '%';
    if (anim) { hop.classList.remove('jump'); void hop.offsetWidth; hop.classList.add('jump'); }
  }

  function lightPad(i, cls) {
    marks.forEach(function (m, k) { m.classList.toggle(cls, k === i); });
  }

  /* карточка задания сверху: пример и следы-точки прыжков */
  function drawCard(text, dotsOn, dotsTotal) {
    card.innerHTML = '<b>' + text + '</b>';
    if (dotsTotal) card.appendChild(M.dots(dotsOn, { total: dotsTotal, size: 9, color: '#2D7A3A' }));
  }

  /* ── прыжок: смахнуть вверх (касание — тоже прыжок, но с подсказкой жеста) ── */
  var startY = null;
  hop.addEventListener('pointerdown', function (e) {
    if (busy) return;
    e.preventDefault();
    hop.setPointerCapture(e.pointerId);
    startY = e.clientY;
    stopHint();
  });
  hop.addEventListener('pointerup', function (e) {
    if (startY == null) return;
    var dy = e.clientY - startY; startY = null;
    if (dy < -12 || Math.abs(dy) <= 12) tryJump();
  });
  hop.addEventListener('pointercancel', function () { startY = null; });

  function tryJump() {
    var R = ROUNDS[round], t = R.tasks[task];
    if (busy) return;
    if (R.kind === 'go' && left <= 0) return;
    if (R.kind === 'guess') return;                  // во втором раунде сначала угадать кувшинку
    if (at >= 10) return;
    jump();
    if (R.kind === 'go') {
      left--;
      drawCard(t[0] + ' + ' + t[1], t[1] - left, t[1]);
      if (left === 0) return land();
    }
    if (R.kind === 'reach') {
      drawCard(t[0] + ' + ? = ' + t[1], jumps, Math.max(jumps, 1));
      if (at === t[1]) return reached();
    }
    idle();
  }

  function jump() {
    at++; jumps++;
    himg.src = 'math/hop-jump.webp';
    placeHop(at, true);
    setTimeout(function () { himg.src = 'math/hop.webp'; }, 420);
    lightPad(at, 'on');
  }

  /* раунд 1: следы кончились — приземлился */
  function land() {
    var t = ROUNDS[round].tasks[task];
    busy = true;
    setTimeout(function () {
      drawCard(t[0] + ' + ' + t[1] + ' = ' + at);
      card.classList.add('ok');
      M.sparks(stage, PADS[at].x, PADS[at].y, 12);
      setTimeout(nextTask, 2000);
    }, 500);
  }

  /* раунд 2: угадать кувшинку, потом прыжки показывают ответ */
  function pickPad(i) {
    var R = ROUNDS[round], t = R.tasks[task];
    if (busy || R.kind !== 'guess' || i <= t[0]) return;
    busy = true;
    stopHint();
    lightPad(i, 'pick');
    var k = 0;
    (function step() {
      if (k < t[1]) { k++; jump(); return setTimeout(step, 520); }
      var right = at === i;
      drawCard(t[0] + ' + ' + t[1] + ' = ' + at);
      card.classList.add(right ? 'ok' : 'try');
      if (right) M.sparks(stage, PADS[at].x, PADS[at].y, 14);
      else marks[i].classList.add('miss');
      setTimeout(function () { marks[i].classList.remove('miss'); nextTask(); }, right ? 1900 : 2600);
    })();
  }

  /* раунд 3: допрыгал до цветка — сколько было прыжков? */
  function reached() {
    var t = ROUNDS[round].tasks[task], want = t[1] - t[0];
    busy = true;
    flag.classList.add('got');
    var opts = [want, want + 1, want - 1].filter(function (o) { return o > 0; }).sort(function (a, b) { return a - b; });
    cards.innerHTML = '';
    opts.forEach(function (o) {
      var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
      c.type = 'button';
      c.onclick = function () {
        if (o === want) {
          c.classList.add('ok');
          drawCard(t[0] + ' + ' + want + ' = ' + t[1]);
          card.classList.add('ok');
          M.sparks(stage, 50, 18, 12);
          setTimeout(function () { cards.hidden = true; nextTask(); }, 1600);
        } else {
          c.classList.add('bad');
          card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');   // точки-прыжки на карточке подсказывают
          setTimeout(function () { c.classList.remove('bad'); }, 900);
        }
      };
      cards.appendChild(c);
    });
    setTimeout(function () { cards.hidden = false; }, 500);
  }

  /* ── подсказки рукой ────────────────────────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var R = ROUNDS[round], p = PADS[at];
      if (R.kind === 'guess') {
        var t = R.tasks[task], q = PADS[Math.min(10, t[0] + 1)];
        return hand.drag([q.x + 6, q.y + 2], [q.x + 6, q.y + 3]);
      }
      hand.drag([p.x + 4, p.y + 4], [p.x + 4, p.y - 6]);           // смахни вверх
    }, ms || 2800);
  }

  /* «смотри — повтори»: игра сама делает первый прыжок */
  function demo() {
    demoDone = true;
    busy = true;
    var p = PADS[at];
    hand.drag([p.x + 4, p.y + 4], [p.x + 4, p.y - 6], false);
    setTimeout(function () { busy = false; tryJump(); busy = true; }, 1300);
    setTimeout(function () { busy = false; idle(2400); }, 2200);
  }

  function startTask() {
    var R = ROUNDS[round], t = R.tasks[task];
    busy = false; jumps = 0;
    at = t[0];
    card.classList.remove('ok', 'try');
    cards.hidden = true;
    flag.hidden = R.kind !== 'reach'; flag.classList.remove('got');
    marks.forEach(function (m) { m.classList.remove('on', 'pick', 'miss'); });
    marks.forEach(function (m) { m.classList.toggle('tap', R.kind === 'guess'); });
    placeHop(at, false);
    lightPad(at, 'on');
    if (R.kind === 'go') { left = t[1]; drawCard(t[0] + ' + ' + t[1], 0, t[1]); }
    if (R.kind === 'guess') drawCard(t[0] + ' + ' + t[1] + ' = ?');
    if (R.kind === 'reach') {
      var f = PADS[t[1]];
      flag.style.left = f.x + '%'; flag.style.top = f.y + '%'; flag.style.width = (f.w * .5) + '%';
      drawCard(t[0] + ' + ? = ' + t[1]);
    }
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 900);
    idle();
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
      '<h2>Плюс — это прыжки вперёд</h2><p>3 + 4: встань на 3 и прыгни четыре раза</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      M.finishLevel('ma5', 60);
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mhp = {
      jump: tryJump, pad: pickPad,
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { return { round: round, task: task, at: at, left: left, jumps: jumps, busy: busy, card: card.textContent, cards: [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
