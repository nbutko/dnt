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

export interface Monster {
  id: string
  name: string
  tier: number
  hp: number
  textTier: TextTier
  wpm: number
  accuracy: number
  attention: number
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
  playerMissPauseMs: number
  monsterSlack: number
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
}

export interface MonsterState {
  id: string
  hp: number
  maxHp: number
  prompt: string
  typed: string
  timeLimitMs: number
  elapsedMs: number
}

export type BattleEventSide = 'player' | 'monster'
export type BattleEventKind = 'hit' | 'miss' | 'expire'

export interface BattleEvent {
  side: BattleEventSide
  kind: BattleEventKind
  damage?: number
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
  critMultiplier: number
}
