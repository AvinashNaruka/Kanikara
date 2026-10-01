'use client';

import type { Profile } from '@kanikara/contracts';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { flushTime, identifyVisitor, pageFromPath, trackPage } from '@/lib/site-analytics';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const { ready: authReady, token, session } = useAuth();
  const profile = useAuthedQuery<Profile>(['me'], '/account/me');
  const isAdmin = Boolean(profile.data && ['admin', 'superadmin'].includes(profile.data.role));
  const ready = authReady && (!token || profile.isFetched);

  useEffect(() => {
    if (!ready) return;
    const { page } = pageFromPath(pathname);
    const detail = page === 'shop' ? shopDetail() : null;
    trackPage(token, isAdmin, pathname, detail);
  }, [pathname, token, isAdmin, ready]);

  useEffect(() => {
    const hide = () => flushTime(token, isAdmin);
    const visible = () => {
      if (document.visibilityState === 'hidden') hide();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pagehide', hide);
    };
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !profile.data) return;
    const phone = profile.data.phone || String(session?.user?.user_metadata?.phone ?? '');
    if (phone) identifyVisitor({ phone, name: profile.data.fullName, email: session?.user?.email, source: 'profile', token });
  }, [token, session, profile.data]);

  return null;
}

function shopDetail() {
  const params = new URLSearchParams(window.location.search);
  const detail: Record<string, unknown> = {};
  if (params.get('category')) detail.category = params.get('category');
  if (params.get('search')) detail.search = params.get('search');
  if (params.get('tags')) detail.tags = params.get('tags')?.split(',');
  return Object.keys(detail).length ? detail : null;
}
