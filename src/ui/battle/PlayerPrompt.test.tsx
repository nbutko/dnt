import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PlayerPrompt from './PlayerPrompt'

// PlayerPrompt is presentational: `input` is owned by BattleScreen via
// ui/hooks/useTypingInput.ts (tested there). Nothing here is focusable or
// typeable by design.
describe('PlayerPrompt', () => {
  it('renders the prompt with the typed progress overlaid, and no text field', () => {
    const { container } = render(
      <PlayerPrompt prompt="jak" input="ja" disabled={false} paused={false} />,
    )
    expect(container.textContent).toContain('jak')
    expect(container.querySelector('input, textarea, [contenteditable]')).toBeNull()
  })

  it('shows a time-out message instead of the prompt while paused on an expire', () => {
    const { container } = render(
      <PlayerPrompt prompt="jak" input="" disabled={false} paused pauseReason="expire" />,
    )
    expect(screen.getByText('Time Limit Expired. You missed!')).toBeInTheDocument()
    expect(container.textContent).not.toContain('jak')
  })

  it('shows a wrong-text message instead of the prompt while paused on a miss', () => {
    const { container } = render(
      <PlayerPrompt prompt="jak" input="" disabled={false} paused pauseReason="miss" />,
    )
    expect(screen.getByText('Incorrect Incantation. You missed!')).toBeInTheDocument()
    expect(container.textContent).not.toContain('jak')
  })
})
