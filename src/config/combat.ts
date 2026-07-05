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
  // Loosened from 15 after real playtesting felt rushed: the countdown
  // starts the instant a prompt appears, so the budget also has to cover
  // reading the line, not just typing it. See playerReadingBufferMs below.
  playerBaselineWpm: 12,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  // Flat headroom added to every player time limit for reading/reacting to
  // a fresh prompt before typing starts, on top of the typing-time estimate.
  playerReadingBufferMs: 2000,
  playerMaxHp: 100,
  // How long a "Time Limit Expired" pause holds (either side) before the
  // next prompt draws.
  missPauseMs: 2000,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

export default combatConfig
