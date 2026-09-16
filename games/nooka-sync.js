/* ============================================================
   NOOKA SYNC — прогресс ребёнка в аккаунте родителя.

   Игры по-прежнему пишут всё в localStorage — этот модуль только
   возит данные между устройством и сервером:

   • отправка — со всех страниц: при загрузке, после пройденного
     уровня и при уходе со страницы. Уходит только то, что
     изменилось с прошлой отправки;
   • получение — только на базе и сразу после входа. В играх нельзя:
     открытая игра держит данные в памяти и затёрла бы присланное;
   • первый вход на устройстве переносит его прогресс в аккаунт;
   • выход стирает прогресс с устройства (в аккаунте он остаётся),
     но только после того, как всё успело уйти на сервер. Иначе на
     общем планшете прогресс одной семьи перетёк бы в другую.

   Устройство помнит, чей прогресс на нём лежит (owner). Вошёл другой
   аккаунт — чужой прогресс стирается, а не смешивается.

   Требует nooka-account.js. Подключается сам из nooka-core.js;
   на базе и странице входа — явно, сразу после nooka-account.js.
   ============================================================ */
(function () {
  if (window.nookaSync) return;
  var A = window.nookaAccount;
  if (!A) return;

  /* Что возим. Правила объединения — на сервере (nookagame-api, src/merge.js). */
  var KEYS = [
    'nooka_profile', 'aiq5_gs',
    'nooka_bots', 'nooka_crew', 'nooka_world', 'nooka_draw_mem',
    'nooka_proj_trainer', 'nooka_proj_assistant', 'nooka_proj_startup',
    'signalDecoderHighScore', 'bipo_hs'
  ];
  var GALLERY = 'nooka_gallery';
  var GALLERY_LIMIT = 80;          // столько же держит nooka-gallery.js
  /* При выходе стираем и то, что не возим: ник и название мира —
     это тоже следы ребёнка на общем устройстве. */
  var WIPE = KEYS.concat([GALLERY, 'nooka_nick', 'nooka_world_name']);
  var STATE = 'nooka_sync';
  var KEEPALIVE_MAX = 50000;       // браузер не отправит при уходе больше ~64 КБ
  var RELOAD_FLAG = 'nooka_sync_reload';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* state = { owner: id аккаунта, sent: {ключ: отпечаток}, gal: {id работы: 1}, removed: [id] } */
  function loadState() {
    var s = null;
    try { s = JSON.parse(get(STATE)); } catch (e) {}
    s = s || {};
    s.sent = s.sent || {};
    s.gal = s.gal || {};
    s.removed = s.removed || [];
    return s;
  }
  function saveState(s) { set(STATE, JSON.stringify(s)); }

  /* Отпечаток строки — чтобы не слать то, что сервер уже видел */
  function print(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return str.length + ':' + h.toString(36);
  }

  function galleryList() {
    try { return JSON.parse(get(GALLERY)) || []; } catch (e) { return []; }
  }
  /* Как nooka-gallery.js: кончилось место — жертвуем самым старым */
  function gallerySave(list) {
    while (list.length && !set(GALLERY, JSON.stringify(list))) list.shift();
  }

  /* Ответ сервера «не получилось по дороге» — сеть или сам сервер */
  function failed(r) { return r.status === 0 || r.status >= 500; }

  /* ── отправка ─────────────────────────────────────────────
     Возвращает true, если всё изменившееся дошло до сервера. */
  function sendAll(st, leaving) {
    var values = {}, prints = {}, any = false;
    KEYS.forEach(function (k) {
      var raw = get(k);
      if (raw == null) return;
      var p = print(raw);
      if (st.sent[k] === p) return;
      if (leaving && raw.length > KEEPALIVE_MAX) return;   // большое дошлём со следующей страницы
      try { values[k] = JSON.parse(raw); } catch (e) { return; }
      prints[k] = p;
      any = true;
    });

    var ok = true;
    var chain = Promise.resolve();

    if (any) {
      chain = chain.then(function () {
        return A.call('POST', '/progress', { values: values }, leaving).then(function (r) {
          if (!r.ok) { ok = false; return; }
          Object.keys(prints).forEach(function (k) { st.sent[k] = prints[k]; });
          saveState(st);
        });
      });
    }
    if (leaving) return chain.then(function () { return ok; });

    /* удалённые работы — до новых, чтобы не упереться в лимит места */
    st.removed.slice().forEach(function (id) {
      chain = chain.then(function () {
        return A.call('POST', '/gallery/remove', { id: id }).then(function (r) {
          if (failed(r) || r.status === 401) { ok = false; return; }
          st.removed = st.removed.filter(function (x) { return x !== id; });
          delete st.gal[id];
          saveState(st);
        });
      });
    });

    galleryList().forEach(function (item) {
      if (st.gal[item.id]) return;
      chain = chain.then(function () {
        return A.call('POST', '/gallery/add', { item: item }).then(function (r) {
          if (failed(r) || r.status === 401) { ok = false; return; }
          /* 400/413 — работу сервер не примет и потом; не пытаемся снова */
          st.gal[item.id] = 1;
          saveState(st);
          /* на другом устройстве её уже удалили — убираем и здесь */
          if (r.ok && r.data.deleted) {
            gallerySave(galleryList().filter(function (x) { return x.id !== item.id; }));
          }
        });
      });
    });

    return chain.then(function () { return ok; });
  }

  /* Отправляем, только если устройство привязано к вошедшему аккаунту */
  function push(leaving) {
    var st = loadState();
    if (!st.owner) return Promise.resolve(false);
    if (leaving) return sendAll(st, true);   // при уходе некогда спрашивать сервер, кто вошёл
    return A.me().then(function (u) {
      if (!u || u.id !== st.owner) return false;
      return sendAll(st, false);
    }, function () { return false; });
  }

  var timer = null;
  function changed() {
    clearTimeout(timer);
    timer = setTimeout(function () { push(false); }, 1500);
  }

  function removed(id) {
    var st = loadState();
    if (!st.gal[id]) return;          // сервер её и не видел
    if (st.removed.indexOf(id) < 0) st.removed.push(id);
    saveState(st);
    changed();
  }

  function wipe() {
    WIPE.forEach(del);
    del(STATE);
  }

  /* ── получение (база, вход) ───────────────────────────────
     Возвращает true, если на устройстве что-то поменялось. */
  function pull(user) {
    var st = loadState();
    if (st.owner && st.owner !== user.id) {
      wipe();                         // здесь лежал прогресс другого аккаунта
      st = loadState();
    }
    st.owner = user.id;
    saveState(st);

    var changedHere = false;
    return sendAll(st, false).then(function () {
      return A.call('GET', '/progress');
    }).then(function (r) {
      if (!r.ok) return false;
      var values = r.data.values || {};
      KEYS.forEach(function (k) {
        if (!(k in values)) return;
        var raw = JSON.stringify(values[k]);
        if (raw !== get(k)) { set(k, raw); changedHere = true; }
        st.sent[k] = print(raw);
      });
      saveState(st);
      return mergeGallery(st, r.data.gallery || []);
    }).then(function (galleryChanged) {
      return changedHere || galleryChanged;
    });
  }

  function mergeGallery(st, index) {
    var dead = {}, live = [];
    index.forEach(function (x) { if (x.deleted) dead[x.id] = 1; else live.push(x); });

    var list = galleryList();
    var before = list.map(function (x) { return x.id; }).join();
    list = list.filter(function (x) { return !dead[x.id]; });

    var have = {};
    list.forEach(function (x) { have[x.id] = 1; });
    /* забираем только свежие: на устройстве всё равно помещается 80 */
    var missing = live.slice(-GALLERY_LIMIT).filter(function (x) { return !have[x.id]; })
      .map(function (x) { return x.id; });
    live.forEach(function (x) { st.gal[x.id] = 1; });
    saveState(st);

    var chain = Promise.resolve();
    for (var i = 0; i < missing.length; i += 20) {
      (function (ids) {
        chain = chain.then(function () {
          return A.call('POST', '/gallery/get', { ids: ids }).then(function (r) {
            if (r.ok) list = list.concat(r.data.items || []);
          });
        });
      })(missing.slice(i, i + 20));
    }
    return chain.then(function () {
      list.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
      while (list.length > GALLERY_LIMIT) list.shift();
      if (list.map(function (x) { return x.id; }).join() === before) return false;
      gallerySave(list);
      return true;
    });
  }

  /* На закрытой странице (база): получить свежее и, если что-то
     поменялось, перезагрузиться — страница уже нарисована по старым
     данным. Флаг не даёт уйти в бесконечные перезагрузки. */
  function onPage(user) {
    return pull(user).then(function (changedHere) {
      var last = 0;
      try { last = Number(sessionStorage.getItem(RELOAD_FLAG)) || 0; } catch (e) {}
      if (!changedHere || Date.now() - last < 10000) return;
      try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch (e) {}
      location.reload();
      return new Promise(function () {});   // страницу не показываем до перезагрузки
    }, function () { /* сервер не ответил — покажем то, что есть на устройстве */ });
  }

  /* Перед выходом: всё должно дойти до сервера. Не дошло — не выходим. */
  function beforeLogout() {
    var st = loadState();
    if (!st.owner) return Promise.resolve();
    return sendAll(st, false).then(function (ok) {
      if (!ok) throw new Error('not_saved');
    });
  }

  /* ── на страницах игр ── */
  if (!document.querySelector('script[data-require-login]')) {
    setTimeout(function () { push(false); }, 1000);   // дослать то, что не успело с прошлой страницы
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') push(true);
  });

  window.nookaSync = {
    changed: changed,
    removed: removed,
    push: push,
    pull: pull,
    onPage: onPage,
    beforeLogout: beforeLogout,
    wipe: wipe
  };
})();
