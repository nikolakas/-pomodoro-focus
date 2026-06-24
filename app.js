/* ============================================
   POMODORO FOCUS APP LOGIC
   FIXED: duplicate showToast/showSessionRecap removed,
          intention modal btn-start-intention wired,
          visibilitychange uses getActiveSceneKeys(),
          showSessionRecap signature unified
   ============================================ */

const app = {
    state: {
        timer: null,
        mode: 'work',
        timeLeft: 0,
        settings: {
            work: 25, short: 5, long: 15,
            rounds: 4, dailyGoal: 8,
            sound: 'bell', theme: 'normal',
            wallpaper: 'default', accent: 'coral',
            saber: 'blue', swMusic: true, autoStart: false
        },
        currentRound: 1,
        sessionsToday: 0,
        totalSessions: 0,
        xp: 0,
        level: 1,
        isRunning: false,
        ambientVolume: 50,
        saberColors: {
            blue: '#4fc3f7', green: '#66bb6a',
            red: '#ef5350', purple: '#ab47bc', yellow: '#ffca28'
        },
        accents: {
            coral: '#ff6b6b', cyan: '#4ecdc4',
            violet: '#a78bfa', amber: '#fbbf24', sky: '#38bdf8'
        },
		sessionLabels: {
    work:     { name: 'Deep Work',  color: '#a78bfa' },
    study:    { name: 'Study',      color: '#38bdf8' },
    creative: { name: 'Creative',   color: '#fb923c' },
    admin:    { name: 'Admin',      color: '#94a3b8' },
    other:    { name: 'Other',      color: '#4ecdc4' }
},
        history: [],
        breathingState: { active: false, interval: null, phase: 0 },
        hyperspaceActive: false,
        modeTimers: { work: null, shortBreak: null, longBreak: null },
        timeAdjustment: 0,
        adjustedTotal: null,
       sceneVolumes: {},
mixerVolumes: { rain: 0, waves: 0, brown: 0, nature: 0, cafe: 0, library: 0, jazz: 0, bouzoukia: 0 },
      currentIntention: null,
currentSubtasks: [],
        activeNoteFilter: null,
        resetPending: false,
        resetPendingTimer: null
    },

    elements: {},

    // ===================================
    // INITIALIZATION
    // ===================================
    init() {
        this.cacheDOM();
        this.loadSettings();
        this.loadStats();
        this.loadCustomWallpapers();
        this.updateTheme();
        this.bindEvents();
        this.bindSteppers();
		this.initMixer();
        this.renderStats();
        this.renderNotes();
        this.renderHeatmap();
        this.renderInsights();

        this.setMode('work');
        this.updateSessionCounter();
        this.updateLogo();

        setInterval(() => this.rotateQuote(), 60000);
        this.rotateQuote();
        setInterval(() => this.checkBouzoukiaHours(), 300000); // re-check every 5 min
	setTimeout(() => this.initOnboarding(), 800);

this.restoreSessionState();
this._pendingInvite = this._parseInviteParam();
if (window.firebaseAuth) { this.initFirebase(); } else { window.addEventListener('firebase-ready', () => this.initFirebase(), { once: true }); }
    },

    // Read & strip a ?add=<username> invite link so it isn't re-applied on refresh.
    _parseInviteParam() {
        try {
            const params = new URLSearchParams(location.search);
            const add = params.get('add');
            if (!add) return null;
            window.history.replaceState({}, '', location.origin + location.pathname);
            return this.normalizeUsername(add);
        } catch (e) { return null; }
    },

async initFirebase() {
    if (
        !window.firebaseAuth || !window.firebaseDb ||
        !window.firestoreDoc || !window.firestoreOnSnapshot ||
        !window.onAuthStateChanged || !window.signOutFb
    ) return;

    if (this.authStateUnsub) this.authStateUnsub();

    // ── DOM refs ──────────────────────────────────────────────────
    const btnAuth       = document.getElementById('btn-auth');
    const authName      = document.getElementById('auth-name');
    const authAvatar    = document.getElementById('auth-avatar');
    const authBarEl     = document.getElementById('auth-bar');
    const signoutFooter = document.getElementById('btn-signout-footer');
    const modal         = document.getElementById('auth-modal');
    const modalClose    = document.getElementById('auth-modal-close');
    const mainView      = document.getElementById('auth-main-view');
    const resetView     = document.getElementById('auth-reset-view');
    const form          = document.getElementById('auth-form');
    const emailInput    = document.getElementById('auth-input-email');
    const passInput     = document.getElementById('auth-input-password');
    const nameInput     = document.getElementById('auth-input-name');
    const nameRow       = document.getElementById('auth-name-row');
    const errorEl       = document.getElementById('auth-error');
    const submitBtn     = document.getElementById('auth-submit');
    const authTabs      = document.querySelectorAll('.auth-tab');
    const forgotLink    = document.getElementById('auth-forgot-link');
    const googleBtn     = document.getElementById('auth-google-btn');
    const googleError   = document.getElementById('auth-google-error');
    const resetBack     = document.getElementById('auth-reset-back');
    const resetEmailIn  = document.getElementById('auth-reset-email');
    const resetSubmit   = document.getElementById('auth-reset-submit');
    const resetError    = document.getElementById('auth-reset-error');
    const resetSuccess  = document.getElementById('auth-reset-success');

    let authMode = 'signin';

    const AUTH_ERRORS = {
        'auth/email-already-in-use':   'That email is already registered — sign in instead.',
        'auth/invalid-email':           'Please enter a valid email address.',
        'auth/weak-password':           'Password must be at least 6 characters.',
        'auth/user-not-found':          'No account with that email — create one instead.',
        'auth/wrong-password':          'Incorrect password.',
        'auth/invalid-credential':      'Email or password is incorrect.',
        'auth/too-many-requests':       'Too many attempts. Please wait and try again.',
        'auth/popup-closed-by-user':    'Sign-in cancelled.',
        'auth/cancelled-popup-request': 'Sign-in cancelled.',
        'auth/network-request-failed':  'Network error. Check your connection.',
        'auth/unauthorized-domain':     'This domain is not authorised for Google sign-in. Use email/password instead.',
    };

    // ── Modal open/close ──────────────────────────────────────────
    const showMain = () => {
        if (mainView) mainView.style.display = '';
        if (resetView) resetView.style.display = 'none';
        if (resetSuccess) resetSuccess.style.display = 'none';
        if (resetError) resetError.style.display = 'none';
    };
    const openModal = () => {
        if (!modal) return;
        modal.style.display = 'flex';
        showMain();
        emailInput?.focus();
    };
    const closeModal = () => {
        if (!modal) return;
        modal.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (googleError) googleError.style.display = 'none';
        if (form) form.reset();
        showMain();
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    if (btnAuth) btnAuth.addEventListener('click', openModal);

    // ── Tab switching ─────────────────────────────────────────────
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authMode = tab.dataset.authTab;
            authTabs.forEach(t => t.classList.toggle('active', t === tab));
            if (nameRow) nameRow.style.display = authMode === 'signup' ? '' : 'none';
            if (forgotLink) forgotLink.style.display = authMode === 'signup' ? 'none' : '';
            if (submitBtn) submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
            if (passInput) passInput.setAttribute('autocomplete', authMode === 'signup' ? 'new-password' : 'current-password');
            if (errorEl) errorEl.style.display = 'none';
        });
    });

    // ── Email / Password submit ───────────────────────────────────
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const email = emailInput?.value.trim();
            const pass  = passInput?.value;
            const name  = nameInput?.value.trim();
            if (!email || !pass) return;

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }
            if (errorEl) errorEl.style.display = 'none';

            try {
                if (authMode === 'signup') {
                    const cred = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, pass);
                    if (name && window.updateProfile) {
                        await window.updateProfile(cred.user, { displayName: name });
                    }
                } else {
                    await window.signInWithEmailAndPassword(window.firebaseAuth, email, pass);
                }
                closeModal();
            } catch (err) {
                if (errorEl) {
                    errorEl.textContent = AUTH_ERRORS[err.code] || 'Something went wrong. Please try again.';
                    errorEl.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
                }
            }
        });
    }

    // ── Google Sign-In ────────────────────────────────────────────
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            if (!window.GoogleAuthProvider || !window.signInWithPopup) return;
            if (googleError) googleError.style.display = 'none';
            const provider = new window.GoogleAuthProvider();
            googleBtn.disabled = true;
            try {
                await window.signInWithPopup(window.firebaseAuth, provider);
                closeModal();
            } catch (err) {
                if (err.code === 'auth/popup-blocked' && window.signInWithRedirect) {
                    await window.signInWithRedirect(window.firebaseAuth, provider);
                } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                    const msg = AUTH_ERRORS[err.code] || err.message || 'Google sign-in failed.';
                    if (googleError) { googleError.textContent = msg; googleError.style.display = 'block'; }
                    else if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
                }
            } finally {
                googleBtn.disabled = false;
            }
        });
    }

    // Handle redirect result (Google on mobile fallback)
    if (window.getRedirectResult && window.firebaseAuth) {
        window.getRedirectResult(window.firebaseAuth).catch(err => {
            if (err?.code && err.code !== 'auth/no-current-user') {
                this.showToast('Sign-in failed', AUTH_ERRORS[err.code] || err.message, '⚠️');
            }
        });
    }

    // ── Forgot Password ───────────────────────────────────────────
    if (forgotLink) {
        forgotLink.addEventListener('click', () => {
            if (mainView) mainView.style.display = 'none';
            if (resetView) resetView.style.display = '';
            if (resetEmailIn && emailInput?.value) resetEmailIn.value = emailInput.value;
            resetEmailIn?.focus();
        });
    }

    if (resetBack) {
        resetBack.addEventListener('click', () => {
            showMain();
        });
    }

    if (resetSubmit && window.sendPasswordResetEmail) {
        resetSubmit.addEventListener('click', async () => {
            const email = resetEmailIn?.value.trim();
            if (!email) return;
            if (resetError) resetError.style.display = 'none';
            if (resetSuccess) resetSuccess.style.display = 'none';
            resetSubmit.disabled = true;
            resetSubmit.textContent = 'Sending...';
            try {
                await window.sendPasswordResetEmail(window.firebaseAuth, email);
                if (resetSuccess) resetSuccess.style.display = 'block';
                if (resetEmailIn) resetEmailIn.value = '';
            } catch (err) {
                if (resetError) {
                    resetError.textContent = AUTH_ERRORS[err.code] || 'Could not send reset email. Try again.';
                    resetError.style.display = 'block';
                }
            } finally {
                resetSubmit.disabled = false;
                resetSubmit.textContent = 'Send Reset Email';
            }
        });
    }

    // ── Auth state listener ───────────────────────────────────────
    this.authStateUnsub = window.onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
            if (authBarEl) authBarEl.classList.add('signed-in');
            if (signoutFooter) {
                signoutFooter.style.display = 'flex';
                signoutFooter.onclick = () => window.signOutFb(window.firebaseAuth);
            }
            const displayName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || '';
            if (authName) authName.textContent = displayName;
            if (authAvatar) {
                if (user.photoURL) {
                    authAvatar.src = user.photoURL;
                    authAvatar.style.display = 'block';
                } else {
                    authAvatar.style.display = 'none';
                }
            }

            await this.loadFromFirestore(user.uid);

            if (this.userUnsub) this.userUnsub();
            const ref = window.firestoreDoc(window.firebaseDb, 'users', user.uid);
            this.userUnsub = window.firestoreOnSnapshot(ref, (snap) => {
                if (!snap.exists()) return;
                const remote = snap.data();
                this.state.history = remote.history || [];
                this.state.xp = remote.xp || 0;
                this.state.level = remote.level || 1;
                this.state.sessionsToday = remote.sessionsToday || 0;
                this.state.totalSessions = remote.totalSessions || 0;
                this.state.settings = { ...this.state.settings, ...(remote.settings || {}) };
                this.saveStats();
                localStorage.setItem('pomodoro_settings', JSON.stringify(this.state.settings));
                this.updateTheme();
                this.renderStats();
                this.renderNotes();
                this.renderHeatmap();
                this.renderInsights();
            });

            this.initSocial(user);
        } else {
            if (authBarEl) authBarEl.classList.remove('signed-in');
            if (signoutFooter) signoutFooter.style.display = 'none';
            if (authName) authName.textContent = '';
            if (authAvatar) { authAvatar.src = ''; authAvatar.style.display = 'none'; }
            if (this.userUnsub) { this.userUnsub(); this.userUnsub = null; }
            this.state.username = null;
            this.loadSocial();
        }
    });
},
async saveToFirestore(uid) {
    if (!uid) return;
    const ref = window.firestoreDoc(window.firebaseDb, 'users', uid);
    await window.firestoreSetDoc(ref, {
        history: this.state.history || [],
        xp: this.state.xp || 0,
        level: this.state.level || 1,
        sessionsToday: this.state.sessionsToday || 0,
        totalSessions: this.state.totalSessions || 0,
        settings: this.state.settings || {},
        lastSaved: new Date().toISOString()
    });
},

