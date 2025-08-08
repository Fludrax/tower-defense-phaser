export interface Targetable {
  x: number;
  y: number;
  progress: number;
}

export function selectTarget<T extends Targetable>(
  enemies: T[],
  x: number,
  y: number,
  range: number,
): T | undefined {
  let best: T | undefined;
  let bestProgress = -Infinity;
  const rangeSq = range * range;
  for (const enemy of enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx * dx + dy * dy <= rangeSq) {
      if (enemy.progress > bestProgress) {
        bestProgress = enemy.progress;
        best = enemy;
      }
    }
  }
  return best;
}
