import { CLASSES, type ClassFeature } from '../../config/classes'
import { getWeapon } from '../../config/weapons'
import type { CharacterClass } from '../../domain/character'

// Short display label per class feature kind (config/classes.ts) — matches
// the wireframe's chip captions exactly ("Longsword · Second Wind", etc).
// Exported so HeroSummary's confirm-step "Feature" row can reuse it.
export const FEATURE_LABEL: Record<ClassFeature['kind'], string> = {
  'second-wind': 'Second Wind',
  'arcane-mind': 'Arcane Mind',
  cunning: 'Cunning',
  'silver-tongue': 'Silver Tongue',
}

interface ClassPickerProps {
  selected: CharacterClass
  onSelect: (id: CharacterClass) => void
}

// Step 2 of creation (wireframe turn 1a): 4 class chips, one always selected
// (the gold-glow chip) so "pick a class" never needs an explicit empty state.
const ClassPicker = ({ selected, onSelect }: ClassPickerProps) => (
  <div>
    <div className="mb-2.5 text-center font-body text-[13px] text-text-dim italic">Step 2 · Pick a class</div>
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {CLASSES.map((classDef) => {
        const isSelected = classDef.id === selected
        const weapon = getWeapon(classDef.startingWeapon)
        return (
          <button
            key={classDef.id}
            type="button"
            onClick={() => onSelect(classDef.id)}
            className={`rounded-lg border-2 p-2.5 text-center ${
              isSelected ? 'border-accent-gold-bright bg-panel-base shadow-[0_0_12px_#e8c76655]' : 'border-border-gold opacity-80'
            }`}
            style={isSelected ? undefined : { background: 'rgba(59,18,32,.25)' }}
          >
            <div className={`font-display text-[13px] ${isSelected ? 'text-accent-gold-bright' : 'text-text-dim'}`}>
              {classDef.name.toUpperCase()}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-text-dim">
              d{classDef.hitDie} · {classDef.favoredAbilities.map((ability) => ability.toUpperCase()).join('/')}
            </div>
            <div className="mt-1 font-body text-[10.5px] text-node-locked-text">
              {weapon.name} · {FEATURE_LABEL[classDef.feature.kind]}
            </div>
          </button>
        )
      })}
    </div>
  </div>
)

export default ClassPicker
