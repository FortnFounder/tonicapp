// Equipamento (pedais e acessórios), caixotes carta a carta e a melhoria +1 a +15 com Practice (failstack).
import { CRATES, CRATE_AMOUNTS, GEAR, GEAR_KINDS, INST, STATS, roundPrice, type CrateTier, type InstId, type ResId, type StatId } from './content';
import { itemMain, itemMainValue, modeScale, type Item, type State } from './game';
import { pickOne, pickWeighted, type Rng } from './rng';

const ALL_STATS = Object.keys(STATS) as StatId[];

export const itemName = (it: Item) => GEAR_KINDS[it.kind].name;
export const itemSlot = (it: Item) => GEAR_KINDS[it.kind].slot;

function rollSub(it: Item, rng: Rng): { stat: StatId; v: number } {
  const taken = new Set([itemMain(it), ...it.subs.map((x) => x.stat)]);
  const free = ALL_STATS.filter((x) => !taken.has(x));
  return { stat: pickOne(free, rng), v: GEAR.sub[it.r] };
}

export function newItem(s: State, r: number, rng: Rng, kind?: number): Item {
  const it: Item = { uid: s.nextUid++, kind: kind ?? Math.floor(rng() * GEAR_KINDS.length), r, plus: 0, subs: [], on: null, spent: 0 };
  for (let i = 0; i < GEAR.subsAtBirth[r]; i++) it.subs.push(rollSub(it, rng));
  return it;
}

// ── Melhoria ────────────────────────────────────────────────────────────────

export const enhanceBase = (it: Item) => GEAR.chance[it.plus] ?? 0;

/** Chance com Practice: cada falha soma 15% da base, teto 90% (base já acima disso fica como está). */
export function enhanceChance(s: State, it: Item): number {
  const base = enhanceBase(it);
  const stack = s.practice['item:' + it.uid] ?? 0;
  if (base >= GEAR.practiceCap) return base;
  return Math.min(GEAR.practiceCap, base * (1 + GEAR.practice * stack));
}

export const enhanceCost = (it: Item) => ({
  picks: Math.ceil(GEAR.picks[it.plus] * (1 + it.r * 0.5)),
  tips: roundPrice(GEAR.tipsBase * Math.pow(2, it.plus) * Math.pow(3, it.r)),
});

export interface EnhanceResult {
  ok: boolean;
  /** Número sorteado (0–1) e a chance: o ponteiro do medidor para aqui. */
  roll: number;
  chance: number;
  plus: number;
  /** Substat nova ou que subiu no marco (+3/+6/+9/+12). */
  sub: { stat: StatId; v: number; isNew: boolean } | null;
}

export function enhance(s: State, uid: number, rng: Rng): EnhanceResult | null {
  const it = s.items.find((x) => x.uid === uid);
  if (!it || it.plus >= GEAR.maxPlus) return null;
  const c = enhanceCost(it);
  if (s.res.picks < c.picks || s.tips < c.tips) return null;
  const chance = enhanceChance(s, it);
  s.res.picks -= c.picks;
  s.tips -= c.tips;
  it.spent += c.picks;
  const roll = rng();
  if (roll >= chance) {
    s.practice['item:' + uid] = (s.practice['item:' + uid] ?? 0) + 1;
    return { ok: false, roll, chance, plus: it.plus, sub: null };
  }
  it.plus++;
  s.practice['item:' + uid] = 0;
  let sub: EnhanceResult['sub'] = null;
  if (GEAR.subSteps.includes(it.plus)) {
    if (it.subs.length < 4) {
      const n = rollSub(it, rng);
      it.subs.push(n);
      sub = { ...n, isNew: true };
    } else {
      const k = Math.floor(rng() * it.subs.length);
      it.subs[k].v += GEAR.sub[it.r];
      sub = { stat: it.subs[k].stat, v: it.subs[k].v, isNew: false };
    }
  }
  return { ok: true, roll, chance, plus: it.plus, sub };
}

// ── Vestir, tirar, desmanchar ───────────────────────────────────────────────

