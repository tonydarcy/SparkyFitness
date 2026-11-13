/**
 * How far a day's macro intake is from its goal, for the glanceable macro
 * bars in the web and mobile Diary summaries. The Dashboard keeps the
 * detailed view; this only answers "is it way off?".
 */
export type MacroGoalStatus = 'noGoal' | 'onTrack' | 'low' | 'high';

/** Below this share of the goal, a finished day is flagged as low. */
export const MACRO_LOW_RATIO = 0.8;
/** Above this share of the goal, any day is flagged as high. */
export const MACRO_HIGH_RATIO = 1.2;

/**
 * `dayIsOver` is true for a day before today: an unfinished day is still
 * filling up, so it is never called low, only high once it passes the goal
 * by a wide margin.
 */
export function macroGoalStatus(
  consumed: number,
  goal: number | null | undefined,
  dayIsOver: boolean
): MacroGoalStatus {
  if (!goal || goal <= 0 || !Number.isFinite(goal)) return 'noGoal';
  const ratio = (Number.isFinite(consumed) ? consumed : 0) / goal;
  if (ratio > MACRO_HIGH_RATIO) return 'high';
  if (dayIsOver && ratio < MACRO_LOW_RATIO) return 'low';
  return 'onTrack';
}

/** Share of the goal reached, clamped to 0..1 for a progress bar width. */
export function macroGoalFill(
  consumed: number,
  goal: number | null | undefined
): number {
  if (!goal || goal <= 0 || !Number.isFinite(consumed)) return 0;
  return Math.min(Math.max(consumed / goal, 0), 1);
}
