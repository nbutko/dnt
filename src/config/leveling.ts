// D&D-shaped leveling data (m3-scope.html#leveling) — the XP-to-level table,
// the ASI cadence, the proficiency ramp, and the per-level HP scale. Pure
// data + trivial index lookups; engine/character/leveling.ts (Story 2) is
// where levelForXp/grantsForLevel/applyAsi actually turn this into a
// character's derived numbers.

// 5e's own XP table (m3-scope.html: "0, 300, 900, 2700, 6500, 14000, … as
// the starting curve") — index 0 is level 1's threshold (0 XP). Whether this
// wants compressing for dnt's reward economy is an explicit M5 pacing
// question (m3-scope.html#open "XP pacing"), not a Story 1 one.
export const XP_THRESHOLDS: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000,
  265000, 305000, 355000,
]

// The 5e cadence, exact per the scope: "+2 points to spend... at levels 4,
// 8, 12, 16, and 19."
export const ASI_LEVELS: readonly number[] = [4, 8, 12, 16, 19]

// The classic 5e proficiency ramp (+2…+6), added to every encounter d20
// (m3-scope.html#leveling) — index 0 is level 1's bonus. Same length as
// XP_THRESHOLDS so every level the XP table covers has a bonus.
export const PROFICIENCY_BY_LEVEL: readonly number[] = [
  2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
]

// Level-1 HP = class hit die × HP_SCALE, landing a d10 Fighter near 40 (today's
// combat.playerMaxHp) and a d6 Wizard "a bit under" — m3-scope.html#open's
// HP-scale decision, exact call: 10 × 4 = 40, 6 × 4 = 24. Every level after
// adds the class hit die's average roll (rounded up) × HP_SCALE + CON mod ×
// HP_SCALE — that formula itself is Story 2's engine/character/leveling.ts,
// this is just the one scale constant it reads. A Story 13/M5 placeholder.
export const HP_SCALE = 4

// content-plan-v2-tuning-implementation.html Story 4: D1's on-track anchor
// (L2 @ 10wpm) measured a near-unwinnable ~3% against the Goblin Boss even
// after softening its cadence (monsters.json) and widening the player's time
// budget (config/combat.ts's playerBaselineWpm) — a level-1-3 character
// simply doesn't have the HP margin to survive to its own 2nd-3rd landed hit.
// A flat survivability bonus (index 0 = level 1), read by
// engine/character/modifiers.ts's totalHpForLevel keyed off the character's
// CURRENT level only — deliberately NOT folded into grantsForLevel's
// per-level hpAdded, which totalHpForLevel sums cumulatively across every
// level up to the current one, because that would make an early bonus a
// permanent flat add carried into every later dungeon's fights too. Applying
// it only at the current level means it buys margin exactly at the tier a
// fresh character is fighting (levels 1-3 -> D1-D2) and vanishes the moment
// they level past it (0 for level 4+) — "less frenetic," not a stealth
// buff to the whole game. Landed via content-pipeline/retune-sweep.ts against
// Goblin Boss's softened cadence (see monsters.json) — tuned together, not
// derived on paper.
export const EARLY_LEVEL_HP_BONUS: readonly number[] = [24, 16, 8]

const clampLevel = (level: number, table: readonly number[]): number => Math.min(Math.max(level, 1), table.length)

// Small bounds-checked lookups, not the leveling engine itself — levelForXp
// (which threshold an XP total currently sits at) is Story 2's job.
export const getXpThreshold = (level: number): number => XP_THRESHOLDS[clampLevel(level, XP_THRESHOLDS) - 1]

export const getProficiencyBonus = (level: number): number =>
  PROFICIENCY_BY_LEVEL[clampLevel(level, PROFICIENCY_BY_LEVEL) - 1]
