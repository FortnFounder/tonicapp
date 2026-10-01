// Sínteses. Cada função agenda uma nota no tempo `t` (relógio do áudio) num barramento.
// Violão: Karplus-Strong · Piano elétrico: FM · Baixo: seno + triângulo · Flauta: onda periódica com sopro
// Cordas e coro: serras desafinadas (coro com filtros de formante) · Bateria: ruído e osciladores.
import { mtof } from '../theory';
import { bus, ctx, duck, noiseBuf, type BusId } from './engine';

// ── Violão (Karplus-Strong com afinação fracionária por allpass) ────────────

const ksCache = new Map<string, AudioBuffer>();

function ksBuffer(m: number, bright: number): AudioBuffer {
  const k = m + '|' + bright;
  const hit = ksCache.get(k);
  if (hit) return hit;
  const c = ctx!;
  const sr = c.sampleRate;
  const f = mtof(m);
  const len = Math.floor(sr * 2.6);
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const N = sr / f;
  const Ni = Math.floor(N - 0.5);
  const frac = N - 0.5 - Ni;
  const C = (1 - frac) / (1 + frac);
  const line = new Float32Array(Ni);
  const br = [0.3, 0.45, 0.62, 0.78][bright];
  let lp = 0;
  let mean = 0;
  for (let i = 0; i < Ni; i++) {
    lp += br * (Math.random() * 2 - 1 - lp);
    line[i] = lp;
    mean += lp;
  }
  mean /= Ni;
  for (let i = 0; i < Ni; i++) line[i] -= mean;
  const g = [0.9962, 0.9972, 0.998, 0.9986][bright];
  let idx = 0;
  let apx = 0;
  let apy = 0;
  let peak = 0;
  for (let n = 0; n < len; n++) {
    const a = line[idx];
    const nx = idx + 1 === Ni ? 0 : idx + 1;
    const s = g * 0.5 * (a + line[nx]);
    const y = C * s + apx - C * apy;
    apx = s;
    apy = y;
    line[idx] = y;
    out[n] = a;
    if (Math.abs(a) > peak) peak = Math.abs(a);
    idx = nx;
  }
  const fade = Math.floor(sr * 0.08);
  const sc = 0.9 / (peak || 1);
  for (let n = 0; n < len; n++) {
    out[n] *= sc;
    if (n > len - fade) out[n] *= (len - n) / fade;
  }
  ksCache.set(k, buf);
  return buf;
}

/** Uma corda por voz: nota nova na mesma corda abafa a anterior (é o que a mão faz). */
const strings: ({ src: AudioBufferSourceNode; g: GainNode } | null)[] = [];

export function pluck(m: number, t: number, v: number, string: number, bright: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = ksBuffer(m, bright);
  const g = c.createGain();
  g.gain.value = v * 0.5;
  src.connect(g).connect(bus.guitar.in);
  src.start(t);
  src.stop(t + 2.6);
  const prev = strings[string];
  if (prev) {
    try {
      prev.g.gain.setTargetAtTime(0, t, 0.015);
      prev.src.stop(t + 0.15);
    } catch {
      // já parou
    }
  }
  strings[string] = { src, g };
}

/** Batida: pra baixo (grave → agudo) ou pra cima (só as 4 de cima). */
export function strum(voice: number[], t: number, dir: 1 | -1, v: number, bright: number) {
  const notes = dir > 0 ? voice : voice.slice(-4).reverse();
  const gap = dir > 0 ? 0.012 : 0.009;
  notes.forEach((m, i) => {
    const si = dir > 0 ? i : voice.length - 1 - i;
    pluck(m, t + i * gap, v * (1 - i * 0.035), si, bright);
  });
}

// ── Piano elétrico (FM, 2 operadores, com tine) ─────────────────────────────

export function ep(m: number, t: number, dur: number, v: number, out: BusId = 'keys') {
  const c = ctx!;
  const f = mtof(m);
  const car = c.createOscillator();
  const mo = c.createOscillator();
  const mg = c.createGain();
  const amp = c.createGain();
  car.frequency.value = f;
  mo.frequency.value = f;
  mg.gain.setValueAtTime(f * 2 * v, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.18 + 1, t + 0.8);
  mo.connect(mg).connect(car.frequency);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(v * 0.3, t + 0.006);
  amp.gain.exponentialRampToValueAtTime(v * 0.09 + 0.0001, t + 0.9);
  amp.gain.setTargetAtTime(0, t + dur, 0.12);
  car.connect(amp).connect(bus[out].in);
  if (f * 14 < 9000) {
    const ti = c.createOscillator();
    const tg = c.createGain();
    ti.frequency.value = f * 14;
    tg.gain.setValueAtTime(v * 0.04, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    ti.connect(tg).connect(bus[out].in);
    ti.start(t);
    ti.stop(t + 0.15);
  }
  car.start(t);
  mo.start(t);
  car.stop(t + dur + 0.8);
  mo.stop(t + dur + 0.8);
}

// ── Baixo ───────────────────────────────────────────────────────────────────

export function bass(m: number, t: number, dur: number, v: number, bright: number) {
  const c = ctx!;
  const f = mtof(m);
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = 'sine';
  o2.type = 'triangle';
  o1.frequency.value = f;
  o2.frequency.value = f;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 4;
  lp.frequency.setValueAtTime(f * (4 + bright * 2), t);
  lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.55, t + 0.008);
  g.gain.setTargetAtTime(v * 0.35, t + 0.03, 0.15);
  g.gain.setTargetAtTime(0, t + dur, 0.05);
  const g2 = c.createGain();
  g2.gain.value = 0.45;
  o1.connect(g);
  o2.connect(g2).connect(lp).connect(g);
  g.connect(bus.bass.in);
  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + 0.4);
  o2.stop(t + dur + 0.4);
}

