'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  getAssetDetails,
  getMarketScans,
  MarketScan,
  getVitalityStats,
  getTimeframeAnalysis,
  getStructuralAnalysis,
  getDecisionInquiries,
  getRegimeAnalogies,
  getNewsFeed,
  getPatterns,
  getSupportResistance,
  getAIAnalysis,
  VitalityStats,
  TimeframeAnalysis,
  StructuralAnalysis,
  DecisionInquiry,
  RegimeAnalogy,
  NewsArticle,
  DetectedPattern,
  SupportResistanceLevel,
  AIAnalysis,
} from '@/lib/api';
import { PriceChart } from '@/components/market/PriceChart';
import { TechnicalSummary } from '@/components/market/TechnicalSummary';
import { VitalityStats as VitalityStatsComponent } from '@/components/market/VitalityStats';
import { MultiTimeframeFramework } from '@/components/market/MultiTimeframeFramework';
import { SignalExtraction } from '@/components/market/SignalExtraction';
import { StrategicBias } from '@/components/market/StrategicBias';
import { DecisionInquiries } from '@/components/market/DecisionInquiries';
import { RegimeAnalogies } from '@/components/market/RegimeAnalogies';
import { NewsFeed } from '@/components/market/NewsFeed';
import { PatternDetection } from '@/components/market/PatternDetection';
import { SupportResistance } from '@/components/market/SupportResistance';
import { AIAnalysis as AIAnalysisComponent } from '@/components/market/AIAnalysis';
import { ConfidenceScoring } from '@/components/market/ConfidenceScoring';
import { TechnicalAnalysis } from '@/components/market/TechnicalAnalysis';

