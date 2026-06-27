import {
  listMagazines,
  listPublicIssuesForMonths,
  listRecentPublicIssues,
} from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { HomeClient } from './home-client';

export const revalidate = 60;

/** Latest 8 issues for the homepage bookshelf — excludes embargoed ones so
 *  the page-turn preview never points at a PDF the user can't actually open. */
async function fetchRecentIssues(): Promise<ApiIssue[]> {
  return listRecentPublicIssues(8, 32);
}

interface CarouselData {
  magazines: ApiMagazine[];
  issues: ApiIssue[];
  currentYear: number;
  currentMonth: number;
  prevYear: number;
  prevMonth: number;
}

/**
 * "Five Years Ago This Month" carousel data. Under the 5-year rolling embargo
 * the freshly-public edition each calendar month is the one dated (now.year -
 * 5, now.month) — its embargo lift date is the 1st of the current month.
 * Both the current calendar month's release and the immediately previous
 * month's release are fetched up-front so the in-component "Show Previous
 * Month" toggle is instant.
 *
 * Note: `currentYear` / `currentMonth` in `CarouselData` refer to the **issue
 * date** of the currently-featured release (5 years behind the wall clock),
 * not today's date. Renaming would ripple through `HomeClient` — kept for
 * now since the meaning is local to the carousel.
 *
 * Magazines ordered by `created_at` ASC so AIM (original) leads, Agnishikha
 * next, then future Tamil/Marathi/Bengali editions in the order they're added.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const now = new Date();
  const releaseMonth = now.getMonth() + 1; // 1-12 — calendar month *now*
  const currentYear = now.getFullYear() - 5; // issue year of this month's release
  const currentMonth = releaseMonth;
  const prevYear = releaseMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = releaseMonth === 1 ? 12 : releaseMonth - 1;

  const [magazines, issues] = await Promise.all([
    listMagazines({ orderBy: 'created_at' }),
    listPublicIssuesForMonths([
      { year: currentYear, month: currentMonth },
      { year: prevYear, month: prevMonth },
    ]),
  ]);

  return { magazines, issues, currentYear, currentMonth, prevYear, prevMonth };
}

export default async function HomePage() {
  const [recentIssues, carousel] = await Promise.all([
    fetchRecentIssues(),
    fetchCarouselData(),
  ]);

  return (
    <HomeClient
      recentIssues={recentIssues}
      carouselMagazines={carousel.magazines}
      carouselIssues={carousel.issues}
      carouselCurrentYear={carousel.currentYear}
      carouselCurrentMonth={carousel.currentMonth}
      carouselPrevYear={carousel.prevYear}
      carouselPrevMonth={carousel.prevMonth}
    />
  );
}
