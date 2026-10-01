import { describe, expect, it } from 'vitest';
import { GEAR, GIG } from '../src/content';
import { buyInst, power, startState } from '../src/game';
import { autoEquip, enhance, enhanceChance, equip, newItem, openCrate, scrap } from '../src/gear';
import { gigOdds, gigTarget, playGig, refreshBookings, requestMet, requestOf, rivalsOf } from '../src/gig';
import { hypeOf, judge, newJam, settle, timingOf } from '../src/jam';
import { seeded } from '../src/rng';
import { chartPos, claimCharts, pressingOdds, recordSong, songQuality, toggleSetlist } from '../src/studio';
import { isOpen, nextNews } from '../src/unlock';

const NOW = 1_700_000_000_000;

describe('equipamento', () => {
  it('melhoria: falha soma Practice, sucesso zera; marco sorteia substat', () => {
    const s = startState(NOW);
    s.tips = 1e12;
    s.res.picks = 1e6;
    const it = newItem(s, 1, seeded(1));
    s.items.push(it);
    expect(it.subs.length).toBe(1);
    for (let i = 0; i < 3; i++) expect(enhance(s, it.uid, seeded(i))!.ok).toBe(true);
    expect(it.subs.length).toBe(2);
    const base = enhanceChance(s, it);
    const fail = enhance(s, it.uid, () => 0.999)!;
    expect(fail.ok).toBe(false);
    expect(enhanceChance(s, it)).toBeCloseTo(Math.min(GEAR.practiceCap, base * (1 + GEAR.practice)));
    expect(enhance(s, it.uid, () => 0)!.ok).toBe(true);
    expect(s.practice['item:' + it.uid]).toBe(0);
  });
  it('vestir dá Tone no instrumento; Best gear escolhe o melhor; desmanche devolve Picks', () => {
    const s = startState(NOW);
    const p0 = power(s, 'guitar');
    const it = newItem(s, 2, seeded(3), 0);
    s.items.push(it);
    expect(equip(s, it.uid, 'guitar')).toBe(true);
    expect(power(s, 'guitar')).toBeGreaterThan(p0);
    const better = newItem(s, 3, seeded(4), 0);
    s.items.push(better);
    expect(autoEquip(s)).toBe(1);
    expect(s.inst.guitar.gear[0]).toBe(better.uid);
    expect(scrap(s, it.uid)).toBeGreaterThan(0);
  });
  it('caixote entrega cartas e a primeira é peça', () => {
    const s = startState(NOW);
    s.crates.gold = 1;
    const loot = openCrate(s, 'gold', seeded(9))!;
    expect(loot.length).toBe(4);
    expect(loot[0].kind).toBe('gear');
    expect(s.crates.gold).toBe(0);
    expect(openCrate(s, 'gold', seeded(9))).toBeNull();
  });
});

describe('gigs', () => {
  it('régua fixa, rivais e pedido estáveis', () => {
    expect(gigTarget('coffee', 2)).toBeCloseTo(GIG.target * GIG.growth);
    expect(rivalsOf('coffee', 3)).toEqual(rivalsOf('coffee', 3));
    expect(requestOf('jazz', 4)).toBe(requestOf('jazz', 4));
  });
  it('Monte Carlo soma 100% e a banda forte ganha mais', () => {
    const s = startState(NOW);
    const weak = gigOdds(s, 'coffee', 1, NOW, 200);
    expect(weak.place.reduce((a, x) => a + x, 0)).toBeCloseTo(1);
    s.tips = 1e9;
    buyInst(s, 'drums');
    buyInst(s, 'bass');
    s.inst.guitar.q = 10;
    const strong = gigOdds(s, 'coffee', 1, NOW, 200);
    expect(strong.place[0]).toBeGreaterThan(weak.place[0]);
  });
  it('show gasta booking, paga e abre o próximo nível no 1º lugar', () => {
    const s = startState(NOW);
    s.inst.guitar.r = 3;
    s.inst.guitar.q = 10;
    const run = playGig(s, 'coffee', 1, seeded(5), NOW)!;
    expect(run.place).toBe(1);
    expect(s.bookings).toBe(GIG.bookings.max - 1);
    expect(s.gigs.coffee.open).toBe(2);
    expect(s.res.picks).toBeGreaterThan(0);
    expect(run.bars.length).toBe(GIG.bars);
  });
  it('bookings voltam com o tempo', () => {
    const s = startState(NOW);
    s.bookings = 0;
    s.bookingAt = NOW;
    refreshBookings(s, NOW + GIG.bookings.every * 2 + 1000);
    expect(s.bookings).toBe(2);
  });
  it('pedido do júri lê o loop', () => {
    const s = startState(NOW);
    expect(requestMet(s, 'prog', NOW)).toBe(true);
    expect(requestMet(s, 'vi', NOW)).toBe(false);
    expect(requestMet(s, 'slow', NOW)).toBe(true);
  });
});

describe('jam', () => {
  it('janela de tempo', () => {
    expect(timingOf(0.03)).toBe('perfect');
    expect(timingOf(-0.1)).toBe('great');
    expect(timingOf(0.18)).toBe('good');
    expect(timingOf(0.4)).toBe('miss');
  });
  it('nota de fora que resolve por grau vira apojatura', () => {
    const j = newJam();
    const C = [0, 4, 7];
    const a = judge(j, 0, 2, C);
    expect(a.harmonic).toBe('tension');
    judge(j, 0, 0, C);
    expect(j.hits[0].harmonic).toBe('resolve');
    judge(j, 0, 5, C);
    settle(j);
    expect(j.hits[2].harmonic).toBe('clash');
  });
  it('hype sobe com toque bom', () => {
    const j = newJam();
    for (let i = 0; i < 16; i++) judge(j, 0, 0, [0, 4, 7]);
    expect(hypeOf(j, 16)).toBe(100);
    expect(hypeOf(newJam(), 16)).toBe(0);
  });
});

describe('studio', () => {
  it('grava, entra na setlist e sobe nas Charts', () => {
    const s = startState(NOW);
    s.res.tape = 100;
    s.tips = 1e9;
    expect(songQuality(s)).toBeGreaterThan(50);
    expect(pressingOdds(s, NOW).reduce((a, x) => a + x, 0)).toBeCloseTo(1);
    const r = recordSong(s, seeded(2), NOW)!;
    expect(s.setlist).toEqual([r.song.id]);
    expect(chartPos(s)).toBeGreaterThan(1);
    expect(toggleSetlist(s, r.song.id)).toBe(true);
    expect(chartPos(s)).toBeNull();
    toggleSetlist(s, r.song.id);
    for (let i = 0; i < 4; i++) recordSong(s, seeded(10 + i), NOW);
    expect(claimCharts(s)).toBeGreaterThanOrEqual(0);
  });
});

describe('portas em camadas', () => {
  it('começa com quase tudo fechado e abre um de cada vez', () => {
    const s = startState(NOW);
    expect(isOpen(s, 'band')).toBe(false);
    expect(nextNews(s)).toBeNull();
    s.tips = 30;
    expect(nextNews(s)?.id).toBe('band');
    s.seen.push('band');
    expect(nextNews(s)).toBeNull();
  });
});
