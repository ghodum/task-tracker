import { QUADRANTS } from '../quadrants.ts';
import type { QuadrantId } from '../types.ts';

interface Props {
  value: QuadrantId;
  onChange: (quadrant: QuadrantId) => void;
  label?: string;
  idPrefix?: string;
}

/**
 * The 2x2 Covey grid as a radio group: picking a cell sets urgent/important,
 * which is what moves a task between quadrant tabs.
 */
export function QuadrantPicker({ value, onChange, label = 'Quadrant', idPrefix }: Props) {
  const name = idPrefix ? `${idPrefix}-quadrant` : 'quadrant';
  return (
    <fieldset className="picker">
      <legend>{label}</legend>
      <div className="picker-grid">
        {QUADRANTS.map((meta) => (
          <label
            key={meta.id}
            className={`picker-cell ${meta.id} ${value === meta.id ? 'is-selected' : ''}`}
            title={`${meta.label} — ${meta.blurb}`}
          >
            <input
              type="radio"
              name={name}
              value={meta.id}
              checked={value === meta.id}
              onChange={() => onChange(meta.id)}
            />
            <span className="picker-short">{meta.short}</span>
            <span className="picker-label">{meta.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
