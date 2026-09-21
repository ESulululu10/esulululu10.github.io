/* ============================================================
   TRACE — art direction behaviours.
   Loads after app.js. Adds: the boot sequence, the single
   trajectory that threads the document, the proximity field,
   the index navigation, and the full-bleed moment.

   Everything here is additive. If it fails, the page is still
   the complete, readable site underneath.
   ============================================================ */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RM.matches; };
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ACCENT = '#e8873a';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ============================================================
     BOOT — three systems initialise, then hand over.
     The markup ships hidden; only JS reveals it, so a JS failure
     can never leave a black screen over the content.
     ============================================================ */
  function initBoot() {
    var boot = document.querySelector('.boot');
    if (!boot) return;
    var seen = false;
    try { seen = sessionStorage.getItem('booted') === '1'; } catch (e) {}
    if (seen || reduced()) { boot.parentNode.removeChild(boot); return; }

    boot.hidden = false;
    var rows = boot.querySelectorAll('.boot-row');
    rows.forEach(function (r, i) {
      setTimeout(function () { r.classList.add('on'); }, 220 + i * 150);
    });
    function finish() {
      boot.classList.add('is-done');
      try { sessionStorage.setItem('booted', '1'); } catch (e) {}
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 800);
    }
    setTimeout(finish, 1150);
    boot.addEventListener('click', finish);           // never trap anyone
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { finish(); document.removeEventListener('keydown', esc); }
    });
  }

  /* ============================================================
     THE TRACE — one path through the whole document.
     Anchored to the sections, drawn as you scroll.
     ============================================================ */
  function initSpine() {
    var main = document.getElementById('main');
    if (!main || !document.querySelector('[data-anchor]')) return;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'spine');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'none');
    var track = document.createElementNS(NS, 'path');
    track.setAttribute('class', 'track');
    var drawn = document.createElementNS(NS, 'path');
    drawn.setAttribute('class', 'drawn');
    var halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('class', 'halo'); halo.setAttribute('r', '7');
    var head = document.createElementNS(NS, 'circle');
    head.setAttribute('class', 'head'); head.setAttribute('r', '2.6');
    svg.appendChild(track); svg.appendChild(drawn); svg.appendChild(halo); svg.appendChild(head);
    main.insertBefore(svg, main.firstChild);

    var len = 0, W = 0, H = 0;

    // Catmull-Rom through the anchor points, converted to cubic beziers.
    function smooth(pts) {
      if (pts.length < 2) return '';
      var d = 'M' + pts[0].x + ',' + pts[0].y;
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += 'C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
      }
      return d;
    }

    function build() {
      W = main.offsetWidth; H = main.offsetHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.style.height = H + 'px';

      var mainTop = main.getBoundingClientRect().top + window.scrollY;
      var pts = [{ x: W * 0.06, y: 0 }];
      var anchors = main.querySelectorAll('[data-anchor]');
      anchors.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        var top = r.top + window.scrollY - mainTop;
        var sway = [0.68, 0.2, 0.78, 0.26, 0.72, 0.18];
        pts.push({ x: W * sway[i % sway.length], y: top + r.height * 0.42 });
      });
      pts.push({ x: W * 0.5, y: H });

      var d = smooth(pts);
      track.setAttribute('d', d);
      drawn.setAttribute('d', d);
      len = drawn.getTotalLength();
      drawn.style.strokeDasharray = len;
      if (reduced()) {
        drawn.style.strokeDashoffset = 0;
        halo.setAttribute('r', '0'); head.setAttribute('r', '0');
      } else {
        update();
      }
    }

    var queued = false;
    function update() {
      queued = false;
      if (!len) return;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      // ease the draw slightly ahead of the scroll so the head leads the eye
      var t = clamp(p * 1.06, 0, 1);
      drawn.style.strokeDashoffset = len * (1 - t);
      var pt = drawn.getPointAtLength(len * t);
      head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y);
    }
    function onScroll() {
      if (queued || reduced()) return;
      queued = true;
      requestAnimationFrame(update);
    }

    var rt;
    function onResize() { clearTimeout(rt); rt = setTimeout(build, 180); }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(main);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    setTimeout(build, 60);
    setTimeout(build, 900);   // after images settle
  }

  /* ============================================================
     PROXIMITY — one interaction grammar.
     Each registered element gets --prox in [0,1].
     ============================================================ */
  function initProximity() {
    if (!canHover || reduced()) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-prox]'));
    if (!els.length) return;
    var RADIUS = 190;
    var mx = -9999, my = -9999, queued = false;
    var boxes = [];

    function measure() {
      boxes = els.map(function (el) {
        var r = el.getBoundingClientRect();
        return { el: el, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
      });
    }
    function apply() {
      queued = false;
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        // distance to the element's box, not just its centre
        var dx = Math.max(Math.abs(mx - b.cx) - b.w / 2, 0);
        var dy = Math.max(Math.abs(my - b.cy) - b.h / 2, 0);
        var d = Math.hypot(dx, dy);
        var v = d > RADIUS ? 0 : 1 - d / RADIUS;
        b.el.style.setProperty('--prox', v.toFixed(3));
        b.el.classList.toggle('is-near', v > 0.35);
      }
    }
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener('scroll', function () {
      measure();
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    setTimeout(measure, 800);
  }

  /* ============================================================
     INDEX NAV + HEADER STATE
     ============================================================ */
  function initIndex() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.index-nav a'));
    var head = document.querySelector('.site-head');
    var nav = document.querySelector('.index-nav');
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var hero = document.querySelector('.arena-hero');
    var darkZones = Array.prototype.slice.call(document.querySelectorAll('.env-dark, .arena-hero, .moment'));

    function onScroll() {
      var y = window.scrollY + window.innerHeight * 0.38;
      var active = 0;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (s && s.offsetTop <= y) active = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });

      // is a dark environment currently under the header band?
      var dark = false;
      darkZones.forEach(function (z) {
        var r = z.getBoundingClientRect();
        if (r.top <= 34 && r.bottom >= 34) dark = true;
      });
      if (head) {
        head.classList.toggle('on-dark', dark);
        head.classList.toggle('scrolled', !dark && window.scrollY > 40);
      }
      if (nav) nav.classList.toggle('on-dark', !!(hero && window.scrollY < window.innerHeight * 0.75));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ============================================================
     MOMENT — one trajectory filling the viewport
     ============================================================ */
  function initMoment() {
    var wrap = document.querySelector('[data-moment]');
    if (!wrap) return;
    var canvas = wrap.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 0, Hh = 0, t = 0, raf = 0, on = false;
    var trail = [];

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; Hh = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    function pos(k) {
      return {
        x: W * (0.5 + 0.40 * Math.sin(k * 0.7)),
        y: Hh * (0.5 + 0.33 * Math.sin(k * 1.9 + 0.7))
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, Hh);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      var step = Math.max(40, W / 18);
      for (var x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, Hh); ctx.stroke(); }
      for (var y = step; y < Hh; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (var i = 1; i < trail.length; i++) {
        ctx.strokeStyle = 'rgba(232,135,58,' + (i / trail.length) * 0.5 + ')';
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      var p = trail[trail.length - 1];
      if (p) { ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    function tick() {
      t += 0.006;
      trail.push(pos(t));
      if (trail.length > 260) trail.shift();
      draw();
      if (on) raf = requestAnimationFrame(tick);
    }
    function seed() {
      trail = [];
      for (var k = 0; k < 220; k++) trail.push(pos(t - (220 - k) * 0.006));
      draw();
    }
    size(); seed();
    window.addEventListener('resize', function () { if (size()) seed(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        on = e[0].isIntersecting && !reduced() && !document.hidden;
        if (on) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
        else cancelAnimationFrame(raf);
      }, { threshold: 0.05 }).observe(wrap);
    }
  }

  /* ---------- go ---------- */
  function boot() {
    initBoot();
    initIndex();
    initProximity();
    initMoment();
    initSpine();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
