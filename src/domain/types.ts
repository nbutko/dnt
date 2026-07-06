export interface Rng {
  next(): number
  sample(mean: number, variance: number): number
}

export type TextTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type PromptSource = () => string

export interface TextBank {
  loadTier(tier: TextTier): Promise<readonly string[]>
  makePromptSource(tier: TextTier, rng: Rng): Promise<PromptSource>
}

export type MonsterRole = 'regular' | 'boss' | 'mimic'

export interface Monster {
  id: string
  name: string
  tier: number
  role: MonsterRole
  // The dungeon habitat this roster entry belongs to (m2-scope.html#dungeon-tiers)
  // — "Any Habitat" manual entries get reflavored directly into a thin
  // habitat's roster rather than modeled as a separate generic pool.
  habitat: string
  hp: number
  textTier: TextTier
  wpm: number
  accuracy: number
  attention: number
  // Its own attack's time limit = expected typing time x slack (see
  // game-design.html#monster-ai). Per-monster (not a shared constant) since
  // a "sloppy" monster and a disciplined one need very different slack to
  // land the same rough miss rate — see content/monsters.json.
  slack: number
  flavor: string
}

export interface CombatConfig {
  baseDamage: number
  referenceLength: number
  lengthFactorFloor: number
  playerBaselineWpm: number
  avgWordLength: number
  playerTimeLimitFloorMs: number
  playerReadingBufferMs: number
  playerMaxHp: number
  missPauseMs: number
  criticalChance: number
  criticalDamageMultiplier: number
  typingVariance: number
}

export interface BattleConfig {
  combat: CombatConfig
  monster: Monster
  playerPrompts: PromptSource
  monsterPrompts: PromptSource
  rng: Rng
  // Constant for the whole fight (m2-scope.html#wordsmith-gate) — computed
  // once by battle-store from the served vs. monster text tier. Defaults to
  // 1 (no gate) so existing callers/tests that don't know about Wordsmith
  // are unaffected.
  tierGatePenalty?: number
  // The equipped weapon + this fight's crit rule (Story 7: engine/damage.ts's
  // computeDamage). All optional — a caller that doesn't pass a weapon falls
  // back to computeDamage's own defaults, so older tests/sim code still run.
  weaponDie?: number
  weaponAbilityMod?: number
  damageScale?: number
  critCount?: number
  // The encounter d20's nat-20 "INSPIRED" result (Story 6): this fight's
  // first landed player hit always crits. Not wired to a live caller yet —
  // that's Story 12's EncounterRoll plumbing — so it defaults to false.
  guaranteedFirstCrit?: boolean
  // The encounter d20's natural-1 "FUMBLE" result: no crits this fight, plus
  // fumbleDamageMultiplier caps every hit. Same Story 12 TODO as above.
  noCrits?: boolean
  fumbleDamageMultiplier?: number
  // Story 11's automatic class features (engine/character/modifiers.ts's
  // PlayerModifiers, threaded in by state/battle-store.ts). All optional,
  // defaulting to "no effect", so older tests/sim callers keep compiling.
  // DEX dodge: chance [0,1] a monster hit is negated outright.
  dodgeChance?: number
  // Fighter Second Wind: once per battle, the first time player HP crosses
  // <= hpThresholdPct of max, auto-heal healPct of max HP. null (the
  // default) means the character has no Second Wind feature.
  secondWind?: { hpThresholdPct: number; healPct: number } | null
  // Rogue Sneak Attack: +sneakAttackDice d6 folded into the first landed hit
  // of the fight and into every crit (engine/damage.ts's computeDamage).
  sneakAttackDice?: number
}

export interface PlayerState {
  hp: number
  maxHp: number
  prompt: string
  // Increments every new prompt cycle, even if the drawn text repeats — lets
  // the UI reset its typed-input box on a real prompt change rather than a
  // text change (two different lines can be identical strings).
  attempt: number
  timeLimitMs: number
  elapsedMs: number
  // True for a brief pause after the time limit expires, before the next
  // prompt is drawn — gives the UI a moment to show "time's up" feedback
  // instead of silently swapping to a new line.
  paused: boolean
  // Which kind of miss triggered the current pause — undefined when not
  // paused. Lets the UI show a different message for "ran out of time" vs
  // "typed the wrong thing" instead of one generic pause message.
  pauseReason?: 'expire' | 'miss'
  // This battle's running WPM so far — (chars typed / combat.avgWordLength)
  // over (typing time so far / 60000), accumulated across every correctly-
  // submitted prompt (Story 12: finally lights up SaveData.stats.bestWpm).
  // 0 before the first landed hit (nothing to divide by yet).
  wpm: number
}

export interface MonsterState {
  id: string
  hp: number
  maxHp: number
  prompt: string
  typed: string
  timeLimitMs: number
  elapsedMs: number
  // True for a brief pause after the monster's own time limit expires,
  // before its next prompt is drawn — mirrors PlayerState.paused.
  paused: boolean
}

export type BattleEventSide = 'player' | 'monster'
// 'dodge' (Story 11): a monster attack that landed but was negated by DEX
// dodge — no damage, no HP loss. Emitted instead of 'hit' for that swing.
export type BattleEventKind = 'hit' | 'miss' | 'expire' | 'dodge'

export interface BattleEvent {
  side: BattleEventSide
  kind: BattleEventKind
  damage?: number
  // Player 'hit' only (Story 7): the individual weapon-die rolls this swing
  // (length 1 normally, `critCount` on a crit, plus any Sneak Attack d6s) and
  // whether it crit — Story 11's floating damage popup reads these to show
  // the rolled number(s).
  diceRolled?: number[]
  isCrit?: boolean
  // Player 'hit' only (Story 11): true when Sneak Attack dice were folded
  // into this swing (the first landed hit of the fight, or any crit).
  isSneakAttack?: boolean
  // Monster 'hit'/'dodge' only (Story 11): true the one tick Second Wind
  // auto-heals — riding on the same event as the monster's swing rather than
  // a separate kind, since both can land on the same tick.
  secondWindTriggered?: boolean
}

export type BattleStatus = 'ongoing' | 'won' | 'lost'

export interface BattleState {
  status: BattleStatus
  player: PlayerState
  monster: MonsterState
  lastEvent?: BattleEvent
}

export interface DamageResult {
  damage: number
  isCrit: boolean
  lengthFactor: number
  speedBonus: number
  // The individual weapon-die rolls this swing summed into `damage` — length
  // 1 normally, `critCount` on a crit (2, or 3 for the Wizard's arcane crit),
  // plus any Sneak Attack d6s appended on top. Story 11's floating damage
  // popup shows these.
  diceRolled: number[]
  // Rogue Sneak Attack (Story 11): true when this swing's diceRolled
  // includes bonus d6s (the first landed hit of the fight, or any crit).
  isSneakAttack: boolean
}
