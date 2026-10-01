// Save local (localStorage), com backup e código pra levar o jogo pra outro aparelho.
// Campo novo no State entra sozinho: o save é completado com os valores de startState.
import { startState, type State } from './game';

const KEY = 'tonic-save';
const BACKUP = 'tonic-backup';

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Completa o que falta no save com o padrão (recursivo em objeto; lista e número ficam como vieram). */
function fill<T>(base: T, got: unknown): T {
  if (!isObj(base) || !isObj(got)) return (got ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(got)) out[k] = k in base ? fill((base as Record<string, unknown>)[k], got[k]) : got[k];
  return out as T;
}

export function hydrate(raw: unknown, now: number): State | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const s = fill(startState(now), raw);
  if (!Array.isArray(s.notes) || s.notes.length !== 12) s.notes = Array(12).fill(0);
  if (!s.loop.length) s.loop = startState(now).loop;
  s.slot %= s.loop.length;
  return s;
}

export function load(now: number): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return hydrate(JSON.parse(raw), now) ?? startState(now);
  } catch {
    // save quebrado: começa de novo (o backup continua lá)
  }
  return startState(now);
}

export function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sem storage (aba privada): o jogo segue sem salvar
  }
}

export function saveBackup(s: State) {
  try {
    localStorage.setItem(BACKUP, JSON.stringify(s));
  } catch {
    // idem
  }
}

export function loadBackup(now: number): State | null {
  try {
    const raw = localStorage.getItem(BACKUP);
    return raw ? hydrate(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // idem
  }
}

/** Código de backup: o save em base64 (UTF-8 seguro, o estado tem ♭ e ♯). */
export const exportCode = (s: State) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(s))));

export function importCode(code: string, now: number): State | null {
  try {
    const bin = atob(code.trim());
    const json = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    return hydrate(JSON.parse(json), now);
  } catch {
    return null;
  }
}
