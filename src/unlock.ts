// Portas em camadas (lição do Distillery: começar simples). Cada lugar abre quando o jogador tem o que ele pede.
import { CHORD, LOOP8, TIERS } from './content';
import { playing, type State } from './game';

export type Screen = 'stage' | 'theory' | 'band' | 'gigs' | 'studio';

export interface Place {
  id: string;
  name: string;
  /** Uma linha pro aviso de lugar novo. */
  line: string;
  screen: Screen;
  test: (s: State) => boolean;
  /** O que falta, curto (cadeado). */
  need: (s: State) => string;
}

const fans = (n: number) => (s: State) => s.fans >= n;
const needFans = (n: number) => (s: State) => `${Math.floor(s.fans)}/${n} fans`;
const tierFans = (id: string) => TIERS.find((t) => t.id === id)!.fans;

export const PLACES: Place[] = [
  { id: 'band', name: 'Band', line: 'Hire musicians. Every instrument plays every bar.', screen: 'band', test: (s) => s.tips >= 25 || playing(s) > 1, need: () => '$25' },
  { id: 'gigs', name: 'Gigs', line: 'Play live against other bands for fans and gear.', screen: 'gigs', test: (s) => s.fans >= 5 && playing(s) >= 2, need: (s) => (playing(s) < 2 ? '2 musicians' : needFans(5)(s)) },
  { id: 'keys', name: 'Keys', line: 'New keys on the circle of fifths: more tips, new notes.', screen: 'theory', test: fans(25), need: needFans(25) },
  { id: 'sevenths', name: 'Sevenths', line: 'Four-note chords: more tension, bigger release.', screen: 'theory', test: fans(tierFans('sevenths')), need: needFans(tierFans('sevenths')) },
  { id: 'jazz', name: 'Jazz Cellar', line: 'A room that wants sevenths. Pays in Sheet Music.', screen: 'gigs', test: (s) => s.learned.some((id) => CHORD[id].tier === 'sevenths'), need: () => 'a seventh chord' },
  { id: 'workbench', name: 'Workbench', line: 'Push your gear to +15. Every fail adds Practice.', screen: 'studio', test: (s) => s.items.length > 0 || Object.values(s.crates).some((n) => n > 0), need: () => 'a crate' },
  { id: 'jam', name: 'Jam', line: 'Improvise over your loop. Good notes build Hype.', screen: 'stage', test: (s) => s.inst.flute.own, need: () => 'a Flute' },
  { id: 'borrowed', name: 'Borrowed chords', line: 'Chords from the parallel minor. Darker colors.', screen: 'theory', test: fans(tierFans('borrowed')), need: needFans(tierFans('borrowed')) },
  { id: 'modes', name: 'Modes', line: 'Same notes, new home. Each mode has a perk.', screen: 'theory', test: (s) => s.fans >= 250 && s.keys.length >= 2, need: (s) => (s.keys.length < 2 ? '2 keys' : needFans(250)(s)) },
  { id: 'applied', name: 'Applied dominants', line: 'A dominant for every chord. Huge pull.', screen: 'theory', test: fans(tierFans('applied')), need: needFans(tierFans('applied')) },
  { id: 'studio', name: 'Recording Studio', line: 'Record songs that pay royalties, even offline.', screen: 'studio', test: fans(600), need: needFans(600) },
  { id: 'loop8', name: 'Eight bars', line: 'Twice the loop. Room for Canon and the Blues.', screen: 'stage', test: fans(LOOP8.fans), need: needFans(LOOP8.fans) },
  { id: 'color', name: 'Color chords', line: 'Neapolitan, tritone sub, sus and add9.', screen: 'theory', test: fans(tierFans('color')), need: needFans(tierFans('color')) },
  { id: 'festival', name: 'Summer Festival', line: 'The big stage. Crates and crowds.', screen: 'gigs', test: fans(1500), need: needFans(1500) },
  {
    id: 'conservatory',
    name: 'Conservatory',
    line: 'Train a Legendary instrument past its limit.',
    screen: 'band',
    test: (s) => Object.values(s.inst).some((i) => i.own && i.r >= 3 && i.q >= 10),
    need: () => 'a Legendary at level 10',
  },
];

export const PLACE = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<string, Place>;

export const isOpen = (s: State, id: string) => PLACE[id].test(s);

/** Abas do dock: Stage e Theory desde o início; o resto quando abre. */
export const screenOpen = (s: State, sc: Screen) =>
  sc === 'stage' || sc === 'theory' || (sc === 'band' && isOpen(s, 'band')) || (sc === 'gigs' && isOpen(s, 'gigs')) || (sc === 'studio' && (isOpen(s, 'workbench') || isOpen(s, 'studio')));

export const venueOpen = (s: State, v: string) =>
  v === 'coffee' ? isOpen(s, 'gigs') : v === 'jazz' ? isOpen(s, 'jazz') : v === 'studio' ? isOpen(s, 'studio') : isOpen(s, 'festival');

/** Lugar aberto ainda não anunciado (um por vez). */
export const nextNews = (s: State) => PLACES.find((p) => p.test(s) && !s.seen.includes(p.id)) ?? null;
