import type { BattleConfig, BattleEvent, BattleState, BattleStatus } from '../domain/types'
import { computeDamage, computeMonsterDamage } from './damage'
import { createMonsterTyper, expectedTypingTimeMs } from './monster-typing'

export interface Battle {
  getState(): BattleState
  subscribe(callback: () => void): () => void
  tick(dtMs: number): void
  submitPlayerAttack(input: string): void
}

// createBattle wires the damage math (Story 2) and the monster typer
// (Story 3) into the independent player/monster attack cycles described in
// game-design.html. It's the only place combat state lives; the UI (Story 5)
// only ever reads getState()/subscribe() and calls tick()/submitPlayerAttack().
export const createBattle = (config: BattleConfig): Battle => {
  const { combat, monster, playerPrompts, monsterPrompts, rng } = config

  let status: BattleStatus = 'ongoing'
  let playerHp = combat.playerMaxHp
  let monsterHp = monster.hp
  let lastEvent: BattleEvent | undefined

  const playerTimeLimitFor = (promptText: string): number =>
    Math.max(
      combat.playerTimeLimitFloorMs,
      expectedTypingTimeMs(promptText.length, combat.playerBaselineWpm, combat),
    )

  let playerPrompt = playerPrompts()
  let playerAttempt = 0
  let playerTimeLimitMs = playerTimeLimitFor(playerPrompt)
  let playerElapsedMs = 0

  let monsterPromptText = monsterPrompts()
  let monsterTyper = createMonsterTyper(monster, monsterPromptText, rng, combat)

  const listeners = new Set<() => void>()
  let snapshot: BattleState

  const rebuildSnapshot = (): void => {
    const monsterTyperState = monsterTyper.getState()
    snapshot = {
      status,
      player: {
        hp: playerHp,
        maxHp: combat.playerMaxHp,
        prompt: playerPrompt,
        attempt: playerAttempt,
        timeLimitMs: playerTimeLimitMs,
        elapsedMs: playerElapsedMs,
      },
      monster: {
        id: monster.id,
        hp: monsterHp,
        maxHp: monster.hp,
        prompt: monsterPromptText,
        typed: monsterTyperState.typed,
        timeLimitMs: monsterTyperState.timeLimitMs,
        elapsedMs: monsterTyperState.elapsedMs,
      },
      lastEvent,
    }
  }

  const checkOutcome = (): void => {
    if (playerHp <= 0) {
      status = 'lost'
    } else if (monsterHp <= 0) {
      status = 'won'
    }
  }

  const advancePlayerPrompt = (): void => {
    playerPrompt = playerPrompts()
    playerAttempt += 1
    playerTimeLimitMs = playerTimeLimitFor(playerPrompt)
    playerElapsedMs = 0
  }

  const advanceMonsterPrompt = (): void => {
    monsterPromptText = monsterPrompts()
    monsterTyper = createMonsterTyper(monster, monsterPromptText, rng, combat)
  }

  const notify = (): void => {
    listeners.forEach((listener) => listener())
  }

  const getState = (): BattleState => snapshot

  const subscribe = (callback: () => void): (() => void) => {
    listeners.add(callback)
    return () => listeners.delete(callback)
  }

  const tick = (dtMs: number): void => {
    if (status !== 'ongoing') return

    playerElapsedMs += dtMs
    if (playerElapsedMs >= playerTimeLimitMs) {
      lastEvent = { side: 'player', kind: 'expire' }
      advancePlayerPrompt()
    }

    monsterTyper.advance(dtMs)
    const monsterTyperState = monsterTyper.getState()
    if (monsterTyperState.done) {
      const damage = computeMonsterDamage({
        charCount: monsterPromptText.length,
        timeUsedMs: monsterTyperState.elapsedMs,
        timeLimitMs: monsterTyperState.timeLimitMs,
        combat,
      })
      playerHp = Math.max(0, playerHp - damage)
      lastEvent = { side: 'monster', kind: 'hit', damage }
      advanceMonsterPrompt()
    } else if (monsterTyperState.failed) {
      lastEvent = { side: 'monster', kind: 'miss' }
      advanceMonsterPrompt()
    }

    checkOutcome()
    rebuildSnapshot()
    notify()
  }

  // Return only counts as a submit once input length matches the target
  // (see game-design.html#submitting); a shorter input is the caller's job
  // to treat as a literal character, not a submit attempt.
  const submitPlayerAttack = (input: string): void => {
    if (status !== 'ongoing') return
    if (input.length !== playerPrompt.length) return

    if (input === playerPrompt) {
      const result = computeDamage({
        charCount: playerPrompt.length,
        timeUsedMs: playerElapsedMs,
        timeLimitMs: playerTimeLimitMs,
        combat,
        rng,
      })
      monsterHp = Math.max(0, monsterHp - result.damage)
      lastEvent = { side: 'player', kind: 'hit', damage: result.damage }
    } else {
      lastEvent = { side: 'player', kind: 'miss' }
    }

    advancePlayerPrompt()
    checkOutcome()
    rebuildSnapshot()
    notify()
  }

  rebuildSnapshot()

  return { getState, subscribe, tick, submitPlayerAttack }
}
