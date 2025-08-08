import { describe, expect, it } from 'vitest';
import { StatusManager } from './status';

describe('status manager', () => {
  it('applies slow with duration', () => {
    const sm = new StatusManager(() => {});
    sm.applySlow(0.3, 2000);
    expect(sm.speedMultiplier).toBeCloseTo(0.7, 5);
    sm.update(1000);
    expect(sm.speedMultiplier).toBeCloseTo(0.7, 5);
    sm.update(1000);
    expect(sm.speedMultiplier).toBeCloseTo(1, 5);
  });

  it('applies dot damage over time', () => {
    let damage = 0;
    const sm = new StatusManager((d) => (damage += d));
    sm.applyDot(2, 1000); // 2 damage per second for 1s
    sm.update(500);
    expect(damage).toBe(1);
    sm.update(500);
    expect(damage).toBe(2);
    sm.update(1000);
    expect(damage).toBe(2);
  });
});
