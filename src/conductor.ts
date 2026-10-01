// O maestro: liga a regra (game), o relógio (sequencer), o arranjo (arranger) e a tela (store + fx).
// Cada compasso é decidido na hora de agendar (lookahead), então o som já sabe a grade e a soltura.
import { CHORD, GRADES, INSTRUMENTS, MILESTONES, PROG, type InstId } from './content';
import * as G from './game';
import * as fx from './fx';
import { arrange, applyTimbre, resetVoices, type ArrangeCtx, type BandView, type BarSpec } from './audio/arranger';
import { haptic, initAudio, now as audioNow, outputLatency, resume, running, suspend } from './audio/engine';
import * as I from './audio/instruments';
import * as seq from './audio/sequencer';
import { setSfxKey, sfx } from './audio/sfx';
import { game, mutate, persist, setUi, ui } from './store';
import { tickRoyalties, royaltiesPerHour } from './studio';
import { refreshBookings } from './gig';
import { judge, hypeOf, nearestBeat, newJam, settle } from './jam';
import { JAM } from './content';
import { absPcs, fnColor, fnOf, mod12, spellIn } from './theory';

type Scheduled = { kind: 'play'; res: G.BarResult; spec: BarSpec } | { kind: 'gig'; idx: number; spec: BarSpec };

let bandSig = '';
let voiceSig = '';

function bandView(): BandView {
  const own = {} as Record<InstId, boolean>;
  const r = {} as Record<InstId, number>;
  for (const i of INSTRUMENTS) {
    own[i.id] = game.inst[i.id].own;
    r[i.id] = game.inst[i.id].r;
  }
  return { own, r };
}

function arrangeCtx(six: number): ArrangeCtx {
  const band = bandView();
  const sig = JSON.stringify(band);
  if (sig !== bandSig) {
    bandSig = sig;
    applyTimbre(band);
  }
  const vs = game.key + game.mode + game.loop.join();
  if (vs !== voiceSig) {
    voiceSig = vs;
    resetVoices();
  }
  setSfxKey(game.key);
  return {
    tonic: G.tonicOf(game),
    mode: game.mode,
    scale: G.modeScale(game),
    band,
    six,
    loopKey: game.loop.join('|') + '#' + game.key + game.mode,
    loop: game.loop,
  };
}

/** Script do show: compassos já sorteados pelo playGig (a tela e o som só revelam). */
let script: { idx: number } | null = null;

function schedule(t: number, dur: number): Scheduled {
  const six = dur / 16;
  const a = arrangeCtx(six);
  let out: Scheduled;
  if (ui.show && !ui.show.done && script && script.idx < ui.show.run.bars.length) {
    const bars = ui.show.run.bars;
    const b = bars[script.idx];
    const n = game.loop.length;
    const spec: BarSpec = {
      id: b.id,
      nextId: bars[script.idx + 1]?.id ?? game.loop[(b.slot + 1) % n],
      prevId: game.loop[(b.slot - 1 + n) % n],
      grade: b.grade,
      released: b.released,
      stored: b.stored,
      slot: b.slot,
      loopLen: n,
    };
    out = { kind: 'gig', idx: script.idx, spec };
    script.idx++;
    if (script.idx === 1) I.crowdBed(t, dur * bars.length + 1, 1);
  } else {
    const nowMs = Date.now();
    const res = G.playBar(game, Math.random, nowMs);
    game.t = nowMs;
    tickRoyalties(game, nowMs);
    const n = game.loop.length;
    const spec: BarSpec = {
      id: res.id,
      nextId: game.loop[(res.slot + 1) % n],
      prevId: game.loop[(res.slot - 1 + n) % n],
      grade: res.grade,
      released: res.tension.released,
      stored: res.tension.after,
      slot: res.slot,
      loopLen: n,
    };
    out = { kind: 'play', res, spec };
  }
  for (const h of arrange(out.spec, a, t)) seq.at(h.t, () => pulse(h.inst));
  return out;
}

