// Relógio: agenda o compasso inteiro um pouco antes dele tocar (lookahead) e solta os eventos de tela
// (batida, compasso, instrumento) na hora em que o ouvido escuta. Sem áudio, anda pelo relógio da página.
import { now, outputLatency, running } from './engine';

export interface ScheduledBar<T = unknown> {
  t: number;
  dur: number;
  data: T;
}

interface Opts<T> {
  /** Duração do compasso (s), lida a cada compasso (o BPM pode mudar). */
  barDur: () => number;
  /** Chamado ao agendar: decide o compasso (joga a regra) e agenda o som. */
  schedule: (t: number, dur: number) => T;
  /** Chamado quando o compasso começa a soar. */
  onBar: (b: ScheduledBar<T>) => void;
  onBeat: (beat: number, b: ScheduledBar<T>) => void;
}

const LOOKAHEAD = 0.18;
let opts: Opts<unknown> | null = null;
let nextT = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let raf = 0;
const queue: { t: number; fn: () => void }[] = [];
export const history: ScheduledBar[] = [];

/** Agenda uma ação de tela pro instante t do relógio do áudio (compensando a latência de saída). */
export function at(t: number, fn: () => void) {
  queue.push({ t: t + outputLatency(), fn });
}

function tick() {
  if (!opts) return;
  const n = now();
  if (nextT < n) nextT = n + 0.05;
  while (nextT < n + LOOKAHEAD) {
    const dur = opts.barDur();
    const t = nextT;
    const data = opts.schedule(t, dur);
    const b: ScheduledBar = { t, dur, data };
    history.push(b);
    if (history.length > 16) history.shift();
    const o = opts;
    at(t, () => o.onBar(b));
    for (let k = 0; k < 4; k++) at(t + (k * dur) / 4, () => o.onBeat(k, b));
    nextT += dur;
  }
}

function frame() {
  const n = now();
  queue.sort((a, b) => a.t - b.t);
  while (queue.length && queue[0].t <= n) queue.shift()!.fn();
  raf = requestAnimationFrame(frame);
}

export function start<T>(o: Opts<T>) {
  opts = o as Opts<unknown>;
  nextT = now() + 0.1;
  queue.length = 0;
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 25);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
  tick();
}

/** Recomeça do agora (volta do segundo plano): descarta o que estava agendado pro passado. */
export function restart() {
  nextT = now() + 0.1;
  queue.length = 0;
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  cancelAnimationFrame(raf);
  opts = null;
}

/** O compasso que está soando agora (pro Jam e pra barra de progresso). */
export function current(): ScheduledBar | null {
  const n = now() - outputLatency();
  for (let i = history.length - 1; i >= 0; i--) if (history[i].t <= n) return history[i];
  return null;
}

export const audible = running;
