// Studio: Workbench (equipamento +1 a +15 com medidor), Crates, Songs (gravar, masterizar, Setlist, Charts) e Gold Records.
import { useEffect, useRef, useState } from 'preact/hooks';
import { BOOSTS, CRATES, CRATE_ORDER, GEAR, MILESTONES, OFFLINE, PRESSINGS, RARITY, ROADIE, STATS, STUDIO, type BoostId } from '../content';
import { duration, money, num, pct } from '../format';
import * as G from '../game';
import { autoEquip, enhance, enhanceBase, enhanceChance, enhanceCost, itemName, itemScore, openCrate } from '../gear';
import { act, game, setUi, ui, useNow } from '../store';
import { chartPos, chartStrength, claimCharts, pressingOdds, recordCost, recordSong, royaltiesPerHour, songQuality, toggleSetlist } from '../studio';
import { isOpen } from '../unlock';
import { sfx } from '../audio/sfx';
import * as fx from '../fx';
import { LockLine, Rarity, SecHead } from './common';
import { Amp, Check, Crate, Pedal, Pick, Record, Tape } from './icons';

const RCOL = ['var(--common)', 'var(--rare)', 'var(--epic)', 'var(--legend)'];

export function StudioScreen() {
  const tabs: { id: typeof ui.studioTab; name: string; open: boolean; dot?: boolean }[] = [
    { id: 'workbench', name: 'Workbench', open: isOpen(game, 'workbench') },
    { id: 'crates', name: 'Crates', open: isOpen(game, 'workbench'), dot: Object.values(game.crates).some((n) => n > 0) },
    { id: 'songs', name: 'Songs', open: isOpen(game, 'studio') },
    { id: 'records', name: 'Records', open: true },
  ];
  const vis = tabs.filter((t) => t.open);
  const tab = vis.some((t) => t.id === ui.studioTab) ? ui.studioTab : vis[0].id;
  return (
    <>
      <div class="seg" role="tablist">
        {vis.map((t) => (
          <button key={t.id} role="tab" class={tab === t.id ? 'on' : ''} aria-selected={tab === t.id} onClick={() => setUi({ studioTab: t.id })}>
            {t.name}
            {t.dot && tab !== t.id && <span class="dot" />}
          </button>
        ))}
      </div>
      {tab === 'workbench' && <Workbench />}
      {tab === 'crates' && <Crates />}
      {tab === 'songs' && <Songs />}
      {tab === 'records' && <Records />}
    </>
  );
}

// ── Workbench ───────────────────────────────────────────────────────────────

