// Regra do jogo, pura: estado + relógio + sorteio entram por parâmetro. Números em ./content.
import {
  BOOSTS,
  GEAR,
  GEAR_KINDS,
  CHORD,
  DISCOVERY,
  FANS_PER_BAR,
  GRADES,
  GRADE_CAP,
  INST,
  INSTRUMENTS,
  KEYS,
  KEY_BONUS,
  LEVEL_STEP,
  LOOP8,
  MASTERY,
  MAX_LEVEL,
  MILESTONES,
  MODE_BONUS,
  MODE_DEF,
  NOTES_ROOT_BONUS,
  OFFLINE,
  PITY,
  PROG,
  PROG_MASTERY,
  RARITY_MULT,
  RARITY_NOTES,
  RARITY_TIPS,
  ROADIE,
  ROLE_STAT,
  START_CHORDS,
  START_LOOP,
  TEMPOS,
  TEMPO_CAP,
  TEMPO_COST,
  TENSION,
  TIERS,
  TUNE_GROWTH,
  TUNE_RARITY,
  roundPrice,
  type BoostId,
  type CrateTier,
  type GradeId,
  type InstId,
  type ResId,
  type StatId,
  type VenueId,
} from './content';
import { analyze, stepTension, steadyCycle, type BarTension, type LoopInfo } from './harmony';
import type { Rng } from './rng';
import { absPcs, mod12, scaleAbs, type ModeId, type Tonic } from './theory';

// ── Estado ──────────────────────────────────────────────────────────────────

export interface InstState {
  own: boolean;
  /** Raridade 0–3. */
  r: number;
  /** Nível 1–10. */
  q: number;
  /** Mastery ★ acima do Legendary. */
  stars: number;
  /** Equipamento: uid na vaga Pedal e na Accessory. */
  gear: [number | null, number | null];
}

export interface Item {
  uid: number;
  /** Índice em GEAR_KINDS. */
  kind: number;
  r: number;
  plus: number;
  subs: { stat: StatId; v: number }[];
  /** Instrumento que está usando. */
  on: InstId | null;
  /** Picks gastos (o desmanche devolve metade). */
  spent: number;
}

export interface Song {
  id: number;
  name: string;
  loop: string[];
  key: number;
  mode: ModeId;
  quality: number;
  pressing: number;
  /** Royalties por hora, fixados na gravação. */
  perHour: number;
  at: number;
}

export interface GigState {
  /** Maior nível aberto (1–10). */
  open: number;
  /** Melhor colocação por nível (1 = primeiro), 0 = nunca tocou. */
  best: number[];
}

export interface State {
  v: 1;
  /** Última vez que o relógio do jogo andou (ms). */
  t: number;
  tips: number;
  fans: number;
  records: number;
  /** Notas por altura absoluta (0 = C). */
  notes: number[];
  res: Record<ResId, number>;
  key: number;
  keys: number[];
  mode: ModeId;
  modes: ModeId[];
  learned: string[];
  loop: string[];
  loop8: boolean;
  /** Loop guardado da outra extensão (pra voltar de 8 pra 4 sem perder). */
  altLoop: string[] | null;
  inst: Record<InstId, InstState>;
  /** BPM escolhido e o maior comprado (índices em TEMPOS). */
  tempo: number;
  tempoMax: number;
  tension: number;
  /** Próxima casa do loop. */
  slot: number;
  pity: { soaring: number; transcendent: number };
  found: string[];
  /** Voltas tocadas de cada progressão. */
  mastery: Record<string, number>;
  stats: { bars: number; loops: number; sweet: number; soaring: number; transcendent: number; tipsTotal: number; bestBar: number; gigs: number; wins: number };
  gigs: Record<VenueId, GigState>;
  bookings: number;
  bookingAt: number;
  items: Item[];
  nextUid: number;
  crates: Record<CrateTier, number>;
  /** Practice (failstack) por peça: `item:uid` ou `inst:id`. */
  practice: Record<string, number>;
  songs: Song[];
  setlist: number[];
  nextSong: number;
  chartClaimed: number[];
  royaltyAt: number;
  boosts: Partial<Record<BoostId, number>>;
  hype: { until: number; value: number };
  roadies: number;
  milestones: string[];
  /** Lugares já anunciados (aviso de lugar novo). */
  seen: string[];
  /** Notas de tutorial vistas. */
  tips_seen: string[];
}

