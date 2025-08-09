export class SoundManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  private muted = false;
  private vol = 1;

  setMute(m: boolean) {
    this.muted = m;
  }
  isMuted() {
    return this.muted;
  }
  setVolume(v: number) {
    this.vol = v;
  }
  getVolume() {
    return this.vol;
  }

  private tone(freq: number, dur = 100) {
    if (this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = this.vol;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur / 1000);
  }

  playShoot() {
    this.tone(880, 80);
  }
  playHit() {
    this.tone(220, 80);
  }
  playExplosion() {
    this.tone(120, 200);
  }
  playPlace() {
    this.tone(660, 80);
  }
  playError() {
    this.tone(100, 150);
  }
  playUIClick() {
    this.tone(500, 50);
  }
  musicStart() {
    // TODO background music
  }
  musicStop() {}
}

export const sound = new SoundManager();
