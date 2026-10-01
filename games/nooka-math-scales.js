/* ============================================================
   ЗАГАДКА ВЕСОВ — уровень 9 игры «Числа-друзья» (6–7 лет)

   «Ага»: 5 + сколько = 8? Сколько не хватает — это вычитание: 8 − 5 = 3.

   Мастерская, на столе весы. На левой чаше яблоки, на правой гирьки
   (одна гирька весит как одно яблоко). Коромысло качается вживую:
   где больше — та чаша ниже. Ребёнок касается гирьки на столе — она
   ложится на правую чашу; касание гирьки на чаше снимает её обратно.
   Добавленные гирьки светятся — их и считаем.

   Раунды:
   1. «5 + ? = 8»: доложи гирек, пока весы не выровняются.
   2. «4 + ? = 7»: сначала угадай карточкой, весы проверят сами.
   3. «9 − 6 = ?»: тот же вопрос, записанный вычитанием. Выровнял —
      под примером видно «6 + 3 = 9».

   Графика — Higgsfield: мастерская, весы по частям, гирька, яблоко.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var P = { x: 50, y: 46 };                       // ось коромысла, % сцены
  var BEAM = .74, PAN = .27, BASE = .36;          // ширины в долях сцены
  var TRAY_Y = 90;

  var ROUNDS = [
    { kind: 'fill', tasks: [[5, 8], [6, 9]] },
    { kind: 'guess', tasks: [[4, 7], [3, 8]] },
    { kind: 'minus', tasks: [[6, 9], [5, 10]] },
  ];

  var round = 0, task = 0, added = 0, spare = 0, busy = false, idleT = null, demoDone = false;
  var ang = 0, vel = 0, target = 0, raf = 0;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  /* ── весы ───────────────────────────────────────────────── */
  function sprite(cls, src) {
    var el = M.el('div', cls), img = M.el('img');
    img.src = src; img.alt = ''; img.draggable = false;
    el.appendChild(img);
    stage.appendChild(el);
    return el;
  }
  var base = sprite('ms-base', 'math/scale-base.webp');
  var panL = sprite('ms-pan', 'math/scale-pan.webp');
  var panR = sprite('ms-pan', 'math/scale-pan.webp');
  var beam = sprite('ms-beam', 'math/scale-beam.webp');
  var badgeL = M.el('b', 'ms-badge'), badgeR = M.el('b', 'ms-badge');
  panL.appendChild(badgeL); panR.appendChild(badgeR);
  var tray = M.el('div', 'ms-tray');
  stage.appendChild(tray);

  var card = M.el('div', 'mhp-card mt-card');
  stage.appendChild(card);
  var cards = M.el('div', 'mf-cards mm-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  function cur() { return ROUNDS[round].tasks[task]; }
  function leftN() { return cur()[1]; }
  function rightN() { return cur()[0] + added; }

  /* раскладка в пикселях: коромысло крутится вокруг оси, чаши висят на крючках отвесно */
  function layout() {
    var r = stage.getBoundingClientRect(), W = r.width, H = r.height;
    var px = P.x / 100 * W, py = P.y / 100 * H;
    var bw = BEAM * W, bh = bw * 149 / 640;
    beam.style.width = bw + 'px';
    beam.style.left = (px - bw / 2) + 'px'; beam.style.top = (py - .22 * bh) + 'px';
    beam.style.transform = 'rotate(' + ang + 'deg)';
    var sw = BASE * W, sh = sw * 309 / 260;
    base.style.width = sw + 'px'; base.style.left = (px - sw / 2) + 'px'; base.style.top = (py - .05 * sh) + 'px';
    var pw = PAN * W, a = ang * Math.PI / 180, dy = .64 * bh;
    [[panL, -1], [panR, 1]].forEach(function (q) {
      var dx = q[1] * .465 * bw;
      var hx = px + dx * Math.cos(a) - dy * Math.sin(a), hy = py + dx * Math.sin(a) + dy * Math.cos(a);
      q[0].style.width = pw + 'px';
      q[0].style.left = (hx - pw / 2) + 'px'; q[0].style.top = (hy - .02 * pw * 403 / 300) + 'px';
    });
  }
  window.addEventListener('resize', layout);

  /* коромысло — пружинка: перелетает и успокаивается, как настоящее */
  function settle() {
    target = Math.max(-14, Math.min(14, (rightN() - leftN()) * 3.5));
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    vel += (target - ang) * .08;
    vel *= .82;
    ang += vel;
    layout();
    if (Math.abs(vel) > .01 || Math.abs(target - ang) > .02) raf = requestAnimationFrame(step);
    else { ang = target; layout(); raf = 0; }
  }

  /* содержимое чаш: ряды по четыре снизу вверх */
  function fill(pan, n, kind, fromK) {
    [].slice.call(pan.querySelectorAll('.ms-it')).forEach(function (x) { x.remove(); });
    var rows = [4, 3, 2, 1], k = 0, r = 0;
    while (k < n) {
      var inRow = Math.min(rows[r] || 1, n - k);
      for (var i = 0; i < inRow; i++) {
        var isAdded = kind === 'weight' && k >= fromK;
        var it = M.el(isAdded ? 'button' : 'span', 'ms-it ms-it--' + kind + (isAdded ? ' added' : ''));
        if (isAdded) { it.type = 'button'; it.onclick = takeBack; }
        var img = M.el('img'); img.src = 'math/' + (kind === 'apple' ? 'apple' : 'weight') + '.webp'; img.alt = ''; img.draggable = false;
        it.appendChild(img);
        it.style.left = (50 + (i - (inRow - 1) / 2) * 21) + '%';
        it.style.bottom = (9 + r * (kind === 'apple' ? 14 : 17)) + '%';
        it.style.zIndex = 10 - r;
        pan.appendChild(it);
        k++;
      }
      r++;
    }
  }
  function drawTray() {
    tray.innerHTML = '';
    for (var i = 0; i < spare; i++) {
      var b = M.el('button', 'ms-it ms-it--weight ms-spare');
      b.type = 'button';
      var img = M.el('img'); img.src = 'math/weight.webp'; img.alt = ''; img.draggable = false;
      b.appendChild(img);
      b.style.left = (50 + (i - (spare - 1) / 2) * 11) + '%';
      b.onclick = put;
      tray.appendChild(b);
    }
  }
  function draw(pop) {
    fill(panL, leftN(), 'apple');
    fill(panR, rightN(), 'weight', cur()[0]);
    badgeL.textContent = leftN();
    badgeR.textContent = rightN();
    drawTray();
    if (pop) {
      var last = panR.querySelectorAll('.ms-it.added');
      if (last.length) last[last.length - 1].classList.add('pop');
    }
    settle();
  }

  function drawCard(done) {
    var R = ROUNDS[round], t = cur(), d = t[1] - t[0];
    var text = R.kind === 'minus' ? t[1] + ' − ' + t[0] + ' = ' + (done ? d : '?')
      : t[0] + ' + ' + (done ? d : '?') + ' = ' + t[1];
    card.innerHTML = '<b>' + text + '</b>' + (R.kind === 'minus' && done ? '<small>' + t[0] + ' + ' + d + ' = ' + t[1] + '</small>' : '');
  }

  /* ── ходы ───────────────────────────────────────────────── */
  function put() {
    if (busy || ROUNDS[round].kind === 'guess' || !spare) return;
    stopHint();
    spare--; added++;
    draw(true);
    check();
  }
  function takeBack(e) {
    if (e) e.stopPropagation();
    if (busy || ROUNDS[round].kind === 'guess' || !added) return;
    stopHint();
    spare++; added--;
    draw(false);
    check();
  }
  function check() {
    if (rightN() === leftN()) return success();
    idle(rightN() > leftN() ? 1600 : 2600);
  }

  function success() {
    busy = true;
    stopHint();
    setTimeout(function () {
      drawCard(true);
      card.classList.add('ok');
      beam.classList.add('even');
      M.sparks(stage, P.x, P.y, 14);
      [].forEach.call(panR.querySelectorAll('.added'), function (x, k) {
        setTimeout(function () { x.classList.remove('hop'); void x.offsetWidth; x.classList.add('hop'); }, k * 180);
      });
    }, 650);
    setTimeout(nextTask, 3000);
  }

  /* раунд 2: угадай — весы проверят */
  function ask() {
    var t = cur(), want = t[1] - t[0];
    cards.innerHTML = '';
    [want - 1, want, want + 1].forEach(function (o) {
      var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
      c.type = 'button';
      c.onclick = function () {
        if (busy) return;
        busy = true;
        cards.hidden = true;
        var k = 0;
        (function add() {
          if (k < o) { k++; spare--; added++; draw(true); return setTimeout(add, 380); }
          setTimeout(function () {
            if (rightN() === leftN()) { c.classList.add('ok'); return success(); }
            /* не ровно — весы покажут, куда перевесило, и гирьки вернутся */
            setTimeout(function () {
              spare += added; added = 0; draw(false);
              c.classList.add('bad');
              cards.hidden = false; busy = false;
              setTimeout(function () { c.classList.remove('bad'); }, 900);
            }, 1300);
          }, 300);
        })();
      };
      cards.appendChild(c);
    });
    cards.hidden = false;
  }

  /* ── подсказки рукой ────────────────────────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function pctOf(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return [(r.left + r.width / 2 - s.left) / s.width * 100, (r.top + r.height / 2 - s.top) / s.height * 100];
  }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy || ROUNDS[round].kind === 'guess') return;
      var el = rightN() > leftN() ? panR.querySelector('.added') : tray.firstChild;
      if (!el) return;
      var p = pctOf(el);
      hand.drag([p[0], p[1]], [p[0], p[1] + .6]);
    }, ms || 2600);
  }

  /* «смотри — повтори»: рука кладёт первую гирьку */
  function demo() {
    demoDone = true;
    busy = true;
    var p = pctOf(tray.firstChild);
    hand.drag([p[0], p[1]], [p[0], p[1] + .6], false);
    setTimeout(function () { busy = false; put(); }, 1500);
  }

  function startTask() {
    var R = ROUNDS[round], t = cur();
    busy = false; added = 0;
    spare = t[1] - t[0] + 2;
    beam.classList.remove('even');
    card.classList.remove('ok');
    cards.hidden = true;
    drawCard(false);
    draw(false);
    if (R.kind === 'guess') { tray.classList.add('dim'); return setTimeout(ask, 900); }
    tray.classList.remove('dim');
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 1200);
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
      '<h2>Сколько не хватает — вычитаем</h2><p>5 + ? = 8: не хватает трёх, и 8 − 5 = 3</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma9', 60, { nextLabel: 'В Арену →', onNext: function () { location.href = 'math-arena.html'; } });
      else location.href = 'math-arena.html';
    };
  }

  /* ?debug=1 — ходы без касаний для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__ms = {
      put: put, take: function () { takeBack(); },
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { var on = round < ROUNDS.length; return { round: round, task: task, left: on && leftN(), right: on && rightN(), added: added, spare: spare, ang: +ang.toFixed(1), busy: busy, card: card.textContent, cards: cards.hidden ? [] : [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  layout();
  startRound();
})();
