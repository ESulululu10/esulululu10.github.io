/* ============================================================
   Runs the real EventMakAR component on the page.
   React is fetched only when the visitor asks for it, so the
   page carries no cost until then, and the screenshot stays as
   the fallback if anything fails to load.
   ============================================================ */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-live]');
  if (!wrap) return;
  var btn = wrap.querySelector('[data-live-launch]');
  var host = wrap.querySelector('.live-host');
  var bar = wrap.querySelector('[data-live-bar]');
  if (!btn || !host) return;

  var SRC = [
    'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
    'demo/eventmakar.js'
  ];

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  var root = null;
  btn.addEventListener('click', function run() {
    btn.disabled = true;
    btn.textContent = 'Loading\u2026';
    SRC.reduce(function (p, s) { return p.then(function () { return load(s); }); }, Promise.resolve())
      .then(function () {
        if (typeof EventMakAR !== 'function') throw new Error('component missing');
        root = ReactDOM.createRoot(host);
        root.render(React.createElement(EventMakAR));
        wrap.classList.add('is-on');
        if (bar) bar.hidden = false;
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Could not load. Try again';
      });
  });

  // start it when the section is reached, so nobody has to ask twice
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !wrap.classList.contains('is-on') && !btn.disabled) {
        io2.disconnect();
        btn.click();
      }
    }, { rootMargin: '200px' });
    io2.observe(wrap);
  }

  var reset = wrap.querySelector('[data-live-reset]');
  if (reset) reset.addEventListener('click', function () {
    if (root) { root.unmount(); root = ReactDOM.createRoot(host); root.render(React.createElement(EventMakAR)); }
  });
})();