function pulse(inst: InstId) {
  const el = document.querySelector(`.tile[data-i="${inst}"]`);
  if (!el) return;
  el.classList.remove('hit');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('hit');
}

const GRADE_COLOR = ['var(--text)', 'var(--rare)', 'var(--epic)', 'var(--legend)'];

function onBar(b: seq.ScheduledBar) {
  const d = b.data as Scheduled;
  const fn = fnColor(fnOf(CHORD[d.spec.id]));
  document.documentElement.style.setProperty('--fn', ['var(--tonic)', 'var(--sub)', 'var(--dom)'][fn]);
  if (d.kind === 'gig') {
    if (!ui.show) return;
    const shown = d.idx + 1;
    const done = shown >= ui.show.run.bars.length;
    setUi({ show: { ...ui.show, shown } });
    gradeFx(d.spec.grade, '.show-stage');
    if (done) {
      setTimeout(() => {
        if (!ui.show) return;
        script = null;
        setUi({ show: { ...ui.show, done: true } });
        if (ui.show.run.place === 1) {
          sfx.applause(1);
          fx.flash('rgba(255,178,62,.45)', 900);
        } else sfx.applause(0.35);
      }, b.dur * 1000 * 0.9);
    }
    return;
  }
  const res = d.res;
  ui.bar = res;
  // Jam: conta os compassos e fecha na hora.
  if (ui.jam && !ui.jam.done) {
    const bars = ui.jam.bars + 1;
    if (bars > JAM.bars) finishJam();
    else ui.jam = { ...ui.jam, bars };
  }
  mutate(() => undefined);
  // Com cena aberta (show, caixote, gravação, Jam) o palco não aparece: sem efeito por cima dela.
  const covered = !!(ui.show || ui.crate || ui.record || ui.jam);
  if (!covered) {
    gradeFx(res.grade, '.stage');
    notesFx(res);
  }
  if (!covered && res.tension.released >= 4) {
    const meter = document.querySelector('.tension');
    const c = fx.center(meter);
    fx.burst(c.x, c.y, 'var(--tonic)', Math.min(30, 8 + Math.round(res.tension.released)), 0.7);
  }
  for (const id of res.discovered) ui.discover.push(id);
  if (res.discovered.length && !ui.suspense) sfx.discover(G.modeScale(game));
  for (const id of res.masteryUp) fx.toast(`${PROG[id].name} mastery ${G.progLevel(game, id)}`);
  for (const id of res.milestones) {
    const m = MILESTONES.find((x) => x.id === id)!;
    fx.toast(`${m.name} · +${m.records} Gold Records`);
  }
  if (res.loopEnd) {
    refreshBookings(game, Date.now());
    persist();
  }
}

function gradeFx(grade: string, sel: string) {
  const gi = GRADES.findIndex((g) => g.id === grade);
  if (gi <= 0) return;
  const el = document.querySelector(sel + ' .cname') ?? document.querySelector(sel);
  const c = fx.center(el);
  const g = GRADES[gi];
  fx.floatText(c.x, c.y - 30, `${g.name} ×${g.mult}`, GRADE_COLOR[gi], gi >= 2);
  fx.burst(c.x, c.y, GRADE_COLOR[gi], [0, 14, 26, 44][gi], [0, 0.8, 1.1, 1.6][gi]);
  if (gi >= 2) fx.flash(gi === 3 ? 'rgba(243,228,126,.55)' : 'rgba(195,140,255,.35)', gi === 3 ? 1200 : 700);
  if (gi >= 2) fx.shake(gi === 3 ? 9 : 3, gi === 3 ? 500 : 260);
  haptic(gi === 3 ? [40, 60, 40, 60, 120] : gi === 2 ? [30, 40, 50] : 12);
}

function notesFx(res: G.BarResult) {
  const t = G.tonicOf(game);
  fx.flyNotes(
    res.notes.map(([pc, n]) => ({
      from: document.querySelector(`.kbd [data-pc="${pc}"]`),
      to: document.querySelector(`.pills [data-pc="${pc}"]`),
      text: '+' + (n < 10 ? n.toFixed(n % 1 ? 1 : 0) : Math.round(n)) + ' ' + spellIn(pc, t, game.mode),
      color: 'var(--fn)',
    })),
  );
}


