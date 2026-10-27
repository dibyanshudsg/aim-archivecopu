import { getDb, nowIso } from './db/client';
import { monthInIndia } from './embargo';
import { supportedAssetSql } from './asset-url';

export interface HeroIssue {
  id: string;
  magazine_id: string;
  title: string;
  year: number;
  month: number;
  is_published: boolean;
  cover_image_url: string | null;
}

export interface HeroMagazine {
  id: string;
  name: string;
  live: HeroIssue | null;
  next: HeroIssue | null;
  hidden: HeroIssue[];
  selection: HeroSelection;
  automatic_pick: HeroIssue | null;
  previous_pick: HeroIssue | null;
  archive_pick: HeroIssue | null;
  hide_fallback: HeroIssue | null;
  next_choice: NextHeroChoice;
  next_default: HeroIssue | null;
  next_current_year: HeroIssue | null;
  next_previous_year: HeroIssue | null;
  next_keep: HeroIssue | null;
  current_override: boolean;
  next_choice_unavailable: boolean;
}

export type HeroSelection = 'automatic' | 'previous' | 'archive';
export type NextHeroChoice = 'automatic' | 'current_year' | 'previous_year' | 'keep';

interface NextHeroControl {
  monthCode: number;
  choice: Exclude<NextHeroChoice, 'automatic'>;
  keepIssueId?: string;
}

interface HeroControls {
  hidden: string[];
  selection: Record<string, HeroSelection>;
  next: Record<string, NextHeroControl>;
  legacyPinned: Record<string, string>;
}

const CONTROLS_KEY = 'hero_issue_controls';

function parseControls(value: unknown): HeroControls {
  try {
    const parsed: unknown = JSON.parse(String(value ?? '{}'));
    if (!parsed || typeof parsed !== 'object') return { hidden: [], selection: {}, next: {}, legacyPinned: {} };
    const data = parsed as Record<string, unknown>;
    const hidden = Array.isArray(data.hidden) ? data.hidden.filter((id): id is string => typeof id === 'string') : [];
    const legacyPinned = data.pinned && typeof data.pinned === 'object' && !Array.isArray(data.pinned)
      ? Object.fromEntries(Object.entries(data.pinned).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {};
    const selection: Record<string, HeroSelection> = {};
    if (data.selection && typeof data.selection === 'object' && !Array.isArray(data.selection)) {
      for (const [id, value] of Object.entries(data.selection)) {
        if (value === 'automatic' || value === 'previous' || value === 'archive') selection[id] = value;
      }
    }
    const next: Record<string, NextHeroControl> = {};
    if (data.next && typeof data.next === 'object' && !Array.isArray(data.next)) {
      for (const [id, raw] of Object.entries(data.next)) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const control = raw as Record<string, unknown>;
        if (typeof control.monthCode !== 'number' || !Number.isInteger(control.monthCode)) continue;
        if (control.choice !== 'current_year' && control.choice !== 'previous_year' && control.choice !== 'keep') continue;
        next[id] = { monthCode: control.monthCode, choice: control.choice,
          keepIssueId: typeof control.keepIssueId === 'string' ? control.keepIssueId : undefined };
      }
    }
    return { hidden, selection, next, legacyPinned };
  } catch { return { hidden: [], selection: {}, next: {}, legacyPinned: {} }; }
}

async function readControls(): Promise<HeroControls> {
  const result = await getDb().execute({ sql: 'SELECT value FROM site_settings WHERE key = ? LIMIT 1', args: [CONTROLS_KEY] });
  return parseControls(result.rows[0]?.value);
}

export async function setHeroControls(controls: Pick<HeroControls, 'hidden' | 'selection' | 'next' | 'legacyPinned'>, adminId: string): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO site_settings (key,value,updated_by,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    args: [CONTROLS_KEY, JSON.stringify({ hidden: controls.hidden, selection: controls.selection, next: controls.next, pinned: controls.legacyPinned }), adminId, nowIso()],
  });
}

function dateCode(issue: Pick<HeroIssue, 'year' | 'month'>): number { return issue.year * 12 + issue.month; }

function archiveForMonth(issues: HeroIssue[], code: number): HeroIssue | null {
  const year = Math.floor((code - 1) / 12);
  const month = ((code - 1) % 12) + 1;
  return issues.find((issue) => issue.year === year - 5 && issue.month === month)
    ?? issues.find((issue) => dateCode(issue) <= code - 60) ?? null;
}

