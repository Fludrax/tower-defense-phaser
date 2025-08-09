import { events } from '../core/events';

export class HUDController {
  private waveEl: HTMLElement;
  private livesEl: HTMLElement;
  private moneyEl: HTMLElement;
  private speedBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private settingsPanel: HTMLElement;
  private modal: HTMLElement;
  private speed = 1;
  private paused = false;

  constructor() {
    const root = document.getElementById('hud-root')!;
    const top = document.createElement('div');
    top.className = 'hud-top';
    top.innerHTML = `
      <div class="stat"><span class="label">Wave</span> <span id="hud-wave">0</span></div>
      <div class="stat"><span class="label">Lives</span> <span id="hud-lives">0</span></div>
      <div class="stat"><span class="label">Money</span> <span id="hud-money">0</span></div>
      <button id="hud-speed">x1</button>
      <button id="hud-pause">Pause</button>
      <button id="hud-settings">Settings</button>
    `;
    root.appendChild(top);

    this.waveEl = top.querySelector('#hud-wave')!;
    this.livesEl = top.querySelector('#hud-lives')!;
    this.moneyEl = top.querySelector('#hud-money')!;
    this.speedBtn = top.querySelector('#hud-speed') as HTMLButtonElement;
    this.pauseBtn = top.querySelector('#hud-pause') as HTMLButtonElement;
    const settingsBtn = top.querySelector('#hud-settings') as HTMLButtonElement;

    this.speedBtn.addEventListener('click', () => this.cycleSpeed());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    settingsBtn.addEventListener('click', () => this.toggleSettings());

    this.settingsPanel = document.createElement('div');
    this.settingsPanel.className = 'settings hidden';
    this.settingsPanel.innerHTML = `
      <label>Volume <input id="sfx-volume" type="range" min="0" max="100" value="100" /></label>
      <label><input id="toggle-contrast" type="checkbox" /> High Contrast</label>
      <label><input id="toggle-minimal" type="checkbox" /> Minimal FX</label>
      <button id="reset-save">Reset Save</button>
    `;
    root.appendChild(this.settingsPanel);

    const contrast = this.settingsPanel.querySelector('#toggle-contrast') as HTMLInputElement;
    contrast.addEventListener('change', () => {
      document.documentElement.classList.toggle('high-contrast', contrast.checked);
    });

    this.modal = document.createElement('div');
    this.modal.className = 'modal hidden';
    this.modal.innerHTML = `
      <div class="modal-content">
        <h2>Game Over</h2>
        <p id="gameover-info"></p>
        <button id="restart-btn">Restart</button>
      </div>
    `;
    root.appendChild(this.modal);

    const restart = this.modal.querySelector('#restart-btn') as HTMLButtonElement;
    restart.addEventListener('click', () => {
      this.hideModal();
      events.emit('restart');
    });

    events.on('waveChanged', (w: number) => (this.waveEl.textContent = w.toString()));
    events.on('livesChanged', (l: number) => (this.livesEl.textContent = l.toString()));
    events.on('moneyChanged', (m: number) => (this.moneyEl.textContent = m.toString()));
    events.on('speedChanged', (s: number) => {
      this.speed = s;
      this.speedBtn.textContent = `x${s}`;
    });
    events.on('gameOver', (data: { wave: number; money: number }) => {
      const info = this.modal.querySelector('#gameover-info')!;
      info.textContent = `Wave ${data.wave} - Money ${data.money}`;
      this.showModal();
    });
  }

  private cycleSpeed() {
    const next = this.speed === 1 ? 1.5 : this.speed === 1.5 ? 2 : 1;
    events.emit('setSpeed', next);
  }

  private togglePause() {
    this.paused = !this.paused;
    events.emit(this.paused ? 'pause' : 'resume');
    this.pauseBtn.textContent = this.paused ? 'Resume' : 'Pause';
  }

  private toggleSettings() {
    this.settingsPanel.classList.toggle('hidden');
  }

  private showModal() {
    this.modal.classList.remove('hidden');
  }

  private hideModal() {
    this.modal.classList.add('hidden');
  }
}
