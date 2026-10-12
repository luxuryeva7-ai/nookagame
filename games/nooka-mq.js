/* ============================================================
   АРИФМАГИЯ — математическая RPG мира Nooka. 1–8 класс.

   ЛОР
   ----------------------------------------------------------
   Счётные Земли. Когда-то здесь ничего нельзя было различить:
   ни сколько в доме окон, ни сколько в году времён. Первые
   счетомаги дали вещам числа — и мир стал твёрдым. Все числа
   записаны в Великом Счёте, живой книге под Палатой Счёта в
   сердце Числограда. Пока число записано — вещь стоит.

   Безмер был первым счетомагом. Он считал дольше всех и устал.
   Решил, что без чисел спокойнее: не надо помнить, не надо
   сверять, не надо отвечать. И начал стирать числа из Великого
   Счёта. Что стёрто — то расплывается: сперва цифра, потом сама
   вещь. Мост через Делимую реку уже поплыл, часы на башне встали.

   Кляксы — то, что осталось от стёртых чисел. Они не злые, они
   растерянные: забыли, чем были. Назовёшь их число — клякса
   вспоминает себя и идёт с тобой. Поэтому врагов тут не
   добивают, а возвращают.

   МЕХАНИКА (как в образце, но своя)
   ----------------------------------------------------------
   Стихия магии = арифметическое действие:
     Рост   +  копит — один крупный удар
     Убыль  −  отнимает врагу и возвращает тебе
     Вихрь  ×  бьёт столько раз, сколько второй множитель
     Раскол ÷  делит удар поровну на всех врагов
     Доля   ½  срезает долю здоровья            (5 класс)
     Тайна  x  находит неизвестное — бьёт вдвое  (7 класс)

   ПОЧЕМУ УРОН НЕ РАВЕН ОТВЕТУ (не возвращать обратно).
   Сперва урон был равен ответу — красиво, но ломало игру: в 3
   классе «44 + 33» сносило 154 при 26 HP врага, а деление давало
   3. Ребёнок за два боя понимает, что Рост всегда сильнее, и
   бросает деление — то есть перестаёт тренировать то, ради чего
   всё затевалось. Урон задаёт заклинание, ответ решает, сработает
   ли оно, и задаёт форму удара там, где это наглядно.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'nooka_mq_v2';
  var ART = 'mq/';
  var $  = function (id) { return document.getElementById(id); };

  /* ========================================================
     1. СТИХИИ
     ======================================================== */
  var ELEM = {
    add:  { sign: '+', name: 'Рост',   dat: 'Росту',   how: 'один крупный удар',               grade: 1, mode: 'single', pow: 11 },
    sub:  { sign: '−', name: 'Убыль',  dat: 'Убыли',   how: 'отнимает врагу, вернёт тебе',     grade: 1, mode: 'heal',   pow: 7  },
    mul:  { sign: '×', name: 'Вихрь',  dat: 'Вихрю',   how: 'ударов столько, сколько множишь', grade: 2, mode: 'multi',  pow: 4  },
    div:  { sign: '÷', name: 'Раскол', dat: 'Расколу', how: 'делит удар на всех врагов',       grade: 3, mode: 'all',    pow: 9  },
    frac: { sign: '½', name: 'Доля',   dat: 'Доле',    how: 'срезает долю здоровья',           grade: 5, mode: 'part',   pow: 0  },
    eq:   { sign: 'x', name: 'Тайна',  dat: 'Тайне',   how: 'находит слабое место — вдвое',    grade: 7, mode: 'crit',   pow: 18 }
  };
  var ORDER = ['add', 'sub', 'mul', 'div', 'frac', 'eq'];

  /* ========================================================
     2. ГЕРОИ — шесть учеников Палаты
     ======================================================== */
  var HEROES = [
    { id: 1, art: 'hero_1.webp', name: 'Фиалка',  tint: '#9B6BE0', about: 'посох со звездой' },
    { id: 2, art: 'hero_2.webp', name: 'Мята',    tint: '#3FBF8A', about: 'посох с шаром' },
    { id: 3, art: 'hero_3.webp', name: 'Янтарь',  tint: '#E08A2E', about: 'посох с кристаллом' },
    { id: 4, art: 'hero_4.webp', name: 'Небо',    tint: '#3E9FD6', about: 'посох с листом' },
    { id: 5, art: 'hero_5.webp', name: 'Солнце',  tint: '#E0B32E', about: 'посох с солнцем' },
    { id: 6, art: 'hero_6.webp', name: 'Заря',    tint: '#D64F8A', about: 'посох с самоцветом' }
  ];

  /* ========================================================
     3. ВРАГИ — кляксы, то что осталось от стёртых чисел
     ======================================================== */
  var FOES = {
    blot:  { name: 'Клякса',     art: 'foe_blot.webp', hp: 26, pow: 4, weak: 'add',
             was: 'была числом окон в доме' },
    mix:   { name: 'Путаник',    art: 'foe_mix.webp',  hp: 34, pow: 5, weak: 'sub',
             was: 'был ценой на вывеске' },
    zero:  { name: 'Нулик',      art: 'foe_zero.webp', hp: 38, pow: 5, weak: 'mul',
             was: 'был счётом пустых корзин' },
    half:  { name: 'Половинник', art: 'foe_half.webp', hp: 46, pow: 6, weak: 'div',
             was: 'был числом пролётов моста' },
    bezmer:{ name: 'Безмер',     art: 'boss.webp',     hp: 100, pow: 7, weak: 'top', boss: true,
             was: 'был первым счетомагом' }
  };

  /* ========================================================
     4. ЧИСЛОГРАД — город-хаб и земли вокруг
     ======================================================== */
  var TOWN = {
    bg: 'town.webp',
    spots: [
      { id: 'palata', x: 61, y: 30, label: 'Палата Счёта',  hint: 'учиться' },
      { id: 'clock',  x: 90, y: 36, label: 'Башня часов',   hint: 'дневник' },
      { id: 'market', x: 14, y: 56, label: 'Рынок',         hint: 'заказ' },
      { id: 'gate',   x: 45, y: 86, label: 'Ворота',        hint: 'в земли' }
    ]
  };

  var LANDS = [
    { id: 'academy', name: 'Двор Палаты',      bg: 'loc_academy.webp',
      sub: 'Здесь учат держать число.',
      who: 'Наставница Бусина',
      say: 'Правило у нас одно: <b>заклинание слушается того, кто назовёт верное число</b>. Назвал — посох выстрелил. Ошибся — ход ушёл, но тебя за это никто не ударит. Попробуй на кляксе: она не злая, она просто забыла, чем была.',
      fights: [
        { label: 'Учебная клякса', sub: 'первый бой, тут не страшно', foes: ['blot'] }
      ] },
    { id: 'market', name: 'Торговый ряд',      bg: 'loc_market.webp',
      sub: 'Цены стёрты, торговля встала.',
      who: 'Торговец Семик',
      say: 'Безмер стёр цены на половине лавок — люди ходят и не знают, сколько платить. А у прилавка топчется <b>Путаник</b>: он был ценой на вывеске, а теперь путает числа местами. Верни ему число, и он успокоится.',
      fights: [
        { label: 'Путаник у прилавка', sub: 'слаб к Убыли', foes: ['mix'] },
        { label: 'Два Нулика на складе', sub: 'их двое — пригодится Раскол', foes: ['zero', 'zero'] }
      ] },
    { id: 'bridge', name: 'Делимая река',      bg: 'loc_bridge.webp',
      sub: 'Мост поплыл: стёрли число пролётов.',
      who: 'Нейро',
      say: 'Мост был <b>на двенадцать пролётов, по четыре на опору</b>. Это число стёрли — и мост расплылся. Под ним сидит Половинник: он и есть то самое число, только забывшее себя. Против него нужен <b>Раскол</b>.',
      fights: [
        { label: 'Половинник под мостом', sub: 'слаб к Расколу', foes: ['half', 'blot'] }
      ] },
    { id: 'grove', name: 'Умножальная роща',   bg: 'loc_grove.webp',
      sub: 'Деревья множатся и уже не помнят, сколько их.',
      who: 'Нейро',
      say: 'Было четыре дерева, стало четыре по шесть, а теперь никто не скажет сколько. Когда число потеряно, роща растёт без счёта. Тут силён <b>Вихрь</b> — он бьёт столько раз, сколько скажет твой ответ.',
      fights: [
        { label: 'Нулик в чаще', sub: 'слаб к Вихрю', foes: ['zero'] },
        { label: 'Нулик и Клякса', sub: 'вдвоём', foes: ['zero', 'blot'] }
      ] },
    { id: 'tower', name: 'Башня Безмера',      bg: 'loc_tower.webp',
      sub: 'Отсюда стирают числа.',
      who: 'Безмер',
      say: 'Ещё один с посохом. Я считал дольше всех вас вместе взятых и устал. Без чисел спокойнее: не надо помнить, не надо сверять, не надо отвечать. Я стёр мост — и никто по нему больше не бегает. Сотру и тебя... если не назовёшь <b>моё число</b>.',
      fights: [
        { label: 'Безмер', sub: 'он прячет число за тем, что ты уже умеешь', foes: ['bezmer'] }
      ] }
  ];

  /* ========================================================
     5. ЗАДАЧИ — генератор по классу 1–8
     ======================================================== */
  function ri(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mk(q, sub, answer) { return { q: q, sub: sub, answer: answer }; }

  var TASK = {
    add: function (g) {
      var a, b;
      if (g <= 1) { a = ri(2, 6); b = ri(2, 10 - a); }
      else if (g === 2) { a = ri(4, 12); b = ri(3, 9); }
      else if (g <= 4) { a = ri(14, 48); b = ri(12, 44); }
      else if (g <= 6) {
        if (Math.random() < .5) { a = ri(-14, -2); b = ri(8, 30); return mk(a + ' + ' + b, 'сложи с отрицательным', a + b); }
        a = ri(40, 180); b = ri(30, 160);
      } else { a = ri(120, 480); b = ri(80, 360); }
      return mk(a + ' + ' + b, null, a + b);
    },
    sub: function (g) {
      var a, b;
      if (g <= 1) { a = ri(4, 10); b = ri(1, a - 2); }
      else if (g === 2) { a = ri(10, 20); b = ri(2, 9); }
      else if (g <= 4) { a = ri(40, 95); b = ri(11, 38); }
      else if (g <= 6) { a = ri(60, 200); b = ri(20, 120); }
      else { a = ri(200, 700); b = ri(60, 300); }
      return mk(a + ' − ' + b, null, a - b);
    },
    mul: function (g) {
      var a, b;
      if (g <= 2) { a = ri(2, 3); b = ri(2, 6); }
      else if (g === 3) { a = ri(2, 7); b = ri(2, 9); }
      else if (g === 4) { a = ri(3, 9); b = ri(4, 9); }
      else if (g <= 6) { a = ri(6, 14); b = ri(3, 9); }
      else { a = ri(11, 25); b = ri(4, 12); }
      return mk(a + ' × ' + b, 'Вихрь ударит ' + b + ' раз', a * b);
    },
    div: function (g) {
      var b, r;
      if (g <= 2) { b = ri(2, 3); r = ri(2, 5); }
      else if (g === 3) { b = ri(2, 6); r = ri(2, 9); }
      else if (g === 4) { b = ri(3, 9); r = ri(4, 12); }
      else if (g <= 6) { b = ri(4, 12); r = ri(5, 16); }
      else { b = ri(6, 16); r = ri(8, 30); }
      return mk((b * r) + ' ÷ ' + b, 'Раскол поделит удар поровну', r);
    },
    frac: function (g) {
      if (g <= 6) {
        var d = pick([2, 3, 4, 5, 10]), n = ri(1, d - 1), whole = d * ri(3, 14);
        return mk(n + '/' + d + ' от ' + whole, 'сколько это?', whole / d * n);
      }
      var p = pick([10, 20, 25, 50, 75]), w = pick([40, 60, 80, 120, 200, 240]);
      return mk(p + '% от ' + w, 'сколько это?', Math.round(w * p / 100));
    },
    eq: function (g) {
      var x, a, b;
      if (g <= 6) { x = ri(2, 12); a = ri(2, 9); b = ri(1, 20); return mk(a + 'x + ' + b + ' = ' + (a * x + b), 'чему равен x?', x); }
      if (g === 7) { x = ri(3, 16); a = ri(2, 12); b = ri(2, 30); return mk(a + 'x − ' + b + ' = ' + (a * x - b), 'чему равен x?', x); }
      x = ri(4, 20); a = ri(3, 11); b = ri(2, 9);
      return mk('(x + ' + b + ') × ' + a + ' = ' + ((x + b) * a), 'чему равен x?', x);
    }
  };

  function options(ans) {
    var out = [ans], guard = 0;
    var span = Math.max(2, Math.round(Math.abs(ans) * .25));
    while (out.length < 4 && guard++ < 60) {
      var v = ans + ri(1, span) * (Math.random() < .5 ? -1 : 1);
      if (v === ans || (ans >= 0 && v < 0)) continue;
      if (out.indexOf(v) < 0) out.push(v);
    }
    while (out.length < 4) out.push(ans + out.length * 2 + 1);
    for (var i = out.length - 1; i > 0; i--) { var j = ri(0, i), t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }

  /* ========================================================
     6. СОСТОЯНИЕ
     ======================================================== */
  function fresh() {
    return { made: false, grade: 0, hero: 1, name: '',
             lv: 1, xp: 0, done: {}, pets: [], solved: 0, wrong: 0, seen: {} };
  }
  var S = (function () {
    try { var r = JSON.parse(localStorage.getItem(KEY)); return r && r.hero ? r : fresh(); }
    catch (e) { return fresh(); }
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function hero() { return HEROES[(S.hero - 1) % HEROES.length]; }
  function openElems() { return ORDER.filter(function (k) { return ELEM[k].grade <= Math.max(1, S.grade); }); }
  function spellPow(k) { return Math.max(1, Math.round(ELEM[k].pow * (1 + (S.lv - 1) * 0.3))); }
  function needXP(lv) { return 40 + (lv - 1) * 35; }
  function hpMax() { return 40 + (S.lv - 1) * 12; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    return b === 1 ? one : many;
  }

  /* ========================================================
     7. ЭКРАНЫ
     ======================================================== */
  var SCREENS = ['intro', 'hero', 'grade', 'town', 'land', 'fight', 'win'];
  function show(name) {
    SCREENS.forEach(function (n) { var el = $('sc-' + n); if (el) el.hidden = (n !== name); });
    window.scrollTo(0, 0);
    if (name === 'town') drawTown();
  }
  function curScreen() {
    var s = SCREENS.filter(function (n) { var e = $('sc-' + n); return e && !e.hidden; });
    return s[0] || '?';
  }

  /* ---------- заставка ---------- */
  $('go-start').addEventListener('click', function () { show(S.made ? 'town' : 'hero'); });
  $('go-reset').addEventListener('click', function () {
    S = fresh(); save(); $('go-reset').hidden = true;
    $('go-start').textContent = 'Начать'; drawHeroes(); show('hero');
  });
  if (S.made) { $('go-start').textContent = 'Продолжить'; $('go-reset').hidden = false; }
  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-back')); });
  });

  /* ---------- выбор героя ---------- */
  function drawHeroes() {
    var box = $('heroes');
    box.innerHTML = '';
    HEROES.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-pick' + (S.hero === h.id ? ' mq-pick--on' : '');
      b.innerHTML =
        '<span class="mq-pick__art" style="--tint:' + h.tint + '"><img src="' + ART + h.art + '" alt="" loading="lazy"></span>' +
        '<span class="mq-pick__name">' + h.name + '</span>' +
        '<span class="mq-pick__sub">' + h.about + '</span>';
      b.addEventListener('click', function () {
        S.hero = h.id; save();
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove('mq-pick--on'); });
        b.classList.add('mq-pick--on');
        if (!S.name) $('hero-name').value = h.name;
      });
      box.appendChild(b);
    });
  }
  drawHeroes();
  $('hero-name').value = S.name || '';
  $('hero-name').addEventListener('input', function () { S.name = this.value.trim(); save(); });
  $('hero-done').addEventListener('click', function () {
    if (!S.name) S.name = hero().name;
    save(); show('grade');
  });

  /* ---------- класс ---------- */
  var GRADE_HINT = {
    1: 'Счёт и сложение до десяти', 2: 'До двадцати, первая таблица',
    3: 'Таблица умножения и деление', 4: 'Большие числа, деление',
    5: 'Дроби и порядок действий', 6: 'Проценты, отрицательные',
    7: 'Уравнения с неизвестным', 8: 'Уравнения посложнее'
  };
  (function () {
    var box = $('grades');
    for (var g = 1; g <= 8; g++) (function (g) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mq-grade';
      b.setAttribute('aria-pressed', S.grade === g ? 'true' : 'false');
      b.innerHTML = '<b>' + g + ' класс</b><span>' + GRADE_HINT[g] + '</span>';
      b.addEventListener('click', function () {
        S.grade = g; S.made = true; save();
        Array.prototype.forEach.call(box.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        setTimeout(function () { show('town'); }, 150);
      });
      box.appendChild(b);
    })(g);
  })();

  /* ========================================================
     8. ЧИСЛОГРАД
     ======================================================== */
  function landOpen(i) {
    if (i === 0) return true;
    var prev = LANDS[i - 1];
    return prev.fights.some(function (_, fi) { return S.done[(i - 1) + ':' + fi]; });
  }
  function landDone(i) {
    return LANDS[i].fights.every(function (_, fi) { return S.done[i + ':' + fi]; });
  }

  function drawTown() {
    var h = hero();
    $('town-me').innerHTML =
      '<span class="mq-me__art" style="--tint:' + h.tint + '"><img src="' + ART + h.art + '" alt=""></span>' +
      '<span class="mq-me__txt"><span class="mq-me__name">' + esc(S.name || h.name) + '</span>' +
      '<span class="mq-me__lv">' + S.lv + ' уровень · ' + S.grade + ' класс · вернул чисел: ' + S.solved + '</span></span>';

    var box = $('town-spots');
    box.innerHTML = '<div class="mq-town__inner" id="town-inner"></div>';
    box = $('town-inner');
    TOWN.spots.forEach(function (sp) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-pin mq-pin--' + sp.id;
      b.style.left = sp.x + '%'; b.style.top = sp.y + '%';
      b.innerHTML = '<span class="mq-pin__dot"></span><span class="mq-pin__lbl">' + sp.label + '<small>' + sp.hint + '</small></span>';
      b.addEventListener('click', function () { townSpot(sp.id); });
      box.appendChild(b);
    });

    var nxt = -1;
    for (var i = 0; i < LANDS.length; i++) if (landOpen(i) && !landDone(i)) { nxt = i; break; }
    $('town-say').innerHTML = nxt < 0
      ? '<span class="mq-speech__who">Нейро</span>Все числа на месте. Великий Счёт полон, Безмер отступил. Можешь проходить земли заново — задачи каждый раз новые.'
      : '<span class="mq-speech__who">Нейро</span>' + (S.solved === 0
        ? 'Это Числоград, и он стоит на числах. Пока число записано в Великом Счёте — вещь стоит. Безмер их стирает. Нам в <b>Палату Счёта</b>: тебе дадут посох.'
        : 'Дальше нас ждёт <b>' + LANDS[nxt].name + '</b>. Выходи через ворота.');
  }

  function townSpot(id) {
    if (id === 'gate') { drawLands(); show('land'); $('land-list').hidden = false; $('land-place').hidden = true; return; }
    if (id === 'palata') { openSheet(); return; }
    if (id === 'market') {
      var i = 1;
      if (!landOpen(i)) { say('Торговец Семик', 'Погоди, счетомаг. Сперва научись в Палате держать число — потом поговорим о заказах.'); return; }
      openLand(i); return;
    }
    if (id === 'clock') {
      var total = LANDS.reduce(function (a, l) { return a + l.fights.length; }, 0);
      var done = Object.keys(S.done).length;
      say('Часовщик Тик',
        'Часы встали, когда стёрли число часов в сутках. Пока ты вернул <b>' + S.solved + '</b> ' +
        plural(S.solved, 'число', 'числа', 'чисел') + ', и закрыл <b>' + done + '</b> из <b>' + total + '</b> мест. ' +
        (S.pets.length ? 'С тобой идут: <b>' + S.pets.join(', ') + '</b>.' : 'Ни одна клякса пока не вспомнила себя — верни ей число в бою, и она пойдёт с тобой.'));
    }
  }
  function say(who, text) {
    $('town-say').innerHTML = '<span class="mq-speech__who">' + who + '</span>' + text;
  }

  /* ========================================================
     9. ЗЕМЛИ
     ======================================================== */
  var curLand = 0;

  function drawLands() {
    var box = $('lands');
    box.innerHTML = '';
    LANDS.forEach(function (l, i) {
      var open = landOpen(i), fin = landDone(i);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-land' + (open ? (fin ? ' mq-land--done' : '') : ' mq-land--locked');
      b.innerHTML =
        '<span class="mq-land__pic" style="background-image:url(' + ART + l.bg + ')"></span>' +
        '<span class="mq-land__txt"><span class="mq-land__name">' + l.name + '</span>' +
        '<span class="mq-land__sub">' + l.sub + '</span>' +
        '<span class="mq-land__tag">' + (!open ? 'закрыто' : fin ? 'числа возвращены' : 'идти сюда') + '</span></span>';
      if (open) b.addEventListener('click', function () { openLand(i); });
      box.appendChild(b);
    });
  }

  function openLand(i) {
    curLand = i;
    var l = LANDS[i];
    $('land-bg').src = ART + l.bg;
    $('land-title').textContent = l.name;
    $('land-speech').innerHTML = '<span class="mq-speech__who">' + l.who + '</span>' + l.say;
    drawFights();
    $('land-list').hidden = true; $('land-place').hidden = false;
    show('land');
  }

  function drawFights() {
    var l = LANDS[curLand], box = $('land-fights');
    box.innerHTML = '';
    l.fights.forEach(function (f, fi) {
      var fin = !!S.done[curLand + ':' + fi];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-go' + (fin ? ' mq-go--done' : '');
      b.innerHTML =
        '<span class="mq-go__art"><img src="' + ART + FOES[f.foes[0]].art + '" alt="" loading="lazy"></span>' +
        '<span class="mq-go__txt"><span class="mq-go__name">' + f.label + (fin ? ' · возвращено' : '') + '</span>' +
        '<span class="mq-go__sub">' + f.sub + '</span></span>';
      b.addEventListener('click', function () { startFight(f.foes, curLand, fi); });
      box.appendChild(b);
    });
    var back = document.createElement('button');
    back.type = 'button'; back.className = 'mq-btn mq-btn--ghost';
    back.textContent = 'К другим землям';
    back.addEventListener('click', function () { drawLands(); $('land-place').hidden = true; $('land-list').hidden = false; });
    box.appendChild(back);
  }

  /* ========================================================
     10. БОЙ
     ======================================================== */
  var B = null;

  function startFight(keys, li, fi) {
    B = {
      li: li, fi: fi, hp: hpMax(), max: hpMax(),
      foes: keys.map(function (k, i) {
        var f = FOES[k], sc = 1 + (S.lv - 1) * .22;
        var op = openElems();
        return { key: k, i: i, name: f.name, art: f.art, was: f.was, boss: !!f.boss,
                 weak: f.weak === 'top' ? op[op.length - 1] : f.weak,
                 hp: Math.round(f.hp * sc), max: Math.round(f.hp * sc),
                 pow: Math.round(f.pow * (1 + (S.lv - 1) * .14)) };
      }),
      cool: {}, spell: null, task: null, aim: 0, busy: false, solved: 0, wrong: 0
    };
    $('fight-bg').src = ART + LANDS[li].bg;
    drawFoes(); drawMine(); showSpells();
    tip('Выбери заклинание. <b>Подсвечено</b> то, к чему клякса слаба.');
    show('fight');
  }

  function alive() { return B.foes.filter(function (f) { return f.hp > 0; }); }
  function hpColor(k) { return k > .55 ? '#49C98A' : k > .28 ? '#F2B01E' : '#E04A3C'; }

  function drawFoes() {
    var box = $('foes');
    box.innerHTML = '';
    B.foes.forEach(function (f) {
      var el = ELEM[f.weak];
      var u = document.createElement('button');
      u.type = 'button';
      u.className = 'mq-unit mq-unit--foe' + (f.hp <= 0 ? ' mq-unit--gone' : '') + (f.boss ? ' mq-unit--boss' : '');
      u.innerHTML =
        '<span class="mq-unit__art"><img src="' + ART + f.art + '" alt=""></span>' +
        '<span class="mq-unit__name">' + f.name + '</span>' +
        '<span class="mq-bar"><i style="width:' + Math.max(0, f.hp / f.max * 100) + '%;background:' + hpColor(f.hp / f.max) + '"></i></span>' +
        '<span class="mq-unit__weak" style="background:var(--' + f.weak + '-bg);color:var(--' + f.weak + ')">слаб к ' + el.dat + ' ' + el.sign + '</span>';
      box.appendChild(u);
    });
  }

  function drawMine() {
    var h = hero(), pet = S.pets.length ? S.pets[S.pets.length - 1] : null;
    $('mine').innerHTML =
      '<span class="mq-unit" id="u-me">' +
        '<span class="mq-unit__art" style="--tint:' + h.tint + '"><img src="' + ART + h.art + '" alt=""></span>' +
        '<span class="mq-unit__name">' + esc(S.name || h.name) + '</span>' +
        '<span class="mq-bar"><i style="width:' + Math.max(0, B.hp / B.max * 100) + '%;background:' + hpColor(B.hp / B.max) + '"></i></span>' +
      '</span>' +
      (pet ? '<span class="mq-unit mq-unit--pet"><span class="mq-unit__art"><img src="' + ART + (pet.art || 'foe_blot.webp') + '" alt=""></span>' +
             '<span class="mq-unit__name">' + esc(pet.name || pet) + '</span></span>' : '');
  }

  function tip(html) { $('tip').innerHTML = html; }

  function showSpells() {
    $('task').hidden = true;
    var box = $('spells');
    box.hidden = false; box.innerHTML = '';
    var weakSet = alive().map(function (f) { return f.weak; });
    openElems().forEach(function (k) {
      var e = ELEM[k], cd = B.cool[k] || 0;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-spell' + (cd > 0 ? ' mq-spell--cool' : '') + (cd === 0 && weakSet.indexOf(k) >= 0 ? ' mq-spell--best' : '');
      b.innerHTML =
        '<span class="mq-spell__sign" style="background:var(--' + k + '-bg);color:var(--' + k + ')">' + e.sign + '</span>' +
        '<span class="mq-spell__name">' + e.name + '</span>' +
        '<span class="mq-spell__how">' + e.how + '</span>' +
        (cd > 0 ? '<span class="mq-spell__cool">отдых ' + cd + '</span>' : '');
      if (cd === 0) b.addEventListener('click', function () { chooseSpell(k); });
      box.appendChild(b);
    });
  }

  function chooseSpell(k) {
    B.spell = k;
    var mode = ELEM[k].mode;
    if (alive().length > 1 && mode !== 'all' && mode !== 'heal') pickTarget();
    else { B.aim = alive()[0] ? alive()[0].i : 0; askTask(); }
  }

  function pickTarget() {
    tip('По кому ударить? Нажми на кляксу.');
    $('spells').hidden = true;
    Array.prototype.forEach.call($('foes').children, function (u, i) {
      if (B.foes[i].hp <= 0) return;
      u.classList.add('mq-unit--pick');
      u.onclick = function () {
        B.aim = i;
        Array.prototype.forEach.call($('foes').children, function (x) { x.classList.remove('mq-unit--pick'); x.onclick = null; });
        askTask();
      };
    });
  }

  function askTask() {
    var k = B.spell, e = ELEM[k];
    B.task = TASK[k](S.grade || 1);
    $('spells').hidden = true; $('task').hidden = false;
    var sp = $('task-spell');
    sp.textContent = e.sign + ' ' + e.name;
    sp.style.background = 'var(--' + k + '-bg)'; sp.style.color = 'var(--' + k + ')';
    $('task-q').innerHTML = B.task.q + (B.task.sub ? '<small>' + B.task.sub + '</small>' : '');
    var box = $('task-opts');
    box.innerHTML = '';
    options(B.task.answer).forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mq-opt'; b.textContent = String(v);
      b.addEventListener('click', function () { answer(v, b); });
      box.appendChild(b);
    });
    var f = B.foes[B.aim];
    tip(f && f.weak === k
      ? '<b>' + f.name + '</b> слаб к этому — удар будет вдвое сильнее.'
      : 'Назови верное число — заклинание сорвётся с посоха.');
  }

  $('task-drop').addEventListener('click', function () {
    if (B.busy) return;
    B.spell = null; B.task = null; showSpells(); tip('Возьми другое заклинание.');
  });

  function answer(v, btn) {
    if (B.busy) return;
    B.busy = true;
    var ok = (v === B.task.answer);
    Array.prototype.forEach.call($('task-opts').children, function (b) {
      if (b === btn) b.classList.add(ok ? 'mq-opt--ok' : 'mq-opt--no');
      else if (!ok && Number(b.textContent) === B.task.answer) b.classList.add('mq-opt--ok');
      else b.classList.add('mq-opt--dim');
    });
    if (ok) { S.solved++; B.solved++; save(); setTimeout(cast, 430); }
    else {
      S.wrong++; B.wrong++; save();
      tip('Не то число. Верное — <b>' + B.task.answer + '</b>. Ход ушёл, но тебя не задело.');
      pop($('u-me'), 'мимо', 'miss');
      setTimeout(function () { endTurn(true); }, 1100);
    }
  }

  function cast() {
    var k = B.spell, e = ELEM[k], P = spellPow(k);
    var me = $('u-me');
    if (me) { me.classList.add('mq-cast'); setTimeout(function () { me.classList.remove('mq-cast'); }, 330); }
    var aim = B.foes[B.aim], weak = aim && aim.weak === k, x2 = weak ? 2 : 1;

    if (e.mode === 'heal') {
      var cut = P * x2, heal = Math.round(P * 1.2);
      B.hp = Math.min(B.max, B.hp + heal);
      if (aim && aim.hp > 0) hurt(aim, cut);
      drawMine(); pop($('u-me'), '+' + heal, 'heal');
      tip('<b>Убыль</b>: отняла ' + cut + ' и вернула тебе ' + heal + '.' + (weak ? ' Вдвое — он к этому слаб.' : ''));
    }
    else if (e.mode === 'multi') {
      var m = String(B.task.q).split('×');
      var times = Math.max(2, Math.min(12, parseInt(m[1], 10) || 3));
      var per = P * x2, n = 0;
      (function step() {
        if (n >= times || aim.hp <= 0) {
          tip('<b>Вихрь</b>: ' + times + ' ' + plural(times, 'удар', 'удара', 'ударов') + ' по ' + per + '.');
          return;
        }
        hurt(aim, per); n++; setTimeout(step, 150);
      })();
    }
    else if (e.mode === 'all') {
      var list = alive();
      var each = Math.max(1, Math.round(P * 1.3 / Math.max(1, Math.sqrt(list.length))));
      list.forEach(function (f, i) {
        setTimeout(function () { hurt(f, f.weak === k ? each * 2 : each); }, i * 140);
      });
      tip('<b>Раскол</b>: удар поделён на ' + list.length + ' — по ' + each + ' каждому.');
    }
    else if (e.mode === 'part') {
      var part = Math.max(4, Math.round(aim.max * .25)) * x2;
      hurt(aim, part);
      tip('<b>Доля</b>: срезала четверть здоровья — ' + part + '.');
    }
    else if (e.mode === 'crit') {
      var d2 = P * 2 * x2; hurt(aim, d2);
      tip('<b>Тайна</b>: неизвестное найдено — ' + d2 + ' в слабое место.');
    }
    else {
      var d = P * x2; hurt(aim, d);
      tip('<b>Рост</b>: удар на ' + d + (weak ? ' — вдвое, он к этому слаб.' : '.'));
    }

    B.cool[k] = (e.mode === 'all' || e.mode === 'crit') ? 2 : (e.mode === 'multi' || e.mode === 'part' ? 1 : 0);
    setTimeout(function () { endTurn(false); }, e.mode === 'multi' ? 1600 : 1000);
  }

  function hurt(f, dmg) {
    f.hp = Math.max(0, f.hp - dmg);
    drawFoes();
    var u = $('foes').children[f.i];
    if (u) {
      var art = u.querySelector('.mq-unit__art');
      if (art) { art.classList.add('mq-hit'); setTimeout(function () { art.classList.remove('mq-hit'); }, 250); }
      pop(u, '−' + dmg);
    }
    shake(dmg >= 20 ? 'm' : 's');
  }

  function endTurn(fumbled) {
    Object.keys(B.cool).forEach(function (k) { if (B.cool[k] > 0) B.cool[k]--; });
    if (!alive().length) { setTimeout(function () { finish(true); }, 560); return; }
    var foes = alive(), i = 0;
    (function next() {
      if (i >= foes.length) {
        B.busy = false;
        if (B.hp <= 0) { finish(false); return; }
        B.spell = null; B.task = null; showSpells();
        tip(fumbled ? 'Твой ход. Можно взять другое заклинание.' : 'Твой ход.');
        return;
      }
      var f = foes[i++], dmg = f.pow + Math.round(Math.random() * 3);
      B.hp = Math.max(0, B.hp - dmg);
      drawMine();
      var me = $('u-me');
      if (me) {
        var art = me.querySelector('.mq-unit__art');
        if (art) { art.classList.add('mq-hit'); setTimeout(function () { art.classList.remove('mq-hit'); }, 250); }
        pop(me, '−' + dmg);
      }
      shake('s');
      setTimeout(next, 540);
    })();
  }

  function finish(won) {
    var rows = [];
    if (won) {
      S.done[B.li + ':' + B.fi] = true;
      var xp = 12 + B.solved * 6 + B.foes.length * 5;
      S.xp += xp;
      rows.push(['✦', 'Опыт +' + xp, 'чисел возвращено: ' + B.solved + (B.wrong ? ', промахов: ' + B.wrong : ', без промахов')]);
      var up = false;
      while (S.xp >= needXP(S.lv)) { S.xp -= needXP(S.lv); S.lv++; up = true; }
      if (up) rows.push(['⬆', S.lv + ' уровень', 'здоровья теперь ' + hpMax()]);

      /* клякса вспоминает себя и идёт с тобой — вместо «добить» */
      var cand = B.foes.filter(function (f) { return !f.boss; });
      if (cand.length && S.pets.length < 3 && B.solved >= 2) {
        var c = cand[0];
        if (!S.pets.some(function (p) { return p.name === c.name; })) {
          S.pets.push({ name: c.name, art: c.art });
          rows.push(['🫧', c.name + ' вспомнил себя', c.was + ' — число вернулось, и теперь он идёт с тобой']);
        }
      }
      $('win-art').innerHTML = '<img src="' + ART + hero().art + '" alt="">';
      $('win-title').textContent = B.foes[0].boss ? 'Великий Счёт полон' : 'Числа на месте';
      $('win-sub').textContent = B.foes[0].boss
        ? 'Безмер ушёл. Числа вернулись в книгу, и мир снова твёрдый.'
        : (B.foes.length > 1 ? 'Кляксы вспомнили, чем были.' : 'Клякса вспомнила, чем была.');
      $('win-go').textContent = 'В Числоград';
    } else {
      rows.push(['💤', 'Силы кончились', 'ничего не потеряно — числа остались у тебя в голове']);
      rows.push(['↻', 'Попробуй ещё', B.wrong > B.solved ? 'возьми заклинание, к которому клякса слаба' : 'почти получилось']);
      $('win-art').innerHTML = '<img src="' + ART + hero().art + '" alt="">';
      $('win-title').textContent = 'Посох погас';
      $('win-sub').textContent = 'Отдохни и возвращайся.';
      $('win-go').textContent = 'В Числоград';
    }
    save();
    $('win-rows').innerHTML = rows.map(function (r) {
      return '<div class="mq-wrow"><span class="mq-wrow__ico">' + r[0] + '</span>' +
             '<span class="mq-wrow__txt">' + r[1] + '<small>' + r[2] + '</small></span></div>';
    }).join('');
    show('win');
  }
  $('win-go').addEventListener('click', function () { show('town'); });

  /* ---------- юс ---------- */
  function pop(unitEl, text, kind) {
    if (!unitEl) return;
    var host = $('fx'), hb = host.getBoundingClientRect(), r = unitEl.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'mq-pop' + (kind === 'heal' ? ' mq-pop--heal' : kind === 'miss' ? ' mq-pop--miss' : '');
    s.textContent = text;
    s.style.left = (r.left - hb.left + r.width / 2) + 'px';
    s.style.top = (r.top - hb.top + r.height * .34) + 'px';
    host.appendChild(s);
    setTimeout(function () { s.remove(); }, 840);
  }
  function shake(kind) {
    var el = $('sc-fight'), cls = 'mq-shake--' + kind;
    el.classList.remove('mq-shake--s', 'mq-shake--m');
    void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 660);
  }

  /* ========================================================
     11. ЛИСТ «ПАЛАТА СЧЁТА» — посох, стихии, лор
     ======================================================== */
  function openSheet() {
    var open = openElems();
    $('sheet-body').innerHTML =
      '<p class="mq-lore">Все числа мира записаны в <b>Великом Счёте</b> — книге под этой Палатой. Пока число записано, вещь стоит: у дома три окна, у года четыре времени. Безмер стирает числа, и вещи расплываются. Твой посох возвращает их обратно.</p>' +
      ORDER.map(function (k) {
        var e = ELEM[k], has = open.indexOf(k) >= 0;
        return '<div class="mq-scard' + (has ? '' : ' mq-scard--locked') + '">' +
          '<span class="mq-scard__sign" style="background:var(--' + k + '-bg);color:var(--' + k + ')">' + e.sign + '</span>' +
          '<span class="mq-scard__txt"><span class="mq-scard__name">' + e.name + '</span>' +
          '<span class="mq-scard__how">' + e.how + (has ? '' : ' · откроется с ' + e.grade + ' класса') + '</span></span></div>';
      }).join('') +
      (S.pets.length ? '<p class="mq-lore"><b>С тобой идут:</b> ' + S.pets.map(function (p) { return esc(p.name || p); }).join(', ') + '</p>' : '');
    $('sheet').hidden = false;
  }
  $('sheet-close').addEventListener('click', function () { $('sheet').hidden = true; });
  $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) $('sheet').hidden = true; });
  $('sheet-grade').addEventListener('click', function () { $('sheet').hidden = true; show('grade'); });

  show('intro');
  window.nookaMQ = { state: function () { return S; }, fight: function () { return B; }, go: show, screen: curScreen };
})();
