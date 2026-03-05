'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createStrategy, previewCompileStrategy, getCredentials } from '@/lib/api';
import { toast } from 'sonner';

type Step = 1 | 2 | 3;

export default function CreateStrategyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ id: number; name?: string }[]>([]);

  const [name, setName] = useState('');
  const [market, setMarket] = useState('Crypto');
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('1D');
  const [credentialId, setCredentialId] = useState<number | ''>('');
  const [leverage, setLeverage] = useState(1);
  const [tradeDirection, setTradeDirection] = useState<'long' | 'short'>('long');
  const [indicatorId, setIndicatorId] = useState<number | ''>('');
  const [code, setCode] = useState('');

  useEffect(() => {
    getCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, []);

  const handlePreview = async () => {
    setLoading(true);
    try {
      await previewCompileStrategy({
        name,
        market,
        symbol,
        timeframe,
        credential_id: credentialId || undefined,
        leverage,
        trade_direction: tradeDirection,
        indicator_id: indicatorId || undefined,
        code: code || undefined,
      });
      toast.success('Preview OK');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !symbol.trim()) {
      toast.error('Name and symbol are required');
      return;
    }
    setLoading(true);
    try {
      const result = await createStrategy({
        strategy_name: name,
        market,
        symbol,
        timeframe,
        credential_id: credentialId || undefined,
        leverage,
        trade_direction: tradeDirection,
        indicator_id: indicatorId || undefined,
        code: code || undefined,
        strategy_type: 'IndicatorStrategy',
      });
      toast.success('Strategy created');
      router.push(`/strategies/${result.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/strategies" className="p-2 hover:bg-white/5 rounded" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Create Strategy</h1>
      </div>

      {step === 1 && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Step 1: Basic info</h2>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
              placeholder="My strategy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Market</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="Crypto">Crypto</option>
              <option value="Forex">Forex</option>
              <option value="Stocks">Stocks</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
              placeholder="BTC/USDT"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1H">1H</option>
              <option value="4H">4H</option>
              <option value="1D">1D</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Step 2: Exchange</h2>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Credential</label>
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="">Select credential</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? `Credential ${c.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Leverage</label>
            <input
              type="number"
              min={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Direction</label>
            <select
              value={tradeDirection}
              onChange={(e) => setTradeDirection(e.target.value as 'long' | 'short')}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Step 3: Indicator / Code</h2>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Indicator ID (optional)</label>
            <input
              type="number"
              value={indicatorId}
              onChange={(e) => setIndicatorId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
              placeholder="Leave empty to paste code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Code (optional)</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary font-mono text-sm"
              placeholder="# Paste indicator code or leave blank if using indicator ID"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated"
            >
              Preview / Compile
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium"
            >
              {loading ? 'Creating...' : 'Create Strategy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
