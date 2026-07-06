import combat from '../config/combat'
import textBank from '../content/text-banks'
import type { PlayerModifiers } from '../domain/progression'
import type { BattleState, Monster, TextTier } from '../domain/types'
import { createBattle } from '../engine/battle'
import { tierGatePenalty } from '../engine/damage'
import { createRng } from '../engine/rng'

export interface BattleStore {
  subscribe(callback: () => void): () => void
  getSnapshot(): BattleState
  tick(dtMs: number): void
  submit(input: string): void
}

// The useSyncExternalStore adapter over one createBattle() instance. Also
// where the async content lookup (text banks) happens once, at setup, so the
// battle engine itself only ever sees a resolved, synchronous PromptSource.
// Takes the full Monster + the player's resolved character/weapon/buff
// modifiers (engine/character/modifiers.ts, M3 Story 3) — the served text
// tier and the resulting damage gate (m2-scope.html#wordsmith-gate, now INT-
// driven) are computed once here, for the whole fight. The richer M3 fields
// (weaponDie, crit/dodge bonuses, class features, …) aren't consumed yet —
// later stories (7, 9, 11) light them up; this story only widens the input
// without changing the combat math.
export const createBattleStore = async (
  monster: Monster,
  modifiers: PlayerModifiers,
  seed = Date.now(),
): Promise<BattleStore> => {
  const rng = createRng(seed)
  const servedTier = Math.min(monster.textTier, modifiers.intTierCap) as TextTier
  const playerPrompts = await textBank.makePromptSource(servedTier, rng)
  const monsterPrompts = await textBank.makePromptSource(monster.textTier, rng)

  const battle = createBattle({
    combat: { ...combat, playerMaxHp: modifiers.maxHp },
    monster,
    playerPrompts,
    monsterPrompts,
    rng,
    tierGatePenalty: tierGatePenalty(servedTier, monster.textTier),
  })

  return {
    subscribe: battle.subscribe,
    getSnapshot: battle.getState,
    tick: battle.tick,
    submit: battle.submitPlayerAttack,
  }
}
