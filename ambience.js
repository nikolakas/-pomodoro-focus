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
    const nodes = [];
    const state = { active: true };

    const murmur = createNoise('pink');
    murmur.connect(createFilter('bandpass', 500, 0.6)).connect(createGainNode(0.14)).connect(dest);
    murmur.start(); nodes.push(murmur);

    const speech = createNoise('pink'), sg = createGainNode(0.06);
    speech.connect(createFilter('bandpass', 1200, 0.8)).connect(createFilter('bandpass', 2500, 0.5)).connect(sg).connect(dest);
    speech.start(); nodes.push(speech);
    nodes.push(createLFO(0.07, 0.02, 0.08, sg.gain));

    const speechHigh = createNoise('white'), shg = createGainNode(0.02);
    speechHigh.connect(createFilter('bandpass', 3000, 1.2)).connect(shg).connect(dest);
    speechHigh.start(); nodes.push(speechHigh);
    nodes.push(createLFO(0.08, 0.005, 0.03, shg.gain));

    const clinkDelay = getCtx().createDelay();
    clinkDelay.delayTime.value = 0.08;
    const clinkGain = createGainNode(0.3);
    clinkDelay.connect(clinkGain).connect(dest);

    function loopClink() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      const freq = 2500 + Math.random() * 2500;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.08);
      g.gain.setValueAtTime(0.015 + Math.random() * 0.01, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(dest);
      g.connect(clinkDelay);
      o.start(t); o.stop(t + 0.15);
      if (Math.random() < 0.4) {
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.frequency.value = freq * 1.3;
        g2.gain.setValueAtTime(0.008, t + 0.06);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o2.connect(g2).connect(dest);
        g2.connect(clinkDelay);
        o2.start(t + 0.06); o2.stop(t + 0.16);
      }
      setTimeout(loopClink, 2000 + Math.random() * 4000);
    }
    setTimeout(loopClink, 1000);

    function loopMachine() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.6) {
        const t = ctx.currentTime;
        const steam = createNoise('white');
        const bp = createFilter('bandpass', 4000 + Math.random() * 2000, 1.5);
        const g = ctx.createGain();
        const dur = 2 + Math.random() * 4;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.5);
        g.gain.setValueAtTime(0.04, t + dur - 1);
        g.gain.linearRampToValueAtTime(0, t + dur);
        steam.connect(bp).connect(g).connect(dest);
        steam.start(t); steam.stop(t + dur + 0.5);
      }
      if (Math.random() <= 0.3) {
        const t = ctx.currentTime;
        const grinder = createNoise('brown');
        const lp = createFilter('lowpass', 250, 1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.8);
        g.gain.setValueAtTime(0.06, t + 3);
        g.gain.linearRampToValueAtTime(0, t + 4);
        grinder.connect(lp).connect(g).connect(dest);
        grinder.start(t); grinder.stop(t + 4.5);
      }
      setTimeout(loopMachine, 12000 + Math.random() * 15000);
    }
    setTimeout(loopMachine, 3000);

    function loopSteps() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.5) {
        const t = ctx.currentTime;
        const stepCount = 3 + Math.floor(Math.random() * 5);
        const stepInterval = 0.35 + Math.random() * 0.15;
        for (let i = 0; i < stepCount; i++) {
          const st = t + i * stepInterval;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(80 + Math.random() * 40, st);
          o.frequency.exponentialRampToValueAtTime(30, st + 0.08);
          g.gain.setValueAtTime(0.015 + Math.random() * 0.008, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.1);
          o.connect(g).connect(dest); o.start(st); o.stop(st + 0.12);
          const n = createNoise('white'), fg = ctx.createGain();
          fg.gain.setValueAtTime(0.008, st);
          fg.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
          n.connect(createFilter('highpass', 3000, 0.5)).connect(fg).connect(dest);
          n.start(st); n.stop(st + 0.05);
        }
      }
      setTimeout(loopSteps, 6000 + Math.random() * 10000);
    }
    setTimeout(loopSteps, 2000);

    function loopPaper() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.4) {
        const t = ctx.currentTime;
        const crinkles = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < crinkles; i++) {
          const ct = t + i * (0.04 + Math.random() * 0.06);
          const n = createNoise('white'), g = ctx.createGain();
          g.gain.setValueAtTime(0, ct);
          g.gain.linearRampToValueAtTime(0.012, ct + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, ct + 0.08);
          n.connect(createFilter('bandpass', 5000 + Math.random() * 3000, 2)).connect(g).connect(dest);
          n.start(ct); n.stop(ct + 0.1);
        }
      }
      setTimeout(loopPaper, 8000 + Math.random() * 15000);
    }
    setTimeout(loopPaper, 5000);

    function loopBell() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const o1 = ctx.createOscillator(), g1 = ctx.createGain();
      o1.type = 'sine'; o1.frequency.value = 1200;
      g1.gain.setValueAtTime(0.018, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o1.connect(g1).connect(dest); o1.start(t); o1.stop(t + 1);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = 900;
      g2.gain.setValueAtTime(0.018, t + 0.08); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.88);
      o2.connect(g2).connect(dest); o2.start(t + 0.08); o2.stop(t + 1);
      setTimeout(loopBell, 45000 + Math.random() * 45000);
    }
    setTimeout(loopBell, 15000);

    function loopCafeCreak() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
      g.gain.setValueAtTime(0.012, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + 0.4);
      setTimeout(loopCafeCreak, 20000 + Math.random() * 20000);
    }
    setTimeout(loopCafeCreak, 5000 + Math.random() * 5000);

    nodes.push({ stop: () => { state.active = false; } });
    return nodes;
  }

  // ============================================
  //  LIBRARY
  // ============================================
  function buildLibrary(dest) {
    const nodes = [];
    const state = { active: true };

    const room = createNoise('brown');
    const roomGain = createGainNode(0.1);
    room.connect(createFilter('lowpass', 150, 0.5)).connect(roomGain).connect(dest);
    room.start(); nodes.push(room);
    nodes.push(createLFO(0.05, 0.08, 0.12, roomGain.gain));

    const hum = getCtx().createOscillator();
    hum.type = 'sine'; hum.frequency.value = 60;
    const humGain = createGainNode(0.015);
    hum.connect(humGain).connect(dest);
    hum.start(); nodes.push(hum);
    nodes.push(createLFO(0.5, 58, 62, hum.frequency));

    const air = createNoise('pink');
    air.connect(createFilter('bandpass', 2500, 0.3)).connect(createGainNode(0.012)).connect(dest);
    air.start(); nodes.push(air);

    function loopPages() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const n = createNoise('white'), g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.015, t + 0.04);
      g.gain.linearRampToValueAtTime(0.02, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      n.connect(createFilter('bandpass', 5500, 2)).connect(g).connect(dest);
      n.start(t); n.stop(t + 0.35);
      const n2 = createNoise('white'), g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t + 0.05);
      g2.gain.linearRampToValueAtTime(0.008, t + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      n2.connect(createFilter('bandpass', 7000, 1.5)).connect(g2).connect(dest);
      n2.start(t + 0.05); n2.stop(t + 0.3);
      setTimeout(loopPages, 5000 + Math.random() * 10000);
    }
    setTimeout(loopPages, 2000);

    function loopBooks() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.5) {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(100 + Math.random() * 40, t);
        o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g).connect(dest); o.start(t); o.stop(t + 0.25);
        const n = createNoise('brown'), ng = ctx.createGain();
        ng.gain.setValueAtTime(0.03, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        n.connect(createFilter('lowpass', 400, 0.8)).connect(ng).connect(dest);
        n.start(t); n.stop(t + 0.15);
      }
      setTimeout(loopBooks, 10000 + Math.random() * 12000);
    }
    setTimeout(loopBooks, 6000);

    function loopSteps() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.4) {
        const t = ctx.currentTime;
        const stepCount = 4 + Math.floor(Math.random() * 6);
        const stepInterval = 0.5 + Math.random() * 0.2;
        for (let i = 0; i < stepCount; i++) {
          const st = t + i * stepInterval;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(60 + Math.random() * 20, st);
          o.frequency.exponentialRampToValueAtTime(25, st + 0.06);
          g.gain.setValueAtTime(0.008, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.08);
          o.connect(g).connect(dest); o.start(st); o.stop(st + 0.1);
        }
      }
      setTimeout(loopSteps, 12000 + Math.random() * 15000);
    }
    setTimeout(loopSteps, 4000);

    function loopTyping() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.5) {
        const t = ctx.currentTime;
        const keyCount = 5 + Math.floor(Math.random() * 15);
        for (let i = 0; i < keyCount; i++) {
          const kt = t + i * (0.06 + Math.random() * 0.1);
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = 3000 + Math.random() * 3000;
          g.gain.setValueAtTime(0.004 + Math.random() * 0.003, kt);
          g.gain.exponentialRampToValueAtTime(0.001, kt + 0.02);
          o.connect(g).connect(dest); o.start(kt); o.stop(kt + 0.03);
        }
      }
      setTimeout(loopTyping, 4000 + Math.random() * 8000);
    }
    setTimeout(loopTyping, 3000);

    const whisper = createNoise('pink'), wg = createGainNode(0.008);
    whisper.connect(createFilter('bandpass', 1800, 1.5)).connect(wg).connect(dest);
    whisper.start(); nodes.push(whisper);
    nodes.push(createLFO(0.12, 0.002, 0.012, wg.gain));

    function loopCreak() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.3) {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200 + Math.random() * 100, t);
        o.frequency.exponentialRampToValueAtTime(80 + Math.random() * 50, t + 0.15);
        g.gain.setValueAtTime(0.006, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(createFilter('lowpass', 500, 0.5)).connect(g).connect(dest);
        o.start(t); o.stop(t + 0.2);
      }
      setTimeout(loopCreak, 15000 + Math.random() * 20000);
    }
    setTimeout(loopCreak, 8000);

    const clockInt = setInterval(() => {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const n = createNoise('white'), g = ctx.createGain();
      g.gain.setValueAtTime(0.01, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
      n.connect(createFilter('highpass', 6000, 1)).connect(g).connect(dest);
      n.start(t); n.stop(t + 0.01);
    }, 1000);
    nodes.push({ stop: () => clearInterval(clockInt) });

    function loopTyping2() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      if (Math.random() <= 0.5) {
        const t = ctx.currentTime + 0.8;
        const keyCount = 5 + Math.floor(Math.random() * 15);
        for (let i = 0; i < keyCount; i++) {
          const kt = t + i * (0.06 + Math.random() * 0.1);
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = 3000 + Math.random() * 3000;
          g.gain.setValueAtTime((0.004 + Math.random() * 0.003) * 0.4, kt);
          g.gain.exponentialRampToValueAtTime(0.001, kt + 0.02);
          o.connect(g).connect(dest); o.start(kt); o.stop(kt + 0.03);
        }
      }
      setTimeout(loopTyping2, 4000 + Math.random() * 8000);
    }
    setTimeout(loopTyping2, 3800);

    function loopCough() {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const t = ctx.currentTime;
      const n = createNoise('pink'), g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      n.connect(createFilter('bandpass', 600, 1)).connect(g).connect(dest);
      n.start(t); n.stop(t + 0.5);
      setTimeout(loopCough, 60000 + Math.random() * 60000);
    }
    setTimeout(loopCough, 60000);

    nodes.push({ stop: () => { state.active = false; } });
    return nodes;
  }

  // ============================================
  //  JAZZ
  // ============================================
  function buildJazz(dest) {
    const nodes = [];
    const state = { active: true };

const chords = [
    // ii-V-I in C — standard jazz turnaround
    [146.83, 174.61, 220.00, 261.63],   // Dm7
    [196.00, 246.94, 293.66, 349.23],   // G7
    [130.81, 164.81, 196.00, 246.94],   // Cmaj7
    [130.81, 164.81, 196.00, 246.94],   // Cmaj7 hold

    // iii-VI-ii-V — bird-style bridge
    [164.81, 196.00, 246.94, 293.66],   // Em7
    [220.00, 277.18, 329.63, 415.30],   // A7
    [146.83, 174.61, 220.00, 261.63],   // Dm7
    [196.00, 246.94, 293.66, 349.23],   // G7

    // IV-III-VI-II — minor excursion
    [174.61, 220.00, 261.63, 329.63],   // Fmaj7
    [164.81, 196.00, 246.94, 293.66],   // Em7
    [220.00, 261.63, 329.63, 392.00],   // Am7
    [146.83, 174.61, 220.00, 261.63],   // Dm7

    // Back home
    [196.00, 246.94, 293.66, 349.23],   // G7
    [130.81, 164.81, 196.00, 246.94],   // Cmaj7
    [130.81, 164.81, 196.00, 246.94],   // Cmaj7
    [146.83, 174.61, 220.00, 261.63],   // Dm7 (loop back)
];
let idx = 0;

    const playChord = () => {
      if (!ctx || ctx.state === 'closed' || !state.active) return;
      const chord = chords[idx++ % chords.length];
      const t = ctx.currentTime;

      chord.forEach((fq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = fq;
        const vol = 0.05 - i * 0.005;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.15);
        g.gain.setValueAtTime(vol, t + 3.2);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3.8);
        o.connect(g).connect(dest); o.start(t); o.stop(t + 4);

        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = fq * 1.003;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(vol * 0.3, t + 0.2);
        g2.gain.setValueAtTime(vol * 0.3, t + 3.0);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 3.6);
        o2.connect(g2).connect(dest); o2.start(t); o2.stop(t + 4);
      });

      const bassRoot = chord[0] * 0.5;
      const bassNotes = [bassRoot, chord[1] * 0.5, chord[2] * 0.5, bassRoot * 1.06];
      bassNotes.forEach((bf, bi) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = bf;
        const s = bi * 0.95;
        g.gain.setValueAtTime(0, t + s);
        g.gain.linearRampToValueAtTime(0.08, t + s + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + s + 0.85);
        o.connect(g).connect(dest); o.start(t + s); o.stop(t + s + 0.9);
      });

      if (Math.random() > 0.25) {
        const saxNotes = [chord[2], chord[3], chord[1] * 2, chord[0] * 2];
        const noteIdx = Math.floor(Math.random() * saxNotes.length);
        const saxFreq = saxNotes[noteIdx] * (Math.random() > 0.5 ? 2 : 1);
        const delay = 0.5 + Math.random() * 2.5;
        const dur = 0.4 + Math.random() * 1.0;

        const sax = ctx.createOscillator(), saxG = ctx.createGain();
        sax.type = 'sine'; sax.frequency.value = saxFreq;
        const vib = ctx.createOscillator(), vibG = ctx.createGain();
        vib.type = 'sine'; vib.frequency.value = 5 + Math.random() * 2;
        vibG.gain.value = saxFreq * 0.015;
        vib.connect(vibG); vibG.connect(sax.frequency);

        saxG.gain.setValueAtTime(0, t + delay);
        saxG.gain.linearRampToValueAtTime(0.03, t + delay + 0.08);
        saxG.gain.setValueAtTime(0.03, t + delay + dur - 0.1);
        saxG.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

        sax.connect(saxG).connect(dest);
        sax.start(t + delay); sax.stop(t + delay + dur + 0.05);
        vib.start(t + delay); vib.stop(t + delay + dur + 0.05);
      }

      if (Math.random() > 0.35) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = chord[Math.floor(Math.random() * chord.length)] * (2 + Math.floor(Math.random() * 2));
        const d = 0.8 + Math.random() * 2.2;
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(0.02, t + d + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.7);
        o.connect(g).connect(dest); o.start(t + d); o.stop(t + d + 0.8);
      }
    };

    playChord();
    const iv = setInterval(playChord, 4800);
    nodes.push({ stop: () => { clearInterval(iv); state.active = false; } });

    const brush = createNoise('pink'), bg = createGainNode(0.005);
    brush.connect(createFilter('bandpass', 6000, 2)).connect(bg).connect(dest);
    brush.start(); nodes.push(brush);
    nodes.push(createLFO(2.2, 0.006, 0.028, bg.gain));

    const hihat = createNoise('white'), hg = createGainNode(0.002);
    hihat.connect(createFilter('highpass', 8000, 0.5)).connect(hg).connect(dest);
    hihat.start(); nodes.push(hihat);
    nodes.push(createLFO(3.3, 0.003, 0.012, hg.gain));

    return nodes;
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

  const SCENES = {
    rain:          { build: buildRain },
    waves:         { build: buildWaves },
    brown:         { build: buildBrownNoise },
    nature:        { build: buildNatureForest },
    cafe:          { build: buildCafe },
    library:       { build: buildLibrary },
    jazz:          { build: buildJazz },
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

    // Create a gain node for this scene and wire it
    const sg = ctx.createGain();
    sg.gain.value = sceneVolumes[sceneKey] !== undefined ? sceneVolumes[sceneKey] : 1.0;
    sg.connect(masterGain);
    sceneGains[sceneKey] = sg;

    // Pass dest directly into builder — no more global currentBuildingScene
    activeScenes[sceneKey] = SCENES[sceneKey].build(sg);
    activeScenes[sceneKey].push({ disconnect: () => { sg.disconnect(); delete sceneGains[sceneKey]; } });
  }

  function stop(sceneKey) {
    if (activeScenes[sceneKey]) {
      activeScenes[sceneKey].forEach(n => {
        try { if (n.stop) n.stop(); } catch {}
        try { if (n.disconnect) n.disconnect(); } catch {}
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