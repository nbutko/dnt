import { describe, expect, it } from 'vitest'
import { keyForChar, nextKeyHighlights } from './keyboard-highlights'

describe('keyForChar', () => {
  it('maps lowercase letters to their key code, unshifted', () => {
    expect(keyForChar('a')).toEqual({ code: 'KeyA', shift: false })
  })

  it('maps uppercase letters to the same code, shifted', () => {
    expect(keyForChar('A')).toEqual({ code: 'KeyA', shift: true })
  })

  it('maps space to the Space key', () => {
    expect(keyForChar(' ')).toEqual({ code: 'Space', shift: false })
  })

  it('maps punctuation present in the M0 text tiers', () => {
    expect(keyForChar(';')).toEqual({ code: 'Semicolon', shift: false })
  })
})

describe('nextKeyHighlights', () => {
  it('highlights the next 3 keys in ascending distance when on track at the start', () => {
    const highlights = nextKeyHighlights('sad lad', '')
    expect(highlights.get('KeyS')).toBe(0)
    expect(highlights.get('KeyA')).toBe(1)
    expect(highlights.get('KeyD')).toBe(2)
    expect(highlights.size).toBe(3)
  })

  it('highlights the next keys mid-prompt', () => {
    const highlights = nextKeyHighlights('sad lad', 'sad')
    expect(highlights.get('Space')).toBe(0)
    expect(highlights.get('KeyL')).toBe(1)
    expect(highlights.get('KeyA')).toBe(2)
  })

  it('nearest wins when the same key appears twice in the highlight window', () => {
    // "l" is both the 2nd and 3rd upcoming character here
    const highlights = nextKeyHighlights('allow', 'a')
    expect(highlights.get('KeyL')).toBe(0)
  })

  it('highlights only Backspace when a wrong character has been typed', () => {
    const highlights = nextKeyHighlights('sad lad', 'sax')
    expect(highlights).toEqual(new Map([['Backspace', 0]]))
  })

  it('highlights only Backspace when overtyped past the end of the prompt', () => {
    const highlights = nextKeyHighlights('sad', 'sadd')
    expect(highlights).toEqual(new Map([['Backspace', 0]]))
  })

  it('highlights only Enter when the input is fully correct', () => {
    const highlights = nextKeyHighlights('sad', 'sad')
    expect(highlights).toEqual(new Map([['Enter', 0]]))
  })
})
