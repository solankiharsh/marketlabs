'use client';

import { useEffect, useState } from 'react';
import { getGlobalHeatmap } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

interface HeatmapItem {
  name?: string;
  fullName?: string;
  name_cn?: string;
  name_en?: string;
  value?: number;
  price?: number;
  marketCap?: number;
  volume?: number;
  unit?: string;
}

interface HeatmapData {
  crypto?: HeatmapItem[];
  commodities?: HeatmapItem[];
  sectors?: HeatmapItem[];
  forex?: HeatmapItem[];
  indices?: HeatmapItem[];
}

function Tile({
  name,
  price,
  value,
  unit,
}: {
  name: string;
  price?: number;
  value?: number;
  unit?: string;
}) {
  const numVal = typeof value === 'number' ? value : 0;
  const isPositive = numVal >= 0;
  const intensity = Math.min(Math.abs(numVal) / 10, 1);
  const bgOpacity = 0.15 + intensity * 0.25;
  const bgClass = isPositive
    ? `bg-green-500/${Math.round(bgOpacity * 100)}`
    : `bg-red-500/${Math.round(bgOpacity * 100)}`;

  const displayPrice =
    typeof price === 'number'
      ? price >= 1000
        ? `$${(price / 1000).toFixed(1)}K`
        : price >= 1
          ? `$${price.toFixed(2)}`
          : `$${price.toFixed(4)}`
      : '—';

  return (
    <div
      className={`rounded border border-border p-2 ${bgClass} hover:border-accent-primary/30 transition-colors`}
    >
      <div className="text-[10px] font-medium text-text-primary truncate">{name}</div>
      <div className="font-mono text-xs font-semibold tabular-nums text-text-primary mt-0.5">
        {displayPrice}
        {unit && <span className="text-text-muted font-normal text-[10px] ml-0.5">{unit}</span>}
      </div>
      <div
        className={`text-[10px] font-medium tabular-nums mt-0.5 ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {isPositive ? '+' : ''}
        {numVal.toFixed(2)}%
      </div>
    </div>
  );
}

export function HeatmapGrid() {
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalHeatmap()
      .then((data) => setHeatmap((data as HeatmapData) ?? {}))
      .catch(() => setHeatmap({}))
      .finally(() => setLoading(false));
  }, []);

  const crypto = heatmap.crypto ?? [];
  const commodities = heatmap.commodities ?? [];
  const sectors = heatmap.sectors ?? [];
  const forex = heatmap.forex ?? [];

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-6 w-24 bg-bg-elevated rounded animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-bg-elevated animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Tabs defaultValue="crypto">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto text-xs">
          <TabsTrigger value="crypto" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent px-2 py-1.5">
            Crypto
          </TabsTrigger>
          <TabsTrigger value="commodities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent px-2 py-1.5">
            Commodities
          </TabsTrigger>
          <TabsTrigger value="sectors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent px-2 py-1.5">
            Sectors
          </TabsTrigger>
          <TabsTrigger value="forex" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent px-2 py-1.5">
            Forex
          </TabsTrigger>
        </TabsList>
        <TabsContent value="crypto" className="mt-0 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {crypto.slice(0, 12).map((item, i) => (
              <Tile
                key={`${item.name ?? i}-${i}`}
                name={item.name ?? item.fullName ?? '—'}
                price={item.price}
                value={item.value}
              />
            ))}
          </div>
          {crypto.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No crypto data</p>
          )}
        </TabsContent>
        <TabsContent value="commodities" className="mt-0 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {commodities.slice(0, 12).map((item, i) => (
              <Tile
                key={`${item.name_cn ?? item.name ?? i}-${i}`}
                name={item.name_en ?? item.name_cn ?? item.name ?? '—'}
                price={item.price}
                value={item.value}
                unit={item.unit}
              />
            ))}
          </div>
          {commodities.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No commodities data</p>
          )}
        </TabsContent>
        <TabsContent value="sectors" className="mt-0 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {sectors.slice(0, 12).map((item, i) => (
              <Tile
                key={`${item.name ?? item.name_en ?? i}-${i}`}
                name={item.name_en ?? item.name ?? '—'}
                price={item.price}
                value={item.value}
              />
            ))}
          </div>
          {sectors.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No sectors data</p>
          )}
        </TabsContent>
        <TabsContent value="forex" className="mt-0 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {forex.slice(0, 12).map((item, i) => (
              <Tile
                key={`${item.name ?? i}-${i}`}
                name={item.name ?? item.name_en ?? '—'}
                price={item.price}
                value={item.value}
              />
            ))}
          </div>
          {forex.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No forex data</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
