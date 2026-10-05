/* ============================================================
   ЛАВКА — уровень 10 игры «Числа-друзья» (6–7 лет)

   «Ага»: одну сумму собирают разными монетами: 7 — это 5 + 2,
   а ещё 5 + 1 + 1 и 2 + 2 + 2 + 1.

   За прилавком продавец Нейро, на прилавке товар с ценником и тарелочка.
   Внизу кошелёк с монетами 1, 2, 5 и 10. Ребёнок толкает монетку вверх
   (новый жест — щелчок по монете), она едет по прилавку в тарелочку;
   у тарелочки видна сумма. Ровно — товар куплен. Переплатил — Нейро
   возвращает последнюю монету.

   Сверху цена и пустые клеточки: сколько разных способов надо найти.
   Каждый найденный способ ложится в клеточку («5 + 2»). Тот же набор
   монет второй раз не засчитывается — клеточка с ним подмигивает.

   Раунды: «Кто купит?» → 3 и 6 одним способом → 7 двумя способами → 10 тремя.
   «Кто купит?» — ставка до опыта: два кошелька, яблоко за 5. В одном одна
   монета 5, в другом три по 1 (потом — две по 2 против одной 5). Ребёнок
   касается кошелька, который купит, — потом оба пробуют заплатить.
   Частое заблуждение шестилеток: монет больше — значит денег больше.
   Графика — Higgsfield: лавка, монета (цифры — шрифтом), товары.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var DISH = [56, 69], ITEM = [27, 66], PURSE_Y = [83, 93];
  var SIZE = { 1: 14, 2: 15, 5: 16.5, 10: 18 };

  var ROUNDS = [
    { kind: 'who', tasks: [{ price: 5, A: [5], B: [1, 1, 1], item: 'apple' }, { price: 5, A: [2, 2], B: [5], item: 'carrot' }] },
    { tasks: [{ price: 3, ways: 1, purse: [1, 2, 1, 5], item: 'apple' },
              { price: 6, ways: 1, purse: [5, 2, 1, 2, 1], item: 'carrot' }] },
    { tasks: [{ price: 7, ways: 2, purse: [5, 2, 2, 1, 1, 1], item: 'basket' }] },
    { tasks: [{ price: 10, ways: 3, purse: [10, 5, 5, 2, 2, 2, 1, 1], item: 'berry' }] },
  ];

  var round = 0, task = 0, coins = [], ways = [], busy = false, idleT = null, demoDone = false;
  var hand = M.hand(stage);
  var steps = document.querySelectorAll('.mh__steps i');

  var neuro = M.el('img', 'ml-seller');
  neuro.src = '../mascot/hello.webp'; neuro.alt = '';
  stage.appendChild(neuro);

  var item = M.el('div', 'ml-item');
  var iimg = M.el('img'); iimg.alt = ''; iimg.draggable = false;
  var tag = M.el('b', 'ml-tag');
  item.appendChild(iimg); item.appendChild(tag);
  item.style.left = ITEM[0] + '%'; item.style.top = ITEM[1] + '%';
  stage.appendChild(item);

  var dish = M.el('div', 'ml-dish', '<b></b>');
  dish.style.left = DISH[0] + '%'; dish.style.top = DISH[1] + '%';
  stage.appendChild(dish);
  var dishSum = dish.querySelector('b');

  var card = M.el('div', 'mhp-card mt-card ml-card');
  stage.appendChild(card);

  function cur() { return ROUNDS[round].tasks[task]; }
  function inDish() { return coins.filter(function (c) { return c.dish; }); }
  function sum() { return inDish().reduce(function (s, c) { return s + c.v; }, 0); }
  function combo(list) {
    return list.map(function (c) { return c.v; }).sort(function (a, b) { return b - a; }).join(' + ');
  }

  /* цена и клеточки способов */
  function drawCard() {
    var t = cur(), slots = '';
    for (var i = 0; i < t.ways; i++) slots += '<i class="' + (ways[i] ? 'on' : '') + '">' + (ways[i] ? ways[i] + (ways[i].indexOf('+') > 0 ? ' = ' + t.price : '') : '') + '</i>';
    card.innerHTML = '<b><span class="ml-coin-ico"></span>' + t.price + '</b><span class="ml-slots">' + slots + '</span>';
  }

  function drawDish() {
    var s = sum();
    dishSum.textContent = s ? s : '';
    dish.classList.toggle('has', !!s);
  }

  /* монеты в кошельке: по пять в ряд, крупные слева */
  function lineUp() {
    var free = coins.filter(function (c) { return !c.dish; });
    var rows = free.length > 5 ? 2 : 1, per = Math.ceil(free.length / rows);
    free.forEach(function (c, k) {
      var r = Math.floor(k / per), inRow = Math.min(per, free.length - r * per), i = k - r * per;
      c.home = [50 + (i - (inRow - 1) / 2) * 17, PURSE_Y[rows === 1 ? 0 : r] + (rows === 1 ? 4 : 0)];
      move(c, c.home);
    });
  }
  function move(c, p) { c.el.style.left = p[0] + '%'; c.el.style.top = p[1] + '%'; }

  function makeCoin(v) {
    var c = { v: v, el: M.el('button', 'ml-coin ml-coin--' + v, '<b>' + v + '</b>'), dish: false };
    c.el.type = 'button';
    c.el.style.width = SIZE[v] + '%';
    bind(c);
    stage.appendChild(c.el);
    return c;
  }

  /* ── жест: толкнуть монету вверх ───────────────────────── */
  function bind(c) {
    var start = null, t0 = 0;
    c.el.addEventListener('pointerdown', function (e) {
      if (busy) return;
      /* Монету с тарелки можно забрать обратно касанием. Раньше она там
         застревала: положил 1 и 1 за цену 3 — в кошельке остались 2 и 5,
         любая даёт перебор, и уровень вставал (нашёл Артём, 05.10). */
      if (c.dish) {
        e.preventDefault();
        stopHint();
        back(c); drawDish(); idle(2200);
        return;
      }
      e.preventDefault();
      try { c.el.setPointerCapture(e.pointerId); } catch (x) {}
      start = [e.clientX, e.clientY]; t0 = Date.now();
      c.el.classList.add('grab');
      stopHint();
    });
    c.el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dy = Math.min(0, e.clientY - start[1]);
      c.el.style.transform = 'translate(-50%,-50%) translateY(' + Math.max(dy, -40) + 'px)';
    });
    function up(e) {
      if (!start) return;
      var dy = e.clientY - start[1], dt = Date.now() - t0;
      start = null;
      c.el.classList.remove('grab');
      c.el.style.transform = '';
      if (dy < -24 || (dy < -10 && dt < 180)) pay(c);
      else { c.el.classList.remove('nope'); void c.el.offsetWidth; c.el.classList.add('nope'); idle(700); }
    }
    c.el.addEventListener('pointerup', up);
    c.el.addEventListener('pointercancel', function () { start = null; c.el.classList.remove('grab'); c.el.style.transform = ''; });
  }

  function pay(c) {
    if (busy || c.dish) return;
    c.dish = true;
    var n = inDish().length;
    move(c, [DISH[0] + ((n * 37) % 19 - 9), DISH[1] - 1 + ((n * 23) % 5 - 2)]);
    c.el.classList.add('in');
    lineUp();
    setTimeout(function () { drawDish(); check(c); }, 420);
  }

  /* можно ли оставшимися монетами добрать ровно need */
  function reachable(need) {
    var can = { 0: true };
    coins.filter(function (c) { return !c.dish; }).forEach(function (c) {
      Object.keys(can).map(Number).sort(function (a, b) { return b - a; }).forEach(function (k) {
        if (k + c.v <= need) can[k + c.v] = true;
      });
    });
    return !!can[need];
  }

  function check(last) {
    var t = cur(), s = sum();
    if (s < t.price && !reachable(t.price - s)) {
      /* тупик: ровно уже не набрать — продавец задумывается и возвращает всё */
      busy = true;
      face('think');
      dish.classList.remove('shake'); void dish.offsetWidth; dish.classList.add('shake');
      return setTimeout(function () { inDish().forEach(back); busy = false; drawDish(); idle(2200); }, 1100);
    }
    if (s < t.price) return idle(2600);
    busy = true;
    if (s > t.price) {
      /* переплатил: продавец возвращает последнюю монету */
      face('think');
      dish.classList.remove('shake'); void dish.offsetWidth; dish.classList.add('shake');
      return setTimeout(function () { back(last); busy = false; drawDish(); idle(2200); }, 700);
    }
    var cb = combo(inDish());
    if (ways.indexOf(cb) >= 0) {
      /* так уже платили: клеточка с этим способом подмигивает, монеты обратно */
      face('think');
      var slot = card.querySelectorAll('.ml-slots i')[ways.indexOf(cb)];
      if (slot) { slot.classList.remove('wink'); void slot.offsetWidth; slot.classList.add('wink'); }
      return setTimeout(function () { inDish().forEach(back); busy = false; drawDish(); idle(2200); }, 1100);
    }
    ways.push(cb);
    drawCard();
    face('win');
    item.classList.remove('sold'); void item.offsetWidth; item.classList.add('sold');
    M.sparks(stage, DISH[0], DISH[1], 12);
    if (ways.length >= t.ways) {
      card.classList.add('ok');
      return setTimeout(nextTask, 2600);
    }
    /* следующий покупатель: монеты снова в кошельке, товар снова на прилавке */
    setTimeout(function () {
      inDish().forEach(back);
      drawDish();
      item.classList.remove('sold');
      busy = false;
      face('hello');
      idle(2000);
    }, 1700);
  }

  function back(c) {
    c.dish = false;
    c.el.classList.remove('in');
    lineUp();
  }

  function face(f) {
    neuro.src = '../mascot/' + f + '.webp';
    if (f === 'win') { neuro.classList.remove('cheer'); void neuro.offsetWidth; neuro.classList.add('cheer'); }
    clearTimeout(face.t);
    if (f !== 'hello') face.t = setTimeout(function () { neuro.src = '../mascot/hello.webp'; }, 1500);
  }

  /* ── подсказка рукой: монету — вверх, в тарелочку ──────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var t = cur(), s = sum();
      /* показываем монету, которая не переплатит */
      var c = coins.filter(function (x) { return !x.dish && s + x.v <= t.price; })[0] || coins.filter(function (x) { return !x.dish; })[0];
      if (!c) return;
      hand.drag([c.home[0], c.home[1] + 1], [c.home[0] + 2, DISH[1] + 2]);
    }, ms || 2600);
  }

  /* «смотри — повтори»: рука толкает первую монету */
  function demo() {
    demoDone = true;
    busy = true;
    var c = coins.filter(function (x) { return x.v === 1; })[0];
    hand.drag([c.home[0], c.home[1] + 1], [c.home[0] + 2, DISH[1] + 2], false);
    setTimeout(function () { busy = false; pay(c); }, 1400);
  }

  /* ── «Кто купит?»: два кошелька, ставка касанием ─────────── */
  var purses = [];
  function clearPurses() { purses.forEach(function (p) { p.box.remove(); p.coins.forEach(function (c) { c.el.remove(); }); if (p.mark) p.mark.remove(); }); purses = []; }
  function setupWho(t) {
    clearPurses();
    [[t.A, 27], [t.B, 73]].forEach(function (q, side) {
      var box = M.el('button', 'ml-purse'); box.type = 'button';
      box.style.left = q[1] + '%'; box.style.top = PURSE_Y[0] + '%';
      stage.appendChild(box);
      var P = { side: side, x: q[1], box: box, coins: [] };
      q[0].forEach(function (v, i) {
        var c = { v: v, el: M.el('div', 'ml-coin ml-coin--' + v, '<b>' + v + '</b>') };
        c.el.style.width = SIZE[v] + '%';
        c.home = [q[1] + (i - (q[0].length - 1) / 2) * 12, PURSE_Y[0]];
        move(c, c.home); c.el.style.pointerEvents = 'none';
        stage.appendChild(c.el); P.coins.push(c);
      });
      box.onclick = function () { bet(side); };
      purses.push(P);
    });
    card.innerHTML = '<b><span class="ml-coin-ico"></span>' + t.price + '</b><span class="ml-who">кто купит?</span>';
  }
  function bet(side) {
    if (busy) return;
    busy = true; stopHint();
    var t = cur(), sums = purses.map(function (p) { return p.coins.reduce(function (s, c) { return s + c.v; }, 0); });
    var okSide = sums[0] >= t.price ? 0 : 1;
    purses[side].box.classList.add('chosen');
    /* сначала платит выбранный кошелёк, потом второй */
    function tryPay(p, next) {
      p.coins.forEach(function (c, k) { setTimeout(function () { move(c, [DISH[0] + (k - (p.coins.length - 1) / 2) * 7, DISH[1]]); }, k * 160); });
      setTimeout(function () {
        var s = sums[p.side];
        dishSum.textContent = s; dish.classList.add('has');
        var ok = s >= t.price;
        p.mark = M.el('b', 'ml-mark ' + (ok ? 'ok' : 'no'), ok ? '✓' : '✗');
        p.mark.style.left = p.x + '%'; p.mark.style.top = (PURSE_Y[0] - 9) + '%';
        stage.appendChild(p.mark);
        if (ok) { item.classList.remove('sold'); void item.offsetWidth; item.classList.add('sold'); M.sparks(stage, DISH[0], DISH[1], 10); }
        else { dish.classList.remove('shake'); void dish.offsetWidth; dish.classList.add('shake'); }
        setTimeout(function () {
          p.coins.forEach(function (c) { move(c, c.home); });
          dishSum.textContent = ''; dish.classList.remove('has'); item.classList.remove('sold');
          setTimeout(next, 400);
        }, 1100);
      }, p.coins.length * 160 + 500);
    }
    tryPay(purses[side], function () {
      tryPay(purses[1 - side], function () {
        /* итог: сколько денег в каждом кошельке — не сколько монет */
        card.innerHTML = '<b>' + sums[0] + ' ' + (sums[0] > sums[1] ? '&gt;' : '&lt;') + ' ' + sums[1] + '</b><span class="ml-who">' + (side === okSide ? 'угадано!' : 'монет больше — а денег меньше') + '</span>';
        card.classList.add('ok');
        face(side === okSide ? 'win' : 'think');
        setTimeout(nextTask, 2300);
      });
    });
  }

  function startTask() {
    var t = cur();
    busy = false; ways = [];
    stopHint();
    clearPurses();
    coins.forEach(function (c) { c.el.remove(); });
    if (ROUNDS[round].kind === 'who') {
      coins = [];
      iimg.src = 'math/' + t.item + '.webp'; tag.textContent = t.price;
      item.classList.remove('sold'); card.classList.remove('ok'); face('hello'); drawDish();
      setupWho(t);
      idleT = setTimeout(function () { if (!busy) { var p = purses[0]; hand.drag([p.x, PURSE_Y[0] + 1], [p.x, PURSE_Y[0] + 2]); } }, 2600);
      return;
    }
    coins = t.purse.slice().sort(function (a, b) { return b - a; }).map(makeCoin);
    lineUp();
    iimg.src = 'math/' + t.item + '.webp';
    tag.textContent = t.price;
    item.classList.remove('sold');
    card.classList.remove('ok');
    face('hello');
    drawCard();
    drawDish();
    if (!demoDone) return setTimeout(demo, 1100);     // «смотри — повтори» — в первом раунде с монетами
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
      '<h2>Одну сумму собирают по-разному</h2><p>10 — это одна монета 10, или 5 + 5, или 5 + 2 + 2 + 1</p>');
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var again = M.el('button', 'nk-btn nk-btn--soft', 'Ещё раз');
    var next = M.el('button', 'nk-btn nk-btn--cta', 'Дальше →');
    row.appendChild(again); row.appendChild(next);
    end.appendChild(row);
    stage.appendChild(end);
    again.onclick = function () { end.remove(); round = 0; startRound(); };
    next.onclick = function () {
      M.finishLevel('ma10', 60);
    };
  }

  /* ?debug=1 — ходы без жестов для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__ml = {
      pay: function (v) { var c = coins.filter(function (x) { return !x.dish && x.v === v; })[0]; if (c) pay(c); },
      bet: function (side) { bet(side); },
      state: function () { var on = round < ROUNDS.length; return { round: round, task: task, kind: on && (ROUNDS[round].kind || 'pay'), price: on && cur().price, sum: sum(), ways: ways.slice(), busy: busy, purse: coins.filter(function (c) { return !c.dish; }).map(function (c) { return c.v; }), card: card.textContent }; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  startRound();
})();
