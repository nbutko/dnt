import type { ReactNode } from 'react'

// The double-border outer frame + radial-gradient background shared by all
// four screens (docs/design/README.md §1/§2 — battle, map, dungeon, and Inn
// all reuse this verbatim). Extracted from BattleScreen.tsx in Story 1.
const outerFrameStyle = {
  background: 'radial-gradient(ellipse at 50% 0%, #2a1710 0%, #140b07 65%)',
  outline: '1px solid var(--color-border-inset)',
  outlineOffset: '-8px',
}

interface FrameProps {
  children: ReactNode
  maxWidth?: number
  className?: string
}

const Frame = ({ children, maxWidth = 1040, className = '' }: FrameProps) => (
  <div
    className={`mx-auto border-[3px] border-border-gold p-7 ${className}`}
    style={{ ...outerFrameStyle, maxWidth }}
  >
    {children}
  </div>
)

export default Frame