function onBeat(k: number) {
  ui.beat = k;
  document.querySelectorAll('.beats i').forEach((e, i) => e.classList.toggle('on', i === k));
}

// ── Começo, pausa e volta ───────────────────────────────────────────────────

let started = false;

export function boot() {
  if (started) return;
  started = true;
  initAudio();
  const away = G.away(game, Date.now(), royaltiesPerHour(game));
  game.royaltyAt = Date.now();
  refreshBookings(game, Date.now());
  persist();
  setUi({ started: true, welcome: away && away.bars > 0 ? away : null });
  seq.start<Scheduled>({ barDur: () => G.barSeconds(game), schedule, onBar, onBeat });
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('pagehide', () => persist());
}

function onVisibility() {
  if (document.hidden) {
    persist();
    suspend();
    return;
  }
  resume();
  const away = G.away(game, Date.now(), royaltiesPerHour(game));
  game.royaltyAt = Date.now();
  refreshBookings(game, Date.now());
  seq.restart();
  persist();
  if (away && away.bars > 0) setUi({ welcome: away });
  else mutate(() => undefined);
}

/** Show ao vivo: liga o script (os próximos compassos tocam o show). */
export function startShow() {
  script = { idx: 0 };
}

/** Pula pro fim do show (o resultado já foi entregue no playGig). */
export function skipShow() {
  if (!ui.show) return;
  script = null;
  setUi({ show: { ...ui.show, shown: ui.show.run.bars.length, done: true } });
  sfx.applause(ui.show.run.place === 1 ? 1 : 0.35);
}

export function endShow() {
  script = null;
  setUi({ show: null });
}

// ── Jam ─────────────────────────────────────────────────────────────────────

export function startJam() {
  if (ui.jam && !ui.jam.done) return;
  setUi({ jam: { state: newJam(), startT: audioNow(), bars: 0, done: false, hype: 0 } });
}

/** Um toque no teclado do Jam: toca a nota na hora e julga contra a batida mais perto. */
export function jamTap(pc: number, el?: Element | null) {
  const j = ui.jam;
  if (!j || j.done) return;
  const b = seq.current();
  if (!b) return;
  const t = audioNow() - outputLatency();
  const beat = b.dur / 4;
  const dt = t - nearestBeat(t, b.t, beat);
  const spec = (b.data as Scheduled).spec;
  const chord = absPcs(CHORD[spec.id], G.tonicOf(game));
  if (running()) I.flute(72 + mod12(pc), audioNow() + 0.005, beat * 0.9, 0.9, 1, 'jam');
  const h = judge(j.state, dt, pc, chord);
  const c = fx.center(el ?? null);
  const label = h.timing === 'miss' ? 'Miss' : h.harmonic === 'chord' ? h.timing[0].toUpperCase() + h.timing.slice(1) : 'Tension';
  const color = h.timing === 'miss' ? 'var(--faint)' : h.harmonic === 'chord' ? 'var(--tonic)' : 'var(--dom)';
  fx.floatText(c.x, c.y - 24, label, color);
  if (h.timing === 'perfect') fx.burst(c.x, c.y, 'var(--tonic)', 8, 0.5);
  haptic(h.timing === 'miss' ? 40 : 8);
  setUi({ jam: { ...j } });
}

function finishJam() {
  const j = ui.jam;
  if (!j) return;
  settle(j.state);
  const hype = hypeOf(j.state, JAM.bars * 4);
  mutate((s) => {
    s.hype = { until: Date.now() + JAM.buffSeconds * 1000, value: Math.max(hype, G.hypeOn(s, Date.now())) };
    j.state.notes.forEach((n, pc) => (s.notes[pc] += n));
  });
  ui.jam = { ...j, done: true, hype };
  persist();
  if (hype >= 60) sfx.success(2);
  else sfx.success(1);
}

export function closeJam() {
  setUi({ jam: null });
}
