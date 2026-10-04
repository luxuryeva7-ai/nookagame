/* ============================================================
   СВЕТЛЯЧКИ — уровень 1 игры «Числа-друзья» (6–7 лет)

   «Ага»: последнее число — это сколько всего.

   На ночном лугу спят светлячки. Касание будит светлячка: он загорается,
   и рядом вспыхивает его номер — 1, 2, 3… Загоревшийся замирает, поэтому
   ребёнок видит, кого уже посчитал, и не считает дважды. Когда горят все,
   светлячки слетаются к числу наверху: столько всего — последнее число.

   Раунды: 3 (игра сама показывает первое касание) → 6 летающих →
   7 летающих. В третьем раунде посчитанные светлячки разлетаются по
   всему лугу, номера гаснут — «сколько теперь?» из трёх карточек.
   Частое заблуждение шестилеток: разлетелись шире — значит, стало
   больше (Пиаже, «сохранение числа»). Ошибка снова зажигает номера:
   последний так и остался семёркой.

   Без слов и звука. Графика — Higgsfield: светлячок и ночной луг;
   свечение светлячка — стилями (жёлтый ореол), чтобы его можно было
   включать касанием.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var FIELD = { x0: 12, x1: 88, y0: 30, y1: 78 };
  var BADGE = [50, 16];

  var ROUNDS = [
    { n: 3, fly: false },
    { n: 6, fly: true },
    { n: 7, fly: true, ask: true },
  ];

  var round = 0, bugs = [], lit = 0, busy = false, idleT = null, demoDone = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  var badge = M.el('div', 'mh__roof mff-badge');
  badge.style.left = BADGE[0] + '%'; badge.style.top = BADGE[1] + '%';
  stage.appendChild(badge);

  var cards = M.el('div', 'mf-cards');
  cards.hidden = true;
  stage.appendChild(cards);

  var neuro = M.el('img', 'mh__neuro');
  neuro.src = '../mascot/hello.webp'; neuro.alt = '';
  neuro.style.left = 'auto'; neuro.style.right = '3%';
  stage.appendChild(neuro);

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* случайные места без наложений: светлячки не должны прятаться друг за другом */
  function spots(n) {
    var out = [], tries = 0;
    while (out.length < n && tries < 2000) {
      tries++;
      var p = [rnd(FIELD.x0, FIELD.x1), rnd(FIELD.y0, FIELD.y1)];
      if (p[0] > 70 && p[1] > 66) continue;                       // угол Нейро
      if (out.every(function (q) { return Math.hypot(q[0] - p[0], (q[1] - p[1]) * 0.56) > 15; })) out.push(p);
    }
    return out;
  }

  function makeBug(p, i) {
    var b = { el: M.el('button', 'mff-bug'), lit: false, n: 0, pos: p };
    b.el.type = 'button';
    b.el.setAttribute('aria-label', 'светлячок');
    var img = M.el('img'); img.src = 'math/firefly-off.webp'; img.alt = ''; img.draggable = false;
    var wrap = M.el('span', 'mff-bug__in');
    wrap.appendChild(M.el('span', 'mff-glow'));
    wrap.appendChild(img);
    b.el.appendChild(wrap);
    b.num = M.el('b', 'mff-num');
    b.el.appendChild(b.num);
    b.el.style.left = p[0] + '%'; b.el.style.top = p[1] + '%';
    /* у каждого свой полёт: разные длительность и задержка */
    b.el.style.setProperty('--d', (3 + Math.random() * 2.5).toFixed(2) + 's');
    b.el.style.setProperty('--delay', (-Math.random() * 3).toFixed(2) + 's');
    b.el.onclick = function () { tap(b); };
    stage.appendChild(b.el);
    return b;
  }

  function tap(b) {
    if (busy || b.lit) return;
    stopHint();
    light(b);
    check();
    idle();
  }

  function light(b) {
    lit++;
    b.lit = true; b.n = lit;
    b.el.classList.add('lit');
    b.num.textContent = lit;
    b.el.classList.remove('pop'); void b.el.offsetWidth; b.el.classList.add('pop');
  }

  function check() {
    var R = ROUNDS[round];
    if (lit < R.n) return;
    busy = true;
    setTimeout(R.ask ? scatter : gather, 700);
  }

  /* раунд 3: посчитали — разлетелись по всему лугу, номера гаснут */
  function scatter() {
    var far = { x0: 11, x1: 90, y0: 28, y1: 86 }, ps = [], tries = 0;
    while (ps.length < bugs.length && tries < 3000) {
      tries++;
      var p = [rnd(far.x0, far.x1), rnd(far.y0, far.y1)];
      if (p[0] > 70 && p[1] > 66) continue;
      if (ps.every(function (q) { return Math.hypot(q[0] - p[0], (q[1] - p[1]) * 0.56) > 22; })) ps.push(p);
    }
    bugs.forEach(function (b, i) {
      var p = ps[i] || b.pos;
      b.el.classList.add('hidnum');
      setTimeout(function () { b.el.style.left = p[0] + '%'; b.el.style.top = p[1] + '%'; }, i * 60);
    });
    setTimeout(ask, bugs.length * 60 + 1100);
  }

  /* все горят — слетаются к числу наверху: столько всего */
  function gather() {
    var R = ROUNDS[round];
    bugs.forEach(function (b, i) {
      setTimeout(function () {
        b.el.classList.add('home');
        b.el.style.left = (BADGE[0] + (i - (bugs.length - 1) / 2) * 6.5) + '%';
        b.el.style.top = (BADGE[1] + 9) + '%';
      }, i * 90);
    });
    setTimeout(function () {
      badge.innerHTML = '<b>' + R.n + '</b>';
      badge.appendChild(M.dots(R.n, { total: R.n, size: 8, color: '#E8AE1F' }));
      badge.classList.add('on');
      badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');
      M.sparks(stage, BADGE[0], BADGE[1], 16);
      cheer();
    }, bugs.length * 90 + 600);
    setTimeout(nextRound, bugs.length * 90 + 3000);
  }

  /* «сколько всего?» — три карточки; верная — последнее названное число */
  function ask() {
    var R = ROUNDS[round], want = R.n;
    badge.innerHTML = '<b>?</b>';
    var opts = R.ask ? [want, want + 1, want + 3] : [want, want - 2, want + 1].filter(function (o) { return o > 0; });   // разлетелись — тянет ответить «больше»
    opts.sort(function (a, b) { return a - b; });
    cards.innerHTML = '';
    opts.forEach(function (o) {
      var c = M.el('button', 'mf-card', '<b>' + o + '</b>');
      c.type = 'button';
      c.onclick = function () {
        if (c.classList.contains('ok')) return;
        if (o === want) {
          c.classList.add('ok');
          cards.hidden = true;
          gather();
        } else {
          c.classList.add('bad');
          think();
          /* подсказка: номера снова видны — последний так и остался тем же числом */
          bugs.forEach(function (b) { b.el.classList.remove('hidnum'); });
          var last = bugs.filter(function (b) { return b.n === want; })[0];
          if (last) { last.el.classList.remove('pop'); void last.el.offsetWidth; last.el.classList.add('pop', 'hint'); }
          setTimeout(function () { c.classList.remove('bad'); if (last) last.el.classList.remove('hint'); }, 1600);
        }
      };
      cards.appendChild(c);
    });
    cards.hidden = false;
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

  /* рука показывает касание спящего светлячка */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var b = bugs.filter(function (x) { return !x.lit; })[0];
      if (!b) return;
      var r = b.el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      var x = (r.left + r.width / 2 - s.left) / s.width * 100, y = (r.top + r.height / 2 - s.top) / s.height * 100;
      hand.drag([x, y + 1], [x, y + 2]);
    }, ms || 3000);
  }

  /* «смотри — повтори»: в первом раунде игра сама будит первого */
  function demo() {
    demoDone = true;
    busy = true;
    var b = bugs[0], p = b.pos;
    hand.drag([p[0], p[1] + 1], [p[0], p[1] + 2], false);
    setTimeout(function () { light(b); }, 1500);
    setTimeout(function () { busy = false; idle(2400); }, 2600);
  }

  function startRound() {
    var R = ROUNDS[round];
    busy = false; lit = 0;
    bugs.forEach(function (b) { b.el.remove(); });
    cards.hidden = true;
    badge.classList.remove('on');
    badge.innerHTML = '<b>?</b>';
    bugs = spots(R.n).map(makeBug);
    stage.classList.toggle('mff-fly', !!R.fly);
    Array.prototype.forEach.call(steps, function (d, k) { d.className = k < round ? 'done' : (k === round ? 'on' : ''); });
    if (round === 0 && !demoDone) return setTimeout(demo, 900);
    idle(2600);
  }

  function nextRound() {
    round++;
    if (round < ROUNDS.length) return startRound();
    finish();
  }

  function finish() {
    stopHint();
    var end = M.el('div', 'mh__end',
      '<h2>Последнее число — это сколько всего</h2><p>Каждого — по одному разу. А разлетелись шире — их столько же</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma1', 50, { nextLabel: 'Дальше: Домик для числа →', onNext: function () { location.href = 'math-house.html'; } });
      else location.href = 'math-house.html';
    };
  }

  /* ?debug=1 — ходы без касаний для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__mff = {
      tapAll: function () { bugs.forEach(function (b) { tap(b); }); },
      hidden: function () { return bugs.filter(function (b) { return b.el.classList.contains('hidnum'); }).length; },
      pick: function (o) { var c = [].filter.call(cards.children, function (x) { return +x.textContent === o; })[0]; if (c) c.click(); },
      state: function () { return { round: round, lit: lit, n: ROUNDS[round] && ROUNDS[round].n, cards: [].map.call(cards.children, function (x) { return +x.textContent; }), badge: badge.textContent }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
