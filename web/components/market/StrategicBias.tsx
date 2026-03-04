'use client';

import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export interface StrategicBiasData {
  strategicBias: string;
  acceptanceLevel?: number;
  breachLevel?: number;
  currentPrice: number;
}

interface StrategicBiasProps {
  data: StrategicBiasData;
}

export function StrategicBias({ data }: StrategicBiasProps) {
  const { strategicBias, acceptanceLevel, breachLevel, currentPrice } = data;

  const getBiasDirection = () => {
    if (acceptanceLevel && currentPrice > acceptanceLevel * 0.95) {
      return 'bullish';
    }
    if (breachLevel && currentPrice < breachLevel * 1.05) {
      return 'bearish';
    }
    return 'neutral';
  };

  const biasDirection = getBiasDirection();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Grounded Strategic Bias</h3>

      <div className="space-y-4">
        {/* Strategic Bias Text */}
        <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {strategicBias}
          </p>
        </div>

        {/* Key Levels */}
        {(acceptanceLevel || breachLevel) && (
          <div className="space-y-3">
            {acceptanceLevel && (
              <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs font-semibold text-success">Acceptance Level</span>
                </div>
                <div className="text-lg font-bold font-mono text-success">
                  ${acceptanceLevel.toFixed(2)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {currentPrice >= acceptanceLevel * 0.95
                    ? 'Price is near acceptance level'
                    : `+${((acceptanceLevel - currentPrice) / currentPrice * 100).toFixed(1)}% to acceptance`}
                </div>
              </div>
            )}

            {breachLevel && (
              <div className="p-3 bg-error/5 border border-error/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-error" />
                  <span className="text-xs font-semibold text-error">Breach Level</span>
                </div>
                <div className="text-lg font-bold font-mono text-error">
                  ${breachLevel.toFixed(2)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {currentPrice <= breachLevel * 1.05
                    ? 'Price is near breach level'
                    : currentPrice > breachLevel
                    ? `${((currentPrice - breachLevel) / currentPrice * 100).toFixed(1)}% above breach level`
                    : `${((breachLevel - currentPrice) / currentPrice * 100).toFixed(1)}% to breach`}
                </div>
              </div>
            )}

            {/* Current Consolidation Zone */}
            {acceptanceLevel && breachLevel && (
              <div className="p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-accent-primary" />
                  <span className="text-xs font-semibold text-accent-primary">
                    Current Consolidation Zone
                  </span>
                </div>
                <div className="text-sm text-text-secondary">
                  Price is currently between ${breachLevel.toFixed(2)} and ${acceptanceLevel.toFixed(2)}
                </div>
                <div className="mt-2 h-2 bg-white/[0.05] rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-accent-primary z-10"
                    style={{
                      left: acceptanceLevel !== breachLevel
                        ? `${Math.max(0, Math.min(100, ((currentPrice - breachLevel) / (acceptanceLevel - breachLevel)) * 100))}%`
                        : '50%',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

