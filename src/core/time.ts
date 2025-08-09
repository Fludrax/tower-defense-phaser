export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(ms: number, pct: number) {
  const j = ms * pct;
  return ms + (Math.random() * 2 - 1) * j;
}
