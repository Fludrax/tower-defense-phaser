import Phaser from 'phaser';
import { calcPreview, type TowerLike } from './towerPanelPreview';
import type { TowerStats } from '../core/balance';
import { sound } from '../audio/SoundManager';

/* eslint-disable no-unused-vars */
type Hooks = { upgrade: (tower: TowerLike) => boolean; sell: (tower: TowerLike) => void };
/* eslint-enable no-unused-vars */

export class TowerPanel {
  private el: HTMLElement;
  private tower?: TowerLike;
  private scene: Phaser.Scene;
  private hooks: Hooks;
  constructor(scene: Phaser.Scene, hooks: Hooks) {
    this.scene = scene;
    this.hooks = hooks;
    const root = document.getElementById('hud-root')!;
    this.el = document.createElement('div');
    this.el.className = 'tower-panel hidden';
    this.el.innerHTML = `
      <div class="tp-name"></div>
      <table class="tp-stats">
        <tr><th></th><th>Now</th><th>Next</th></tr>
      </table>
      <div class="tp-actions">
        <button id="tp-up">Upgrade</button>
        <button id="tp-sell">Sell</button>
        <button id="tp-close">Close</button>
      </div>
    `;
    root.appendChild(this.el);
    const upBtn = this.el.querySelector('#tp-up') as HTMLButtonElement;
    upBtn.addEventListener('click', () => {
      if (!this.tower) return;
      const ok = this.hooks.upgrade(this.tower);
      sound.playUIClick();
      if (ok) this.openFor(this.tower);
      else {
        upBtn.classList.add('danger');
        setTimeout(() => upBtn.classList.remove('danger'), 300);
      }
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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
    root.addEventListener('pointerdown', (e) => {
      if (!this.tower) return;
      if (!this.el.contains(e.target as Node)) this.close();
    });

    const focusables = Array.from(this.el.querySelectorAll('button')) as HTMLElement[];
    this.el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  openFor(tower: TowerLike) {
    this.tower = tower;
    const { before, after, upgrade, refund } = calcPreview(tower);
    this.el.querySelector('.tp-name')!.textContent = `${tower.type} L${tower.level}`;
    const stats = this.el.querySelector('.tp-stats') as HTMLTableElement;
    const rows: [string, keyof TowerStats][] = [
      ['Damage', 'damage'],
      ['FireRate', 'fireRate'],
      ['Range', 'range'],
    ];
    stats.innerHTML = '<tr><th></th><th>Now</th><th>Next</th></tr>';
    for (const [label, key] of rows) {
      const curr = before[key]!;
      const next = after ? (after as TowerStats)[key]! : null;
      const inc = next !== null && next > curr ? '<span class="inc">↑</span>' : '';
      stats.innerHTML += `<tr><td>${label}</td><td>${curr}</td><td>${next ?? '-'}${inc}</td></tr>`;
    }
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
    const dpr = window.devicePixelRatio || 1;
    const screenX = (tower.x - cam.worldView.x) * dpr;
    const screenY = (tower.y - cam.worldView.y) * dpr;
    this.el.classList.remove('hidden');
    const rect = this.el.getBoundingClientRect();
    let x = screenX - rect.width / 2;
    let y = screenY - rect.height - 12;
    const maxX = cam.width * dpr - rect.width;
    const maxY = cam.height * dpr - rect.height;
    x = Phaser.Math.Clamp(x, 0, maxX);
    y = Phaser.Math.Clamp(y, 0, maxY);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.setProperty('--arrow-x', `${screenX - x}`);
    upBtn.focus();
  }

  close() {
    this.el.classList.add('hidden');
    this.tower = undefined;
  }

  isOpen() {
    return !this.el.classList.contains('hidden');
  }
}
