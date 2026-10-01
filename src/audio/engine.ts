// Mesa de som: contexto, barramento por instrumento (filtro, pan, envio de reverb), reverb por convolução,
// compressor no master e "sidechain" (o pad abaixa no bumbo). Tudo sintetizado: sem arquivo de áudio.

export type BusId = 'guitar' | 'drums' | 'bass' | 'keys' | 'flute' | 'strings' | 'choir' | 'bells' | 'ui' | 'crowd' | 'jam';

export interface Bus {
  in: GainNode;
  filter: BiquadFilterNode;
  send: GainNode;
  pan: StereoPannerNode | null;
}

export let ctx: AudioContext | null = null;
export const bus = {} as Record<BusId, Bus>;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let verb: ConvolverNode | null = null;
export let noiseBuf: AudioBuffer | null = null;
/** Ganho do pad que o bumbo abaixa (sidechain). */
export let duck: GainNode | null = null;

const PREFS = 'tonic-audio';
export const prefs = readPrefs();

function readPrefs(): { muted: boolean; music: number; sfx: number; haptics: boolean } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) ?? '{}');
    return { muted: !!p.muted, music: p.music ?? 0.85, sfx: p.sfx ?? 0.8, haptics: p.haptics ?? true };
  } catch {
    return { muted: false, music: 0.85, sfx: 0.8, haptics: true };
  }
}

export function savePrefs() {
  try {
    localStorage.setItem(PREFS, JSON.stringify(prefs));
  } catch {
    // sem storage
  }
  applyVolumes();
}

function applyVolumes() {
  if (!ctx || !master || !musicGain || !sfxGain) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(prefs.muted ? 0 : 0.9, t, 0.05);
  musicGain.gain.setTargetAtTime(prefs.music, t, 0.05);
  sfxGain.gain.setTargetAtTime(prefs.sfx, t, 0.05);
}

/** Resposta ao impulso sintética: ruído com cauda que cai (sala média, 2,4 s). */
function makeIR(c: AudioContext, sec: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.floor(sr * sec);
  const b = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8) * (i < sr * 0.01 ? i / (sr * 0.01) : 1);
  }
  return b;
}

/** Liga o som (precisa de um toque do jogador: regra de autoplay do navegador). */
export function initAudio(): boolean {
  if (ctx) {
    void ctx.resume();
    return true;
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    return false;
  }
  const c = ctx;
  master = c.createGain();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  master.connect(comp).connect(c.destination);
  musicGain = c.createGain();
  sfxGain = c.createGain();
  musicGain.connect(master);
  sfxGain.connect(master);
  verb = c.createConvolver();
  verb.buffer = makeIR(c, 2.4);
  const verbOut = c.createGain();
  verbOut.gain.value = 0.55;
  verb.connect(verbOut).connect(master);
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  duck = c.createGain();
  duck.connect(musicGain);

  const mk = (id: BusId, gain: number, pan: number, lp: number, send: number, out: AudioNode) => {
    const g = c.createGain();
    g.gain.value = gain;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    f.Q.value = 0.5;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    const s = c.createGain();
    s.gain.value = send;
    g.connect(f);
    if (p) {
      p.pan.value = pan;
      f.connect(p).connect(out);
      p.connect(s);
    } else {
      f.connect(out);
      f.connect(s);
    }
    s.connect(verb!);
    bus[id] = { in: g, filter: f, send: s, pan: p };
  };
  mk('guitar', 0.6, -0.25, 3200, 0.1, musicGain);
  mk('drums', 0.72, 0, 16000, 0.06, musicGain);
  mk('bass', 0.7, 0, 1800, 0.02, musicGain);
  mk('keys', 0.36, 0.22, 5200, 0.14, musicGain);
  mk('flute', 0.34, 0.12, 9000, 0.22, musicGain);
  mk('strings', 0.22, -0.1, 3000, 0.3, duck);
  mk('choir', 0.2, 0, 4200, 0.45, duck);
  mk('bells', 0.18, 0.3, 12000, 0.35, musicGain);
  mk('crowd', 0.35, 0, 6000, 0.2, sfxGain);
  mk('ui', 0.45, 0, 14000, 0.12, sfxGain);
  mk('jam', 0.5, 0.05, 10000, 0.22, sfxGain);
  applyVolumes();
  void c.resume();
  return true;
}

export const now = () => (ctx ? ctx.currentTime : performance.now() / 1000);
export const running = () => !!ctx && ctx.state === 'running';

/** Latência de saída (pra julgar o toque do Jam com o que o ouvido escuta). */
export const outputLatency = () => (ctx ? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) : 0);

export function setMuted(m: boolean) {
  prefs.muted = m;
  savePrefs();
}

export function suspend() {
  void ctx?.suspend();
}

export function resume() {
  void ctx?.resume();
}

/** Brilho e reverb de um barramento (sobe com a raridade do instrumento e com a grade). */
export function setTone(id: BusId, lp: number, send: number, at = now()) {
  const b = bus[id];
  if (!b || !ctx) return;
  b.filter.frequency.setTargetAtTime(lp, at, 0.08);
  b.send.gain.setTargetAtTime(send, at, 0.08);
}

/** Vibração (Android); iOS ignora. */
export function haptic(ms: number | number[]) {
  if (!prefs.haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // sem vibração
  }
}
