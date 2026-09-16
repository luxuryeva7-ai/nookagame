/* Nooka Gallery — коллекция того, что ребёнок создал сам.
   Живёт в localStorage рядом с профилем и общая для всех игр.
   Артефакт хранится готовой SVG-строкой: галерея умеет показать что угодно,
   не зная, какая игра это сделала.
   Коллекция уезжает в аккаунт родителя (nooka-sync.js) и приезжает оттуда
   на другие устройства — поэтому показывать её только через safeHtml(). */
(function () {
  var KEY = 'nooka_gallery';
  var LIMIT = 80;          // хватает надолго, но не раздувает localStorage

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function sync(fn, arg) {
    if (window.nookaSync) window.nookaSync[fn](arg);
  }

  /* ── безопасный показ ─────────────────────────────────────
     Работа пришла с сервера — значит, это уже не наша строка, а данные.
     Разбираем её в «неживом» документе (скрипты там не запускаются,
     картинки не грузятся) и оставляем только рисование: теги SVG
     и картинку-растр. Без обработчиков событий и внешних ссылок. */
  var TAGS = ('svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textpath ' +
    'image lineargradient radialgradient stop clippath mask pattern marker filter title desc style ' +
    'feblend fecolormatrix fecomponenttransfer fecomposite feconvolvematrix fediffuselighting ' +
    'fedisplacementmap fedistantlight fedropshadow feflood fefunca fefuncb fefuncg fefuncr ' +
    'fegaussianblur feimage femerge femergenode femorphology feoffset fepointlight ' +
    'fespecularlighting fespotlight fetile feturbulence img').split(' ');
  var OK_TAG = {};
  TAGS.forEach(function (t) { OK_TAG[t] = 1; });
  var LINK_ATTR = /^(href|xlink:href|src)$/i;
  var OK_LINK = /^(#|data:image\/(png|jpe?g|gif|webp);base64,)/i;
  var BAD_URL = /url\(\s*['"]?(?!#)|@import|expression\(|javascript:/i;

  function clean(node) {
    var kids = Array.prototype.slice.call(node.children);
    kids.forEach(function (el) {
      if (!OK_TAG[el.localName.toLowerCase()]) { el.remove(); return; }
      if (el.localName.toLowerCase() === 'style' && BAD_URL.test(el.textContent)) { el.remove(); return; }
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var n = a.name.toLowerCase(), v = a.value.trim();
        if (n.indexOf('on') === 0 ||
            (LINK_ATTR.test(n) && !OK_LINK.test(v)) ||
            (n === 'style' && BAD_URL.test(v)) ||
            (/^(fill|stroke|filter|clip-path|mask|marker-\w+)$/.test(n) && BAD_URL.test(v))) {
          el.removeAttribute(a.name);
        }
      });
      clean(el);
    });
  }

  function safeHtml(a) {
    if (!a || typeof a.svg !== 'string' || !window.DOMParser) return '';
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + a.svg, 'text/html');
    clean(doc.body);
    return doc.body.innerHTML;
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) {                       // место кончилось — жертвуем самым старым
      if (list.length > 1) { list.shift(); return save(list); }
      return false;
    }
  }

  window.nookaGallery = {
    /* a = { kind, title, note, svg, game } */
    add: function (a) {
      var list = load();
      var item = {
        id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        kind: a.kind || 'item',        // item | pet | poster | recipe | scan | tune | forecast
        title: a.title || 'Без названия',
        note: a.note || '',            // чему научился — это читает родитель
        svg: a.svg || '',
        game: a.game || '',
        at: Date.now()
      };
      list.push(item);
      while (list.length > LIMIT) list.shift();
      save(list);
      sync('changed');
      return item.id;
    },

    all: function () { return load().slice().reverse(); },   // новое сверху
    count: function () { return load().length; },
    get: function (id) {
      var l = load();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    remove: function (id) {
      save(load().filter(function (x) { return x.id !== id; }));
      sync('removed', id);
    },

    safeHtml: safeHtml,

    /* сколько разных видов артефактов собрано — для «коллекционера» в профиле */
    kinds: function () {
      var s = {};
      load().forEach(function (x) { s[x.kind] = (s[x.kind] || 0) + 1; });
      return s;
    }
  };
})();
