/* Яндекс.Метрика, счётчик 112842000. Подключается одной строкой:
   <script src="/metrika.js" defer></script>
   Меняется счётчик — меняется только этот файл, а не 80 страниц.

   Считаем ТОЛЬКО боевой сайт: на localhost и тестовых стендах
   (*.dev.nookagame.ru) счётчик не запускается, иначе наши же проверки
   попадут в статистику и испортят её. */
(function () {
  var host = location.hostname;
  if (host !== 'nookagame.ru' && host !== 'www.nookagame.ru') return;

  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) {
      if (document.scripts[j].src === r) return;
    }
    k = e.createElement(t); a = e.getElementsByTagName(t)[0];
    k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=112842000', 'ym');

  ym(112842000, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  });

  /* Резервная картинка для браузеров без JS не нужна: этот файл сам JS.
     Кто дошёл сюда — JS у него включён. */
})();
