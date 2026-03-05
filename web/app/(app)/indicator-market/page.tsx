'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import {
  getMarketplaceIndicators,
  getMarketplacePurchases,
  purchaseMarketplaceIndicator,
} from '@/lib/api';
import type { MarketplaceIndicator } from '@/lib/api';

type FilterType = 'all' | 'free' | 'paid';
type SortType = 'newest' | 'popular' | 'rating' | 'price';

export default function IndicatorMarketPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [items, setItems] = useState<MarketplaceIndicator[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [myPurchasesOnly, setMyPurchasesOnly] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (myPurchasesOnly) {
        const list = await getMarketplacePurchases();
        setItems(list);
      } else {
        const res = await getMarketplaceIndicators({
          search: search || undefined,
          filter,
          sort,
        });
        setItems(res.items);
      }
      const purchased = await getMarketplacePurchases();
      setPurchasedIds(new Set(purchased.map((p) => p.id)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter, sort, myPurchasesOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handlePurchase = async (id: string, priceCredits: number) => {
    try {
      await purchaseMarketplaceIndicator(id, priceCredits);
      setPurchasedIds((prev) => new Set([...prev, id]));
      fetchItems();
    } catch {}
  };

  const GRADIENTS: Record<string, string> = {
    teal: 'from-teal-500/30 to-cyan-600/20',
    blue: 'from-blue-500/30 to-indigo-600/20',
    green: 'from-green-500/30 to-emerald-600/20',
    pink: 'from-pink-500/30 to-rose-600/20',
    purple: 'from-purple-500/30 to-violet-600/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
          <ShoppingBag className="w-7 h-7" />
          Indicator Market
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'free', 'paid'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40' : 'border border-border text-text-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price">Price (Low-High)</option>
        </select>
        <button
          type="button"
          onClick={() => setMyPurchasesOnly((v) => !v)}
          className={`text-sm flex items-center gap-1 ${myPurchasesOnly ? 'text-accent-primary font-medium' : 'text-accent-primary hover:underline'}`}
        >
          <ShoppingBag className="w-4 h-4" />
          My Purchases
        </button>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const isPurchased = purchasedIds.has(item.id);
            const grad = item.gradient ?? 'teal';
            const gradientClass = GRADIENTS[grad] ?? GRADIENTS.teal;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className={`h-24 bg-gradient-to-br ${gradientClass} p-3 flex items-start justify-end`}>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isPurchased ? 'bg-green-500/80 text-white' : item.priceCredits === 0 ? 'bg-green-500/80 text-white' : 'bg-amber-500/80 text-white'
                  }`}>
                    {isPurchased ? 'Purchased' : item.priceCredits === 0 ? 'Free' : `${item.priceCredits} Credits`}
                  </span>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-semibold text-text-primary truncate">{item.name}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{item.description}</p>
                  <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                    <span>By {item.author}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                    <span>{item.downloads ?? 0} downloads</span>
                    <span>{item.rating != null ? item.rating : '—'} rating</span>
                    <span>{item.views ?? 0} views</span>
                  </div>
                  {!isPurchased && (
                    <button
                      type="button"
                      onClick={() => handlePurchase(item.id, item.priceCredits)}
                      className="mt-3 w-full py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-sm font-medium"
                    >
                      Purchase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-center text-text-muted py-8">No indicators found.</p>
      )}
    </div>
  );
}
