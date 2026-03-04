'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface SignalExtractionData {
  primaryDriver: string;
  structuralImpact: string;
  marketNoise: string;
}

interface SignalExtractionProps {
  data: SignalExtractionData;
}

export function SignalExtraction({ data }: SignalExtractionProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Grounded Signal Extraction</h3>

      <div className="space-y-4">
        {/* The Signal (Primary Driver) */}
        <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-text-primary">The Signal (Primary Driver)</h4>
            <TrendingUp className="w-4 h-4 text-accent-primary" />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{data.primaryDriver}</p>
        </div>

        {/* Structural Impact */}
        <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-text-primary">Structural Impact</h4>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{data.structuralImpact}</p>
        </div>

        {/* Market Noise */}
        <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-text-primary">Market Noise (Non-Structural)</h4>
            <Minus className="w-4 h-4 text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{data.marketNoise}</p>
        </div>
      </div>
    </div>
  );
}