export function startState(now: number): State {
  const inst = Object.fromEntries(
    INSTRUMENTS.map((i) => [i.id, { own: i.buy === 0, r: 0, q: 1, stars: 0, gear: [null, null] as [null, null] }]),
  ) as Record<InstId, InstState>;
  return {
    v: 1,
    t: now,
    tips: 0,
    fans: 0,
    records: 0,
    notes: Array(12).fill(0),
    res: { picks: 0, sheet: 0, tape: 0 },
    key: 0,
    keys: [0],
    mode: 'ionian',
    modes: ['ionian'],
    learned: [...START_CHORDS],
    loop: [...START_LOOP],
    loop8: false,
    altLoop: null,
    inst,
    tempo: 0,
    tempoMax: 0,
    tension: 0,
    slot: 0,
    pity: { soaring: 0, transcendent: 0 },
    found: [],
    mastery: {},
    stats: { bars: 0, loops: 0, sweet: 0, soaring: 0, transcendent: 0, tipsTotal: 0, bestBar: 0, gigs: 0, wins: 0 },
    gigs: {
      coffee: { open: 1, best: Array(10).fill(0) },
      jazz: { open: 1, best: Array(10).fill(0) },
      studio: { open: 1, best: Array(10).fill(0) },
      festival: { open: 1, best: Array(10).fill(0) },
    },
    bookings: 5,
    bookingAt: now,
    items: [],
    nextUid: 1,
    crates: { wooden: 0, vinyl: 0, gold: 0, platinum: 0 },
    practice: {},
    songs: [],
    setlist: [],
    nextSong: 1,
    chartClaimed: [],
    royaltyAt: now,
    boosts: {},
    hype: { until: 0, value: 0 },
    roadies: 0,
    milestones: [],
    seen: [],
    tips_seen: [],
  };
}

// ── Leituras ────────────────────────────────────────────────────────────────

export const tonicOf = (s: State): Tonic => {
  const k = KEYS.find((x) => x.pc === s.key) ?? KEYS[0];
  return { pc: k.pc, letter: k.letter };
};

export const bpm = (s: State) => TEMPOS[s.tempo];
export const barSeconds = (s: State) => (4 * 60) / bpm(s);

let infoCache = { k: '', v: null as LoopInfo | null };
/** Análise do loop atual (com cache: roda a cada compasso). */
export function loopInfo(s: State): LoopInfo {
  const k = s.loop.join('|') + '#' + s.mode;
  if (infoCache.k !== k || !infoCache.v) infoCache = { k, v: analyze(s.loop, s.mode) };
  return infoCache.v!;
}

/** Itens equipados num instrumento. */
export const itemsOn = (s: State, id: InstId) => s.inst[id].gear.map((uid) => s.items.find((x) => x.uid === uid)).filter(Boolean) as Item[];

/** Stat principal do item (vem do tipo) e o valor em % (cresce com o +N). */
export const itemMain = (it: Item): StatId => GEAR_KINDS[it.kind].main;
export const itemMainValue = (it: Item) => GEAR.main[it.r] * (1 + GEAR.mainStep * it.plus);

/** Valor de um stat num item (principal + substats), em fração. */
export function itemStat(it: Item, stat: StatId): number {
  let v = itemMain(it) === stat ? itemMainValue(it) : 0;
  for (const sb of it.subs) if (sb.stat === stat) v += sb.v;
  return v / 100;
}

/** Soma de um stat em todo equipamento usado (fração). */
export function gearTotal(s: State, stat: StatId): number {
  let v = 0;
  for (const it of s.items) if (it.on) v += itemStat(it, stat);
  return v;
}

const gearOn = (s: State, id: InstId, stat: StatId) => itemsOn(s, id).reduce((a, it) => a + itemStat(it, stat), 0);

/** Força de um instrumento (Tone). */
export function power(s: State, id: InstId): number {
  const it = s.inst[id];
  if (!it.own) return 0;
  const d = INST[id];
  return d.base * RARITY_MULT[it.r] * (1 + LEVEL_STEP * (it.q - 1)) * (1 + MASTERY.power * it.stars) * (1 + gearOn(s, id, 'tone'));
}

