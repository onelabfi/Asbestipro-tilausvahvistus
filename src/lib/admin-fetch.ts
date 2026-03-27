import { getSupabaseBrowser } from '@/lib/supabase-browser';

/**
 * Fetch wrapper for admin pages — automatically injects the Supabase auth token.
 * Drop-in replacement for fetch() in all admin API calls.
 */
export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}
