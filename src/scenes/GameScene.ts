import Phaser from 'phaser';
import { events } from '../core/events';
import {
  ENEMIES_PER_WAVE,
  ENEMY_REWARD,
  STARTING_LIVES,
  STARTING_MONEY,
  TOWERS,
  type TowerStats,
  PROJECTILE_SPEED,
  TILE_SIZE,
  enemySpeedForWave,
  enemyHpForWave,
  spawnDelay,
  WAVE_BREAK,
} from '../core/balance';
import { worldToGrid } from '../core/grid';
import { selectTarget, Targetable } from '../core/targeting';
import { ObjectPool } from '../core/pool';
import { updatePath } from '../systems/path';
import { addStatus, updateStatuses, Status } from '../core/status';
import { upgradeCost, sellRefund } from '../core/economy';
import { createMap } from '../systems/map';
import { sound } from '../audio/SoundManager';
import { getMode, cancelMode } from '../core/inputMode';

export class Enemy implements Targetable {
  circle: Phaser.GameObjects.Arc;
  progress = 0;
  dead = false;
  path!: Phaser.Curves.Path;
  speed = 0;
  baseSpeed = 0;
  hp = 0;
  onDeath!: () => void;
  private statuses: Status[] = [];

  constructor(private scene: Phaser.Scene) {
    this.circle = scene.add.circle(0, 0, 10, 0xf87171).setActive(false).setVisible(false);
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
    sound.playShoot();
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
            if (this.stats.slowPct) e.addSlow(this.stats.slowPct, this.stats.slowDur ?? 0);
            if (this.stats.dotDamage) e.addDot(this.stats.dotDamage, this.stats.dotDur ?? 0);
          }
        }
        const explosion = this.scene.add
          .circle(tx, ty, this.stats.aoeRadius, 0xfacc15, 0.3)
          .setStrokeStyle(1, 0xffffff, 0.5);
        this.scene.time.addEvent({ delay: 100, callback: () => explosion.destroy() });
        sound.playExplosion();
      } else {
        this.target.takeDamage(this.stats.damage);
        if (this.stats.slowPct) this.target.addSlow(this.stats.slowPct, this.stats.slowDur ?? 0);
        if (this.stats.dotDamage) this.target.addDot(this.stats.dotDamage, this.stats.dotDur ?? 0);
        sound.playHit();
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
  public rect: Phaser.GameObjects.Rectangle;
  private lastShot = 0;
  public level = 1;
  public stats: TowerStats;
  constructor(
    private scene: GameScene,
    public x: number,
    public y: number,
    public type: string,
  ) {
    this.stats = TOWERS[type].levels[0];
    this.rect = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x60a5fa).setInteractive();
    this.rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.scene.showTowerPanel(this);
    });
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
  private buildableMask = new Set<string>();
  private previewTower!: Phaser.GameObjects.Rectangle;
  private previewRange!: Phaser.GameObjects.Arc;
  private infoPanel!: Phaser.GameObjects.Container;
  private infoText!: Phaser.GameObjects.Text;
  private upgradeBtn!: Phaser.GameObjects.Text;
  private sellBtn!: Phaser.GameObjects.Text;
  private activeTower: Tower | null = null;
  private paused = false;
  private speedMultiplier = 1;
  private isGameOver = false;
  private spawnEvent?: Phaser.Time.TimerEvent;
  private waveTimer!: Phaser.Time.TimerEvent;
  private enemyPool!: ObjectPool<Enemy>;
  public projectilePool!: ObjectPool<Projectile>;
  private profilerText!: Phaser.GameObjects.Text;
  private profiler = false;
  private updateTotal = 0;
  private updateSamples = 0;

  constructor() {
    super('Game');
  }

  private emitStats() {
    events.emit('waveChanged', this.wave);
    events.emit('livesChanged', this.lives);
    events.emit('moneyChanged', this.money);
  }

  private handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.spawnEvent?.remove();
    this.waveTimer.remove();
    this.time.timeScale = 0;
    this.input.enabled = false;
    events.emit('gameOver', { wave: this.wave, money: this.money });
  }

  create() {
    this.wave = 0;
    this.lives = STARTING_LIVES;
    this.money = STARTING_MONEY;
    this.isGameOver = false;
    this.paused = false;
    this.speedMultiplier = 1;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.occupied.clear();
    this.input.enabled = true;
    this.input.mouse?.disableContextMenu();
    const map = createMap(this, { kind: 'forest' });
    this.path = map.path;
    this.buildableMask = map.buildableMask;
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

    this.spawnWave();
    this.emitStats();
    events.emit('speedChanged', this.speedMultiplier);

    events.on('setSpeed', (s: number) => {
      this.speedMultiplier = s;
      if (!this.paused) this.time.timeScale = s;
      events.emit('speedChanged', s);
    });
    events.on('pause', () => {
      this.paused = true;
      this.time.timeScale = 0;
    });
    events.on('resume', () => {
      this.paused = false;
      this.time.timeScale = this.speedMultiplier;
    });
    events.on('restart', () => {
      this.scene.restart();
    });

    this.time.timeScale = this.speedMultiplier;

    this.previewTower = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x60a5fa, 0.5);
    this.previewRange = this.add.circle(0, 0, 0);
    this.previewRange.setStrokeStyle(1, 0xffffff, 0.3);
    this.previewRange.setFillStyle(0xffffff, 0.05);
    this.previewTower.setVisible(false);
    this.previewRange.setVisible(false);
    this.infoPanel = this.add.container(0, 0).setDepth(1000).setVisible(false);
    const bg = this.add.rectangle(0, 0, 120, 80, 0x334155, 0.9).setOrigin(0);
    this.infoText = this.add.text(5, 5, '', { color: '#fff' });
    this.upgradeBtn = this.add.text(5, 40, '', { color: '#22c55e' }).setInteractive();
    this.sellBtn = this.add.text(5, 60, '', { color: '#f87171' }).setInteractive();
    this.infoPanel.add([bg, this.infoText, this.upgradeBtn, this.sellBtn]);
    this.upgradeBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      if (this.activeTower) {
        this.upgradeTower(this.activeTower);
        this.hidePanel();
      }
    });
    this.sellBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      if (this.activeTower) {
        this.sellTower(this.activeTower);
        this.hidePanel();
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      const mode = getMode();
      const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      if (mode.startsWith('build:')) {
        const type = mode.split(':')[1] as keyof typeof TOWERS;
        const cfg = TOWERS[type];
        this.previewRange.setRadius(cfg.levels[0].range);
        const key = `${col},${row}`;
        const valid = !this.isPath(col, row) && !this.occupied.has(key) && this.money >= cfg.cost;
        this.previewTower
          .setPosition(x, y)
          .setFillStyle(valid ? 0x60a5fa : 0xf87171, 0.5)
          .setVisible(true);
        this.previewRange.setPosition(x, y).setVisible(true);
      } else {
        this.previewTower.setVisible(false);
        this.previewRange.setVisible(false);
      }
    });

    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
        if (this.isGameOver) return;
        if (pointer.rightButtonDown()) {
          cancelMode();
          return;
        }
        const mode = getMode();
        const { col, row } = worldToGrid(pointer.x, pointer.y, TILE_SIZE);
        const key = `${col},${row}`;
        if (mode.startsWith('build:')) {
          const type = mode.split(':')[1] as keyof typeof TOWERS;
          const cfg = TOWERS[type];
          if (this.isPath(col, row) || this.occupied.has(key) || this.money < cfg.cost) {
            sound.playError();
            return;
          }
          const x = col * TILE_SIZE + TILE_SIZE / 2;
          const y = row * TILE_SIZE + TILE_SIZE / 2;
          this.towers.push(new Tower(this, x, y, type));
          this.occupied.add(key);
          this.money -= cfg.cost;
          sound.playPlace();
          this.emitStats();
          cancelMode();
          this.previewTower.setVisible(false);
          this.previewRange.setVisible(false);
        } else if (mode === 'upgrade') {
          const tower = this.getTower(col, row);
          if (tower) {
            this.upgradeTower(tower);
          } else {
            sound.playError();
          }
        } else if (mode === 'sell') {
          const tower = this.getTower(col, row);
          if (tower) {
            this.sellTower(tower);
          } else {
            sound.playError();
          }
        } else {
          if (this.infoPanel.visible && targets.length === 0) {
            this.hidePanel();
          } else {
            const tower = this.getTower(col, row);
            if (tower) this.showTowerPanel(tower);
          }
        }
      },
    );

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
    this.input.keyboard?.on('keydown-ESC', () => cancelMode());
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isGameOver) return;
    const start = performance.now();
    const dt = delta * this.speedMultiplier;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt);
      if (updatePath(enemy, dt)) {
        this.enemies.splice(i, 1);
        this.lives -= 1;
        this.emitStats();
        this.enemyPool.release(enemy);
        if (this.lives <= 0) this.handleGameOver();
        continue;
      }
      if (enemy.dead) {
        this.enemies.splice(i, 1);
        this.enemyPool.release(enemy);
      }
    }

    for (const tower of this.towers) {
      tower.update(dt, this.enemies);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.update(dt)) {
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

  showTowerPanel(tower: Tower) {
    const cfg = TOWERS[tower.type];
    const nextCost = tower.level < cfg.levels.length ? upgradeCost(cfg.cost, tower.level) : 0;
    const refund = sellRefund(cfg.cost, tower.level);
    this.infoText.setText(
      `Lvl ${tower.level}\nR:${tower.stats.range} D:${tower.stats.damage} F:${tower.stats.fireRate}` +
        (tower.level < cfg.levels.length ? `\nUp:$${nextCost}` : '\nMax'),
    );
    this.upgradeBtn.setText(`Upgrade ($${nextCost})`).setVisible(tower.level < cfg.levels.length);
    this.sellBtn.setText(`Sell ($${refund})`);
    this.infoPanel.setPosition(tower.x + TILE_SIZE / 2, tower.y - TILE_SIZE / 2);
    this.infoPanel.setVisible(true);
    this.activeTower = tower;
  }

  private hidePanel() {
    this.infoPanel.setVisible(false);
    this.activeTower = null;
  }

  private upgradeTower(tower: Tower) {
    const cfg = TOWERS[tower.type];
    if (tower.level >= cfg.levels.length) return;
    const cost = upgradeCost(cfg.cost, tower.level);
    if (this.money < cost) {
      sound.playError();
      return;
    }
    this.money -= cost;
    tower.level += 1;
    tower.stats = cfg.levels[tower.level - 1];
    this.emitStats();
    sound.playPlace();
  }

  private sellTower(tower: Tower) {
    const cfg = TOWERS[tower.type];
    const refund = sellRefund(cfg.cost, tower.level);
    this.money += refund;
    const col = Math.floor(tower.x / TILE_SIZE);
    const row = Math.floor(tower.y / TILE_SIZE);
    this.occupied.delete(`${col},${row}`);
    const idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);
    tower.rect.destroy();
    this.emitStats();
    sound.playPlace();
  }

  private getTower(col: number, row: number) {
    return this.towers.find(
      (t) => Math.floor(t.x / TILE_SIZE) === col && Math.floor(t.y / TILE_SIZE) === row,
    );
  }

  private spawnWave() {
    this.wave += 1;
    let spawned = 0;
    const spawnEnemy = () => {
      if (this.isGameOver) return;
      const enemy = this.enemyPool.acquire();
      const speed = enemySpeedForWave(this.wave);
      const hp = enemyHpForWave(this.wave);
      enemy.spawn(this.path, speed, hp, () => {
        this.money += ENEMY_REWARD;
        this.emitStats();
      });
      this.enemies.push(enemy);
      spawned += 1;
      if (spawned < ENEMIES_PER_WAVE) {
        this.spawnEvent = this.time.delayedCall(spawnDelay(), spawnEnemy);
      }
    };
    spawnEnemy();
    this.emitStats();
    // schedule next wave after break
    let remaining = WAVE_BREAK / 1000;
    events.emit('waveCountdown', remaining);
    const ticker = this.time.addEvent({
      delay: 1000,
      repeat: remaining - 1,
      callback: () => {
        remaining -= 1;
        events.emit('waveCountdown', remaining);
      },
    });
    this.waveTimer = this.time.delayedCall(WAVE_BREAK, () => {
      ticker.remove();
      if (!this.isGameOver) this.spawnWave();
    });
  }

  private isPath(col: number, row: number) {
    return this.buildableMask.has(`${col},${row}`);
  }
}
