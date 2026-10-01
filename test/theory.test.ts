import { describe, expect, it } from 'vitest';
import {
  chordName,
  dissonance,
  flow,
  fnOf,
  nearestVoicing,
  roman,
  scaleAbs,
  spellIn,
  spelledNotes,
  tension,
  voiceLeadingCost,
  type ChordSpec,
  type Tonic,
} from '../src/theory';

const C: Tonic = { pc: 0, letter: 0 };
const D: Tonic = { pc: 2, letter: 1 };
const Bb: Tonic = { pc: 10, letter: 6 };
const ch = (degree: number, quality: ChordSpec['quality'] = 'maj', acc: -1 | 0 | 1 = 0, applied?: number): ChordSpec => ({ degree, quality, acc, applied });

const I = ch(1);
const ii = ch(2, 'min');
const iii = ch(3, 'min');
const IV = ch(4);
const V = ch(5);
const vi = ch(6, 'min');
const V7 = ch(5, '7');

describe('grafia', () => {
  it('escreve cada grau com a sua letra', () => {
    expect(scaleAbs(D, 'ionian').map((p) => spellIn(p, D))).toEqual(['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯']);
    expect(scaleAbs(Bb, 'ionian').map((p) => spellIn(p, Bb))).toEqual(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A']);
    expect(scaleAbs(C, 'dorian').map((p) => spellIn(p, C, 'dorian'))).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭']);
  });
  it('grafa acordes cromáticos pela letra do grau', () => {
    expect(spelledNotes(ch(2, '7', 0, 7), C)).toEqual(['D', 'F♯', 'A', 'C']);
    expect(spelledNotes(ch(7, 'maj', -1), C)).toEqual(['B♭', 'D', 'F']);
    expect(spelledNotes(ch(6, 'maj', -1), C)).toEqual(['A♭', 'C', 'E♭']);
    expect(spelledNotes(ch(7, 'dim7'), C)).toEqual(['B', 'D', 'F', 'A♭']);
    expect(chordName(vi, D)).toBe('Bm');
    expect(chordName(ch(7, 'maj', -1), Bb)).toBe('A♭');
  });
  it('escreve algarismo romano', () => {
    expect([I, ii, V7, ch(7, 'dim'), ch(7, 'maj', -1), ch(7, 'm7b5'), ch(1, 'maj7')].map(roman)).toEqual(['I', 'ii', 'V7', 'vii°', '♭VII', 'viiø7', 'Imaj7']);
  });
});

describe('função e tensão', () => {
  it('classifica a função', () => {
    expect([I, ii, iii, IV, V, vi, ch(7, 'dim')].map(fnOf)).toEqual(['T', 'S', 't', 'S', 'D', 't', 'D']);
    expect(fnOf(ch(2, '7', 0, 7))).toBe('D');
    expect(fnOf(ch(2, '7', -1))).toBe('D');
  });
  it('trítono e segunda menor são ásperos, tríade é lisa', () => {
    expect(dissonance([0, 4, 7])).toBeLessThan(0.5);
    expect(dissonance([7, 11, 2, 5])).toBeGreaterThan(3);
  });
  it('a tensão sobe de tônica pra dominante com sétima', () => {
    const t = [I, vi, IV, V, V7].map((c) => tension(c));
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(tension(I)).toBeLessThan(1);
    expect(tension(V7)).toBeGreaterThan(8);
  });
  it('o modo muda o que é cromático', () => {
    const bVII = ch(7, 'maj', -1);
    expect(tension(bVII, 'mixolydian')).toBeLessThan(tension(bVII, 'ionian'));
  });
});

describe('fluxo', () => {
  it('segue a ordem das estatísticas', () => {
    expect(flow(V, I)).toBeGreaterThan(flow(IV, I));
    expect(flow(ii, V)).toBeGreaterThan(flow(I, V));
    expect(flow(vi, IV)).toBeGreaterThan(flow(V, IV));
    expect(flow(V7, I)).toBe(10);
    expect(flow(I, I)).toBe(1);
  });
  it('dominante secundária gosta de resolver no alvo', () => {
    const V7ofV = ch(2, '7', 0, 7);
    expect(flow(V7ofV, V)).toBeGreaterThan(flow(V7ofV, I) + 2);
  });
  it('condução de vozes mede semitons', () => {
    expect(voiceLeadingCost([0, 4, 7], [0, 5, 9])).toBe(3);
    expect(voiceLeadingCost([0, 4, 7], [0, 4, 7])).toBe(0);
  });
  it('voicing anda pouco', () => {
    const c = nearestVoicing(null, [0, 4, 7]);
    const f = nearestVoicing(c, [5, 9, 0]);
    const moved = f.reduce((s, m, i) => s + Math.abs(m - c[i]), 0);
    expect(moved).toBeLessThanOrEqual(4);
  });
});