/** Tone: a soma da banda (as "fichas" do Balatro). */
export const tone = (s: State) => INSTRUMENTS.reduce((a, i) => a + power(s, i.id), 0);

/** Stat do papel (baixo → Depth, solo → Feel, cordas → Sustain). */
function roleStat(s: State, id: InstId, k: keyof typeof ROLE_STAT): number {
  const it = s.inst[id];
  if (!it.own) return 0;
  const r = ROLE_STAT[k];
  return (it.r + 1) * r.perRarity + (it.q - 1) * r.perLevel + 0.1 * it.stars;
}

const modeOn = (s: State, m: ModeId) => s.mode === m && loopInfo(s).modeSig;

export const hypeOn = (s: State, now: number) => (s.hype.until > now ? s.hype.value : 0);
export const boostOn = (s: State, id: BoostId, now: number) => (s.boosts[id] ?? 0) > now;

/** Feel: multiplica a chance de grade boa (1 + Feel). */
export function feel(s: State, now: number): number {
  let f = roleStat(s, 'flute', 'lead') + gearTotal(s, 'feel') + hypeOn(s, now) / 100;
  if (modeOn(s, 'lydian')) f += 0.5;
  if (boostOn(s, 'spotlight', now)) f = (1 + f) * BOOSTS.spotlight.mult - 1;
  return f;
}

export function depth(s: State): number {
  let d = roleStat(s, 'bass', 'bass') + gearTotal(s, 'depth');
  if (modeOn(s, 'aeolian')) d += 0.5;
  return d;
}

export const sustain = (s: State) => roleStat(s, 'strings', 'pad') + gearTotal(s, 'sustain');
export const echo = (s: State) => gearTotal(s, 'echo') + (modeOn(s, 'dorian') ? 0.25 : 0);
export const stage = (s: State) => gearTotal(s, 'stage');

export const keyMult = (s: State) => 1 + KEY_BONUS * (s.keys.length - 1);

/** Nível de mastery de uma progressão (0–5). */
export const progLevel = (s: State, id: string) => PROG_MASTERY.loops.filter((n) => (s.mastery[id] ?? 0) >= n).length;
export const masteryMult = (s: State) => 1 + PROG_MASTERY.bonus * Object.keys(s.mastery).reduce((a, id) => a + progLevel(s, id), 0);

/** Tudo que multiplica a gorjeta fora do compasso. */
export function tipsMult(s: State, now: number): number {
  let m = keyMult(s) * masteryMult(s) * (1 + hypeOn(s, now) / 100);
  if (loopInfo(s).modeSig) m *= MODE_BONUS;
  if (modeOn(s, 'mixolydian')) m *= 1.25;
  if (boostOn(s, 'encore', now)) m *= BOOSTS.encore.mult;
  return m;
}

export const playing = (s: State) => INSTRUMENTS.filter((i) => s.inst[i.id].own).length;

// ── A grade do compasso ─────────────────────────────────────────────────────

export interface Odds {
  sweet: number;
  soaring: number;
  transcendent: number;
  /** Garantia disparou. */
  forced: GradeId | null;
}

/** Chances da grade num compasso: Feel, soltura, surpresa e garantia (rampa + certeza). */
export function gradeOdds(s: State, bt: Pick<BarTension, 'released' | 'deceptive'>, now: number, pity = s.pity): Odds {
  let k = 1 + feel(s, now);
  if (bt.released > 0) k *= 1 + bt.released / TENSION.luckDiv;
  if (bt.deceptive) k *= TENSION.surpriseLuck;
  let sw = GRADES[1].chance * k;
  let so = GRADES[2].chance * k;
  let tr = GRADES[3].chance * k;
  const ns = pity.soaring + 1;
  const nt = pity.transcendent + 1;
  if (ns > PITY.soaring.soft) so += PITY.soaring.step * (ns - PITY.soaring.soft);
  if (nt > PITY.transcendent.soft) tr += PITY.transcendent.step * (nt - PITY.transcendent.soft);
  let forced: GradeId | null = null;
  if (nt >= PITY.transcendent.hard) forced = 'transcendent';
  else if (ns >= PITY.soaring.hard) forced = 'soaring';
  tr = Math.min(tr, GRADE_CAP);
  so = Math.min(so, GRADE_CAP - tr);
  sw = Math.max(0, Math.min(sw, GRADE_CAP - tr - so));
  return { sweet: sw, soaring: so, transcendent: tr, forced };
}

