// Folhas e cenas por cima da tela: (i), bem-vindo de volta, progressão nova, lugar novo, ajustes,
// item, caixote carta a carta e o Jam.
import { useEffect, useState } from 'preact/hooks';
import { CHORD, CRATES, DISCOVERY, INST, PROG, RARITY, STATS, type InstId } from '../content';
import { duration, money, num } from '../format';
import * as G from '../game';
import { equip, itemName, itemSlot, lootRarity, scrap, scrapValue, unequip, type Loot } from '../gear';
import { act, game, replaceGame, resetGame, setUi, ui } from '../store';
import { nextNews } from '../unlock';
import { closeJam, jamTap } from '../conductor';
import { prefs, savePrefs } from '../audio/engine';
import { sfx } from '../audio/sfx';
import * as fx from '../fx';
import { exportCode, importCode } from '../save';
import { absPcs, chordName, roman, spellIn } from '../theory';
import { JAM } from '../content';
import { Modal, Rarity, Sheet, TwoTap } from './common';
import { ItemSheetBody } from './band';
import { Crate, Fire, INST_ICON, Note, Pick, RES_ICON, Record, Spark } from './icons';

// ── (i) ─────────────────────────────────────────────────────────────────────

const PAGES: Record<string, [string, string[]]> = {
  loop: [
    'The loop',
    [
      'Your band plays these bars forever, even with the app closed.',
      'Harmony (0–100) scores how each chord flows into the next, how many different chords you use, whether the loop has a home chord, and any cadences or famous progressions inside it.',
      'Chords away from home build tension. When the loop lands on the tonic, the tension releases and that bar pays more (the ×1.43 on the slot).',
      'The strip under each bar is its chance of a Sweet, Soaring or Transcendent bar.',
    ],
  ],
  picker: [
    'Choosing a chord',
    [
      'The number on each chord is how much Harmony changes if you put it here.',
      'Strong moves: a fifth down (V → I, ii → V), shared notes, and small steps in every voice.',
      'Dominant chords (red) pull home hardest. Put one right before the tonic for the biggest release.',
    ],
  ],
  notes: [
    'Notes',
    [
      'Every bar, the chord drops its own notes: C major drops C, E and G. The root drops double, because the bass doubles it.',
      'Each musician in the band adds to the drop. Rare bars drop much more.',
      'Notes learn chords, raise instruments and open modes. Notes outside the key come from other keys, crates and the Jam.',
    ],
  ],
  band: [
    'The band',
    [
      'Tone is the sum of every instrument. It sets how much each bar pays.',
      'Bass gives Depth (bigger releases). Flute gives Feel (more rare bars). Strings give Sustain (better offline). Drums set the top tempo.',
      'At level 10 an instrument can go up in rarity with the notes of its signature: the guitar asks for its open strings.',
    ],
  ],
  tempo: ['Tempo', ['Faster tempo means more bars per minute: more tips, more notes, more luck rolls.', 'Your drummer sets the limit. Slow songs still win some rooms.']],
  gigs: [
    'Gigs',
    [
      'A gig plays two laps of your loop live against three bands. Every bar scores Tone × Harmony × Release, and a rare bar multiplies it.',
      'Each level has a fixed bar to beat. The chances shown come from 300 simulated shows with your real odds.',
      'Meet the judges’ request for ×1.5. Each room pays in its own resource. Bookings refill over time.',
    ],
  ],
  keys: [
    'Keys',
    [
      'Each step clockwise on the circle of fifths adds one sharp: G major is C major with F♯.',
      'Every key you own adds 10% to all tips, and lets you farm its notes.',
      'Chords keep their numbers in any key: vi is A minor in C and E minor in G.',
    ],
  ],
  songbook: [
    'Songbook',
    [
      'Famous progressions hide inside loops. Play one and it goes in the book.',
      'Every progression you keep playing levels up its mastery. Each star adds 2% to all tips, forever.',
    ],
  ],
  workbench: [
    'Workbench',
    [
      'Push a piece of gear from +1 to +15. The first three are sure; after that the chance drops.',
      'Every fail adds Practice: the next try is easier, until you land it.',
      'At +3, +6, +9 and +12 the piece gains a new stat or raises one.',
    ],
  ],
  gear: ['Gear', ['Each instrument has a Pedal and an Accessory slot. Tone on a piece raises that instrument; other stats count for the whole band.']],
  songs: [
    'Recording',
    [
      'Record the loop as a song. Mastering decides the pressing: Demo, Single, Hit or Classic. Feel pushes the odds up.',
      'Songs in the setlist pay royalties every hour, even offline.',
    ],
  ],
  charts: ['Charts', ['Your setlist’s strength sets your chart position. Reaching the top 100, 50, 20, 10 and 1 pays Gold Records once.']],
  setlist: ['Setlist', ['Five songs at most. Only songs in the setlist pay royalties and count for the charts.']],
  records: ['Gold Records', ['Earned from Transcendent bars, discoveries, milestones and first wins. Never sold.', 'Spend them on short boosts or a Roadie for longer offline play.']],
  'tier-triads': ['Triads', ['Three notes, stacked in thirds. The seven chords of the key: I, ii, iii, IV, V, vi and vii°.']],
  'tier-sevenths': ['Sevenths', ['Add one more third on top. More color, more tension, and a bigger release when it resolves.']],
  'tier-borrowed': ['Borrowed chords', ['Chords from the parallel minor key: iv, ♭VI, ♭VII. They bring notes from outside the key and darker colors.']],
  'tier-applied': ['Applied dominants', ['A dominant for any chord: V7/V points at V. Played right before its target, it pulls harder than anything.']],
  'tier-color': ['Color chords', ['The Neapolitan (♭II), the tritone substitute (♭II7), sus and add9 chords, the Lydian II.']],
  jam: ['Jam', ['Tap notes on the beat. Chord notes score full; a note outside the chord scores when the next one resolves it by step.', 'Your score becomes Hype: more tips and more luck for three minutes.']],
};

