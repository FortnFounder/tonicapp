// Palco: o acorde que soa (luz da função), teclado com as notas dele, medidor de tensão, banda,
// o loop (casas com tensão, soltura e chance) e as notas colhidas.
import { CHORD, GRADES, INSTRUMENTS, LOOP8, TIERS } from '../content';
import { money, pct } from '../format';
import * as G from '../game';
import { analyze } from '../harmony';
import { act, game, setUi, ui } from '../store';
import { MODES, absPcs, chordName, fnColor, fnOf, roman, spellIn, tension } from '../theory';
import { isOpen } from '../unlock';
import { startJam } from '../conductor';
import { sfx } from '../audio/sfx';
import { InfoBtn, LockLine, SecHead, Sheet } from './common';
import { Fire, INST_ICON } from './icons';

const FN_NAME = ['Tonic', 'Subdominant', 'Dominant'];
const LIGHT = ['t', 's', 'd'];
const W = [0, 2, 4, 5, 7, 9, 11];
const B: [number, number][] = [
  [1, 1],
  [3, 2],
  [6, 4],
  [8, 5],
  [10, 6],
];
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function StageCard() {
  const now = Date.now();
  const id = ui.bar?.id ?? game.loop[0];
  const ch = CHORD[id];
  const t = G.tonicOf(game);
  const pcs = absPcs(ch, t);
  const fn = fnColor(fnOf(ch));
  const scale = G.modeScale(game);
  const rel = ui.bar?.tension.released ?? 0;
  const stored = game.tension;
  const hype = G.hypeOn(game, now);
  return (
    <section class="stage" aria-label="Stage">
      {LIGHT.map((l, i) => (
        <div key={l} class={`light ${l}${i === fn ? ' on' : ''}`} />
      ))}
      <div class="stage-top">
        <span>
          {spellIn(t.pc, t)} {game.mode === 'ionian' ? 'major' : MODES[game.mode].name}
        </span>
        {hype > 0 && (
          <span style={{ color: 'var(--tonic)' }}>
            <Fire size={12} /> Hype {hype}%
          </span>
        )}
        <span>{G.bpm(game)} BPM</span>
      </div>
      <div class="chord">
        <div class="roman" style={{ color: `var(--${['tonic', 'sub', 'dom'][fn]})` }}>{ch.label ?? roman(ch)}</div>
        <div class="cname pop" key={ui.bar ? game.stats.bars : 0}>
          {chordName(ch, t)}
        </div>
        <div class="fnchip" style={{ color: `var(--${['tonic', 'sub', 'dom'][fn]})` }}>
          {FN_NAME[fn]}
        </div>
      </div>
      <div class="kbd" aria-hidden="true">
        {W.map((pc) => (
          <div key={pc} class={`wk${pcs.includes(pc) ? ' lit' : ''}${pc === pcs[0] ? ' root' : ''}${scale.includes(pc) ? '' : ' off'}`} data-pc={pc}>
            {pcs.includes(pc) ? spellIn(pc, t, game.mode) : SHARP[pc]}
          </div>
        ))}
        {B.map(([pc, after]) => (
          <div key={pc} class={`bk${pcs.includes(pc) ? ' lit' : ''}${pc === pcs[0] ? ' root' : ''}`} data-pc={pc} style={{ left: `${(after / 7) * 100}%` }}>
            {pcs.includes(pc) ? spellIn(pc, t, game.mode) : ''}
          </div>
        ))}
      </div>
      <div class="stage-mid">
        <div class="beats" aria-hidden="true">
          {[0, 1, 2, 3].map((k) => (
            <i key={k} class={ui.beat === k ? 'on' : ''} />
          ))}
        </div>
        <div class={`tension${rel > 0.5 ? ' release' : ''}`}>
          <span>{rel > 0.5 ? 'Release' : 'Tension'}</span>
          <div class="bar">
            <i style={{ width: `${Math.min(100, ((rel > 0.5 ? rel : stored) / 30) * 100)}%` }} />
          </div>
          <span class="mono">{rel > 0.5 ? `×${ui.bar!.tension.release.toFixed(2)}` : stored.toFixed(1)}</span>
        </div>
      </div>
      <div class="band">
        {INSTRUMENTS.map((i) => {
          const it = game.inst[i.id];
          const Ic = INST_ICON[i.id];
          return it.own ? (
            <div key={i.id} class="tile" data-i={i.id}>
              <Ic />
              <span class="rar" style={{ background: `var(--${['common', 'rare', 'epic', 'legend'][it.r]})` }} />
            </div>
          ) : (
            <button key={i.id} class="tile locked" aria-label={`${i.name} (not in the band)`} onClick={() => isOpen(game, 'band') && setUi({ screen: 'band' })}>
              <Ic />
            </button>
          );
        })}
      </div>
    </section>
  );
}

