/* ============================================================
   БЛИЗНЕЦЫ — уровень 8 игры «Числа-друзья» (6–7 лет)

   «Ага»: 6 + 6 легко — это близнецы, а 6 + 7 — это близнецы и ещё один.

   Мастерская, на столе волшебное зеркало. Слева от него горка яблок.
   Зеркало запотело: ребёнок трёт его туда-сюда (новый жест — потереть),
   оно светлеет, и справа появляется такая же горка — близнецы. Горки
   зеркальные, поэтому пары видно без пересчёта.

   Раунды:
   1. 3 и 5: потри — появятся близнецы, пример сам допишет «3 + 3 = 6».
   2. 6 и 4: потри и выбери, сколько всего.
   3. 6 + 7: справа уже лежит семь. Зеркало показывает близнецов шести
      яблок — у шести справа есть пара, а одно остаётся без пары и светится:
      6 + 7 = 6 + 6 + 1.

   Графика — Higgsfield: мастерская, зеркало, яблоко/морковка/ягода.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var MIR = { x: 50, bottom: 87, w: 36 };          // зеркало: центр, низ подставки, ширина (% сцены)
  var PILE = { left: 17, right: 83, base: 86, iw: 8.6, row: 5 };
  var ITEMS = ['apple', 'carrot', 'berry'];

  var ROUNDS = [
    { kind: 'twin', tasks: [[3], [5]] },
    { kind: 'ask', tasks: [[6], [4]] },
    { kind: 'plus', tasks: [[6, 7], [7, 8]] },
  ];

  var round = 0, task = 0, left = [], right = [], ghosts = [], busy = false, idleT = null, hintT = null, demoDone = false;
  var shine = 0, polished = false, item = 'apple';
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  /* зеркало: картинка + запотевшее стекло поверх */
  var mirror = M.el('div', 'mm-mirror');
  mirror.style.left = MIR.x + '%'; mirror.style.top = MIR.bottom + '%'; mirror.style.width = MIR.w + '%';
  var mimg = M.el('img'); mimg.src = 'math/mirror.webp'; mimg.alt = ''; mimg.draggable = false;
  var fog = M.el('span', 'mm-fog');
  var glow = M.el('span', 'mm-glow');
  mirror.appendChild(mimg); mirror.appendChild(glow); mirror.appendChild(fog);
  stage.appendChild(mirror);

  var card = M.el('div', 'mhp-card mt-card');
  stage.appendChild(card);
  var cards = M.el('div', 'mf-cards mm-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  function cur() { return ROUNDS[round].tasks[task]; }

  /* горка: ряды по три снизу вверх; правая — зеркальная копия левой */
  var ROWS = [3, 3, 3, 3];
  function pile(n, side) {
    var rows = ROWS, out = [], k = 0, r = 0, cx = side < 0 ? PILE.left : PILE.right;
    while (k < n) {
      var inRow = Math.min(rows[r] || 1, n - k);
      for (var i = 0; i < inRow; i++) {
        var dx = (i - (inRow - 1) / 2) * PILE.iw * 1.02;
        out.push([cx + (side < 0 ? dx : -dx), PILE.base - r * PILE.row]);
        k++;
      }
      r++;
    }
    return out;
  }
  /* правая горка третьего раунда: зеркальная копия левой + лишние сверху,
     чтобы у каждого из первых яблок был близнец ровно напротив */
  function pilePlus(a, b) {
    var base = pile(a, 1), rows = 0, k = 0, rs = ROWS;
    while (k < a) { k += rs[rows] || 1; rows++; }
    for (var i = 0; i < b - a; i++) base.push([PILE.right + (i - (b - a - 1) / 2) * PILE.iw, PILE.base - rows * PILE.row]);
    return base;
  }
  function makeItem(p, cls) {
    var el = M.el('img', 'mm-item' + (cls ? ' ' + cls : ''));
    el.src = 'math/' + item + '.webp'; el.alt = ''; el.draggable = false;
    el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; el.style.width = PILE.iw + '%';
    stage.appendChild(el);
    return el;
  }

  function drawCard(done) {
    var R = ROUNDS[round], t = cur(), a = t[0], b = R.kind === 'plus' ? t[1] : t[0];
    var text = R.kind === 'twin' ? a + ' + ' + a + (done ? ' = ' + (a + a) : '')
      : a + ' + ' + b + ' = ' + (done ? a + b : '?');
    var sub = R.kind === 'plus' && polished ? '<small>' + a + ' + ' + a + ' + ' + (b - a) + '</small>' : '';
    card.innerHTML = '<b>' + text + '</b>' + sub;
  }

  /* ── жест: потереть зеркало ─────────────────────────────── */
  var last = null, dir = 0;
  mirror.addEventListener('pointerdown', function (e) {
    if (busy || polished) return;
    e.preventDefault();
    try { mirror.setPointerCapture(e.pointerId); } catch (x) {}
    last = [e.clientX, e.clientY]; dir = 0;
    stopHint();
  });
  mirror.addEventListener('pointermove', function (e) {
    if (!last || polished) return;
    var dx = e.clientX - last[0], dy = e.clientY - last[1];
    var d = Math.hypot(dx, dy);
    if (d < 2) return;
    last = [e.clientX, e.clientY];
    /* смена направления — это и есть «тереть»; без неё простое ведение пальцем засчитывается слабее */
    var nd = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 2 * Math.sign(dy);
    var w = mirror.getBoundingClientRect().width;
    rub(d / w * (nd !== dir && dir ? .6 : .35));
    dir = nd;
  });
  function up() { last = null; if (!polished && !busy) idle(1800); }
  mirror.addEventListener('pointerup', up);
  mirror.addEventListener('pointercancel', up);

  function rub(amount) {
    shine = Math.min(1, shine + amount);
    fog.style.opacity = (1 - shine).toFixed(2);
    mirror.classList.remove('wipe'); void mirror.offsetWidth; mirror.classList.add('wipe');
    if (shine >= 1) shineDone();
  }

  /* зеркало чистое — появляются близнецы */
  function shineDone() {
    polished = true;
    busy = true;
    last = null;
    stopHint();
    mirror.classList.add('lit');
    M.sparks(stage, MIR.x, MIR.bottom - 20, 14);
    var R = ROUNDS[round], t = cur(), twins = pile(t[0], 1);
    twins.forEach(function (p, k) {
      setTimeout(function () {
        if (R.kind === 'plus') {
          /* справа уже лежат: зеркало отмечает пары кружком */
          var g = M.el('span', 'mm-pair');
          g.style.left = p[0] + '%'; g.style.top = (p[1] - 2.6) + '%'; g.style.width = (PILE.iw * 1.25) + '%';
          stage.appendChild(g);
          ghosts.push(g);
          left[k].classList.add('paired');
        } else {
          var el = makeItem([MIR.x, MIR.bottom - 18], 'fly');
          right.push(el);
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; el.classList.remove('fly');
          }); });
        }
      }, 200 + k * 160);
    });
    setTimeout(function () {
      if (R.kind === 'plus') right.slice(t[0]).forEach(function (el) { el.classList.add('extra'); });
      drawCard(R.kind === 'twin');
      if (R.kind === 'twin') { card.classList.add('ok'); return setTimeout(nextTask, 2300); }
      ask();
    }, 400 + twins.length * 160);
  }

  function ask() {
    var R = ROUNDS[round], t = cur(), want = t[0] + (R.kind === 'plus' ? t[1] : t[0]);
    var opts = [want - 1, want, want + 1];
    cards.innerHTML = '';
    opts.forEach(function (o) {
      var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
      c.type = 'button';
      c.onclick = function () {
        if (c.classList.contains('ok')) return;
        if (o === want) {
          c.classList.add('ok');
          drawCard(true);
          card.classList.add('ok');
          M.sparks(stage, 50, 16, 12);
          setTimeout(function () { cards.hidden = true; nextTask(); }, 1900);
        } else {
          c.classList.add('bad');
          /* подсказка: пары подпрыгивают вместе, лишний — отдельно */
          left.forEach(function (el, k) {
            setTimeout(function () { hop(el); if (right[k]) hop(right[k]); }, k * 200);
          });
          if (R.kind === 'plus') setTimeout(function () { right.slice(t[0]).forEach(hop); }, left.length * 200 + 300);
          setTimeout(function () { c.classList.remove('bad'); }, 900);
        }
      };
      cards.appendChild(c);
    });
    cards.hidden = false;
  }

  function hop(el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }

  /* ── подсказка рукой: туда-сюда по зеркалу ─────────────── */
  function stopHint() { clearTimeout(idleT); clearTimeout(hintT); hand.stop(); }
  function scrub(times, then) {
    var y = MIR.bottom - 22, a = [MIR.x - 8, y], b = [MIR.x + 8, y + 2], k = 0;
    (function go() {
      if (k >= times) return then && then();
      hand.drag(k % 2 ? b : a, k % 2 ? a : b, false);
      k++;
      hintT = setTimeout(go, 1400);
    })();
  }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy || polished) return;
      scrub(4, function () { idle(2600); });
    }, ms || 2600);
  }

  /* «смотри — повтори»: рука трёт, зеркало чуть светлеет — дальше сам */
  function demo() {
    demoDone = true;
    busy = true;
    scrub(2);
    setTimeout(function () { rub(.18); }, 1500);
    setTimeout(function () { rub(.18); busy = false; idle(2400); }, 2900);
  }

  function clearScene() {
    left.concat(right, ghosts).forEach(function (el) { el.remove(); });
    left = []; right = []; ghosts = [];
  }

  function startTask() {
    var R = ROUNDS[round], t = cur();
    busy = false; polished = false; shine = 0;
    stopHint();
    clearScene();
    item = ITEMS[(round + task) % ITEMS.length];
    left = pile(t[0], -1).map(function (p) { return makeItem(p); });
    if (R.kind === 'plus') right = pilePlus(t[0], t[1]).map(function (p) { return makeItem(p); });
    fog.style.opacity = 1;
    mirror.classList.remove('lit');
    card.classList.remove('ok');
    cards.hidden = true;
    drawCard(false);
    if (round === 0 && task === 0 && !demoDone) return setTimeout(demo, 900);
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
      '<h2>Близнецы и ещё один</h2><p>6 + 6 — это близнецы, 12. А 6 + 7 — близнецы и ещё один: 13</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      M.finishLevel('ma8', 60);
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mm = {
      rub: function (a) { if (!busy && !polished) rub(a == null ? 1 : a); },
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { return { round: round, task: task, shine: +shine.toFixed(2), polished: polished, left: left.length, right: right.length, pairs: ghosts.length, busy: busy, card: card.textContent, cards: cards.hidden ? [] : [].map.call(cards.children, function (x) { return +x.textContent; }) }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
