// Ícones desenhados em código (traço de 1,7–2 px, currentColor). Escalam em qualquer tela; o build é um arquivo só.
import type { JSX } from 'preact';

type P = { size?: number; color?: string };
const S = (d: JSX.Element, p: P, fill = false) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style={p.color ? { color: p.color } : undefined} aria-hidden="true">
    {d}
  </svg>
);

export const Guitar = (p: P) =>
  S(
    <>
      <path d="M19.5 2.8l1.7 1.7-1.3 1.3-1.7-1.7z" />
      <path d="M18.2 5.8l-6.6 6.6" />
      <path d="M11.2 10.4a3.4 3.4 0 0 0-4.6-.2 2.6 2.6 0 0 0-3.2 3.3 4.4 4.4 0 0 0 6.1 6.1 2.6 2.6 0 0 0 3.3-3.2 3.4 3.4 0 0 0-.2-4.6" />
      <circle cx="8.6" cy="15.4" r="1.4" />
      <path d="M5.6 15.6l2.8 2.8" />
    </>,
    p,
  );
export const Drums = (p: P) =>
  S(
    <>
      <ellipse cx="12" cy="11" rx="8" ry="3" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      <path d="M7 3.5l4 6.2M17 3.5l-4 6.2" />
      <path d="M8 13.8v5.6M16 13.8v5.6M12 14v6" />
    </>,
    p,
  );
export const Bass = (p: P) =>
  S(
    <>
      <path d="M20.6 2.2l1.2 1.2-1.6 1.6-1.2-1.2z" />
      <path d="M19.4 4.6l-7.8 7.8" />
      <path d="M12.6 10.2c-1-1-2.6-1.2-3.6-.4-.6-1.6-3-1.4-3.6.5-1.8.4-2.8 2.6-1.4 4.4l3.6 3.6c1.8 1.4 4 .4 4.4-1.4 1.9-.6 2.1-3 .5-3.6.8-1 .6-2.6-.4-3.6" />
      <path d="M6.6 15.2l2.2 2.2M8.4 13.4l2.2 2.2" />
    </>,
    p,
  );
export const Keys = (p: P) =>
  S(
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M7.25 12.5V19M12 12.5V19M16.75 12.5V19" />
      <rect x="5.6" y="5" width="3.2" height="7.5" rx=".8" fill="currentColor" />
      <rect x="10.4" y="5" width="3.2" height="7.5" rx=".8" fill="currentColor" />
      <rect x="15.2" y="5" width="3.2" height="7.5" rx=".8" fill="currentColor" />
    </>,
    p,
  );
export const Flute = (p: P) =>
  S(
    <>
      <path d="M2.8 17.6L19.6 5.4a1.6 1.6 0 0 1 1.9 2.6L4.7 20.2a1.6 1.6 0 0 1-1.9-2.6z" />
      <circle cx="9" cy="14" r=".9" fill="currentColor" />
      <circle cx="11.6" cy="12.1" r=".9" fill="currentColor" />
      <circle cx="14.2" cy="10.2" r=".9" fill="currentColor" />
      <circle cx="16.8" cy="8.3" r=".9" fill="currentColor" />
    </>,
    p,
  );
export const Violin = (p: P) =>
  S(
    <>
      <path d="M12 2v5" />
      <path d="M10.5 2.5h3" />
      <path d="M9 7.5c0-.8 1.3-1 3-1s3 .2 3 1c0 1.2-1.2 1.6-1.2 2.8 0 1 1.7 1.4 1.7 3.4 0 1.6-1.2 2.3-1.2 3.6 0 1.2 1.7 1.6 1.7 3.2 0 1-1.6 1.5-3.2 1.5s-3.2-.5-3.2-1.5c0-1.6 1.7-2 1.7-3.2 0-1.3-1.2-2-1.2-3.6 0-2 1.7-2.4 1.7-3.4C10.2 9.1 9 8.7 9 7.5z" />
      <path d="M12 9v10" />
    </>,
    p,
  );

export const INST_ICON = { guitar: Guitar, drums: Drums, bass: Bass, keys: Keys, flute: Flute, strings: Violin };

export const Coin = (p: P) =>
  S(
    <>
      <circle cx="12" cy="12" r="9" stroke="var(--tonic)" />
      <path stroke="var(--tonic)" d="M14.5 9.2c-.4-.9-1.4-1.4-2.5-1.4-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.2 0-2.2-.6-2.6-1.5M12 6v1.8M12 16.2V18" />
    </>,
    p,
  );
