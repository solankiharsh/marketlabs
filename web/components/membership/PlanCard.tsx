'use client';

import type { MembershipPlan } from '@/lib/api/profile-membership';

interface PlanCardProps {
  plan: MembershipPlan;
  onBuy: () => void;
  loading?: boolean;
}

export function PlanCard({ plan, onBuy, loading }: PlanCardProps) {
  const period = plan.period ?? '';
  const features = plan.features ?? [];

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{plan.name}</h3>
      <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
        ${plan.price.toFixed(2)}
        <span className="ml-1 text-base font-normal text-[var(--text-muted)]">{period}</span>
      </p>
      {plan.credits > 0 && (
        <p className="mt-2 text-sm font-medium text-[var(--gold)]">
          +{plan.credits.toLocaleString()} Credits
        </p>
      )}
      {features.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
          {features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onBuy}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-[var(--cta-primary)] py-2.5 text-sm font-medium text-white hover:bg-[var(--cta-hover)] disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Buy Now'}
      </button>
    </div>
  );
}
