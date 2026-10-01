// Todo número de balanceamento do Tonic. Nenhum é final (GDD).
import type { ChordSpec, ModeId, Quality } from './theory';

// ── Acordes (o vocabulário) ─────────────────────────────────────────────────

export type TierId = 'triads' | 'sevenths' | 'borrowed' | 'applied' | 'color';

export interface ChordDef extends ChordSpec {
  id: string;
  tier: TierId;
  /** Família pra reconhecer progressão: V7 e Vsus4 contam como V. */
  base: string;
  /** Notas de cada nota do acorde pra aprender (0 = já vem sabendo). */
  learn: number;
  /** Nome pra tela quando o romano sozinho não diz (V7/V). */
  label?: string;
}

const c = (id: string, tier: TierId, degree: number, quality: Quality, learn: number, o: { acc?: -1 | 0 | 1; base?: string; applied?: number; label?: string } = {}): ChordDef => ({
  id,
  tier,
  degree,
  quality,
  acc: o.acc ?? 0,
  applied: o.applied,
  base: o.base ?? id,
  learn,
  label: o.label,
});

export const CHORDS: ChordDef[] = [
  c('I', 'triads', 1, 'maj', 0),
  c('IV', 'triads', 4, 'maj', 0),
  c('V', 'triads', 5, 'maj', 0),
  c('vi', 'triads', 6, 'min', 15),
  c('ii', 'triads', 2, 'min', 25),
  c('iii', 'triads', 3, 'min', 40),
  c('vii°', 'triads', 7, 'dim', 80),
  c('V7', 'sevenths', 5, '7', 60, { base: 'V' }),
  c('Imaj7', 'sevenths', 1, 'maj7', 80, { base: 'I' }),
  c('ii7', 'sevenths', 2, 'm7', 80, { base: 'ii' }),
  c('vi7', 'sevenths', 6, 'm7', 100, { base: 'vi' }),
  c('IVmaj7', 'sevenths', 4, 'maj7', 120, { base: 'IV' }),
  c('iii7', 'sevenths', 3, 'm7', 150, { base: 'iii' }),
  c('viiø7', 'sevenths', 7, 'm7b5', 200, { base: 'vii°' }),
  c('i', 'borrowed', 1, 'min', 120),
  c('iv', 'borrowed', 4, 'min', 150),
  c('♭VII', 'borrowed', 7, 'maj', 150, { acc: -1 }),
  c('♭VI', 'borrowed', 6, 'maj', 200, { acc: -1 }),
  c('♭III', 'borrowed', 3, 'maj', 250, { acc: -1 }),
  c('v', 'borrowed', 5, 'min', 250),
  c('V7/V', 'applied', 2, '7', 400, { applied: 7, base: 'II', label: 'V7/V' }),
  c('V7/vi', 'applied', 3, '7', 450, { applied: 9, base: 'III', label: 'V7/vi' }),
  c('V7/ii', 'applied', 6, '7', 500, { applied: 2, base: 'VI', label: 'V7/ii' }),
  c('V7/IV', 'applied', 1, '7', 600, { applied: 5, base: 'I7', label: 'V7/IV' }),
  c('V7/iii', 'applied', 7, '7', 800, { applied: 4, base: 'VII', label: 'V7/iii' }),
  c('II', 'color', 2, 'maj', 900),
  c('Vsus4', 'color', 5, 'sus4', 900, { base: 'V' }),
  c('Iadd9', 'color', 1, 'add9', 1000, { base: 'I' }),
  c('♭II', 'color', 2, 'maj', 1500, { acc: -1, label: 'Neapolitan' }),
  c('♭II7', 'color', 2, '7', 2000, { acc: -1, label: 'Tritone sub' }),
  c('vii°7', 'color', 7, 'dim7', 2500, { base: 'vii°' }),
];

