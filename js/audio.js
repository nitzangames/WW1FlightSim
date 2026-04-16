let ctx = null;
let windNode = null;
let windGain = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

// Quiet wind ambient — low-pass filtered noise. Much subtler than an engine
// drone; just gives a sense of moving through air.
export function startWind() {
  if (!ctx || windNode) return;
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  windNode = ctx.createBufferSource();
  windNode.buffer = buf;
  windNode.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  windGain = ctx.createGain();
  windGain.gain.value = 0.04;
  windNode.connect(lp).connect(windGain).connect(ctx.destination);
  windNode.start();
}

export function stopWind() {
  if (windNode) { windNode.stop(); windNode.disconnect(); windNode = null; windGain = null; }
}

// Flyby whoosh — rising-then-falling pitch sweep triggered when an enemy
// passes close. Duration ~0.6s.
export function playFlyby() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(60, t);
  o.frequency.linearRampToValueAtTime(220, t + 0.25);
  o.frequency.linearRampToValueAtTime(45, t + 0.6);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.15);
  g.gain.linearRampToValueAtTime(0.0, t + 0.6);
  o.connect(lp).connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.65);
}

// Explosion boom — a bass thud for ground impacts.
export function playExplosion() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(20, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.55);
  // Noise layer for crunch
  const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 1.5);
  const ns = ctx.createBufferSource(); ns.buffer = nBuf;
  const ng = ctx.createGain(); ng.gain.value = 0.2;
  ns.connect(ng).connect(ctx.destination);
  ns.start(t);
}

// Death-spiral siren whine (player only) — descending tone.
export function playDeathWhine() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(80, t + 3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.linearRampToValueAtTime(0.0, t + 3);
  o.connect(lp).connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 3.1);
}

export function playGunBurst() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = 180 + Math.random() * 40;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.14, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.06);
}

export function playHit() {
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain(); g.gain.value = 0.3;
  src.connect(g).connect(ctx.destination);
  src.start();
}

export function playKill() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(400, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.65);
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
