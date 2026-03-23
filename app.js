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
            saber: 'blue', swMusic: true
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
       sceneVolumes: {},
mixerVolumes: { rain: 0, waves: 0, brown: 0, nature: 0, cafe: 0, library: 0, jazz: 0 },
      currentIntention: null,
currentSubtasks: [],
activeNoteFilter: null,
sessionStartTime: null,
unlockedThemes: ['normal', 'starwars'],
        minutesToday: 0,
        totalMinutes: 0,
    },


    elements: {},

    // ===================================
    // INITIALIZATION
    // ===================================
    init() {
        this.cacheDOM();
        this.loadSettings();
        this.loadUnlockedThemes();

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
		setTimeout(() => this.initOnboarding(), 800);
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
            btnWarp: document.getElementById('btn-warp'),
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
            moodCards: document.querySelectorAll('.mood-card'),
            breatheWidget: document.getElementById('breathing-widget'),
            breatheText: document.getElementById('breathing-text'),
            breatheCircle: document.getElementById('breathing-circle'),
            btnToggleBreathe: document.getElementById('btn-toggle-breathe')
        };
    },

bindEvents() {
  // Core Timer Controls
  if (this.elements.btnStart) {
this.elements.btnStart.addEventListener('click', () => this.toggleTimer());
  }

  if (this.elements.btnReset) {
this.elements.btnReset.addEventListener('click', () => this.resetTimer());
  }

  if (this.elements.btnSkip) {
this.elements.btnSkip.addEventListener('click', () => this.skipSession());
  }

  if (this.elements.btnZen) {
    this.elements.btnZen.addEventListener('click', () => {
      document.body.classList.toggle('zen-mode');
    });
  }

  const btnMinimal = document.getElementById('btn-minimal');
  if (btnMinimal) {
    btnMinimal.addEventListener('click', () => {
      document.body.classList.toggle('minimal-mode');
      const tooltip = btnMinimal.querySelector('.tooltip');
      if (tooltip) {
        tooltip.textContent = document.body.classList.contains('minimal-mode')
          ? 'Full Mode'
          : 'Minimal Mode';
      }
    });
  }

  if (this.elements.btnWarp) {
    this.elements.btnWarp.addEventListener('click', this.triggerHyperspaceJump);
  }

  // Mode Switching
  this.elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', e => this.setMode(e.target.dataset.mode));
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

  // Breathing Toggle
  if (this.elements.btnToggleBreathe) {
    this.elements.btnToggleBreathe.addEventListener('click', () => {
      if (this.state.breathingState.active) this.stopBreathing();
      else this.startBreathing();
    });
  }

  // Appearance
  if (this.elements.themeBtn) {
    this.elements.themeBtn.addEventListener('click', this.toggleTheme);
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
  const inputs = document.querySelectorAll('.settings-body input:not([type="file"]), .settings-body select');
 inputs.forEach(input => input.addEventListener('change', () => this.saveSettings()));


  // Notes
  const btnAddNote = document.getElementById('btn-add-note');
  if (btnAddNote) {
    btnAddNote.addEventListener('click', this.addNote);
  }

  const noteInput = document.getElementById('note-input');
  if (noteInput) {
    noteInput.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') this.addNote();
    });
  }

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
      if (inp && inp.value.trim()) this.state.currentIntention = inp.value.trim();

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

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === '?') {
      const mod = document.getElementById('shortcut-modal');
      if (mod) mod.style.display = mod.style.display === 'flex' ? 'none' : 'flex';
    }

    if (e.key === 'Escape') {
      const mod = document.getElementById('shortcut-modal');
      if (mod) mod.style.display = 'none';

      const intMod = document.getElementById('intention-modal');
      if (intMod) intMod.style.display = 'none';
      const rqMod = document.getElementById('ragequit-modal');
if (rqMod) rqMod.style.display = 'none';

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

    if (document.body.classList.contains('theme-starwars') && e.code === 'KeyW') {
      this.triggerHyperspaceJump();
    }
  });

  const btnEod = document.getElementById('btn-eod-close');
  if (btnEod) {
    btnEod.addEventListener('click', () => {
      const modal = document.getElementById('eod-modal');
      if (modal) modal.style.display = 'none';
    });
  }
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

        // Update label
        const channel = slider.closest('.mixer-channel');
        if (channel) {
            channel.querySelector('.mixer-vol').textContent = `${vol}%`;
            if (vol > 0) {
                channel.classList.add('active');
                window.AmbienceModule.play(scene);
                window.AmbienceModule.setSceneVolume(scene, vol / 100);
            }
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
        });
    }
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
    if (target === 'explorer') {
  if (window.ExplorerModule) window.ExplorerModule.onTabOpen();
}

},

    // ===================================
    // TIMER LOGIC
    // ===================================
    setMode(mode) {
        if (this.state.isRunning) this.stopTimer();
        this.state.mode = mode;
        this.elements.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

        const m = mode === 'work' ? this.state.settings.work :
                  mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long;

        this.state.timeLeft = m * 60;
        this.updateTimeDisplay();
        this.updateRing();

        let label = 'Focus Time';
        if (mode === 'shortBreak') label = 'Short Break';
        else if (mode === 'longBreak') label = 'Long Break';
        this.elements.label.textContent = label;

        // Auto-show/hide breathing widget
        if (mode === 'work') {
            if (this.elements.breatheWidget) this.elements.breatheWidget.style.display = 'none';
            this.stopBreathing();
        } else {
            if (this.elements.breatheWidget) this.elements.breatheWidget.style.display = 'flex';
            this.startBreathing();
        }
    },

    toggleTimer() {
        if (this.state.isRunning) {
            this.stopTimer();
        } else {
            if (this.state.mode === 'work' && !this.state.currentIntention) {
                const mod = document.getElementById('intention-modal');
                if (mod) {
                    mod.style.display = 'flex';
                    const inp = document.getElementById('intention-input');
                    if (inp) inp.focus();
                } else {
                    this.startTimer();
                }
            } else {
                this.startTimer();
            }
        }
    },

    startTimer() {
        if (this.state.timeLeft <= 0) return;
  this.state.isRunning = true;
this.state.sessionStartTime = Date.now();

		// Show intention reminder
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
        this.elements.iconPlay.style.display = 'none';
        this.elements.iconPause.style.display = 'block';

        if (this.state.settings.theme === 'starwars' && this.state.mode === 'work') {
            this.triggerHyperspaceStarfield();
        }

        const intMod = document.getElementById('intention-modal');
        if (intMod) intMod.style.display = 'none';

        this.state.timer = setInterval(() => {
            this.state.timeLeft--;
            if (!this.state.hyperspaceActive) {
                this.updateTimeDisplay();
                this.updateRing();
            }
            if (this.state.timeLeft <= 0) {
                this.onTimerComplete();
            }
        }, 1000);
    },

    stopTimer() {
        this.state.isRunning = false;
        clearInterval(this.state.timer);
        this.elements.container.classList.remove('running');
        this.elements.iconPlay.style.display = 'block';
        this.elements.iconPause.style.display = 'none';
        const sf = document.getElementById('starfield');
        if (sf) sf.classList.remove('hyperspace');
		const reminder = document.getElementById('intention-reminder');
if (reminder) reminder.style.display = 'none';
    },

