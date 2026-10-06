/* ============================================================
   NOOKA SHARE — отдать ребёнку то, что он сделал: картинку или ролик.

   Почему отдельный файл. Ссылка с атрибутом download на телефоне Apple
   молча не работает: Safari её не качает и ничего не показывает. Ребёнок
   жмёт «Сохранить», ничего не происходит, и он решает, что сломалось.
   Поэтому сначала пробуем системное «Поделиться» — там есть «Сохранить
   изображение» и «Сохранить видео», — и только если его нет, качаем файл.

   Отвечаем, что реально вышло (share / download / fail), чтобы страница
   написала правду, а не «Сохранено» вслепую.
   ============================================================ */
(function () {

  /* Имя файла из названия, которое придумал ребёнок. Кириллицу оставляем:
     в именах файлов она работает, а вот двоеточия и слэши ломают сохранение. */
  function fileName(name, def, ext) {
    var s = String(name == null ? '' : name).replace(/[^\wа-яА-ЯёЁ -]/g, '').trim();
    return (s || def) + '.' + ext;
  }

  function extOf(type, def) {
    var t = String(type || '');
    if (t.indexOf('mp4') > -1) return 'mp4';
    if (t.indexOf('webm') > -1) return 'webm';
    if (t.indexOf('jpeg') > -1) return 'jpg';
    if (t.indexOf('png') > -1) return 'png';
    return def;
  }

  function viaShare(blob, fname, title) {
    try {
      if (!navigator.canShare || !window.File) return Promise.resolve(false);
      var f = new File([blob], fname, { type: blob.type || 'application/octet-stream' });
      if (!navigator.canShare({ files: [f] })) return Promise.resolve(false);
      return navigator.share({ files: [f], title: title || fname })
        .then(function () { return true; })
        /* Отмена — это не поломка: ребёнок передумал. Но и не успех,
           поэтому уходим на скачивание только при настоящей ошибке. */
        .catch(function (e) { return e && e.name === 'AbortError' ? 'cancel' : false; });
    } catch (e) { return Promise.resolve(false); }
  }

  function viaDownload(blob, fname) {
    try {
      var u = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = u; a.download = fname; a.rel = 'noopener';
      /* В документе: часть браузеров не нажимает ссылку вне дерева */
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 2000);
      return true;
    } catch (e) { return false; }
  }

  /* opts = { name, title, kind: 'image' | 'video', def } */
  function saveBlob(blob, opts) {
    opts = opts || {};
    if (!blob || !blob.size) return Promise.resolve('fail');
    var kind = opts.kind === 'video' ? 'video' : 'image';
    var fname = fileName(opts.name, opts.def || (kind === 'video' ? 'nooka' : 'kartinka'),
      extOf(blob.type, kind === 'video' ? 'webm' : 'png'));
    return viaShare(blob, fname, opts.title || opts.name).then(function (ok) {
      if (ok === true) return 'share';
      if (ok === 'cancel') return 'cancel';
      return viaDownload(blob, fname) ? 'download' : 'fail';
    });
  }

  function saveCanvas(canvas, opts) {
    opts = opts || {};
    if (!canvas || !canvas.toBlob) return Promise.resolve('fail');
    return new Promise(function (res) {
      try {
        canvas.toBlob(function (b) {
          saveBlob(b, { name: opts.name, title: opts.title, kind: 'image', def: opts.def }).then(res);
        }, 'image/png');
      } catch (e) { res('fail'); }
    });
  }

  /* Что сказать ребёнку. Фраза короткая и без обвинений: если не вышло —
     предлагаем снимок экрана, он работает всегда. */
  var WORDS = {
    image: {
      share: 'Отправил — выбери «Сохранить изображение».',
      download: 'Картинка сохранена.',
      cancel: 'Хорошо, не сохраняю.',
      fail: 'Сохранить не вышло. Сними экран — картинка тоже останется.'
    },
    video: {
      share: 'Отправил — выбери «Сохранить видео».',
      download: 'Ролик сохранён.',
      cancel: 'Хорошо, не сохраняю.',
      fail: 'Сохранить не вышло, но посмотреть можно сколько угодно.'
    }
  };
  function word(how, kind) {
    var w = WORDS[kind === 'video' ? 'video' : 'image'];
    return w[how] || w.fail;
  }


  /* Короткая плашка «что произошло». Одна на все мастерские: раньше она была
     только в «Своей игре», и две других молчали о том, сохранилось ли. */
  function toast(text) {
    if (!text) return;
    var e = document.createElement('div');
    e.className = 'toast';
    e.setAttribute('role', 'status');
    e.textContent = text;
    document.body.appendChild(e);
    setTimeout(function () { e.remove(); }, 2600);
  }

  /* Сохранить и сразу честно сказать, что вышло. */
  function saveCanvasAndSay(canvas, opts) {
    return saveCanvas(canvas, opts).then(function (how) {
      toast(word(how, 'image'));
      return how;
    });
  }


  /* ── в коллекцию ребёнка ───────────────────────────────────
     То, что ребёнок сделал в мастерской, попадает в «Мою коллекцию»
     личного кабинета — там это видят и он, и родители. Храним не полный
     холст, а уменьшенную копию: целая картинка на 1080×1520 заняла бы
     почти всё место в хранилище и вытеснила бы вещи из других игр. */
  var THUMB_W = 560, THUMB_Q = 0.82;

  function thumb(canvas) {
    try {
      var w = canvas.width, h = canvas.height;
      if (!w || !h) return '';
      var k = Math.min(1, THUMB_W / w);
      var t = document.createElement('canvas');
      t.width = Math.max(1, Math.round(w * k));
      t.height = Math.max(1, Math.round(h * k));
      var cx = t.getContext('2d');
      /* Белая подложка: холст с прозрачностью в JPEG станет чёрным */
      cx.fillStyle = '#FFF8EE';
      cx.fillRect(0, 0, t.width, t.height);
      /* Размер назначения задаём явно — иначе при масштабе контекста
         картинка уезжает за край (ловили это в пазле-тёрке) */
      cx.drawImage(canvas, 0, 0, t.width, t.height);
      return t.toDataURL('image/jpeg', THUMB_Q);
    } catch (e) { return ''; }
  }

  /* opts = { kind, title, note, game }. Возвращает id или null.
     Повторно не добавляет: ребёнок может обновить страницу на последнем
     экране, и одна и та же вещь оказалась бы в коллекции дважды. */
  function toGallery(canvas, opts) {
    opts = opts || {};
    var G = window.nookaGallery;
    if (!G || !canvas) return null;
    var title = opts.title || 'Без названия';
    try {
      var same = G.all().some(function (x) {
        return x.game === opts.game && x.title === title;
      });
      if (same) return null;
    } catch (e) {}
    var data = thumb(canvas);
    if (!data) return null;
    try {
      return G.add({
        kind: opts.kind || 'item',
        game: opts.game || '',
        title: title,
        note: opts.note || '',
        svg: '<img src="' + data + '" alt="">'
      });
    } catch (e) { return null; }
  }

  window.nookaShare = {
    saveBlob: saveBlob,
    saveCanvas: saveCanvas,
    saveCanvasAndSay: saveCanvasAndSay,
    toast: toast,
    toGallery: toGallery,
    word: word,
    fileName: fileName
  };
})();
