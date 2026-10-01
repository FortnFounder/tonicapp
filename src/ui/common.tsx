// Peças de tela que se repetem: folha, modal, (i), cadeado, custo em notas, número que rola.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RARITY } from '../content';
import { money, num } from '../format';
import { game, setUi } from '../store';
import { spellIn } from '../theory';
import { tonicOf } from '../game';
import { Lock } from './icons';

export function Sheet(p: { onClose: () => void; children: ComponentChildren; title?: ComponentChildren }) {
  return (
    <>
      <div class="scrim" onClick={p.onClose} />
      <div class="sheet on" role="dialog" aria-modal="true">
        <div class="grab" />
        {p.title && <div class="sec-head">{p.title}</div>}
        {p.children}
      </div>
    </>
  );
}

export function Modal(p: { onClose?: () => void; children: ComponentChildren }) {
  return (
    <>
      <div class="scrim" onClick={p.onClose} />
      <div class="modal" role="dialog" aria-modal="true">
        {p.children}
      </div>
    </>
  );
}

export const InfoBtn = (p: { id: string }) => (
  <button class="info" aria-label="About" onClick={() => setUi({ info: p.id })}>
    i
  </button>
);

export const SecHead = (p: { title: string; info?: string; children?: ComponentChildren }) => (
  <div class="sec-head">
    <h2>{p.title}</h2>
    {p.info && <InfoBtn id={p.info} />}
    {p.children}
  </div>
);

export const LockLine = (p: { text: string }) => (
  <div class="lock-line">
    <Lock size={15} />
    {p.text}
  </div>
);

/** Custo em notas: vermelho a nota que falta. */
export function NoteCost(p: { cost: [number, number][] }) {
  const t = tonicOf(game);
  const need = new Map<number, number>();
  for (const [pc, n] of p.cost) need.set(pc, (need.get(pc) ?? 0) + n);
  return (
    <div class="cost">
      {[...need].map(([pc, n]) => (
        <span key={pc} class={game.notes[pc] < n ? 'miss' : ''}>
          {num(n)} {spellIn(pc, t, game.mode)}
        </span>
      ))}
    </div>
  );
}

export const Rarity = (p: { r: number }) => <span class={`rarity c${p.r}${p.r === 3 ? ' shine' : ''}`}>{RARITY[p.r]}</span>;

export const Pips = (p: { n: number; of: number; r: number }) => (
  <span class={`pips c${p.r}`}>
    {Array.from({ length: p.of }, (_, k) => (
      <i key={k} class={k < p.n ? 'on' : ''} />
    ))}
  </span>
);

/** Número que rola até o valor novo (dinheiro subindo). */
export function Rolling(p: { value: number; fmt?: (x: number) => string }) {
  const fmt = p.fmt ?? money;
  const [shown, setShown] = useState(p.value);
  const from = useRef(p.value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = p.value;
    if (a === b) return;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 450);
      const v = a + (b - a) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [p.value]);
  return <>{fmt(shown)}</>;
}

/** Botão que pede segundo toque (ação destrutiva). */
export function TwoTap(p: { label: string; confirm: string; onConfirm: () => void; class?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button class={`btn ${p.class ?? 'ghost'}`} onClick={() => (armed ? p.onConfirm() : setArmed(true))}>
      {armed ? p.confirm : p.label}
    </button>
  );
}
