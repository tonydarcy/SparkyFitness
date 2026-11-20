import { describe, expect, it } from 'vitest';
import { summarizeEnergyBalance } from '@workspace/shared';

const base = { confidence: 'MEDIUM' as const, daysOfData: 21 };

describe('summarizeEnergyBalance', () => {
  it('reports a deficit as intake below expenditure', () => {
    expect(
      summarizeEnergyBalance({
        ...base,
        tdee: 2500,
        isFallback: false,
        avgIntake: 2000,
      })
    ).toEqual({
      tdee: 2500,
      adaptive: true,
      confidence: 'MEDIUM',
      avgIntake: 2000,
      dailyBalance: -500,
      direction: 'deficit',
      daysOfData: 21,
    });
  });

  it('reports a surplus and treats a small gap as maintenance', () => {
    expect(
      summarizeEnergyBalance({
        ...base,
        tdee: 2000,
        isFallback: true,
        avgIntake: 2300,
      })?.direction
    ).toBe('surplus');
    expect(
      summarizeEnergyBalance({
        ...base,
        tdee: 2000,
        isFallback: false,
        avgIntake: 2040,
      })?.direction
    ).toBe('maintenance');
  });

  it('leaves the balance unknown when an older server sends no intake', () => {
    const summary = summarizeEnergyBalance({
      ...base,
      tdee: 2200,
      isFallback: true,
    });
    expect(summary?.avgIntake).toBeNull();
    expect(summary?.dailyBalance).toBeNull();
    expect(summary?.direction).toBeNull();
    expect(summary?.adaptive).toBe(false);
  });

  it('returns null without a usable expenditure', () => {
    expect(
      summarizeEnergyBalance({ ...base, tdee: 0, isFallback: true })
    ).toBeNull();
  });
});
