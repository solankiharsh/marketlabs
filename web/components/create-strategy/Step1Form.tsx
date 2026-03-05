'use client';

import { useState, useEffect } from 'react';
import { Zap, Settings, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { getIndicators } from '@/lib/api';
import type { CreateStrategyFormState } from './CreateStrategyModal';
type RiskConfig = CreateStrategyFormState['risk'];
type ScaleInConfig = CreateStrategyFormState['scaleIn'];
type ScaleOutConfig = CreateStrategyFormState['scaleOut'];
type EntrySizingConfig = CreateStrategyFormState['entrySizing'];
import { ExecutionRisk } from './ExecutionRisk';
import { ExecutionScaleIn } from './ExecutionScaleIn';
import { ExecutionScaleOut } from './ExecutionScaleOut';
import { ExecutionEntrySizing } from './ExecutionEntrySizing';
import { AiFilterToggle } from './AiFilterToggle';

const KLINE_OPTIONS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

const COMMON_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'AVAX/USDT',
  'DOT/USDT',
  'MATIC/USDT',
  'LINK/USDT',
  'LTC/USDT',
  'UNI/USDT',
  'ATOM/USDT',
  'XLM/USDT',
];

interface Step1FormProps {
  formState: CreateStrategyFormState;
  setFormState: React.Dispatch<React.SetStateAction<CreateStrategyFormState>>;
  onNext: () => void;
  onCancel: () => void;
}

