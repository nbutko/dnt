import { ASI_LEVELS } from '../../config/leveling'
import type { Ability, AbilityScores, Character } from '../../domain/character'
import type { ItemId } from '../../domain/items'
import type { SaveData } from '../../domain/save'
import type { WeaponId } from '../../domain/weapons'
import { ASI_POINTS_PER_LEVEL, applyAsi as applyValidatedAsi, levelForXp } from '../../engine/character/leveling'

export type SaveAction =
  | { type: 'award'; coins: number; xp: number }
  | { type: 'createCharacter'; character: Character }
  | { type: 'gainXp'; amount: number }
  | { type: 'applyAsi'; spend: Partial<AbilityScores> }
  | { type: 'rest' }
  | { type: 'equipWeapon'; weapon: WeaponId }
  | { type: 'buyWeapon'; weapon: WeaponId; price: number }
  | { type: 'buyItem'; item: ItemId; price: number }
  | { type: 'consumeItem'; item: ItemId }
  | { type: 'unlockTier'; tier: number }
  | { type: 'recordDefeat'; monsterId: string }
  | { type: 'hydrate'; save: SaveData }

// Cost/price is passed in rather than looked up here: the reducer stays a
// pure function of (state, action) with no import of config/weapons.ts or
// config/items.ts, matching the "save never imports combat/config-that-knows-
// about-combat" seam rule (m2-implementation.html, carried into M3). Callers
// (the Shop UI, Story 10) read the price from config before dispatching.
export const award = (coins: number, xp: number): SaveAction => ({ type: 'award', coins, xp })

export const createCharacter = (character: Character): SaveAction => ({
  type: 'createCharacter',
  character,
})

// Accumulates onto character.xp and auto-levels: every ASI level
// (config/leveling.ts's ASI_LEVELS) crossed by this gain banks a pendingAsi.
// HP/proficiency stay derived at read time (Story 3's resolveModifiers calls
// engine/character/leveling.ts's grantsForLevel) — never stored here, so they
// can't drift from the character's level/abilities.
export const gainXp = (amount: number): SaveAction => ({ type: 'gainXp', amount })

export const applyAsi = (spend: Partial<AbilityScores>): SaveAction => ({ type: 'applyAsi', spend })

// The Inn's "Take a long rest" button (Story 5, RestPanel.tsx). Hearts are
// already always full by the time the player is standing at the Inn — the
// ephemeral dungeon-run store (state/dungeon-run/dungeon-run-reducer.ts) is
// never persisted, and every dungeon entry starts a brand-new run at
// maxHearts (ui/dungeon/DungeonScreen.tsx), so there is no persisted "spent
// hearts" quantity today for a rest to restore. This action — and its no-op
// reducer case below — is the seam a future persistent heart deficit (or any
// other long-rest effect) would hook into; flagged for a human, since right
// now dispatching it changes nothing observable besides the UI's own "you
// rested" confirmation.
export const rest = (): SaveAction => ({ type: 'rest' })

export const equipWeapon = (weapon: WeaponId): SaveAction => ({ type: 'equipWeapon', weapon })

export const buyWeapon = (weapon: WeaponId, price: number): SaveAction => ({
  type: 'buyWeapon',
  weapon,
  price,
})

export const buyItem = (item: ItemId, price: number): SaveAction => ({ type: 'buyItem', item, price })

export const consumeItem = (item: ItemId): SaveAction => ({ type: 'consumeItem', item })

export const unlockTier = (tier: number): SaveAction => ({ type: 'unlockTier', tier })

export const recordDefeat = (monsterId: string): SaveAction => ({
  type: 'recordDefeat',
  monsterId,
})

// Replaces the whole record wholesale — used once, by SaveProvider, after an
// async IndexedDB load resolves. Not something battle/dungeon code dispatches.
export const hydrate = (save: SaveData): SaveAction => ({ type: 'hydrate', save })

