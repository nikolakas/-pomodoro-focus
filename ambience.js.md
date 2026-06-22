/* ============================================
   AMBIENT SOUNDS ENGINE — Procedural Web Audio
   Multi-scene capable with enhanced generators
   Phase 10: Immersive Café, Library, Jazz
   FIXED: scene gain routing for delayed loops
   ============================================ */

window.AmbienceModule = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let activeScenes = {}; // Maps sceneKey to array of active nodes
  let sceneGains = {};
  let sceneVolumes = {};
  let volume = 0.5;

 function getCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(ctx.destination);
    }
    // Don't auto-resume here — only resume on explicit user action
    return ctx;
}

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
  }

  function getVolume() { return volume; }

  // Returns the destination node for a given scene key (or masterGain as fallback)
  function getSceneDest(sceneKey) {
    if (sceneKey && sceneGains[sceneKey]) return sceneGains[sceneKey];
    return masterGain;
  }

  function setSceneVolume(sceneKey, vol) {
    sceneVolumes[sceneKey] = Math.max(0, Math.min(1, vol));
    if (sceneGains[sceneKey] && ctx) {
      sceneGains[sceneKey].gain.setTargetAtTime(sceneVolumes[sceneKey], ctx.currentTime, 0.05);
    }
    if (sceneKey === 'bouzoukia') {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.setVolume === 'function') {
        try { ytPlayer.setVolume(vol * 100); } catch(e) {}
      }
    }
  }

  // ---- Generators ----
  function createNoise(type = 'white') {
    const ac = getCtx();
    const bufferSize = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'pink') {
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.969*b2 + w*0.153852; b3 = 0.8665*b3 + w*0.3104856;
        b4 = 0.55*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  function createFilter(type, freq, Q = 1) {
    const f = getCtx().createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; return f;
  }

  function createGainNode(val = 1) {
    const g = getCtx().createGain(); g.gain.value = val; return g;
  }

  function createLFO(freq, min, max, param) {
    const ac = getCtx(), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.value = (max - min) / 2; osc.connect(g); g.connect(param);
    param.value = (max + min) / 2; osc.start(); return osc;
  }

  // ============================================
  //  SCENE BUILDERS — each receives its dest node
  // ============================================

  function buildRain(dest) {
    const nodes = [];
    const noise = createNoise('white');
    noise.connect(createFilter('highpass', 400, 0.5)).connect(createFilter('lowpass', 6000, 0.8)).connect(createGainNode(0.25)).connect(dest);
    noise.start(); nodes.push(noise);

    const drops = createNoise('brown');
    drops.connect(createFilter('lowpass', 800, 1)).connect(createGainNode(0.08)).connect(dest);
    drops.start(); nodes.push(drops);

    const iv = setInterval(() => {
      if (!ctx || ctx.state === 'closed') return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(800+Math.random()*2000, t); o.frequency.exponentialRampToValueAtTime(200+Math.random()*300, t+0.03);
      g.gain.setValueAtTime(0.02+Math.random()*0.015, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.05);
      o.connect(g).connect(dest); o.start(t); o.stop(t+0.06);
    }, 150);
    nodes.push({ stop: () => clearInterval(iv) });
    return nodes;
  }

  function buildWaves(dest) {
    const nodes = [];
    const noise = createNoise('pink'), g = createGainNode(0.3);
    noise.connect(createFilter('bandpass', 300, 0.4)).connect(g).connect(dest);
    noise.start(); nodes.push(noise);
    nodes.push(createLFO(0.08, 0.08, 0.35, g.gain));

    const foam = createNoise('white'), fg = createGainNode(0.04);
    foam.connect(createFilter('highpass', 2000, 0.3)).connect(fg).connect(dest);
    foam.start(); nodes.push(foam);
    nodes.push(createLFO(0.06, 0.01, 0.06, fg.gain));
    return nodes;
  }

  function buildBrownNoise(dest) {
    const nodes = [];
    const noise = createNoise('brown');
    noise.connect(createFilter('lowpass', 400, 0.7)).connect(createGainNode(0.4)).connect(dest);
    noise.start(); nodes.push(noise);
    return nodes;
  }

  function buildNatureForest(dest) {
    const nodes = [];
    const wind = createNoise('pink'), wg = createGainNode(0.1);
    wind.connect(createFilter('lowpass', 1200, 0.5)).connect(wg).connect(dest);
    wind.start(); nodes.push(wind);
    nodes.push(createLFO(0.03, 0.04, 0.14, wg.gain));

    const leaves = createNoise('white');
    leaves.connect(createFilter('bandpass', 4000, 2)).connect(createGainNode(0.03)).connect(dest);
    leaves.start(); nodes.push(leaves);

    const state = { active: true };
    function loopBirds() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime, n = 2+Math.floor(Math.random()*3), f0 = 2000+Math.random()*1500;
      for (let i=0; i<n; i++) {
        const o=ctx.createOscillator(), g=ctx.createGain(), t0=t+i*(0.06+Math.random()*0.05);
        o.frequency.setValueAtTime(f0+Math.random()*600, t0); o.frequency.exponentialRampToValueAtTime(f0*(0.8+Math.random()*0.3), t0+0.04);
        g.gain.setValueAtTime(0.015, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.06);
        o.connect(g).connect(dest); o.start(t0); o.stop(t0+0.07);
      }
      setTimeout(loopBirds, 2000 + Math.random() * 4000);
    }
    setTimeout(loopBirds, 1000);

    function loopSqu() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.4) {
        const t = ctx.currentTime;
        for (let i=0; i<5; i++) {
          const o=ctx.createOscillator(), g=ctx.createGain(), t0=t+i*0.04;
          o.type='square'; o.frequency.value=400+Math.random()*100;
          g.gain.setValueAtTime(0.005, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.03);
          o.connect(g).connect(dest); o.start(t0); o.stop(t0+0.04);
        }
      }
      setTimeout(loopSqu, 5000 + Math.random() * 5000);
    }
    setTimeout(loopSqu, 3000);

    nodes.push({ stop: () => { state.active = false; } });

    const stream = createNoise('white'), sg = createGainNode(0.04);
    stream.connect(createFilter('bandpass', 1800, 1.5)).connect(sg).connect(dest);
    stream.start(); nodes.push(stream);
    nodes.push(createLFO(0.1, 0.02, 0.06, sg.gain));

    return nodes;
  }

  // ============================================
  //  CAFÉ
  // ============================================
  function buildCafe(dest) {
    return buildAudioStream('https://upload.wikimedia.org/wikipedia/commons/e/e0/Cafe_ambiance.ogg', dest);
  }

  // ============================================
  //  LIBRARY
  // ============================================
  function buildLibrary(dest) {
    return buildAudioStream('https://upload.wikimedia.org/wikipedia/commons/0/01/Computer_keyboard.ogg', dest);
  }

  // ============================================
  //  JAZZ
  // ============================================
  function buildJazz(dest) {
    return buildAudioStream('https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ad/Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg/Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg.mp3', dest);
  }

  // ============================================
  //  BINARY SUNSET (Force Theme)
  // ============================================
  let bsVol = 0.4;
  let bsGainNode = null;
  function setBsVolume(v) { bsVol = v; if (bsGainNode) bsGainNode.gain.setValueAtTime(v, getCtx().currentTime); }

  function buildBinarySunset(dest) {
    const nodes = [];
    const t = getCtx().currentTime;

    const baseMelody = [
      { f: 246.94, tm: 0,    d: 0.8 }, { f: 329.63, tm: 0.8,  d: 0.8 }, { f: 392.00, tm: 1.6,  d: 0.4 },
      { f: 440.00, tm: 2.0,  d: 0.4 }, { f: 493.88, tm: 2.4,  d: 1.2 }, { f: 440.00, tm: 3.8,  d: 0.4 },
      { f: 493.88, tm: 4.2,  d: 0.8 }, { f: 440.00, tm: 5.0,  d: 0.4 }, { f: 392.00, tm: 5.4,  d: 0.4 },
      { f: 329.63, tm: 5.8,  d: 1.2 }, { f: 369.99, tm: 7.2,  d: 0.8 }, { f: 329.63, tm: 8.0,  d: 0.4 },
      { f: 246.94, tm: 8.4,  d: 2.0 }
    ];

    const melody = [];
    const loops = 4;
    const loopOffset = 11.5;

    for (let i = 0; i < loops; i++) {
      baseMelody.forEach(note => {
        melody.push({ f: note.f, tm: note.tm + (i * loopOffset), d: note.d });
      });
    }

    const bg = ctx.createGain(); bg.gain.value = bsVol; bg.connect(dest);
    bsGainNode = bg;
    nodes.push(bg);

    melody.forEach(({ f, tm, d }) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t+tm); g.gain.linearRampToValueAtTime(1, t+tm+0.08); g.gain.setValueAtTime(1, t+tm+d-0.1); g.gain.exponentialRampToValueAtTime(0.001, t+tm+d);
      o.connect(g).connect(bg); o.start(t+tm); o.stop(t+tm+d+0.05);
      nodes.push(o);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'triangle'; o2.frequency.value = f*2;
      g2.gain.setValueAtTime(0, t+tm); g2.gain.linearRampToValueAtTime(0.3, t+tm+0.12); g2.gain.setValueAtTime(0.3, t+tm+d-0.15); g2.gain.exponentialRampToValueAtTime(0.001, t+tm+d);
      o2.connect(g2).connect(bg); o2.start(t+tm); o2.stop(t+tm+d+0.05);
      nodes.push(o2);
    });

    const totalDuration = (loops * loopOffset) + 1;
    const stp = setTimeout(() => stop('binary_sunset'), totalDuration * 1000);
    nodes.push({ stop: () => clearTimeout(stp) });

    const pad = ctx.createOscillator(), pg = ctx.createGain();
    pad.type = 'sine'; pad.frequency.value = 123.47;
    pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(0.08 * bsVol, t+2);
    pg.gain.setValueAtTime(0.08 * bsVol, t + totalDuration - 3);
    pg.gain.exponentialRampToValueAtTime(0.001, t + totalDuration);
    pad.connect(pg).connect(bg); pad.start(t); pad.stop(t + totalDuration + 0.5);
    nodes.push(pad);

    const pad2 = ctx.createOscillator(), pg2 = ctx.createGain();
    pad2.type = 'triangle'; pad2.frequency.value = 246.94;
    pg2.gain.setValueAtTime(0, t); pg2.gain.linearRampToValueAtTime(0.04 * bsVol, t+3);
    pg2.gain.setValueAtTime(0.04 * bsVol, t + totalDuration - 4);
    pg2.gain.exponentialRampToValueAtTime(0.001, t + totalDuration);
    pad2.connect(pg2).connect(bg); pad2.start(t); pad2.stop(t + totalDuration + 0.5);
    nodes.push(pad2);

    return nodes;
  }

  // Helper for direct audio streams
  function buildAudioStream(url, dest) {
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous";
    audio.loop = true;

    let source = null;
    try {
      source = getCtx().createMediaElementSource(audio);
      source.connect(dest);
    } catch (err) {
      console.warn("Web Audio Routing failed for element source:", err);
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("Audio playback failed on autoplay, will play on interaction:", err);
      });
    }

    return [
      {
        stop: () => {
          try { audio.pause(); } catch(e) {}
          audio.src = "";
        },
        disconnect: () => {
          if (source) {
            try { source.disconnect(); } catch(e) {}
          }
        }
      }
    ];
  }

  // ---- YouTube Player Integration (for Bouzoukia) ----
  let ytPlayer = null;
  let ytPlayerReady = false;
  let ytLoadingPromise = null;

  function loadYoutubeAPI() {
    if (window.YT) return Promise.resolve();
    if (ytLoadingPromise) return ytLoadingPromise;

    ytLoadingPromise = new Promise((resolve) => {
      // Check if tag already exists
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src === "https://www.youtube.com/iframe_api") {
          const prevCallback = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (prevCallback) prevCallback();
            resolve();
          };
          return;
        }
      }

      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        resolve();
      };
    });

    return ytLoadingPromise;
  }

  function initYTPlayer() {
    return new Promise((resolve) => {
      if (ytPlayerReady) {
        resolve(ytPlayer);
        return;
      }

      let container = document.getElementById('yt-player-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-player-container';
        container.style.position = 'absolute';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.overflow = 'hidden';
        container.style.bottom = '0';
        container.style.left = '0';
        document.body.appendChild(container);
      }

      let playerDiv = document.getElementById('yt-player');
      if (!playerDiv) {
        playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player';
        container.appendChild(playerDiv);
      }

      loadYoutubeAPI().then(() => {
        ytPlayer = new window.YT.Player('yt-player', {
          height: '1',
          width: '1',
          videoId: 'F77_FkRzR_k', // Greek Bouzoukia Instrumental Mix (1h15m)
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            loop: 1,
            playlist: 'F77_FkRzR_k'
          },
          events: {
            onReady: (event) => {
              ytPlayerReady = true;
              const vol = sceneVolumes['bouzoukia'] !== undefined ? sceneVolumes['bouzoukia'] : 0.7;
              ytPlayer.setVolume(vol * 100);
              resolve(ytPlayer);
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                ytPlayer.playVideo();
              }
            }
          }
        });
      });
    });
  }

  function buildBouzoukia(dest) {
    initYTPlayer().then((player) => {
      if (player && typeof player.playVideo === 'function') {
        player.playVideo();
        const vol = sceneVolumes['bouzoukia'] !== undefined ? sceneVolumes['bouzoukia'] : 0.7;
        player.setVolume(vol * 100);
      }
    });

    return [
      {
        stop: () => {
          if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
            try { ytPlayer.pauseVideo(); } catch(e) {}
          }
        },
        disconnect: () => {}
      }
    ];
  }

  const SCENES = {
    rain:          { build: buildRain },
    waves:         { build: buildWaves },
    brown:         { build: buildBrownNoise },
    nature:        { build: buildNatureForest },
    cafe:          { build: buildCafe },
    library:       { build: buildLibrary },
    jazz:          { build: buildJazz },
    bouzoukia:     { build: buildBouzoukia },
    binary_sunset: { build: buildBinarySunset }
  };

  // ============================================
  //  PLAY / STOP / LOOP
  // ============================================

