"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const shouldTrackPath = (path: string) => {
  const pathname = path.split('?')[0] || '/';

  return ![
    '/admin',
    '/api',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ].some((blockedPath) => pathname === blockedPath || pathname.startsWith(`${blockedPath}/`));
};

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (!shouldTrackPath(path)) return;

    const payload = JSON.stringify({
      path,
      referrer: document.referrer,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/view', blob);
      return;
    }

    void fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  }, [pathname, searchParams]);

  return null;
}
