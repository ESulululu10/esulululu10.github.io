/* ============================================================
   WAYFINDING
   Command palette, mobile menu, scroll progress, back to top,
   and hover prefetch. All of it built on top of links that
   already work, so nothing here is required to use the site.
   ============================================================ */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* every destination on the site, in one list */
  var DEST = [
    { l: 'Home',                     h: 'index.html',            k: 'PAGE', t: 'start intro' },
    { l: 'What I study',             h: 'index.html#about',      k: '01',   t: 'about research interests map constellation' },
    { l: 'Research constellation',   h: 'index.html#about',      k: '01',   t: 'network areas fields nodes' },
    { l: 'Systems I have built',     h: 'index.html#research',   k: '02',   t: 'projects cards' },
    { l: 'Publications',             h: 'index.html#publications', k: '03', t: 'papers manuscripts hri under review' },
    { l: 'Trajectory globe',         h: 'index.html#background', k: '04',   t: 'background timeline chapters globe' },
    { l: 'What I want to study next',h: 'index.html#next',       k: '05',   t: 'questions phd direction' },
    { l: 'Contact',                  h: 'index.html#contact',    k: '06',   t: 'email get in touch' },

    { l: 'Work &middot; all four systems', h: 'work.html',        k: 'PAGE', t: 'projects' },
    { l: 'Multi-Robot Authoring Research', h: 'work.html#thesis', k: 'PROJ', t: 'thesis under review plan approve reject authoring motion' },
    { l: 'Expressive Robot Motion Study', h: 'work.html#motion-study', k: 'PROJ', t: 'motion primitives seven states study n=11 legible' },
    { l: 'EventMakAR', h: 'work.html#eventmakar', k: 'PROJ', t: 'augmented reality ar workshop authoring stories' },
    { l: 'Social web inspired video',h: 'work.html#video',       k: 'PROJ', t: 'nursing aacn pipeline dabney' },

    { l: 'Technical background',     h: 'engineering.html',      k: 'PAGE', t: 'stack blueprint esp32 vive llm schematic skills' },
    { l: 'Curriculum Vitae',         h: 'cv.html',               k: 'PAGE', t: 'cv resume education' },
    { l: 'CV &middot; Education',    h: 'cv.html#cv-edu',        k: 'CV',   t: 'degree michigan london' },
    { l: 'CV &middot; Research',     h: 'cv.html#cv-res',        k: 'CV',   t: 'assistantship playlab nursing reu' },
    { l: 'CV &middot; Publications', h: 'cv.html#cv-pub',        k: 'CV',   t: 'papers' },
    { l: 'CV &middot; Skills',       h: 'cv.html#cv-skill',      k: 'CV',   t: 'python robotics ar methods' },

    { l: 'Download CV (PDF)',        h: 'Gaurab_Khadka_CV.pdf',  k: 'FILE', t: 'pdf download resume' },
    { l: 'Email Gaurab',             h: 'mailto:gaurabk@umich.edu', k: 'MAIL', t: 'contact write' },
    { l: 'GitHub',                   h: 'https://github.com/ESulululu10', k: 'LINK', t: 'code repositories' },
    { l: 'LinkedIn',                 h: 'https://www.linkedin.com/in/gaurabk/', k: 'LINK', t: 'profile' }
  ];

  var head = document.querySelector('.site-head .wrap');
  var nav = document.querySelector('.site-nav');
  if (!head || !nav) return;

  /* ---------- scroll progress ---------- */
  var bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);

  /* ---------- back to top ---------- */
  var top = document.createElement('button');
  top.className = 'totop';
  top.type = 'button';
  top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
  });
  document.body.appendChild(top);

  var queued = false;
  function onScroll() {
    queued = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    top.classList.toggle('on', window.scrollY > window.innerHeight * 1.2);
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- command palette ---------- */
  var openBtn = document.createElement('button');
  openBtn.className = 'cmd-open';
  openBtn.type = 'button';
  openBtn.setAttribute('aria-label', 'Search and jump to anywhere on the site');
  openBtn.innerHTML = 'Jump <kbd>' + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + 'K</kbd>';
  nav.insertBefore(openBtn, nav.firstChild);

  var cmd = document.createElement('div');
  cmd.className = 'cmd';
  cmd.setAttribute('role', 'dialog');
  cmd.setAttribute('aria-modal', 'true');
  cmd.setAttribute('aria-label', 'Jump to');
  cmd.innerHTML =
    '<div class="cmd-box">' +
      '<input class="cmd-input" type="text" placeholder="Jump to a project, a paper, the CV…" aria-label="Search the site">' +
      '<ul class="cmd-list" role="listbox"></ul>' +
      '<div class="cmd-foot"><span>&uarr;&darr; move</span><span>&crarr; open</span><span>esc close</span></div>' +
    '</div>';
  document.body.appendChild(cmd);

  var input = cmd.querySelector('.cmd-input');
  var list = cmd.querySelector('.cmd-list');
  var shown = [], at = 0;

  function strip(s) { return s.replace(/&[a-z]+;/g, ' ').toLowerCase(); }

  function render(q) {
    q = q.trim().toLowerCase();
    shown = !q ? DEST.slice() : DEST.filter(function (d) {
      return (strip(d.l) + ' ' + d.t + ' ' + d.k).indexOf(q) > -1;
    });
    at = 0;
    if (!shown.length) {
      list.innerHTML = '<li class="cmd-empty">Nothing matches that.</li>';
      return;
    }
    list.innerHTML = shown.map(function (d, i) {
      return '<li class="cmd-item" role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
               '<span class="ico">' + (d.k === 'PAGE' ? '■' : d.k.slice(0, 2)) + '</span>' +
               '<span class="lbl">' + d.l + '</span>' +
               '<span class="hint">' + d.k + '</span>' +
             '</li>';
    }).join('');
  }
  function mark() {
    var items = list.querySelectorAll('.cmd-item');
    items.forEach(function (el, i) { el.setAttribute('aria-selected', String(i === at)); });
    if (items[at]) items[at].scrollIntoView({ block: 'nearest' });
  }
  function go(d) {
    if (!d) return;
    close();
    if (/^https?:|^mailto:/.test(d.h)) window.open(d.h, /^mailto:/.test(d.h) ? '_self' : '_blank');
    else window.location.href = d.h;
  }
  function open() {
    cmd.classList.add('open');
    input.value = '';
    render('');
    input.focus();
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    cmd.classList.remove('open');
    document.documentElement.style.overflow = '';
  }

  openBtn.addEventListener('click', open);
  cmd.addEventListener('click', function (e) { if (e.target === cmd) close(); });
  input.addEventListener('input', function () { render(input.value); });
  list.addEventListener('click', function (e) {
    var it = e.target.closest('.cmd-item');
    if (it) go(shown[+it.getAttribute('data-i')]);
  });
  list.addEventListener('mousemove', function (e) {
    var it = e.target.closest('.cmd-item');
    if (it) { at = +it.getAttribute('data-i'); mark(); }
  });
  document.addEventListener('keydown', function (e) {
    var metaK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
    var slash = e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (metaK || slash) { e.preventDefault(); cmd.classList.contains('open') ? close() : open(); return; }
    if (!cmd.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(at + 1, shown.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(at - 1, 0); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(shown[at]); }
  });

  /* ---------- mobile menu ---------- */
  var mBtn = document.createElement('button');
  mBtn.className = 'menu-btn';
  mBtn.type = 'button';
  mBtn.setAttribute('aria-label', 'Open menu');
  mBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  nav.appendChild(mBtn);

  var sheet = document.createElement('div');
  sheet.className = 'sheet';
  var MENU = [
    { l: 'Work', h: 'work.html', s: 'four systems' },
    { l: 'Publications', h: 'index.html#publications', s: 'papers' },
    { l: 'Technical', h: 'engineering.html', s: 'the stack' },
    { l: 'Curriculum Vitae', h: 'cv.html', s: 'full record' },
    { l: 'Contact', h: 'index.html#contact', s: 'email' }
  ];
  sheet.innerHTML =
    '<button class="sheet-close" type="button" aria-label="Close menu">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
    '</button>' +
    MENU.map(function (m) {
      return '<a href="' + m.h + '">' + m.l + '<span>' + m.s + '</span></a>';
    }).join('');
  document.body.appendChild(sheet);

  function openSheet() { sheet.classList.add('open'); document.documentElement.style.overflow = 'hidden'; }
  function closeSheet() { sheet.classList.remove('open'); document.documentElement.style.overflow = ''; }
  mBtn.addEventListener('click', openSheet);
  sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
  });

  /* ---------- prefetch a page as soon as the pointer heads for it ---------- */
  var seen = {};
  function prefetch(href) {
    if (!href || seen[href] || /^https?:|^mailto:|^#/.test(href)) return;
    var path = href.split('#')[0];
    if (!path || seen[path] || path === location.pathname.split('/').pop()) return;
    seen[path] = 1;
    var l = document.createElement('link');
    l.rel = 'prefetch'; l.href = path;
    document.head.appendChild(l);
  }
  document.addEventListener('pointerover', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) prefetch(a.getAttribute('href'));
  }, { passive: true });
})();
