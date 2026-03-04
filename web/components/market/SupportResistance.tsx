'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { SupportResistanceLevel } from '@/lib/api';

interface SupportResistanceProps {
  levels: SupportResistanceLevel[];
  currentPrice: number;
}

export function SupportResistance({ levels, currentPrice }: SupportResistanceProps) {
  // Helper to convert Decimal/string/number to number
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object' && 'toString' in value) {
      const num = parseFloat(value.toString());
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  if (levels.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Support & Resistance</h3>
        <div className="text-center py-8 text-text-muted">
          No support/resistance levels detected at this time.
        </div>
      </div>
    );
  }

  const supportLevels = levels.filter(l => l.type === 'support').sort((a, b) => toNumber(b.level) - toNumber(a.level));
  const resistanceLevels = levels.filter(l => l.type === 'resistance').sort((a, b) => toNumber(a.level) - toNumber(b.level));

  const getStrengthColor = (strength: number) => {
    if (strength >= 3) return 'text-success';
    if (strength >= 2) return 'text-accent-primary';
    return 'text-text-muted';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Support & Resistance</h3>

      <div className="space-y-4">
        {/* Resistance Levels */}
        {resistanceLevels.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-error" />
              <h4 className="text-sm font-semibold">Resistance ({resistanceLevels.length})</h4>
            </div>
            <div className="space-y-2">
              {resistanceLevels.map((level) => (
                <div
                  key={level.id}
                  className="p-3 bg-error/5 border border-error/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-bold">${toNumber(level.level).toFixed(2)}</span>
                    <span className={`text-xs font-semibold ${getStrengthColor(level.strength)}`}>
                      {level.strength} touch{level.strength !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {toNumber(level.proximity).toFixed(2)}% above current price
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Price */}
        <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-center">
          <div className="text-xs text-text-muted mb-1">Current Price</div>
          <div className="text-lg font-bold font-mono">${currentPrice.toFixed(2)}</div>
        </div>

        {/* Support Levels */}
        {supportLevels.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-success" />
              <h4 className="text-sm font-semibold">Support ({supportLevels.length})</h4>
            </div>
            <div className="space-y-2">
              {supportLevels.map((level) => (
                <div
                  key={level.id}
                  className="p-3 bg-success/5 border border-success/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-bold">${toNumber(level.level).toFixed(2)}</span>
                    <span className={`text-xs font-semibold ${getStrengthColor(level.strength)}`}>
                      {level.strength} touch{level.strength !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {toNumber(level.proximity).toFixed(2)}% below current price
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

