import {
  getPublicNavigationFromDb,
  getPublicCollectionSummary,
  listHomeShelfIssues,
  listHomeShelfYears,
  listLatestEmbargoedIssues,
  listMagazines,
  listPublicIssuesForMonths,
} from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import type { ShelfIssue } from '@/lib/home-shelf';
import { HomeClient } from './home-client';
import { readableCutoffIssueMonth } from '@/lib/embargo';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

/** Readable shelf; restricted editions have their own section. */
const fetchShelfIssues = unstable_cache(async (_window: string): Promise<{ issues: ShelfIssue[]; years: Awaited<ReturnType<typeof listHomeShelfYears>> }> => {
  void _window; // Included in Next's persistent cache key at embargo rollover.
  const years = await listHomeShelfYears();
  const year = years.at(-1)?.year;
  return { years, issues: year === undefined ? [] : await listHomeShelfIssues(240, year) };
}, ['home-shelf'], { revalidate: 30, tags: ['public-archive'] });

const fetchCollectionSummary = unstable_cache(async (_window: string) => { void _window; return getPublicCollectionSummary(); },
  ['home-collection'], { revalidate: 30, tags: ['public-archive'] });

async function fetchLatestSubscriberEditions(): Promise<ApiIssue[]> {
  return listLatestEmbargoedIssues(4, 32);
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
  const cutoff = readableCutoffIssueMonth();
  const releaseMonth = cutoff.month;
  const currentYear = cutoff.year;
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
  const cutoff = readableCutoffIssueMonth();
  const windowKey = `${cutoff.year}-${cutoff.month}`;
  const [recentIssues, latestSubscriberEditions, carousel, navigation, collection] = await Promise.all([
    fetchShelfIssues(windowKey),
    fetchLatestSubscriberEditions(),
    fetchCarouselData(),
    getPublicNavigationFromDb(),
    fetchCollectionSummary(windowKey),
  ]);

  return (
    <HomeClient
      recentIssues={recentIssues.issues}
      shelfYears={recentIssues.years}
      latestSubscriberEditions={latestSubscriberEditions}
      carouselMagazines={carousel.magazines}
      carouselIssues={carousel.issues}
      carouselCurrentYear={carousel.currentYear}
      carouselCurrentMonth={carousel.currentMonth}
      carouselPrevYear={carousel.prevYear}
      carouselPrevMonth={carousel.prevMonth}
      navigation={navigation}
      collection={collection}
    />
  );
}
