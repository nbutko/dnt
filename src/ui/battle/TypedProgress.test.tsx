import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TypedProgress, { wrapPrompt } from './TypedProgress'

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

describe('wrapPrompt — deterministic, prompt-only line breaking (the reflow fix)', () => {
  const passage = 'the quick brown fox jumps over the lazy dog again and again today'

  it('loses no characters: concatenating the lines rebuilds the prompt exactly', () => {
    for (const cols of [1, 5, 8, 12, 20, 40]) {
      const lines = wrapPrompt(passage, cols)
      expect(lines.map((l) => l.text).join(''), `cols ${cols}`).toBe(passage)
    }
  })

  it('gives each line a start offset that matches the running length (indices map 1:1)', () => {
    const lines = wrapPrompt(passage, 12)
    let running = 0
    for (const line of lines) {
      expect(line.start).toBe(running)
      running += line.text.length
    }
  })

  it('keeps every line within the column budget when words fit', () => {
    const lines = wrapPrompt(passage, 12)
    for (const line of lines) {
      // trailing whitespace can push a line one over, but the visible word run
      // never exceeds the budget
      expect(line.text.trimEnd().length).toBeLessThanOrEqual(12)
    }
  })

  it('hard-breaks a single word longer than the whole line', () => {
    const lines = wrapPrompt('supercalifragilistic', 5)
    expect(lines.map((l) => l.text)).toEqual(['super', 'calif', 'ragil', 'istic'])
  })

  it('does not depend on how much has been typed — the split is a pure function of the prompt', () => {
    // The old bug was that the wrap point moved as you typed; wrapPrompt takes
    // no `typed` argument at all, so the same prompt always yields the same lines.
    expect(wrapPrompt(passage, 12)).toEqual(wrapPrompt(passage, 12))
  })

  it('returns a single line when unmeasured (cols <= 0) or when the prompt fits', () => {
    expect(wrapPrompt(passage, 0)).toEqual([{ text: passage, start: 0 }])
    expect(wrapPrompt('short', 40)).toEqual([{ text: 'short', start: 0 }])
  })
})