export const CHORD = Object.fromEntries(CHORDS.map((x) => [x.id, x])) as Record<string, ChordDef>;
export const START_CHORDS = ['I', 'IV', 'V'];
export const START_LOOP = ['I', 'IV', 'V', 'I'];

export const TIERS: { id: TierId; name: string; fans: number }[] = [
  { id: 'triads', name: 'Triads', fans: 0 },
  { id: 'sevenths', name: 'Sevenths', fans: 40 },
  { id: 'borrowed', name: 'Borrowed', fans: 150 },
  { id: 'applied', name: 'Applied dominants', fans: 400 },
  { id: 'color', name: 'Color', fans: 1000 },
];

// ── Harmonia do loop ────────────────────────────────────────────────────────

export const HARMONY = {
  /** Pontos do fluxo médio (0–10 vira 0–55). */
  flowPts: 55,
  /** Variedade por número de acordes diferentes. */
  variety4: [0, 0, 5, 10, 15],
  variety8: [0, 0, 4, 8, 11, 13, 15, 15, 15],
  home: 10,
  perProgression: 8,
  maxProgressions: 3,
  /** HarmonyMult = min + span × H/100. */
  multMin: 0.5,
  multSpan: 1.5,
};

export const CADENCES = [
  { id: 'perfect', name: 'Perfect cadence', from: ['V', 'V7', 'vii°', 'viiø7', 'vii°7', 'Vsus4', '♭II7'], to: ['I', 'Imaj7', 'Iadd9', 'i'], pts: 8 },
  { id: 'plagal', name: 'Plagal cadence', from: ['IV', 'IVmaj7', 'iv'], to: ['I', 'Imaj7', 'Iadd9'], pts: 5 },
  { id: 'deceptive', name: 'Deceptive cadence', from: ['V', 'V7'], to: ['vi', 'vi7', '♭VI'], pts: 6 },
  { id: 'backdoor', name: 'Backdoor cadence', from: ['♭VII'], to: ['I', 'Imaj7', 'Iadd9'], pts: 6 },
  { id: 'phrygian', name: 'Phrygian cadence', from: ['♭II'], to: ['i', 'I'], pts: 7 },
];

// ── Tensão, soltura e grade ─────────────────────────────────────────────────

export const TENSION = {
  /** Teto do medidor. */
  cap: 30,
  /** Release = 1 + acumulado × coef × (1 + Depth). */
  coef: 0.05,
  /** Cadência deceptiva solta essa fração e guarda o resto. */
  deceptiveKeep: 0.5,
  /** Na soltura, chance de grade × (1 + acumulado ÷ isso). */
  luckDiv: 10,
  /** Cadência deceptiva multiplica a chance (surpresa). */
  surpriseLuck: 2,
};

export type GradeId = 'solid' | 'sweet' | 'soaring' | 'transcendent';

export const GRADES: { id: GradeId; name: string; mult: number; notes: number; chance: number; records: number }[] = [
  { id: 'solid', name: 'Solid', mult: 1, notes: 1, chance: 0, records: 0 },
  { id: 'sweet', name: 'Sweet', mult: 3, notes: 2, chance: 0.08, records: 0 },
  { id: 'soaring', name: 'Soaring', mult: 10, notes: 5, chance: 0.015, records: 0 },
  { id: 'transcendent', name: 'Transcendent', mult: 50, notes: 20, chance: 0.0015, records: 1 },
];

/** Soma das chances de grade boa não passa disso. */
export const GRADE_CAP = 0.6;

/** Garantia: rampa a partir de `soft` (+step por compasso) e certeza no `hard`. */
export const PITY = {
  soaring: { soft: 45, hard: 60, step: 0.05 },
  transcendent: { soft: 400, hard: 500, step: 0.01 },
};

export const FANS_PER_BAR = 0.02;
export const NOTES_ROOT_BONUS = 2;

// ── Banda ───────────────────────────────────────────────────────────────────

