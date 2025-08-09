import Phaser from 'phaser';
import { events } from '../core/events';
import {
  ENEMIES_PER_WAVE,
  ENEMY_HP,
  ENEMY_REWARD,
  ENEMY_SPEED,
  STARTING_LIVES,
  STARTING_MONEY,
  WAVE_INTERVAL,
  TOWERS,
  type TowerStats,
  PROJECTILE_SPEED,
} from '../core/balance';
import { worldToGrid } from '../core/grid';
import { selectTarget, Targetable } from '../core/targeting';
import { ObjectPool } from '../core/pool';
import { updatePath } from '../systems/path';
import { addStatus, updateStatuses, Status } from '../core/status';

const TILE_SIZE = 32;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 17;

export class Enemy implements Targetable {
  circle: Phaser.GameObjects.Arc;
  progress = 0;
  dead = false;
  path!: Phaser.Curves.Path;
  speed = ENEMY_SPEED;
  baseSpeed = ENEMY_SPEED;
  hp = ENEMY_HP;
  onDeath!: () => void;
  private statuses: Status[] = [];

  constructor(private scene: Phaser.Scene) {
    this.circle = scene
      .add.circle(0, 0, 10, 0xf87171)
      .setActive(false)
      .setVisible(false);
    this.circle.setInteractive();
    this.circle.on('pointerdown', () => {
      this.dead = true;
      this.circle.setActive(false).setVisible(false);
      this.onDeath?.();
    });
  }

  spawn(path: Phaser.Curves.Path, speed: number, hp: number, onDeath: () => void) {
    this.path = path;
    this.baseSpeed = speed;
    this.speed = speed;
    this.hp = hp;
    this.onDeath = onDeath;
    this.progress = 0;
    this.dead = false;
    this.circle.setActive(true).setVisible(true);
    this.statuses = [];
    this.circle.setFillStyle(0xf87171);
  }

  reset() {
    this.circle.setActive(false).setVisible(false);
    this.dead = false;
    this.progress = 0;
    this.statuses = [];
    this.speed = this.baseSpeed;
    this.circle.setFillStyle(0xf87171);
  }

  get x() {
    return this.circle.x;
  }

  get y() {
    return this.circle.y;
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      this.circle.setActive(false).setVisible(false);
      this.onDeath();
    }
  }

  addSlow(pct: number, dur: number) {
    addStatus(this.statuses, { type: 'slow', value: pct, remaining: dur }, 1);
  }

  addDot(dps: number, dur: number) {
    addStatus(this.statuses, { type: 'dot', value: dps, remaining: dur }, 3);
  }

  update(delta: number) {
    const { slow, damage } = updateStatuses(this.statuses, delta);
    this.speed = this.baseSpeed * (1 - slow);
    if (damage > 0) this.takeDamage(damage);
    // visual indicator
    if (slow > 0) {
      this.circle.setFillStyle(0x60a5fa);
    } else {
      this.circle.setFillStyle(0xf87171);
    }
  }
}

export class Projectile {
  circle: Phaser.GameObjects.Arc;
  dead = false;
  target!: Enemy;
  speed = PROJECTILE_SPEED;
  private stats!: TowerStats;
  private enemies: Enemy[] = [];

  constructor(private scene: GameScene) {
    this.circle = scene.add.circle(0, 0, 3, 0xfacc15).setActive(false).setVisible(false);
  }

  fire(target: Enemy, x: number, y: number, stats: TowerStats, enemies: Enemy[]) {
    this.target = target;
    this.stats = stats;
    this.enemies = enemies;
    this.dead = false;
    this.circle.setPosition(x, y).setActive(true).setVisible(true);
  }

  reset() {
    this.circle.setActive(false).setVisible(false);
    this.dead = false;
  }

  update(delta: number) {
    if (this.dead || this.target.dead) {
      this.circle.setActive(false).setVisible(false);
      return true;
    }
    const dx = this.target.x - this.circle.x;
    const dy = this.target.y - this.circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = (this.speed * delta) / 1000;
    if (dist <= move) {
      const tx = this.target.x;
      const ty = this.target.y;
      if (this.stats.aoeRadius) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
          if (d <= this.stats.aoeRadius) {
            e.takeDamage(this.stats.damage);
            if (this.stats.slowPct)
              e.addSlow(this.stats.slowPct, this.stats.slowDur ?? 0);
            if (this.stats.dotDamage)
              e.addDot(this.stats.dotDamage, this.stats.dotDur ?? 0);
          }
        }
        const explosion = this.scene.add
          .circle(tx, ty, this.stats.aoeRadius, 0xfacc15, 0.3)
          .setStrokeStyle(1, 0xffffff, 0.5);
        this.scene.time.addEvent({ delay: 100, callback: () => explosion.destroy() });
      } else {
        this.target.takeDamage(this.stats.damage);
        if (this.stats.slowPct)
          this.target.addSlow(this.stats.slowPct, this.stats.slowDur ?? 0);
        if (this.stats.dotDamage)
          this.target.addDot(this.stats.dotDamage, this.stats.dotDur ?? 0);
      }
      this.dead = true;
      this.circle.setActive(false).setVisible(false);
      return true;
    }
    this.circle.x += (dx / dist) * move;
    this.circle.y += (dy / dist) * move;
    return false;
  }
}

class Tower {
  private rect: Phaser.GameObjects.Rectangle;
  private lastShot = 0;
  constructor(private scene: GameScene, public x: number, public y: number, private stats: TowerStats) {
    this.rect = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x60a5fa);
  }

  update(delta: number, enemies: Enemy[]) {
    this.lastShot += delta;
    if (this.lastShot < 1000 / this.stats.fireRate) return;
    const target = selectTarget(enemies, this.x, this.y, this.stats.range) as Enemy | undefined;
    if (target) {
      if (this.scene.game.loop.actualFps >= 50 || this.scene.projectiles.length < 100) {
        const p = this.scene.projectilePool.acquire();
        p.fire(target, this.x, this.y, this.stats, enemies);
        this.scene.projectiles.push(p);
      }
      this.lastShot = 0;
    }
  }
}

