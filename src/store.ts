// Estado do jogo + estado da tela, com assinatura simples pro Preact redesenhar (mesmo modelo do Distillery).
import { useEffect, useState } from 'preact/hooks';
import type { BarResult } from './game';
import type { CrateTier, VenueId } from './content';
import type { Loot, EnhanceResult } from './gear';
import type { GigRun } from './gig';
import type { RecordResult } from './studio';
import type { JamState } from './jam';
import type { AwayResult } from './game';
import { load, save, saveBackup, wipe } from './save';
import { startState, type State } from './game';
import type { Screen } from './unlock';

export interface Ui {
  started: boolean;
  screen: Screen;
  theoryTab: 'chords' | 'keys' | 'modes' | 'songbook';
  studioTab: 'workbench' | 'crates' | 'songs' | 'records';
  /** Casa do loop com o seletor de acorde aberto. */
  picker: number | null;
  /** Último compasso que soou (palco). */
  bar: BarResult | null;
  /** Batida 0–3 do compasso que soa. */
  beat: number;
  /** Gig: local e nível escolhidos em cada cartão. */
  gigLevel: Record<VenueId, number>;
  /** Show ao vivo: o resultado (já entregue) e quantos compassos já tocaram. */
  show: { run: GigRun; shown: number; done: boolean } | null;
  jam: { state: JamState; startT: number; bars: number; done: boolean; hype: number } | null;
  crate: { tier: CrateTier; loot: Loot[]; flipped: number; phase: 'shake' | 'cards' | 'summary' } | null;
  item: number | null;
  /** Item no pedestal da Workbench. */
  bench: number | null;
  /** Último resultado da melhoria (o medidor anima). */
  enhance: (EnhanceResult & { at: number }) | null;
  record: (RecordResult & { at: number }) | null;
  info: string | null;
  welcome: AwayResult | null;
  /** Fila de descobertas (progressão nova) e marcos pra mostrar. */
  discover: string[];
  settings: boolean;
  /** Animação em andamento que segura avisos (não entregar o resultado antes). */
  suspense: boolean;
  confirm: string | null;
}

export let game: State = load(Date.now());

export const ui: Ui = {
  started: false,
  screen: 'stage',
  theoryTab: 'chords',
  studioTab: 'workbench',
  picker: null,
  bar: null,
  beat: 0,
  gigLevel: { coffee: 1, jazz: 1, studio: 1, festival: 1 },
  show: null,
  jam: null,
  crate: null,
  item: null,
  bench: null,
  enhance: null,
  record: null,
  info: null,
  welcome: null,
  discover: [],
  settings: false,
  suspense: false,
  confirm: null,
};

const listeners = new Set<() => void>();

export function emit() {
  listeners.forEach((l) => l());
}

/** Muda o jogo, salva e redesenha. */
export function act<T>(fn: (s: State) => T): T {
  const r = fn(game);
  save(game);
  emit();
  return r;
}

/** Muda o jogo e redesenha sem salvar (compasso a compasso; o save periódico pega). */
export function mutate<T>(fn: (s: State) => T): T {
  const r = fn(game);
  emit();
  return r;
}

export function setUi(patch: Partial<Ui>) {
  Object.assign(ui, patch);
  emit();
}

export const persist = () => save(game);

export function useStore() {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((x) => x + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
}

/** Relógio de tela (contadores de tempo), 1×/s. */
export function useNow(ms = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => set(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

/** Recomeça do zero (com backup pra desfazer). */
export function resetGame() {
  saveBackup(game);
  wipe();
  game = startState(Date.now());
  save(game);
  Object.assign(ui, { screen: 'stage', picker: null, bar: null, show: null, jam: null, crate: null, item: null, bench: null, settings: false, confirm: null });
  emit();
}

export function replaceGame(s: State) {
  saveBackup(game);
  game = s;
  save(game);
  emit();
}