export function equip(s: State, uid: number, inst: InstId): boolean {
  const it = s.items.find((x) => x.uid === uid);
  if (!it || !s.inst[inst].own) return false;
  const slot = itemSlot(it);
  if (it.on) s.inst[it.on].gear = s.inst[it.on].gear.map((u) => (u === uid ? null : u)) as [number | null, number | null];
  const prev = s.inst[inst].gear[slot];
  if (prev !== null) {
    const p = s.items.find((x) => x.uid === prev);
    if (p) p.on = null;
  }
  s.inst[inst].gear[slot] = uid;
  it.on = inst;
  return true;
}

export function unequip(s: State, uid: number): boolean {
  const it = s.items.find((x) => x.uid === uid);
  if (!it || !it.on) return false;
  s.inst[it.on].gear = s.inst[it.on].gear.map((u) => (u === uid ? null : u)) as [number | null, number | null];
  it.on = null;
  return true;
}

export const scrapValue = (it: Item) => (it.r + 1) * GEAR.scrap + Math.floor(it.spent / 2);

export function scrap(s: State, uid: number): number {
  const it = s.items.find((x) => x.uid === uid);
  if (!it) return 0;
  if (it.on) unequip(s, uid);
  const v = scrapValue(it);
  s.res.picks += v;
  s.items = s.items.filter((x) => x.uid !== uid);
  delete s.practice['item:' + uid];
  return v;
}

/** Valor do item pra ordenar e pra "Best gear": soma dos stats em %. */
export const itemScore = (it: Item) => itemMainValue(it) + it.subs.reduce((a, x) => a + x.v, 0);

// ── Caixotes ────────────────────────────────────────────────────────────────

export type Loot =
  | { kind: 'gear'; item: Item }
  | { kind: 'notes'; pc: number; n: number }
  | { kind: 'res'; res: ResId; n: number }
  | { kind: 'records'; n: number };

/** Raridade do melhor card (pra brilhar antes de virar). */
export const lootRarity = (l: Loot) => (l.kind === 'gear' ? l.item.r : l.kind === 'records' ? 2 : 0);

/** Abre um caixote: sorteia as cartas e já entrega (a tela só revela). */
export function openCrate(s: State, tier: CrateTier, rng: Rng): Loot[] | null {
  if ((s.crates[tier] ?? 0) <= 0) return null;
  s.crates[tier]--;
  const def = CRATES[tier];
  const amt = CRATE_AMOUNTS[tier];
  const kinds = ['gear', 'notes', 'res', 'records'] as const;
  const out: Loot[] = [];
  for (let i = 0; i < def.cards; i++) {
    // A primeira carta é sempre equipamento: o caixote nunca vem sem peça.
    const k = i === 0 ? 'gear' : kinds[pickWeighted(kinds.map((x) => def.kinds[x]), rng)];
    if (k === 'gear') {
      const it = newItem(s, pickWeighted(def.rarity, rng), rng);
      s.items.push(it);
      out.push({ kind: 'gear', item: it });
    } else if (k === 'notes') {
      // Notas do tom atual, com chance de cromática (a que falta pra acorde emprestado e modo).
      const scale = modeScale(s);
      const pc = rng() < 0.3 ? pickOne([...Array(12).keys()].filter((p) => !scale.includes(p)), rng) : pickOne(scale, rng);
      const n = Math.round(amt.notes * (0.75 + rng() * 0.5));
      s.notes[pc] += n;
      out.push({ kind: 'notes', pc, n });
    } else if (k === 'res') {
      const res = pickOne(['picks', 'picks', 'sheet', 'tape'] as ResId[], rng);
      const n = Math.max(1, Math.round(amt.res * (0.75 + rng() * 0.5)));
      s.res[res] += n;
      out.push({ kind: 'res', res, n });
    } else {
      s.records += amt.records;
      out.push({ kind: 'records', n: amt.records });
    }
  }
  return out;
}

/** O melhor item pra cada vaga de cada instrumento (botão "Best gear"). */
export function autoEquip(s: State): number {
  let changed = 0;
  for (const id of Object.keys(INST) as InstId[]) {
    if (!s.inst[id].own) continue;
    for (const slot of [0, 1] as const) {
      const cur = s.items.find((x) => x.uid === s.inst[id].gear[slot]);
      const best = s.items
        .filter((x) => itemSlot(x) === slot && (x.on === null || x.on === id))
        .sort((a, b) => itemScore(b) - itemScore(a))[0];
      if (best && best !== cur && (!cur || itemScore(best) > itemScore(cur))) {
        equip(s, best.uid, id);
        changed++;
      }
    }
  }
  return changed;
}
