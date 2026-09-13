import { renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useTypingInput } from './useTypingInput'

// Nothing is focused in any of these tests — keystrokes go to document.body
// and bubble to window. That IS the point of the hook: typing must work with
// no focused element (docs/plans/done/20260913-nbutko-typing-input-rework.html).
const setup = (prompt: string, overrides: { attempt?: number; active?: boolean } = {}) => {
  const onSubmit = vi.fn()
  const initial = { prompt, attempt: overrides.attempt ?? 1, active: overrides.active ?? true, onSubmit }
  const hook = renderHook((props: typeof initial) => useTypingInput(props), { initialProps: initial })
  return { ...hook, onSubmit, initial }
}

describe('useTypingInput', () => {
  it('appends printable keys, including Shifted capitals and punctuation', async () => {
    const user = userEvent.setup()
    const { result } = setup('Hi, Jak!')
    await user.keyboard('Hi, Jak!')
    expect(result.current).toBe('Hi, Jak!')
  })

  it('Backspace drops the last character', async () => {
    const user = userEvent.setup()
    const { result } = setup('jak')
    await user.keyboard('jax{Backspace}k')
    expect(result.current).toBe('jak')
  })

  it('does not submit on Enter until the input length matches the prompt', async () => {
    const user = userEvent.setup()
    const { result, onSubmit } = setup('jak')
    await user.keyboard('ja{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(result.current).toBe('ja')

    await user.keyboard('k{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('jak')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits whatever was typed once lengths match, even if wrong (the engine judges)', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('jak')
    await user.keyboard('jxk{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('jxk')
  })

  it('ignores Ctrl / Meta / Alt chords so browser shortcuts still work', async () => {
    const user = userEvent.setup()
    const { result } = setup('jak')
    await user.keyboard('{Control>}r{/Control}{Meta>}a{/Meta}{Alt>}j{/Alt}')
    expect(result.current).toBe('')
  })

  it('ignores non-character keys (Shift, Tab, arrows)', async () => {
    const user = userEvent.setup()
    const { result } = setup('jak')
    await user.keyboard('{Shift}{Tab}{ArrowLeft}j')
    expect(result.current).toBe('j')
  })

  it('captures nothing while inactive, and resumes when reactivated', async () => {
    const user = userEvent.setup()
    const { result, rerender, initial } = setup('jak', { active: false })
    await user.keyboard('ja')
    expect(result.current).toBe('')

    rerender({ ...initial, active: true })
    await user.keyboard('ja')
    expect(result.current).toBe('ja')
  })

  it('resets the typed line when the attempt changes', async () => {
    const user = userEvent.setup()
    const { result, rerender, initial } = setup('jak')
    await user.keyboard('ja')
    expect(result.current).toBe('ja')

    rerender({ ...initial, attempt: 2 })
    expect(result.current).toBe('')
  })

  it('lets Enter through untouched while inactive, even with a full-length line typed', async () => {
    // The modal-leak guarantee: once the fight is won/lost (or paused), Enter
    // must neither submit nor be swallowed — the reward modal's / loss
    // screen's autofocused Continue needs its native Enter.
    const user = userEvent.setup()
    const { rerender, onSubmit, initial } = setup('jak')
    await user.keyboard('jak')
    rerender({ ...initial, active: false })

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    window.dispatchEvent(enter)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(enter.defaultPrevented).toBe(false)
  })

  it('prevents the default on a submitting Enter', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('jak')
    await user.keyboard('jak')

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    window.dispatchEvent(enter)
    expect(onSubmit).toHaveBeenCalledWith('jak')
    expect(enter.defaultPrevented).toBe(true)
  })

  it('prevents the default on handled keys so Space cannot scroll the page', () => {
    setup('a b')
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    window.dispatchEvent(space)
    expect(space.defaultPrevented).toBe(true)

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
  })
})
