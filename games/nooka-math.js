/* ============================================================
   NOOKA МАТЕМАТИКА — общий код курса (6–9 лет)

   Здесь то, что понадобится каждому уровню и Арене:
   · dots(n)      — число точками, рядами по пять (как на пальцах);
   · bond(w,a,b)  — мини-схема «целое сверху, две части снизу»;
   · sparks(...)  — искры в точке сцены;
   · hand(...)    — призрачная рука: показывает жест вместо слов.

   Голоса нет намеренно (Артём, 23.09): у многих детей звук выключен.
   Всё, что ребёнку нужно понять, показывает сцена, схема и рука.
   ============================================================ */
(function () {
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* Число точками. total — сколько ячеек рисовать (пустые — контуром):
     на крыше видно и сколько должно быть, и сколько уже есть. */
  function dots(n, opts) {
    opts = opts || {};
    var total = Math.max(opts.total || n, n);
    var d = el('div', 'mh-dots');
    if (opts.size) d.style.setProperty('--d', opts.size + 'px');
    if (opts.color) d.style.setProperty('--c', opts.color);
    d.style.gridTemplateColumns = 'repeat(' + Math.min(5, total) + ',var(--d,7px))';
    for (var i = 0; i < total; i++) d.appendChild(el('i', i < n ? '' : 'off'));
    return d;
  }

  /* Состав числа — школьным «домиком»: на крыше число, под ней две
     клетки-этажа с частями. Так его рисуют в прописях 1 класса, поэтому
     ребёнок и родитель узнают схему сразу (раньше был американский
     «круг сверху, два снизу» — Артём сомневался, поймёт ли шестилетка). */
  function bond(w, a, b) {
    return el('div', 'mh-bond',
      '<span class="w">' + w + '</span><span class="a">' + a + '</span><span class="b">' + b + '</span>');
  }

  function sparks(stage, xPct, yPct, n) {
    for (var i = 0; i < (n || 10); i++) {
      var s = el('div', 'mh-spark');
      var ang = Math.random() * Math.PI * 2, r = 30 + Math.random() * 50;
      s.style.left = xPct + '%';
      s.style.top = yPct + '%';
      s.style.setProperty('--x', Math.cos(ang) * r + 'px');
      s.style.setProperty('--y', Math.sin(ang) * r + 'px');
      stage.appendChild(s);
      setTimeout(function (x) { return function () { x.remove(); }; }(s), 950);
    }
  }

  /* Рука-подсказка: белая перчатка с тенью, ведёт от точки к точке. */
  var HAND = '<svg viewBox="0 0 64 64"><path d="M22 30V12a5 5 0 0 1 10 0v14l2-1a5 5 0 0 1 7 3l1 1a5 5 0 0 1 6 3v1a5 5 0 0 1 6 4v8c0 9-7 17-17 17h-3c-6 0-10-3-13-8l-7-11a5 5 0 0 1 8-6z" ' +
    'fill="#FFFDF8" stroke="#2D1B45" stroke-width="3" stroke-linejoin="round"/></svg>';

  function hand(stage) {
    var h = el('div', 'mh__hand', HAND);
    stage.appendChild(h);
    var timer = null, stopped = false;
    function to(x, y, ms) {
      h.style.transition = ms ? 'left ' + ms + 'ms ease-in-out, top ' + ms + 'ms ease-in-out, opacity .3s' : 'opacity .3s';
      h.style.left = x + '%';
      h.style.top = y + '%';
    }
    return {
      /* Показать жест «перетащи отсюда туда», повторять, пока не остановят */
      drag: function (from, toPt, repeat) {
        stopped = false;
        clearTimeout(timer);
        var loop = function () {
          if (stopped) return;
          to(from[0], from[1], 0);
          h.classList.add('go');
          timer = setTimeout(function () {
            to(toPt[0], toPt[1], 1100);
            timer = setTimeout(function () {
              h.classList.remove('go');
              if (repeat !== false) timer = setTimeout(loop, 900);
            }, 1300);
          }, 450);
        };
        loop();
      },
      stop: function () { stopped = true; clearTimeout(timer); h.classList.remove('go'); },
    };
  }

  /* Курс «Числа-друзья» — свой список, отдельно от реестра ИИ-курса
     (nooka-levels.js): пока математика не вышла, она не должна попадать
     ни в подсчёты на главной, ни на стену оплаты. */
  var COURSE = {
    name: 'Числа-друзья',
    /* Бесплатны первые три уровня, как в ИИ-курсе (Артём, 05.10.2026).
       Арена открыта всем: новые просьбы Няма в ней открывают пройденные
       уровни — играя в Арену, ребёнок сам хочет следующий уровень. */
    free: 3,
    levels: [
      { n: 1, t: 'Светлячки', aha: 'последнее число — это сколько всего', href: 'math-fireflies.html', mid: 'ma1', img: 'math/night-bg.webp' },
      { n: 2, t: 'Домик для числа', aha: 'число — это домик из двух частей', href: 'math-house.html', mid: 'ma2', img: 'math/house-bg.webp' },
      { n: 3, t: 'Рамка десяти', aha: 'десять — это два ряда по пять', href: 'math-frame.html', mid: 'ma3', img: 'math/arena-bg.webp' },
      { n: 4, t: 'Голодный крокодил', aha: 'пасть открыта к большему', href: 'math-croc.html', mid: 'ma4', img: 'math/river-bg.webp' },
      { n: 5, t: 'Прыжки кузнечика', aha: '+3 — это три прыжка вперёд', href: 'math-hop.html', mid: 'ma5', img: 'math/pond-bg.webp' },
      { n: 6, t: 'Убежавшие зайцы', aha: 'вычесть — узнать, сколько осталось', href: 'math-bunny.html', mid: 'ma6', img: 'math/garden-bg.webp' },
      { n: 7, t: 'Через десяток', aha: 'сначала до десяти, потом дальше', href: 'math-train.html', mid: 'ma7', img: 'math/station-bg.webp' },
      { n: 8, t: 'Близнецы', aha: '6 + 7 — это близнецы и ещё один', href: 'math-twins.html', mid: 'ma8', img: 'math/room-bg.webp' },
      { n: 9, t: 'Загадка весов', aha: 'сколько не хватает — вычитаем', href: 'math-scales.html', mid: 'ma9', img: 'math/room-bg.webp' },
      { n: 10, t: 'Лавка', aha: 'одну сумму собирают разными монетами', href: 'math-shop.html', mid: 'ma10', img: 'math/shop-bg.webp' },
    ],
    arena: { t: 'Арена', aha: 'накорми Няма и вырасти питомца', href: 'math-arena.html', img: 'math/nyam-idle.webp' },
  };

  /* ── доступ: уровни после COURSE.free — по оплате ──────────
     Математика живёт вне реестра ИИ-курса, поэтому общий сторож из
     nooka-access.js её не видит — сторожим здесь, тем же экраном оплаты. */
  function levelHere() {
    var f = (location.pathname.split('/').pop() || '').toLowerCase();
    var hit = null;
    COURSE.levels.forEach(function (lv) { if (lv.href && lv.href.toLowerCase() === f) hit = lv; });
    return hit;
  }
  function wall(lv, onClose) {
    var A = window.nookaAccess;
    if (!A) return;
    A.paywall({
      title: 'Этот уровень — в платной части',
      sub: '«' + lv.t + '» из курса «' + COURSE.name + '». Бесплатно открыты первые ' + COURSE.free +
        ' уровня и Арена.',
      onClose: onClose
    });
  }
  function guard() {
    var A = window.nookaAccess, lv = levelHere();
    if (!A || !lv || lv.n <= COURSE.free || A.openAll) return;
    /* пока сервер не ответил, уровень не показываем — иначе ребёнок начнёт
       играть и получит стену посреди дела */
    document.documentElement.style.visibility = 'hidden';
    A.ready.then(function (st) {
      document.documentElement.style.visibility = '';
      if (st.paid) return;
      if (st.offline && A.offlineWall) return A.offlineWall({ hub: 'math.html' });
      wall(lv, function () { location.href = 'math.html'; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else setTimeout(guard, 0);

  /* Страница курса: уровни по порядку, готовые — со ссылкой, остальные «скоро» */
  function hub(box) {
    var done = [];
    try { done = window.nooka ? window.nooka.getCompleted('ma') : []; } catch (e) {}
    function card(lv, isArena) {
      var ready = !!lv.href, ok = lv.n && done.indexOf(lv.n) >= 0;
      var a = el(ready ? 'a' : 'div', 'mhub__lv' + (ready ? '' : ' mhub__lv--soon') + (isArena ? ' mhub__lv--arena' : ''));
      if (ready) a.href = lv.href;
      a.innerHTML =
        '<span class="mhub__shot">' + (lv.img ? '<img src="' + lv.img + '" alt="" loading="lazy">' : '') + '</span>' +
        '<span class="mhub__tx"><i>' + (isArena ? '◆ Мастерская' : 'Уровень ' + lv.n) + (ok ? ' · пройден' : '') + '</i>' +
        '<b>' + lv.t + '</b><span>' + lv.aha + '</span></span>' +
        '<span class="mhub__go">' + (ok ? '✓' : ready ? '→' : 'скоро') + '</span>';
      return a;
    }
    /* Арена — сразу после готовых уровней, «скоро» — в самом низу */
    var ready = COURSE.levels.filter(function (lv) { return lv.href; });
    var soon = COURSE.levels.filter(function (lv) { return !lv.href; });
    ready.forEach(function (lv) { box.appendChild(card(lv)); });
    box.appendChild(card(COURSE.arena, true));
    soon.forEach(function (lv) { box.appendChild(card(lv)); });

    /* Замки на платных уровнях — когда сервер ответил, что доступа нет */
    var A = window.nookaAccess;
    if (A && !A.openAll) A.ready.then(function (st) {
      if (st.paid) return;
      [].forEach.call(box.querySelectorAll('.mhub__lv'), function (a, i) {
        var lv = ready[i];
        if (!lv || lv.n <= COURSE.free) return;
        a.classList.add('mhub__lv--lock');
        var go = a.querySelector('.mhub__go');
        if (go && go.textContent !== '✓') go.innerHTML = '🔒';
        a.addEventListener('click', function (e) { e.preventDefault(); wall(lv); });
      });
    });
  }

  /* После уровня — следующий уровень курса, после последнего — карта курса.
     Раньше с восьми уровней кидало в Арену, и ребёнок терял нить курса
     (Артём, 05.10: «так делать не надо точно»). Арена — отдельной кнопкой на карте. */
  function after(mid) {
    var L = COURSE.levels, i = -1;
    L.forEach(function (lv, k) { if (lv.mid === mid) i = k; });
    var nx = i >= 0 ? L[i + 1] : null;
    return nx && nx.href ? { label: 'Дальше: ' + nx.t + ' →', href: nx.href } : { label: 'К уровням →', href: 'math.html' };
  }
  function finishLevel(mid, xp) {
    var n = after(mid);
    if (window.nooka) window.nooka.missionWin(mid, xp, { nextLabel: n.label, onNext: function () { location.href = n.href; } });
    else location.href = n.href;
  }

  window.nookaMath = { el: el, dots: dots, bond: bond, sparks: sparks, hand: hand, course: COURSE, hub: hub, after: after, finishLevel: finishLevel };
})();
