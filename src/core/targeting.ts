export interface Targetable {
  x: number;
  y: number;
  progress: number;
}

export function selectTarget(
  enemies: Targetable[],
  x: number,
  y: number,
  range: number,
): Targetable | undefined {
  let best: Targetable | undefined;
  let bestProgress = -Infinity;
  const rangeSq = range * range;
  for (const enemy of enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx * dx + dy * dy <= rangeSq && enemy.progress > bestProgress) {
      best = enemy;
      bestProgress = enemy.progress;
    }
  }
  return best;
}
