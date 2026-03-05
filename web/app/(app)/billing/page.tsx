'use client';

import { useEffect, useState } from 'react';
import { getBillingPlans, purchasePlan } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from 'sonner';

export default function BillingPage() {
  const [plans, setPlans] = useState<unknown[]>([]);
  const [billing, setBilling] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    getBillingPlans()
      .then((data) => {
        setPlans(data.plans ?? []);
        setBilling(data.billing ?? {});
      })
      .catch(() => {
        setPlans([]);
        setBilling({});
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (plan: string) => {
    setPurchasing(plan);
    try {
      await purchasePlan(plan);
      toast.success('Plan activated');
      getBillingPlans().then((data) => {
        setPlans(data.plans ?? []);
        setBilling(data.billing ?? {});
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Billing</h1>

      {billing && Object.keys(billing).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold mb-2">Current plan</h2>
          <p className="text-text-secondary">{String(billing.plan ?? billing.current_plan ?? '—')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(plans as Record<string, unknown>[]).map((plan, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6 flex flex-col"
          >
            <h3 className="text-lg font-semibold text-text-primary">{String(plan.name ?? plan.plan ?? plan.id ?? 'Plan')}</h3>
            <p className="mt-2 text-2xl font-bold text-accent-primary">
              {typeof plan.price === 'number' ? `$${plan.price}` : String(plan.price ?? '—')}
            </p>
            <p className="mt-1 text-sm text-text-muted">{String(plan.interval ?? plan.description ?? '')}</p>
            <button
              type="button"
              onClick={() => handlePurchase(String(plan.plan ?? plan.id ?? plan.name ?? ''))}
              disabled={purchasing != null}
              className="mt-4 px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 disabled:opacity-50 text-sm"
            >
              {purchasing === (plan.plan ?? plan.id ?? plan.name) ? 'Processing...' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>
      {plans.length === 0 && <p className="text-text-muted">No plans available.</p>}
    </div>
  );
}
