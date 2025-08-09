export function playTone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  volume = 1,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur / 1000);
  osc.start(now);
  osc.stop(now + dur / 1000);
}
