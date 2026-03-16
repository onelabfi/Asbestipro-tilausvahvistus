'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import type { UserRole } from '@/lib/supabase';

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/calendar', label: 'Kalenteri', icon: '📅' },
  { href: '/admin/map', label: 'Kartta', icon: '🗺️' },
  { href: '/admin/orders', label: 'Tilaukset', icon: '📋' },
];

const FIELD_USER_NAV = [
  { href: '/admin/calendar', label: 'Kalenteri', icon: '📅' },
];

// Pages accessible by field_user
const FIELD_USER_PAGES = ['/admin/calendar', '/admin/order'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.replace('/admin/login');
          return;
        }

        // Check user role
        const { data: profile, error: profileError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', session.user.id)
          .single() as { data: { role: string } | null; error: unknown };

        if (profileError || !profile) {
          console.error('Profile check error:', profileError);
          await supabase.auth.signOut();
          router.replace('/admin/login');
          return;
        }

        const role = profile.role as UserRole;

        // Field users can only access calendar and order detail pages
        if (role === 'field_user') {
          const isAllowed = FIELD_USER_PAGES.some(
            (page) => pathname === page || pathname.startsWith(page + '/')
          );
          if (!isAllowed) {
            router.replace('/admin/calendar');
            return;
          }
        }

        setUserRole(role);
        setAuthenticated(true);
        setLoading(false);
      } catch (err) {
        console.error('Auth check failed:', err);
        router.replace('/admin/login');
      }
    };

    checkAuth();
  }, [isLoginPage, router, pathname]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Ladataan...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  const navItems = userRole === 'admin' ? ADMIN_NAV : FIELD_USER_NAV;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-white border rounded-lg p-2 shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-gray-900 text-white flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-gray-700">
          <h1 className="text-base font-bold">
            {userRole === 'admin' ? 'Admin' : 'Kartoittaja'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Suomen Asbestipro</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-gray-300 hover:text-white w-full px-1 py-2"
          >
            <span>🚪</span>
            Kirjaudu ulos
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-0">
        {children}
      </main>
    </div>
  );
}
