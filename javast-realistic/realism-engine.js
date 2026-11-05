/* ==========================================================================
   REALISM ENGINE  —  shared procedural PBR-audio + physics helpers
   No external files / no textures.  Drop-in for any scene in this project.
   ========================================================================== */
(function () {
  'use strict';

  function createAudio() {
    let ctx = null, master = null, enabled = true;
    let magmaGain = null, magmaSrc = null, magmaFilter = null;
    let windGain = null, windSrc = null, windFilter = null;
    let rainGain = null, rainSrc = null, rainFilter = null;
    /* ---------- spatial listener ---------- */
    const listener = { x: 0, y: 0, z: 0 };
    function setListener(x, y, z) { listener.x = x; listener.y = y; listener.z = z; }

    /* distance attenuation: 0..1, falls off with distance, clipped at maxDist */
    function distGain(x, y, z, maxDist) {
      if (!maxDist) return 1;
      const dx = x - listener.x, dy = y - listener.y, dz = z - listener.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= maxDist) return 0;
      return Math.max(0, 1 - d / maxDist);
    }

    function init() {
      if (ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { enabled = false; return; }
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);

      magmaGain = ctx.createGain(); magmaGain.gain.value = 0;
      const magmaLP = ctx.createBiquadFilter(); magmaLP.type = 'lowpass'; magmaLP.frequency.value = 260;
      magmaGain.connect(magmaLP); magmaLP.connect(master);

      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      magmaSrc = ctx.createBufferSource(); magmaSrc.buffer = noiseBuf; magmaSrc.loop = true;
      magmaFilter = ctx.createBiquadFilter(); magmaFilter.type = 'bandpass'; magmaFilter.frequency.value = 90; magmaFilter.Q.value = 1.4;
      const magmaG2 = ctx.createGain(); magmaG2.gain.value = 0.35;
      magmaSrc.connect(magmaFilter); magmaFilter.connect(magmaG2); magmaG2.connect(magmaGain);
      magmaSrc.start();

      windGain = ctx.createGain(); windGain.gain.value = 0;
      windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 380; windFilter.Q.value = 0.7;
      const wBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const wd = wBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) wd[i] = (Math.random() * 2 - 1);
      windSrc = ctx.createBufferSource(); windSrc.buffer = wBuf; windSrc.loop = true;
      windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
      windSrc.start();

      rainGain = ctx.createGain(); rainGain.gain.value = 0;
      rainFilter = ctx.createBiquadFilter(); rainFilter.type = 'highpass'; rainFilter.frequency.value = 1200;
      const rBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const rd = rBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) rd[i] = (Math.random() * 2 - 1) * 0.25;
      rainSrc = ctx.createBufferSource(); rainSrc.buffer = rBuf; rainSrc.loop = true;
      rainSrc.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(master);
      rainSrc.start();
    }

    function start() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
    function setEnabled(on) { enabled = !!on; if (!ctx) return; master.gain.setTargetAtTime(enabled ? 0.55 : 0, ctx.currentTime, 0.1); }
    function magmaAmbient(level) { if (!ctx) return; level = Math.max(0, Math.min(1, level)); magmaGain.gain.setTargetAtTime(level * 0.45, ctx.currentTime, 0.4); magmaFilter.frequency.setTargetAtTime(70 + level * 60, ctx.currentTime, 0.4); }
    function wind(level) { if (!ctx) return; level = Math.max(0, Math.min(1, level)); windGain.gain.setTargetAtTime(level * 0.18, ctx.currentTime, 0.3); windFilter.frequency.setTargetAtTime(200 + level * 700, ctx.currentTime, 0.3); }
    function rain(level) { if (!ctx) return; level = Math.max(0, Math.min(1, level)); rainGain.gain.setTargetAtTime(level * 0.22, ctx.currentTime, 0.2); }

    function oneShot(freq, dur, type, gainVal, filterFreq) {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
      const g = ctx.createGain(); g.gain.setValueAtTime(gainVal, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (filterFreq) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; o.connect(f); f.connect(g); }
      else o.connect(g);
      g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }

    function noiseBurst(dur, gainVal, filterType, filterFreq, filterQ) {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filt = ctx.createBiquadFilter(); filt.type = filterType || 'bandpass'; filt.frequency.value = filterFreq || 800; filt.Q.value = filterQ || 1.2;
      const g = ctx.createGain(); g.gain.setValueAtTime(gainVal, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt); filt.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.05);
    }

    /* ---------- footsteps (real soil/rock, no bouncy cereal) ---------- */
    function footstep(surface, force) {
      if (!ctx || !enabled) return;
      force = force || 1;
      if (surface === 'rock' || surface === 'stone') {
        noiseBurst(0.10, 0.20 * force, 'bandpass', 700 + Math.random() * 400, 2.2);
        oneShot(100 + Math.random() * 80, 0.07, 'triangle', 0.06 * force);
      } else if (surface === 'soil' || surface === 'dirt') {
        noiseBurst(0.14, 0.26 * force, 'lowpass', 500, 0.7);
        oneShot(150 + Math.random() * 60, 0.09, 'sine', 0.05 * force, 400);
      } else if (surface === 'snow') {
        noiseBurst(0.20, 0.18 * force, 'lowpass', 1000, 0.5);
      } else if (surface === 'sand') {
        noiseBurst(0.16, 0.15 * force, 'bandpass', 1700, 1.6);
      } else if (surface === 'water' || surface === 'splash') {
        noiseBurst(0.28, 0.30 * force, 'bandpass', 650, 0.8);
        oneShot(200, 0.14, 'sine', 0.09 * force);
      } else {
        noiseBurst(0.11, 0.18 * force, 'bandpass', 900, 1.3);
      }
    }

    function footstepSpatial(surface, force, x, y, z, maxDist) {
      if (!ctx || !enabled) return;
      const g = distGain(x, y, z, maxDist);
      if (g <= 0) return;
      force = force || 1;
      const f = force * (0.4 + 0.6 * g);
      if (surface === 'rock' || surface === 'stone') {
        noiseBurst(0.10, 0.20 * f * g, 'bandpass', 700 + Math.random() * 400, 2.2);
        oneShot(100 + Math.random() * 80, 0.07, 'triangle', 0.06 * f * g);
      } else if (surface === 'soil' || surface === 'dirt') {
        noiseBurst(0.14, 0.26 * f * g, 'lowpass', 500, 0.7);
        oneShot(150 + Math.random() * 60, 0.09, 'sine', 0.05 * f * g, 400);
      } else if (surface === 'snow') {
        noiseBurst(0.20, 0.18 * f * g, 'lowpass', 1000, 0.5);
      } else if (surface === 'sand') {
        noiseBurst(0.16, 0.15 * f * g, 'bandpass', 1700, 1.6);
      } else if (surface === 'water' || surface === 'splash') {
        noiseBurst(0.28, 0.30 * f * g, 'bandpass', 650, 0.8);
        oneShot(200, 0.14, 'sine', 0.09 * f * g);
      } else {
        noiseBurst(0.11, 0.18 * f * g, 'bandpass', 900, 1.3);
      }
    }

    function magmaSplash(force) { if (!ctx || !enabled) return; force = force || 1; /* thick viscous lava impact — deep, low, not cereal-like */ noiseBurst(0.5, 0.4 * force, 'lowpass', 180, 0.5); noiseBurst(0.35, 0.3 * force, 'lowpass', 300, 0.7); oneShot(40 + Math.random() * 30, 0.4, 'sawtooth', 0.1 * force, 200); oneShot(90 + Math.random() * 50, 0.35, 'sine', 0.07 * force, 150); }
    function magmaSplashSpatial(force, x, y, z, maxDist) { if (!ctx || !enabled) return; force = force || 1; const g = distGain(x, y, z, maxDist); if (g <= 0) return; force *= g; noiseBurst(0.5, 0.4 * force, 'lowpass', 180, 0.5); noiseBurst(0.35, 0.3 * force, 'lowpass', 300, 0.7); oneShot(40 + Math.random() * 30, 0.4, 'sawtooth', 0.1 * force, 200); oneShot(90 + Math.random() * 50, 0.35, 'sine', 0.07 * force, 150); }
    function magmaBubble() { if (!ctx || !enabled) return; /* deep burp of gas through thick magma */ oneShot(35 + Math.random() * 50, 0.35, 'sawtooth', 0.12, 110); noiseBurst(0.15, 0.08, 'lowpass', 220, 0.6); }
    function splash(force) { if (!ctx || !enabled) return; force = force || 1; noiseBurst(0.28, 0.26 * force, 'bandpass', 650, 0.8); oneShot(300, 0.1, 'sine', 0.07 * force); }
    function thunder(force) { if (!ctx || !enabled) return; force = force || 1; noiseBurst(1.2, 0.4 * force, 'lowpass', 220, 0.4); oneShot(45, 0.6, 'sawtooth', 0.12 * force, 120); }

    function dispose() {
      try { if (magmaSrc) magmaSrc.stop(); } catch (e) {}
      try { if (windSrc) windSrc.stop(); } catch (e) {}
      try { if (rainSrc) rainSrc.stop(); } catch (e) {}
      if (ctx) { try { ctx.close(); } catch (e) {} }
      ctx = null;
    }

    return { start, setEnabled, dispose, magmaAmbient, wind, rain, footstep, footstepSpatial, magmaSplash, magmaSplashSpatial, magmaBubble, splash, thunder, setListener, distGain, get ctx() { return ctx; } };
  }

  function gravityStep(pos, vel, dt, groundFn, gravity) {
    gravity = gravity || 22;
    vel.y -= gravity * dt;
    pos.x += vel.x * dt; pos.y += vel.y * dt; pos.z += vel.z * dt;
    let ground = 0;
    if (typeof groundFn === 'function') ground = groundFn(pos.x, pos.z);
    if (pos.y <= ground) {
      const impact = Math.abs(vel.y);
      pos.y = ground; vel.y = 0;
      return { landed: true, impact: impact };
    }
    return { landed: false, impact: 0 };
  }

  window.RealismEngine = { createAudio: createAudio, gravityStep: gravityStep };
  console.log('[realism-engine] loaded');
})();

