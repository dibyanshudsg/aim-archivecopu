import {
  getPublicNavigationFromDb,
  getPublicCollectionSummary,
  listHomeShelfIssues,
  listHomeShelfYears,
  listLatestEmbargoedIssues,
  listMagazines,
  getPublicIssueById,
} from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import type { ShelfIssue } from '@/lib/home-shelf';
import { HomeClient } from './home-client';
import { readableCutoffIssueMonth } from '@/lib/embargo';
import { getHeroSchedule } from '@/lib/hero-issues';
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
}

/**
 * Feature the currently selected issue for each magazine. The schedule handles
 * the India-time release gate, persistent hides and optional manual selection.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const [magazines, schedule] = await Promise.all([
    listMagazines({ orderBy: 'created_at' }),
    getHeroSchedule(),
  ]);
  const ids = schedule.map((item) => item.live?.id).filter((id): id is string => Boolean(id));
  const issues = (await Promise.all(ids.map((id) => getPublicIssueById(id)))).filter((issue): issue is ApiIssue => issue !== null);
  return { magazines, issues };
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
      navigation={navigation}
      collection={collection}
    />
  );
}
