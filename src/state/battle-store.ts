import combat from '../config/combat'
import { getMonster } from '../content/monsters'
import textBank from '../content/text-banks'
import type { BattleState } from '../domain/types'
import { createBattle } from '../engine/battle'
import { createRng } from '../engine/rng'

export interface BattleStore {
  subscribe(callback: () => void): () => void
  getSnapshot(): BattleState
  tick(dtMs: number): void
  submit(input: string): void
}

const PLAYER_TEXT_TIER = 1 // M0 has no skill tree yet; Wordsmith unlocks later tiers in M2.

// The useSyncExternalStore adapter over one createBattle() instance. Also
// where the async content lookup (text banks) happens once, at setup, so the
// battle engine itself only ever sees a resolved, synchronous PromptSource.
export const createBattleStore = async (monsterId: string, seed = Date.now()): Promise<BattleStore> => {
  const monster = getMonster(monsterId)
  const rng = createRng(seed)
  const playerPrompts = await textBank.makePromptSource(PLAYER_TEXT_TIER, rng)
  const monsterPrompts = await textBank.makePromptSource(monster.textTier, rng)

  const battle = createBattle({ combat, monster, playerPrompts, monsterPrompts, rng })

  return {
    subscribe: battle.subscribe,
    getSnapshot: battle.getState,
    tick: battle.tick,
    submit: battle.submitPlayerAttack,
  }
}