export function rollGrade(o: Odds, rng: Rng): GradeId {
  const u = rng();
  if (o.forced === 'transcendent' || u < o.transcendent) return 'transcendent';
  if (u < o.transcendent + o.soaring) return 'soaring';
  if (o.forced === 'soaring') return 'soaring';
  if (u < o.transcendent + o.soaring + o.sweet) return 'sweet';
  return 'solid';
}

export const gradeDef = (g: GradeId) => GRADES.find((x) => x.id === g)!;
export const expectedGradeMult = (o: Odds) => 1 + o.sweet * (GRADES[1].mult - 1) + o.soaring * (GRADES[2].mult - 1) + o.transcendent * (GRADES[3].mult - 1);
const expectedGradeNotes = (o: Odds) => 1 + o.sweet * (GRADES[1].notes - 1) + o.soaring * (GRADES[2].notes - 1) + o.transcendent * (GRADES[3].notes - 1);

// ── O compasso ──────────────────────────────────────────────────────────────

export interface BarResult {
  slot: number;
  id: string;
  grade: GradeId;
  odds: Odds;
  tension: BarTension;
  /** Tone, mult da harmonia e o total (pra conta na tela). */
  chips: number;
  harmony: number;
  tips: number;
  notes: [number, number][];
  fans: number;
  records: number;
  /** Fim de volta: progressões novas e marcos. */
  loopEnd: boolean;
  discovered: string[];
  masteryUp: string[];
  milestones: string[];
}

/** Notas que um compasso solta (sem a grade). */
export function barNotes(s: State, id: string, gradeNotes: number): [number, number][] {
  const pcs = absPcs(CHORD[id], tonicOf(s));
  const per = (1 + echo(s)) * gradeNotes;
  return pcs.map((pc, i) => [pc, per * (i === 0 ? NOTES_ROOT_BONUS : 1)]);
}

/** Toca o próximo compasso: sorteia a grade, paga, solta notas, mexe no medidor e na garantia. */
export function playBar(s: State, rng: Rng, now: number): BarResult {
  const n = s.loop.length;
  const slot = s.slot % n;
  const id = s.loop[slot];
  const prev = s.loop[(slot - 1 + n) % n];
  const info = loopInfo(s);
  const bt = stepTension(s.tension, prev, id, s.mode, depth(s), info.modeSig);
  const odds = gradeOdds(s, bt, now);
  const grade = rollGrade(odds, rng);
  const g = gradeDef(grade);
  const chips = tone(s);
  const tips = chips * info.mult * bt.release * g.mult * tipsMult(s, now);
  const notes = barNotes(s, id, g.notes);
  const fans = FANS_PER_BAR * (info.score / 100) * Math.sqrt(g.mult);

  s.tension = bt.after;
  s.tips += tips;
  s.stats.tipsTotal += tips;
  s.fans += fans;
  s.records += g.records;
  for (const [pc, v] of notes) s.notes[pc] += v;
  s.stats.bars++;
  s.stats.bestBar = Math.max(s.stats.bestBar, tips);
  if (grade === 'sweet') s.stats.sweet++;
  s.pity.soaring = grade === 'soaring' || grade === 'transcendent' ? 0 : s.pity.soaring + 1;
  s.pity.transcendent = grade === 'transcendent' ? 0 : s.pity.transcendent + 1;
  if (grade === 'soaring') s.stats.soaring++;
  if (grade === 'transcendent') s.stats.transcendent++;
  s.slot = (slot + 1) % n;

  const res: BarResult = { slot, id, grade, odds, tension: bt, chips, harmony: info.mult * bt.release, tips, notes, fans, records: g.records, loopEnd: slot === n - 1, discovered: [], masteryUp: [], milestones: [] };
  if (res.loopEnd) endLoop(s, res, now);
  res.milestones.push(...checkMilestones(s));
  return res;
}

