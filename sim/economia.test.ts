// Relatório: `npm run sim -- economia`. Mediana das sementes, um perfil por coluna.
import { it } from 'vitest';
import { PROFILES, run } from './economia';

const DAYS = Number(process.env.SIM_DAYS ?? 30);
const SEEDS = Number(process.env.SIM_SEEDS ?? 4);

function fmt(min: number | undefined): string {
  if (min === undefined) return '—';
  const d = Math.floor(min / 1440);
  const m = min % 1440;
  if (d === 0) return m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)}h`;
  return `dia ${d + 1}`;
}

const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

it('economia', () => {
  const res = PROFILES.map((p) => ({ p, runs: Array.from({ length: SEEDS }, (_, i) => run(p, DAYS, 100 + i)) }));
  const keys = [...new Set(res.flatMap((r) => r.runs.flatMap((x) => Object.keys(x.marks))))];
  const medOf = (r: (typeof res)[number], k: string) => {
    const got = r.runs.map((x) => x.marks[k]).filter((x) => x !== undefined);
    return got.length * 2 > r.runs.length ? med(got) : undefined;
  };
  keys.sort((a, b) => (medOf(res[1], a) ?? 1e12) - (medOf(res[1], b) ?? 1e12));
  const col = (t: string) => t.padEnd(11);
  const lines = [
    ''.padEnd(22) + res.map((r) => col(r.p.name)).join(''),
    ...keys.map((k) => k.padEnd(22) + res.map((r) => col(fmt(medOf(r, k)))).join('')),
    '',
    ...[0, 1, 2, 6, 13, 29]
      .filter((d) => d < DAYS)
      .map((d) => `$/s dia ${d + 1}`.padEnd(22) + res.map((r) => col(med(r.runs.map((x) => x.tps[d])).toPrecision(3))).join('')),
    'fãs no fim'.padEnd(22) + res.map((r) => col(String(Math.round(med(r.runs.map((x) => x.s.fans)))))).join(''),
    'progressões'.padEnd(22) + res.map((r) => col(String(med(r.runs.map((x) => x.s.found.length))))).join(''),
    'acordes'.padEnd(22) + res.map((r) => col(String(med(r.runs.map((x) => x.s.learned.length))))).join(''),
  ];
  process.stdout.write('\n' + lines.join('\n') + '\n');
});
