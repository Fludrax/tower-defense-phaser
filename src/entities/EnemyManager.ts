export interface Enemy {
  x: number;
  y: number;
  progress: number;
  dead: boolean;
  takeDamage(amount: number): void;
  addSlow?(pct: number, dur: number): void;
}

export class EnemyManager {
  private enemies: Enemy[] = [];

  add(enemy: Enemy) {
    this.enemies.push(enemy);
  }

  getEnemiesInRange(x: number, y: number, range: number): Enemy[] {
    const r2 = range * range;
    return this.enemies.filter((e) => {
      if (e.dead) return false;
      const dx = e.x - x;
      const dy = e.y - y;
      return dx * dx + dy * dy <= r2;
    });
  }

  getMostAdvancedInRange(x: number, y: number, range: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestProgress = -Infinity;
    const inRange = this.getEnemiesInRange(x, y, range);
    for (const enemy of inRange) {
      if (enemy.progress > bestProgress) {
        best = enemy;
        bestProgress = enemy.progress;
      }
    }
    return best;
  }
}
