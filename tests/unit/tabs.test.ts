import { describe, expect, it } from 'vitest';
import { TAB_IDS, isTabId } from '../../src/tabs.ts';

describe('tabs', () => {
  it('lists the four quadrants and Done, in order', () => {
    expect(TAB_IDS).toEqual(['q1', 'q2', 'q3', 'q4', 'done']);
  });

  it('recognises a stored tab id and rejects anything else', () => {
    expect(isTabId('q3')).toBe(true);
    expect(isTabId('done')).toBe(true);
    expect(isTabId('q9')).toBe(false);
    expect(isTabId(null)).toBe(false);
  });
});
