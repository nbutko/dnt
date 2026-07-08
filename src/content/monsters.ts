import type { Monster, TextTier } from '../domain/types'
import monstersData from './monsters.json'

// `slack` (attack time limit = expected typing time x slack) is tuned per
// monster via engine/sim/balance.ts-style sweeps against its own
// wpm/accuracy/attention, targeting roughly: weak/early monsters miss their
// own attack (time out) ~20-25% of the time, tougher/more disciplined ones
// ~5%. Slime (2.0) and Goblin (2.4) both land in the "weak" end of that
// range — Goblin needs a looser slack than Slime despite being the
// "tougher" tier-1 fight, because its higher wpm + lower accuracy means a
// single mistake costs more (more wrong characters typed before it
// corrects). Later, stronger monsters should aim their own slack toward the
// ~5% end using the same technique.
// monsters.json's `textTier` was authored on the old 10-tier ladder, where a
// dungeon spanned only one or two text tiers. The shipped corpus is the 14-tier
// ladder (content-plan-v2.html §2): dungeon N serves regular text [N, N+2] and
// its boss N+3. Remap each monster's text tier into that band, preserving its
// relative difficulty within the dungeon — the boss reads the top (N+3), and a
// regular keeps its old offset above its dungeon's easiest monster, clamped to
// the regular band. Done here, once, so every consumer (battle prompts, the
// tier-gate, the sim) sees a single consistent value; the JSON stays the
// legacy-scaled source of record.
const rawMonsters = monstersData as Monster[]
const dungeonFloor = new Map<number, number>()
for (const m of rawMonsters) {
  dungeonFloor.set(m.tier, Math.min(dungeonFloor.get(m.tier) ?? Infinity, m.textTier))
}
const remapTextTier = (m: Monster): TextTier => {
  if (m.role === 'boss') return (m.tier + 3) as TextTier
  const offset = m.textTier - (dungeonFloor.get(m.tier) ?? m.textTier)
  return Math.max(m.tier, Math.min(m.tier + 2, m.tier + offset)) as TextTier
}
const monsters: Monster[] = rawMonsters.map((m) => ({ ...m, textTier: remapTextTier(m) }))

export const listMonsters = (): readonly Monster[] => monsters

export const getMonster = (id: string): Monster => {
  const monster = monsters.find((candidate) => candidate.id === id)
  if (!monster) {
    throw new Error(`Unknown monster id: ${id}`)
  }
  return monster
}

// Story 7/8 lookups the dungeon generator draws from — every tier's roster
// is a handful of regulars + one boss + one mimic (content/monsters.json),
// not a pool the generator has to filter/reflavor itself.
export const byTier = (tier: number): readonly Monster[] =>
  monsters.filter((monster) => monster.tier === tier)

export const byRole = (tier: number, role: Monster['role']): readonly Monster[] =>
  monsters.filter((monster) => monster.tier === tier && monster.role === role)

export default monsters
