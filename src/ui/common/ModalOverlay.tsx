import type { ReactNode } from 'react'

// A centred modal panel over a dimmed backdrop, in the shared gold-frame
// aesthetic (matches Frame's radial-gradient fill). Deliberately NON-dismissable
// — no backdrop-click or Escape handler — because the game's modals gate a
// required choice (e.g. "Begin Battle", "Continue"): the only way out is the
// panel's own button. Reused by the mimic reveal (feedback #13) and the reward
// modal (feedback #1/#12).
const ModalOverlay = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
    <div
      role="dialog"
      aria-modal="true"
      className="w-full max-w-md rounded-lg border-2 border-border-gold p-6 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #2a1710 0%, #140b07 65%)' }}
    >
      {children}
    </div>
  </div>
)

export default ModalOverlay
