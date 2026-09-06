/** Conservative quality checks: script-neutral, and never a dictionary of
 * allowed words. Names, spiritual vocabulary and legitimate Indic text survive. */
export function cleanExtractedText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isReadableText(text: string): boolean {
  const value = cleanExtractedText(text);
  if (!value || value.includes('\ufffd')) return false;
  // Repeated bars/slashes are a common cover-art OCR failure. A valid title
  // appended to that noise must not make the whole line pass the ratio checks.
  if ((value.match(/[|\\]/gu) || []).length >= 3) return false;
  const letters = value.match(/[\p{L}\p{M}]/gu) || [];
  const words = value.match(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu) || [];
  if (letters.length < 3 || letters.length / value.length < 0.48 || words.length === 0)
    return false;
  if (!words.some((word) => word.length >= 3)) return false;
  const fragments = words.filter((word) => word.length === 1 && !/^[aAiI]$/u.test(word)).length;
  const symbols = (value.match(/[^\p{L}\p{M}\p{N}\s.,;:!?()'’"“”\-–—/]/gu) || []).length;
  if (symbols / value.length > 0.12) return false;
  return words.length < 6 || fragments / words.length < 0.3;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Prefer the actual matching sentence/line, not an arbitrary slice of cover
 * noise. Unreliable old indexes remain searchable without publishing gibberish. */
export function buildSearchSnippet(content: string, query: string, page: number): string {
  const needle = cleanExtractedText(query).toLocaleLowerCase();
  const flat = cleanExtractedText(content);
  const candidates = content.split(/\n+|(?<=[.!?।])\s+/u).map(cleanExtractedText);
  // A phrase can span two physical lines.
  const lineCount = candidates.length;
  for (let i = 0; i < lineCount - 1; i++) {
    if (
      !candidates[i].toLocaleLowerCase().includes(needle) &&
      !candidates[i + 1].toLocaleLowerCase().includes(needle)
    ) {
      const joined = `${candidates[i]} ${candidates[i + 1]}`;
      if (joined.toLocaleLowerCase().includes(needle)) candidates.push(joined);
    }
  }
  const match =
    candidates.find(
      (value) => value.toLocaleLowerCase().includes(needle) && isReadableText(value),
    ) || (flat.toLocaleLowerCase().includes(needle) && isReadableText(flat) ? flat : '');
  if (!needle || !match) return `Match found on page ${page}.`;
  const index = match.toLocaleLowerCase().indexOf(needle);
  let start = Math.max(0, index - 80);
  let end = Math.min(match.length, Math.max(index + needle.length + 120, start + 220));
  if (start > 0) {
    const space = match.indexOf(' ', start);
    if (space >= 0 && space < index) start = space + 1;
  }
  if (end < match.length) {
    const space = match.lastIndexOf(' ', end);
    if (space > index + needle.length) end = space;
  }
  const excerpt = `${start > 0 ? '… ' : ''}${match.slice(start, end)}${end < match.length ? ' …' : ''}`;
  const safe = escapeHtml(excerpt);
  const escapedQuery = escapeHtml(cleanExtractedText(query)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${escapedQuery})`, 'giu'), '<mark>$1</mark>');
}
