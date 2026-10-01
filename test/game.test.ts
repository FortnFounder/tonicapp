import { describe, expect, it } from 'vitest';
import { CHORD, GRADES, PITY } from '../src/content';
import {
  away,
  buyInst,
  buyKey,
  buyMode,
  buyTempo,
  expectedTipsPerBar,
  gradeOdds,
  learnChord,
  learnCost,
  loopInfo,
  playBar,
  power,
  rarityUp,
  setSlot,
  startState,
  tempoCap,
  tune,
  tuneCost,
} from '../src/game';
import { analyze, steadyCycle, stepTension } from '../src/harmony';
import { seeded } from '../src/rng';
import { hydrate } from '../src/save';

const NOW = 1_700_000_000_000;

describe('harmonia do loop', () => {
  it('I–IV–V–I acha o Three-Chord Trick e a cadência perfeita', () => {
    const a = analyze(['I', 'IV', 'V', 'I']);
    expect(a.progs.map((p) => p.id)).toContain('three');
    expect(a.cadences.map((c) => c.id)).toContain('perfect');
    expect(a.score).toBeGreaterThan(60);
  });
  it('Axis em qualquer rotação e o Two-Five-One dentro do Circle', () => {
    expect(analyze(['vi', 'IV', 'I', 'V']).progs.map((p) => p.id)).toContain('axis');
    const circle = analyze(['vi', 'ii', 'V', 'I']).progs.map((p) => p.id);
    expect(circle).toEqual(expect.arrayContaining(['circle', '251']));
  });
  it('família conta (V7 vale como V), exato não', () => {
    expect(analyze(['ii7', 'V7', 'Imaj7', 'vi']).progs.map((p) => p.id)).toEqual(expect.arrayContaining(['251', 'jazz251']));
    expect(analyze(['ii', 'V', 'I', 'vi']).progs.map((p) => p.id)).not.toContain('jazz251');
  });
  it('loop parado em um acorde é ruim', () => {
    expect(analyze(['I', 'I', 'I', 'I']).score).toBeLessThan(30);
  });
  it('assinatura do modo: Mixolydian com ♭VII', () => {
    expect(analyze(['I', '♭VII', 'IV', 'I'], 'mixolydian').modeSig).toBe(true);
    expect(analyze(['I', '♭VII', 'IV', 'I'], 'ionian').modeSig).toBe(false);
    expect(analyze(['I', 'V', 'IV', 'I'], 'mixolydian').modeSig).toBe(false);
  });
});

describe('tensão e soltura', () => {
  it('acumula fora da tônica e solta na tônica', () => {
    const cyc = steadyCycle(['I', 'IV', 'V', 'I'], 'ionian', 0);
    expect(cyc[0].released).toBe(0);
    expect(cyc[2].after).toBeGreaterThan(cyc[1].after);
    expect(cyc[3].released).toBeCloseTo(cyc[2].after);
    expect(cyc[3].release).toBeGreaterThan(1.3);
  });
  it('V7 acumula mais que V', () => {
    const a = steadyCycle(['I', 'IV', 'V', 'I'], 'ionian', 0)[3].release;
    const b = steadyCycle(['I', 'IV', 'V7', 'I'], 'ionian', 0)[3].release;
    expect(b).toBeGreaterThan(a);
  });
  it('cadência deceptiva solta metade', () => {
    const b = stepTension(10, 'V', 'vi', 'ionian', 0, false);
    expect(b.deceptive).toBe(true);
    expect(b.released).toBe(5);
  });
  it('Depth multiplica a soltura', () => {
    expect(stepTension(10, 'V', 'I', 'ionian', 1, false).release).toBeGreaterThan(stepTension(10, 'V', 'I', 'ionian', 0, false).release);
  });
});

