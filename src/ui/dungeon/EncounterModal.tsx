import ModalOverlay from '../common/ModalOverlay'

interface EncounterModalProps {
  headline: string
  subtext: string
  // Red treatment for a mimic ambush or the boss; gold for a waypoint/approach.
  danger?: boolean
  onBegin: () => void
}

// Shown the instant a hidden encounter is committed to — a mimic chest springing
// its trap (feedback #13), or a waypoint/approach/boss whose monster stays behind
// a `?` until you select it (round-2 #C). The reveal only fires AFTER the player
// commits, so it never leaks which chest is the mimic or what guards a chokepoint
// beforehand. Non-dismissable: the sole action is Begin Battle.
const EncounterModal = ({ headline, subtext, danger = false, onBegin }: EncounterModalProps) => (
  <ModalOverlay>
    <p
      className={`font-display text-2xl font-bold tracking-[0.1em] uppercase ${
        danger ? 'text-danger-bright' : 'text-accent-gold-bright'
      }`}
    >
      {headline}
    </p>
    <p className="mt-3 text-text-dim">{subtext}</p>
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

export default EncounterModal
