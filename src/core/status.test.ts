import { describe, expect, it } from 'vitest';
import { addStatus, updateStatuses, Status } from './status';

describe('status system', () => {
  it('applies slow and dot correctly with timers', () => {
    const statuses: Status[] = [];
    addStatus(statuses, { type: 'slow', value: 0.3, remaining: 2 }, 1);
    addStatus(statuses, { type: 'dot', value: 2, remaining: 1 }, 3);
    let result = updateStatuses(statuses, 1);
    expect(result.slow).toBeCloseTo(0.3);
    expect(result.damage).toBeCloseTo(2);
    result = updateStatuses(statuses, 1);
    expect(result.slow).toBeCloseTo(0.3);
    expect(result.damage).toBeCloseTo(0);
    result = updateStatuses(statuses, 1);
    expect(result.slow).toBeCloseTo(0);
  });

  it('frost slow expires', () => {
    const statuses: Status[] = [];
    addStatus(statuses, { type: 'slow', value: 0.5, remaining: 1 }, 1);
    let result = updateStatuses(statuses, 0.5);
    expect(result.slow).toBeCloseTo(0.5);
    result = updateStatuses(statuses, 0.6);
    result = updateStatuses(statuses, 0);
    expect(result.slow).toBeCloseTo(0);
  });
});
