// Sorteio: o jogo recebe a função de sorte por parâmetro (Math.random ao vivo, semente nos testes e no simulador).
export type Rng = () => number;

/** mulberry32: rápido e bom o bastante pra jogo. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash de texto pra semente estável (nome do rival, pedido do júri). */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Sorteia um índice por peso. */
export function pickWeighted(weights: number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let u = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    u -= weights[i];
    if (u < 0) return i;
  }
  return weights.length - 1;
}

export const pickOne = <T>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

/** Normal padrão (Box-Muller). */
export function gauss(rng: Rng): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
