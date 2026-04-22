import type { Magazine, Issue, IssueWithMagazine } from '@aim-archive/shared';

export const magazines: Magazine[] = [
  {
    id: 'mag-aim',
    name: 'All India Magazine',
    language: 'english',
    description:
      'Monthly publication bringing excerpts from the writings of Sri Aurobindo and The Mother on spirituality, philosophy, and self-improvement.',
    coverImageUrl: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mag-agnisikha',
    name: 'Agnisikha',
    language: 'hindi',
    description:
      'Hindi monthly publication of Sri Aurobindo Society featuring translations of Sri Aurobindo and The Mother\'s writings.',
    coverImageUrl: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const topics = [
  'Surrender',
  'Karma Yoga',
  'The Psychic Being',
  'Education',
  'Divine Grace',
  'Aspiration',
  'Transformation',
  'The Supermind',
  'Consciousness',
  'Meditation',
  'Faith',
  'The Mother',
  'Integral Yoga',
  'Peace',
  'Love',
  'Sri Aurobindo',
];

function generateIssues(): Issue[] {
  const issues: Issue[] = [];
  const mags = [
    { id: 'mag-aim', name: 'All India Magazine', folder: 'AIM 2026', filePrefix: 'All India Magazine' },
    { id: 'mag-agnisikha', name: 'Agnisikha', folder: 'Agnisikha 2026', filePrefix: 'Agnishikha' },
  ];

  const monthNames = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Real PDFs we have on disk (2026: Jan–Apr)
  const realPdfMonths = [1, 2, 3, 4];

  for (const mag of mags) {
    for (let year = 2024; year <= 2026; year++) {
      const maxMonth = year === 2026 ? 4 : 12;
      for (let month = 1; month <= maxMonth; month++) {
        const issueTopics = [
          topics[Math.floor(Math.random() * topics.length)],
          topics[Math.floor(Math.random() * topics.length)],
        ].filter((v, i, a) => a.indexOf(v) === i);

        // Map to real PDF if available (2026 Jan–Apr), otherwise pick a random real one
        const pdfMonth = year === 2026 && realPdfMonths.includes(month)
          ? month
          : realPdfMonths[month % realPdfMonths.length];
        const pdfFileName = `${mag.filePrefix} ${monthNames[pdfMonth]}-2026.pdf`;
        const pdfUrl = `/api/pdf/${encodeURIComponent(mag.folder)}/${encodeURIComponent(pdfFileName)}`;

        issues.push({
          id: `${mag.id}-${year}-${month}`,
          magazineId: mag.id,
          title: `${mag.name} ${monthNames[month]}-${year}`,
          year,
          month,
          description: `Featuring writings on ${issueTopics.join(' and ')}. A collection of spiritual insights from Sri Aurobindo and The Mother.`,
          topics: issueTopics,
          pdfUrl,
          epubUrl: null,
          mobiUrl: null,
          coverImageUrl: null,
          pageCount: 40 + Math.floor(Math.random() * 30),
          fileSizeBytes: 15_000_000 + Math.floor(Math.random() * 10_000_000),
          readCount: Math.floor(Math.random() * 5000),
          downloadCount: Math.floor(Math.random() * 1500),
          isPublished: true,
          createdAt: `${year}-${String(month).padStart(2, '0')}-10T00:00:00Z`,
          updatedAt: `${year}-${String(month).padStart(2, '0')}-10T00:00:00Z`,
        });
      }
    }
  }

  return issues.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export const issues: Issue[] = generateIssues();

export function getIssueWithMagazine(issue: Issue): IssueWithMagazine {
  const magazine = magazines.find((m) => m.id === issue.magazineId)!;
  return { ...issue, magazine };
}

export function getIssueById(id: string): IssueWithMagazine | null {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  return getIssueWithMagazine(issue);
}

export function searchIssues(query: string): IssueWithMagazine[] {
  const q = query.toLowerCase();
  return issues
    .filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        issue.description?.toLowerCase().includes(q) ||
        issue.topics.some((t) => t.toLowerCase().includes(q)),
    )
    .map(getIssueWithMagazine);
}

export function getAllTopics(): string[] {
  return [...topics].sort();
}