export function InfoSheet() {
  const [title, lines] = PAGES[ui.info!] ?? ['', []];
  return (
    <Sheet onClose={() => setUi({ info: null })} title={<h3>{title}</h3>}>
      <div style={{ display: 'grid', gap: 10, color: 'var(--dim)', lineHeight: 1.5 }}>
        {lines.map((l, i) => (
          <p key={i} style={{ margin: 0 }}>
            {l}
          </p>
        ))}
      </div>
    </Sheet>
  );
}

// ── Bem-vindo de volta ──────────────────────────────────────────────────────

export function Welcome() {
  const w = ui.welcome!;
  const t = G.tonicOf(game);
  const top = w.notes.map((n, pc) => [pc, n] as const).filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <Modal>
      <div class="eyebrow">While you were away</div>
      <h3>{num(w.bars)} bars played</h3>
      <div class="rewards">
        <span class="reward">{money(w.tips + w.royalties)}</span>
        {w.fans >= 1 && <span class="reward">+{num(w.fans)} fans</span>}
        {top.map(([pc, n]) => (
          <span key={pc} class="reward">
            <Note size={14} /> +{num(n)} {spellIn(pc, t, game.mode)}
          </span>
        ))}
      </div>
      <p class="mono">{duration(w.seconds)}</p>
      <button
        class="btn big"
        onClick={() => {
          sfx.coin();
          setUi({ welcome: null });
        }}
      >
        Collect
      </button>
    </Modal>
  );
}

// ── Progressão nova ─────────────────────────────────────────────────────────

export function DiscoveryModal() {
  const id = ui.discover[0];
  const p = PROG[id];
  useEffect(() => {
    sfx.reveal(p.rarity);
    if (p.rarity >= 2) fx.flash('rgba(195,140,255,.35)');
  }, [id]);
  const next = () => setUi({ discover: ui.discover.slice(1) });
  return (
    <Modal onClose={next}>
      <div class="eyebrow">New progression</div>
      <h3>{p.name}</h3>
      <Rarity r={p.rarity} />
      <p class="mono" style={{ color: 'var(--text)', fontSize: 18 }}>
        {p.seq.join(' – ')}
      </p>
      <div class="rewards">
        <span class="reward">+{DISCOVERY.fans[p.rarity]} fans</span>
        <span class="reward">
          <Record size={16} /> +{DISCOVERY.records[p.rarity]}
        </span>
        <span class="reward">+{DISCOVERY.tipsBars[p.rarity]} bars of tips</span>
      </div>
      <button class="btn big" onClick={next}>
        Keep playing
      </button>
    </Modal>
  );
}

