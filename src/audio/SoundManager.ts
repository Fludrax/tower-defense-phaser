import { playTone } from './synth';

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
  private play(freq: number, dur: number, type: OscillatorType = 'sine') {
    if (this.muted || !this.ctx) return;
    playTone(this.ctx, freq, dur, type, this.master * this.sfx);
  }
  playShootArrow() {
    this.play(880, 80, 'square');
  }
  playShootCannon() {
    this.play(200, 80, 'sine');
    this.play(80, 120, 'sawtooth');
  }
  playShootFrost() {
    this.play(660, 100, 'triangle');
  }
  playHit() {
    this.play(220, 80, 'square');
  }
  playExplosion() {
    this.play(120, 200, 'sawtooth');
  }
  playPlace() {
    this.play(500, 50, 'square');
  }
  playError() {
    this.play(100, 150, 'sawtooth');
  }
  playConfirm() {
    this.play(660, 80, 'triangle');
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