describe('grade e garantia', () => {
  it('chance base sem nada', () => {
    const s = startState(NOW);
    const o = gradeOdds(s, { released: 0, deceptive: false }, NOW);
    expect(o.sweet).toBeCloseTo(GRADES[1].chance);
    expect(o.forced).toBeNull();
  });
  it('soltura e surpresa sobem a chance', () => {
    const s = startState(NOW);
    const base = gradeOdds(s, { released: 0, deceptive: false }, NOW).soaring;
    expect(gradeOdds(s, { released: 10, deceptive: false }, NOW).soaring).toBeCloseTo(base * 2);
    expect(gradeOdds(s, { released: 0, deceptive: true }, NOW).soaring).toBeCloseTo(base * 2);
  });
  it('garantia: rampa e certeza', () => {
    const s = startState(NOW);
    const mid = gradeOdds(s, { released: 0, deceptive: false }, NOW, { soaring: PITY.soaring.soft + 5, transcendent: 0 });
    expect(mid.soaring).toBeGreaterThan(0.2);
    const hard = gradeOdds(s, { released: 0, deceptive: false }, NOW, { soaring: PITY.soaring.hard - 1, transcendent: 0 });
    expect(hard.forced).toBe('soaring');
  });
  it('em 2.000 compassos sai Soaring e a garantia nunca deixa passar de 60', () => {
    const s = startState(NOW);
    const rng = seeded(7);
    let gap = 0;
    let maxGap = 0;
    for (let i = 0; i < 2000; i++) {
      const r = playBar(s, rng, NOW);
      gap = r.grade === 'soaring' || r.grade === 'transcendent' ? 0 : gap + 1;
      maxGap = Math.max(maxGap, gap);
    }
    expect(s.stats.soaring).toBeGreaterThan(20);
    expect(maxGap).toBeLessThan(PITY.soaring.hard);
  });
});

describe('compasso e economia', () => {
  it('o primeiro compasso paga e solta as notas do acorde (fundamental em dobro)', () => {
    const s = startState(NOW);
    const r = playBar(s, () => 0.99, NOW);
    expect(r.grade).toBe('solid');
    expect(s.tips).toBeGreaterThan(0);
    expect(s.notes[0]).toBe(2);
    expect(s.notes[4]).toBe(1);
    expect(s.notes[7]).toBe(1);
  });
  it('fim da volta descobre a progressão', () => {
    const s = startState(NOW);
    for (let i = 0; i < 4; i++) playBar(s, () => 0.99, NOW);
    expect(s.found).toContain('three');
    expect(s.fans).toBeGreaterThan(4);
  });
  it('aprender acorde custa as notas dele no tom atual', () => {
    const s = startState(NOW);
    expect(learnCost(s, 'vi').map(([pc]) => pc)).toEqual([9, 0, 4]);
    expect(learnChord(s, 'vi')).toBe(false);
    s.notes[9] = s.notes[0] = s.notes[4] = 100;
    expect(learnChord(s, 'vi')).toBe(true);
    expect(s.notes[9]).toBe(100 - CHORD.vi.learn);
    expect(setSlot(s, 2, 'vi')).toBe(true);
  });
  it('banda: comprar, afinar, subir raridade (o nível 1 novo passa o 10 antigo)', () => {
    const s = startState(NOW);
    s.tips = 1e9;
    expect(buyInst(s, 'drums')).toBe(true);
    const p1 = power(s, 'guitar');
    expect(tuneCost(s, 'guitar')).toBe(10);
    for (let i = 0; i < 9; i++) expect(tune(s, 'guitar')).toBe(true);
    expect(tune(s, 'guitar')).toBe(false);
    const p10 = power(s, 'guitar');
    expect(p10).toBeCloseTo(p1 * 2.8);
    [4, 9, 2, 7, 11].forEach((pc) => (s.notes[pc] = 1000));
    expect(rarityUp(s, 'guitar')).toBe(true);
    expect(power(s, 'guitar')).toBeGreaterThan(p10);
  });
  it('BPM tem teto pela bateria', () => {
    const s = startState(NOW);
    s.tips = 1e9;
    expect(tempoCap(s)).toBe(1);
    expect(buyTempo(s)).toBe(true);
    expect(buyTempo(s)).toBe(false);
    buyInst(s, 'drums');
    expect(buyTempo(s)).toBe(true);
  });
  it('tom novo e modo', () => {
    const s = startState(NOW);
    s.tips = 1e9;
    s.fans = 1e4;
    expect(buyKey(s, 7)).toBe(true);
    expect(s.key).toBe(7);
    s.key = 0;
    expect(buyMode(s, 'mixolydian')).toBe(false);
    s.notes[10] = 500;
    expect(buyMode(s, 'mixolydian')).toBe(true);
    expect(s.notes[10]).toBe(400);
  });
  it('offline paga pela média com teto', () => {
    const s = startState(NOW);
    const per = expectedTipsPerBar(s, NOW);
    const r = away(s, NOW + 10 * 3600 * 1000)!;
    expect(r.bars).toBe(Math.floor((4 * 3600) / (240 / 92)));
    expect(r.tips).toBeCloseTo(per * r.bars * 0.5);
  });
  it('save velho ganha campo novo', () => {
    const s = startState(NOW) as unknown as Record<string, unknown>;
    delete s.crates;
    const h = hydrate(JSON.parse(JSON.stringify(s)), NOW)!;
    expect(h.crates.wooden).toBe(0);
    expect(loopInfo(h).score).toBeGreaterThan(0);
  });
});
