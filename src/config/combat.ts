import type { CombatConfig } from '../domain/types'

// All combat tuning knobs live here, never scattered through engine code.
// Retuned twice: M0 Story 6's balance harness landed the original values,
// and the M4 combat-tuning pass (content-plan-v2-tuning-implementation.html)
// re-tuned a subset against the 14-tier content's much longer prompts —
// `lengthFactorCap` (new) and `playerBaselineWpm` (12 → 8) are that pass's
// changed knobs; everything else here is unchanged since M0. Both passes are
// now closed: every value below is the current committed baseline and
// stays frozen until the next deliberate, reviewed retune, not a drive-by
// edit (CLAUDE.md's architecture invariants).
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
  // Lowered again, 12 -> 8, in Story 4 (content-plan-v2-tuning-implementation.
  // html): this is the assumed typing speed the player's OWN time limit is
  // budgeted against (independent of a monster's own clock), and 12 sat
  // ABOVE D1's on-track (10wpm) and behind (7wpm) anchors — a genuine
  // beginner was budgeted less time than their own real typing needs and
  // timed out on their own prompt regardless of HP or the monster. 8 clears
  // both D1 anchors with margin; verified via retune-sweep.ts that a fast
  // typist's speedBonus (already near its 2x cap everywhere the player's
  // actual wpm exceeds this baseline) barely moves at the high end.
  playerBaselineWpm: 8,
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
