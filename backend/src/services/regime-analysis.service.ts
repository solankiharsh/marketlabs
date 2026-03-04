/**
 * Regime Analysis Service - Matches current conditions to historical patterns
 */

import { db } from '../lib/db';
import { getAnthropicClientService } from './anthropic-client.service';

export interface RegimeAnalogy {
  id: string;
  period: string;
  description: string;
  similarity: string;
  createdAt: Date;
}

export class RegimeAnalysisService {
  private anthropicClient = getAnthropicClientService();

  /**
   * Get or generate regime analogies for an asset
   */
  async getOrGenerateRegimeAnalogies(
    assetId: string,
    symbol: string,
    scanData: {
      price: number;
      rsi?: number;
      macd?: number;
      change24h?: number;
      score: number;
      setupType?: string;
    }
  ): Promise<RegimeAnalogy[]> {
    // Check for existing analogies
    const existing = await db.regimeAnalogy.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (existing.length > 0) {
      return existing.map((a) => ({
        id: a.id,
        period: a.period,
        description: a.description,
        similarity: a.similarity,
        createdAt: a.createdAt,
      }));
    }

    // Generate new analogies based on current conditions using AI
    const analogies = await this.generateHistoricalRegimes(scanData, symbol);

    // Store in database
    for (const analogy of analogies) {
      await db.regimeAnalogy.create({
        data: {
          assetId,
          period: analogy.period,
          description: analogy.description,
          similarity: analogy.similarity,
        },
      });
    }

    return analogies;
  }

  /**
   * Generate historical regime analogies using AI
   */
  private async generateHistoricalRegimes(scanData: any, symbol: string): Promise<RegimeAnalogy[]> {
    if (!this.anthropicClient.isConfigured()) {
      console.warn('[RegimeAnalysis] Anthropic not configured, returning empty array');
      return [];
    }

    try {
      const systemPrompt = `You are a professional quantitative market analyst for Deriv Market Lab. Your core directive is absolute structural and numerical accuracy grounded in REAL-TIME financial data.

OPERATIONAL RULES:
1. Historical Regime Analogies: Provide up to 5 historical parallels where price action or macro drivers align with current state. If no high-fidelity structural match exists, return an empty array. Do not hallucinate parallels.
2. Only include historical analogies if there are genuine high-fidelity structural parallels.
3. Each analogy must include: period (e.g., "1979-1980", "April 2011"), description (what happened), and similarity (why it's similar to current conditions).
4. Return valid JSON only with an array of analogies.`;

      const userPrompt = `Analyze current market conditions for ${symbol} and identify historical regime analogies:
- Current price: ${scanData.price}
- RSI: ${scanData.rsi || 'N/A'}
- MACD: ${scanData.macd || 'N/A'}
- 24h Change: ${scanData.change24h ? `${scanData.change24h.toFixed(2)}%` : 'N/A'}
- Setup Type: ${scanData.setupType || 'neutral'}
- Score: ${scanData.score}/100

Identify up to 5 historical periods where price action, technical indicators, or macro drivers show high-fidelity structural parallels to current conditions. For each analogy, provide:
- period: The historical period (e.g., "1979-1980", "April 2011", "February 2021")
- description: What happened during that period (1-2 sentences)
- similarity: Why it's similar to current conditions (1-2 sentences)

Return as JSON array: [{"period": "...", "description": "...", "similarity": "..."}, ...]
If no high-fidelity parallels exist, return empty array [].`;

      const parsed = await this.anthropicClient.generateStructuredAnalysis(
        systemPrompt,
        userPrompt,
        1500
      );

      if (parsed && Array.isArray(parsed)) {
        return parsed.map((a: any) => ({
          id: '',
          period: a.period || 'Unknown Period',
          description: a.description || '',
          similarity: a.similarity || '',
          createdAt: new Date(),
        }));
      }

      // If response is not an array, try to extract it
      if (parsed && parsed.analogies && Array.isArray(parsed.analogies)) {
        return parsed.analogies.map((a: any) => ({
          id: '',
          period: a.period || 'Unknown Period',
          description: a.description || '',
          similarity: a.similarity || '',
          createdAt: new Date(),
        }));
      }
    } catch (error) {
      console.error('[RegimeAnalysis] Anthropic error:', error);
    }

    return [];
  }

  /**
   * Get regime analogies for an asset
   */
  async getRegimeAnalogies(assetId: string, limit: number = 5): Promise<RegimeAnalogy[]> {
    const analogies = await db.regimeAnalogy.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return analogies.map((a) => ({
      id: a.id,
      period: a.period,
      description: a.description,
      similarity: a.similarity,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Add a custom regime analogy
   */
  async addRegimeAnalogy(
    assetId: string,
    period: string,
    description: string,
    similarity: string
  ): Promise<RegimeAnalogy> {
    const analogy = await db.regimeAnalogy.create({
      data: {
        assetId,
        period,
        description,
        similarity,
      },
    });

    return {
      id: analogy.id,
      period: analogy.period,
      description: analogy.description,
      similarity: analogy.similarity,
      createdAt: analogy.createdAt,
    };
  }
}

let regimeAnalysisService: RegimeAnalysisService | null = null;

export function getRegimeAnalysisService(): RegimeAnalysisService {
  if (!regimeAnalysisService) {
    regimeAnalysisService = new RegimeAnalysisService();
  }
  return regimeAnalysisService;
}

