/* ============================================
   SPOTIFY ACCOUNT — log in with Spotify (Authorization Code + PKCE, no
   backend), show what you're listening to, your recent plays, top tracks and
   playlists, control playback, and (Premium) play right here in the browser
   through the Web Playback SDK. Plays happen on the user's own account, so
   they count in their Spotify history and stats like any other listening.

   Needs a Client ID from a Spotify developer app whose Redirect URI is this
   page's address. Since Feb 2026 a Development Mode app must be owned by a
   Premium account and allows up to five users (added in the dashboard).
   ============================================ */
window.SpotifyAccount = (() => {
  'use strict';

  // Set this to the app's Client ID to make "Connect Spotify" work for every
  // visitor. Until then it can be entered once in the setup panel (stored
  // locally). A Client ID is public by design in the PKCE flow.
  const CLIENT_ID = '64fde39ac41641a98e48463a3cd7844c';

  const SCOPES = [
    'user-read-currently-playing', 'user-read-playback-state', 'user-modify-playback-state',
    'user-read-recently-played', 'user-top-read', 'playlist-read-private',
    'streaming', 'user-read-private', 'user-read-email'
  ].join(' ');
  const AUTH_KEY = 'pomodoro_spotify_auth';
  const PKCE_KEY = 'pomodoro_spotify_pkce';
  const CID_KEY = 'pomodoro_spotify_client_id';
  const API = 'https://api.spotify.com/v1';

  const st = {
    profile: null, now: null, recent: [], top: [], playlists: [],
    list: 'recent', setupOpen: false, error: '',
    deviceId: null, player: null, sdkLoading: false, playingHere: false,
    pollTimer: null, lastLocalState: 0
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // app.js declares `const app`, which is a global binding but NOT window.app.
  const hasApp = () => typeof app !== 'undefined';
  const toast = (t, d) => hasApp() && app.showToast(t, d, '♪');
  const clientId = () => CLIENT_ID || localStorage.getItem(CID_KEY) || '';
  const redirectUri = () => location.origin + location.pathname;

  // ── Auth (PKCE) ──────────────────────────────────────────────────
  const auth = {
    get() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { localStorage.setItem(AUTH_KEY, JSON.stringify(v)); },
    clear() { localStorage.removeItem(AUTH_KEY); }
  };
  const connected = () => !!(auth.get() && auth.get().refresh_token);

  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const randomString = n => b64url(crypto.getRandomValues(new Uint8Array(n)));

  async function login() {
    if (!clientId()) { st.setupOpen = true; render(); return; }
    const verifier = randomString(64);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = randomString(16);
    localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, redirect: redirectUri() }));
    const q = new URLSearchParams({
      client_id: clientId(), response_type: 'code', redirect_uri: redirectUri(),
      code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state
    });
    location.assign(`https://accounts.spotify.com/authorize?${q}`);
  }

  async function tokenRequest(params) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId(), ...params })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error_description || data.error || `HTTP ${r.status}`), { code: data.error });
    const prev = auth.get() || {};
    auth.set({
      access_token: data.access_token,
      refresh_token: data.refresh_token || prev.refresh_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000
    });
  }

  // Spotify sends the user back to this page with ?code=… (or ?error=…).
  async function handleRedirect() {
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('error')) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PKCE_KEY) || 'null'); } catch (e) {}
    // Only handle callbacks we started; leave anyone else's query alone.
    if (!saved || params.get('state') !== saved.state) return;
    localStorage.removeItem(PKCE_KEY);
    const clean = new URL(location.href);
    ['code', 'state', 'error'].forEach(k => clean.searchParams.delete(k));
    history.replaceState({}, '', clean.pathname + clean.search + clean.hash);

    if (params.get('error')) {
      if (params.get('error') !== 'access_denied') toast('Spotify connection failed', params.get('error'));
      return;
    }
    try {
      await tokenRequest({ grant_type: 'authorization_code', code: params.get('code'), redirect_uri: saved.redirect, code_verifier: saved.verifier });
      toast('Spotify connected', 'Open Sounds to see what you’re listening to.');
    } catch (e) {
      console.error('[spotify] token exchange failed', e);
      toast('Spotify connection failed', e.message);
    }
  }

  async function accessToken() {
    const a = auth.get();
    if (!a) throw new Error('not connected');
    if (Date.now() < a.expires_at) return a.access_token;
    try {
      await tokenRequest({ grant_type: 'refresh_token', refresh_token: a.refresh_token });
    } catch (e) {
      if (e.code === 'invalid_grant') { disconnect(true); }
      throw e;
    }
    return auth.get().access_token;
  }

  async function api(path, opts = {}) {
    const doFetch = async () => fetch(API + path, {
      ...opts,
      headers: { Authorization: `Bearer ${await accessToken()}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    let r = await doFetch();
    if (r.status === 401) { const a = auth.get(); if (a) { a.expires_at = 0; auth.set(a); } r = await doFetch(); }
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const err = new Error((data && data.error && data.error.message) || `HTTP ${r.status}`);
      err.status = r.status;
      err.reason = data && data.error && data.error.reason;
      throw err;
    }
    return data;
  }

  // Turn Spotify's error responses into something a person can act on.
  function explain(e) {
    if (e.reason === 'NO_ACTIVE_DEVICE') return 'Nothing is playing on any device. Press “Play here”, or start Spotify on your phone or computer.';
    if (e.reason === 'PREMIUM_REQUIRED') return 'Controlling playback needs Spotify Premium.';
    if (e.status === 403 && /user.*(not|may not).*registered|allowlist|developer/i.test(e.message)) return 'This Spotify account isn’t on the app’s user list. Add it under User Management in the Spotify developer dashboard.';
    if (e.status === 429) return 'Spotify is rate-limiting requests — try again in a minute.';
    return e.message;
  }

  function disconnect(silent) {
    auth.clear();
    if (st.player) { st.player.disconnect(); st.player = null; }
    Object.assign(st, { profile: null, now: null, recent: [], top: [], playlists: [], deviceId: null, playingHere: false, error: '' });
    stopPolling();
    syncAlbum();
    render();
    renderMini();
    if (!silent) toast('Spotify disconnected', 'You can connect again any time.');
  }

  // ── Data ─────────────────────────────────────────────────────────
  async function loadAll() {
    if (!connected()) return;
    try {
      const [profile, recent, top, playlists] = await Promise.all([
        st.profile ? Promise.resolve(st.profile) : api('/me'),
        api('/me/player/recently-played?limit=50'),
        api('/me/top/tracks?time_range=short_term&limit=8'),
        api('/me/playlists?limit=20')
      ]);
      st.profile = profile;
      st.recent = (recent && recent.items) || [];
      st.top = (top && top.items) || [];
      st.playlists = ((playlists && playlists.items) || []).filter(Boolean);
      st.error = '';
    } catch (e) {
      console.error('[spotify] load failed', e);
      st.error = explain(e);
    }
    await refreshNow();
    render();
  }

  async function refreshNow() {
    if (!connected()) return;
    // The local player reports its own state instantly; don't let a slower
    // API poll overwrite it with older data.
    if (Date.now() - st.lastLocalState < 4000) return;
    try {
      const d = await api('/me/player/currently-playing?additional_types=episode');
      st.now = d && d.item ? { item: d.item, playing: d.is_playing, progress: d.progress_ms, at: Date.now() } : null;
    } catch (e) {
      if (e.status === 429) stopPolling();
    }
    syncAlbum();
    renderNow();
    renderMini();
  }

  function startPolling() {
    stopPolling();
    const tick = () => {
      refreshNow();
      st.pollTimer = setTimeout(tick, document.hidden ? 30000 : 6000);
    };
    st.pollTimer = setTimeout(tick, 6000);
  }
  function stopPolling() { clearTimeout(st.pollTimer); st.pollTimer = null; }

  // ── Playback control ─────────────────────────────────────────────
  async function control(action, body) {
    st.error = '';
    try {
      const dev = st.playingHere && st.deviceId ? `?device_id=${st.deviceId}` : '';
      if (action === 'toggle') await api(`/me/player/${st.now && st.now.playing ? 'pause' : 'play'}${dev}`, { method: 'PUT' });
      if (action === 'next') await api(`/me/player/next${dev}`, { method: 'POST' });
      if (action === 'prev') await api(`/me/player/previous${dev}`, { method: 'POST' });
      if (action === 'context') await api(`/me/player/play${dev}`, { method: 'PUT', body: JSON.stringify(body) });
      setTimeout(refreshNow, 350);
    } catch (e) {
      st.error = explain(e);
      // No device anywhere: playing here is the obvious fix, so offer it in place.
      if (e.reason === 'NO_ACTIVE_DEVICE' && action === 'context') { st.pendingContext = body; }
      render();
    }
  }

  // Web Playback SDK — makes this browser a Spotify Connect device called
  // "Pomodoro Focus". Loaded only when the user asks to play here.
  function playHere() {
    if (st.deviceId) { transferHere(true); return; }
    if (st.sdkLoading) return;
    st.sdkLoading = true;
    render();
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'Pomodoro Focus',
        getOAuthToken: cb => accessToken().then(cb).catch(() => {}),
        volume: 0.6
      });
      st.player = player;
      player.addListener('ready', ({ device_id }) => { st.deviceId = device_id; st.sdkLoading = false; transferHere(true); });
      player.addListener('not_ready', () => { st.playingHere = false; render(); });
      player.addListener('account_error', () => { st.sdkLoading = false; st.error = 'Playing in the browser needs Spotify Premium. You can still control Spotify on your phone or computer from here.'; render(); });
      player.addListener('authentication_error', () => { st.sdkLoading = false; st.error = 'Spotify rejected the login for in-browser playback — disconnect and connect again.'; render(); });
      player.addListener('initialization_error', ({ message }) => { st.sdkLoading = false; st.error = `This browser can’t play Spotify here (${message}).`; render(); });
      player.addListener('playback_error', ({ message }) => console.warn('[spotify] playback error', message));
      player.addListener('player_state_changed', s => {
        if (!s) { st.playingHere = false; syncAlbum(); renderNow(); renderMini(); app._renderSoundsIndicator(); return; }
        st.lastLocalState = Date.now();
        st.playingHere = true;
        st.now = { item: s.track_window.current_track, playing: !s.paused, progress: s.position, at: Date.now(), here: true };
        syncAlbum();
        renderNow(); renderMini(); app._renderSoundsIndicator();
      });
      // Browsers only allow audio after a gesture; this click is it.
      if (player.activateElement) player.activateElement();
      player.connect();
    };
    if (!document.querySelector('script[src*="sdk.scdn.co/spotify-player"]')) {
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.onerror = () => { st.sdkLoading = false; st.error = 'Couldn’t load Spotify’s player (blocked by an extension or offline?).'; render(); };
      document.head.appendChild(s);
    }
  }

  async function transferHere(play) {
    try {
      if (st.pendingContext) {
        const body = st.pendingContext; st.pendingContext = null;
        await api(`/me/player/play?device_id=${st.deviceId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [st.deviceId], play }) });
      }
      st.playingHere = true;
      st.error = '';
    } catch (e) {
      st.error = explain(e);
    }
    render();
  }

  function pauseHere() {
    if (st.player && st.playingHere && st.now && st.now.playing) st.player.pause();
  }

  // Album colours follow what's playing; a short pause doesn't flip the app
  // back and forth, so the revert waits a few seconds.
  let albumOff = null;
  function syncAlbum() {
    const n = st.now;
    const imgs = n && n.item && ((n.item.album && n.item.album.images) || n.item.images || (n.item.show && n.item.show.images));
    const url = imgs && imgs.length ? (imgs[1] || imgs[0]).url : null;
    clearTimeout(albumOff);
    if (!hasApp() || !app.setAlbumColors) return;
    const label = n && n.item ? `${n.item.name}${artists(n.item) ? ' — ' + ((n.item.artists || []).map(a => a.name).join(', ')) : ''}` : '';
    if (n && n.playing && url) app.setAlbumColors(url, label);
    else albumOff = setTimeout(() => app.setAlbumColors(null), n ? 8000 : 0);
  }

  // ── Focus soundtrack: songs heard during focus sessions, kept locally ──
  const TRACKS_KEY = 'pomodoro_focus_tracks';
  const entry = (t, at) => t && t.id ? ({
    id: t.id, name: t.name,
    artist: ((t.artists || []).map(a => a.name).join(', ')) || '',
    img: (t.album && t.album.images && (t.album.images[1] || t.album.images[0]) || {}).url || null,
    ms: t.duration_ms || 0, at
  }) : null;

  async function captureFocusSession(startMs, endMs) {
    if (!connected()) return;
    try {
      const d = await api(`/me/player/recently-played?limit=50&after=${Math.floor(startMs)}`);
      const found = ((d && d.items) || [])
        .filter(i => new Date(i.played_at).getTime() <= endMs + 60000)
        .map(i => entry(i.track, i.played_at));
      // The song still playing when the session ends isn't in "recently played" yet.
      if (st.now && st.now.playing && st.now.item && st.now.item.type !== 'episode') found.push(entry(st.now.item, new Date(endMs).toISOString()));
      let all = [];
      try { all = JSON.parse(localStorage.getItem(TRACKS_KEY) || '[]'); } catch (e) {}
      found.filter(Boolean).forEach(t => {
        const at = new Date(t.at).getTime();
        // A song that straddles two sessions shouldn't be counted twice.
        if (!all.some(x => x.id === t.id && Math.abs(new Date(x.at).getTime() - at) < 20 * 60000)) all.push(t);
      });
      localStorage.setItem(TRACKS_KEY, JSON.stringify(all.slice(-1500)));
    } catch (e) { console.warn('[spotify] soundtrack capture failed', e); }
  }

  // ── Rendering ────────────────────────────────────────────────────
  const art = (images, size = 40) => {
    const img = images && images.length ? images[images.length - 1].url : '';
    return img ? `<img class="spa-art" src="${esc(img)}" width="${size}" height="${size}" alt="" loading="lazy">` : `<span class="spa-art spa-art-empty"></span>`;
  };
  const artists = t => esc(((t && t.artists) || []).map(a => a.name).join(', ') || (t && t.show && t.show.name) || '');
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  function todaySummary() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = st.recent.filter(r => new Date(r.played_at) >= start);
    const ms = today.reduce((sum, r) => sum + ((r.track && r.track.duration_ms) || 0), 0);
    const mins = Math.round(ms / 60000);
    const time = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    return today.length ? `${today.length} ${today.length === 1 ? 'song' : 'songs'} · ${time} today` : 'Nothing played yet today';
  }

  function render() {
    const root = $('spa');
    if (!root) return;
    const head = $('spa-status');

    if (!connected()) {
      if (head) head.textContent = '';
      const cid = clientId();
      root.innerHTML = `
        <div class="spa-connect">
          <p class="spa-pitch">Connect your account to see what you’re playing, your recent and top songs, and your playlists — and control Spotify from here.</p>
          <button type="button" class="spa-btn spa-btn-green" data-spa="login">Connect Spotify</button>
        </div>
        ${!cid || st.setupOpen ? `
        <div class="spa-setup" ${st.setupOpen || !cid ? '' : 'hidden'}>
          <p class="spa-setup-title">One-time setup (needs Spotify Premium)</p>
          <ol>
            <li>Open <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">developer.spotify.com/dashboard</a> and log in.</li>
            <li><b>Create app</b>. Any name. Under <b>Redirect URI</b> add exactly:<br><code class="spa-copy" data-spa="copy" title="Click to copy">${esc(redirectUri())}</code></li>
            <li>Tick <b>Web API</b> and <b>Web Playback SDK</b>, save.</li>
            <li>In the app’s <b>User Management</b>, add the email of every Spotify account that will connect (up to 5, including yours).</li>
            <li>Copy the <b>Client ID</b> and paste it here:</li>
          </ol>
          <form class="sp-form" data-spa-form="cid">
            <input class="sp-input" name="cid" placeholder="Client ID" value="${esc(localStorage.getItem(CID_KEY) || '')}" spellcheck="false" autocomplete="off" aria-label="Spotify Client ID">
            <button type="submit" class="sp-load">Save</button>
          </form>
        </div>` : ''}
        ${st.error ? `<p class="sp-error">${esc(st.error)}</p>` : ''}`;
      return;
    }

    if (head) head.innerHTML = st.profile ? `${art(st.profile.images, 20)}<span>${esc(st.profile.display_name || 'Connected')}</span>` : 'Connected';
    const list = st.list;
    const rows = list === 'recent'
      ? st.recent.slice(0, 8).map(r => row(r.track, ago(r.played_at), r.track && r.track.album && r.track.album.images, r.context ? { context_uri: r.context.uri, offset: { uri: r.track.uri } } : { uris: [r.track.uri] }))
      : list === 'top'
        ? st.top.map((t, i) => row(t, `#${i + 1}`, t.album && t.album.images, { uris: [t.uri] }))
        : st.playlists.map(p => `
            <button type="button" class="spa-row" data-spa-play='${esc(JSON.stringify({ context_uri: p.uri }))}'>
              ${art(p.images)}<span class="spa-row-text"><span class="spa-row-title">${esc(p.name)}</span><span class="spa-row-sub">${esc((p.tracks && p.tracks.total) != null ? `${p.tracks.total} songs` : (p.owner && p.owner.display_name) || '')}</span></span>
            </button>`);
    root.innerHTML = `
      <div class="spa-now" id="spa-now"></div>
      ${st.error ? `<p class="sp-error">${esc(st.error)}</p>` : ''}
      <div class="spa-activity">
        <span class="spa-today">${todaySummary()}</span>
        <div class="spa-seg" role="tablist" aria-label="Listening activity">
          ${[['recent', 'Recent'], ['top', 'Top this month'], ['playlists', 'Playlists']].map(([k, l]) =>
            `<button type="button" role="tab" aria-selected="${list === k}" class="spa-seg-btn${list === k ? ' active' : ''}" data-spa-list="${k}">${l}</button>`).join('')}
        </div>
        <div class="spa-list">${rows.length ? rows.join('') : `<p class="spa-empty">${list === 'recent' ? 'No recent plays yet.' : list === 'top' ? 'Spotify needs a bit more listening history for this.' : 'No playlists found.'}</p>`}</div>
      </div>
      <button type="button" class="spa-disconnect" data-spa="logout">Disconnect Spotify</button>`;
    renderNow();
  }

  function row(t, meta, images, playBody) {
    if (!t) return '';
    return `<button type="button" class="spa-row" data-spa-play='${esc(JSON.stringify(playBody))}' title="Play ${esc(t.name)}">
      ${art(images)}<span class="spa-row-text"><span class="spa-row-title">${esc(t.name)}</span><span class="spa-row-sub">${artists(t)}</span></span>
      <span class="spa-row-meta">${esc(meta)}</span>
    </button>`;
  }

  function renderNow() {
    const box = $('spa-now');
    if (!box) return;
    const n = st.now;
    const playHereBtn = st.playingHere ? '' :
      `<button type="button" class="spa-btn" data-spa="here" ${st.sdkLoading ? 'disabled' : ''}>${st.sdkLoading ? 'Connecting…' : 'Play here'}</button>`;
    if (!n) {
      box.innerHTML = `<div class="spa-idle"><span>Nothing playing right now.</span>${playHereBtn}</div>`;
      return;
    }
    const t = n.item;
    const images = (t.album && t.album.images) || t.images || (t.show && t.show.images);
    const dur = t.duration_ms || 0;
    const pos = Math.min(dur, n.progress + (n.playing ? Date.now() - n.at : 0));
    box.innerHTML = `
      <div class="spa-now-main">
        ${art(images, 56)}
        <div class="spa-now-text">
          <span class="spa-now-title">${esc(t.name)}</span>
          <span class="spa-now-artist">${artists(t)}</span>
          <span class="spa-now-where">${st.playingHere ? 'Playing in this browser' : n.playing ? 'Playing on your Spotify' : 'Paused'}</span>
        </div>
        <div class="spa-ctrls">
          <button type="button" class="spa-ctrl" data-spa="prev" aria-label="Previous"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg></button>
          <button type="button" class="spa-ctrl spa-ctrl-main" data-spa="toggle" aria-label="${n.playing ? 'Pause' : 'Play'}">${n.playing
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>'}</button>
          <button type="button" class="spa-ctrl" data-spa="next" aria-label="Next"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z"/></svg></button>
        </div>
      </div>
      <div class="spa-progress"><span style="width:${dur ? (pos / dur * 100).toFixed(1) : 0}%"></span></div>
      <div class="spa-now-foot"><span>${mmss(pos)}</span>${playHereBtn}<span>${mmss(dur)}</span></div>`;
  }

  // Small now-playing line under the timer, so you see the song without opening Sounds.
  // Minimal now-playing widget under the timer: cover, song, artist and
  // previous / play-pause / next. Stays while paused so you can resume.
  const ICON = {
    prev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.2v14H6zM19 5.5v13L9.6 12z"/></svg>',
    next: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.8 5H18v14h-2.2zM5 5.5v13L14.4 12z"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>'
  };
  function renderMini() {
    const el = $('sp-mini');
    if (!el) return;
    const n = st.now;
    if (!connected() || !n || !n.item) { el.hidden = true; if (hasApp() && app._renderLinkWidget) app._renderLinkWidget(); return; }
    el.hidden = false;
    const imgs = (n.item.album && n.item.album.images) || n.item.images || [];
    const cover = imgs.length ? (imgs[1] || imgs[0]).url : '';
    el.innerHTML = `${cover ? `<img class="np-cover" src="${esc(cover)}" width="44" height="44" alt="">` : ''}
      <span class="np-text"><b>${esc(n.item.name)}</b><span>${artists(n.item)}</span></span>
      <span class="np-ctrls">
        <button type="button" class="np-btn" data-spa="prev" aria-label="Previous song">${ICON.prev}</button>
        <button type="button" class="np-btn np-btn-main" data-spa="toggle" aria-label="${n.playing ? 'Pause' : 'Play'}">${n.playing ? ICON.pause : ICON.play}</button>
        <button type="button" class="np-btn" data-spa="next" aria-label="Next song">${ICON.next}</button>
      </span>`;
    if (hasApp() && app._renderLinkWidget) app._renderLinkWidget();
  }

  // ── Wiring ───────────────────────────────────────────────────────
  function onClick(e) {
    const t = e.target;
    const act = t.closest('[data-spa]');
    if (act) {
      const a = act.dataset.spa;
      if (a === 'login') login();
      else if (a === 'logout') disconnect();
      else if (a === 'here') playHere();
      else if (a === 'copy') { navigator.clipboard && navigator.clipboard.writeText(act.textContent.trim()); act.classList.add('copied'); setTimeout(() => act.classList.remove('copied'), 1200); }
      else control(a);
      return;
    }
    const tab = t.closest('[data-spa-list]');
    if (tab) { st.list = tab.dataset.spaList; render(); return; }
    const play = t.closest('[data-spa-play]');
    if (play) { try { control('context', JSON.parse(play.dataset.spaPlay)); } catch (err) {} }
  }

  function onSubmit(e) {
    const form = e.target.closest('[data-spa-form="cid"]');
    if (!form) return;
    e.preventDefault();
    const v = form.cid.value.trim();
    if (!/^[0-9a-f]{32}$/i.test(v)) { st.error = 'A Client ID is 32 letters and numbers — copy it from the app’s Basic Information page.'; render(); return; }
    localStorage.setItem(CID_KEY, v);
    st.error = '';
    login();
  }

  async function init() {
    ['spa', 'sp-mini'].forEach(id => {
      const el = $(id);
      if (el) { el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); }
    });
    await handleRedirect();
    render();
    if (connected()) { await loadAll(); startPolling(); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && connected()) refreshNow(); });
  }

  // Called when the Sounds sheet opens: refresh the lists so they're current.
  function onSheetOpen() { if (connected()) loadAll(); else render(); }

  return {
    init, onSheetOpen, pauseHere, captureFocusSession,
    get connected() { return connected(); },
    get playingHere() { return !!(st.playingHere && st.now && st.now.playing); },
    _state: st, _render: render
  };
})();

window.SpotifyAccount.init();
