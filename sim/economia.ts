// Robô que joga o Tonic com as regras de verdade (src/game.ts e companhia) e mede quando cada marco acontece.
// Perfis de jogador do Distillery: a maioria joga 1 h/dia em 3 sessões.
import { CHORDS, CRATE_ORDER, INSTRUMENTS, KEYS, MAX_LEVEL, MODE_LIST, STUDIO, TEMPO_COST, TIERS, VENUES, type InstId } from '../src/content';
import * as G from '../src/game';
import { autoEquip, enhance, enhanceCost, openCrate } from '../src/gear';
import { gigOdds, playGig, refreshBookings } from '../src/gig';
import { seeded, type Rng } from '../src/rng';
import { claimCharts, recordCost, recordSong } from '../src/studio';
import { venueOpen } from '../src/unlock';
import { scaleAbs } from '../src/theory';

export interface Profile {
  name: string;
  share: number;
  /** Minutos de jogo ativo por dia, em sessões iguais. */
  minutes: number;
  sessions: number;
}

export const PROFILES: Profile[] = [
  { name: '20m/dia', share: 0.1, minutes: 20, sessions: 2 },
  { name: '1h/dia', share: 0.6, minutes: 60, sessions: 3 },
  { name: '2h/dia', share: 0.25, minutes: 120, sessions: 4 },
  { name: '4h/dia', share: 0.05, minutes: 240, sessions: 6 },
];

export interface Run {
  s: G.State;
  /** Marco → minuto de relógio (desde o início) em que aconteceu. */
  marks: Record<string, number>;
  /** Gorjeta por segundo no fim de cada dia. */
  tps: number[];
}

const DAY = 24 * 60;

/** Melhor loop por subida de coordenada: troca uma casa por vez pelo acorde que mais paga. */
function optimizeLoop(s: G.State, now: number) {
  let best = G.expectedTipsPerBar(s, now);
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (let k = 0; k < s.loop.length; k++) {
      let bestId = s.loop[k];
      for (const id of s.learned) {
        s.loop[k] = id;
        const v = G.expectedTipsPerBar(s, now);
        if (v > best + 1e-9) {
          best = v;
          bestId = id;
          improved = true;
        }
      }
      s.loop[k] = bestId;
    }
    if (!improved) break;
  }
}

/** Notas que o robô quer (próximo acorde, raridade, modo) e ainda não tem. */
function wantedPcs(s: G.State): number[] {
  const want = new Set<number>();
  const next = CHORDS.find((c) => !s.learned.includes(c.id) && G.tierOpen(s, c.tier));
  if (next) for (const [pc, n] of G.learnCost(s, next.id)) if (s.notes[pc] < n) want.add(pc);
  for (const i of INSTRUMENTS) {
    const it = s.inst[i.id];
    if (it.own && it.q >= MAX_LEVEL && it.r < 3) {
      const c = G.rarityCost(s, i.id);
      if (c.notes) for (const [pc, n] of c.notes) if (s.notes[pc] < n) want.add(pc);
    }
  }
  return [...want];
}

/** Vai pro tom (dos que tem) que mais cobre as notas que faltam; empate fica no de maior gorjeta. */
function chooseKey(s: G.State, now: number) {
  const want = wantedPcs(s);
  if (!want.length) return;
  let bestKey = s.key;
  let bestCover = want.filter((pc) => scaleAbs(G.tonicOf(s), 'ionian').includes(pc)).length;
  for (const pc of s.keys) {
    const k = KEYS.find((x) => x.pc === pc)!;
    const cover = want.filter((p) => scaleAbs({ pc: k.pc, letter: k.letter }, 'ionian').includes(p)).length;
    if (cover > bestCover) {
      bestCover = cover;
      bestKey = pc;
    }
  }
  if (bestKey !== s.key) {
    G.setKey(s, bestKey);
    optimizeLoop(s, now);
  }
}

