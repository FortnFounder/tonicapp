// O loop como música: fluxo, nota de harmonia (H), cadências, progressões famosas, assinatura do modo
// e o ciclo de tensão → soltura. Puro: recebe o loop e o modo, devolve números.
import { CADENCES, CHORD, HARMONY, MODE_DEF, MODE_TONIC, PROGRESSIONS, TENSION, type ProgDef } from './content';
import { flow, fnOf, outOfMode, tension, type ModeId } from './theory';

export interface Cadence {
  id: string;
  name: string;
  /** Casa do acorde que resolve. */
  at: number;
  pts: number;
}

export interface LoopInfo {
  /** H 0–100. */
  score: number;
  flows: number[];
  flowAvg: number;
  flowPts: number;
  variety: number;
  home: number;
  cadences: Cadence[];
  progs: ProgDef[];
  /** HarmonyMult. */
  mult: number;
  /** Tensão de cada acorde. */
  tensions: number[];
  /** Loop todo no modo, com o acorde característico e a tônica do modo. */
  modeSig: boolean;
}

const keyOf = (id: string, exact?: boolean) => (exact ? id : (CHORD[id]?.base ?? id));

function rotEq(keys: string[], seq: string[]): boolean {
  if (keys.length !== seq.length) return false;
  for (let r = 0; r < keys.length; r++) if (seq.every((v, i) => keys[(i + r) % keys.length] === v)) return true;
  return false;
}

function hasSub(keys: string[], seq: string[]): boolean {
  if (seq.length > keys.length) return false;
  for (let r = 0; r < keys.length; r++) if (seq.every((v, i) => keys[(r + i) % keys.length] === v)) return true;
  return false;
}

export function matchProg(loop: string[], p: ProgDef): boolean {
  if (p.len && loop.length !== p.len) return false;
  const keys = loop.map((id) => keyOf(id, p.exact));
  if (p.kind === 'cyc') return rotEq(keys, p.seq);
  if (p.kind === 'sub') return hasSub(keys, p.seq);
  const set = new Set(keys);
  return set.size === p.seq.length && p.seq.every((x) => set.has(x));
}

export const progsOf = (loop: string[]) => PROGRESSIONS.filter((p) => matchProg(loop, p));

export function cadencesOf(loop: string[]): Cadence[] {
  const out = new Map<string, Cadence>();
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k];
    const b = loop[(k + 1) % loop.length];
    const cd = CADENCES.find((x) => x.from.includes(a) && x.to.includes(b));
    if (cd && !out.has(cd.id)) out.set(cd.id, { id: cd.id, name: cd.name, at: (k + 1) % loop.length, pts: cd.pts });
  }
  return [...out.values()];
}

export function modeSignature(loop: string[], mode: ModeId): boolean {
  const def = MODE_DEF[mode];
  if (!def.sig.length) return false;
  if (!loop.every((id) => outOfMode(CHORD[id], mode) === 0)) return false;
  return loop.some((id) => def.sig.includes(id)) && loop.some((id) => MODE_TONIC[mode].includes(id));
}

export function analyze(loop: string[], mode: ModeId = 'ionian'): LoopInfo {
  const n = loop.length;
  const flows = loop.map((id, k) => flow(CHORD[id], CHORD[loop[(k + 1) % n]]));
  const flowAvg = flows.reduce((s, x) => s + x, 0) / n;
  const flowPts = Math.round((flowAvg / 10) * HARMONY.flowPts);
  const distinct = new Set(loop).size;
  const variety = (n === 8 ? HARMONY.variety8 : HARMONY.variety4)[Math.min(distinct, n)] ?? 15;
  const home = loop.some((id) => MODE_TONIC[mode].includes(id) || fnOf(CHORD[id]) === 'T') ? HARMONY.home : 0;
  const cadences = cadencesOf(loop);
  const progs = progsOf(loop);
  const score = Math.min(
    100,
    flowPts + variety + home + cadences.reduce((s, x) => s + x.pts, 0) + Math.min(progs.length, HARMONY.maxProgressions) * HARMONY.perProgression,
  );
  return {
    score,
    flows,
    flowAvg,
    flowPts,
    variety,
    home,
    cadences,
    progs,
    mult: HARMONY.multMin + (HARMONY.multSpan * score) / 100,
    tensions: loop.map((id) => tension(CHORD[id], mode)),
    modeSig: modeSignature(loop, mode),
  };
}

// ── Tensão → soltura ────────────────────────────────────────────────────────

export interface BarTension {
  /** Acumulado antes do compasso. */
  before: number;
  /** Acumulado depois. */
  after: number;
  /** Quanto soltou neste compasso (0 se não soltou). */
  released: number;
  /** Multiplicador da soltura. */
  release: number;
  deceptive: boolean;
}

const DECEPTIVE_FROM = ['V', 'V7'];
const DECEPTIVE_TO = ['vi', 'vi7', '♭VI'];

/**
 * Um compasso do medidor: acorde de tônica solta o acumulado; cadência deceptiva solta metade;
 * o resto acumula a própria tensão. `depth` (baixo, equipamento, Aeolian) multiplica a soltura.
 */
export function stepTension(stored: number, prevId: string, id: string, mode: ModeId, depth: number, sig: boolean): BarTension {
  const ch = CHORD[id];
  const isTonic = fnOf(ch) === 'T';
  const deceptive = DECEPTIVE_FROM.includes(prevId) && DECEPTIVE_TO.includes(id);
  let released = 0;
  let after = stored;
  if (isTonic) {
    released = stored;
    after = 0;
  } else if (deceptive) {
    released = stored * (1 - TENSION.deceptiveKeep);
    after = stored - released;
  }
  if (!isTonic) {
    const mult = sig && mode === 'locrian' ? 2 : 1;
    after = Math.min(TENSION.cap, after + tension(ch, mode) * mult);
  }
  let release = 1 + released * TENSION.coef * (1 + depth);
  if (sig && mode === 'phrygian' && prevId === '♭II' && isTonic) release = 1 + (release - 1) * 2;
  return { before: stored, after, released, release, deceptive };
}

/** O ciclo estável do loop (3ª volta), pra mostrar na tela o que cada casa acumula e solta. */
export function steadyCycle(loop: string[], mode: ModeId, depth: number): BarTension[] {
  const sig = modeSignature(loop, mode);
  let stored = 0;
  let out: BarTension[] = [];
  for (let lap = 0; lap < 3; lap++) {
    out = [];
    for (let k = 0; k < loop.length; k++) {
      const prev = loop[(k - 1 + loop.length) % loop.length];
      const b = stepTension(stored, prev, loop[k], mode, depth, sig);
      out.push(b);
      stored = b.after;
    }
  }
  return out;
}

/** Pico do medidor no ciclo estável. */
export const peakTension = (loop: string[], mode: ModeId) => Math.max(...steadyCycle(loop, mode, 0).map((b) => b.after));