export type InstId = 'guitar' | 'drums' | 'bass' | 'keys' | 'flute' | 'strings';
export type Role = 'harmony' | 'rhythm' | 'bass' | 'keys' | 'lead' | 'pad';

export interface InstDef {
  id: InstId;
  role: Role;
  name: string;
  short: string;
  buy: number;
  /** Força base do papel. */
  base: number;
  tune: number;
  /** Notas absolutas pra subir raridade (cordas soltas do violão, tríade do dó central…). null = paga em dinheiro. */
  sig: number[] | null;
  stat: string;
}

export const INSTRUMENTS: InstDef[] = [
  { id: 'guitar', role: 'harmony', name: 'Acoustic Guitar', short: 'Guitar', buy: 0, base: 1, tune: 10, sig: [4, 9, 2, 7, 11], stat: 'Tone' },
  { id: 'drums', role: 'rhythm', name: 'Drum Kit', short: 'Drums', buy: 25, base: 0.8, tune: 15, sig: null, stat: 'Tempo' },
  { id: 'bass', role: 'bass', name: 'Bass', short: 'Bass', buy: 150, base: 0.9, tune: 25, sig: [4, 9, 2, 7], stat: 'Depth' },
  { id: 'keys', role: 'keys', name: 'Electric Piano', short: 'Keys', buy: 600, base: 1.4, tune: 60, sig: [0, 4, 7], stat: 'Tone' },
  { id: 'flute', role: 'lead', name: 'Flute', short: 'Flute', buy: 2500, base: 0.7, tune: 150, sig: [11, 9, 7], stat: 'Feel' },
  { id: 'strings', role: 'pad', name: 'Strings', short: 'Strings', buy: 15000, base: 0.8, tune: 500, sig: [7, 2, 9, 4], stat: 'Sustain' },
];

export const INST = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i])) as Record<InstId, InstDef>;

export const RARITY = ['Common', 'Rare', 'Epic', 'Legendary'];
/** Força por raridade: o nível 1 da nova passa o 10 da anterior (2,8 → 3). */
export const RARITY_MULT = [1, 3, 9, 27];
export const LEVEL_STEP = 0.2;
export const MAX_LEVEL = 10;
export const TUNE_GROWTH = 1.55;
export const TUNE_RARITY = 3.2;
/** Notas de cada nota da assinatura pra subir raridade (Common → Rare → Epic → Legendary). */
export const RARITY_NOTES = [30, 120, 400];
/** Bateria sobe raridade com dinheiro. */
export const RARITY_TIPS = [400, 4000, 40000];

/** Stat do papel: valor = (r + 1) × perRarity + nível × perLevel. */
export const ROLE_STAT = {
  bass: { perRarity: 0.15, perLevel: 0.02 },
  lead: { perRarity: 0.15, perLevel: 0.03 },
  pad: { perRarity: 0.1, perLevel: 0.02 },
};

/** Mastery acima do Legendary (Conservatory): Sheet Music, chance e +25% de força por estrela. */
export const MASTERY = { cost: [5, 10, 20, 40, 80], chance: [0.8, 0.65, 0.5, 0.4, 0.3], power: 0.25, tips: [50000, 250000, 1e6, 5e6, 2.5e7] };

// ── Andamento ───────────────────────────────────────────────────────────────

export const TEMPOS = [92, 100, 108, 116, 124, 132, 140, 152, 164, 176];
export const TEMPO_COST = [60, 200, 600, 2000, 6000, 20000, 75000, 250000, 1000000];
/** Teto de BPM pela bateria: sem bateria, Common, Rare, Epic, Legendary. */
export const TEMPO_CAP = [100, 116, 140, 164, 176];

// ── Tons (círculo das quintas) ──────────────────────────────────────────────

export interface KeyDef {
  pc: number;
  letter: number;
  cost: number;
  fans: number;
}

