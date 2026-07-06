import abilitiesConfig from '../../config/abilities'
import type { CombatConfig, Monster } from '../../domain/types'
import { createBattle } from '../battle'
import { expectedTypingTimeMs } from '../monster-typing'
import { createRng } from '../rng'

export interface SimulatedPlayer {
  wpm: number
  accuracy: number
  // Optional (Story 7) — a bare SimulatedPlayer falls back to computeDamage's
  // own default weapon, so older callers/tests don't need updating.
  weaponDie?: number
  weaponAbilityMod?: number
}

export interface BalanceSimConfig {
  monster: Monster
  combat: CombatConfig
  player: SimulatedPlayer
  prompt: string
  battles: number
  seed?: number
  dtMs?: number
  maxTicks?: number
}

export interface BalanceResult {
  winRate: number
  medianDurationMs: number
  // monster.hp / (average damage per landed player hit) — the ratio Story
  // 13's "HP-scale decision" (m3-scope.html#open) tunes toward a healthy
  // multi-prompt band, independent of absolute HP/damage scale.
  hitsToKill: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Headless "N battles at player wpm X vs monster Y" harness — the whole point
// is answering "what win rate / duration does this matchup produce" without
// playing it by hand, so `baseDamage`, `playerBaselineWpm`, and monster stats
// can be tuned before any UI exists. Not a full per-character typing model
// (that's engine/monster-typing.ts) — the simulated player submits on a
// sampled cadence derived from their own wpm, hitting or missing per a single
// per-attempt accuracy roll.
export const simulateBattles = (config: BalanceSimConfig): BalanceResult => {
  const { monster, combat, player, prompt, battles, seed = 1, dtMs = 50, maxTicks = 4000 } = config
  const typingTimeMs = expectedTypingTimeMs(prompt.length, player.wpm, combat)
  const durations: number[] = []
  let wins = 0
  let totalDamageDealt = 0
  let totalHitsLanded = 0

  for (let i = 0; i < battles; i += 1) {
    const rng = createRng(seed + i)
    const battle = createBattle({
      combat,
      monster,
      playerPrompts: () => prompt,
      monsterPrompts: () => prompt,
      rng,
      weaponDie: player.weaponDie,
      weaponAbilityMod: player.weaponAbilityMod,
      damageScale: abilitiesConfig.damageScale,
    })

    let elapsedMs = 0
    let nextSubmitAtMs = typingTimeMs
    for (let tick = 0; tick < maxTicks && battle.getState().status === 'ongoing'; tick += 1) {
      battle.tick(dtMs)
      elapsedMs += dtMs
      if (elapsedMs >= nextSubmitAtMs) {
        const currentPrompt = battle.getState().player.prompt
        const isHit = rng.next() < player.accuracy
        const hpBefore = battle.getState().monster.hp
        battle.submitPlayerAttack(isHit ? currentPrompt : 'x'.repeat(currentPrompt.length))
        const hpAfter = battle.getState().monster.hp
        if (hpBefore > hpAfter) {
          totalDamageDealt += hpBefore - hpAfter
          totalHitsLanded += 1
        }
        nextSubmitAtMs = elapsedMs + rng.sample(typingTimeMs, combat.typingVariance)
      }
    }

    if (battle.getState().status === 'won') wins += 1
    durations.push(elapsedMs)
  }

  const avgDamagePerHit = totalHitsLanded > 0 ? totalDamageDealt / totalHitsLanded : 0

  return {
    winRate: wins / battles,
    medianDurationMs: median(durations),
    hitsToKill: avgDamagePerHit > 0 ? monster.hp / avgDamagePerHit : Infinity,
  }
}
