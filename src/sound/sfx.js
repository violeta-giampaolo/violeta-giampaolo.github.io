// Small UI sounds, synthesised in the browser (no audio files to load).
// Browsers only allow sound after the visitor's first click / tap / key press,
// so hover ticks stay silent until then.

const STORAGE_KEY = 'sound-on';
let ctx = null;
let master = null;
let enabled = readSaved();
const listeners = new Set();

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

function unlock() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, unlock, { capture: true }));

function ready() {
  return enabled && ctx && ctx.state === 'running';
}

function noiseBuffer(seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A short burst of filtered noise — the "tick" of paper / wood.
function burst({ freq, q = 8, gain, decay }) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(decay + 0.02);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(filter).connect(env).connect(master);
  src.start(t);
  src.stop(t + decay + 0.02);
}

// A soft pitched knock — the body of a click.
function knock({ freq, gain, decay }) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.6, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + decay + 0.02);
}

// A soft "whoosh": noise swept through a filter.
function sweep({ from, to, gain, duration }) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(duration + 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + duration * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(env).connect(master);
  src.start(t);
  src.stop(t + duration + 0.05);
}

let lastTick = 0;

export const sfx = {
  // Hovering a new book: tiny tick, slightly different pitch each time.
  hover() {
    if (!ready()) return;
    const now = performance.now();
    if (now - lastTick < 35) return;
    lastTick = now;
    burst({ freq: 2600 + Math.random() * 1400, q: 10, gain: 0.35, decay: 0.035 });
  },
  // Clicking: a rounder "thock".
  click() {
    if (!ready()) return;
    knock({ freq: 140, gain: 0.6, decay: 0.12 });
    burst({ freq: 1800, q: 3, gain: 0.25, decay: 0.05 });
  },
  // A book lifting off the shelf (or flying back).
  whoosh(back = false) {
    if (!ready()) return;
    sweep(back ? { from: 1600, to: 300, gain: 0.35, duration: 0.45 } : { from: 300, to: 1800, gain: 0.35, duration: 0.5 });
  },
  // Sliding to the next / previous book.
  slide() {
    if (!ready()) return;
    sweep({ from: 900, to: 500, gain: 0.2, duration: 0.28 });
  },
  // A page turning: a quick papery swish.
  page() {
    if (!ready()) return;
    sweep({ from: 2600, to: 1200, gain: 0.22, duration: 0.32 });
    burst({ freq: 5200, q: 2, gain: 0.08, decay: 0.12 });
  },
  isOn: () => enabled,
  setOn(on) {
    enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      /* private mode: just don't remember */
    }
    listeners.forEach((fn) => fn(on));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
