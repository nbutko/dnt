import abilitiesConfig from '../config/abilities'
import combat from '../config/combat'
import textBank from '../content/text-banks'
import type { PlayerModifiers } from '../domain/progression'
import type { BattleState, Monster, TextTier } from '../domain/types'
import { createBattle } from '../engine/battle'
import { tierGatePenalty } from '../engine/damage'
import { bandToServedTier } from '../engine/dice/band'
import type { EncounterRoll } from '../engine/dice/encounter-roll'
import { createRng } from '../engine/rng'

export interface BattleStore {
  subscribe(callback: () => void): () => void
  getSnapshot(): BattleState
  tick(dtMs: number): void
  submit(input: string): void
}

// CHA intimidate / Bard debuff (m3-scope.html#ability-mechanics): cut the
// monster's effective wpm once, at fight start — baked into the Monster
// object handed to createBattle, so every prompt this fight reads the
// already-debuffed wpm without re-applying it per prompt. Floored at 10% of
// the original wpm so an extreme cut (or a very negative CHA inflating it
// the other way) can never zero out or invert the monster's speed. A pure,
// synchronous export (unlike createBattleStore below) so it's headlessly
// testable without the async text-bank lookup.
export const intimidatedMonster = (monster: Monster, intimidateWpmCut: number): Monster => ({
  ...monster,
  wpm: monster.wpm * Math.max(0.1, 1 - intimidateWpmCut),
})

// The dungeon's frozen encounter roll (Story 6's EncounterModal, committed to
// via its Begin Battle) plus the dungeon's own textTierRange — everything
// bandToServedTier needs to turn the band into this fight's served/target
// tier (finding C). Ephemeral simulation state; never persisted.
export interface FightEncounter {
  roll: EncounterRoll
  textTierRange: readonly [TextTier, TextTier]
}

export interface ResolvedFightTier {
  servedTier: TextTier
  targetTier: TextTier
  // This fight's crit rule (m3-scope.html#encounter-roll): a fumble (natural
  // 1) suppresses crits outright and caps every hit at fumbleDamageMultiplier;
  // an inspired nat-20 (or any other guaranteedFirstCrit source already on
  // PlayerModifiers) forces the first landed hit to crit.
  noCrits: boolean
  fumbleDamageMultiplier: number
  guaranteedFirstCrit: boolean
}

// The fumble's flat damage cap (m3-scope.html#encounter-roll: "damage x0.75
// this fight") — its own named constant since it's referenced from both the
// resolver below and its doc comment.
const FUMBLE_DAMAGE_MULTIPLIER = 0.75

// Pure + synchronous (unlike createBattleStore below, which awaits the text
// bank) so the encounter-wiring is unit-testable without the async lookup.
// `encounter` is optional: omitting it (an older/direct caller, or a test that
// doesn't care about the d20) falls back to the pre-Story-12 placeholder —
// the monster's own textTier gated by INT, no fumble/inspired crit rule —
// exactly what createBattleStore used to hard-code inline.
export const resolveFightTier = (
  monster: Monster,
  modifiers: PlayerModifiers,
  encounter?: FightEncounter,
): ResolvedFightTier => {
  if (!encounter) {
    return {
      servedTier: Math.min(monster.textTier, modifiers.intTierCap) as TextTier,
      targetTier: monster.textTier,
      noCrits: false,
      fumbleDamageMultiplier: 1,
      guaranteedFirstCrit: modifiers.guaranteedFirstCrit,
    }
  }
  const { roll, textTierRange } = encounter
  const { servedTier, targetTier } = bandToServedTier(roll.band, textTierRange, modifiers.intTierCap)
  return {
    servedTier,
    targetTier,
    noCrits: roll.fumble,
    fumbleDamageMultiplier: roll.fumble ? FUMBLE_DAMAGE_MULTIPLIER : 1,
    guaranteedFirstCrit: modifiers.guaranteedFirstCrit || roll.inspired,
  }
}

// The useSyncExternalStore adapter over one createBattle() instance. Also
// where the async content lookup (text banks) happens once, at setup, so the
// battle engine itself only ever sees a resolved, synchronous PromptSource.
// Takes the full Monster + the player's resolved character/weapon/buff
// modifiers (engine/character/modifiers.ts, M3 Story 3) plus this fight's
// frozen `encounter` roll (Story 6/12: the d20 committed to in EncounterModal)
// — servedTier/targetTier and the fumble/inspired crit rule all come from
// resolveFightTier above, closing the finding-C/D TODOs that used to hard-code
// the monster's own textTier here.
export const createBattleStore = async (
  monster: Monster,
  modifiers: PlayerModifiers,
  seed = Date.now(),
  encounter?: FightEncounter,
): Promise<BattleStore> => {
  const rng = createRng(seed)
  const { servedTier, targetTier, noCrits, fumbleDamageMultiplier, guaranteedFirstCrit } =
    resolveFightTier(monster, modifiers, encounter)
  const playerPrompts = await textBank.makePromptSource(servedTier, rng)
  const monsterPrompts = await textBank.makePromptSource(monster.textTier, rng)

  const battle = createBattle({
    combat: { ...combat, playerMaxHp: modifiers.maxHp },
    monster: intimidatedMonster(monster, modifiers.intimidateWpmCut),
    playerPrompts,
    monsterPrompts,
    rng,
    tierGatePenalty: tierGatePenalty(servedTier, targetTier),
    // Story 7: the equipped weapon's dice + the Wizard's arcane crit count.
    weaponDie: modifiers.weaponDie,
    weaponAbilityMod: modifiers.weaponAbilityMod,
    damageScale: abilitiesConfig.damageScale,
    critCount: modifiers.arcaneCritMult,
    guaranteedFirstCrit,
    // Story 11: DEX dodge, Fighter Second Wind, Rogue Sneak Attack — all
    // resolve automatically inside engine/battle.ts and surface as a flash.
    dodgeChance: modifiers.dodgeChance,
    secondWind: modifiers.secondWind,
    sneakAttackDice: modifiers.sneakAttackDice,
    // Story 12: a fumble (encounter d20 natural 1) suppresses crits and caps
    // every hit this fight — see resolveFightTier above.
    noCrits,
    fumbleDamageMultiplier,
  })

  return {
    subscribe: battle.subscribe,
    getSnapshot: battle.getState,
    tick: battle.tick,
    submit: battle.submitPlayerAttack,
  }
}
