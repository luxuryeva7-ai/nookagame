/* ============================================================
   АРИФМАГИЯ — математическая RPG мира Nooka. Класс 1–8.

   ЛОР (придуман для Nooka, ничего чужого не взято)
   ----------------------------------------------------------
   Счётные Земли держатся на числах. Мост стоит, пока известно,
   сколько в нём пролётов. Река течёт, пока известна её глубина.
   Числами владеют счетомаги из Палаты Счёта.
   Пришёл Безмер — он стирает числа. Что стёрто, то расплывается
   и пропадает: сперва цифра, потом сама вещь. Его слуги — кляксы,
   слипшиеся из стёртых чисел.
   Ребёнок — новый ученик Палаты. Проводник — Нейро (маскот Nooka).

   ГЛАВНОЕ РЕШЕНИЕ: стихия магии = арифметическое действие.
   Заклинание ведёт себя ровно так, как ведёт себя действие:
     Рост   +  копит — один крупный удар
     Убыль  −  отнимает у врага и возвращает тебе
     Вихрь  ×  бьёт столько раз, сколько второй множитель (3×4 → 4 удара по 3)
     Раскол ÷  делит удар поровну на всех врагов
     Доля   ½  срезает долю здоровья врага           (5–6 класс)
     Тайна  x  находит неизвестное — бьёт вдвое      (7–8 класс)

   ПОЧЕМУ УРОН НЕ РАВЕН ОТВЕТУ (важно, не возвращать обратно).
   Сперва урон был равен ответу задачи — красиво и понятно, но ломало игру:
   в 3 классе «44 + 33» сносило 154 урона при 26 HP у врага, а деление
   давало 3. Ребёнок за два боя понимает, что Рост всегда сильнее, и больше
   никогда не трогает деление — то есть перестаёт тренировать то, ради чего
   всё затевалось. Поэтому урон задаёт САМО заклинание (растёт с уровнем),
   а ответ решает, сработает ли оно, и управляет формой удара там, где это
   наглядно: в Вихре число ударов — это второй множитель.
   У врага своя слабость: по ней урон вдвое, и она подсвечена —
   ребёнок сам хочет решать задачи именно того типа.
   Неверный ответ не бьёт по герою: он просто теряет ход.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'nooka_mq_v1';
  var $  = function (id) { return document.getElementById(id); };
  var app = $('app');

  /* ========================================================
     1. СТИХИИ
     ======================================================== */
  var ELEM = {
    add:  { sign: '+', name: 'Рост',   dat: 'Росту',   how: 'один крупный удар',              grade: 1, mode: 'single', pow: 11 },
    sub:  { sign: '−', name: 'Убыль',  dat: 'Убыли',   how: 'отнимает врагу, вернёт тебе',    grade: 1, mode: 'heal',   pow: 7  },
    mul:  { sign: '×', name: 'Вихрь',  dat: 'Вихрю',   how: 'ударов столько, сколько множишь', grade: 2, mode: 'multi', pow: 4  },
    div:  { sign: '÷', name: 'Раскол', dat: 'Расколу', how: 'делит удар на всех врагов',      grade: 3, mode: 'all',    pow: 9  },
    frac: { sign: '½', name: 'Доля',   dat: 'Доле',    how: 'срезает долю здоровья',          grade: 5, mode: 'part',   pow: 0  },
    eq:   { sign: 'x', name: 'Тайна',  dat: 'Тайне',   how: 'находит слабое место — вдвое',   grade: 7, mode: 'crit',   pow: 18 }
  };
  /* сила заклинания растёт с уровнем героя, а не с величиной ответа */
  function spellPow(k) { return Math.max(1, Math.round(ELEM[k].pow * (1 + (S.lv - 1) * 0.3))); }
  var ORDER = ['add', 'sub', 'mul', 'div', 'frac', 'eq'];

  /* ========================================================
     2. ЗАДАЧИ — генератор по классу (1–8)
     Возвращает { q, sub, answer } — вопрос, пояснение, ответ.
     Ответ он же урон, поэтому держим его в разумных пределах.
     ======================================================== */
  function ri(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

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
      return mk((b * r) + ' ÷ ' + b, 'раскол поделит удар поровну', r);
    },
    frac: function (g) {
      if (g <= 6) {
        var d = pick([2, 3, 4, 5, 10]);
        var n = ri(1, d - 1);
        var whole = d * ri(3, 14);
        return mk(n + '/' + d + ' от ' + whole, 'сколько это?', whole / d * n);
      }
      var p = pick([10, 20, 25, 50, 75]);
      var w = pick([40, 60, 80, 120, 200, 240]);
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
  function mk(q, sub, answer) { return { q: q, sub: sub, answer: answer }; }

  /* четыре варианта ответа: верный + три близких, без повторов */
  function options(ans) {
    var out = [ans], guard = 0;
    var span = Math.max(2, Math.round(Math.abs(ans) * .25));
    while (out.length < 4 && guard++ < 60) {
      var d = ri(1, span) * (Math.random() < .5 ? -1 : 1);
      var v = ans + d;
      if (v === ans) continue;
      if (ans >= 0 && v < 0) continue;
      if (out.indexOf(v) < 0) out.push(v);
    }
    while (out.length < 4) out.push(ans + out.length * 2 + 1);
    for (var i = out.length - 1; i > 0; i--) { var j = ri(0, i), t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }

  /* ========================================================
     3. ОБЛИК ГЕРОЯ — SVG из частей.
     Лицо по канону Nooka: крупные глаза с бликом, мягкие брови,
     открытая улыбка, носик, щёки. Никаких глаз-точек.
     ======================================================== */
  var SKIN = ['#F6D2B4', '#E8B38C', '#C98A62', '#9B6442', '#F2DCC6'];
  var ROBE = [
    { id: 'mint',  c: '#4ECFA0', d: '#2E9D6B', n: 'Мятная' },
    { id: 'plum',  c: '#8B6BF0', d: '#6B4BE0', n: 'Сливовая' },
    { id: 'coral', c: '#FF8A68', d: '#D8552F', n: 'Коралловая' },
    { id: 'sky',   c: '#54B7EA', d: '#1F7FB8', n: 'Небесная' },
    { id: 'sun',   c: '#FFC94A', d: '#D79A00', n: 'Солнечная' },
    { id: 'rose',  c: '#F178B8', d: '#A32F86', n: 'Розовая' }
  ];
  var HAT = [
    { id: 'cone',  n: 'Колпак' },
    { id: 'hood',  n: 'Капюшон' },
    { id: 'none',  n: 'Без шляпы' },
    { id: 'crown', n: 'Венец' }
  ];
  var STAFF = [
    { id: 'star',  n: 'Со звездой' },
    { id: 'orb',   n: 'С шаром' },
    { id: 'leaf',  n: 'С листом' },
    { id: 'none',  n: 'Без посоха' }
  ];

  function heroSVG(h, mood) {
    var robe = ROBE[h.robe % ROBE.length];
    var skin = SKIN[h.skin % SKIN.length];
    var hat = HAT[h.hat % HAT.length].id;
    var staff = STAFF[h.staff % STAFF.length].id;
    var happy = mood === 'win';
    var s = '';

    s += '<svg viewBox="0 0 120 142" xmlns="http://www.w3.org/2000/svg">';
    /* посох за фигурой */
    if (staff !== 'none') {
      s += '<rect x="96" y="44" width="6" height="88" rx="3" fill="#A9743F"/>';
      s += '<rect x="96" y="44" width="2.5" height="88" rx="1.2" fill="#C99463"/>';
      if (staff === 'star')
        s += '<path d="M99 24l5.2 10.6 11.7 1.7-8.5 8.3 2 11.6L99 50.7 88.6 56.2l2-11.6-8.5-8.3 11.7-1.7z" fill="#FFC63F" stroke="#D79A00" stroke-width="2.2" stroke-linejoin="round"/>';
      if (staff === 'orb') {
        s += '<circle cx="99" cy="36" r="12" fill="#9FD9F5" stroke="#1F7FB8" stroke-width="2.6"/>';
        s += '<ellipse cx="94.5" cy="31" rx="3.6" ry="2.6" fill="#fff" opacity=".85"/>';
      }
      if (staff === 'leaf')
        s += '<path d="M99 22c10 6 13 16 8 24-7 4-16 0-18-9-1.6-7 3-13 10-15z" fill="#6FDFAC" stroke="#2E9D6B" stroke-width="2.4" stroke-linejoin="round"/>';
    }
    /* мантия */
    s += '<path d="M60 56c-16 0-26 10-29 26l-5 44c-1 7 3 11 10 11h48c7 0 11-4 10-11l-5-44c-3-16-13-26-29-26z" fill="' + robe.c + '" stroke="' + robe.d + '" stroke-width="3.4" stroke-linejoin="round"/>';
    /* воротник */
    s += '<path d="M46 58c4 8 9 12 14 12s10-4 14-12" fill="none" stroke="' + robe.d + '" stroke-width="3.4" stroke-linecap="round"/>';
    /* кисти */
    s += '<circle cx="28" cy="100" r="8.4" fill="' + skin + '" stroke="' + robe.d + '" stroke-width="2.6"/>';
    s += '<circle cx="92" cy="98" r="8.4" fill="' + skin + '" stroke="' + robe.d + '" stroke-width="2.6"/>';
    /* голова */
    s += '<circle cx="60" cy="38" r="26" fill="' + skin + '" stroke="#8A5A3A" stroke-width="3"/>';
    /* щёки */
    s += '<ellipse cx="42" cy="46" rx="6.2" ry="4.4" fill="#FF9E86" opacity=".5"/>';
    s += '<ellipse cx="78" cy="46" rx="6.2" ry="4.4" fill="#FF9E86" opacity=".5"/>';
    /* глаза — крупные, с бликом */
    s += '<ellipse cx="50" cy="37" rx="7.4" ry="8.4" fill="#fff" stroke="#3B2A52" stroke-width="2.2"/>';
    s += '<ellipse cx="70" cy="37" rx="7.4" ry="8.4" fill="#fff" stroke="#3B2A52" stroke-width="2.2"/>';
    s += '<circle cx="51" cy="38.5" r="3.9" fill="#3B2A52"/>';
    s += '<circle cx="71" cy="38.5" r="3.9" fill="#3B2A52"/>';
    s += '<circle cx="52.6" cy="36.4" r="1.5" fill="#fff"/>';
    s += '<circle cx="72.6" cy="36.4" r="1.5" fill="#fff"/>';
    /* брови — мягкие дуги */
    s += '<path d="M43.5 26.5q6.5-3.6 13 .4" fill="none" stroke="#6B4A33" stroke-width="2.8" stroke-linecap="round"/>';
    s += '<path d="M63.5 26.9q6.5-4 13-.4" fill="none" stroke="#6B4A33" stroke-width="2.8" stroke-linecap="round"/>';
    /* носик */
    s += '<path d="M60 41.5q2.4 2.6 0 4.6" fill="none" stroke="#B9815C" stroke-width="2.4" stroke-linecap="round"/>';
    /* улыбка */
    if (happy) s += '<path d="M50 50q10 11 20 0q-4 7-10 7t-10-7z" fill="#C4506B" stroke="#8A2F46" stroke-width="2.2" stroke-linejoin="round"/>';
    else s += '<path d="M51 50.5q9 7.5 18 0" fill="none" stroke="#8A2F46" stroke-width="2.8" stroke-linecap="round"/>';
    /* шляпа */
    if (hat === 'cone') {
      s += '<path d="M60 -6L84 22H36z" fill="' + robe.c + '" stroke="' + robe.d + '" stroke-width="3.2" stroke-linejoin="round"/>';
      s += '<rect x="30" y="20" width="60" height="7.6" rx="3.8" fill="' + robe.d + '"/>';
      s += '<circle cx="60" cy="-4" r="4.6" fill="#FFC63F" stroke="#D79A00" stroke-width="2"/>';
    }
    if (hat === 'hood') {
      s += '<path d="M60 4c-16 0-27 10-28 24 9-7 18-10 28-10s19 3 28 10C87 14 76 4 60 4z" fill="' + robe.c + '" stroke="' + robe.d + '" stroke-width="3.2" stroke-linejoin="round"/>';
    }
    if (hat === 'crown') {
      s += '<path d="M36 16l5 -13 7 9 6 -13 6 13 7 -9 5 13z" fill="#FFC63F" stroke="#D79A00" stroke-width="2.6" stroke-linejoin="round"/>';
    }
    s += '</svg>';
    return s;
  }

  /* кляксы Безмера — тоже SVG, чтобы не зависеть от картинок */
  function foeSVG(f) {
    var c = f.c, d = f.d, s = '';
    s += '<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">';
    s += '<path d="M55 10c22 0 38 14 40 32 2 18-8 34-26 39-14 4-30 1-39-10C20 59 22 38 33 23 39 15 46 10 55 10z" fill="' + c + '" stroke="' + d + '" stroke-width="4" stroke-linejoin="round"/>';
    /* рваный низ — «стёртый» край */
    s += '<path d="M22 72q7 10 15 4t14 8 15-6 14 6" fill="none" stroke="' + d + '" stroke-width="3.6" stroke-linecap="round"/>';
    /* глаза */
    s += '<ellipse cx="43" cy="46" rx="8.6" ry="9.6" fill="#fff" stroke="' + d + '" stroke-width="2.6"/>';
    s += '<ellipse cx="68" cy="46" rx="8.6" ry="9.6" fill="#fff" stroke="' + d + '" stroke-width="2.6"/>';
    s += '<circle cx="44" cy="48" r="4.4" fill="#2A1C3C"/>';
    s += '<circle cx="69" cy="48" r="4.4" fill="#2A1C3C"/>';
    s += '<circle cx="45.8" cy="45.6" r="1.7" fill="#fff"/>';
    s += '<circle cx="70.8" cy="45.6" r="1.7" fill="#fff"/>';
    /* бровки домиком — озорной, а не злой */
    s += '<path d="M34 33q9-4 17 1" fill="none" stroke="' + d + '" stroke-width="3" stroke-linecap="round"/>';
    s += '<path d="M59 34q9-5 17-1" fill="none" stroke="' + d + '" stroke-width="3" stroke-linecap="round"/>';
    /* рот */
    s += '<path d="M46 62q9 6 18 0" fill="none" stroke="' + d + '" stroke-width="3.2" stroke-linecap="round"/>';
    /* стёртая цифра внутри */
    if (f.glyph) s += '<text x="55" y="27" text-anchor="middle" font-family="Nunito,sans-serif" font-size="17" font-weight="900" fill="' + d + '" opacity=".5">' + f.glyph + '</text>';
    s += '</svg>';
    return s;
  }

  /* ========================================================
     4. МИР: локации, NPC, враги
     ======================================================== */
  var FOES = {
    klyaksa:  { name: 'Клякса',    hp: 26,  pow: 4,  weak: 'add', c: '#A8E6C8', d: '#2E9D6B', glyph: '7' },
    putanik:  { name: 'Путаник',   hp: 34,  pow: 5,  weak: 'sub', c: '#FFC3AE', d: '#D8552F', glyph: '3' },
    mnozh:    { name: 'Множик',    hp: 46,  pow: 6,  weak: 'mul', c: '#CFC0FF', d: '#6B4BE0', glyph: '8' },
    polovin:  { name: 'Половинник',hp: 52,  pow: 7,  weak: 'div', c: '#B4DCF2', d: '#1F7FB8', glyph: '4' },
    nulik:    { name: 'Нулик',     hp: 38,  pow: 5,  weak: 'add', c: '#FFE49E', d: '#B07400', glyph: '0' },
    /* у Безмера слабость не прибита к Тайне: она открывается только с 7 класса,
       и для первоклассника финальный босс становился непроходимым. Слабость —
       старшая из открытых ребёнку стихий, по лору это и честно: он прячет
       своё число за тем действием, которое ты уже умеешь. */
    bezmer:   { name: 'Безмер',    hp: 100, pow: 7,  weak: 'top', c: '#9E8FB8', d: '#4A3568', glyph: '?', boss: true }
  };

  var PLACES = [
    {
      id: 'palata', name: 'Палата Счёта', sub: 'Академия счетомагов. Тут тебя научат держать число.',
      bg: 'math/room-bg.webp',
      who: 'Нейро',
      say: 'Ты в Палате Счёта. Правило тут одно: <b>заклинание слушается того, кто назовёт верное число</b>. Назвал — посох выстрелил. Промолчал или ошибся — ход ушёл, но тебя за это не бьют. Пойдём, попробуешь на учебной кляксе.',
      spots: [
        { kind: 'fight', label: 'Учебная клякса', sub: 'первый бой — спокойно, тут не страшно', foes: ['klyaksa'] },
        { kind: 'talk',  label: 'Спросить про стихии', sub: 'что за знаки на посохе',
          who: 'Наставница Бусина',
          say: 'На посохе шесть знаков, и каждый — действие. <b>Рост</b> складывает и бьёт силой в твой ответ. <b>Убыль</b> отнимает — сбивает щит и лечит тебя. <b>Вихрь</b> множит: три на четыре — это четыре удара по три. <b>Раскол</b> делит удар на всех. Доля и Тайна откроются позже.' }
      ]
    },
    {
      id: 'ryad', name: 'Торговый ряд', sub: 'Цены стёрты, торговля встала.',
      bg: 'math/shop-bg.webp',
      who: 'Торговец Семик',
      say: 'Ох, счетомаг, выручай! Безмер стёр цены на половине лавок — покупатели ходят и не знают, сколько платить. А у прилавка топчется <b>Путаник</b>: он путает числа местами, у него и спроси.',
      spots: [
        { kind: 'fight', label: 'Путаник у прилавка', sub: 'слаб к Убыли', foes: ['putanik'] },
        { kind: 'talk',  label: 'Помочь вернуть цену', sub: 'восстановить число на ценнике',
          who: 'Торговец Семик',
          say: 'Смотри: было <b>девять</b> яблок, купили <b>четыре</b>. Сколько осталось — то и есть цена, которую стёрли. Вот так числа и держат вещи на месте. Запомнил? Тогда иди, Путаник ждёт.' }
      ]
    },
    {
      id: 'reka', name: 'Делимая река', sub: 'У моста стёрли число пролётов — и мост поплыл.',
      bg: 'math/river-bg.webp',
      who: 'Нейро',
      say: 'Видишь мост? Он был <b>на двенадцать пролётов, по четыре на каждую опору</b>. Безмер стёр это число — и мост расплылся. Тут живёт Половинник: он делит всё пополам, пока не останется ничего. Против него и нужен <b>Раскол</b>.',
      spots: [
        { kind: 'fight', label: 'Половинник под мостом', sub: 'слаб к Расколу', foes: ['polovin', 'klyaksa'] },
        { kind: 'fight', label: 'Два Нулика на отмели', sub: 'их двое — пригодится Раскол', foes: ['nulik', 'nulik'] }
      ]
    },
    {
      id: 'roscha', name: 'Умножальная роща', sub: 'Деревья множатся сами и уже не помнят, сколько их.',
      bg: 'math/garden-bg.webp',
      who: 'Нейро',
      say: 'Роща множится без счёта: было четыре дерева, стало четыре по шесть, а теперь никто не знает сколько. В такой чаще силён <b>Вихрь</b> — он бьёт столько раз, сколько скажет твой ответ.',
      spots: [
        { kind: 'fight', label: 'Множик в чаще', sub: 'слаб к Вихрю', foes: ['mnozh'] },
        { kind: 'fight', label: 'Множик и Клякса', sub: 'вдвоём', foes: ['mnozh', 'klyaksa'] }
      ]
    },
    {
      id: 'bashnya', name: 'Башня Безмера', sub: 'Здесь стирают числа. Отсюда всё и началось.',
      bg: 'math/night-bg.webp',
      who: 'Безмер',
      say: 'Ещё один с палочкой. Зачем вам числа? Без них спокойнее: ничего не надо считать, ничего не надо помнить. Я стёр мост — и никто по нему больше не бегает. Я сотру и тебя... если сумеешь назвать, <b>чему равен мой x</b>.',
      spots: [
        { kind: 'fight', label: 'Безмер', sub: 'он прячет число за тем, что ты уже умеешь', foes: ['bezmer'] }
      ]
    }
  ];

  /* ========================================================
     5. СОСТОЯНИЕ
     ======================================================== */
  var S = load();

  function fresh() {
    return {
      made: false, grade: 0,
      hero: { name: '', skin: 0, robe: 0, hat: 0, staff: 0 },
      lv: 1, xp: 0, hpMax: 40,
      done: {},            /* 'place:spotIndex' → true */
      pets: [],            /* спасённые счётники */
      solved: 0, wrong: 0
    };
  }
  function load() {
    try { var r = JSON.parse(localStorage.getItem(KEY)); return r && r.hero ? r : fresh(); }
    catch (e) { return fresh(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function openElems() {
    return ORDER.filter(function (k) { return ELEM[k].grade <= Math.max(1, S.grade); });
  }
  function needXP(lv) { return 40 + (lv - 1) * 35; }
  function hpMax() { return 40 + (S.lv - 1) * 12; }

  /* ========================================================
     6. ЭКРАНЫ
     ======================================================== */
  var SCREENS = ['intro', 'grade', 'hero', 'map', 'place', 'fight', 'win'];
  var cur = 'intro';

  function show(name) {
    SCREENS.forEach(function (n) {
      var el = $('sc-' + n);
      if (el) el.hidden = (n !== name);
    });
    cur = name;
    window.scrollTo(0, 0);
    if (name === 'map') drawMap();
  }

  /* ---------- заставка ---------- */
  $('go-start').addEventListener('click', function () {
    if (S.made) { show('map'); return; }
    show('grade');
  });
  $('go-reset').addEventListener('click', function () {
    S = fresh(); save();
    $('go-reset').hidden = true;
    $('go-start').textContent = 'Начать';
    show('grade');
  });
  if (S.made) {
    $('go-start').textContent = 'Продолжить';
    $('go-reset').hidden = false;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-back')); });
  });

  /* ---------- класс ---------- */
  var GRADE_HINT = {
    1: 'Счёт и сложение до десяти',
    2: 'До двадцати, первая таблица',
    3: 'Таблица умножения и деление',
    4: 'Большие числа, деление',
    5: 'Дроби и порядок действий',
    6: 'Проценты, отрицательные',
    7: 'Уравнения с неизвестным',
    8: 'Уравнения посложнее'
  };
  (function buildGrades() {
    var box = $('grades');
    for (var g = 1; g <= 8; g++) (function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-grade';
      b.setAttribute('aria-pressed', S.grade === g ? 'true' : 'false');
      b.innerHTML = '<b>' + g + ' класс</b><span>' + GRADE_HINT[g] + '</span>';
      b.addEventListener('click', function () {
        S.grade = g; save();
        Array.prototype.forEach.call(box.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        setTimeout(function () { S.made ? show('map') : show('hero'); }, 140);
      });
      box.appendChild(b);
    })(g);
  })();

  /* ---------- кузница героя ---------- */
  function drawHero() {
    $('hero-preview').innerHTML = heroSVG(S.hero);
  }
  (function buildForge() {
    var ctrl = $('hero-ctrl');

    function row(label, items, field, dot) {
      var wrap = document.createElement('div');
      wrap.className = 'mq-row';
      var l = document.createElement('span');
      l.className = 'mq-row__lbl'; l.textContent = label;
      var chips = document.createElement('div');
      chips.className = 'mq-chips';
      items.forEach(function (it, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mq-chip' + (dot ? ' mq-chip--dot' : '');
        b.setAttribute('aria-pressed', S.hero[field] === i ? 'true' : 'false');
        if (dot) { var ic = document.createElement('i'); ic.style.background = it; b.appendChild(ic); b.setAttribute('aria-label', 'Цвет ' + (i + 1)); }
        else b.textContent = it.n;
        b.addEventListener('click', function () {
          S.hero[field] = i; save();
          Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          drawHero();
        });
        chips.appendChild(b);
      });
      wrap.appendChild(l); wrap.appendChild(chips);
      ctrl.appendChild(wrap);
    }

    row('Мантия', ROBE, 'robe');
    row('Шляпа', HAT, 'hat');
    row('Посох', STAFF, 'staff');
    row('Лицо', SKIN, 'skin', true);
    drawHero();
  })();

  $('hero-name').value = S.hero.name || '';
  $('hero-name').addEventListener('input', function () { S.hero.name = this.value.trim(); save(); });

  $('hero-done').addEventListener('click', function () {
    if (!S.hero.name) S.hero.name = 'Счетомаг';
    S.made = true; save();
    show('map');
  });

  /* ---------- карта ---------- */
  function placeDone(pi) {
    var p = PLACES[pi];
    return p.spots.every(function (_, si) { return S.done[pi + ':' + si]; });
  }
  function placeOpen(pi) {
    if (pi === 0) return true;
    /* локация открыта, когда в предыдущей закрыт хотя бы один бой */
    var prev = PLACES[pi - 1];
    return prev.spots.some(function (sp, si) { return sp.kind === 'fight' && S.done[(pi - 1) + ':' + si]; });
  }

  function meChip() {
    $('me-chip').innerHTML =
      '<div class="mq-avatar">' + heroSVG(S.hero) + '</div>' +
      '<span class="mq-me__txt">' +
        '<span class="mq-me__name">' + esc(S.hero.name || 'Счетомаг') + '</span>' +
        '<span class="mq-me__lv">' + S.lv + ' уровень · ' + S.grade + ' класс · решено ' + S.solved + '</span>' +
      '</span>';
  }

  function drawMap() {
    meChip();
    var box = $('map');
    box.innerHTML = '';
    PLACES.forEach(function (p, pi) {
      var open = placeOpen(pi), fin = placeDone(pi);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-node' + (open ? (fin ? ' mq-node--done' : '') : ' mq-node--locked');
      b.innerHTML =
        '<span class="mq-node__pic" style="background-image:url(' + p.bg + ')"></span>' +
        '<span class="mq-node__txt">' +
          '<span class="mq-node__name">' + p.name + '</span>' +
          '<span class="mq-node__sub">' + p.sub + '</span>' +
          '<span class="mq-node__tag">' + (!open ? 'закрыто' : fin ? 'пройдено' : 'идти сюда') + '</span>' +
        '</span>';
      if (open) b.addEventListener('click', function () { openPlace(pi); });
      box.appendChild(b);
    });
    var nxt = PLACES.findIndex(function (_, i) { return placeOpen(i) && !placeDone(i); });
    $('map-hint').textContent = nxt < 0
      ? 'Все земли прошли. Числа на месте — Безмер отступил.'
      : 'Дальше: ' + PLACES[nxt].name + '. Нажми на карточку.';
  }

  /* ---------- локация ---------- */
  var curPlace = 0;

  function openPlace(pi) {
    curPlace = pi;
    var p = PLACES[pi];
    $('place-bg').src = p.bg;
    $('place-title').textContent = p.name;
    speak(p.who, p.say);
    drawSpots();
    show('place');
  }
  function speak(who, text) {
    $('place-speech').innerHTML =
      '<span class="mq-speech__who">' + who + '</span>' + text;
  }
  function drawSpots() {
    var p = PLACES[curPlace], box = $('place-spots');
    box.innerHTML = '';
    p.spots.forEach(function (sp, si) {
      var fin = !!S.done[curPlace + ':' + si];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-spot' + (sp.kind === 'fight' ? ' mq-spot--fight' : '') + (fin ? ' mq-spot--done' : '');
      b.innerHTML =
        '<span class="mq-spot__ico">' + (sp.kind === 'fight' ? '⚔' : '💬') + '</span>' +
        '<span><span>' + sp.label + (fin ? ' · сделано' : '') + '</span>' +
        '<span class="mq-spot__sub">' + sp.sub + '</span></span>';
      b.addEventListener('click', function () {
        if (sp.kind === 'talk') { speak(sp.who, sp.say); S.done[curPlace + ':' + si] = true; save(); drawSpots(); return; }
        startFight(sp.foes, curPlace, si);
      });
      box.appendChild(b);
    });
  }

  /* ========================================================
     7. БОЙ
     ======================================================== */
  var B = null;

  function startFight(foeKeys, pi, si) {
    S.hpMax = hpMax();
    B = {
      pi: pi, si: si,
      hp: S.hpMax, max: S.hpMax,
      shield: 0,
      foes: foeKeys.map(function (k, i) {
        var f = FOES[k];
        var scale = 1 + (S.lv - 1) * .22;
        var op = openElems();
        var weak = f.weak === 'top' ? op[op.length - 1] : f.weak;
        return {
          key: k, i: i, name: f.name, weak: weak, c: f.c, d: f.d, glyph: f.glyph, boss: !!f.boss,
          hp: Math.round(f.hp * scale), max: Math.round(f.hp * scale), pow: Math.round(f.pow * (1 + (S.lv - 1) * .14))
        };
      }),
      cool: {},            /* стихия → сколько ходов отдыхает */
      spell: null, task: null, aim: 0,
      turn: 0, busy: false,
      solved: 0, wrong: 0
    };
    $('fight-bg').src = PLACES[pi].bg || 'math/arena-bg.webp';
    drawFoes(); drawMine(); showSpells();
    tip('Выбери заклинание. <b>Подсвечено</b> то, к чему враг слаб.');
    show('fight');
  }

  function alive() { return B.foes.filter(function (f) { return f.hp > 0; }); }

  /* цвет полоски — состояние с одного взгляда: полное зелёное, к концу красное */
  function hpColor(k) { return k > .55 ? '#49C98A' : k > .28 ? '#F2B01E' : '#E04A3C'; }

  function drawFoes() {
    var box = $('foes');
    box.innerHTML = '';
    B.foes.forEach(function (f, i) {
      var u = document.createElement('button');
      u.type = 'button';
      u.className = 'mq-unit mq-unit--foe' + (f.hp <= 0 ? ' mq-unit--gone' : '');
      u.dataset.foe = String(i);
      var el = ELEM[f.weak];
      u.innerHTML =
        '<span class="mq-unit__art">' + foeSVG(f) + '</span>' +
        '<span class="mq-unit__name">' + f.name + '</span>' +
        '<span class="mq-bar"><i style="width:' + Math.max(0, f.hp / f.max * 100) + '%;background:' + hpColor(f.hp / f.max) + '"></i></span>' +
        '<span class="mq-unit__weak" style="background:var(--' + f.weak + '-bg);color:var(--' + f.weak + ')">слаб к ' + el.dat + ' ' + el.sign + '</span>';
      box.appendChild(u);
    });
  }

  function drawMine() {
    var box = $('mine');
    var pet = S.pets.length ? S.pets[S.pets.length - 1] : null;
    box.innerHTML =
      '<span class="mq-unit" id="u-me">' +
        '<span class="mq-unit__art"><span class="mq-avatar">' + heroSVG(S.hero) + '</span></span>' +
        '<span class="mq-unit__name">' + esc(S.hero.name || 'Счетомаг') + (B.shield ? ' 🛡' + B.shield : '') + '</span>' +
        '<span class="mq-bar"><i style="width:' + Math.max(0, B.hp / B.max * 100) + '%;background:' + hpColor(B.hp / B.max) + '"></i></span>' +
      '</span>' +
      (pet ? '<span class="mq-unit" id="u-pet">' +
        '<span class="mq-unit__art"><img src="math/nyam-idle.webp" alt=""></span>' +
        '<span class="mq-unit__name">' + pet + '</span>' +
      '</span>' : '');
  }

  function tip(html) { $('tip').innerHTML = html; }

  /* ---------- выбор заклинания ---------- */
  function showSpells() {
    $('task').hidden = true;
    var box = $('spells');
    box.hidden = false;
    box.innerHTML = '';
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
    var many = alive().length > 1;
    var mode = ELEM[k].mode;
    if (many && (mode === 'single' || mode === 'multi' || mode === 'part' || mode === 'crit')) {
      pickTarget();
    } else {
      B.aim = alive()[0] ? alive()[0].i : 0;
      askTask();
    }
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

  /* ---------- задача ---------- */
  function askTask() {
    var k = B.spell, e = ELEM[k];
    B.task = TASK[k](S.grade || 1);
    var opts = options(B.task.answer);

    $('spells').hidden = true;
    $('task').hidden = false;
    var sp = $('task-spell');
    sp.textContent = e.sign + ' ' + e.name;
    sp.style.background = 'var(--' + k + '-bg)';
    sp.style.color = 'var(--' + k + ')';

    $('task-q').innerHTML = B.task.q + (B.task.sub ? '<small>' + B.task.sub + '</small>' : '');

    var box = $('task-opts');
    box.innerHTML = '';
    opts.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-opt';
      b.textContent = String(v);
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
    B.spell = null; B.task = null;
    showSpells();
    tip('Выбери другое заклинание.');
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

    if (ok) { S.solved++; B.solved++; save(); setTimeout(cast, 420); }
    else {
      S.wrong++; B.wrong++; save();
      tip('Не то число. Верное — <b>' + B.task.answer + '</b>. Ход ушёл, но тебя не задело.');
      pop($('u-me'), 'мимо', 'miss');
      setTimeout(function () { endTurn(true); }, 1050);
    }
  }

  /* ---------- каст ----------
     Урон задаёт заклинание (spellPow), ответ открыл ему дорогу. Форму удара
     ответ задаёт только там, где это наглядно: в Вихре число ударов — это
     второй множитель задачи, ребёнок видит, почему «3 × 4» бьёт четыре раза. */
  function cast() {
    var k = B.spell, e = ELEM[k], P = spellPow(k);
    var me = $('u-me');
    if (me) { me.classList.add('mq-cast'); setTimeout(function () { me.classList.remove('mq-cast'); }, 320); }

    var aimF = B.foes[B.aim];
    var weak = aimF && aimF.weak === k;
    var x2 = weak ? 2 : 1;

    if (e.mode === 'heal') {
      var cut = P * x2;
      var heal = Math.min(Math.round(P * 1.2), B.max - B.hp);
      B.hp = Math.min(B.max, B.hp + Math.round(P * 1.2));
      if (aimF && aimF.hp > 0) hurt(aimF, cut);
      drawMine();
      pop($('u-me'), '+' + Math.round(P * 1.2), 'heal');
      tip('<b>Убыль</b>: отняла ' + cut + ' и вернула тебе ' + Math.round(P * 1.2) + '.' + (weak ? ' Вдвое — он к этому слаб.' : ''));
    }
    else if (e.mode === 'multi') {
      /* «3 × 4» — четыре удара по силе заклинания: число ударов берём из задачи */
      var m = String(B.task.q).split('×');
      var times = Math.max(2, Math.min(12, parseInt(m[1], 10) || 3));
      var per = P * x2;
      var n = 0;
      (function step() {
        if (n >= times || aimF.hp <= 0) {
          tip('<b>Вихрь</b>: ' + times + ' ' + plural(times, 'удар', 'удара', 'ударов') + ' по ' + per + '.');
          return;
        }
        hurt(aimF, per); n++;
        setTimeout(step, 150);
      })();
    }
    else if (e.mode === 'all') {
      var list = alive();
      var each = Math.max(1, Math.round(P * 1.3 / Math.max(1, Math.sqrt(list.length))));
      list.forEach(function (f, idx) {
        setTimeout(function () { hurt(f, f.weak === k ? each * 2 : each); }, idx * 140);
      });
      tip('<b>Раскол</b>: удар поделён на ' + list.length + ' — по ' + each + ' каждому.');
    }
    else if (e.mode === 'part') {
      /* доля: четверть здоровья врага, как и просит дробь */
      var part = Math.max(4, Math.round(aimF.max * 0.25)) * x2;
      hurt(aimF, part);
      tip('<b>Доля</b>: срезала четверть здоровья — ' + part + '.');
    }
    else if (e.mode === 'crit') {
      var dmg = P * 2 * x2;
      hurt(aimF, dmg);
      tip('<b>Тайна</b>: неизвестное найдено — ' + dmg + ' в слабое место.');
    }
    else { /* single */
      var d = P * x2;
      hurt(aimF, d);
      tip('<b>Рост</b>: удар на ' + d + (weak ? ' — вдвое, он к этому слаб.' : '.'));
    }

    B.cool[k] = (e.mode === 'all' || e.mode === 'crit') ? 2 : (e.mode === 'multi' || e.mode === 'part' ? 1 : 0);
    setTimeout(function () { endTurn(false); }, e.mode === 'multi' ? 1600 : 1000);
  }

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function hurt(f, dmg) {
    f.hp = Math.max(0, f.hp - dmg);
    drawFoes();
    var u = $('foes').children[f.i];
    if (u) {
      var art = u.querySelector('.mq-unit__art');
      if (art) { art.classList.add('mq-hit'); setTimeout(function () { art.classList.remove('mq-hit'); }, 240); }
      pop(u, '−' + dmg);
    }
    shake(dmg >= 20 ? 'm' : 's');
  }

  /* ---------- конец хода: бьют враги ---------- */
  function endTurn(fumbled) {
    Object.keys(B.cool).forEach(function (k) { if (B.cool[k] > 0) B.cool[k]--; });

    if (!alive().length) { setTimeout(function () { finish(true); }, 520); return; }

    var foes = alive();
    var i = 0;
    (function nextFoe() {
      if (i >= foes.length) {
        B.busy = false;
        if (B.hp <= 0) { finish(false); return; }
        B.spell = null; B.task = null;
        showSpells();
        tip(fumbled ? 'Твой ход. Можно взять другое заклинание.' : 'Твой ход.');
        return;
      }
      var f = foes[i++];
      var dmg = f.pow + Math.round(Math.random() * 3);
      if (B.shield > 0) { var blocked = Math.min(B.shield, dmg); dmg -= blocked; B.shield -= blocked; }
      B.hp = Math.max(0, B.hp - dmg);
      drawMine();
      var me = $('u-me');
      if (me) {
        var art = me.querySelector('.mq-unit__art');
        if (art) { art.classList.add('mq-hit'); setTimeout(function () { art.classList.remove('mq-hit'); }, 240); }
        pop(me, dmg ? '−' + dmg : 'щит');
      }
      shake('s');
      setTimeout(nextFoe, 520);
    })();
  }

  /* ---------- итог ---------- */
  function finish(won) {
    var rows = [];
    if (won) {
      S.done[B.pi + ':' + B.si] = true;
      var xp = 12 + B.solved * 6 + B.foes.length * 5;
      S.xp += xp;
      rows.push(['✦', 'Опыт +' + xp, 'решено задач: ' + B.solved + (B.wrong ? ', промахов: ' + B.wrong : ', без промахов')]);

      var up = false;
      while (S.xp >= needXP(S.lv)) { S.xp -= needXP(S.lv); S.lv++; up = true; }
      if (up) rows.push(['⬆', S.lv + ' уровень', 'здоровья теперь ' + hpMax()]);

      /* спасение счётника — покемон-слой, но по лору: вернули стёртое число */
      var weakest = B.foes.filter(function (f) { return !f.boss; });
      if (weakest.length && !S.pets.length && B.solved >= 2) {
        S.pets.push('Ням');
        rows.push(['🥚', 'Ням пошёл с тобой', 'клякса распалась, а число внутри вернулось — теперь это твой счётник']);
      }

      var nextOpen = PLACES.findIndex(function (_, i) { return placeOpen(i) && !placeDone(i); });
      $('win-title').textContent = 'Числа на месте';
      $('win-sub').textContent = B.foes.length > 1 ? 'Кляксы разошлись.' : 'Клякса разошлась.';
      $('win-art').innerHTML = '<img src="../mascot/win.webp" alt="">';
      $('win-go').textContent = nextOpen >= 0 && nextOpen !== B.pi ? 'В ' + PLACES[nextOpen].name : 'На карту';
    } else {
      S.hpMax = hpMax();
      rows.push(['💤', 'Силы кончились', 'ничего не потеряно — задачи остались у тебя в голове']);
      rows.push(['↻', 'Попробуй ещё', B.wrong > B.solved ? 'возьми заклинание, к которому клякса слаба' : 'почти получилось']);
      $('win-title').textContent = 'Посох погас';
      $('win-sub').textContent = 'Отдохни и возвращайся.';
      $('win-art').innerHTML = '<img src="../mascot/think.webp" alt="">';
      $('win-go').textContent = 'На карту';
    }
    save();

    $('win-rows').innerHTML = rows.map(function (r) {
      return '<div class="mq-wrow"><span class="mq-wrow__ico">' + r[0] + '</span>' +
             '<span class="mq-wrow__txt">' + r[1] + '<small>' + r[2] + '</small></span></div>';
    }).join('');
    show('win');
  }

  $('win-go').addEventListener('click', function () { show('map'); });

  /* ========================================================
     8. ЮС: всплывающие числа, тряска
     ======================================================== */
  function pop(unitEl, text, kind) {
    if (!unitEl) return;
    var host = $('fx'), hb = host.getBoundingClientRect(), r = unitEl.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'mq-pop' + (kind === 'heal' ? ' mq-pop--heal' : kind === 'miss' ? ' mq-pop--miss' : '');
    s.textContent = text;
    s.style.left = (r.left - hb.left + r.width / 2) + 'px';
    s.style.top = (r.top - hb.top + r.height * .34) + 'px';
    host.appendChild(s);
    setTimeout(function () { s.remove(); }, 820);
  }
  function shake(kind) {
    var el = $('sc-fight');
    var cls = 'mq-shake--' + kind;
    el.classList.remove('mq-shake--s', 'mq-shake--m');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 650);
  }

  /* ========================================================
     9. ЛИСТ «ТВОЙ ПОСОХ»
     ======================================================== */
  function drawSheet() {
    var open = openElems();
    $('sheet-body').innerHTML = ORDER.map(function (k) {
      var e = ELEM[k], has = open.indexOf(k) >= 0;
      return '<div class="mq-scard' + (has ? '' : ' mq-scard--locked') + '">' +
        '<span class="mq-scard__sign" style="background:var(--' + k + '-bg);color:var(--' + k + ')">' + e.sign + '</span>' +
        '<span class="mq-scard__txt"><span class="mq-scard__name">' + e.name + '</span>' +
        '<span class="mq-scard__how">' + e.how + (has ? '' : ' · откроется с ' + e.grade + ' класса') + '</span></span>' +
      '</div>';
    }).join('') +
    '<div class="mq-scard"><span class="mq-scard__sign" style="background:var(--frac-bg);color:var(--frac)">✦</span>' +
    '<span class="mq-scard__txt"><span class="mq-scard__name">Решено задач: ' + S.solved + '</span>' +
    '<span class="mq-scard__how">' + S.lv + ' уровень · здоровья ' + hpMax() +
    (S.pets.length ? ' · с тобой: ' + S.pets.join(', ') : '') + '</span></span></div>';
  }
  $('open-book').addEventListener('click', function () { drawSheet(); $('sheet').hidden = false; });
  $('sheet-close').addEventListener('click', function () { $('sheet').hidden = true; });
  $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) $('sheet').hidden = true; });
  $('sheet-grade').addEventListener('click', function () { $('sheet').hidden = true; show('grade'); });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- старт ---------- */
  show('intro');
  window.nookaMQ = { state: function () { return S; }, fight: function () { return B; }, go: show };
})();