export const KEYS: KeyDef[] = [
  { pc: 0, letter: 0, cost: 0, fans: 0 },
  { pc: 7, letter: 4, cost: 250, fans: 25 },
  { pc: 5, letter: 3, cost: 1000, fans: 60 },
  { pc: 2, letter: 1, cost: 4000, fans: 120 },
  { pc: 10, letter: 6, cost: 15000, fans: 200 },
  { pc: 9, letter: 5, cost: 60000, fans: 350 },
  { pc: 3, letter: 2, cost: 250000, fans: 600 },
  { pc: 4, letter: 2, cost: 1e6, fans: 1000 },
  { pc: 8, letter: 5, cost: 4e6, fans: 1600 },
  { pc: 11, letter: 6, cost: 1.5e7, fans: 2500 },
  { pc: 1, letter: 1, cost: 6e7, fans: 4000 },
  { pc: 6, letter: 3, cost: 2.5e8, fans: 6000 },
];
export const KEY_BONUS = 0.1;

// ── Modos ───────────────────────────────────────────────────────────────────

export interface ModeDef {
  id: ModeId;
  fans: number;
  tips: number;
  /** Notas da nota característica (no tom atual). */
  notes: number;
  /** Acorde característico (assinatura do modo). */
  sig: string[];
  perk: string;
}

export const MODE_LIST: ModeDef[] = [
  { id: 'ionian', fans: 0, tips: 0, notes: 0, sig: [], perk: 'Home' },
  { id: 'mixolydian', fans: 250, tips: 3000, notes: 100, sig: ['♭VII'], perk: '+25% tips' },
  { id: 'dorian', fans: 350, tips: 10000, notes: 150, sig: ['IV', 'IVmaj7'], perk: '+25% notes' },
  { id: 'aeolian', fans: 500, tips: 30000, notes: 200, sig: ['♭VI'], perk: '+50% Depth' },
  { id: 'lydian', fans: 800, tips: 100000, notes: 300, sig: ['II'], perk: '+50% Feel' },
  { id: 'phrygian', fans: 1500, tips: 400000, notes: 500, sig: ['♭II'], perk: 'Release ×2 on ♭II → i' },
  { id: 'locrian', fans: 3000, tips: 2e6, notes: 1000, sig: ['vii°', 'vii°7'], perk: 'Tension ×2' },
];
export const MODE_DEF = Object.fromEntries(MODE_LIST.map((m) => [m.id, m])) as Record<ModeId, ModeDef>;
/** Loop no modo, com a assinatura, paga isso a mais. */
export const MODE_BONUS = 1.25;
/** O acorde da tônica de cada modo (o "I" do modo). */
export const MODE_TONIC: Record<ModeId, string[]> = {
  ionian: ['I', 'Imaj7', 'Iadd9'],
  lydian: ['I', 'Imaj7', 'Iadd9'],
  mixolydian: ['I', 'Iadd9'],
  dorian: ['i'],
  aeolian: ['i'],
  phrygian: ['i'],
  locrian: ['i'],
};

// ── Progressões (Songbook) ──────────────────────────────────────────────────

export interface ProgDef {
  id: string;
  name: string;
  /** cyc = o loop inteiro (qualquer rotação) · sub = trecho seguido (dá a volta) · set = exatamente esses acordes. */
  kind: 'cyc' | 'sub' | 'set';
  seq: string[];
  /** Compara pelo id exato (V7 ≠ V) em vez da família. */
  exact?: boolean;
  rarity: number;
  /** Acordes que o jogador precisa saber (pra dica). */
  needs: string[];
  len?: 8;
}

