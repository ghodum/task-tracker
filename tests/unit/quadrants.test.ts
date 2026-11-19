import { describe, expect, it } from 'vitest';
import {
  QUADRANTS,
  QUADRANT_IDS,
  flagsFor,
  isQuadrantId,
  quadrantMeta,
  quadrantOf,
} from '../../src/quadrants.ts';
import type { QuadrantId } from '../../src/types.ts';

describe('quadrantOf', () => {
  it('maps every urgent/important combination to its quadrant', () => {
    expect(quadrantOf({ urgent: true, important: true })).toBe('q1');
    expect(quadrantOf({ urgent: false, important: true })).toBe('q2');
    expect(quadrantOf({ urgent: true, important: false })).toBe('q3');
    expect(quadrantOf({ urgent: false, important: false })).toBe('q4');
  });
});

describe('flagsFor', () => {
  it('round-trips with quadrantOf for all four quadrants', () => {
    for (const id of QUADRANT_IDS) {
      expect(quadrantOf(flagsFor(id))).toBe(id);
    }
  });
});

describe('QUADRANTS', () => {
  it('describes exactly the four distinct quadrants', () => {
    expect(QUADRANTS).toHaveLength(4);
    expect(new Set(QUADRANT_IDS).size).toBe(4);
    for (const meta of QUADRANTS) {
      expect(meta.label).not.toBe('');
      expect(meta.short).not.toBe('');
      expect(meta.blurb).not.toBe('');
    }
  });
});

describe('quadrantMeta', () => {
  it('throws on an unknown id', () => {
    expect(() => quadrantMeta('q9' as QuadrantId)).toThrow(/Unknown quadrant/);
  });
});

describe('isQuadrantId', () => {
  it('accepts quadrant ids and rejects anything else', () => {
    expect(isQuadrantId('q1')).toBe(true);
    expect(isQuadrantId('q5')).toBe(false);
    expect(isQuadrantId(1)).toBe(false);
    expect(isQuadrantId(null)).toBe(false);
  });
});
