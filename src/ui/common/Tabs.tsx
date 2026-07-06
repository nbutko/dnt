// The Inn's tab strip (docs/design/m3-wireframes.html turn 2) — Rest & Sheet
// today, joined by the Armory in Story 8. Generic over the tab id so both
// callers get type-checked selection without this component knowing either
// screen's tab names.
export interface TabItem<T extends string> {
  id: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[]
  activeId: T
  onSelect: (id: T) => void
}

const Tabs = <T extends string>({ tabs, activeId, onSelect }: TabsProps<T>) => (
  <div className="mb-5 flex justify-center gap-2">
    {tabs.map((tab) => {
      const isActive = tab.id === activeId
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`rounded-full border px-3 py-1 font-mono text-xs ${
            isActive
              ? 'border-accent-gold-bright bg-accent-gold-bright font-bold text-[#1c0f0a]'
              : 'border-border-gold bg-panel-base text-coin hover:text-accent-gold-bright'
          }`}
        >
          {tab.label}
        </button>
      )
    })}
  </div>
)

export default Tabs
