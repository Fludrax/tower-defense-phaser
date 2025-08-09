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
import { TowerPanel } from '../ui/TowerPanel';

export class Enemy implements Targetable {
  circle: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  progress = 0;
  dead = false;
  path!: Phaser.Curves.Path;
  speed = 0;
  baseSpeed = 0;
  hp = 0;
  maxHp = 0;
  onDeath!: () => void;
  private statuses: Status[] = [];

  constructor(private scene: Phaser.Scene) {
    this.circle = scene.add.circle(0, 0, 10, 0x222222).setActive(false).setVisible(false);
    this.hpBg = scene.add
      .rectangle(0, 0, 20, 3, 0x555555)
      .setOrigin(0.5, 0.5)
      .setActive(false)
      .setVisible(false);
    this.hpBar = scene.add
      .rectangle(0, 0, 20, 3, 0x16a34a)
      .setOrigin(0, 0.5)
      .setActive(false)
      .setVisible(false);
  }

  spawn(path: Phaser.Curves.Path, speed: number, hp: number, onDeath: () => void) {
    this.path = path;
    this.baseSpeed = speed;
    this.speed = speed;
    this.hp = hp;
    this.maxHp = hp;
    this.onDeath = onDeath;
    this.progress = 0;
    this.dead = false;
    this.circle.setActive(true).setVisible(true);
    this.hpBg.setActive(true).setVisible(true);
    this.hpBar.setActive(true).setVisible(true);
    this.statuses = [];
    this.updateHpBar();
  }

  private updateHpBar() {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.scaleX = ratio;
    let color = 0x16a34a;
    if (ratio < 0.3) color = 0xf87171;
    else if (ratio < 0.6) color = 0xfacc15;
    this.hpBar.setFillStyle(color);
  }

  reset() {
    this.circle.setActive(false).setVisible(false);
    this.hpBg.setActive(false).setVisible(false);
    this.hpBar.setActive(false).setVisible(false);
    this.dead = false;
    this.progress = 0;
    this.statuses = [];
    this.speed = this.baseSpeed;
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
    this.updateHpBar();
    if (this.hp <= 0) {
      this.dead = true;
      this.circle.setActive(false).setVisible(false);
      this.hpBg.setActive(false).setVisible(false);
      this.hpBar.setActive(false).setVisible(false);
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
    this.circle.setFillStyle(slow > 0 ? 0x60a5fa : 0x222222);
    this.hpBg.setPosition(this.circle.x, this.circle.y - 14);
    this.hpBar.setPosition(this.circle.x - 10, this.circle.y - 14);
  }
}

export class Projectile {
  circle: Phaser.GameObjects.Arc;
  dead = false;
  target!: Enemy;
  speed = PROJECTILE_SPEED;
  private stats!: TowerStats;
  private enemies: Enemy[] = [];
  private type = 'arrow';

  constructor(private scene: GameScene) {
    this.circle = scene.add.circle(0, 0, 3, 0xffffff).setActive(false).setVisible(false);
  }

  fire(target: Enemy, x: number, y: number, stats: TowerStats, enemies: Enemy[], type: string) {
    this.target = target;
    this.stats = stats;
    this.enemies = enemies;
    this.type = type;
    this.dead = false;
    const color = type === 'cannon' ? 0xb3a27c : type === 'frost' ? 0x76e4f7 : 0x6bc2ff;
    this.circle.setFillStyle(color);
    this.circle.setPosition(x, y).setActive(true).setVisible(true);
    if (type === 'cannon') sound.playShootCannon();
    else if (type === 'frost') sound.playShootFrost();
    else sound.playShootArrow();
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
  public body: Phaser.GameObjects.Graphics;
  public rangeCircle: Phaser.GameObjects.Arc;
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
    this.body = scene.add.graphics({ x, y });
    this.draw();
    this.rangeCircle = scene.add
      .circle(x, y, this.stats.range, 0xffffff, 0.1)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setVisible(false);
    const hit = new Phaser.Geom.Rectangle(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    this.body.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    this.body.on('pointerover', () => this.rangeCircle.setVisible(true));
    this.body.on('pointerout', () => this.rangeCircle.setVisible(false));
    this.body.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.scene.showTowerPanel(this);
    });
  }

  public draw() {
    const g = this.body;
    g.clear();
    if (this.type === 'cannon') {
      g.fillStyle(0xb3a27c, 1);
      g.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      g.fillCircle(0, -TILE_SIZE / 2, TILE_SIZE / 4);
      this.rangeCircle.setFillStyle(0xb3a27c, 0.1).setStrokeStyle(1, 0xb3a27c, 0.3);
    } else if (this.type === 'frost') {
      g.fillStyle(0x76e4f7, 1);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Phaser.Math.DegToRad(60 * i - 30);
        const px = Math.cos(angle) * (TILE_SIZE / 2);
        const py = Math.sin(angle) * (TILE_SIZE / 2);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      this.rangeCircle.setFillStyle(0x76e4f7, 0.1).setStrokeStyle(1, 0x76e4f7, 0.3);
    } else {
      g.fillStyle(0x6bc2ff, 1);
      g.beginPath();
      g.moveTo(0, -TILE_SIZE / 2);
      g.lineTo(TILE_SIZE / 2, TILE_SIZE / 2);
      g.lineTo(-TILE_SIZE / 2, TILE_SIZE / 2);
      g.closePath();
      g.fillPath();
      this.rangeCircle.setFillStyle(0x6bc2ff, 0.1).setStrokeStyle(1, 0x6bc2ff, 0.3);
    }
  }

  update(delta: number, enemies: Enemy[]) {
    this.lastShot += delta;
    if (this.lastShot < 1000 / this.stats.fireRate) return;
    const target = selectTarget(enemies, this.x, this.y, this.stats.range) as Enemy | undefined;
    if (target) {
      if (this.scene.game.loop.actualFps >= 50 || this.scene.projectiles.length < 100) {
        const p = this.scene.projectilePool.acquire();
        p.fire(target, this.x, this.y, this.stats, enemies, this.type);
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
  private towerPanel!: TowerPanel;
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
    this.towerPanel = new TowerPanel(this, {
      upgrade: (t) => this.upgradeTower(t as Tower),
      sell: (t) => this.sellTower(t as Tower),
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
          if (this.towerPanel.isOpen() && targets.length === 0) {
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
    this.activeTower = tower;
    this.towerPanel.openFor(tower);
  }

  private hidePanel() {
    this.towerPanel.close();
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
    tower.rangeCircle.setRadius(tower.stats.range);
    tower.draw();
    this.emitStats();
    sound.playPlace();
    this.towerPanel.openFor(tower);
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
    tower.body.destroy();
    tower.rangeCircle.destroy();
    this.towerPanel.close();
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
