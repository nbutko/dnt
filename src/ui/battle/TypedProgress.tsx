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
// At each reached position we render the PROMPT's own character, coloured by
// whether the player's keystroke there matched — not the typed character
// (feedback #11). That keeps the target line fully on screen and fixed in
// place: hammering the space bar or typing garbage just reddens letters in
// place instead of visibly eating the untyped remainder (spaces are invisible,
// so swapping them in used to look like the prompt was being deleted). Anything
// typed PAST the end of the prompt has no target char to sit on, so it trails
// after the line in red — clear "too many characters" feedback.
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
      {prompt
        .slice(0, overlayLen)
        .split('')
        .map((char, index) => {
          const key = `${index}-${char}`
          const isCorrect = typed[index] === char
          return (
            <span key={key} className={isCorrect ? 'text-text-primary' : 'text-danger-bright'}>
              {char}
            </span>
          )
        })}
      {overtyped && <span className="text-danger-bright">{overtyped}</span>}
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
