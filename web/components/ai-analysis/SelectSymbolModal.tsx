'use client';

import { useEffect, useState, useCallback } from 'react';
import { Flame, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { getMarketTypes, getHotSymbols, searchSymbols, type SymbolSearchItem } from '@/lib/api';

interface SelectSymbolModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (market: string, symbol: string, name?: string) => void;
  /** When provided, used as dialog title (e.g. "Add to Watchlist") */
  title?: string;
  /** When provided, used as primary button label (e.g. "Add") */
  submitLabel?: string;
}

export function SelectSymbolModal({ open, onClose, onSelect, title, submitLabel }: SelectSymbolModalProps) {
  const [marketTypes, setMarketTypes] = useState<{ value: string; i18nKey?: string }[]>([]);
  const [market, setMarket] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hotSymbols, setHotSymbols] = useState<SymbolSearchItem[]>([]);
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SymbolSearchItem | null>(null);

  const loadMarketTypes = useCallback(async () => {
    try {
      const types = await getMarketTypes();
      setMarketTypes(types);
      if (types.length > 0) setMarket((m) => (m && types.some((t) => t.value === m) ? m : types[0].value));
    } catch {
      setMarketTypes([]);
    }
  }, []);

  const loadHotSymbols = useCallback(async () => {
    if (!market) return;
    try {
      const list = await getHotSymbols(market, 12);
      setHotSymbols(list);
    } catch {
      setHotSymbols([]);
    }
  }, [market]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearchKeyword('');
      loadMarketTypes();
    }
  }, [open, loadMarketTypes]);

  useEffect(() => {
    if (open && market) {
      loadHotSymbols();
    }
  }, [open, market, loadHotSymbols]);

  useEffect(() => {
    if (!searchKeyword.trim() || !market) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchSymbols(market, searchKeyword.trim(), 15)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchKeyword, market]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.market ?? market, selected.symbol, selected.name);
      setSelected(null);
      setSearchKeyword('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSearchKeyword('');
    onClose();
  };

  const displayTabs = marketTypes.length > 0 ? marketTypes : [{ value: 'Crypto' }, { value: 'US Stock' }, { value: 'Forex' }, { value: 'Futures' }];
  useEffect(() => {
    if (displayTabs.length > 0 && market && !displayTabs.some((t) => t.value === market)) {
      setMarket(displayTabs[0].value);
    }
  }, [displayTabs, market]);

  const showSearchResults = searchKeyword.trim().length > 0;
  const list = showSearchResults ? searchResults : hotSymbols;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? 'Select Symbol to Analyze'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border pb-2">
            {displayTabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMarket(t.value)}
                className={`px-3 py-1.5 rounded-t text-sm font-medium border-b-2 transition-colors ${
                  market === t.value
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.value}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search or enter symbol code (e.g.: AAPL, BTC/USDT,...)"
              className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              aria-label="Search symbols"
            />
            <span className="inline-flex items-center px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-muted" aria-hidden>
              <Search className="w-4 h-4" />
            </span>
          </div>

          {/* Hot Symbols / Search results */}
          <div>
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-2">
              <Flame className="w-4 h-4 text-amber-500" aria-hidden />
              {showSearchResults ? 'Search results' : 'Hot Symbols'}
            </h4>
            <div className="max-h-56 overflow-auto rounded-lg border border-border">
              {showSearchResults && searching && list.length === 0 ? (
                <p className="p-3 text-sm text-text-muted">Searching…</p>
              ) : list.length === 0 ? (
                <p className="p-3 text-sm text-text-muted">
                  {showSearchResults ? 'No symbols found. Try another search.' : 'No hot symbols for this market.'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((item) => {
                    const key = `${item.market ?? market}:${item.symbol}`;
                    const isSelected = selected?.symbol === item.symbol && (selected?.market ?? market) === (item.market ?? market);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setSelected({ ...item, market: item.market ?? market })}
                          className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                            isSelected ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-bg-elevated text-text-primary'
                          }`}
                        >
                          <span className="font-medium">{item.symbol}</span>
                          {item.name && item.name !== item.symbol && (
                            <span className="text-text-muted ml-2">{item.name}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary hover:bg-bg-elevated text-sm font-medium"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-2 rounded-lg bg-accent-primary text-accent-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {submitLabel ?? 'Select'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
