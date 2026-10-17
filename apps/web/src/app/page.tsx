import {
  getPublicNavigationFromDb,
  getPublicCollectionSummary,
  listHomeShelfIssues,
  listHomeShelfYears,
  listLatestEmbargoedIssues,
  listMagazines,
  listPublicIssuesForMonths,
  getNewestReadableIssueMonth,
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
 * Feature the newest publicly readable issue, even if no edition became
 * readable this calendar month. Load its adjacent previous issue month for
 * the manual selector. Magazine order keeps AIM first when dates tie.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const cutoff = readableCutoffIssueMonth();
  const latest = await getNewestReadableIssueMonth();
  const currentYear = latest?.year ?? cutoff.year;
  const currentMonth = latest?.month ?? cutoff.month;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

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
