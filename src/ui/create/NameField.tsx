interface NameFieldProps {
  value: string
  onChange: (name: string) => void
  onRandomize: () => void
}

// Step 3 of creation (wireframe turn 1a): a random default from
// content/names.json, fully editable, with a dice button to redraw it.
const NameField = ({ value, onChange, onRandomize }: NameFieldProps) => (
  <div className="w-full sm:w-[280px]">
    <div className="mb-2.5 text-center font-body text-[13px] text-text-dim italic">Step 3 · Name your hero</div>
    <div className="flex items-center gap-2 rounded-md border border-border-gold bg-panel-base px-3 py-2.5">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Hero name"
        className="min-w-0 flex-1 bg-transparent font-body text-lg text-text-primary outline-none"
      />
      <button
        type="button"
        onClick={onRandomize}
        title="new random name"
        aria-label="Randomize name"
        className="font-mono text-sm text-text-dim hover:text-accent-gold-bright"
      >
        🎲
      </button>
    </div>
    <div className="mt-1.5 text-center font-mono text-[10px] text-node-locked-text">
      random default · fully editable
    </div>
  </div>
)

export default NameField
