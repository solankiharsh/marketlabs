'use client';

import { useState } from 'react';
import { BarChart3, Target, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { MarketScan } from '@/lib/api';

interface TradingSignalProps {
  scan: MarketScan;
  currentPrice: number;
  acceptanceLevel?: number;
  breachLevel?: number;
  structuralBias?: string;
}

export function TradingSignal({ scan, currentPrice, acceptanceLevel, breachLevel, structuralBias }: TradingSignalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const setupType = scan.setupType || 'neutral';
  const isBullish = setupType === 'bullish';
  const isBearish = setupType === 'bearish';

  // Calculate Entry, Target, and Stop Loss
  const entry = currentPrice;
  let target: number | undefined;
  let stopLoss: number | undefined;

  if (isBullish) {
    target = acceptanceLevel;
    stopLoss = breachLevel;
  } else if (isBearish) {
    target = breachLevel;
    stopLoss = acceptanceLevel;
  }

  // Calculate Risk/Reward ratio
  let riskRewardRatio: string | null = null;
  let riskPercent = 0;
  let rewardPercent = 0;

  if (target && stopLoss && entry) {
    if (isBullish) {
      const risk = entry - stopLoss;
      const reward = target - entry;
      if (risk > 0 && reward > 0) {
        const ratio = reward / risk;
        riskRewardRatio = `1:${ratio.toFixed(2)}`;
        riskPercent = (risk / entry) * 100;
        rewardPercent = (reward / entry) * 100;
      }
    } else if (isBearish) {
      const risk = stopLoss - entry;
      const reward = entry - target;
      if (risk > 0 && reward > 0) {
        const ratio = reward / risk;
        riskRewardRatio = `1:${ratio.toFixed(2)}`;
        riskPercent = (risk / entry) * 100;
        rewardPercent = (reward / entry) * 100;
      }
    }
  }

  // Generate concise signal explanation
  const getSignalExplanation = () => {
    const score = scan.score || 0;
    const momentum = scan.momentum || 0;
    
    if (isBullish) {
      if (score >= 80) {
        return `Strong bullish signal (${score}/100). Upward momentum: ${momentum > 0 ? '+' : ''}${momentum.toFixed(0)}. Potential breakout above resistance.`;
      } else if (score >= 60) {
        return `Moderate bullish signal (${score}/100). Momentum: ${momentum > 0 ? '+' : ''}${momentum.toFixed(0)}. Monitor for confirmation.`;
      } else {
        return `Weak bullish signal (${score}/100). Limited momentum: ${momentum > 0 ? '+' : ''}${momentum.toFixed(0)}. Exercise caution.`;
      }
    } else if (isBearish) {
      if (score >= 80) {
        return `Strong bearish signal (${score}/100). Downward pressure: ${momentum < 0 ? '' : '+'}${momentum.toFixed(0)}. Potential breakdown below support.`;
      } else if (score >= 60) {
        return `Moderate bearish signal (${score}/100). Momentum: ${momentum < 0 ? '' : '+'}${momentum.toFixed(0)}. Monitor for confirmation.`;
      } else {
        return `Weak bearish signal (${score}/100). Limited momentum: ${momentum < 0 ? '' : '+'}${momentum.toFixed(0)}. Exercise caution.`;
      }
    } else {
      return `Neutral signal (${score}/100). Market in consolidation. Wait for breakout/breakdown.`;
    }
  };

  const signalExplanation = getSignalExplanation();

  if (!target || !stopLoss) {
    return null;
  }

  const totalPercent = riskPercent + rewardPercent;
  const riskBarWidth = totalPercent > 0 ? (riskPercent / totalPercent) * 100 : 0;
  const rewardBarWidth = totalPercent > 0 ? (rewardPercent / totalPercent) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Trading Signal</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Show Less</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Show Details</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Compact Signal Summary - Always Visible */}
      <div className="mb-3">
        <p className="text-sm text-text-secondary">{signalExplanation}</p>
      </div>

      {/* Entry, Target, Stop Loss - Always Visible */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 bg-white/[0.02] rounded">
          <BarChart3 className="w-4 h-4 text-text-primary mx-auto mb-1" />
          <div className="text-xs text-text-muted mb-0.5">ENTRY</div>
          <div className="text-sm font-bold font-mono">${entry.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 bg-white/[0.02] rounded">
          <Target className="w-4 h-4 text-success mx-auto mb-1" />
          <div className="text-xs text-text-muted mb-0.5">TARGET</div>
          <div className="text-sm font-bold font-mono text-success">${target.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 bg-white/[0.02] rounded">
          <Shield className="w-4 h-4 text-error mx-auto mb-1" />
          <div className="text-xs text-text-muted mb-0.5">STOP LOSS</div>
          <div className="text-sm font-bold font-mono text-error">${stopLoss.toFixed(2)}</div>
        </div>
      </div>

      {/* Risk / Reward - Always Visible (Compact) */}
      {riskRewardRatio && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Risk / Reward</span>
            <span className="text-sm font-bold">{riskRewardRatio}</span>
          </div>
          <div className="relative h-6 bg-white/[0.05] rounded overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-error/30"
              style={{ width: `${riskBarWidth}%` }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 bg-success/30"
              style={{ width: `${rewardBarWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {structuralBias && (
            <div className="p-3 bg-white/[0.02] rounded border border-border">
              <p className="text-xs text-text-secondary leading-relaxed">{structuralBias}</p>
            </div>
          )}
          <div className="text-xs text-text-muted text-center">
            AI-generated analysis for informational purposes only. Not financial advice.
          </div>
        </div>
      )}
    </div>
  );
}

