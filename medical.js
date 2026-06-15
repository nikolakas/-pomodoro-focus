/* ============================================
   MEDICAL STUDY MODULE
   Plan → Review → Summary  |  Flashcard + Rapid Recall + Missed Queue
   Supports CSV/TSV import (Anki-compatible)
   ============================================ */

window.MedicalModule = (() => {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  const TOPICS = [
    { id: 'cardiology',   name: 'Cardiology',    icon: '❤️',  color: '#ef4444' },
    { id: 'neurology',    name: 'Neurology',     icon: '🧠',  color: '#8b5cf6' },
    { id: 'pharmacology', name: 'Pharmacology',  icon: '💊',  color: '#06b6d4' },
    { id: 'anatomy',      name: 'Anatomy',       icon: '🦴',  color: '#f59e0b' },
    { id: 'pathology',    name: 'Pathology',     icon: '🔬',  color: '#ec4899' },
    { id: 'renal',        name: 'Renal',         icon: '💧',  color: '#3b82f6' },
    { id: 'pulmonology',  name: 'Pulmonology',   icon: '🫁',  color: '#14b8a6' },
    { id: 'gastro',       name: 'GI / Gastro',   icon: '🩺',  color: '#84cc16' },
    { id: 'general',      name: 'General',       icon: '📋',  color: '#64748b' }
  ];

  const MODES = [
    { id: 'flashcard', name: 'Flashcard Review', icon: '📚', desc: 'Flip cards, rate recall confidence' },
    { id: 'rapid',     name: 'Rapid Recall',     icon: '⚡', desc: '30 s per card — fast fact sprints' },
    { id: 'missed',    name: 'Missed Queue',      icon: '🔄', desc: 'Focus on cards you got wrong' },
    { id: 'flagged',   name: 'Flagged Cards',     icon: '🚩', desc: 'Review cards you flagged as difficult' }
  ];

  // ── State ───────────────────────────────────────────────────────
  let initialized = false;
  let st = {
    view: 'plan',
    topic: null,
    mode: 'flashcard',
    cardSource: 'manual',
    manualCards: [{ front: '', back: '' }],
    cards: [],
    idx: 0,
    revealed: false,
    session: { easy: [], unsure: [], missed: [], flagged: [] },
    timerSec: 0,
    timerIv: null,
    rapidTO: null,
    examDate: localStorage.getItem('med_exam_date') || ''
  };

  // ── Persistence ─────────────────────────────────────────────────
  const getMissed   = () => { try { return JSON.parse(localStorage.getItem('med_missed')   || '[]'); } catch { return []; } };
  const setMissed   = (arr) => localStorage.setItem('med_missed',   JSON.stringify(arr));
  const getFlagged  = () => { try { return JSON.parse(localStorage.getItem('med_flagged')  || '[]'); } catch { return []; } };
  const setFlagged  = (arr) => localStorage.setItem('med_flagged',  JSON.stringify(arr));

  // ── Utilities ───────────────────────────────────────────────────
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const shuffle = (arr) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const $ = (id) => document.getElementById(id);
  const setHtml = (id, h) => { const el=$(id); if(el) el.innerHTML=h; };
  const setText = (id, t) => { const el=$(id); if(el) el.textContent=t; };
  const show = (id) => { const el=$(id); if(el) el.style.display=''; };
  const hide = (id) => { const el=$(id); if(el) el.style.display='none'; };
  const setDisplay = (id, v) => { const el=$(id); if(el) el.style.display=v; };

  // ── CSV/TSV Parser ───────────────────────────────────────────────
  function parseCards(text) {
    const lines = text.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
    return lines.reduce((acc, line) => {
      const sep = line.includes('\t') ? '\t' : ',';
      const parts = line.split(sep);
      if (parts.length >= 2) {
        const front = parts[0].trim().replace(/^["']|["']$/g, '');
        const back  = parts.slice(1).join(sep).trim().replace(/^["']|["']$/g, '');
        if (front && back) acc.push({ front, back, topic: st.topic?.id || 'general' });
      }
      return acc;
    }, []);
  }

  // ── Timer ────────────────────────────────────────────────────────
  function startTimer() {
    st.timerSec = 0;
    clearInterval(st.timerIv);
    st.timerIv = setInterval(() => { st.timerSec++; updateTimerEl(); }, 1000);
  }
  function stopTimer() { clearInterval(st.timerIv); st.timerIv = null; }
  function updateTimerEl() {
    const el = $('med-timer-time');
    if (!el) return;
    const m = String(Math.floor(st.timerSec/60)).padStart(2,'0');
    const s = String(st.timerSec%60).padStart(2,'0');
    el.textContent = `${m}:${s}`;
  }

  // ── View switcher ────────────────────────────────────────────────
  function showView(v) {
    ['plan','review','summary'].forEach(n => {
      const el = $(`med-view-${n}`);
      if (el) el.style.display = n===v ? 'block' : 'none';
    });
    st.view = v;
  }

  // ── Plan renderers ───────────────────────────────────────────────
  function renderTopics() {
    const grid = $('med-topic-grid');
    if (!grid) return;
    grid.innerHTML = TOPICS.map(t => `
      <button class="med-topic-btn${st.topic?.id===t.id?' active':''}" data-topic="${t.id}" style="--tc:${t.color}">
        <span class="med-topic-icon">${t.icon}</span>
        <span class="med-topic-name">${t.name}</span>
      </button>`).join('');
    grid.querySelectorAll('.med-topic-btn').forEach(btn =>
      btn.addEventListener('click', () => { st.topic = TOPICS.find(t=>t.id===btn.dataset.topic); renderTopics(); })
    );
  }

  function renderModes() {
    const list = $('med-mode-list');
    if (!list) return;
    list.innerHTML = MODES.map(m => `
      <button class="med-mode-btn${st.mode===m.id?' active':''}" data-mode="${m.id}">
        <span class="med-mode-icon">${m.icon}</span>
        <div class="med-mode-info">
          <span class="med-mode-name">${m.name}</span>
          <span class="med-mode-desc">${m.desc}</span>
        </div>
      </button>`).join('');
    list.querySelectorAll('.med-mode-btn').forEach(btn =>
      btn.addEventListener('click', () => { st.mode = btn.dataset.mode; renderModes(); syncMissedMode(); })
    );
  }

  function syncMissedMode() {
    const missed  = getMissed();
    const isSpecial = st.mode === 'missed' || st.mode === 'flagged';
    setDisplay('med-source-section', isSpecial ? 'none' : 'block');
    const info = $('med-missed-info');
    if (info) info.style.display = (missed.length > 0 && !isSpecial) ? 'flex' : 'none';
    setText('med-missed-count', missed.length);
  }

  function renderManualCards() {
    const list = $('med-manual-list');
    if (!list) return;
    list.innerHTML = st.manualCards.map((c,i) => `
      <div class="med-card-entry">
        <span class="med-entry-num">${i+1}</span>
        <div class="med-entry-fields">
          <input class="med-input" placeholder="Question / Term" value="${esc(c.front)}" data-i="${i}" data-f="front">
          <input class="med-input" placeholder="Answer / Definition" value="${esc(c.back)}" data-i="${i}" data-f="back">
        </div>
        <button class="med-entry-del" data-i="${i}" title="Remove">×</button>
      </div>`).join('');
    list.querySelectorAll('[data-i][data-f]').forEach(inp =>
      inp.addEventListener('input', e => { st.manualCards[+e.target.dataset.i][e.target.dataset.f] = e.target.value; })
    );
    list.querySelectorAll('.med-entry-del').forEach(btn =>
      btn.addEventListener('click', e => {
        if (st.manualCards.length > 1) { st.manualCards.splice(+e.currentTarget.dataset.i, 1); renderManualCards(); }
      })
    );
  }

  function updateExamCountdown() {
    const el = $('med-exam-countdown');
    if (!el || !st.examDate) { if(el) el.textContent=''; return; }
    const days = Math.ceil((new Date(st.examDate) - new Date()) / 86400000);
    el.textContent = days > 0 ? `${days}d` : days===0 ? 'Today!' : 'Passed';
    el.style.color = days <= 7 ? '#ef4444' : days <= 21 ? '#f59e0b' : '#90e0ef';
  }

  // ── Plan view ────────────────────────────────────────────────────
  function renderPlan() {
    showView('plan');
    renderTopics();
    renderModes();
    renderManualCards();
    syncMissedMode();
    updateExamCountdown();
    const examEl = $('med-exam-date');
    if (examEl && st.examDate) examEl.value = st.examDate;
    setText('med-current-topic', '—');
    setText('med-card-count', '—');
    $('med-timer-time').textContent = '00:00';
  }

  // ── Session start ────────────────────────────────────────────────
  function startSession() {
    let cards = [];

    if (st.mode === 'flagged') {
      cards = getFlagged();
      if (!cards.length) {
        showToast('No flagged cards yet — flag cards during a session with the 🚩 button.'); return;
      }
    } else if (st.mode === 'missed') {
      cards = getMissed();
      if (!cards.length) {
        showToast('No missed cards yet — complete a session first.'); return;
      }
    } else if (st.cardSource === 'import') {
      const text = $('med-import-text')?.value || '';
      cards = parseCards(text);
      if (!cards.length) {
        showToast('No cards parsed. Format: front, back (one per line)'); return;
      }
    } else {
      cards = st.manualCards
        .filter(c => c.front.trim() && c.back.trim())
        .map(c => ({ front: c.front.trim(), back: c.back.trim(), topic: st.topic?.id||'general' }));
      if (!cards.length) {
        showToast('Add at least one card with front and back filled in.'); return;
      }
    }

    if (st.mode === 'rapid') cards = shuffle(cards).slice(0, 20);
    else cards = shuffle(cards);

    st.cards = cards;
    st.idx = 0;
    st.revealed = false;
    st.session = { easy: [], unsure: [], missed: [] };

    setText('med-current-topic', st.topic?.name || 'General');
    startTimer();
    showView('review');
    renderCard();
  }

  // ── Card rendering ───────────────────────────────────────────────
  function updateProgress() {
    const pct = st.cards.length ? (st.idx / st.cards.length) * 100 : 0;
    const fill = $('med-progress-fill');
    if (fill) fill.style.width = pct + '%';
    setText('med-card-count', `${st.idx+1}/${st.cards.length}`);
  }

  function renderCard() {
    if (st.idx >= st.cards.length) { endSession(); return; }

    const card = st.cards[st.idx];
    const cardEl = $('med-card');
    if (cardEl) cardEl.classList.remove('flipped');

    setText('med-card-question', card.front);
    setText('med-card-answer',   card.back);

    const topic = TOPICS.find(t => t.id === (card.topic||st.topic?.id||'general')) || TOPICS[TOPICS.length-1];
    const catEl = $('med-card-category');
    if (catEl) { catEl.textContent = topic.name; catEl.style.color = topic.color; catEl.style.borderColor = topic.color; }

    show('med-actions-reveal');
    hide('med-actions-confidence');
    st.revealed = false;
    // Reset flag button
    const flagBtn = $('btn-med-flag');
    if (flagBtn) { flagBtn.textContent = '🚩 Flag'; flagBtn.style.opacity = ''; flagBtn.disabled = false; }

    updateProgress();

    // Rapid mode countdown
    clearTimeout(st.rapidTO);
    const cntEl = $('med-rapid-countdown');
    if (st.mode === 'rapid') {
      let sec = 30;
      if (cntEl) { cntEl.textContent = `⏱ ${sec}s`; cntEl.style.display = 'block'; }
      const tick = () => {
        sec--;
        if (cntEl) cntEl.textContent = `⏱ ${sec}s`;
        if (sec <= 0) { markCard('missed'); }
        else { st.rapidTO = setTimeout(tick, 1000); }
      };
      st.rapidTO = setTimeout(tick, 1000);
    } else {
      if (cntEl) cntEl.style.display = 'none';
    }
  }

  function revealCard() {
    const cardEl = $('med-card');
    if (cardEl) cardEl.classList.add('flipped');
    hide('med-actions-reveal');
    show('med-actions-confidence');
    st.revealed = true;
    clearTimeout(st.rapidTO);
    const cntEl = $('med-rapid-countdown');
    if (cntEl) cntEl.style.display = 'none';
  }

  function flagCurrentCard() {
    const card = st.cards[st.idx];
    const existing = getFlagged();
    if (!existing.find(c => c.front === card.front)) {
      existing.push(card);
      setFlagged(existing);
    }
    const btn = $('btn-med-flag');
    if (btn) { btn.textContent = '✅ Flagged'; btn.style.opacity = '0.6'; btn.disabled = true; }
  }

  function markCard(conf) {
    if (conf === 'flag') { flagCurrentCard(); return; }
    if (!st.revealed && conf !== 'missed') { revealCard(); return; }
    if (!st.session[conf]) st.session[conf] = [];
    st.session[conf].push(st.cards[st.idx]);
    st.idx++;
    // Brief pause before next card
    const cardEl = $('med-card');
    if (cardEl) { cardEl.style.opacity = '0'; cardEl.style.transform = 'translateY(-8px)'; }
    setTimeout(() => {
      if (cardEl) { cardEl.style.opacity = ''; cardEl.style.transform = ''; }
      renderCard();
    }, 200);
  }

  // ── Session end ──────────────────────────────────────────────────
  function endSession() {
    stopTimer();
    clearTimeout(st.rapidTO);

    // Merge missed cards into persistent queue, remove cards mastered (easy)
    const existing = getMissed();
    const merged = [...existing];
    st.session.missed.forEach(c => { if (!merged.find(x => x.front===c.front)) merged.push(c); });
    const cleaned = merged.filter(c => !st.session.easy.find(e => e.front===c.front));
    setMissed(cleaned);

    showView('summary');
    renderSummary();
  }

  function renderSummary() {
    const { easy, unsure, missed } = st.session;
    const sessionFlagged = getFlagged();
    const total = st.cards.length;
    const score = total ? Math.round((easy.length / total) * 100) : 0;
    let grade = 'F';
    if (score>=95) grade='A+'; else if (score>=85) grade='A'; else if (score>=75) grade='B+';
    else if (score>=65) grade='B'; else if (score>=55) grade='C'; else if (score>=40) grade='D';

    setText('med-stat-easy',   easy.length);
    setText('med-stat-unsure', unsure.length);
    setText('med-stat-missed', missed.length);
    setText('med-stat-flag',   sessionFlagged.length);

    const gradeEl = $('med-summary-grade');
    if (gradeEl) {
      gradeEl.textContent = grade;
      gradeEl.style.color = score>=75 ? '#14b8a6' : score>=55 ? '#f59e0b' : '#ef4444';
    }

    const m = Math.floor(st.timerSec/60), s = st.timerSec%60;
    setText('med-summary-meta', `${st.topic?.name||'General'} · ${m}m ${s}s · ${total} cards`);

    const missedList = $('med-missed-list');
    if (missedList) {
      if (missed.length) {
        missedList.style.display = 'block';
        missedList.innerHTML = `<div class="med-missed-title">Missed (${missed.length})</div>` +
          missed.map(c => `<div class="med-missed-card"><div class="med-missed-q">${esc(c.front)}</div><div class="med-missed-a">${esc(c.back)}</div></div>`).join('');
      } else { missedList.style.display = 'none'; }
    }

    const flaggedList = $('med-flagged-list');
    if (flaggedList) {
      if (sessionFlagged.length) {
        flaggedList.style.display = 'block';
        flaggedList.innerHTML = `<div class="med-missed-title">Flagged as Difficult (${sessionFlagged.length})</div>` +
          sessionFlagged.map(c => `<div class="med-missed-card"><div class="med-missed-q">🚩 ${esc(c.front)}</div><div class="med-missed-a">${esc(c.back)}</div></div>`).join('');
      } else { flaggedList.style.display = 'none'; }
    }

    const retryBtn = $('btn-med-retry');
    if (retryBtn) retryBtn.style.display = missed.length ? 'inline-flex' : 'none';
    const flagRetryBtn = $('btn-med-flag-retry');
    if (flagRetryBtn) flagRetryBtn.style.display = sessionFlagged.length ? 'inline-flex' : 'none';
  }

  // ── Toast ────────────────────────────────────────────────────────
  function showToast(msg) {
    if (window.app?.showToast) { window.app.showToast(msg, '', '⚠️'); return; }
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e3a5f;color:#e2f0ff;padding:10px 18px;border-radius:10px;font-size:.85rem;z-index:9999;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Card source toggle ───────────────────────────────────────────
  function setSource(src) {
    st.cardSource = src;
    document.querySelectorAll('.med-source-btn').forEach(b => b.classList.toggle('active', b.dataset.source===src));
    setDisplay('med-manual-entry', src==='manual' ? 'block' : 'none');
    setDisplay('med-import-area',  src==='import' ? 'block' : 'none');
  }

  // ── Init / bind ──────────────────────────────────────────────────
  function bindEvents() {
    // Source toggle
    document.querySelectorAll('.med-source-btn').forEach(btn =>
      btn.addEventListener('click', () => setSource(btn.dataset.source))
    );

    // Add card
    const addBtn = $('btn-med-add-card');
    if (addBtn) addBtn.addEventListener('click', () => { st.manualCards.push({front:'',back:''}); renderManualCards(); });

    // File import
    const fileIn = $('med-import-file');
    if (fileIn) fileIn.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const ta = $('med-import-text'); if (ta) ta.value = ev.target.result;
        showImportPreview(parseCards(ev.target.result));
      };
      reader.readAsText(f);
    });

    // Parse button
    const parseBtn = $('btn-med-parse');
    if (parseBtn) parseBtn.addEventListener('click', () => {
      const text = $('med-import-text')?.value||'';
      showImportPreview(parseCards(text));
    });

    // Start
    const startBtn = $('btn-med-start');
    if (startBtn) startBtn.addEventListener('click', startSession);

    // Reveal
    const revealBtn = $('btn-med-reveal');
    if (revealBtn) revealBtn.addEventListener('click', revealCard);

    // Confidence
    document.querySelectorAll('.med-conf-btn').forEach(btn =>
      btn.addEventListener('click', () => markCard(btn.dataset.confidence))
    );

    // Card flip on click
    const cardEl = $('med-card');
    if (cardEl) cardEl.addEventListener('click', () => { if (!st.revealed) revealCard(); });

    // End session
    const endBtn = $('btn-med-end');
    if (endBtn) endBtn.addEventListener('click', endSession);

    // Retry missed
    const retryBtn = $('btn-med-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => { st.mode = 'missed'; startSession(); });

    // Retry flagged
    const flagRetryBtn = $('btn-med-flag-retry');
    if (flagRetryBtn) flagRetryBtn.addEventListener('click', () => { st.mode = 'flagged'; startSession(); });

    // New session
    const newBtn = $('btn-med-new');
    if (newBtn) newBtn.addEventListener('click', () => { stopTimer(); renderPlan(); });

    // Exam date
    const examEl = $('med-exam-date');
    if (examEl) examEl.addEventListener('change', e => {
      st.examDate = e.target.value;
      localStorage.setItem('med_exam_date', st.examDate);
      updateExamCountdown();
    });

    // Keyboard shortcuts (only active in review view)
    document.addEventListener('keydown', e => {
      if (st.view !== 'review') return;
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      if (e.code==='Space' && !st.revealed) { e.preventDefault(); revealCard(); }
      if (e.key==='f' || e.key==='F') { e.preventDefault(); flagCurrentCard(); }
      if (st.revealed) {
        if (e.key==='1') markCard('easy');
        if (e.key==='2') markCard('unsure');
        if (e.key==='3') markCard('missed');
      }
    });
  }

  function showImportPreview(cards) {
    const el = $('med-import-preview');
    if (!el) return;
    el.style.display = 'block';
    if (!cards.length) {
      el.innerHTML = '<div class="med-import-error">No cards found. Check format: front, back</div>';
      return;
    }
    const preview = cards.slice(0,3).map(c =>
      `<div class="med-import-sample"><span class="med-import-front">${esc(c.front)}</span><span class="med-import-sep">→</span><span class="med-import-back">${esc(c.back)}</span></div>`
    ).join('');
    el.innerHTML = `<div class="med-import-count">✓ ${cards.length} card${cards.length!==1?'s':''} ready</div>${preview}${cards.length>3?`<div class="med-import-more">+ ${cards.length-3} more</div>`:''}`;
  }

  function init() {
    if (!initialized) { bindEvents(); initialized = true; }
    renderPlan();
  }

  // ── Post-it motivation notes ─────────────────────────────────────
  const POSTIT_QUOTES = [
    'One step at a time.\nYou\'re building something extraordinary.',
    'The anatomy atlas\nlooked impossible too.\nLook at you now.',
    'Every great clinician\nstarted exactly where you are.',
    'You don\'t have to have\nit all figured out.\nJust show up today.',
    'Your future patients\nneed you to keep going.',
    'Rest is not laziness —\nit\'s part of studying.',
    'Hard days mean\nyou\'re doing hard things.',
    'You chose this path\nbecause you care.\nThat matters.',
    'Confusion now =\nclarity later.\nTrust the process.',
    'Coffee + determination\n= clinical competence.',
    'You will look back\non this and feel\nso proud.',
    'The world needs doctors\nwho care as much as you do.',
    'Tired today.\nTenacious tomorrow.',
    'Your brain is building\nconnections you can\'t\neven see yet.',
    'Medicine is a marathon.\nYou\'re still in the race.',
    'The people who\nstick with it\nchange the world.',
    'Still here?\nThat\'s the whole thing.\nJust stay.',
    'The Krebs cycle\nwasn\'t learned in a day.\nNeither is medicine.',
    'First year felt impossible.\nYou survived it.',
    'Diagnosis is an art.\nYou are becoming an artist.',
  ];

  const POSTIT_COLORS = [
    '#fff176', '#fff59d', '#f8bbd0', '#f48fb1',
    '#b3e5fc', '#81d4fa', '#c8e6c9', '#a5d6a7',
    '#e1bee7', '#ffcc80', '#b2dfdb', '#ffecb3',
  ];

  let _postitIdx = Math.floor(Math.random() * POSTIT_QUOTES.length);
  let _postitColorIdx = 0;

  function addPostIt() {
    const container = document.getElementById('med-postits');
    if (!container) return;

    // Limit to 12 visible at once
    while (container.children.length >= 12) container.firstChild.remove();

    const quote = POSTIT_QUOTES[_postitIdx % POSTIT_QUOTES.length];
    const color = POSTIT_COLORS[_postitColorIdx % POSTIT_COLORS.length];
    _postitIdx++;
    _postitColorIdx++;

    const deg = (Math.random() * 14 - 7).toFixed(1);
    // Random position avoiding center of screen and tab bar
    const safeTop  = 8 + Math.random() * 60;   // 8%–68% from top
    const safeLeft = 2 + Math.random() * 72;    // 2%–74% from left

    const el = document.createElement('div');
    el.className = 'med-postit';

    // Convert % to px for draggable positioning
    const startLeft = Math.round(window.innerWidth  * safeLeft  / 100);
    const startTop  = Math.round(window.innerHeight * safeTop   / 100);

    el.style.cssText = `
      background: ${color};
      left: ${startLeft}px;
      top:  ${startTop}px;
      --rot: rotate(${deg}deg);
      transform: rotate(${deg}deg);
    `;
    el.innerHTML = `
      <div class="med-postit-handle" title="Drag"></div>
      <button class="med-postit-close" title="Remove" onclick="this.parentElement.remove()">×</button>
      <span class="med-postit-text">${quote.replace(/\n/g, '<br>')}</span>
    `;

    // Pointer-events drag
    const handle = el.querySelector('.med-postit-handle');
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      el.style.transform = 'rotate(' + deg + 'deg) scale(1.04)';
      el.style.zIndex = '9999';
      el.style.transition = 'none';

      const onMove = ev => {
        el.style.left = (ev.clientX - ox) + 'px';
        el.style.top  = (ev.clientY - oy) + 'px';
      };
      const onUp = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup',   onUp);
        el.style.transform = 'rotate(' + deg + 'deg)';
        el.style.zIndex = '';
        el.style.transition = '';
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup',   onUp);
    });

    container.appendChild(el);
  }

  // ── Canvas ECG animation ─────────────────────────────────────────
  let _ecgCanvas = null;
  let _ecgCtx    = null;
  let _ecgRaf    = null;
  let _ecgBuf    = null; // Float32Array of y values, length = canvas width
  let _ecgCursor = 0;
  let _ecgFrame  = 0;

  // PQRST waveform: given a phase 0-1 within one heartbeat cycle, returns y offset (-1..1)
  function _pqrstY(phase) {
    // Flatten the intervals to taste
    if (phase < 0.07)  return phase / 0.07 * 0.12 - 0.06;           // P rise
    if (phase < 0.12)  return (1 - (phase - 0.07) / 0.05) * 0.12 - 0.06; // P fall
    if (phase < 0.18)  return -0.06;                                   // PR segment
    if (phase < 0.20)  return -0.06 - (phase - 0.18) / 0.02 * 0.2;  // Q dip
    if (phase < 0.22)  return -0.26 + (phase - 0.20) / 0.02 * 1.26; // R rise
    if (phase < 0.25)  return 1.0 - (phase - 0.22) / 0.03 * 1.3;    // R fall to S
    if (phase < 0.27)  return -0.3 + (phase - 0.25) / 0.02 * 0.3;   // S recovery
    if (phase < 0.34)  return 0.0;                                     // ST segment
    if (phase < 0.46)  return Math.sin((phase - 0.34) / 0.12 * Math.PI) * 0.28; // T wave
    return 0;
  }

  function startECG() {
    stopECG();
    _ecgCanvas = document.getElementById('med-ecg-canvas');
    if (!_ecgCanvas) return;
    _ecgCtx = _ecgCanvas.getContext('2d');

    function resize() {
      _ecgCanvas.width  = _ecgCanvas.offsetWidth  || window.innerWidth;
      _ecgCanvas.height = _ecgCanvas.offsetHeight || 60;
      _ecgBuf = new Float32Array(_ecgCanvas.width).fill(0.5);
      _ecgCursor = 0;
    }
    resize();
    window.addEventListener('resize', resize);
    _ecgCanvas._ecgResizeFn = resize;

    // pixels per second: one heartbeat cycle = ~120px wide (slow & calm)
    const CYCLE_PX = 130;
    let lastTs = null;

    function draw(ts) {
      _ecgRaf = requestAnimationFrame(draw);
      if (!lastTs) { lastTs = ts; return; }
      const dt = Math.min(ts - lastTs, 50); // cap at 50ms
      lastTs = ts;

      const W = _ecgCanvas.width;
      const H = _ecgCanvas.height;
      const SPEED = 28; // px per second

      const pixelsToAdvance = Math.max(1, Math.round(dt / 1000 * SPEED));

      for (let i = 0; i < pixelsToAdvance; i++) {
        _ecgFrame = (_ecgFrame + 1) % CYCLE_PX;
        const phase = _ecgFrame / CYCLE_PX;
        _ecgBuf[_ecgCursor] = _pqrstY(phase);
        _ecgCursor = (_ecgCursor + 1) % W;
      }

      // Draw
      _ecgCtx.clearRect(0, 0, W, H);

      // Erase zone ahead of cursor (blank ~20px) — scanner effect
      const ERASE = 22;
      _ecgCtx.fillStyle = 'rgba(6,15,30,0.92)';
      const ex = (_ecgCursor - ERASE + W) % W;
      if (ex < _ecgCursor) {
        _ecgCtx.fillRect(ex, 0, ERASE, H);
      } else {
        _ecgCtx.fillRect(ex, 0, W - ex, H);
        _ecgCtx.fillRect(0, 0, _ecgCursor, H);
      }

      // Draw waveform
      _ecgCtx.beginPath();
      _ecgCtx.strokeStyle = 'rgba(0,198,224,0.22)';
      _ecgCtx.lineWidth = 1.5;
      _ecgCtx.lineJoin = 'round';

      const mid = H * 0.55;
      const amp = H * 0.36;

      for (let x = 0; x < W; x++) {
        const y = mid - _ecgBuf[x] * amp;
        if (x === 0) _ecgCtx.moveTo(x, y);
        else _ecgCtx.lineTo(x, y);
      }
      _ecgCtx.stroke();

      // Glowing cursor dot
      const cursorY = mid - _ecgBuf[(_ecgCursor - 1 + W) % W] * amp;
      const grad = _ecgCtx.createRadialGradient(_ecgCursor, cursorY, 0, _ecgCursor, cursorY, 7);
      grad.addColorStop(0, 'rgba(0,230,255,0.9)');
      grad.addColorStop(1, 'rgba(0,198,224,0)');
      _ecgCtx.beginPath();
      _ecgCtx.arc(_ecgCursor, cursorY, 7, 0, Math.PI * 2);
      _ecgCtx.fillStyle = grad;
      _ecgCtx.fill();
    }

    _ecgRaf = requestAnimationFrame(draw);
  }

  function stopECG() {
    if (_ecgRaf) { cancelAnimationFrame(_ecgRaf); _ecgRaf = null; }
    if (_ecgCanvas && _ecgCanvas._ecgResizeFn) {
      window.removeEventListener('resize', _ecgCanvas._ecgResizeFn);
      _ecgCanvas._ecgResizeFn = null;
    }
    if (_ecgCtx && _ecgCanvas) {
      _ecgCtx.clearRect(0, 0, _ecgCanvas.width, _ecgCanvas.height);
    }
  }

  return { init, endSession, addPostIt, startECG, stopECG };
})();
