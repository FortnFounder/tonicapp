import { render } from 'preact';
import './style.css';
import { act, game, setUi, ui, useStore } from './store';
import { nextNews } from './unlock';
import { Dock, Hud, StartScreen } from './ui/shell';
import { ChordPicker, StageScreen } from './ui/stage';
import { TheoryScreen } from './ui/theory';
import { BandScreen } from './ui/band';
import { GigsScreen, ShowOverlay } from './ui/gigs';
import { RecordOverlay, StudioScreen } from './ui/studio';
import { CrateOverlay, DiscoveryModal, InfoSheet, ItemSheet, JamOverlay, NewsModal, Settings, Welcome } from './ui/overlays';

function App() {
  useStore();
  const screen = {
    stage: <StageScreen />,
    theory: <TheoryScreen />,
    band: <BandScreen />,
    gigs: <GigsScreen />,
    studio: <StudioScreen />,
  }[ui.screen];
  // Um aviso por vez, e nunca no meio de uma cena com suspense (não entregar o resultado).
  const busy = ui.suspense || !!ui.show || !!ui.crate || !!ui.record || (!!ui.jam && !ui.jam.done);
  const modal = !ui.started
    ? null
    : ui.welcome
      ? <Welcome />
      : !busy && ui.discover.length
        ? <DiscoveryModal />
        : !busy && nextNews(game)
          ? <NewsModal />
          : null;
  return (
    <>
      <Hud />
      <main class={`screen screen-${ui.screen}`} key={ui.screen}>
        {screen}
      </main>
      <Dock />
      {ui.picker !== null && <ChordPicker />}
      {ui.item !== null && <ItemSheet />}
      {ui.info && <InfoSheet />}
      {ui.settings && <Settings />}
      {ui.show && <ShowOverlay />}
      {ui.crate && <CrateOverlay />}
      {ui.record && <RecordOverlay />}
      {ui.jam && <JamOverlay />}
      {modal}
      {!ui.started && <StartScreen />}
    </>
  );
}

render(<App />, document.getElementById('app')!);

// Gancho de teste (Playwright e simulador visual): ler e mexer no estado sem UI.
(window as unknown as { __tonic: unknown }).__tonic = { get game() { return game; }, act, setUi, ui };
