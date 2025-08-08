import Phaser from 'phaser';
import { events } from '../core/events';
import {
  ENEMIES_PER_WAVE,
  ENEMY_HP,
  ENEMY_REWARD,
  ENEMY_SPEED,
  STARTING_LIVES,
  STARTING_MONEY,
  WAVE_INTERVAL_MS,
  TOWER_COST,
  TOWER_RANGE,
  TOWER_FIRE_RATE_MS,
  PROJECTILE_SPEED,
  PROJECTILE_DAMAGE,
} from '../core/balance';
import { worldToGrid, gridToWorld, TILE_SIZE } from '../core/grid';
import { selectTarget } from '../core/targeting';

const GRID_WIDTH = 30;
const GRID_HEIGHT = 17;
const ENEMY_RADIUS = 10;

class Enemy {
  private circle: Phaser.GameObjects.Arc;
  private _progress = 0;
  private dead = false;

  constructor(
    private scene: Phaser.Scene,
    private path: Phaser.Curves.Path,
    public speed: number,
    public hp: number,
    private onDeath: () => void,
  ) {
    this.circle = scene.add.circle(0, 0, ENEMY_RADIUS, 0xf87171);
  }

  get x() {
    return this.circle.x;
  }

  get y() {
    return this.circle.y;
  }

  get progress() {
    return this._progress;
  }

  hit(damage: number) {
    if (this.dead) return;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.dead = true;
      this.circle.destroy();
      this.onDeath();
    }
  }

  update(delta: number) {
    if (this.dead) return false;
    this._progress += (this.speed * delta) / this.path.getLength();
    if (this._progress >= 1) {
      this.dead = true;
      this.circle.destroy();
      return true;
    }
    const pos = this.path.getPoint(this._progress);
    this.circle.setPosition(pos.x, pos.y);
    return false;
  }
}

class Projectile {
  private circle: Phaser.GameObjects.Arc;

  constructor(
    private scene: Phaser.Scene,
    private target: Enemy,
    private x: number,
    private y: number,
    private speed: number,
    private damage: number,
    private onRemove: (p: Projectile) => void,
  ) {
    this.circle = scene.add.circle(x, y, 4, 0xfacc15);
  }

  update(delta: number) {
    const dx = this.target.x - this.circle.x;
    const dy = this.target.y - this.circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = (this.speed * delta) / 1000;
    if (dist <= ENEMY_RADIUS || dist <= move) {
      this.target.hit(this.damage);
      this.circle.destroy();
      this.onRemove(this);
      return true;
    }
    this.circle.x += (dx / dist) * move;
    this.circle.y += (dy / dist) * move;
    return false;
  }
}

class Tower {
  private rect: Phaser.GameObjects.Rectangle;
  private cooldown = 0;

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    private range: number,
    private fireRate: number,
    private projectiles: Projectile[],
    private enemies: Enemy[],
  ) {
    this.rect = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x34d399);
  }

  update(delta: number) {
    this.cooldown -= delta;
    if (this.cooldown > 0) return;
    const target = selectTarget(this.enemies, this.x, this.y, this.range);
    if (!target) return;
    this.cooldown = this.fireRate;
    const projectile = new Projectile(
      this.scene,
      target,
      this.x,
      this.y,
      PROJECTILE_SPEED,
      PROJECTILE_DAMAGE,
      (p) => {
        const index = this.projectiles.indexOf(p);
        if (index >= 0) this.projectiles.splice(index, 1);
      },
    );
    this.projectiles.push(projectile);
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
  private preview!: Phaser.GameObjects.Graphics;
  private speed = 1;

  constructor() {
    super('Game');
  }

  create() {
    this.drawGrid();
    this.createPath();
    this.preview = this.add.graphics();

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(p.worldX, p.worldY);
      this.preview.clear();
      if (this.isTileFree(col, row) && this.money >= TOWER_COST) {
        const { x, y } = gridToWorld(col, row);
        this.preview.fillStyle(0x34d399, 0.3);
        this.preview.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.preview.lineStyle(1, 0x34d399, 0.5);
        this.preview.strokeCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TOWER_RANGE);
        this.preview.setVisible(true);
      } else {
        this.preview.setVisible(false);
      }
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(p.worldX, p.worldY);
      if (this.isTileFree(col, row) && this.money >= TOWER_COST) {
        const { x, y } = gridToWorld(col, row);
        const tower = new Tower(
          this,
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TOWER_RANGE,
          TOWER_FIRE_RATE_MS,
          this.projectiles,
          this.enemies,
        );
        this.towers.push(tower);
        this.occupied.add(`${col},${row}`);
        this.money -= TOWER_COST;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
      }
    });

    this.input.keyboard!.on('keydown-P', () => {
      if (this.time.timeScale === 0) {
        this.time.timeScale = this.speed;
      } else {
        this.time.timeScale = 0;
      }
    });
    this.input.keyboard!.on('keydown-ONE', () => {
      this.speed = 1;
      if (this.time.timeScale !== 0) this.time.timeScale = 1;
    });
    this.input.keyboard!.on('keydown-TWO', () => {
      this.speed = 2;
      if (this.time.timeScale !== 0) this.time.timeScale = 2;
    });

    this.time.addEvent({
      delay: WAVE_INTERVAL_MS,
      loop: true,
      callback: this.spawnWave,
      callbackScope: this,
    });
    this.spawnWave();
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
  }

  update(_time: number, delta: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.update(delta)) {
        this.enemies.splice(i, 1);
        this.lives -= 1;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
      }
    }

    for (const tower of this.towers) {
      tower.update(delta);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(delta);
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

  private isTileFree(col: number, row: number) {
    if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) {
      return false;
    }
    if ((row === 5 && col >= 0 && col <= 29) || (col === 29 && row >= 5 && row <= 16)) {
      return false;
    }
    return !this.occupied.has(`${col},${row}`);
  }
}
