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
     AR LENS — EventMakAR
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

    // the real cast: devices exist in the room, characters only through AR
    var cast = [
      { x: .13, y: .30, t: 'Car',       a: 'forward', v: false },
      { x: .34, y: .72, t: 'Catapult',  a: 'spin',    v: false },
      { x: .60, y: .24, t: 'House',     a: 'open',    v: false },
      { x: .84, y: .66, t: 'Train',     a: 'forward', v: false },
      { x: .24, y: .52, t: 'Skeleton',  a: 'attack',  v: true  },
      { x: .49, y: .48, t: 'Barbarian', a: 'run',     v: true  },
      { x: .71, y: .78, t: 'Spider',    a: 'walk',    v: true  },
      { x: .90, y: .32, t: 'Woman',     a: 'dance',   v: true  }
    ];
    // one authored event crossing from a device to a character
    var link = { from: 1, to: 4 };

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
      function seen(c) { return live && Math.hypot(c.x * W - mx, c.y * H - my) < R; }

      // the authored event, visible only when both ends are under the lens
      var a = cast[link.from], b = cast[link.to];
      if (seen(a) && seen(b)) {
        ctx.save();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = ACCENT; ctx.globalAlpha = .7; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = ACCENT; ctx.font = '600 8.5px ui-monospace, monospace';
        ctx.fillText('PHYSICAL → VIRTUAL',
          (a.x + b.x) / 2 * W - 34, (a.y + b.y) / 2 * H - 6);
      }

      cast.forEach(function (c) {
        var px = c.x * W, py = c.y * H;
        var on = seen(c);

        if (!c.v) {
          // a real device: always there, whether or not you are looking through AR
          ctx.fillStyle = STEEL; ctx.globalAlpha = .9;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(px - 8, py - 6, 16, 12, 2) : ctx.rect(px - 8, py - 6, 16, 12);
          ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = on ? '#cfd4db' : '#5c626b';
          ctx.font = '8.5px ui-monospace, monospace';
          ctx.fillText(c.t.toUpperCase(), px + 12, py + 3);
        } else if (on) {
          // a virtual character: exists only under the lens
          var k = 1 - Math.hypot(px - mx, py - my) / R;
          ctx.globalAlpha = Math.min(1, k * 1.7);
          ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px - 9, py - 11, 18, 22);
          ctx.setLineDash([]);
          ctx.fillStyle = ACCENT;
          ctx.font = '600 8.5px ui-monospace, monospace';
          ctx.fillText(c.t.toUpperCase(), px + 14, py - 2);
          ctx.fillStyle = '#cfd4db';
          ctx.font = '8.5px ui-monospace, monospace';
          ctx.fillText(c.a, px + 14, py + 8);
          ctx.globalAlpha = 1;
        }
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