export const saveReducer = (state: SaveData, action: SaveAction): SaveData => {
  switch (action.type) {
    case 'award': {
      // Coins are always a save fact; xp only has somewhere to go once a
      // character exists (pre-creation battles can't happen in the real flow
      // — Story 4 gates the map behind creation).
      const character = state.character
        ? { ...state.character, xp: state.character.xp + action.xp }
        : state.character
      return { ...state, coins: state.coins + action.coins, character }
    }

    case 'createCharacter':
      return { ...state, character: action.character }

    case 'gainXp': {
      if (!state.character) return state
      const xp = state.character.xp + action.amount
      const oldLevel = levelForXp(state.character.xp)
      const level = levelForXp(xp)
      // Every ASI level strictly between the old and new level banks
      // ASI_POINTS_PER_LEVEL points — a multi-level jump (a big boss/chest
      // payout) can cross more than one at once, each its own 2-point grant
      // (bug fix: this used to bank one raw unit per level crossed instead of
      // per-level points, so a character could never actually spend a full
      // ASI — engine/character/leveling.ts's applyAsi and domain/character.ts's
      // pendingAsi both already assumed points).
      const asiLevelsGained = ASI_LEVELS.filter((asiLevel) => asiLevel > oldLevel && asiLevel <= level).length
      return {
        ...state,
        character: {
          ...state.character,
          xp,
          level,
          pendingAsi: state.character.pendingAsi + asiLevelsGained * ASI_POINTS_PER_LEVEL,
        },
      }
    }

    case 'applyAsi': {
      if (!state.character) return state
      const entries = Object.entries(action.spend) as [Ability, number | undefined][]
      const totalSpent = entries.reduce((sum, [, delta]) => sum + (delta ?? 0), 0)
      // Reject a spend the character hasn't banked — without this check, a
      // caller could apply more points than pendingAsi allows (the bug this
      // routing fixes, m3-implementation.html Story 5's carried-over finding).
      if (totalSpent <= 0 || totalSpent > state.character.pendingAsi) return state
      // engine/character/leveling.ts's applyAsi is the one validated source of
      // truth for "is this spend legal" (<=2 points, no negative deltas) — it
      // throws on anything else, so an over-spend can never reach the save.
      let abilities: AbilityScores
      try {
        abilities = applyValidatedAsi(state.character.abilities, action.spend)
      } catch {
        return state
      }
      return {
        ...state,
        character: {
          ...state.character,
          abilities,
          pendingAsi: state.character.pendingAsi - totalSpent,
        },
      }
    }

    // See the `rest` action creator above for why this is a no-op today.
    case 'rest':
      return state

    case 'equipWeapon':
      return { ...state, equippedWeapon: action.weapon }

    case 'buyWeapon':
      return {
        ...state,
        coins: state.coins - action.price,
        inventory: {
          ...state.inventory,
          weapons: state.inventory.weapons.includes(action.weapon)
            ? state.inventory.weapons
            : [...state.inventory.weapons, action.weapon],
        },
      }

    case 'buyItem':
      return {
        ...state,
        coins: state.coins - action.price,
        inventory: {
          ...state.inventory,
          consumables: {
            ...state.inventory.consumables,
            [action.item]: state.inventory.consumables[action.item] + 1,
          },
        },
      }

    case 'consumeItem':
      return {
        ...state,
        inventory: {
          ...state.inventory,
          consumables: {
            ...state.inventory.consumables,
            [action.item]: Math.max(0, state.inventory.consumables[action.item] - 1),
          },
        },
      }

    case 'unlockTier':
      return {
        ...state,
        highestUnlockedTier: Math.max(state.highestUnlockedTier, action.tier),
      }

    case 'recordDefeat':
      return {
        ...state,
        monstersDefeated: state.monstersDefeated.includes(action.monsterId)
          ? state.monstersDefeated
          : [...state.monstersDefeated, action.monsterId],
        stats: { ...state.stats, battlesWon: state.stats.battlesWon + 1 },
      }

    case 'hydrate':
      return action.save

    default:
      return state
  }
}