function spend(s: G.State, rng: Rng, now: number, mark: (k: string) => void) {
  let learnedNew = false;
  // Acordes (o mais barato primeiro).
  for (const c of [...CHORDS].sort((a, b) => a.learn - b.learn)) {
    if (!s.learned.includes(c.id) && G.learnChord(s, c.id)) {
      learnedNew = true;
      mark('acorde ' + c.id);
    }
  }
  for (const t of TIERS) if (G.tierOpen(s, t.id)) mark('camada ' + t.id);
  // Banda: comprar, raridade, afinar (o mais barato primeiro).
  for (const i of INSTRUMENTS) if (!s.inst[i.id].own && s.tips >= i.buy && G.buyInst(s, i.id)) mark('compra ' + i.id);
  for (const i of INSTRUMENTS) {
    if (G.rarityUp(s, i.id)) {
      const r = s.inst[i.id].r;
      mark(['', 'Rare', 'Epic', 'Legendary'][r] + ' ' + i.id);
      mark('1º ' + ['', 'Rare', 'Epic', 'Legendary'][r]);
    }
  }
  for (let guard = 0; guard < 200; guard++) {
    const opts = INSTRUMENTS.filter((i) => s.inst[i.id].own && s.inst[i.id].q < MAX_LEVEL).map((i) => ({ id: i.id, c: G.tuneCost(s, i.id) }));
    const tempo = s.tempoMax < G.tempoCap(s) ? TEMPO_COST[s.tempoMax] : Infinity;
    const cheapest = opts.sort((a, b) => a.c - b.c)[0];
    if (tempo < (cheapest?.c ?? Infinity) * 3 && s.tips >= tempo) {
      G.buyTempo(s);
      mark('BPM ' + G.bpm(s));
      continue;
    }
    if (!cheapest || s.tips < cheapest.c) break;
    G.tune(s, cheapest.id as InstId);
  }
  // Mastery.
  for (const i of INSTRUMENTS) if (G.trainMastery(s, i.id, rng) === 'ok') mark('★ ' + i.id);
  // Tons: compra quando sobra (o dinheiro de 20 min de banda).
  for (const k of KEYS) {
    if (!s.keys.includes(k.pc) && s.fans >= k.fans && s.tips >= k.cost) {
      const cur = s.key;
      if (G.buyKey(s, k.pc)) {
        s.key = cur;
        mark('tons ' + s.keys.length);
      }
    }
  }
  // Modos: compra o primeiro que puder (marco), sem trocar.
  for (const m of MODE_LIST) {
    if (!s.modes.includes(m.id) && s.fans >= m.fans && s.tips >= m.tips) {
      const cur = s.mode;
      if (G.buyMode(s, m.id)) {
        s.mode = cur;
        mark('modo ' + m.id);
      }
    }
  }
  if (!s.loop8 && G.canLoop8(s) && s.tips >= 150000 && G.buyLoop8(s)) {
    mark('loop de 8');
    learnedNew = true;
  }
  // Caixotes, equipamento, melhoria.
  for (const t of CRATE_ORDER) while (s.crates[t] > 0) openCrate(s, t, rng) && mark('1º caixote');
  autoEquip(s);
  for (let guard = 0; guard < 50; guard++) {
    const eq = s.items.filter((x) => x.on).sort((a, b) => a.plus - b.plus)[0];
    if (!eq || eq.plus >= 15) break;
    const c = enhanceCost(eq);
    if (s.res.picks < c.picks || s.tips < c.tips * 4) break;
    const r = enhance(s, eq.uid, rng);
    if (r?.ok && r.plus >= 6) mark('gear +' + (r.plus >= 12 ? 12 : r.plus >= 9 ? 9 : 6));
  }
  // Studio.
  if (s.fans >= 600) {
    const c = recordCost(s, now);
    if (s.res.tape >= c.tape && s.tips >= c.tips * 2 && (s.setlist.length < STUDIO.setlist || s.res.tape >= 9)) {
      const r = recordSong(s, rng, now);
      if (r) {
        mark('1ª música');
        // Setlist: fica com as 5 melhores.
        s.setlist = [...s.songs].sort((a, b) => b.perHour - a.perHour).slice(0, STUDIO.setlist).map((x) => x.id);
      }
    }
    if (claimCharts(s) > 0) mark('Charts top 100');
  }
  if (learnedNew) optimizeLoop(s, now);
  chooseKey(s, now);
}

