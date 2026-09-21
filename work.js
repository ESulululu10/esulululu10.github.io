/* ============================================================
   WORK — one instrument per project.
     AR LENS   : move a lens over the arena, overlays appear
     SCRUB     : drag through the stages of the video pipeline
   The other two projects reuse the plan review and the motion
   primitive player from app.js.
   ============================================================ */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RM.matches; };
  var ACCENT = '#e8873a', STEEL = '#8a94a6';

  /* ============================================================
     AR LENS — the AR authoring tool
     The arena is plain until you look at it through the lens.
     That is the project: overlays registered onto real robots.
     ============================================================ */
  function initLens() {
    var root = document.querySelector('[data-lens]');
    if (!root) return;
    var canvas = root.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, mx = -999, my = -999, target = -999, ty = -999, raf = 0;

    // five characters on the floor, the cast the AR authoring tool drives
    var cast = [
      { x: .18, y: .34, tag: 'ROBOT 1', act: 'enters' },
      { x: .40, y: .62, tag: 'ROBOT 2', act: 'searches' },
      { x: .60, y: .28, tag: 'ROBOT 3', act: 'delivers' },
      { x: .78, y: .58, tag: 'ROBOT 4', act: 'waits' },
      { x: .30, y: .80, tag: 'ROBOT 5', act: 'celebrates' }
    ];

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function draw() {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      // floor
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      var step = Math.max(26, W / 16);
      for (var x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      var R = Math.min(W, H) * 0.32;
      var live = mx > -900;

      cast.forEach(function (c) {
        var px = c.x * W, py = c.y * H;
        // the robot itself is always there
        ctx.fillStyle = STEEL;
        ctx.globalAlpha = .85;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(px - 7, py - 5, 14, 10, 2) : ctx.rect(px - 7, py - 5, 14, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (!live) return;
        var d = Math.hypot(px - mx, py - my);
        if (d > R) return;
        var k = 1 - d / R;                      // stronger toward the middle of the lens
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.2;
        ctx.strokeRect(px - 15, py - 13, 30, 26);
        ctx.beginPath(); ctx.moveTo(px + 15, py - 13); ctx.lineTo(px + 27, py - 22); ctx.stroke();
        ctx.fillStyle = ACCENT;
        ctx.font = '600 9px ui-monospace, monospace';
        ctx.fillText(c.tag, px + 30, py - 22);
        ctx.fillStyle = '#cfd4db';
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(c.act, px + 30, py - 11);
        ctx.globalAlpha = 1;
      });

      if (live) {
        ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232,135,58,.3)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    function loop() {
      mx += (target - mx) * 0.18;
      my += (ty - my) * 0.18;
      draw();
      raf = (Math.abs(target - mx) > .5 || Math.abs(ty - my) > .5) ? requestAnimationFrame(loop) : 0;
    }
    function move(e) {
      var r = canvas.getBoundingClientRect();
      target = e.clientX - r.left; ty = e.clientY - r.top;
      if (mx < -900) { mx = target; my = ty; }
      if (reduced()) { mx = target; my = ty; draw(); return; }
      if (!raf) raf = requestAnimationFrame(loop);
    }
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    canvas.addEventListener('pointerleave', function () {
      target = ty = mx = my = -999; draw();
    });

    if (size()) draw();
    window.addEventListener('resize', function () { if (size()) draw(); });
    if (window.ResizeObserver) new ResizeObserver(function () { if (size()) draw(); }).observe(canvas);
    // a hint of the interaction for anyone who never moves a pointer over it
    setTimeout(function () {
      if (mx < -900 && !reduced()) { target = W * .5; ty = H * .5; if (!raf) raf = requestAnimationFrame(loop); }
    }, 900);
  }

  /* ============================================================
     SCRUB — the nursing video pipeline
     Drag the handle and the topic moves through production.
     ============================================================ */
  function initScrub() {
    var root = document.querySelector('[data-scrub]');
    if (!root) return;
    var rail = root.querySelector('.scrub-rail');
    var handle = root.querySelector('.scrub-handle');
    var frames = Array.prototype.slice.call(root.querySelectorAll('.sframe'));
    var caption = root.querySelector('.scrub-caption');
    var input = root.querySelector('input[type="range"]');
    if (!rail || !frames.length || !input) return;

    function apply(i) {
      frames.forEach(function (f, k) {
        f.classList.toggle('on', k <= i);
        f.classList.toggle('now', k === i);
      });
      if (handle) handle.style.left = (i / (frames.length - 1) * 100) + '%';
      if (caption) {
        caption.innerHTML = '<span class="n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
                            frames[i].getAttribute('data-caption');
      }
    }
    input.addEventListener('input', function () { apply(+input.value); });
    frames.forEach(function (f, k) {
      f.addEventListener('click', function () { input.value = k; apply(k); });
    });
    apply(+input.value || 0);
  }

  function boot() { initLens(); initScrub(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
