import ModalOverlay from '../common/ModalOverlay'

interface RewardRowProps {
  label: string
  gained: number
  total: number
  className: string
}

const RewardRow = ({ label, gained, total, className }: RewardRowProps) => (
  <div className="flex items-center justify-between gap-6 font-mono text-sm">
    <span className={className}>
      +{gained} {label}
    </span>
    <span className="text-text-dim">{total} total</span>
  </div>
)

interface RewardModalProps {
  title: string
  xpGained: number
  coinsGained: number
  xpTotal: number
  coinsTotal: number
  onConfirm: () => void
}

// Shown when a battle is won or the real chest is opened (feedback #1): what you
// just gained, plus the new running total, for both XP and coins. It is also the
// single "continue" for the win (feedback #12) — its button is autofocused so
// Enter alone confirms, and confirming is what advances the run back to the
// graph. There's no separate battle Continue press to make first; a win resolves
// straight into this modal. Non-dismissable (ModalOverlay).
const RewardModal = ({
  title,
  xpGained,
  coinsGained,
  xpTotal,
  coinsTotal,
  onConfirm,
}: RewardModalProps) => (
  <ModalOverlay>
    <p className="font-display text-2xl font-bold tracking-[0.1em] text-accent-gold-bright uppercase">
      {title}
    </p>
    <div className="mx-auto mt-4 flex w-full max-w-[16rem] flex-col gap-2">
      <RewardRow label="XP" gained={xpGained} total={xpTotal} className="text-accent-gold-bright" />
      <RewardRow label="coins" gained={coinsGained} total={coinsTotal} className="text-coin" />
    </div>
    <button
      type="button"
      onClick={onConfirm}
      // Autofocused so Enter alone confirms and returns to the graph (feedback #12).
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      className="mt-6 rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
    >
      Continue →
    </button>
  </ModalOverlay>
)

export default RewardModal
