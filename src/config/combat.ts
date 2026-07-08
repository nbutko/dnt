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
  // Soft ceiling lengthFactor asymptotically approaches — see engine/
  // damage.ts's lengthFactor and domain/types.ts's CombatConfig doc comment.
  // Landed via content-pipeline/retune-sweep.ts against content/monsters.json's
  // re-authored boss HP (content-plan-v2-tuning-implementation.html Story 1):
  // tuned together, not derived on paper.
  lengthFactorCap: 20,
  // Loosened from 15 after real playtesting felt rushed: the countdown
  // starts the instant a prompt appears, so the budget also has to cover
  // reading the line, not just typing it. See playerReadingBufferMs below.
  playerBaselineWpm: 12,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  // Flat headroom added to every player time limit for reading/reacting to
  // a fresh prompt before typing starts, on top of the typing-time estimate.
  playerReadingBufferMs: 2000,
  // Landed via engine/sim/explore.test.ts (a disposable sweep, same
  // methodology as baseDamage/slack above) against a simulated player who
  // times out a fraction of their prompts instead of ever mistyping them.
  // At the old value of 100, the monster's own slow attack cycle meant even
  // a player who timed out on *every* prompt took ~140-200s to actually
  // lose, and a 30% timeout rate barely dented the player's win rate. 40
  // makes a 100%-timeout loss land in ~60-90s (still slower than a clean
  // ~30-45s win, but no longer absurd), and puts the Goblin's breakeven
  // right around the requested "~30% of phrases missed" — the easier Slime
  // is more forgiving (breakeven closer to ~45-50%), which is fine for the
  // tutorial fight.
  playerMaxHp: 40,
  // How long a "Time Limit Expired" pause holds (either side) before the
  // next prompt draws.
  missPauseMs: 2000,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

export default combatConfig
