import { render, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A hung IndexedDB open sits in `readyState: pending` forever — model that as a
// loadSave() promise that never settles, and prove the app still comes up on a
// fresh save instead of gating blank forever (feedback #16).
vi.mock('./save-storage', () => ({
  loadSave: vi.fn(() => new Promise<never>(() => {})),
  saveSave: vi.fn(),
}))

// eslint-disable-next-line import/first -- must follow the vi.mock hoist above
import SaveProvider from './SaveProvider'

describe('SaveProvider', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children on a fresh save when the IndexedDB load hangs (feedback #16)', async () => {
    vi.useFakeTimers()
    render(
      <SaveProvider>
        <p>ready</p>
      </SaveProvider>,
    )
    // Still gated (blank) before the fallback timeout fires.
    expect(screen.queryByText('ready')).not.toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByText('ready')).toBeInTheDocument()
  })
})