async loadFromFirestore(uid) {
    if (!uid) return;
    const ref = window.firestoreDoc(window.firebaseDb, 'users', uid);
    const snap = await window.firestoreGetDoc(ref);
    const remote = snap.exists() ? snap.data() : {};

    const localHistory = JSON.parse(localStorage.getItem('pomodoro_history') || '[]');
    const localToday = parseInt(localStorage.getItem('pomodoro_today') || '0', 10);
    const localTotal = parseInt(localStorage.getItem('pomodoro_total') || '0', 10);
    const localXp = parseInt(localStorage.getItem('pomodoro_xp') || '0', 10);

    const mergedHistory = [...new Map(
        [...(remote.history || []), ...localHistory].map(s => [s.date, s])
    ).values()].sort((a, b) => new Date(a.date) - new Date(b.date));

    const merged = {
        history: mergedHistory,
        xp: Math.max(remote.xp || 0, localXp),
        level: Math.max(remote.level || 1, this.state.level || 1),
        sessionsToday: Math.max(remote.sessionsToday || 0, localToday),
        totalSessions: Math.max(remote.totalSessions || 0, localTotal),
        settings: { ...this.state.settings, ...(remote.settings || {}) },
        lastSynced: new Date().toISOString()
    };

    await window.firestoreSetDoc(ref, merged);

    this.state.history = merged.history;
    this.state.xp = merged.xp;
    this.state.level = merged.level;
    this.state.sessionsToday = merged.sessionsToday;
    this.state.totalSessions = merged.totalSessions;
    this.state.settings = { ...this.state.settings, ...(merged.settings || {}) };

    this.saveStats();
    this.saveSettings();
    this.renderStats();
    this.renderNotes();
    this.renderHeatmap();
    this.renderInsights();
},

    // ===================================
    // SOCIAL: friends + leaderboards
    // ===================================
    // Data model (Firestore):
    //   social/{uid}          = { username }                  (owner-only; the handle you picked)
    //   usernames/{username}  = { uid }                        (authed-readable lookup; lowercase, unique)
    //   leaderboard/{uid}     = { name, username, totalHours, level, daily:{YYYY-MM-DD:hrs}, updatedAt }
    //   friendships/{pair}    = { users: [uidA, uidB] }         (pair = sorted uids joined by '_')
    // Friendship is MUTUAL: one doc per pair, created by either side, readable by both.
    SOCIAL_HOURS_PER_LEVEL: 5,
    USERNAME_RE: /^[a-z0-9_]{3,20}$/,

    _friendshipId(a, b) {
        return [a, b].sort().join('_');
    },

    escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    localDayKey(d) {
        const dt = (d instanceof Date) ? d : new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    },

    // Map of last 14 local day-keys -> focus hours (from session history)
    computeDailyHoursMap() {
        const map = {};
        const cutoff = Date.now() - 14 * 86400000;
        for (const s of (this.state.history || [])) {
            if (s.type !== 'focus' || !s.date) continue;
            const t = new Date(s.date).getTime();
            if (isNaN(t) || t < cutoff) continue;
            const key = this.localDayKey(s.date);
            map[key] = (map[key] || 0) + (Number(s.duration) || 0) / 60;
        }
        for (const k of Object.keys(map)) map[k] = Math.round(map[k] * 100) / 100;
        return map;
    },

    computeTotalFocusHours() {
        const mins = (this.state.history || [])
            .filter(s => s.type === 'focus')
            .reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
        return Math.round((mins / 60) * 100) / 100;
    },

    levelFromHours(hours) {
        return Math.floor((Number(hours) || 0) / this.SOCIAL_HOURS_PER_LEVEL) + 1;
    },

    normalizeUsername(s) {
        return String(s || '').trim().toLowerCase().replace(/^@+/, '');
    },

    async _getSocialDoc(uid) {
        const ref = window.firestoreDoc(window.firebaseDb, 'social', uid);
        const snap = await window.firestoreGetDoc(ref);
        if (!snap.exists()) {
            await window.firestoreSetDoc(ref, { username: null });
            return { ref, data: { username: null } };
        }
        return { ref, data: snap.data() };
    },

    async loadUsername(uid) {
        const { data } = await this._getSocialDoc(uid);
        this.state.username = data.username || null;
        return this.state.username;
    },

    // Claim or change a username. Returns { ok, error }.
    async setUsername(uid, desired) {
        const name = this.normalizeUsername(desired);
        if (!this.USERNAME_RE.test(name)) {
            return { ok: false, error: '3–20 chars: lowercase letters, numbers or _' };
        }
        const current = this.state.username;
        if (name === current) return { ok: true };
        const newRef = window.firestoreDoc(window.firebaseDb, 'usernames', name);
        const existing = await window.firestoreGetDoc(newRef);
        if (existing.exists()) {
            if (existing.data().uid !== uid) return { ok: false, error: 'That username is taken.' };
            // already ours (state was out of sync) — fall through to record it locally
        } else {
            await window.firestoreSetDoc(newRef, { uid });
        }
        this.state.username = name;
        // Once the handle is claimed, the remaining writes don't depend on each
        // other — run them in parallel instead of three sequential round trips.
        const writes = [
            window.firestoreSetDoc(window.firestoreDoc(window.firebaseDb, 'social', uid), { username: name }),
            this.publishLeaderboard(uid)
        ];
        // Free the previous handle so others can claim it.
        if (current && current !== name) {
            writes.push(window.firestoreDeleteDoc(window.firestoreDoc(window.firebaseDb, 'usernames', current)).catch(() => {}));
        }
        await Promise.all(writes);
        return { ok: true };
    },

    async publishLeaderboard(uid) {
        if (!uid || !window.firebaseDb) return;
        const user = window.firebaseAuth?.currentUser;
        const name = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Anonymous';
        const totalHours = this.computeTotalFocusHours();
        const ref = window.firestoreDoc(window.firebaseDb, 'leaderboard', uid);
        try {
            await window.firestoreSetDoc(ref, {
                name,
                username: this.state.username || null,
                totalHours,
                level: this.levelFromHours(totalHours),
                daily: this.computeDailyHoursMap(),
                updatedAt: new Date().toISOString()
            });
        } catch (e) { /* offline / rules — non-fatal */ }
    },

    async initSocial(user) {
        if (!user) return;
        try {
            await this.loadUsername(user.uid);
            await this.publishLeaderboard(user.uid);
        } catch (e) { /* non-fatal */ }
        this.renderUsername();
        // Consume an invite that arrived via a shared ?add= link.
        if (this._pendingInvite) {
            const handle = this._pendingInvite;
            this._pendingInvite = null;
            this.switchTab('friends');
            await this.addFriendByUsername(handle);
        }
    },

    renderUsername() {
        const el = document.getElementById('my-username');
        if (el) el.textContent = this.state.username ? '@' + this.state.username : 'not set yet';
        const input = document.getElementById('username-input');
        if (input && document.activeElement !== input) input.value = this.state.username || '';
        const linkRow = document.getElementById('invite-link-row');
        if (linkRow) linkRow.style.display = this.state.username ? '' : 'none';
    },

    inviteLink() {
        if (!this.state.username) return '';
        return `${location.origin}${location.pathname}?add=${this.state.username}`;
    },

    _setFriendStatus(id, msg, ok) {
        const status = document.getElementById(id);
        if (status) { status.textContent = msg; status.className = 'friends-status' + (ok ? ' ok' : ' err'); }
    },

    async saveUsername() {
        const user = window.firebaseAuth?.currentUser;
        if (!user) { this._setFriendStatus('username-status', 'Sign in first.', false); return; }
        const input = document.getElementById('username-input');
        const res = await this.setUsername(user.uid, input?.value || '');
        if (res.ok) {
            this._setFriendStatus('username-status', 'Username saved ✓', true);
            this.renderUsername();
        } else {
            this._setFriendStatus('username-status', res.error, false);
        }
    },

    addFriendFromInput() {
        const input = document.getElementById('add-friend-input');
        this.addFriendByUsername(input?.value || '');
    },

    async addFriendByUsername(rawName) {
        const user = window.firebaseAuth?.currentUser;
        if (!user) { this._setFriendStatus('add-friend-status', 'Sign in first.', false); return; }
        const name = this.normalizeUsername(rawName);
        if (!this.USERNAME_RE.test(name)) { this._setFriendStatus('add-friend-status', 'Enter a valid username.', false); return; }
        if (name === this.state.username) { this._setFriendStatus('add-friend-status', "That's your own username.", false); return; }
        try {
            const snap = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, 'usernames', name));
            if (!snap.exists()) { this._setFriendStatus('add-friend-status', `No user @${name} found.`, false); return; }
            const friendUid = snap.data().uid;
            if (friendUid === user.uid) { this._setFriendStatus('add-friend-status', "That's you.", false); return; }
            const pairRef = window.firestoreDoc(window.firebaseDb, 'friendships', this._friendshipId(user.uid, friendUid));
            const existing = await window.firestoreGetDoc(pairRef);
            if (existing.exists()) { this._setFriendStatus('add-friend-status', `Already friends with @${name}.`, true); return; }
            // One shared doc, listing both members → mutual by construction.
            await window.firestoreSetDoc(pairRef, { users: [user.uid, friendUid] });
            const input = document.getElementById('add-friend-input');
            if (input) input.value = '';
            const results = document.getElementById('friend-search-results');
            if (results) results.innerHTML = '';
            this._setFriendStatus('add-friend-status', `Added @${name}! 🎉`, true);
            await this.loadSocial();
        } catch (e) {
            this._setFriendStatus('add-friend-status', 'Could not add friend. Try again.', false);
        }
    },

    async searchUsers(prefixRaw) {
        const results = document.getElementById('friend-search-results');
        if (!results) return;
        const prefix = this.normalizeUsername(prefixRaw);
        if (prefix.length < 2) { results.innerHTML = ''; return; }
        const user = window.firebaseAuth?.currentUser;
        try {
            const snap = await window.firestoreGetDocs(window.firestoreCollection(window.firebaseDb, 'usernames'));
            const matches = [];
            snap.forEach(d => {
                const uid = d.data().uid;
                if (uid === user?.uid) return;
                if (d.id.startsWith(prefix)) matches.push(d.id);
            });
            matches.sort((a, b) => a.localeCompare(b));
            const top = matches.slice(0, 8);
            if (!top.length) { results.innerHTML = '<div class="friend-search-empty">No users found.</div>'; return; }
            results.innerHTML = top.map(u => `
                <button class="friend-search-item" type="button" data-username="${this.escapeHtml(u)}">
                    <span class="fsi-name">@${this.escapeHtml(u)}</span>
                    <span class="fsi-add">+ Add</span>
                </button>`).join('');
            results.querySelectorAll('.friend-search-item').forEach(btn =>
                btn.addEventListener('click', () => this.addFriendByUsername(btn.dataset.username)));
        } catch (e) {
            results.innerHTML = '';
        }
    },

    async removeFriend(friendUid) {
        const user = window.firebaseAuth?.currentUser;
        if (!user || !friendUid) return;
        try {
            await window.firestoreDeleteDoc(
                window.firestoreDoc(window.firebaseDb, 'friendships', this._friendshipId(user.uid, friendUid))
            );
            await this.loadSocial();
        } catch (e) { /* non-fatal */ }
    },

    renderFriendsList(friends) {
        const el = document.getElementById('friends-list');
        if (!el) return;
        if (!friends.length) {
            el.innerHTML = '<div class="friends-list-empty">No friends yet — add someone above.</div>';
            return;
        }
        el.innerHTML = friends.map(f => `
            <div class="friend-row">
                <span class="friend-row-name">${this.escapeHtml(f.name || 'Anonymous')}</span>
                ${f.username ? `<span class="friend-row-handle">@${this.escapeHtml(f.username)}</span>` : ''}
                <button class="friend-remove-btn" type="button" data-uid="${this.escapeHtml(f.uid)}">Remove</button>
            </div>`).join('');
        el.querySelectorAll('.friend-remove-btn').forEach(btn =>
            btn.addEventListener('click', () => this.removeFriend(btn.dataset.uid)));
    },

    async loadSocial() {
        const user = window.firebaseAuth?.currentUser;
        const signedOut = document.getElementById('friends-signedout');
        const content = document.getElementById('friends-content');
        if (!user) {
            if (signedOut) signedOut.style.display = 'block';
            if (content) content.style.display = 'none';
            return;
        }
        if (signedOut) signedOut.style.display = 'none';
        if (content) content.style.display = 'block';

        // Instant paint from last-known cache so the Social tab is never blank
        // while we refresh from Firestore in the background.
        const cached = this._readSocialCache(user.uid);
        if (cached) {
            this.renderFriendsList(cached.friendsList);
            this.renderLeaderboards(cached.entries);
        }

        if (this.state.username == null) await this.loadUsername(user.uid);
        await this.publishLeaderboard(user.uid);
        this.renderUsername();

        // Collect uids: me + friends (from the shared friendships collection)
        let friends = [];
        try {
            const q = window.firestoreQuery(
                window.firestoreCollection(window.firebaseDb, 'friendships'),
                window.firestoreWhere('users', 'array-contains', user.uid)
            );
            const snap = await window.firestoreGetDocs(q);
            snap.forEach(d => {
                const other = (d.data().users || []).find(u => u !== user.uid);
                if (other) friends.push(other);
            });
        } catch (e) { /* ignore */ }

        // Fetch every member's public leaderboard doc in parallel (was a sequential
        // loop — one round trip per friend; now a single batched wait).
        const ids = [user.uid, ...friends];
        const lb = {};
        await Promise.all(ids.map(async uid => {
            try {
                const snap = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, 'leaderboard', uid));
                if (snap.exists()) lb[uid] = snap.data();
            } catch (e) { /* ignore unreadable */ }
        }));

        const entries = ids
            .filter(uid => lb[uid])
            .map(uid => ({ uid, ...lb[uid], isMe: uid === user.uid }));

        // Friends list shows everyone you've added, even if they have no stats yet.
        const friendsList = friends.map(uid => ({
            uid, name: lb[uid]?.name, username: lb[uid]?.username
        }));

        this.renderFriendsList(friendsList);
        this.renderLeaderboards(entries);

        // Persist so the next open paints instantly.
        this._writeSocialCache(user.uid, { friendsList, entries });
    },

    // Per-user cache of the social/leaderboard view for instant paint on reopen.
    // Scoped by uid so a shared device never shows one account's friends to another.
    _socialCacheKey(uid) { return `pomodoro_social_cache_${uid}`; },

    _readSocialCache(uid) {
        try {
            const raw = localStorage.getItem(this._socialCacheKey(uid));
            if (!raw) return null;
            const c = JSON.parse(raw);
            if (!c || !Array.isArray(c.entries) || !Array.isArray(c.friendsList)) return null;
            return c;
        } catch (e) { return null; }
    },

    _writeSocialCache(uid, data) {
        try { localStorage.setItem(this._socialCacheKey(uid), JSON.stringify(data)); } catch (e) {}
    },

    renderLeaderboards(entries) {
        const today = this.localDayKey(new Date());
        const weekKeys = [];
        for (let i = 0; i < 7; i++) weekKeys.push(this.localDayKey(new Date(Date.now() - i * 86400000)));

        const dailyVal = e => (e.daily && e.daily[today]) || 0;
        const weekVal = e => weekKeys.reduce((s, k) => s + ((e.daily && e.daily[k]) || 0), 0);

        const fmt = h => {
            const r = Math.round(h * 10) / 10;
            return r >= 1 ? `${r}h` : `${Math.round(h * 60)}m`;
        };

        const render = (listId, valueFn) => {
            const ol = document.getElementById(listId);
            if (!ol) return;
            const ranked = entries.slice().sort((a, b) => valueFn(b) - valueFn(a));
            if (!ranked.length || ranked.every(e => valueFn(e) <= 0)) {
                ol.innerHTML = '<li class="leaderboard-empty">No focus time logged yet.</li>';
                return;
            }
            const medals = ['🥇', '🥈', '🥉'];
            ol.innerHTML = ranked.map((e, i) => {
                const v = valueFn(e);
                const rank = medals[i] || `${i + 1}`;
                const name = (e.name || 'Anonymous') + (e.isMe ? ' (you)' : '');
                return `<li class="leaderboard-row${e.isMe ? ' is-me' : ''}">
                    <span class="lb-rank">${rank}</span>
                    <span class="lb-name">${this.escapeHtml ? this.escapeHtml(name) : name}</span>
                    <span class="lb-level">Lv ${e.level || 1}</span>
                    <span class="lb-value">${fmt(v)}</span>
                </li>`;
            }).join('');
        };

        render('leaderboard-daily', dailyVal);
        render('leaderboard-weekly', weekVal);
    },

    cacheDOM() {
        this.elements = {
            time: document.getElementById('timer-time'),
            label: document.getElementById('timer-label'),
            progress: document.getElementById('timer-progress'),
            glow: document.getElementById('timer-glow'),
            btnStart: document.getElementById('btn-start'),
            btnSkip: document.getElementById('btn-skip'),
            btnReset: document.getElementById('btn-reset'),
            btnZen: document.getElementById('btn-zen'),
            iconPlay: document.getElementById('icon-play'),
            iconPause: document.getElementById('icon-pause'),
            container: document.getElementById('timer-container'),

            modeBtns: document.querySelectorAll('.mode-btn'),
            tabs: document.querySelectorAll('.tab'),
            panels: document.querySelectorAll('.tab-content'),

            sessionText: document.getElementById('session-text'),
            sessionDots: document.getElementById('session-dots'),

            lvlRank: document.getElementById('level-rank'),
            lvlXp: document.getElementById('level-xp'),
            lvlFill: document.getElementById('level-bar-fill'),

            quoteText: document.getElementById('quote-text'),

            ambientPills: document.querySelectorAll('.mixer-btn'),
ambientVolInput: null,

            colorBtns: document.querySelectorAll('#color-picker .color-btn'),
            saberBtns: document.querySelectorAll('#saber-color-picker .color-btn'),
            themeBtn: document.getElementById('btn-theme-toggle'),
            swSettings: document.getElementById('sw-settings'),
            swMusicInput: document.getElementById('setting-sw-music'),
            bsVolumeInput: document.getElementById('b-sunset-volume'),

            wpBtns: document.querySelectorAll('.wp-thumb[data-wp]'),
            wpUpload: document.getElementById('wallpaper-upload'),
            wpGallery: document.getElementById('wallpaper-gallery'),

            btnPreviewSound: document.getElementById('btn-preview-sound'),
            moodCards: document.querySelectorAll('.mood-card')
        };
    },

