/* ============================================================
   Interaction layer. No dependencies, no build step.

   Everything here degrades: if canvas or JS fails, the page is
   still a complete, readable academic site. Nothing important
   lives behind a hover.

   Colour encodes agency throughout:
     amber = a person authored it
     blue  = a machine executed / proposed it
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return REDUCED.matches; };

  var HUMAN = '#f0a64a';
  var HUMAN_DIM = 'rgba(240,166,74,.42)';
  var MACHINE = '#6fb0e8';
  var GRID = 'rgba(255,255,255,.055)';
  var DIM = '#8d96a5';

  /* ---------- one shared animation loop ---------- */
  var tickers = [];
  var running = false;
  function loop(now) {
    running = false;
    var live = false;
    for (var i = 0; i < tickers.length; i++) {
      if (tickers[i].active) { tickers[i].tick(now); live = true; }
    }
    if (live && !document.hidden) { running = true; requestAnimationFrame(loop); }
  }
  function wake() {
    if (!running && !document.hidden) { running = true; requestAnimationFrame(loop); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  /* ---------- canvas with device-pixel-ratio handling ---------- */
  function setupCanvas(canvas, onResize) {
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0;
    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    resize();
    // A resize clears the backing store, so anything not actively animating
    // would be left blank. Repaint immediately.
    function onSize() { if (resize() && onResize) onResize(); }
    if (window.ResizeObserver) {
      new ResizeObserver(onSize).observe(canvas);
    } else {
      window.addEventListener('resize', onSize);
    }
    return {
      ctx: ctx,
      get w() { return w; },
      get h() { return h; },
      resize: resize
    };
  }

  /* ---------- geometry helpers ---------- */
  function pathLength(pts) {
    var L = 0;
    for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return L;
  }
  // position at arc-length s along a polyline, plus heading
  function atLength(pts, s) {
    if (pts.length < 2) return { x: pts[0] ? pts[0].x : 0, y: pts[0] ? pts[0].y : 0, a: 0 };
    var acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      var seg = Math.hypot(dx, dy);
      if (acc + seg >= s) {
        var t = seg === 0 ? 0 : (s - acc) / seg;
        return { x: pts[i - 1].x + dx * t, y: pts[i - 1].y + dy * t, a: Math.atan2(dy, dx) };
      }
      acc += seg;
    }
    var last = pts[pts.length - 1], prev = pts[pts.length - 2];
    return { x: last.x, y: last.y, a: Math.atan2(last.y - prev.y, last.x - prev.x) };
  }
  function strokePath(ctx, pts, W, H) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * W, pts[i].y * H);
    ctx.stroke();
  }
  function drawGrid(ctx, W, H, step) {
    ctx.save();
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (var x = step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawAgent(ctx, x, y, a, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-5, -4, 10, 8, 2) : ctx.rect(-5, -4, 10, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(11,13,17,.85)';
    ctx.fillRect(1, -1.5, 3, 3);       // heading marker
    ctx.restore();
  }

  /* ============================================================
     1. HERO ARENA — drag to author a path, a robot follows it
     ============================================================ */
  function initArena() {
    var stage = document.querySelector('[data-arena]');
    if (!stage) return;
    var canvas = stage.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;

    var c = setupCanvas(canvas, function () { render(); });
    var readout = stage.querySelector('[data-readout]');
    var resetBtn = document.querySelector('[data-arena-reset]');
    var demoBtn = document.querySelector('[data-arena-demo]');

    // Three pre-authored ambient paths. These echo real motion primitives:
    // a sweeping search, a direct delivery, an insistent zigzag.
    function seedPaths() {
      var sweep = [], i;
      for (i = 0; i <= 44; i++) {
        var t = i / 44;
        sweep.push({ x: 0.08 + t * 0.84, y: 0.30 + Math.sin(t * Math.PI * 2.2) * 0.17 });
      }
      var deliver = [
        { x: 0.12, y: 0.82 }, { x: 0.34, y: 0.74 }, { x: 0.46, y: 0.60 },
        { x: 0.66, y: 0.56 }, { x: 0.88, y: 0.48 }
      ];
      var urgent = [];
      for (i = 0; i <= 18; i++) {
        urgent.push({ x: 0.16 + i * 0.039, y: 0.62 + (i % 2 ? 0.12 : -0.12) });
      }
      return [sweep, deliver, urgent];
    }

    var agents = seedPaths().map(function (p, i) {
      return { path: p, len: pathLength(p), s: i * 0.25, speed: 0.055 + i * 0.012, trail: [], authored: false, dir: 1 };
    });

    var drawing = null;          // points being drawn right now
    var lastPoint = null;

    function toLocal(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      };
    }

    function beginDraw(e) {
      if (e.button !== undefined && e.button !== 0) return;
      stage.classList.add('is-used');
      drawing = [toLocal(e)];
      lastPoint = drawing[0];
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      render();
    }
    function moveDraw(e) {
      if (!drawing) return;
      var p = toLocal(e);
      if (Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) > 0.012) {
        drawing.push(p); lastPoint = p;
        if (reduced()) render();
      }
      e.preventDefault();
    }
    function endDraw() {
      if (!drawing) return;
      if (drawing.length > 3) {
        // the authored path replaces the oldest authored agent, keeping at most 2
        var authoredCount = agents.filter(function (a) { return a.authored; }).length;
        if (authoredCount >= 2) {
          for (var i = 0; i < agents.length; i++) {
            if (agents[i].authored) { agents.splice(i, 1); break; }
          }
        }
        agents.push({
          path: drawing.slice(), len: pathLength(drawing), s: 0,
          speed: 0.16, trail: [], authored: true, dir: 1, born: performance.now()
        });
      }
      drawing = null;
      wake();
      render();
    }

    canvas.addEventListener('pointerdown', beginDraw);
    canvas.addEventListener('pointermove', moveDraw);
    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);
    canvas.addEventListener('pointerleave', function () { if (drawing) endDraw(); });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        agents = seedPaths().map(function (p, i) {
          return { path: p, len: pathLength(p), s: i * 0.25, speed: 0.055 + i * 0.012, trail: [], authored: false, dir: 1 };
        });
        wake(); render();
      });
    }
    // keyboard / no-pointer route to the same interaction
    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        stage.classList.add('is-used');
        var pts = [], i;
        for (i = 0; i <= 34; i++) {
          var t = i / 34;
          pts.push({ x: 0.14 + t * 0.72, y: 0.5 + Math.sin(t * Math.PI * 1.7) * 0.26 });
        }
        agents = agents.filter(function (a) { return !a.authored; });
        agents.push({ path: pts, len: pathLength(pts), s: 0, speed: 0.16, trail: [], authored: true, dir: 1 });
        wake(); render();
      });
    }

    var prev = 0;
    function step(now) {
      var dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0.016;
      prev = now;
      for (var i = 0; i < agents.length; i++) {
        var a = agents[i];
        a.s += a.speed * dt * a.dir;
        if (a.authored) {
          if (a.s > 1) { a.s = 1; }        // authored runs stop at the end
        } else {
          if (a.s > 1) { a.s = 1; a.dir = -1; }
          if (a.s < 0) { a.s = 0; a.dir = 1; }
        }
        var p = atLength(a.path, a.s * a.len);
        a.pos = p;
        a.trail.push({ x: p.x, y: p.y });
        if (a.trail.length > 46) a.trail.shift();
      }
      render();
    }

    function render() {
      var ctx = c.ctx, W = c.w, H = c.h;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      drawGrid(ctx, W, H, Math.max(26, Math.round(W / 14)));

      // authored paths, amber, dashed — the human's input
      ctx.save();
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      agents.forEach(function (a) {
        ctx.strokeStyle = a.authored ? HUMAN : HUMAN_DIM;
        strokePath(ctx, a.path, W, H);
      });
      ctx.restore();

      // path being drawn right now
      if (drawing && drawing.length > 1) {
        ctx.save();
        ctx.strokeStyle = HUMAN; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        strokePath(ctx, drawing, W, H);
        ctx.restore();
      }

      // executed trajectories, blue, fading — the machine carrying it out
      ctx.save();
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      agents.forEach(function (a) {
        for (var i = 1; i < a.trail.length; i++) {
          ctx.strokeStyle = 'rgba(111,176,232,' + (i / a.trail.length) * 0.75 + ')';
          ctx.beginPath();
          ctx.moveTo(a.trail[i - 1].x * W, a.trail[i - 1].y * H);
          ctx.lineTo(a.trail[i].x * W, a.trail[i].y * H);
          ctx.stroke();
        }
      });
      ctx.restore();

      // agents
      agents.forEach(function (a) {
        var p = a.pos || atLength(a.path, a.s * a.len);
        drawAgent(ctx, p.x * W, p.y * H, p.a, a.authored ? HUMAN : MACHINE);
      });

      if (readout) {
        var lead = agents[agents.length - 1];
        var lp = lead && (lead.pos || atLength(lead.path, lead.s * lead.len));
        if (lp) readout.textContent = 'x ' + lp.x.toFixed(2) + '  y ' + lp.y.toFixed(2);
      }
    }

    var ticker = { active: false, tick: step };
    tickers.push(ticker);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        ticker.active = entries[0].isIntersecting && !reduced();
        prev = 0;
        if (ticker.active) wake(); else render();
      }, { threshold: 0.05 }).observe(stage);
    } else {
      ticker.active = !reduced();
      wake();
    }

    // first paint (and the only paint when motion is reduced)
    setTimeout(function () {
      c.resize();
      agents.forEach(function (a) {
        a.pos = atLength(a.path, a.s * a.len);
        if (reduced()) {
          for (var k = 0; k < 24; k++) {
            var q = atLength(a.path, Math.max(0, a.s - k * 0.012) * a.len);
            a.trail.unshift({ x: q.x, y: q.y });
          }
        }
      });
      render();
    }, 30);

    REDUCED.addEventListener && REDUCED.addEventListener('change', function () {
      ticker.active = !reduced();
      if (ticker.active) wake(); else render();
    });
  }

  /* ============================================================
     2. PLAN DEMO — a model proposes, nothing moves until approved
     ============================================================ */
  function initPlanDemo() {
    var root = document.querySelector('[data-plandemo]');
    if (!root) return;
    var canvas = root.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;

    var c = setupCanvas(canvas, function () { render(); });
    var statusEl = root.querySelector('[data-plan-status]');
    var approveBtn = root.querySelector('[data-plan-approve]');
    var rejectBtn = root.querySelector('[data-plan-reject]');

    // three robots; a "plan" assigns each one a motion from the library
    var LIB = ['sweep', 'deliver', 'hold'];
    var robots = [
      { home: { x: 0.18, y: 0.30 }, pos: null, path: null, s: 0, trail: [], job: null },
      { home: { x: 0.18, y: 0.55 }, pos: null, path: null, s: 0, trail: [], job: null },
      { home: { x: 0.18, y: 0.80 }, pos: null, path: null, s: 0, trail: [], job: null }
    ];
    robots.forEach(function (r) { r.pos = { x: r.home.x, y: r.home.y, a: 0 }; });

    function makePath(kind, home) {
      var pts = [], i;
      if (kind === 'sweep') {
        for (i = 0; i <= 30; i++) {
          var t = i / 30;
          pts.push({ x: home.x + t * 0.66, y: home.y + Math.sin(t * Math.PI * 2) * 0.13 });
        }
      } else if (kind === 'deliver') {
        pts = [{ x: home.x, y: home.y }, { x: home.x + 0.34, y: home.y - 0.06 }, { x: home.x + 0.68, y: home.y + 0.02 }];
      } else {
        for (i = 0; i <= 16; i++) {
          pts.push({ x: home.x + 0.04 + (i % 2 ? 0.02 : -0.02), y: home.y + i * 0.002 });
        }
      }
      return pts;
    }

    var state = 'proposed';     // proposed -> approved -> done
    var planSeed = 0;

    function propose() {
      state = 'proposed';
      planSeed++;
      robots.forEach(function (r, i) {
        r.job = LIB[(i + planSeed) % LIB.length];
        r.path = makePath(r.job, r.home);
        r.len = pathLength(r.path);
        r.s = 0; r.trail = [];
        r.pos = { x: r.home.x, y: r.home.y, a: 0 };
      });
      setStatus('plan proposed · awaiting your review', false);
      if (approveBtn) approveBtn.disabled = false;
      ticker.active = false;
      render();
    }
    function setStatus(text, approved) {
      if (!statusEl) return;
      statusEl.lastChild.nodeValue = ' ' + text;
      statusEl.classList.toggle('state-approved', !!approved);
    }

    if (approveBtn) approveBtn.addEventListener('click', function () {
      if (state !== 'proposed') return;
      state = 'approved';
      setStatus('approved by you · executing', true);
      approveBtn.disabled = true;
      if (!reduced()) { ticker.active = true; prev = 0; wake(); }
      else { robots.forEach(function (r) { r.s = 1; buildTrail(r); }); setStatus('approved by you · complete', true); render(); }
    });
    if (rejectBtn) rejectBtn.addEventListener('click', function () {
      propose();
      setStatus('rejected · new plan proposed', false);
    });

    function buildTrail(r) {
      r.trail = [];
      for (var k = 0; k <= 30; k++) {
        var p = atLength(r.path, (k / 30) * r.s * r.len);
        r.trail.push({ x: p.x, y: p.y });
      }
      r.pos = atLength(r.path, r.s * r.len);
    }

    var prev = 0;
    function step(now) {
      var dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0.016;
      prev = now;
      var allDone = true;
      robots.forEach(function (r) {
        if (r.s < 1) { r.s = Math.min(1, r.s + dt * 0.42); allDone = false; }
        var p = atLength(r.path, r.s * r.len);
        r.pos = p;
        r.trail.push({ x: p.x, y: p.y });
        if (r.trail.length > 60) r.trail.shift();
      });
      render();
      if (allDone) {
        state = 'done';
        ticker.active = false;
        setStatus('approved by you · complete', true);
      }
    }

    function render() {
      var ctx = c.ctx, W = c.w, H = c.h;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      drawGrid(ctx, W, H, Math.max(22, Math.round(W / 16)));

      robots.forEach(function (r) {
        if (!r.path) return;
        // the proposed plan, drawn but not yet enacted
        ctx.save();
        ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4;
        ctx.strokeStyle = state === 'proposed' ? 'rgba(111,176,232,.75)' : 'rgba(240,166,74,.5)';
        strokePath(ctx, r.path, W, H);
        ctx.restore();

        for (var i = 1; i < r.trail.length; i++) {
          ctx.strokeStyle = 'rgba(240,166,74,' + (i / r.trail.length) * 0.85 + ')';
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(r.trail[i - 1].x * W, r.trail[i - 1].y * H);
          ctx.lineTo(r.trail[i].x * W, r.trail[i].y * H);
          ctx.stroke();
        }
        drawAgent(ctx, r.pos.x * W, r.pos.y * H, r.pos.a || 0, state === 'proposed' ? MACHINE : HUMAN);

        ctx.save();
        ctx.fillStyle = DIM; ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(r.job, r.home.x * W - 6, r.home.y * H - 9);
        ctx.restore();
      });
    }

    var ticker = { active: false, tick: step };
    tickers.push(ticker);
    setTimeout(function () { c.resize(); propose(); }, 40);
  }

  /* ============================================================
     3. MOTION PRIMITIVES — the the motion study vocabulary, playable
     ============================================================ */
  function initPrimitives() {
    var root = document.querySelector('[data-prims]');
    if (!root) return;
    var canvas = root.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;

    var c = setupCanvas(canvas, function () { render(); });
    var noteEl = root.querySelector('[data-prim-note]');
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-prim]'));

    var SHAPES = {
      Searching: function () {
        var p = [], i;
        for (i = 0; i <= 50; i++) { var t = i / 50; p.push({ x: 0.1 + t * 0.8, y: 0.5 + Math.sin(t * Math.PI * 3.4) * 0.3 }); }
        return p;
      },
      Delivering: function () { return [{ x: 0.1, y: 0.7 }, { x: 0.5, y: 0.55 }, { x: 0.9, y: 0.38 }]; },
      Waking: function () {
        var p = [], i;
        for (i = 0; i <= 26; i++) { var t = i / 26; p.push({ x: 0.3 + t * 0.4, y: 0.72 - t * 0.34 * (1 - t * 0.35) }); }
        return p;
      },
      Urgent: function () {
        var p = [], i;
        for (i = 0; i <= 26; i++) { p.push({ x: 0.12 + i * 0.03, y: 0.5 + (i % 2 ? 0.26 : -0.26) }); }
        return p;
      },
      Returning: function () {
        var p = [], i;
        for (i = 0; i <= 40; i++) { var t = i / 40; p.push({ x: 0.88 - t * 0.76, y: 0.28 + Math.sin(t * Math.PI) * 0.4 }); }
        return p;
      },
      Error: function () {
        var p = [], i;
        for (i = 0; i <= 30; i++) { p.push({ x: 0.5 + (i % 3 - 1) * 0.045, y: 0.5 + (i % 2 ? 0.05 : -0.05) }); }
        return p;
      },
      Idle: function () {
        var p = [], i;
        for (i = 0; i <= 30; i++) { var t = i / 30; p.push({ x: 0.48 + Math.sin(t * Math.PI * 2) * 0.03, y: 0.5 + Math.cos(t * Math.PI * 2) * 0.02 }); }
        return p;
      }
    };
    var SPEED = { Searching: .5, Delivering: .45, Waking: .4, Urgent: 1.25, Returning: .5, Error: 1.5, Idle: .18 };
    var NOTE = {
      Urgent: 'Participants regularly confused <strong>Urgent</strong> with <strong>Searching</strong> — both are fast and repetitive. That confusion is one of the findings that motivated the thesis work.',
      Searching: 'Participants regularly confused <strong>Searching</strong> with <strong>Urgent</strong>. The distinction designed into them was not the distinction people perceived.'
    };

    var current = 'Searching';
    var path = SHAPES[current]();
    var len = pathLength(path);
    var s = 0, trail = [];

    function select(name) {
      current = name;
      path = SHAPES[name]();
      len = pathLength(path);
      s = 0; trail = [];
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-prim') === name)); });
      if (noteEl) {
        noteEl.innerHTML = NOTE[name] || 'Each primitive is a movement pattern meant to be read at a glance rather than decoded.';
      }
      if (reduced()) { s = 1; buildStaticTrail(); render(); }
      else { ticker.active = true; prev = 0; wake(); }
    }
    function buildStaticTrail() {
      trail = [];
      for (var k = 0; k <= 40; k++) {
        var p = atLength(path, (k / 40) * len);
        trail.push({ x: p.x, y: p.y });
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-prim')); });
    });

    var prev = 0;
    function step(now) {
      var dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0.016;
      prev = now;
      s += SPEED[current] * dt;
      if (s > 1) { s = 0; trail = []; }
      render();
    }

    function render() {
      var ctx = c.ctx, W = c.w, H = c.h;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      drawGrid(ctx, W, H, Math.max(20, Math.round(W / 18)));

      ctx.save();
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = HUMAN_DIM;
      strokePath(ctx, path, W, H);
      ctx.restore();

      var p = atLength(path, s * len);
      if (!reduced()) {
        trail.push({ x: p.x, y: p.y });
        if (trail.length > 40) trail.shift();
      }
      ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (var i = 1; i < trail.length; i++) {
        ctx.strokeStyle = 'rgba(111,176,232,' + (i / trail.length) * 0.9 + ')';
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x * W, trail[i - 1].y * H);
        ctx.lineTo(trail[i].x * W, trail[i].y * H);
        ctx.stroke();
      }
      drawAgent(ctx, p.x * W, p.y * H, p.a, MACHINE);

      ctx.save();
      ctx.fillStyle = DIM; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(current.toLowerCase(), 10, H - 10);
      ctx.restore();
    }

    var ticker = { active: false, tick: step };
    tickers.push(ticker);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        ticker.active = entries[0].isIntersecting && !reduced();
        prev = 0;
        if (ticker.active) wake();
      }, { threshold: 0.2 }).observe(root);
    }
    setTimeout(function () { c.resize(); select(current); }, 50);
  }

  /* ============================================================
     4. DISCLOSURES — cards, publications, timeline
     ============================================================ */
  function initDisclosures() {
    document.querySelectorAll('[data-toggle]').forEach(function (btn) {
      var item = btn.closest('[data-item]');
      if (!item) return;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ============================================================
     5. RESEARCH MAP — hovering a field lights its projects
     ============================================================ */
  function initMap() {
    var map = document.querySelector('[data-map]');
    if (!map) return;
    var svg = map.querySelector('.map-lines');
    var nodes = Array.prototype.slice.call(map.querySelectorAll('.map-node'));
    if (!svg) return;

    function place() {
      var box = map.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      nodes.forEach(function (n) {
        var x = n.getAttribute('data-x'), y = n.getAttribute('data-y');
        if (x === null || y === null) return;   // never leave a node at 0,0
        n.style.left = x + '%';
        n.style.top = y + '%';
      });
      // redraw the lines: every field connects to the core, every project to its fields
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var core = map.querySelector('.is-core');
      if (!core) return;
      var cb = center(core, box);
      nodes.forEach(function (n) {
        if (n === core) return;
        var nb = center(n, box);
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cb.x); line.setAttribute('y1', cb.y);
        line.setAttribute('x2', nb.x); line.setAttribute('y2', nb.y);
        line.setAttribute('data-for', n.getAttribute('data-id') || '');
        svg.appendChild(line);
      });
    }
    function center(el, box) {
      var r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    }

    function light(id) {
      var related = (id && map.querySelector('[data-id="' + id + '"]')) || null;
      var tags = related ? (related.getAttribute('data-rel') || '').split(/\s+/).filter(Boolean) : [];
      nodes.forEach(function (n) {
        var nid = n.getAttribute('data-id');
        var on = !id || nid === id || tags.indexOf(nid) > -1 ||
                 (related && (n.getAttribute('data-rel') || '').split(/\s+/).indexOf(id) > -1);
        n.classList.toggle('is-lit', !!id && on && nid !== id);
        n.classList.toggle('is-dim', !!id && !on && !n.classList.contains('is-core'));
      });
      svg.querySelectorAll('line').forEach(function (l) {
        var f = l.getAttribute('data-for');
        l.classList.toggle('is-lit', !!id && (f === id || tags.indexOf(f) > -1));
      });
    }

    nodes.forEach(function (n) {
      if (n.classList.contains('is-core')) return;
      var id = n.getAttribute('data-id');
      n.addEventListener('mouseenter', function () { light(id); });
      n.addEventListener('focus', function () { light(id); });
      n.addEventListener('mouseleave', function () { light(null); });
      n.addEventListener('blur', function () { light(null); });
    });

    place();
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    setTimeout(place, 300);
  }

  /* ============================================================
     6. MAGNETIC BUTTONS + SCROLL REVEAL
     ============================================================ */
  function initMagnetic() {
    if (reduced() || !window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('[data-magnetic] a').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * 6).toFixed(2) + 'px,' + (dy * 5).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    function showAll() {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
    }
    if (reduced() || !('IntersectionObserver' in window)) { showAll(); return; }

    // Only now do we let CSS hide anything.
    document.documentElement.classList.add('js-anim');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
    for (var i = 0; i < items.length; i++) io.observe(items[i]);

    // Safety net: whatever happens, nothing stays invisible.
    setTimeout(showAll, 2500);
  }

  /* ---------- theme toggle (shared with the other pages) ---------- */
  function initTheme() {
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var root = document.documentElement;
      var isDark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  function boot() {
    initTheme();
    initDisclosures();
    initReveal();
    initMagnetic();
    initMap();
    initArena();
    initPlanDemo();
    initPrimitives();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