const GRADE_VAR = ['', 'var(--rare)', 'var(--epic)', 'var(--legend)'];

function OddsStrip(p: { o: G.Odds }) {
  const parts = [p.o.sweet, p.o.soaring, p.o.transcendent];
  return (
    <span class="odds" aria-hidden="true">
      {parts.map((x, i) => (
        <i key={i} style={{ width: `${Math.min(100, x * 250)}%`, background: GRADE_VAR[i + 1] }} />
      ))}
    </span>
  );
}

export function LoopSection() {
  const now = Date.now();
  const info = G.loopInfo(game);
  const view = G.loopView(game, now);
  const cur = ui.bar ? ui.bar.slot : -1;
  return (
    <section>
      <SecHead title="Loop" info="loop">
        <div class="score">
          <b>{info.score}</b>
          <small>harmony</small>
        </div>
      </SecHead>
      <div class={`slots${game.loop.length === 8 ? ' eight' : ''}`}>
        {view.map((v, i) => {
          const ch = CHORD[v.id];
          const f = fnColor(fnOf(ch));
          const tn = tension(ch, game.mode);
          return (
            <button key={i} class={`slot${i === cur ? ' now' : ''}`} aria-label={`Bar ${i + 1}: ${chordName(ch, G.tonicOf(game))}`} onClick={() => setUi({ picker: i })}>
              {v.tension.release > 1.05 && <span class="rel">×{v.tension.release.toFixed(2)}</span>}
              <span class={`r f${f}`}>{ch.label ? roman(ch) : roman(ch)}</span>
              <span class="n">{chordName(ch, G.tonicOf(game))}</span>
              <span class="tp" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((k) => (
                  <i key={k} class={tn > k * 2 + 0.5 ? 'on' : ''} />
                ))}
              </span>
              <OddsStrip o={v.odds} />
            </button>
          );
        })}
      </div>
      <div class="combos">
        {info.progs.map((p) => (
          <span key={p.id} class="chip prog">
            {p.name}
          </span>
        ))}
        {info.modeSig && <span class="chip mode">{MODES[game.mode].name} ×1.25</span>}
        {info.cadences.map((c) => (
          <span key={c.id} class="chip">
            {c.name}
          </span>
        ))}
      </div>
      <LoopTools />
    </section>
  );
}

function LoopTools() {
  const now = Date.now();
  const jamOpen = isOpen(game, 'jam');
  const l8 = isOpen(game, 'loop8');
  return (
    <div class="loop-tools">
      <div class="sub mono" style={{ alignSelf: 'center', marginRight: 'auto' }}>
        ≈ {money(G.tipsPerSecond(game, now))}/s
      </div>
      {l8 &&
        (game.loop8 ? (
          <button class="btn ghost" onClick={() => act((s) => G.toggleLoopLength(s))}>
            {game.loop.length === 8 ? '4 bars' : '8 bars'}
          </button>
        ) : (
          <button class="btn ghost" disabled={game.tips < LOOP8.tips} onClick={() => act((s) => G.buyLoop8(s)) && sfx.buy()}>
            8 bars <span class="mono">{money(LOOP8.tips)}</span>
          </button>
        ))}
      {jamOpen && (
        <button class="btn" onClick={startJam} disabled={!!ui.jam && !ui.jam.done}>
          Jam
        </button>
      )}
    </div>
  );
}