bindEvents() {
  // Core Timer Controls
  if (this.elements.btnStart) {
this.elements.btnStart.addEventListener('click', () => this.toggleTimer());
  }

  // Friends / leaderboard
  const saveUsernameBtn = document.getElementById('save-username-btn');
  if (saveUsernameBtn) saveUsernameBtn.addEventListener('click', () => this.saveUsername());
  const usernameInput = document.getElementById('username-input');
  if (usernameInput) usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.saveUsername(); } });

  const copyInviteBtn = document.getElementById('copy-invite-btn');
  if (copyInviteBtn) {
    copyInviteBtn.addEventListener('click', () => {
      const link = this.inviteLink();
      if (!link) return;
      navigator.clipboard?.writeText(link).then(() => {
        copyInviteBtn.textContent = 'Copied!';
        setTimeout(() => { copyInviteBtn.textContent = 'Copy link'; }, 1500);
      }).catch(() => {});
    });
  }

  const addFriendBtn = document.getElementById('add-friend-btn');
  if (addFriendBtn) addFriendBtn.addEventListener('click', () => this.addFriendFromInput());
  const addFriendInput = document.getElementById('add-friend-input');
  if (addFriendInput) {
    addFriendInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.addFriendFromInput(); } });
    let searchT;
    addFriendInput.addEventListener('input', () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => this.searchUsers(addFriendInput.value), 250);
    });
  }

  if (this.elements.btnReset) {
    this.elements.btnReset.addEventListener('click', () => {
      const needsConfirm = this.state.isRunning || this.state.timeLeft < (this.state.settings.work * 60);
      if (needsConfirm && !this.state.resetPending) {
        this.state.resetPending = true;
        this.elements.btnReset.classList.add('btn-pending');
        this.elements.btnReset.title = 'Tap again to reset';
        this.state.resetPendingTimer = setTimeout(() => {
          this.state.resetPending = false;
          this.elements.btnReset.classList.remove('btn-pending');
          this.elements.btnReset.title = 'Reset';
        }, 2500);
        return;
      }
      clearTimeout(this.state.resetPendingTimer);
      this.state.resetPending = false;
      this.elements.btnReset.classList.remove('btn-pending');
      this.elements.btnReset.title = 'Reset';
      this.resetTimer();
    });
  }

  if (this.elements.btnSkip) {
this.elements.btnSkip.addEventListener('click', () => this.skipSession());
  }

  const btnResetApp = document.getElementById('btn-reset-app');
  if (btnResetApp) {
    let resetAppPending = false;
    let resetAppTimer = null;
    btnResetApp.addEventListener('click', () => {
      if (!resetAppPending) {
        resetAppPending = true;
        btnResetApp.classList.add('btn-pending');
        btnResetApp.title = 'Tap again to confirm — this cannot be undone';
        resetAppTimer = setTimeout(() => {
          resetAppPending = false;
          btnResetApp.classList.remove('btn-pending');
          btnResetApp.title = 'Reset all app data';
        }, 2500);
        return;
      }
      clearTimeout(resetAppTimer);
      localStorage.clear();
      location.reload();
    });
  }

  const btnMinus5 = document.getElementById('btn-minus5');
  const btnPlus5 = document.getElementById('btn-plus5');
  if (btnMinus5) btnMinus5.addEventListener('click', () => this.adjustTimer(-300));
  if (btnPlus5) btnPlus5.addEventListener('click', () => this.adjustTimer(300));

  if (this.elements.btnZen) {
    this.elements.btnZen.addEventListener('click', () => {
      document.body.classList.toggle('zen-mode');
    });
  }


  // Mode Switching — save current mode's remaining time before switching
  this.elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      const newMode = e.target.dataset.mode;
      const prevMode = this.state.mode;
      // Save remaining time for the mode we're leaving
      if (newMode !== prevMode && this.state.timeLeft > 0) {
        this.state.modeTimers[prevMode] = this.state.timeLeft;
      }
      const savedTime = this.state.modeTimers[newMode];
      this.setMode(newMode);
      // Restore saved time for the mode we're switching to
      if (savedTime) {
        this.state.timeLeft = savedTime;
        this.updateTimeDisplay();
        this.updateRing();
      }
    });
  });

  // Tabs
  this.elements.tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      const target = e.target.closest('.tab')?.dataset.tab;
      if (target) this.switchTab(target);
    });
  });

  // Focus Moods
  this.elements.moodCards.forEach(card => {
    card.addEventListener('click', e => this.activateMood(e.currentTarget.dataset.mood));
  });


  // Theme cards (4 direct selectors)
  document.querySelectorAll('.theme-card').forEach(btn => {
    btn.addEventListener('click', e => {
      this.state.settings.theme = e.currentTarget.dataset.theme;
      this.saveSettings();
      this.updateTheme();
    });
  });

  // Ember glow dot — toggle focus intensity
  const emberEl = document.getElementById('ember-glow');
  if (emberEl) {
    emberEl.addEventListener('click', () => {
      this.state.settings.focusIntensity = !this.state.settings.focusIntensity;
      document.body.classList.toggle('focus-intense', !!this.state.settings.focusIntensity);
      this.showToast(
        this.state.settings.focusIntensity ? 'High Intensity 🔥' : 'Normal Mode',
        this.state.settings.focusIntensity ? 'Stronger effects. Queen mode engaged.' : 'Effects toned down.',
        this.state.settings.focusIntensity ? '💪' : '🌙'
      );
    });
    emberEl.style.cursor = 'pointer';
  }

  this.elements.colorBtns.forEach(btn => {
    btn.addEventListener('click', e => this.setAccent(e.target.dataset.color));
  });

  this.elements.saberBtns.forEach(btn => {
    btn.addEventListener('click', e => this.setSaber(e.target.dataset.color));
  });

 this.elements.wpBtns.forEach(btn => btn.addEventListener('click', () => this.setWallpaper(btn.dataset.wp)));


  if (this.elements.wpUpload) {
    this.elements.wpUpload.addEventListener('change', e => this.handleImageUpload(e));
  }

  // Sound Preview
  if (this.elements.btnPreviewSound) {
    this.elements.btnPreviewSound.addEventListener('click', () => {
      const sel = document.getElementById('setting-sound');
      if (sel) this.playAudio(sel.value);
    });
  }

  // General Settings Inputs
const inputs = document.querySelectorAll('.settings-page input:not([type="file"]), .settings-page select, #panel-settings input:not([type="file"]), #panel-settings select');
inputs.forEach(input => input.addEventListener('change', () => this.saveSettings()));

  // Notes
  const btnAddNote = document.getElementById('btn-add-note');
  if (btnAddNote) {
    btnAddNote.addEventListener('click', () => this.addNote());
  }

  const noteInput = document.getElementById('note-input');
  if (noteInput) {
    noteInput.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') this.addNote();
    });
  }

  const noteSearch = document.getElementById('note-search');
  if (noteSearch) noteSearch.addEventListener('input', () => this.renderNotes());

  // Chart Range Buttons
  document.querySelectorAll('.chart-range').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.chart-range').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      this.renderCharts();
    });
  });

  // BS Volume
  if (this.elements.bsVolumeInput) {
    this.elements.bsVolumeInput.addEventListener('input', e => {
      if (window.AmbienceModule && window.AmbienceModule.setBsVolume) {
        window.AmbienceModule.setBsVolume(e.target.value / 100);
      }
    });
  }

  // Binary Sunset Toggle
  const btnBs = document.getElementById('btn-binary-sunset-toggle');
  if (btnBs) {
    btnBs.addEventListener('click', () => {
      if (!window.AmbienceModule) return;

      const isPlaying = window.AmbienceModule.isActive('binary_sunset');

      if (isPlaying) {
        window.AmbienceModule.stop('binary_sunset');
        btnBs.textContent = '▶ Play Binary Sunset';
      } else {
        window.AmbienceModule.play('binary_sunset');
        btnBs.textContent = '■ Stop Binary Sunset';
      }
    });
  }

  // Ambient auto-pause on tab hide
  document.addEventListener('visibilitychange', () => {
    if (!window.AmbienceModule) return;

    if (document.hidden) {
      this.ambientWasPlaying = window.AmbienceModule.getActiveSceneKeys();
      window.AmbienceModule.stopAll();
    } else if (this.ambientWasPlaying && this.ambientWasPlaying.length > 0) {
      this.ambientWasPlaying.forEach(k => window.AmbienceModule.play(k));
    }
  });

  // Intention Modal
  const btnSkipIntention = document.getElementById('btn-skip-intention');
  if (btnSkipIntention) {
    btnSkipIntention.addEventListener('click', () => {
      const modal = document.getElementById('intention-modal');
      const input = document.getElementById('intention-input');
      if (modal) modal.style.display = 'none';
      if (input) input.value = '';
      document.querySelectorAll('.subtask-input').forEach(i => i.value = '');
      this.state.currentSubtasks = [];
      this.startTimer();
    });
  }

  const btnStartIntention = document.getElementById('btn-start-intention');
  if (btnStartIntention) {
    document.querySelectorAll('.label-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.label-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sessionLabel = btn.dataset.label || 'work';
      });
    });

    btnStartIntention.addEventListener('click', () => {
      const inp = document.getElementById('intention-input');
      if (inp && inp.value.trim()) {
        this.state.currentIntention = inp.value.trim();
        if (/maria/i.test(this.state.currentIntention)) {
          this.showToast('Η βασίλισσα μπήκε. 👑💨', 'Locked and loaded.', '💨');
        }
      }

      this.state.currentSubtasks = [];
      document.querySelectorAll('.subtask-input').forEach(input => {
        if (input.value.trim()) {
          this.state.currentSubtasks.push({
            text: input.value.trim(),
            done: false
          });
        }
      });

      const modal = document.getElementById('intention-modal');
      if (modal) modal.style.display = 'none';
      this.startTimer();
    });
  }

  // Tomato 🍅 icon — 3x click easter egg (Terea only)
  let _logoClicks = 0, _logoTimer = null;
  const logoIconEl = document.getElementById('logo-icon');
  if (logoIconEl) {
    logoIconEl.addEventListener('click', () => {
      if (this.state.settings.theme !== 'terea') return;
      _logoClicks++;
      clearTimeout(_logoTimer);
      _logoTimer = setTimeout(() => { _logoClicks = 0; }, 700);
      if (_logoClicks >= 3) {
        _logoClicks = 0;
        this.playAudio('bouzoukia_riff');
        const gColors = ['#ffd700','#ffec6e','#ffffff','#00d4c8','#ffd700'];
        for (let i = 0; i < 35; i++) {
          const p = document.createElement('div');
          p.className = 'confetti-particle';
          p.style.background = gColors[Math.floor(Math.random() * gColors.length)];
          const cx = (Math.random() - 0.5) * 500, cy = (Math.random() - 0.5) * 500 - 120;
          p.style.setProperty('--cx', `${cx}px`); p.style.setProperty('--cy', `${cy}px`);
          this.elements.container.appendChild(p);
          setTimeout(() => p.remove(), 1200);
        }
        this.showToast('Opa! 🎶', 'Bouzoukia για όλους. 💨', '🪗');
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key === '?') {
      const mod = document.getElementById('shortcut-modal');
      if (mod) mod.style.display = mod.style.display === 'flex' ? 'none' : 'flex';
    }

    if (e.key === 'Escape') {
      const mod = document.getElementById('shortcut-modal');
      if (mod) mod.style.display = 'none';

      const intMod = document.getElementById('intention-modal');
      if (intMod) intMod.style.display = 'none';
    }

    if (e.code === 'Space') {
      e.preventDefault();
      this.toggleTimer();
    }

    if (e.code === 'KeyI') {
      const mod = document.getElementById('intention-modal');
      if (mod) {
        mod.style.display = mod.style.display === 'flex' ? 'none' : 'flex';
        if (mod.style.display === 'flex') {
          setTimeout(() => document.getElementById('intention-input')?.focus(), 50);
        }
      }
    }

    if (e.code === 'KeyZ') {
      document.body.classList.toggle('zen-mode');
    }

    if (e.code === 'KeyN') {
      this.skipSession();
    }

  });

  const btnEod = document.getElementById('btn-eod-close');
  if (btnEod) {
    btnEod.addEventListener('click', () => {
      const modal = document.getElementById('eod-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  // Atmosphere overlay
  const btnSounds = document.getElementById('btn-sounds');
  const atmosphereOverlay = document.getElementById('atmosphere-overlay');
  const btnCloseAtmosphere = document.getElementById('btn-close-atmosphere');
  if (btnSounds && atmosphereOverlay) {
    btnSounds.addEventListener('click', () => {
      atmosphereOverlay.style.display = 'flex';
      this._updateSoundsActiveIndicator();
      this.renderSavedMixes();
    });
  }
  if (btnCloseAtmosphere && atmosphereOverlay) {
    btnCloseAtmosphere.addEventListener('click', () => {
      atmosphereOverlay.style.display = 'none';
    });
    atmosphereOverlay.addEventListener('click', e => {
      if (e.target === atmosphereOverlay) atmosphereOverlay.style.display = 'none';
    });
  }

  // Mood cards in atmosphere overlay (atm-preset-btn)
  document.querySelectorAll('.atm-preset-btn').forEach(card => {
    card.addEventListener('click', e => this.activateMood(e.currentTarget.dataset.mood));
  });
},


    _updateSoundsActiveIndicator() {
        const btn = document.getElementById('btn-sounds');
        if (!btn) return;
        const anyActive = Object.entries(this.state.mixerVolumes).some(([k, v]) => !k.startsWith('_prev_') && typeof v === 'number' && v > 0);
        btn.classList.toggle('sounds-active', anyActive);
    },

    bindSteppers() {
        document.querySelectorAll('.stepper-btn').forEach(btn => {
            let interval;
            const updateVal = () => {
                const targetId = btn.dataset.target;
                const step = parseInt(btn.dataset.step);
                const input = document.getElementById(targetId);
                let val = parseInt(input.value) + step;
                if (val >= parseInt(input.min) && val <= parseInt(input.max)) {
                    input.value = val;
                    this.saveSettings();
                    if (!this.state.isRunning && (
                        (targetId === 'setting-work' && this.state.mode === 'work') ||
                        (targetId === 'setting-short' && this.state.mode === 'shortBreak') ||
                        (targetId === 'setting-long' && this.state.mode === 'longBreak')
                    )) {
                        this.setMode(this.state.mode);
                    }
                }
            };
            btn.addEventListener('mousedown', () => { updateVal(); interval = setInterval(updateVal, 150); });
            btn.addEventListener('mouseup', () => clearInterval(interval));
            btn.addEventListener('mouseleave', () => clearInterval(interval));
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); updateVal(); interval = setInterval(updateVal, 150); }, { passive: false });
            btn.addEventListener('touchend', () => clearInterval(interval));
        });
    },
initMixer() {
    // Load saved volumes
    const saved = localStorage.getItem('pomodoro_mixer');
    if (saved) this.state.mixerVolumes = { ...this.state.mixerVolumes, ...JSON.parse(saved) };

    document.querySelectorAll('.mixer-slider').forEach(slider => {
        const scene = slider.dataset.scene;
        const vol = this.state.mixerVolumes[scene] || 0;
        slider.value = vol;

        // Restore UI state only — don't call play() on load (AudioContext needs user gesture)
        const channel = slider.closest('.mixer-channel');
        if (channel) {
            channel.querySelector('.mixer-vol').textContent = `${vol}%`;
            if (vol > 0) channel.classList.add('active');
        }

        slider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value);
            this.state.mixerVolumes[scene] = v;
            channel.querySelector('.mixer-vol').textContent = `${v}%`;

            if (v > 0) {
                if (!window.AmbienceModule.isActive(scene)) {
                    window.AmbienceModule.play(scene);
                }
                window.AmbienceModule.setSceneVolume(scene, v / 100);
                channel.classList.add('active');
            } else {
                window.AmbienceModule.stop(scene);
                channel.classList.remove('active');
            }

            localStorage.setItem('pomodoro_mixer', JSON.stringify(this.state.mixerVolumes));
            this._updateSoundsActiveIndicator();
        });
    });

    // Mixer icon click — toggle on/off at 70% or mute
    document.querySelectorAll('.mixer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const scene = btn.dataset.scene;
            const slider = document.querySelector(`.mixer-slider[data-scene="${scene}"]`);
            const channel = btn.closest('.mixer-channel');
            const currentVol = parseInt(slider.value);

            if (currentVol > 0) {
                // Mute — remember last volume
                this.state.mixerVolumes[`_prev_${scene}`] = currentVol;
                slider.value = 0;
                this.state.mixerVolumes[scene] = 0;
                channel.querySelector('.mixer-vol').textContent = '0%';
                window.AmbienceModule.stop(scene);
                channel.classList.remove('active');
            } else {
                // Unmute — restore or default to 70
                const prev = this.state.mixerVolumes[`_prev_${scene}`] || 70;
                slider.value = prev;
                this.state.mixerVolumes[scene] = prev;
                channel.querySelector('.mixer-vol').textContent = `${prev}%`;
                window.AmbienceModule.play(scene);
                window.AmbienceModule.setSceneVolume(scene, prev / 100);
                channel.classList.add('active');
            }
            localStorage.setItem('pomodoro_mixer', JSON.stringify(this.state.mixerVolumes));
            this._updateSoundsActiveIndicator();
        });
    });

    // Stop all button
    const stopAll = document.getElementById('btn-stop-all-ambient');
    if (stopAll) {
        stopAll.addEventListener('click', () => {
            document.querySelectorAll('.mixer-slider').forEach(s => {
                s.value = 0;
                const ch = s.closest('.mixer-channel');
                if (ch) {
                    ch.querySelector('.mixer-vol').textContent = '0%';
                    ch.classList.remove('active');
                }
                this.state.mixerVolumes[s.dataset.scene] = 0;
            });
            window.AmbienceModule.stopAll();
            localStorage.setItem('pomodoro_mixer', JSON.stringify(this.state.mixerVolumes));
            this._updateSoundsActiveIndicator();
        });
    }

    // Greek laïká — verified YouTube IDs from official channels
    this._initYTChannel('bouzoukia', [
        // Antonis Remos
        'jdeNvxLA8EQ', // Τα Σάββατα
        'gd0Nua0I43s', // Borei na vgo
        'sTyGh6edBRQ', // Χίλια Σπίρτα
        'MFLZSkfA7hU', // To Kerma
        // Nikos Oikonomopoulos
        'KYaT3q0jfaM', // Για Παράδειγμα
        'ycWOTNuYuxg', // Πρώτη Θέση
        '-EzSpGMvVg4', // Κουράστηκα Να Σ'Αγαπώ
        'q9CE6Z5fLTs', // Πάλι Γύρισα
        // Nikos Makropoulos
        'niUGXJR2Fp4', // De Les Kouventa (live w/ Karras)
        // User's picks + laïká mix
        '4oSIfj_nY6E',
        'tEGc0KVOerk',
        'AW3qdGNqags',
        'yuo_HFRjuA4', // Greek Laika broken hearts mix
    ], 'Sabanis.mp3');

    // Jazz — lofi/study YouTube channels
    this._initYTChannel('jazz', [
        'HuFYqnbVbzY', // jazz lofi radio 🎷 beats to chill/study to
        'CBSlu_VMS9U', // jazz lofi mix [3 hours]
        'CfPxlb8-ZQ0', // Work & Study Lofi Jazz
        'bz5q5gl2uZA', // Lofi Jazz Study Music
        'qzyl0f3mRG0', // Jazz Beats lofi jazz jazzhop
        '-R0UYHS8A_A', // Afternoon Jazz
        'BGo4QajF1-k', // Best JazzHop Vibes 2024
    ], null);

    // Cafe — coffee shop ambience YouTube
    this._initYTChannel('cafe', [
        'h-PfBxoMq_4', // 4K Cozy Coffee Shop Piano Jazz
        'YACyyY64X-E', // Cozy Coffee Shop Ambience smooth jazz
        'gaGrHUekGrc', // Coffee Shop Sounds for Study
        'BywDOO99Ia0', // Coffee Shop Music relax jazz
        'vHcj3REfLc0', // 4K Cozy Coffee Shop
        'X5cG44D_6-o', // Autumn Coffee Shop Ambience jazz
        's_m1QKaQXVc', // STUDY WITH ME CAFE pomodoro
    ], null);
},
switchTab(target) {
    this.elements.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    this.elements.panels.forEach(p => p.classList.toggle('active', p.id === `panel-${target}`));
    document.body.classList.toggle('hide-logo', target !== 'timer');
    if (target === 'stats') {
        this.renderStats();
        this.renderHeatmap();
        this.renderInsights();
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, 0)));
    }
    if (target === 'notes') {
        this.initNotebook();
    }
    if (target === 'medical' && window.MedicalModule) {
        window.MedicalModule.init();
    }
    if (target === 'friends') {
        this.loadSocial();
    }
},

    // ===================================
    // TIMER LOGIC
    // ===================================
