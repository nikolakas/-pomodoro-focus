/* ============================================
   STUDY TOGETHER — one friend opens a room, others join and follow the same
   timer live: same focus, same breaks, everyone's sessions count for them.

   No new database rules needed: it rides on each user's public
   leaderboard/{uid} doc (owner writes, any signed-in user reads), in a `live`
   field:
     host:   live = { room: <own uid>, host: true, name, mode, running, endsAt, left, total, updatedAt }
     member: live = { room: <host uid>, host: false, name, updatedAt, ... nulls }
   Members are found with a query on live.room. Everyone heartbeats, so a
   closed laptop drops out of the room on its own after a few minutes.
   ============================================ */
window.StudyRoom = (() => {
  'use strict';

  const KEY = 'pomodoro_room';
  const FRESH_MS = 3 * 60 * 1000;   // older than this = gone
  const BEAT_MS = 45 * 1000;
  const hasApp = () => typeof app !== 'undefined';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const st = {
    user: null, role: null, roomId: null,   // role: 'host' | 'member' | null
    host: null,                             // host's live data (for members)
    members: [],                            // [{uid, name, host}]
    friendsLive: {},                        // uid -> live
    unsubHost: null, unsubMembers: null, unsubFriends: [],
    lastSig: '', lastBeat: 0, applying: false, tick: null
  };

  const fresh = l => l && l.updatedAt && Date.now() - l.updatedAt < FRESH_MS;
  const db = () => window.firebaseDb;
  const ref = uid => window.firestoreDoc(db(), 'leaderboard', uid);
  const myName = () => {
    const u = st.user;
    return (u && u.displayName && u.displayName.split(' ')[0]) || (hasApp() && app.state.username) || (u && u.email && u.email.split('@')[0]) || 'Friend';
  };
  const toast = (t, d) => { if (hasApp()) app.showToast(t, d, '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8M15 14.6c2.6-.3 4.8 1.2 5.4 4"/></svg>'); };
  const save = () => { try { st.role ? localStorage.setItem(KEY, JSON.stringify({ role: st.role, id: st.roomId })) : localStorage.removeItem(KEY); } catch (e) {} };

  // -- What the host broadcasts ------------------------------------------
  function timerLive() {
    const s = app.state;
    const total = s.adjustedTotal || ((s.mode === 'work' ? s.settings.work : s.mode === 'shortBreak' ? s.settings.short : s.settings.long) * 60);
    const endsAt = s.isRunning && s.sessionStartTime ? s.sessionStartTime + s.sessionTotalSeconds * 1000 : null;
    return { mode: s.mode, running: !!s.isRunning, endsAt, left: s.timeLeft, total };
  }
  async function write(live) {
    if (!st.user || !db()) return;
    try {
      await window.firestoreSetDoc(ref(st.user.uid), { live }, { merge: true });
    } catch (e) { console.warn('[room] write failed', e); }
  }
  function publish(force) {
    if (!st.role || !st.user) return;
    const now = Date.now();
    if (st.role === 'host') {
      const t = timerLive();
      const sig = [t.mode, t.running, t.running ? t.endsAt : t.left, t.total].join('|');
      if (!force && sig === st.lastSig && now - st.lastBeat < BEAT_MS) return;
      st.lastSig = sig; st.lastBeat = now;
      write({ room: st.user.uid, host: true, name: myName(), ...t, updatedAt: now });
    } else {
      if (!force && now - st.lastBeat < BEAT_MS) return;
      st.lastBeat = now;
      write({ room: st.roomId, host: false, name: myName(), mode: null, running: false, endsAt: null, left: null, total: null, updatedAt: now });
    }
  }

  // -- Members follow the host's timer -----------------------------------
  function apply(h) {
    const s = app.state;
    st.applying = true;
    try {
      if (s.mode !== h.mode) app.setMode(h.mode);
      const rem = h.running && h.endsAt ? Math.max(0, Math.round((h.endsAt - Date.now()) / 1000)) : (h.left || 0);
      if (h.running) {
        if (!s.isRunning) { s.timeLeft = rem; app.startTimer(true); }
        // Re-anchor like ±5 min does, so no partial session is recorded.
        s.timeLeft = rem; s.sessionStartTime = Date.now(); s.sessionTotalSeconds = rem;
      } else {
        if (s.isRunning) app.stopTimer();
        s.timeLeft = rem;
      }
      if (h.total) s.adjustedTotal = h.total;   // their durations, not yours
      app.updateTimeDisplay(); app.updateRing();
    } finally { st.applying = false; }
  }

  // -- Room lifecycle ------------------------------------------------------
  function listenMembers() {
    if (st.unsubMembers) st.unsubMembers();
    const q = window.firestoreQuery(window.firestoreCollection(db(), 'leaderboard'), window.firestoreWhere('live.room', '==', st.roomId));
    st.unsubMembers = window.firestoreOnSnapshot(q, snap => {
      const before = new Set(st.members.map(m => m.uid));
      const list = [];
      snap.forEach(d => { const l = d.data().live; if (fresh(l)) list.push({ uid: d.id, name: l.name || 'Friend', host: !!l.host, updatedAt: l.updatedAt }); });
      list.sort((a, b) => (b.host - a.host) || a.name.localeCompare(b.name));
      // Say hi when someone new walks in (not on the first load, not yourself).
      if (st.members.length) list.forEach(m => { if (!before.has(m.uid) && m.uid !== st.user.uid) toast(`${m.name} joined`, 'You’re studying together now.'); });
      st.members = list;
      render();
    }, e => console.warn('[room] members', e));
  }

  async function openRoom() {
    if (!st.user) { toast('Sign in first', 'Study rooms use your account so friends can find you.'); return; }
    if (st.role) await leave(true);
    st.role = 'host'; st.roomId = st.user.uid; st.members = [];
    save(); publish(true); listenMembers(); render();
    toast('Room open', 'Friends can join from their Friends tab, or send them the link.');
  }

  async function join(hostUid, quiet) {
    if (!st.user) { toast('Sign in first', 'Sign in, then open the invite link again.'); return; }
    if (hostUid === st.user.uid) { openRoom(); return; }
    if (st.role) await leave(true);
    st.role = 'member'; st.roomId = hostUid; st.host = null; st.members = [];
    save();
    st.unsubHost = window.firestoreOnSnapshot(ref(hostUid), snap => {
      const l = snap.exists() ? snap.data().live : null;
      if (!l || !l.host || l.room !== hostUid || !fresh(l)) {
        if (st.host || !quiet) toast('Room closed', l && l.name ? `${l.name} isn’t studying right now.` : 'That study room isn’t open any more.');
        leave(true);
        return;
      }
      const first = !st.host;
      st.host = l;
      apply(l);
      if (first) toast(`Studying with ${l.name}`, 'Your timer now follows theirs. Leave any time from the Friends tab.');
      render();
    }, () => { toast('Couldn’t join', 'Check your connection and try again.'); leave(true); });
    publish(true); listenMembers(); render();
  }

  async function leave(quiet) {
    const was = st.role;
    if (st.unsubHost) st.unsubHost(); if (st.unsubMembers) st.unsubMembers();
    st.unsubHost = st.unsubMembers = null;
    st.role = st.roomId = st.host = null; st.members = []; st.lastSig = '';
    if (hasApp()) app.state.adjustedTotal = null;
    save(); render();
    if (was) await write(null);
    if (was && !quiet) toast(was === 'host' ? 'Room closed' : 'Left the room', 'Back to your own timer.');
  }

  // -- Friends' live status (Friends tab) -----------------------------------
  function watchFriends(uids) {
    st.unsubFriends.forEach(u => u()); st.unsubFriends = [];
    (uids || []).forEach(uid => {
      st.unsubFriends.push(window.firestoreOnSnapshot(ref(uid), snap => {
        st.friendsLive[uid] = snap.exists() ? snap.data().live : null;
        decorateFriends();
      }, () => {}));
    });
  }
  function liveLine(l) {
    if (!fresh(l)) return null;
    if (!l.host) return { text: 'In a study room', room: l.room };
    const mins = l.running && l.endsAt ? Math.max(0, Math.ceil((l.endsAt - Date.now()) / 60000)) : Math.ceil((l.left || 0) / 60);
    const what = l.mode === 'work' ? 'Focusing' : 'On a break';
    return { text: l.running ? `${what} · ${mins} min left` : 'Room open · paused', room: l.room };
  }
  function decorateFriends() {
    document.querySelectorAll('#friends-list .friend-row').forEach(row => {
      const btn = row.querySelector('[data-uid]');
      if (!btn) return;
      const uid = btn.dataset.uid;
      let slot = row.querySelector('.friend-live');
      if (!slot) { slot = document.createElement('span'); slot.className = 'friend-live'; row.querySelector('.friend-row-name').after(slot); }
      const info = liveLine(st.friendsLive[uid]);
      const inIt = info && st.roomId === info.room;
      slot.innerHTML = info ? `<i class="live-dot"></i>${esc(info.text)}${inIt ? '' : ` <button type="button" class="friend-btn room-join" data-room-join="${esc(info.room)}">Join</button>`}` : '';
    });
  }

  // -- UI ----------------------------------------------------------------
  function chips() {
    return `<span class="room-chips">${st.members.map(m =>
      `<span class="room-chip${m.host ? ' is-host' : ''}" title="${esc(m.name)}${m.host ? ' (host)' : ''}">${esc(m.name.slice(0, 1).toUpperCase())}</span>`).join('')}</span>`;
  }
  function names() {
    const others = st.members.filter(m => !st.user || m.uid !== st.user.uid).map(m => m.name);
    if (!others.length) return st.role === 'host' ? 'Waiting for friends…' : 'Just you';
    return 'With ' + (others.length <= 2 ? others.join(' & ') : `${others.slice(0, 2).join(', ')} +${others.length - 2}`);
  }
  function render() {
    const body = $('room-body');
    if (body) {
      if (!st.user) body.innerHTML = '<p class="friends-hint">Sign in to study with friends.</p>';
      else if (!st.role) body.innerHTML = '<button type="button" class="friend-btn friend-btn-primary" data-room="open">Open a study room</button>';
      else {
        const title = st.role === 'host' ? 'Your room is open' : `Following ${esc(st.host ? st.host.name : '…')}’s timer`;
        body.innerHTML = `<div class="room-state">${chips()}<div class="room-state-text"><b>${title}</b><span>${esc(names())}</span></div></div>
          <div class="room-actions">
            ${st.role === 'host' ? '<button type="button" class="friend-btn" data-room="copy">Copy invite link</button>' : ''}
            <button type="button" class="friend-btn" data-room="leave">${st.role === 'host' ? 'Close room' : 'Leave'}</button>
          </div>`;
      }
    }
    const pill = $('room-pill');
    if (pill) {
      pill.hidden = !st.role;
      if (st.role) pill.innerHTML = `${chips()}<span class="room-pill-text">${esc(names())}</span><button type="button" class="room-pill-x" data-room="leave" aria-label="${st.role === 'host' ? 'Close room' : 'Leave room'}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
    }
    decorateFriends();
  }

  function onClick(e) {
    const j = e.target.closest('[data-room-join]');
    if (j) { join(j.dataset.roomJoin); return; }
    const b = e.target.closest('[data-room]');
    if (!b) return;
    const a = b.dataset.room;
    if (a === 'open') openRoom();
    else if (a === 'leave') leave();
    else if (a === 'copy') {
      const url = `${location.origin}${location.pathname}?room=${st.roomId}`;
      const done = () => { b.textContent = 'Link copied'; setTimeout(() => { b.textContent = 'Copy invite link'; }, 1500); };
      if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ title: 'Study with me', text: 'Join my focus room', url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link', url));
      else prompt('Copy this link', url);
    }
  }

  // Members can't steer the shared timer; say so instead of silently desyncing.
  const locked = () => st.role === 'member' && !st.applying;
  function lockedToast() { toast('Following ' + (st.host ? st.host.name : 'the host'), 'Only the room host controls the timer. Leave the room to use your own.'); }
  function guard() {
    ['toggleTimer', 'resetTimer', 'skipSession', 'adjustTimer'].forEach(fn => {
      const orig = app[fn];
      app[fn] = function (...args) { if (locked()) { lockedToast(); return; } return orig.apply(this, args); };
    });
    document.addEventListener('click', e => {
      if (locked() && e.target.closest('.mode-btn')) { e.stopImmediatePropagation(); e.preventDefault(); lockedToast(); }
    }, true);
  }

  function init() {
    if (!hasApp()) return;
    guard();
    document.addEventListener('click', e => { if (e.target.closest('#room-body, #room-pill, #friends-list')) onClick(e); });
    // An invite link: ?room=<host uid>
    let pending = null;
    try {
      const p = new URLSearchParams(location.search);
      pending = p.get('room');
      if (pending) { p.delete('room'); history.replaceState({}, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash); }
    } catch (e) {}
    if (pending && !/^[A-Za-z0-9]{10,64}$/.test(pending)) pending = null;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}

    const start = () => window.onAuthStateChanged(window.firebaseAuth, user => {
      const prev = st.user;
      st.user = user;
      if (!user) { if (st.role) { st.role = null; leave(true); } watchFriends([]); render(); return; }
      if (prev && prev.uid === user.uid) return;
      if (pending) { const id = pending; pending = null; if (hasApp()) app.switchTab && app.switchTab('timer'); join(id); }
      else if (saved && saved.role === 'host') openRoom();
      else if (saved && saved.role === 'member') join(saved.id, true);
      render();
    });
    if (window.firebaseAuth && window.onAuthStateChanged) start();
    else window.addEventListener('firebase-ready', start, { once: true });
    if (pending) setTimeout(() => { if (!st.user && pending) toast('Sign in to join', 'Your friend invited you to study together. Sign in and you’ll join their room.'); }, 2500);

    st.tick = setInterval(() => {
      if (!st.role) return;
      publish(false);
      if (st.role === 'member' && st.host && !fresh(st.host)) { toast('Room closed', `${st.host.name} went offline.`); leave(true); }
      // Prune members who stopped heartbeating.
      const n = st.members.length;
      st.members = st.members.filter(m => (st.user && m.uid === st.user.uid) || fresh(m));
      if (n !== st.members.length) render();
    }, 1000);
    // Refresh "n min left" in the friends list.
    setInterval(decorateFriends, 30000);
    render();
  }

  return {
    init, openRoom, join, leave, watchFriends,
    get locked() { return locked(); },
    lockedToast,
    get role() { return st.role; },
    _state: st
  };
})();

window.StudyRoom.init();
