import { describe, expect, it } from 'vitest'
import { defaultSave, hardResetSave, migrate } from './save'

describe('defaultSave', () => {
  it('is a fresh v4 save with an uncreated character', () => {
    const save = defaultSave()
    expect(save.version).toBe(4)
    expect(save.character).toBeNull()
    expect(save.equippedWeapon).toBe('dagger')
    expect(save.inventory.weapons).toEqual(['dagger'])
  })
})

describe('migrate', () => {
  it('passes a well-formed v4 save (uncreated character) through unchanged', () => {
    const save = defaultSave()
    expect(migrate(save)).toEqual(save)
  })

  it('re-derives a v4 character whose stored level drifted from its XP (idempotent load reconcile)', () => {
    const drifted = {
      ...defaultSave(),
      character: {
        name: 'Aldric',
        class: 'fighter',
        level: 1, // stale — 900 XP is level 3
        xp: 900,
        abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
        pendingAsi: 0,
      },
    }
    expect(migrate(drifted).character?.level).toBe(3)
    // idempotent: migrating the already-reconciled save changes nothing
    expect(migrate(migrate(drifted))).toEqual(migrate(drifted))
  })

  it('migrates a v3 save: re-derives the frozen level from XP and banks the ASI points it earned', () => {
    const v3 = {
      ...defaultSave(),
      version: 3,
      character: {
        name: 'Aldric',
        class: 'fighter',
        level: 1, // frozen by the pre-v4 bug (award never advanced it)
        xp: 2700, // level 4 — an ASI level
        abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
        pendingAsi: 0, // never banked, because the plumbing was dead
      },
    }

    const migrated = migrate(v3)

    expect(migrated.version).toBe(4)
    expect(migrated.character?.level).toBe(4)
    expect(migrated.character?.pendingAsi).toBe(2) // the level-4 ASI, finally granted
    expect(migrated.character?.xp).toBe(2700) // untouched
  })

  it('migrates a v2 save: keeps coins/unlocks/defeats/stats, drops skillTree, nulls the character', () => {
    const v2 = {
      version: 2,
      coins: 42,
      xp: 999,
      skillTree: { endurance: 3, wordsmith: 1, focus: 0, luck: 0, utility: 0 },
      hearts: { max: 3 },
      highestUnlockedTier: 5,
      monstersDefeated: ['slime', 'goblin'],
      stats: { battlesWon: 12, battlesLost: 4, bestWpm: 31 },
    }

    const migrated = migrate(v2)

    expect(migrated.version).toBe(4)
    expect(migrated.character).toBeNull()
    expect(migrated.coins).toBe(42)
    expect(migrated.highestUnlockedTier).toBe(5)
    expect(migrated.monstersDefeated).toEqual(['slime', 'goblin'])
    expect(migrated.stats).toEqual({ battlesWon: 12, battlesLost: 4, bestWpm: 31 })
    expect('skillTree' in migrated).toBe(false)
    expect('xp' in migrated).toBe(false)
  })

  it('a v2 blob round-trips to a playable v4 save (has a starting weapon and empty inventory)', () => {
    const v2 = {
      version: 2,
      coins: 10,
      xp: 0,
      skillTree: { endurance: 0, wordsmith: 0, focus: 0, luck: 0, utility: 0 },
      hearts: { max: 1 },
      highestUnlockedTier: 1,
      monstersDefeated: [],
      stats: { battlesWon: 0, battlesLost: 0, bestWpm: 0 },
    }

    const migrated = migrate(v2)

    expect(migrated.equippedWeapon).toBe('dagger')
    expect(migrated.inventory.weapons).toEqual(['dagger'])
    expect(migrated.inventory.consumables['potion-healing']).toBe(0)
  })

  it('falls back to a fresh v4 save for anything older or unrecognized', () => {
    expect(migrate(undefined)).toEqual(defaultSave())
    expect(migrate(null)).toEqual(defaultSave())
    expect(migrate({})).toEqual(defaultSave())
    expect(migrate({ version: 1, coins: 5 })).toEqual(defaultSave())
    expect(migrate('not even an object')).toEqual(defaultSave())
  })
})

describe('hardResetSave', () => {
  it('returns a fresh default save', () => {
    expect(hardResetSave()).toEqual(defaultSave())
  })
})
