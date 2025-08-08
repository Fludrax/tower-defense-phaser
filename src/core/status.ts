export type StatusType = 'slow' | 'dot';

interface BaseStatus {
  type: StatusType;
  remaining: number; // ms
}

interface SlowStatus extends BaseStatus {
  type: 'slow';
  pct: number; // 0-1
}

interface DotStatus extends BaseStatus {
  type: 'dot';
  dps: number; // damage per second
  accumulator: number;
}

export class StatusManager {
  private slow?: SlowStatus;
  private dot?: DotStatus;
  constructor(private onDamage: (amount: number) => void) {}

  applySlow(pct: number, duration: number) {
    if (!this.slow || pct > this.slow.pct || duration > this.slow.remaining) {
      this.slow = { type: 'slow', pct, remaining: duration };
    } else {
      this.slow.remaining = Math.max(this.slow.remaining, duration);
    }
  }

  applyDot(dps: number, duration: number) {
    if (!this.dot || dps > this.dot.dps || duration > this.dot.remaining) {
      this.dot = { type: 'dot', dps, remaining: duration, accumulator: 0 };
    } else {
      this.dot.remaining = Math.max(this.dot.remaining, duration);
    }
  }

  update(delta: number) {
    if (this.slow) {
      this.slow.remaining -= delta;
      if (this.slow.remaining <= 0) this.slow = undefined;
    }
    if (this.dot) {
      this.dot.remaining -= delta;
      this.dot.accumulator += (this.dot.dps * delta) / 1000;
      const dmg = Math.floor(this.dot.accumulator);
      if (dmg > 0) {
        this.onDamage(dmg);
        this.dot.accumulator -= dmg;
      }
      if (this.dot.remaining <= 0) this.dot = undefined;
    }
  }

  get speedMultiplier() {
    return this.slow ? 1 - this.slow.pct : 1;
  }

  get hasSlow() {
    return !!this.slow;
  }

  get hasDot() {
    return !!this.dot;
  }
}