export class GameScene extends Phaser.Scene {
  private wave = 0;
  private lives = STARTING_LIVES;
  private money = STARTING_MONEY;
  private path!: Phaser.Curves.Path;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  public projectiles: Projectile[] = [];
  private occupied = new Set<string>();
  private previewTower!: Phaser.GameObjects.Rectangle;
  private previewRange!: Phaser.GameObjects.Arc;
  private paused = false;
  private enemyPool!: ObjectPool<Enemy>;
  public projectilePool!: ObjectPool<Projectile>;
  private profilerText!: Phaser.GameObjects.Text;
  private profiler = false;
  private updateTotal = 0;
  private updateSamples = 0;
  private selectedTower = 'arrow';

  constructor() {
    super('Game');
  }

  create() {
    this.drawGrid();
    this.createPath();
    this.enemyPool = new ObjectPool(
      () => new Enemy(this),
      (e) => e.reset(),
    );
    this.projectilePool = new ObjectPool(
      () => new Projectile(this),
      (p) => p.reset(),
    );
    this.profilerText = this.add
      .text(10, 10, '', { color: '#fff' })
      .setDepth(1000)
      .setVisible(false);
    this.input.keyboard?.on('keydown-F3', () => {
      this.profiler = !this.profiler;
      this.profilerText.setVisible(this.profiler);
    });

    this.time.addEvent({
      delay: WAVE_INTERVAL,
      loop: true,
      callback: this.spawnWave,
      callbackScope: this,
    });
    this.spawnWave();
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });

    this.previewTower = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x60a5fa, 0.5);
    this.previewRange = this.add.circle(0, 0, TOWERS[this.selectedTower].range);
    this.previewRange.setStrokeStyle(1, 0xffffff, 0.3);
    this.previewRange.setFillStyle(0xffffff, 0.05);
    this.previewTower.setVisible(false);
    this.previewRange.setVisible(false);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      this.previewTower.setPosition(x, y);
      this.previewRange.setPosition(x, y);
      const key = `${col},${row}`;
      const stats = TOWERS[this.selectedTower];
      this.previewRange.setRadius(stats.range);
      const valid =
        !this.isPath(col, row) && !this.occupied.has(key) && this.money >= stats.cost;
      this.previewTower.setFillStyle(valid ? 0x60a5fa : 0xf87171, 0.5);
      this.previewTower.setVisible(true);
      this.previewRange.setVisible(true);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
      const key = `${col},${row}`;
      const stats = TOWERS[this.selectedTower];
      if (this.isPath(col, row) || this.occupied.has(key) || this.money < stats.cost) return;
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      this.towers.push(new Tower(this, x, y, stats));
      this.occupied.add(key);
      this.money -= stats.cost;
      events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
    });

    events.on('tower-select', (type: string) => {
      this.selectedTower = type;
      this.previewRange.setRadius(TOWERS[type].range);
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.paused = !this.paused;
      this.time.paused = this.paused;
    });
    this.input.keyboard?.on('keydown-ONE', () => {
      this.time.timeScale = 1;
    });
    this.input.keyboard?.on('keydown-TWO', () => {
      this.time.timeScale = 2;
    });
  }

  update(_time: number, delta: number) {
    if (this.paused) return;
    const start = performance.now();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);
      if (updatePath(enemy, delta)) {
        this.enemies.splice(i, 1);
        this.lives -= 1;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
        this.enemyPool.release(enemy);
        continue;
      }
      if (enemy.dead) {
        this.enemies.splice(i, 1);
        this.enemyPool.release(enemy);
      }
    }

    for (const tower of this.towers) {
      tower.update(delta, this.enemies);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.update(delta)) {
        this.projectiles.splice(i, 1);
        this.projectilePool.release(p);
      }
    }

    const duration = performance.now() - start;
    this.updateTotal += duration;
    this.updateSamples += 1;
    if (this.profiler && this.updateSamples >= 20) {
      const avg = this.updateTotal / this.updateSamples;
      this.profilerText.setText(
        `E:${this.enemies.length} P:${this.projectiles.length} U:${avg.toFixed(2)}ms`,
      );
      this.updateTotal = 0;
      this.updateSamples = 0;
    }
  }

  private drawGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x334155, 0.5);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      graphics.lineBetween(0, y * TILE_SIZE, GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
  }

  private createPath() {
    const points = [
      new Phaser.Math.Vector2(0, 5 * TILE_SIZE),
      new Phaser.Math.Vector2(29 * TILE_SIZE, 5 * TILE_SIZE),
      new Phaser.Math.Vector2(29 * TILE_SIZE, 16 * TILE_SIZE),
    ];
    this.path = new Phaser.Curves.Path(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.path.lineTo(points[i].x, points[i].y);
    }
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x22d3ee, 1);
    this.path.draw(graphics);
  }

  private spawnWave() {
    this.wave += 1;
    for (let i = 0; i < ENEMIES_PER_WAVE; i++) {
      const enemy = this.enemyPool.acquire();
      enemy.spawn(this.path, ENEMY_SPEED, ENEMY_HP, () => {
        this.money += ENEMY_REWARD;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
      });
      this.enemies.push(enemy);
    }
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
  }

  private isPath(col: number, row: number) {
    return (row === 5 && col >= 0 && col <= 29) || (col === 29 && row >= 5 && row <= 16);
  }
}
