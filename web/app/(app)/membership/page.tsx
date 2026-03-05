'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { PlanCard } from '@/components/membership/PlanCard';
import { UsdtPaymentModal } from '@/components/membership/UsdtPaymentModal';
import {
  getMembershipPlans,
  getMembershipStatus,
  purchaseMembershipPlan,
} from '@/lib/api/profile-membership';
import type { MembershipPlan, MembershipStatus, PaymentOrder } from '@/lib/api/profile-membership';

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);

  const load = () => {
    Promise.all([
      getMembershipPlans().then(setPlans),
      getMembershipStatus().then(setStatus),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleBuy = async (planId: string) => {
    setPurchasing(planId);
    try {
      const order = await purchaseMembershipPlan(planId);
      setPaymentOrder(order);
    } catch (e) {
      setPaymentOrder(null);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  const credits = status?.credits ?? 0;
  const isVip = status?.is_vip ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
          <CreditCard className="h-7 w-7" />
          Membership / Credits
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Choose a plan to activate VIP and receive bonus credits.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Current Credits</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{credits}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-muted)]">VIP Status</p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              isVip
                ? 'border border-[var(--gold)] text-[var(--gold)]'
                : 'border border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            {isVip ? 'VIP Active' : 'Not VIP'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border-l-4 border-[var(--gold)] bg-[var(--bg-card)] p-4">
        <p className="flex items-center gap-2 font-medium text-[var(--gold)]">
          <Info className="h-5 w-5" />
          VIP Benefit
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          VIP has only one special permission: VIP-free indicators can be used without credits deduction. Other paid features/indicators still consume credits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onBuy={() => handleBuy(plan.id)}
            loading={purchasing === plan.id}
          />
        ))}
      </div>

      {paymentOrder && (
        <UsdtPaymentModal
          open={!!paymentOrder}
          onClose={() => setPaymentOrder(null)}
          orderId={paymentOrder.order_id}
          depositAddress={paymentOrder.deposit_address}
          amount={paymentOrder.amount}
          network={paymentOrder.network}
          onConfirmed={() => { setPaymentOrder(null); load(); }}
        />
      )}
    </div>
  );
}
