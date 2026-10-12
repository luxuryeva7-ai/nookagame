/* ============================================================
   АРИФМАГИЯ — слой эффектов. Канвас поверх сцены боя.

   По правилу juice (навык game-feel): одно попадание — это
   5–8 мелких реакций за ~100 мс, и все они transient: вспыхнули
   и вернулись к покою. Тряска — по «травме» с квадратичным
   затуханием (random каждый кадр читается как помехи), удар
   подчёркивается коротким hit-stop, масштаб эффекта привязан
   к важности события, а не ко всем подряд.

   Каждая стихия бьёт по-своему, чтобы действие читалось глазами:
     Рост   +  заряд летит по дуге и лопается
     Убыль  −  искры утекают от врага к герою
     Вихрь  ×  ломаные молнии, по одной на каждый удар
     Раскол ÷  волна расходится кольцом на всех
     Доля   ½  серп срезает полосу
     Тайна  x  вспышка и схождение лучей в точку
   ============================================================ */
(function () {
  'use strict';

  var cv, ctx, W = 0, H = 0, dpr = 1, raf = 0;
  var parts = [], bolts = [], waves = [], last = 0;
  var trauma = 0, tSeed = Math.random() * 100;

  var COLOR = {
    add:  ['#7BE8B0', '#2E9D6B', '#D8FFE9'],
    sub:  ['#FFB08A', '#D8552F', '#FFE2D4'],
    mul:  ['#C0A8FF', '#6B4BE0', '#EDE4FF'],
    div:  ['#8FD3F4', '#1F7FB8', '#DDF1FB'],
    frac: ['#FFD766', '#B07400', '#FFF1C9'],
    eq:   ['#F58ACF', '#A32F86', '#FFDDF2'],
    dead: ['#CFC4DE', '#6B5B80', '#FFFFFF']
  };

  function mount() {
    var host = document.getElementById('fx');
    if (!host) return false;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'mq-fxc';
      host.appendChild(cv);
      ctx = cv.getContext('2d');
    }
    resize();
    return true;
  }
  function resize() {
    if (!cv) return;
    var host = cv.parentNode, r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', function () { if (cv) resize(); });

  /* точка центра элемента в координатах канваса */
  function at(el, ky) {
    if (!el || !cv) return { x: W / 2, y: H / 2 };
    var hb = cv.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - hb.left + r.width / 2, y: r.top - hb.top + r.height * (ky == null ? .42 : ky) };
  }

  /* ---------- частицы ---------- */
  function burst(x, y, el, n, power) {
    var c = COLOR[el] || COLOR.add;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (0.7 + Math.random() * 1.6) * (power || 1);
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp * 60, vy: Math.sin(a) * sp * 60 - 30,
        r: 2 + Math.random() * 4.5,
        life: 1, decay: 1.2 + Math.random() * 1.1,
        c: c[Math.floor(Math.random() * 3)],
        g: 180 + Math.random() * 120
      });
    }
  }

  /* снаряд: летит по дуге, оставляет хвост, в конце лопается.
     Живёт в общем цикле — свой requestAnimationFrame вставал вместе
     с кадрами, и снаряд не долетал, а значит не было ни взрыва, ни тряски. */
  var shots = [];
  function shot(from, to, el, onHit) {
    shots.push({
      from: from, to: to, el: el, onHit: onHit, t: 0, dur: .3,
      mid: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 70 - Math.random() * 30 }
    });
  }
  function stepShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var S2 = shots[i];
      S2.t += dt;
      var k = Math.min(1, S2.t / S2.dur);
      var e = k * k * (3 - 2 * k);
      var x = (1 - e) * (1 - e) * S2.from.x + 2 * (1 - e) * e * S2.mid.x + e * e * S2.to.x;
      var y = (1 - e) * (1 - e) * S2.from.y + 2 * (1 - e) * e * S2.mid.y + e * e * S2.to.y;
      var c = COLOR[S2.el] || COLOR.add;
      parts.push({ x: x, y: y, vx: 0, vy: 0, r: 5.5, life: 1, decay: 3.4, c: c[0], g: 0 });
      parts.push({ x: x, y: y, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30,
                   r: 2.5, life: 1, decay: 2.6, c: c[2], g: 40 });
      if (k >= 1) { var cb = S2.onHit; shots.splice(i, 1); if (cb) cb(); }
    }
  }

  /* молния: ломаная от точки к точке */
  function bolt(from, to, el, life) {
    var pts = [], seg = 7;
    for (var i = 0; i <= seg; i++) {
      var k = i / seg;
      var off = i === 0 || i === seg ? 0 : (Math.random() - .5) * 46;
      pts.push({ x: from.x + (to.x - from.x) * k + off, y: from.y + (to.y - from.y) * k + off * .5 });
    }
    bolts.push({ pts: pts, el: el, life: 1, decay: 1 / (life || .22) });
  }

  /* кольцо-волна */
  function wave(x, y, el, r1) {
    waves.push({ x: x, y: y, el: el, r: 8, max: r1 || 160, life: 1, decay: 1.8 });
  }

  /* ---------- тряска по «травме» ---------- */
  function addTrauma(v) { trauma = Math.min(1, trauma + v); }

  function applyShake(dt) {
    var host = document.getElementById('sc-fight');
    if (!host) return;
    if (trauma <= 0) { host.style.transform = ''; return; }
    trauma = Math.max(0, trauma - 1.5 * dt);
    var s = trauma * trauma;                            /* квадратично: мелкое почти не двигает */
    tSeed += dt * 32;
    host.style.transform = 'translate(' + (12 * s * Math.sin(tSeed * 1.7)).toFixed(2) + 'px,' +
                                          (8 * s * Math.sin(tSeed * 2.3)).toFixed(2) + 'px)';
  }

  /* ---------- цикл ----------
     requestAnimationFrame не тикает, пока вкладка скрыта. Логика боя при этом
     идёт на таймерах, поэтому без страховки урон применяется, а эффект копится
     и вываливается лавиной при возврате. Сторож ниже замечает тишину и
     доводит кадры таймером, а копить частицы не даёт. */
  var lastTick = 0, guard = 0;
  function startGuard() {
    if (guard) return;
    guard = setInterval(function () {
      if (!raf) return;
      if (performance.now() - lastTick > 400) {
        /* ограничиваем лавину, а не стираем всё: иначе при возврате
           на вкладку экран пуст, хотя бой шёл */
        if (parts.length > 400) parts.splice(0, parts.length - 400);
        loop(performance.now());
      }
    }, 200);
  }

  function loop(now) {
    lastTick = now || performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    var dt = Math.min(.05, (now - last) / 1000) || .016;
    last = now;
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    stepShots(dt);

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + p.life * 0.6), 0, 6.283); ctx.fill();
    }

    for (var b = bolts.length - 1; b >= 0; b--) {
      var L = bolts[b];
      L.life -= L.decay * dt;
      if (L.life <= 0) { bolts.splice(b, 1); continue; }
      var c = COLOR[L.el] || COLOR.mul;
      ctx.globalAlpha = Math.max(0, L.life);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = c[0]; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(L.pts[0].x, L.pts[0].y);
      for (var j = 1; j < L.pts.length; j++) ctx.lineTo(L.pts[j].x, L.pts[j].y);
      ctx.stroke();
      ctx.strokeStyle = c[2]; ctx.lineWidth = 2.6; ctx.stroke();
    }

    for (var w = waves.length - 1; w >= 0; w--) {
      var V = waves[w];
      V.life -= V.decay * dt;
      if (V.life <= 0) { waves.splice(w, 1); continue; }
      var cc = COLOR[V.el] || COLOR.div;
      V.r = V.max * (1 - V.life);
      ctx.globalAlpha = Math.max(0, V.life * .9);
      ctx.strokeStyle = cc[0]; ctx.lineWidth = 6 * V.life + 1;
      ctx.beginPath(); ctx.arc(V.x, V.y, V.r, 0, 6.283); ctx.stroke();
    }

    ctx.globalAlpha = 1;
    applyShake(dt);
  }

  /* ---------- hit-stop: короткая пауза на импакт ---------- */
  var stopUntil = 0;
  function hitStop(ms) { stopUntil = Math.max(stopUntil, performance.now() + (ms || 70)); }
  function frozen() { return performance.now() < stopUntil; }

  /* ---------- «пружинка» на элементе ---------- */
  function pop(el, scale) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'scale(' + (scale || 1.18) + ',' + (2 - (scale || 1.18)) + ')';
    requestAnimationFrame(function () {
      el.style.transition = 'transform .22s cubic-bezier(.34,1.56,.64,1)';
      el.style.transform = '';
    });
  }

  /* ============================================================
     ПУБЛИЧНОЕ: один вызов на событие, тир задаёт силу
     ============================================================ */
  var FX = {
    ready: function () {
      if (!cv) mount();
      if (!raf) { last = performance.now(); lastTick = last; raf = requestAnimationFrame(loop); }
      startGuard();
      return !!ctx;
    },
    off:   function () {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (guard) { clearInterval(guard); guard = 0; }
      parts.length = 0; bolts.length = 0; waves.length = 0; shots.length = 0; trauma = 0;
      var h = document.getElementById('sc-fight'); if (h) h.style.transform = '';
    },
    resize: resize,
    hitStop: hitStop, frozen: frozen, pop: pop,

    /* герой кастует: замах и свечение */
    castStart: function (heroEl, el) {
      if (!FX.ready()) return;
      var p = at(heroEl);
      burst(p.x, p.y, el, 10, .55);
      pop(heroEl && heroEl.querySelector('.mq-unit__art'), 1.12);
      addTrauma(.1);
    },

    /* один удар по цели: тир small/medium/large */
    strike: function (heroEl, foeEl, el, tier) {
      if (!FX.ready()) return;
      var from = at(heroEl, .35), to = at(foeEl, .45);
      var big = tier === 'large', mid = tier === 'medium';
      shot(from, to, el, function () {
        burst(to.x, to.y, el, big ? 34 : mid ? 20 : 12, big ? 1.5 : 1);
        wave(to.x, to.y, el, big ? 150 : 96);
        pop(foeEl && foeEl.querySelector('.mq-unit__art'), big ? 1.26 : 1.16);
        addTrauma(big ? .55 : mid ? .32 : .18);
        hitStop(big ? 95 : mid ? 65 : 45);
      });
    },

    /* вихрь: молния на каждый удар, без снаряда */
    zap: function (heroEl, foeEl, el, n) {
      if (!FX.ready()) return;
      var from = at(heroEl, .35), to = at(foeEl, .5);
      bolt(from, to, el, .2);
      burst(to.x, to.y, el, 9, .9);
      pop(foeEl && foeEl.querySelector('.mq-unit__art'), 1.12);
      addTrauma(.2); hitStop(40);
    },

    /* раскол: кольцо по всем целям */
    ring: function (heroEl, foeEls, el) {
      if (!FX.ready()) return;
      var c = at(heroEl, .4);
      wave(c.x, c.y, el, Math.max(W, 220));
      (foeEls || []).forEach(function (f, i) {
        setTimeout(function () {
          var p = at(f, .45);
          burst(p.x, p.y, el, 16, 1); wave(p.x, p.y, el, 90);
          pop(f && f.querySelector('.mq-unit__art'), 1.14);
        }, i * 110);
      });
      addTrauma(.4); hitStop(70);
    },

    /* убыль: искры утекают от врага к герою */
    drain: function (heroEl, foeEl, el) {
      if (!FX.ready()) return;
      var from = at(foeEl, .5), to = at(heroEl, .4);
      for (var i = 0; i < 14; i++) (function (i) {
        setTimeout(function () { shot(from, to, el); }, i * 28);
      })(i);
      setTimeout(function () {
        var p = at(heroEl, .4);
        burst(p.x, p.y, 'add', 16, .8);
        pop(heroEl && heroEl.querySelector('.mq-unit__art'), 1.14);
      }, 420);
      addTrauma(.18);
    },

    /* чудовище повержено: рассыпается */
    slay: function (foeEl, el) {
      if (!FX.ready()) return;
      var p = at(foeEl, .45);
      burst(p.x, p.y, el, 26, 1.2);
      setTimeout(function () { burst(p.x, p.y, 'dead', 30, 1.5); wave(p.x, p.y, 'dead', 170); }, 90);
      addTrauma(.5); hitStop(110);
    },

    /* по герою прилетело */
    hurtMe: function (heroEl) {
      if (!FX.ready()) return;
      var p = at(heroEl, .4);
      burst(p.x, p.y, 'sub', 14, .9);
      pop(heroEl && heroEl.querySelector('.mq-unit__art'), 1.14);
      addTrauma(.26); hitStop(50);
    },

    /* промах — мягко, без тряски */
    debug: function () { return { raf: raf, ctx: !!ctx, W: W, H: H, parts: parts.length, shots: shots.length, bolts: bolts.length, waves: waves.length, trauma: trauma }; },

    miss: function (heroEl) {
      if (!FX.ready()) return;
      var p = at(heroEl, .4);
      burst(p.x, p.y, 'dead', 8, .5);
    }
  };

  window.nookaFX = FX;
})();