// ── Flauta (e o solo do Jam) ────────────────────────────────────────────────

let fluteWave: PeriodicWave | null = null;

export function flute(m: number, t: number, dur: number, v: number, vib = 1, out: BusId = 'flute') {
  const c = ctx!;
  fluteWave ??= c.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.32, 0.1, 0.04]));
  const f = mtof(m);
  const o = c.createOscillator();
  o.setPeriodicWave(fluteWave);
  o.frequency.value = f;
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 5.3;
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f * 0.006 * vib, t + Math.min(dur, 0.4));
  lfo.connect(lg).connect(o.frequency);
  const amp = c.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(v * 0.24, t + 0.05);
  amp.gain.setValueAtTime(v * 0.2, t + Math.max(0.06, dur - 0.04));
  amp.gain.linearRampToValueAtTime(0, t + dur + 0.1);
  o.connect(amp).connect(bus[out].in);
  if (noiseBuf) {
    const n = c.createBufferSource();
    n.buffer = noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 1.5;
    const ng = c.createGain();
    ng.gain.setValueAtTime(v * 0.09, t);
    ng.gain.exponentialRampToValueAtTime(v * 0.012 + 0.0001, t + 0.12);
    ng.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    n.connect(bp).connect(ng).connect(bus[out].in);
    n.start(t, Math.random());
    n.stop(t + dur + 0.15);
  }
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.15);
  lfo.stop(t + dur + 0.15);
}

// ── Cordas e coro ───────────────────────────────────────────────────────────

/** Acorde sustentado de cordas: 2 serras desafinadas por nota, ataque lento; `swell` cresce até o fim. */
export function pad(ms: number[], t: number, dur: number, v: number, swell = false, out: BusId = 'strings') {
  const c = ctx!;
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(swell ? 900 : 1600, t);
  if (swell) lp.frequency.linearRampToValueAtTime(4200, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * (swell ? 0.35 : 0.7), t + Math.min(0.5, dur * 0.4));
  g.gain.linearRampToValueAtTime(v * (swell ? 1 : 0.6), t + dur);
  g.gain.setTargetAtTime(0, t + dur, 0.25);
  g.connect(lp).connect(bus[out].in);
  for (const m of ms) {
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      const og = c.createGain();
      og.gain.value = 0.12 / ms.length;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 1.2);
    }
  }
}

/** Coro "aah": serras por filtros de formante (vogal A: 800 e 1150 Hz). */
export function choir(ms: number[], t: number, dur: number, v: number) {
  const c = ctx!;
  const sum = c.createGain();
  sum.gain.setValueAtTime(0, t);
  sum.gain.linearRampToValueAtTime(v, t + 0.35);
  sum.gain.setTargetAtTime(0, t + dur, 0.4);
  for (const [fq, q, gain] of [
    [800, 6, 1],
    [1150, 8, 0.6],
    [2900, 10, 0.25],
  ]) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = fq;
    bp.Q.value = q;
    const fg = c.createGain();
    fg.gain.value = gain;
    sum.connect(bp).connect(fg).connect(bus.choir.in);
  }
  for (const m of ms) {
    for (const det of [-9, 0, 9]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 4.6 + Math.random();
      lg.gain.value = 3;
      lfo.connect(lg).connect(o.detune);
      const og = c.createGain();
      og.gain.value = 0.18 / ms.length;
      o.connect(og).connect(sum);
      o.start(t);
      lfo.start(t);
      o.stop(t + dur + 1.6);
      lfo.stop(t + dur + 1.6);
    }
  }
}

