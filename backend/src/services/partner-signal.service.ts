/**
 * Partner Signal Service - Generate Telegram-ready signals for top-ranked setups
 */

import { db } from '../lib/db';
import { getMarketScannerService } from './market-scanner.service';

export interface PartnerSignal {
  id: string;
  assetSymbol: string;
  assetDisplayName: string;
  signalText: string;
  score: number;
  timestamp: Date;
}

/**
 * Generate Telegram-ready signal text
 */
function generateSignalText(
  symbol: string,
  displayName: string,
  score: number,
  setupType: string,
  price: number,
  change24h?: number
): string {
  const emoji = setupType === 'bullish' ? '🟢' : setupType === 'bearish' ? '🔴' : '⚪';
  const direction = setupType === 'bullish' ? 'LONG' : setupType === 'bearish' ? 'SHORT' : 'NEUTRAL';
  
  const changeText = change24h !== undefined
    ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`
    : 'N/A';

  return `${emoji} ${direction} ${displayName} (${symbol})
Score: ${score.toFixed(0)}/100
Price: ${price.toFixed(4)}
24h: ${changeText}

#Deriv #Trading #${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
}

/**
 * Generate signals for top-ranked setups
 */
export async function generatePartnerSignals(limit: number = 5): Promise<PartnerSignal[]> {
  const scanner = getMarketScannerService();
  const latestScans = await scanner.getLatestScans(limit * 2); // Get more to filter

  // Filter for high-score setups (score >= 60 for bullish, score <= 40 for bearish)
  const topSetups = latestScans.filter((scan: any) => {
    const score = Number(scan.score);
    return (score >= 60 && scan.setupType === 'bullish') || 
           (score <= 40 && scan.setupType === 'bearish');
  }).slice(0, limit);

  const signals: PartnerSignal[] = [];

  for (const scan of topSetups) {
    const signalText = generateSignalText(
      scan.asset.symbol,
      scan.asset.displayName,
      Number(scan.score),
      scan.setupType || 'neutral',
      Number(scan.price),
      scan.change24h ? Number(scan.change24h) : undefined
    );

    // Store signal in database
    const partnerSignal = await db.partnerSignal.create({
      data: {
        assetId: scan.assetId,
        scanId: scan.id,
        signalText,
        score: scan.score,
        sent: false,
      },
    });

    signals.push({
      id: partnerSignal.id,
      assetSymbol: scan.asset.symbol,
      assetDisplayName: scan.asset.displayName,
      signalText,
      score: Number(scan.score),
      timestamp: partnerSignal.timestamp,
    });
  }

  return signals;
}

/**
 * Get recent partner signals
 */
export async function getRecentSignals(limit: number = 10): Promise<PartnerSignal[]> {
  const signals = await db.partnerSignal.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    include: {
      asset: true,
    },
  });

  return signals.map((signal) => ({
    id: signal.id,
    assetSymbol: signal.asset.symbol,
    assetDisplayName: signal.asset.displayName,
    signalText: signal.signalText,
    score: Number(signal.score),
    timestamp: signal.timestamp,
  }));
}

