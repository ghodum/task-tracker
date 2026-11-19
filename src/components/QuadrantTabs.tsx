import { useRef } from 'react';
import { QUADRANTS } from '../quadrants.ts';
import { TAB_IDS, type TabId } from '../tabs.ts';
import type { QuadrantId } from '../types.ts';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  counts: Record<QuadrantId, number>;
  overdue: Record<QuadrantId, number>;
  doneCount: number;
}

export function QuadrantTabs({ active, onChange, counts, overdue, doneCount }: Props) {
  const refs = useRef(new Map<TabId, HTMLButtonElement>());

  const onKeyDown = (event: React.KeyboardEvent) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = TAB_IDS.indexOf(active);
    const next = TAB_IDS[(index + delta + TAB_IDS.length) % TAB_IDS.length];
    onChange(next);
    refs.current.get(next)?.focus();
  };

  const tab = (id: TabId, label: string, count: number, hasOverdue: boolean) => (
    <button
      key={id}
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active === id}
      aria-controls={`panel-${id}`}
      tabIndex={active === id ? 0 : -1}
      className={`tab ${id} ${active === id ? 'is-active' : ''}`}
      onClick={() => onChange(id)}
      ref={(element) => {
        if (element) refs.current.set(id, element);
      }}
    >
      <span className="tab-label">{label}</span>
      <span className="tab-count" aria-label={`${count} open`}>
        {count}
      </span>
      {hasOverdue && <span className="tab-overdue" data-testid={`overdue-${id}`} aria-label="has overdue tasks" />}
    </button>
  );

  return (
    <div className="tabs" role="tablist" aria-label="Quadrants" onKeyDown={onKeyDown}>
      {QUADRANTS.map((meta) =>
        tab(meta.id, `${meta.short} · ${meta.label}`, counts[meta.id], overdue[meta.id] > 0),
      )}
      {tab('done', 'Done', doneCount, false)}
    </div>
  );
}
