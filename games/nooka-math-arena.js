/* ============================================================
   АРЕНА — мастерская курса «Числа-друзья» (6–9 лет)

   Prodigy-слой курса: уровни учат понимать, Арена закрепляет и даёт
   причину вернуться завтра. Приходит монстрик Ням и просит ягод.

   Ребёнок касанием кладёт ягоды в корзинку и САМ решает, что хватит,
   а потом тащит корзинку к монстрику. Ровно — Ням счастлив. Мало —
   съел и пустыми кружками показал, сколько не хватило. Много — лишние
   вернул. Так Ням не принимает «жми, пока не получится»: считать надо.

   Заклинания открываются уровнями курса:
   · «Отсчитай» — всегда: одна корзинка, ровно N ягод;
   · «Две корзинки» — после «Домика для числа»: в одной уже k ягод,
     дополни вторую до N (состав числа из уровня 2);
   · «Прыжки» — после «Кузнечика»: Ням просит «3 + 2»;
   · «Убежали» — после «Зайцев»: Ням просит «7 − 3»;
   · «Близнецы» — после уровня 8: Ням просит «4 + 4».
   Ответ всегда один и тот же жест — положить ровно столько ягод, —
   меняется только вопрос. Чем новее навык, тем чаще он выпадает.

   Задачи генерируются, сложность подстраивается: три удачи подряд —
   ступень выше (больше числа, потом без подсказки точками), два
   промаха — ниже. Бой — три удачных угощения. После первой победы
   вылупляется питомец и растёт от каждой решённой задачи.
   ============================================================ */
