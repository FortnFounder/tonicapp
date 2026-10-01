// Sons de interface, todos no tom do jogo: comprar = arpejo da tônica, falhar = segunda menor,
// sucesso da melhoria = cadência perfeita (V→I), falha = deceptiva (V→vi). A sorte soa como teoria.
import { mod12, nearestVoicing } from '../theory';
import { ctx, haptic } from './engine';
import * as I from './instruments';

let key = 0;
/** O tom atual (os sons de interface acompanham). */
export const setSfxKey = (pc: number) => (key = pc);

const t0 = () => (ctx ? ctx.currentTime + 0.01 : 0);
const triad = (root: number, minor = false) => [root, root + (minor ? 3 : 4), root + 7];

export const sfx = {
  /** Compra: arpejo do I. */
  buy() {
    if (!ctx) return;
    const t = t0();
    [0, 4, 7, 12].forEach((iv, i) => I.ep(72 + key + iv, t + i * 0.05, 0.4, 0.5, 'ui'));
    haptic(20);
  },
  /** Falta dinheiro/nota: cluster de segunda menor, curto. */
  deny() {
    if (!ctx) return;
    const t = t0();
    I.ep(60 + key, t, 0.15, 0.35, 'ui');
    I.ep(61 + key, t, 0.15, 0.35, 'ui');
    haptic(50);
  },
  /** Aprender acorde: o próprio acorde, arpejado. */
  learn(pcs: number[]) {
    if (!ctx) return;
    const t = t0();
    nearestVoicing(null, pcs, 60, 79).forEach((m, i) => I.ep(m, t + i * 0.07, 0.8, 0.5, 'ui'));
    I.bell(84 + mod12(pcs[0]), t + 0.25, 0.4, 'ui');
    haptic(25);
  },
  /** Descoberta: escala do modo subindo na flauta. */
  discover(scale: number[]) {
    if (!ctx) return;
    const t = t0();
    const base = 72 + mod12(scale[0]);
    [...scale.map((p) => base + mod12(p - scale[0])), base + 12].forEach((m, i) => I.flute(m, t + i * 0.07, 0.14, 0.7, 0, 'ui'));
    haptic([20, 30, 40]);
  },
  /** Cadência perfeita: V → I. */
  success(level = 1) {
    if (!ctx) return;
    const t = t0();
    const V = triad(67 + key);
    const I1 = triad(60 + key);
    V.forEach((m) => I.ep(m, t, 0.22, 0.45, 'ui'));
    I1.forEach((m) => I.ep(m + 12 * (level > 1 ? 1 : 0), t + 0.2, 0.7, 0.55, 'ui'));
    I.bell(84 + key, t + 0.2, 0.5, 'ui');
    haptic(level > 1 ? [30, 40, 60] : 30);
  },
  /** Cadência deceptiva: V → vi (quase). */
  fail() {
    if (!ctx) return;
    const t = t0();
    triad(67 + key).forEach((m) => I.ep(m, t, 0.22, 0.45, 'ui'));
    triad(69 + key, true).forEach((m) => I.ep(m - 12, t + 0.2, 0.6, 0.45, 'ui'));
    haptic(60);
  },
  /** Batida de suspense (caixote tremendo, ponteiro andando). */
  tick(pitch = 0) {
    if (!ctx) return;
    I.bell(96 + pitch, t0(), 0.18, 'ui');
  },
  /** Carta virando: o acorde cresce com a raridade. */
  reveal(r: number) {
    if (!ctx) return;
    const t = t0();
    const ch = r === 0 ? [60, 64, 67] : r === 1 ? [60, 64, 67, 71] : r === 2 ? [60, 64, 67, 71, 74] : [60, 64, 67, 71, 74, 78];
    ch.forEach((m, i) => I.ep(m + key, t + i * 0.03, 0.9, 0.45, 'ui'));
    if (r >= 2) for (let i = 0; i < 6; i++) I.bell(84 + key + [0, 4, 7, 11, 14, 19][i], t + 0.1 + i * 0.06, 0.35, 'ui');
    if (r >= 3) I.choir(ch.map((m) => m + key), t, 1.6, 0.7);
    haptic(r >= 3 ? [40, 50, 80] : r >= 2 ? [30, 40] : 15);
  },
  /** Aplauso do público. */
  applause(v = 1) {
    if (!ctx) return;
    I.applause(t0(), 2.6, v);
    I.cheer(t0(), v);
  },
  /** Prévia de um acorde (escolher no seletor). */
  chord(pcs: number[]) {
    if (!ctx) return;
    const t = t0();
    nearestVoicing(null, pcs, 55, 76).forEach((m, i) => I.ep(m, t + i * 0.012, 0.7, 0.45, 'ui'));
  },
  /** Moeda (dinheiro voando). */
  coin() {
    if (!ctx) return;
    I.bell(91 + key, t0(), 0.25, 'ui');
  },
};
