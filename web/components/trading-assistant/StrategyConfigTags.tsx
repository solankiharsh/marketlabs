'use client';

import { Circle, FolderOpen, Zap, TrendingUp, Clock } from 'lucide-react';

interface StrategyConfigTagsProps {
  detail: Record<string, unknown>;
}

export function StrategyConfigTags({ detail }: StrategyConfigTagsProps) {
  const symbol = (detail.symbol as string) ?? '—';
  const indicatorConfig = (detail.indicator_config as Record<string, unknown>) ?? {};
  const indicatorName = (indicatorConfig.name as string) ?? (detail.indicator_name as string) ?? '—';
  const leverage = Number(detail.leverage ?? (detail.trading_config as Record<string, unknown>)?.leverage ?? 1);
  const tradeDirection = (detail.trade_direction as string) ?? ((detail.trading_config as Record<string, unknown>)?.trade_direction as string) ?? 'long_only';
  const timeframe = (detail.timeframe as string) ?? ((detail.trading_config as Record<string, unknown>)?.timeframe as string) ?? '—';

  const directionLabel =
    tradeDirection === 'long_only'
      ? 'Long Only'
      : tradeDirection === 'short_only'
        ? 'Short Only'
        : 'Both';

  const tags = [
    { icon: Circle, label: symbol },
    { icon: FolderOpen, label: indicatorName },
    { icon: Zap, label: `${leverage}x` },
    { icon: TrendingUp, label: directionLabel },
    { icon: Clock, label: timeframe },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary"
        >
          <Icon className="h-3.5 w-3.5 text-text-muted" />
          {String(label)}
        </span>
      ))}
    </div>
  );
}
