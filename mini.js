/* ============================================
   MINI TIMER — a small always-on-top window (Document Picture-in-Picture,
   Chrome/Edge 116+). It floats over every other app, even with the browser
   minimised, and mirrors the main page live: time, ring, phase, play/pause,
   reset, skip, plus the song playing with its controls. It reuses the app's
   stylesheet and copies the body's theme/album state, so it changes colour
   with the album like the main window does.
   ============================================ */
window.MiniTimer = (() => {
  'use strict';
  let win = null, tick = null, observer = null;
  const C = 2 * Math.PI * 54;   // ring circumference (r = 54)
  const supported = () => 'documentPictureInPicture' in window;

  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/></svg>',
    skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>'
  };

  const MARKUP = `
    <main class="mini" aria-label="Pomodoro mini timer">
      <div class="mini-top"><span class="mini-mode" id="m-mode">Focus</span><span class="mini-session" id="m-session"></span></div>
      <div class="mini-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="mini-track" cx="60" cy="60" r="54"/>
          <circle class="mini-prog" id="m-prog" cx="60" cy="60" r="54" stroke-dasharray="${C}" stroke-dashoffset="0"/>
        </svg>
        <span class="mini-time" id="m-time">25:00</span>
      </div>
      <div class="mini-ctrls">
        <button type="button" class="mini-btn" data-mini="reset" aria-label="Reset">${ICON.reset}</button>
        <button type="button" class="mini-btn mini-btn-main" data-mini="toggle" id="m-toggle" aria-label="Start">${ICON.play}</button>
        <button type="button" class="mini-btn" data-mini="skip" aria-label="Skip">${ICON.skip}</button>
      </div>
      <div class="mini-np np-card" id="m-np" hidden></div>
    </main>`;

  function render() {
    if (!win) return;
    const d = win.document, s = app.state;
    const $ = id => d.getElementById(id);
    const m = Math.floor(s.timeLeft / 60), sec = s.timeLeft % 60;
    $('m-time').textContent = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    const total = s.adjustedTotal || ((s.mode === 'work' ? s.settings.work : s.mode === 'shortBreak' ? s.settings.short : s.settings.long) * 60);
    const p = total > 0 ? Math.min(1, s.timeLeft / total) : 1;
    $('m-prog').setAttribute('stroke-dashoffset', String(C - p * C));
    $('m-mode').textContent = s.mode === 'work' ? 'Focus' : s.mode === 'shortBreak' ? 'Short break' : 'Long break';
    const main = document.getElementById('session-text');
    $('m-session').textContent = main ? main.textContent : '';
    const t = $('m-toggle');
    const want = s.isRunning ? 'pause' : 'play';
    if (t.dataset.icon !== want) { t.innerHTML = ICON[want]; t.dataset.icon = want; t.setAttribute('aria-label', s.isRunning ? 'Pause' : 'Start'); }
    win.document.title = `${$('m-time').textContent} · ${$('m-mode').textContent}`;

    // Mirror whichever now-playing widget the main page is showing.
    const src = document.querySelector('#sp-mini:not([hidden]), #album-now:not([hidden])');
    const np = $('m-np');
    if (!src) { np.hidden = true; np.dataset.html = ''; return; }
    np.hidden = false;
    np.classList.toggle("has-vol", src.classList.contains("has-vol"));
    if (MiniTimer._pipDragging && MiniTimer._pipDragging()) return;
    if (np.dataset.html !== src.innerHTML) { np.innerHTML = src.innerHTML; np.dataset.html = src.innerHTML; }
  }

  // Theme classes, data-mode and the inline custom properties (accent, album
  // colours, cover) live on the main <body>; copy them so the mini window
  // looks and changes exactly like the main one.
  function syncBody() {
    if (!win) return;
    const b = win.document.body;
    b.className = `${document.body.className} mini-window`;
    b.setAttribute('style', document.body.getAttribute('style') || '');
    if (document.body.dataset.mode) b.dataset.mode = document.body.dataset.mode;
  }

  async function open() {
    if (win) { win.focus(); return; }
    if (!supported()) {
      app.showToast('Floating timer needs Chrome or Edge',
        'This browser can’t keep a window on top. Tip: install the app (Settings › Install) to get its own small window.', '🪟');
      return;
    }
    try {
      win = await documentPictureInPicture.requestWindow({ width: 300, height: 380 });
    } catch (e) {
      console.warn('[mini] could not open', e);
      return;
    }
    const d = win.document;
    // Stylesheets: absolute URLs (the window's own URL is about:blank).
    document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
      const n = d.createElement('link'); n.rel = 'stylesheet'; n.href = l.href; d.head.appendChild(n);
    });
    document.querySelectorAll('style').forEach(st => d.head.appendChild(st.cloneNode(true)));
    const meta = d.createElement('meta'); meta.name = 'color-scheme'; meta.content = 'dark'; d.head.appendChild(meta);
    d.body.innerHTML = MARKUP;
    syncBody();

    d.body.addEventListener('click', e => {
      const btn = e.target.closest('[data-mini]');
      if (btn) {
        const a = btn.dataset.mini;
        // Start/stop directly: the "what are you focusing on?" prompt lives in the
        // main window, which may be minimised while you use this one.
        if (a !== 'mini' && window.StudyRoom && StudyRoom.locked) { StudyRoom.lockedToast(); return; }
        if (a === 'toggle') app.state.isRunning ? app.stopTimer() : app.startTimer();
        else if (a === 'reset') app.resetTimer();
        else if (a === 'skip') app.skipSession();
        render();
        return;
      }
      // Music controls: forward to the matching button in the main page.
      const ctl = e.target.closest('[data-spa], [data-link]');
      if (ctl) {
        const sel = ctl.dataset.spa ? `#sp-mini [data-spa="${ctl.dataset.spa}"]` : `#album-now [data-link="${ctl.dataset.link}"]`;
        const real = document.querySelector(sel);
        if (real) real.click();
      }
    });
    // Volume from the floating window: drive the real player directly.
    let pipDrag = false;
    d.body.addEventListener('input', e => {
      if (!e.target.matches('[data-spa-vol]') || !window.SpotifyAccount) return;
      pipDrag = true; SpotifyAccount.setVolume(+e.target.value);
    });
    d.addEventListener('pointerup', () => { pipDrag = false; });
    d.body.addEventListener('wheel', e => {
      if (!e.target.closest('#m-np') || !window.SpotifyAccount || SpotifyAccount.volume == null) return;
      e.preventDefault(); SpotifyAccount.setVolume(SpotifyAccount.volume + (e.deltaY < 0 ? 5 : -5));
    }, { passive: false });
    MiniTimer._pipDragging = () => pipDrag;
    // Space toggles the timer from inside the mini window too.
    d.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); app.state.isRunning ? app.stopTimer() : app.startTimer(); render(); } });

    observer = new MutationObserver(syncBody);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-mode'] });
    tick = setInterval(render, 250);
    render();
    setButtonState(true);

    win.addEventListener('pagehide', () => {
      clearInterval(tick); tick = null;
      if (observer) observer.disconnect(); observer = null;
      win = null;
      setButtonState(false);
    });
  }

  function close() { if (win) win.close(); }
  function toggle() { win ? close() : open(); }

  function setButtonState(on) {
    const b = document.getElementById('btn-mini');
    if (b) { b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }

  function init() {
    const b = document.getElementById('btn-mini');
    if (b) b.addEventListener('click', toggle);
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'm' || e.key === 'M') { if (!e.ctrlKey && !e.metaKey && !e.altKey) toggle(); }
    });
  }

  return { init, open, close, toggle, get isOpen() { return !!win; }, supported };
})();

window.MiniTimer.init();

/* ============================================
   INSTALL AS APP — when the browser offers installation, Settings shows an
   Install button that opens the browser's own install prompt.
   ============================================ */
(() => {
  let deferred = null;
  const row = () => document.getElementById('row-install');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    if (row()) row().hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    if (row()) row().hidden = true;
    if (typeof app !== 'undefined') app.showToast('Installed', 'Pomodoro Focus now has its own window and taskbar icon.', '✅');
  });
  document.addEventListener('click', async e => {
    if (!e.target.closest('#btn-install') || !deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    if (row()) row().hidden = true;
  });
})();
