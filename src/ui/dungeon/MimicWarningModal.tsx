import ModalOverlay from '../common/ModalOverlay'

interface MimicWarningModalProps {
  onBackAway: () => void
  onOpenAnyway: () => void
}

// WIS mimic sense's "teeth on edge" warning (m3-scope.html#mimic-sense,
// wireframe turn 5a) — shown ONLY when the hidden d20+WIS+proficiency check
// (engine/dice/mimic-sense.ts) beats the tier's deception DC on a chest
// that's genuinely a mimic. Back away skips it with no heart risk (the node
// stays available); Open anyway takes the fight knowingly, for the XP.
// Non-dismissable otherwise (ModalOverlay) — the only ways out are its own
// two buttons.
const MimicWarningModal = ({ onBackAway, onOpenAnyway }: MimicWarningModalProps) => (
  <ModalOverlay>
    <div className="text-3xl">🫣</div>
    <p className="mt-2 font-display text-lg tracking-[0.04em] text-[#e0a56a] uppercase">
      A prickle of warning
    </p>
    <p className="mt-3 font-body text-[15px] text-text-primary italic">
      &ldquo;Something about this chest sets your teeth on edge…&rdquo;
    </p>
    <p className="mt-2 font-body text-xs text-text-dim">
      It&apos;s a mimic. You&apos;re sure of it — and you&apos;ll remember.
    </p>
    <div className="mt-5 flex justify-center gap-3">
      <button
        type="button"
        onClick={onBackAway}
        // Autofocused: the safe default for a warning is to heed it.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
      >
        Back away
      </button>
      <button
        type="button"
        onClick={onOpenAnyway}
        className="rounded border border-border-gold-dim px-4 py-2 font-mono text-sm text-text-dim hover:border-danger-bright hover:text-danger-bright"
      >
        Open anyway <span className="text-[11px] text-node-locked-text-dim">(take the fight for XP)</span>
      </button>
    </div>
  </ModalOverlay>
)

export default MimicWarningModal
