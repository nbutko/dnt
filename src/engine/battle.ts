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
  const { combat, monster, playerPrompts, monsterPrompts, rng, tierGatePenalty = 1 } = config

  let status: BattleStatus = 'ongoing'
  let playerHp = combat.playerMaxHp
  let monsterHp = monster.hp
  let lastEvent: BattleEvent | undefined

  const playerTimeLimitFor = (promptText: string): number =>
    Math.max(
      combat.playerTimeLimitFloorMs,
      combat.playerReadingBufferMs +
        expectedTypingTimeMs(promptText.length, combat.playerBaselineWpm, combat),
    )

  let playerPrompt = playerPrompts()
  let playerAttempt = 0
  let playerTimeLimitMs = playerTimeLimitFor(playerPrompt)
  let playerElapsedMs = 0
  let playerPauseRemainingMs = 0
  let playerPauseReason: 'expire' | 'miss' | undefined

  let monsterPromptText = monsterPrompts()
  let monsterTyper = createMonsterTyper(monster, monsterPromptText, rng, combat)
  let monsterPauseRemainingMs = 0

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
        paused: playerPauseRemainingMs > 0,
        pauseReason: playerPauseRemainingMs > 0 ? playerPauseReason : undefined,
      },
      monster: {
        id: monster.id,
        hp: monsterHp,
        maxHp: monster.hp,
        prompt: monsterPromptText,
        typed: monsterTyperState.typed,
        timeLimitMs: monsterTyperState.timeLimitMs,
        elapsedMs: monsterTyperState.elapsedMs,
        paused: monsterPauseRemainingMs > 0,
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

    if (playerPauseRemainingMs > 0) {
      playerPauseRemainingMs = Math.max(0, playerPauseRemainingMs - dtMs)
      if (playerPauseRemainingMs === 0 && status === 'ongoing') advancePlayerPrompt()
    } else {
      playerElapsedMs += dtMs
      if (playerElapsedMs >= playerTimeLimitMs) {
        lastEvent = { side: 'player', kind: 'expire' }
        playerPauseRemainingMs = combat.missPauseMs
        playerPauseReason = 'expire'
      }
    }

    if (monsterPauseRemainingMs > 0) {
      monsterPauseRemainingMs = Math.max(0, monsterPauseRemainingMs - dtMs)
      if (monsterPauseRemainingMs === 0 && status === 'ongoing') advanceMonsterPrompt()
    } else {
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
        checkOutcome()
        if (status === 'ongoing') advanceMonsterPrompt()
      } else if (monsterTyperState.failed) {
        // Its own timeout, same as the player's — pause with a visible
        // "missed" beat before drawing a fresh prompt. See game-design.html
        // #monster-ai and content/monsters.ts for the per-monster slack.
        lastEvent = { side: 'monster', kind: 'miss' }
        monsterPauseRemainingMs = combat.missPauseMs
      }
    }

    rebuildSnapshot()
    notify()
  }

  // Return only counts as a submit once input length matches the target
  // (see game-design.html#submitting); a shorter input is the caller's job
  // to treat as a literal character, not a submit attempt.
  const submitPlayerAttack = (input: string): void => {
    if (status !== 'ongoing') return
    if (playerPauseRemainingMs > 0) return
    if (input.length !== playerPrompt.length) return

    if (input === playerPrompt) {
      const result = computeDamage({
        charCount: playerPrompt.length,
        timeUsedMs: playerElapsedMs,
        timeLimitMs: playerTimeLimitMs,
        combat,
        rng,
        tierGatePenalty,
      })
      monsterHp = Math.max(0, monsterHp - result.damage)
      lastEvent = { side: 'player', kind: 'hit', damage: result.damage }

      // Only draw a new prompt if the battle is still ongoing — otherwise
      // the UI would show a fresh, never-attempted prompt sitting next to
      // the win/lose banner instead of the line that actually ended the
      // fight.
      checkOutcome()
      if (status === 'ongoing') advancePlayerPrompt()
    } else {
      // Wrong text at the right length: same visible "you missed" pause as
      // a timeout, just with a different reason/message (see PlayerPrompt).
      lastEvent = { side: 'player', kind: 'miss' }
      playerPauseRemainingMs = combat.missPauseMs
      playerPauseReason = 'miss'
    }

    rebuildSnapshot()
    notify()
  }

  rebuildSnapshot()

  return { getState, subscribe, tick, submitPlayerAttack }
}
