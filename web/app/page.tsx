'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { getMarketRankings, triggerScan, getPatterns, getSupportResistance } from '@/lib/api';
import { IndicatorTable } from '@/components/market/IndicatorTable';
import { PartnerSignalsPanel } from '@/components/market/PartnerSignalsPanel';
import { ScanJobStatus } from '@/components/market/ScanJobStatus';
import { AcumenSummary } from '@/components/market/AcumenSummary';
import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanJobId, setScanJobId] = useState<string | null>(null);

  useEffect(() => {
    loadRankings();
    // Refresh every 30 seconds
    const interval = setInterval(loadRankings, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const data = await getMarketRankings(25);
      console.log('[HomePage] Loaded rankings:', data);
      setRankings(data || []);
    } catch (error: any) {
      console.error('Failed to load rankings:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array on error to show empty state
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-white/[0.08] px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-accent-primary" />
            <h1 className="text-xl font-display font-bold">MarketLabs</h1>
          </div>
          <div className="text-sm text-text-muted">
            Market Intelligence Platform
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">Market Command Centre</h2>
          <p className="text-sm sm:text-base text-text-muted">
            Proactive scanning of 20+ Deriv assets with ranked setup detection
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Total Assets</div>
            <div className="text-2xl font-bold">{rankings.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Bullish Setups</div>
            <div className="text-2xl font-bold text-success">
              {rankings.filter(r => r.setupType === 'bullish').length}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Bearish Setups</div>
            <div className="text-2xl font-bold text-error">
              {rankings.filter(r => r.setupType === 'bearish').length}
            </div>
          </div>
        </div>

        {/* Manual Scan Trigger */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Market Scanner</h3>
              <p className="text-sm text-text-muted">
                {rankings.length === 0 
                  ? 'No market data available yet. Run a scan to populate data.'
                  : `Currently tracking ${rankings.length} asset${rankings.length !== 1 ? 's' : ''}. Run a scan to update or add more assets.`
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              {scanJobId ? (
                <ScanJobStatus
                  jobId={scanJobId}
                  onComplete={() => {
                    setScanJobId(null);
                    setTimeout(() => loadRankings(), 2000);
                  }}
                  onError={() => {
                    setScanJobId(null);
                  }}
                />
              ) : (
                <button
                  onClick={async () => {
                    try {
                      toast.info('Starting market scan...');
                      const result = await triggerScan();
                      setScanJobId(result.jobId);
                    } catch (error: any) {
                      console.error('Failed to trigger scan:', error);
                      toast.error('Scan failed: ' + (error.response?.data?.error?.message || error.message));
                    }
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary font-semibold rounded hover:bg-accent-primary/20 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" />
                  Trigger Market Scan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Acumen Analysis Preview */}
        {rankings.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent-primary" />
              <h3 className="text-xl font-semibold">Analysis Overview</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rankings.map((scan) => (
                <AcumenSummary
                  key={scan.id}
                  symbol={scan.asset?.symbol || scan.asset?.symbol || ''}
                  displayName={scan.asset?.displayName || scan.asset?.symbol || 'Unknown'}
                  overallConfidence={scan.overallConfidence}
                  signalStrength={scan.signalStrength as any}
                  patternCount={scan.patternCount || 0}
                  hasSRLevels={scan.hasSRLevels || false}
                  hasAIAnalysis={scan.hasAIAnalysis || false}
                  score={scan.score}
                  setupType={scan.setupType}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Rankings Table */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Ranked Opportunities</h3>
                <button
                  onClick={loadRankings}
                  disabled={loading}
                  className="text-sm text-accent-primary hover:text-accent-soft transition-colors"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <IndicatorTable scans={rankings} loading={loading} />
            </div>
          </div>

          {/* Partner Signals */}
          <div className="lg:col-span-1">
            <PartnerSignalsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

