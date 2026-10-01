// Band: os 6 instrumentos (comprar, afinar, subir raridade, Mastery), o equipamento de cada um e o andamento.
import { GEAR_KINDS, INSTRUMENTS, MASTERY, MAX_LEVEL, RARITY, RARITY_MULT, SLOT_NAMES, STATS, TEMPOS, TEMPO_CAP, TEMPO_COST, type InstDef, type InstId } from '../content';
import { money, pct } from '../format';
import * as G from '../game';
import { itemName, itemSlot } from '../gear';
import { act, game, setUi } from '../store';
import { isOpen } from '../unlock';
import { sfx } from '../audio/sfx';
import * as fx from '../fx';
import { LockLine, NoteCost, Pips, Rarity, SecHead } from './common';
import { coachOn } from '../coach';
import { Amp, INST_ICON, Pedal, Sheet as SheetIcon } from './icons';

export function BandScreen() {
  const now = Date.now();
  return (
    <>
      <section class="card">
        <SecHead title="The band" info="band">
          <span class="sp mono sub">Tone {G.tone(game).toFixed(1)}</span>
        </SecHead>
        <div class="kv">
          <span class="k">Feel</span>
          <span class="sub">rare bars ×{(1 + G.feel(game, now)).toFixed(2)}</span>
          <span class="mono">+{pct(G.feel(game, now))}</span>
          <span class="k">Depth</span>
          <span class="sub">release</span>
          <span class="mono">+{pct(G.depth(game))}</span>
          <span class="k">Sustain</span>
          <span class="sub">offline {pct(G.offlineEff(game))}</span>
          <span class="mono">+{pct(G.sustain(game))}</span>
          {G.echo(game) > 0 && (
            <>
              <span class="k">Echo</span>
              <span class="sub">notes</span>
              <span class="mono">+{pct(G.echo(game))}</span>
            </>
          )}
          {G.stage(game) > 0 && (
            <>
              <span class="k">Stage</span>
              <span class="sub">gigs</span>
              <span class="mono">+{pct(G.stage(game))}</span>
            </>
          )}
        </div>
      </section>
      {INSTRUMENTS.map((i) => (
        <InstCard key={i.id} d={i} />
      ))}
      <TempoCard />
    </>
  );
}

function statLine(id: InstId): string {
  const it = game.inst[id];
  if (!it.own) return '';
  if (id === 'drums') return `Tempo up to ${TEMPO_CAP[it.r + 1]} BPM`;
  if (id === 'bass') return `Depth from bass`;
  if (id === 'flute') return `Feel from lead`;
  if (id === 'strings') return `Sustain from pad`;
  return '';
}

function InstCard(p: { d: InstDef }) {
  const { d } = p;
  const it = game.inst[d.id];
  const Ic = INST_ICON[d.id];
  let action;
  if (!it.own) {
    action = (
      <button class={`btn${d.id === 'drums' ? coachOn('hire-drums') : ''}`} disabled={game.tips < d.buy} onClick={() => (act((s) => G.buyInst(s, d.id)) ? (sfx.buy(), fx.toast(`${d.short} joins the band`)) : sfx.deny())}>
        Hire <span class="mono">{money(d.buy)}</span>
      </button>
    );
  } else if (it.q < MAX_LEVEL) {
    const c = G.tuneCost(game, d.id);
    action = (
      <button class="btn ghost" disabled={game.tips < c} onClick={() => (act((s) => G.tune(s, d.id)) ? sfx.buy() : sfx.deny())}>
        Tune to {it.q + 1} <span class="mono">{money(c)}</span>
      </button>
    );
  } else if (it.r < 3) {
    const c = G.rarityCost(game, d.id);
    const can = c.notes ? G.canPayNotes(game, c.notes) : game.tips >= c.tips;
    action = (
      <>
        {c.notes && <NoteCost cost={c.notes} />}
        <button
          class="btn epic"
          disabled={!can}
          onClick={() => {
            if (!act((s) => G.rarityUp(s, d.id))) return sfx.deny();
            sfx.reveal(game.inst[d.id].r);
            fx.flash(['', 'rgba(105,169,255,.35)', 'rgba(195,140,255,.4)', 'rgba(243,228,126,.5)'][game.inst[d.id].r]);
            fx.toast(`${d.short} is now ${RARITY[game.inst[d.id].r]}`);
          }}
        >
          Make {RARITY[it.r + 1]} {!c.notes && <span class="mono">{money(c.tips)}</span>}
        </button>
      </>
    );
  } else if (it.stars < MASTERY.cost.length) {
    const open = isOpen(game, 'conservatory');
    const ch = G.masteryChance(game, d.id);
    action = open ? (
      <div class="row">
        <div class="grow sub">
          <SheetIcon size={14} /> {MASTERY.cost[it.stars]} · {money(MASTERY.tips[it.stars])} · {pct(ch)}
        </div>
        <button
          class="btn epic"
          disabled={game.res.sheet < MASTERY.cost[it.stars] || game.tips < MASTERY.tips[it.stars]}
          onClick={() => {
            const r = act((s) => G.trainMastery(s, d.id, Math.random));
            if (r === 'ok') {
              sfx.success(2);
              fx.toast(`${d.short} ★${game.inst[d.id].stars}`);
            } else if (r === 'fail') {
              sfx.fail();
              fx.toast('Not yet · Practice +1');
            } else sfx.deny();
          }}
        >
          Train ★{it.stars + 1}
        </button>
      </div>
    ) : null;
  } else action = <span class="sub">Mastered</span>;

  return (
    <div class={`card${it.own ? '' : ' locked'}`}>
      <div class="row">
        <div class="ico" style={{ color: it.own ? 'var(--text)' : 'var(--faint)' }}>
          <Ic />
        </div>
        <div class="grow">
          <div class="ttl">
            {d.name} {it.stars > 0 && <span class="stars">{'★'.repeat(it.stars)}</span>}
          </div>
          {it.own ? (
            <div class="row" style={{ gap: 8 }}>
              <Rarity r={it.r} />
              <Pips n={it.q} of={MAX_LEVEL} r={it.r} />
            </div>
          ) : (
            <div class="sub">{d.stat}</div>
          )}
        </div>
        {it.own && <span class="mono sub">×{G.power(game, d.id).toFixed(2)}</span>}
      </div>
      {it.own && statLine(d.id) && <div class="sub">{statLine(d.id)}</div>}
      {it.own && isOpen(game, 'workbench') && <GearSlots id={d.id} />}
      {action}
      {it.own && it.q >= MAX_LEVEL && it.r < 3 && <div class="sub mono">next ×{(d.base * RARITY_MULT[it.r + 1]).toFixed(1)} at level 1</div>}
    </div>
  );
}

