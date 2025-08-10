import { describe, it, expect } from 'vitest';
import { Enemy, EnemyManager } from './EnemyManager';
import { ProjectilePool } from './Projectile';

class DummyEnemy implements Enemy {
  dead = false;
  speed = 100;
  baseSpeed = 100;
  slowTime = 0;
  x: number;
  y: number;
  progress: number;
  constructor(x: number, y: number, progress: number) {
    this.x = x;
    this.y = y;
    this.progress = progress;
  }
  takeDamage() {
    this.dead = true;
  }
  addSlow(pct: number, dur: number) {
    this.speed = this.baseSpeed * (1 - pct);
    this.slowTime = dur;
  }
  update(dt: number) {
    if (this.slowTime > 0) {
      this.slowTime -= dt;
      if (this.slowTime <= 0) {
        this.speed = this.baseSpeed;
      }
    }
  }
}

describe('frost projectile', () => {
  it('applies slow that expires', () => {
    const manager = new EnemyManager();
    const enemy = new DummyEnemy(0, 0, 0.5);
    manager.add(enemy);
    const pool = new ProjectilePool(manager);
    const p = pool.acquire();
    p.fire('frost', 0, 0, enemy);
    p.update(0.1);
    expect(enemy.speed).toBeCloseTo(70);
    enemy.update(1);
    expect(enemy.speed).toBeCloseTo(70);
    enemy.update(1.1);
    expect(enemy.speed).toBeCloseTo(100);
  });
});
