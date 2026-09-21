/* ============================================================
   BACKGROUND — rotating globe
   The trajectory, taken literally: the places the work happened
   in, joined by great circle arcs in the order they happened.
   Orthographic projection drawn as a dot sphere. Drag to spin.
   Replaces the horizontal track, which asked for too much scroll.
   ============================================================ */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-globe]');
  if (!wrap) return;
  var canvas = wrap.querySelector('canvas');
  var panel = wrap.querySelector('.globe-panel');
  var tabsBox = wrap.querySelector('.globe-tabs');
  var items = Array.prototype.slice.call(wrap.querySelectorAll('.globe-list li'));
  if (!canvas || !canvas.getContext || !items.length || !panel) return;

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RM.matches; };
  var ACCENT = '#e8873a';
  // the globe sits on paper in one theme and on ink in the other,
  // so take the dot colour from the page rather than hard coding it
  function ink() {
    var v = getComputedStyle(wrap).getPropertyValue('--ink-faint').trim();
    return v || '#6f757f';
  }

  var ROLE = {                       // colour encodes the journey, not decoration
    kathmandu:   { c: '#cf2e4a', tag: 'origin'  },   // Nepal, where it starts
    london:      { c: '#8a94a6', tag: 'transit' },
    minneapolis: { c: '#8a94a6', tag: 'transit' },
    flint:       { c: '#e8873a', tag: 'now'     }    // where the research happens
  };

  var LABEL = {
    london: 'Where it started',
    kathmandu: 'First engineering work',
    flint: 'Where the research happens',
    minneapolis: 'Out in the community'
  };

  /* group the timeline entries by place, keeping document order */
  var order = [], places = {};
  items.forEach(function (li) {
    var id = li.getAttribute('data-place');
    if (!places[id]) {
      places[id] = {
        id: id,
        city: li.getAttribute('data-city'),
        lat: +li.getAttribute('data-lat'),
        lon: +li.getAttribute('data-lon'),
        label: LABEL[id] || li.getAttribute('data-city'),
        color: (ROLE[id] || {}).c || '#e8873a',
        tag: (ROLE[id] || {}).tag || '',
        stops: []
      };
      order.push(places[id]);
    }
    var why = li.querySelector('.why');
    places[id].stops.push({
      when: li.querySelector('.when').textContent,
      what: li.querySelector('.what').textContent,
      why: why ? why.innerHTML : ''
    });
  });

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, R = 0, cx = 0, cy = 0;
  var rot = -1.0, tilt = 0.62, spin = 0.0022;   // ~35N, centres Kathmandu through Flint
  var drag = null, vel = 0, glide = 0, gliding = 0;
  var active = null, hover = null;

  function size() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.40; cx = W / 2; cy = H / 2;
    return true;
  }

  function project(lat, lon) {
    var la = lat * Math.PI / 180, lo = (lon * Math.PI / 180) + rot;
    var cl = Math.cos(la), sl = Math.sin(la);
    var x = cl * Math.sin(lo);
    var y = Math.cos(tilt) * sl - Math.sin(tilt) * cl * Math.cos(lo);
    var z = Math.sin(tilt) * sl + Math.cos(tilt) * cl * Math.cos(lo);
    return { x: cx + x * R, y: cy - y * R, z: z };
  }

  /* an even scatter of dots over the sphere */
  var dots = [];
  (function () {
    for (var la = -84; la <= 84; la += 6) {
      var n = Math.max(6, Math.round(Math.cos(la * Math.PI / 180) * 54));
      for (var i = 0; i < n; i++) dots.push({ lat: la, lon: -180 + (360 / n) * i });
    }
  })();

  function toVec(p) {
    var la = p.lat * Math.PI / 180, lo = p.lon * Math.PI / 180;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  }
  function arcPoints(a, b, n) {
    var A = toVec(a), B = toVec(b);
    var dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
    var d = Math.acos(dot), s = Math.sin(d) || 1, out = [];
    for (var k = 0; k <= n; k++) {
      var t = k / n;
      var f1 = Math.sin((1 - t) * d) / s, f2 = Math.sin(t * d) / s;
      var x = A[0] * f1 + B[0] * f2, y = A[1] * f1 + B[1] * f2, z = A[2] * f1 + B[2] * f2;
      out.push({ lat: Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI,
                 lon: Math.atan2(y, x) * 180 / Math.PI });
    }
    return out;
  }
  var arcs = [];
  for (var s0 = 0; s0 < order.length - 1; s0++) {
    arcs.push({ pts: arcPoints(order[s0], order[s0 + 1], 48), a: order[s0], b: order[s0 + 1] });
  }

  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);

    var C = ink();
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = C; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = C;
    for (var i = 0; i < dots.length; i++) {
      var p = project(dots[i].lat, dots[i].lon);
      if (p.z <= 0) continue;
      ctx.globalAlpha = 0.16 + p.z * 0.64;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    ctx.restore();

    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    arcs.forEach(function (arc) {
      var pa = project(arc.a.lat, arc.a.lon), pb = project(arc.b.lat, arc.b.lon);
      var g = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      g.addColorStop(0, arc.a.color); g.addColorStop(1, arc.b.color);
      ctx.strokeStyle = g;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      var started = false;
      for (var k = 0; k < arc.pts.length; k++) {
        var q = project(arc.pts[k].lat, arc.pts[k].lon);
        if (q.z <= 0) { started = false; continue; }
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    var labels = [];
    order.forEach(function (pl) {
      var p = project(pl.lat, pl.lon);
      pl.sx = p.x; pl.sy = p.y; pl.sz = p.z;
      if (p.z <= 0.02) return;
      var on = (pl === active) || (pl === hover);
      labels.push({ pl: pl, x: p.x, y: p.y, on: on });
      ctx.beginPath(); ctx.arc(p.x, p.y, on ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = pl.color; ctx.globalAlpha = on ? 1 : 0.7; ctx.fill(); ctx.globalAlpha = 1;
      if (on) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = pl.color; ctx.globalAlpha = .45; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // labels last, nudged apart so nearby cities stay readable
    ctx.font = '10px ui-monospace, monospace';
    labels.sort(function (a, b) { return a.y - b.y; });
    var lastY = -999;
    labels.forEach(function (L) {
      var ly = L.y + 3.5;
      if (ly - lastY < 13) ly = lastY + 13;
      lastY = ly;
      if (ly !== L.y + 3.5) {
        ctx.strokeStyle = L.on ? L.pl.color : C;
        ctx.globalAlpha = .45; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(L.x + 7, L.y); ctx.lineTo(L.x + 11, ly - 3.5); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = L.on ? L.pl.color : C;
      var txt = L.pl.city.toUpperCase() + (L.pl.tag === 'origin' ? '  · ORIGIN' : '');
      var tw = ctx.measureText(txt).width;
      // flip the label to the other side rather than let it run off the canvas
      ctx.fillText(txt, (L.x + 13 + tw > W - 4) ? L.x - 13 - tw : L.x + 13, ly);
    });
  }

  function show(pl) {
    active = pl;
    var stops = pl.stops.map(function (st, i) {
      return '<div class="gtopic' + (i === 0 ? ' open' : '') + '">' +
               '<button class="gtopic-head" type="button" aria-expanded="' + (i === 0) + '">' +
                 '<span class="when">' + st.when + '</span>' +
                 '<span class="what">' + st.what + '</span>' +
                 '<span class="gtopic-mark" aria-hidden="true"></span>' +
               '</button>' +
               '<div class="gtopic-body"><div>' +
                 (st.why ? '<p>' + st.why + '</p>' : '<p></p>') +
               '</div></div>' +
             '</div>';
    }).join('');
    panel.innerHTML = '<div class="place' + (pl.tag === 'origin' ? ' origin' : '') + '">' +
                      pl.city + (pl.tag === 'origin' ? ' &middot; origin' : '') + '</div>' +
                      '<h3>' + pl.label + '</h3>' + stops;
    Array.prototype.forEach.call(panel.querySelectorAll('.gtopic-head'), function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.parentNode;
        var open = t.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    if (tabsBox) {
      Array.prototype.forEach.call(tabsBox.children, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-place') === pl.id));
      });
    }
    draw();
  }

  function spinTo(pl) {
    var target = -pl.lon * Math.PI / 180;
    var d = target - rot;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    vel = 0; glide = d; gliding = 0.07;
  }

  /* tabs: the same access for keyboard and touch */
  if (tabsBox) {
    order.forEach(function (pl) {
      var b = document.createElement('button');
      b.className = 'globe-tab';
      b.type = 'button';
      b.setAttribute('data-place', pl.id);
      b.setAttribute('aria-pressed', 'false');
      b.textContent = pl.city;
      b.addEventListener('click', function () { show(pl); spinTo(pl); });
      tabsBox.appendChild(b);
    });
  }

  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, r: rot, moved: 0 };
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    if (drag) {
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > drag.moved) drag.moved = Math.abs(dx);
      var nr = drag.r + dx * 0.006;
      vel = nr - rot; rot = nr; glide = 0; gliding = 0;
      draw();
      return;
    }
    var mx = e.clientX - r.left, my = e.clientY - r.top, found = null;
    order.forEach(function (pl) {
      if (pl.sz > 0.02 && Math.hypot(mx - pl.sx, my - pl.sy) < 16) found = pl;
    });
    if (found !== hover) {
      hover = found;
      canvas.style.cursor = found ? 'pointer' : 'grab';
      draw();
    }
  });
  canvas.addEventListener('pointerup', function () {
    if (drag && drag.moved < 4 && hover) show(hover);
    drag = null;
  });
  canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('pointerleave', function () {
    if (hover) { hover = null; draw(); }
  });

  var raf = 0, visible = true;
  function tick() {
    if (gliding) {
      var stepv = glide * gliding;
      rot += stepv; glide -= stepv;
      if (Math.abs(glide) < 0.002) { glide = 0; gliding = 0; }
    } else if (!drag) {
      if (Math.abs(vel) > 0.0004) { rot += vel; vel *= 0.94; }
      else rot += spin;
    }
    draw();
    raf = (visible && !reduced()) ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (!size()) return;
    show(places.flint || order[0]);
    if (reduced()) { draw(); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      }, { threshold: 0.05 }).observe(wrap);
    } else if (!raf) { raf = requestAnimationFrame(tick); }
  }

  window.addEventListener('resize', function () { if (size()) draw(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (size()) draw(); }).observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (size()) draw(); });
  start();
  setTimeout(start, 400);
})();
