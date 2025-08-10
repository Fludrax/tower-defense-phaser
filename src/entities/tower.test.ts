import { describe, it, expect } from 'vitest';
import { Enemy, EnemyManager } from './EnemyManager';
import { Tower } from './Tower';
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
      if (this.slowTime <= 0) this.speed = this.baseSpeed;
    }
  }
}

describe('tower shooting', () => {
  it('fires after cooldown expires', () => {
    const enemies = new EnemyManager();
    const e = new DummyEnemy(2, 0, 0.1);
    enemies.add(e);
    const pool = new ProjectilePool(enemies);
    const tower = new Tower(0, 0, 'arrow', 5, 1, enemies, pool);
    tower.cooldown = 1;
    tower.update(0.5);
    expect(pool.active.length).toBe(0);
    tower.update(0.6);
    expect(pool.active.length).toBe(1);
  });

  it('retargets when target leaves range', () => {
    const enemies = new EnemyManager();
    const e1 = new DummyEnemy(3, 0, 0.6);
    const e2 = new DummyEnemy(2, 0, 0.4);
    enemies.add(e1);
    enemies.add(e2);
    const pool = new ProjectilePool(enemies);
    const tower = new Tower(0, 0, 'arrow', 5, 1, enemies, pool);
    tower.update(1);
    expect(pool.active[0].target).toBe(e1);
    e1.x = 100; // out of range
    tower.update(1);
    expect(pool.active[1].target).toBe(e2);
  });
});
