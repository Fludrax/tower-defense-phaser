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
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { ObjectPool } from '../core/pool';

const TILE_SIZE = 32;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 17;

export class GameScene extends Phaser.Scene {
  private wave = 0;
  private lives = STARTING_LIVES;
  private money = STARTING_MONEY;
  private path!: Phaser.Curves.Path;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private enemyPool!: ObjectPool<Enemy>;
  private projectilePool!: ObjectPool<Projectile>;
  private profilerText!: Phaser.GameObjects.Text;
  private profilerEnabled = false;
  private updateTime = 0;
  private updateSamples = 0;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Game');
  }

  create() {
    this.drawGrid();
    this.createPath();
    this.enemyPool = new ObjectPool(
      () => new Enemy(this),
      (e) => e.deactivate(),
    );
    this.projectilePool = new ObjectPool(
      () => new Projectile(this),
      (p) => p.deactivate(),
    );
    this.time.addEvent({
      delay: WAVE_INTERVAL,
      loop: true,
      callback: this.spawnWave,
      callbackScope: this,
    });
    this.spawnWave();
    this.profilerText = this.add
      .text(4, 4, '', { fontSize: '12px', color: '#fff' })
      .setDepth(100)
      .setVisible(false);
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F3).on('down', () => {
      this.profilerEnabled = !this.profilerEnabled;
      this.profilerText.setVisible(this.profilerEnabled);
    });
    const particles = this.add.particles(0xffffff);
    this.emitter = (particles as any).createEmitter({
      speed: 20,
      lifespan: 500,
      quantity: 1,
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const proj = this.projectilePool.acquire();
      const dx = pointer.x;
      const dy = pointer.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 0.4;
      proj.fire(0, 0, (dx / len) * speed, (dy / len) * speed);
      this.projectiles.push(proj);
    });
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
  }

  update(_time: number, delta: number) {
    const start = performance.now();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.update(delta)) {
        this.enemies.splice(i, 1);
        this.enemyPool.release(enemy);
        this.lives -= 1;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.update(delta)) {
        this.projectiles.splice(i, 1);
        this.projectilePool.release(proj);
      }
    }
    const duration = performance.now() - start;
    this.updateTime += duration;
    this.updateSamples += 1;
    if (this.profilerEnabled) {
      const avg = this.updateTime / this.updateSamples;
      this.profilerText.setText(
        `E:${this.enemies.length} P:${this.projectiles.length}\nupd:${avg.toFixed(2)}ms`,
      );
    }
    if (this.game.loop.actualFps < 50) {
      this.emitter.setQuantity(0);
    } else {
      this.emitter.setQuantity(1);
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
      enemy.reset(this.path, ENEMY_SPEED, ENEMY_HP, () => {
        this.money += ENEMY_REWARD;
        events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) {
          this.enemies.splice(idx, 1);
        }
        this.enemyPool.release(enemy);
      });
      this.enemies.push(enemy);
    }
    events.emit('stats', { wave: this.wave, lives: this.lives, money: this.money });
  }
}
