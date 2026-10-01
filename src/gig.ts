// Gigs: o show ao vivo contra 3 bandas, com a régua fixa por nível, o pedido do júri e a chance de pódio por Monte Carlo.
import { BAND_NAMES, CHORD, CRATE_ORDER, GIG, MODE_BONUS, TEMPOS, VENUE, type CrateTier, type GradeId, type VenueId } from './content';
import { depth, feel, gradeDef, gradeOdds, loopInfo, rollGrade, stage, tone, type State } from './game';
import { peakTension, stepTension } from './harmony';
import { gauss, hash, pickOne, seeded, type Rng } from './rng';
import { fnOf, outOfMode } from './theory';

/** Alvo do show inteiro (8 compassos) no nível L. */
export const gigTarget = (v: VenueId, level: number) => GIG.target * Math.pow(GIG.growth, level - 1) * VENUE[v].hard;

/** O pedido do júri é fixo por local e nível (todo mundo vê o mesmo). */
export const requestOf = (v: VenueId, level: number) => pickOne(VENUE[v].requests, seeded(hash(v + ':' + level)));

export function requestMet(s: State, req: string, now: number): boolean {
  const info = loopInfo(s);
  const ids = s.loop;
  switch (req) {
    case 'slow':
      return TEMPOS[s.tempo] <= 100;
    case 'fast':
      return TEMPOS[s.tempo] >= 132;
    case 'prog':
      return info.progs.length > 0;
    case 'vi':
      return ids.some((id) => CHORD[id].base === 'vi');
    case 'harmony60':
      return info.score >= 60;
    case 'harmony70':
      return info.score >= 70;
    case 'harmony80':
      return info.score >= 80;
    case 'seventh':
      return ids.some((id) => ['7', 'maj7', 'm7', 'm7b5', 'dim7'].includes(CHORD[id].quality));
    case '251':
      return info.progs.some((p) => p.id === '251' || p.id === 'jazz251' || p.id === 'tritone');
    case 'applied':
      return ids.some((id) => CHORD[id].applied !== undefined);
    case 'tension':
      return peakTension(s.loop, s.mode) >= 15;
    case 'borrowed':
      return ids.some((id) => CHORD[id].tier === 'borrowed' || (outOfMode(CHORD[id], s.mode) > 0 && fnOf(CHORD[id]) !== 'D'));
    case 'eight':
      return s.loop.length === 8;
    case 'feel':
      return feel(s, now) >= 0.5;
    case 'key':
      return s.key !== 0;
    case 'mode':
      return s.mode !== 'ionian';
  }
  return false;
}

export interface Rival {
  name: string;
  mult: number;
}

/** As 3 bandas do nível, com nome fixo. */
export function rivalsOf(v: VenueId, level: number): Rival[] {
  const r = seeded(hash('rivals:' + v + ':' + level));
  const used = new Set<string>();
  return GIG.rivals.map((mult) => {
    let name = '';
    do name = `${pickOne(BAND_NAMES.a, r)} ${pickOne(BAND_NAMES.b, r)}`;
    while (used.has(name));
    used.add(name);
    return { name, mult };
  });
}

export interface GigBar {
  slot: number;
  id: string;
  /** Tone (azul). */
  chips: number;
  /** Harmonia × soltura × pedido × modo (vermelho). */
  mult: number;
  grade: GradeId;
  score: number;
  released: number;
  /** Acumulado depois do compasso (o arranjo usa pra virada e crescendo). */
  stored: number;
}

/** Um show: 8 compassos do loop, medidor começando do zero, sem garantia (o show é limpo). */
export function simulateShow(s: State, v: VenueId, level: number, rng: Rng, now: number): GigBar[] {
  const info = loopInfo(s);
  const req = requestMet(s, requestOf(v, level), now) ? GIG.requestMult : 1;
  const chips = tone(s) * (1 + stage(s));
  const dep = depth(s);
  const n = s.loop.length;
  let stored = 0;
  const bars: GigBar[] = [];
  for (let b = 0; b < GIG.bars; b++) {
    const k = b % n;
    const bt = stepTension(stored, s.loop[(k - 1 + n) % n], s.loop[k], s.mode, dep, info.modeSig);
    stored = bt.after;
    const grade = rollGrade(gradeOdds(s, bt, now, { soaring: 0, transcendent: 0 }), rng);
    const mult = info.mult * bt.release * req * (info.modeSig ? MODE_BONUS : 1);
    bars.push({ slot: k, id: s.loop[k], chips, mult, grade, score: chips * mult * gradeDef(grade).mult, released: bt.released, stored: bt.after });
  }
  return bars;
}

const rivalScore = (target: number, mult: number, rng: Rng) => Math.max(1, target * mult * (1 + GIG.spread * gauss(rng)));

export interface GigOdds {
  /** Chance de 1º, 2º, 3º, 4º. */
  place: number[];
  mean: number;
}

