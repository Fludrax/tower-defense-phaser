import { describe, it, expect } from 'vitest';
import { calcPreview, TowerLike } from './TowerPanel';
import { TOWERS } from '../core/balance';

describe('tower panel preview', () => {
  it('computes before/after and refund', () => {
    const tower: TowerLike = {
      x: 0,
      y: 0,
      type: 'arrow',
      level: 1,
      stats: TOWERS.arrow.levels[0],
    };
    const res = calcPreview(tower);
    expect(res.before.damage).toBe(1);
    expect(res.after?.damage).toBe(2);
    expect(res.upgrade).toBeGreaterThan(0);
    expect(res.refund).toBeGreaterThan(0);
  });
});
