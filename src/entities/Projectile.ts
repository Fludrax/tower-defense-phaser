import { Enemy, EnemyManager } from './EnemyManager';
import { ObjectPool } from '../core/pool';

export type ProjectileType = 'arrow' | 'cannon' | 'frost';

interface ProjectileConfig {
  speed: number; // pixels per second
  damage: number;
  explosionRadius?: number;
  slowPct?: number;
  slowDur?: number;
}

const CONFIG: Record<ProjectileType, ProjectileConfig> = {
  arrow: { speed: 400, damage: 1 },
  cannon: { speed: 200, damage: 2, explosionRadius: 30 },
  frost: { speed: 300, damage: 0, slowPct: 0.3, slowDur: 2 },
};

export class Projectile {
  x = 0;
  y = 0;
  target!: Enemy;
  active = false;
  private cfg!: ProjectileConfig;
  private enemies: EnemyManager;
  constructor(manager: EnemyManager) {
    this.enemies = manager;
  }

  fire(type: ProjectileType, x: number, y: number, target: Enemy) {
    this.cfg = CONFIG[type];
    this.x = x;
    this.y = y;
    this.target = target;
    this.active = true;
  }

  reset() {
    this.active = false;
  }

  update(dt: number): boolean {
    if (!this.active) return true;
    if (this.target.dead) {
      this.active = false;
      return true;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = this.cfg.speed * dt;
    if (dist <= move) {
      this.hit();
      return true;
    }
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
    return false;
  }

  private hit() {
    if (this.cfg.explosionRadius) {
      const victims = this.enemies.getEnemiesInRange(
        this.target.x,
        this.target.y,
        this.cfg.explosionRadius,
      );
      for (const e of victims) {
        e.takeDamage(this.cfg.damage);
        if (this.cfg.slowPct) e.addSlow?.(this.cfg.slowPct, this.cfg.slowDur!);
      }
    } else {
      this.target.takeDamage(this.cfg.damage);
      if (this.cfg.slowPct) this.target.addSlow?.(this.cfg.slowPct, this.cfg.slowDur!);
    }
    this.active = false;
  }
}

export class ProjectilePool extends ObjectPool<Projectile> {
  public active: Projectile[] = [];
  constructor(manager: EnemyManager) {
    super(
      () => new Projectile(manager),
      (p) => p.reset(),
    );
  }
  acquire(): Projectile {
    const p = super.acquire();
    this.active.push(p);
    return p;
  }
  release(p: Projectile) {
    const idx = this.active.indexOf(p);
    if (idx >= 0) this.active.splice(idx, 1);
    super.release(p);
  }
}
