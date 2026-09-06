'use client';

import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';

export function ReportProblem({ issueId, title, page }: { issueId: string; title: string; page?: number }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    fetch('/api/site-settings').then((response) => response.ok ? response.json() : null).then((settings) => {
      if (!active || !settings?.feedback_form_url) return;
      const target = new URL(settings.feedback_form_url);
      if (target.protocol === 'https:' || target.protocol === 'http:') setUrl(target.href);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!url) return null;
  const context = `${title}${page ? ` — page ${page}` : ''}\n${origin}/${page ? `read/${issueId}?page=${page}` : `issue/${issueId}`}\nProblem: `;
  return (
    <details className="mt-6 rounded-xl border border-gray-200 p-4 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-flame-800"><MessageSquareText className="mr-2 inline h-4 w-4" />Report a scan or text problem</summary>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">Copy these details into the feedback form and describe the problem. Your report is sent only when you submit that form.</p>
      <textarea aria-label="Issue details to include in your report" readOnly value={context} rows={4} className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700" />
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(context); setCopied(true); } catch { setCopied(false); } }} className="min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">{copied ? 'Details copied' : 'Copy details'}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-flame-700 px-3 py-2 text-sm font-semibold text-white">Open feedback form</a>
      </div>
    </details>
  );
}