/** Monte Carlo: roda o show N vezes com as suas chances reais contra as 3 bandas. */
export function gigOdds(s: State, v: VenueId, level: number, now: number, sims = GIG.sims, rng: Rng = seeded(hash(`odds:${v}:${level}:${s.loop.join()}`))): GigOdds {
  const target = gigTarget(v, level);
  const rv = rivalsOf(v, level);
  const place = [0, 0, 0, 0];
  let sum = 0;
  for (let i = 0; i < sims; i++) {
    const me = simulateShow(s, v, level, rng, now).reduce((a, b) => a + b.score, 0);
    sum += me;
    const above = rv.filter((r) => rivalScore(target, r.mult, rng) > me).length;
    place[above]++;
  }
  return { place: place.map((x) => x / sims), mean: sum / sims };
}

// ── Bookings ────────────────────────────────────────────────────────────────

export function refreshBookings(s: State, now: number) {
  if (s.bookings >= GIG.bookings.max) {
    s.bookingAt = now;
    return;
  }
  const n = Math.floor((now - s.bookingAt) / GIG.bookings.every);
  if (n > 0) {
    s.bookings = Math.min(GIG.bookings.max, s.bookings + n);
    s.bookingAt = s.bookings >= GIG.bookings.max ? now : s.bookingAt + n * GIG.bookings.every;
  }
}

export const nextBookingIn = (s: State, now: number) => (s.bookings >= GIG.bookings.max ? 0 : Math.max(0, s.bookingAt + GIG.bookings.every - now));

// ── O show valendo ──────────────────────────────────────────────────────────

export interface GigReward {
  fans: number;
  res: number;
  crate: CrateTier | null;
  records: number;
  levelUp: boolean;
}

export interface GigRun {
  venue: VenueId;
  level: number;
  request: string;
  requestOk: boolean;
  bars: GigBar[];
  total: number;
  rivals: { name: string; score: number; bars: number[] }[];
  /** 1–4. */
  place: number;
  reward: GigReward;
}

/** Caixote pela colocação e nível (Festival sobe um degrau). */
function crateFor(v: VenueId, level: number, place: number, rng: Rng): CrateTier | null {
  let tier: number;
  if (place === 1) tier = level <= 4 ? 1 : level <= 8 ? 2 : 3;
  else if (place === 2) tier = level < 5 ? 0 : 1;
  else if (place === 3) tier = rng() < 0.5 ? 0 : -1;
  else tier = -1;
  if (tier >= 0 && v === 'festival') tier = Math.min(3, tier + 1);
  return tier < 0 ? null : CRATE_ORDER[tier];
}

/** Toca o show (gasta 1 booking), ranqueia e entrega o prêmio. A tela só revela o que já aconteceu. */
export function playGig(s: State, v: VenueId, level: number, rng: Rng, now: number): GigRun | null {
  refreshBookings(s, now);
  if (s.bookings <= 0 || level > s.gigs[v].open) return null;
  if (s.bookings >= GIG.bookings.max) s.bookingAt = now;
  s.bookings--;
  const req = requestOf(v, level);
  const bars = simulateShow(s, v, level, rng, now);
  const total = bars.reduce((a, b) => a + b.score, 0);
  const target = gigTarget(v, level);
  const rivals = rivalsOf(v, level).map((r) => {
    const score = rivalScore(target, r.mult, rng);
    // Divide a nota do rival em 8 compassos parecidos, pra o placar subir junto com o seu.
    const w = Array.from({ length: GIG.bars }, () => 0.6 + rng() * 0.8);
    const ws = w.reduce((a, x) => a + x, 0);
    return { name: r.name, score, bars: w.map((x) => (score * x) / ws) };
  });
  const place = 1 + rivals.filter((r) => r.score > total).length;
  const def = VENUE[v];
  const reward: GigReward = { fans: 0, res: 0, crate: null, records: 0, levelUp: false };
  reward.fans = Math.round(GIG.fans.base[place - 1] * Math.pow(level, GIG.fans.exp) * Math.sqrt(def.hard) * (v === 'festival' ? 2 : 1));
  if (def.res) reward.res = Math.max(place <= 3 ? 1 : 0, Math.round(GIG.res.base * Math.pow(GIG.res.growth, level - 1) * GIG.res.place[place - 1]));
  reward.crate = crateFor(v, level, place, rng);
  const g = s.gigs[v];
  if (place === 1 && g.best[level - 1] !== 1) reward.records = GIG.firstRecords * level;
  if (place === 1 && level === g.open && level < GIG.levels) {
    g.open++;
    reward.levelUp = true;
  }
  g.best[level - 1] = g.best[level - 1] === 0 ? place : Math.min(g.best[level - 1], place);
  s.fans += reward.fans;
  if (def.res) s.res[def.res] += reward.res;
  if (reward.crate) s.crates[reward.crate]++;
  s.records += reward.records;
  s.stats.gigs++;
  if (place === 1) s.stats.wins++;
  return { venue: v, level, request: req, requestOk: requestMet(s, req, now), bars, total, rivals, place, reward };
}
