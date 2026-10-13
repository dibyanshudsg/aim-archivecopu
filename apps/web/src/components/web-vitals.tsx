'use client';

import { useReportWebVitals } from 'next/web-vitals';

/** Opt-in anonymous measurements; no URL, query, issue ID or user identifier. */
export function WebVitals() {
  useReportWebVitals(metric => {
    if (process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS !== 'true') return;
    const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating });
    navigator.sendBeacon('/api/vitals', new Blob([body], { type: 'application/json' }));
  });
  return null;
}