function play(sceneKey) {
    if (!SCENES[sceneKey] || activeScenes[sceneKey]) return;
    getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const sg = ctx.createGain();
    sg.gain.value = sceneVolumes[sceneKey] !== undefined ? sceneVolumes[sceneKey] : 1.0;
    sg.connect(masterGain);
    sceneGains[sceneKey] = sg;

    activeScenes[sceneKey] = SCENES[sceneKey].build(sg);
    activeScenes[sceneKey].push({ disconnect: () => { sg.disconnect(); delete sceneGains[sceneKey]; } });
}


function stop(sceneKey) {
    if (activeScenes[sceneKey]) {
        activeScenes[sceneKey].forEach(n => {
            try { if (n.stop) n.stop(); } catch(e) {}
            try { if (n.disconnect) n.disconnect(); } catch(e) {}
        });
        delete activeScenes[sceneKey];
    }
}

  function stopAll() {
    Object.keys(activeScenes).forEach(k => stop(k));
  }

  function getActiveSceneKeys() {
    return Object.keys(activeScenes);
  }

  function crossfadeTo(callback) {
    const ac = getCtx();
    const currentVol = volume || 0.6;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(0, ac.currentTime, 0.1);
      setTimeout(() => {
        stopAll();
        if (callback) callback();
        if (masterGain) masterGain.gain.setTargetAtTime(currentVol, ac.currentTime, 0.1);
      }, 400);
    } else {
      stopAll();
      if (callback) callback();
    }
  }

  function isActive(sceneKey) { return !!activeScenes[sceneKey]; }
  function toggle(sk) { if (isActive(sk)) stop(sk); else play(sk); }

  return {
    play, stop, stopAll, isActive, toggle,
    setVolume, getVolume, setBsVolume,
    crossfadeTo, setSceneVolume,
    getActiveSceneKeys  // exposed so app.js visibilitychange can use it
  };
})();