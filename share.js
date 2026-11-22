/* ============================================
   SHARE CARDS — a 1080×1920 story image of today's or this month's focus,
   drawn on a canvas in the browser (nothing is uploaded). On phones the
   Share button opens the system share sheet, where Instagram → Story is an
   option; elsewhere the image is downloaded or copied.

   Instagram's story layer covers roughly the top and bottom 220 px, so all
   content sits between y≈250 and y≈1700.
   ============================================ */
window.ShareCard = (() => {
  'use strict';
  const W = 1080, H = 1920;
  const st = { kind: 'day', blob: null, url: null, rendering: 0 };
  const $ = id => document.getElementById(id);

  // ── Data ───────────────────────────────────────────────────────
  const dayKey = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  // Midnight-to-midnight steps, safe across daylight-saving changes.
  const nextDay = k => dayKey(k + 36 * 3600000);
  const prevDay = k => dayKey(k - 12 * 3600000);
  const focus = () => (app.state.history || []).filter(s => s.type === 'focus');
  const fmtH = mins => {
    const m = Math.round(mins), h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
  };

  function streakEnding(daysSet, endKey) {
    let n = 0, k = endKey;
    while (daysSet.has(k)) { n++; k = prevDay(k); }
    return n;
  }

  function soundtrack(fromMs, toMs) {
    let all = [];
    try { all = JSON.parse(localStorage.getItem('pomodoro_focus_tracks') || '[]'); } catch (e) {}
    const by = new Map();
    all.filter(t => { const at = new Date(t.at).getTime(); return at >= fromMs && at < toMs; }).forEach(t => {
      const e = by.get(t.id) || { ...t, plays: 0 };
      e.plays++;
      by.set(t.id, e);
    });
    const tracks = [...by.values()].sort((a, b) => b.plays - a.plays);
    const artists = new Map();
    tracks.forEach(t => artists.set(t.artist, (artists.get(t.artist) || 0) + t.plays));
    const topArtist = [...artists.entries()].sort((a, b) => b[1] - a[1])[0];
    return { tracks: tracks.slice(0, 3), topArtist: topArtist ? topArtist[0] : null };
  }

  function dayData() {
    const today = dayKey(Date.now());
    const sessions = focus().filter(s => dayKey(s.date) === today);
    const mins = sessions.reduce((a, s) => a + s.duration, 0);
    const days = new Set(focus().map(s => dayKey(s.date)));
    const streak = days.has(today) ? streakEnding(days, today) : streakEnding(days, prevDay(today));
    return {
      date: new Date(),
      mins, count: sessions.length, goal: app.state.settings.dailyGoal || 8, streak,
      blocks: sessions.map(s => { const end = new Date(s.date); return { start: end.getTime() - s.duration * 60000, end: end.getTime() }; }),
      intention: (sessions.slice().reverse().find(s => s.intention) || {}).intention || null,
      music: soundtrack(today, nextDay(today))
    };
  }

  function monthData() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const sessions = focus().filter(s => { const d = new Date(s.date); return d >= first && d < next; });
    const perDay = new Map();
    sessions.forEach(s => { const k = dayKey(s.date); perDay.set(k, (perDay.get(k) || 0) + s.duration); });
    let best = null;
    perDay.forEach((m, k) => { if (!best || m > best.mins) best = { day: k, mins: m }; });
    const days = new Set(perDay.keys());
    // Longest run of consecutive focus days inside the month: start counting
    // only at days that have no focus day right before them.
    let longest = 0;
    days.forEach(k => {
      if (days.has(prevDay(k))) return;
      let n = 0, x = k;
      while (days.has(x)) { n++; x = nextDay(x); }
      longest = Math.max(longest, n);
    });
    return {
      first, next, now,
      mins: sessions.reduce((a, s) => a + s.duration, 0), count: sessions.length,
      activeDays: days.size, longest, best, perDay,
      music: soundtrack(first.getTime(), next.getTime())
    };
  }

  // ── Palette per theme (and album colours when they're on) ───────
  function palette() {
    const cs = getComputedStyle(document.body);
    const accent = (cs.getPropertyValue('--accent') || '#ff6b6b').trim();
    const theme = app.state.settings.theme;
    if (theme === 'pink') return { bg1: '#ffe4ef', bg2: '#fff7fa', ink: '#4b2535', dim: 'rgba(75,37,53,0.6)', faint: 'rgba(75,37,53,0.12)', accent: '#e0559a', on: '#fff' };
    if (theme === 'terea') return { bg1: '#06110f', bg2: '#020605', ink: '#e6fffc', dim: 'rgba(230,255,252,0.6)', faint: 'rgba(0,212,200,0.16)', accent: '#00d4c8', on: '#021412' };
    if (theme === 'medical') return { bg1: '#0b2342', bg2: '#06142a', ink: '#eaf7ff', dim: 'rgba(234,247,255,0.6)', faint: 'rgba(0,198,224,0.16)', accent: '#00c6e0', on: '#04121f' };
    return { bg1: '#121826', bg2: '#07090f', ink: '#f1f5ff', dim: 'rgba(241,245,255,0.58)', faint: 'rgba(255,255,255,0.08)', accent, on: '#fff' };
  }

  // ── Canvas helpers ─────────────────────────────────────────────
  const F = { display: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, monospace", sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" };
  function text(ctx, str, x, y, { size = 40, weight = 600, font = F.sans, color, align = 'left', max } = {}) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    let s = String(str);
    if (max) { while (s.length > 1 && ctx.measureText(s).width > max) s = s.slice(0, -2) + '…'; }
    ctx.fillText(s, x, y);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function loadImg(url) {
    return new Promise(res => {
      if (!url) return res(null);
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => res(i); i.onerror = () => res(null); i.src = url;
    });
  }

  function background(ctx, P) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.5, 120, 0, W * 0.5, 120, 1100);
    glow.addColorStop(0, withAlpha(P.accent, 0.28)); glow.addColorStop(1, withAlpha(P.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  }
  // Works for hex and hsl()/rgb() strings: let the canvas parse the colour.
  function withAlpha(color, a) {
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = color; const v = c.fillStyle;
    if (v.startsWith('#')) { const n = parseInt(v.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
    return v.replace(/rgba?\(([^)]+)\)/, (m, inner) => `rgba(${inner.split(',').slice(0, 3).join(',')},${a})`);
  }

  function brand(ctx, P) {
    // The tomato mark, drawn rather than an emoji so it renders the same everywhere.
    const x = 96, y = 262;
    ctx.fillStyle = '#ef5b4c'; ctx.beginPath(); ctx.arc(x + 22, y + 4, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3fb26a'; ctx.beginPath(); ctx.ellipse(x + 22, y - 18, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'Pomodoro Focus', x + 62, y + 18, { size: 38, weight: 700, font: F.display, color: P.ink });
  }

  function footer(ctx, P) {
    text(ctx, 'nikolakas.github.io/-pomodoro-focus', W / 2, 1712, { size: 28, weight: 500, color: P.dim, align: 'center' });
  }

  function statRow(ctx, P, y, items) {
    const colW = (W - 192) / items.length;
    items.forEach(([value, label], i) => {
      const cx = 96 + colW * i + colW / 2;
      text(ctx, value, cx, y, { size: 64, weight: 700, font: F.mono, color: P.ink, align: 'center', max: colW - 20 });
      text(ctx, label, cx, y + 52, { size: 28, weight: 600, color: P.dim, align: 'center' });
      if (i) { ctx.fillStyle = P.faint; ctx.fillRect(96 + colW * i, y - 60, 2, 120); }
    });
  }

  async function soundtrackBlock(ctx, P, y, music, maxRows = 3) {
    text(ctx, 'FOCUS SOUNDTRACK', 96, y, { size: 26, weight: 700, color: P.dim });
    if (music.topArtist) text(ctx, music.topArtist, W - 96, y, { size: 26, weight: 700, color: P.accent, align: 'right', max: 420 });
    const covers = await Promise.all(music.tracks.slice(0, maxRows).map(t => loadImg(t.img)));
    music.tracks.slice(0, maxRows).forEach((t, i) => {
      const ry = y + 34 + i * 116;
      ctx.save(); rr(ctx, 96, ry, 92, 92, 14); ctx.clip();
      if (covers[i]) ctx.drawImage(covers[i], 96, ry, 92, 92); else { ctx.fillStyle = P.faint; ctx.fillRect(96, ry, 92, 92); }
      ctx.restore();
      text(ctx, t.name, 214, ry + 40, { size: 36, weight: 700, color: P.ink, max: 640 });
      text(ctx, t.artist, 214, ry + 82, { size: 28, weight: 500, color: P.dim, max: 640 });
      if (t.plays > 1) text(ctx, `×${t.plays}`, W - 96, ry + 58, { size: 30, weight: 700, font: F.mono, color: P.dim, align: 'right' });
    });
  }

  // ── Cards ──────────────────────────────────────────────────────
  async function drawDay(ctx) {
    const P = palette(), d = dayData();
    background(ctx, P); brand(ctx, P);
    text(ctx, d.date.toLocaleDateString(undefined, { weekday: 'long' }), 96, 420, { size: 76, weight: 700, font: F.display, color: P.ink });
    text(ctx, d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), 96, 476, { size: 36, weight: 500, color: P.dim });

    // Progress ring: sessions against the daily goal.
    const cx = W / 2, cy = 770, r = 240;
    ctx.lineCap = 'round'; ctx.lineWidth = 34;
    ctx.strokeStyle = P.faint; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const pct = Math.min(1, d.count / d.goal);
    if (pct > 0) { ctx.strokeStyle = P.accent; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke(); }
    text(ctx, fmtH(d.mins), cx, cy + 34, { size: 128, weight: 700, font: F.mono, color: P.ink, align: 'center' });
    text(ctx, 'focused today', cx, cy + 96, { size: 34, weight: 600, color: P.dim, align: 'center' });

    statRow(ctx, P, 1120, [[`${d.count}/${d.goal}`, 'sessions'], [`${d.streak}`, 'day streak'], [d.count ? fmtH(d.mins / d.count) : '—', 'avg session']]);

    // The day as a strip from 06:00 to midnight, one block per session.
    const ty = 1240, x0 = 96, x1 = W - 96, t0 = new Date(d.date).setHours(6, 0, 0, 0), t1 = t0 + 18 * 3600000;
    ctx.fillStyle = P.faint; rr(ctx, x0, ty, x1 - x0, 30, 15); ctx.fill();
    ctx.fillStyle = P.accent;
    d.blocks.forEach(b => {
      const a = Math.max(t0, b.start), e = Math.min(t1, b.end);
      if (e <= a) return;
      const bx = x0 + (a - t0) / (t1 - t0) * (x1 - x0), bw = Math.max(8, (e - a) / (t1 - t0) * (x1 - x0));
      rr(ctx, bx, ty, bw, 30, 8); ctx.fill();
    });
    ['06', '12', '18', '24'].forEach((h, i) => text(ctx, h, x0 + (x1 - x0) * i / 3, ty + 70, { size: 24, weight: 600, font: F.mono, color: P.dim, align: i === 0 ? 'left' : i === 3 ? 'right' : 'center' }));

    if (d.music.tracks.length) await soundtrackBlock(ctx, P, 1380, d.music, 2);
    else if (d.intention) {
      text(ctx, 'TODAY I WORKED ON', 96, 1400, { size: 26, weight: 700, color: P.dim });
      text(ctx, d.intention, 96, 1460, { size: 44, weight: 700, font: F.display, color: P.ink, max: W - 192 });
    }
    footer(ctx, P);
  }

  async function drawMonth(ctx) {
    const P = palette(), m = monthData();
    background(ctx, P); brand(ctx, P);
    text(ctx, m.first.toLocaleDateString(undefined, { month: 'long' }), 96, 410, { size: 112, weight: 700, font: F.display, color: P.ink });
    text(ctx, `${m.first.getFullYear()} · my month in focus`, 96, 466, { size: 34, weight: 500, color: P.dim });

    const hours = (m.mins / 60).toFixed(m.mins >= 600 ? 0 : 1);
    text(ctx, hours, 96, 660, { size: 190, weight: 700, font: F.mono, color: P.accent });
    ctx.font = `700 190px ${F.mono}`;
    text(ctx, 'hours focused', 96 + ctx.measureText(hours).width + 24, 650, { size: 40, weight: 700, color: P.ink });

    statRow(ctx, P, 790, [[`${m.count}`, 'sessions'], [`${m.activeDays}`, 'active days'], [`${m.longest}`, 'best streak']]);

    // Calendar: Monday-first weeks, shaded by hours that day. Cells are wider
    // than tall so a six-week month still leaves room for the soundtrack.
    const cols = 7, gap = 12, cellW = (W - 192 - gap * 6) / cols;
    const lead = (m.first.getDay() + 6) % 7, daysIn = Math.round((m.next - m.first) / 86400000);
    const rows = Math.ceil((lead + daysIn) / 7);
    const cellH = rows > 5 ? 60 : 72;
    let gy = 900;
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l, i) => text(ctx, l, 96 + i * (cellW + gap) + cellW / 2, gy, { size: 26, weight: 700, color: P.dim, align: 'center' }));
    gy += 22;
    for (let i = 0; i < daysIn; i++) {
      const pos = lead + i, x = 96 + (pos % 7) * (cellW + gap), y = gy + Math.floor(pos / 7) * (cellH + gap);
      const k = dayKey(new Date(m.first.getFullYear(), m.first.getMonth(), i + 1));
      const mins = m.perDay.get(k) || 0;
      const future = k > dayKey(m.now);
      const level = mins === 0 ? 0 : mins < 30 ? 0.3 : mins < 60 ? 0.5 : mins < 120 ? 0.75 : 1;
      rr(ctx, x, y, cellW, cellH, 14);
      if (future) { ctx.strokeStyle = P.faint; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = level ? withAlpha(P.accent, level) : P.faint; ctx.fill(); }
      text(ctx, String(i + 1), x + 14, y + 32, { size: 22, weight: 700, font: F.mono, color: level >= 0.75 ? P.on : P.dim });
      if (k === dayKey(m.now)) { ctx.strokeStyle = P.ink; ctx.lineWidth = 4; rr(ctx, x - 5, y - 5, cellW + 10, cellH + 10, 18); ctx.stroke(); }
    }
    let y = gy + rows * (cellH + gap) + 46;

    if (m.best) { text(ctx, `Best day · ${new Date(m.best.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtH(m.best.mins)}`, 96, y, { size: 34, weight: 600, color: P.ink }); y += 70; }
    if (m.music.tracks.length) {
      const fit = Math.floor((1660 - y - 34) / 116);
      if (fit >= 1) await soundtrackBlock(ctx, P, y, m.music, Math.min(3, fit));
    }
    footer(ctx, P);
  }

  // ── Modal ──────────────────────────────────────────────────────
  async function render() {
    const id = ++st.rendering;
    try { await Promise.all(["700 100px 'Space Grotesk'", "700 100px 'JetBrains Mono'"].map(f => document.fonts.load(f))); } catch (e) {}
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    if (st.kind === 'day') await drawDay(ctx); else await drawMonth(ctx);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (id !== st.rendering) return;
    st.blob = blob;
    if (st.url) URL.revokeObjectURL(st.url);
    st.url = URL.createObjectURL(blob);
    const img = $('share-preview');
    if (img) { img.src = st.url; img.classList.remove('is-loading'); }
  }

  function fileName() {
    const d = new Date();
    return st.kind === 'day' ? `focus-${d.toISOString().slice(0, 10)}.png` : `focus-${d.toISOString().slice(0, 7)}.png`;
  }

  async function share() {
    if (!st.blob) return;
    const file = new File([st.blob], fileName(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); }
      catch (e) { if (e.name !== 'AbortError') save(); }
    } else {
      save();
      app.showToast('Image saved', 'To post it as a story, open Instagram and add it from your gallery.', '⬇');
    }
  }

  function save() {
    if (!st.url) return;
    const a = document.createElement('a');
    a.href = st.url; a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function copy() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': st.blob })]);
      app.showToast('Copied', 'Paste the image anywhere.', '📋');
    } catch (e) { save(); }
  }

  function open(kind) {
    st.kind = kind || 'day';
    const modal = $('share-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.querySelectorAll('[data-share-kind]').forEach(b => b.classList.toggle('active', b.dataset.shareKind === st.kind));
    const img = $('share-preview'); if (img) img.classList.add('is-loading');
    const canFiles = !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
    $('share-go').textContent = canFiles ? 'Share' : 'Save image';
    $('share-copy').hidden = !(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) || canFiles;
    $('share-hint').textContent = canFiles ? 'Choose Instagram → Story in the share menu.' : 'Saves the image. On your phone this opens the share menu, with Instagram → Story.';
    render();
  }

  function close() { const m = $('share-modal'); if (m) m.style.display = 'none'; }

  function init() {
    const modal = $('share-modal');
    if (!modal) return;
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('#share-close')) { close(); return; }
      const k = e.target.closest('[data-share-kind]');
      if (k && k.dataset.shareKind !== st.kind) {
        st.kind = k.dataset.shareKind;
        modal.querySelectorAll('[data-share-kind]').forEach(b => b.classList.toggle('active', b === k));
        $('share-preview').classList.add('is-loading');
        render();
      }
      if (e.target.closest('#share-go')) share();
      if (e.target.closest('#share-copy')) copy();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') close(); });
    document.querySelectorAll('[data-open-share]').forEach(b => b.addEventListener('click', () => open(b.dataset.openShare)));
  }

  return { init, open, close, _render: render, _state: st };
})();

window.ShareCard.init();
