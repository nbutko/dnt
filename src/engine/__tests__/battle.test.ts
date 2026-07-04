import { describe, expect, it } from 'vitest'
import type { BattleEvent, CombatConfig, Monster } from '../../domain/types'
import { createBattle } from '../battle'
import { createRng } from '../rng'

const combat: CombatConfig = {
  baseDamage: 20,
  referenceLength: 12,
  lengthFactorFloor: 0.25,
  playerBaselineWpm: 15,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 5000,
  playerMaxHp: 100,
  monsterSlack: 1.75,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

const steadyMonster: Monster = {
  id: 'test-monster',
  name: 'Test Monster',
  tier: 1,
  hp: 100,
  textTier: 1,
  wpm: 20,
  accuracy: 1,
  attention: 2,
  flavor: 'a test monster',
}

interface ScriptResult {
  status: string
  ticks: number
  events: BattleEvent[]
  playerHp: number
  monsterHp: number
}

const runScript = (seed: number): ScriptResult => {
  const rng = createRng(seed)
  const battle = createBattle({
    combat,
    monster: steadyMonster,
    playerPrompts: () => 'jak',
    monsterPrompts: () => 'sad lad',
    rng,
  })

  const events: BattleEvent[] = []
  let ticks = 0
  while (battle.getState().status === 'ongoing' && ticks < 2000) {
    battle.tick(50)
    ticks += 1
    if (ticks % 4 === 0) {
      battle.submitPlayerAttack('jak')
    }
    const { lastEvent } = battle.getState()
    if (lastEvent) events.push(lastEvent)
  }

  const finalState = battle.getState()
  return {
    status: finalState.status,
    ticks,
    events,
    playerHp: finalState.player.hp,
    monsterHp: finalState.monster.hp,
  }
}

describe('createBattle', () => {
  it('runs a scripted battle to a deterministic winner and duration for a given seed', () => {
    const a = runScript(42)
    const b = runScript(42)
    expect(a).toEqual(b)
    expect(a.status).not.toBe('ongoing')
  })

  it('starts with full player HP and the monster at its own HP, prompts already loaded', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
    })
    const state = battle.getState()
    expect(state.status).toBe('ongoing')
    expect(state.player.hp).toBe(combat.playerMaxHp)
    expect(state.player.prompt).toBe('jak')
    expect(state.monster.hp).toBe(steadyMonster.hp)
    expect(state.monster.prompt).toBe('sad')
  })

  it('only resolves a submit once input length matches the prompt, and there is no re-attempt', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })

    battle.submitPlayerAttack('ja') // shorter than the prompt: not a submit attempt
    expect(battle.getState().lastEvent).toBeUndefined()
    expect(battle.getState().monster.hp).toBe(steadyMonster.hp)

    battle.submitPlayerAttack('jak') // exact match: hits
    const afterHit = battle.getState()
    expect(afterHit.lastEvent).toEqual({
      side: 'player',
      kind: 'hit',
      damage: afterHit.lastEvent?.damage,
    })
    expect(afterHit.monster.hp).toBeLessThan(steadyMonster.hp)
    const hpAfterFirstHit = afterHit.monster.hp

    // The prompt already advanced to a new (fixed 'jak') prompt; submitting
    // wrong-but-same-length text now misses on *that* prompt, proving there's
    // no re-attempt carried over from the previous one.
    battle.submitPlayerAttack('zzz')
    expect(battle.getState().lastEvent).toEqual({ side: 'player', kind: 'miss' })
    expect(battle.getState().monster.hp).toBe(hpAfterFirstHit)
  })

  it('misses when the submitted text is the wrong content at the right length', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })
    battle.submitPlayerAttack('zzz')
    const state = battle.getState()
    expect(state.lastEvent).toEqual({ side: 'player', kind: 'miss' })
    expect(state.monster.hp).toBe(steadyMonster.hp)
  })

  it('wins when the monster HP is driven to 0', () => {
    const rng = createRng(1)
    const oneHpMonster: Monster = { ...steadyMonster, hp: 1 }
    const battle = createBattle({
      combat,
      monster: oneHpMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })
    battle.submitPlayerAttack('jak')
    const state = battle.getState()
    expect(state.status).toBe('won')
    expect(state.monster.hp).toBe(0)
  })

  it('freezes the winning prompt instead of drawing a new one once the battle ends', () => {
    const rng = createRng(1)
    const oneHpMonster: Monster = { ...steadyMonster, hp: 1 }
    const attemptBefore = createBattle({
      combat,
      monster: oneHpMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    }).getState().player.attempt

    const battle = createBattle({
      combat,
      monster: oneHpMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng: createRng(1),
    })
    battle.submitPlayerAttack('jak')
    const state = battle.getState()
    expect(state.status).toBe('won')
    expect(state.player.prompt).toBe('jak')
    expect(state.player.attempt).toBe(attemptBefore)

    // ticking further after the win must not advance the frozen prompt either
    battle.tick(1000)
    expect(battle.getState().player.attempt).toBe(attemptBefore)
  })

  it('loses when the player never attacks and the monster keeps landing hits', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
    })
    let ticks = 0
    while (battle.getState().status === 'ongoing' && ticks < 5000) {
      battle.tick(50)
      ticks += 1
    }
    expect(battle.getState().status).toBe('lost')
    expect(battle.getState().player.hp).toBe(0)
  })
})
