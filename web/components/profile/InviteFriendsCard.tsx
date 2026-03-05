'use client';

import { useState, useCallback } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import type { ReferralData } from '@/lib/api/profile-membership';

interface InviteFriendsCardProps {
  data: ReferralData | null;
  enterDelay?: 0 | 1 | 2 | 3;
}

export function InviteFriendsCard({ data, enterDelay = 0 }: InviteFriendsCardProps) {
  const [copied, setCopied] = useState(false);
  const link = data?.referral_link ?? '';
  const invited = data?.invited_count ?? 0;
  const bonusPerInvite = data?.bonus_per_invite ?? 50;
  const delayClass = enterDelay === 0 ? '' : ` profile-card-enter-delay-${enterDelay}`;

  const copyLink = useCallback(() => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [link]);

  return (
    <div
      className={`profile-card-enter rounded-xl border border-[var(--border)] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-shadow duration-200 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]${delayClass}`}
      style={{ background: 'var(--gradient-invite)' }}
    >
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <Users className="h-5 w-5 text-[var(--cta-primary)]" aria-hidden />
        <span className="font-semibold">Invite Friends</span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)] sm:text-4xl">{invited}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Invited</p>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums text-[var(--cta-primary)] sm:text-4xl">+{bonusPerInvite}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Per Invite</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Referral link</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={link}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors duration-150 focus:border-[var(--cta-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cta-primary)]/30"
            aria-label="Referral link"
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-[var(--cta-primary)] bg-[var(--cta-primary)]/10 p-2.5 text-[var(--cta-primary)] transition-[transform,background-color] duration-150 ease-out hover:scale-105 hover:bg-[var(--cta-primary)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--cta-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)] active:scale-95"
            aria-label={copied ? 'Copied' : 'Copy link'}
            title={copied ? 'Copied' : 'Copy'}
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--bullish)]" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--text-secondary)]">New users get 100 Credits</p>
    </div>
  );
}
