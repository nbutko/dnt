import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TypedProgress from './TypedProgress'

describe('TypedProgress', () => {
  it('keeps the full target prompt on screen when the input diverges (feedback #11)', () => {
    // Hammering the space bar used to swap visible prompt letters for invisible
    // spaces (remaining = prompt.slice(typed.length)), so the target text looked
    // like it was being deleted. Now every reached position renders the prompt's
    // own char, recoloured in place — so the whole word stays readable.
    const { container } = render(<TypedProgress prompt="cat" typed="   " revealRemaining />)
    expect(container.textContent).toContain('cat')
  })

  it('trails over-typed characters after the prompt instead of eating it', () => {
    const { container } = render(<TypedProgress prompt="cat" typed="catxy" revealRemaining />)
    expect(container.textContent).toContain('cat')
    expect(container.textContent).toContain('xy')
  })

  it('renders the prompt itself as the target text, not the raw keystrokes', () => {
    // Even a wholly wrong keystroke shows the expected letter (reddened), never
    // the typed one — the target line stays intact.
    const { container } = render(<TypedProgress prompt="cat" typed="x" revealRemaining />)
    expect(container.textContent).toContain('cat')
    expect(container.textContent).not.toContain('x')
  })
})
