import Phaser from 'phaser';
import { TOWERS, type TowerStats } from '../core/balance';
import { upgradeCost, sellRefund } from '../core/economy';
import { sound } from '../audio/SoundManager';

export interface TowerLike {
  x: number;
  y: number;
  type: string;
  level: number;
  stats: TowerStats;
}

export function calcPreview(tower: TowerLike) {
  const cfg = TOWERS[tower.type];
  const before = cfg.levels[tower.level - 1];
  const after = cfg.levels[tower.level] ?? null;
  const upgrade = tower.level < cfg.levels.length ? upgradeCost(cfg.cost, tower.level) : 0;
  const refund = sellRefund(cfg.cost, tower.level);
  return { before, after, upgrade, refund };
}

export class TowerPanel {
  private el: HTMLElement;
  private tower?: TowerLike;
  constructor(
    private scene: Phaser.Scene,
    private hooks: { upgrade(t: TowerLike): void; sell(t: TowerLike): void },
  ) {
    const root = document.getElementById('hud-root')!;
    this.el = document.createElement('div');
    this.el.className = 'tower-panel hidden';
    this.el.innerHTML = `
      <div class="tp-name"></div>
      <div class="tp-stats"></div>
      <div class="tp-actions">
        <button id="tp-up">Upgrade</button>
        <button id="tp-sell">Sell</button>
        <button id="tp-close">Close</button>
      </div>
    `;
    root.appendChild(this.el);
    this.el.querySelector('#tp-up')!.addEventListener('click', () => {
      if (!this.tower) return;
      this.hooks.upgrade(this.tower);
      sound.playUIClick();
      this.openFor(this.tower);
    });
    this.el.querySelector('#tp-sell')!.addEventListener('click', () => {
      if (!this.tower) return;
      this.hooks.sell(this.tower);
      sound.playUIClick();
      this.close();
    });
    this.el.querySelector('#tp-close')!.addEventListener('click', () => {
      sound.playUIClick();
      this.close();
    });
  }

  openFor(tower: TowerLike) {
    this.tower = tower;
    const { before, after, upgrade, refund } = calcPreview(tower);
    this.el.querySelector('.tp-name')!.textContent = `${tower.type} L${tower.level}`;
    const stats = this.el.querySelector('.tp-stats')!;
    stats.innerHTML = `
      <div>Damage ${before.damage} → ${after?.damage ?? before.damage}</div>
      <div>FireRate ${before.fireRate} → ${after?.fireRate ?? before.fireRate}</div>
      <div>Range ${before.range} → ${after?.range ?? before.range}</div>
    `;
    const upBtn = this.el.querySelector('#tp-up') as HTMLButtonElement;
    if (upgrade === 0) {
      upBtn.disabled = true;
      upBtn.textContent = 'Max';
    } else {
      upBtn.disabled = false;
      upBtn.textContent = `Upgrade ($${upgrade})`;
    }
    const sellBtn = this.el.querySelector('#tp-sell') as HTMLButtonElement;
    sellBtn.textContent = `Sell ($${refund})`;
    const cam = this.scene.cameras.main;
    const screenX = tower.x - cam.worldView.x;
    const screenY = tower.y - cam.worldView.y;
    this.el.style.left = `${Math.min(screenX + 10, cam.width - 150)}px`;
    this.el.style.top = `${Math.min(screenY - 10, cam.height - 100)}px`;
    this.el.classList.remove('hidden');
    (this.el.querySelector('#tp-up') as HTMLButtonElement).focus();
  }

  close() {
    this.el.classList.add('hidden');
    this.tower = undefined;
  }

  isOpen() {
    return !this.el.classList.contains('hidden');
  }
}