export const Heart = (p: P) => S(<path fill="var(--dom)" d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z" />, p, true);
export const Record = (p: P) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#1b1a33" stroke="var(--legend)" stroke-width="1.6" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="rgba(243,228,126,.35)" stroke-width="1" />
    <circle cx="12" cy="12" r="3.2" fill="var(--legend)" />
    <circle cx="12" cy="12" r="0.9" fill="#1b1a33" />
  </svg>
);
export const Pick = (p: P) => S(<path fill="var(--sub)" d="M12 21c-1.5 0-7-7.5-7-12.2C5 5.5 8 3 12 3s7 2.5 7 5.8C19 13.5 13.5 21 12 21z" />, p, true);
export const Sheet = (p: P) =>
  S(
    <>
      <path stroke="var(--rare)" d="M6 3h9l3 3v15H6z" />
      <path stroke="var(--rare)" d="M9 9h6M9 12h6M9 15h3" />
      <circle cx="14.5" cy="16.5" r="1.5" fill="var(--rare)" stroke="none" />
    </>,
    p,
  );
export const Tape = (p: P) =>
  S(
    <>
      <rect stroke="var(--epic)" x="2.5" y="6" width="19" height="12" rx="2" />
      <circle stroke="var(--epic)" cx="8.5" cy="12" r="2.2" />
      <circle stroke="var(--epic)" cx="15.5" cy="12" r="2.2" />
      <path stroke="var(--epic)" d="M8.5 14.2h7" />
    </>,
    p,
  );
export const RES_ICON = { picks: Pick, sheet: Sheet, tape: Tape };

export const Note = (p: P) =>
  S(
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
      <circle cx="17.5" cy="16" r="2.5" fill="currentColor" />
    </>,
    p,
  );
export const Stage = (p: P) =>
  S(
    <>
      <path d="M3 20h18" />
      <path d="M5 20v-6h14v6" />
      <path d="M8 14l-2-8M16 14l2-8" />
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="18" cy="5" r="1.5" />
    </>,
    p,
  );
export const Theory = (p: P) =>
  S(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v5.5M20.5 12H15M12 20.5V15M3.5 12H9" />
    </>,
    p,
  );
export const Band = (p: P) =>
  S(
    <>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5" cy="9" r="2.2" />
      <circle cx="19" cy="9" r="2.2" />
      <path d="M6.5 20v-2.5a5.5 5.5 0 0 1 11 0V20M1.8 18v-1.2A3.4 3.4 0 0 1 5 13.4M22.2 18v-1.2a3.4 3.4 0 0 0-3.2-3.4" />
    </>,
    p,
  );
export const Mic = (p: P) =>
  S(
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>,
    p,
  );
export const Studio = (p: P) =>
  S(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M12 3a9 9 0 0 1 9 9" opacity=".5" />
    </>,
    p,
  );
export const Lock = (p: P) =>
  S(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
    p,
  );
export const SoundOn = (p: P) =>
  S(
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18.2 6.5a7.5 7.5 0 0 1 0 11" />
    </>,
    p,
  );
export const SoundOff = (p: P) =>
  S(
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>,
    p,
  );
export const Gear = (p: P) =>
  S(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>,
    p,
  );
export const Pedal = (p: P) =>
  S(
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <circle cx="12" cy="8" r="2.4" />
      <rect x="8" y="13.5" width="8" height="4.5" rx="1" fill="currentColor" />
    </>,
    p,
  );
export const Amp = (p: P) =>
  S(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="12" cy="14.5" r="3.5" />
      <circle cx="6.5" cy="6.5" r=".8" fill="currentColor" />
      <circle cx="9" cy="6.5" r=".8" fill="currentColor" />
    </>,
    p,
  );
export const Crate = (p: P & { tier?: number }) => {
  const c = ['#a87a4a', 'var(--rare)', 'var(--legend)', '#d9e2ff'][p.tier ?? 0];
  return (
    <svg viewBox="0 0 64 48" width={p.size} height={p.size ? (p.size * 3) / 4 : undefined} aria-hidden="true">
      <rect x="4" y="10" width="56" height="34" rx="5" fill="var(--panel2)" stroke={c} stroke-width="3" />
      <path d="M4 22h56M4 32h56" stroke={c} stroke-width="2" opacity=".6" />
      <rect x="10" y="4" width="44" height="10" rx="2" fill={c} opacity=".9" />
      <circle cx="32" cy="27" r="7" fill="#1b1a33" stroke={c} stroke-width="2" />
      <circle cx="32" cy="27" r="2" fill={c} />
    </svg>
  );
};
export const Spark = (p: P) => S(<path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="currentColor" stroke="none" />, p, true);
export const Fire = (p: P) => S(<path d="M12 22c4 0 7-2.7 7-6.6 0-3.6-2.6-5.8-4-8.4-.8 1.8-1.6 2.6-2.8 3-.1-3.2-1.4-5.8-4-8 .3 4-4.2 6.7-4.2 11.6C4 19.4 7.6 22 12 22z" />, p);
export const Check = (p: P) => S(<path d="M5 12.5l4.5 4.5L19 7.5" />, p);
export const Cross = (p: P) => S(<path d="M6 6l12 12M18 6L6 18" />, p);
export const Back = (p: P) => S(<path d="M15 5l-7 7 7 7" />, p);
export const Bolt = (p: P) => S(<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />, p, true);
