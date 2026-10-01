// Números na tela: dinheiro, contagem, porcentagem, tempo.

const UNITS = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];

function short(x: number): string {
  if (x < 1000) return x < 10 && x % 1 ? x.toFixed(1) : String(Math.floor(x));
  let i = -1;
  while (x >= 1000 && i < UNITS.length - 1) {
    x /= 1000;
    i++;
  }
  return (x < 10 ? (Math.floor(x * 10) / 10).toFixed(1) : x < 100 ? (Math.floor(x * 10) / 10).toFixed(x % 1 ? 1 : 0) : String(Math.floor(x))).replace(/\.0$/, '') + UNITS[i];
}

export const money = (x: number) => '$' + short(Math.max(0, x));
export const num = (x: number) => short(Math.max(0, x));

export function pct(p: number): string {
  const v = p * 100;
  if (v >= 99.95) return '100%';
  if (v === 0) return '0%';
  if (v < 0.1) return v.toFixed(2) + '%';
  if (v < 10) return v.toFixed(1).replace(/\.0$/, '') + '%';
  return Math.round(v) + '%';
}

export const mult = (x: number) => '×' + (x >= 10 ? Math.round(x) : x.toFixed(x % 1 ? 2 : 0).replace(/0$/, ''));

export function duration(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm' + (sec % 60 && m < 10 ? ' ' + (sec % 60) + 's' : '');
  const h = Math.floor(m / 60);
  return h + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
}
