'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const PUBLIC_PATHS = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuth, isAuthenticated, checked } = useAuthStore();
  const isPublic = pathname ? PUBLIC_PATHS.some((p) => pathname.startsWith(p)) : false;

  useEffect(() => {
    if (isPublic) return;
    // Skip checkAuth when already authenticated (e.g. after client-side login); avoids redundant GET /api/auth/info that can 401 immediately after login (token_version/race on backend)
    if (isAuthenticated) return;
    checkAuth();
  }, [isPublic, isAuthenticated, checkAuth]);

  useEffect(() => {
    if (!checked) return;
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [checked, isAuthenticated, isPublic, router]);

  if (!checked && !isPublic) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
