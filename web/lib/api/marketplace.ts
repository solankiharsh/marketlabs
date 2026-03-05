'use strict';

/** v1: catalog and purchases in localStorage; later switch to backend GET/POST /api/marketplace/* */

const STORAGE_CATALOG = 'indicator_marketplace_catalog';
const STORAGE_PURCHASES = 'indicator_marketplace_purchases';

export interface MarketplaceIndicator {
  id: string;
  name: string;
  description: string;
  author: string;
  priceCredits: number; // 0 = free
  downloads?: number;
  rating?: number;
  views?: number;
  gradient?: string;
}

const DEFAULT_CATALOG: MarketplaceIndicator[] = [
  { id: '1', name: 'Dragon King', description: 'Legend of Dragon King strategy', author: 'Tanwuling', priceCredits: 10000, downloads: 0, views: 3, gradient: 'teal' },
  { id: '2', name: 'Dual MA Strategy', description: 'EMA crossover strategy: buy when short EMA crosses above long EMA, sell on cross below', author: 'System', priceCredits: 0, downloads: 10, views: 50, gradient: 'blue' },
  { id: '3', name: 'RSI Divergence', description: 'RSI divergence detection with alerts', author: 'Community', priceCredits: 500, downloads: 5, views: 20, gradient: 'green' },
];

function hasCjk(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uff00-\uffef]/.test(text);
}

function getCatalog(): MarketplaceIndicator[] {
  if (typeof window === 'undefined') return DEFAULT_CATALOG;
  try {
    const s = localStorage.getItem(STORAGE_CATALOG);
    if (s) {
      const parsed = JSON.parse(s) as MarketplaceIndicator[];
      const hasChinese = parsed.some((i) => hasCjk(i.name) || hasCjk(i.description));
      if (hasChinese) return DEFAULT_CATALOG;
      return parsed;
    }
  } catch {}
  return DEFAULT_CATALOG;
}

function getPurchases(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(STORAGE_PURCHASES);
    if (s) return JSON.parse(s) as string[];
  } catch {}
  return [];
}

function setPurchases(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PURCHASES, JSON.stringify(ids));
  } catch {}
}

export function getMarketplaceIndicators(params?: {
  filter?: 'all' | 'free' | 'paid';
  sort?: 'newest' | 'popular' | 'rating' | 'price';
  search?: string;
}): Promise<{ items: MarketplaceIndicator[] }> {
  let items = [...getCatalog()];
  const search = (params?.search ?? '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search) ||
        i.author.toLowerCase().includes(search)
    );
  }
  const filter = params?.filter ?? 'all';
  if (filter === 'free') items = items.filter((i) => i.priceCredits === 0);
  if (filter === 'paid') items = items.filter((i) => i.priceCredits > 0);
  const sort = params?.sort ?? 'newest';
  if (sort === 'popular') items.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
  if (sort === 'rating') items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === 'price') items.sort((a, b) => a.priceCredits - b.priceCredits);
  return Promise.resolve({ items });
}

export function getMarketplaceIndicator(id: string): Promise<MarketplaceIndicator | null> {
  const item = getCatalog().find((i) => i.id === id) ?? null;
  return Promise.resolve(item);
}

export function getMarketplacePurchases(): Promise<MarketplaceIndicator[]> {
  const ids = getPurchases();
  const catalog = getCatalog();
  const items = ids.map((id) => catalog.find((i) => i.id === id)).filter(Boolean) as MarketplaceIndicator[];
  return Promise.resolve(items);
}

export function purchaseMarketplaceIndicator(
  indicatorId: string,
  _priceCredits: number
): Promise<void> {
  const ids = getPurchases();
  if (ids.includes(indicatorId)) return Promise.resolve();
  setPurchases([...ids, indicatorId]);
  return Promise.resolve();
}
