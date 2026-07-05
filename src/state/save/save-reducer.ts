import type { SaveData, SkillBranchId } from '../../domain/save'

export type SaveAction =
  | { type: 'award'; coins: number; xp: number }
  | { type: 'purchaseSkillNode'; branch: SkillBranchId; cost: number }
  | { type: 'unlockTier'; tier: number }
  | { type: 'recordDefeat'; monsterId: string }
  | { type: 'hydrate'; save: SaveData }

// Cost is passed in rather than looked up here: the reducer stays a pure
// function of (state, action) with no import of config/skill-tree.ts (Story
// 4), matching the "save never imports combat/config-that-knows-about-combat"
// seam rule in m2-implementation.html. Callers (the Inn UI, Story 5) read
// the cost from config before dispatching.
export const award = (coins: number, xp: number): SaveAction => ({ type: 'award', coins, xp })

export const purchaseSkillNode = (branch: SkillBranchId, cost: number): SaveAction => ({
  type: 'purchaseSkillNode',
  branch,
  cost,
})

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
    case 'award':
      return { ...state, coins: state.coins + action.coins, xp: state.xp + action.xp }

    case 'purchaseSkillNode':
      return {
        ...state,
        xp: state.xp - action.cost,
        skillTree: {
          ...state.skillTree,
          [action.branch]: state.skillTree[action.branch] + 1,
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
