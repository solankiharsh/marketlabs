'use client';

import Link from 'next/link';
import { Banknote, Info } from 'lucide-react';
import type { CreditsInfo } from '@/lib/api/profile-membership';

interface CreditsCardProps {
  credits: CreditsInfo | null;
  enterDelay?: 0 | 1 | 2 | 3;
}

export function CreditsCard({ credits, enterDelay = 0 }: CreditsCardProps) {
  const balance = credits?.balance ?? 0;
  const isVip = credits?.is_vip ?? false;
  const delayClass = enterDelay === 0 ? '' : ` profile-card-enter-delay-${enterDelay}`;

  return (
    <div
      className={`profile-card-enter rounded-xl border border-[var(--border)] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-shadow duration-200 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]${delayClass}`}
      style={{ background: 'var(--gradient-credits)' }}
    >
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <Banknote className="h-5 w-5 text-[var(--gold)]" aria-hidden />
        <span className="font-semibold">My Credits</span>
      </div>
      <p className="mt-6 text-center text-5xl font-bold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-6xl">
        {balance}
      </p>
      <p className="mt-1 text-center text-sm font-medium text-[var(--text-secondary)]">Credits</p>
      <p className="mt-0.5 text-center text-xs text-[var(--text-muted)]">
        {isVip ? 'VIP Active' : 'Not a VIP'}
      </p>
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <Link
          href="/membership"
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--gold)] bg-[var(--gold)]/10 py-3 text-sm font-semibold text-[var(--gold)] transition-[transform,background-color] duration-150 ease-out hover:scale-[1.02] hover:bg-[var(--gold)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)] active:scale-[0.98]"
        >
          <Banknote className="h-4 w-4" aria-hidden />
          Top Up
        </Link>
      </div>
      <div className="mt-4 flex gap-2 text-xs text-[var(--text-muted)]">
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          AI analysis, backtest and monitoring use credits. VIP makes VIP-free indicators free.
        </span>
      </div>
    </div>
  );
}
