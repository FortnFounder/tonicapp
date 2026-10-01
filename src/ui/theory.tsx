// Theory: o vocabulário (acordes por camada), o círculo das quintas, os modos e o Songbook.
import { CHORDS, KEYS, MODE_LIST, PROGRESSIONS, PROG_MASTERY, RARITY, TIERS, type ChordDef } from '../content';
import { money, num } from '../format';
import * as G from '../game';
import { act, game, setUi, ui } from '../store';
import { MODES, absPcs, chordName, fnColor, fnOf, roman, scaleAbs, spellIn, spelledNotes, tension, tonicName } from '../theory';
import { isOpen } from '../unlock';
import { sfx } from '../audio/sfx';
import * as fx from '../fx';
import { LockLine, NoteCost, SecHead } from './common';

const FN = ['Tonic', 'Subdominant', 'Dominant'];

export function TheoryScreen() {
  const tabs: { id: typeof ui.theoryTab; name: string; open: boolean }[] = [
    { id: 'chords', name: 'Chords', open: true },
    { id: 'keys', name: 'Keys', open: isOpen(game, 'keys') },
    { id: 'modes', name: 'Modes', open: isOpen(game, 'modes') },
    { id: 'songbook', name: 'Songbook', open: true },
  ];
  const vis = tabs.filter((t) => t.open);
  const tab = vis.some((t) => t.id === ui.theoryTab) ? ui.theoryTab : 'chords';
  return (
    <>
      <div class="seg" role="tablist">
        {vis.map((t) => (
          <button key={t.id} role="tab" class={tab === t.id ? 'on' : ''} aria-selected={tab === t.id} onClick={() => setUi({ theoryTab: t.id })}>
            {t.name}
          </button>
        ))}
      </div>
      {tab === 'chords' && <Chords />}
      {tab === 'keys' && <Keys />}
      {tab === 'modes' && <Modes />}
      {tab === 'songbook' && <Songbook />}
    </>
  );
}

// ── Acordes ─────────────────────────────────────────────────────────────────