export const PROGRESSIONS: ProgDef[] = [
  { id: 'three', name: 'Three-Chord Trick', kind: 'set', seq: ['I', 'IV', 'V'], rarity: 0, needs: [] },
  { id: 'axis', name: 'Axis', kind: 'cyc', seq: ['I', 'V', 'vi', 'IV'], rarity: 0, needs: ['vi'] },
  { id: 'doowop', name: 'Doo-Wop', kind: 'cyc', seq: ['I', 'vi', 'IV', 'V'], rarity: 0, needs: ['vi'] },
  { id: 'climb', name: 'The Climb', kind: 'cyc', seq: ['I', 'ii', 'iii', 'IV'], rarity: 0, needs: ['ii', 'iii'] },
  { id: 'amen', name: 'Amen', kind: 'sub', seq: ['IV', 'I'], rarity: 0, needs: [] },
  { id: '251', name: 'Two-Five-One', kind: 'sub', seq: ['ii', 'V', 'I'], rarity: 1, needs: ['ii'] },
  { id: 'circle', name: 'Circle', kind: 'cyc', seq: ['vi', 'ii', 'V', 'I'], rarity: 1, needs: ['vi', 'ii'] },
  { id: 'royal', name: 'Royal Road', kind: 'cyc', seq: ['IV', 'V', 'iii', 'vi'], rarity: 1, needs: ['iii', 'vi'] },
  { id: 'rhythm', name: 'Rhythm Changes', kind: 'cyc', seq: ['I', 'vi', 'ii', 'V'], rarity: 1, needs: ['vi', 'ii'] },
  { id: 'jazz251', name: 'Jazz Two-Five', kind: 'sub', seq: ['ii7', 'V7', 'Imaj7'], exact: true, rarity: 2, needs: ['ii7', 'V7', 'Imaj7'] },
  { id: 'mixo', name: 'Mixolydian Vamp', kind: 'sub', seq: ['♭VII', 'IV', 'I'], rarity: 1, needs: ['♭VII'] },
  { id: 'mario', name: 'Victory Lap', kind: 'sub', seq: ['♭VI', '♭VII', 'I'], rarity: 2, needs: ['♭VI', '♭VII'] },
  { id: 'andalusian', name: 'Andalusian', kind: 'cyc', seq: ['i', '♭VII', '♭VI', 'V'], rarity: 2, needs: ['i', '♭VII', '♭VI'] },
  { id: 'epic', name: 'Epic Minor', kind: 'cyc', seq: ['i', '♭VI', '♭III', '♭VII'], rarity: 2, needs: ['i', '♭VI', '♭III', '♭VII'] },
  { id: 'minorplagal', name: 'Minor Plagal', kind: 'sub', seq: ['iv', 'I'], rarity: 1, needs: ['iv'] },
  { id: 'backdoor', name: 'Backdoor', kind: 'sub', seq: ['iv', '♭VII', 'I'], rarity: 2, needs: ['iv', '♭VII'] },
  { id: 'dorian', name: 'Dorian Vamp', kind: 'sub', seq: ['i', 'IV'], rarity: 1, needs: ['i'] },
  { id: 'bittersweet', name: 'Bittersweet', kind: 'cyc', seq: ['I', 'III', 'IV', 'iv'], rarity: 2, needs: ['V7/vi', 'iv'] },
  { id: 'turnaround', name: 'Turnaround', kind: 'cyc', seq: ['I', 'VI', 'ii', 'V'], rarity: 2, needs: ['V7/ii', 'ii'] },
  { id: 'secondary', name: 'Five of Five', kind: 'sub', seq: ['II', 'V', 'I'], rarity: 2, needs: ['V7/V'] },
  { id: 'lydian', name: 'Lydian Lift', kind: 'sub', seq: ['I', 'II'], exact: true, rarity: 2, needs: ['II'] },
  { id: 'neapolitan', name: 'Neapolitan', kind: 'sub', seq: ['♭II', 'V', 'I'], rarity: 3, needs: ['♭II'] },
  { id: 'tritone', name: 'Tritone Two-Five', kind: 'sub', seq: ['ii', '♭II7', 'I'], rarity: 3, needs: ['♭II7', 'ii'] },
  { id: 'canon', name: 'Canon', kind: 'cyc', seq: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], rarity: 3, needs: ['vi', 'iii'], len: 8 },
  { id: 'blues', name: 'Eight-Bar Blues', kind: 'cyc', seq: ['I', 'I7', 'IV', 'iv', 'I', 'VI', 'ii', 'V'], rarity: 3, needs: ['V7/IV', 'iv', 'V7/ii', 'ii'], len: 8 },
];

