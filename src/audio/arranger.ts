// O arranjo: o que cada instrumento toca num compasso. Sobe com a raridade do instrumento
// e reage ao compasso (tensão acumulando, soltura na tônica, grade Sweet/Soaring/Transcendent).
// O som ensina a regra: o jogador ouve a conta que o jogo está fazendo.
import { CHORD, type GradeId, type InstId } from '../content';
import { absPcs, chordName, fnOf, mod12, nearestVoicing, type ModeId, type Tonic } from '../theory';
import { ctx, setTone } from './engine';
import * as I from './instruments';

export interface BarSpec {
  id: string;
  nextId: string;
  prevId: string;
  grade: GradeId;
  /** Tensão solta neste compasso e o acumulado depois dele. */
  released: number;
  stored: number;
  slot: number;
  loopLen: number;
}

export interface BandView {
  own: Record<InstId, boolean>;
  r: Record<InstId, number>;
}

export interface ArrangeCtx {
  tonic: Tonic;
  mode: ModeId;
  /** Alturas absolutas do modo. */
  scale: number[];
  band: BandView;
  /** Duração de uma semicolcheia (s). */
  six: number;
  /** Assinatura do loop (pra melodia repetir igual a cada volta: vira gancho). */
  loopKey: string;
  loop: string[];
}

export interface Hit {
  t: number;
  inst: InstId;
}

const above = (m: number, pc: number) => {
  let x = m + 1;
  while (mod12(x) !== pc) x++;
  return x;
};

// ── Violão ──────────────────────────────────────────────────────────────────

const OPEN: Record<string, number[]> = {
  C: [48, 52, 55, 60, 64],
  Dm: [50, 57, 62, 65],
  Em: [40, 47, 52, 55, 59, 64],
  F: [41, 48, 53, 57, 60, 65],
  G: [43, 47, 50, 55, 59, 67],
  Am: [45, 52, 57, 60, 64],
  'B°': [47, 53, 59, 62],
  D: [50, 57, 62, 66],
  A: [45, 52, 57, 61, 64],
  E: [40, 47, 52, 56, 59, 64],
  Bm: [47, 54, 59, 62, 66],
  'F♯m': [42, 49, 54, 57, 61, 66],
  'B♭': [46, 53, 58, 62, 65],
  Gm: [43, 50, 55, 58, 62, 67],
  G7: [43, 47, 50, 55, 59, 65],
  Am7: [45, 52, 55, 60, 64],
  Dm7: [50, 57, 60, 65],
  Cmaj7: [48, 52, 55, 59, 64],
  E7: [40, 47, 50, 56, 59, 64],
  D7: [50, 57, 60, 66],
  A7: [45, 52, 55, 61, 64],
  Em7: [40, 47, 50, 55, 59, 64],
  C7: [48, 52, 58, 60, 64],
};

function guitarVoice(id: string, t: Tonic): number[] {
  const name = chordName(CHORD[id], t);
  if (OPEN[name]) return OPEN[name];
  const p = absPcs(CHORD[id], t);
  const root = 40 + mod12(p[0] - 40);
  const v = [root, above(root, p[2]), root + 12];
  v.push(above(v[2], p[1]));
  v.push(above(v[3], p[3] ?? p[2]));
  return v.filter((m) => m <= 68);
}

// ── Melodia (gancho que repete a cada volta) ────────────────────────────────

/** Ritmos da melodia por raridade da flauta: [início em semicolcheias, duração]. */
const TPL: [number, number][][][] = [
  [[[0, 8], [8, 8]], [[0, 12], [12, 4]]],
  [[[0, 4], [4, 4], [8, 4], [12, 4]], [[0, 4], [4, 4], [8, 8]], [[0, 6], [6, 2], [8, 8]]],
  [[[0, 6], [6, 2], [8, 4], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 8]], [[2, 2], [4, 4], [8, 2], [10, 2], [12, 4]]],
  [[[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 2], [14, 2]], [[0, 8], [8, 1], [9, 1], [10, 2], [12, 4]], [[0, 6], [6, 2], [8, 4], [12, 2], [14, 2]]],
];