export function NotesSection() {
  const t = G.tonicOf(game);
  const scale = G.modeScale(game);
  const chroma = [...Array(12).keys()].filter((pc) => !scale.includes(pc));
  const showChroma = chroma.some((pc) => game.notes[pc] >= 1) || game.fans >= 100;
  return (
    <section>
      <SecHead title="Notes" info="notes" />
      <div class="pills">
        {scale.map((pc) => (
          <div key={pc} class="pill" data-pc={pc}>
            <span class="l">{spellIn(pc, t, game.mode)}</span>
            <span class="c">{fmtN(game.notes[pc])}</span>
          </div>
        ))}
      </div>
      {showChroma && (
        <div class="pills extra">
          {chroma.map((pc) => (
            <div key={pc} class="pill chroma" data-pc={pc}>
              <span class="l">{spellIn(pc, t, game.mode)}</span>
              <span class="c">{fmtN(game.notes[pc])}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const fmtN = (n: number) => (n < 1000 ? String(Math.floor(n)) : n < 1e6 ? (n / 1000).toFixed(n < 1e4 ? 1 : 0) + 'K' : (n / 1e6).toFixed(1) + 'M');

export function StageScreen() {
  return (
    <>
      <StageCard />
      <LoopSection />
      <NotesSection />
    </>
  );
}

// ── Seletor de acorde ───────────────────────────────────────────────────────

export function ChordPicker() {
  const k = ui.picker!;
  const t = G.tonicOf(game);
  const curId = game.loop[k];
  const base = G.loopInfo(game).score;
  const n = game.loop.length;
  const prev = game.loop[(k - 1 + n) % n];
  const next = game.loop[(k + 1) % n];
  const close = () => setUi({ picker: null });
  const pick = (id: string) => {
    act((s) => G.setSlot(s, k, id));
    sfx.chord(absPcs(CHORD[id], t));
    close();
  };
  return (
    <Sheet
      onClose={close}
      title={
        <>
          <h3>Bar {k + 1}</h3>
          <span class="sub mono sp">
            {chordName(CHORD[prev], t)} → ? → {chordName(CHORD[next], t)}
          </span>
          <InfoBtn id="picker" />
        </>
      }
    >
      {TIERS.filter((tr) => game.learned.some((id) => CHORD[id].tier === tr.id)).map((tr) => (
        <div key={tr.id}>
          <div class="tier-h">{tr.name}</div>
          <div class="pick">
            {game.learned
              .filter((id) => CHORD[id].tier === tr.id)
              .map((id) => {
                const ch = CHORD[id];
                const loop = [...game.loop];
                loop[k] = id;
                const d = analyze(loop, game.mode).score - base;
                const f = fnColor(fnOf(ch));
                return (
                  <button key={id} class={`slot${id === curId ? ' cur' : ''}`} onClick={() => pick(id)}>
                    <span class={`r f${f}`}>{ch.label ?? roman(ch)}</span>
                    <span class="n">{chordName(ch, t)}</span>
                    <span class={`d${d > 0 ? ' up' : d < 0 ? ' down' : ''}`}>{id === curId ? 'now' : (d > 0 ? '+' : '') + d}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      <div class="sub" style={{ marginTop: 12 }}>
        {G.tierOpen(game, 'sevenths') || game.learned.length < 7 ? null : <LockLine text={`Sevenths at ${TIERS[1].fans} fans`} />}
      </div>
      <OddsTable slot={k} />
    </Sheet>
  );
}

/** Chances do compasso desta casa, à mostra (regra da casa). */
function OddsTable(p: { slot: number }) {
  const v = G.loopView(game, Date.now())[p.slot];
  if (!v) return null;
  return (
    <div class="card" style={{ marginTop: 12, background: 'var(--panel2)' }}>
      <div class="kv">
        {GRADES.slice(1).map((g, i) => (
          <>
            <span class="k" style={{ color: GRADE_VAR[i + 1] }}>
              {g.name}
            </span>
            <span class="sub">×{g.mult}</span>
            <span class="mono">{pct([v.odds.sweet, v.odds.soaring, v.odds.transcendent][i])}</span>
          </>
        ))}
        <span class="k">Release</span>
        <span class="sub">tension {v.tension.released.toFixed(1)}</span>
        <span class="mono">×{v.tension.release.toFixed(2)}</span>
      </div>
    </div>
  );
}
