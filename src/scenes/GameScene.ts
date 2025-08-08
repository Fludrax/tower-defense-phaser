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
} from '../core/balance';

const TILE_SIZE = 32;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 17;

class Enemy {
  private circle: Phaser.GameObjects.Arc;
  private progress = 0;
  private dead = false;

  constructor(
    private scene: Phaser.Scene,
    private path: Phaser.Curves.Path,
    public speed: number,
    public hp: number,
    private onDeath: () => void,
  ) {
    this.circle = scene.add.circle(0, 0, 10, 0xf87171);
    this.circle.setInteractive();
    this.circle.on('pointerdown', () => {
      this.dead = true;
      this.circle.destroy();
      this.onDeath();
    });
  }

  update(delta: number) {
    if (this.dead) return false;
    this.progress += (this.speed * delta) / this.path.getLength();
    if (this.progress >= 1) {
      this.dead = true;
      this.circle.destroy();
      return true;
    }
    const pos = this.path.getPoint(this.progress);
    this.circle.setPosition(pos.x, pos.y);
    return false;
  }
}

export class GameScene extends Phaser.Scene {
  private wave = 0;
  private lives = STARTING_LIVES;
  private money = STARTING_MONEY;
  private path!: Phaser.Curves.Path;
  private enemies: Enemy[] = [];

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
}
