'use client';

import { useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getIndicators, runBacktest, getBacktestHistory, getBacktestResult, aiAnalyzeBacktest } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { EChartsLine } from '@/components/charts/EChartsLine';
import { toast } from 'sonner';

export default function BacktestPage() {
  const [indicators, setIndicators] = useState<{ id: number; name?: string }[]>([]);
  const [indicatorId, setIndicatorId] = useState<number | ''>('');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [market, setMarket] = useState('Crypto');
  const [timeframe, setTimeframe] = useState('1D');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capital, setCapital] = useState(10000);
  const [history, setHistory] = useState<unknown[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | number | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  useEffect(() => {
    getIndicators().then(setIndicators).catch(() => setIndicators([]));
  }, []);

  useEffect(() => {
    getBacktestHistory().then((h) => setHistory(h.items)).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    if (selectedRunId == null) {
      setResult(null);
      return;
    }
    getBacktestResult(selectedRunId).then(setResult).catch(() => setResult(null));
  }, [selectedRunId]);

  const handleRun = async () => {
    if (!indicatorId || !startDate || !endDate) {
      toast.error('Select indicator and date range');
      return;
    }
    setRunLoading(true);
    try {
      const res = await runBacktest({
        indicator_id: Number(indicatorId),
        symbol,
        market,
        timeframe,
        start_date: startDate,
        end_date: endDate,
        initial_capital: capital,
      });
      toast.success('Backtest completed');
      setResult(res as Record<string, unknown>);
      getBacktestHistory().then((h) => setHistory(h.items));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backtest failed');
    } finally {
      setRunLoading(false);
    }
  };

  const handleAiAnalyze = async () => {
    const runId = (result?.run_id ?? selectedRunId) as string | number | null | undefined;
    if (runId == null) return;
    try {
      const res = await aiAnalyzeBacktest([runId as string | number]);
      setAiAnalysis(res.analysis ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI analysis failed');
    }
  };

  const equityData = (result?.equity_curve as { time?: number; equity?: number }[]) ?? [];
  const chartData = equityData.map((p) => ({
    time: p.time ? new Date(p.time * 1000).toLocaleDateString() : '',
    equity: p.equity ?? 0,
  }));

  const historyColumns: Column<Record<string, unknown>>[] = [
    { key: 'run_id', header: 'Run ID' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'created_at', header: 'Date', render: (r) => (r.created_at ? new Date(String(r.created_at)).toLocaleString() : '—') },
    {
      key: 'run_id',
      header: '',
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedRunId(r.run_id as string)}
          className="text-accent-primary hover:underline text-sm"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Backtest</h1>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Indicator</label>
            <select
              value={indicatorId}
              onChange={(e) => setIndicatorId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="">Select indicator</option>
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name ?? `Indicator ${i.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Date range</label>
            <DatePicker.RangePicker
              value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] as [Dayjs, Dayjs] : null}
              onChange={(dates) => {
                if (dates?.[0]) setStartDate(dates[0].format('YYYY-MM-DD'));
                if (dates?.[1]) setEndDate(dates[1].format('YYYY-MM-DD'));
              }}
              className="w-full [&_.ant-picker]:rounded-lg [&_.ant-picker]:bg-bg-secondary [&_.ant-picker]:border-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Capital</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={runLoading}
          className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium disabled:opacity-50"
        >
          {runLoading ? 'Running...' : 'Run backtest'}
        </button>
      </div>

      {result != null && (
        <>
          {chartData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-lg font-semibold mb-4">Equity curve</h3>
              <EChartsLine
                data={chartData as Record<string, string | number>[]}
                series={[{ name: 'Equity', dataKey: 'equity', type: 'area', color: 'var(--accent-primary)' }]}
                xAxisKey="time"
                height={256}
                theme="dark"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAiAnalyze}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
            >
              AI analyze
            </button>
          </div>
          {aiAnalysis && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-lg font-semibold mb-2">AI analysis</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">History</h3>
        <DataTable
          columns={historyColumns}
          data={history as Record<string, unknown>[]}
          keyExtractor={(r) => String(r.run_id ?? r.id ?? Math.random())}
          emptyMessage="No backtest runs yet"
        />
      </div>
    </div>
  );
}
