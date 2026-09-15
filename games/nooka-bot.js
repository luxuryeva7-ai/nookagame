/* ============================================================
   КОНСТРУКТОР РОБОТОВ — детали мира Нейро.

   Один робот собирается из полутора десятков частей, у каждой
   несколько вариантов. Сотня деталей даёт миллионы роботов —
   поэтому в песочнице не может быть «такого не знаю»: любое
   сочетание слов складывается в готового персонажа.

   Стиль держится на четырёх вещах, общих с маскотом: мягкий
   корпус с градиентом, тёмный экран-лицо, неоновое свечение
   и акцентная полоса внизу.

   Пользуются: sandbox-bot.html, bots.html
   ============================================================ */
(function () {
  'use strict';

  /* ── палитры ── */
  var BODY = {
    белый: '#EFEAF8', снежный: '#FFFFFF', серый: '#9A93B5', чёрный: '#3A3550',
    красный: '#FF6B6B', оранжевый: '#FF9E7D', жёлтый: '#FFD84D', золотой: '#FFC94D',
    зелёный: '#6EDD9A', мятный: '#7DE8C8', бирюзовый: '#5BE3D0', голубой: '#7FD8FF',
    синий: '#5AA9FF', фиолетовый: '#A98BFF', сиреневый: '#C4A8FF', розовый: '#FF8FD4',
    коричневый: '#C08A5E', песочный: '#E8C79A',
  };
  var GLOW = {
    'фиолетовым': '#A98BFF', 'голубым': '#7FE7FF', 'жёлтым': '#FFD84D', 'зелёным': '#6EDD9A',
    'розовым': '#FF8FD4', 'красным': '#FF6B6B', 'белым': '#FFFFFF', 'бирюзовым': '#5BE3D0',
    'оранжевым': '#FFA94D', 'синим': '#5AA9FF',
  };

  var DEF = {
    body: '#EFEAF8', glow: '#A98BFF', shape: 'soft', size: 'normal',
    eye: 'arc', mouth: 'smile', ant: 'ball', ear: 'round', base: 'wheels',
    arm: 'none', hat: 'none', skin: 'none', gear: 'none',
  };

  function sh(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
    });
    return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  var seq = 0;

  /* ── сборка робота ──────────────────────────────────────────
     Порядок важен: что рисуется раньше, то оказывается позади. */
  function botSVG(o, opts) {
    opts = opts || {};
    var s = {};
    Object.keys(DEF).forEach(function (k) { s[k] = (o && o[k] !== undefined && o[k] !== null) ? o[k] : DEF[k]; });

    var id = opts.id || ('nb' + (++seq));
    var C = s.body, G = s.glow;
    var W = 240, H = 250, cx = W / 2;

    var k = s.size === 'big' ? 1.12 : s.size === 'small' ? 0.84 : 1;
    /* пропорции разводим сильнее: на превью одно скругление формы не различает */
    var bw = (s.shape === 'wide' ? 168 : s.shape === 'tall' ? 108 : s.shape === 'round' ? 140 : 134) * k;
    var bh = (s.shape === 'tall' ? 162 : s.shape === 'wide' ? 108 : s.shape === 'round' ? 140 : 130) * k;
    var by = 62 + (1 - k) * 22 - (s.shape === 'tall' ? 14 : 0);
    var bcy = by + bh / 2, fy = by + bh;
    var rx = s.shape === 'box' ? 12 : s.shape === 'drop' ? 64 : s.shape === 'round' ? bw / 2 : 38;
    var p = [];

    /* ── за корпусом: рюкзак, крылья, антенна, уши, руки ── */
    /* рюкзак торчит из-за корпуса заметно: при прежнем смещении его край
       выходил на пару пикселей и деталь просто не читалась */
    if (s.gear === 'pack') p.push(
      '<rect x="' + (cx - bw * 0.64) + '" y="' + (bcy - bh * 0.22) + '" width="' + (bw * 0.34) +
      '" height="' + (bh * 0.52) + '" rx="15" fill="' + sh(C, -0.4) + '"/>',
      '<rect x="' + (cx + bw * 0.3) + '" y="' + (bcy - bh * 0.22) + '" width="' + (bw * 0.34) +
      '" height="' + (bh * 0.52) + '" rx="15" fill="' + sh(C, -0.4) + '"/>');
    if (s.gear === 'wings') [-1, 1].forEach(function (d) {
      p.push('<path d="M' + (cx + d * bw * 0.4) + ' ' + (bcy - 10) +
        ' q' + (d * 66) + ' -44 ' + (d * 78) + ' 10 q' + (d * -28) + ' 2 ' + (d * -50) + ' 24 Z" fill="' +
        G + '" opacity=".5"/>');
    });

    /* под шляпой антенна торчит сквозь неё: короне и колпаку она мешает,
       а кепке и наушникам — нет, они низкие */
    var antHidden = s.hat === 'crown' || s.hat === 'wizard' || s.hat === 'top';
    if (antHidden) s = Object.assign({}, s, { ant: 'none' });

    if (s.ant === 'ball') p.push(
      '<path d="M' + cx + ' ' + (by + 6) + ' L' + (cx + 15) + ' ' + (by - 36) + '" stroke="' + sh(C, -0.45) +
      '" stroke-width="5" stroke-linecap="round"/>',
      '<circle cx="' + (cx + 15) + '" cy="' + (by - 40) + '" r="14" fill="' + G + '" opacity=".22"/>',
      '<circle cx="' + (cx + 15) + '" cy="' + (by - 40) + '" r="8" fill="' + G + '"/>');
    if (s.ant === 'spring') p.push(
      '<path d="M' + cx + ' ' + (by + 4) + ' q-17 -12 0 -20 q17 -8 0 -18 q-15 -8 3 -14" fill="none" stroke="' +
      sh(C, -0.45) + '" stroke-width="5" stroke-linecap="round"/>',
      '<circle cx="' + (cx + 3) + '" cy="' + (by - 52) + '" r="13" fill="' + G + '" opacity=".22"/>',
      '<circle cx="' + (cx + 3) + '" cy="' + (by - 52) + '" r="7" fill="' + G + '"/>');
    if (s.ant === 'two') p.push(
      '<path d="M' + (cx - 26) + ' ' + (by + 8) + ' L' + (cx - 38) + ' ' + (by - 30) + '" stroke="' +
      sh(C, -0.45) + '" stroke-width="5" stroke-linecap="round"/>',
      '<path d="M' + (cx + 26) + ' ' + (by + 8) + ' L' + (cx + 38) + ' ' + (by - 30) + '" stroke="' +
      sh(C, -0.45) + '" stroke-width="5" stroke-linecap="round"/>',
      '<circle cx="' + (cx - 38) + '" cy="' + (by - 34) + '" r="7" fill="' + G + '"/>',
      '<circle cx="' + (cx + 38) + '" cy="' + (by - 34) + '" r="7" fill="' + G + '"/>');
    if (s.ant === 'flag') p.push(
      '<path d="M' + cx + ' ' + (by + 6) + ' L' + cx + ' ' + (by - 44) + '" stroke="' + sh(C, -0.45) +
      '" stroke-width="5" stroke-linecap="round"/>',
      '<path d="M' + cx + ' ' + (by - 44) + ' l30 9 l-30 11 Z" fill="' + G + '"/>');
    if (s.ant === 'horns') [-1, 1].forEach(function (d) {
      p.push('<path d="M' + (cx + d * bw * 0.22) + ' ' + (by + 10) + ' q' + (d * 4) + ' -30 ' +
        (d * 24) + ' -36 q' + (d * -11) + ' 18 ' + (d * -9) + ' 38 Z" fill="' + sh(C, -0.25) + '"/>');
    });

    if (s.ear === 'round') [-1, 1].forEach(function (d) {
      p.push('<circle cx="' + (cx + d * (bw / 2 + 4)) + '" cy="' + bcy + '" r="17" fill="' + sh(C, -0.18) + '"/>',
        '<circle cx="' + (cx + d * (bw / 2 + 4)) + '" cy="' + bcy + '" r="7" fill="' + G + '" opacity=".85"/>');
    });
    if (s.ear === 'big') [-1, 1].forEach(function (d) {
      p.push('<rect x="' + (cx + d * (bw / 2 + 6) - 10) + '" y="' + (bcy - 32) +
        '" width="20" height="64" rx="10" fill="' + sh(C, -0.2) + '"/>');
    });
    if (s.ear === 'dish') [-1, 1].forEach(function (d) {
      p.push('<ellipse cx="' + (cx + d * (bw / 2 + 10)) + '" cy="' + (bcy - 6) + '" rx="9" ry="20" fill="' +
        sh(C, -0.22) + '" transform="rotate(' + (d * 16) + ' ' + (cx + d * (bw / 2 + 10)) + ' ' + (bcy - 6) + ')"/>');
    });

    if (s.arm === 'claw') [-1, 1].forEach(function (d) {
      p.push('<path d="M' + (cx + d * bw * 0.48) + ' ' + (bcy + 6) + ' l' + (d * 30) + ' 14" stroke="' +
        sh(C, -0.32) + '" stroke-width="10" stroke-linecap="round"/>',
        '<path d="M' + (cx + d * (bw * 0.48 + 32)) + ' ' + (bcy + 12) + ' l' + (d * 14) + ' -10 M' +
        (cx + d * (bw * 0.48 + 32)) + ' ' + (bcy + 26) + ' l' + (d * 14) + ' 8" stroke="' + sh(C, -0.32) +
        '" stroke-width="7" stroke-linecap="round"/>');
    });
    if (s.arm === 'paw') [-1, 1].forEach(function (d) {
      p.push('<path d="M' + (cx + d * bw * 0.46) + ' ' + (bcy) + ' q' + (d * 32) + ' 8 ' + (d * 30) + ' 34" stroke="' +
        sh(C, -0.3) + '" stroke-width="11" stroke-linecap="round" fill="none"/>',
        '<circle cx="' + (cx + d * (bw * 0.46 + 30)) + '" cy="' + (bcy + 38) + '" r="11" fill="' + sh(C, -0.36) + '"/>');
    });
    if (s.arm === 'magnet') [-1, 1].forEach(function (d) {
      p.push('<rect x="' + (cx + d * bw * 0.46 - (d < 0 ? 34 : 0)) + '" y="' + (bcy + 2) +
        '" width="34" height="11" rx="5.5" fill="' + sh(C, -0.3) + '"/>',
        '<circle cx="' + (cx + d * (bw * 0.46 + 34)) + '" cy="' + (bcy + 8) + '" r="10" fill="' + G + '" opacity=".9"/>');
    });

    /* ── низ ── */
    if (s.base === 'wheels') [-1, 1].forEach(function (d) {
      p.push('<ellipse cx="' + (cx + d * bw * 0.27) + '" cy="' + (fy + 6) + '" rx="22" ry="17" fill="' +
        sh(C, -0.38) + '"/>',
        '<circle cx="' + (cx + d * bw * 0.27) + '" cy="' + (fy + 6) + '" r="6" fill="' + G + '" opacity=".8"/>');
    });
    if (s.base === 'legs') [-1, 1].forEach(function (d) {
      p.push('<rect x="' + (cx + d * bw * 0.3 - 9) + '" y="' + (fy - 8) + '" width="18" height="32" rx="9" fill="' +
        sh(C, -0.3) + '"/>',
        '<ellipse cx="' + (cx + d * bw * 0.3) + '" cy="' + (fy + 26) + '" rx="16" ry="8" fill="' + sh(C, -0.4) + '"/>');
    });
    if (s.base === 'track') p.push(
      '<rect x="' + (cx - bw * 0.46) + '" y="' + (fy - 6) + '" width="' + (bw * 0.92) +
      '" height="30" rx="15" fill="' + sh(C, -0.4) + '"/>',
      '<circle cx="' + (cx - bw * 0.28) + '" cy="' + (fy + 9) + '" r="8" fill="' + G + '" opacity=".7"/>',
      '<circle cx="' + cx + '" cy="' + (fy + 9) + '" r="8" fill="' + G + '" opacity=".7"/>',
      '<circle cx="' + (cx + bw * 0.28) + '" cy="' + (fy + 9) + '" r="8" fill="' + G + '" opacity=".7"/>');
    if (s.base === 'spring') p.push(
      '<path d="M' + cx + ' ' + fy + ' q-20 8 0 14 q20 6 0 14 q-20 6 0 12" fill="none" stroke="' +
      sh(C, -0.35) + '" stroke-width="8" stroke-linecap="round"/>',
      '<ellipse cx="' + cx + '" cy="' + (fy + 48) + '" rx="26" ry="9" fill="' + sh(C, -0.42) + '"/>');
    if (s.base === 'float') p.push(
      '<ellipse cx="' + cx + '" cy="' + (fy + 18) + '" rx="' + (bw * 0.34) + '" ry="10" fill="' + G + '" opacity=".28"/>',
      '<ellipse cx="' + cx + '" cy="' + (fy + 18) + '" rx="' + (bw * 0.2) + '" ry="6" fill="' + G + '" opacity=".55"/>');

    /* ── корпус ── */
    var bodyShape = s.shape === 'drop'
      /* капля: узкая макушка и широкий низ, иначе неотличима от круглого */
      ? '<path d="M' + cx + ' ' + by + ' q' + (bw * 0.5) + ' 6 ' + (bw * 0.5) + ' ' + (bh * 0.56) +
        ' a' + (bw * 0.5) + ' ' + (bh * 0.44) + ' 0 0 1 -' + bw + ' 0' +
        ' q0 -' + (bh * 0.5) + ' ' + (bw * 0.5) + ' -' + (bh * 0.56) + ' Z" fill="url(#' + id + 'g)"/>'
      : '<rect x="' + (cx - bw / 2) + '" y="' + by + '" width="' + bw + '" height="' + bh +
        '" rx="' + rx + '" fill="url(#' + id + 'g)"/>';
    p.push(bodyShape);

    /* узор — внутри корпуса */
    var pat = [];
    if (s.skin === 'stripes') for (var i = 0; i < 5; i++) pat.push(
      '<rect x="' + (cx - bw / 2 + 6 + i * (bw / 5.4)) + '" y="' + by + '" width="9" height="' + bh +
      '" fill="#000" opacity=".16"/>');
    if (s.skin === 'dots') [[-0.3, -0.3], [0.26, -0.24], [-0.12, 0.3], [0.32, 0.3], [-0.34, 0.1], [0.06, -0.06]]
      .forEach(function (d, j) {
        pat.push('<circle cx="' + (cx + d[0] * bw) + '" cy="' + (bcy + d[1] * bh) + '" r="10" fill="#000" opacity=".17"/>');
      });
    if (s.skin === 'stars') [[-0.32, -0.28], [0.3, -0.18], [-0.2, 0.32], [0.28, 0.3]].forEach(function (d, j) {
      var x = cx + d[0] * bw, y = bcy + d[1] * bh;
      pat.push('<path d="M' + x + ' ' + (y - 11) + ' l3.5 7.5 l7.5 3.5 l-7.5 3.5 l-3.5 7.5 l-3.5 -7.5 l-7.5 -3.5 l7.5 -3.5 Z" fill="' +
        G + '" opacity=".8"/>');
    });
    if (s.skin === 'bolt') pat.push('<path d="M' + (cx - bw * 0.3) + ' ' + (bcy - bh * 0.3) + ' l' +
      (bw * 0.18) + ' ' + (bh * 0.26) + ' l-' + (bw * 0.08) + ' 4 l' + (bw * 0.2) + ' ' + (bh * 0.3) +
      ' l-' + (bw * 0.04) + ' -' + (bh * 0.34) + ' l' + (bw * 0.08) + ' -4 Z" fill="' + G + '" opacity=".45"/>');
    if (s.skin === 'patch') pat.push(
      '<rect x="' + (cx + bw * 0.12) + '" y="' + (bcy + bh * 0.12) + '" width="' + (bw * 0.26) +
      '" height="' + (bh * 0.24) + '" rx="8" fill="#000" opacity=".12"/>',
      '<path d="M' + (cx + bw * 0.12) + ' ' + (bcy + bh * 0.24) + ' l' + (bw * 0.26) + ' 0" stroke="' +
      sh(C, -0.4) + '" stroke-width="3" stroke-dasharray="6 5"/>');

    /* акцентная полоса и узор обрезаны по корпусу: иначе вылезают за углы */
    p.push('<g clip-path="url(#' + id + 'c)">' + pat.join('') +
      '<path d="M' + (cx - bw / 2 - 6) + ' ' + (fy - 36) + ' q' + (bw / 2) + ' 28 ' + (bw + 12) + ' 0 L' +
      (cx + bw / 2 + 6) + ' ' + (fy + 6) + ' L' + (cx - bw / 2 - 6) + ' ' + (fy + 6) + ' Z" fill="' +
      G + '" opacity=".9"/></g>');

    /* блик от лампы */
    p.push('<ellipse cx="' + (cx - bw * 0.22) + '" cy="' + (by + bh * 0.2) + '" rx="' + (bw * 0.19) +
      '" ry="' + (bh * 0.12) + '" fill="#fff" opacity=".2" transform="rotate(-20 ' +
      (cx - bw * 0.22) + ' ' + (by + bh * 0.2) + ')"/>');

    /* ── экран-лицо ── */
    var sw = bw * 0.72, shh = bh * 0.56, sx = cx - sw / 2, sy = by + bh * 0.13;
    var srx = s.shape === 'box' ? 14 : 26;
    p.push('<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + shh + '" rx="' + srx +
      '" fill="url(#' + id + 's)"/>',
      '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + shh + '" rx="' + srx +
      '" fill="none" stroke="' + sh(C, -0.3) + '" stroke-width="3"/>');

    /* ── глаза ── */
    var ey = sy + shh * 0.42, ed = sw * 0.24;
    function eye(x) {
      switch (s.eye) {
        case 'round': return '<circle cx="' + x + '" cy="' + ey + '" r="11" fill="' + G + '"/>';
        case 'star': return '<path d="M' + x + ' ' + (ey - 13) + ' l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill="' + G + '"/>';
        case 'sq': return '<rect x="' + (x - 10) + '" y="' + (ey - 10) + '" width="20" height="20" rx="6" fill="' + G + '"/>';
        case 'cross': return '<path d="M' + (x - 12) + ' ' + (ey - 6) + ' l24 12 M' + (x - 12) + ' ' + (ey + 6) +
          ' l24 -12" stroke="' + G + '" stroke-width="5" stroke-linecap="round"/>';
        case 'heart': return '<path d="M' + x + ' ' + (ey + 9) + ' q-13 -9 -13 -17 a7 7 0 0 1 13 -4 a7 7 0 0 1 13 4 q0 8 -13 17 Z" fill="' + G + '"/>';
        case 'moon': return '<path d="M' + (x + 5) + ' ' + (ey - 11) + ' a12 12 0 1 0 0 22 a9 9 0 1 1 0 -22 Z" fill="' + G + '"/>';
        case 'wink': return '<path d="M' + (x - 12) + ' ' + ey + ' q12 -10 24 0" fill="none" stroke="' + G +
          '" stroke-width="5.5" stroke-linecap="round"/>';
        case 'dot': return '<circle cx="' + x + '" cy="' + ey + '" r="5.5" fill="' + G + '"/>';
        /* закрытые глаза: нужны там, где робот чего-то лишён — в мастерской
           помощников видно сразу, что глаз ему не дали. Слова в словаре нет:
           во второй песочнице этот вариант не выпадает. */
        case 'shut': return '<path d="M' + (x - 12) + ' ' + ey + ' q12 11 24 0" fill="none" stroke="' + G +
          '" stroke-width="5.5" stroke-linecap="round" opacity=".45"/>';
        case 'ring': return '<circle cx="' + x + '" cy="' + ey + '" r="10" fill="none" stroke="' + G + '" stroke-width="5"/>';
        default: return '<path d="M' + (x - 13) + ' ' + (ey + 4) + ' a13 13 0 0 1 26 0" fill="none" stroke="' +
          G + '" stroke-width="6" stroke-linecap="round"/>';
      }
    }
    if (s.eye === 'one') {
      p.push('<circle cx="' + cx + '" cy="' + ey + '" r="26" fill="' + G + '" opacity=".16"/>',
        '<circle cx="' + cx + '" cy="' + ey + '" r="16" fill="' + G + '"/>',
        '<circle cx="' + (cx + 5) + '" cy="' + (ey - 5) + '" r="5" fill="#0F0B1C" opacity=".5"/>');
    } else {
      p.push('<circle cx="' + (cx - ed) + '" cy="' + ey + '" r="20" fill="' + G + '" opacity=".15"/>',
        '<circle cx="' + (cx + ed) + '" cy="' + ey + '" r="20" fill="' + G + '" opacity=".15"/>',
        eye(cx - ed), eye(cx + ed));
    }

    /* ── рот ── */
    var my = sy + shh * 0.78;
    var M = {
      smile: '<path d="M' + (cx - 16) + ' ' + (my - 4) + ' q16 12 32 0" fill="none" stroke="' + G +
        '" stroke-width="5" stroke-linecap="round" opacity=".92"/>',
      line: '<rect x="' + (cx - 15) + '" y="' + (my - 3) + '" width="30" height="6" rx="3" fill="' + G + '" opacity=".92"/>',
      wave: '<path d="M' + (cx - 18) + ' ' + my + ' q6 -7 12 0 t12 0" fill="none" stroke="' + G +
        '" stroke-width="5" stroke-linecap="round" opacity=".92"/>',
      o: '<circle cx="' + cx + '" cy="' + my + '" r="8" fill="none" stroke="' + G + '" stroke-width="5" opacity=".92"/>',
      sad: '<path d="M' + (cx - 16) + ' ' + (my + 4) + ' q16 -12 32 0" fill="none" stroke="' + G +
        '" stroke-width="5" stroke-linecap="round" opacity=".92"/>',
      grid: '<rect x="' + (cx - 17) + '" y="' + (my - 7) + '" width="34" height="14" rx="4" fill="none" stroke="' +
        G + '" stroke-width="3.5" opacity=".9"/><path d="M' + (cx - 6) + ' ' + (my - 7) + ' l0 14 M' +
        (cx + 6) + ' ' + (my - 7) + ' l0 14" stroke="' + G + '" stroke-width="3" opacity=".9"/>',
      none: '',
    };
    p.push(M[s.mouth] !== undefined ? M[s.mouth] : M.smile);

    /* ── поверх всего: шляпа и очки ── */
    if (s.hat === 'crown') p.push('<path d="M' + (cx - 34) + ' ' + (by - 2) + ' l0 -26 l14 12 l12 -20 l12 20 l14 -12 l0 26 Z" fill="#FFD84D"/>' +
      '<circle cx="' + cx + '" cy="' + (by - 26) + '" r="4.5" fill="' + G + '"/>');
    if (s.hat === 'cap') p.push('<path d="M' + (cx - 36) + ' ' + (by - 2) + ' a36 30 0 0 1 72 0 Z" fill="' + sh(G, -0.15) + '"/>' +
      '<path d="M' + (cx + 20) + ' ' + (by - 2) + ' l34 4 l0 9 l-34 -3 Z" fill="' + sh(G, -0.3) + '"/>');
    if (s.hat === 'top') p.push('<rect x="' + (cx - 40) + '" y="' + (by - 8) + '" width="80" height="9" rx="4.5" fill="#3A3550"/>' +
      '<rect x="' + (cx - 24) + '" y="' + (by - 44) + '" width="48" height="38" rx="6" fill="#4A4560"/>' +
      '<rect x="' + (cx - 24) + '" y="' + (by - 20) + '" width="48" height="9" fill="' + G + '"/>');
    if (s.hat === 'wizard') p.push('<path d="M' + (cx - 32) + ' ' + (by - 2) + ' L' + cx + ' ' + (by - 66) + ' L' + (cx + 32) + ' ' + (by - 2) + ' Z" fill="#6A4FC0"/>' +
      '<path d="M' + (cx - 8) + ' ' + (by - 34) + ' l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 Z" fill="' + G + '"/>');
    if (s.hat === 'phones') p.push('<path d="M' + (cx - bw / 2 - 2) + ' ' + (bcy - 16) + ' a' + (bw / 2 + 2) + ' ' + (bh * 0.48) + ' 0 0 1 ' + (bw + 4) + ' 0" fill="none" stroke="' + sh(C, -0.42) + '" stroke-width="9"/>' +
      '<rect x="' + (cx - bw / 2 - 14) + '" y="' + (bcy - 20) + '" width="22" height="42" rx="11" fill="' + sh(C, -0.42) + '"/>' +
      '<rect x="' + (cx + bw / 2 - 8) + '" y="' + (bcy - 20) + '" width="22" height="42" rx="11" fill="' + sh(C, -0.42) + '"/>');

    if (s.gear === 'glasses') p.push('<circle cx="' + (cx - ed) + '" cy="' + ey + '" r="16" fill="none" stroke="' + sh(C, -0.45) + '" stroke-width="4"/>' +
      '<circle cx="' + (cx + ed) + '" cy="' + ey + '" r="16" fill="none" stroke="' + sh(C, -0.45) + '" stroke-width="4"/>' +
      '<path d="M' + (cx - ed + 16) + ' ' + ey + ' l' + (ed * 2 - 32) + ' 0" stroke="' + sh(C, -0.45) + '" stroke-width="4"/>');
    if (s.gear === 'shades') p.push('<path d="M' + (cx - ed - 18) + ' ' + (ey - 10) + ' l' + (ed * 2 + 36) + ' 0 l-4 16 q-' + (ed - 4) + ' 10 -' + (ed - 2) + ' -2 q-' + (ed - 2) + ' 12 -' + (ed - 4) + ' 2 Z" fill="#2A2440" opacity=".92"/>');
    if (s.gear === 'scarf') p.push('<path d="M' + (cx - bw * 0.42) + ' ' + (fy - 22) + ' q' + (bw * 0.42) + ' 20 ' + (bw * 0.84) + ' 0 l0 14 q-' + (bw * 0.42) + ' 20 -' + (bw * 0.84) + ' 0 Z" fill="#FF6B6B"/>' +
      '<path d="M' + (cx + bw * 0.28) + ' ' + (fy - 10) + ' l16 34 l-16 4 Z" fill="#E85555"/>');
    if (s.gear === 'bow') p.push('<path d="M' + cx + ' ' + (fy - 14) + ' l-22 -11 l0 22 Z" fill="#FF6B6B"/>' +
      '<path d="M' + cx + ' ' + (fy - 14) + ' l22 -11 l0 22 Z" fill="#FF6B6B"/>' +
      '<circle cx="' + cx + '" cy="' + (fy - 14) + '" r="6" fill="#E85555"/>');

    var defs = '<defs>' +
      '<clipPath id="' + id + 'c">' + (s.shape === 'drop'
        ? '<path d="M' + cx + ' ' + by + ' q' + (bw * 0.5) + ' 6 ' + (bw * 0.5) + ' ' + (bh * 0.56) +
          ' a' + (bw * 0.5) + ' ' + (bh * 0.44) + ' 0 0 1 -' + bw + ' 0' +
          ' q0 -' + (bh * 0.5) + ' ' + (bw * 0.5) + ' -' + (bh * 0.56) + ' Z"/>'
        : '<rect x="' + (cx - bw / 2) + '" y="' + by + '" width="' + bw +
          '" height="' + bh + '" rx="' + rx + '"/>') + '</clipPath>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0.3" y2="1">' +
      '<stop offset="0" stop-color="' + sh(C, 0.34) + '"/>' +
      '<stop offset="0.5" stop-color="' + C + '"/>' +
      '<stop offset="1" stop-color="' + sh(C, -0.26) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#241C3E"/><stop offset="1" stop-color="#0F0B1C"/></linearGradient>' +
      '</defs>';

    /* у парящего под днищем своё свечение — вторая тень читается как ошибка */
    var shadow = s.base === 'float'
      ? '<ellipse cx="' + cx + '" cy="' + (H - 8) + '" rx="' + (bw * 0.3) + '" ry="7" fill="#000" opacity=".22"/>'
      : '<ellipse cx="' + cx + '" cy="' + (H - 10) + '" rx="' + (bw * 0.44) + '" ry="10" fill="#000" opacity=".3"/>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" ' +
      (opts.attrs || 'style="width:100%;display:block"') + '>' + defs + shadow + p.join('') + '</svg>';
  }

  /* ── словарь: слово → что оно меняет ─────────────────────────
     Ключ — начало слова, чтобы ловить падежи: «с крыльями»,
     «крылья», «крыло» дают одно и то же. Порядок важен: длинные
     корни идут первыми, иначе «звёздочки» съест «звезда». */
  var WORDS = [];

  function add(roots, patch, label, group) {
    WORDS.push({ roots: roots, patch: patch, label: label, group: group });
  }

  Object.keys(BODY).forEach(function (n) {
    add([n.slice(0, Math.max(4, n.length - 2))], { body: BODY[n] }, n, 'цвет');
  });
  Object.keys(GLOW).forEach(function (n) {
    add(['светится ' + n, 'свет ' + n], { glow: GLOW[n] }, 'светится ' + n, 'свечение');
  });

  add(['квадратн', 'ящик', 'прямоугольн'], { shape: 'box' }, 'квадратный', 'форма');
  add(['кругл'], { shape: 'round' }, 'круглый', 'форма');
  add(['капл', 'грушев'], { shape: 'drop' }, 'капля', 'форма');
  add(['высок', 'длинн', 'вытянут'], { shape: 'tall' }, 'высокий', 'форма');
  add(['широк', 'толст', 'пузат'], { shape: 'wide' }, 'широкий', 'форма');
  add(['мягк', 'обычн'], { shape: 'soft' }, 'мягкий', 'форма');

  add(['больш', 'огромн', 'гигантск'], { size: 'big' }, 'большой', 'размер');
  add(['маленьк', 'малыш', 'крошечн', 'мелк'], { size: 'small' }, 'маленький', 'размер');

  add(['звёздн', 'звездн', 'звёзды в глаз', 'глаза звёзд'], { eye: 'star' }, 'глаза-звёзды', 'глаза');
  add(['сердечк', 'влюбл'], { eye: 'heart' }, 'глаза-сердечки', 'глаза');
  add(['полумесяц', 'месяц', 'сонн'], { eye: 'moon' }, 'глаза-полумесяцы', 'глаза');
  add(['хитр', 'прищур', 'подмиг'], { eye: 'wink' }, 'хитрые глаза', 'глаза');
  add(['крестик', 'зажмур'], { eye: 'cross' }, 'глаза-крестики', 'глаза');
  add(['одноглаз', 'один глаз', 'циклоп'], { eye: 'one' }, 'один глаз', 'глаза');
  add(['квадратн глаз', 'глаза квадрат'], { eye: 'sq' }, 'квадратные глаза', 'глаза');
  add(['кольц'], { eye: 'ring' }, 'глаза-кольца', 'глаза');
  add(['точечн', 'глаза точк'], { eye: 'dot' }, 'глаза-точки', 'глаза');
  add(['добр', 'весёл', 'весел', 'радостн'], { eye: 'arc', mouth: 'smile' }, 'добрый', 'настроение');
  add(['грустн', 'печальн'], { mouth: 'sad' }, 'грустный', 'настроение');
  add(['серьёзн', 'серьезн', 'строг'], { mouth: 'line', eye: 'dot' }, 'серьёзный', 'настроение');
  add(['удивл'], { mouth: 'o', eye: 'round' }, 'удивлённый', 'настроение');
  add(['зл', 'сердит', 'грозн'], { eye: 'cross', mouth: 'grid' }, 'злой', 'настроение');
  add(['поёт', 'поет', 'пою'], { mouth: 'o' }, 'поёт', 'рот');
  add(['молчал', 'без рта'], { mouth: 'none' }, 'без рта', 'рот');

  add(['пружинк', 'на пружинк'], { ant: 'spring' }, 'антенна-пружинка', 'антенна');
  add(['две антенн', 'двумя антенн', 'с усик'], { ant: 'two' }, 'две антенны', 'антенна');
  add(['флажок', 'флаг'], { ant: 'flag' }, 'с флажком', 'антенна');
  add(['рожк', 'с рогам', 'рога'], { ant: 'horns' }, 'с рожками', 'антенна');
  add(['без антенн'], { ant: 'none' }, 'без антенны', 'антенна');
  add(['антенн'], { ant: 'ball' }, 'с антенной', 'антенна');

  add(['локатор', 'тарелк'], { ear: 'dish' }, 'локаторы', 'уши');
  add(['больш уш', 'ушаст'], { ear: 'big' }, 'большие уши', 'уши');
  add(['без уш'], { ear: 'none' }, 'без ушей', 'уши');
  add(['уш', 'ух'], { ear: 'round' }, 'с ушами', 'уши');

  add(['гусениц', 'танк'], { base: 'track' }, 'на гусеницах', 'низ');
  add(['на пружин'], { base: 'spring' }, 'на пружине', 'низ');
  add(['лета', 'парит', 'парящ', 'левитир'], { base: 'float' }, 'летает', 'низ');
  add(['ножк', 'на ногах', 'ног'], { base: 'legs' }, 'на ножках', 'низ');
  add(['колёс', 'колес'], { base: 'wheels' }, 'на колёсах', 'низ');

  add(['клешн'], { arm: 'claw' }, 'с клешнями', 'руки');
  add(['лапк', 'с рукам', 'руки'], { arm: 'paw' }, 'с лапками', 'руки');
  add(['магнит'], { arm: 'magnet' }, 'с магнитами', 'руки');

  add(['корон', 'король', 'королев', 'принцесс'], { hat: 'crown' }, 'в короне', 'шляпа');
  add(['кепк', 'бейсболк'], { hat: 'cap' }, 'в кепке', 'шляпа');
  add(['цилиндр', 'шляп'], { hat: 'top' }, 'в шляпе', 'шляпа');
  add(['колпак', 'волшебн', 'маг', 'чародей'], { hat: 'wizard' }, 'в колпаке', 'шляпа');
  add(['наушник'], { hat: 'phones' }, 'в наушниках', 'шляпа');

  add(['полоск', 'полосат'], { skin: 'stripes' }, 'в полоску', 'узор');
  add(['горош', 'пятныш', 'крапин'], { skin: 'dots' }, 'в горошек', 'узор');
  /* «со звёздами» — самая частая форма у детей, а корень «звёзд» целиком
     брать нельзя: он съел бы «звёздные глаза» из другой группы */
  /* только точные формы: корень «со звёзд» цеплял и «со звёздными глазами»,
     и робот получал узор, которого не просили */
  add(['в звёзд', 'в звезд', 'звёздами', 'звездами', 'звёздоч'],
    { skin: 'stars' }, 'в звёздах', 'узор');
  add(['молни', 'электр'], { skin: 'bolt' }, 'с молнией', 'узор');
  add(['заплат', 'латан'], { skin: 'patch' }, 'с заплаткой', 'узор');

  add(['тёмн очк', 'темн очк', 'солнечн очк'], { gear: 'shades' }, 'в тёмных очках', 'вещи');
  add(['очк'], { gear: 'glasses' }, 'в очках', 'вещи');
  add(['шарф'], { gear: 'scarf' }, 'в шарфе', 'вещи');
  add(['бабочк', 'галстук'], { gear: 'bow' }, 'с бабочкой', 'вещи');
  add(['рюкзак', 'ранец'], { gear: 'pack' }, 'с рюкзаком', 'вещи');
  add(['крыл'], { gear: 'wings' }, 'с крыльями', 'вещи');

  /* слова, которые ничего не задают, но и ругаться на них незачем */
  var SKIP = ['робот', 'робота', 'бот', 'друг', 'помощник', 'сделай', 'хочу', 'мне',
    'пожалуйста', 'и', 'с', 'со', 'на', 'в', 'а', 'но', 'очень', 'такой', 'который', 'он', 'она'];

  /* ── разбор фразы ── */
  function parse(text) {
    var low = ' ' + String(text || '').toLowerCase().replace(/[.,!?;:()"'—-]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var spec = {}, got = [], seen = {};

    WORDS.forEach(function (w) {
      if (seen[w.group]) return;           // одна группа — одно значение
      var hit = w.roots.some(function (r) { return low.indexOf(' ' + r) > -1; });
      if (!hit) return;
      seen[w.group] = true;
      Object.keys(w.patch).forEach(function (k) { spec[k] = w.patch[k]; });
      got.push(w.label);
    });

    return { spec: spec, got: got };
  }

  /* ── подсказки для ввода ── */
  function hints(part) {
    var q = String(part || '').toLowerCase().trim();
    var out = [];
    WORDS.forEach(function (w) {
      if (out.length >= 8) return;
      if (out.indexOf(w.label) > -1) return;
      if (!q) return;
      var fits = w.label.toLowerCase().indexOf(q) === 0 ||
        w.roots.some(function (r) { return r.indexOf(q) === 0; });
      if (fits) out.push(w.label);
    });
    return out;
  }

  /* все слова по группам — для подсказок на пустом поле */
  function groups() {
    var g = {};
    WORDS.forEach(function (w) {
      if (!g[w.group]) g[w.group] = [];
      if (g[w.group].indexOf(w.label) < 0) g[w.group].push(w.label);
    });
    return g;
  }

  window.nookaBot = {
    build: botSVG,
    DEF: DEF,
    BODY: BODY,
    GLOW: GLOW,
    shade: sh,
    parse: parse,
    hints: hints,
    groups: groups,
    words: WORDS,
  };
})();
