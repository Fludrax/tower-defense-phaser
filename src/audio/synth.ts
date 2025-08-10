export function playTone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  volume = 1,
  fade = 0.07,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const end = now + dur / 1000;
  const fadeStart = Math.max(now, end - fade);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.setValueAtTime(volume, fadeStart);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.start(now);
  osc.stop(end);
}

export function playNoise(ctx: AudioContext, dur: number, volume = 1, fade = 0.07) {
  const bufferSize = ctx.sampleRate * (dur / 1000);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  noise.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const end = now + dur / 1000;
  const fadeStart = Math.max(now, end - fade);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.setValueAtTime(volume, fadeStart);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  noise.start(now);
  noise.stop(end);
}
