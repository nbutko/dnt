import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RewardModal from './RewardModal'

const renderModal = (onConfirm = vi.fn()) => {
  render(
    <RewardModal
      title="Victory!"
      xpGained={12}
      coinsGained={5}
      xpTotal={112}
      coinsTotal={45}
      onConfirm={onConfirm}
    />,
  )
  return onConfirm
}

describe('RewardModal', () => {
  it('shows what was gained and the new running total for XP and coins (feedback #1)', () => {
    renderModal()
    expect(screen.getByText('+12 XP')).toBeInTheDocument()
    expect(screen.getByText('+5 coins')).toBeInTheDocument()
    expect(screen.getByText('112 total')).toBeInTheDocument()
    expect(screen.getByText('45 total')).toBeInTheDocument()
  })

  it('confirms on Enter alone — its Continue doubles as the battle continue (feedback #12)', async () => {
    const user = userEvent.setup()
    const onConfirm = renderModal()
    // The Continue button is autofocused, so a bare Enter activates it.
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirms on a click of Continue', async () => {
    const user = userEvent.setup()
    const onConfirm = renderModal()
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