setMode(mode, preserveTime = false) {
    const wasRunning = this.state.isRunning;
    if (this.state.isRunning) this.stopTimer();
    this.state.mode = mode;
    this.state.timeAdjustment = 0;
    this.state.adjustedTotal = null;
    this.elements.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    const m = mode === 'work' ? this.state.settings.work :
              mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long;

    if (!preserveTime || this.state.timeLeft <= 0) {
        this.state.timeLeft = m * 60;
    }

    this.updateTimeDisplay();
    this.updateRing();

    let label = 'Focus Time';
    if (mode === 'shortBreak') label = 'Short Break';
    else if (mode === 'longBreak') label = 'Long Break';
    this.elements.label.textContent = label;

    if (wasRunning) {
        const modeLabel = label;
        this.elements.label.textContent = '⏸ Timer paused';
        setTimeout(() => {
            if (this.elements.label.textContent === '⏸ Timer paused') {
                this.elements.label.textContent = modeLabel;
            }
        }, 1500);
    }

    const isTerea = this.state.settings.theme === 'terea';

    // Terea long break: shift ring to hot pink accent
    if (isTerea) {
        if (mode === 'longBreak') {
            document.body.style.setProperty('--accent', '#ff6eb4');
            document.body.style.setProperty('--accent-glow', 'rgba(255,110,180,0.45)');
        } else {
            document.body.style.setProperty('--accent', '#00d4c8');
            document.body.style.setProperty('--accent-glow', 'rgba(0,212,200,0.35)');
        }
    }

    if (mode === 'work') {
        // nothing extra
    } else if (isTerea) {
        // Terea: stretch prompt instead of breathing guide
        this.showTereaStretchPrompt(mode);
    }
},

showTereaStretchPrompt(mode) {
    const prompts = mode === 'longBreak' ? [
        'Stretch those quads 👑',
        'Hip flexors — hold 30s each side 💪',
        'Roll out those shoulders 🔥',
        'Full body stretch. You earned it. 💨'
    ] : [
        'Neck rolls. Left, right. 30 seconds. 💨',
        'Stand up, shake it out. Quick. 💪',
        'Glute squeeze, 10 reps. Right now. 🔥',
        'Deep breath. In... and out. ✨'
    ];
    const msg = prompts[Math.floor(Math.random() * prompts.length)];
    this.showToast(msg, mode === 'longBreak' ? 'Bouzoukia after this. 🎶' : 'Back in a minute.', '🧘‍♀️');
},

toggleTimer() {
    if (this.state.isRunning) {
        this.stopTimer();
        return;
    }

    if (this.state.mode === 'work' && !this.state.currentIntention && document.getElementById('intention-modal')) {
        const mod = document.getElementById('intention-modal');
        if (mod) {
            mod.style.display = 'flex';
            const inp = document.getElementById('intention-input');
            if (inp) inp.focus();
            return;
        }
    }

    this.startTimer();
},

    startTimer() {
    if (this.state.timeLeft <= 0) {
        this.setMode(this.state.mode || 'work');
    }

    this._stopKiamos();

    // Request notification permission and resume any pending ambient sounds on first start
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    this.resumeAmbience();

    this.state.isRunning = true;

    const reminder = document.getElementById('intention-reminder');
    if (reminder) {
        if (this.state.currentIntention) {
            reminder.textContent = `🎯 ${this.state.currentIntention}`;
            reminder.style.display = 'block';
        } else {
            reminder.style.display = 'none';
        }
    }

    this.renderSubtaskTracker();
    this.elements.container.classList.add('running');
    document.body.classList.add('timer-running');
    // Terea startup cascade animation
    if (this.state.settings.theme === 'terea') {
        const tereaEl = document.getElementById('terea-lights');
        if (tereaEl) {
            tereaEl.classList.add('starting');
            setTimeout(() => tereaEl.classList.remove('starting'), 1500);
        }
    }
		    this.showMotivationPop();
    if (this.elements.iconPlay) this.elements.iconPlay.style.display = 'none'; this.elements.btnStart.classList.add('running');
    if (this.elements.iconPause) this.elements.iconPause.style.display = 'block';

    const intMod = document.getElementById('intention-modal');
    if (intMod) intMod.style.display = 'none';

    this.saveSessionState();

        this.state.sessionStartTime = Date.now();
		clearInterval(this.state.timer);
		this.state.timer = setInterval(() => {
        this.state.timeLeft--;
        this.saveSessionState();

        this.updateTimeDisplay();
        this.updateRing();

        if (this.state.timeLeft <= 0) {
            this.onTimerComplete();
        }
    }, 1000);
},

    stopTimer() {
        if (this.state.isRunning && this.state.mode === 'work' && this.state.sessionStartTime && this.state.timeLeft > 0) {
			      const elapsedSeconds = Math.floor((Date.now() - this.state.sessionStartTime) / 1000);
			      if (elapsedSeconds >= 30) {
					          const elapsedMinutes = Math.round(elapsedSeconds / 60);
					          this.recordSession(elapsedMinutes, 'focus');
					          const xpEarned = Math.max(1, Math.floor((elapsedMinutes / this.state.settings.work) * 15));
					          this.addXp(xpEarned);
					        }
			      this.state.sessionStartTime = null;
			    }
		this.state.isRunning = false;
    clearInterval(this.state.timer);
    this.saveSessionState();
    this.elements.container.classList.remove('running');
    document.body.classList.remove('timer-running');
    if (this.elements.iconPlay) this.elements.iconPlay.style.display = 'block';
    this.elements.btnStart.classList.remove('running');
    if (this.elements.iconPause) this.elements.iconPause.style.display = 'none';
    const reminder = document.getElementById('intention-reminder');
    if (reminder) reminder.style.display = 'none';
},

    resetTimer() {
        this.state.modeTimers[this.state.mode] = null;
        this.stopTimer();
        this.setMode(this.state.mode);
    },

    skipSession() {
        const totalSecs = this.state.adjustedTotal || (this.state.settings.work * 60);
        this.state.elapsedFocusMinutes = Math.max(0, Math.round((totalSecs - this.state.timeLeft) / 60));
		this.state.timeLeft = 0;
		        this.stopTimer();
        this.onTimerComplete();
    },

    adjustTimer(deltaSecs) {
        if (!this.state.isRunning) {
            this.showToast('Timer not running', 'Start the timer first, then use ±5 min.', '⏱');
            return;
        }
        const newTime = this.state.timeLeft + deltaSecs;
        if (newTime < 10) return;

        if (!this.state.adjustedTotal) {
            this.state.adjustedTotal = (this.state.mode === 'work' ? this.state.settings.work :
                this.state.mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long) * 60;
        }

        this.state.timeLeft = newTime;
        this.state.adjustedTotal += deltaSecs;
        this.state.timeAdjustment = (this.state.timeAdjustment || 0) + deltaSecs;

        this.updateTimeDisplay();
        this.updateRing();
        this.saveSessionState();

        const mins = Math.abs(deltaSecs / 60);
        const label = deltaSecs > 0 ? `+${mins} min added` : `−${mins} min removed`;
        this.showToast(label, 'Counted in your study time.', deltaSecs > 0 ? '⏩' : '⏪');
    },

    onTimerComplete() {
        this.stopTimer();
        localStorage.removeItem('pomodoro_session');
        this.playAudio(this.state.settings.sound);

        if (this.state.mode === 'work') {
            this.state.sessionsToday++;
            this.state.totalSessions++;
            if (this.state.settings.theme === 'terea') {
                this.state.tereaSessionsStreak = (this.state.tereaSessionsStreak || 0) + 1;
            } else {
                this.state.tereaSessionsStreak = 0;
            }
            this.updateRepCounter();
            this.addXp(15);
            this.saveStats();
	            const user = window.firebaseAuth?.currentUser; if (user) { this.saveToFirestore(user.uid); this.publishLeaderboard(user.uid); }
            const completedIntention = this.state.currentIntention;
            const effectiveMinutes = this.state.elapsedFocusMinutes != null
                ? this.state.elapsedFocusMinutes
                : Math.round((this.state.adjustedTotal || (this.state.settings.work * 60)) / 60);
            this.recordSession(effectiveMinutes, 'focus');

			        this.state.elapsedFocusMinutes = null;
            this.elements.container.classList.add('celebrating');
            this.elements.container.classList.add('timer-pulse');
            setTimeout(() => {
                this.elements.container.classList.remove('celebrating');
                this.elements.container.classList.remove('timer-pulse');
            }, 2000);
            this.createConfetti();
            if (this.state.settings.theme === 'terea') {
                const tereaToasts = [
                    ['25 λεπτά καθαρά. Τέρεα τώρα.', 'Η βασίλισσα τελείωσε.'],
                    ['Bouzoukia δεν χάνονται. Sessions μαζί.', 'Τελείωσες. 💨'],
                    ['Σήκω, τράβα, βγες έξω.', 'Queen mode locked in 👑']
                ];
                const [title, desc] = tereaToasts[Math.floor(Math.random() * tereaToasts.length)];
                this.showToast(title, desc, '💨');
                if (!this.state.settings.tereaLite) {
                    this.createSmokeParticles();
                    this.flashTereaComplete();
                }
                this.playAudio('smoke_break');
                setTimeout(() => this._playKiamos(), 800);

                const tereaLights = document.getElementById('terea-lights');
                if (tereaLights) {
                    tereaLights.classList.add('queen-locked');
                    setTimeout(() => tereaLights.classList.remove('queen-locked'), 5000);
                }
            }
// Auto-open journal with session prompt
setTimeout(() => {
    const journalPrompts = [
        "What did you accomplish this session?",
        "What are you most proud of from this session?",
        "Any blockers you want to note?",
        "One thing done. What's next?"
    ];
    const prompt = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
    this.openJournalPrompt(prompt);
}, 3000);
            // Fixed: unified 3-arg signature
            this.showSessionRecap(completedIntention, effectiveMinutes, 15);

            const nextMode = (this.state.currentRound % this.state.settings.rounds === 0) ? 'longBreak' : 'shortBreak';
            this.state.modeTimers.work = null;
            this.state.modeTimers[nextMode] = null;
            this.state.currentRound++;
            this.setMode(nextMode);
            this.sendNotification('Focus session complete!', nextMode === 'longBreak' ? 'Take a long break — you earned it.' : 'Take a short break.');
            if (this.state.settings.autoStart) setTimeout(() => this.startTimer(), 1500);
        } else {
            this.recordSession(
                this.state.mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long,
                'break'
            );
            this.state.modeTimers.shortBreak = null;
            this.state.modeTimers.longBreak = null;
            this.state.modeTimers.work = null;
            this.setMode('work');
            this.sendNotification('Break over!', 'Time to focus.');
            if (this.state.settings.autoStart) setTimeout(() => this.startTimer(), 1500);
        }
       this.updateSessionCounter();
this.checkAchievements();

// Show end of day summary when daily goal is hit
if (this.state.mode !== 'work' && this.state.sessionsToday >= this.state.settings.dailyGoal) {
    setTimeout(() => this.showEndOfDaySummary(), 2500);
}
// Also show in evening (after 8pm) if they completed at least 2 sessions
const hour = new Date().getHours();
if (this.state.mode !== 'work' && hour >= 20 && this.state.sessionsToday >= 2) {
    setTimeout(() => this.showEndOfDaySummary(), 2500);
}
    },
saveSessionState() {
    localStorage.setItem('pomodoro_session', JSON.stringify({
        mode: this.state.mode,
        timeLeft: this.state.timeLeft,
        isRunning: this.state.isRunning,
        currentRound: this.state.currentRound,
        currentIntention: this.state.currentIntention,
        currentSubtasks: this.state.currentSubtasks,
        timeAdjustment: this.state.timeAdjustment,
        adjustedTotal: this.state.adjustedTotal
    }));
},

