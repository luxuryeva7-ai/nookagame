/* ============================================================
   МОЗГ — честный классификатор рисунков.

   Тот же алгоритм, что работает в уровнях на draw.html: признаки
   считаются по растру, предсказание — ближайший пример (kNN, k=1),
   точность — проверка каждого примера по всем остальным.
   Никакой имитации: мало примеров или примеры похожи — промахнётся.

   Вынесен отдельно, чтобы песочницы и новые режимы брали один и тот
   же мозг. draw.html намеренно не трогаем: он работает и пройден
   детьми, свой экземпляр этих функций у него остаётся.

   Пользуются: sandbox-world.html
   ============================================================ */
(function () {
  'use strict';

  var GRID = 5;      // сетка плотности чернил
  var RING = 4;      // кольца от центра: круглое или угловатое
  var SECT = 8;      // секторы по кругу: где выступы
  var MIN_INK = 150; // меньше — считаем, что холст пуст

  /* ── признаки рисунка ──
     Нормируем по рамке рисунка, поэтому размер и положение на доске
     не важны — важна форма. */
  function features(cv) {
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var d = ctx.getImageData(0, 0, W, H).data;
    var minX = W, minY = H, maxX = -1, maxY = -1, ink = 0;
    var x, y;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 40) {
          ink++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || ink < MIN_INK) return null;

    var bw = Math.max(1, maxX - minX + 1), bh = Math.max(1, maxY - minY + 1);
    var cells = new Array(GRID * GRID).fill(0);
    var rings = new Array(RING).fill(0);
    var sects = new Array(SECT).fill(0);
    var cx = minX + bw / 2, cy = minY + bh / 2;

    for (y = minY; y <= maxY; y++) {
      for (x = minX; x <= maxX; x++) {
        if (d[(y * W + x) * 4 + 3] <= 40) continue;
        var gx = Math.min(GRID - 1, Math.floor((x - minX) / bw * GRID));
        var gy = Math.min(GRID - 1, Math.floor((y - minY) / bh * GRID));
        cells[gy * GRID + gx]++;
        var dx = (x - cx) / (bw / 2), dy = (y - cy) / (bh / 2);
        var r = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
        rings[Math.min(RING - 1, Math.floor(r * RING))]++;
        var a = Math.atan2(dy, dx) / (Math.PI * 2);
        if (a < 0) a += 1;
        sects[Math.min(SECT - 1, Math.floor(a * SECT))]++;
      }
    }

    var f = cells.map(function (c) { return c / ink; })
      .concat(rings.map(function (c) { return c / ink; }))
      .concat(sects.map(function (c) { return c / ink; }));
    f.push(Math.max(0, Math.min(1, (bw / bh) / 2)));   // пропорция рамки
    f.push(Math.min(1, ink / (bw * bh)));              // плотность заливки
    return { f: f, ink: ink, box: [minX, minY, bw, bh] };
  }

  function dist(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  }

  /* ── предсказание ──
     Уверенность — из того, насколько ближайший «свой» ближе ближайшего
     «чужого». Всё далеко — Нейро честно говорит, что не знает. */
  function predict(model, f) {
    if (!model || !model.length) return null;
    var best = {}, near = null;
    model.forEach(function (m, i) {
      var d = dist(m.f, f);
      if (best[m.label] === undefined || d < best[m.label].d) best[m.label] = { d: d, i: i };
      if (!near || d < near.d) near = { d: d, i: i, label: m.label };
    });
    var labels = Object.keys(best).sort(function (a, b) { return best[a].d - best[b].d; });
    var own = best[labels[0]].d;
    var other = labels[1] !== undefined ? best[labels[1]].d : own * 2.2;
    var conf = Math.round(Math.max(52, Math.min(97, other / (own + other) * 100)));

    /* Доли по всем классам — для живой шкалы в песочнице: чем ближе
       класс, тем выше доля. Это не вероятности модели, а понятная
       ребёнку мера похожести, и названа она так же — «похоже». */
    var inv = labels.map(function (l) { return 1 / (best[l].d + 0.02); });
    var sum = inv.reduce(function (a, b) { return a + b; }, 0);
    var shares = labels.map(function (l, k) {
      return { label: l, share: Math.round(inv[k] / sum * 100), d: best[l].d };
    });

    return {
      label: labels[0], conf: conf, near: near, shares: shares,
      unsure: own > 0.30, dist: own,
    };
  }

  /* ── точность: каждый пример предсказываем по всем остальным ──
     Настоящая проверка на отложенном примере, а не выдуманное число.
     Пример с чужой подписью почти всегда не угадывается — грязь в
     наборе видно сразу. */
  function selfCheck(model) {
    if (!model || model.length < 3) {
      return { ok: 0, total: model ? model.length : 0, acc: 0, wrong: [], enough: false };
    }
    var ok = 0, wrong = [];
    model.forEach(function (m, i) {
      var rest = model.filter(function (_, k) { return k !== i; });
      var p = predict(rest, m.f);
      if (p && p.label === m.label) ok++;
      else wrong.push({ i: i, was: m.label, said: p ? p.label : null });
    });
    return {
      ok: ok, total: model.length, acc: Math.round(ok / model.length * 100),
      wrong: wrong, enough: true,
    };
  }

  /* ── что с чем путается: пары классов, на которых модель ошибается ── */
  function confusions(model) {
    var chk = selfCheck(model);
    var pairs = {};
    chk.wrong.forEach(function (w) {
      if (!w.said) return;
      var key = [w.was, w.said].sort().join(' ↔ ');
      pairs[key] = (pairs[key] || 0) + 1;
    });
    return Object.keys(pairs)
      .map(function (k) { return { pair: k, n: pairs[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  window.nookaBrain = {
    features: features,
    dist: dist,
    predict: predict,
    selfCheck: selfCheck,
    confusions: confusions,
    MIN_INK: MIN_INK,
  };
})();
