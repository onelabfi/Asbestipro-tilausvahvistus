'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError.message);
        setError(`Virhe: ${authError.message}`);
        setLoading(false);
        return;
      }

      // Check admin role
      const { data: profile } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', data.user.id)
        .single() as { data: { role: string } | null };

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Ei admin-oikeuksia');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Login catch error:', message);
      setError(`Kirjautuminen epäonnistui: ${message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
            Admin Login
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sähköposti
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@asbesti.pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salasana
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Kirjaudutaan...' : 'Kirjaudu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
