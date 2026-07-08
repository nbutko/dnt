import { describe, expect, it } from 'vitest'
import type { CombatConfig, Monster } from '../../domain/types'
import { createMonsterTyper } from '../monster-typing'
import { createRng } from '../rng'

const combat: CombatConfig = {
  baseDamage: 10,
  referenceLength: 10,
  lengthFactorFloor: 0.25,
  lengthFactorCap: 20,
  playerBaselineWpm: 15,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  playerReadingBufferMs: 2000,
  playerMaxHp: 100,
  missPauseMs: 2000,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0,
}

const baseMonster: Monster = {
  id: 'test',
  name: 'Test Monster',
  tier: 1,
  role: 'regular',
  habitat: 'Test',
  hp: 40,
  textTier: 1,
  wpm: 30,
  accuracy: 1,
  attention: 1,
  slack: 1.75,
  flavor: 'a test monster',
}

const PROMPT = 'the fox ran'

const runToCompletion = (
  monster: Monster,
  prompt: string,
  seed: number,
  overrideCombat: CombatConfig = combat,
  dtMs = 25,
  maxTicks = 10000,
) => {
  const rng = createRng(seed)
  const typer = createMonsterTyper(monster, prompt, rng, overrideCombat)
  const snapshots: string[] = []
  for (let i = 0; i < maxTicks; i += 1) {
    typer.advance(dtMs)
    const state = typer.getState()
    snapshots.push(state.typed)
    if (state.done || state.failed) break
  }
  return { typer, snapshots }
}

describe('createMonsterTyper', () => {
  it('reproduces identical typed-string sequences for a given seed', () => {
    const { snapshots: a } = runToCompletion(baseMonster, PROMPT, 99)
    const { snapshots: b } = runToCompletion(baseMonster, PROMPT, 99)
    expect(a).toEqual(b)
  })

  it('a high-accuracy monster converges to the exact target string', () => {
    const { typer } = runToCompletion(baseMonster, PROMPT, 1)
    const state = typer.getState()
    expect(state.typed).toBe(PROMPT)
    expect(state.done).toBe(true)
    expect(state.failed).toBe(false)
  })

  it('a low-accuracy, fast, slow-to-notice monster visibly overshoots before correcting', () => {
    const sloppyMonster: Monster = {
      ...baseMonster,
      wpm: 90, // short interval between characters
      accuracy: 0, // always mistypes
      attention: 1, // 1s before it notices, during which it keeps typing
    }
    const rng = createRng(2)
    const typer = createMonsterTyper(sloppyMonster, PROMPT, rng, combat)

    let sawOvershoot = false
    let sawCorrection = false
    let previousLength = 0
    for (let i = 0; i < 200; i += 1) {
      typer.advance(25)
      const { typed, failed } = typer.getState()
      if (typed.length > 1) sawOvershoot = true
      if (previousLength > 1 && typed.length === 0) sawCorrection = true
      previousLength = typed.length
      if (failed) break
    }

    expect(sawOvershoot).toBe(true)
    expect(sawCorrection).toBe(true)
    // accuracy 0 means it can never commit a correct character, so it never finishes.
    expect(typer.getState().failed).toBe(true)
    expect(typer.getState().done).toBe(false)
  })

  it('a tight slack makes the monster blow its time budget', () => {
    const tightMonster: Monster = { ...baseMonster, slack: 0.5 }
    const { typer } = runToCompletion(tightMonster, PROMPT, 3, combat)
    const state = typer.getState()
    expect(state.failed).toBe(true)
    expect(state.done).toBe(false)
  })
})
