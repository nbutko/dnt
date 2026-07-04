import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PlayerPrompt from './PlayerPrompt'

// PlayerPrompt is a controlled component (input is lifted to BattleScreen as
// of Story 7); this harness plays BattleScreen's part for the test.
interface HarnessProps {
  prompt: string
  disabled?: boolean
  onSubmit: (input: string) => void
}

const Harness = ({ prompt, disabled = false, onSubmit }: HarnessProps) => {
  const [input, setInput] = useState('')
  return (
    <PlayerPrompt
      prompt={prompt}
      input={input}
      timeLimitMs={5000}
      elapsedMs={0}
      disabled={disabled}
      onInputChange={setInput}
      onSubmit={onSubmit}
    />
  )
}

describe('PlayerPrompt', () => {
  it('does not submit on Enter until the input length matches the prompt', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness prompt="jak" onSubmit={onSubmit} />)

    const input = screen.getByLabelText('Type the prompt')
    await user.type(input, 'ja{enter}')
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(input, 'k{enter}')
    expect(onSubmit).toHaveBeenCalledWith('jak')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('is disabled once the battle is no longer ongoing', () => {
    render(<Harness prompt="jak" disabled onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Type the prompt')).toBeDisabled()
  })
})