function Chords() {
  const firstLocked = TIERS.find((t) => !G.tierOpen(game, t.id));
  return (
    <>
      {TIERS.filter((t) => G.tierOpen(game, t.id)).map((t) => (
        <section key={t.id}>
          <SecHead title={t.name} info={'tier-' + t.id} />
          <div class="field">
            {CHORDS.filter((c) => c.tier === t.id).map((c) => (
              <ChordCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ))}
      {firstLocked && (
        <div class="card locked">
          <div class="ttl">{firstLocked.name}</div>
          <LockLine text={`${num(Math.floor(game.fans))}/${firstLocked.fans} fans`} />
        </div>
      )}
    </>
  );
}

function ChordCard(p: { c: ChordDef }) {
  const c = p.c;
  const t = G.tonicOf(game);
  const known = game.learned.includes(c.id);
  const f = fnColor(fnOf(c));
  const cost = G.learnCost(game, c.id);
  const can = G.canPayNotes(game, cost);
  const inLoop = game.loop.filter((x) => x === c.id).length;
  const learn = () => {
    if (!act((s) => G.learnChord(s, c.id))) return sfx.deny();
    sfx.learn(absPcs(c, t));
    fx.toast(`${chordName(c, t)} learned`);
  };
  return (
    <div class={`fc${known ? '' : ' off'}`}>
      <div class="top">
        <span class={`r f${f}`}>{c.label ?? roman(c)}</span>
        <span class={`fn f${f}`}>{FN[f]}</span>
      </div>
      <div class="n">{chordName(c, t)}</div>
      <div class="tones">{spelledNotes(c, t).join(' · ')}</div>
      <div class="meta">
        <span>tension {tension(c, game.mode).toFixed(1)}</span>
        {inLoop > 0 && <span style={{ color: 'var(--text)' }}>in loop</span>}
      </div>
      {!known && (
        <>
          <NoteCost cost={cost} />
          <button class="btn" disabled={!can} onClick={learn}>
            Learn
          </button>
        </>
      )}
    </div>
  );
}

// ── Tons ────────────────────────────────────────────────────────────────────

const ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const COF_NAMES = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];

function Keys() {
  const buy = (pc: number) => {
    const k = KEYS.find((x) => x.pc === pc)!;
    if (game.keys.includes(pc)) {
      act((s) => G.setKey(s, pc));
      sfx.chord(absPcs({ degree: 1, acc: 0, quality: 'maj' }, { pc, letter: k.letter }));
      return;
    }
    if (!act((s) => G.buyKey(s, pc))) {
      sfx.deny();
      fx.toast(game.fans < k.fans ? `Needs ${k.fans} fans` : `Needs ${money(k.cost)}`);
      return;
    }
    sfx.buy();
    fx.flash('rgba(56,209,174,.3)');
    fx.toast(`Now playing in ${tonicName(G.tonicOf(game))}`);
  };
  const cur = G.tonicOf(game);
  const prevScale = scaleAbs({ pc: 0, letter: 0 }, 'ionian');
  return (
    <>
      <section class="card">
        <SecHead title="Circle of fifths" info="keys">
          <span class="sp mono sub">×{G.keyMult(game).toFixed(2)} tips</span>
        </SecHead>
        <svg class="cof" viewBox="0 0 300 300" role="img" aria-label="Circle of fifths">
          <circle cx="150" cy="150" r="128" fill="none" stroke="var(--line)" stroke-width="1.5" />
          {ORDER.map((pc, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 150 + Math.cos(a) * 112;
            const y = 150 + Math.sin(a) * 112;
            const own = game.keys.includes(pc);
            const act_ = game.key === pc;
            const k = KEYS.find((q) => q.pc === pc)!;
            const reach = game.fans >= k.fans;
            return (
              <g key={pc} onClick={() => buy(pc)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r="24" fill={act_ ? 'var(--tonic)' : own ? 'var(--panel2)' : 'transparent'} stroke={own ? 'var(--line)' : reach ? 'var(--tonic)' : 'var(--line)'} stroke-width="1.5" stroke-dasharray={own ? undefined : '4 3'} />
                <text x={x} y={y + 6} text-anchor="middle" font-family="Shrikhand, Georgia, serif" font-size="18" fill={act_ ? 'var(--ink)' : own || reach ? 'var(--text)' : 'var(--faint)'}>
                  {COF_NAMES[i]}
                </text>
              </g>
            );
          })}
          <text x="150" y="146" text-anchor="middle" font-family="DM Mono, monospace" font-size="12" fill="var(--dim)" letter-spacing="1.5">
            {game.keys.length} OF 12
          </text>
          <text x="150" y="168" text-anchor="middle" font-family="Shrikhand, Georgia, serif" font-size="20" fill="var(--text)">
            {tonicName(cur)}
          </text>
        </svg>
        <div class="scale-row">
          {scaleAbs(cur, 'ionian').map((pc) => (
            <span key={pc} class={prevScale.includes(pc) ? '' : 'new'}>
              {spellIn(pc, cur)}
            </span>
          ))}
        </div>
      </section>
      {KEYS.filter((k) => k.cost && !game.keys.includes(k.pc))
        .slice(0, 3)
        .map((k) => {
          const t = { pc: k.pc, letter: k.letter };
          const lock = game.fans < k.fans;
          return (
            <div key={k.pc} class={`card${lock ? ' locked' : ''}`}>
              <div class="row">
                <div class="grow">
                  <div class="ttl">{tonicName(t)} major</div>
                  <div class="sub mono">
                    {scaleAbs(t, 'ionian')
                      .map((pc) => spellIn(pc, t))
                      .join(' ')}
                  </div>
                </div>
                {lock ? (
                  <LockLine text={`${k.fans} fans`} />
                ) : (
                  <button class="btn" disabled={game.tips < k.cost} onClick={() => buy(k.pc)}>
                    Unlock <span class="mono">{money(k.cost)}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </>
  );
}

// ── Modos ───────────────────────────────────────────────────────────────────

function Modes() {
  const t = G.tonicOf(game);
  return (
    <>
      {MODE_LIST.map((m) => {
        const own = game.modes.includes(m.id);
        const on = game.mode === m.id;
        const lock = game.fans < m.fans;
        const charPc = G.modeNote(game, m.id);
        const info = MODES[m.id];
        return (
          <div key={m.id} class={`card${lock && !own ? ' locked' : ''}`}>
            <div class="row">
              <div class="grow">
                <div class="row" style={{ gap: 8 }}>
                  <span class="ttl">{info.name}</span>
                  <Brightness b={info.brightness} />
                </div>
                <div class="sub mono">
                  {scaleAbs(t, m.id)
                    .map((pc) => spellIn(pc, t, m.id))
                    .join(' ')}
                </div>
              </div>
              {own ? (
                on ? (
                  <span class="sub">Playing</span>
                ) : (
                  <button class="btn ghost" onClick={() => act((s) => G.setMode(s, m.id)) && sfx.discover(scaleAbs(t, m.id))}>
                    Play
                  </button>
                )
              ) : null}
            </div>
            <div class="sub">
              {m.sig.length ? (
                <>
                  Signature <b style={{ color: 'var(--text)' }}>{m.sig.join(' or ')}</b> · {m.perk}
                </>
              ) : (
                'The major scale'
              )}
            </div>
            {!own &&
              (lock ? (
                <LockLine text={`${num(Math.floor(game.fans))}/${m.fans} fans`} />
              ) : (
                <div class="row">
                  <div class="grow">
                    <NoteCost cost={[[charPc, m.notes]]} />
                  </div>
                  <button
                    class="btn"
                    disabled={game.tips < m.tips || game.notes[charPc] < m.notes}
                    onClick={() => {
                      if (!act((s) => G.buyMode(s, m.id))) return sfx.deny();
                      sfx.discover(scaleAbs(t, m.id));
                      fx.toast(`${info.name} unlocked`);
                    }}
                  >
                    Unlock <span class="mono">{money(m.tips)}</span>
                  </button>
                </div>
              ))}
          </div>
        );
      })}
    </>
  );
}

const Brightness = (p: { b: number }) => (
  <span class="bright" aria-label={`Brightness ${p.b + 4} of 7`}>
    {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
      <i key={k} class={k <= p.b ? 'on' : ''} />
    ))}
  </span>
);

// ── Songbook ────────────────────────────────────────────────────────────────

function Songbook() {
  const found = game.found.length;
  return (
    <section class="card">
      <SecHead title="Songbook" info="songbook">
        <span class="sp mono sub">
          {found}/{PROGRESSIONS.length} · ×{G.masteryMult(game).toFixed(2)}
        </span>
      </SecHead>
      <div class="plist">
        {PROGRESSIONS.map((p) => {
          const known = game.found.includes(p.id);
          const lv = G.progLevel(game, p.id);
          const loops = game.mastery[p.id] ?? 0;
          const nextAt = PROG_MASTERY.loops[lv];
          const miss = G.progMissing(game, p.id);
          return (
            <div key={p.id} class={`pl${known ? '' : ' lock'}`}>
              <div class="grow">
                <div class="nm">
                  {known ? p.name : '· · ·'} <span class={`rarity c${p.rarity}`}>{RARITY[p.rarity]}</span>
                </div>
                <div class="rn">{known ? p.seq.join(' – ') + (p.len ? ' (8 bars)' : '') : miss.length ? 'needs ' + miss.join(', ') : p.len ? '8 bars' : '?'}</div>
              </div>
              {known && (
                <div class="lv">
                  <div class="stars">{'★'.repeat(lv)}{'☆'.repeat(PROG_MASTERY.loops.length - lv)}</div>
                  <div>{nextAt ? `${num(loops)}/${num(nextAt)}` : 'max'}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
