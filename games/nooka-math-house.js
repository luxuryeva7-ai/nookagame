/* ============================================================
   ДОМИК ДЛЯ ЧИСЛА — уровень 2 игры «Числа-друзья» (6–7 лет)

   «Ага»: число — это домик из двух частей. 7 — это и 3 с 4, и 5 с 2.

   Ребёнок пальцем рассаживает пушиков по двум этажам. Когда все
   внутри, поверх домика рисуется схема: сверху целое, снизу две части,
   и найденный способ улетает в альбом. Потом достаточно пересадить
   одного пушика на другой этаж — и это уже новый способ.

   Раунды: 5 (три способа) → 7 (четыре способа) → 8, где трое уже спят
   наверху: пустые кружки на крыше показывают, скольких не хватает.

   Читать ничего не нужно, звука нет: жест показывает рука, число
   видно и цифрой, и точками. Графика сгенерирована (Higgsfield),
   поэтому всё интерактивное лежит поверх картинки в процентах сцены —
   координаты этажей ниже сняты с house-bg.webp.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');

  /* Где что нарисовано на фоне, в процентах сцены */
  var SCENE = {
    floors: [
      { x0: 19, x1: 73, y0: 27, y1: 45, feet: 42.3, back: 38.4, count: [10.5, 35] },   // верхний этаж
      { x0: 19, x1: 73, y0: 46, y1: 61.5, feet: 59.3, back: 55.4, count: [10.5, 53] }, // нижний
    ],
    roof: [50, 15.5],
    grass: { x0: 9, x1: 70, y0: 70, y1: 86 },
  };

  var ROUNDS = [
    { n: 5, ways: 3 },
    { n: 7, ways: 4 },
    { n: 8, sleepUp: 3, crowd: 7 },     // трое спят наверху, на траве семеро — нужно ровно пятеро
  ];

  var round = 0, pals = [], found = [], allFound = [], busy = false, idleT = null;
  var hand = M.hand(stage);

  /* ── разметка поверх сцены ───────────────────────────────── */
  var roof = M.el('div', 'mh__roof');
  stage.appendChild(roof);
  roof.style.left = SCENE.roof[0] + '%';
  roof.style.top = SCENE.roof[1] + '%';

  var floorEls = SCENE.floors.map(function (f) {
    var z = M.el('div', 'mh__floor');
    z.style.left = f.x0 + '%'; z.style.top = f.y0 + '%';
    z.style.width = (f.x1 - f.x0) + '%'; z.style.height = (f.y1 - f.y0) + '%';
    stage.appendChild(z);
    var c = M.el('div', 'mh__count');
    c.style.left = f.count[0] + '%'; c.style.top = f.count[1] + '%';
    stage.appendChild(c);
    return { zone: z, count: c };
  });

  var album = M.el('div', 'mh__album');
  stage.appendChild(album);
  var neuro = M.el('img', 'mh__neuro');
  neuro.src = '../mascot/hello.webp';
  neuro.alt = '';
  neuro.style.left = 'auto'; neuro.style.right = '3%';
  stage.appendChild(neuro);

  var steps = document.querySelectorAll('.mh__steps i');

  /* ?debug=1 — рамки этажей и доступ к посадке для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    floorEls.forEach(function (f) { f.zone.style.boxShadow = 'inset 0 0 0 2px red'; });
    window.__mh = { seat: function (i, fi) { var p = pals.filter(function (x) { return !x.sleep; })[i]; drop(p, fi); },
                    state: function () { return { round: round, found: found.slice(), counts: counts() }; } };
  }

  /* ── пушики ───────────────────────────────────────────────── */
  function makePal(i, sleep) {
    var p = { el: M.el('div', 'mh-pal' + (sleep ? ' sleep in' : '')), floor: sleep ? 0 : -1, sleep: !!sleep, home: null };
    var img = M.el('img');
    img.src = 'math/pal-' + (i % 8 + 1) + '.webp';
    img.alt = '';
    img.draggable = false;
    p.el.appendChild(img);
    stage.appendChild(p.el);
    if (!sleep) bindDrag(p);
    pals.push(p);
    return p;
  }

  function place(p, x, y) { p.el.style.left = x + '%'; p.el.style.top = y + '%'; }

  /* Раскладка на траве: неровный ряд в два яруса, как стайка */
  function layoutGrass() {
    var free = pals.filter(function (p) { return p.floor < 0; });
    var g = SCENE.grass, n = free.length;
    free.forEach(function (p, k) {
      var cols = Math.max(4, Math.ceil(n / 2));
      var row = k % 2, col = Math.floor(k / 2);
      var x = g.x0 + (g.x1 - g.x0) * ((col + (row ? .5 : 0) + .5) / (cols + .5));
      var y = row ? g.y0 + 2 : g.y1 - 2;
      p.home = [x, y];
      p.el.classList.remove('in');
      place(p, x, y);
    });
  }

  /* Раскладка на этаже: передний ряд до четырёх, остальные сзади */
  function layoutFloor(fi) {
    var f = SCENE.floors[fi];
    var who = pals.filter(function (p) { return p.floor === fi; });
    var front = who.slice(0, 4), back = who.slice(4);
    [[back, f.back], [front, f.feet]].forEach(function (row) {
      row[0].forEach(function (p, k) {
        var x = f.x0 + 4 + (f.x1 - f.x0 - 8) * ((k + .5) / Math.max(row[0].length, 3));
        p.el.classList.add('in');
        place(p, x, row[1]);
        p.el.style.zIndex = row === front ? 22 : 21;
      });
    });
  }

  function counts() {
    return [0, 1].map(function (fi) { return pals.filter(function (p) { return p.floor === fi; }).length; });
  }

  /* ── перетаскивание ─────────────────────────────────────── */
  function stagePct(e) {
    var r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100];
  }
  function floorAt(pt) {
    for (var i = 0; i < SCENE.floors.length; i++) {
      var f = SCENE.floors[i];
      if (pt[0] >= f.x0 - 3 && pt[0] <= f.x1 + 3 && pt[1] >= f.y0 - 2 && pt[1] <= f.y1 + 2) return i;
    }
    return -1;
  }

  function bindDrag(p) {
    var start = null, moved = false;
    p.el.addEventListener('pointerdown', function (e) {
      if (busy) return;
      e.preventDefault();
      p.el.setPointerCapture(e.pointerId);
      start = stagePct(e); moved = false;
      p.el.classList.add('carry');
      stopHint();
    });
    p.el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var pt = stagePct(e);
      if (Math.abs(pt[0] - start[0]) + Math.abs(pt[1] - start[1]) > 2) moved = true;
      place(p, pt[0], pt[1] + 4);
      var fi = floorAt(pt);
      floorEls.forEach(function (f, i) { f.zone.classList.toggle('hot', i === fi); });
    });
    function end(e) {
      if (!start) return;
      var pt = stagePct(e);
      start = null;
      p.el.classList.remove('carry');
      floorEls.forEach(function (f) { f.zone.classList.remove('hot'); });
      /* касание без сдвига: из дома — на траву, с травы — на свободный этаж */
      var fi = moved ? floorAt(pt) : (p.floor >= 0 ? -1 : (ROUNDS[round].sleepUp ? 1 : 0));
      drop(p, fi);
    }
    p.el.addEventListener('pointerup', end);
    p.el.addEventListener('pointercancel', end);
  }

  function drop(p, fi) {
    var R = ROUNDS[round], was = p.floor;
    var inside = counts()[0] + counts()[1] - (was >= 0 ? 1 : 0);
    if (fi >= 0 && R.sleepUp && fi === 0 && was !== 0) {
      nope(p); fi = was;                                  // наверху спят — будить нельзя
    } else if (fi >= 0 && inside >= R.n) {
      nope(p); fi = was;                                  // дом полон: больше числа не помещается
    }
    p.floor = fi;
    layoutGrass();
    layoutFloor(0); layoutFloor(1);
    if (fi >= 0 && fi !== was) hop(p);
    refresh();
    idle();
  }

  function hop(p) { p.el.classList.remove('hop'); void p.el.offsetWidth; p.el.classList.add('hop'); }
  function nope(p) {
    p.el.classList.remove('nope'); void p.el.offsetWidth; p.el.classList.add('nope');
    roof.classList.remove('pulse'); void roof.offsetWidth; roof.classList.add('pulse');
  }

  /* ── числа на крыше и у этажей ──────────────────────────── */
  function refresh() {
    var R = ROUNDS[round], c = counts(), inside = c[0] + c[1];
    roof.innerHTML = '<b>' + R.n + '</b>';
    roof.appendChild(M.dots(inside, { total: R.n, size: 8 }));
    floorEls.forEach(function (f, i) {
      var old = f.count.getAttribute('data-n');
      f.count.innerHTML = '<b>' + c[i] + '</b>';
      f.count.appendChild(M.dots(c[i], { total: Math.max(c[i], 1), size: 6, color: '#2D1B45' }));
      if (old != null && +old !== c[i]) { f.count.classList.remove('bump'); void f.count.offsetWidth; f.count.classList.add('bump'); }
      f.count.setAttribute('data-n', c[i]);
    });
    if (inside === R.n) complete(c);
  }

  /* ── дом полон: схема и альбом ──────────────────────────── */
  function complete(c) {
    var R = ROUNDS[round];
    floorEls.forEach(function (f) { f.zone.classList.remove('full'); void f.zone.offsetWidth; f.zone.classList.add('full'); });
    var key = c[0] + '+' + c[1];
    var prev = found.indexOf(key);
    if (prev >= 0) {
      var slot = album.children[prev];
      slot.classList.remove('again'); void slot.offsetWidth; slot.classList.add('again');
      pals.forEach(function (p) { if (p.floor >= 0 && !p.sleep) nope(p); });
      idle(2500);
      return;
    }
    found.push(key);
    allFound.push([R.n, c[0], c[1]]);
    M.sparks(stage, 46, 42, 16);
    cheer();
    drawBond(c, album.children[found.length - 1]);
    var need = R.sleepUp ? 1 : R.ways;
    if (found.length >= need) {
      busy = true;
      setTimeout(nextRound, 2300);
    } else idle(3500);
  }

  /* Большая схема выскакивает над травой и улетает в свою ячейку альбома:
     ребёнок видит, что маленькая схема — это то, что сейчас было в домике.
     Каждая схема летит сама по себе: быстрые пересадки её не обрывают. */
  function drawBond(c, slot) {
    var R = ROUNDS[round];
    var big = M.el('div', 'mh__big');
    big.appendChild(M.bond(R.n, c[0], c[1]));
    stage.appendChild(big);
    setTimeout(function () {
      var a = big.getBoundingClientRect(), b = slot.getBoundingClientRect();
      big.style.transition = 'transform .55s cubic-bezier(.5,0,.3,1), opacity .55s';
      big.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' +
        (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.35)';
      big.style.opacity = '.3';
      setTimeout(function () {
        big.remove();
        slot.classList.add('got'); slot.innerHTML = ''; slot.appendChild(M.bond(R.n, c[0], c[1]));
      }, 560);
    }, 900);
  }

  function cheer() {
    neuro.src = '../mascot/win.webp';
    neuro.classList.remove('cheer'); void neuro.offsetWidth; neuro.classList.add('cheer');
    clearTimeout(cheer.t);
    cheer.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1600);
  }

  /* ── подсказка рукой, если ребёнок замер ────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var R = ROUNDS[round], c = counts();
      var grass = pals.filter(function (p) { return p.floor < 0; })[0];
      if (grass && c[0] + c[1] < R.n) {
        var fi = R.sleepUp ? 1 : 0, f = SCENE.floors[fi];
        hand.drag([grass.home[0], grass.home[1] - 6], [(f.x0 + f.x1) / 2, f.feet - 6]);
      } else {
        /* все в доме, но способ уже был: пересади одного на другой этаж */
        var from = c[0] >= c[1] ? 0 : 1, one = pals.filter(function (p) { return p.floor === from && !p.sleep; })[0];
        if (!one) return;
        var to = SCENE.floors[1 - from];
        hand.drag([parseFloat(one.el.style.left), parseFloat(one.el.style.top) - 6], [(to.x0 + to.x1) / 2, to.feet - 6]);
      }
    }, ms || 2600);
  }

  /* ── раунды ─────────────────────────────────────────────── */
  function startRound() {
    var R = ROUNDS[round];
    busy = false;
    pals.forEach(function (p) { p.el.remove(); });
    pals = []; found = [];
    for (var i = 0; i < (R.sleepUp || 0); i++) makePal(i + 5, true);
    for (var j = 0; j < (R.crowd || R.n); j++) makePal(j, false);
    album.innerHTML = '';
    var slots = R.sleepUp ? 1 : R.ways;
    for (var s = 0; s < slots; s++) album.appendChild(M.el('div', 'mh-slot'));
    Array.prototype.forEach.call(steps, function (d, k) { d.className = k < round ? 'done' : (k === round ? 'on' : ''); });
    layoutGrass(); layoutFloor(0); layoutFloor(1);
    refresh();
    roof.classList.remove('pulse'); void roof.offsetWidth; roof.classList.add('pulse');
    idle(round === 0 ? 1600 : 2600);
  }

  function nextRound() {
    round++;
    if (round < ROUNDS.length) return startRound();
    finish();
  }

  function finish() {
    stopHint();
    var end = M.el('div', 'mh__end',
      '<h2>Число — домик из двух частей</h2><p>Одно число можно разложить по-разному</p>');
    var all = M.el('div', 'mh__all');
    allFound.forEach(function (b) { all.appendChild(M.bond(b[0], b[1], b[2])); });
    end.appendChild(all);
    var row = M.el('div', '', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    album.style.display = 'none';
    again.onclick = function () { end.remove(); album.style.display = ''; round = 0; allFound = []; startRound(); };
    next.onclick = function () {
      if (window.nooka) window.nooka.missionWin('ma2', 60, { nextLabel: 'В Арену →', onNext: function () { location.href = 'math-arena.html'; } });
      else location.href = 'math-arena.html';
    };
  }

  document.getElementById('back').onclick = function () { history.length > 1 ? history.back() : (location.href = '../'); };
  startRound();
})();
