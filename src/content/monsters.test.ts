import { describe, expect, it } from 'vitest'
import { DUNGEON_TIERS } from '../config/dungeon-tiers'
import { byRole, byTier, getMonster, listMonsters } from './monsters'
import textBank from './text-banks'

// The generator (Story 8) draws regulars *with repetition* to fill ~30 nodes,
// so this is a variety floor, not a headcount it must reach — every tier
// should offer at least a few distinct regular types. Tier 1's grandfathered
// Slime/Goblin/Skeleton is the minimum in the set.
const MIN_REGULARS = 3

describe('monsters', () => {
  it('keeps the grandfathered tier-1 ids at the front of the roster', () => {
    const ids = listMonsters().map((monster) => monster.id)
    expect(ids.slice(0, 2)).toEqual(['slime', 'goblin'])
  })

  it('looks up a monster by id', () => {
    const slime = getMonster('slime')
    expect(slime.hp).toBe(40)
    expect(slime.textTier).toBe(1)
    expect(slime.role).toBe('regular')
  })

  it('throws for an unknown id', () => {
    expect(() => getMonster('wyvern')).toThrow()
  })
})

describe('seed rosters (Story 7)', () => {
  it('gives every one of the 11 tiers enough regulars, a boss, and a mimic', () => {
    for (const { tier } of DUNGEON_TIERS) {
      const regulars = byRole(tier, 'regular')
      const bosses = byRole(tier, 'boss')
      const mimics = byRole(tier, 'mimic')
      expect(regulars.length, `tier ${tier} regulars`).toBeGreaterThanOrEqual(MIN_REGULARS)
      expect(bosses.length, `tier ${tier} boss`).toBe(1)
      expect(mimics.length, `tier ${tier} mimic`).toBe(1)
    }
  })

  it('keeps every monster textTier inside its dungeon band', () => {
    // Regulars/mimics read the dungeon's regular text tiers [N, N+2]; the boss
    // reads its single hardest tier N+3 (config/dungeon-tiers.ts's bossTextTier).
    for (const { tier, textTierRange, bossTextTier } of DUNGEON_TIERS) {
      const [low, high] = textTierRange
      for (const monster of byTier(tier)) {
        if (monster.role === 'boss') {
          expect(monster.textTier, `${monster.id} textTier`).toBe(bossTextTier)
        } else {
          expect(monster.textTier, `${monster.id} textTier`).toBeGreaterThanOrEqual(low)
          expect(monster.textTier, `${monster.id} textTier`).toBeLessThanOrEqual(high)
        }
      }
    }
  })

  it('has a loadable, non-empty text bank behind every monster', async () => {
    // Each monster reads its own dungeon's pool at its text tier — every such
    // (dungeon, tier) cell must resolve to real content.
    const banks = await Promise.all(
      listMonsters().map((monster) => textBank.loadPool(monster.tier, monster.textTier)),
    )
    banks.forEach((lines, i) => {
      expect(lines.length, `${listMonsters()[i].id}`).toBeGreaterThan(0)
    })
  })
})
