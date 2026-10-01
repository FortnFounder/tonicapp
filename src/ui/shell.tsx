// Casca: abertura (toque que liga o som), HUD e dock.
import { INSTRUMENTS } from '../content';
import { num } from '../format';
import { boot } from '../conductor';
import { game, setUi, ui } from '../store';
import { nextNews, screenOpen, type Screen } from '../unlock';
import { Rolling } from './common';
import { Band, Coin, Gear, Heart, INST_ICON, Mic, Record, Stage, Studio, Theory } from './icons';

export function StartScreen() {
  return (
    <div class="start">
      <div class="in">
        <div class="tag">A band that never stops</div>
        <h1>Tonic</h1>
        <div class="icons">
          {INSTRUMENTS.map((i) => {
            const Ic = INST_ICON[i.id];
            return <Ic key={i.id} size={28} />;
          })}
        </div>
        <button class="btn big" onClick={boot}>
          Start the band
        </button>
      </div>
    </div>
  );
}

export function Hud() {
  return (
    <header class="hud">
      <div class="brand">Tonic</div>
      <div class="stat" aria-label="Tips" id="hud-tips">
        <Coin />
        <Rolling value={game.tips} />
      </div>
      <div class="stat" aria-label="Fans" id="hud-fans">
        <Heart />
        {num(Math.floor(game.fans))}
      </div>
      <div class="stat" aria-label="Gold Records" id="hud-records">
        <Record size={17} />
        {num(Math.floor(game.records))}
      </div>
      <button class="iconbtn" aria-label="Settings" onClick={() => setUi({ settings: true })}>
        <Gear />
      </button>
    </header>
  );
}

const TABS: { id: Screen; name: string; Icon: (p: { size?: number }) => preact.JSX.Element }[] = [
  { id: 'stage', name: 'Stage', Icon: Stage },
  { id: 'theory', name: 'Theory', Icon: Theory },
  { id: 'band', name: 'Band', Icon: Band },
  { id: 'gigs', name: 'Gigs', Icon: Mic },
  { id: 'studio', name: 'Studio', Icon: Studio },
];

export function Dock() {
  const news = nextNews(game);
  return (
    <nav class="dock" aria-label="Screens">
      {TABS.map((t) => {
        const open = screenOpen(game, t.id);
        return (
          <button key={t.id} class={(ui.screen === t.id ? 'on' : '') + (open ? '' : ' locked')} disabled={!open} aria-current={ui.screen === t.id} onClick={() => setUi({ screen: t.id, picker: null })}>
            <t.Icon />
            {t.name}
            {news && news.screen === t.id && ui.screen !== t.id && <span class="badge" />}
          </button>
        );
      })}
    </nav>
  );
}
