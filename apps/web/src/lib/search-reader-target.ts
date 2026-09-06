export interface SearchReaderTarget {
  page: number;
  query: string;
  excerpt: string;
}

export interface SearchLine {
  text: string;
  /** Fractions of the rendered page, independent of zoom and pixel density. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export function searchReaderPath(issueId: string, target: SearchReaderTarget) {
  const params = new URLSearchParams({
    page: String(target.page),
    matchPage: String(target.page),
    find: target.query.slice(0, 200),
    excerpt: target.excerpt.slice(0, 600),
  });
  return `/read/${issueId}?${params}`;
}

export function parseSearchReaderTarget(params: Pick<URLSearchParams, 'get'>): SearchReaderTarget | null {
  const page = Number(params.get('matchPage'));
  const query = params.get('find')?.trim().slice(0, 200);
  if (!Number.isSafeInteger(page) || page < 1 || !query) return null;
  return { page, query, excerpt: (params.get('excerpt') || '').slice(0, 600) };
}

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}

/** Locate the occurrence whose surrounding words best match the clicked card.
 * Repeated query words elsewhere on the page must not steal the landing point. */
export function findSearchLines(lines: SearchLine[], target: SearchReaderTarget): SearchLine[] {
  const spans: { start: number; end: number; line: SearchLine }[] = [];
  let text = '';
  for (const line of lines) {
    const content = normalize(line.text);
    if (!content) continue;
    if (text) text += ' ';
    spans.push({ start: text.length, end: text.length + content.length, line });
    text += content;
  }
  const query = normalize(target.query);
  if (!query) return [];
  const excerpt = normalize(target.excerpt).replace(/^[.\s…]+|[.\s…]+$/gu, '');
  // Prefer the complete phrase, including phrases that wrap to another line.
  const phrases = text.includes(query) ? [query] : [...new Set(query.split(' '))];
  const contextWords = new Set(excerpt.match(/[\p{L}\p{M}\p{N}]+/gu) || []);
  let best: { start: number; end: number; score: number } | undefined;
  for (const phrase of phrases) {
    let from = 0;
    for (let count = 0; count < 200; count++) {
      const start = text.indexOf(phrase, from);
      if (start < 0) break;
      const end = start + phrase.length;
      const excerptOffset = excerpt.indexOf(phrase);
      const before = excerptOffset < 0 ? 80 : excerptOffset;
      const after = excerptOffset < 0 ? 120 : excerpt.length - excerptOffset - phrase.length;
      const context = text.slice(Math.max(0, start - before), end + after);
      const words = new Set(context.match(/[\p{L}\p{M}\p{N}]+/gu) || []);
      let score = phrase.length / Math.max(1, query.length);
      for (const word of contextWords) if (words.has(word)) score += 1;
      if (excerpt && context.includes(excerpt)) score += 1000;
      if (!best || score > best.score) best = { start, end, score };
      from = end;
    }
  }
  if (!best) return [];
  // A query word alone is not enough when the clicked card supplies substantial
  // context. Leave an uncertain location unmarked (or let OCR recover it).
  if (contextWords.size >= 6 && best.score < 1 + Math.min(4, Math.ceil(contextWords.size * 0.25))) return [];
  return spans.filter(({ start, end }) => start < best.end && end > best.start).map(({ line }) => line);
}
