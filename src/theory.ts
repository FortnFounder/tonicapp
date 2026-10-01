// Teoria musical pura: nota, grafia, modo, acorde, função, tensão, fluxo e condução de vozes.
// Nada aqui sabe de jogo. Toda altura é classe de altura 0–11; "rel" = relativa à tônica (0 = tônica).
// Fontes no GDD (Pesquisa): Plomp-Levelt (dissonância), Lerdahl (tensão), Hooktheory (fluxo), PLR (condução).

export const mod12 = (n: number) => ((n % 12) + 12) % 12;

// ── Notas e grafia ──────────────────────────────────────────────────────────

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
/** Altura da letra natural. */
export const NATURAL = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const ACC: Record<number, string> = { 0: '', 1: '♯', 2: '𝄪', 11: '♭', 10: '𝄫' };

/** Grafia de uma altura numa letra (índice 0–6): C + 1 = C♯, D − 1 = D♭. */
export function spellOn(letter: number, pc: number): string {
  const l = ((letter % 7) + 7) % 7;
  const d = mod12(pc - NATURAL[l]);
  return LETTERS[l] + (ACC[d] ?? '?');
}

/** Um tom: tônica absoluta (0–11) e a letra dela (0–6). B♭ = { pc: 10, letter: 6 }. */
export interface Tonic {
  pc: number;
  letter: number;
}

export const tonicName = (t: Tonic) => spellOn(t.letter, t.pc);

/** Grau cromático pela função mais comum: ♭2, ♭3, ♯4, ♭6, ♭7 (o que os acordes emprestados usam). */
const CHROMATIC_DEGREE: Record<number, number> = { 1: 1, 3: 2, 6: 3, 8: 5, 10: 6 };

/** Grafia de uma altura absoluta no contexto de um tom e modo: nota do modo pela letra do grau, cromática pelo grau emprestado. */
export function spellIn(pcAbs: number, t: Tonic, mode: ModeId = 'ionian'): string {
  const rel = mod12(pcAbs - t.pc);
  const deg = MODES[mode].steps.indexOf(rel);
  if (deg >= 0) return spellOn(t.letter + deg, pcAbs);
  const cd = CHROMATIC_DEGREE[rel];
  if (cd !== undefined) return spellOn(t.letter + cd, pcAbs);
  // Fora disso (♮3 no menor, ♮7 no dórico…): a letra do grau maior.
  return spellOn(t.letter + MAJOR.indexOf(rel), pcAbs);
}

// ── Modos ───────────────────────────────────────────────────────────────────

export type ModeId = 'lydian' | 'ionian' | 'mixolydian' | 'dorian' | 'aeolian' | 'phrygian' | 'locrian';

/** Os 7 modos da escala maior, do mais claro pro mais escuro. `char` = a nota que difere do maior (ou do menor). */
export const MODES: Record<ModeId, { name: string; steps: number[]; brightness: number; char: number }> = {
  lydian: { name: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11], brightness: 3, char: 6 },
  ionian: { name: 'Ionian', steps: [0, 2, 4, 5, 7, 9, 11], brightness: 2, char: 11 },
  mixolydian: { name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], brightness: 1, char: 10 },
  dorian: { name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], brightness: 0, char: 9 },
  aeolian: { name: 'Aeolian', steps: [0, 2, 3, 5, 7, 8, 10], brightness: -1, char: 8 },
  phrygian: { name: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10], brightness: -2, char: 1 },
  locrian: { name: 'Locrian', steps: [0, 1, 3, 5, 6, 8, 10], brightness: -3, char: 6 },
};

/** As 7 alturas absolutas do modo num tom. */
export const scaleAbs = (t: Tonic, mode: ModeId) => MODES[mode].steps.map((s) => mod12(t.pc + s));

// ── Acordes ─────────────────────────────────────────────────────────────────

export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7' | 'add9';

/** Intervalos e a letra de cada nota (em graus a partir da fundamental), pra grafar certo: D7 = D F♯ A C. */
export const QUALITY: Record<Quality, { iv: number[]; letters: number[]; upper: boolean; roman: string; name: string }> = {
  maj: { iv: [0, 4, 7], letters: [0, 2, 4], upper: true, roman: '', name: '' },
  min: { iv: [0, 3, 7], letters: [0, 2, 4], upper: false, roman: '', name: 'm' },
  dim: { iv: [0, 3, 6], letters: [0, 2, 4], upper: false, roman: '°', name: '°' },
  aug: { iv: [0, 4, 8], letters: [0, 2, 4], upper: true, roman: '+', name: '+' },
  sus2: { iv: [0, 2, 7], letters: [0, 1, 4], upper: true, roman: 'sus2', name: 'sus2' },
  sus4: { iv: [0, 5, 7], letters: [0, 3, 4], upper: true, roman: 'sus4', name: 'sus4' },
  '7': { iv: [0, 4, 7, 10], letters: [0, 2, 4, 6], upper: true, roman: '7', name: '7' },
  maj7: { iv: [0, 4, 7, 11], letters: [0, 2, 4, 6], upper: true, roman: 'maj7', name: 'maj7' },
  m7: { iv: [0, 3, 7, 10], letters: [0, 2, 4, 6], upper: false, roman: '7', name: 'm7' },
  m7b5: { iv: [0, 3, 6, 10], letters: [0, 2, 4, 6], upper: false, roman: 'ø7', name: 'm7♭5' },
  dim7: { iv: [0, 3, 6, 9], letters: [0, 2, 4, 6], upper: false, roman: '°7', name: '°7' },
  add9: { iv: [0, 4, 7, 2], letters: [0, 2, 4, 1], upper: true, roman: 'add9', name: 'add9' },
};