function GearSlots(p: { id: InstId }) {
  const it = game.inst[p.id];
  return (
    <div class="row" style={{ gap: 8 }}>
      {[0, 1].map((slot) => {
        const uid = it.gear[slot];
        const item = game.items.find((x) => x.uid === uid);
        const Ic = slot === 0 ? Pedal : Amp;
        return (
          <button key={slot} class="item-row" style={{ flex: 1, background: 'var(--panel2)' }} onClick={() => (item ? setUi({ item: item.uid }) : setUi({ screen: 'studio', studioTab: 'workbench' }))}>
            <span class="ico" style={{ color: item ? `var(--${['common', 'rare', 'epic', 'legend'][item.r]})` : 'var(--faint)' }}>
              <Ic />
            </span>
            <span class="grow" style={{ fontSize: 13 }}>
              {item ? (
                <>
                  <b>{itemName(item)}</b> <span class="plus">+{item.plus}</span>
                  <div class="sub">{STATS[GEAR_KINDS[item.kind].main]}</div>
                </>
              ) : (
                <span class="sub">{SLOT_NAMES[slot]}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TempoCard() {
  const cap = G.tempoCap(game);
  const next = game.tempoMax + 1;
  const canBuy = next <= cap && next < TEMPOS.length;
  return (
    <section class="card">
      <SecHead title="Tempo" info="tempo">
        <span class="sp mono sub">{G.bpm(game)} BPM</span>
      </SecHead>
      <div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {TEMPOS.slice(0, game.tempoMax + 1).map((b, i) => (
          <button key={b} class={`btn ${i === game.tempo ? '' : 'ghost'}`} style={{ minWidth: 56, padding: '0 10px' }} onClick={() => act((s) => G.setTempo(s, i))}>
            <span class="mono">{b}</span>
          </button>
        ))}
      </div>
      {canBuy ? (
        <button class="btn wide" disabled={game.tips < TEMPO_COST[game.tempoMax]} onClick={() => (act((s) => G.buyTempo(s)) ? sfx.buy() : sfx.deny())}>
          {TEMPOS[next]} BPM <span class="mono">{money(TEMPO_COST[game.tempoMax])}</span>
        </button>
      ) : next < TEMPOS.length ? (
        <LockLine text={game.inst.drums.own ? `${RARITY[Math.min(3, game.inst.drums.r + 1)]} drums for ${TEMPOS[next]} BPM` : `Drums for ${TEMPOS[next]} BPM`} />
      ) : (
        <span class="sub">Top speed</span>
      )}
    </section>
  );
}

/** Folha do item: stats, vestir num instrumento, desmanchar. */
export function ItemSheetBody(p: { uid: number }) {
  const it = game.items.find((x) => x.uid === p.uid);
  if (!it) return null;
  return (
    <div class="subs">
      <div>
        <span>{STATS[G.itemMain(it)]}</span>
        <b>+{G.itemMainValue(it).toFixed(1)}%</b>
      </div>
      {it.subs.map((sb, i) => (
        <div key={i}>
          <span>{STATS[sb.stat]}</span>
          <b>+{sb.v.toFixed(1)}%</b>
        </div>
      ))}
      <div class="sub">{SLOT_NAMES[itemSlot(it)]}</div>
    </div>
  );
}

