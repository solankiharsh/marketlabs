'use client';

import type { IndicatorLegendEntry } from './IndicatorChart';

interface ActiveIndicatorLegendProps {
  entries: IndicatorLegendEntry[];
}

export function ActiveIndicatorLegend({ entries }: ActiveIndicatorLegendProps) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums py-1.5 border-b border-border/50 text-text-secondary">
      {entries.map((e) => (
        <span key={e.name} className="text-accent-primary">
          {e.name} {e.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      ))}
    </div>
  );
}
