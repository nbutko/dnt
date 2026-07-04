import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PlayerPrompt from './PlayerPrompt'

describe('PlayerPrompt', () => {
  it('does not submit on Enter until the input length matches the prompt', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PlayerPrompt
        prompt="jak"
        timeLimitMs={5000}
        elapsedMs={0}
        disabled={false}
        onSubmit={onSubmit}
      />,
    )

    const input = screen.getByLabelText('Type the prompt')
    await user.type(input, 'ja{enter}')
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(input, 'k{enter}')
    expect(onSubmit).toHaveBeenCalledWith('jak')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('is disabled once the battle is no longer ongoing', () => {
    render(
      <PlayerPrompt prompt="jak" timeLimitMs={5000} elapsedMs={0} disabled onSubmit={vi.fn()} />,
    )
    expect(screen.getByLabelText('Type the prompt')).toBeDisabled()
  })
})
