import { describe, expect, it } from 'vitest';
import { enemySpeedForWave } from './balance';

describe('enemy speed balance', () => {
  it('scales and clamps', () => {
    expect(enemySpeedForWave(0)).toBeCloseTo(32);
    expect(enemySpeedForWave(10)).toBeCloseTo(32 * (1 + 0.03 * 10));
    expect(enemySpeedForWave(100)).toBe(100);
  });
});
