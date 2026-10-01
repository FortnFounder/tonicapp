// Gigs: os 4 locais (nível, régua, pedido do júri, rivais, chance de pódio por Monte Carlo) e o show ao vivo.
import { useMemo } from 'preact/hooks';
import { CHORD, CRATES, GIG, GRADES, REQUESTS, VENUES, type VenueId } from '../content';
import { duration, num, pct } from '../format';
import * as G from '../game';
import { gigOdds, gigTarget, nextBookingIn, playGig, refreshBookings, requestMet, requestOf, rivalsOf } from '../gig';
import { act, game, setUi, ui, useNow } from '../store';
import { venueOpen, PLACE } from '../unlock';
import { startShow, skipShow, endShow } from '../conductor';
import { sfx } from '../audio/sfx';
import { chordName, fnColor, fnOf, roman } from '../theory';
import { LockLine, SecHead } from './common';
import { Check, Cross, Crate, Heart, Mic, RES_ICON, Record } from './icons';

const ORD = ['1st', '2nd', '3rd', '4th'];

export function GigsScreen() {
  const now = useNow();
  refreshBookings(game, now);
  const next = nextBookingIn(game, now);
  return (
    <>
      <section class="card">
        <SecHead title="Bookings" info="gigs">
          <span class="sp mono sub">{game.bookings < GIG.bookings.max ? `+1 in ${duration(next / 1000)}` : 'full'}</span>
        </SecHead>
        <div class="row" style={{ gap: 6 }}>
          {Array.from({ length: GIG.bookings.max }, (_, i) => (
            <span key={i} style={{ width: 28, height: 28, borderRadius: 8, background: i < game.bookings ? 'var(--tonic)' : 'var(--panel2)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
              <Mic size={16} />
            </span>
          ))}
          <span class="grow" />
          {Object.values(game.crates).some((n) => n > 0) && (
            <button class="btn ghost" onClick={() => setUi({ screen: 'studio', studioTab: 'crates' })}>
              <Crate size={22} tier={1} /> {Object.values(game.crates).reduce((a, x) => a + x, 0)}
            </button>
          )}
        </div>
      </section>
      {VENUES.map((v) => (venueOpen(game, v.id) ? <VenueCard key={v.id} id={v.id} /> : <LockedVenue key={v.id} id={v.id} />))}
    </>
  );
}

function LockedVenue(p: { id: VenueId }) {
  const v = VENUES.find((x) => x.id === p.id)!;
  const place = PLACE[p.id === 'coffee' ? 'gigs' : p.id === 'jazz' ? 'jazz' : p.id];
  return (
    <div class="card locked">
      <div class="ttl" style={{ color: 'var(--faint)' }}>
        {v.name}
      </div>
      <LockLine text={place.need(game)} />
    </div>
  );
}

function VenueCard(p: { id: VenueId }) {
  const v = VENUES.find((x) => x.id === p.id)!;
  const g = game.gigs[p.id];
  const level = Math.min(ui.gigLevel[p.id], g.open);
  const now = Date.now();
  const req = requestOf(p.id, level);
  const ok = requestMet(game, req, now);
  const target = gigTarget(p.id, level);
  const sig = [game.loop.join(), game.key, game.mode, G.tone(game).toFixed(3), G.feel(game, now).toFixed(3), G.stage(game).toFixed(3), G.depth(game).toFixed(3), game.tempo, level].join('|');
  const odds = useMemo(() => gigOdds(game, p.id, level, Date.now(), 300), [sig]);
  const rivals = rivalsOf(p.id, level);
  const ResIcon = v.res ? RES_ICON[v.res] : null;
  const setLevel = (l: number) => setUi({ gigLevel: { ...ui.gigLevel, [p.id]: Math.max(1, Math.min(g.open, l)) } });
  const play = () => {
    const run = act((s) => playGig(s, p.id, level, Math.random, Date.now()));
    if (!run) return sfx.deny();
    setUi({ show: { run, shown: 0, done: false } });
    startShow();
  };
  return (
    <div class="card">
      <div class="row">
        <div class="grow">
          <div class="ttl">{v.name}</div>
          <div class="sub row" style={{ gap: 6 }}>
            {ResIcon ? <ResIcon size={14} /> : <Crate size={16} tier={2} />} {v.resName}
            {g.best[level - 1] > 0 && <span> · best {ORD[g.best[level - 1] - 1]}</span>}
          </div>
        </div>
        <div class="lvl">
          <button aria-label="Lower level" disabled={level <= 1} onClick={() => setLevel(level - 1)}>
            ‹
          </button>
          <b>Lv {level}</b>
          <button aria-label="Higher level" disabled={level >= g.open} onClick={() => setLevel(level + 1)}>
            ›
          </button>
        </div>
      </div>
      <div class={`req ${ok ? 'ok' : 'no'}`}>
        {ok ? <Check size={16} /> : <Cross size={16} />}
        {REQUESTS[req]}
        <span class="mono" style={{ marginLeft: 'auto' }}>
          ×{GIG.requestMult}
        </span>
      </div>
      <div class="kv">
        <span class="k">You</span>
        <span class="sub">average show</span>
        <span class="mono">{num(odds.mean)}</span>
        {rivals.map((r) => (
          <>
            <span class="k" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {r.name}
            </span>
            <span class="sub">rival</span>
            <span class="mono">≈{num(target * r.mult)}</span>
          </>
        ))}
      </div>
      <div class="place-odds" aria-label="Chance of each place">
        {odds.place.map((x, i) => (
          <div key={i} class={i === 0 ? 'p1' : ''}>
            <b>{pct(x)}</b>
            <small>{ORD[i]}</small>
          </div>
        ))}
      </div>
      <button class="btn wide big" disabled={game.bookings <= 0} onClick={play}>
        Play the gig
      </button>
    </div>
  );
}

// ── O show ao vivo ──────────────────────────────────────────────────────────

const GRADE_BG = ['var(--panel3)', 'var(--rare)', 'var(--epic)', 'var(--legend)'];

export function ShowOverlay() {
  const s = ui.show!;
  const { run } = s;
  const v = VENUES.find((x) => x.id === run.venue)!;
  const shown = s.done ? run.bars.length : s.shown;
  const bar = shown > 0 ? run.bars[shown - 1] : null;
  const t = G.tonicOf(game);
  const mine = run.bars.slice(0, shown).reduce((a, b) => a + b.score, 0);
  const lines = [{ name: 'You', score: mine, me: true }, ...run.rivals.map((r) => ({ name: r.name, score: r.bars.slice(0, shown).reduce((a, x) => a + x, 0), me: false }))];
  const ranked = [...lines].sort((a, b) => b.score - a.score);
  const gi = bar ? GRADES.findIndex((g) => g.id === bar.grade) : 0;
  return (
    <div class="overlay" role="dialog" aria-label="Gig">
      <div class="top-row">
        <div>
          <div class="eyebrow">{v.name}</div>
          <div class="ttl">Level {run.level}</div>
        </div>
        {!s.done && (
          <button class="skip" onClick={skipShow}>
            Skip
          </button>
        )}
      </div>
      {!s.done ? (
        <>
          <div class="show-stage">
            <div class="roman" style={{ color: bar ? `var(--${['tonic', 'sub', 'dom'][fnColor(fnOf(CHORD[bar.id]))]})` : 'var(--dim)' }}>{bar ? roman(CHORD[bar.id]) : 'Ready'}</div>
            <div class="cname" key={shown}>
              {bar ? chordName(CHORD[bar.id], t) : '…'}
            </div>
            <div class="math">
              {bar && (
                <>
                  <span class="ch">{bar.chips.toFixed(1)}</span>
                  <span class="eq">×</span>
                  <span class="mu">{bar.mult.toFixed(2)}</span>
                  {gi > 0 && (
                    <>
                      <span class="eq">×</span>
                      <span class="gr" style={{ background: GRADE_BG[gi] }}>
                        {GRADES[gi].mult}
                      </span>
                    </>
                  )}
                  <span class="eq">=</span>
                  <span>{num(bar.score)}</span>
                </>
              )}
            </div>
            <div class="sub mono" style={{ marginTop: 4 }}>
              bar {shown}/{run.bars.length}
            </div>
          </div>
          <div class={`req ${run.requestOk ? 'ok' : 'no'}`} style={{ marginTop: 10 }}>
            {run.requestOk ? <Check size={16} /> : <Cross size={16} />} {REQUESTS[run.request]}
          </div>
        </>
      ) : (
        <Result />
      )}
      <div class="board" style={{ height: 4 * 58 }}>
        {lines.map((l) => {
          const pos = ranked.indexOf(l);
          return (
            <div key={l.name} class={`line${l.me ? ' me' : ''}`} style={{ transform: `translateY(${pos * 58}px)` }}>
              <span class="pos">{pos + 1}</span>
              <span class="nm">{l.name}</span>
              <span class="pts">{num(l.score)}</span>
            </div>
          );
        })}
      </div>
      {s.done && (
        <div style={{ display: 'grid', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
          {run.reward.crate && (
            <button class="btn wide big" onClick={() => (endShow(), setUi({ screen: 'studio', studioTab: 'crates' }))}>
              Open the {CRATES[run.reward.crate].name}
            </button>
          )}
          <button class={`btn wide big ${run.reward.crate ? 'ghost' : ''}`} onClick={endShow}>
            {run.place === 1 ? 'Collect' : 'Back to rehearsal'}
          </button>
        </div>
      )}
    </div>
  );
}

function Result() {
  const { run } = ui.show!;
  const res = VENUES.find((x) => x.id === run.venue)!.res;
  const ResIcon = res ? RES_ICON[res] : null;
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      <div class="result-place" style={{ color: run.place === 1 ? 'var(--legend)' : run.place === 2 ? 'var(--common)' : 'var(--dim)' }}>
        {ORD[run.place - 1]}
      </div>
      <div class="rewards">
        <span class="reward">
          <Heart /> +{run.reward.fans}
        </span>
        {ResIcon && run.reward.res > 0 && (
          <span class="reward">
            <ResIcon /> +{run.reward.res}
          </span>
        )}
        {run.reward.crate && (
          <span class="reward">
            <Crate size={22} tier={['wooden', 'vinyl', 'gold', 'platinum'].indexOf(run.reward.crate)} /> {CRATES[run.reward.crate].name}
          </span>
        )}
        {run.reward.records > 0 && (
          <span class="reward">
            <Record size={18} /> +{run.reward.records}
          </span>
        )}
      </div>
      {run.reward.levelUp && <div class="sub" style={{ textAlign: 'center' }}>Level {run.level + 1} open</div>}
    </div>
  );
}
