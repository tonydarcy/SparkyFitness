import type { AdaptiveTdeeResult } from '../schemas/api/AdaptiveTdee.api.zod.ts';

/** Within this many kcal a day, intake and expenditure count as balanced. */
export const ENERGY_BALANCE_MAINTENANCE_KCAL = 50;

export type EnergyBalanceDirection = 'deficit' | 'surplus' | 'maintenance';

export interface EnergyBalanceSummary {
  /** Estimated daily expenditure (TDEE), in kcal. */
  tdee: number;
  /** True when it is learned from logged intake against the weight trend. */
  adaptive: boolean;
  confidence: AdaptiveTdeeResult['confidence'];
  /** Average daily intake behind the estimate, or null when none was logged. */
  avgIntake: number | null;
  /** Average intake minus TDEE: negative is a deficit, positive a surplus. */
  dailyBalance: number | null;
  direction: EnergyBalanceDirection | null;
  /** Logged calorie days behind the average intake. */
  daysOfData: number;
}

/**
 * Dashboard view of the adaptive TDEE response: expenditure and the average
 * daily deficit or surplus against it. Fields an older server leaves out
 * read as unknown rather than zero.
 */
export function summarizeEnergyBalance(
  result: Pick<
    AdaptiveTdeeResult,
    'tdee' | 'isFallback' | 'confidence' | 'avgIntake' | 'daysOfData'
  >
): EnergyBalanceSummary | null {
  if (!Number.isFinite(result.tdee) || result.tdee <= 0) return null;
  const tdee = Math.round(result.tdee);
  const avgIntake =
    typeof result.avgIntake === 'number' &&
    Number.isFinite(result.avgIntake) &&
    result.avgIntake > 0
      ? Math.round(result.avgIntake)
      : null;
  const dailyBalance = avgIntake === null ? null : avgIntake - tdee;
  const direction: EnergyBalanceDirection | null =
    dailyBalance === null
      ? null
      : Math.abs(dailyBalance) <= ENERGY_BALANCE_MAINTENANCE_KCAL
        ? 'maintenance'
        : dailyBalance < 0
          ? 'deficit'
          : 'surplus';
  return {
    tdee,
    adaptive: !result.isFallback,
    confidence: result.confidence,
    avgIntake,
    dailyBalance,
    direction,
    daysOfData: Number.isFinite(result.daysOfData) ? result.daysOfData : 0,
  };
}
