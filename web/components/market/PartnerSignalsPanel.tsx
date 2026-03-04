'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { getPartnerSignals, generatePartnerSignals, PartnerSignal } from '@/lib/api';
import { toast } from 'sonner';

export function PartnerSignalsPanel() {
  const [signals, setSignals] = useState<PartnerSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadSignals();
  }, []);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const data = await getPartnerSignals(5);
      setSignals(data);
    } catch (error) {
      console.error('Failed to load signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const newSignals = await generatePartnerSignals(5);
      setSignals(newSignals);
      toast.success('Signals generated successfully');
    } catch (error) {
      console.error('Failed to generate signals:', error);
      toast.error('Failed to generate signals');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (signalText: string, signalId: string) => {
    try {
      await navigator.clipboard.writeText(signalText);
      setCopiedId(signalId);
      toast.success('Signal copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy signal');
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Partner Signals</h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-accent-primary hover:text-accent-soft transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Generate
        </button>
      </div>

      {loading && signals.length === 0 ? (
        <div className="text-center py-8 text-text-muted">Loading signals...</div>
      ) : signals.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No signals available. Click Generate to create new signals.
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="p-4 bg-white/[0.02] border border-border rounded-lg"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1">
                    {signal.assetDisplayName}
                  </div>
                  <div className="text-xs text-text-muted mb-2">
                    Score: {signal.score.toFixed(0)}/100
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(signal.signalText, signal.id)}
                  className="flex-shrink-0 p-2 hover:bg-white/[0.05] rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedId === signal.id ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-text-muted" />
                  )}
                </button>
              </div>
              <div className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                {signal.signalText}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