export default function AssetDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [asset, setAsset] = useState<any>(null);
  const [latestScan, setLatestScan] = useState<MarketScan | null>(null);
  const [allScans, setAllScans] = useState<MarketScan[]>([]);
  const [vitalityStats, setVitalityStats] = useState<VitalityStats | null>(null);
  const [timeframeAnalyses, setTimeframeAnalyses] = useState<TimeframeAnalysis[]>([]);
  const [structuralAnalysis, setStructuralAnalysis] = useState<StructuralAnalysis | null>(null);
  const [decisionInquiries, setDecisionInquiries] = useState<DecisionInquiry[]>([]);
  const [regimeAnalogies, setRegimeAnalogies] = useState<RegimeAnalogy[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [srLevels, setSrLevels] = useState<SupportResistanceLevel[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      loadAssetDetails();
    }
  }, [symbol]);

  const loadAssetDetails = async () => {
    try {
      setLoading(true);
      const [assetData, scansData] = await Promise.all([
        getAssetDetails(symbol),
        getMarketScans(100),
      ]);
      setAsset(assetData.asset);
      setLatestScan(assetData.latestScan);
      // Filter scans for this symbol (handle cases where asset might be missing)
      setAllScans(scansData.filter((s) => s.asset?.symbol === symbol || !s.asset));

      // Load enhanced analysis data
      if (assetData.asset) {
        const [
          vitality,
          timeframes,
          structural,
          inquiries,
          regimes,
          news,
          detectedPatterns,
          supportResistance,
          aiAnalysisData,
        ] = await Promise.all([
          getVitalityStats(symbol).catch(() => null),
          getTimeframeAnalysis(symbol).catch(() => []),
          getStructuralAnalysis(symbol).catch(() => null),
          getDecisionInquiries(symbol).catch(() => []),
          getRegimeAnalogies(symbol).catch(() => []),
          getNewsFeed(symbol, 10).catch(() => []),
          getPatterns(symbol).catch(() => []),
          getSupportResistance(symbol).catch(() => []),
          getAIAnalysis(symbol, 'comprehensive').catch(() => null),
        ]);

        setVitalityStats(vitality);
        setTimeframeAnalyses(timeframes);
        setStructuralAnalysis(structural);
        setDecisionInquiries(inquiries);
        setRegimeAnalogies(regimes);
        setNewsArticles(news);
        setPatterns(detectedPatterns);
        setSrLevels(supportResistance);
        setAiAnalysis(aiAnalysisData);
      }
    } catch (error) {
      console.error('Failed to load asset details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
          <div className="text-text-muted">Loading asset details...</div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-text-muted mb-4">Asset not found</div>
          <Link href="/" className="text-accent-primary hover:text-accent-soft">
            Back to Market
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = latestScan ? Number(latestScan.price) : 0;

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-white/[0.08] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="p-2 hover:bg-white/[0.05] rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold">{asset.displayName}</h1>
            <div className="text-sm text-text-muted">{asset.symbol}</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Top: Vitality Stats (full width) */}
        {vitalityStats && latestScan && (
          <VitalityStatsComponent
            currentPrice={currentPrice}
            setupType={latestScan.setupType as any}
            stats={vitalityStats}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Chart + Analysis (2/3 width) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Price Chart */}
            <PriceChart symbol={symbol} scans={allScans} height={600} showSupportResistance={true} />

            {/* Multi-Timeframe Decision Framework */}
            {timeframeAnalyses.length > 0 && (
              <MultiTimeframeFramework analyses={timeframeAnalyses} />
            )}

            {/* Grounded Signal Extraction */}
            {structuralAnalysis && (
              <SignalExtraction
                data={{
                  primaryDriver: structuralAnalysis.primaryDriver,
                  structuralImpact: structuralAnalysis.structuralImpact,
                  marketNoise: structuralAnalysis.marketNoise,
                }}
              />
            )}

            {/* Grounded Strategic Bias */}
            {structuralAnalysis && latestScan && (
              <StrategicBias
                data={{
                  strategicBias: structuralAnalysis.strategicBias,
                  acceptanceLevel: structuralAnalysis.acceptanceLevel,
                  breachLevel: structuralAnalysis.breachLevel,
                  currentPrice: currentPrice,
                }}
              />
            )}

            {/* Pattern Detection */}
            {patterns.length > 0 && <PatternDetection patterns={patterns} />}

            {/* AI Analysis */}
            {aiAnalysis && <AIAnalysisComponent analysis={aiAnalysis} />}

            {/* Confidence Scoring */}
            {latestScan && (
              <ConfidenceScoring
                patternConfidence={latestScan.patternConfidence}
                volumeConfidence={latestScan.volumeConfidence}
                trendConfidence={latestScan.trendConfidence}
                indicatorConfidence={latestScan.indicatorConfidence}
                overallConfidence={latestScan.overallConfidence}
                signalStrength={latestScan.signalStrength as any}
              />
            )}
          </div>

          {/* Right Column: Technical Summary + Support/Resistance + Decision Inquiries + Regime Analogies (1/3 width) */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {latestScan && <TechnicalSummary scan={latestScan} />}

            {/* Support & Resistance */}
            {srLevels.length > 0 && (
              <SupportResistance levels={srLevels} currentPrice={currentPrice} />
            )}

            {/* Decision Inquiries */}
            {decisionInquiries.length > 0 && (
              <DecisionInquiries inquiries={decisionInquiries} />
            )}

            {/* Regime Analogies */}
            {regimeAnalogies.length > 0 && (
              <RegimeAnalogies analogies={regimeAnalogies} />
            )}
          </div>
        </div>

        {/* Bottom: Technical Analysis (full width) */}
        {latestScan && (
          <TechnicalAnalysis scan={latestScan} />
        )}

        {/* Bottom: News Feed (full width) */}
        <NewsFeed
          articles={newsArticles}
          loading={false}
          symbol={symbol}
          onRefresh={() => {
            // Reload news after refresh
            getNewsFeed(symbol, 10)
              .then(setNewsArticles)
              .catch(console.error);
          }}
        />
      </main>
    </div>
  );
}
