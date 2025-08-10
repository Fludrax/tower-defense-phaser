import { playTone, playNoise } from './synth';

export class SoundManager {
  private ctx: AudioContext | null =
    typeof window !== 'undefined'
      ? new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      : null;
  private muted = false;
  private master = 1;
  private sfx = 1;

  setMute(m: boolean) {
    this.muted = m;
  }
  isMuted() {
    return this.muted;
  }
  setVolume(kind: 'master' | 'sfx', v: number) {
    if (kind === 'master') this.master = v;
    else this.sfx = v;
  }
  getVolume() {
    return { master: this.master, sfx: this.sfx };
  }
  private play(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3) {
    if (this.muted || !this.ctx) return;
    playTone(this.ctx, freq, dur, type, this.master * this.sfx * vol);
  }
  private noise(dur: number, vol = 0.3) {
    if (this.muted || !this.ctx) return;
    playNoise(this.ctx, dur, this.master * this.sfx * vol);
  }
  playShootArrow() {
    // high pitched plink
    this.play(1200, 60, 'square');
  }
  playShootCannon() {
    // short thud then booming low note
    this.play(160, 80, 'sine');
    this.play(80, 260, 'sawtooth');
  }
  playShootFrost() {
    // crystalline tink with a subtle whoosh
    this.play(1000, 80, 'triangle');
    this.noise(200, 0.15);
  }
  playHit() {
    this.play(300, 80, 'square');
  }
  playExplosion() {
    this.noise(300, 0.4);
    this.play(100, 300, 'sawtooth', 0.4);
  }
  playPlace() {
    this.play(600, 50, 'square');
  }
  playError() {
    this.play(90, 200, 'sawtooth');
  }
  playConfirm() {
    this.play(700, 100, 'triangle');
  }
  playCash() {
    this.play(440, 120, 'square');
  }
  playUIClick() {
    this.play(500, 50, 'square');
  }
  musicStart() {}
  musicStop() {}
}

export const sound = new SoundManager();