// ── Lugar novo ──────────────────────────────────────────────────────────────

export function NewsModal() {
  const p = nextNews(game)!;
  const seen = () => act((s) => s.seen.push(p.id));
  useEffect(() => {
    sfx.discover(G.modeScale(game));
  }, [p.id]);
  return (
    <Modal>
      <div class="eyebrow" style={{ textAlign: 'center', color: 'var(--tonic)' }}>
        New place
      </div>
      <div class="news-art">
        <Spark size={44} />
      </div>
      <h3 style={{ textAlign: 'center' }}>{p.name}</h3>
      <p style={{ textAlign: 'center' }}>{p.line}</p>
      <button
        class="btn big sub"
        onClick={() => {
          seen();
          setUi({ screen: p.screen, theoryTab: p.id === 'keys' ? 'keys' : p.id === 'modes' ? 'modes' : ui.theoryTab, studioTab: p.id === 'studio' ? 'songs' : ui.studioTab });
        }}
      >
        Take me there
      </button>
      <button class="link" onClick={seen}>
        Later
      </button>
    </Modal>
  );
}

// ── Ajustes ─────────────────────────────────────────────────────────────────

export function Settings() {
  const [code, setCode] = useState('');
  const [, force] = useState(0);
  const set = (k: 'muted' | 'haptics', v: boolean) => {
    prefs[k] = v;
    savePrefs();
    force((x) => x + 1);
  };
  const vol = (k: 'music' | 'sfx', v: number) => {
    prefs[k] = v;
    savePrefs();
    force((x) => x + 1);
  };
  return (
    <Sheet onClose={() => setUi({ settings: false })} title={<h3>Settings</h3>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <label class="row">
          <span class="grow">Sound</span>
          <input type="checkbox" checked={!prefs.muted} onChange={(e) => set('muted', !(e.target as HTMLInputElement).checked)} style={{ width: 24, height: 24 }} />
        </label>
        <label class="row">
          <span class="grow">Music</span>
          <input type="range" min="0" max="1" step="0.05" value={prefs.music} onInput={(e) => vol('music', +(e.target as HTMLInputElement).value)} />
        </label>
        <label class="row">
          <span class="grow">Effects</span>
          <input type="range" min="0" max="1" step="0.05" value={prefs.sfx} onInput={(e) => vol('sfx', +(e.target as HTMLInputElement).value)} />
        </label>
        <label class="row">
          <span class="grow">Vibration</span>
          <input type="checkbox" checked={prefs.haptics} onChange={(e) => set('haptics', (e.target as HTMLInputElement).checked)} style={{ width: 24, height: 24 }} />
        </label>
        <div class="tier-h">Backup</div>
        <button
          class="btn ghost"
          onClick={async () => {
            const c = exportCode(game);
            try {
              await navigator.clipboard.writeText(c);
              fx.toast('Backup code copied');
            } catch {
              setCode(c);
            }
          }}
        >
          Copy backup code
        </button>
        <textarea value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} placeholder="Paste a backup code" rows={3} style={{ background: 'var(--panel2)', color: 'var(--text)', border: 0, borderRadius: 12, padding: 10, font: '12px var(--mono)' }} />
        <button
          class="btn ghost"
          disabled={!code.trim()}
          onClick={() => {
            const s = importCode(code, Date.now());
            if (!s) return fx.toast('That code did not work');
            replaceGame(s);
            fx.toast('Save loaded');
            setUi({ settings: false });
          }}
        >
          Load code
        </button>
        <div class="tier-h">Danger</div>
        <TwoTap label="Reset progress" confirm="Tap again to reset" class="dom" onConfirm={resetGame} />
        <div class="sub mono" style={{ textAlign: 'center' }}>
          Tonic {__APP_VERSION__}
        </div>
      </div>
    </Sheet>
  );
}

// ── Item ────────────────────────────────────────────────────────────────────