restoreSessionState() {
    const raw = localStorage.getItem('pomodoro_session');
    if (!raw) return;

    try {
        const s = JSON.parse(raw);
        if (!s || !s.mode) return;

        this.state.mode = s.mode;
        this.state.currentRound = s.currentRound || this.state.currentRound;
        this.state.currentIntention = s.currentIntention || null;
        this.state.currentSubtasks = s.currentSubtasks || [];
        this.state.timeAdjustment = s.timeAdjustment || 0;
        this.state.adjustedTotal = s.adjustedTotal || null;

        this.setMode(s.mode, true);

        if (typeof s.timeLeft === 'number' && s.timeLeft > 0) {
            this.state.timeLeft = s.timeLeft;
            this.updateTimeDisplay();
            this.updateRing();
            if (s.isRunning) this.startTimer();
        }
    } catch (e) {}
},

    // ===================================
    // VISUALS & EFFECTS
    // ===================================
updateTimeDisplay() {
    const m = Math.floor(this.state.timeLeft / 60);
    const s = this.state.timeLeft % 60;
    this.elements.time.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    document.title = `${this.elements.time.textContent} - Pomodoro`;
},

    updateRing() {
        const total = this.state.adjustedTotal || ((this.state.mode === 'work' ? this.state.settings.work :
                this.state.mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long) * 60);
        const p = total > 0 ? Math.min(1, this.state.timeLeft / total) : 1;
        const offset = 753.98 - (p * 753.98);
        this.elements.progress.setAttribute('stroke-dashoffset', offset);
        if (this.elements.glow) this.elements.glow.setAttribute('stroke-dashoffset', offset);

        // Warning pulse in the last 60 seconds of a work session
        if (this.state.mode === 'work' && this.state.timeLeft <= 60 && this.state.isRunning) {
            this.elements.container.classList.add('timer-warning');
        } else {
            this.elements.container.classList.remove('timer-warning');
        }
        this.updateTereaLights();
    },

    updateSessionCounter() {
        const total = this.state.settings.rounds;
        let current = this.state.currentRound % total || total;
        this.elements.sessionText.textContent = `Session ${current} of ${total}`;

        this.elements.sessionDots.innerHTML = '';
        const completedInCycle = (this.state.currentRound - 1) % total;
        const isTerea = this.state.settings.theme === 'terea';
        for (let i = 1; i <= total; i++) {
            if (isTerea) {
                const s = document.createElement('span');
                s.textContent = i <= completedInCycle ? '●' : '○';
                s.style.opacity = i <= completedInCycle ? '1' : '0.3';
                s.style.fontSize = '0.9rem';
                this.elements.sessionDots.appendChild(s);
            } else {
                const d = document.createElement('div');
                d.className = 'dot' + (i <= completedInCycle ? ' active' : '');
                this.elements.sessionDots.appendChild(d);
            }
        }
        this.updateRepCounter();
    },

updateRepCounter() {
    const el = document.getElementById('rep-counter');
    if (!el) return;
    const show = !!this.state.settings.repCounter && !document.body.classList.contains('minimal-mode');
    el.style.display = show ? 'inline-flex' : 'none';
    if (show) el.textContent = `${this.state.sessionsToday} × 💪`;
},
	renderSubtaskTracker() {
    const tracker = document.getElementById('subtask-tracker');
    if (!tracker) return;
    tracker.innerHTML = '';
    if (!this.state.currentSubtasks || this.state.currentSubtasks.length === 0) {
        tracker.classList.remove('visible');
        return;
    }
    tracker.classList.add('visible');
    this.state.currentSubtasks.forEach((task, idx) => {
        const el = document.createElement('div');
        el.className = 'subtask-tracker-item' + (task.done ? ' done' : '');
        el.innerHTML = `
            <div class="subtask-check">${task.done ? '✓' : ''}</div>
            <span>${task.text.replace(/</g,'&lt;')}</span>
        `;
el.addEventListener('click', () => {
    this.state.currentSubtasks[idx].done = !this.state.currentSubtasks[idx].done;
    this.renderSubtaskTracker();
        });
        tracker.appendChild(el);
    });
},

  showMotivationPop() {
		const theme   = this.state.settings.theme;
		const isPink  = theme === 'pink';
		const isTerea = theme === 'terea';

		const msgs = isTerea
			? [
				'Gym mode activated 💨',
				'Lock in. No distractions. 🔥',
				'Bouzoukia after this 🎶',
				'Queen of focus 👑',
				'Deep work energy ✨',
				'Terea mode activated 💨'
			]
			: isPink
			? [
				'Soft focus. Strong results.',
				'You are doing amazing',
				'Gentle mode — fully locked in 🌸',
				'Soft focus, strong heart',
				'You’ve got this — always'
			]
			: [
				'You got this!',
				'Lock in!',
				'Focus mode ON',
				'Deep work time',
				'You are amazing!',
				'In the zone!'
			];

		const el = document.createElement('div');
		el.className = 'motivation-pop';
		el.textContent = msgs[Math.floor(Math.random() * msgs.length)];
		document.body.appendChild(el);

		setTimeout(() => el.remove(), 2800);
	},
    createConfetti() {
        const isTerea = this.state.settings.theme === 'terea';
        const colors = isTerea
            ? ['#00d4c8', '#80fff9', '#00a89e', '#ffffff', '#00e8da']
            : [this.state.accents[this.state.settings.accent], '#ffffff', '#ffca28', '#4ecdc4'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-particle';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            const cx = (Math.random() - 0.5) * 400;
            const cy = (Math.random() - 0.5) * 400 - 100;
            p.style.setProperty('--cx', `${cx}px`);
            p.style.setProperty('--cy', `${cy}px`);
            this.elements.container.appendChild(p);
            setTimeout(() => p.remove(), 1200);
        }
    },

    createSmokeParticles() {
        const container = this.elements.container;
        if (!container) return;
        for (let i = 0; i < 12; i++) {
            const s = document.createElement('div');
            s.className = 'smoke-particle';
            const size = 12 + Math.random() * 20;
            s.style.width = size + 'px';
            s.style.height = size + 'px';
            s.style.left = (30 + Math.random() * 220) + 'px';
            s.style.bottom = '20px';
            s.style.setProperty('--dur', (1.5 + Math.random() * 1.5) + 's');
            s.style.animationDelay = (Math.random() * 0.8) + 's';
            container.appendChild(s);
            setTimeout(() => s.remove(), 3200);
        }
    },

    flashTereaComplete() {
        const el = document.createElement('div');
        el.className = 'terea-flash';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    },

    // ===================================
    // AUDIO & MOODS
    // ===================================

    _playKiamos() {
        if (!this._tereaAudio) {
            this._tereaAudio = new Audio('Kiamos.mp3');
            this._tereaAudio.loop = false;
            this._tereaAudio.volume = 0.78;
            this._tereaAudio.addEventListener('ended', () => this._hideKiamosBar());
        }
        this._tereaAudio.currentTime = 0;
        this._tereaAudio.play().catch(() => {});
        this._showKiamosBar();
    },

    _stopKiamos() {
        if (this._tereaAudio) {
            this._tereaAudio.pause();
            this._tereaAudio.currentTime = 0;
        }
        this._hideKiamosBar();
    },

    _showKiamosBar() {
        let bar = document.getElementById('kiamos-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'kiamos-bar';
            bar.innerHTML = `<span>🎵 Kiamos</span><button id="kiamos-stop" title="Stop">✕</button>`;
            document.body.appendChild(bar);
            document.getElementById('kiamos-stop').addEventListener('click', () => this._stopKiamos());
        }
        bar.classList.add('visible');
    },

    _hideKiamosBar() {
        const bar = document.getElementById('kiamos-bar');
        if (bar) bar.classList.remove('visible');
    },

    _initYTChannel(scene, trackIds, fallbackSrc) {
        if (!this._ytPlayers) this._ytPlayers = {};
        const fallback = fallbackSrc ? new Audio(fallbackSrc) : null;
        if (fallback) fallback.loop = true;

        const ch = { player: null, ready: false, failed: false, idx: 0, fallback };
        this._ytPlayers[scene] = ch;

        const vol     = () => (this.state.mixerVolumes[scene] || 0) / 100;
        const startFb = () => { if (!fallback) return; fallback.volume = Math.min(1, vol()); if (fallback.paused) fallback.play().catch(() => {}); };
        const stopFb  = () => { if (!fallback) return; fallback.pause(); fallback.currentTime = 0; };
        const setVol  = (v) => { if (fallback) fallback.volume = Math.min(1, v); if (ch.player && ch.ready) ch.player.setVolume(v * 100); };

        const wrapId  = `yt-wrap-${scene}`;
        const frameId = `yt-frame-${scene}`;

        const showPlayer = (on) => {
            const w = document.getElementById(wrapId);
            if (!w) return;
            if (scene === 'bouzoukia') {
                // Bouzoukia player lives in body — toggle visibility
                if (on) {
                    w.style.cssText = 'position:fixed;bottom:80px;right:16px;width:280px;height:158px;z-index:50;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.5);';
                } else {
                    w.style.cssText = 'position:fixed;bottom:0;right:0;width:200px;height:113px;z-index:-1;opacity:0;pointer-events:none;';
                }
            } else {
                w.style.maxHeight = on ? '180px' : '0';
            }
        };

        const loadTrack = () => {
            if (!ch.player || !trackIds.length) return;
            ch.player.loadVideoById(trackIds[ch.idx % trackIds.length]);
        };

        const ytPlay = () => {
            if (!ch.player || !ch.ready) return false;
            ch.player.setVolume(vol() * 100);
            const s = ch.player.getPlayerState();
            if (s === 1) return true;
            if (s === 2) { ch.player.playVideo(); return true; }
            loadTrack();
            return true;
        };

        const onStart = () => {
            if (!trackIds.length || ch.failed) { startFb(); return; }
            showPlayer(true);
            if (ch.ready) ytPlay(); else startFb(); // fallback until YouTube is ready
        };
        const onStop = () => {
            if (ch.player && ch.ready) ch.player.pauseVideo();
            stopFb();
            showPlayer(false);
        };

        // Create player wrap — bouzoukia goes in body (always rendered) since its
        // mixer-channel card is display:none outside Terea theme and YouTube needs
        // a rendered element to initialise. Other channels go inside their channel div.
        if (!document.getElementById(wrapId) && trackIds.length) {
            const wrap = document.createElement('div');
            wrap.id = wrapId;
            if (scene === 'bouzoukia') {
                wrap.style.cssText = 'position:fixed;bottom:0;right:0;width:200px;height:113px;z-index:-1;opacity:0;pointer-events:none;';
                wrap.innerHTML = `<div id="${frameId}" style="width:100%;height:100%;"></div>`;
                document.body.appendChild(wrap);
            } else {
                const channel = document.querySelector(`.mixer-channel[data-scene="${scene}"]`);
                if (channel) {
                    wrap.style.cssText = 'overflow:hidden;max-height:0;width:100%;transition:max-height 0.3s ease;';
                    wrap.innerHTML = `<div id="${frameId}" style="width:100%;height:160px;"></div>`;
                    channel.appendChild(wrap);
                }
            }
        }

        const initPlayer = () => {
            if (ch.player || !window.YT?.Player || !trackIds.length) return;
            const div = document.getElementById(frameId);
            if (!div) return;
            const playerW = scene === 'bouzoukia' ? '200' : '100%';
            const playerH = scene === 'bouzoukia' ? '113' : '160';
            ch.player = new window.YT.Player(frameId, {
                width: playerW, height: playerH,
                videoId: trackIds[0],
                playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, iv_load_policy: 3 },
                events: {
                    onReady: () => {
                        ch.ready = true;
                        stopFb(); // stop fallback if it was playing
                        if (vol() > 0) { ch.player.setVolume(vol() * 100); ch.player.playVideo(); }
                    },
                    onStateChange: e => {
                        if (e.data === 0) { ch.idx = (ch.idx + 1) % trackIds.length; loadTrack(); }
                    },
                    onError: () => {
                        ch.idx = (ch.idx + 1) % trackIds.length;
                        if (trackIds.length > 1 && ch.idx !== 0) loadTrack();
                        else { ch.failed = true; showPlayer(false); if (vol() > 0) startFb(); }
                    },
                }
            });
        };

        if (trackIds.length) {
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
            if (window.YT?.Player) {
                initPlayer();
            } else {
                const prev = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => { if (prev) prev(); initPlayer(); };
            }
        }

        // Slider listener — reacts immediately when user moves the slider
        const slider = document.querySelector(`.mixer-slider[data-scene="${scene}"]`);
        if (slider) slider.addEventListener('input', e => {
            const v = parseInt(e.target.value) / 100;
            setVol(v);
            if (v > 0) onStart(); else onStop();
        });

        // Icon toggle — wait for initMixer to update slider.value first (hence timeout)
        const btn = document.querySelector(`.mixer-btn[data-scene="${scene}"]`);
        if (btn) btn.addEventListener('click', () => setTimeout(() => {
            const v = vol(); setVol(v);
            if (v > 0) onStart(); else onStop();
        }, 60));

        // Stop All button
        const stopAll = document.getElementById('btn-stop-all-ambient');
        if (stopAll) stopAll.addEventListener('click', onStop);

        // ⏭ next-track button (bouzoukia only)
        if (scene === 'bouzoukia') {
            const nxt = document.getElementById('bz-next-btn');
            if (nxt) nxt.addEventListener('click', e => {
                e.stopPropagation();
                ch.idx = (ch.idx + 1) % (trackIds.length || 1);
                if (ch.player && ch.ready && !ch.failed) loadTrack();
                else { stopFb(); startFb(); }
            });
        }
    },

    playAudio(type) {
    if (type === 'none') return;
    try {
        if (!this.toneCtx) this.toneCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.toneCtx.state === 'suspended') this.toneCtx.resume();
        const tCtx = this.toneCtx;
        const t = tCtx.currentTime;

        if (type === 'bell') {
            const o = tCtx.createOscillator(), g = tCtx.createGain();
            o.frequency.setValueAtTime(800, t);
            o.frequency.exponentialRampToValueAtTime(300, t + 1.5);
            g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 2);
            o.connect(g).connect(tCtx.destination); o.start(t); o.stop(t + 2);

        } else if (type === 'digital') {
            for (let i = 0; i < 3; i++) {
                const o = tCtx.createOscillator(), g = tCtx.createGain();
                o.type = 'square'; o.frequency.value = 1200;
                g.gain.setValueAtTime(0.1, t + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.1);
                o.connect(g).connect(tCtx.destination);
                o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.12);
            }

        } else if (type === 'zen') {
            const o = tCtx.createOscillator(), g = tCtx.createGain();
            o.type = 'sine'; o.frequency.value = 432;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.3, t + 0.5);
            g.gain.exponentialRampToValueAtTime(0.01, t + 4);
            o.connect(g).connect(tCtx.destination); o.start(t); o.stop(t + 4.5);

        } else if (type === 'chime') {
            // Three ascending chime tones
            const freqs = [523, 659, 784];
            freqs.forEach((freq, i) => {
                const o = tCtx.createOscillator(), g = tCtx.createGain();
                o.type = 'sine'; o.frequency.value = freq;
                g.gain.setValueAtTime(0, t + i * 0.25);
                g.gain.linearRampToValueAtTime(0.3, t + i * 0.25 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 1.2);
                o.connect(g).connect(tCtx.destination);
                o.start(t + i * 0.25); o.stop(t + i * 0.25 + 1.3);
            });

              } else if (type === 'cute') {
        const cuteNotes = [523, 659, 784, 1047, 1319];
        cuteNotes.forEach((freq, i) => {
          const oc = tCtx.createOscillator(), gc = tCtx.createGain();
          oc.type = 'sine';
          oc.frequency.value = freq;
          gc.gain.setValueAtTime(0, t + i * 0.12);
          gc.gain.linearRampToValueAtTime(0.22, t + i * 0.12 + 0.04);
          gc.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
          oc.connect(gc).connect(tCtx.destination);
          oc.start(t + i * 0.12);
          oc.stop(t + i * 0.12 + 0.55);
        });
        const popc = tCtx.createOscillator(), pgc = tCtx.createGain();
        popc.type = 'sine';
        popc.frequency.setValueAtTime(1800, t + 0.7);
        popc.frequency.exponentialRampToValueAtTime(400, t + 0.9);
        pgc.gain.setValueAtTime(0.25, t + 0.7);
        pgc.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
        popc.connect(pgc).connect(tCtx.destination);
        popc.start(t + 0.7);
        popc.stop(t + 1.2);
} else if (type === 'sw_theme') {
            // Short 3-note Force theme motif
            const notes = [
                { f: 246.94, d: 0,    l: 0.4 },
                { f: 329.63, d: 0.45, l: 0.4 },
                { f: 392.00, d: 0.9,  l: 0.8 }
            ];
            notes.forEach(({ f, d, l }) => {
                const o = tCtx.createOscillator(), g = tCtx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0, t + d);
                g.gain.linearRampToValueAtTime(0.35, t + d + 0.06);
                g.gain.setValueAtTime(0.35, t + d + l - 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, t + d + l);
                o.connect(g).connect(tCtx.destination);
                o.start(t + d); o.stop(t + d + l + 0.05);
            });

        } else if (type === 'bouzoukia_riff') {
            // Short Phrygian Dominant riff (E F G# A B — Greek/bouzoukia flavour)
            const riff = [
                { f: 329.63, d: 0,    l: 0.22 },
                { f: 349.23, d: 0.24, l: 0.16 },
                { f: 415.30, d: 0.42, l: 0.22 },
                { f: 440.00, d: 0.66, l: 0.18 },
                { f: 493.88, d: 0.86, l: 0.32 },
                { f: 440.00, d: 1.2,  l: 0.20 },
                { f: 329.63, d: 1.44, l: 0.55 }
            ];
            riff.forEach(({ f, d, l }) => {
                const o = tCtx.createOscillator(), filt = tCtx.createBiquadFilter(), g = tCtx.createGain();
                o.type = 'sawtooth'; o.frequency.value = f;
                filt.type = 'lowpass'; filt.frequency.value = 2200; filt.Q.value = 1.5;
                g.gain.setValueAtTime(0, t + d);
                g.gain.linearRampToValueAtTime(0.18, t + d + 0.02);
                g.gain.setValueAtTime(0.18, t + d + l - 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, t + d + l);
                o.connect(filt).connect(g).connect(tCtx.destination);
                o.start(t + d); o.stop(t + d + l + 0.05);
            });

        } else if (type === 'smoke_break') {
            // Lighter flick: short noise burst
            const nBuf = tCtx.createBuffer(1, tCtx.sampleRate * 0.08, tCtx.sampleRate);
            const nd = nBuf.getChannelData(0);
            for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
            const nSrc = tCtx.createBufferSource(), nFilt = tCtx.createBiquadFilter(), nG = tCtx.createGain();
            nSrc.buffer = nBuf; nFilt.type = 'bandpass'; nFilt.frequency.value = 4000; nFilt.Q.value = 0.8;
            nG.gain.setValueAtTime(0.25, t); nG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            nSrc.connect(nFilt).connect(nG).connect(tCtx.destination);
            nSrc.start(t); nSrc.stop(t + 0.12);

            // Exhale: low noise swell
            const eBuf = tCtx.createBuffer(1, tCtx.sampleRate * 1.2, tCtx.sampleRate);
            const ed = eBuf.getChannelData(0);
            for (let i = 0; i < ed.length; i++) ed[i] = Math.random() * 2 - 1;
            const eSrc = tCtx.createBufferSource(), eFilt = tCtx.createBiquadFilter(), eG = tCtx.createGain();
            eSrc.buffer = eBuf; eFilt.type = 'lowpass'; eFilt.frequency.value = 400;
            eG.gain.setValueAtTime(0, t + 0.15); eG.gain.linearRampToValueAtTime(0.09, t + 0.5);
            eG.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
            eSrc.connect(eFilt).connect(eG).connect(tCtx.destination);
            eSrc.start(t + 0.15); eSrc.stop(t + 1.5);
        }
    } catch (e) { console.error("Audio error", e); }
},

    // ===================================
    // TOASTS — single canonical versions
    // ===================================
    showToast(title, desc, icon = '✅') {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${desc}</div>
            </div>
        `;
        c.appendChild(t);
        setTimeout(() => {
            t.classList.add('hiding');
            setTimeout(() => t.remove(), 300);
        }, 4000);
    },

    showSessionRecap(intention, durationMinutes, xpGained) {
        const quotes = ["Locked in.", "Flow achieved.", "One more?", "Deep work done.", "Focus unlocked."];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast toast-recap';
        t.innerHTML = `
            <div class="toast-content" style="width: 100%;">
                <div class="toast-title">Session Complete · ${quote}</div>
                <div class="toast-desc">
                    ${intention ? `<strong>Focus:</strong> ${intention.replace(/</g,'&lt;')}<br>` : ''}
                    <strong>Duration:</strong> ${durationMinutes}m<br>
                    <strong>XP:</strong> +${xpGained || 15} XP
                </div>
            </div>
        `;
        c.appendChild(t);
        setTimeout(() => {
            t.classList.add('hiding');
            setTimeout(() => t.remove(), 300);
        }, 6000);
    },

    resumeAmbience() {
        if (!window.AmbienceModule) return;
        Object.entries(this.state.mixerVolumes).forEach(([scene, vol]) => {
            if (typeof vol === 'number' && vol > 0 && !scene.startsWith('_prev_') && !window.AmbienceModule.isActive(scene)) {
                window.AmbienceModule.play(scene);
                window.AmbienceModule.setSceneVolume(scene, vol / 100);
            }
        });
    },

    sendNotification(title, body) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🍅</text></svg>' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification(title, { body });
            });
        }
    },

   activateMood(moodKey) {
    this.elements.moodCards.forEach(c => c.classList.toggle('active', c.dataset.mood === moodKey));

    const presets = {
        cozycafe:    { cafe: 65, jazz: 50, rain: 0, waves: 0, brown: 0, nature: 0, library: 0 },
        rainyday:    { rain: 75, brown: 55, cafe: 0, jazz: 0, waves: 0, nature: 0, library: 0 },
        deepfocus:   { library: 60, nature: 40, rain: 0, waves: 0, brown: 0, cafe: 0, jazz: 0 },
        oceanbreeze: { waves: 70, nature: 45, rain: 0, brown: 0, cafe: 0, jazz: 0, library: 0 }
    };

    const customMoods = JSON.parse(localStorage.getItem('pomodoro_custom_moods') || '{}');
    const volumes = presets[moodKey] || customMoods[moodKey];
    if (!volumes) return;

    const applyMood = () => {
        Object.entries(volumes).forEach(([scene, vol]) => {
            const slider = document.querySelector(`.mixer-slider[data-scene="${scene}"]`);
            const channel = document.querySelector(`.mixer-channel[data-scene="${scene}"]`);
            if (!slider || !channel) return;

            slider.value = vol;
            this.state.mixerVolumes[scene] = vol;
            channel.querySelector('.mixer-vol').textContent = `${vol}%`;

            if (vol > 0) {
                window.AmbienceModule.play(scene);
                window.AmbienceModule.setSceneVolume(scene, vol / 100);
                channel.classList.add('active');
            } else {
                window.AmbienceModule.stop(scene);
                channel.classList.remove('active');
            }
        });
        localStorage.setItem('pomodoro_mixer', JSON.stringify(this.state.mixerVolumes));
    };

    if (window.AmbienceModule && window.AmbienceModule.crossfadeTo) {
        window.AmbienceModule.crossfadeTo(applyMood);
    } else {
        window.AmbienceModule.stopAll();
        applyMood();
    }
},

    // ===================================
    // SETTINGS & DATA
    // ===================================
    loadSettings() {
        const s = localStorage.getItem('pomodoro_settings');
        if (s) this.state.settings = { ...this.state.settings, ...JSON.parse(s) };
        const v = localStorage.getItem('pomodoro_ambient_vol');
        if (v) this.state.ambientVolume = parseInt(v);

        document.getElementById('setting-work').value = this.state.settings.work;
        document.getElementById('setting-short').value = this.state.settings.short;
        document.getElementById('setting-long').value = this.state.settings.long;
        document.getElementById('setting-rounds').value = this.state.settings.rounds;
        document.getElementById('setting-daily-goal').value = this.state.settings.dailyGoal;
        document.getElementById('setting-sound').value = this.state.settings.sound;

        if (this.elements.swMusicInput) this.elements.swMusicInput.checked = this.state.settings.swMusic;
        if (this.elements.ambientVolInput) this.elements.ambientVolInput.value = this.state.ambientVolume;
        const autoStartEl = document.getElementById('setting-auto-start');
        if (autoStartEl) autoStartEl.checked = !!this.state.settings.autoStart;
        const repEl = document.getElementById('setting-rep-counter');
        if (repEl) repEl.checked = !!this.state.settings.repCounter;
        const tereaLiteEl = document.getElementById('setting-terea-lite');
        if (tereaLiteEl) tereaLiteEl.checked = !!this.state.settings.tereaLite;
		this.setWallpaper(this.state.settings.wallpaper);
    },

    saveSettings() {
        this.state.settings.work = parseInt(document.getElementById('setting-work').value);
        this.state.settings.short = parseInt(document.getElementById('setting-short').value);
        this.state.settings.long = parseInt(document.getElementById('setting-long').value);
        this.state.settings.rounds = parseInt(document.getElementById('setting-rounds').value);
        this.state.settings.dailyGoal = parseInt(document.getElementById('setting-daily-goal').value);
        this.state.settings.sound = document.getElementById('setting-sound').value;
        if (this.elements.swMusicInput) this.state.settings.swMusic = this.elements.swMusicInput.checked;
        const autoStartEl = document.getElementById('setting-auto-start');
        if (autoStartEl) this.state.settings.autoStart = autoStartEl.checked;
        const repEl = document.getElementById('setting-rep-counter');
        if (repEl) this.state.settings.repCounter = repEl.checked;
        const tereaLiteEl = document.getElementById('setting-terea-lite');
        if (tereaLiteEl) this.state.settings.tereaLite = tereaLiteEl.checked;
        this.updateRepCounter();
        localStorage.setItem('pomodoro_settings', JSON.stringify(this.state.settings));
        this.renderStats();
        const user = window.firebaseAuth?.currentUser;
if (user) this.saveToFirestore(user.uid);
    },

    loadStats() {
        const todayStr = new Date().toDateString();
        const savedDate = localStorage.getItem('pomodoro_date');

        if (savedDate !== todayStr) {
            this.state.sessionsToday = 0;
            localStorage.setItem('pomodoro_date', todayStr);
        } else {
            this.state.sessionsToday = parseInt(localStorage.getItem('pomodoro_today')) || 0;
        }

        this.state.totalSessions = parseInt(localStorage.getItem('pomodoro_total')) || 0;
        this.state.xp = parseInt(localStorage.getItem('pomodoro_xp')) || 0;
        this.updateLevel();

        const h = localStorage.getItem('pomodoro_history');
        if (h) this.state.history = JSON.parse(h);
    },

    saveStats() {
        localStorage.setItem('pomodoro_today', this.state.sessionsToday);
        localStorage.setItem('pomodoro_total', this.state.totalSessions);
        localStorage.setItem('pomodoro_xp', this.state.xp);
        this.renderStats();
    },

    recordSession(duration, type) {
this.state.history.push({
    date: new Date().toISOString(),
    duration: duration,
    type: type,
    intention: type === 'focus' ? this.state.currentIntention : null,
    label: type === 'focus' ? this.sessionLabel || null : null
});
        if (type === 'focus') this.state.currentIntention = null;
        const inp = document.getElementById('intention-input');
        if (inp) inp.value = '';
		document.querySelectorAll('.subtask-input').forEach(i => i.value = '');
        localStorage.setItem('pomodoro_history', JSON.stringify(this.state.history));
    },

    addXp(amount) {
        this.state.xp += amount;
        this.updateLevel();
        this.saveStats();
    },

    updateLevel() {
        const cl = this.state.level;
        this.state.level = Math.floor(Math.sqrt(this.state.xp / 50)) + 1;
        const currentLevelXpDist = 50 * Math.pow(this.state.level - 1, 2);
        const nextLevelXpDist = 50 * Math.pow(this.state.level, 2);
        const xpInLevel = this.state.xp - currentLevelXpDist;
        const xpRequired = nextLevelXpDist - currentLevelXpDist;
        const pct = (xpInLevel / xpRequired) * 100;

        const ranks = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Legend'];
        const tereaRanks = ['Warm Up 🏃‍♀️', 'Lifting Queen 💪', 'Cardio Goddess 🔥', 'Greek Goddess ✨', 'Bouzoukia Star 🎶', 'Queen of Queens 👑', 'Τέρεα Legend 💨'];

        const theme = this.state.settings.theme;
        const rankArr = theme === 'terea' ? tereaRanks : ranks;
        const rankName = rankArr[Math.min(this.state.level - 1, rankArr.length - 1)];

        if (this.elements.lvlRank) this.elements.lvlRank.textContent = `${rankName} (Lvl ${this.state.level})`;
        if (this.elements.lvlXp) this.elements.lvlXp.textContent = `${xpInLevel} / ${xpRequired} XP to Lvl ${this.state.level + 1}`;
        if (this.elements.lvlFill) this.elements.lvlFill.style.width = `${pct}%`;

        const rD = document.getElementById('stat-rank-display');
        if (rD) rD.textContent = rankName;

        if (this.state.level > cl && cl > 0) {
            if (this.state.settings.theme === 'terea') {
                this.showToast('Επίπεδο ανέβηκε! 👑', rankName, '💨');
            } else {
                this.showToast('Level Up!', `You've reached Level ${this.state.level}: ${rankName}`, '⭐');
            }
        }
    },

    // ===================================
    // THEMES & APPEARANCE
    // ===================================
