'use client';

import { User } from 'lucide-react';
import type { UserProfile } from '@/lib/api/profile-membership';

interface ProfileCardProps {
  profile: UserProfile | null;
  /** For staggered entrance animation */
  enterDelay?: 0 | 1 | 2 | 3;
}

export function ProfileCard({ profile, enterDelay = 0 }: ProfileCardProps) {
  if (!profile) return null;
  const initial = (profile.nickname || profile.username || 'U').charAt(0).toUpperCase();
  const name = profile.nickname || profile.username || 'User';
  const role = (profile.role ?? 'user').toLowerCase();
  const roleLabel = role === 'vip' ? 'VIP' : role === 'admin' ? 'Admin' : 'User';
  const lastLogin = profile.last_login
    ? new Date(profile.last_login).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
    : '—';

  const delayClass = enterDelay === 0 ? '' : ` profile-card-enter-delay-${enterDelay}`;

  return (
    <div
      className={`profile-card-enter rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-shadow duration-200 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-[var(--gold)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-primary)]${delayClass}`}
    >
      <div className="flex flex-col items-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-[var(--text-primary)] sm:h-24 sm:w-24 sm:text-3xl"
          style={{
            background: 'linear-gradient(135deg, var(--gold-muted), var(--gold))',
          }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <p className="mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">{name}</p>
        <span className="mt-1.5 rounded-full border border-[var(--gold)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gold)]">
          {roleLabel}
        </span>
      </div>
      <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <span className="text-[var(--text-muted)]">Username</span>
          <span className="ml-auto font-medium text-[var(--text-primary)]">{profile.username || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Email</span>
          <span className="ml-auto truncate font-medium text-[var(--text-primary)] max-w-[180px]" title={profile.email || undefined}>
            {profile.email ? `${profile.email.slice(0, 20)}${profile.email.length > 20 ? '...' : ''}` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Last login</span>
          <span className="ml-auto font-medium text-[var(--text-primary)]">{lastLogin}</span>
        </div>
      </div>
    </div>
  );
}