/** Fim de volta: conta mastery das progressões tocadas e descobre as novas. */
function endLoop(s: State, res: BarResult, now: number) {
  s.stats.loops++;
  const info = loopInfo(s);
  for (const p of info.progs) {
    const before = progLevel(s, p.id);
    s.mastery[p.id] = (s.mastery[p.id] ?? 0) + 1;
    if (progLevel(s, p.id) > before) res.masteryUp.push(p.id);
    if (!s.found.includes(p.id)) {
      s.found.push(p.id);
      res.discovered.push(p.id);
      const r = p.rarity;
      s.fans += DISCOVERY.fans[r];
      s.records += DISCOVERY.records[r];
      s.tips += expectedTipsPerBar(s, now) * DISCOVERY.tipsBars[r];
    }
  }
}

/** Marcos de primeira vez (pagam Gold Records). Devolve os novos. */
export function checkMilestones(s: State): string[] {
  const got: string[] = [];
  const hit = (id: string, ok: boolean) => {
    if (ok && !s.milestones.includes(id)) {
      s.milestones.push(id);
      s.records += MILESTONES.find((m) => m.id === id)!.records;
      got.push(id);
    }
  };
  hit('sweet', s.stats.sweet + s.stats.soaring + s.stats.transcendent > 0);
  hit('soaring', s.stats.soaring + s.stats.transcendent > 0);
  hit('transcendent', s.stats.transcendent > 0);
  hit('band3', playing(s) >= 3);
  hit('band6', playing(s) >= 6);
  hit('rare', INSTRUMENTS.some((i) => s.inst[i.id].own && s.inst[i.id].r >= 1));
  hit('legend', INSTRUMENTS.some((i) => s.inst[i.id].own && s.inst[i.id].r >= 3));
  hit('key3', s.keys.length >= 3);
  hit('fans1k', s.fans >= 1000);
  hit('fans10k', s.fans >= 10000);
  return got;
}

// ── Leitura do loop pra tela ────────────────────────────────────────────────

export interface SlotView {
  id: string;
  tension: BarTension;
  odds: Odds;
  /** Gorjeta esperada (com a média da grade). */
  tips: number;
}

/** O ciclo estável casa por casa: o que acumula, o que solta, a chance e a gorjeta média. */
export function loopView(s: State, now: number): SlotView[] {
  const info = loopInfo(s);
  const cyc = steadyCycle(s.loop, s.mode, depth(s));
  const ch = tone(s);
  const tm = tipsMult(s, now);
  return s.loop.map((id, k) => {
    const odds = gradeOdds(s, cyc[k], now, { soaring: 0, transcendent: 0 });
    return { id, tension: cyc[k], odds, tips: ch * info.mult * cyc[k].release * expectedGradeMult(odds) * tm };
  });
}

export function expectedTipsPerBar(s: State, now: number): number {
  const v = loopView(s, now);
  return v.reduce((a, x) => a + x.tips, 0) / v.length;
}

export const tipsPerSecond = (s: State, now: number) => expectedTipsPerBar(s, now) / barSeconds(s);

// ── Ações: acordes e loop ───────────────────────────────────────────────────

export const tierOpen = (s: State, tier: string) => s.fans >= (TIERS.find((t) => t.id === tier)?.fans ?? Infinity);

/** Custo de aprender: as notas do próprio acorde no tom atual. */
export function learnCost(s: State, id: string): [number, number][] {
  const d = CHORD[id];
  return absPcs(d, tonicOf(s)).map((pc) => [pc, d.learn]);
}

export const canPayNotes = (s: State, cost: [number, number][]) => {
  const need = Array(12).fill(0);
  for (const [pc, n] of cost) need[pc] += n;
  return need.every((n, pc) => s.notes[pc] >= n);
};

function payNotes(s: State, cost: [number, number][]) {
  for (const [pc, n] of cost) s.notes[pc] -= n;
}

export function learnChord(s: State, id: string): boolean {
  const d = CHORD[id];
  if (!d || s.learned.includes(id) || !tierOpen(s, d.tier)) return false;
  const cost = learnCost(s, id);
  if (!canPayNotes(s, cost)) return false;
  payNotes(s, cost);
  s.learned.push(id);
  return true;
}

export function setSlot(s: State, slot: number, id: string): boolean {
  if (!s.learned.includes(id) || slot < 0 || slot >= s.loop.length) return false;
  s.loop[slot] = id;
  return true;
}

export const canLoop8 = (s: State) => s.fans >= LOOP8.fans;

