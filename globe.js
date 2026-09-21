/* ============================================================
   BACKGROUND — the trajectory globe
   The sphere is a design surface, not a map. Each node is a
   chapter of the work, spaced around the globe and joined in the
   order it happened. Colour runs from the earliest chapter to the
   most recent. Drag to spin; click a node and it describes itself.
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

  /* colour walks from the first chapter to the most recent */
  var FROM = [207, 46, 74];      // crimson, where it starts
  var TO   = [232, 135, 58];     // accent amber, now
  function mix(t) {
    return 'rgb(' + FROM.map(function (v, i) {
      return Math.round(v + (TO[i] - v) * t);
    }).join(',') + ')';
  }

  var nodes = items.map(function (li, i) {
    var why = li.querySelector('.why');
    var t = items.length > 1 ? i / (items.length - 1) : 1;
    return {
      i: i,
      short: li.getAttribute('data-short') || '',
      lat: +li.getAttribute('data-lat'),
      lon: +li.getAttribute('data-lon'),
      when: li.querySelector('.when').textContent,
      what: li.querySelector('.what').textContent,
      why: why ? why.innerHTML : '',
      color: mix(t)
    };
  });

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, R = 0, cx = 0, cy = 0;
  var rot = -0.6, tilt = 0.28, spin = 0.0021;
  var drag = null, vel = 0, glide = 0, gliding = 0, pulse = 0;
  var active = nodes[nodes.length - 1], hover = null;

  function ink() {
    return getComputedStyle(wrap).getPropertyValue('--ink-faint').trim() || '#6f757f';
  }

  function size() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.38; cx = W / 2; cy = H / 2;
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
    var d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
    var s = Math.sin(d) || 1, out = [];
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
  for (var s0 = 0; s0 < nodes.length - 1; s0++) {
    arcs.push({ pts: arcPoints(nodes[s0], nodes[s0 + 1], 40), a: nodes[s0], b: nodes[s0 + 1] });
  }

  function draw() {
    if (!W) return;
    var C = ink();
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = C; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C;
    for (var i = 0; i < dots.length; i++) {
      var p = project(dots[i].lat, dots[i].lon);
      if (p.z <= 0) continue;
      ctx.globalAlpha = 0.14 + p.z * 0.6;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    ctx.restore();

    ctx.lineWidth = 2.1; ctx.lineCap = 'round';
    arcs.forEach(function (arc) {
      var pa = project(arc.a.lat, arc.a.lon), pb = project(arc.b.lat, arc.b.lon);
      var g = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      g.addColorStop(0, arc.a.color); g.addColorStop(1, arc.b.color);
      ctx.strokeStyle = g; ctx.globalAlpha = 0.82;
      ctx.beginPath();
      var started = false;
      for (var k = 0; k < arc.pts.length; k++) {
        var q = project(arc.pts[k].lat, arc.pts[k].lon);
        if (q.z <= 0) { started = false; continue; }
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    });

    var labels = [];
    nodes.forEach(function (nd) {
      var p = project(nd.lat, nd.lon);
      nd.sx = p.x; nd.sy = p.y; nd.sz = p.z;
      if (p.z <= 0.02) return;
      var on = (nd === active) || (nd === hover);
      labels.push({ nd: nd, x: p.x, y: p.y, on: on });
      // a ring that breathes on the chapter you are reading
      if (nd === active) {
        var grow = 13 + Math.sin(pulse) * 3.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, grow, 0, Math.PI * 2);
        ctx.strokeStyle = nd.color; ctx.globalAlpha = 0.5 - Math.sin(pulse) * 0.16;
        ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, grow + 7, 0, Math.PI * 2);
        ctx.globalAlpha = 0.16; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, on ? 7 : 4.4, 0, Math.PI * 2);
      ctx.fillStyle = nd.color; ctx.globalAlpha = on ? 1 : 0.8; ctx.fill(); ctx.globalAlpha = 1;
      if (on) {
        ctx.beginPath(); ctx.arc(p.x, p.y, on ? 7 : 4.4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // labels last: nudged apart, flipped to stay inside the frame
    ctx.font = '600 11px ui-monospace, monospace';
    labels.sort(function (a, b) { return a.y - b.y; });
    var lastY = -999;
    labels.forEach(function (L) {
      var ly = L.y + 3.5;
      if (ly - lastY < 13) ly = lastY + 13;
      lastY = ly;
      var txt = L.nd.short.toUpperCase();
      var tw = ctx.measureText(txt).width;
      var lx = (L.x + 13 + tw > W - 4) ? L.x - 13 - tw : L.x + 13;
      if (ly !== L.y + 3.5) {
        ctx.strokeStyle = L.on ? L.nd.color : C;
        ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(L.x + (lx > L.x ? 7 : -7), L.y);
        ctx.lineTo(lx + (lx > L.x ? -3 : tw + 3), ly - 3.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = L.on ? L.nd.color : C;
      ctx.globalAlpha = L.on ? 1 : 0.72;
      ctx.fillText(txt, lx, ly);
      ctx.globalAlpha = 1;
    });
  }

  function show(nd) {
    active = nd;
    panel.innerHTML =
      '<div class="place" style="color:' + nd.color + '">' + nd.when + '</div>' +
      '<h3>' + nd.what + '</h3>' +
      (nd.why ? '<p class="gwhy">' + nd.why + '</p>' : '') +
      '<div class="gcount">' + (nd.i + 1) + ' / ' + nodes.length + '</div>';
    if (tabsBox) {
      Array.prototype.forEach.call(tabsBox.children, function (b, i) {
        b.setAttribute('aria-pressed', String(i === nd.i));
      });
    }
    draw();
  }

  function spinTo(nd) {
    var target = -nd.lon * Math.PI / 180;
    var d = target - rot;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    vel = 0; glide = d; gliding = 0.07;
  }

  if (tabsBox) {
    nodes.forEach(function (nd) {
      var b = document.createElement('button');
      b.className = 'globe-tab';
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--c', nd.color);
      b.innerHTML = '<i class="gdot"></i><b class="gnum">' +
                    ('0' + (nd.i + 1)).slice(-2) + '</b>' + nd.short;
      b.addEventListener('click', function () { show(nd); spinTo(nd); });
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
    nodes.forEach(function (nd) {
      if (nd.sz > 0.02 && Math.hypot(mx - nd.sx, my - nd.sy) < 16) found = nd;
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
  canvas.addEventListener('pointerleave', function () { if (hover) { hover = null; draw(); } });

  var raf = 0, visible = true;
  function tick() {
    pulse += 0.0;
    if (gliding) {
      var stepv = glide * gliding;
      rot += stepv; glide -= stepv;
      if (Math.abs(glide) < 0.002) { glide = 0; gliding = 0; }
      pulse += 0.055;
    } else if (!drag) {
      pulse += 0.055;
      if (Math.abs(vel) > 0.0004) { rot += vel; vel *= 0.94; }
      else rot += spin;
    }
    draw();
    raf = (visible && !reduced()) ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (!size()) return;
    show(active);
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