function gigs(s: G.State, rng: Rng, now: number, mark: (k: string) => void) {
  refreshBookings(s, now);
  while (s.bookings > 0) {
    // Sobe o local mais difícil onde ainda dá pra ganhar o próximo nível; senão farma o nível mais alto seguro.
    let pick: { v: (typeof VENUES)[number]['id']; l: number } | null = null;
    for (const v of [...VENUES].reverse()) {
      if (!venueOpen(s, v.id)) continue;
      const top = s.gigs[v.id].open;
      if (gigOdds(s, v.id, top, now, 60, rng).place[0] >= 0.5) {
        pick = { v: v.id, l: top };
        break;
      }
    }
    if (!pick)
      for (const v of [...VENUES].reverse()) {
        if (!venueOpen(s, v.id)) continue;
        for (let l = s.gigs[v.id].open - 1; l >= 1 && !pick; l--) if (gigOdds(s, v.id, l, now, 60, rng).place[0] >= 0.5) pick = { v: v.id, l };
        if (pick) break;
      }
    if (!pick) pick = { v: 'coffee', l: 1 };
    if (!venueOpen(s, pick.v)) return;
    const run = playGig(s, pick.v, pick.l, rng, now);
    if (!run) return;
    mark('1º gig');
    if (run.place === 1) mark(`${pick.v} nv ${pick.l}`);
  }
}

/** Joga `days` dias com um perfil. Tempo em minutos de relógio. */
export function run(p: Profile, days: number, seed: number): Run {
  const rng = seeded(seed);
  const t0 = 1_700_000_000_000;
  const sessionMin = p.minutes / p.sessions;
  const starts = Array.from({ length: p.sessions }, (_, i) => 8 * 60 + (i * 14 * 60) / Math.max(1, p.sessions - 1));
  // O jogador instala e já joga: o estado nasce na primeira sessão (sem noite de offline antes).
  const s = G.startState(t0 + starts[0] * 60_000);
  const marks: Record<string, number> = {};
  const tps: number[] = [];
  let clock = 0;
  const mark = (k: string) => {
    if (!(k in marks)) marks[k] = clock;
  };
  for (let d = 0; d < days; d++) {
    for (const st of starts) {
      clock = d * DAY + st;
      let now = t0 + clock * 60_000;
      G.away(s, now, 0);
      // Jam no começo da sessão (Hype médio de 60%) e Encore se tiver disco.
      if (s.inst.flute.own) s.hype = { until: now + 180_000, value: 60 };
      if (s.records >= 10 + 25) G.useBoost(s, 'encore', now);
      spend(s, rng, now, mark);
      gigs(s, rng, now, mark);
      const bars = Math.floor((sessionMin * 60) / G.barSeconds(s));
      for (let b = 0; b < bars; b++) {
        now += G.barSeconds(s) * 1000;
        clock = (now - t0) / 60_000;
        G.playBar(s, rng, now);
        s.t = now;
        if (b % 20 === 0) {
          spend(s, rng, now, mark);
          gigs(s, rng, now, mark);
          for (const f of [25, 100, 250, 500, 1000, 2500, 5000, 10000]) if (s.fans >= f) mark(`${f} fãs`);
          if (s.stats.transcendent > 0) mark('1º Transcendent');
          if (s.found.length >= 10) mark('10 progressões');
        }
      }
      s.t = now;
    }
    tps.push(G.tipsPerSecond(s, t0 + clock * 60_000));
  }
  return { s, marks, tps };
}