/** Compra o loop de 8 (dobra as casas). Depois disso dá pra alternar 4 ↔ 8. */
export function buyLoop8(s: State): boolean {
  if (s.loop8 || !canLoop8(s) || s.tips < LOOP8.tips) return false;
  s.tips -= LOOP8.tips;
  s.loop8 = true;
  s.altLoop = [...s.loop];
  s.loop = [...s.loop, ...s.loop];
  s.slot = 0;
  return true;
}

export function toggleLoopLength(s: State): boolean {
  if (!s.loop8) return false;
  const cur = s.loop;
  s.loop = s.altLoop ?? (cur.length === 8 ? cur.slice(0, 4) : [...cur, ...cur]);
  s.altLoop = cur;
  s.slot = 0;
  return true;
}

// ── Ações: banda ────────────────────────────────────────────────────────────

export function buyInst(s: State, id: InstId): boolean {
  const it = s.inst[id];
  if (it.own || s.tips < INST[id].buy) return false;
  s.tips -= INST[id].buy;
  it.own = true;
  return true;
}

export const tuneCost = (s: State, id: InstId) => roundPrice(INST[id].tune * Math.pow(TUNE_GROWTH, s.inst[id].q - 1) * Math.pow(TUNE_RARITY, s.inst[id].r));

export function tune(s: State, id: InstId): boolean {
  const it = s.inst[id];
  if (!it.own || it.q >= MAX_LEVEL) return false;
  const c = tuneCost(s, id);
  if (s.tips < c) return false;
  s.tips -= c;
  it.q++;
  return true;
}

/** Custo de subir raridade: notas da assinatura do instrumento, ou dinheiro (bateria). */
export function rarityCost(s: State, id: InstId): { notes: [number, number][] | null; tips: number } {
  const it = s.inst[id];
  const sig = INST[id].sig;
  if (sig) return { notes: sig.map((pc) => [pc, RARITY_NOTES[it.r]]), tips: 0 };
  return { notes: null, tips: RARITY_TIPS[it.r] };
}

export function rarityUp(s: State, id: InstId): boolean {
  const it = s.inst[id];
  if (!it.own || it.q < MAX_LEVEL || it.r >= 3) return false;
  const c = rarityCost(s, id);
  if (c.notes) {
    if (!canPayNotes(s, c.notes)) return false;
    payNotes(s, c.notes);
  } else {
    if (s.tips < c.tips) return false;
    s.tips -= c.tips;
  }
  it.r++;
  it.q = 1;
  return true;
}

/** Chance da próxima estrela (com Practice). */
export function masteryChance(s: State, id: InstId): number {
  const it = s.inst[id];
  const base = MASTERY.chance[it.stars] ?? 0;
  return Math.min(0.9, base * (1 + 0.15 * (s.practice['inst:' + id] ?? 0)));
}

/** Treino acima do Legendary (Conservatory): Sheet Music + dinheiro, com chance. */
export function trainMastery(s: State, id: InstId, rng: Rng): 'ok' | 'fail' | null {
  const it = s.inst[id];
  if (!it.own || it.r < 3 || it.q < MAX_LEVEL || it.stars >= MASTERY.cost.length) return null;
  const sheet = MASTERY.cost[it.stars];
  const tips = MASTERY.tips[it.stars];
  if (s.res.sheet < sheet || s.tips < tips) return null;
  const p = masteryChance(s, id);
  s.res.sheet -= sheet;
  s.tips -= tips;
  if (rng() < p) {
    it.stars++;
    s.practice['inst:' + id] = 0;
    return 'ok';
  }
  s.practice['inst:' + id] = (s.practice['inst:' + id] ?? 0) + 1;
  return 'fail';
}

/** Teto de BPM pela bateria. */
export const tempoCap = (s: State) => TEMPOS.indexOf(TEMPO_CAP[s.inst.drums.own ? s.inst.drums.r + 1 : 0]);

export function buyTempo(s: State): boolean {
  if (s.tempoMax >= tempoCap(s) || s.tempoMax >= TEMPOS.length - 1) return false;
  const c = TEMPO_COST[s.tempoMax];
  if (s.tips < c) return false;
  s.tips -= c;
  s.tempoMax++;
  s.tempo = s.tempoMax;
  return true;
}

export function setTempo(s: State, i: number): boolean {
  if (i < 0 || i > s.tempoMax) return false;
  s.tempo = i;
  return true;
}

// ── Ações: tons e modos ─────────────────────────────────────────────────────

