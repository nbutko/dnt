import keyboardLayout from '../../content/keyboard-layout'

export interface KeyLookup {
  code: string
  shift: boolean
}

// Derived from the layout data itself (not hardcoded per character) so tiers
// 4+ (capitals, punctuation, symbols) teach themselves through the same
// lookup — see m0-implementation.html#keyboard.
const buildKeyLookup = (): Map<string, KeyLookup> => {
  const lookup = new Map<string, KeyLookup>()
  keyboardLayout.forEach((row) => {
    row.forEach((key) => {
      if (key.label.length === 1) lookup.set(key.label, { code: key.code, shift: false })
      if (key.shiftLabel && key.shiftLabel.length === 1) {
        lookup.set(key.shiftLabel, { code: key.code, shift: true })
      }
    })
  })
  lookup.set(' ', { code: 'Space', shift: false })
  return lookup
}

const keyLookup = buildKeyLookup()

export const keyForChar = (char: string): KeyLookup | undefined => keyLookup.get(char)

// Three cases (see m0-implementation.html#keyboard):
//  - off track (a wrong char anywhere, or overtyped past the prompt's end)
//    -> only Backspace glows.
//  - complete & correct -> only Enter glows.
//  - on track -> the next `count` keys glow, brightest nearest (0), nearest
//    wins when the same key appears twice in the window.
export const nextKeyHighlights = (
  prompt: string,
  input: string,
  count = 3,
): Map<string, number> => {
  const isOnTrack = input === prompt.slice(0, input.length)
  if (!isOnTrack) return new Map([['Backspace', 0]])
  if (input === prompt) return new Map([['Enter', 0]])

  const highlights = new Map<string, number>()
  for (let offset = 0; offset < count && input.length + offset < prompt.length; offset += 1) {
    const lookup = keyForChar(prompt[input.length + offset])
    if (lookup && !highlights.has(lookup.code)) {
      highlights.set(lookup.code, offset)
    }
  }
  return highlights
}
