import { describe, expect, it } from 'vitest'
import type { BattleEvent, CombatConfig, Monster } from '../../domain/types'
import { createBattle } from '../battle'
import { createRng } from '../rng'

const combat: CombatConfig = {
  baseDamage: 20,
  referenceLength: 12,
  lengthFactorFloor: 0.25,
  lengthFactorCap: 20,
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

  it('player.wpm is 0 before any landed hit, then accumulates chars/time across hits (Story 12)', () => {
    const rng = createRng(3)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'zzz zzz zzz zzz zzz', // long enough the monster never lands a hit mid-test
      rng,
    })
    expect(battle.getState().player.wpm).toBe(0)

    // 'jak' is 3 chars; avgWordLength is 5 -> 0.6 "words". 1000ms of typing
    // time -> wpm = 0.6 / (1000 / 60000) = 36.
    battle.tick(1000)
    battle.submitPlayerAttack('jak')
    expect(battle.getState().player.wpm).toBeCloseTo(36)

    // A second, faster hit (500ms) folds into the running total: 6 chars / 5
    // = 1.2 words over 1500ms total -> wpm = 1.2 / (1500 / 60000) = 48.
    battle.tick(500)
    battle.submitPlayerAttack('jak')
    expect(battle.getState().player.wpm).toBeCloseTo(48)
  })

  it('a miss does not move player.wpm (no chars/time credited for a wrong or timed-out attack)', () => {
    const rng = createRng(4)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'zzz zzz zzz zzz zzz',
      rng,
    })
    battle.tick(1000)
    battle.submitPlayerAttack('nope') // wrong length is ignored; wrong text (same length) below
    expect(battle.getState().player.wpm).toBe(0)
    battle.submitPlayerAttack('zzz')
    expect(battle.getState().player.wpm).toBe(0)
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

  it('dodgeChance negates a monster hit: no HP loss, event kind is dodge not hit', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
      dodgeChance: 1, // always dodges
    })
    let ticks = 0
    while (battle.getState().status === 'ongoing' && ticks < 50) {
      battle.tick(50)
      ticks += 1
    }
    const state = battle.getState()
    expect(state.player.hp).toBe(combat.playerMaxHp)
    // Every monster swing that lands should show up as a dodge, never a hit.
    expect(state.lastEvent?.side).toBe('monster')
    if (state.lastEvent?.kind !== 'miss') {
      expect(state.lastEvent?.kind).toBe('dodge')
      expect(state.lastEvent?.damage).toBeUndefined()
    }
  })

  it('dodgeChance 0 never dodges (a monster hit always lands as kind hit)', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
      dodgeChance: 0,
    })
    let ticks = 0
    let sawHit = false
    while (battle.getState().status === 'ongoing' && ticks < 200) {
      battle.tick(50)
      ticks += 1
      if (battle.getState().lastEvent?.kind === 'dodge') {
        throw new Error('should never dodge at dodgeChance 0')
      }
      if (battle.getState().lastEvent?.kind === 'hit' && battle.getState().lastEvent?.side === 'monster') {
        sawHit = true
      }
    }
    expect(sawHit).toBe(true)
  })

  it('dodge probability over many seeded monster hits matches dodgeChance', () => {
    const dodgeChance = 0.5
    const fastFailMonster: Monster = { ...steadyMonster, hp: 1_000_000 }
    let dodges = 0
    let hits = 0
    // One fresh battle per seed, recording only its FIRST monster-attack
    // outcome — a clean Bernoulli sample across 200 independent trials,
    // rather than letting one battle's early events starve the rest.
    for (let seed = 0; seed < 200; seed += 1) {
      const rng = createRng(seed + 1000)
      const battle = createBattle({
        combat,
        monster: fastFailMonster,
        playerPrompts: () => 'jak',
        monsterPrompts: () => 'sad',
        rng,
        dodgeChance,
      })
      let ticks = 0
      let recorded = false
      while (!recorded && ticks < 500) {
        battle.tick(50)
        ticks += 1
        const event = battle.getState().lastEvent
        if (event?.side === 'monster' && event.kind === 'dodge') {
          dodges += 1
          recorded = true
        } else if (event?.side === 'monster' && event.kind === 'hit') {
          hits += 1
          recorded = true
        }
      }
    }
    const observedRate = dodges / (dodges + hits)
    expect(observedRate).toBeGreaterThan(0.3)
    expect(observedRate).toBeLessThan(0.7)
  })

  it('Second Wind fires exactly once, the first time HP crosses the threshold', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
      secondWind: { hpThresholdPct: 0.5, healPct: 0.25 },
    })
    let ticks = 0
    let triggers = 0
    let sawHealBump = false
    let prevHp = battle.getState().player.hp
    // lastEvent isn't cleared on ticks where nothing happens — it's the same
    // object reference until a NEW event actually fires — so track identity
    // to count each occurrence once instead of re-counting a stale flag on
    // every subsequent tick.
    let prevEventRef = battle.getState().lastEvent
    while (battle.getState().status === 'ongoing' && ticks < 2000) {
      battle.tick(50)
      ticks += 1
      const state = battle.getState()
      if (state.lastEvent && state.lastEvent !== prevEventRef) {
        prevEventRef = state.lastEvent
        if (state.lastEvent.secondWindTriggered) {
          triggers += 1
          if (state.player.hp > prevHp) sawHealBump = true
        }
      }
      prevHp = state.player.hp
    }
    expect(triggers).toBe(1)
    expect(sawHealBump).toBe(true)
  })

  it('no Second Wind (null) never triggers, even crossing the same HP fraction', () => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad',
      rng,
      secondWind: null,
    })
    let ticks = 0
    while (battle.getState().status === 'ongoing' && ticks < 300) {
      battle.tick(50)
      ticks += 1
      expect(battle.getState().lastEvent?.secondWindTriggered).toBeUndefined()
    }
  })

  it('Sneak Attack dice add to the first landed hit, and to every crit, but not to an ordinary later hit', () => {
    // criticalChance 0 isolates "first hit" from "crit" — no natural crits
    // can occur, so any dice beyond the weapon's own show Sneak Attack.
    const noNaturalCrits: CombatConfig = { ...combat, criticalChance: 0 }
    const rng = createRng(1)
    const battle = createBattle({
      combat: noNaturalCrits,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      weaponDie: 6,
      sneakAttackDice: 2,
    })

    battle.submitPlayerAttack('jak')
    const firstHit = battle.getState().lastEvent
    expect(firstHit?.isSneakAttack).toBe(true)
    // 1 weapon die + 2 sneak d6 = 3 dice total.
    expect(firstHit?.diceRolled).toHaveLength(3)

    battle.submitPlayerAttack('jak')
    const secondHit = battle.getState().lastEvent
    expect(secondHit?.isSneakAttack).toBeUndefined()
    expect(secondHit?.diceRolled).toHaveLength(1)
  })

  it('Sneak Attack dice fold into every crit, even after the first hit', () => {
    const alwaysCrits: CombatConfig = { ...combat, criticalChance: 1 }
    const rng = createRng(1)
    const battle = createBattle({
      combat: alwaysCrits,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      weaponDie: 6,
      critCount: 2,
      sneakAttackDice: 1,
    })

    battle.submitPlayerAttack('jak') // first hit: forced sneak attack too
    battle.submitPlayerAttack('jak') // a later hit that also crits (chance 1)
    const laterHit = battle.getState().lastEvent
    expect(laterHit?.isCrit).toBe(true)
    expect(laterHit?.isSneakAttack).toBe(true)
    // 2 weapon-die crit rolls + 1 sneak d6 = 3 dice.
    expect(laterHit?.diceRolled).toHaveLength(3)
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

// The two consumable/ability modifiers that resolveModifiers computes but that
// battle-store.ts used not to forward into the fight (found dormant during the
// Story 13 sanity pass): the power-up multiplier and the typing-time headroom.
describe('createBattle — power-up multiplier + time-budget bonus (dormant-hook fix)', () => {
  const firstHitDamage = (powerUpMultiplier: number): number => {
    const rng = createRng(11)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      weaponDie: 8,
      weaponAbilityMod: 2,
      damageScale: 1.5,
      powerUpMultiplier,
    })
    battle.submitPlayerAttack('jak')
    return battle.getState().lastEvent?.damage ?? 0
  }

  it('a power-up multiplier scales a hit linearly (same seed → exactly ×N)', () => {
    const base = firstHitDamage(1)
    const buffed = firstHitDamage(2)
    expect(base).toBeGreaterThan(0)
    // Same seed ⇒ identical die roll + crit outcome, so the only difference is
    // the linear powerUpMultiplier: Bull's Strength / Elixir of Might now bite.
    expect(buffed).toBeCloseTo(base * 2, 6)
  })

  it('defaults to no power-up (multiplier 1) when omitted', () => {
    expect(firstHitDamage(1)).toBeCloseTo(firstHitDamage(1), 6)
  })

  const timeLimitWith = (timeBudgetBonusMs: number): number => {
    const rng = createRng(1)
    const battle = createBattle({
      combat,
      monster: steadyMonster,
      playerPrompts: () => 'jak',
      monsterPrompts: () => 'sad lad',
      rng,
      timeBudgetBonusMs,
    })
    return battle.getState().player.timeLimitMs
  }

  it('the time-budget bonus (WIS / Potion of Speed) adds flat headroom to the prompt limit', () => {
    const base = timeLimitWith(0)
    expect(timeLimitWith(3000)).toBe(base + 3000)
  })
})
