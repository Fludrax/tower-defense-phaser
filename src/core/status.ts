export type StatusType = 'slow' | 'dot';

export interface Status {
  type: StatusType;
  value: number;
  remaining: number; // ms
}

export function addStatus(statuses: Status[], status: Status, maxStacks: number) {
  const same = statuses.filter((s) => s.type === status.type);
  if (same.length >= maxStacks) {
    const index = statuses.indexOf(same[0]);
    statuses.splice(index, 1);
  }
  statuses.push({ ...status });
}

export function updateStatuses(statuses: Status[], delta: number) {
  let slow = 0;
  let damage = 0;
  for (let i = statuses.length - 1; i >= 0; i--) {
    const s = statuses[i];
    s.remaining -= delta;
    if (s.type === 'slow') {
      slow += s.value;
    } else if (s.type === 'dot') {
      damage += (s.value * delta) / 1000;
    }
    if (s.remaining <= 0) statuses.splice(i, 1);
  }
  return { slow, damage };
}
