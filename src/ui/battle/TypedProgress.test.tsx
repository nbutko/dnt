import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TypedProgress from './TypedProgress'

describe('TypedProgress', () => {
  it('shows a wrong space as a red underscore, not an invisible gap (feedback #10)', () => {
    // Typing space over a letter used to show the expected letter (mistake
    // looked correct) or an invisible space. Now the mis-typed space renders as
    // a visible underscore so the miss is obvious.
    const { container } = render(<TypedProgress prompt="cat" typed=" " revealRemaining />)
    expect(container.textContent).toContain('_')
    const wrong = container.querySelector('.text-danger-bright')
    expect(wrong?.textContent).toBe('_')
  })

  it('shows the character actually typed on a mistake, reddened — not the target (feedback #10)', () => {
    // A wrong keystroke shows what the player really hit (in red), so mistakes
    // read as mistakes. The dimmed remainder still shows the rest of the target.
    const { container } = render(<TypedProgress prompt="cat" typed="x" revealRemaining />)
    const wrong = container.querySelector('.text-danger-bright')
    expect(wrong?.textContent).toBe('x')
    // The untyped remainder ("at") is still on screen, so nothing looks eaten.
    expect(container.textContent).toContain('at')
  })

  it('keeps the line width fixed when the input diverges (feedback #11)', () => {
    // Every reached position renders exactly one glyph (a wrong space becomes an
    // underscore), so hammering the space bar over "cat" shows "___" — same
    // width as the target, never a shrinking/"eaten" line.
    const { container } = render(<TypedProgress prompt="cat" typed="   " revealRemaining />)
    expect(container.textContent).toContain('___')
  })

  it('trails over-typed characters after the prompt instead of eating it', () => {
    const { container } = render(<TypedProgress prompt="cat" typed="catxy" revealRemaining />)
    expect(container.textContent).toContain('cat')
    expect(container.textContent).toContain('xy')
  })

  it('shows correctly typed characters as the target text in the normal colour', () => {
    const { container } = render(<TypedProgress prompt="cat" typed="ca" revealRemaining />)
    // "ca" correct → normal colour, no red; "t" remains as dimmed remainder.
    expect(container.querySelector('.text-danger-bright')).toBeNull()
    expect(container.textContent).toContain('cat')
  })
})
