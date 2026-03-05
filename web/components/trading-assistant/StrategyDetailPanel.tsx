'use client';

import { useEffect, useState } from 'react';
import { Printer, Square, Play } from 'lucide-react';
import {
  getStrategyDetail,
  getStrategyPositions,
  getStrategyTrades,
  startStrategy,
  stopStrategy,
} from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { StrategySummaryCards } from './StrategySummaryCards';
import { StrategyConfigTags } from './StrategyConfigTags';
import { PositionsTab } from './PositionsTab';
import { TradingRecordsTab } from './TradingRecordsTab';
import { toast } from 'sonner';

interface StrategyDetailPanelProps {
  strategyId: number | null;
  onRefresh: () => void;
}

export function StrategyDetailPanel({ strategyId, onRefresh }: StrategyDetailPanelProps) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [positions, setPositions] = useState<unknown[]>([]);
  const [trades, setTrades] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!strategyId) {
      setDetail(null);
      setPositions([]);
      setTrades([]);
      return;
    }
    setLoading(true);
    Promise.all([
      getStrategyDetail(strategyId),
      getStrategyPositions(strategyId),
      getStrategyTrades(strategyId),
    ])
      .then(([d, p, t]) => {
        setDetail(d as Record<string, unknown>);
        setPositions((p.positions ?? p.items ?? []) as unknown[]);
        setTrades((t.trades ?? t.items ?? []) as unknown[]);
      })
      .catch(() => {
        setDetail(null);
        setPositions([]);
        setTrades([]);
      })
      .finally(() => setLoading(false));
  }, [strategyId]);

  const handleStart = async () => {
    if (!strategyId) return;
    setActionLoading(true);
    try {
      await startStrategy(strategyId);
      toast.success('Strategy started');
      onRefresh();
      setDetail((prev) => (prev ? { ...prev, status: 'running' } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!strategyId) return;
    setActionLoading(true);
    try {
      await stopStrategy(strategyId);
      toast.success('Strategy stopped');
      onRefresh();
      setDetail((prev) => (prev ? { ...prev, status: 'stopped' } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to stop');
    } finally {
      setActionLoading(false);
    }
  };

  if (!strategyId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center text-text-muted">
          <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden />
          <p className="text-sm">Please select a strategy from the left to view details</p>
        </div>
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-text-muted">Loading strategy...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-text-muted">Strategy not found.</p>
      </div>
    );
  }

  const name = (detail.strategy_name as string) ?? (detail.name as string) ?? 'Strategy';
  const symbol = (detail.symbol as string) ?? '—';
  const status = String(detail.status ?? 'stopped').toLowerCase();
  const displayName = `${name}-${symbol}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="shrink-0 p-4 border-b border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-bold text-text-primary">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status === 'running' ? 'success' : 'muted'}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${status === 'running' ? 'bg-green-400' : 'bg-text-muted'}`} />
                {status === 'running' ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </div>
          {status === 'running' ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium"
            >
              <Square className="h-4 w-4" />
              Stop Strategy
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent-primary/40 bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 text-sm font-medium"
            >
              <Play className="h-4 w-4" />
              Start Strategy
            </button>
          )}
        </div>
        <StrategySummaryCards detail={detail} />
        <StrategyConfigTags detail={detail} />
      </div>
      <div className="flex-1 min-h-0 p-4">
        <Tabs defaultValue="positions">
          <TabsList>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="records">Trading Records</TabsTrigger>
          </TabsList>
          <TabsContent value="positions" className="mt-3">
            <PositionsTab strategyId={strategyId} positions={positions} onRefresh={onRefresh} />
          </TabsContent>
          <TabsContent value="records" className="mt-3">
            <TradingRecordsTab trades={trades} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
