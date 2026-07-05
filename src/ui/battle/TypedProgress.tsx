interface TypedProgressProps {
  prompt: string
  typed: string
  revealRemaining: boolean
  blinkCaret?: boolean
  className?: string
}

// Shared char-by-char renderer for "a target string + how much of it has
// been typed correctly so far" — used for both the monster's own live
// typing and the player's progress against their prompt (docs/design
// visual-spec's "target prompt" typography role).
//
// `revealRemaining` distinguishes the two uses: the player already sees the
// whole line to type (remaining text dims in, ahead of the cursor), but the
// monster's future text is deliberately NOT previewed — only what it's
// actually typed shows, per game-design.html#monster-ai ("appear on screen
// character by character, in real time").
//
// At each reached position: a correct keystroke shows the target character in
// the normal colour, but a WRONG one shows the character the player actually
// typed, in red (feedback #10) — so a mistake reads as a mistake instead of
// silently showing the expected letter. A wrong space would be invisible, so it
// renders as a red underscore. Because every reached position still puts
// exactly one glyph on screen, the monospace line stays fixed in width and the
// dimmed remainder never appears "eaten" (the original #11 concern). Anything
// typed PAST the end of the prompt has no target to sit on, so it trails after
// the line in red — clear "too many characters" feedback.
const wrongGlyph = (typedChar: string): string => (typedChar === ' ' ? '_' : typedChar)

const TypedProgress = ({
  prompt,
  typed,
  revealRemaining,
  blinkCaret = false,
  className = '',
}: TypedProgressProps) => {
  const overlayLen = Math.min(typed.length, prompt.length)
  const overtyped = typed.slice(prompt.length)
  return (
    <p className={`font-mono ${className}`}>
      {typed
        .slice(0, overlayLen)
        .split('')
        .map((typedChar, index) => {
          const key = `${index}-${typedChar}`
          const isCorrect = typedChar === prompt[index]
          return (
            <span key={key} className={isCorrect ? 'text-text-primary' : 'text-danger-bright'}>
              {isCorrect ? prompt[index] : wrongGlyph(typedChar)}
            </span>
          )
        })}
      {overtyped && (
        <span className="text-danger-bright">
          {overtyped.split('').map(wrongGlyph).join('')}
        </span>
      )}
      <span
        className={`inline-block w-px h-[1em] align-middle bg-accent-gold-bright ${
          blinkCaret ? 'caret-blink' : ''
        }`}
      />
      {revealRemaining && <span className="text-text-dim">{prompt.slice(overlayLen)}</span>}
    </p>
  )
}

export default TypedProgress
