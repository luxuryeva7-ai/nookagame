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

  /* Мини-схема состава числа. Та же, что рисуется поверх домика,
     только маленькая — для альбома и итога. */
  function bond(w, a, b) {
    var box = el('div', 'mh-bond',
      '<svg viewBox="0 0 52 52"><line x1="26" y1="11" x2="11" y2="41" stroke="#CBB9F5" stroke-width="2.5"/>' +
      '<line x1="26" y1="11" x2="41" y2="41" stroke="#CBB9F5" stroke-width="2.5"/></svg>' +
      '<span class="w">' + w + '</span><span class="a">' + a + '</span><span class="b">' + b + '</span>');
    return box;
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

  window.nookaMath = { el: el, dots: dots, bond: bond, sparks: sparks, hand: hand };
})();
