'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { getHotSymbols, searchSymbols } from '@/lib/api';
import type { SymbolSearchItem } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

const TABS = [
  { id: 'USStock', label: 'US Stock' },
  { id: 'Cryptocurrency', label: 'Cryptocurrency' },
  { id: 'Forex', label: 'Forex' },
  { id: 'Futures', label: 'Futures' },
] as const;

const HOT_BY_TAB: Record<string, string[]> = {
  USStock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
  Cryptocurrency: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'],
  Forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  Futures: ['ES', 'NQ', 'GC', 'CL'],
};

interface AddToWatchlistModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (market: string, symbol: string, name?: string) => void;
}

export function AddToWatchlistModal({ open, onClose, onConfirm }: AddToWatchlistModalProps) {
  const [tab, setTab] = useState<string>('Cryptocurrency');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hotSymbols, setHotSymbols] = useState<SymbolSearchItem[]>([]);
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [selected, setSelected] = useState<SymbolSearchItem | null>(null);
  const [searching, setSearching] = useState(false);

  const marketValue = TABS.find((t) => t.id === tab)?.id ?? 'Cryptocurrency';

  const loadHot = useCallback(() => {
    const symbols = HOT_BY_TAB[marketValue] ?? HOT_BY_TAB.Cryptocurrency;
    const fallback = symbols.map((s) => ({ symbol: s, name: s }));
    getHotSymbols(marketValue, 10)
      .then((list) => setHotSymbols(Array.isArray(list) && list.length > 0 ? list : fallback))
      .catch(() => setHotSymbols(fallback));
  }, [marketValue]);

  useEffect(() => {
    if (open) {
      loadHot();
      setSelected(null);
    }
  }, [open, loadHot]);

  useEffect(() => {
    setSelected(null);
  }, [tab]);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchSymbols(marketValue, searchKeyword, 15)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [marketValue, searchKeyword]);

  const displayList = searchKeyword.trim() ? searchResults : hotSymbols;
  const handleConfirm = () => {
    if (selected) {
      onConfirm(marketValue, selected.symbol, selected.name);
      setSelected(null);
      setSearchKeyword('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Add to Watchlist</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded p-1 hover:bg-bg-elevated text-text-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search or enter symbol code (e.g.: AAPL, BTC/USDT, ...)"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm placeholder:text-text-muted"
            />
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-sm font-medium"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Hot Symbols</p>
            <ul className="max-h-48 overflow-auto rounded-lg border border-border divide-y divide-border">
              {displayList.length === 0 && !searching && <li className="px-3 py-4 text-sm text-text-muted">No symbols</li>}
              {searching && <li className="px-3 py-4 text-sm text-text-muted">Searching...</li>}
              {displayList.map((item) => (
                <li key={item.symbol}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-elevated transition-colors ${
                      selected?.symbol === item.symbol ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                    }`}
                  >
                    <span className="font-medium">{item.symbol}</span>
                    {item.name && <span className="text-text-muted ml-2">{item.name}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-elevated text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm disabled:opacity-50"
          >
            Confirm
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