updateTheme() {
		const theme  = this.state.settings.theme;
		const isPink    = theme === 'pink';
		const isTerea   = theme === 'terea';
		const isMedical = theme === 'medical';

		document.body.classList.toggle('theme-pink',     isPink);
		document.body.classList.toggle('theme-terea',    isTerea);
		document.body.classList.toggle('theme-medical',  isMedical);
		document.body.classList.toggle('minimal-mode',   isPink || isTerea);

		// Sync theme-card active state
		document.querySelectorAll('.theme-card').forEach(btn => {
			btn.classList.toggle('active', btn.dataset.theme === theme);
		});

		if (isPink) {
			document.body.style.setProperty('--accent', '#ff6eb4');
			document.body.style.setProperty('--accent-glow', 'rgba(255,110,180,0.5)');
			document.body.style.setProperty('--accent-glow-intense', 'rgba(255,110,180,0.85)');
		} else if (isTerea) {
			document.body.style.setProperty('--accent', '#00d4c8');
			document.body.style.setProperty('--accent-glow', 'rgba(0,212,200,0.35)');
			document.body.style.setProperty('--accent-glow-intense', 'rgba(0,212,200,0.75)');
		} else if (isMedical) {
			document.body.style.removeProperty('--accent');
			document.body.style.removeProperty('--accent-glow');
			document.body.style.removeProperty('--accent-glow-intense');
		} else {
			this.setAccent(this.state.settings.accent);
		}

		this.checkBouzoukiaHours();
		this.setWallpaper(this.state.settings.wallpaper);
		this.updateLogo();
		this.updateLevel();
		this.updateTereaLights();
		this.updateRepCounter();

		// Show Terea Lite option only in Terea mode
		const tereaLiteRow = document.getElementById('row-terea-lite');
		if (tereaLiteRow) tereaLiteRow.style.display = isTerea ? 'flex' : 'none';

		// Medical theme — swap quotes to med student flavour
		const quoteEl = document.getElementById('quote-text');
		if (isMedical && quoteEl) {
			const medQuotes = [
				'The good physician treats the disease. The great physician treats the patient.',
				'Medicine is a science of uncertainty and an art of probability.',
				'Every patient is a teacher. Every case is a lesson.',
				'Study hard. The life you save may depend on it.',
				'Diagnosis is the first step. Understanding is the destination.',
				'Sleep is a luxury. Knowledge is not.',
			];
			quoteEl.textContent = medQuotes[Math.floor(Math.random() * medQuotes.length)];
		}

		// ECG canvas — start in medical, stop otherwise
		if (window.MedicalModule) {
			if (isMedical) window.MedicalModule.startECG();
			else window.MedicalModule.stopECG();
		}
	},

