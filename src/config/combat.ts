import type { CombatConfig } from '../domain/types'

// All combat tuning knobs live here — retuned in Story 6's balance harness,
// never scattered through engine code.
const combatConfig: CombatConfig = {
  baseDamage: 20,
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
