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
export const EMBARGO_TIME_ZONE = 'Asia/Kolkata';
export const EMBARGO_TIME_ZONE_LABEL = 'IST';

const INDIA_OFFSET_MINUTES = 330;
const MS_PER_MINUTE = 60_000;

interface IssueMonth {
  year: number;
  month: MonthIndex;
}

function shiftIssueMonth(year: number, month: number, deltaMonths: number): IssueMonth {
  const zeroBased = month - 1 + deltaMonths;
  const normalizedMonth = ((zeroBased % 12) + 12) % 12;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: (normalizedMonth + 1) as MonthIndex,
  };
}

function monthInIndia(now: Date): IssueMonth {
  const indiaDate = new Date(now.getTime() + INDIA_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    year: indiaDate.getUTCFullYear(),
    month: (indiaDate.getUTCMonth() + 1) as MonthIndex,
  };
}

export function computeEmbargoLiftMonth(year: number, month: number): IssueMonth {
  return shiftIssueMonth(year, month, EMBARGO_MONTHS);
}

/**
 * First instant on which the issue's PDF becomes public: 00:00 Asia/Kolkata
 * on the 1st of the unlock month. This is one global moment for every visitor.
 */
export function computeEmbargoLiftDate(year: number, month: number): Date {
  const lift = computeEmbargoLiftMonth(year, month);
  const utcMidnight = Date.UTC(lift.year, lift.month - 1, 1);
  return new Date(utcMidnight - INDIA_OFFSET_MINUTES * MS_PER_MINUTE);
}

export function isEmbargoed(year: number, month: number, now: Date = new Date()): boolean {
  return now < computeEmbargoLiftDate(year, month);
}

/** Display label for when the PDF becomes public — full month name to match
 *  the project's title convention. Example: "May 2031". */
export function embargoLiftLabel(year: number, month: number): string {
  const lift = computeEmbargoLiftMonth(year, month);
  return `${MONTH_NAMES[lift.month]} ${lift.year}`;
}

export function embargoLiftIso(year: number, month: number): string {
  return computeEmbargoLiftDate(year, month).toISOString();
}

export function readableCutoffIssueMonth(now: Date = new Date()): IssueMonth {
  const current = monthInIndia(now);
  return shiftIssueMonth(current.year, current.month, -EMBARGO_MONTHS);
}

export interface EmbargoState {
  isEmbargoed: boolean;
  embargoLiftLabel: string | null;
  embargoLiftAt: string | null;
}

export function getEmbargoState(
  year: number,
  month: number,
  now: Date = new Date(),
): EmbargoState {
  if (!isEmbargoed(year, month, now)) {
    return { isEmbargoed: false, embargoLiftLabel: null, embargoLiftAt: null };
  }
  return {
    isEmbargoed: true,
    embargoLiftLabel: embargoLiftLabel(year, month),
    embargoLiftAt: embargoLiftIso(year, month),
  };
}

/** Server-side: decorate a raw issue row from the database with embargo state and
 *  strip the PDF URL when embargoed. The DB column is non-null, but the public
 *  API never leaks it for embargoed issues — that's the whole point. */
export function applyEmbargoToIssueRow<
  T extends { year: number; month: number; pdf_url: string | null },
>(
  row: T,
  now: Date = new Date(),
): T & {
  is_embargoed: boolean;
  embargo_lift_label: string | null;
  embargo_lift_at: string | null;
  server_now: string;
} {
  const state = getEmbargoState(row.year, row.month, now);
  return {
    ...row,
    pdf_url: state.isEmbargoed ? null : row.pdf_url,
    is_embargoed: state.isEmbargoed,
    embargo_lift_label: state.embargoLiftLabel,
    embargo_lift_at: state.embargoLiftAt,
    server_now: now.toISOString(),
  };
}