/** Acorde relativo à tônica: grau da escala maior (1–7), alteração e qualidade. `applied` = fundamental-alvo da dominante secundária. */
export interface ChordSpec {
  degree: number;
  acc: -1 | 0 | 1;
  quality: Quality;
  applied?: number;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Fundamental relativa (0–11). */
export const rootOf = (c: ChordSpec) => mod12(MAJOR[c.degree - 1] + c.acc);
/** Alturas relativas, na ordem fundamental, terça, quinta, sétima/nona. */
export const relPcs = (c: ChordSpec) => QUALITY[c.quality].iv.map((i) => mod12(rootOf(c) + i));
/** Alturas absolutas num tom. */
export const absPcs = (c: ChordSpec, t: Tonic) => relPcs(c).map((p) => mod12(p + t.pc));

export function roman(c: ChordSpec): string {
  const q = QUALITY[c.quality];
  const n = NUMERALS[c.degree - 1];
  return (c.acc < 0 ? '♭' : c.acc > 0 ? '♯' : '') + (q.upper ? n : n.toLowerCase()) + q.roman;
}

/** Notas grafadas (D7 em Dó = D F♯ A C). */
export function spelledNotes(c: ChordSpec, t: Tonic): string[] {
  const rootLetter = t.letter + c.degree - 1;
  const q = QUALITY[c.quality];
  return q.iv.map((iv, k) => spellOn(rootLetter + q.letters[k], mod12(t.pc + rootOf(c) + iv)));
}

export const chordName = (c: ChordSpec, t: Tonic) => spelledNotes(c, t)[0] + QUALITY[c.quality].name;

// ── Função, dissonância e tensão ────────────────────────────────────────────

/** T = tônica, t = tônica fraca (vi, iii, ♭III), S = subdominante, D = dominante. */
export type Fn = 'T' | 't' | 'S' | 'D';

export function fnOf(c: ChordSpec): Fn {
  if (c.applied !== undefined) return 'D';
  const r = rootOf(c);
  if (r === 1 && c.quality === '7') return 'D'; // ♭II7: substituta de trítono
  if (r === 0) return 'T';
  if (r === 7 || r === 11 || r === 6) return 'D';
  if (r === 9 || r === 4 || r === 3) return 't';
  return 'S';
}

/** Função com 3 cores pra tela: tônica, subdominante, dominante. */
export const fnColor = (f: Fn): 0 | 1 | 2 => (f === 'T' || f === 't' ? 0 : f === 'S' ? 1 : 2);

/** Peso de aspereza por classe de intervalo (Plomp-Levelt): 2ª menor e trítono ásperos, quinta lisa. */
export const IC_ROUGHNESS = [0, 1.5, 1, 0.2, 0.1, 0, 2];

export function dissonance(pcs: number[]): number {
  let d = 0;
  for (let i = 0; i < pcs.length; i++)
    for (let j = i + 1; j < pcs.length; j++) {
      const iv = mod12(pcs[j] - pcs[i]);
      d += IC_ROUGHNESS[Math.min(iv, 12 - iv)];
    }
  return d;
}

const FN_TENSION: Record<Fn, number> = { T: 0, t: 1.5, S: 3, D: 5 };
/** Quanto pesa cada nota fora do modo. */
export const CHROMATIC_TENSION = 1.5;

/** Notas do acorde fora do modo. */
export const outOfMode = (c: ChordSpec, mode: ModeId) => relPcs(c).filter((p) => !MODES[mode].steps.includes(p)).length;

/** Tensão 0–10: função + aspereza + cromatismo (Lerdahl simplificado). */
export function tension(c: ChordSpec, mode: ModeId = 'ionian'): number {
  const v = FN_TENSION[fnOf(c)] + dissonance(relPcs(c)) + CHROMATIC_TENSION * outOfMode(c, mode);
  return Math.round(Math.min(10, Math.max(0, v)) * 10) / 10;
}

// ── Condução de vozes ───────────────────────────────────────────────────────

const pcDist = (a: number, b: number) => {
  const d = mod12(a - b);
  return Math.min(d, 12 - d);
};

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/**
 * Custo mínimo em semitons pra levar as notas de A até B (cada voz anda o mínimo; parcimônia da teoria neo-riemanniana).
 * Com tamanhos diferentes, as vozes do acorde menor se encaixam nas do maior.
 */
export function voiceLeadingCost(a: number[], b: number[]): number {
  const [small, big] = a.length <= b.length ? [a, b] : [b, a];
  let best = Infinity;
  for (const p of permutations(big)) {
    let c = 0;
    for (let i = 0; i < small.length; i++) c += pcDist(small[i], p[i]);
    if (c < best) best = c;
  }
  return best;
}

/**
 * Voicing mais perto do anterior: testa todas as inversões em posição fechada dentro de [lo, hi]
 * e fica com a que menos move as vozes. É o que o piano toca; é a mesma regra que pontua o fluxo.
 */
export function nearestVoicing(prev: number[] | null, pcsAbs: number[], lo = 55, hi = 79): number[] {
  const n = pcsAbs.length;
  const cands: number[][] = [];
  for (let inv = 0; inv < n; inv++) {
    const order = [...pcsAbs.slice(inv), ...pcsAbs.slice(0, inv)];
    for (let base = lo; base <= hi; base++) {
      if (mod12(base) !== order[0]) continue;
      const v = [base];
      for (let k = 1; k < n; k++) {
        let m = v[k - 1] + 1;
        while (mod12(m) !== order[k]) m++;
        v.push(m);
      }
      if (v[n - 1] <= hi) cands.push(v);
    }
  }
  if (!cands.length) return pcsAbs.map((p) => lo + mod12(p - lo));
  if (!prev || !prev.length) {
    const mid = (lo + hi) / 2;
    return cands.reduce((a, b) => (Math.abs(avg(a) - mid) <= Math.abs(avg(b) - mid) ? a : b));
  }
  const cost = (v: number[]) => {
    const p = [...prev].sort((x, y) => x - y);
    const len = Math.max(p.length, v.length);
    let c = 0;
    for (let i = 0; i < len; i++) c += Math.abs((v[Math.min(i, v.length - 1)] ?? 0) - (p[Math.min(i, p.length - 1)] ?? 0));
    return c;
  };
  return cands.reduce((a, b) => (cost(a) <= cost(b) ? a : b));
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

// ── Fluxo (a força da passagem A → B) ───────────────────────────────────────

/** Movimento da fundamental, por intervalo ascendente: quinta descendo é o mais forte (círculo das quintas). */
export const ROOT_MOTION = [0, 1.5, 3, 2, 2, 4, 0.5, 2.5, 2, 2, 2, 2];

const FN_FLOW: Record<Fn, Record<Fn, number>> = {
  T: { T: 0.5, t: 1, S: 1.5, D: 1 },
  t: { T: 1, t: 0.5, S: 1.5, D: 1 },
  S: { T: 1.5, t: 1, S: 0.5, D: 3 },
  D: { T: 3, t: 2, S: -0.5, D: 0.5 },
};

export interface FlowParts {
  root: number;
  common: number;
  smooth: number;
  fn: number;
  special: number;
  total: number;
}

/** Força da passagem 0–10. Bate com a ordem do Hooktheory: V→I, ii→V, I→IV, vi→IV no topo, V→IV embaixo. */
export function flowParts(a: ChordSpec, b: ChordSpec): FlowParts {
  const pa = relPcs(a);
  const pb = relPcs(b);
  const ra = rootOf(a);
  const rb = rootOf(b);
  if (ra === rb && a.quality === b.quality) return { root: 0, common: 0, smooth: 0, fn: 0, special: 0, total: 1 };
  const root = ROOT_MOTION[mod12(rb - ra)];
  const common = pa.filter((p) => pb.includes(p)).length * 0.75;
  const smooth = Math.max(0, 3 - voiceLeadingCost(pa.slice(0, 3), pb.slice(0, 3)) / 2);
  const fa = fnOf(a);
  const fb = fnOf(b);
  const fn = FN_FLOW[fa][fb];
  let special = 0;
  if (a.applied !== undefined) special += rb === a.applied ? 3 : -1;
  if (ra === 1 && a.quality === '7' && rb === 0) special += 2;
  if (pa.includes(11) && pb.includes(0) && fb === 'T') special += 1;
  const total = Math.round(Math.min(10, Math.max(0, ((root + common + smooth + fn + special) * 10) / 9)) * 10) / 10;
  return { root, common, smooth, fn, special, total };
}

export const flow = (a: ChordSpec, b: ChordSpec) => flowParts(a, b).total;

// ── Frequência ──────────────────────────────────────────────────────────────

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
