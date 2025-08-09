import { setMode, cancelMode, InputMode } from '../core/inputMode';
import { TOWERS, TowerConfig } from '../core/balance';
import { sound } from '../audio/SoundManager';
import { events } from '../core/events';
import { ArrowIcon, CannonIcon, FrostIcon } from './icons';

export class SidebarController {
  constructor() {
    const root = document.getElementById('tool-sidebar');
    if (!root) return;
    root.innerHTML = `
      <div class="section build">
        ${this.card('arrow', 'Arrow', ArrowIcon)}
        ${this.card('cannon', 'Cannon', CannonIcon)}
        ${this.card('frost', 'Frost', FrostIcon)}
      </div>
      <div class="section modes">
        <button data-mode="upgrade">Upgrade</button>
        <button data-mode="sell">Sell</button>
      </div>
    `;
    const buttons = Array.from(root.querySelectorAll('button[data-mode]')) as HTMLButtonElement[];
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        sound.playUIClick();
        const mode = btn.getAttribute('data-mode') as InputMode;
        setMode(mode);
        if (window.innerWidth <= 700) root.classList.remove('open');
      }),
    );
    events.on('modeChanged', (m: string) => {
      buttons.forEach((b) => b.toggleAttribute('aria-pressed', b.getAttribute('data-mode') === m));
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') setMode('build:arrow');
      else if (e.key === '2') setMode('build:cannon');
      else if (e.key === '3') setMode('build:frost');
      else if (e.key.toLowerCase() === 'u') setMode('upgrade');
      else if (e.key.toLowerCase() === 'v') setMode('sell');
      else if (e.key === 'Escape') cancelMode();
    });

    const toggle = document.createElement('button');
    toggle.id = 'sidebar-toggle';
    toggle.setAttribute('aria-label', 'Toggle build menu');
    toggle.textContent = '🛠';
    toggle.addEventListener('click', () => {
      root.classList.toggle('open');
    });
    document.body.appendChild(toggle);
  }

  private card(type: keyof typeof TOWERS, name: string, icon: string) {
    const cfg: TowerConfig = TOWERS[type];
    const stats = cfg.levels[0];
    const dps = (stats.damage * stats.fireRate).toFixed(1);
    const effect = stats.aoeRadius
      ? 'AoE'
      : stats.slowPct
        ? `Slow ${Math.round(stats.slowPct * 100)}%`
        : 'Single';
    return `
      <button class="tower-card" data-mode="build:${type}">
        ${icon}
        <div class="info">
          <div class="title"><span>${name}</span><span>$${cfg.cost}</span></div>
          <ul class="stats">
            <li>DPS ${dps}</li>
            <li>Range ${stats.range}</li>
            <li>${effect}</li>
          </ul>
        </div>
      </button>
    `;
  }
}