export const PROG = Object.fromEntries(PROGRESSIONS.map((p) => [p.id, p])) as Record<string, ProgDef>;

/** Prêmio da descoberta por raridade da progressão. */
export const DISCOVERY = { fans: [5, 15, 40, 100], tipsBars: [20, 60, 150, 400], records: [1, 3, 8, 20] };
/** Mastery da progressão: voltas pra cada nível; cada nível +2% de gorjeta. */
export const PROG_MASTERY = { loops: [25, 100, 400, 1500, 5000], bonus: 0.02 };

// ── Loop ────────────────────────────────────────────────────────────────────

export const LOOP8 = { fans: 800, tips: 150000 };

// ── Offline ─────────────────────────────────────────────────────────────────

export const OFFLINE = { capHours: 4, roadieHours: 2, roadieMax: 4, baseEff: 0.5, minSeconds: 30 };

// ── Gigs ────────────────────────────────────────────────────────────────────

export type VenueId = 'coffee' | 'jazz' | 'studio' | 'festival';
export type ResId = 'picks' | 'sheet' | 'tape';

export interface VenueDef {
  id: VenueId;
  name: string;
  res: ResId | null;
  resName: string;
  /** Dificuldade base (multiplica a régua). */
  hard: number;
  /** Pedidos possíveis do júri. */
  requests: string[];
}

export const VENUES: VenueDef[] = [
  { id: 'coffee', name: 'Coffee House', res: 'picks', resName: 'Picks', hard: 1, requests: ['slow', 'prog', 'vi', 'harmony60'] },
  { id: 'jazz', name: 'Jazz Cellar', res: 'sheet', resName: 'Sheet Music', hard: 2.5, requests: ['seventh', '251', 'applied', 'harmony70'] },
  { id: 'studio', name: 'Recording Studio', res: 'tape', resName: 'Tape', hard: 6, requests: ['harmony80', 'tension', 'borrowed', 'eight'] },
  { id: 'festival', name: 'Summer Festival', res: null, resName: 'Crates', hard: 15, requests: ['fast', 'feel', 'key', 'mode'] },
];
export const VENUE = Object.fromEntries(VENUES.map((v) => [v.id, v])) as Record<VenueId, VenueDef>;

export const REQUESTS: Record<string, string> = {
  slow: 'Tempo 100 BPM or less',
  prog: 'A famous progression',
  vi: 'Play the vi chord',
  harmony60: 'Harmony 60+',
  seventh: 'A seventh chord',
  '251': 'A Two-Five-One',
  applied: 'An applied dominant',
  harmony70: 'Harmony 70+',
  harmony80: 'Harmony 80+',
  tension: 'Peak tension 15+',
  borrowed: 'A borrowed chord',
  eight: 'An 8-bar loop',
  fast: 'Tempo 132 BPM or more',
  feel: 'Feel 50%+',
  key: 'Not in C',
  mode: 'Any mode but Ionian',
};

export const GIG = {
  levels: 10,
  /** Régua: alvo do show inteiro no nível L = base × growth^(L−1) × dificuldade do local. */
  target: 20,
  growth: 1.8,
  bars: 8,
  rivals: [0.75, 0.95, 1.15],
  spread: 0.12,
  requestMult: 1.5,
  /** Recurso do 1º lugar no nível L = base × growth^(L−1); colocação multiplica. */
  res: { base: 5, growth: 1.35, place: [1, 0.6, 0.35, 0.2] },
  fans: { base: [8, 5, 3, 1], exp: 1.3 },
  firstRecords: 2,
  bookings: { max: 5, every: 15 * 60 * 1000 },
  sims: 400,
};

