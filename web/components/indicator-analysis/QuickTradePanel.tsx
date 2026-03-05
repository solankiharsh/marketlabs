'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Bot } from 'lucide-react';
import { getLatestPrice } from '@/lib/api';

interface QuickTradePanelProps {
  market: string;
  symbol: string;
  onClose: () => void;
  onSymbolChange: (s: string) => void;
}

export function QuickTradePanel({ market, symbol, onClose, onSymbolChange }: QuickTradePanelProps) {
  const [price, setPrice] = useState<number>(0);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('100');
  const [leverage, setLeverage] = useState('5');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [tpSlOpen, setTpSlOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [symbolInput, setSymbolInput] = useState(symbol);
  const [limitPrice, setLimitPrice] = useState('');

  useEffect(() => {
    if (!market || !symbol) return;
    getLatestPrice(market, symbol)
      .then((d) => setPrice(Number((d as { price?: number }).price) || 0))
      .catch(() => setPrice(0));
  }, [market, symbol]);

  const handleExecute = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 bg-bg-primary border-l border-border shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Quick Trade</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Symbol</label>
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onBlur={() => symbolInput.trim() && onSymbolChange(symbolInput.trim())}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary"
            />
            <p className="text-xs text-text-muted mt-1">{market}</p>
          </div>

          <div>
            <div className="text-2xl font-bold text-text-primary tabular-nums">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Exchange</label>
            <div className="text-sm text-text-secondary">Crypto only</div>
            <select className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm">
              <option>Select exchange account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Side</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-2 rounded-lg font-medium text-sm ${
                  side === 'long'
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                    : 'border border-border text-text-muted hover:bg-bg-elevated'
                }`}
              >
                ↑ Long
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`py-2 rounded-lg font-medium text-sm ${
                  side === 'short'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'border border-border text-text-muted hover:bg-bg-elevated'
                }`}
              >
                ↓ Short
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Order type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderType('market')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  orderType === 'market'
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                    : 'border border-border text-text-muted'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType('limit')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  orderType === 'limit'
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                    : 'border border-border text-text-muted'
                }`}
              >
                Limit
              </button>
            </div>
            {orderType === 'limit' && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-text-muted mb-1">Limit price</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="Price"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Amount (USDT)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary font-mono tabular-nums"
            />
            <div className="flex gap-1 mt-2 flex-wrap">
              {[10, 25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="px-2 py-1 text-xs rounded border border-border text-text-muted hover:bg-bg-elevated"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Leverage</label>
            <input
              type="text"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary font-mono"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setTpSlOpen(!tpSlOpen)}
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              {tpSlOpen ? '▼' : '▶'} TP/SL Price (Optional)
            </button>
            {tpSlOpen && (
              <div className="mt-2 space-y-2">
                <input
                  type="number"
                  placeholder="Take profit"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
                />
                <input
                  type="number"
                  placeholder="Stop loss"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecute}
            className={`w-full py-3 rounded-lg font-semibold text-sm ${
              side === 'long'
                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 hover:bg-accent-primary/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            {side === 'long' ? `↑ Buy / Long ${symbol}` : `↓ Sell / Short ${symbol}`}
          </button>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Current position</h3>
            <div className="rounded-lg border border-border bg-bg-secondary/50 p-4 flex flex-col items-center justify-center gap-2 min-h-[80px]">
              <Bot className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-muted">No position</p>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-border rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Confirm trade</h3>
            <p className="text-sm text-text-secondary mb-4">
              This is a simulation. Real execution requires exchange integration. Side: {side}, Amount: {amount} USDT, Leverage: {leverage}x.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary border border-accent-primary/40"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
