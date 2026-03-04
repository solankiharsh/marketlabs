'use client';

import { History, TrendingUp } from 'lucide-react';

export interface RegimeAnalogy {
  id: string;
  period: string;
  description: string;
  similarity: string;
  createdAt?: Date | string;
}

interface RegimeAnalogiesProps {
  analogies: RegimeAnalogy[];
}

export function RegimeAnalogies({ analogies }: RegimeAnalogiesProps) {
  if (analogies.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Historical Regime Analogies</h3>
        <div className="text-center py-8 text-text-muted">
          No historical analogies available at this time.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-accent-primary" />
        <h3 className="text-xl font-semibold">Historical Regime Analogies</h3>
      </div>

      <div className="mb-2 text-sm text-text-muted">
        Parallels Identified: {analogies.length}
      </div>

      <div className="space-y-4">
        {analogies.map((analogy) => (
          <div
            key={analogy.id}
            className="p-4 bg-white/[0.02] border border-border rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-accent-primary">{analogy.period}</span>
              <TrendingUp className="w-4 h-4 text-accent-primary" />
            </div>
            <p className="text-sm text-text-secondary mb-2">{analogy.description}</p>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-semibold text-text-muted mb-1">Regime Similarity:</div>
              <p className="text-sm text-text-secondary">{analogy.similarity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

