/**
 * Structural Analysis Service - Extracts structural drivers and generates strategic bias
 */

import { db } from '../lib/db';
import { getAnthropicClientService } from './anthropic-client.service';

export interface StructuralAnalysisData {
  primaryDriver: string;
  structuralImpact: string;
  marketNoise: string;
  strategicBias: string;
  acceptanceLevel?: number;
  breachLevel?: number;
}

export class StructuralAnalysisService {
  private anthropicClient = getAnthropicClientService();

  /**
   * Generate or get structural analysis for an asset
   */
  async getOrGenerateStructuralAnalysis(
    assetId: string,
    scanId: string,
    scanData: {
      price: number;
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
    }
  ): Promise<StructuralAnalysisData | null> {
    // Check for existing analysis
    const existing = await db.structuralAnalysis.findFirst({
      where: {
        assetId,
        scanId,
      },
    });

    if (existing) {
      return {
        primaryDriver: existing.primaryDriver,
        structuralImpact: existing.structuralImpact,
        marketNoise: existing.marketNoise,
        strategicBias: existing.strategicBias,
        acceptanceLevel: existing.acceptanceLevel ? Number(existing.acceptanceLevel) : undefined,
        breachLevel: existing.breachLevel ? Number(existing.breachLevel) : undefined,
      };
    }

    // Generate new analysis
    const analysis = await this.generateStructuralAnalysis(scanData);

    if (!analysis) {
      // Return null if AI analysis is not available
      return null;
    }

    // Calculate acceptance and breach levels
    const acceptanceLevel = this.calculateAcceptanceLevel(scanData);
    const breachLevel = this.calculateBreachLevel(scanData);

    // Store in database
    await db.structuralAnalysis.create({
      data: {
        assetId,
        scanId,
        primaryDriver: analysis.primaryDriver,
        structuralImpact: analysis.structuralImpact,
        marketNoise: analysis.marketNoise,
        strategicBias: analysis.strategicBias,
        acceptanceLevel: acceptanceLevel || null,
        breachLevel: breachLevel || null,
      },
    });

    return {
      ...analysis,
      acceptanceLevel,
      breachLevel,
    };
  }

  /**
   * Generate structural analysis using AI
   */
  private async generateStructuralAnalysis(scanData: any): Promise<Omit<StructuralAnalysisData, 'acceptanceLevel' | 'breachLevel'> | null> {
    if (!this.anthropicClient.isConfigured()) {
      console.warn('[StructuralAnalysis] Anthropic not configured, returning null');
      return null;
    }

    try {
      const systemPrompt = `You are a professional quantitative market analyst for Deriv Market Lab. Your core directive is absolute structural and numerical accuracy grounded in REAL-TIME financial data.

OPERATIONAL RULES:
1. Temporal Accuracy: Use the CURRENT spot price and today's date from the provided market data.
2. Numerical Precision: Use exact values from the provided data (prices, ratios, 52-week highs/lows).
3. Decision Framing: Never give advice. Frame levels as "Acceptance above X validates Y" or "Breach of Z shifts bias to A".
4. Signal vs Noise: Strictly distinguish Signal from Noise. Explicitly state the primary driver, its immediate market implication, and secondary noise to ignore.
5. Absolute Pricing: All mentioned levels MUST reflect the current spot market reality from the provided data.

Return valid JSON only with keys: primaryDriver, structuralImpact, marketNoise, strategicBias`;

      const userPrompt = `Analyze the structural drivers for this market asset:
- Price: ${scanData.price}
- RSI: ${scanData.rsi || 'N/A'}
- MACD: ${scanData.macd || 'N/A'} (Signal: ${scanData.macdSignal || 'N/A'})
- SMA20: ${scanData.sma20 || 'N/A'}
- EMA50: ${scanData.ema50 || 'N/A'}
- Setup Type: ${scanData.setupType || 'neutral'}
- Score: ${scanData.score}/100
- Momentum: ${scanData.momentum || 'N/A'}

Provide a structural analysis with:
1. Primary Driver: The main structural factor driving price (1-2 sentences)
2. Structural Impact: How this driver shifts the structural floor/ceiling (1-2 sentences)
3. Market Noise: Non-structural factors causing daily fluctuations (1-2 sentences)
4. Strategic Bias: Trading bias with key levels (2-3 sentences)

Format as JSON with keys: primaryDriver, structuralImpact, marketNoise, strategicBias`;

      const parsed = await this.anthropicClient.generateStructuredAnalysis(
        systemPrompt,
        userPrompt,
        800
      );

      if (parsed) {
        return {
          primaryDriver: parsed.primaryDriver || '',
          structuralImpact: parsed.structuralImpact || '',
          marketNoise: parsed.marketNoise || '',
          strategicBias: parsed.strategicBias || '',
        };
      }
    } catch (error) {
      console.error('[StructuralAnalysis] Anthropic error:', error);
    }

    return null;
  }

  /**
   * Calculate acceptance level (resistance/breakout level)
   */
  private calculateAcceptanceLevel(scanData: any): number | undefined {
    if (!scanData.price) return undefined;

    // Use Bollinger Band upper or SMA20 + ATR as acceptance level
    if (scanData.bbUpper) {
      return scanData.bbUpper * 1.02; // 2% above upper band
    }
    if (scanData.sma20 && scanData.atr) {
      return scanData.sma20 + scanData.atr * 2;
    }
    if (scanData.sma20) {
      return scanData.sma20 * 1.05; // 5% above SMA20
    }

    return scanData.price * 1.1; // Default: 10% above current price
  }

  /**
   * Calculate breach level (support/breakdown level)
   */
  private calculateBreachLevel(scanData: any): number | undefined {
    if (!scanData.price) return undefined;

    // Use Bollinger Band lower or SMA20 - ATR as breach level
    if (scanData.bbLower) {
      return scanData.bbLower * 0.98; // 2% below lower band
    }
    if (scanData.sma20 && scanData.atr) {
      return scanData.sma20 - scanData.atr * 2;
    }
    if (scanData.sma20) {
      return scanData.sma20 * 0.95; // 5% below SMA20
    }

    return scanData.price * 0.9; // Default: 10% below current price
  }
}

let structuralAnalysisService: StructuralAnalysisService | null = null;

export function getStructuralAnalysisService(): StructuralAnalysisService {
  if (!structuralAnalysisService) {
    structuralAnalysisService = new StructuralAnalysisService();
  }
  return structuralAnalysisService;
}

