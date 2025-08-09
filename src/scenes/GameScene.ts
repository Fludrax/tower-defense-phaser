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
import { selectTarget, Targetable } from '../core/targeting';
import { ObjectPool } from '../core/pool';
import {
  GridCell,
  GridMap,
  createGridMap,
  gridToWorld,
  worldToGrid,
  computeGrid,
} from '../systems/map';
import { PlacementController } from '../systems/actions';
import { addStatus, updateStatuses, Status } from '../core/status';
import { upgradeCost, sellRefund } from '../core/economy';
import { sound } from '../audio/SoundManager';
import { getMode, cancelMode } from '../core/inputMode';
import { TowerPanel } from '../ui/TowerPanel';

export class Enemy implements Targetable {
  circle: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  dead = false;
  speed = 0;
  baseSpeed = 0;
  hp = 0;
  maxHp = 0;
  onDeath!: () => void;
  progress = 0;
  private statuses: Status[] = [];
  private path: GridCell[] = [];
  private positions: { x: number; y: number }[] = [];
  private segment = 0;
  private segProgress = 0;

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

  spawn(
    path: GridCell[],
    grid: { tileSize: number; offsetX: number; offsetY: number },
    speed: number,
    hp: number,
    onDeath: () => void,
  ) {
    this.path = path;
    this.positions = path.map((c) => gridToWorld(c, grid));
    this.segment = 0;
    this.segProgress = 0;
    this.baseSpeed = speed;
    this.speed = speed;
    this.hp = hp;
    this.maxHp = hp;
    this.onDeath = onDeath;
    this.dead = false;
    this.progress = 0;
    this.circle
      .setActive(true)
      .setVisible(true)
      .setPosition(this.positions[0].x, this.positions[0].y);
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
    this.statuses = [];
    this.speed = this.baseSpeed;
    this.progress = 0;
    this.segment = 0;
    this.segProgress = 0;
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
    let remaining = this.speed * delta;
    while (remaining > 0 && this.segment < this.positions.length - 1) {
      const curr = this.positions[this.segment];
      const next = this.positions[this.segment + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      const dist = segLen * (1 - this.segProgress);
      if (remaining < dist) {
        this.segProgress += remaining / segLen;
        remaining = 0;
      } else {
        remaining -= dist;
        this.segment += 1;
        this.segProgress = 0;
        if (this.segment >= this.positions.length - 1) {
          this.dead = true;
          this.circle.setActive(false).setVisible(false);
          this.hpBg.setActive(false).setVisible(false);
          this.hpBar.setActive(false).setVisible(false);
          return true;
        }
      }
    }
    const curr = this.positions[this.segment];
    const next = this.positions[Math.min(this.segment + 1, this.positions.length - 1)];
    const x = curr.x + (next.x - curr.x) * this.segProgress;
    const y = curr.y + (next.y - curr.y) * this.segProgress;
    this.circle.setPosition(x, y);
    this.hpBg.setPosition(x, y - 14);
    this.hpBar.setPosition(x - 10, y - 14);
    this.progress = (this.segment + this.segProgress) / (this.positions.length - 1);
    return false;
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
    const move = this.speed * delta;
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
  private cooldown = 0;
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
    this.body.setData('tower', this);
    this.body.on('pointerover', () => this.rangeCircle.setVisible(true));
    this.body.on('pointerout', () => this.rangeCircle.setVisible(false));
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
    this.cooldown -= delta;
    if (this.cooldown > 0) return;
    const target = selectTarget(enemies, this.x, this.y, this.stats.range) as Enemy | undefined;
    if (target) {
      if (this.scene.game.loop.actualFps >= 50 || this.scene.projectiles.length < 100) {
        const p = this.scene.projectilePool.acquire();
        p.fire(target, this.x, this.y, this.stats, enemies, this.type);
        this.scene.projectiles.push(p);
      }
      this.cooldown = 1 / this.stats.fireRate;
    }
  }
}

export class GameScene extends Phaser.Scene {
  private wave = 0;
  private lives = STARTING_LIVES;
  private money = STARTING_MONEY;
  private map!: GridMap;
  private placement!: PlacementController;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private towerGroup!: Phaser.GameObjects.Group;
  public projectiles: Projectile[] = [];
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

