import { describe, it, expect } from 'vitest';
import { computeMask } from './mapUtils';
import { mapForest } from '../../assets/maps/map_forest';

describe('map buildable mask', () => {
  it('marks path tiles as unbuildable', () => {
    const raw = mapForest();
    const mask = computeMask(raw.path);
    expect(mask.has('0,10')).toBe(true);
    expect(mask.has('5,5')).toBe(false);
  });
});
