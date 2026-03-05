'use strict';

// Legacy types / stubs for unused MarketLabs components (kept for reference / type-checking).

export interface MarketAsset {
  id: string;
  symbol: string;
  displayName: string;
  category: string;
  active: boolean;
}

export interface MarketScan {
  id: string;
  assetId: string;
  timestamp: string;
  price: number;
  change24h?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  sma20?: number;
  ema50?: number;
  bbUpper?: number;
  bbLower?: number;
  adx?: number;
  atr?: number;
  score: number;
  setupType?: string;
  momentum?: number;
  asset: MarketAsset;
  rank?: number;
  aiSummary?: string;
}

export interface ScanJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalAssets?: number;
  scannedAssets: number;
  results?: { scanned: number; total: number; results: unknown[] };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PartnerSignal {
  id: string;
  assetSymbol: string;
  assetDisplayName: string;
  signalText: string;
  score: number;
  timestamp: string;
}

export interface AIAnalysis {
  analysisType: 'pattern_review' | 'comprehensive';
  model: string;
  confidence?: number;
  analysis: string;
  entryStrategy?: string;
  exitStrategy?: string;
}

export interface DetectedPattern {
  id: string;
  patternType: 'chart' | 'candlestick';
  patternName: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  detectedAt: string;
  metadata?: unknown;
}

export interface SupportResistanceLevel {
  id: string;
  level: number;
  type: 'support' | 'resistance';
  strength: number;
  proximity: number;
  detectedAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url?: string;
  content?: string;
  publishedAt: string;
  fetchedAt: string;
}

export async function getScanJobStatus(_jobId: string): Promise<ScanJob> {
  return Promise.reject(new Error('Scan jobs not available with Zing backend'));
}

export async function getPartnerSignals(_limit?: number): Promise<PartnerSignal[]> {
  return [];
}

export async function generatePartnerSignals(_limit?: number): Promise<PartnerSignal[]> {
  return Promise.reject(new Error('Partner signals not available with Zing backend'));
}

export async function getNewsFeed(
  _symbol: string,
  _limit?: number,
  _sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed',
  _hours?: number,
  _refresh?: boolean
): Promise<NewsArticle[]> {
  return [];
}
