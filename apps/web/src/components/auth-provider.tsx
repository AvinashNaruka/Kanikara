'use client';

import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore, type ReactNode } from 'react';
import { clientRequest } from '@/lib/client-api';
import { getSupabase } from '@/lib/supabase';

interface Snapshot {
  ready: boolean;
  session: Session | null;
}

const serverSnapshot: Snapshot = { ready: false, session: null };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();
let started = false;

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function start() {
  if (started) return;
  started = true;
  const supabase = getSupabase();
  if (!supabase) {
    publish({ ready: true, session: null });
    return;
  }
  void supabase.auth.getSession().then(({ data }) => {
    publish({ ready: true, session: data.session });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    publish({ ready: true, session });
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  return {
    ready: state.ready,
    configured: Boolean(getSupabase()),
    session: state.session,
    token: state.session?.access_token ?? null,
    signOut: async () => {
      await getSupabase()?.auth.signOut();
    },
  };
}

export function useAuthedQuery<T>(key: unknown[], path: string) {
  const { token, ready } = useAuth();
  return useQuery({
    queryKey: [...key, token],
    enabled: ready && Boolean(token),
    queryFn: () => clientRequest<T>(path, token),
  });
}
