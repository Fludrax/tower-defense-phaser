import { events } from '../core/events';
import { sound } from '../audio/SoundManager';

export class HUDController {
  private waveEl: HTMLElement;
  private livesEl: HTMLElement;
  private moneyEl: HTMLElement;
  private countdownEl: HTMLElement;
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
      <div class="stat countdown" id="hud-countdown"></div>
      <label class="stat">Map <select id="map-select"><option value="forest">Forest</option><option value="canyon">Canyon</option></select></label>
      <div class="speed-group" role="group">
        <button data-speed="1">x1</button>
        <button data-speed="1.5">x1.5</button>
        <button data-speed="2">x2</button>
      </div>
      <button id="hud-pause">Pause</button>
      <button id="hud-settings">Settings</button>
    `;
    root.appendChild(top);

    this.waveEl = top.querySelector('#hud-wave')!;
    this.livesEl = top.querySelector('#hud-lives')!;
    this.moneyEl = top.querySelector('#hud-money')!;
    this.countdownEl = top.querySelector('#hud-countdown')!;
    this.pauseBtn = top.querySelector('#hud-pause') as HTMLButtonElement;
    const settingsBtn = top.querySelector('#hud-settings') as HTMLButtonElement;
    const mapSelect = top.querySelector('#map-select') as HTMLSelectElement;
    const speedButtons = Array.from(
      top.querySelectorAll('.speed-group button'),
    ) as HTMLButtonElement[];

    speedButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        sound.playUIClick();
        const s = Number(btn.getAttribute('data-speed'));
        events.emit('setSpeed', s);
      }),
    );
    this.pauseBtn.addEventListener('click', () => {
      sound.playUIClick();
      this.togglePause();
    });
    settingsBtn.addEventListener('click', () => {
      sound.playUIClick();
      this.toggleSettings();
    });
    mapSelect.addEventListener('change', () => {
      // TODO: reload scene with selected map
    });

    this.settingsPanel = document.createElement('div');
    this.settingsPanel.className = 'settings hidden';
    this.settingsPanel.innerHTML = `
      <label>Volume <input id="sfx-volume" type="range" min="0" max="100" value="100" /></label>
      <label><input id="toggle-mute" type="checkbox" /> Mute</label>
      <label><input id="toggle-contrast" type="checkbox" /> High Contrast</label>
      <label><input id="toggle-minimal" type="checkbox" /> Minimal FX</label>
      <button id="reset-save">Reset Save</button>
    `;
    root.appendChild(this.settingsPanel);
    const volume = this.settingsPanel.querySelector('#sfx-volume') as HTMLInputElement;
    volume.addEventListener('input', () => sound.setVolume('sfx', Number(volume.value) / 100));
    const mute = this.settingsPanel.querySelector('#toggle-mute') as HTMLInputElement;
    mute.addEventListener('change', () => sound.setMute(mute.checked));
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
      sound.playUIClick();
      this.hideModal();
      events.emit('restart');
    });

    events.on('waveChanged', (w: number) => (this.waveEl.textContent = w.toString()));
    events.on('livesChanged', (l: number) => (this.livesEl.textContent = l.toString()));
    events.on('moneyChanged', (m: number) => (this.moneyEl.textContent = m.toString()));
    events.on('speedChanged', (s: number) => {
      this.speed = s;
      speedButtons.forEach((b) =>
        b.toggleAttribute('aria-pressed', Number(b.getAttribute('data-speed')) === s),
      );
    });
    events.on('waveCountdown', (n: number) => {
      this.countdownEl.textContent = n > 0 ? `Next wave in ${n}` : '';
    });
    events.on('gameOver', (data: { wave: number; money: number }) => {
      const info = this.modal.querySelector('#gameover-info')!;
      info.textContent = `Wave ${data.wave} - Money ${data.money}`;
      this.showModal();
    });
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
