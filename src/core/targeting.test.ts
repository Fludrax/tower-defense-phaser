import { describe, expect, it } from 'vitest';
import { selectTarget, Targetable } from './targeting';

describe('selectTarget', () => {
  const enemies: Targetable[] = [
    { x: 0, y: 0, progress: 0.3 },
    { x: 40, y: 0, progress: 0.6 },
    { x: 80, y: 0, progress: 0.9 },
  ];

  it('returns the most advanced enemy within range', () => {
    const target = selectTarget(enemies, 0, 0, 50);
    expect(target).toEqual(enemies[1]);
  });

  it('returns undefined when no enemy is in range', () => {
    const target = selectTarget(enemies, 200, 0, 50);
    expect(target).toBeUndefined();
  });
});
