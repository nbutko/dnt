interface MonsterTypingProps {
  prompt: string
  typed: string
}

// Renders the monster's live typing char by char, typos and all — see
// game-design.html#monster-ai. Correct-so-far characters are green, wrong
// ones red, not-yet-reached prompt text muted.
const MonsterTyping = ({ prompt, typed }: MonsterTypingProps) => (
  <p className="font-mono text-lg">
    {typed.split('').map((char, index) => {
      const key = `${index}-${char}`
      const isCorrect = char === prompt[index]
      return (
        <span key={key} className={isCorrect ? 'text-green-600' : 'text-red-600'}>
          {char}
        </span>
      )
    })}
    <span className="text-gray-400">{prompt.slice(typed.length)}</span>
  </p>
)

export default MonsterTyping