resetTimer() {
  if (this.state.isRunning && this.state.mode === 'work') {
    const total = this.state.settings.work * 60;
    const pct = Math.round(((total - this.state.timeLeft) / total) * 100);
    if (pct >= 20) {
      this.showRageQuitModal(pct, () => {
        this.stopTimer();
        this.setMode(this.state.mode);
      });
      return;
    }
  }
  this.stopTimer();
  this.setMode(this.state.mode);
},
showRageQuitModal(pct, onQuit) {
  const modal = document.getElementById('ragequit-modal');
  if (!modal) return;
  const remaining = 100 - pct;
  const messages = [
    `"The last ${remaining}% is where the magic happens."`,
    `"Champions are built in the moments they want to quit."`,
    `"Your future self will thank you for these last ${remaining}%."`,
    `"You've already done the hard part. Don't stop now."`,
    `"Flow state hits after the resistance. Push through."`,
  ];
  const emoji = pct > 80 ? '😱' : pct > 60 ? '😤' : pct > 40 ? '😬' : '🙁';
  document.getElementById('rq-emoji').textContent = emoji;
  document.getElementById('rq-title').textContent = `You're ${pct}% there!`;
  document.getElementById('rq-pct-label').textContent = `${pct}%`;
  document.getElementById('rq-bar-fill').style.width = '0%';
  document.getElementById('rq-message').textContent =
    messages[Math.floor(Math.random() * messages.length)];
  modal.style.display = 'flex';
  setTimeout(() => {
    document.getElementById('rq-bar-fill').style.width = `${pct}%`;
  }, 50);
  document.getElementById('btn-rq-keep').onclick = () => {
    modal.style.display = 'none';
  };
  document.getElementById('btn-rq-quit').onclick = () => {
    modal.style.display = 'none';
    onQuit();
  };
},


    skipSession() {
        this.stopTimer();
        this.state.timeLeft = 0;
        this.onTimerComplete();
    },

    onTimerComplete() {
        this.stopTimer();
        this.playAudio(this.state.settings.sound);

        if (this.state.mode === 'work') {
const elapsedMs = this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0;
const elapsedMin = Math.max(1, Math.floor(elapsedMs / 60000));
this.state.sessionsToday++;
this.state.totalSessions++;
this.state.minutesToday = (this.state.minutesToday || 0) + elapsedMin;
this.state.totalMinutes = (this.state.totalMinutes || 0) + elapsedMin;
this.addXp(elapsedMin);
this.saveStats();
const completedIntention = this.state.currentIntention;
this.recordSession(elapsedMin, 'focus');


            this.elements.container.classList.add('celebrating');
            this.elements.container.classList.add('timer-pulse');
            setTimeout(() => {
                this.elements.container.classList.remove('celebrating');
                this.elements.container.classList.remove('timer-pulse');
            }, 2000);
            this.createConfetti();
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
            this.showSessionRecap(completedIntention, this.state.settings.work, 15);

            if (this.state.currentRound % this.state.settings.rounds === 0) {
                this.setMode('longBreak');
            } else {
                this.setMode('shortBreak');
            }
            this.state.currentRound++;
        } else {
            this.recordSession(
                this.state.mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long,
                'break'
            );
            this.setMode('work');
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
        const total = (this.state.mode === 'work' ? this.state.settings.work :
                this.state.mode === 'shortBreak' ? this.state.settings.short : this.state.settings.long) * 60;
        const p = this.state.timeLeft / total;
        const offset = 753.98 - (p * 753.98);
        this.elements.progress.style.strokeDashoffset = offset;
    },

    updateSessionCounter() {
		
        const total = this.state.settings.rounds;
        let current = this.state.currentRound % total || total;
        this.elements.sessionText.textContent = `Session ${current} of ${total}`;

        this.elements.sessionDots.innerHTML = '';
        const completedInCycle = (this.state.currentRound - 1) % total;
        for (let i = 1; i <= total; i++) {
            const d = document.createElement('div');
            d.className = 'dot' + (i <= completedInCycle ? ' active' : '');
            this.elements.sessionDots.appendChild(d);
        }
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

    triggerHyperspaceStarfield() {
        const sf = document.getElementById('starfield');
        if (!sf) return;
        sf.classList.remove('hyperspace');
        void sf.offsetWidth;
        sf.classList.add('hyperspace');
       
        setTimeout(() => sf.classList.remove('hyperspace'), 1200);
    },

    triggerHyperspaceJump() {
        if (this.state.hyperspaceActive) return;
        this.state.hyperspaceActive = true;
        document.body.classList.add('hyperspace-jump');
        this.triggerHyperspaceStarfield();
        setTimeout(() => {
            document.body.classList.remove('hyperspace-jump');
            this.state.hyperspaceActive = false;
            if (this.state.isRunning) {
                this.updateTimeDisplay();
                this.updateRing();
            }
        }, 1200);
    },

    createConfetti() {
        const colors = [this.state.accents[this.state.settings.accent], '#ffffff', '#ffca28', '#4ecdc4'];
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

    // ===================================
    // BREATHING EXERCISE
    // ===================================
    startBreathing() {
        if (this.state.breathingState.active) return;
        this.state.breathingState.active = true;
        if (this.elements.btnToggleBreathe) this.elements.btnToggleBreathe.textContent = "Stop Breathing Guide";
        this.state.breathingState.phase = 0;
        this.cycleBreathing();
    },

 stopBreathing() {
    this.state.breathingState.active = false;
    if (this.elements.btnToggleBreathe) this.elements.btnToggleBreathe.textContent = "Start Breathing Guide";
    clearTimeout(this.state.breathingState.interval);
    clearInterval(this.state.breathingState.countInterval);
    const ring = document.getElementById('breathing-ring');
    if (ring) {
        ring.style.transition = 'stroke-dashoffset 0.5s ease';
        ring.style.strokeDashoffset = '339.3';
    }
    if (this.elements.breatheText) this.elements.breatheText.textContent = "Ready";
    const countEl = document.getElementById('breathing-countdown');
    if (countEl) countEl.textContent = '4';
},

    cycleBreathing() {
    if (!this.state.breathingState.active) return;
    const p = this.state.breathingState.phase % 4;

    // phases: 0=inhale(4s), 1=hold(4s), 2=exhale(4s), 3=hold(4s)
    const phases = [
        { text: 'Inhale', dur: 4, color: 'var(--accent)' },
        { text: 'Hold',   dur: 4, color: 'var(--warning)' },
        { text: 'Exhale', dur: 4, color: 'var(--text-secondary)' },
        { text: 'Hold',   dur: 4, color: 'var(--text-muted)' }
    ];
    const { text, dur, color } = phases[p];
    const circumference = 339.3;

    if (this.elements.breatheText) this.elements.breatheText.textContent = text;

    const ring = document.getElementById('breathing-ring');
    const countEl = document.getElementById('breathing-countdown');
    if (ring) {
        ring.style.stroke = color;
        // Inhale fills ring, exhale empties it
        if (p === 0) {
            ring.style.transition = `stroke-dashoffset ${dur}s linear, stroke 0.5s ease`;
            ring.style.strokeDashoffset = '0';
        } else if (p === 2) {
            ring.style.transition = `stroke-dashoffset ${dur}s linear, stroke 0.5s ease`;
            ring.style.strokeDashoffset = circumference;
        } else {
            ring.style.transition = 'stroke 0.5s ease';
            // hold — keep current offset
        }
    }

    // Countdown ticker
    let remaining = dur;
    if (countEl) countEl.textContent = remaining;
    if (this.state.breathingState.countInterval) {
        clearInterval(this.state.breathingState.countInterval);
    }
    this.state.breathingState.countInterval = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining > 0 ? remaining : '';
    }, 1000);

    this.state.breathingState.phase++;
    this.state.breathingState.interval = setTimeout(
        () => this.cycleBreathing(),
        dur * 1000
    );
},

    // ===================================
    // AUDIO & MOODS
    // ===================================
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

   activateMood(moodKey) {
    this.elements.moodCards.forEach(c => c.classList.toggle('active', c.dataset.mood === moodKey));

    const presets = {
        cozy_cafe:    { cafe: 65, jazz: 50, rain: 0, waves: 0, brown: 0, nature: 0, library: 0 },
        rainy_day:    { rain: 75, brown: 55, cafe: 0, jazz: 0, waves: 0, nature: 0, library: 0 },
        deep_focus:   { library: 60, nature: 40, rain: 0, waves: 0, brown: 0, cafe: 0, jazz: 0 },
        ocean_breeze: { waves: 70, nature: 45, rain: 0, brown: 0, cafe: 0, jazz: 0, library: 0 }
    };

    const volumes = presets[moodKey];
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
        localStorage.setItem('pomodoro_settings', JSON.stringify(this.state.settings));
        this.renderStats();
    },

    loadStats() {
        const todayStr = new Date().toDateString();
        const savedDate = localStorage.getItem('pomodoro_date');

if (savedDate !== todayStr) {
  this.state.sessionsToday = 0;
  this.state.minutesToday = 0;
  localStorage.setItem('pomodoro-date', todayStr);
  localStorage.setItem('pomodoro-minutes-today', 0);

        } else {
            this.state.sessionsToday = parseInt(localStorage.getItem('pomodoro_today')) || 0;
        }

this.state.sessionsToday = parseInt(localStorage.getItem('pomodoro-today') || 0);
this.state.minutesToday = parseInt(localStorage.getItem('pomodoro-minutes-today') || 0);
this.state.totalMinutes = parseInt(localStorage.getItem('pomodoro-total-minutes') || 0);
this.state.xp = parseInt(localStorage.getItem('pomodoro-xp') || 0);

        this.updateLevel();

        const h = localStorage.getItem('pomodoro_history');
        if (h) this.state.history = JSON.parse(h);
    },

    saveStats() {
localStorage.setItem('pomodoro-today', this.state.sessionsToday);
localStorage.setItem('pomodoro-total', this.state.totalSessions);
localStorage.setItem('pomodoro-minutes-today', this.state.minutesToday || 0);
localStorage.setItem('pomodoro-total-minutes', this.state.totalMinutes || 0);
localStorage.setItem('pomodoro-xp', this.state.xp);

        this.renderStats();
    },
formatTime(minutes) {
  if (!minutes || minutes < 1) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
},

    recordSession(duration, type) {
this.state.history.push({
    date: new Date().toISOString(),
    duration: duration,
    type: type,
    intention: type === 'focus' ? this.state.currentIntention : null,
    label: type === 'focus' ? this._sessionLabel || null : null
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
        const swRanks = ['Youngling', 'Padawan', 'Jedi Knight', 'Jedi Master', 'Council Member', 'Grand Master', 'Force Ghost'];

        const rankArr = document.body.classList.contains('theme-starwars') ? swRanks : ranks;
        const rankName = rankArr[Math.min(this.state.level - 1, rankArr.length - 1)];

        if (this.elements.lvlRank) this.elements.lvlRank.textContent = `${rankName} (Lvl ${this.state.level})`;
        if (this.elements.lvlXp) this.elements.lvlXp.textContent = `${xpInLevel} / ${xpRequired} XP to Lvl ${this.state.level + 1}`;
        if (this.elements.lvlFill) this.elements.lvlFill.style.width = `${pct}%`;

        const rD = document.getElementById('stat-rank-display');
        if (rD) rD.textContent = rankName;

        if (this.state.level > cl && cl > 0) {
            this.showToast('Level Up!', `You've reached Level ${this.state.level}: ${rankName}`, '⭐');
        }
        this.checkThemeUnlocks();

    },

    // ===================================
    // THEMES & APPEARANCE
    // ===================================
updateTheme() {
  const theme = this.state.settings.theme;
  const isSw = theme === 'starwars';
  document.body.classList.remove('theme-starwars','theme-cyberpunk','theme-lofi','theme-matrix');
  if (theme !== 'normal') document.body.classList.add(`theme-${theme}`);
  if (this.elements.swSettings) this.elements.swSettings.style.display = isSw ? 'block' : 'none';
  if (this.elements.btnWarp) this.elements.btnWarp.style.display = isSw ? 'flex' : 'none';
  const sf = document.getElementById('starfield');
  if (sf) sf.style.display = isSw ? 'block' : 'none';
  if (isSw) this.setSaber(this.state.settings.saber);
  else if (theme === 'normal') this.setAccent(this.state.settings.accent);
  this.toggleMatrixRain(theme === 'matrix');
  this.setWallpaper(this.state.settings.wallpaper);
  document.querySelectorAll('.theme-preview-card').forEach(c => c.classList.remove('active'));
  const activeCard = document.getElementById(`theme-preview-${theme}`);
  if (activeCard) activeCard.classList.add('active');
  this.updateLogo();
  this.updateLevel();
},


   toggleTheme() {
    this.state.settings.theme = this.state.settings.theme === 'starwars' ? 'normal' : 'starwars';
    this.saveSettings();
    this.updateTheme();
if (window.AmbienceModule) {
  if (this.state.settings.theme === 'starwars' && this.state.settings.swMusic) {
    window.AmbienceModule.play('binary_sunset');
  } else {
    window.AmbienceModule.stop('binary_sunset');
  }
}
},
setThemePreview(theme) {
  const lockLevels = { cyberpunk: 5, lofi: 10, matrix: 15 };
  if (lockLevels[theme] && !this.state.unlockedThemes.includes(theme)) {
    this.showToast('🔒 Locked!', `Reach Level ${lockLevels[theme]} to unlock ${theme}`, '🔒');
    return;
  }
  document.querySelectorAll('.theme-preview-card').forEach(c => c.classList.remove('active'));
  const active = document.getElementById(`theme-preview-${theme}`);
  if (active) active.classList.add('active');
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
        this.saveSettings();
    },

    setSaber(colorName) {
        if (!this.state.saberColors[colorName]) return;
        this.state.settings.saber = colorName;
        if (this.state.settings.theme === 'starwars') {
            const hex = this.state.saberColors[colorName];
            document.body.style.setProperty('--accent', hex);
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.content = hex;
        }
        this.elements.saberBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === colorName));
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
  const theme = this.state.settings.theme;
  const title = document.getElementById('logo-title');
  const subtitle = document.getElementById('logo-subtitle');
  const logoMap = {
    starwars:  { title:'JEDI FOCUS',    sub:'May the force be with you' },
    cyberpunk: { title:'CYBER FOCUS',   sub:'Jack in. Focus up.' },
    lofi:      { title:'lo-fi focus',   sub:'chill · study · repeat' },
    matrix:    { title:'MATRIX FOCUS',  sub:'There is no spoon.' },
    normal:    { title:'Pomodoro Focus', sub:'' },
  };
  const l = logoMap[theme] || logoMap.normal;
  if (title) title.textContent = l.title;
  if (subtitle) subtitle.textContent = l.sub;
  const titleEl = document.getElementById('notebook-cover-title');
  const emblem = document.querySelector('.notebook-emblem');
  if (titleEl) titleEl.textContent = theme === 'starwars' ? 'Jedi Archives' : 'My Journal';
  if (emblem) emblem.textContent = theme === 'starwars' ? '⚔️' : '📖';
},
toggleMatrixRain(active) {
  const canvas = document.getElementById('matrix-rain');
  if (!canvas) return;
  if (!active) {
    canvas.style.display = 'none';
    if (this._matrixInterval) { clearInterval(this._matrixInterval); this._matrixInterval = null; }
    return;
  }
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const cols = Math.floor(canvas.width / 16);
  const drops = Array(cols).fill(1);
  if (this._matrixInterval) clearInterval(this._matrixInterval);
  this._matrixInterval = setInterval(() => {
    ctx.fillStyle = 'rgba(0,3,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = '14px monospace';
    drops.forEach((y, i) => {
      const char = String.fromCharCode(0x30A0 + Math.random() * 96);
      ctx.fillText(char, i * 16, y * 16);
      if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }, 50);
},

loadUnlockedThemes() {
  const saved = localStorage.getItem('pomodoro-unlocked-themes');
  if (saved) this.state.unlockedThemes = JSON.parse(saved);
  this.refreshThemeCards();
},

saveUnlockedThemes() {
  localStorage.setItem('pomodoro-unlocked-themes', JSON.stringify(this.state.unlockedThemes));
},

refreshThemeCards() {
  const iconMap = { cyberpunk:'🌆', lofi:'🎵', matrix:'💊' };
  ['cyberpunk','lofi','matrix'].forEach(theme => {
    const card = document.getElementById(`theme-preview-${theme}`);
    if (!card) return;
    if (this.state.unlockedThemes.includes(theme)) {
      card.classList.remove('theme-locked');
      const lockIcon = card.querySelector('.theme-lock-icon');
      if (lockIcon) lockIcon.textContent = iconMap[theme];
      const unlockLabel = card.querySelector('.theme-unlock-label');
      if (unlockLabel) unlockLabel.remove();
    }
  });
},

checkThemeUnlocks() {
  const unlocks = [
    { theme:'cyberpunk', level:5,  name:'Cyberpunk', icon:'🌆' },
    { theme:'lofi',      level:10, name:'Lo-fi',     icon:'🎵' },
    { theme:'matrix',    level:15, name:'Matrix',    icon:'💊' },
  ];
  unlocks.forEach(({ theme, level, name, icon }) => {
    if (this.state.level >= level && !this.state.unlockedThemes.includes(theme)) {
      this.state.unlockedThemes.push(theme);
      this.saveUnlockedThemes();
      this.refreshThemeCards();
      setTimeout(() => this.showToast(`${icon} Theme Unlocked!`, `${name} theme is now available!`, icon), 600);
    }
  });
},


    rotateQuote() {
        const text = document.getElementById('quote-text');
        if (!text) return;
        text.style.opacity = 0;
        setTimeout(() => {
            const arr = document.body.classList.contains('theme-starwars') ?
            [
                '"Do or do not. There is no try." — Yoda',
                '"Your focus determines your reality." — Qui-Gon Jinn',
                '"In a dark place we find ourselves, and a little more knowledge lights our way." — Yoda',
                '"Mind what you have learned. Save you it can." — Yoda'
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
if (statToday) statToday.textContent = this.formatTime(this.state.minutesToday || 0);
if (statTotal) statTotal.textContent = this.formatTime(this.state.totalMinutes || 0);


        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        let weekTotal = 0;
        this.state.history.forEach(s => {
  if (s.type === 'focus' && new Date(s.date) >= weekStart) weekTotal += (s.duration || 0);
});

        if (statWeek) statWeek.textContent = this.formatTime(weekTotal);


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
                b.textContent = `🔥 ${currentStreak} Day${currentStreak > 1 ? 's' : ''}`;
                b.style.display = 'inline-flex';
            } else {
                b.style.display = 'none';
            }
        }

        this.renderCharts();
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
            counts[d.getTime()] = (counts[d.getTime()] || 0) + (s.duration || 0);

        });

        for (let i = 34; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const count = counts[d.getTime()] || 0;

            let lvl = 0;
if (count >= 1)   lvl = 1;
if (count >= 25)  lvl = 2;
if (count >= 75)  lvl = 3;
if (count >= 150) lvl = 4;


            const cell = document.createElement('div');
            cell.className = `h-cell level-${lvl}`;
            cell.title = `${d.toDateString()}: ${this.formatTime(count)}`;

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

        list.innerHTML = '';
        let filteredNotes = this.state.activeNoteFilter
            ? notes.filter(n => n.tags && n.tags.includes(this.state.activeNoteFilter))
            : notes;

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
    const cover = document.getElementById('notebook-cover');
    const openBook = document.getElementById('notebook-open');
    if (!cover || !openBook) return;

    // Set cover title
    const titleEl = document.getElementById('notebook-cover-title');
    const isSw = document.body.classList.contains('theme-starwars');
    if (titleEl) titleEl.textContent = isSw ? 'Jedi Archives' : 'My Journal';
    if (cover.querySelector('.notebook-emblem')) {
        cover.querySelector('.notebook-emblem').textContent = isSw ? '⚔️' : '📖';
    }

    cover.addEventListener('click', () => {
        cover.style.display = 'none';
        openBook.style.display = 'block';
        this.renderNotes();
    });

    // Add close button if not already there
    if (!document.getElementById('btn-notebook-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notebook-close-btn';
        closeBtn.id = 'btn-notebook-close';
        closeBtn.textContent = isSw ? '← Close Archives' : '← Close Journal';
        openBook.appendChild(closeBtn);
        closeBtn.addEventListener('click', () => {
            openBook.style.display = 'none';
            cover.style.display = 'flex';
        });
    }
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
            { id: 'century', name: 'Centurion', desc: '100 total sessions', req: () => this.state.totalSessions >= 100, icon: '🏛️' }
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
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());

