// Efeitos de tela: texto flutuante, faísca, flash, tremida, pulo, aviso, notas voando.
// Imperativo de propósito: vive numa camada própria, fora da árvore do Preact.

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function layer(): HTMLElement {
  let el = document.getElementById('fx');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fx';
    document.body.appendChild(el);
  }
  return el;
}

export function center(el: Element | null): { x: number; y: number } {
  if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function spawn(cls: string, x: number, y: number): HTMLElement {
  const el = document.createElement('div');
  el.className = cls;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  layer().appendChild(el);
  return el;
}

export function floatText(x: number, y: number, text: string, color = 'var(--text)', big = false) {
  if (document.hidden) return;
  const el = spawn('fx-float' + (big ? ' big' : ''), x, y);
  el.textContent = text;
  el.style.color = color;
  el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-80%) scale(1.12)', opacity: 1, offset: 0.15 },
      { transform: 'translate(-50%,-150%) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%,-190%) scale(1)', opacity: 0 },
    ],
    { duration: big ? 1600 : 1200, easing: 'cubic-bezier(.2,.8,.2,1)' },
  ).onfinish = () => el.remove();
}

export function burst(x: number, y: number, color: string, count = 18, spread = 1) {
  if (reduced || document.hidden) return;
  for (let i = 0; i < count; i++) {
    const el = spawn('fx-spark', x, y);
    el.style.background = color;
    const a = Math.random() * Math.PI * 2;
    const d = (50 + Math.random() * 110) * spread;
    const size = 3 + Math.random() * 6;
    el.style.width = el.style.height = size + 'px';
    el.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 24}px)) scale(.2)`, opacity: 0 },
      ],
      { duration: 500 + Math.random() * 500, easing: 'cubic-bezier(.1,.8,.3,1)' },
    ).onfinish = () => el.remove();
  }
}

export function flash(color = 'rgba(255,255,255,.35)', ms = 600) {
  if (reduced || document.hidden) return;
  const el = spawn('fx-flash', 0, 0);
  el.style.background = `radial-gradient(circle at 50% 30%, ${color}, transparent 65%)`;
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => el.remove();
}

/** Tremida: a camada de cima (folha aberta) ou a tela. Nunca o #app (muda a referência dos fixos). */
export function shake(px = 3, ms = 260) {
  if (reduced) return;
  const tops = document.querySelectorAll<HTMLElement>('.overlay, .sheet.on');
  const el = tops[tops.length - 1] ?? document.querySelector<HTMLElement>('main.screen');
  if (!el) return;
  const frames = Array.from({ length: 8 }, (_, i) => {
    const k = (1 - i / 8) * px;
    return { transform: `translate(${(Math.random() - 0.5) * 2 * k}px, ${(Math.random() - 0.5) * 2 * k}px)` };
  });
  el.animate([...frames, { transform: 'none' }], { duration: ms });
}

export function bump(el: Element | null, scale = 1.12) {
  if (!el || reduced) return;
  (el as HTMLElement).animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }], {
    duration: 240,
    easing: 'cubic-bezier(.34,1.56,.64,1)',
  });
}

let toastTimer = 0;
export function toast(text: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('on'), 1800);
}

/** Notas voando do teclado do palco até o contador delas. */
export function flyNotes(items: { from: Element | null; to: Element | null; text: string; color: string }[]) {
  if (reduced || document.hidden) return;
  items.forEach(({ from, to, text, color }, i) => {
    if (!from || !to) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    if (a.bottom < 0 || a.top > innerHeight) return;
    const el = spawn('fx-note', 0, 0);
    el.textContent = text;
    el.style.color = color;
    const x0 = a.left + a.width / 2;
    const y0 = a.top;
    const x1 = b.left + b.width / 2;
    const y1 = b.top + b.height / 2;
    el.animate(
      [
        { transform: `translate(${x0}px,${y0}px) translate(-50%,-50%)`, opacity: 0 },
        { transform: `translate(${x0}px,${y0 - 16}px) translate(-50%,-50%)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1}px,${y1}px) translate(-50%,-50%)`, opacity: 0.15 },
      ],
      { duration: 700 + i * 60, easing: 'cubic-bezier(.5,0,.75,0)' },
    ).onfinish = () => {
      el.remove();
      bump(to, 1.15);
    };
  });
}
