/* ============================================
   AMBIENT SOUNDS ENGINE — Procedural Web Audio
   Cafe scene is driven by YouTube (see app.js _initYTChannel);
   binary_sunset is the only remaining procedural scene.
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
    cafe:          { build: () => [] },
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