function rngOf(seed: string) {
  let s = 7;
  for (const ch of seed) s = (Math.imul(s, 31) + ch.charCodeAt(0)) | 0;
  s = s >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

let melCache: { k: string; bars: { s: number; m: number; d: number }[][] } = { k: '', bars: [] };

/** Nota do acorde nos tempos fortes (a mais perto da anterior), grau vizinho nos fracos (nota de passagem). */
function melody(a: ArrangeCtx, r: number): { s: number; m: number; d: number }[][] {
  const k = a.loopKey + '|' + r;
  if (melCache.k === k) return melCache.bars;
  const R = rngOf(k);
  const pool: number[] = [];
  for (let m = 69; m <= 91; m++) if (a.scale.includes(mod12(m))) pool.push(m);
  let prev = 76;
  const bars = a.loop.map((id) => {
    const ct = absPcs(CHORD[id], a.tonic);
    const tp = TPL[r][Math.floor(R() * TPL[r].length)];
    return tp.map(([st, du]) => {
      let m: number;
      if (st % 4 === 0) {
        const c = pool.filter((x) => ct.includes(mod12(x))).sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev));
        m = c[c[0] === prev && R() < 0.6 ? 1 : R() < 0.3 ? 1 : 0] ?? c[0] ?? prev;
      } else {
        let i = pool.indexOf(prev);
        if (i < 0) i = pool.findIndex((x) => x >= prev);
        i += (R() < 0.5 ? 1 : -1) * (R() < 0.2 ? 2 : 1);
        m = pool[Math.max(0, Math.min(pool.length - 1, i))];
      }
      prev = m;
      return { s: st, m, d: du };
    });
  });
  melCache = { k, bars };
  return bars;
}

/** Terça diatônica acima (segunda voz dos compassos raros). */
function thirdAbove(m: number, scale: number[]): number {
  let x = m + 1;
  let steps = 0;
  while (steps < 2) {
    if (scale.includes(mod12(x))) steps++;
    if (steps < 2) x++;
  }
  return x;
}

/** Ritmo euclidiano (Toussaint): k batidas o mais espalhadas possível em n. */
export const euclid = (k: number, n: number) => Array.from({ length: n }, (_, i) => Math.floor(((i + 1) * k) / n) !== Math.floor((i * k) / n));

// ── O compasso ──────────────────────────────────────────────────────────────

let pianoPrev: number[] | null = null;
let padPrev: number[] | null = null;

/** Brilho e reverb de cada barramento pela raridade. */
export function applyTimbre(band: BandView) {
  const lp: Record<string, number[]> = {
    guitar: [2400, 3600, 5200, 8000],
    keys: [3200, 4500, 6500, 9000],
    flute: [5000, 7000, 9000, 12000],
    drums: [9000, 12000, 15000, 16000],
    bass: [900, 1400, 2000, 2800],
    strings: [2200, 3000, 4200, 6000],
  };
  for (const id of Object.keys(lp) as InstId[]) setTone(id, lp[id][band.r[id] ?? 0], [0.06, 0.12, 0.22, 0.32][band.r[id] ?? 0] + (id === 'strings' ? 0.15 : 0));
}

