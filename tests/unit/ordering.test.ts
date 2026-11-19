import { describe, expect, it } from 'vitest';
import { byOrder, orderForBottom, orderForMove, orderForTop } from '../../src/ordering.ts';
import { makeTask } from './factories.ts';

const list = (...orders: number[]) =>
  orders.map((order, index) => makeTask({ id: `t${index}`, order, createdAt: index }));

describe('orderForTop', () => {
  it('returns 0 for an empty quadrant', () => {
    expect(orderForTop([])).toBe(0);
  });

  it('sorts above every sibling, including negative orders', () => {
    const siblings = list(-3, 5, 2);
    expect(orderForTop(siblings)).toBeLessThan(-3);
  });
});

describe('orderForBottom', () => {
  it('sorts below every sibling', () => {
    expect(orderForBottom([])).toBe(0);
    expect(orderForBottom(list(-3, 5, 2))).toBeGreaterThan(5);
  });
});

describe('byOrder', () => {
  it('sorts ascending by order', () => {
    const sorted = [...list(3, 1, 2)].sort(byOrder).map((t) => t.order);
    expect(sorted).toEqual([1, 2, 3]);
  });

  it('breaks ties on createdAt then id so hand-edited files stay stable', () => {
    const a = makeTask({ id: 'a', order: 1, createdAt: 2 });
    const b = makeTask({ id: 'b', order: 1, createdAt: 1 });
    expect([a, b].sort(byOrder).map((t) => t.id)).toEqual(['b', 'a']);

    const c = makeTask({ id: 'c', order: 1, createdAt: 1 });
    const d = makeTask({ id: 'd', order: 1, createdAt: 1 });
    expect([d, c].sort(byOrder).map((t) => t.id)).toEqual(['c', 'd']);
  });
});

describe('orderForMove', () => {
  const reorder = (orders: number[], id: string, toIndex: number) => {
    const ordered = [...list(...orders)].sort(byOrder);
    const order = orderForMove(ordered, id, toIndex);
    expect(order).not.toBeNull();
    return ordered
      .map((t) => (t.id === id ? { ...t, order: order as number } : t))
      .sort(byOrder)
      .map((t) => t.id);
  };

  it('moves a task to the top', () => {
    expect(reorder([0, 1, 2], 't2', 0)).toEqual(['t2', 't0', 't1']);
  });

  it('moves a task to the bottom', () => {
    expect(reorder([0, 1, 2], 't0', 2)).toEqual(['t1', 't2', 't0']);
  });

  it('moves a task into the middle using a fractional key', () => {
    const ordered = [...list(0, 1, 2)].sort(byOrder);
    const order = orderForMove(ordered, 't0', 1);
    expect(order).toBe(1.5);
    expect(reorder([0, 1, 2], 't0', 1)).toEqual(['t1', 't0', 't2']);
  });

  it('clamps an out-of-range index', () => {
    expect(reorder([0, 1, 2], 't0', 99)).toEqual(['t1', 't2', 't0']);
    expect(reorder([0, 1, 2], 't2', -5)).toEqual(['t2', 't0', 't1']);
  });

  it('keeps a single task where it is', () => {
    const ordered = list(7);
    expect(orderForMove(ordered, 't0', 0)).toBe(7);
  });

  it('survives colliding neighbour orders', () => {
    const ordered = [...list(1, 1, 1)].sort(byOrder);
    expect(orderForMove(ordered, 't0', 1)).toBe(1);
  });

  it('returns null for an unknown id', () => {
    expect(orderForMove(list(0, 1), 'nope', 0)).toBeNull();
  });
});
