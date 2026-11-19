import { QUADRANT_IDS } from './quadrants.ts';
import type { QuadrantId } from './types.ts';

/** The quadrant tabs plus the Done tab, in display order. */
export type TabId = QuadrantId | 'done';

export const TAB_IDS: readonly TabId[] = [...QUADRANT_IDS, 'done'];

export function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && (TAB_IDS as readonly string[]).includes(value);
}
