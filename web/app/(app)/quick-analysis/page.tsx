'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { QuickAnalyzer } from '@/components/quick-analysis/QuickAnalyzer';

export default function QuickAnalysisPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Sparkles className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Quick AI Analysis</h1>
              <p className="text-sm text-text-muted">Instant market intelligence powered by Zing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-text-muted">Long Signals</span>
            </div>
            <p className="text-xs text-text-muted">
              AI identifies oversold conditions, bullish patterns, and positive catalysts
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-error" />
              <span className="text-sm font-medium text-text-muted">Short Signals</span>
            </div>
            <p className="text-xs text-text-muted">
              AI detects overbought levels, bearish divergences, and negative events
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Hold Signals</span>
            </div>
            <p className="text-xs text-text-muted">
              AI suggests waiting when signals are mixed or confidence is low
            </p>
          </div>
        </div>

        {/* Analyzer Component */}
        <QuickAnalyzer />

        {/* Features */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Analysis Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-accent-primary mb-1">📊 Multi-Factor Analysis</div>
              <p className="text-text-muted">Technical indicators, fundamentals, news sentiment, and macro data</p>
            </div>
            <div>
              <div className="font-medium text-accent-primary mb-1">🎯 Actionable Signals</div>
              <p className="text-text-muted">Clear BUY/SELL/HOLD recommendations with confidence scores</p>
            </div>
            <div>
              <div className="font-medium text-accent-primary mb-1">📈 Trading Plan</div>
              <p className="text-text-muted">Entry price, stop loss, take profit, and position sizing</p>
            </div>
            <div>
              <div className="font-medium text-accent-primary mb-1">⚡ Real-Time Data</div>
              <p className="text-text-muted">Live prices, indicators, and breaking news integration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
