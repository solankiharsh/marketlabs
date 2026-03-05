'use client';

import { useEffect, useState } from 'react';
import { getCredentials, getBalance, getQuickTradePosition, placeOrder, closePosition, getTradeHistory } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';

export default function TradePage() {
  const [credentials, setCredentials] = useState<{ id: number; name?: string }[]>([]);
  const [credentialId, setCredentialId] = useState<number | ''>('');
  const [symbol, setSymbol] = useState('');
  const [marketType, setMarketType] = useState('spot');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<Record<string, unknown> | null>(null);
  const [position, setPosition] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    getCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, []);

  useEffect(() => {
    if (!credentialId || !marketType) return;
    setLoading(true);
    getBalance(Number(credentialId), marketType)
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, [credentialId, marketType]);

  useEffect(() => {
    if (!credentialId || !symbol.trim() || !marketType) {
      setPosition(null);
      return;
    }
    getQuickTradePosition(Number(credentialId), symbol.trim(), marketType)
      .then(setPosition)
      .catch(() => setPosition(null));
  }, [credentialId, symbol, marketType]);

  useEffect(() => {
    getTradeHistory(50).then(setHistory).catch(() => setHistory([]));
  }, []);

  const handlePlaceOrder = async () => {
    if (!credentialId || !symbol.trim() || !amount.trim()) {
      toast.error('Select credential, symbol, and amount');
      return;
    }
    setSubmitLoading(true);
    try {
      await placeOrder({
        credential_id: Number(credentialId),
        symbol: symbol.trim(),
        market_type: marketType,
        side,
        amount: Number(amount),
      });
      toast.success('Order placed');
      setAmount('');
      if (credentialId && marketType) {
        getBalance(Number(credentialId), marketType).then(setBalance);
        getQuickTradePosition(Number(credentialId), symbol.trim(), marketType).then(setPosition);
      }
      getTradeHistory(50).then(setHistory);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClosePosition = async () => {
    if (!credentialId || !symbol.trim()) return;
    setSubmitLoading(true);
    try {
      await closePosition({
        credential_id: Number(credentialId),
        symbol: symbol.trim(),
        market_type: marketType,
      });
      toast.success('Position closed');
      setPosition(null);
      getTradeHistory(50).then(setHistory);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Close failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const historyColumns: Column<Record<string, unknown>>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'amount', header: 'Amount', render: (r) => (typeof r.amount === 'number' ? r.amount.toLocaleString() : String(r.amount ?? '—')) },
    { key: 'price', header: 'Price', render: (r) => (typeof r.price === 'number' ? r.price.toLocaleString() : String(r.price ?? '—')) },
    { key: 'created_at', header: 'Time', render: (r) => (r.created_at ? new Date(String(r.created_at)).toLocaleString() : '—') },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Quick Trade</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Order</h2>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Credential</label>
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="">Select credential</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? `Credential ${c.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Market type</label>
            <select
              value={marketType}
              onChange={(e) => setMarketType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="spot">Spot</option>
              <option value="swap">Swap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC/USDT"
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Side</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitLoading}
            className="w-full px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium disabled:opacity-50"
          >
            {submitLoading ? 'Placing...' : 'Place order'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-text-muted mb-2">Balance</h3>
            {loading ? (
              <p className="text-sm text-text-muted">Loading...</p>
            ) : balance != null ? (
              <p className="text-lg font-medium text-text-primary">
                {typeof balance.balance === 'number'
                  ? balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
                  : typeof balance.available === 'number'
                    ? balance.available.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : '—'}
              </p>
            ) : (
              <p className="text-sm text-text-muted">Select credential and market type</p>
            )}
          </div>
          {position != null && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-text-muted mb-2">Current position</h3>
              <p className="text-sm text-text-primary">
                {String(position.symbol ?? '—')} · {String(position.side ?? '—')} · Size: {String(position.size ?? '—')}
              </p>
              <button
                type="button"
                onClick={handleClosePosition}
                disabled={submitLoading}
                className="mt-2 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10"
              >
                Close position
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Trade history</h3>
        <DataTable
          columns={historyColumns}
          data={(history as Record<string, unknown>[]) ?? []}
          keyExtractor={(r) => String(r.id ?? r.symbol ?? Math.random())}
          emptyMessage="No trades yet"
        />
      </div>
    </div>
  );
}
