'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { addPosition } from '@/lib/api';
import { searchSymbols } from '@/lib/api';
import type { AddPositionPayload } from '@/lib/api/portfolio-types';
import type { MarketType, SymbolSearchItem } from '@/lib/api/market';
import { getMarketTypes } from '@/lib/api';
import { toast } from 'sonner';

interface AddPositionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_MARKET_OPTIONS = [
  { value: 'us_stock', i18nKey: 'US Stock' },
  { value: 'crypto', i18nKey: 'Crypto' },
  { value: 'forex', i18nKey: 'Forex' },
  { value: 'commodities', i18nKey: 'Commodities' },
  { value: 'indices', i18nKey: 'Indices' },
];

export function AddPositionModal({ open, onClose, onSuccess }: AddPositionModalProps) {
  const [marketOptions, setMarketOptions] = useState<MarketType[]>(DEFAULT_MARKET_OPTIONS);
  const [market, setMarket] = useState<string>('');
  const [symbol, setSymbol] = useState('');
  const [symbolSearchKeyword, setSymbolSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [group, setGroup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMarketTypes()
      .then((types) => types.length > 0 && setMarketOptions(types))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(
    (keyword: string) => {
      if (!keyword.trim() || !market) {
        setSearchResults([]);
        return;
      }
      searchSymbols(market, keyword.trim(), 15)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    },
    [market]
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(symbolSearchKeyword), 300);
    return () => clearTimeout(t);
  }, [symbolSearchKeyword, runSearch]);

  const reset = () => {
    setMarket('');
    setSymbol('');
    setSymbolSearchKeyword('');
    setSearchResults([]);
    setSide('long');
    setQuantity('');
    setEntryPrice('');
    setNotes('');
    setGroup('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const qty = Number.parseFloat(quantity);
    const entry = Number.parseFloat(entryPrice);
    if (!market?.trim()) {
      toast.error('Please select a market');
      return;
    }
    if (!symbol?.trim()) {
      toast.error('Please enter or select a symbol');
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (Number.isNaN(entry) || entry <= 0) {
      toast.error('Please enter a valid entry price');
      return;
    }
    setSubmitting(true);
    try {
      const payload: AddPositionPayload = {
        market: market.trim(),
        symbol: symbol.trim(),
        side,
        quantity: qty,
        entry_price: entry,
        notes: notes.trim() || undefined,
        group_name: group.trim() || undefined,
      };
      await addPosition(payload);
      toast.success('Position added');
      handleClose();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add position');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Add Position</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="rounded-lg p-1 text-text-muted hover:text-text-primary" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Market *</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary"
            >
              <option value="">Select Market</option>
              {marketOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.i18nKey}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Symbol *</label>
            <input
              type="text"
              value={symbolSearchKeyword || symbol}
              onChange={(e) => {
                setSymbolSearchKeyword(e.target.value);
                setSymbol(e.target.value);
              }}
              placeholder="Search or enter symbol"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted"
            />
            <p className="text-xs text-text-muted mt-1">Search symbols or enter any code directly</p>
            {searchResults.length > 0 && (
              <ul className="mt-2 rounded-lg border border-border bg-bg-secondary max-h-40 overflow-auto">
                {searchResults.map((item) => (
                  <li key={`${item.market}-${item.symbol}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-bg-elevated"
                      onClick={() => {
                        setSymbol(item.symbol);
                        setSymbolSearchKeyword('');
                        setSearchResults([]);
                      }}
                    >
                      {item.symbol} {item.name ? `— ${item.name}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Side *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  side === 'long' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border bg-bg-secondary text-text-muted hover:text-text-primary'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  side === 'short' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border bg-bg-secondary text-text-muted hover:text-text-primary'
                }`}
              >
                Short
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Quantity *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Entry Price *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="Enter entry price"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Add notes"
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Group</label>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Enter or select group"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-4 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'OK'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