checkBouzoukiaHours() {
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 4;
    const isTerea = this.state.settings.theme === 'terea';
    document.body.classList.toggle('bouzoukia-hours', isTerea && isNight);
},

updateTereaLights() {
    const lights = document.getElementById('terea-lights');
    if (!lights) return;
    const isTerea = this.state.settings.theme === 'terea';
    if (!isTerea) { lights.style.display = 'none'; return; }
    lights.style.display = 'flex';

    const els = lights.querySelectorAll('.terea-light');
    const total = (this.state.mode === 'work'
        ? this.state.settings.work
        : this.state.mode === 'shortBreak'
        ? this.state.settings.short
        : this.state.settings.long) * 60;
    const p = total > 0 ? this.state.timeLeft / total : 1;

    // Light 0 = top, light 3 = bottom; fill from bottom (3→0) as session starts,
    // dim from top (0→3) as time passes.
    els.forEach((el, i) => {
        // light i is ON while p > i/4  (quarter thresholds from top)
        const threshold = (3 - i) / 4;
        if (p > threshold) {
            el.classList.remove('dimming');
            el.classList.add('lit');
        } else if (p > threshold - 0.15) {
            el.classList.remove('lit');
            el.classList.add('dimming');
        } else {
            el.classList.remove('lit', 'dimming');
        }
    });

    const label = document.getElementById('terea-label');
    if (label) {
        if (!this.state.isRunning && this.state.timeLeft === total) {
            label.textContent = 'Queen Mode 💨';
        } else if (p > 0.75) {
            label.textContent = 'Locked In 🔒';
        } else if (p > 0.5) {
            label.textContent = 'Halfway There 💪';
        } else if (p > 0.25) {
            label.textContent = 'Almost Done 🔥';
        } else {
            label.textContent = 'Final Push 👑';
        }
    }
},

setThemePreview(theme) {
    this.state.settings.theme = theme;
    this.saveSettings();
    this.updateTheme();
},

    setAccent(colorName) {
        if (!this.state.accents[colorName]) return;
        this.state.settings.accent = colorName;
        const hex = this.state.accents[colorName];
        document.body.style.setProperty('--accent', hex);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = hex;
        		this.elements.colorBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === colorName));
				this.updateRingGradient();
    },

    setSaber(colorName) {
        if (!this.state.saberColors || !this.state.saberColors[colorName]) return;
        this.state.settings.saber = colorName;
        if (this.elements.saberBtns) this.elements.saberBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === colorName));
        this.saveSettings();
    },

 setWallpaper(wpId) {
    if (!wpId) return; // guard against undefined
    this.state.settings.wallpaper = wpId;
    this.elements.wpBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.wp === wpId));

    const layer = document.getElementById('wallpaper-layer');
    if (!layer) return;

    const presets = {
        preset_forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
        preset_space:  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=80'
    };

    layer.style.backgroundImage = 'none';

    if (wpId === 'default') {
        // cleared above
    } else if (presets[wpId]) {
        layer.style.backgroundImage = `url('${presets[wpId]}')`;
    } else if (wpId.startsWith('wp_')) {
        const req = indexedDB.open('pomodoro_db', 1);
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('wallpapers', 'readonly');
            const getReq = tx.objectStore('wallpapers').get(wpId);
            getReq.onsuccess = () => {
                if (getReq.result) layer.style.backgroundImage = `url(${getReq.result.data})`;
            };
        };
    }
    this.saveSettings();
},

    // ===================================
    // UI RENDERING
    // ===================================
    updateLogo() {
        const title = document.getElementById('logo-title');
        const subtitle = document.getElementById('logo-subtitle');
        const theme = this.state.settings.theme;
        if (theme === 'terea') {
            if (title) title.textContent = 'TEREA FOCUS';
            if (subtitle) subtitle.textContent = 'Terea mode. Queen focus only. 💨';
        } else {
            if (title) title.textContent = 'Pomodoro Focus';
            if (subtitle) subtitle.textContent = '';
        }
        const titleEl = document.getElementById('notebook-cover-title');
        const emblem = document.querySelector('.notebook-emblem');
        if (titleEl) titleEl.textContent = theme === 'terea' ? 'Terea Journal 💨' : 'My Journal';
        if (emblem) emblem.textContent = theme === 'terea' ? '👑' : '📖';
    },

    rotateQuote() {
        const text = document.getElementById('quote-text');
        if (!text) return;
        text.style.opacity = 0;
        setTimeout(() => {
            const theme = this.state.settings.theme;
            const arr = theme === 'pink' ? [
                '"Soft heart, strong mind."',
                '"She believed she could, so she did."',
                '"Bloom where you are planted."',
                '"You are enough, always."'
            ] : theme === 'terea' ? [
                '"Η βασίλισσα δεν σταματά." — The queen does not stop.',
                '"Sweat is just your body crying happy tears."',
                '"Lift heavy, dream bigger."',
                '"Bouzoukia πρώτα, ύπνος μετά." — Bouzoukia first, sleep later.',
                '"A queen finishes what she starts."',
                '"Greek goddesses train. Then they celebrate."'
            ] : [
                '"Focus is a matter of deciding what things you\'re not going to do."',
                '"Where your attention goes, your time goes."',
                '"The successful warrior is the average man, with laser-like focus."',
                '"Starve your distractions, feed your focus."'
            ];
            text.textContent = arr[Math.floor(Math.random() * arr.length)];
            text.style.opacity = 1;
        }, 500);
    },

    renderStats() {
		 // Empty state check
    const emptyState = document.getElementById('stats-empty-state');
    const statsGrid = document.getElementById('stats-overview-grid');
    if (this.state.totalSessions === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (statsGrid) statsGrid.style.opacity = '0.3';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (statsGrid) statsGrid.style.opacity = '1';
    }
        const statToday = document.getElementById('stat-today');
        const statTotal = document.getElementById('stat-total');
        const statWeek = document.getElementById('stat-week');
        if (statToday) statToday.textContent = this.state.sessionsToday;
        if (statTotal) statTotal.textContent = this.state.totalSessions;

        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        let weekTotal = 0;
        this.state.history.forEach(s => {
            if (s.type === 'focus' && new Date(s.date) >= weekStart) weekTotal++;
        });
        if (statWeek) statWeek.textContent = weekTotal;

        const goalP = document.getElementById('goal-progress');
        if (goalP) {
            const pct = Math.min(1, this.state.sessionsToday / this.state.settings.dailyGoal);
            goalP.style.strokeDasharray = `${pct * 176}, 176`;
        }

        // Streak
        let currentStreak = 0;
        const activeDays = new Set();
        this.state.history.forEach(s => {
            if (s.type === 'focus') {
                const d = new Date(s.date);
                activeDays.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
            }
        });
        const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday0 = today0 - 86400000;
        let checkDate = today0;
        if (!activeDays.has(today0) && activeDays.has(yesterday0)) {
            checkDate = yesterday0;
        }
        while (activeDays.has(checkDate)) {
            currentStreak++;
            checkDate -= 86400000;
        }
        const b = document.getElementById('streak-badge');
        if (b) {
            if (currentStreak > 0) {
                const isTerea = this.state.settings.theme === 'terea';
                b.textContent = isTerea
                    ? `💨 ${currentStreak} day streak`
                    : `🔥 ${currentStreak} Day${currentStreak > 1 ? 's' : ''}`;
                b.style.display = 'inline-flex';
            } else {
                b.style.display = 'none';
            }
        }

        this.renderCharts();
				this.renderTagBreakdown();
        this.renderHistory();
        this.checkAchievements();
    },

    renderCharts() {
        const ctxS = document.getElementById('sessions-chart');
        const ctxM = document.getElementById('minutes-chart');
        if (!ctxS || !ctxM) return;

        const activeRangeBtn = document.querySelector('.chart-range.active');
        const days = activeRangeBtn ? parseInt(activeRangeBtn.dataset.range) : 7;

        const labels = [];
        const sessionsData = [];
        const minutesData = [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString([], { weekday: 'short' }));

            let sCount = 0, mCount = 0;
            this.state.history.forEach(s => {
                if (s.type === 'focus') {
                    const sd = new Date(s.date);
                    sd.setHours(0, 0, 0, 0);
                    if (sd.getTime() === d.getTime()) { sCount++; mCount += s.duration; }
                }
            });
            sessionsData.push(sCount);
            minutesData.push(mCount);
        }

        const accent = this.state.accents[this.state.settings.accent] || '#4ecdc4';

// Build gradient for bar chart
const sCtx2d = ctxS.getContext('2d');
const barGrad = sCtx2d.createLinearGradient(0, 0, 0, 180);
barGrad.addColorStop(0, accent);
barGrad.addColorStop(1, accent + '44');

// Build gradient for line chart fill
const mCtx2d = ctxM.getContext('2d');
const lineGrad = mCtx2d.createLinearGradient(0, 0, 0, 180);
lineGrad.addColorStop(0, accent + '55');
lineGrad.addColorStop(1, accent + '00');

if (this.chartS) this.chartS.destroy();
this.chartS = new Chart(ctxS, {
    type: 'bar',
    data: {
        labels,
        datasets: [{
            label: 'Sessions',
            data: sessionsData,
            backgroundColor: barGrad,
            borderRadius: 6,
            borderSkipped: false
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#fff',
            bodyColor: accent,
            borderColor: accent + '44',
            borderWidth: 1,
            padding: 10,
            callbacks: {
                label: ctx => ` ${ctx.parsed.y} session${ctx.parsed.y !== 1 ? 's' : ''}`
            }
        }},
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', stepSize: 1 } },
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)' } }
        }
    }
});

if (this.chartM) this.chartM.destroy();
this.chartM = new Chart(ctxM, {
    type: 'line',
    data: {
        labels,
        datasets: [{
            label: 'Minutes',
            data: minutesData,
            borderColor: accent,
            backgroundColor: lineGrad,
            fill: true,
            tension: 0.45,
            pointBackgroundColor: accent,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#fff',
            bodyColor: accent,
            borderColor: accent + '44',
            borderWidth: 1,
            padding: 10,
            callbacks: {
                label: ctx => ` ${ctx.parsed.y} min`
            }
        }},
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)' } },
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)' } }
        }
    }
});
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;
        list.innerHTML = '';
        if (this.state.history.length === 0) {
            list.innerHTML = '<p class="empty-state">No sessions yet. Start your first focus session!</p>';
            return;
        }
        const recent = [...this.state.history].reverse().slice(0, 50);
        recent.forEach(s => {
            const d = new Date(s.date);
            const el = document.createElement('div');
        el.className = `history-item ${s.type}`;
const labelColors = { work:'#a78bfa', study:'#38bdf8', creative:'#fb923c', admin:'#94a3b8', other:'#4ecdc4' };
if (s.label && labelColors[s.label]) {
    el.style.borderLeftColor = labelColors[s.label];
}
            el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
            <div>${s.type === 'focus' ? '🎯 Focus' : '☕ Break'} · ${s.duration}m</div>
            <div class="history-meta">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            ${s.intention ? `<div style="font-size:0.82rem; color:var(--accent); margin-top:4px; font-style:italic;">🎯 "${s.intention.replace(/</g,'&lt;')}"</div>` : ''}
        </div>
        <button class="btn-delete-history" onclick="app.deleteHistoryItem('${s.date}')" title="Delete">✕</button>
    </div>
`;
            list.appendChild(el);
        });
    },

    renderHeatmap() {
        const grid = document.getElementById('heatmap-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const counts = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        this.state.history.forEach(s => {
            if (s.type !== 'focus') return;
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            counts[d.getTime()] = (counts[d.getTime()] || 0) + 1;
        });

        for (let i = 34; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const count = counts[d.getTime()] || 0;

            let lvl = 0;
            if (count > 0) lvl = 1;
            if (count >= 3) lvl = 2;
            if (count >= 6) lvl = 3;
            if (count >= 8) lvl = 4;

            const cell = document.createElement('div');
            cell.className = `h-cell level-${lvl}`;
            cell.title = `${d.toDateString()}: ${count} sessions`;
            grid.appendChild(cell);
        }
    },

    renderInsights() {
        const hours = new Array(24).fill(0);
        this.state.history.forEach(s => {
            if (s.type === 'focus') {
                const h = new Date(s.date).getHours();
                hours[h] += s.duration;
            }
        });

        const bestH = hours.indexOf(Math.max(...hours));
        const hourTxt = Math.max(...hours) > 0 ? `${bestH}:00 - ${bestH + 1}:00` : 'N/A';
        const insightHour = document.getElementById('insight-hour');
        if (insightHour) insightHour.textContent = hourTxt;

        const score = Math.min(100, Math.floor((this.state.sessionsToday / this.state.settings.dailyGoal) * 50 + (this.state.level * 2)));
        const insightScore = document.getElementById('insight-score');
        if (insightScore) insightScore.textContent = `${score}/100`;

        const now = new Date();
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        let thisWeekMins = 0, lastWeekMins = 0;
        this.state.history.forEach(s => {
            if (s.type === 'focus') {
                const d = new Date(s.date);
                if (d >= startOfThisWeek) thisWeekMins += s.duration;
                else if (d >= startOfLastWeek && d < startOfThisWeek) lastWeekMins += s.duration;
            }
        });

        const trendEl = document.getElementById('insight-trend');
        if (trendEl) {
            if (lastWeekMins === 0) {
                trendEl.textContent = thisWeekMins > 0 ? 'Up (New)' : 'Neutral';
                trendEl.style.color = thisWeekMins > 0 ? 'var(--success)' : 'var(--text-primary)';
            } else {
                const pct = Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100);
                trendEl.textContent = pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : 'Flat';
                trendEl.style.color = pct > 0 ? 'var(--success)' : pct < 0 ? 'var(--danger)' : 'var(--text-primary)';
            }
        }

        const tipEl = document.getElementById('insight-tip');
        if (tipEl) {
            if (this.state.sessionsToday >= this.state.settings.dailyGoal) {
                tipEl.textContent = "You hit your daily goal! Great consistency. Consider wrapping up deep work for the day.";
            } else if (bestH > 0 && new Date().getHours() === bestH) {
                tipEl.textContent = "It's your statistically most productive hour. Time to tackle the hardest task!";
            } else {
                tipEl.textContent = "Try matching a Focus Mood with your current task to enhance concentration.";
            }
        }
    },

    // ===================================
    // NOTES LOGIC
    // ===================================
    addNote() {
        const input = document.getElementById('note-input');
        const text = input.value.trim();
        if (!text) return;

        const tags = [];
        text.replace(/#(\w+)/g, (match, tag) => {
            if (!tags.includes(tag.toLowerCase())) tags.push(tag.toLowerCase());
            return match;
        });

        const notes = JSON.parse(localStorage.getItem('pomodoro_notes') || '[]');
        notes.unshift({ id: Date.now(), text, date: new Date().toISOString(), tags });
        localStorage.setItem('pomodoro_notes', JSON.stringify(notes));

        input.value = '';
        this.renderNotes();
    },

    setNoteFilter(tag) {
        this.state.activeNoteFilter = tag;
        this.renderNotes();
    },
deleteHistoryItem(date) {
    this.state.history = this.state.history.filter(s => s.date !== date);
    localStorage.setItem('pomodoro_history', JSON.stringify(this.state.history));
    this.renderHistory();
    this.renderHeatmap();
    this.renderInsights();
    this.renderStats();
},
    deleteNote(id) {
        let notes = JSON.parse(localStorage.getItem('pomodoro_notes') || '[]');
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('pomodoro_notes', JSON.stringify(notes));
        this.renderNotes();
    },

    renderNotes() {
        const list = document.getElementById('notes-list');
        if (!list) return;
        const notes = JSON.parse(localStorage.getItem('pomodoro_notes') || '[]');

        let allTags = new Set();
        notes.forEach(n => { if (n.tags) n.tags.forEach(t => allTags.add(t)); });

        const filterContainer = document.getElementById('tags-filter');
        if (filterContainer) {
            filterContainer.innerHTML = `<button class="tag-btn ${!this.state.activeNoteFilter ? 'active' : ''}" onclick="app.setNoteFilter(null)">All</button>`;
            Array.from(allTags).forEach(t => {
                filterContainer.innerHTML += `<button class="tag-btn ${this.state.activeNoteFilter === t ? 'active' : ''}" onclick="app.setNoteFilter('${t}')">#${t}</button>`;
            });
            if (allTags.size === 0) filterContainer.innerHTML = '';
        }

        const searchEl = document.getElementById('note-search');
        const searchQ = searchEl ? searchEl.value.trim().toLowerCase() : '';

        list.innerHTML = '';
        let filteredNotes = this.state.activeNoteFilter
            ? notes.filter(n => n.tags && n.tags.includes(this.state.activeNoteFilter))
            : notes;

        if (searchQ) {
            filteredNotes = filteredNotes.filter(n => n.text.toLowerCase().includes(searchQ));
        }

        if (filteredNotes.length === 0) {
            list.innerHTML = '<p class="empty-state">No notes found.</p>';
            return;
        }

        filteredNotes.forEach(n => {
            const d = new Date(n.date);
            const el = document.createElement('div');
            el.className = 'note-item';
            let formattedText = n.text.replace(/</g, '&lt;').replace(/#(\w+)/g, '<span class="note-tag">#$1</span>');
            el.innerHTML = `
                <div class="note-text">${formattedText}</div>
                <div class="note-time">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <button class="btn-delete-note" onclick="app.deleteNote(${n.id})" title="Delete Note">✕</button>
            `;
            list.appendChild(el);
        });
    },
  openJournalPrompt(prompt) {
    const noteInput = document.getElementById('note-input');
    const c = document.getElementById('toast-container');
    if (!c) return;

    const t = document.createElement('div');
    t.className = 'toast toast-journal-prompt';
    t.innerHTML = `
        <div class="toast-icon">📖</div>
        <div class="toast-content">
            <div class="toast-title">${prompt}</div>
            <div class="toast-desc" style="margin-top:6px;">
                <button class="toast-journal-btn" onclick="app.switchTab('notes'); this.closest('.toast').remove();">Open Journal →</button>
            </div>
        </div>
    `;
    c.appendChild(t);

    if (noteInput) noteInput.placeholder = prompt;

    setTimeout(() => {
        t.classList.add('hiding');
        setTimeout(() => t.remove(), 300);
        if (noteInput) noteInput.placeholder = 'Write your thought...';
    }, 8000);
},
	initNotebook() {
    const cover    = document.getElementById('notebook-cover');
    const openBook = document.getElementById('notebook-open');
    if (!cover || !openBook) return;

    const theme = this.state.settings.theme;
    const themes = {
        pink:     { title: 'Rose Diary',        emblem: '🌸',  close: '← Close Diary'    },
        terea:    { title: 'Gym Log',           emblem: '🏋️',  close: '← Close Log'      },
        medical:  { title: 'Clinical Binder',   emblem: '🩺',  close: '← Close Binder'   },
        normal:   { title: 'My Journal',        emblem: '📖',  close: '← Close Journal'  },
    };
    const cfg = themes[theme] || themes.normal;

    const titleEl = document.getElementById('notebook-cover-title');
    if (titleEl) titleEl.textContent = cfg.title;
    const emblemEl = cover.querySelector('.notebook-emblem');
    if (emblemEl) emblemEl.textContent = cfg.emblem;

    // Remove old listener by cloning
    const newCover = cover.cloneNode(true);
    cover.parentNode.replaceChild(newCover, cover);

    newCover.addEventListener('click', () => {
        newCover.classList.add('opening');
        setTimeout(() => {
            newCover.style.display = 'none';
            newCover.classList.remove('opening');
            openBook.style.display = 'block';
            openBook.classList.remove('bookReveal');
            void openBook.offsetWidth; // reflow
            openBook.classList.add('bookReveal');
            this.renderNotes();
        }, 280);
    });

    const existing = document.getElementById('btn-notebook-close');
    if (existing) {
        existing.textContent = cfg.close;
        existing.onclick = () => { openBook.style.display = 'none'; newCover.style.display = 'flex'; };
    } else {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notebook-close-btn';
        closeBtn.id = 'btn-notebook-close';
        closeBtn.textContent = cfg.close;
        openBook.appendChild(closeBtn);
        closeBtn.addEventListener('click', () => {
            openBook.style.display = 'none';
            newCover.style.display = 'flex';
        });
    }
},