export function ItemSheet() {
  const it = game.items.find((x) => x.uid === ui.item);
  if (!it) return null;
  const close = () => setUi({ item: null });
  const own = (Object.keys(INST) as InstId[]).filter((id) => game.inst[id].own);
  return (
    <Sheet
      onClose={close}
      title={
        <>
          <h3>
            {itemName(it)} <span class="plus">+{it.plus}</span>
          </h3>
          <span class="sp">
            <Rarity r={it.r} />
          </span>
        </>
      }
    >
      <ItemSheetBody uid={it.uid} />
      <div class="tier-h">Equip on</div>
      <div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {own.map((id) => {
          const Ic = INST_ICON[id];
          const on = it.on === id;
          return (
            <button
              key={id}
              class={`btn ${on ? '' : 'ghost'}`}
              onClick={() => {
                act((s) => (on ? unequip(s, it.uid) : equip(s, it.uid, id)));
                sfx.buy();
              }}
            >
              <Ic size={18} /> {INST[id].short}
            </button>
          );
        })}
      </div>
      <div class="row" style={{ marginTop: 12 }}>
        <span class="grow sub">
          Scrap for <Pick size={13} /> {scrapValue(it)}
        </span>
        <TwoTap
          label="Scrap"
          confirm="Tap again"
          onConfirm={() => {
            const v = act((s) => scrap(s, it.uid));
            fx.toast(`+${v} picks`);
            close();
          }}
        />
      </div>
      <div class="sub" style={{ marginTop: 8 }}>
        {STATS[G.itemMain(it)]} · slot {itemSlot(it) === 0 ? 'Pedal' : 'Accessory'}
      </div>
    </Sheet>
  );
}

// ── Caixote carta a carta ───────────────────────────────────────────────────

const RCOL = ['var(--common)', 'var(--rare)', 'var(--epic)', 'var(--legend)'];

