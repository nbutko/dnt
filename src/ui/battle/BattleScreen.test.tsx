import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BattleState, Monster } from '../../domain/types'
import type { PlayerModifiers } from '../../domain/progression'
import type { BattleStore } from '../../state/battle-store'
import BattleScreen from './BattleScreen'

// Wiring test only: the hook (ui/hooks/useTypingInput.test.ts) is the spec for
// the key rules; this pins that BattleScreen actually feeds the typed line to
// the store's `submit` and gates the hook on the battle being live. The store
// is stubbed so no content loads and the clock never ticks.
const ongoingState = (): BattleState => ({
  status: 'ongoing',
  player: {
    hp: 40,
    maxHp: 40,
    prompt: 'jak',
    attempt: 1,
    timeLimitMs: 30_000,
    elapsedMs: 0,
    paused: false,
    wpm: 0,
  },
  monster: {
    id: 'slime',
    hp: 30,
    maxHp: 30,
    prompt: 'goo',
    typed: '',
    timeLimitMs: 30_000,
    elapsedMs: 0,
    paused: false,
  },
})

const stubStore = (state: BattleState): BattleStore => ({
  subscribe: () => () => {},
  getSnapshot: () => state,
  tick: vi.fn(),
  submit: vi.fn(),
})

let nextStore: BattleStore
vi.mock('../../state/battle-store', () => ({
  createBattleStore: () => Promise.resolve(nextStore),
}))

const monster = { id: 'slime', tier: 1 } as Monster
const modifiers = {} as PlayerModifiers

describe('BattleScreen typing wiring', () => {
  it('sends a full correctly-typed line + Enter to the store, with nothing focused', async () => {
    nextStore = stubStore(ongoingState())
    const user = userEvent.setup()
    render(<BattleScreen monster={monster} modifiers={modifiers} onResult={vi.fn()} />)
    await screen.findByText(/Battle — Tier/)

    expect(document.querySelector('input, textarea, [contenteditable]')).toBeNull()
    expect(document.activeElement).toBe(document.body)

    await user.keyboard('jak{Enter}')
    expect(nextStore.submit).toHaveBeenCalledWith('jak')
  })

  it('captures nothing during a miss pause', async () => {
    const state = ongoingState()
    state.player.paused = true
    state.player.pauseReason = 'miss'
    nextStore = stubStore(state)
    const user = userEvent.setup()
    render(<BattleScreen monster={monster} modifiers={modifiers} onResult={vi.fn()} />)
    await screen.findByText('Incorrect Incantation. You missed!')

    await user.keyboard('jak{Enter}')
    expect(nextStore.submit).not.toHaveBeenCalled()
  })
})
