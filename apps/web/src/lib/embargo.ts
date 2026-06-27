import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';

/**
 * 5-year rolling PDF embargo. An issue dated (year, month) becomes publicly
 * readable on the 1st of the month exactly `EMBARGO_MONTHS` later. Before
 * that, the public archive shows its cover / theme / topics but the PDF
 * itself is withheld so paying print subscribers keep their head start.
 * Applies equally to every language edition. See project memory:
 * "5-Year Rolling Embargo Policy".
 */
export const EMBARGO_MONTHS = 60;

/** First date on which the issue's PDF becomes public (00:00 local). */
export function computeEmbargoLiftDate(year: number, month: number): Date {
  const liftYear = year + Math.floor((month - 1 + EMBARGO_MONTHS) / 12);
  const liftMonthIdx0 = (month - 1 + EMBARGO_MONTHS) % 12;
  return new Date(liftYear, liftMonthIdx0, 1);
}

export function isEmbargoed(year: number, month: number, now: Date = new Date()): boolean {
  return now < computeEmbargoLiftDate(year, month);
}

/** Display label for when the PDF becomes public — full month name to match
 *  the project's title convention. Example: "May 2031". */
export function embargoLiftLabel(year: number, month: number): string {
  const lift = computeEmbargoLiftDate(year, month);
  const monthIdx = ((lift.getMonth() + 1) as MonthIndex);
  return `${MONTH_NAMES[monthIdx]} ${lift.getFullYear()}`;
}

export interface EmbargoState {
  isEmbargoed: boolean;
  embargoLiftLabel: string | null;
}

export function getEmbargoState(
  year: number,
  month: number,
  now: Date = new Date(),
): EmbargoState {
  if (!isEmbargoed(year, month, now)) {
    return { isEmbargoed: false, embargoLiftLabel: null };
  }
  return { isEmbargoed: true, embargoLiftLabel: embargoLiftLabel(year, month) };
}

/** Server-side: decorate a raw issue row from Supabase with embargo state and
 *  strip the PDF URL when embargoed. The DB column is non-null, but the public
 *  API never leaks it for embargoed issues — that's the whole point. */
export function applyEmbargoToIssueRow<
  T extends { year: number; month: number; pdf_url: string | null },
>(row: T, now: Date = new Date()): T & { is_embargoed: boolean; embargo_lift_label: string | null } {
  const state = getEmbargoState(row.year, row.month, now);
  return {
    ...row,
    pdf_url: state.isEmbargoed ? null : row.pdf_url,
    is_embargoed: state.isEmbargoed,
    embargo_lift_label: state.embargoLiftLabel,
  };
}
