// Jam: improviso por cima do loop. Cada toque é julgado pelo tempo (janela) e pela nota (do acorde, resolve, choca).
// Puro: a tela passa o instante do toque e as batidas; aqui só a conta.
import { JAM } from './content';
import { mod12 } from './theory';

export type Timing = 'perfect' | 'great' | 'good' | 'miss';
export type Harmonic = 'chord' | 'resolve' | 'tension' | 'clash';

export interface JamHit {
  timing: Timing;
  harmonic: Harmonic;
  points: number;
  combo: number;
  /** Distância até a batida (s), negativa = adiantado. */
  dt: number;
  pc: number;
}

export interface JamState {
  score: number;
  combo: number;
  best: number;
  hits: JamHit[];
  /** Nota de fora do acorde esperando resolver. */
  pending: { idx: number; pc: number; base: number } | null;
  counts: Record<Timing, number>;
  /** Notas colhidas por altura. */
  notes: number[];
}

export const newJam = (): JamState => ({ score: 0, combo: 0, best: 0, hits: [], pending: null, counts: { perfect: 0, great: 0, good: 0, miss: 0 }, notes: Array(12).fill(0) });

export function timingOf(dt: number): Timing {
  const a = Math.abs(dt);
  if (a <= JAM.windows.perfect) return 'perfect';
  if (a <= JAM.windows.great) return 'great';
  if (a <= JAM.windows.good) return 'good';
  return 'miss';
}

/** Batida (semínima) mais perto do toque. `start` = início do compasso, `beat` = duração da semínima. */
export function nearestBeat(t: number, start: number, beat: number): number {
  return start + Math.round((t - start) / beat) * beat;
}

const step = (a: number, b: number) => {
  const d = Math.abs(mod12(a - b));
  return Math.min(d, 12 - d) <= 2 && a !== b;
};

/**
 * Julga um toque. Nota do acorde paga cheio; nota de fora fica "em tensão" pagando metade
 * e, se o próximo toque resolve por grau numa nota do acorde, vira apojatura e paga 1,5×.
 */
export function judge(j: JamState, dt: number, pc: number, chordPcs: number[]): JamHit {
  const timing = timingOf(dt);
  if (timing === 'miss') {
    j.combo = 0;
    j.pending = null;
    j.counts.miss++;
    const h: JamHit = { timing, harmonic: 'clash', points: 0, combo: 0, dt, pc };
    j.hits.push(h);
    return h;
  }
  j.counts[timing]++;
  j.combo++;
  j.best = Math.max(j.best, j.combo);
  const comboMult = Math.min(JAM.comboMax, 1 + JAM.comboStep * (j.combo - 1));
  const base = JAM.points[timing] * comboMult;
  const inChord = chordPcs.includes(pc);
  let harmonic: Harmonic;
  let points: number;
  if (inChord) {
    harmonic = 'chord';
    points = base * JAM.chordTone;
    if (j.pending && step(j.pending.pc, pc)) {
      // A nota anterior resolveu: paga a diferença dela (de choque pra resolução).
      const bonus = j.pending.base * (JAM.resolve - JAM.clash);
      j.score += bonus;
      j.hits[j.pending.idx].harmonic = 'resolve';
      j.hits[j.pending.idx].points += bonus;
    }
    j.pending = null;
  } else {
    harmonic = 'tension';
    points = base * JAM.clash;
    j.pending = { idx: j.hits.length, pc, base };
  }
  j.score += points;
  j.notes[pc] += JAM.notesPerHit;
  const h: JamHit = { timing, harmonic, points, combo: j.combo, dt, pc };
  j.hits.push(h);
  return h;
}

/** Nota de fora que ficou sem resolver vira choque de vez. */
export function settle(j: JamState) {
  if (j.pending) j.hits[j.pending.idx].harmonic = 'clash';
  j.pending = null;
}

/** Hype 0–100: pontos contra o par de um improviso bom (toque em toda batida, 60% do máximo). */
export function hypeOf(j: JamState, beats: number): number {
  const par = beats * JAM.points.perfect * JAM.par;
  return Math.round(Math.min(100, (j.score / Math.max(1, par)) * 100));
}