function Workbench() {
  const items = [...game.items].sort((a, b) => itemScore(b) - itemScore(a));
  const sel = game.items.find((x) => x.uid === ui.bench) ?? items[0];
  return (
    <>
      <section class="card">
        <SecHead title="Workbench" info="workbench">
          <span class="sp row" style={{ gap: 6 }}>
            <Pick size={16} />
            <span class="mono">{num(game.res.picks)}</span>
          </span>
        </SecHead>
        {sel ? <Bench uid={sel.uid} /> : <div class="empty">No gear yet</div>}
      </section>
      {items.length > 0 && (
        <section>
          <SecHead title="Gear" info="gear">
            <button class="btn ghost sp" onClick={() => fx.toast(act((s) => autoEquip(s)) ? 'Best gear on' : 'Already the best')}>
              Best gear
            </button>
          </SecHead>
          <div style={{ display: 'grid', gap: 6 }}>
            {items.map((it) => {
              const Ic = G.itemMain(it) === 'tone' || G.itemMain(it) === 'feel' || G.itemMain(it) === 'depth' ? Pedal : Amp;
              return (
                <button key={it.uid} class={`item-row${sel?.uid === it.uid ? ' sel' : ''}`} onClick={() => setUi({ bench: it.uid })}>
                  <span class="ico" style={{ color: RCOL[it.r] }}>
                    <Ic />
                  </span>
                  <span class="grow">
                    <b>{itemName(it)}</b> <span class="plus">+{it.plus}</span>
                    <div class="sub">
                      {STATS[G.itemMain(it)]} +{G.itemMainValue(it).toFixed(1)}% {it.on ? `· ${it.on}` : ''}
                    </div>
                  </span>
                  <span class="mono sub">{itemScore(it).toFixed(0)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function Bench(p: { uid: number }) {
  const it = game.items.find((x) => x.uid === p.uid)!;
  const [phase, setPhase] = useState<'idle' | 'spin' | 'done'>('idle');
  const needle = useRef<SVGGElement>(null);
  const res = ui.enhance && phase !== 'idle' ? ui.enhance : null;
  const chance = enhanceChance(game, it);
  const base = enhanceBase(it);
  const cost = enhanceCost(it);
  const maxed = it.plus >= GEAR.maxPlus;
  const angle = (x: number) => -90 + Math.min(1, x) * 180;

  useEffect(() => {
    if (phase !== 'spin' || !ui.enhance || !needle.current) return;
    const r = ui.enhance;
    const anim = needle.current.animate(
      [
        { transform: `rotate(${angle(0)}deg)` },
        { transform: `rotate(${angle(Math.min(1, r.roll + 0.35))}deg)`, offset: 0.45 },
        { transform: `rotate(${angle(Math.max(0, r.roll - 0.08))}deg)`, offset: 0.75 },
        { transform: `rotate(${angle(r.roll)}deg)` },
      ],
      { duration: r.chance >= 1 ? 300 : 1300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
    const ticks = r.chance >= 1 ? [] : [0, 150, 300, 450, 650, 850, 1050].map((ms, i) => setTimeout(() => sfx.tick(i), ms));
    anim.onfinish = () => finish();
    return () => {
      ticks.forEach(clearTimeout);
      anim.cancel();
    };
  }, [phase, ui.enhance?.at]);

  const finish = () => {
    if (phase === 'done') return;
    setPhase('done');
    setUi({ suspense: false });
    const r = ui.enhance!;
    if (r.ok) {
      const milestone = GEAR.subSteps.includes(r.plus);
      sfx.success(milestone ? 2 : 1);
      if (milestone) {
        fx.flash('rgba(56,209,174,.45)');
        fx.shake(3);
      }
    } else sfx.fail();
  };

  const go = () => {
    if (phase === 'spin') return finish();
    const r = act((s) => enhance(s, it.uid, Math.random));
    if (!r) return sfx.deny();
    setUi({ enhance: { ...r, at: Date.now() }, suspense: true });
    setPhase('spin');
  };

  return (
    <>
      <div class="row">
        <span class="ico" style={{ color: RCOL[it.r] }}>
          {G.itemMain(it) === 'tone' || G.itemMain(it) === 'feel' || G.itemMain(it) === 'depth' ? <Pedal /> : <Amp />}
        </span>
        <div class="grow">
          <div class="ttl">
            {itemName(it)} <span class="plus">+{it.plus}</span>
          </div>
          <Rarity r={it.r} />
        </div>
        <button class="btn ghost" onClick={() => setUi({ item: it.uid })}>
          Details
        </button>
      </div>
      <svg class="gauge" viewBox="0 0 200 132" onClick={() => phase === 'spin' && finish()} role="img" aria-label={`Chance ${pct(chance)}`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--panel2)" stroke-width="16" stroke-linecap="round" />
        <Arc from={0} to={Math.min(1, base)} color="var(--sub)" />
        {chance > base && <Arc from={base} to={chance} color="rgba(56,209,174,.45)" />}
        {Array.from({ length: 11 }, (_, i) => {
          const a = ((-180 + i * 18) * Math.PI) / 180;
          return <line key={i} x1={100 + Math.cos(a) * 62} y1={100 + Math.sin(a) * 62} x2={100 + Math.cos(a) * 70} y2={100 + Math.sin(a) * 70} stroke="var(--faint)" stroke-width="1.5" />;
        })}
        <g ref={needle} style={{ transformOrigin: '100px 100px', transform: `rotate(${res ? angle(res.roll) : -90}deg)` }}>
          <line x1="100" y1="100" x2="100" y2="30" stroke="var(--text)" stroke-width="3" stroke-linecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="var(--text)" />
        <text x="100" y="128" text-anchor="middle" font-family="DM Mono, monospace" font-size="16" fill="var(--text)">
          {pct(chance)}
        </text>
      </svg>
      {phase === 'done' && res ? <div class={`stamp ${res.ok ? 'ok' : 'no'}`}>{res.ok ? (GEAR.subSteps.includes(res.plus) ? `+${res.plus}!` : 'Tuned!') : 'Buzz…'}</div> : <div style={{ height: 52 }} />}
      {phase === 'done' && res?.sub && (
        <div class="sub" style={{ textAlign: 'center' }}>
          {res.sub.isNew ? 'New' : 'Up'}: {STATS[res.sub.stat]} +{res.sub.v.toFixed(1)}%
        </div>
      )}
      {(game.practice['item:' + it.uid] ?? 0) > 0 && chance > base && (
        <div class="sub" style={{ textAlign: 'center' }}>
          Practice +{pct(chance - base)}
        </div>
      )}
      {maxed ? (
        <div class="sub" style={{ textAlign: 'center' }}>
          Maxed
        </div>
      ) : (
        <button class="btn wide big" disabled={phase !== 'spin' && (game.res.picks < cost.picks || game.tips < cost.tips)} onClick={go}>
          {phase === 'spin' ? (
            'Tap to skip'
          ) : (
            <>
              Tune to +{it.plus + 1}{' '}
              <span class="mono">
                {cost.picks} picks · {money(cost.tips)}
              </span>
            </>
          )}
        </button>
      )}
    </>
  );
}

function Arc(p: { from: number; to: number; color: string }) {
  const pt = (x: number) => {
    const a = Math.PI + x * Math.PI;
    return [100 + Math.cos(a) * 80, 100 + Math.sin(a) * 80];
  };
  const [x0, y0] = pt(p.from);
  const [x1, y1] = pt(p.to);
  if (p.to - p.from <= 0.001) return null;
  return <path d={`M${x0} ${y0} A80 80 0 0 1 ${x1} ${y1}`} fill="none" stroke={p.color} stroke-width="16" />;
}

// ── Crates ──────────────────────────────────────────────────────────────────

function Crates() {
  return (
    <>
      {CRATE_ORDER.map((t, i) => {
        const def = CRATES[t];
        const n = game.crates[t] ?? 0;
        return (
          <div key={t} class={`card${n ? '' : ' locked'}`}>
            <div class="row">
              <Crate size={54} tier={i} />
              <div class="grow">
                <div class="ttl">{def.name}</div>
                <div class="sub">
                  {def.cards} cards · ×{n}
                </div>
              </div>
              <button
                class="btn"
                disabled={!n}
                onClick={() => {
                  const loot = act((s) => openCrate(s, t, Math.random));
                  if (!loot) return sfx.deny();
                  setUi({ crate: { tier: t, loot, flipped: 0, phase: 'shake' }, suspense: true });
                }}
              >
                Open
              </button>
            </div>
            <div class="row" style={{ gap: 6 }}>
              {def.rarity.map((p, r) =>
                p > 0 ? (
                  <span key={r} class="chip" style={{ color: RCOL[r], borderColor: 'currentColor' }}>
                    {RARITY[r]} {pct(p)}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── Songs ───────────────────────────────────────────────────────────────────

function Songs() {
  const now = Date.now();
  const q = songQuality(game);
  const odds = pressingOdds(game, now);
  const c = recordCost(game, now);
  const pos = chartPos(game);
  const set = game.setlist.map((id) => game.songs.find((x) => x.id === id)).filter(Boolean);
  const rest = game.songs.filter((x) => !game.setlist.includes(x.id));
  const claimable = pos !== null && STUDIO.chartMilestones.some((m) => pos <= m.pos && !game.chartClaimed.includes(m.pos));
  return (
    <>
      <section class="card">
        <SecHead title="Record this loop" info="songs">
          <span class="sp mono sub">quality {q}</span>
        </SecHead>
        <PressingStrip odds={odds} />
        <div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {PRESSINGS.map((p, i) => (
            <span key={p.id} class="chip" style={{ color: RCOL[i], borderColor: 'currentColor' }}>
              {p.name} {pct(odds[i])} · ×{p.mult}
            </span>
          ))}
        </div>
        <button
          class="btn wide big"
          disabled={game.res.tape < c.tape || game.tips < c.tips}
          onClick={() => {
            const r = act((s) => recordSong(s, Math.random, Date.now()));
            if (!r) return sfx.deny();
            setUi({ record: { ...r, at: Date.now() }, suspense: true });
          }}
        >
          Record{' '}
          <span class="mono">
            <Tape size={14} /> {c.tape} · {money(c.tips)}
          </span>
        </button>
      </section>
      <section class="card">
        <SecHead title="Charts" info="charts">
          <span class="sp mono">{pos === null ? '—' : `#${pos}`}</span>
        </SecHead>
        <div class="sub mono">
          strength {num(chartStrength(game))} · {money(royaltiesPerHour(game))}/h royalties
        </div>
        <div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {STUDIO.chartMilestones.map((m) => (
            <span key={m.pos} class="chip" style={game.chartClaimed.includes(m.pos) ? { color: 'var(--sub)' } : undefined}>
              Top {m.pos} · <Record size={13} /> {m.records}
            </span>
          ))}
        </div>
        {claimable && (
          <button
            class="btn wide"
            onClick={() => {
              const n = act((s) => claimCharts(s));
              sfx.reveal(2);
              fx.toast(`+${n} Gold Records`);
            }}
          >
            Claim chart rewards
          </button>
        )}
      </section>
      <section>
        <SecHead title={`Setlist ${set.length}/${STUDIO.setlist}`} info="setlist" />
        <div style={{ display: 'grid', gap: 6 }}>
          {[...set, ...rest].map((x) => {
            const inSet = game.setlist.includes(x!.id);
            return (
              <div key={x!.id} class="item-row" style={{ opacity: inSet ? 1 : 0.6 }}>
                <span class="ico" style={{ color: RCOL[x!.pressing] }}>
                  <Record size={22} />
                </span>
                <span class="grow">
                  <b>{x!.name}</b>
                  <div class="sub">
                    {PRESSINGS[x!.pressing].name} · q{x!.quality} · {money(x!.perHour)}/h
                  </div>
                </span>
                <button class="btn ghost" onClick={() => act((s) => toggleSetlist(s, x!.id)) || sfx.deny()}>
                  {inSet ? 'Drop' : 'Add'}
                </button>
              </div>
            );
          })}
          {!game.songs.length && <div class="empty">No songs yet</div>}
        </div>
      </section>
    </>
  );
}

function PressingStrip(p: { odds: number[]; needle?: number }) {
  return (
    <div class="odds-strip">
      {p.odds.map((x, i) => (
        <i key={i} style={{ width: `${x * 100}%`, background: RCOL[i] }} />
      ))}
      {p.needle !== undefined && <span class="needle" style={{ left: `calc(${p.needle * 100}% - 1px)` }} />}
    </div>
  );
}

/** Masterização: o vinil gira, a agulha corre a faixa de chances e para no sorteio. */
export function RecordOverlay() {
  const r = ui.record!;
  const [done, setDone] = useState(false);
  const [needle, setNeedle] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setNeedle(r.roll), 60);
    const b = setTimeout(() => {
      setDone(true);
      setUi({ suspense: false });
      sfx.reveal(r.song.pressing);
      if (r.song.pressing >= 2) fx.flash(r.song.pressing === 3 ? 'rgba(243,228,126,.5)' : 'rgba(195,140,255,.4)');
    }, 1500);
    return () => (clearTimeout(a), clearTimeout(b));
  }, [r.at]);
  const p = PRESSINGS[r.song.pressing];
  return (
    <div class="overlay" role="dialog" aria-label="Mastering">
      <div class="top-row">
        <div class="eyebrow">Mastering</div>
      </div>
      <div class={`vinyl${done ? '' : ' spin'}`}>
        <div class="label" style={{ background: done ? RCOL[r.song.pressing] : 'var(--panel3)' }}>
          {done ? p.name : ''}
        </div>
      </div>
      <PressingStrip odds={r.odds} needle={needle} />
      {done && (
        <div style={{ display: 'grid', gap: 10, marginTop: 16, textAlign: 'center' }}>
          <div class="display" style={{ fontSize: 34 }}>
            {r.song.name}
          </div>
          <div class="sub mono">
            {p.name} · quality {r.song.quality} · {money(r.song.perHour)}/h
          </div>
        </div>
      )}
      <button class="btn wide big" style={{ marginTop: 'auto' }} onClick={() => (done ? setUi({ record: null }) : (setNeedle(r.roll), setDone(true), setUi({ suspense: false })))}>
        {done ? 'Done' : 'Tap to skip'}
      </button>
    </div>
  );
}

// ── Gold Records ────────────────────────────────────────────────────────────

function Records() {
  const now = useNow();
  return (
    <>
      <section class="card">
        <SecHead title="Gold Records" info="records">
          <span class="sp row" style={{ gap: 6 }}>
            <Record size={18} />
            <span class="mono">{num(Math.floor(game.records))}</span>
          </span>
        </SecHead>
        {(Object.keys(BOOSTS) as BoostId[]).map((id) => {
          const b = BOOSTS[id];
          const left = Math.max(0, (game.boosts[id] ?? 0) - now);
          return (
            <div key={id} class="row">
              <div class="grow">
                <div class="ttl">{b.name}</div>
                <div class="sub">
                  {b.what} · {b.minutes} min{left > 0 ? ` · ${duration(left / 1000)} left` : ''}
                </div>
              </div>
              <button class="btn" disabled={game.records < b.cost} onClick={() => (act((s) => G.useBoost(s, id, Date.now())) ? (sfx.reveal(1), fx.toast(`${b.name} on`)) : sfx.deny())}>
                <Record size={15} /> {b.cost}
              </button>
            </div>
          );
        })}
        <div class="row">
          <div class="grow">
            <div class="ttl">Roadie</div>
            <div class="sub">
              Offline cap {G.offlineCapHours(game)}h → {G.offlineCapHours(game) + OFFLINE.roadieHours}h
            </div>
          </div>
          {game.roadies < OFFLINE.roadieMax ? (
            <button class="btn" disabled={game.records < ROADIE.cost * (game.roadies + 1)} onClick={() => (act((s) => G.buyRoadie(s)) ? sfx.buy() : sfx.deny())}>
              <Record size={15} /> {ROADIE.cost * (game.roadies + 1)}
            </button>
          ) : (
            <span class="sub">Max</span>
          )}
        </div>
      </section>
      <section class="card">
        <SecHead title="Milestones" />
        <div class="plist">
          {MILESTONES.map((m) => {
            const got = game.milestones.includes(m.id);
            return (
              <div key={m.id} class={`pl${got ? '' : ' lock'}`}>
                <span class="grow nm">{m.name}</span>
                <span class="lv row" style={{ gap: 6 }}>
                  {got ? <Check size={16} color="var(--sub)" /> : null}
                  <Record size={14} /> {m.records}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section class="card">
        <SecHead title="Career" />
        <div class="kv">
          <span class="k">Bars</span>
          <span />
          <span class="mono">{num(game.stats.bars)}</span>
          <span class="k">Loops</span>
          <span />
          <span class="mono">{num(game.stats.loops)}</span>
          <span class="k" style={{ color: 'var(--rare)' }}>
            Sweet
          </span>
          <span />
          <span class="mono">{num(game.stats.sweet)}</span>
          <span class="k" style={{ color: 'var(--epic)' }}>
            Soaring
          </span>
          <span class="sub">next ≤ {Math.max(0, 60 - game.pity.soaring)}</span>
          <span class="mono">{num(game.stats.soaring)}</span>
          <span class="k" style={{ color: 'var(--legend)' }}>
            Transcendent
          </span>
          <span class="sub">next ≤ {Math.max(0, 500 - game.pity.transcendent)}</span>
          <span class="mono">{num(game.stats.transcendent)}</span>
          <span class="k">Best bar</span>
          <span />
          <span class="mono">{money(game.stats.bestBar)}</span>
          <span class="k">Gigs won</span>
          <span />
          <span class="mono">
            {game.stats.wins}/{game.stats.gigs}
          </span>
        </div>
      </section>
      {!isOpen(game, 'studio') && <LockLine text={`Recording Studio at 600 fans`} />}
    </>
  );
}