export function buyKey(s: State, pc: number): boolean {
  const k = KEYS.find((x) => x.pc === pc);
  if (!k || s.keys.includes(pc) || s.fans < k.fans || s.tips < k.cost) return false;
  s.tips -= k.cost;
  s.keys.push(pc);
  s.key = pc;
  return true;
}

export function setKey(s: State, pc: number): boolean {
  if (!s.keys.includes(pc)) return false;
  s.key = pc;
  return true;
}

/** Nota característica do modo no tom atual (a que se paga pra abrir). */
export const modeNote = (s: State, m: ModeId) => {
  const steps = { lydian: 6, mixolydian: 10, dorian: 3, aeolian: 8, phrygian: 1, locrian: 6, ionian: 0 } as const;
  return mod12(s.key + steps[m]);
};

export function buyMode(s: State, m: ModeId): boolean {
  const d = MODE_DEF[m];
  if (s.modes.includes(m) || s.fans < d.fans || s.tips < d.tips) return false;
  const pc = modeNote(s, m);
  if (s.notes[pc] < d.notes) return false;
  s.notes[pc] -= d.notes;
  s.tips -= d.tips;
  s.modes.push(m);
  s.mode = m;
  return true;
}

export function setMode(s: State, m: ModeId): boolean {
  if (!s.modes.includes(m)) return false;
  s.mode = m;
  return true;
}

/** As notas do modo no tom atual (teclado e Jam). */
export const modeScale = (s: State) => scaleAbs(tonicOf(s), s.mode);

// ── Boosts ──────────────────────────────────────────────────────────────────

export function useBoost(s: State, id: BoostId, now: number): boolean {
  const b = BOOSTS[id];
  if (s.records < b.cost) return false;
  s.records -= b.cost;
  s.boosts[id] = Math.max(s.boosts[id] ?? 0, now) + b.minutes * 60_000;
  return true;
}

export function buyRoadie(s: State): boolean {
  if (s.roadies >= OFFLINE.roadieMax || s.records < ROADIE.cost * (s.roadies + 1)) return false;
  s.records -= ROADIE.cost * (s.roadies + 1);
  s.roadies++;
  return true;
}

// ── Offline ─────────────────────────────────────────────────────────────────

export const offlineCapHours = (s: State) => OFFLINE.capHours + OFFLINE.roadieHours * s.roadies;
export const offlineEff = (s: State) => Math.min(1, OFFLINE.baseEff + sustain(s) * 0.5);

export interface AwayResult {
  seconds: number;
  bars: number;
  tips: number;
  royalties: number;
  notes: number[];
  fans: number;
}

/** Fora do app: compassos pela média (sem sorteio), com eficiência pelo Sustain e teto em horas. */
export function away(s: State, now: number, royaltiesPerHour = 0): AwayResult | null {
  const sec = (now - s.t) / 1000;
  s.t = now;
  if (sec < OFFLINE.minSeconds) return null;
  const capped = Math.min(sec, offlineCapHours(s) * 3600);
  const bars = Math.floor(capped / barSeconds(s));
  const eff = offlineEff(s);
  const view = loopView(s, now);
  const per = view.reduce((a, x) => a + x.tips, 0) / view.length;
  const tips = per * bars * eff;
  const royalties = (royaltiesPerHour * capped) / 3600;
  const notes = Array(12).fill(0);
  for (let k = 0; k < s.loop.length; k++) {
    const share = Math.floor(bars / s.loop.length) + (k < bars % s.loop.length ? 1 : 0);
    for (const [pc, v] of barNotes(s, s.loop[k], expectedGradeNotes(view[k].odds))) notes[pc] += v * share * eff * OFFLINE.notesEff;
  }
  const fans = FANS_PER_BAR * (loopInfo(s).score / 100) * bars * eff;
  s.tips += tips + royalties;
  s.stats.tipsTotal += tips + royalties;
  s.fans += fans;
  notes.forEach((v, pc) => (s.notes[pc] += v));
  s.stats.bars += bars;
  return { seconds: sec, bars, tips, royalties, notes, fans };
}

// ── Progressões (dica pro Songbook) ─────────────────────────────────────────

export const progKnown = (s: State, id: string) => s.found.includes(id);
export const progMissing = (s: State, id: string) => PROG[id].needs.filter((c) => !s.learned.includes(c));
