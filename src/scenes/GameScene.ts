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
  PROJECTILE_SPEED,
  TOWER_STATS,
} from '../core/balance';
import { worldToGrid } from '../core/grid';
import { selectTarget, Targetable } from '../core/targeting';
import { StatusManager } from '../core/status';

const TILE_SIZE = 32;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 17;

class Enemy implements Targetable {
  private circle: Phaser.GameObjects.Arc;
  private progressValue = 0;
  private dead = false;
  private scene: Phaser.Scene;
  private path: Phaser.Curves.Path;
  private baseSpeed: number;
  public hp: number;
  private onDeath: () => void;
  private status: StatusManager;

  constructor(
    scene: Phaser.Scene,
    path: Phaser.Curves.Path,
    speed: number,
    hp: number,
    onDeath: () => void,
  ) {
    this.scene = scene;
    this.path = path;
    this.baseSpeed = speed;
    this.hp = hp;
    this.onDeath = onDeath;
    this.status = new StatusManager((d) => this.takeDamage(d));
    this.circle = scene.add.circle(0, 0, 10, 0xf87171);
    this.circle.setInteractive();
    this.circle.on('pointerdown', () => {
      this.dead = true;
      this.circle.destroy();
      this.onDeath();
    });
  }

  get x() {
    return this.circle.x;
  }

  get y() {
    return this.circle.y;
  }

  get progress() {
    return this.progressValue;
  }

  isDead() {
    return this.dead;
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      this.circle.destroy();
      this.onDeath();
    }
  }

  update(delta: number) {
    if (this.dead) return false;
    this.status.update(delta);
    const speed = this.baseSpeed * this.status.speedMultiplier;
    this.progressValue += (speed * delta) / this.path.getLength();
    if (this.progressValue >= 1) {
      this.dead = true;
      this.circle.destroy();
      return true;
    }
    const pos = this.path.getPoint(this.progressValue);
    this.circle.setPosition(pos.x, pos.y);
    let color = 0xf87171;
    if (this.status.hasSlow && this.status.hasDot) color = 0x9333ea;
    else if (this.status.hasSlow) color = 0x60a5fa;
    else if (this.status.hasDot) color = 0xdc2626;
    this.circle.setFillStyle(color);
    return false;
  }

  applySlow(pct: number, duration: number) {
    this.status.applySlow(pct, duration);
  }

  applyDot(dps: number, duration: number) {
    this.status.applyDot(dps, duration);
  }
}

class Projectile {
  private circle: Phaser.GameObjects.Arc;
  private dead = false;
  private scene: Phaser.Scene;
  private target: Enemy;
  public speed: number;
  private onHit: (enemy: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    target: Enemy,
    speed: number,
    x: number,
    y: number,
    onHit: (enemy: Enemy) => void,
  ) {
    this.scene = scene;
    this.target = target;
    this.speed = speed;
    this.onHit = onHit;
    this.circle = scene.add.circle(x, y, 3, 0xfacc15);
  }

  update(delta: number) {
    if (this.dead || this.target.isDead()) {
      this.circle.destroy();
      return true;
    }
    const dx = this.target.x - this.circle.x;
    const dy = this.target.y - this.circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = (this.speed * delta) / 1000;
    if (dist <= move) {
      this.onHit(this.target);
      this.circle.destroy();
      this.dead = true;
      return true;
    }
    this.circle.x += (dx / dist) * move;
    this.circle.y += (dy / dist) * move;
    return false;
  }
}

type TowerType = keyof typeof TOWER_STATS;

class Tower {
  private rect: Phaser.GameObjects.Rectangle;
  private lastShot = 0;
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  public type: TowerType;
  public range: number;
  public fireRate: number;
  public damage: number;
  public aoeRadius?: number;
  public slowPct?: number;
  public slowDur?: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    const cfg = TOWER_STATS[type];
    this.range = cfg.range;
    this.fireRate = cfg.fireRate;
    this.damage = cfg.damage;
    this.aoeRadius = cfg.aoeRadius;
    this.slowPct = cfg.slowPct;
    this.slowDur = cfg.slowDur;
    this.rect = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x60a5fa);
  }

  update(delta: number, enemies: Enemy[], projectiles: Projectile[]) {
    this.lastShot += delta;
    if (this.lastShot < 1000 / this.fireRate) return;
    const target = selectTarget(enemies, this.x, this.y, this.range) as Enemy | undefined;
    if (target) {
      const onHit = (enemy: Enemy) => {
        if (this.type === 'cannon' && this.aoeRadius) {
          for (const e of enemies) {
            const dx = e.x - enemy.x;
            const dy = e.y - enemy.y;
            if (dx * dx + dy * dy <= this.aoeRadius * this.aoeRadius) {
              e.takeDamage(this.damage);
            }
          }
        } else {
          enemy.takeDamage(this.damage);
          if (this.type === 'frost' && this.slowPct && this.slowDur) {
            enemy.applySlow(this.slowPct, this.slowDur);
          }
        }
      };
      projectiles.push(new Projectile(this.scene, target, PROJECTILE_SPEED, this.x, this.y, onHit));
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
  private projectiles: Projectile[] = [];
  private occupied = new Set<string>();
  private previewTower!: Phaser.GameObjects.Rectangle;
  private previewRange!: Phaser.GameObjects.Arc;
  private selected: TowerType = 'arrow';
  private paused = false;

  constructor() {
    super('Game');
  }

  create() {
    this.drawGrid();
    this.createPath();
    this.time.addEvent({
      delay: WAVE_INTERVAL,
      loop: true,
      callback: this.spawnWave,
      callbackScope: this,
    });
    this.spawnWave();
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });

    this.previewTower = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x60a5fa, 0.5);
    this.previewRange = this.add.circle(0, 0, TOWER_STATS[this.selected].range);
    this.previewRange.setStrokeStyle(1, 0xffffff, 0.3);
    this.previewRange.setFillStyle(0xffffff, 0.05);
    this.previewTower.setVisible(false);
    this.previewRange.setVisible(false);

    events.on('selectTower', (type: TowerType) => {
      this.selected = type;
      this.previewRange.setRadius(TOWER_STATS[type].range);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      const key = `${col},${row}`;
      const valid =
        !this.isPath(col, row) &&
        !this.occupied.has(key) &&
        this.money >= TOWER_STATS[this.selected].cost;
      this.previewTower.setPosition(x, y);
      this.previewRange.setPosition(x, y);
      this.previewTower.setFillStyle(valid ? 0x60a5fa : 0xf87171, 0.5);
      this.previewTower.setVisible(true);
      this.previewRange.setVisible(true);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
      const key = `${col},${row}`;
      const cfg = TOWER_STATS[this.selected];
      if (this.isPath(col, row) || this.occupied.has(key) || this.money < cfg.cost) return;
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      this.towers.push(new Tower(this, x, y, this.selected));
      this.occupied.add(key);
      this.money -= cfg.cost;
      events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
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
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.update(delta)) {
        this.enemies.splice(i, 1);
        this.lives -= 1;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
      }
    }

    for (const tower of this.towers) {
      tower.update(delta, this.enemies, this.projectiles);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].update(delta)) {
        this.projectiles.splice(i, 1);
      }
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
      const enemy = new Enemy(this, this.path, ENEMY_SPEED, ENEMY_HP, () => {
        this.money += ENEMY_REWARD;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
        this.enemies = this.enemies.filter((e) => e !== enemy);
      });
      this.enemies.push(enemy);
    }
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
  }

  private isPath(col: number, row: number) {
    return (row === 5 && col >= 0 && col <= 29) || (col === 29 && row >= 5 && row <= 16);
  }
}
