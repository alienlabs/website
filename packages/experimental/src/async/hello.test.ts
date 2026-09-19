import { describe, expect, it } from 'vitest';

const divide = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    throw new Error('Division by zero');
  }

  return numerator / denominator;
};

describe('divide', () => {
  it('should work', async () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(0, 2)).toBe(0);
  });

  it('should should throw', async () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
