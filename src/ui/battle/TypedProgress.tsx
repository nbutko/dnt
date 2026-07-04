interface TypedProgressProps {
  prompt: string
  typed: string
  revealRemaining: boolean
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
const TypedProgress = ({ prompt, typed, revealRemaining, className = '' }: TypedProgressProps) => (
  <p className={`font-mono ${className}`}>
    {typed.split('').map((char, index) => {
      const key = `${index}-${char}`
      const isCorrect = char === prompt[index]
      return (
        <span key={key} className={isCorrect ? 'text-text-primary' : 'text-danger-bright'}>
          {char}
        </span>
      )
    })}
    <span className="inline-block w-px h-[1em] align-middle bg-accent-gold-bright" />
    {revealRemaining && <span className="text-text-dim">{prompt.slice(typed.length)}</span>}
  </p>
)

export default TypedProgress
