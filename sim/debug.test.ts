import { it } from 'vitest';
import { PROFILES, run } from './economia';
import * as G from '../src/game';

it('quebra da renda', () => {
  if (!process.env.SIM_DEBUG) return;
  for (const d of [1, 2, 4, 8]) {
    const r = run(PROFILES[1], d, 100);
    const s = r.s;
    const now = s.t;
    const info = G.loopInfo(s);
    const inst = Object.entries(s.inst).filter(([, i]) => i.own).map(([k, i]) => `${k}:r${i.r}q${i.q}★${i.stars}=${G.power(s, k as never).toFixed(1)}`).join(' ');
    process.stdout.write(`\ndia ${d}: $/s ${G.tipsPerSecond(s, now).toFixed(0)} | tone ${G.tone(s).toFixed(1)} H ${info.score} hmult ${info.mult.toFixed(2)} tipsMult ${G.tipsMult(s, now).toFixed(2)} key ${G.keyMult(s).toFixed(2)} mastery ${G.masteryMult(s).toFixed(2)} bpm ${G.bpm(s)} feel ${G.feel(s, now).toFixed(2)} items ${s.items.length} loop ${s.loop.join(' ')} fans ${Math.round(s.fans)}\n  ${inst}\n  gigs ${JSON.stringify(Object.fromEntries(Object.entries(s.gigs).map(([k, g]) => [k, g.open])))} wins ${s.stats.wins}/${s.stats.gigs}\n`);
  }
});
