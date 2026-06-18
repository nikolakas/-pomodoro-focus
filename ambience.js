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
  //  JAZZ — Late-night piano bar, walking bass, brush kit, sax
  // ============================================
  function buildJazz(dest) {
    const nodes = [];
    const state = { active: true };
    const ac = getCtx();

    // ---- Chord library (voiced for piano warmth, 4-note close voicings) ----
    // Frequencies are in Hz, voiced 2-4 octaves above bass
    const progression = [
      // A section — ii-V-I in C
      { name:'Dm9',   tones:[220.00, 261.63, 329.63, 392.00], bass:[73.42, 82.41, 92.50, 98.00] },
      { name:'G13',   tones:[196.00, 246.94, 329.63, 415.30], bass:[98.00, 110.00, 123.47, 130.81] },
      { name:'Cmaj9', tones:[261.63, 329.63, 392.00, 493.88], bass:[65.41, 73.42, 82.41, 92.50] },
      { name:'Cmaj9', tones:[261.63, 329.63, 392.00, 493.88], bass:[65.41, 82.41, 87.31, 98.00] },
      // B section — iii-VI-ii-V
      { name:'Em7',   tones:[246.94, 293.66, 369.99, 440.00], bass:[82.41, 87.31, 98.00, 110.00] },
      { name:'A7b9',  tones:[220.00, 277.18, 349.23, 466.16], bass:[110.00, 123.47, 130.81, 146.83] },
      { name:'Dm7',   tones:[220.00, 261.63, 329.63, 392.00], bass:[73.42, 82.41, 92.50, 98.00] },
      { name:'G7#5',  tones:[196.00, 246.94, 311.13, 392.00], bass:[98.00, 103.83, 116.54, 130.81] },
      // C section — IV-bVII turnaround (Monk-style)
      { name:'Fmaj7', tones:[261.63, 329.63, 349.23, 440.00], bass:[87.31, 98.00, 110.00, 116.54] },
      { name:'Bb7',   tones:[233.08, 293.66, 349.23, 466.16], bass:[116.54, 123.47, 130.81, 146.83] },
      { name:'Am7',   tones:[220.00, 261.63, 329.63, 440.00], bass:[110.00, 116.54, 130.81, 146.83] },
      { name:'D7alt', tones:[220.00, 277.18, 311.13, 369.99], bass:[73.42, 82.41, 87.31, 92.50] },
      // Back home
      { name:'G13',   tones:[196.00, 246.94, 329.63, 415.30], bass:[98.00, 110.00, 116.54, 123.47] },
      { name:'Cmaj7', tones:[261.63, 329.63, 392.00, 493.88], bass:[65.41, 73.42, 82.41, 98.00] },
      { name:'Am7',   tones:[220.00, 261.63, 329.63, 440.00], bass:[110.00, 116.54, 123.47, 130.81] },
      { name:'Dm9',   tones:[220.00, 261.63, 329.63, 392.00], bass:[73.42, 82.41, 87.31, 98.00] },
    ];
    let chordIdx = 0;

    // Piano comping — soft close-voiced chords with swing feel
    const playPianoComp = () => {
      if (!state.active) return;
      const prog = progression[chordIdx % progression.length];
      const t = ac.currentTime;

      // Sparse swing comping: beats 2 and 4 (swing 8ths)
      const compBeats = [0.1, 0.85, 1.6, 2.4].filter(() => Math.random() > 0.3);
      compBeats.forEach(beat => {
        const noteCount = 2 + Math.floor(Math.random() * 3);
        const voiced = prog.tones.slice(0, noteCount);
        voiced.forEach((fq, vi) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'sine'; o.frequency.value = fq * (Math.random() < 0.1 ? 2 : 1);
          // Slight detuning for piano chorus effect
          const o2 = ac.createOscillator(), g2 = ac.createGain();
          o2.type = 'sine'; o2.frequency.value = fq * 1.004;
          const vol = (0.028 - vi * 0.004) * (vi === 0 ? 0.5 : 1);
          const dur = 0.3 + Math.random() * 0.55;
          g.gain.setValueAtTime(0, t + beat);
          g.gain.linearRampToValueAtTime(vol, t + beat + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + beat + dur);
          g2.gain.setValueAtTime(0, t + beat);
          g2.gain.linearRampToValueAtTime(vol * 0.4, t + beat + 0.03);
          g2.gain.exponentialRampToValueAtTime(0.001, t + beat + dur + 0.1);
          o.connect(g).connect(dest); o2.connect(g2).connect(dest);
          o.start(t + beat); o.stop(t + beat + dur + 0.05);
          o2.start(t + beat); o2.stop(t + beat + dur + 0.15);
          nodes.push(o, o2);
        });
      });

      // Walking bass — 4 quarter notes with chromatic passing tones
      prog.bass.forEach((bf, bi) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = bf;
        const s = bi * 0.9 + (Math.random() < 0.25 ? 0.05 : 0); // slight swing delay
        const dur = 0.65 + Math.random() * 0.15;
        g.gain.setValueAtTime(0, t + s);
        g.gain.linearRampToValueAtTime(0.09, t + s + 0.03);
        g.gain.setValueAtTime(0.09, t + s + dur - 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + s + dur);
        o.connect(g).connect(dest); o.start(t + s); o.stop(t + s + dur + 0.05);
        nodes.push(o);
      });

      // ---- Saxophone — sawtooth + lowpass for warm reed tone, vibrato, longer phrases ----
      if (Math.random() > 0.15) {
        const melodyNotes = [
          ...prog.tones.map(f => f * 2),        // upper octave
          ...prog.tones,                          // chord tones
          prog.tones[2] * 1.5,                   // 5th above 3rd
          prog.tones[1] * 1.333,                 // passing tone
          prog.tones[0] * 1.125                  // maj 2nd above root
        ];
        const count = 3 + Math.floor(Math.random() * 4);
        let mOffset = 0.2 + Math.random() * 0.5;
        for (let m = 0; m < count; m++) {
          const freq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
          const dur = 0.35 + Math.random() * 1.1;
          // Sawtooth oscillator gives reed/brass harmonic content
          const sax = ac.createOscillator(), saxFilt = ac.createBiquadFilter(), saxG = ac.createGain();
          sax.type = 'sawtooth'; sax.frequency.value = freq;
          // Lowpass filter shapes the tone — lower cutoff = darker sax
          saxFilt.type = 'lowpass'; saxFilt.frequency.value = freq * 3.5; saxFilt.Q.value = 1.2;
          // Vibrato LFO
          const vib = ac.createOscillator(), vibG = ac.createGain();
          vib.type = 'sine'; vib.frequency.value = 5.2 + Math.random() * 1.2;
          vibG.gain.value = freq * 0.009;
          vib.connect(vibG); vibG.connect(sax.frequency);
          const saxVol = 0.038 + Math.random() * 0.016;
          // Breath attack + sustain + release
          saxG.gain.setValueAtTime(0, t + mOffset);
          saxG.gain.linearRampToValueAtTime(saxVol * 0.6, t + mOffset + 0.04);
          saxG.gain.linearRampToValueAtTime(saxVol, t + mOffset + 0.1);
          saxG.gain.setValueAtTime(saxVol * 0.88, t + mOffset + dur - 0.12);
          saxG.gain.exponentialRampToValueAtTime(0.001, t + mOffset + dur);
          sax.connect(saxFilt).connect(saxG).connect(dest);
          sax.start(t + mOffset); sax.stop(t + mOffset + dur + 0.06);
          vib.start(t + mOffset); vib.stop(t + mOffset + dur + 0.06);
          nodes.push(sax, vib);
          mOffset += dur + 0.04 + Math.random() * 0.2;
          if (mOffset > 4.5) break;
        }
      }

      // ---- Piano melody line — sparse single-note phrases above the comping ----
      if (Math.random() > 0.45) {
        const hiNotes = prog.tones.map(f => f * 4).concat(prog.tones.map(f => f * 2));
        let pOffset = 0.5 + Math.random() * 1.5;
        const pCount = 2 + Math.floor(Math.random() * 3);
        for (let p = 0; p < pCount; p++) {
          const freq = hiNotes[Math.floor(Math.random() * hiNotes.length)];
          const dur = 0.2 + Math.random() * 0.5;
          const po = ac.createOscillator(), po2 = ac.createOscillator(), pg = ac.createGain();
          po.type = 'sine'; po.frequency.value = freq;
          po2.type = 'triangle'; po2.frequency.value = freq * 2;
          const vol = 0.018 + Math.random() * 0.008;
          pg.gain.setValueAtTime(0, t + pOffset);
          pg.gain.linearRampToValueAtTime(vol, t + pOffset + 0.015);
          pg.gain.exponentialRampToValueAtTime(0.001, t + pOffset + dur);
          po.connect(pg).connect(dest);
          po2.connect(pg);
          po.start(t + pOffset); po.stop(t + pOffset + dur + 0.05);
          po2.start(t + pOffset); po2.stop(t + pOffset + dur + 0.05);
          nodes.push(po, po2);
          pOffset += dur + 0.08 + Math.random() * 0.3;
          if (pOffset > 4.5) break;
        }
      }

      chordIdx++;
    };

    playPianoComp();
    const compIv = setInterval(playPianoComp, 4800);
    nodes.push({ stop: () => { clearInterval(compIv); state.active = false; } });

    // Very subtle ride cymbal clicks — just a shimmer, not breathing
    const rideIv = setInterval(() => {
      if (!state.active || !ctx || ctx.state === 'closed') return;
      const t2 = ctx.currentTime;
      const n = ctx.createOscillator(), g = ctx.createGain();
      n.frequency.value = 8000 + Math.random() * 4000;
      g.gain.setValueAtTime(0.005, t2); g.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
      n.connect(g).connect(dest); n.start(t2); n.stop(t2 + 0.05);
    }, 600);
    nodes.push({ stop: () => clearInterval(rideIv) });

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

  // ============================================
  //  BOUZOUKIA — Greek taverna: strings, crowd, clinks
  // ============================================
  function buildBouzoukia(dest) {
    const nodes = [];
    const ac = getCtx();

    // Crowd murmur — filtered pink noise
    const crowd = createNoise('pink');
    const crowdFilt = createFilter('lowpass', 700, 0.4);
    const crowdG = createGainNode(0.045);
    crowd.connect(crowdFilt).connect(crowdG).connect(dest);
    crowd.start(); nodes.push(crowd);
    nodes.push(createLFO(0.07, 0.03, 0.055, crowdG.gain));

    // Glass clink transients — random timing
    const scheduleClicks = () => {
      const t = ac.currentTime;
      for (let i = 0; i < 4; i++) {
        const delay = 1 + Math.random() * 11;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = 1800 + Math.random() * 1200;
        g.gain.setValueAtTime(0, t + delay);
        g.gain.linearRampToValueAtTime(0.055, t + delay + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.55);
        o.connect(g).connect(dest); o.start(t + delay); o.stop(t + delay + 0.6);
        nodes.push(o);
      }
    };
    scheduleClicks();
    const clinkIv = setInterval(scheduleClicks, 12000);
    nodes.push({ stop: () => clearInterval(clinkIv) });

    // Bouzoukia strings — Phrygian Dominant phrases (E F G# A B C D)
    // E3=164.81 F3=174.61 G#3=207.65 A3=220 B3=246.94 C4=261.63 D4=293.66
    // E4=329.63 F4=349.23 G#4=415.30 A4=440
    const scale = [164.81, 174.61, 207.65, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 415.30, 440];
    const state = { active: true };

    const playPhrase = () => {
      if (!state.active) return;
      const t = ac.currentTime + 0.1;
      const count = 5 + Math.floor(Math.random() * 6);
      let offset = Math.random() * 0.4;
      for (let i = 0; i < count; i++) {
        const freq = scale[Math.floor(Math.random() * scale.length)];
        const dur = 0.12 + Math.random() * 0.3;
        const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = freq;
        f.type = 'lowpass'; f.frequency.value = 2000 + Math.random() * 800; f.Q.value = 1.8;
        g.gain.setValueAtTime(0, t + offset);
        g.gain.linearRampToValueAtTime(0.038, t + offset + 0.018);
        g.gain.setValueAtTime(0.038, t + offset + dur - 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
        o.connect(f).connect(g).connect(dest); o.start(t + offset); o.stop(t + offset + dur + 0.05);
        nodes.push(o);
        offset += dur + 0.04 + Math.random() * 0.12;
      }
    };

    playPhrase();
    const phraseIv = setInterval(playPhrase, 3800 + Math.random() * 1200);
    nodes.push({ stop: () => { clearInterval(phraseIv); state.active = false; } });

    // Bass drone — low E with tremolo (bouzoukia characteristic)
    const bass = ac.createOscillator(), bassG = createGainNode(0.032);
    bass.type = 'triangle'; bass.frequency.value = 82.41;
    bass.connect(bassG).connect(dest); bass.start(); nodes.push(bass);
    nodes.push(createLFO(5.8, 0.026, 0.040, bassG.gain));

    // Subtle tambourine shimmer
    const tamb = createNoise('white'), tambFilt = createFilter('highpass', 7500, 0.5);
    const tambG = createGainNode(0.006);
    tamb.connect(tambFilt).connect(tambG).connect(dest); tamb.start(); nodes.push(tamb);
    nodes.push(createLFO(4.2, 0.004, 0.010, tambG.gain));

    return nodes;
  }

  const SCENES = {
    rain:          { build: buildRain },
    waves:         { build: buildWaves },
    brown:         { build: buildBrownNoise },
    nature:        { build: buildNatureForest },
    cafe:          { build: () => [] },
    library:       { build: buildLibrary },
    jazz:          { build: () => [] },
    binary_sunset: { build: buildBinarySunset },
    bouzoukia:     { build: () => [] }
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
    // Resume immediately while still in the user-gesture stack
    if (ac.state === 'suspended') ac.resume();
    const currentVol = volume || 0.6;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      setTimeout(() => {
        stopAll();
        if (callback) callback();
        if (masterGain) masterGain.gain.setTargetAtTime(currentVol, ac.currentTime, 0.12);
      }, 350);
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