export const BAND_NAMES = {
  a: ['Velvet', 'Copper', 'Midnight', 'Paper', 'Neon', 'Silver', 'Hollow', 'Golden', 'Static', 'Northbound', 'Tin', 'Electric', 'Lunar', 'Wild', 'Quiet', 'Crimson'],
  b: ['Pigeons', 'Lanterns', 'Owls', 'Static', 'Harbor', 'Foxes', 'Comets', 'Engines', 'Tides', 'Ghosts', 'Saints', 'Satellites', 'Rivers', 'Machines', 'Wolves', 'Echoes'],
};

// ── Equipamento e caixotes ──────────────────────────────────────────────────

export type StatId = 'tone' | 'feel' | 'depth' | 'echo' | 'sustain' | 'stage';
export const STATS: Record<StatId, string> = { tone: 'Tone', feel: 'Feel', depth: 'Depth', echo: 'Echo', sustain: 'Sustain', stage: 'Stage' };

/** Vaga 0 = Pedal, vaga 1 = Accessory. O stat principal define o nome. */
export const GEAR_KINDS: { slot: 0 | 1; main: StatId; name: string }[] = [
  { slot: 0, main: 'tone', name: 'Overdrive' },
  { slot: 0, main: 'feel', name: 'Delay' },
  { slot: 0, main: 'depth', name: 'Compressor' },
  { slot: 1, main: 'echo', name: 'Looper' },
  { slot: 1, main: 'sustain', name: 'Reverb Tank' },
  { slot: 1, main: 'stage', name: 'Stage Amp' },
];
export const SLOT_NAMES = ['Pedal', 'Accessory'];

export const GEAR = {
  /** Stat principal em % no +0, por raridade; cresce 17% do base por +1. */
  main: [4, 7, 11, 16],
  mainStep: 0.17,
  /** Rolagem de substat em %, por raridade. */
  sub: [1.5, 2.5, 4, 6],
  subsAtBirth: [0, 1, 2, 3],
  subSteps: [3, 6, 9, 12],
  maxPlus: 15,
  /** Chance de ir pro +N (índice N−1). */
  chance: [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.22, 0.2],
  picks: [1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26],
  tipsBase: 50,
  /** Practice (failstack): cada falha soma isso × a chance base; teto. */
  practice: 0.15,
  practiceCap: 0.9,
  /** Desmanchar devolve Picks: (raridade + 1) × isso + metade do que foi gasto. */
  scrap: 2,
};

export type CrateTier = 'wooden' | 'vinyl' | 'gold' | 'platinum';
export const CRATES: Record<CrateTier, { name: string; cards: number; rarity: number[]; kinds: { gear: number; notes: number; res: number; records: number } }> = {
  wooden: { name: 'Wooden Crate', cards: 3, rarity: [0.8, 0.18, 0.02, 0], kinds: { gear: 0.45, notes: 0.35, res: 0.2, records: 0 } },
  vinyl: { name: 'Vinyl Crate', cards: 3, rarity: [0.55, 0.35, 0.09, 0.01], kinds: { gear: 0.5, notes: 0.25, res: 0.2, records: 0.05 } },
  gold: { name: 'Gold Crate', cards: 4, rarity: [0.25, 0.45, 0.25, 0.05], kinds: { gear: 0.55, notes: 0.15, res: 0.2, records: 0.1 } },
  platinum: { name: 'Platinum Crate', cards: 5, rarity: [0, 0.4, 0.45, 0.15], kinds: { gear: 0.6, notes: 0.1, res: 0.15, records: 0.15 } },
};
export const CRATE_ORDER: CrateTier[] = ['wooden', 'vinyl', 'gold', 'platinum'];
/** Quanto vem numa carta de notas / recurso / discos, por caixote. */
export const CRATE_AMOUNTS: Record<CrateTier, { notes: number; res: number; records: number }> = {
  wooden: { notes: 20, res: 3, records: 1 },
  vinyl: { notes: 50, res: 6, records: 2 },
  gold: { notes: 120, res: 12, records: 5 },
  platinum: { notes: 300, res: 25, records: 10 },
};

