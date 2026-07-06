// The D&D character layer (m3-scope.html) — the persistent hero that
// resolveModifiers() (engine/character/modifiers.ts, Story 3) will fold into
// combat numbers. Pure types + the one formula every ability-driven number
// leans on; the real per-point magnitudes live in config/abilities.ts and
// config/leveling.ts (Story 1), not here.

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type AbilityScores = Record<Ability, number>

export type CharacterClass = 'fighter' | 'wizard' | 'rogue' | 'bard'

export interface Character {
  name: string
  class: CharacterClass
  level: number
  // A running total that crosses level thresholds automatically (m3-scope.html
  // "What this changes" table) — no longer a spendable currency like M2's xp.
  xp: number
  abilities: AbilityScores
  // Ability Score Improvement points banked by a level-up (engine/character/
  // leveling.ts's grantsForLevel, Story 2) waiting to be spent via the save
  // reducer's applyAsi — the Inn's ASI panel (Story 5) is the only UI for it.
  pendingAsi: number
}

// The one D&D formula everything ability-driven leans on: 8 -> -1, 10/11 -> 0,
// 15 -> +2, 20 -> +5. See docs/m3-scope.html.
export const abilityMod = (score: number): number => Math.floor((score - 10) / 2)
