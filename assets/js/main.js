/* ==========================================================================
   苏彤彤 · 个人网站交互脚本（无依赖）
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 滚动出现动画 ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    /* 兜底：任何情况下 3.5 秒后强制显示，避免内容因动画未触发而不可见 */
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }, 3500);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call(
          el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal') : []
        );
        var idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx > 0 ? Math.min(idx, 5) * 90 : 0) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. 熟练度条形图 ---------- */
  function initMeters() {
    var meters = document.querySelectorAll('.skill-meter');
    meters.forEach(function (m) {
      m.style.setProperty('--w', (m.dataset.level || 60) + '%');
    });
    if (!('IntersectionObserver' in window) || reduceMotion) {
      meters.forEach(function (m) { m.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    meters.forEach(function (m) { io.observe(m); });
  }

  /* ---------- 3. 顶栏状态 + 阅读进度 ---------- */
  function initHeader() {
    var header = document.getElementById('siteHeader');
    var bar = document.getElementById('progressBar');
    var ticking = false;

    function update() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (header) header.classList.toggle('is-stuck', y > 12);
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var pct = h > 0 ? Math.min(100, Math.max(0, (y / h) * 100)) : 0;
        bar.style.width = pct + '%';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- 4. 导航高亮（滚动监听） ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if (!links.length) return;
    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) map[id] = { section: section, link: link };
    });
    var ids = Object.keys(map);
    if (!ids.length) return;

    function update() {
      var pos = (window.scrollY || 0) + window.innerHeight * 0.32;
      var current = null;
      ids.forEach(function (id) {
        if (map[id].section.offsetTop <= pos) current = id;
      });
      links.forEach(function (l) { l.classList.remove('is-active'); });
      if (current) map[current].link.classList.add('is-active');
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 5. 作品集筛选 ---------- */
  function initFilters() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('#workGrid .work-card'));
    var empty = document.getElementById('workEmpty');
    if (!buttons.length || !cards.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.dataset.filter;
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        var shown = 0;
        cards.forEach(function (card) {
          var match = filter === 'all' || card.dataset.cat === filter;
          card.classList.toggle('is-hidden', !match);
          if (match) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }

  /* ---------- 6. 复制到剪贴板 ---------- */
  function initCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      var label = btn.querySelector('.copy-label');
      var original = label ? label.textContent : btn.textContent;
      btn.addEventListener('click', function () {
        var text = btn.dataset.copy || '';
        var what = btn.dataset.copyText || '';

        function done(ok) {
          if (label) {
            label.textContent = ok
              ? (what ? what + '已复制' : '已复制：' + text)
              : '复制失败，请手动选择';
          }
          btn.classList.toggle('is-done', ok);
          setTimeout(function () {
            if (label) label.textContent = original;
            btn.classList.remove('is-done');
          }, 2200);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-1000px';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            done(ok);
          } catch (e) { done(false); }
        }
      });
    });
  }

  /* ---------- 7. 锚点平滑滚动（补偿吸顶栏） ---------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 78;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ---------- 8. 开场动画（curtain intro） ---------- */
  /* 返回 onDone 回调：开场动画结束后才开始播放页面内的滚动动效，
     避免首屏动画在幕布后面悄悄播完。 */
  function initIntro(onDone) {
    var intro = document.getElementById('intro');
    var done = onDone || function () {};
    if (!intro) { done(); return; }

    var skipBtn = document.getElementById('introSkip');
    var numEl = document.getElementById('introNum');

    /* 已看过（本次会话）、带 ?nointro、或系统开启减少动效 → 直接跳过 */
    var seen = false;
    try { seen = sessionStorage.getItem('stt-intro-seen') === '1'; } catch (e) { seen = false; }
    var noIntro = /[?&]nointro\b/.test(location.search);
    if (reduceMotion || seen || noIntro) {
      intro.parentNode.removeChild(intro);
      done();
      return;
    }

    document.body.classList.add('intro-lock');
    try { sessionStorage.setItem('stt-intro-seen', '1'); } catch (e) {}

    var finished = false;
    var revealed = false;
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function release() { if (!revealed) { revealed = true; done(); } }

    function startCount() {
      var total = 1400;
      var t0 = performance.now();
      (function step(now) {
        if (finished) return;
        var p = Math.min(1, (now - t0) / total);
        var eased = 1 - Math.pow(1 - p, 3);
        if (numEl) numEl.textContent = String(Math.round(eased * 100)).padStart(2, '0');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      if (numEl) numEl.textContent = '100';
      intro.classList.add('is-lifting');
      document.body.classList.remove('intro-lock');
      /* 幕布升起约 260ms 后放行首屏动画，让内容跟着幕布一起"浮"出来 */
      later(release, 260);
      later(function () {
        intro.classList.add('is-done');
        later(function () {
          if (intro.parentNode) intro.parentNode.removeChild(intro);
        }, 1100);
      }, 640);
    }

    intro.classList.add('is-play');
    startCount();
    /* 山脊线绘制约 1.4s，幕布 1.5s 起升 */
    later(finish, 1500);

    if (skipBtn) skipBtn.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') finish();
    });

    /* 兜底：无论动画是否正常播放，2.1 秒后一定放行页面，避免内容被幕布挡住 */
    setTimeout(function () {
      if (intro.parentNode) {
        intro.classList.add('is-lifting', 'is-done');
        later(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 900);
      }
      document.body.classList.remove('intro-lock');
      release();
    }, 2100);
  }

  /* ---------- 7. 核心能力折叠面板 ---------- */
  function initAccordion() {
    document.querySelectorAll('.acc-head').forEach(function (head) {
      var acc = head.closest ? head.closest('.acc') : null;
      var panel = acc ? acc.querySelector('.acc-panel') : null;
      if (!panel) return;

      head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.classList.toggle('is-open', !open);
        panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
        if (!open) {
          /* 展开完成后把高度交给内容，避免窗口变化时被截断 */
          setTimeout(function () { panel.style.maxHeight = 'none'; }, 460);
        }
      });
    });
  }

  /* ---------- 8. 折叠面板里的「查看作品」：顺带切到对应分类 ---------- */
  function initGoto() {
    document.querySelectorAll('[data-goto]').forEach(function (link) {
      link.addEventListener('click', function () {
        var target = link.dataset.goto;
        var btn = document.querySelector('.filter[data-filter="' + target + '"]');
        if (btn) btn.click();
        /* 平滑滚动交给 initAnchors 处理，这里只管切分类 */
      });
    });
  }

  /* ---------- 9. 年份 ---------- */
  function initYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- 10. 小猫光标：延迟跟随 + 拖动倾斜 + 拖影 + 眨眼 ---------- */
  function initCatCursor() {
    var mq = window.matchMedia;
    /* 触屏（无精确指针）与「减少动效」偏好 → 保持系统光标，不加 DOM 猫 */
    if (!mq || !mq('(pointer: fine)').matches) return;
    if (mq('(prefers-reduced-motion: reduce)').matches) return;

    var host = document.createElement('div');
    host.id = 'catCursor';
    var face = document.createElement('span');
    face.className = 'cat-face';
    host.appendChild(face);
    document.body.appendChild(host);

    /* 三级拖影：越靠后跟随越慢，位移落后越多，形成被拖着走的尾巴 */
    var tails = [];
    var ks = [0.150, 0.105, 0.068];
    for (var i = 0; i < 3; i++) {
      var t = document.createElement('div');
      t.className = 'cat-trail t' + (i + 1);
      t.appendChild(document.createElement('i'));
      document.body.appendChild(t);
      tails.push({ el: t, x: -200, y: -200, k: ks[i] });
    }

    var mx = -200, my = -200;   /* 鼠标真实位置 */
    var cx = -200, cy = -200;   /* 猫的当前位置（插值追赶鼠标） */
    var tilt = 0;               /* 拖动倾斜角 */
    var live = false;
    var raf = null;
    var blinkTimer = null;

    document.documentElement.className += ' has-cat';

    function onMove(e) {
      mx = e.clientX; my = e.clientY;
      if (!live) {
        live = true;
        cx = mx; cy = my;
        for (var j = 0; j < tails.length; j++) { tails[j].x = mx; tails[j].y = my; }
        host.classList.add('is-on');
        for (var n = 0; n < tails.length; n++) tails[n].el.classList.add('is-on');
        loop();
        scheduleBlink();
      }
    }

    function scheduleBlink() {
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(function () {
        blink();
        scheduleBlink();
      }, 3200 + Math.random() * 4800);   /* 3.2s–8s 随机自动眨一下 */
    }

    function blink() {
      host.classList.remove('is-blink');
      void host.offsetWidth;             /* 强制重排，保证连点两次也能重放动画 */
      host.classList.add('is-blink');
      setTimeout(function () { host.classList.remove('is-blink'); }, 260);
    }

    function loop() {
      var px = cx, py = cy;
      /* 主光标 k=0.22：轻微滞后，这是「拖动感」的来源 */
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;

      var vx = cx - px;
      var target = Math.max(-22, Math.min(22, vx * 1.15));   /* 横向速度 → 倾斜角 */
      tilt += (target - tilt) * 0.16;                        /* 倾斜自身再做平滑 */

      host.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';

      for (var i = 0; i < tails.length; i++) {
        var t = tails[i];
        t.x += (cx - t.x) * t.k;
        t.y += (cy - t.y) * t.k;
        t.el.style.transform = 'translate3d(' + t.x.toFixed(2) + 'px,' + t.y.toFixed(2) + 'px,0)';
      }
      raf = requestAnimationFrame(loop);
    }

    document.addEventListener('mousemove', onMove, { passive: true });

    /* 点击 → 眨眼 + 按下姿态 */
    document.addEventListener('mousedown', function () {
      host.classList.add('is-down');
      blink();
    }, { passive: true });
    document.addEventListener('mouseup', function () {
      host.classList.remove('is-down');
    }, { passive: true });

    /* 悬停可点元素 → 猫放大，提示「这里能点」 */
    var HOT = 'a,button,[role="button"],input,select,textarea,label,.sticker,.work-card,.acc-btn,.copy-btn,.filter';
    document.addEventListener('mouseover', function (e) {
      var hit = e.target && e.target.closest && e.target.closest(HOT);
      if (hit) host.classList.add('is-hot'); else host.classList.remove('is-hot');
    }, { passive: true });

    /* 鼠标移出窗口 → 收起 */
    document.addEventListener('mouseleave', function () {
      live = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      clearTimeout(blinkTimer);
      host.classList.remove('is-on', 'is-blink', 'is-down', 'is-hot');
      for (var i = 0; i < tails.length; i++) tails[i].el.classList.remove('is-on');
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initIntro(function () {
      initReveal();
      initMeters();
      initScrollSpy();
    });
    initHeader();
    initAccordion();
    initGoto();
    initFilters();
    initCopy();
    initAnchors();
    initYear();
    initCatCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
