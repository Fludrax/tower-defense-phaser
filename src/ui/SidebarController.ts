import { setMode, cancelMode, InputMode } from '../core/inputMode';
import { TOWERS } from '../core/balance';
import { sound } from '../audio/SoundManager';
import { events } from '../core/events';
import { ArrowIcon, CannonIcon, FrostIcon } from './icons';

export class SidebarController {
  constructor() {
    const root = document.getElementById('tool-sidebar');
    if (!root) return;
    root.innerHTML = `
      <div class="section build">
        <button data-mode="build:arrow">${ArrowIcon}<span>Arrow $${TOWERS.arrow.cost}</span></button>
        <button data-mode="build:cannon">${CannonIcon}<span>Cannon $${TOWERS.cannon.cost}</span></button>
        <button data-mode="build:frost">${FrostIcon}<span>Frost $${TOWERS.frost.cost}</span></button>
      </div>
      <div class="section modes">
        <button data-mode="upgrade">Upgrade</button>
        <button data-mode="sell">Sell</button>
      </div>
    `;
    const buttons = Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        sound.playUIClick();
        const mode = btn.getAttribute('data-mode') as InputMode;
        setMode(mode);
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
  }
}
