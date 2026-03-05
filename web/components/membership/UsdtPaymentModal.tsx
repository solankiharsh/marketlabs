'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/Dialog';
import { Copy, RefreshCw, X } from 'lucide-react';
import { PaymentStepper } from './PaymentStepper';
import { checkPaymentStatus } from '@/lib/api/profile-membership';
import { toast } from 'sonner';

interface UsdtPaymentModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  depositAddress: string;
  amount: number;
  network: string;
  createdAt?: string;
  onConfirmed: () => void;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_MS = 5 * 60 * 1000;

export function UsdtPaymentModal({
  open,
  onClose,
  orderId,
  depositAddress,
  amount,
  network,
  createdAt,
  onConfirmed,
}: UsdtPaymentModalProps) {
  const [status, setStatus] = useState<'waiting' | 'detected' | 'confirmed'>('waiting');
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null);

  const step: 1 | 2 | 3 = status === 'confirmed' ? 3 : status === 'detected' ? 2 : 1;

  const poll = useCallback(async () => {
    try {
      const res = await checkPaymentStatus(orderId);
      const s = (res.status ?? '').toLowerCase();
      if (s === 'confirmed' || s === 'paid') {
        setStatus('confirmed');
        onConfirmed();
        return true;
      }
      if (s === 'detected') setStatus('detected');
      return s === 'confirmed' || s === 'paid';
    } catch {
      return false;
    }
  }, [orderId, onConfirmed]);

  useEffect(() => {
    if (!open || !orderId) return;
    const start = Date.now();
    const t = setInterval(() => {
      poll().then((done) => {
        if (done) clearInterval(t);
        if (Date.now() - start > MAX_POLL_MS) clearInterval(t);
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [open, orderId, poll]);

  const copy = (text: string, key: 'address' | 'amount') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copied');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-[var(--border)] bg-[var(--bg-card)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            💲 USDT Scan to Pay
          </DialogTitle>
        </DialogHeader>
        <p className="rounded-lg border-l-4 border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-[var(--text-secondary)]">
          Make sure the network and amount are correct (TRC20 only for now). Membership will be activated automatically after payment is confirmed.
        </p>
        <div className="py-4">
          <PaymentStepper step={step} />
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-4">
          <div className="flex h-[140px] w-[140px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] text-xs">
            QR placeholder
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Deposit Address</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={depositAddress}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => copy(depositAddress, 'address')}
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
                  aria-label="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Amount</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${amount} USDT`}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => copy(`${amount} USDT`, 'amount')}
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
                  aria-label="Copy amount"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--gold)]">Scan with your wallet and send USDT</p>
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2">
          <span className="text-sm text-[var(--text-primary)]">{amount} USDT</span>
          <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs text-teal-400">{network}</span>
        </div>
        {createdAt && (
          <p className="text-xs text-[var(--text-muted)]">🕐 {new Date(createdAt).toLocaleString()}</p>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => poll()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
            >
              Close
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
