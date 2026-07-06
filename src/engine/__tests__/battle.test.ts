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
  playerReadingBufferMs: 0,
  playerMaxHp: 100,
  missPauseMs: 2000,
  criticalChance: 0.1,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

const steadyMonster: Monster = {
  id: 'test-monster',
  name: 'Test Monster',
  tier: 1,
  role: 'regular',
  habitat: 'Test',
  hp: 100,
  textTier: 1,
  wpm: 20,
  accuracy: 1,
  attention: 2,
  slack: 1.75,
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
      isCrit: afterHit.lastEvent?.isCrit,
      diceRolled: afterHit.lastEvent?.diceRolled,
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

  it('pauses with a miss event (not an instant new prompt) on wrong text, distinct from a timeout', () => {
    const rng = createRng(1)
    const pausingCombat: CombatConfig = { ...combat, missPauseMs: 500 }
    const battle = createBattle({
      combat: pausingCombat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })
    const attemptBefore = battle.getState().player.attempt

    battle.submitPlayerAttack('zzz')
    let state = battle.getState()
    expect(state.lastEvent).toEqual({ side: 'player', kind: 'miss' })
    expect(state.player.paused).toBe(true)
    expect(state.player.pauseReason).toBe('miss')
    expect(state.player.prompt).toBe('jak')
    expect(state.player.attempt).toBe(attemptBefore)

    // a resubmit during the pause is ignored, even a would-be exact match
    battle.submitPlayerAttack('jak')
    expect(battle.getState().monster.hp).toBe(steadyMonster.hp)

    battle.tick(500) // pause elapses -> advances to the next prompt
    state = battle.getState()
    expect(state.player.paused).toBe(false)
    expect(state.player.pauseReason).toBeUndefined()
    expect(state.player.attempt).toBe(attemptBefore + 1)
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

  it('pauses with an expire event instead of instantly drawing a new prompt on timeout', () => {
    const rng = createRng(1)
    const fastTimeoutCombat: CombatConfig = {
      ...combat,
      playerBaselineWpm: 1000, // makes the typing-time term negligible
      playerTimeLimitFloorMs: 100,
      playerReadingBufferMs: 0,
      missPauseMs: 500,
    }
    const battle = createBattle({
      combat: fastTimeoutCombat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })
    const attemptBefore = battle.getState().player.attempt

    battle.tick(150) // exceeds the 100ms time limit
    let state = battle.getState()
    expect(state.lastEvent).toEqual({ side: 'player', kind: 'expire' })
    expect(state.player.paused).toBe(true)
    expect(state.player.pauseReason).toBe('expire')
    expect(state.player.prompt).toBe('jak')
    expect(state.player.attempt).toBe(attemptBefore)

    // submits during the pause are ignored, even a would-be exact match
    battle.submitPlayerAttack('jak')
    expect(battle.getState().monster.hp).toBe(steadyMonster.hp)

    battle.tick(400) // 100ms of the 500ms pause left
    expect(battle.getState().player.paused).toBe(true)
    expect(battle.getState().player.attempt).toBe(attemptBefore)

    battle.tick(200) // pause elapses -> advances to the next prompt
    state = battle.getState()
    expect(state.player.paused).toBe(false)
    expect(state.player.attempt).toBe(attemptBefore + 1)
  })

  it('pauses with a monster miss event instead of instantly drawing a new prompt on its own timeout', () => {
    const rng = createRng(1)
    const fastFailMonster: Monster = { ...steadyMonster, slack: 0.001 }
    const fastPauseCombat: CombatConfig = { ...combat, missPauseMs: 500 }
    const battle = createBattle({
      combat: fastPauseCombat,
      monster: fastFailMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
    })

    battle.tick(50) // the monster's own (tiny) time limit is already blown
    let state = battle.getState()
    expect(state.lastEvent).toEqual({ side: 'monster', kind: 'miss' })
    expect(state.monster.paused).toBe(true)
    // a timed-out attack never damages the player
    expect(state.player.hp).toBe(combat.playerMaxHp)

    battle.tick(400) // 100ms of the 500ms pause left
    expect(battle.getState().monster.paused).toBe(true)

    battle.tick(200) // pause elapses -> a fresh monster typer starts
    state = battle.getState()
    expect(state.monster.paused).toBe(false)
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

  it('guaranteedFirstCrit makes exactly the first landed hit a crit, not the second', () => {
    // criticalChance 0 on this combat means the second/third hits could only
    // crit via the guarantee, not a natural roll — isolating the guarantee.
    const noNaturalCrits: CombatConfig = { ...combat, criticalChance: 0 }
    const rng = createRng(1)
    const battle = createBattle({
      combat: noNaturalCrits,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      guaranteedFirstCrit: true,
    })

    battle.submitPlayerAttack('jak')
    expect(battle.getState().lastEvent?.isCrit).toBe(true)

    battle.submitPlayerAttack('jak')
    expect(battle.getState().lastEvent?.isCrit).toBe(false)

    battle.submitPlayerAttack('jak')
    expect(battle.getState().lastEvent?.isCrit).toBe(false)
  })

  it('a fumble fight (noCrits) never crits, even at criticalChance 1', () => {
    const alwaysCrits: CombatConfig = { ...combat, criticalChance: 1 }
    const rng = createRng(1)
    const battle = createBattle({
      combat: alwaysCrits,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      noCrits: true,
      fumbleDamageMultiplier: 0.75,
    })

    for (let i = 0; i < 3; i += 1) {
      battle.submitPlayerAttack('jak')
      expect(battle.getState().lastEvent?.isCrit).toBe(false)
      expect(battle.getState().lastEvent?.diceRolled).toHaveLength(1)
    }
  })

  it('the same seed + weapon produces the same damage/dice sequence (determinism)', () => {
    const runDamages = (): (number | undefined)[] => {
      const rng = createRng(7)
      const battle = createBattle({
        combat,
        monster: steadyMonster,
        playerPrompts: () => 'jak',
        monsterPrompts: () => 'sad lad',
        rng,
        weaponDie: 8,
        weaponAbilityMod: 2,
        damageScale: 1.5,
      })
      const damages: (number | undefined)[] = []
      for (let i = 0; i < 5; i += 1) {
        battle.submitPlayerAttack('jak')
        damages.push(battle.getState().lastEvent?.damage)
      }
      return damages
    }

    expect(runDamages()).toEqual(runDamages())
  })
})
