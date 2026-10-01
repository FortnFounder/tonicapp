// Mãozinha dos primeiros passos (sem texto: um anel pulsando no que tocar). Some sozinha quando o passo acontece.
import * as G from './game';
import { game, ui } from './store';

export type CoachTarget = 'dock-theory' | 'learn-vi' | 'dock-stage' | 'slot' | 'pick-vi' | 'dock-band' | 'hire-drums' | 'dock-gigs' | 'play-gig' | null;

export function coach(): CoachTarget {
  const s = game;
  if (!ui.started || s.stats.loops > 400) return null;
  // 1) Contratar a bateria assim que der.
  if (!s.inst.drums.own && s.tips >= 25) return ui.screen === 'band' ? 'hire-drums' : 'dock-band';
  // 2) Aprender o vi quando as notas dão.
  if (!s.learned.includes('vi') && G.canPayNotes(s, G.learnCost(s, 'vi'))) return ui.screen === 'theory' ? 'learn-vi' : 'dock-theory';
  // 3) Colocar o vi no loop.
  if (s.learned.includes('vi') && !s.loop.includes('vi') && !s.found.includes('axis') && !s.found.includes('doowop')) {
    if (ui.picker !== null) return 'pick-vi';
    return ui.screen === 'stage' ? 'slot' : 'dock-stage';
  }
  // 4) Primeiro gig.
  if (s.stats.gigs === 0 && s.fans >= 5 && G.playing(s) >= 2) return ui.screen === 'gigs' ? 'play-gig' : 'dock-gigs';
  return null;
}

export const coachOn = (t: CoachTarget) => (coach() === t ? ' coach' : '');
