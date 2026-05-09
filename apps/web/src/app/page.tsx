import { createPublicClient } from '@/lib/supabase-server';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { HomeClient } from './home-client';

export const revalidate = 60;

async function fetchRecentIssues(): Promise<ApiIssue[]> {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []) as ApiIssue[];
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
 * Issues from the current calendar month + the immediately previous calendar
 * month — feeds the "This Month's Editions" carousel. Both windows fetched
 * up-front so the in-component "Show Previous Month's Editions" toggle is
 * instant (no spinner on toggle).
 *
 * Magazines ordered by `created_at` ASC so AIM (original) leads, Agnishikha
 * next, then future Tamil/Marathi/Bengali editions in the order they're added.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const supabase = createPublicClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JS 0-11 → DB 1-12
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  const [{ data: magazinesRaw }, currentRes, prevRes] = await Promise.all([
    supabase.from('magazines').select('*').order('created_at', { ascending: true }),
    supabase
      .from('issues')
      .select('*, magazines!inner(id, name, language, description, cover_image_url)')
      .eq('is_published', true)
      .eq('year', currentYear)
      .eq('month', currentMonth),
    supabase
      .from('issues')
      .select('*, magazines!inner(id, name, language, description, cover_image_url)')
      .eq('is_published', true)
      .eq('year', prevYear)
      .eq('month', prevMonth),
  ]);

  const magazines = (magazinesRaw ?? []) as ApiMagazine[];
  const issues = [
    ...((currentRes.data ?? []) as ApiIssue[]),
    ...((prevRes.data ?? []) as ApiIssue[]),
  ];

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
