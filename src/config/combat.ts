import type { CombatConfig } from '../domain/types'

// All combat tuning knobs live here — retuned in Story 6's balance harness,
// never scattered through engine code.
const combatConfig: CombatConfig = {
  // Landed via engine/sim/balance.ts against the Slime/Goblin roster: at 10
  // this puts a beginner-ish player (~15-18wpm) through the tutorial Slime
  // fight in ~30-35s and the tougher Goblin in ~45-55s, while a much
  // slower/sloppier player genuinely risks losing (see balance.test.ts).
  baseDamage: 10,
  referenceLength: 12,
  lengthFactorFloor: 0.25,
  playerBaselineWpm: 15,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  playerMaxHp: 100,
  monsterSlack: 1.75,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

export default combatConfig