/** Sino (brilho dos compassos raros e das recompensas). */
export function bell(m: number, t: number, v: number, out: BusId = 'bells') {
  const c = ctx!;
  const f = mtof(m);
  for (const [ratio, g0, dec] of [
    [1, 1, 1.4],
    [2.76, 0.4, 0.6],
    [5.4, 0.2, 0.3],
  ]) {
    const o = c.createOscillator();
    o.frequency.value = f * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.25 * g0, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g).connect(bus[out].in);
    o.start(t);
    o.stop(t + dec + 0.05);
  }
}

// ── Bateria ─────────────────────────────────────────────────────────────────

function noise(t: number, dur: number, type: BiquadFilterType, freq: number, v: number, out: AudioNode, q?: number) {
  const c = ctx!;
  if (!noiseBuf) return;
  const n = c.createBufferSource();
  n.buffer = noiseBuf;
  const fl = c.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = freq;
  if (q) fl.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(fl).connect(g).connect(out);
  n.start(t, Math.random() * 1.5);
  n.stop(t + dur + 0.02);
}

export function kick(t: number, v: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g).connect(bus.drums.in);
  o.start(t);
  o.stop(t + 0.45);
  noise(t, 0.012, 'highpass', 3000, v * 0.2, bus.drums.in);
  // Sidechain: o pad abaixa no bumbo e volta (o "bombear" da mix).
  if (duck) {
    duck.gain.setValueAtTime(1, t);
    duck.gain.linearRampToValueAtTime(0.45, t + 0.01);
    duck.gain.setTargetAtTime(1, t + 0.04, 0.09);
  }
}

export function snare(t: number, v: number) {
  const c = ctx!;
  noise(t, 0.18, 'highpass', 900, v * 0.45, bus.drums.in);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.value = 185;
  g.gain.setValueAtTime(v * 0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(g).connect(bus.drums.in);
  o.start(t);
  o.stop(t + 0.1);
}

export const hat = (t: number, v: number, open = false) => noise(t, open ? 0.3 : 0.045, 'highpass', 7500, v * 0.16, bus.drums.in);
export const shaker = (t: number, v: number) => noise(t, 0.06, 'bandpass', 6000, v * 0.12, bus.drums.in, 2);
export const clap = (t: number, v: number) => [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.09, 'bandpass', 1400, v * 0.3, bus.drums.in, 1.5));

export function tom(t: number, v: number, f: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.25);
  g.gain.setValueAtTime(v * 0.7, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g).connect(bus.drums.in);
  o.start(t);
  o.stop(t + 0.35);
}

export function conga(t: number, v: number, high: boolean) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = high ? 330 : 220;
  o.frequency.setValueAtTime(f * 1.4, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  g.gain.setValueAtTime(v * 0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(bus.drums.in);
  o.start(t);
  o.stop(t + 0.22);
}

/** Prato: quadradas em razões inarmônicas + ruído (o "ataque" da soltura). */
export function crash(t: number, v: number, ride = false) {
  const c = ctx!;
  const g = c.createGain();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = ride ? 5000 : 3500;
  const dec = ride ? 0.6 : 1.8;
  g.gain.setValueAtTime(v * (ride ? 0.08 : 0.16), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  hp.connect(g).connect(bus.drums.in);
  for (const r of [1, 1.483, 1.932, 2.546, 2.63, 3.897]) {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = 300 * r;
    o.connect(hp);
    o.start(t);
    o.stop(t + dec);
  }
  noise(t, dec * 0.8, 'highpass', 6000, v * (ride ? 0.05 : 0.14), bus.drums.in);
}

// ── Público ─────────────────────────────────────────────────────────────────

export function applause(t: number, sec = 2.6, v = 1) {
  for (let i = 0; i < 220 * sec * 0.4; i++) {
    const tt = t + Math.random() * sec * Math.pow(Math.random(), 0.5);
    noise(tt, 0.03, 'bandpass', 900 + Math.random() * 1500, (0.05 + Math.random() * 0.08) * v, bus.crowd.in, 1.2);
  }
}

/** Murmúrio de público (fundo do show). */
export function crowdBed(t: number, sec: number, v: number) {
  const c = ctx!;
  if (!noiseBuf) return;
  const n = c.createBufferSource();
  n.buffer = noiseBuf;
  n.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 500;
  bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.08, t + 1);
  g.gain.setValueAtTime(v * 0.08, t + sec - 1);
  g.gain.linearRampToValueAtTime(0, t + sec);
  n.connect(bp).connect(g).connect(bus.crowd.in);
  n.start(t);
  n.stop(t + sec + 0.1);
}

export function cheer(t: number, v: number) {
  const c = ctx!;
  if (!noiseBuf) return;
  const n = c.createBufferSource();
  n.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(700, t);
  bp.frequency.linearRampToValueAtTime(1300, t + 0.6);
  bp.Q.value = 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.25, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  n.connect(bp).connect(g).connect(bus.crowd.in);
  n.start(t, Math.random());
  n.stop(t + 1.5);
}