export function Step1Form({ formState, setFormState, onNext, onCancel }: Step1FormProps) {
  const [indicators, setIndicators] = useState<{ id: number; name?: string }[]>([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [showAdvancedInline, setShowAdvancedInline] = useState(false);
  const [defaultsExpanded, setDefaultsExpanded] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [scaleInOpen, setScaleInOpen] = useState(false);
  const [scaleOutOpen, setScaleOutOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);

  useEffect(() => {
    setIndicatorsLoading(true);
    getIndicators()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setIndicators(arr.map((i) => ({ id: Number(i.id), name: (i.name as string) ?? `Indicator ${i.id}` })));
      })
      .catch(() => setIndicators([]))
      .finally(() => setIndicatorsLoading(false));
  }, []);

  const update = (patch: Partial<CreateStrategyFormState>) => {
    setFormState((s) => ({ ...s, ...patch }));
  };

  const togglePair = (pair: string) => {
    setFormState((s) => {
      const set = new Set(s.tradingPairs);
      if (set.has(pair)) set.delete(pair);
      else set.add(pair);
      return { ...s, tradingPairs: Array.from(set) };
    });
  };

  const canNext =
    formState.strategyName.trim() !== '' &&
    (formState.indicatorId !== '' || formState.mode === 'advanced') &&
    formState.tradingPairs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update({ mode: 'simple' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            formState.mode === 'simple'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
              : 'text-text-muted border border-border hover:bg-bg-elevated'
          }`}
        >
          <Zap className="h-4 w-4" />
          Simple
        </button>
        <button
          type="button"
          onClick={() => update({ mode: 'advanced' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            formState.mode === 'advanced'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
              : 'text-text-muted border border-border hover:bg-bg-elevated'
          }`}
        >
          <Settings className="h-4 w-4" />
          Advanced
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span className="flex items-center gap-1.5 font-medium text-accent-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/20 text-xs">1</span>
          Select Indicator & Pair
        </span>
        <span className="flex-1 h-px bg-border" />
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs">2</span>
          Launch Mode
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Select Indicator <span className="text-red-500">*</span>
          </label>
          <select
            value={formState.indicatorId}
            onChange={(e) => update({ indicatorId: e.target.value })}
            disabled={indicatorsLoading}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary disabled:opacity-60"
          >
            <option value="">
              {indicatorsLoading
                ? 'Loading…'
                : indicators.length === 0
                  ? 'No indicators yet — create or purchase one first'
                  : 'Please select an indicator'}
            </option>
            {indicators.map((i) => (
              <option key={i.id} value={String(i.id)}>
                {i.name ?? `Indicator ${i.id}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            You can only select indicators you have created or purchased (Indicator Market or Indicator Analysis).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Strategy Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.strategyName}
            onChange={(e) => update({ strategyName: e.target.value })}
            placeholder="Please enter strategy name"
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
          />
        </div>

        {formState.mode === 'simple' && (
          <div
            className="rounded-lg border border-border bg-accent-primary/5 p-3 cursor-pointer"
            onClick={() => setDefaultsExpanded(!defaultsExpanded)}
          >
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Info className="h-4 w-4" />
              Defaults (expand to customize)
            </div>
            <p className="text-xs text-text-muted mt-1">
              K-Line Period: {formState.klinePeriod} · Leverage: {formState.leverage}x · Market Type:{' '}
              {formState.marketType} · Stop Loss: {formState.risk.stopLossPct}% · Take Profit:{' '}
              {formState.risk.takeProfitPct}%
            </p>
            {defaultsExpanded && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-text-muted block mb-1">K-Line</label>
                  <select
                    value={formState.klinePeriod}
                    onChange={(e) => update({ klinePeriod: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary"
                  >
                    {KLINE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Leverage</label>
                  <input
                    type="number"
                    min={1}
                    max={125}
                    value={formState.leverage}
                    onChange={(e) => update({ leverage: Number(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Stop Loss %</label>
                  <input
                    type="number"
                    step={0.5}
                    value={formState.risk.stopLossPct}
                    onChange={(e) =>
                      update({
                        risk: { ...formState.risk, stopLossPct: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Take Profit %</label>
                  <input
                    type="number"
                    step={0.5}
                    value={formState.risk.takeProfitPct}
                    onChange={(e) =>
                      update({
                        risk: { ...formState.risk, takeProfitPct: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {formState.mode === 'simple' && (
          <button
            type="button"
            onClick={() => setShowAdvancedInline(!showAdvancedInline)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
          >
            {showAdvancedInline ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show Advanced Settings
          </button>
        )}

        {(formState.mode === 'advanced' || showAdvancedInline) && (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-bg-secondary/50">
            {(formState.mode === 'advanced' || showAdvancedInline) && (
              <>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategyType"
                      checked={formState.strategyType === 'single'}
                      onChange={() => update({ strategyType: 'single' })}
                      className="rounded-full border-border"
                    />
                    Single Symbol Strategy
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategyType"
                      checked={formState.strategyType === 'cross_sectional'}
                      onChange={() => update({ strategyType: 'cross_sectional' })}
                      className="rounded-full border-border"
                    />
                    Cross-Sectional Strategy
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Initial Capital</label>
                    <input
                      type="number"
                      min={10}
                      max={1_000_000}
                      value={formState.initialCapital}
                      onChange={(e) => update({ initialCapital: Number(e.target.value) || 1000 })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Market Type</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="marketType"
                          checked={formState.marketType === 'futures'}
                          onChange={() => update({ marketType: 'futures' })}
                          className="rounded-full border-border"
                        />
                        Futures
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="marketType"
                          checked={formState.marketType === 'spot'}
                          onChange={() => update({ marketType: 'spot' })}
                          className="rounded-full border-border"
                        />
                        Spot
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Leverage (x)</label>
                    <input
                      type="number"
                      min={1}
                      max={formState.marketType === 'spot' ? 1 : 125}
                      value={formState.leverage}
                      onChange={(e) => update({ leverage: Number(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Trade Direction</label>
                    <div className="flex gap-2 flex-wrap">
                      {(['long_only', 'short_only', 'both'] as const).map((d) => (
                        <label key={d} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            name="tradeDirection"
                            checked={formState.tradeDirection === d}
                            onChange={() => update({ tradeDirection: d })}
                            className="rounded-full border-border"
                          />
                          {d === 'long_only' ? 'Long Only' : d === 'short_only' ? 'Short Only' : 'Both'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">K-Line Period</label>
                  <select
                    value={formState.klinePeriod}
                    onChange={(e) => update({ klinePeriod: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary"
                  >
                    {KLINE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <ExecutionRisk
                  risk={formState.risk}
                  onChange={(risk: RiskConfig) => update({ risk })}
                  open={riskOpen}
                  onToggle={() => setRiskOpen(!riskOpen)}
                />
                <ExecutionScaleIn
                  config={formState.scaleIn}
                  onChange={(scaleIn: ScaleInConfig) => update({ scaleIn })}
                  open={scaleInOpen}
                  onToggle={() => setScaleInOpen(!scaleInOpen)}
                />
                <ExecutionScaleOut
                  config={formState.scaleOut}
                  onChange={(scaleOut: ScaleOutConfig) => update({ scaleOut })}
                  open={scaleOutOpen}
                  onToggle={() => setScaleOutOpen(!scaleOutOpen)}
                />
                <ExecutionEntrySizing
                  config={formState.entrySizing}
                  onChange={(entrySizing: EntrySizingConfig) => update({ entrySizing })}
                  open={entryOpen}
                  onToggle={() => setEntryOpen(!entryOpen)}
                />
                <AiFilterToggle
                  enabled={formState.aiFilterEnabled}
                  onChange={(aiFilterEnabled: boolean) => update({ aiFilterEnabled })}
                />
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Trading Pairs (Multi-select)
          </label>
          <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-border bg-bg-secondary max-h-32 overflow-y-auto">
            {COMMON_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => togglePair(sym)}
                className={`px-2.5 py-1 rounded-md text-sm border ${
                  formState.tradingPairs.includes(sym)
                    ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                    : 'border-border text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Select multiple pairs to create strategies for each
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm hover:bg-accent-primary/30 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}