export async function getHeroSchedule(now = new Date()): Promise<HeroMagazine[]> {
  const today = monthInIndia(now);
  const currentCode = dateCode(today);
  const nextCode = currentCode + 1;
  const [magazines, issues, controls] = await Promise.all([
    getDb().execute('SELECT id,name FROM magazines ORDER BY created_at ASC'),
    getDb().execute(`SELECT id,magazine_id,title,year,month,is_published,cover_image_url FROM issues
      WHERE ${supportedAssetSql('pdf_url')} ORDER BY year DESC, month DESC`),
    readControls(),
  ]);
  const hiddenIds = new Set(controls.hidden);
  const all = Array.from(issues.rows, (row): HeroIssue => ({
    id: String(row.id), magazine_id: String(row.magazine_id), title: String(row.title),
    year: Number(row.year), month: Number(row.month), is_published: Number(row.is_published) === 1,
    cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
  }));
  return Array.from(magazines.rows, (row): HeroMagazine => {
    const id = String(row.id);
    const own = all.filter((issue) => issue.magazine_id === id);
    const eligible = own.filter((issue) => issue.is_published && dateCode(issue) <= currentCode);
    const visible = eligible.filter((issue) => !hiddenIds.has(issue.id));
    const automatic = visible[0] ?? null;
    const previous = visible[1] ?? null;
    const archive = archiveForMonth(visible, currentCode);
    const oldPin = controls.legacyPinned[id];
    const selection = controls.selection[id] ?? (oldPin && oldPin === previous?.id ? 'previous' : oldPin && oldPin === archive?.id ? 'archive' : 'automatic');
    const defaultLive = selection === 'previous' ? previous ?? automatic : selection === 'archive' ? archive ?? automatic : automatic;
    const currentOverride = controls.next[id]?.monthCode === currentCode ? controls.next[id] : null;
    const overrideIssue = currentOverride?.choice === 'current_year' ? visible.find((issue) => dateCode(issue) === currentCode)
      : currentOverride?.choice === 'previous_year' ? visible.find((issue) => dateCode(issue) === currentCode - 12)
      : currentOverride?.choice === 'keep' ? visible.find((issue) => issue.id === currentOverride.keepIssueId) : null;
    const live = overrideIssue ?? defaultLive;
    const afterHide = visible.filter((issue) => issue.id !== live?.id);
    const nextAutomatic = afterHide[0] ?? null;
    const nextPrevious = afterHide[1] ?? null;
    const hideFallback = selection === 'previous' ? nextPrevious ?? nextAutomatic : selection === 'archive' ? archiveForMonth(afterHide, currentCode) ?? nextAutomatic : nextAutomatic;
    const nextVisible = own.filter((issue) => issue.is_published && dateCode(issue) <= nextCode && !hiddenIds.has(issue.id));
    const nextCurrentYear = own.find((issue) => dateCode(issue) === nextCode && !hiddenIds.has(issue.id)) ?? null;
    const nextPreviousYear = nextVisible.find((issue) => dateCode(issue) === nextCode - 12) ?? null;
    const nextDefault = selection === 'archive' ? archiveForMonth(nextVisible, nextCode)
      : selection === 'previous' ? nextVisible[1] ?? nextVisible[0] ?? null : nextCurrentYear;
    const nextKeep = live;
    const upcomingControl = controls.next[id]?.monthCode === nextCode ? controls.next[id] : null;
    const nextChoice: NextHeroChoice = upcomingControl?.choice ?? 'automatic';
    const requestedNext = nextChoice === 'current_year' ? nextCurrentYear
      : nextChoice === 'previous_year' ? nextPreviousYear
      : nextChoice === 'keep' ? nextVisible.find((issue) => issue.id === upcomingControl?.keepIssueId) ?? null
      : nextDefault;
    const next = requestedNext ?? nextDefault;
    return {
      id, name: String(row.name), live,
      next,
      hidden: eligible.filter((issue) => hiddenIds.has(issue.id)),
      selection, automatic_pick: automatic, previous_pick: previous, archive_pick: archive, hide_fallback: hideFallback,
      next_choice: nextChoice, next_default: nextDefault, next_current_year: nextCurrentYear,
      next_previous_year: nextPreviousYear, next_keep: nextKeep,
      current_override: Boolean(overrideIssue), next_choice_unavailable: nextChoice !== 'automatic' && !requestedNext,
    };
  });
}

export async function getLiveHeroIssueIds(now = new Date()): Promise<Set<string>> {
  return new Set((await getHeroSchedule(now)).map((magazine) => magazine.live?.id).filter((id): id is string => Boolean(id)));
}

export async function updateHeroSetting(adminId: string, action: 'hide' | 'show' | 'select' | 'schedule', magazineId: string, issueId?: string, selection?: HeroSelection, nextChoice?: NextHeroChoice): Promise<void> {
  const now = new Date();
  const schedule = await getHeroSchedule(now);
  const magazine = schedule.find((item) => item.id === magazineId);
  if (!magazine) throw new Error('Magazine not found');
  if (action === 'select' && (!selection || (selection === 'previous' && !magazine.previous_pick) || (selection === 'archive' && !magazine.archive_pick))) throw new Error('That hero option is not available');
  if (action === 'schedule' && (!nextChoice || (nextChoice === 'current_year' && !magazine.next_current_year) || (nextChoice === 'previous_year' && !magazine.next_previous_year) || (nextChoice === 'keep' && !magazine.next_keep))) throw new Error('That next-month option is not available');
  if ((action === 'hide' || action === 'show') && (!issueId || ![magazine.live, ...magazine.hidden].some((issue) => issue?.id === issueId))) throw new Error('Choose an issue shown in this magazine');
  const controls = await readControls();
  const hidden = new Set(controls.hidden);
  if (action === 'hide' && issueId) hidden.add(issueId);
  if (action === 'show' && issueId) hidden.delete(issueId);
  if (action === 'select' && selection) {
    controls.selection[magazineId] = selection;
    if (controls.next[magazineId]?.monthCode === dateCode(monthInIndia(now))) delete controls.next[magazineId];
  }
  if (action === 'schedule' && nextChoice) {
    if (nextChoice === 'automatic') delete controls.next[magazineId];
    else controls.next[magazineId] = {
      monthCode: dateCode(monthInIndia(now)) + 1,
      choice: nextChoice,
      keepIssueId: nextChoice === 'keep' ? magazine.live?.id : undefined,
    };
  }
  await setHeroControls({ hidden: [...hidden], selection: controls.selection, next: controls.next, legacyPinned: controls.legacyPinned }, adminId);
}
