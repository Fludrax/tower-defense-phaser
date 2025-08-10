import { EnemyManager } from './EnemyManager';
import { ProjectilePool, ProjectileType } from './Projectile';

export class Tower {
  cooldown = 0;
  x: number;
  y: number;
  type: ProjectileType;
  range: number;
  fireRate: number;
  private enemies: EnemyManager;
  private projectiles: ProjectilePool;

  constructor(
    x: number,
    y: number,
    type: ProjectileType,
    range: number,
    fireRate: number,
    enemies: EnemyManager,
    projectiles: ProjectilePool,
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.range = range;
    this.fireRate = fireRate;
    this.enemies = enemies;
    this.projectiles = projectiles;
  }

  update(dt: number) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const target = this.enemies.getMostAdvancedInRange(this.x, this.y, this.range);
    if (target) {
      const p = this.projectiles.acquire();
      p.fire(this.type, this.x, this.y, target);
      this.cooldown = 1 / this.fireRate;
    }
  }
}
