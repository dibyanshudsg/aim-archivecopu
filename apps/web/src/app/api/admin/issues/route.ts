import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { adminReadRateLimit } from '@/lib/rate-limit';
import {
  listAdminIssuesPage,
  type AdminIssueListInput,
  type AdminIssueSortDir,
  type AdminIssueSortField,
  type AdminIssueStatusFilter,
} from '@/lib/admin-data';

const SORT_FIELDS = new Set<AdminIssueSortField>([
  'title',
  'year',
  'read_count',
  'download_count',
  'file_size_bytes',
  'created_at',
  'updated_at',
]);
const SORT_DIRS = new Set<AdminIssueSortDir>(['asc', 'desc']);
const STATUS_FILTERS = new Set<AdminIssueStatusFilter>(['all', 'published', 'draft']);

export async function GET(request: Request) {
  const admin = await verifyAdmin('catalogue.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;

  try {
    return NextResponse.json(await listAdminIssuesPage(parseInput(request)));
  } catch (error) {
    return adminApiFailure(error, 'Failed to load issues');
  }
}

function parseInput(request: Request): AdminIssueListInput {
  const searchParams = new URL(request.url).searchParams;
  const sort = searchParams.get('sort') ?? 'created_at';
  const dir = searchParams.get('dir') ?? 'desc';
  const status = searchParams.get('status') ?? 'all';

  return {
    page: clampNumber(searchParams.get('page'), 1, 1, 100000),
    pageSize: clampNumber(searchParams.get('pageSize'), 25, 1, 5000),
    q: searchParams.get('q')?.trim() ?? '',
    magazineId: normalizeFilter(searchParams.get('magazine')),
    year: normalizeFilter(searchParams.get('year')),
    status: STATUS_FILTERS.has(status as AdminIssueStatusFilter)
      ? (status as AdminIssueStatusFilter)
      : 'all',
    topic: normalizeFilter(searchParams.get('topic')),
    sort: SORT_FIELDS.has(sort as AdminIssueSortField) ? (sort as AdminIssueSortField) : 'created_at',
    dir: SORT_DIRS.has(dir as AdminIssueSortDir) ? (dir as AdminIssueSortDir) : 'desc',
  };
}

function normalizeFilter(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'all';
}

function clampNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
