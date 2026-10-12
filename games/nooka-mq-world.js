/* ============================================================
   АРИФМАГИЯ — живой мир. Числоград и локации.

   Карта раньше была картинкой с жёлтыми точками — мёртвой.
   Здесь она живёт: над городом тлеют окна, из труб идёт дым,
   летают птицы, по площади ходят горожане и переговариваются
   между собой без участия игрока. Место входа — не кружок, а
   светящаяся вывеска, и по нажатию сцена ПРИБЛИЖАЕТСЯ к ней,
   а не сменяется рывком.

   Внутри локации стоят живые NPC: дышат, покачиваются, и у них
   свой разговор, который идёт сам по себе.
   ============================================================ */
(function () {
  'use strict';

  var ART = 'mq/';
  var $ = function (id) { return document.getElementById(id); };

  /* ========================================================
     ГОРОЖАНЕ — ходят по площади своими маршрутами
     ======================================================== */
  var FOLK = [
    { art: 'npc_baker.webp',    name: 'Пекарь Крупа',   from: 8,  to: 34, y: 62, dur: 26,
      lines: ['Хлеба на семь монет, как всегда?', 'Безмер стёр число булок — пеку наугад.', 'Горячие! Ещё горячие!'] },
    { art: 'npc_guard.webp',    name: 'Стражник Пика',  from: 72, to: 94, y: 57, dur: 22,
      lines: ['У ворот всё тихо.', 'Говорят, мост опять поплыл.', 'Считать умеешь? Тогда проходи.'] },
    { art: 'npc_kid.webp',      name: 'Малыш Тюк',      from: 24, to: 68, y: 72, dur: 17,
      lines: ['Смотрите, какой змей!', 'А я уже до двадцати умею!', 'Догоняйте!'] },
    { art: 'npc_merchant.webp', name: 'Купец Венец',    from: 60, to: 20, y: 66, dur: 30,
      lines: ['Ценники пустые, беда.', 'Три по пять — это сколько, не напомнишь?', 'Товар есть, числа нет.'] }
  ];

  /* перекличка: кто кому отвечает, чтобы это читалось как разговор */
  var CHATTER = [
    [0, 'Крупа, почём нынче булка?'],
    [3, 'Сам не знаю — ценник стёрли.'],
    [2, 'А я знаю! Семь!'],
    [1, 'Тюк, не мешай людям.'],
    [2, 'Я не мешаю, я считаю!'],
    [0, 'Вот и считай, пока Безмер не стёр и тебя.']
  ];

  var folkEls = [], chatI = 0, chatTimer = 0;

  function buildFolk(host) {
    folkEls = [];
    host.innerHTML = '';
    FOLK.forEach(function (f, i) {
      var el = document.createElement('div');
      el.className = 'mq-folk';
      el.style.setProperty('--y', f.y + '%');
      el.style.setProperty('--from', f.from + '%');
      el.style.setProperty('--to', f.to + '%');
      el.style.setProperty('--dur', f.dur + 's');
      el.style.setProperty('--delay', (-i * 5.5) + 's');
      el.innerHTML =
        '<span class="mq-folk__say" aria-hidden="true"></span>' +
        '<span class="mq-folk__art"><img src="' + ART + f.art + '" alt="" loading="lazy"></span>';
      host.appendChild(el);
      folkEls.push(el);
    });
  }

  function sayFolk(i, text, ms) {
    var el = folkEls[i];
    if (!el) return;
    var b = el.querySelector('.mq-folk__say');
    b.textContent = text;
    b.classList.add('on');
    setTimeout(function () { b.classList.remove('on'); }, ms || 3400);
  }

  function startChatter() {
    stopChatter();
    chatTimer = setInterval(function () {
      if (document.hidden) return;
      var line = CHATTER[chatI % CHATTER.length];
      chatI++;
      sayFolk(line[0], line[1], 3600);
    }, 4200);
    setTimeout(function () { if (chatTimer) sayFolk(CHATTER[0][0], CHATTER[0][1], 3600); }, 900);
  }
  function stopChatter() { if (chatTimer) clearInterval(chatTimer); chatTimer = 0; }

  /* ========================================================
     ЖИВОЙ СЛОЙ: огни в окнах, дым, птицы, искры фонаря
     ======================================================== */
  var cv, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, guard = 0, lastTick = 0;
  var lamps = [], smoke = [], birds = [], motes = [];

  function seedWorld() {
    lamps = []; smoke = []; birds = []; motes = [];
    /* окна домов: две полосы по краям площади */
    for (var i = 0; i < 26; i++) {
      var left = i % 2 === 0;
      lamps.push({
        x: (left ? 0.04 + Math.random() * 0.26 : 0.70 + Math.random() * 0.26) * W,
        y: (0.42 + Math.random() * 0.26) * H,
        r: 1.6 + Math.random() * 2.2,
        ph: Math.random() * 6.283,
        sp: 0.5 + Math.random() * 1.1
      });
    }
    for (var b = 0; b < 3; b++) {
      birds.push({ x: -0.2 * W - b * 60, y: (0.12 + Math.random() * 0.16) * H, sp: 22 + Math.random() * 16, ph: Math.random() * 6.283 });
    }
  }

  function mountFx(host) {
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'mq-town__fx';
      host.appendChild(cv);
      ctx = cv.getContext('2d');
    } else if (cv.parentNode !== host) host.appendChild(cv);
    sizeFx();
  }
  function sizeFx() {
    if (!cv || !cv.parentNode) return;
    var r = cv.parentNode.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedWorld();
  }

  function tick(now) {
    lastTick = now || performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    if (!ctx || !W) return;
    var dt = Math.min(0.05, (lastTick - last) / 1000) || 0.016;
    last = lastTick;
    ctx.clearRect(0, 0, W, H);

    /* окна тлеют */
    for (var i = 0; i < lamps.length; i++) {
      var L = lamps[i];
      L.ph += dt * L.sp;
      var a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(L.ph));
      ctx.globalAlpha = a;
      var g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 5);
      g.addColorStop(0, '#FFE9A8'); g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(L.x, L.y, L.r * 5, 0, 6.283); ctx.fill();
    }

    /* дым из труб */
    if (Math.random() < dt * 7) {
      smoke.push({ x: (0.17 + Math.random() * 0.06) * W, y: 0.40 * H, r: 4 + Math.random() * 4, life: 1, vx: 6 + Math.random() * 8 });
    }
    if (Math.random() < dt * 5) {
      smoke.push({ x: (0.79 + Math.random() * 0.05) * W, y: 0.38 * H, r: 4 + Math.random() * 4, life: 1, vx: 5 + Math.random() * 7 });
    }
    for (var s = smoke.length - 1; s >= 0; s--) {
      var S = smoke[s];
      S.life -= dt * 0.34;
      if (S.life <= 0) { smoke.splice(s, 1); continue; }
      S.y -= dt * 16; S.x += dt * S.vx; S.r += dt * 7;
      ctx.globalAlpha = S.life * 0.22;
      ctx.fillStyle = '#E9DFF2';
      ctx.beginPath(); ctx.arc(S.x, S.y, S.r, 0, 6.283); ctx.fill();
    }

    /* птицы */
    for (var b = 0; b < birds.length; b++) {
      var B = birds[b];
      B.x += dt * B.sp; B.ph += dt * 7;
      if (B.x > W * 1.15) { B.x = -0.15 * W; B.y = (0.1 + Math.random() * 0.18) * H; }
      var wing = Math.sin(B.ph) * 3.4;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#2F2742'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(B.x - 5, B.y + wing); ctx.lineTo(B.x, B.y - 1); ctx.lineTo(B.x + 5, B.y + wing);
      ctx.stroke();
    }

    /* редкие искорки над площадью — «магия в воздухе» */
    if (Math.random() < dt * 3.5) {
      motes.push({ x: Math.random() * W, y: H * (0.55 + Math.random() * 0.3), life: 1, vy: -8 - Math.random() * 10, r: 1 + Math.random() * 1.6 });
    }
    for (var m = motes.length - 1; m >= 0; m--) {
      var M = motes[m];
      M.life -= dt * 0.5;
      if (M.life <= 0) { motes.splice(m, 1); continue; }
      M.y += dt * M.vy;
      ctx.globalAlpha = M.life * 0.75;
      ctx.fillStyle = '#FFD98A';
      ctx.beginPath(); ctx.arc(M.x, M.y, M.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* страховка: пока вкладка скрыта, кадров нет — сторож доводит такт */
  function startGuard() {
    if (guard) return;
    guard = setInterval(function () {
      if (!raf) return;
      if (performance.now() - lastTick > 400) {
        if (smoke.length > 120) smoke.splice(0, smoke.length - 120);
        if (motes.length > 120) motes.splice(0, motes.length - 120);
        tick(performance.now());
      }
    }, 220);
  }

  /* ========================================================
     ZOOM: сцена приближается к выбранному месту
     ======================================================== */
  function zoomTo(scene, xPct, yPct, done) {
    if (!scene) { if (done) done(); return; }
    scene.style.transformOrigin = xPct + '% ' + yPct + '%';
    scene.classList.add('mq-zoom');
    setTimeout(function () {
      if (done) done();
      setTimeout(function () {
        scene.classList.remove('mq-zoom');
        scene.style.transformOrigin = '';
      }, 60);
    }, 420);
  }

  /* ========================================================
     ЖИВЫЕ NPC ВНУТРИ ЛОКАЦИИ
     ======================================================== */
  var sceneTimer = 0;

  function buildScene(host, cast, dialog) {
    stopScene();
    host.innerHTML = '';
    var els = [];
    cast.forEach(function (c, i) {
      var el = document.createElement('div');
      el.className = 'mq-actor' + (c.side === 'right' ? ' mq-actor--right' : '');
      el.style.setProperty('--x', c.x + '%');
      el.style.setProperty('--d', (i * 0.7) + 's');
      el.innerHTML =
        '<span class="mq-actor__say" aria-hidden="true"></span>' +
        '<span class="mq-actor__art"><img src="' + ART + c.art + '" alt=""></span>' +
        '<span class="mq-actor__name">' + c.name + '</span>';
      host.appendChild(el);
      els.push(el);
    });

    if (!dialog || !dialog.length) return;
    var k = 0;
    function step() {
      if (document.hidden) return;
      var line = dialog[k % dialog.length];
      k++;
      var el = els[line[0]];
      if (el) {
        var b = el.querySelector('.mq-actor__say');
        b.textContent = line[1];
        b.classList.add('on');
        el.classList.add('mq-actor--talk');
        setTimeout(function () { b.classList.remove('on'); el.classList.remove('mq-actor--talk'); }, 3600);
      }
    }
    setTimeout(step, 700);
    sceneTimer = setInterval(step, 4300);
  }
  function stopScene() { if (sceneTimer) clearInterval(sceneTimer); sceneTimer = 0; }

  /* ========================================================
     ХОЖДЕНИЕ ПО ЛОКАЦИИ (point-and-click)

     Разведка показала: в образце ребёнок не тыкает в список дел,
     а ВОДИТ героя по комнате и подходит к тому, с кем хочет
     говорить или драться. Это и держит внимание.

     Герой ходит по «полосе» — коридору по низу сцены, чтобы не
     улетал в небо. Тап по фону — идти туда. Тап по цели —
     подойти к ней и начать дело.
     ======================================================== */
  var walker = null;

  function makeStage(host, opts) {
    stopWalk();
    var stage = document.createElement('div');
    stage.className = 'mq-stage';
    host.appendChild(stage);

    var hero = document.createElement('div');
    hero.className = 'mq-player';
    hero.style.setProperty('--tint', opts.tint || '#9B6BE0');
    hero.innerHTML = '<span class="mq-player__art"><img src="' + ART + opts.art + '" alt=""></span>' +
                     '<span class="mq-player__dust"></span>';
    stage.appendChild(hero);

    walker = { stage: stage, el: hero, x: opts.startX || 20, busy: false, onArrive: null };
    place(hero, walker.x);

    /* тап по сцене — идти туда */
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.mq-spot-foe') || e.target.closest('.mq-actor')) return;
      var r = stage.getBoundingClientRect();
      var pct = Math.max(6, Math.min(94, ((e.clientX - r.left) / r.width) * 100));
      walkTo(pct);
    });
    return stage;
  }

  function place(el, pct) { el.style.left = pct + '%'; }

  function walkTo(pct, done) {
    if (!walker) { if (done) done(); return; }
    var dx = Math.abs(pct - walker.x);
    if (dx < 1.5) { if (done) done(); return; }
    var dur = Math.max(0.35, Math.min(1.5, dx / 42));
    walker.el.classList.toggle('mq-player--flip', pct < walker.x);
    walker.el.classList.add('mq-player--walk');
    walker.el.style.transition = 'left ' + dur + 's cubic-bezier(.4,.05,.5,1)';
    walker.x = pct;
    place(walker.el, pct);
    clearTimeout(walker.t);
    walker.t = setTimeout(function () {
      walker.el.classList.remove('mq-player--walk');
      if (done) done();
    }, dur * 1000 + 40);
  }

  function stopWalk() {
    if (walker && walker.t) clearTimeout(walker.t);
    walker = null;
  }

  /* клякса стоит в комнате: подошёл — дерёшься */
  function addFoe(stage, cfg, onFight) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'mq-spot-foe' + (cfg.done ? ' mq-spot-foe--done' : '');
    el.style.left = cfg.x + '%';
    el.innerHTML =
      '<span class="mq-spot-foe__art"><img src="' + ART + cfg.art + '" alt="" loading="lazy"></span>' +
      '<span class="mq-spot-foe__lbl">' + cfg.label + (cfg.done ? ' · повержен' : '') + '</span>';
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var side = cfg.x > (walker ? walker.x : 50) ? cfg.x - 11 : cfg.x + 11;
      walkTo(Math.max(6, Math.min(94, side)), function () { if (onFight) onFight(); });
    });
    stage.appendChild(el);
    return el;
  }

  /* ========================================================
     ПУБЛИЧНОЕ
     ======================================================== */
  window.nookaWorld = {
    /* оживить карту города */
    liveMap: function (sceneEl, folkHost) {
      if (!sceneEl) return;
      mountFx(sceneEl);
      requestAnimationFrame(sizeFx);
      setTimeout(sizeFx, 140);
      if (folkHost) { buildFolk(folkHost); startChatter(); }
      if (!raf) { last = performance.now(); lastTick = last; raf = requestAnimationFrame(tick); }
      startGuard();
    },
    stopMap: function () {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (guard) { clearInterval(guard); guard = 0; }
      stopChatter();
      smoke.length = 0; motes.length = 0;
    },
    resize: sizeFx,
    zoomTo: zoomTo,
    scene: buildScene,
    stopScene: function () { stopScene(); stopWalk(); },
    stage: makeStage,
    foe: addFoe,
    walkTo: walkTo,
    folk: FOLK
  };

  window.addEventListener('resize', function () { if (cv) sizeFx(); });
})();
