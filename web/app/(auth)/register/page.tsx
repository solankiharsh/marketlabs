'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { sendCode } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, checked } = useAuthStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    if (checked && isAuthenticated) {
      router.replace('/');
    }
  }, [checked, isAuthenticated, router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Email is required.');
      return;
    }
    setSendingCode(true);
    try {
      await sendCode(trimmed, 'register');
      setCodeSent(true);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !code.trim() || !username.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(trimmedEmail, code.trim(), username.trim(), password);
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-2xl font-display font-bold mb-2">Create account</h2>
            <p className="text-sm text-text-muted mb-6">
              Register with your email. We&apos;ll send a verification code.
            </p>

            {!codeSent ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    placeholder="you@example.com"
                    disabled={sendingCode}
                  />
                </div>
                {error && (
                  <p className="text-sm text-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sendingCode}
                  className="w-full px-4 py-3 bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-semibold rounded-lg hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingCode ? 'Sending...' : 'Send verification code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                  <p className="text-text-primary">{email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false);
                      setCode('');
                      setError('');
                    }}
                    className="text-sm text-accent-primary hover:text-accent-soft mt-1"
                  >
                    Change email
                  </button>
                </div>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1">
                    Verification code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    placeholder="Enter code from email"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    placeholder="Choose a username"
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    placeholder="At least 8 characters"
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
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}

            <p className="mt-6 text-sm text-text-muted text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-accent-primary hover:text-accent-soft font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