/** Agenda o compasso inteiro a partir de t0. Devolve quando cada instrumento bate (pra luz na tela). */
export function arrange(spec: BarSpec, a: ArrangeCtx, t0: number): Hit[] {
  const hits: Hit[] = [];
  if (!ctx) return hits;
  const { band, six } = a;
  const own = band.own;
  const r = band.r;
  const ch = CHORD[spec.id];
  const pcs = absPcs(ch, a.tonic);
  const next = CHORD[spec.nextId];
  const nextPcs = absPcs(next, a.tonic);
  const tAt = (st: number) => t0 + st * six;
  const g = spec.grade;
  const rare = g !== 'solid';
  const big = g === 'soaring' || g === 'transcendent';
  const release = spec.released > 0.5;
  /** O próximo compasso solta tensão (vale virada e crescendo). */
  const nextReleases = fnOf(next) === 'T' && spec.stored >= 6;
  const human = () => (Math.random() - 0.5) * 0.008;

  // Violão
  if (own.guitar) {
    const gr = r.guitar;
    const gv = guitarVoice(spec.id, a.tonic);
    if (gr === 0) {
      for (const st of [0, 4, 8, 12]) I.strum(gv, tAt(st) + human(), 1, st === 0 ? 0.95 : 0.72, 0);
      [0, 4, 8, 12].forEach((st) => hits.push({ t: tAt(st), inst: 'guitar' }));
    } else if (gr < 3) {
      const pat: Record<number, 1 | -1> = { 0: 1, 4: 1, 6: -1, 10: -1, 12: 1, 14: -1 };
      for (const [st, dir] of Object.entries(pat)) {
        I.strum(gv, tAt(+st) + human(), dir, dir > 0 ? (+st === 0 ? 1 : 0.8) : 0.55, gr);
        hits.push({ t: tAt(+st), inst: 'guitar' });
      }
      if (gr === 2) I.strum(guitarVoice(spec.nextId, a.tonic), tAt(15), -1, 0.5, gr);
    } else {
      // Dedilhado (Travis): polegar alterna fundamental e quinta, dedos nas cordas de cima.
      const th = [gv[0], gv[Math.min(2, gv.length - 1)]];
      const top = gv.slice(-3);
      for (let st = 0; st < 16; st += 2) {
        if (st % 4 === 0) {
          I.pluck(st % 8 === 0 ? th[0] : th[1], tAt(st), 0.85, 0, 3);
          hits.push({ t: tAt(st), inst: 'guitar' });
        } else I.pluck(top[(st / 2) % 3], tAt(st), 0.55, 3 + ((st / 2) % 3), 3);
      }
      I.pluck(top[2], tAt(0), 0.6, 5, 3);
    }
  }

  // Baixo
  if (own.bass) {
    const br = r.bass;
    const root = 33 + mod12(pcs[0] - 33);
    const fifth = above(root, pcs[2]);
    const nextRoot = 33 + mod12(nextPcs[0] - 33);
    const dur = six * 3.6;
    const notes: [number, number][] = [];
    if (br === 0) notes.push([0, root], [8, root]);
    else if (br === 1) notes.push([0, root], [4, root], [8, fifth], [12, root]);
    else {
      const scaleLow = [...Array(24).keys()].map((i) => 28 + i).filter((m) => a.scale.includes(mod12(m)));
      const step = nextRoot > root ? scaleLow.filter((m) => m < nextRoot).pop() : scaleLow.find((m) => m > nextRoot);
      const approach = br >= 3 ? nextRoot + (nextRoot > root ? -1 : 1) : (step ?? fifth);
      notes.push([0, root], [4, above(root, pcs[1])], [8, fifth], [12, approach]);
      if (br >= 3 && (release || rare)) notes.push([10, root + 12]);
    }
    for (const [st, m] of notes) {
      I.bass(m, tAt(st) + human(), br === 0 ? six * 7.5 : dur, st === 0 ? 1 : 0.8, br);
      hits.push({ t: tAt(st), inst: 'bass' });
    }
    if (release || g === 'transcendent') I.bass(root - 12 >= 24 ? root - 12 : root, t0, six * 6, 0.6, br);
  }

  // Piano elétrico: condução de vozes de verdade (a inversão mais perto da anterior).
  if (own.keys) {
    const kr = r.keys;
    let tones = pcs;
    if (kr >= 3 && pcs.length === 3 && ch.quality !== 'dim' && ch.quality !== 'aug') tones = [...pcs, mod12(pcs[0] + 2)];
    const v = nearestVoicing(pianoPrev, tones, 55, 77);
    pianoPrev = v;
    const lh = 40 + mod12(pcs[0] - 40);
    const comp: Record<number, number> = kr === 0 ? { 0: 16 } : kr === 1 ? { 0: 8, 8: 8 } : { 0: 6, 6: 4, 10: 4, 14: 2 };
    for (const [st, len] of Object.entries(comp)) {
      const d = len * six * 0.95;
      v.forEach((m) => I.ep(m, tAt(+st) + human(), d, 0.5));
      if (kr >= 1 && (+st === 0 || (kr === 1 && +st === 8))) I.ep(lh, tAt(+st), d, 0.55);
      hits.push({ t: tAt(+st), inst: 'keys' });
    }
    if (kr >= 3 && spec.slot === spec.loopLen - 1) v.forEach((m, i) => I.ep(m + 12, tAt(12 + i), six * 0.9, 0.35));
  }

  // Bateria
  if (own.drums) {
    const dr = r.drums;
    const fill = dr >= 2 && spec.slot === spec.loopLen - 1 && nextReleases;
    for (let st = 0; st < 16; st++) {
      const t = tAt(st);
      let hit = false;
      if (st === 0 || st === 8 || (dr >= 2 && (st === 11 || (dr >= 3 && st === 14 && !fill)))) {
        I.kick(t, st === 0 ? 1 : 0.85);
        hit = true;
      }
      if ((st === 4 || st === 12) && !(fill && st === 12)) {
        I.snare(t, 0.85);
        hit = true;
      }
      if (dr >= 1 && st % 2 === 0 && !(fill && st >= 12)) I.hat(t, st % 4 === 0 ? 0.9 : 0.55, dr >= 2 && st === 14);
      if (dr >= 3 && (st === 7 || st === 15) && !fill) I.snare(t, 0.15);
      if (fill && st >= 12) {
        I.tom(t, 0.8, [220, 185, 150, 120][st - 12]);
        hit = true;
      }
      if (hit) hits.push({ t, inst: 'drums' });
    }
    if (dr >= 3) {
      const cg = euclid(3, 8);
      const sh = euclid(5, 16);
      cg.forEach((on, i) => on && I.conga(tAt(i * 2), 0.7, i % 3 === 0));
      sh.forEach((on, i) => on && I.shaker(tAt(i), 0.8));
    }
    if (release && spec.released >= 4) I.crash(t0, Math.min(1, 0.5 + spec.released / 20));
    else if (dr >= 2 && release) I.crash(t0, 0.6, true);
    if (g === 'transcendent') I.crash(t0, 1);
  }

  // Cordas: sustentam e crescem antes da soltura (a tensão é audível).
  if (own.strings) {
    const v = nearestVoicing(padPrev, pcs, 52, 72);
    padPrev = v;
    I.pad(v, t0, six * 16, 0.6 + r.strings * 0.12, nextReleases);
    hits.push({ t: t0, inst: 'strings' });
  }

  // Melodia (flauta)
  if (own.flute) {
    const fr = r.flute;
    const bar = melody(a, fr)[spec.slot] ?? [];
    for (const n of bar) {
      I.flute(n.m, tAt(n.s), n.d * six * 0.92, 0.8, 1 + fr * 0.2);
      hits.push({ t: tAt(n.s), inst: 'flute' });
      if (big) I.flute(thirdAbove(n.m, a.scale), tAt(n.s) + 0.005, n.d * six * 0.92, 0.5, 1);
      if (g === 'transcendent') I.flute(n.m + 12, tAt(n.s), n.d * six * 0.92, 0.35, 1);
    }
    if (fr >= 3 && bar.length) I.flute(bar[0].m + 2, tAt(0) - six * 0.4, six * 0.35, 0.4, 0);
  }

  // Grade: o compasso raro soa maior.
  const lead = (m: number, t: number, d: number, v: number) => (own.flute ? I.flute(m, t, d, v) : I.ep(m, t, d, v));
  if (rare) {
    // Sweet: corrida de semicolcheias subindo até uma nota do próximo acorde.
    const target = above(74, nextPcs[0]);
    const run = [...Array(30).keys()].map((i) => target - i).filter((m) => a.scale.includes(mod12(m))).slice(0, 4).reverse();
    run.forEach((m, i) => lead(m, tAt(12 + i), six * 0.9, 0.55));
    I.bell(above(84, pcs[0]), t0, 0.6);
  }
  if (big) {
    // Soaring: brilho de sinos arpejando o acorde em colcheias, reverb aberto.
    const top = pcs.map((p) => above(83, p)).sort((x, y) => x - y);
    for (let i = 0; i < 8; i++) I.bell(top[i % top.length] + (i >= top.length ? 12 : 0), tAt(i * 2), 0.5);
    setTone('bells', 12000, 0.6, t0);
  }
  if (g === 'transcendent') {
    I.choir(nearestVoicing(null, pcs, 57, 74), t0, six * 16, 0.9);
    for (let i = 0; i < 16; i++) I.bell(above(88, pcs[i % pcs.length]), tAt(i), 0.35);
  }

  // Riser de ruído antes da soltura grande (o caudado antecipa: Salimpoor 2011).
  if (nextReleases && spec.stored >= 10) I.crash(tAt(12), 0.25, true);
  return hits;
}

/** Zera a memória de voicing (troca de tom ou de loop). */
export function resetVoices() {
  pianoPrev = null;
  padPrev = null;
  melCache = { k: '', bars: [] };
}
