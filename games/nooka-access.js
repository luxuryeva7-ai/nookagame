/* ============================================================
   NOOKA ACCESS — доступ к платным уровням.

   Как это работает для родителя:
     1. входит по почте (аккаунт один на семью)
     2. платит в кабинете: /base/pay.html
     3. доступ открыт на всех устройствах, где выполнен вход

   Доступ живёт на сервере и привязан к аккаунту. Страница только
   спрашивает «что открыто» и показывает ответ; открыть себе доступ
   правкой памяти браузера больше нельзя — открывать нечего.

   Кодов доступа больше нет. Старый код NOOKA-XXXX-XXXX привязывается
   к аккаунту один раз на странице /access/ и дальше не нужен.

   Модуль требует nooka-account.js — подключать строго до него:
     <script src="nooka-account.js"></script>
     <script src="nooka-access.js"></script>

   Ответ сервера приходит не мгновенно, поэтому ВСЁ, что зависит от
   оплаты, идёт через nookaAccess.ready:

     nookaAccess.ready.then(function (s) { if (s.paid) … });

   Бесплатные уровни не ждут ничего: что бесплатно, известно из реестра
   nooka-levels.js, и такие страницы открываются сразу.
   ============================================================ */
(function () {

  /* ── переключатели запуска ────────────────────────────────
     OPEN_ALL = true  — вся платформа открыта (показы, тесты, до старта продаж)
     OPEN_ALL = false — работает платная стена: бесплатна вся первая игра
                        целиком (поле free в реестре), две другие — по оплате */
  var OPEN_ALL = false;  // ← стена включена: бесплатна только первая игра

  /* Поддержка: сюда ведут за помощью, если с оплатой что-то не так. */
  var TG_URL = 'https://t.me/NookaGame';

  /* Страницы. Продажа — публичная /buy/, оплата — в кабинете, за входом:
     платит аккаунт, а не устройство. */
  var BUY_URL    = '/buy/';
  var PAY_URL    = '/base/pay.html';
  var ACCESS_URL = '/access/';
  var LOGIN_URL  = '/login/';
  var OFERTA_URL = '/legal/oferta.html';

  /* Тарифы здесь — только для показа. Сколько списать и на сколько открыть,
     решает сервер по своей таблице: сумму, которую назвал браузер, платёжке
     передавать нельзя. Если цены разойдутся, сервер скажет об этом в консоль. */
  var PLANS = {
    quarter: { rub: 490,  price: '490 ₽',  title: 'Три месяца', days: 92,
      note: 'Вторая и третья игры — ещё 20 уровней. Продлевать не нужно: срок вышел — доступ закрылся сам.' },
    year:    { rub: 1450, price: '1450 ₽', title: 'Год',        days: 366,
      note: 'Те же 20 уровней на 12 месяцев плюс все новые игры платформы, которые выйдут за год.' }
  };

  /* ── предпросмотр: «как видит родитель без оплаты» ─────────
     ?wall=1 включает режим только в этой вкладке, ?wall=0 выключает.
     Гасит и общий показ, и оплаченный доступ — иначе владелец видит всё
     открытым и проверить стену не может. На сервере ничего не меняется:
     закрыл режим — доступ на месте. */
  var WALL_PREVIEW = false;
  try {
    var wq = new URLSearchParams(location.search).get('wall');
    if (wq === '1') sessionStorage.setItem('nooka_wall', '1');
    if (wq === '0') sessionStorage.removeItem('nooka_wall');
    WALL_PREVIEW = sessionStorage.getItem('nooka_wall') === '1';
  } catch (e) {}

  function allOpen() { return OPEN_ALL && !WALL_PREVIEW; }

  /* ── что открыто ─────────────────────────────────────────
     known  — ответ сервера получен (до этого судить не о чем)
     guest  — вход не выполнен
     offline — сервер не ответил: это не «не оплачено», а «неизвестно» */
  var S = { known: false, paid: false, guest: true, offline: false, preview: WALL_PREVIEW };

  function state() {
    return {
      known: S.known, paid: S.paid, guest: S.guest, offline: S.offline,
      preview: WALL_PREVIEW, until: S.until, days: S.days, source: S.source
    };
  }

  /* Цены на сервере — источник истины. Расхождение видно только в консоли:
     показывать его родителю незачем, а нам чинить до первой продажи. */
  function checkPlans(server) {
    if (!server) return;
    Object.keys(PLANS).forEach(function (k) {
      if (server[k] && server[k].rub !== PLANS[k].rub) {
        console.warn('nooka-access: цена тарифа «' + k + '» на сервере ' +
          server[k].rub + ' ₽, а на странице ' + PLANS[k].rub + ' ₽');
      }
    });
  }

  function ask() {
    if (allOpen()) { S.known = true; S.paid = true; S.guest = false; return Promise.resolve(state()); }
    var A = window.nookaAccount;
    if (!A) {
      console.error('nooka-access: нужен nooka-account.js, подключённый раньше');
      S.known = true; S.offline = true;
      return Promise.resolve(state());
    }
    /* Адрес именно /access/state: на сайте есть страница /access/,
       и короткий /access отобрал бы её у статики на боевом домене. */
    return A.call('GET', '/access/state').then(function (r) {
      S.known = true;
      if (r.ok) {
        S.guest = false;
        S.offline = false;
        var a = r.data.access || {};
        /* Предпросмотр гасит оплату на странице, но не на сервере */
        S.paid = !!a.paid && !WALL_PREVIEW;
        S.until = a.until; S.days = a.days; S.source = a.source;
        checkPlans(r.data.plans);
      } else if (r.status === 401) {
        S.guest = true; S.paid = false; S.offline = false;
      } else {
        S.offline = true; S.paid = false;
      }
      return state();
    });
  }

  var ready = ask();

  /* Спросить сервер заново: после возвращения из платёжки и после входа.
     Подменяем и nookaAccess.ready — иначе страница, которая ждёт его после
     обновления, дождалась бы старого ответа. */
  function refresh() {
    ready = ask();
    if (window.nookaAccess) window.nookaAccess.ready = ready;
    return ready;
  }

  /* ── можно ли играть ─────────────────────────────────────
     Ответ синхронный — по тому, что уже известно. До ready платным
     уровням отвечает «нет», поэтому страницы платных уровней ждут. */
  function isFree(gameKey, n) {
    var g = window.nookaLevels && window.nookaLevels.game(gameKey);
    return !!(g && n <= (g.free || 0));
  }
  function canPlay(gameKey, n) {
    if (allOpen()) return true;
    if (isFree(gameKey, n)) return true;
    return S.paid;
  }

  /* ── экран оплаты ────────────────────────────────────── */
  var PW_CSS =
    '.nkpw{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'padding:20px;background:rgba(8,5,16,.86);backdrop-filter:blur(10px);' +
      "font-family:'Nunito',system-ui,sans-serif}" +
    '.nkpw__card{position:relative;width:100%;max-width:430px;max-height:92vh;overflow-y:auto;' +
      'padding:26px 24px;border-radius:28px;background:linear-gradient(180deg,#1B1330,#120D22);' +
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 40px 80px -30px #000}' +
    '.nkpw__x{position:absolute;right:16px;top:16px;width:32px;height:32px;border:none;cursor:pointer;' +
      'border-radius:50%;background:rgba(255,255,255,.08);color:#C9BAE6;font-size:14px}' +
    '.nkpw__kick{font-weight:900;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#FFD84D}' +
    ".nkpw__h{font-family:'Unbounded','Nunito',system-ui,sans-serif;font-weight:700;font-size:21px;" +
      'line-height:1.25;margin:9px 0 8px;color:#F3EEFF}' +
    '.nkpw__s{font-weight:600;font-size:13px;line-height:1.5;color:#A896C9;margin:0}' +
    '.nkpw__plans{margin-top:16px;display:flex;flex-direction:column;gap:10px}' +
    '.nkpw__p{position:relative;display:block;padding:15px 17px;border-radius:20px;text-decoration:none;' +
      'background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09)}' +
    ".nkpw__p b{font-family:'Unbounded','Nunito',system-ui,sans-serif;font-weight:900;font-size:22px;color:#F3EEFF}" +
    '.nkpw__p i{font-style:normal;margin-left:8px;font-weight:800;font-size:13px;color:#A896C9}' +
    '.nkpw__p span{display:block;margin-top:6px;font-weight:600;font-size:12px;line-height:1.45;color:#A896C9}' +
    '.nkpw__p--best{background:linear-gradient(180deg,rgba(255,216,77,.14),rgba(255,216,77,.05));' +
      'box-shadow:inset 0 0 0 1.5px rgba(255,216,77,.4)}' +
    '.nkpw__flag{position:absolute!important;right:14px;top:14px;margin:0!important;padding:4px 10px;' +
      'border-radius:999px;font-weight:900!important;font-size:10px!important;color:#33240A!important;background:#FFD84D}' +
    '.nkpw__go{display:block;width:100%;margin-top:16px;padding:14px 18px;border:none;border-radius:16px;' +
      "cursor:pointer;text-align:center;text-decoration:none;font-family:'Unbounded','Nunito',system-ui,sans-serif;" +
      'font-weight:700;font-size:15px;color:#fff;background:linear-gradient(180deg,#9B78FF,#7B4FF2)}' +
    '.nkpw__alt{display:block;margin-top:12px;text-align:center;font-weight:800;font-size:13px;color:#A896C9}' +
    '.nkpw__fine{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09);' +
      'font-weight:700;font-size:11.5px;line-height:1.5;color:#7E6E9C}' +
    '.nkpw__fine a{color:#A896C9;text-decoration:underline}';

  function nextUrl() {
    return encodeURIComponent(location.pathname + location.search + location.hash);
  }

  function paywall(opts) {
    opts = opts || {};
    if (document.getElementById('nkpw')) return;
    if (!document.getElementById('nkpw-css')) {
      var st = document.createElement('style');
      st.id = 'nkpw-css';
      st.textContent = PW_CSS;
      document.head.appendChild(st);
    }

    /* Тариф ведёт в кабинет, а не прямо в банк: там написано, что именно
       открывается и что деньги вернут. Человек, которого швырнули из игры
       сразу в форму оплаты, не платит. */
    function plan(k) {
      var p = PLANS[k];
      return '<a class="nkpw__p' + (k === 'year' ? ' nkpw__p--best' : '') + '" href="' +
        PAY_URL + '#' + k + '">' +
        (k === 'year' ? '<span class="nkpw__flag">Выгоднее</span>' : '') +
        '<b>' + p.price + '</b><i>' + p.title + '</i><span>' + p.note + '</span></a>';
    }

    /* Гостю сначала вход: платит аккаунт, и без него открывать нечего.
       Оплатившему, который просто не вошёл на этом устройстве, эта же
       кнопка сразу вернёт доступ — поэтому она первая и главная. */
    var guest = S.guest && !allOpen();
    var body = guest
      ? '<p class="nkpw__s">' + (opts.sub || 'Платные уровни открываются в аккаунте.') +
          ' Если доступ уже оплачен, войдите по почте — и всё откроется на этом устройстве тоже.</p>' +
        '<a class="nkpw__go" href="' + LOGIN_URL + '?next=' + nextUrl() + '">Войти по почте</a>' +
        '<a class="nkpw__alt" href="' + BUY_URL + '">Что входит в доступ и сколько стоит →</a>'
      : '<p class="nkpw__s">' + (opts.sub || 'Первая игра открыта всем целиком. Две другие — по доступу для одной семьи.') + '</p>' +
        '<div class="nkpw__plans">' + plan('quarter') + plan('year') + '</div>' +
        '<a class="nkpw__alt" href="' + BUY_URL + '">Подробнее о том, что открывается →</a>';

    var w = document.createElement('div');
    w.className = 'nkpw';
    w.id = 'nkpw';
    w.innerHTML =
      '<div class="nkpw__card">' +
        '<button class="nkpw__x" aria-label="Закрыть">✕</button>' +
        '<div class="nkpw__kick">Дальше — по доступу</div>' +
        '<h2 class="nkpw__h">' + (opts.title || 'Тут заканчивается бесплатная часть') + '</h2>' +
        body +
        '<div class="nkpw__fine">Разовая оплата, без автосписаний. Вернём деньги за 14 дней. ' +
          '<a href="' + OFERTA_URL + '" target="_blank" rel="noopener">Оферта</a></div>' +
      '</div>';
    document.body.appendChild(w);

    var close = function () { w.remove(); if (opts.onClose) opts.onClose(); };
    w.querySelector('.nkpw__x').onclick = close;
    w.onclick = function (e) { if (e.target === w) close(); };
  }

  /* Сервер не ответил — говорим честно. Молчаливая стена в этом месте
     читается как «у меня украли оплату». */
  function offlineWall(opts) {
    opts = opts || {};
    if (document.getElementById('nkpw')) return;
    if (!document.getElementById('nkpw-css')) {
      var st = document.createElement('style');
      st.id = 'nkpw-css'; st.textContent = PW_CSS;
      document.head.appendChild(st);
    }
    var w = document.createElement('div');
    w.className = 'nkpw'; w.id = 'nkpw';
    w.innerHTML =
      '<div class="nkpw__card">' +
        '<div class="nkpw__kick">Нет связи</div>' +
        '<h2 class="nkpw__h">Не получилось проверить доступ</h2>' +
        '<p class="nkpw__s">Сервер не ответил, поэтому платные уровни пока закрыты. ' +
          'Проверьте интернет и обновите страницу — доступ на месте.</p>' +
        '<button class="nkpw__go" type="button">Обновить</button>' +
        '<a class="nkpw__alt" href="' + (opts.hub || '/') + '">Вернуться к играм</a>' +
      '</div>';
    document.body.appendChild(w);
    w.querySelector('.nkpw__go').onclick = function () { location.reload(); };
  }

  /* ── какой уровень открыт на этой странице ───────────────
     Уровни живут по-разному: отдельным файлом (forge.html),
     по хешу (prompt.html#l3) или модулем Академии (ai.html?m=engine). */
  function currentLevel() {
    if (!window.nookaLevels) return null;
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    var hash = location.hash.replace('#', '').replace('!', '');
    var here = null;
    try { here = new URLSearchParams(location.search); } catch (e) {}
    var hit = null;
    window.nookaLevels.games.forEach(function (g) {
      g.levels.forEach(function (lv) {
        if (!lv.href || hit) return;
        var base = lv.href.split(/[?#]/)[0].toLowerCase();
        if (base !== file) return;
        var wantHash = (lv.href.split('#')[1] || '').replace('!', '');
        if (wantHash && wantHash !== hash) return;
        /* Сверяем все параметры адреса, а не только модуль: в одном файле
           живут несколько уровней (draw.html?n=2 … ?n=10), и без этой
           проверки платный десятый уровень считался бы вторым, бесплатным. */
        var qs = (lv.href.split('?')[1] || '').split('#')[0];
        var same = true;
        if (qs) {
          qs.split('&').forEach(function (kv) {
            if (!kv) return;
            var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
            if (!here || here.get(k) !== v) same = false;
          });
        }
        if (!same) return;
        hit = { game: g, level: lv };
      });
    });
    return hit;
  }

  /* Уровень или бонус, открытый по этому адресу. Бонусы лежат отдельно от
     levels, и без этого поиска их страницы не знают своей цели: она была
     вписана прямо в файл и расходилась с реестром при каждой правке. */
  function currentAny() {
    var hit = currentLevel();
    if (hit) return hit;
    if (!window.nookaLevels) return null;
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    var here = null;
    try { here = new URLSearchParams(location.search); } catch (e) {}
    var found = null;
    window.nookaLevels.games.forEach(function (g) {
      (g.extras || []).forEach(function (x) {
        if (found || !x.href) return;
        var base = x.href.split(/[?#]/)[0].toLowerCase();
        if (base !== file) return;
        var qs = (x.href.split('?')[1] || '').split('#')[0];
        var same = true;
        if (qs) qs.split('&').forEach(function (kv) {
          if (!kv) return;
          var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
          if (!here || here.get(k) !== v) same = false;
        });
        if (same) found = { game: g, level: x };
      });
    });
    return found;
  }

  /* Все уровни, которые живут в этом файле. Нужны, когда по адресу нельзя
     понять, какой именно уровень открыт: prompt.html держит внутри пять
     уровней и переключает их сам, без перезагрузки страницы. Тогда судим
     по файлу целиком — весь платный, значит закрыт вход, а не уровень. */
  function fileLevels() {
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    var out = [];
    if (!file || !window.nookaLevels) return out;
    window.nookaLevels.games.forEach(function (g) {
      g.levels.forEach(function (lv) {
        var f = String(lv.href || '').split(/[?#]/)[0].toLowerCase();
        if (f === file) out.push({ game: g, level: lv });
      });
      /* Финальные мастерские живут не в levels, но доступ у них общий с игрой:
         без этой строки платная мастерская открывалась прямой ссылкой мимо
         пейволла. Номер берём как у последнего уровня — он и решает доступ. */
      if (g.sandbox && g.sandbox.href) {
        var sf = String(g.sandbox.href).split(/[?#]/)[0].toLowerCase();
        if (sf === file) {
          var last = g.levels.length;
          out.push({ game: g, level: { n: last, t: g.sandbox.t, href: g.sandbox.href, mid: g.sandbox.mid } });
        }
      }
    });
    return out;
  }

  /* Бонусные страницы, открытые всем: мастерская загадок. По ссылке-загадке
     приходит друг, у которого доступа нет, — закрыть её значит убить обмен. */
  function isBonus() {
    try {
      var q = new URLSearchParams(location.search);
      return q.has('riddle') || q.has('q');
    } catch (e) { return false; }
  }

  /* Пока сервер не ответил, платная страница не показывается: иначе ребёнок
     успеет увидеть уровень, начать его и получить стену в лицо посреди дела. */
  function hide() { document.documentElement.style.visibility = 'hidden'; }
  function show() { document.documentElement.style.visibility = ''; }

  /* Закрыть платный уровень, если его открыли прямой ссылкой мимо витрины */
  function guard() {
    if (allOpen() || isBonus()) return;
    var cur = currentLevel(), whole = false;
    if (!cur) {
      var all = fileLevels();
      if (!all.length) return;                    // страница не про уровни
      for (var i = 0; i < all.length; i++) {      // есть что играть бесплатно — пускаем
        if (isFree(all[i].game.key, all[i].level.n)) return;
      }
      cur = all[0];                               // весь файл платный — закрываем вход
      whole = true;
    }
    if (isFree(cur.game.key, cur.level.n)) return;   // бесплатное не ждёт сервера

    hide();
    ready.then(function () {
      show();
      if (S.paid) return;
      var hub = 'game.html?g=' + cur.game.key;
      if (S.offline) return offlineWall({ hub: hub });
      paywall({
        title: whole ? 'Эта игра — в платной части' : 'Этот уровень — в платной части',
        sub: whole
          ? 'Игра «' + cur.game.name + '» открывается по доступу. Первая игра курса бесплатна целиком.'
          : '«' + cur.level.t + '» из игры «' + cur.game.name + '». Бесплатно открыта вся первая игра.',
        onClose: function () { location.href = hub; }
      });
    });
  }

  /* Метка режима. Без неё владелец, открывший превью и забывший о нём,
     решит, что потерял доступ, — и полезет чинить то, что не сломано. */
  function previewBadge() {
    if (!WALL_PREVIEW || document.getElementById('nkprev')) return;
    var off = location.pathname + '?wall=0';
    var el = document.createElement('div');
    el.id = 'nkprev';
    /* nowrap обязателен: на телефоне текст иначе встаёт в четыре строки
       и плашка превращается в кляксу поверх страницы */
    el.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10001;' +
      'display:flex;align-items:center;gap:11px;white-space:nowrap;' +
      'padding:10px 15px;border-radius:999px;background:#150F2E;color:#FFF6DC;' +
      "font:800 12.5px/1.2 'Nunito',system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.45);" +
      'border:1.5px solid rgba(255,216,77,.55)';
    el.innerHTML = '<span>Вид как у родителя без оплаты</span>' +
      '<a href="' + off + '" style="color:#FFD84D;text-decoration:underline;white-space:nowrap">Выключить</a>';
    document.body.appendChild(el);
  }

  function boot() {
    guard();
    previewBadge();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  window.nookaAccess = {
    openAll: allOpen(),
    wallPreview: WALL_PREVIEW,
    tgUrl: TG_URL,
    buyUrl: BUY_URL,             // публичная страница «что открывается»
    payUrl: PAY_URL,             // оплата в кабинете, за входом
    accessUrl: ACCESS_URL,
    loginUrl: LOGIN_URL,
    ofertaUrl: OFERTA_URL,
    plans: PLANS,
    /* Ответ сервера: всё, что зависит от оплаты, идёт отсюда */
    ready: ready,
    refresh: refresh,
    state: state,
    canPlay: canPlay,
    isFree: isFree,
    currentLevel: currentLevel,
    currentAny: currentAny,
    fileLevels: fileLevels,
    isBonus: isBonus,
    guard: guard,
    paywall: paywall
  };
})();
