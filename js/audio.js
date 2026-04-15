let ctx = null;
let engineOsc = null;
let engineGain = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

export function startEngine() {
  if (!ctx) return;
  if (engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 90;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.08;
  engineOsc.connect(lp).connect(engineGain).connect(ctx.destination);
  engineOsc.start();
}

export function stopEngine() {
  if (engineOsc) { engineOsc.stop(); engineOsc.disconnect(); engineOsc = null; engineGain = null; }
}

export function setEnginePitch(hz) {
  if (engineOsc) engineOsc.frequency.value = hz;
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