export function CrateOverlay() {
  const c = ui.crate!;
  const tierIdx = ['wooden', 'vinyl', 'gold', 'platinum'].indexOf(c.tier);
  useEffect(() => {
    if (c.phase !== 'shake') return;
    [0, 200, 400, 600].forEach((ms, i) => setTimeout(() => sfx.tick(i * 2), ms));
    const id = setTimeout(() => setUi({ crate: { ...c, phase: 'cards' } }), 900);
    return () => clearTimeout(id);
  }, [c.phase]);
  const flip = (i: number) => {
    if (i !== c.flipped) return;
    const l = c.loot[i];
    sfx.reveal(lootRarity(l));
    const r = lootRarity(l);
    if (r >= 2) fx.flash(r >= 3 ? 'rgba(243,228,126,.5)' : 'rgba(195,140,255,.35)');
    if (r >= 3) fx.shake(6);
    const flipped = c.flipped + 1;
    setUi({ crate: { ...c, flipped }, suspense: flipped < c.loot.length });
  };
  const all = () => {
    const best = Math.max(...c.loot.slice(c.flipped).map(lootRarity));
    sfx.reveal(best);
    setUi({ crate: { ...c, flipped: c.loot.length }, suspense: false });
  };
  const done = c.flipped >= c.loot.length;
  return (
    <div class="overlay" role="dialog" aria-label={CRATES[c.tier].name}>
      <div class="top-row">
        <div>
          <div class="eyebrow">Crate</div>
          <div class="ttl">{CRATES[c.tier].name}</div>
        </div>
        {c.phase === 'cards' && !done && (
          <button class="skip" onClick={all}>
            Reveal all
          </button>
        )}
      </div>
      {c.phase === 'shake' ? (
        <div class="crate-box shake">
          <Crate size={160} tier={tierIdx} />
        </div>
      ) : (
        <div class={`cards${c.loot.length > 3 ? ' small-cards' : ''}`}>
          {c.loot.map((l, i) => {
            const r = lootRarity(l);
            const flipped = i < c.flipped;
            return (
              <button key={i} class={`lcard${flipped ? ' flip' : ''}`} onClick={() => flip(i)} aria-label={flipped ? 'Card' : 'Flip card'}>
                <div class="in">
                  <div class={`face back${!flipped && i === c.flipped && r > 0 ? ' glow' + r : ''}`} />
                  <div class={`face front r${r}`}>
                    <LootFace l={l} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {done && (
        <button class="btn wide big" style={{ marginTop: 'auto' }} onClick={() => setUi({ crate: null, suspense: false })}>
          Done
        </button>
      )}
    </div>
  );
}

function LootFace(p: { l: Loot }) {
  const l = p.l;
  const t = G.tonicOf(game);
  if (l.kind === 'gear')
    return (
      <>
        <span style={{ color: RCOL[l.item.r] }}>
          <Spark size={40} />
        </span>
        <span class="nm">{itemName(l.item)}</span>
        <span class={`rarity c${l.item.r}`}>{RARITY[l.item.r]}</span>
        <span class="st">
          {STATS[G.itemMain(l.item)]} +{G.itemMainValue(l.item).toFixed(1)}%
        </span>
      </>
    );
  if (l.kind === 'notes')
    return (
      <>
        <Note size={40} />
        <span class="nm display" style={{ fontSize: 28 }}>
          {spellIn(l.pc, t, game.mode)}
        </span>
        <span class="st">+{l.n} notes</span>
      </>
    );
  if (l.kind === 'res') {
    const Ic = RES_ICON[l.res];
    return (
      <>
        <Ic size={40} />
        <span class="nm">+{l.n}</span>
        <span class="st">{{ picks: 'Picks', sheet: 'Sheet Music', tape: 'Tape' }[l.res]}</span>
      </>
    );
  }
  return (
    <>
      <Record size={44} />
      <span class="nm">+{l.n}</span>
      <span class="st">Gold Records</span>
    </>
  );
}

// ── Jam ─────────────────────────────────────────────────────────────────────

export function JamOverlay() {
  const j = ui.jam!;
  const t = G.tonicOf(game);
  const scale = G.modeScale(game);
  const chord = ui.bar ? absPcs(CHORD[ui.bar.id], t) : [];
  const score = Math.round(j.state.score);
  const left = Math.max(0, JAM.bars - j.bars);
  return (
    <div class="overlay" role="dialog" aria-label="Jam">
      <div class="top-row">
        <div>
          <div class="eyebrow">Jam</div>
          <div class="ttl">{j.done ? 'Session over' : `${left} bars left`}</div>
        </div>
        {!j.done && (
          <button class="skip" onClick={closeJam}>
            Stop
          </button>
        )}
      </div>
      <div class="show-stage" style={{ marginTop: 6 }}>
        <div class="roman">{ui.bar ? roman(CHORD[ui.bar.id]) : ''}</div>
        <div class="cname">{ui.bar ? chordName(CHORD[ui.bar.id], t) : '…'}</div>
        <div class="metro beats">
          {[0, 1, 2, 3].map((k) => (
            <i key={k} class={ui.beat === k ? 'on' : ''} />
          ))}
        </div>
      </div>
      <div class="hype" style={{ marginTop: 12 }}>
        <Fire size={20} />
        <div class="bar">
          <i style={{ width: `${Math.min(100, j.done ? j.hype : (j.state.score / (JAM.bars * 4 * JAM.points.perfect * JAM.par)) * 100)}%` }} />
        </div>
        <span class="mono">{j.done ? `${j.hype}%` : score}</span>
      </div>
      <div class="row sub mono" style={{ justifyContent: 'center', gap: 14, marginTop: 8 }}>
        <span>perfect {j.state.counts.perfect}</span>
        <span>great {j.state.counts.great}</span>
        <span>combo {j.state.combo}</span>
      </div>
      {j.done ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
          <p class="sub" style={{ textAlign: 'center' }}>
            Hype {j.hype}% for 3 minutes · +{j.hype}% tips and Feel
          </p>
          <button class="btn wide big" onClick={closeJam}>
            Back to the stage
          </button>
        </div>
      ) : (
        <div class="jam-keys">
          {scale.map((pc) => (
            <button key={pc} class={chord.includes(pc) ? 'ct' : ''} onPointerDown={(e) => jamTap(pc, e.currentTarget)}>
              <span class="l">{spellIn(pc, t, game.mode)}</span>
              <small>{chord.includes(pc) ? 'chord' : ''}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