  private spendMoney(cost: number) {
    if (this.money < cost) return false;
    this.money -= cost;
    this.emitStats();
    return true;
  }

  private gainKillReward() {
    this.money += ENEMY_REWARD;
    this.emitStats();
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
    this.towerGroup = this.add.group();
    this.projectiles = [];
    this.input.enabled = true;
    this.input.mouse?.disableContextMenu();
    const gridCfg = computeGrid(this.scale.width, this.scale.height);
    this.map = createGridMap(this, gridCfg);
    this.placement = new PlacementController(this.map);
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
      const { x: col, y: row } = worldToGrid(pointer.x, pointer.y, this.map.grid);
      const x = this.map.grid.offsetX + col * TILE_SIZE + TILE_SIZE / 2;
      const y = this.map.grid.offsetY + row * TILE_SIZE + TILE_SIZE / 2;
      if (mode.startsWith('build:')) {
        const type = mode.split(':')[1] as keyof typeof TOWERS;
        const cfg = TOWERS[type];
        this.previewRange.setRadius(cfg.levels[0].range);
        const valid = this.placement.canPlace({ x: col, y: row }) && this.money >= cfg.cost;
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
        const { x: col, y: row } = worldToGrid(pointer.x, pointer.y, this.map.grid);
        if (mode.startsWith('build:')) {
          const type = mode.split(':')[1] as keyof typeof TOWERS;
          const cfg = TOWERS[type];
          if (!this.placement.canPlace({ x: col, y: row }) || !this.spendMoney(cfg.cost)) {
            sound.playError();
            return;
          }
          const x = this.map.grid.offsetX + col * TILE_SIZE + TILE_SIZE / 2;
          const y = this.map.grid.offsetY + row * TILE_SIZE + TILE_SIZE / 2;
          const tower = new Tower(this, x, y, type);
          this.towers.push(tower);
          this.towerGroup.add(tower.body);
          this.placement.place({ x: col, y: row });
          sound.playPlace();
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
          const obj = targets.find((t) => this.towerGroup.contains(t));
          if (obj) {
            const tower = obj.getData('tower') as Tower;
            this.showTowerPanel(tower);
          } else if (this.towerPanel.isOpen()) {
            this.hidePanel();
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
    this.scale.on('resize', () => this.scene.restart());
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isGameOver) return;
    const start = performance.now();
    const dt = (delta / 1000) * this.speedMultiplier;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const reached = enemy.update(dt);
      if (reached) {
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

  private upgradeTower(tower: Tower): boolean {
    const cfg = TOWERS[tower.type];
    if (tower.level >= cfg.levels.length) return false;
    const cost = upgradeCost(cfg.cost, tower.level);
    if (!this.spendMoney(cost)) {
      sound.playError();
      return false;
    }
    tower.level += 1;
    tower.stats = cfg.levels[tower.level - 1];
    tower.rangeCircle.setRadius(tower.stats.range);
    tower.draw();
    sound.playConfirm();
    return true;
  }

  private sellTower(tower: Tower) {
    const cfg = TOWERS[tower.type];
    const refund = sellRefund(cfg.cost, tower.level);
    this.money += refund;
    const col = Math.floor((tower.x - this.map.grid.offsetX) / TILE_SIZE);
    const row = Math.floor((tower.y - this.map.grid.offsetY) / TILE_SIZE);
    this.placement.remove({ x: col, y: row });
    const idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);
    this.towerGroup.remove(tower.body, true, true);
    tower.rangeCircle.destroy();
    this.towerPanel.close();
    this.emitStats();
    sound.playCash();
  }

  private getTower(col: number, row: number) {
    return this.towers.find(
      (t) =>
        Math.floor((t.x - this.map.grid.offsetX) / TILE_SIZE) === col &&
        Math.floor((t.y - this.map.grid.offsetY) / TILE_SIZE) === row,
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
      enemy.spawn(this.map.path, this.map.grid, speed, hp, () => {
        this.gainKillReward();
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
}
