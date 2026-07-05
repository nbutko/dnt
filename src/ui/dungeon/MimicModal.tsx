import ModalOverlay from '../common/ModalOverlay'

interface MimicModalProps {
  monsterName: string
  onBegin: () => void
}

// Shown the instant a chest turns out to be a mimic — the reveal only fires
// AFTER the player commits to opening the chest (feedback #13), so it never
// leaks which chest is the mimic beforehand. It replaces the old jarring
// straight-to-battle jump. Non-dismissable: the sole action is Begin Battle.
const MimicModal = ({ monsterName, onBegin }: MimicModalProps) => (
  <ModalOverlay>
    <p className="font-display text-2xl font-bold tracking-[0.1em] text-danger-bright uppercase">
      You encountered a Mimic!
    </p>
    <p className="mt-3 text-text-dim">
      The chest springs open with teeth — a {monsterName} was lying in wait.
    </p>
    <button
      type="button"
      onClick={onBegin}
      // The modal gates the run, so give the kid the button focused: Enter
      // begins the battle without hunting for the mouse.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      className="mt-6 rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
    >
      Begin Battle →
    </button>
  </ModalOverlay>
)

export default MimicModal
