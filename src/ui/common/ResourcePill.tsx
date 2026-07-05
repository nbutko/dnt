interface ResourcePillProps {
  kind: 'xp' | 'coins'
  amount: number
}

const LABEL: Record<ResourcePillProps['kind'], string> = { xp: 'XP', coins: 'coins' }
const TEXT_CLASS: Record<ResourcePillProps['kind'], string> = {
  xp: 'text-accent-gold-bright',
  coins: 'text-coin',
}

// XP / coins pill readout (design/README.md §4 — the Inn header).
const ResourcePill = ({ kind, amount }: ResourcePillProps) => (
  <span
    className={`rounded-full border border-border-gold bg-panel-base px-3 py-1 font-mono text-xs ${TEXT_CLASS[kind]}`}
  >
    {amount} {LABEL[kind]}
  </span>
)

export default ResourcePill
