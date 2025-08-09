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
  osc.start();
  osc.stop(ctx.currentTime + dur / 1000);
}
