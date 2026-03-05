'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { getSecurityConfig, type SecurityConfig } from '@/lib/api';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, checked } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null);

  useEffect(() => {
    getSecurityConfig()
      .then(setSecurityConfig)
      .catch(() => setSecurityConfig(null));
  }, []);

  useEffect(() => {
    if (checked && isAuthenticated) {
      router.replace('/');
    }
  }, [checked, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      // Client-side redirect so auth state persists; no full reload that would reset store and re-run checkAuth
      router.replace('/');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { msg?: string } }; message?: string };
      const msg =
        ax?.response?.data?.msg ||
        (err instanceof Error ? err.message : 'Login failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const oauthGoogle = `${API_URL}/api/auth/oauth/google`;
  const oauthGitHub = `${API_URL}/api/auth/oauth/github`;

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <nav className="border-b border-white/[0.08] px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-accent-primary" />
          <h1 className="text-xl font-display font-bold">MarketLabs</h1>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-card-hover">
            <h2 className="text-2xl font-display font-bold mb-2">Sign in</h2>
            <p className="text-sm text-text-muted mb-6">
              Use your Zing account to access market data and AI analysis.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">
                  Username or email
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  placeholder="Enter username or email"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-semibold rounded-lg hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {(securityConfig?.oauth_google_enabled || securityConfig?.oauth_github_enabled) && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-text-muted mb-3">Or continue with</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {securityConfig.oauth_google_enabled && (
                    <a
                      href={oauthGoogle}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-text-primary hover:bg-bg-elevated transition-colors text-sm font-medium"
                    >
                      Google
                    </a>
                  )}
                  {securityConfig.oauth_github_enabled && (
                    <a
                      href={oauthGitHub}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-text-primary hover:bg-bg-elevated transition-colors text-sm font-medium"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            )}

            <p className="mt-6 text-sm text-text-muted text-center">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-accent-primary hover:text-accent-soft font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
