import { describe, expect, it } from 'vitest';
import { addStatus, updateStatuses, Status } from './status';

describe('status system', () => {
  it('applies slow and dot correctly with timers', () => {
    const statuses: Status[] = [];
    addStatus(statuses, { type: 'slow', value: 0.3, remaining: 2000 }, 1);
    addStatus(statuses, { type: 'dot', value: 2, remaining: 1000 }, 3);
    let result = updateStatuses(statuses, 1000);
    expect(result.slow).toBeCloseTo(0.3);
    expect(result.damage).toBeCloseTo(2);
    result = updateStatuses(statuses, 1000);
    expect(result.slow).toBeCloseTo(0.3);
    expect(result.damage).toBeCloseTo(0);
    result = updateStatuses(statuses, 1000);
    expect(result.slow).toBeCloseTo(0);
  });
});
