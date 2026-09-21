/* ============================================================
   INSTRUMENTS: one interaction concept per page.
     Constellation : research, a force field of areas and projects
     Blueprint     : technical, a schematic you inspect
   Both are additive: without JS the fallback markup is readable.
   ============================================================ */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RM.matches; };
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============================================================
     RESEARCH CONSTELLATION
     Nodes spring toward a home position, lean toward the pointer,
     and reorganise around a project when one is selected.
     ============================================================ */
  function initConstellation() {
    var root = document.querySelector('[data-constellation]');
    if (!root) return;
    var svg = root.querySelector('.cons-edges');
    var read = root.querySelector('.cons-read');
    var nodes = Array.prototype.slice.call(root.querySelectorAll('.cnode'));
    if (!svg || !nodes.length) return;

    var NS = 'http://www.w3.org/2000/svg';
    var W = 0, H = 0, edges = [], focus = null, mx = -1e4, my = -1e4;

    var model = nodes.map(function (el) {
      return {
        el: el,
        id: el.getAttribute('data-id'),
        kind: el.classList.contains('proj') ? 'proj' : 'area',
        rel: (el.getAttribute('data-rel') || '').split(/\s+/).filter(Boolean),
        hx: +el.getAttribute('data-x') / 100,
        hy: +el.getAttribute('data-y') / 100,
        x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0
      };
    });
    var byId = {};
    model.forEach(function (n) { byId[n.id] = n; });

    // one edge per project-to-area relationship
    model.filter(function (n) { return n.kind === 'proj'; }).forEach(function (p) {
      p.rel.forEach(function (aid) {
        if (!byId[aid]) return;
        var l = document.createElementNS(NS, 'line');
        svg.appendChild(l);
        edges.push({ el: l, a: p, b: byId[aid], pid: p.id, aid: aid });
      });
    });

    function layout() {
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return false;    // not measurable yet
      W = r.width; H = r.height;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      model.forEach(function (n) {
        n.tx = n.hx * W; n.ty = n.hy * H;
        if (!n.x) { n.x = n.tx; n.y = n.ty; }
      });
      return true;
    }

    function targets() {
      if (!focus) { model.forEach(function (n) { n.tx = n.hx * W; n.ty = n.hy * H; }); return; }
      var f = byId[focus];
      f.tx = W * 0.5; f.ty = H * 0.42;
      var ring = f.rel.filter(function (id) { return byId[id]; });
      ring.forEach(function (id, i) {
        var a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
        var rad = Math.min(W, H) * 0.32;
        byId[id].tx = W * 0.5 + Math.cos(a) * rad;
        byId[id].ty = H * 0.42 + Math.sin(a) * rad * 0.92;
      });
      // push everything unrelated outward
      model.forEach(function (n) {
        if (n === f || ring.indexOf(n.id) > -1) return;
        var dx = n.hx - 0.5, dy = n.hy - 0.5;
        var m = Math.hypot(dx, dy) || 1;
        n.tx = W * (0.5 + (dx / m) * 0.62);
        n.ty = H * (0.5 + (dy / m) * 0.62);
      });
    }

    var raf = 0, visible = true;
    function step() {
      var still = true;
      model.forEach(function (n) {
        var tx = n.tx, ty = n.ty;
        // lean toward the pointer, capped so the layout stays legible
        if (fine && !reduced() && mx > -1e3) {
          var dx = mx - n.x, dy = my - n.y, d = Math.hypot(dx, dy);
          if (d < 170 && d > 0.01) {
            var pull = (1 - d / 170) * 16;
            tx += (dx / d) * pull; ty += (dy / d) * pull;
          }
        }
        n.vx = (n.vx + (tx - n.x) * 0.055) * 0.82;
        n.vy = (n.vy + (ty - n.y) * 0.055) * 0.82;
        n.x += n.vx; n.y += n.vy;
        if (Math.abs(n.vx) > 0.05 || Math.abs(n.vy) > 0.05) still = false;
        n.el.style.transform = 'translate(-50%,-50%) translate(' + n.x.toFixed(1) + 'px,' + n.y.toFixed(1) + 'px)';
      });
      edges.forEach(function (e) {
        e.el.setAttribute('x1', e.a.x); e.el.setAttribute('y1', e.a.y);
        e.el.setAttribute('x2', e.b.x); e.el.setAttribute('y2', e.b.y);
      });
      if (!still && visible) raf = requestAnimationFrame(step);
      else raf = 0;
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(step); }

    function highlight(id) {
      var n = id && byId[id];
      var related = n ? (n.kind === 'proj' ? n.rel.concat([n.id])
                                           : edges.filter(function (e) { return e.aid === id; })
                                                  .map(function (e) { return e.pid; }).concat([id]))
                      : null;
      model.forEach(function (m) {
        var on = !related || related.indexOf(m.id) > -1;
        m.el.classList.toggle('lit', !!related && on && m.id !== id);
        m.el.classList.toggle('dim', !!related && !on);
      });
      edges.forEach(function (e) {
        var on = !related || (related.indexOf(e.pid) > -1 && related.indexOf(e.aid) > -1);
        e.el.classList.toggle('lit', !!related && on);
        e.el.classList.toggle('dim', !!related && !on);
      });
    }

    function setFocus(id) {
      focus = focus === id ? null : id;
      model.forEach(function (m) { m.el.classList.toggle('focus', m.id === focus); });
      if (focus && read) {
        var el = byId[focus].el;
        read.querySelector('.m').textContent = el.getAttribute('data-meta') || '';
        read.querySelector('.q').textContent = el.getAttribute('data-q') || '';
        var a = read.querySelector('a');
        a.href = el.getAttribute('data-href') || '#';
        a.textContent = 'Open project →';
        read.classList.add('on');
      } else if (read) { read.classList.remove('on'); }
      highlight(focus);
      targets(); kick();
    }

    nodes.forEach(function (el) {
      var id = el.getAttribute('data-id');
      el.addEventListener('mouseenter', function () { if (!focus) highlight(id); });
      el.addEventListener('mouseleave', function () { if (!focus) highlight(null); });
      el.addEventListener('focus', function () { if (!focus) highlight(id); });
      el.addEventListener('blur', function () { if (!focus) highlight(null); });
      el.addEventListener('click', function (e) {
        if (el.classList.contains('proj')) { e.preventDefault(); setFocus(id); }
      });
    });
    root.addEventListener('pointermove', function (e) {
      var r = root.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top; kick();
    });
    root.addEventListener('pointerleave', function () { mx = my = -1e4; kick(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && focus) setFocus(focus); });

    layout(); targets();
    model.forEach(function (n) { n.x = n.tx; n.y = n.ty; });
    function relayout() { if (layout()) { targets(); kick(); } }
    window.addEventListener('resize', relayout);
    // the element has no width until layout settles, so watch for it
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    setTimeout(relayout, 300);

    if (reduced()) { visible = false; step(); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) kick();
      }, { threshold: 0.02 }).observe(root);
    }
    kick();
  }

  /* ============================================================
     TECHNICAL BLUEPRINT
     Hover or tap a component: its wires energise and the panel
     shows what it is, what it is built with, and where it is used.
     ============================================================ */
  function initBlueprint() {
    var root = document.querySelector('[data-blueprint]');
    if (!root) return;
    var bp = root.querySelector('.bp');
    var panel = root.querySelector('.bp-panel');
    var svg = root.querySelector('.bp-wires');
    var nodes = Array.prototype.slice.call(root.querySelectorAll('.bp .bnode:not(.core)'));
    var list = Array.prototype.slice.call(root.querySelectorAll('.bp-list .bnode'));
    if (!panel) return;

    var NS = 'http://www.w3.org/2000/svg';
    var core = root.querySelector('.bnode.core');
    var wires = [];

    function place() {
      if (!bp || !svg || !core) return;
      var r = bp.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      wires = [];
      var cb = core.getBoundingClientRect();
      var cx = cb.left - r.left + cb.width / 2, cy = cb.top - r.top + cb.height / 2;
      nodes.forEach(function (n) {
        var nb = n.getBoundingClientRect();
        var nx = nb.left - r.left + nb.width / 2, ny = nb.top - r.top + nb.height / 2;
        var p = document.createElementNS(NS, 'path');
        // right-angled runs read as wiring, not as a spider web
        var midx = (cx + nx) / 2;
        p.setAttribute('d', 'M' + nx + ',' + ny + ' H' + midx + ' V' + cy + ' H' + cx);
        svg.appendChild(p);
        wires.push({ el: p, id: n.getAttribute('data-part') });
      });
    }

    function show(id) {
      var src = root.querySelector('.bp-data [data-for="' + id + '"]');
      if (!src) return;
      panel.innerHTML = src.innerHTML;
      nodes.concat(list).forEach(function (n) { n.classList.toggle('on', n.getAttribute('data-part') === id); });
      wires.forEach(function (w) {
        w.el.classList.toggle('hot', w.id === id);
        w.el.classList.toggle('pulse', w.id === id && !reduced());
      });
    }

    nodes.concat(list).forEach(function (n) {
      var id = n.getAttribute('data-part');
      n.addEventListener('mouseenter', function () { show(id); });
      n.addEventListener('focus', function () { show(id); });
      n.addEventListener('click', function () { show(id); });
    });

    place();
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    setTimeout(place, 400);
    var first = nodes[0] || list[0];
    if (first) show(first.getAttribute('data-part'));
  }

  function boot() { initConstellation(); initBlueprint(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ============================================================
   ARCHIVE + TRAVELLING TIMELINE
   Appended as a second module so the earlier instruments are
   untouched.
   ============================================================ */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RM.matches; };

  /* ---------- publications: depth on scroll ---------- */
  function initArchive() {
    var arch = document.querySelector('[data-archive]');
    if (!arch || reduced()) return;
    var rows = Array.prototype.slice.call(arch.querySelectorAll('.pubrow'));
    if (!rows.length) return;
    var queued = false;
    function apply() {
      queued = false;
      var mid = window.innerHeight * 0.52;
      rows.forEach(function (r) {
        var b = r.getBoundingClientRect();
        // entries that have travelled above the reading line sink back
        var above = Math.max(0, mid - (b.top + b.height / 2));
        var d = Math.min(above / (window.innerHeight * 0.9), 1);
        r.style.setProperty('--depth', d.toFixed(3));
      });
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  }

  /* ---------- background: scroll drives horizontal travel ---------- */
  function initTravel() {
    var wrap = document.querySelector('[data-travel]');
    if (!wrap) return;
    var track = wrap.querySelector('.trav-track');
    var stops = Array.prototype.slice.call(wrap.querySelectorAll('.tstop'));
    if (!track || !stops.length) return;

    var narrow = function () {
      return window.matchMedia('(max-width: 820px)').matches || reduced();
    };

    function size() {
      if (narrow()) { wrap.style.height = ''; track.style.transform = ''; stops.forEach(function (s) { s.classList.add('live'); }); return; }
      // the track must travel its own overflow while the stage is pinned
      var travel = Math.max(0, track.scrollWidth - window.innerWidth);
      wrap.style.height = (window.innerHeight + travel) + 'px';
    }

    var queued = false;
    function apply() {
      queued = false;
      if (narrow()) return;
      var r = wrap.getBoundingClientRect();
      var travel = Math.max(0, track.scrollWidth - window.innerWidth);
      var p = Math.min(Math.max(-r.top / (wrap.offsetHeight - window.innerHeight || 1), 0), 1);
      track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
      // whichever stop is nearest the middle of the screen is the live one
      var mid = window.innerWidth / 2, best = null, bestD = 1e9;
      stops.forEach(function (s) {
        var b = s.getBoundingClientRect();
        var d = Math.abs(b.left + b.width / 2 - mid);
        if (d < bestD) { bestD = d; best = s; }
      });
      stops.forEach(function (s) { s.classList.toggle('live', s === best); });
    }

    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener('resize', function () { size(); apply(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); apply(); });
    size(); apply();
    setTimeout(function () { size(); apply(); }, 400);
  }

  function boot() { initArchive(); initTravel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ---------- CV: index tracking + hover preview ---------- */
(function () {
  'use strict';
  var grid = document.querySelector('[data-cv]');
  if (!grid) return;
  var links = Array.prototype.slice.call(grid.querySelectorAll('.cv-index a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  function onScroll() {
    var y = window.scrollY + window.innerHeight * 0.3;
    var active = 0;
    secs.forEach(function (s, i) { if (s && s.offsetTop <= y) active = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === active); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // preview panel follows the pointer over items that declare one
  var peek = document.createElement('div');
  peek.className = 'peek';
  document.body.appendChild(peek);
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;

  grid.querySelectorAll('[data-peek]').forEach(function (it) {
    function show(e) {
      peek.innerHTML = '<div class="k">' + (it.getAttribute('data-peek-k') || '') + '</div>' +
                       '<div class="t">' + (it.getAttribute('data-peek-t') || '') + '</div>' +
                       '<div class="d">' + (it.getAttribute('data-peek') || '') + '</div>';
      var x = Math.min(e.clientX + 18, window.innerWidth - 246);
      var y = Math.min(e.clientY + 14, window.innerHeight - 150);
      peek.style.left = x + 'px'; peek.style.top = y + 'px';
      peek.classList.add('on');
    }
    it.addEventListener('pointerenter', show);
    it.addEventListener('pointermove', show);
    it.addEventListener('pointerleave', function () { peek.classList.remove('on'); });
  });
})();