async downloadAsDocx(title, textContent) {
    if (!window.docx) {
        // Fallback: plain .txt
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (title || 'notes').replace(/[^a-z0-9 ]/gi, '_') + '.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        return;
    }
    try {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
        const lines = textContent.split('\n');
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: '' }),
                    ...lines.map(l => new Paragraph({ children: [new TextRun(l)] }))
                ]
            }]
        });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (title || 'notes').replace(/[^a-z0-9 ]/gi, '_') + '.docx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch(err) {
        console.warn('docx export error', err);
        this.showToast('Export error', String(err), '⚠️');
    }
},

downloadNotes() {
    const notes = JSON.parse(localStorage.getItem('pomodoro_notes') || '[]');
    if (!notes.length) { this.showToast('No journal entries to download', '', '📭'); return; }
    const text = notes.map((n, i) => {
        const date = n.date ? new Date(n.date).toLocaleDateString() : '';
        const header = `Entry ${i + 1}${date ? ' — ' + date : ''}`;
        return `${header}\n${n.text || ''}`;
    }).join('\n\n---\n\n');
    this.downloadAsDocx('My Journal', text);
},

    // ===================================
    // DB & WALLPAPERS
    // ===================================
    initDB() {
        return new Promise((resolve) => {
            const req = indexedDB.open('pomodoro_db', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('wallpapers')) {
                    db.createObjectStore('wallpapers', { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
        });
    },

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const id = 'wp_' + Date.now();
            const db = await this.initDB();
            const tx = db.transaction('wallpapers', 'readwrite');
            tx.objectStore('wallpapers').put({ id, data: ev.target.result });
            tx.oncomplete = () => {
                this.loadCustomWallpapers();
                this.setWallpaper(id);
            };
        };
        reader.readAsDataURL(file);
    },

    async loadCustomWallpapers() {
        const db = await this.initDB();
        const tx = db.transaction('wallpapers', 'readonly');
        const req = tx.objectStore('wallpapers').getAll();
        req.onsuccess = () => {
            const gallery = document.getElementById('wallpaper-gallery');
            if (!gallery) return;
            gallery.innerHTML = '';
            req.result.forEach(wp => {
                const img = document.createElement('img');
                img.src = wp.data;
                img.className = 'gallery-img' + (this.state.settings.wallpaper === wp.id ? ' active' : '');
                img.onclick = () => {
                    this.setWallpaper(wp.id);
                    document.querySelectorAll('.gallery-img').forEach(i => i.classList.remove('active'));
                    img.classList.add('active');
                };
                gallery.appendChild(img);
            });
        };
    },

    // ===================================
    // ACHIEVEMENTS
    // ===================================
	showEndOfDaySummary() {
    const todaySessions = this.state.history.filter(s => {
        if (s.type !== 'focus') return false;
        const d = new Date(s.date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    });

    if (todaySessions.length === 0) return;

    const totalMins = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    const xpToday = todaySessions.length * 15;
    const goalPct = Math.min(100, (todaySessions.length / this.state.settings.dailyGoal) * 100);

    // Best hour today
    const hourMap = {};
    todaySessions.forEach(s => {
        const h = new Date(s.date).getHours();
        hourMap[h] = (hourMap[h] || 0) + s.duration;
    });
    const bestH = Object.keys(hourMap).reduce((a, b) => hourMap[a] > hourMap[b] ? a : b, 0);
    const bestHourStr = Object.keys(hourMap).length > 0 ? `${bestH}:00` : '—';

    // Subtitle based on performance
    const goal = this.state.settings.dailyGoal;
    const pct = todaySessions.length / goal;
    const subtitles = pct >= 1
        ? ["Crushed it today! 🔥", "Goal achieved. Legend.", "You showed up. Every. Single. Time."]
        : pct >= 0.5
        ? ["Solid effort today.", "More than half way there!", "Good progress. Tomorrow, more."]
        : ["Every session counts.", "You started. That matters.", "Small steps, big results."];
    const subtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

    document.getElementById('eod-sessions').textContent = todaySessions.length;
    document.getElementById('eod-minutes').textContent = `${totalMins}m`;
    document.getElementById('eod-xp').textContent = `+${xpToday}`;
    document.getElementById('eod-hour').textContent = bestHourStr;
    document.getElementById('eod-goal-text').textContent = `${todaySessions.length} / ${goal}`;
    document.getElementById('eod-subtitle').textContent = subtitle;

    // Animate bar after short delay so transition fires
    const fill = document.getElementById('eod-bar-fill');
    if (fill) {
        fill.style.width = '0%';
        setTimeout(() => { fill.style.width = `${goalPct}%`; }, 100);
    }

    document.getElementById('eod-modal').style.display = 'flex';
},
initOnboarding() {
    const seen = localStorage.getItem('pomodoro_onboarded');
    if (seen) return;

    const steps = [
        {
            icon: '🍅',
            title: 'Welcome to Pomodoro Focus',
            desc: 'The Pomodoro technique helps you focus in short, powerful bursts. Work 25 minutes, then take a 5-minute break. Repeat 4 times, then take a longer break.'
        },
        {
            icon: '⏱️',
            title: 'The Session Dots',
            desc: 'The dots below the timer show your progress through a cycle. Each dot is one focus session. After 4 sessions you earn a long break — you\'ve earned it.'
        },
        {
            icon: '🎛️',
            title: 'Ambient Mixer',
            desc: 'Blend background sounds to create your perfect focus environment. Drag the sliders to mix rain, café noise, jazz and more. Your mix is saved automatically.'
        },
        {
            icon: '🎯',
            title: 'Set Your Intention',
            desc: 'Before each session, write what you\'re working on. Add subtasks to check off as you go. Your focus history builds over time — track your progress in the Stats tab.'
        }
    ];

    let current = 0;
    const overlay = document.getElementById('onboarding-overlay');
    const icon = document.getElementById('onboarding-icon');
    const title = document.getElementById('onboarding-title');
    const desc = document.getElementById('onboarding-desc');
    const dots = document.querySelectorAll('.ob-dot');
    const btnNext = document.getElementById('btn-ob-next');
    const btnSkip = document.getElementById('btn-ob-skip');

    if (!overlay) return;
    overlay.style.display = 'flex';

    const goTo = (idx) => {
        current = idx;
        const s = steps[idx];
        icon.style.opacity = '0';
        title.style.opacity = '0';
        desc.style.opacity = '0';
        setTimeout(() => {
            icon.textContent = s.icon;
            title.textContent = s.title;
            desc.textContent = s.desc;
            icon.style.opacity = '1';
            title.style.opacity = '1';
            desc.style.opacity = '1';
        }, 150);
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        btnNext.textContent = idx === steps.length - 1 ? 'Get Started 🚀' : 'Next →';
    };

    // Add fade transitions
    [icon, title, desc].forEach(el => {
        el.style.transition = 'opacity 0.15s ease';
    });

    btnNext.addEventListener('click', () => {
        if (current < steps.length - 1) {
            goTo(current + 1);
        } else {
            overlay.style.display = 'none';
            localStorage.setItem('pomodoro_onboarded', '1');
        }
    });

    btnSkip.addEventListener('click', () => {
        overlay.style.display = 'none';
        localStorage.setItem('pomodoro_onboarded', '1');
    });
},
    checkAchievements() {
        const aList = [
            { id: 'first_blood', name: 'First Focus', desc: 'Complete 1 session', req: () => this.state.totalSessions > 0, icon: '🎯' },
            { id: 'streak_3', name: 'On a Roll', desc: 'Complete 3 sessions today', req: () => this.state.sessionsToday >= 3, icon: '🔥' },
            { id: 'daily_goal', name: 'Goal Crusher', desc: 'Hit your daily goal', req: () => this.state.sessionsToday >= this.state.settings.dailyGoal, icon: '👑' },
            { id: 'century', name: 'Centurion', desc: '100 total sessions', req: () => this.state.totalSessions >= 100, icon: '🏛️' },
        ];

        let unlocked = JSON.parse(localStorage.getItem('pomodoro_ach_v2') || '[]');
        const grid = document.getElementById('achievements-grid');
        if (grid) grid.innerHTML = '';

        aList.forEach(a => {
            const isUn = unlocked.includes(a.id);
            if (!isUn && a.req()) {
                unlocked.push(a.id);
                localStorage.setItem('pomodoro_ach_v2', JSON.stringify(unlocked));
                this.showToast('Achievement Unlocked!', a.name, a.icon);
            }
            if (grid) {
                const el = document.createElement('div');
                el.className = `achievement-card ${unlocked.includes(a.id) ? 'unlocked' : ''}`;
                el.innerHTML = `<span class="achievement-icon">${a.icon}</span><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div>`;
                grid.appendChild(el);
            }
        });
    },
		renderTagBreakdown() {
		const container = document.getElementById('tag-breakdown-list');
		if (!container) return;
		const tagCounts = {};
		this.state.history.forEach(s => {
			if (s.type === 'focus' && s.label) {
				const tag = s.label.trim();
				if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
			}
		});
		const entries = Object.entries(tagCounts).sort((a,b) => b[1] - a[1]);
		if (!entries.length) {
			container.innerHTML = '<p class="empty-state">No tagged sessions yet.</p>';
			return;
		}
		const maxCount = entries[0][1];
		container.innerHTML = entries.map(([tag, count]) => {
			const pct = Math.round((count / maxCount) * 100);
			return `<div class="tag-row"><span class="tag-label">${tag}</span><div class="tag-bar-wrap"><div class="tag-bar" style="width:${pct}%"></div></div><span class="tag-count">${count}</span></div>`;
		}).join('');
	},
	saveCurrentMix() {
		const input = document.getElementById('atm-mix-name');
		const name = input ? input.value.trim() : '';
		if (!name) { if (input) input.focus(); return; }
		const saved = JSON.parse(localStorage.getItem('pomodoro_custom_moods') || '{}');
		saved[name.trim()] = { ...this.state.mixerVolumes };
		localStorage.setItem('pomodoro_custom_moods', JSON.stringify(saved));
		if (input) input.value = '';
		this.showToast('Mix saved!', name, '🎵');
		this.renderSavedMixes?.();
	},
	renderSavedMixes() {
		const container = document.getElementById('atm-saved-mixes');
		if (!container) return;
		const saved = JSON.parse(localStorage.getItem('pomodoro_custom_moods') || '{}');
		const keys = Object.keys(saved);
		if (!keys.length) { container.innerHTML = ''; return; }
		container.innerHTML = keys.map(k => `
			<button class="atm-saved-chip" onclick="app.activateMood('${k.replace(/'/g, '&#39;')}')">
				${k}
				<span class="atm-chip-del" onclick="event.stopPropagation();app.deleteCustomMood('${k.replace(/'/g, '&#39;')}')">✕</span>
			</button>`).join('');
	},
	deleteCustomMood(key) {
		const saved = JSON.parse(localStorage.getItem('pomodoro_custom_moods') || '{}');
		delete saved[key];
		localStorage.setItem('pomodoro_custom_moods', JSON.stringify(saved));
		this.showToast('Mix deleted', key, '🗑️');
		this.renderSavedMixes();
	},
	updateRingGradient() {
				const grad = document.getElementById('timer-grad');
				const progressEl = document.getElementById('timer-progress');
				const glowEl = document.getElementById('timer-glow');
				if (!grad || !progressEl) return;
				const accent = (getComputedStyle(document.body).getPropertyValue('--accent') || getComputedStyle(document.documentElement).getPropertyValue('--accent')).trim();
				if (!accent) return;
				const stops = grad.querySelectorAll('stop');
				if (stops[0]) stops[0].setAttribute('stop-color', accent);
				if (stops[1]) { stops[1].setAttribute('stop-color', accent); stops[1].setAttribute('stop-opacity', '0.4'); }
				progressEl.style.stroke = 'url(#timer-grad)';
		progressEl.setAttribute('stroke', 'url(#timer-grad)');
				if (glowEl) glowEl.style.stroke = 'url(#timer-grad)';
		if (glowEl) glowEl.setAttribute('stroke', 'url(#timer-grad)');
			},

	};

app.init();
