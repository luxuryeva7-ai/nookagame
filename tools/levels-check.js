/* Автопроверка уровней.

   Каждый уровень открывается во фрейме размером с телефон (360×600), и бот
   играет в него: жмёт главную кнопку, перебирает варианты, рисует на доске,
   двигает ползунки. По пути записывает то, что уже ломалось у детей:

   - тупик: на экране не осталось ни одной кнопки;
   - зацикливание: экран не меняется, что бы бот ни нажимал;
   - кнопки под нижним краем экрана: их не видно без прокрутки;
   - ошибки JavaScript.

   Пройти уровень правильно бот не обязан. «Не дошёл» значит «проверь руками»,
   а не «сломано»: уровни с загадкой (собрать точный заказ, найти перелом)
   случайным перебором не решаются.

   Запуск — tools/check-levels.py (поднимает сайт и заглушку сервера, чтобы
   платные уровни открылись). Страницу можно открыть и руками: без заглушки
   платные уровни упрутся в стену доступа, бот так и запишет. */
(function () {
  var W = 360, H = 600;
  var q = new URLSearchParams(location.search);
  var PARALLEL = +q.get('parallel') || 4;
  var STEPS = +q.get('steps') || 45;
  var STEP_MS = 300;
  var ONLY = (q.get('only') || '').split(',').filter(Boolean);

  /* Кнопки, которые уводят с уровня, — их бот не жмёт никогда */
  var SKIP = /Назад|К уровням|Домой|Выход|Вернуться|Поделит|Сохранит|Скачат|В коллекцию|Покажи родителям|Обновить|Дальше:|🏠|^←\s*$/i;
  /* Кнопки, которые сбрасывают сделанное, — жмёт, только если больше нечего:
     в «Шарике» «Поставить заново» — единственный путь вперёд */
  var RESET = /Заново|Сначала|Стереть|✕/i;
  /* Главная кнопка экрана: её жмём первой, пока экран меняется */
  var MAIN = /nk-btn|--cta|--pri|--ok/;
  var SELECTED = /(^|\s)(on|sel|active)(\s|$)|--sel|--on\b/;
  var WIN = /Миссия пройдена|Отличная тренировка|Уровень пройден/;

  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ── что проверяем ─────────────────────────────────────────── */
  function entries() {
    var out = [];
    (window.nookaLevels ? window.nookaLevels.games : []).forEach(function (g) {
      g.levels.forEach(function (l) {
        out.push({ game: g.name, n: String(l.n), t: l.t, href: l.href, kind: 'level' });
      });
      (g.extras || []).forEach(function (e) {
        out.push({ game: g.name, n: '★', t: e.t, href: e.href, kind: 'level' });
      });
      if (g.sandbox) out.push({ game: g.name, n: '◆', t: g.sandbox.t, href: g.sandbox.href, kind: 'sandbox' });
    });
    if (ONLY.length) out = out.filter(function (e) {
      return ONLY.some(function (w) { return e.href.indexOf(w) > -1; });
    });
    return out;
  }

  function levelUrl(href) {
    var parts = href.split('#');
    var u = '/games/' + parts[0] + (parts[0].indexOf('?') > -1 ? '&' : '?') + '_chk=' + Date.now();
    return parts[1] ? u + '#' + parts[1] : u;
  }

  /* ── взгляд на экран фрейма ────────────────────────────────── */
  function label(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28); }

  function buttons(doc, withReset) {
    return Array.prototype.filter.call(doc.querySelectorAll('button'), function (b) {
      var l = label(b);
      return b.offsetParent !== null && !b.disabled && !SKIP.test(l) && (withReset || !RESET.test(l));
    });
  }
  function inView(el, win) {
    var r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= -1 && r.bottom <= win.innerHeight + 1;
  }
  function below(el, win) { return el.getBoundingClientRect().top >= win.innerHeight - 4; }
  function scrollable(el, win) {
    for (var p = el.parentElement; p; p = p.parentElement) {
      var oy = win.getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 4) return true;
    }
    var d = el.ownerDocument.documentElement;
    return d.scrollHeight > win.innerHeight + 4 && win.getComputedStyle(el.ownerDocument.body).overflowY !== 'hidden';
  }
  function signature(doc) {
    return doc.body.innerHTML.length + '|' + doc.body.innerText.replace(/\s+/g, ' ').slice(0, 1500);
  }
  function screenText(doc, n) { return doc.body.innerText.replace(/\s+/g, ' ').trim().slice(0, n || 80); }

  /* ── руки бота ─────────────────────────────────────────────── */
  function pointer(win, el, type, x, y) {
    el.dispatchEvent(new win.PointerEvent(type, {
      clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true
    }));
  }
  /* Кот из трёх штрихов: на досках рисования этого хватает, чтобы Нейро было что узнать */
  function draw(win, cv) {
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var at = function (p) { return [r.left + p[0] * r.width, r.top + p[1] * r.height]; };
    var stroke = function (pts) {
      var a = at(pts[0]); pointer(win, cv, 'pointerdown', a[0], a[1]);
      for (var i = 1; i < pts.length; i++) { a = at(pts[i]); pointer(win, cv, 'pointermove', a[0], a[1]); }
      pointer(win, cv, 'pointerup', a[0], a[1]);
    };
    var c = [];
    for (var i = 0; i <= 30; i++) { var t = i / 30 * Math.PI * 2; c.push([.5 + .22 * Math.cos(t), .52 + .22 * Math.sin(t)]); }
    stroke(c); stroke([[.36, .35], [.39, .22], [.47, .33]]); stroke([[.64, .35], [.61, .22], [.53, .33]]);
    return true;
  }
  function setRange(win, input, v) {
    var set = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set;
    set.call(input, String(v));
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  }
  /* Уровни, где играют не кнопками, а самой картинкой: фонарик ведут пальцем,
     перелом ищут касанием по снимку, книгу ставят на карту. Ведём и касаемся
     по сетке, пока на экране не появится новая кнопка или экран не сменится. */
  async function sweep(doc, win, before) {
    var areas = Array.prototype.filter.call(doc.querySelectorAll('svg, canvas'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width * r.height > 15000 && inView(el, win);
    });
    for (var k = 0; k < areas.length; k++) {
      var el = areas[k], r = el.getBoundingClientRect();
      for (var gy = 0.12; gy < 0.95; gy += 0.13) {
        for (var gx = 0.1; gx < 0.95; gx += 0.13) {
          var x = r.left + gx * r.width, y = r.top + gy * r.height;
          var target = doc.elementFromPoint(x, y) || el;
          pointer(win, target, 'pointermove', x, y);
          if (buttons(doc).length > before) return true;
        }
      }
      for (gy = 0.2; gy < 0.9; gy += 0.2) {
        for (gx = 0.2; gx < 0.9; gx += 0.2) {
          x = r.left + gx * r.width; y = r.top + gy * r.height;
          target = doc.elementFromPoint(x, y) || el;
          pointer(win, target, 'pointerdown', x, y);
          pointer(win, target, 'pointerup', x, y);
          target.dispatchEvent(new win.MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
          await wait(60);
          if (buttons(doc).length !== before) return true;
        }
      }
    }
    return false;
  }

  /* Уровень пройден — значит выход из круга был: повторы кнопок не в счёт */
  function passed(R) {
    if (R.status === 'пройден') R.issues = R.issues.filter(function (i) { return i.sev !== 'loop'; });
    R.issues.forEach(function (i) { if (i.sev === 'loop') i.sev = 'warn'; });
    return R;
  }

  /* Всё, что откликается на палец, кроме кнопок: трубы в «Цепочке нейронов»,
     карточки, клетки поля. Узнаём по курсору-руке. */
  function tappables(doc, win) {
    var out = [];
    var els = doc.querySelectorAll('div, span, li, img, svg, g, circle, rect, path');
    for (var i = 0; i < els.length && out.length < 60; i++) {
      var el = els[i];
      if (el.closest('button')) continue;
      if (win.getComputedStyle(el).cursor !== 'pointer') continue;
      var r = el.getBoundingClientRect(), area = r.width * r.height;
      if (area < 80 || area > 40000 || !inView(el, win)) continue;
      if (SKIP.test(label(el))) continue;
      out.push(el);
    }
    return out;
  }
  function tap(win, el) {
    var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    pointer(win, el, 'pointerdown', x, y);
    pointer(win, el, 'pointerup', x, y);
    el.dispatchEvent(new win.MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
  }

  /* ── один уровень ──────────────────────────────────────────── */
  function load(frame, url) {
    return new Promise(function (res) {
      var done = false;
      frame.onload = function () { if (!done) { done = true; res(true); } };
      setTimeout(function () { if (!done) { done = true; res(false); } }, 9000);
      frame.src = url;
    });
  }

  async function play(entry, frame) {
    var R = { entry: entry, status: '', steps: 0, errors: [], issues: [], tail: [] };
    var st = { won: false };
    var addIssue = function (sev, text) {
      if (!R.issues.some(function (i) { return i.text === text; })) R.issues.push({ sev: sev, text: text });
    };
    var ok = await load(frame, levelUrl(entry.href));
    var win = frame.contentWindow, doc = frame.contentDocument;
    if (!ok || !doc || !doc.body) { R.status = 'не загрузился'; return R; }
    var page = win.location.pathname;

    win.addEventListener('error', function (e) { R.errors.push(String(e.message || e).slice(0, 140)); });
    win.addEventListener('unhandledrejection', function (e) {
      R.errors.push('promise: ' + String(e.reason && (e.reason.message || e.reason)).slice(0, 120));
    });
    var hook = function () {
      var n = win.nooka;
      if (!n || n.__chk) return;
      ['missionWin', 'completeMission'].forEach(function (k) {
        if (typeof n[k] !== 'function') return;
        var orig = n[k];
        n[k] = function () { st.won = true; return orig.apply(this, arguments); };
      });
      n.__chk = true;
    };
    await wait(1300);
    hook();

    if (doc.getElementById('nkpw')) { R.status = 'закрыт стеной'; return R; }

    var steps = entry.kind === 'sandbox' ? 14 : STEPS;
    var prev = '', same = 0, tried = {}, seen = {}, presses = {};

    for (var s = 0; s < steps; s++) {
      R.steps = s;
      try { hook(); } catch (e) {}
      if (win.location.pathname !== page) { R.status = st.won ? 'пройден' : 'ушёл со страницы'; return passed(R); }
      if (st.won || WIN.test(doc.body.innerText)) { R.status = 'пройден'; return passed(R); }

      var sig = signature(doc);
      if (sig === prev) same++; else { same = 0; tried = {}; }
      prev = sig;

      var all = buttons(doc);
      /* Для вёрстки берём и неактивные кнопки: «Запустить» пустой программы
         серая, но её место на экране важно так же. Экраны различаем по набору
         кнопок — начало текста у всех экранов уровня одинаковое. */
      var laid = Array.prototype.filter.call(doc.querySelectorAll('button'), function (b) {
        return b.offsetParent !== null && !SKIP.test(label(b));
      });
      var key = laid.map(label).sort().join('|');

      /* вёрстка: видно ли, чем играть */
      if (!seen[key]) {
        seen[key] = true;
        var shown = laid.filter(function (b) { return inView(b, win); });
        var hidden = laid.filter(function (b) { return below(b, win); });
        if (hidden.length) {
          var names = hidden.slice(0, 4).map(label).join(', ');
          var lost = hidden.filter(function (b) { return !scrollable(b, win); });
          /* «нечего нажать» считаем по рабочим кнопкам: серые на экране не помогают */
          var usable = all.filter(function (b) { return inView(b, win); });
          if (lost.length) addIssue('bad', 'не достать даже прокруткой: ' + lost.slice(0, 3).map(label).join(', '));
          else if (all.length && !usable.length) addIssue('bad', 'на экране нечего нажать, всё под нижним краем: ' + names);
          else if (hidden.some(function (b) { return MAIN.test(b.className); }) &&
                   !shown.some(function (b) { return MAIN.test(b.className); })) {
            /* Одной кнопки хватает, если это главная: «Запустить» под краем
               в «Ночной смене» — ребёнок собрал программу и не видит, чем её пустить. */
            addIssue('warn', 'главная кнопка под нижним краем: ' +
              hidden.filter(function (b) { return MAIN.test(b.className); }).slice(0, 2).map(label).join(', '));
          }
          else if (entry.kind === 'level' && hidden.length >= 3 && hidden.length >= shown.length) {
            addIssue('warn', 'под экраном ' + hidden.length + ' из ' + laid.length + ' кнопок: ' + names);
          }
        }
      }

      var cv = Array.prototype.find.call(doc.querySelectorAll('canvas'), function (c) { return c.offsetParent !== null; });
      var ranges = doc.querySelectorAll('input[type=range]');
      var quote = ((doc.body.innerText.match(/«([^»]{3,90})»/) || [])[1] || '').toLowerCase();

      if (same > 0) {
        var nums = quote.match(/\d+/g) || [];
        Array.prototype.forEach.call(ranges, function (el, i) {
          var v = nums[i] !== undefined ? Math.min(+nums[i], +el.max) : Math.round(+el.min + Math.random() * (+el.max - +el.min));
          setRange(win, el, v);
        });
        if (cv) draw(win, cv);
      }

      if (!all.length) {
        if (cv && draw(win, cv)) { await wait(STEP_MS); continue; }
        var resets = buttons(doc, true);
        if (resets.length && same > 0) {
          R.tail.push(label(resets[0]));
          if (R.tail.length > 8) R.tail.shift();
          resets[0].click();
          await wait(STEP_MS);
          continue;
        }
        var taps = tappables(doc, win);
        if (taps.length) {
          var el = taps[Math.floor(Math.random() * taps.length)];
          R.tail.push('(касание)');
          if (R.tail.length > 8) R.tail.shift();
          tap(win, el);
          await wait(STEP_MS);
          continue;
        }
        if (await sweep(doc, win, 0)) { await wait(STEP_MS); continue; }
        /* Кнопки прячутся на время анимации — шарик катится, Нейро думает.
           Текст при этом может не меняться: шарик катится только в картинке.
           Ждём до 20 секунд, тупик — если 12 секунд подряд ничего не происходит. */
        var still = 0, last = signature(doc);
        for (var t = 0; t < 40 && still < 24 && !buttons(doc, true).length; t++) {
          await wait(500);
          var now = signature(doc);
          if (now === last) still++; else { still = 0; last = now; }
        }
        if (buttons(doc, true).length || st.won || WIN.test(doc.body.innerText)) continue;
        R.status = 'тупик';
        R.tail.push('экран: ' + screenText(doc, 120));
        return passed(R);
      }

      if (same >= 10) {
        R.status = 'зацикливание';
        R.tail.push('экран: ' + screenText(doc, 100));
        R.tail.push('кнопки: ' + all.slice(0, 6).map(label).join(' | '));
        return passed(R);
      }
      if (same >= 4 && same % 3 === 1 && await sweep(doc, win, all.length)) { await wait(STEP_MS); continue; }

      var pick = null;
      if (quote) {
        pick = all.filter(function (b) {
          var l = label(b).toLowerCase();
          return l.length >= 2 && !SELECTED.test(b.className) && quote.indexOf(l) > -1;
        })[0] || null;
      }
      if (!pick) {
        var main = all.filter(function (b) { return MAIN.test(b.className); });
        if (main.length && same < 2) pick = main[main.length - 1];
      }
      if (!pick) {
        var rest = all.filter(function (b) { return !tried[label(b)]; });
        var pool = rest.length ? rest : all;
        pick = pool[Math.floor(Math.random() * pool.length)];
      }
      tried[label(pick)] = true;
      presses[label(pick)] = (presses[label(pick)] || 0) + 1;
      if (presses[label(pick)] === 15 && entry.kind === 'level') {
        /* Так выглядел «Ещё разок» с поломанным счётчиком кругов: экран каждый
           раз новый, но «Дальше» не появляется, сколько кругов ни пройди. */
        addIssue('loop', '15 раз жал «' + label(pick) + '», а уровень не кончился — проверь, что выход есть');
      }
      R.tail.push(label(pick));
      if (R.tail.length > 8) R.tail.shift();
      pick.click();
      await wait(STEP_MS);
    }
    R.status = entry.kind === 'sandbox' ? 'открылась' : 'не дошёл';
    return passed(R);
  }

  /* ── прогон и отчёт ────────────────────────────────────────── */
  var results = [];

  function verdict(r) {
    if (r.errors.length || r.status === 'тупик' || r.status === 'не загрузился') return 'bad';
    if (r.issues.some(function (i) { return i.sev === 'bad'; })) return 'bad';
    if (r.status === 'пройден' || r.status === 'открылась') {
      return r.issues.length ? 'warn' : 'ok';
    }
    return 'warn';
  }

  function render() {
    var box = document.getElementById('rows');
    var html = '', game = '';
    results.forEach(function (r) {
      if (r.entry.game !== game) { game = r.entry.game; html += '<h2>' + game + '</h2>'; }
      var v = verdict(r);
      var notes = [];
      if (r.status !== 'пройден' && r.status !== 'открылась') notes.push(r.status + (r.status === 'не дошёл' ? ' за ' + r.steps + ' шагов' : ''));
      r.issues.forEach(function (i) { notes.push(i.text); });
      r.errors.forEach(function (e) { notes.push('ошибка JS: ' + e); });
      html += '<div class="r ' + v + '"><b>' + ({ ok: '✓', warn: '⚠', bad: '✗' })[v] + '</b>' +
        '<span class="n">' + r.entry.n + '</span><span class="t">' + r.entry.t +
        '<i>' + r.entry.href + '</i></span><span class="x">' +
        (notes.length ? notes.join('<br>') : (r.status === 'пройден' ? 'пройден за ' + r.steps + ' шагов' : r.status)) +
        (v !== 'ok' && r.tail.length ? '<small>последнее: ' + r.tail.join(' → ') + '</small>' : '') +
        '</span></div>';
    });
    box.innerHTML = html;
    var c = { ok: 0, warn: 0, bad: 0 };
    results.forEach(function (r) { c[verdict(r)]++; });
    document.getElementById('sum').textContent = '✓ ' + c.ok + '   ⚠ ' + c.warn + '   ✗ ' + c.bad +
      '   · проверено ' + results.length;
  }

  async function run() {
    var list = entries();
    var started = Date.now();
    var order = list.slice();
    results = [];
    document.getElementById('go').disabled = true;
    document.getElementById('state').textContent = 'Проверяю ' + list.length + ' страниц…';
    var frames = document.getElementById('frames');
    frames.innerHTML = '';
    var queue = list.slice();
    var done = {};
    var workers = [];
    for (var i = 0; i < Math.min(PARALLEL, list.length); i++) {
      var f = document.createElement('iframe');
      f.width = W; f.height = H;
      frames.appendChild(f);
      workers.push((async function (frame) {
        while (queue.length) {
          var e = queue.shift();
          var r;
          try { r = await play(e, frame); }
          catch (err) { r = { entry: e, status: 'сбой проверки', steps: 0, errors: [String(err).slice(0, 140)], issues: [], tail: [] }; }
          done[order.indexOf(e)] = r;
          results = order.map(function (x, k) { return done[k]; }).filter(Boolean);
          render();
        }
        frame.src = 'about:blank';
      })(f));
    }
    await Promise.all(workers);
    var secs = Math.round((Date.now() - started) / 1000);
    document.getElementById('state').textContent = 'Готово за ' + Math.floor(secs / 60) + ' мин ' + (secs % 60) + ' с';
    document.getElementById('go').disabled = false;
    window.__levelsCheck = { seconds: secs, results: results.map(function (r) {
      return { game: r.entry.game, n: r.entry.n, title: r.entry.t, href: r.entry.href, kind: r.entry.kind,
        verdict: verdict(r), status: r.status, steps: r.steps, issues: r.issues, errors: r.errors, tail: r.tail };
    }) };
    if (q.get('report')) {
      fetch('/__report', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.__levelsCheck) }).catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('go').onclick = run;
    document.getElementById('state').textContent = entries().length + ' страниц в реестре';
    if (q.get('auto')) run();
  });
})();