// ── Jam ─────────────────────────────────────────────────────────────────────

export const JAM = {
  bars: 8,
  windows: { perfect: 0.07, great: 0.13, good: 0.2 },
  points: { perfect: 3, great: 2, good: 1 },
  chordTone: 1,
  resolve: 1.5,
  clash: 0.5,
  comboStep: 0.05,
  comboMax: 2,
  /** Hype = pontos ÷ (toques possíveis × 3 × isso) em %. */
  par: 0.6,
  buffSeconds: 180,
  /** Notas que caem por toque bom. */
  notesPerHit: 2,
};

// ── Studio ──────────────────────────────────────────────────────────────────

export const PRESSINGS = [
  { id: 'demo', name: 'Demo', chance: 0.7, mult: 1 },
  { id: 'single', name: 'Single', chance: 0.22, mult: 2 },
  { id: 'hit', name: 'Hit', chance: 0.07, mult: 5 },
  { id: 'classic', name: 'Classic', chance: 0.01, mult: 15 },
];

export const STUDIO = {
  tape: 3,
  tipsBars: 40,
  setlist: 5,
  /** Royalties por hora = gorjeta esperada por hora no momento da gravação × isso × prensagem × qualidade/100. */
  royalty: 0.1,
  chartTop: 5000,
  chartExp: 1.5,
  chartMilestones: [
    { pos: 100, records: 5 },
    { pos: 50, records: 10 },
    { pos: 20, records: 20 },
    { pos: 10, records: 40 },
    { pos: 1, records: 100 },
  ],
};

// ── Boosts (Gold Records) ───────────────────────────────────────────────────

export type BoostId = 'encore' | 'spotlight';
export const BOOSTS: Record<BoostId, { name: string; cost: number; minutes: number; mult: number; what: string }> = {
  encore: { name: 'Encore', cost: 10, minutes: 30, mult: 2, what: '2× tips' },
  spotlight: { name: 'Spotlight', cost: 10, minutes: 30, mult: 2, what: '2× Feel' },
};
export const ROADIE = { cost: 25 };

// ── Marcos ──────────────────────────────────────────────────────────────────

export const MILESTONES: { id: string; name: string; records: number }[] = [
  { id: 'sweet', name: 'First Sweet bar', records: 1 },
  { id: 'soaring', name: 'First Soaring bar', records: 3 },
  { id: 'transcendent', name: 'First Transcendent bar', records: 10 },
  { id: 'band3', name: 'Three-piece band', records: 3 },
  { id: 'band6', name: 'Full band', records: 15 },
  { id: 'rare', name: 'First Rare instrument', records: 3 },
  { id: 'legend', name: 'First Legendary instrument', records: 15 },
  { id: 'key3', name: 'Three keys', records: 5 },
  { id: 'fans1k', name: '1,000 fans', records: 10 },
  { id: 'fans10k', name: '10,000 fans', records: 25 },
];

// ── Preço fechado ───────────────────────────────────────────────────────────

const LADDER = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10];

/** Arredonda pra escada 1 · 1,5 · 2 · 2,5 · 3 · 4 · 5 · 6 · 7,5 × 10ⁿ (regra do Fellipe). */
export function roundPrice(x: number): number {
  if (x <= 1) return 1;
  const e = Math.floor(Math.log10(x));
  const b = x / 10 ** e;
  const s = LADDER.find((v) => v >= b - 1e-9) ?? 10;
  return Math.round(s * 10 ** e);
}
