'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Zap } from 'lucide-react';
import Link from 'next/link';
import { getCredentials, createStrategy, batchCreateStrategies, startStrategy, batchStartStrategies } from '@/lib/api';
import type { CreateStrategyFormState } from './CreateStrategyModal';
import { toast } from 'sonner';

interface Step2LaunchProps {
  formState: CreateStrategyFormState;
  onBack: () => void;
  onCreate: () => void;
  onCancel: () => void;
}

export function Step2Launch({ formState, onBack, onCreate, onCancel }: Step2LaunchProps) {
  const [launchMode, setLaunchMode] = useState<'paper' | 'live'>(formState.launchMode ?? 'paper');
  const [credentialId, setCredentialId] = useState<number | ''>(formState.credentialId ?? '');
  const [credentials, setCredentials] = useState<{ id: number; name?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCredentials()
      .then((list) => setCredentials(list.map((c) => ({ id: c.id, name: c.name as string }))))
      .catch(() => setCredentials([]));
  }, []);

  const handleCreate = async () => {
    if (launchMode === 'live' && !credentialId) {
      toast.error('Please select an exchange account for live trading');
      return;
    }
    setLoading(true);
    try {
      const marketCategory = formState.marketType === 'futures' ? 'Crypto' : 'Crypto';
      const tradingConfig = {
        symbol: formState.tradingPairs[0] ?? 'BTC/USDT',
        timeframe: formState.klinePeriod,
        initial_capital: formState.initialCapital,
        leverage: formState.marketType === 'spot' ? 1 : formState.leverage,
        market_type: formState.marketType === 'futures' ? 'swap' : 'spot',
        trade_direction: formState.tradeDirection,
        stop_loss_pct: formState.risk.stopLossPct,
        take_profit_pct: formState.risk.takeProfitPct,
      };
      const indicatorConfig = formState.indicatorId
        ? { indicator_id: Number(formState.indicatorId) }
        : {};
      const exchangeConfig =
        launchMode === 'live' && credentialId
          ? { credential_id: Number(credentialId) }
          : {};

      if (formState.tradingPairs.length > 1) {
        const result = await batchCreateStrategies({
          strategy_name: formState.strategyName,
          symbols: formState.tradingPairs.map((s) => `${marketCategory}:${s}`),
          market_category: marketCategory,
          strategy_type: 'IndicatorStrategy',
          trading_config: tradingConfig,
          indicator_config: indicatorConfig,
          exchange_config: exchangeConfig,
        });
        const ids = (result.created_ids as number[]) ?? [];
        if (ids.length > 0 && launchMode === 'paper') {
          try {
            await batchStartStrategies(ids);
          } catch {
            // ignore start error
          }
        }
        toast.success(`Created ${ids.length} strategies`);
      } else {
        const singleConfig = {
          ...tradingConfig,
          symbol: formState.tradingPairs[0] ?? 'BTC/USDT',
        };
        const result = await createStrategy({
          strategy_name: formState.strategyName,
          market_category: marketCategory,
          strategy_type: 'IndicatorStrategy',
          trading_config: singleConfig,
          indicator_config: indicatorConfig,
          exchange_config: exchangeConfig,
        });
        const id = (result as { id?: number }).id;
        if (id != null && launchMode === 'paper') {
          try {
            await startStrategy(id);
          } catch {
            // ignore
          }
        }
        toast.success('Strategy created');
      }
      onCreate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-500 text-xs">✓</span>
          Select Indicator & Pair
        </span>
        <span className="flex-1 h-px bg-border" />
        <span className="flex items-center gap-1.5 font-medium text-accent-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/20 text-xs">2</span>
          Launch Mode
        </span>
      </div>

      <p className="text-sm text-text-secondary">Choose how to launch your strategy:</p>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setLaunchMode('paper')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            launchMode === 'paper'
              ? 'border-accent-primary bg-accent-primary/10'
              : 'border-border bg-card hover:bg-bg-elevated'
          }`}
        >
          <BarChart3 className="h-8 w-8 text-text-muted mb-2" />
          <h3 className="font-semibold text-text-primary">Paper Trading</h3>
          <p className="text-sm text-text-muted mt-1">
            Test with simulated capital. No real money at risk.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-accent-primary">Select</span>
        </button>
        <button
          type="button"
          onClick={() => setLaunchMode('live')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            launchMode === 'live'
              ? 'border-accent-primary bg-accent-primary/10'
              : 'border-border bg-card hover:bg-bg-elevated'
          }`}
        >
          <Zap className="h-8 w-8 text-text-muted mb-2" />
          <h3 className="font-semibold text-text-primary">Live Trading</h3>
          <p className="text-sm text-text-muted mt-1">
            Trade with real funds via connected exchange account.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-accent-primary">Select</span>
        </button>
      </div>

      {launchMode === 'live' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Exchange Account
          </label>
          <select
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
          >
            <option value="">Select exchange account</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? `Account ${c.id}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            Configured in <Link href="/my-profile" className="text-accent-primary hover:underline">My Profile → Exchange Config</Link>
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm hover:bg-accent-primary/30 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create & Launch'}
        </button>
      </div>
    </div>
  );
}
