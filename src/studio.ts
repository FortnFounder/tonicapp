// Studio: gravar o loop como música (Song), masterizar com chance, royalties por hora e a posição nas Charts.
import { PRESSINGS, STUDIO, roundPrice } from './content';
import { barSeconds, expectedTipsPerBar, feel, loopInfo, type Song, type State } from './game';
import { peakTension } from './harmony';
import { pickOne, type Rng } from './rng';

export function recordCost(s: State, now: number) {
  return { tape: STUDIO.tape, tips: roundPrice(expectedTipsPerBar(s, now) * STUDIO.tipsBars) };
}

/** Qualidade 0–100 do loop como música: harmonia, pico de tensão, progressões e modo. */
export function songQuality(s: State): number {
  const info = loopInfo(s);
  const peak = peakTension(s.loop, s.mode);
  const prog = Math.min(15, info.progs.reduce((a, p) => a + 5 * (p.rarity + 1), 0));
  return Math.round(Math.min(100, info.score * 0.7 + Math.min(15, peak) + prog + (info.modeSig ? 10 : 0)));
}

/** Chance de cada prensagem: o Feel puxa pra cima (a Demo fica com o resto). */
export function pressingOdds(s: State, now: number): number[] {
  const k = 1 + feel(s, now);
  const up = PRESSINGS.slice(1).map((p) => p.chance * k);
  const total = up.reduce((a, x) => a + x, 0);
  const scale = total > 0.9 ? 0.9 / total : 1;
  const ups = up.map((x) => x * scale);
  return [1 - ups.reduce((a, x) => a + x, 0), ...ups];
}

const WORDS_A = ['Midnight', 'Paper', 'Golden', 'Electric', 'Slow', 'Silver', 'Neon', 'Summer', 'Hollow', 'Velvet', 'Quiet', 'Wild', 'Northern', 'Last', 'Lucky', 'Blue'];
const WORDS_B = ['Lights', 'Hearts', 'Roads', 'Rain', 'Echoes', 'Signals', 'Waves', 'Dreams', 'Tides', 'Static', 'Sparks', 'Rooms', 'Skies', 'Bridges', 'Letters', 'Stars'];

export interface RecordResult {
  song: Song;
  odds: number[];
  roll: number;
}

export function recordSong(s: State, rng: Rng, now: number): RecordResult | null {
  const c = recordCost(s, now);
  if (s.res.tape < c.tape || s.tips < c.tips) return null;
  s.res.tape -= c.tape;
  s.tips -= c.tips;
  const odds = pressingOdds(s, now);
  const roll = rng();
  let acc = 0;
  let pressing = 0;
  for (let i = 0; i < odds.length; i++) {
    acc += odds[i];
    if (roll < acc) {
      pressing = i;
      break;
    }
  }
  const quality = songQuality(s);
  const perHour = expectedTipsPerBar(s, now) * (3600 / barSeconds(s)) * STUDIO.royalty * PRESSINGS[pressing].mult * (quality / 100);
  const song: Song = {
    id: s.nextSong++,
    name: `${pickOne(WORDS_A, rng)} ${pickOne(WORDS_B, rng)}`,
    loop: [...s.loop],
    key: s.key,
    mode: s.mode,
    quality,
    pressing,
    perHour,
    at: now,
  };
  s.songs.push(song);
  if (s.setlist.length < STUDIO.setlist) s.setlist.push(song.id);
  return { song, odds, roll };
}

export function toggleSetlist(s: State, id: number): boolean {
  if (s.setlist.includes(id)) {
    s.setlist = s.setlist.filter((x) => x !== id);
    return true;
  }
  if (s.setlist.length >= STUDIO.setlist || !s.songs.some((x) => x.id === id)) return false;
  s.setlist.push(id);
  return true;
}

export function deleteSong(s: State, id: number) {
  s.songs = s.songs.filter((x) => x.id !== id);
  s.setlist = s.setlist.filter((x) => x !== id);
}

const setSongs = (s: State) => s.setlist.map((id) => s.songs.find((x) => x.id === id)).filter(Boolean) as Song[];

export const royaltiesPerHour = (s: State) => setSongs(s).reduce((a, x) => a + x.perHour, 0);

/** Royalties com o app aberto (o offline entra pelo away). */
export function tickRoyalties(s: State, now: number): number {
  const dt = Math.max(0, now - s.royaltyAt) / 3_600_000;
  s.royaltyAt = now;
  const v = royaltiesPerHour(s) * dt;
  s.tips += v;
  s.stats.tipsTotal += v;
  return v;
}

export const chartStrength = (s: State) => setSongs(s).reduce((a, x) => a + x.quality * PRESSINGS[x.pressing].mult, 0);

/** Posição nas Charts (1 = topo) pela força da Setlist. */
export function chartPos(s: State): number | null {
  const st = chartStrength(s);
  if (st <= 0) return null;
  return Math.max(1, Math.round(Math.pow(STUDIO.chartTop / st, STUDIO.chartExp)));
}

/** Marcos das Charts ainda não pagos e já alcançados. */
export function claimCharts(s: State): number {
  const pos = chartPos(s);
  if (pos === null) return 0;
  let got = 0;
  for (const m of STUDIO.chartMilestones) {
    if (pos <= m.pos && !s.chartClaimed.includes(m.pos)) {
      s.chartClaimed.push(m.pos);
      s.records += m.records;
      got += m.records;
    }
  }
  return got;
}
