import { describe, expect, it } from 'vitest';
import { enemySpeedForWave } from './balance';

describe('enemy speed balance', () => {
  it('scales and clamps', () => {
    expect(enemySpeedForWave(0)).toBeCloseTo(40);
    expect(enemySpeedForWave(10)).toBeCloseTo(60);
    expect(enemySpeedForWave(100)).toBe(120);
  });
});