(function () {
  var M = window.nookaMath;
  var stage = document.getElementById('stage');
  var KEY = 'nooka_arena';

  /* ступени сложности: диапазон чисел, видны ли точки в желании */
  var STEPS = [
    { lo: 2, hi: 5, dots: true },
    { lo: 4, hi: 7, dots: true },
    { lo: 5, hi: 9, dots: false },
    { lo: 6, hi: 10, dots: false },
  ];
  var PET_GROW = [0, 6, 15, 30];          // задач до следующего роста питомца

  var st = load();
  var DONE = (function () {
    try { return /[?&]all=1/.test(location.search) ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : (window.nooka ? window.nooka.getCompleted('ma') : []); }
    catch (e) { return []; }
  })();
  function done(n) { return DONE.indexOf(n) >= 0; }
  /* виды просьб: какой уровень открывает и вес (новые навыки выпадают чаще) */
  var KINDS = [
    { kind: 'count', w: 1 },
    { kind: 'two', lv: 2, w: 1.2 },
    { kind: 'plus', lv: 5, w: 1.5 },
    { kind: 'minus', lv: 6, w: 1.6 },
    { kind: 'double', lv: 8, w: 1.4 },
  ];
  function pickKind(n) {
    var open = KINDS.filter(function (k) {
      if (k.lv && !done(k.lv)) return false;
      if (k.kind === 'two' || k.kind === 'plus') return n >= 3;
      if (k.kind === 'double') return n % 2 === 0;
      if (k.kind === 'minus') return n <= 9;
      return true;
    });
    var sum = open.reduce(function (a, k) { return a + k.w; }, 0), r = Math.random() * sum;
    for (var i = 0; i < open.length; i++) { r -= open[i].w; if (r <= 0) return open[i].kind; }
    return 'count';
  }

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return s; } catch (e) {}
    return { v: 1, step: 0, streak: 0, miss: 0, wins: 0, pet: null, solved: 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ── сцена ──────────────────────────────────────────────── */
  var POS = {
    nyam: [50, 47], wish: [77, 21],
    basket: [50, 69], basket2: [[30, 69], [70, 69]],
    pile: { x0: 16, x1: 84, y0: 80, y1: 90 },
    pet: [13, 60],
  };

  var nyam = M.el('div', 'ma-nyam');
  var nyamImg = M.el('img'); nyamImg.alt = ''; nyamImg.draggable = false;
  nyam.appendChild(nyamImg);
  place(nyam, POS.nyam);
  stage.appendChild(nyam);

  var wish = M.el('div', 'ma-wish');
  place(wish, POS.wish);
  stage.appendChild(wish);

  var stars = document.getElementById('stars');
  var petBox = M.el('div', 'ma-pet');
  place(petBox, POS.pet);
  stage.appendChild(petBox);

  var hand = M.hand(stage);
  var baskets = [], berries = [], task = null, fed = 0, busy = false, idleT = null, battleHits = 0, triedWrong = false;

  function place(el, p) { el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; }
  function setNyam(kind) { nyamImg.src = 'math/nyam-' + kind + '.webp'; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* ── задача ─────────────────────────────────────────────── */
  function newTask() {
    var S = STEPS[st.step];
    var n = rnd(S.lo, S.hi);
    var kind = pickKind(n), two = kind === 'two';
    var k = two ? rnd(1, n - 2) : 0, expr = null;
    if (kind === 'plus') { var a = rnd(1, n - 1); expr = a + ' + ' + (n - a); }
    if (kind === 'minus') { var m = rnd(n + 1, Math.min(10, n + 5)); expr = m + ' − ' + (m - n); }
    if (kind === 'double') expr = (n / 2) + ' + ' + (n / 2);
    /* в примере точки-подсказки не показываем: иначе ответ виден без счёта */
    task = { n: n, two: two, k: k, dots: S.dots && !expr, expr: expr };
    fed = 0; triedWrong = false;
    build();
  }

  function build() {
    baskets.forEach(function (b) { b.el.remove(); });
    berries.forEach(function (b) { b.el.remove(); });
    baskets = []; berries = [];
    if (task.two) {
      baskets.push(makeBasket(POS.basket2[0], true));
      baskets.push(makeBasket(POS.basket2[1], false));
      for (var i = 0; i < task.k; i++) { var b = makeBerry(); b.basket = 0; }
    } else {
      baskets.push(makeBasket(POS.basket, false));
    }
    var spare = task.n - task.k + 3;                 // ягод на траве всегда больше, чем нужно
    for (var j = 0; j < spare; j++) makeBerry();
    layout();
    drawWish();
    setNyam('idle');
    busy = false;
    idle(2200);
  }

  function drawWish(missing) {
    wish.innerHTML = '';
    /* пример показываем, пока Ням ничего не съел; если не хватило — просит остаток числом */
    var b = M.el('b', task.expr && missing == null ? 'expr' : '', task.expr && missing == null ? task.expr : String(task.n));
    wish.appendChild(b);
    if (task.dots || missing != null) {
      var have = missing != null ? task.n - missing : 0;
      wish.appendChild(M.dots(have, { total: task.n, size: 8 }));
    }
  }

  /* ── корзинки и ягоды ───────────────────────────────────── */
  function makeBasket(p, locked) {
    var b = { el: M.el('div', 'ma-basket' + (locked ? ' locked' : '')), pos: p, locked: locked };
    var img = M.el('img'); img.src = 'math/basket.webp'; img.alt = ''; img.draggable = false;
    b.el.appendChild(img);
    b.cnt = M.el('span', 'ma-basket__n');
    b.el.appendChild(b.cnt);
    place(b.el, p);
    stage.appendChild(b.el);
    if (!locked) bindServe(b);
    return b;
  }

  function makeBerry() {
    var r = { el: M.el('div', 'ma-berry'), basket: -1 };
    var img = M.el('img'); img.src = 'math/berry.webp'; img.alt = ''; img.draggable = false;
    r.el.appendChild(img);
    stage.appendChild(r.el);
    r.el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (busy) return;
      var bi = baskets.length - 1;                   // своя корзинка — последняя (первая при двух — чужая)
      if (r.basket === 0 && task.two) return;        // ягоды в чужой корзинке не трогаем
      r.basket = r.basket < 0 ? bi : -1;
      stopHint();
      layout();
      idle();
    });
    berries.push(r);
    return r;
  }

  /* ягоды в корзинке — кучкой в два ряда; на траве — россыпью */
  function layout() {
    var pile = berries.filter(function (r) { return r.basket < 0; });
    var P = POS.pile;
    pile.forEach(function (r, i) {
      var cols = Math.ceil(pile.length / 2), row = i % 2, col = Math.floor(i / 2);
      var x = P.x0 + (P.x1 - P.x0) * ((col + (row ? .5 : 0) + .5) / (cols + .5));
      place(r.el, [x, row ? P.y0 : P.y1]);
      r.el.classList.remove('in');
    });
    baskets.forEach(function (b, bi) {
      var inside = berries.filter(function (r) { return r.basket === bi; });
      inside.forEach(function (r, i) {
        var row = i < 5 ? 0 : 1, col = i % 5, cnt = Math.min(5, inside.length - row * 5);
        var x = b.pos[0] + (col - (cnt - 1) / 2) * 5.2;
        place(r.el, [x, b.pos[1] - 3.5 - row * 3.2]);
        r.el.classList.add('in');
        r.el.style.zIndex = 31 + row;
      });
      /* цифра только на чужой корзинке «двух»: это часть схемы k + ? = N.
         На своей не показываем — иначе ребёнок сверит цифры и не будет считать */
      b.cnt.textContent = b.locked ? inside.length : '';
    });
  }

  /* ── угостить: тащим корзинку к Няму ────────────────────── */
  function bindServe(b) {
    var start = null, px = null, moved = false;
    b.el.addEventListener('pointerdown', function (e) {
      if (busy) return;
      e.preventDefault();
      b.el.setPointerCapture(e.pointerId);
      start = pct(e); px = [e.clientX, e.clientY]; moved = false;
      b.el.classList.add('carry');
      stopHint();
    });
    b.el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var p = pct(e), dx = e.clientX - px[0], dy = e.clientY - px[1];
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      b.el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
      carryBerries(b, dx, dy);
      nyam.classList.toggle('near', near(p));
      setNyam(near(p) ? 'open' : 'idle');
    });
    function end(e) {
      if (!start) return;
      var p = pct(e); start = null;
      b.el.classList.remove('carry');
      b.el.style.transform = '';
      carryBerries(b, 0, 0);
      nyam.classList.remove('near');
      if (moved && near(p)) serve(); else { setNyam('idle'); idle(); }
    }
    b.el.addEventListener('pointerup', end);
    b.el.addEventListener('pointercancel', end);
  }
  /* ягоды едут вместе с корзинкой (обе корзинки при «двух»: Ням получает всё) */
  function carryBerries(b, dx, dy) {
    berries.forEach(function (r) {
      if (r.basket < 0) return;
      r.el.style.transform = dx || dy ? 'translate(calc(-50% + ' + dx + 'px), calc(-80% + ' + dy + 'px))' : '';
    });
    if (task.two) baskets[0].el.style.transform = dx || dy ? 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))' : '';
  }
  function pct(e) {
    var r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100];
  }
  function near(p) { return Math.abs(p[0] - POS.nyam[0]) < 22 && p[1] > 22 && p[1] < 55; }

  function serve() {
    busy = true;
    var total = berries.filter(function (r) { return r.basket >= 0; }).length;
    var need = task.n;
    setNyam('open');
    if (total === 0) { setNyam('idle'); busy = false; return; }
    /* ягоды летят в рот по одной — считаем вместе с Нямом */
    var eat = Math.min(total, need);
    var queue = berries.filter(function (r) { return r.basket >= 0; });
    var i = 0;
    (function chomp() {
      if (i < eat) {
        var r = queue[i++];
        r.el.classList.add('eaten');
        place(r.el, [POS.nyam[0], POS.nyam[1] - 12]);
        setTimeout(function () { r.el.remove(); }, 380);
        berries.splice(berries.indexOf(r), 1);
        nyam.classList.remove('chew'); void nyam.offsetWidth; nyam.classList.add('chew');
        return setTimeout(chomp, 260);
      }
      setTimeout(function () { judge(total, need); }, 350);
    })();
  }

  function judge(total, need) {
    if (total === need) return win();
    triedWrong = true;
    if (total > need) {
      /* лишние — назад на траву: Ням съел ровно сколько хотел, но задача не засчитана как чистая */
      berries.forEach(function (r) { if (r.basket >= 0) r.basket = -1; });
      setNyam('idle');
      nyam.classList.add('full');
      setTimeout(function () { nyam.classList.remove('full'); }, 900);
      layout();
      return setTimeout(function () { next(true); }, 1200);
    }
    /* мало: съел и ждёт — пустые кружки показывают, сколько не хватило */
    task.n = need - total; task.k = 0; task.expr = null;
    if (task.two) { baskets[0].el.classList.add('gone'); }
    drawWish(task.n);
    wish.classList.remove('ask'); void wish.offsetWidth; wish.classList.add('ask');
    setNyam('idle');
    busy = false;
    idle(1800);
  }

  function win() {
    setNyam('happy');
    M.sparks(stage, POS.nyam[0], POS.nyam[1] - 10, 16);
    st.solved++;
    if (!triedWrong) { st.streak++; st.miss = 0; if (st.streak >= 3 && st.step < STEPS.length - 1) { st.step++; st.streak = 0; } }
    else { st.streak = 0; st.miss++; if (st.miss >= 2 && st.step > 0) { st.step--; st.miss = 0; } }
    if (st.pet) growPet();
    save();
    battleHits++;
    drawStars();
    setTimeout(function () { next(false); }, 1400);
  }

  function next() {   // перекорм — новая задача без звезды
    if (battleHits >= 3) return battleWon();
    newTask();
  }

  function drawStars() {
    Array.prototype.forEach.call(stars.children, function (s, i) { s.className = i < battleHits ? 'on' : ''; });
  }

  /* ── победа в бою и питомец ─────────────────────────────── */
  function battleWon() {
    busy = true;
    st.wins++; save();
    baskets.forEach(function (b) { b.el.remove(); }); berries.forEach(function (b) { b.el.remove(); });
    baskets = []; berries = [];
    wish.innerHTML = '';
    setNyam('happy');
    nyam.classList.add('leave');
    if (!st.pet) return egg();
    endCard();
  }

  function egg() {
    var e = M.el('div', 'ma-egg');
    var img = M.el('img'); img.src = 'math/egg.webp'; img.alt = ''; img.draggable = false;
    e.appendChild(img);
    place(e, [50, 70]);
    stage.appendChild(e);
    var taps = 0;
    hand.drag([50, 66], [50, 67], true);
    e.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      hand.stop();
      taps++;
      e.classList.remove('knock'); void e.offsetWidth; e.classList.add('knock');
      if (taps === 2) img.src = 'math/egg-crack.webp';
      if (taps >= 3) {
        M.sparks(stage, 50, 66, 20);
        e.remove();
        st.pet = { xp: 0, size: 0 }; save();
        drawPet(true);
        setTimeout(endCard, 1200);
      }
    });
  }

  function drawPet(born) {
    if (!st.pet) return;
    petBox.innerHTML = '';
    var img = M.el('img'); img.src = 'math/pet.webp'; img.alt = ''; img.draggable = false;
    petBox.appendChild(img);
    petBox.style.setProperty('--grow', 1 + st.pet.size * .18);
    if (born) { petBox.classList.remove('born'); void petBox.offsetWidth; petBox.classList.add('born'); }
    var bar = M.el('div', 'ma-pet__bar');
    var to = PET_GROW[st.pet.size + 1];
    bar.appendChild(M.el('i'));
    bar.firstChild.style.width = to ? Math.min(100, st.pet.xp / to * 100) + '%' : '100%';
    petBox.appendChild(bar);
  }
  function growPet() {
    st.pet.xp++;
    var to = PET_GROW[st.pet.size + 1];
    if (to && st.pet.xp >= to) { st.pet.size++; st.pet.xp = 0; drawPet(true); M.sparks(stage, POS.pet[0], POS.pet[1] - 4, 14); }
    else drawPet(false);
  }

  function endCard() {
    var c = M.el('div', 'mh__end');
    c.appendChild(M.el('h2', '', 'Ням наелся!'));
    var row = M.el('div', '');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var more = M.el('button', 'nk-btn nk-btn--cta', 'Ещё бой →');
    row.appendChild(more);
    c.appendChild(row);
    stage.appendChild(c);
    more.onclick = function () {
      c.remove();
      nyam.classList.remove('leave');
      nyam.style.filter = 'hue-rotate(' + rnd(-60, 120) + 'deg)';   // новый Ням — другого цвета
      battleHits = 0; drawStars();
      newTask();
    };
  }

  /* ── подсказка рукой ────────────────────────────────────── */
  function stopHint() { clearTimeout(idleT); hand.stop(); }
  function idle(ms) {
    stopHint();
    idleT = setTimeout(function () {
      if (busy) return;
      var mine = baskets.length - 1;
      var inBasket = berries.filter(function (r) { return r.basket === mine; }).length;
      var own = task.n - task.k;
      if (inBasket < own) {
        var r = berries.filter(function (x) { return x.basket < 0; })[0];
        if (r) hand.drag([parseFloat(r.el.style.left), parseFloat(r.el.style.top) - 3], [parseFloat(r.el.style.left), parseFloat(r.el.style.top) - 2]);
      } else {
        var b = baskets[mine];
        hand.drag([b.pos[0], b.pos[1]], [POS.nyam[0], POS.nyam[1] - 8]);
      }
    }, ms || 3000);
  }

  /* ?debug=1 — ходы без мыши для автопроверки */
  if (/[?&]debug=1/.test(location.search)) {
    window.__ma = {
      put: function (n) { var mine = baskets.length - 1; berries.filter(function (r) { return r.basket < 0; }).slice(0, n).forEach(function (r) { r.basket = mine; }); layout(); },
      serve: serve, task: function () { return task; }, state: function () { return st; }, kinds: function (n) { var c = {}; for (var i = 0; i < 400; i++) { var k = pickKind(n); c[k] = (c[k] || 0) + 1; } return c; },
    };
  }

  document.getElementById('back').onclick = function () { location.href = 'math.html'; };
  if (st.pet) drawPet(false);
  drawStars();
  newTask();
})();
