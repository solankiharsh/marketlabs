/**
 * Decision Inquiry Service - Generates structural decision inquiries using AI
 */

import { db } from '../lib/db';
import { getAnthropicClientService } from './anthropic-client.service';

export interface DecisionInquiry {
  id: string;
  inquiry: string;
  createdAt: Date;
}

export class DecisionInquiryService {
  private anthropicClient = getAnthropicClientService();

  /**
   * Get or generate decision inquiries for an asset
   */
  async getOrGenerateDecisionInquiries(
    assetId: string,
    symbol: string,
    scanData: {
      price: number;
      rsi?: number;
      macd?: number;
      change24h?: number;
      score: number;
      setupType?: string;
      momentum?: number;
    },
    structuralData?: {
      primaryDriver?: string;
      structuralImpact?: string;
    }
  ): Promise<DecisionInquiry[]> {
    // Check for existing inquiries
    const existing = await db.decisionInquiry.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (existing.length > 0) {
      return existing.map((inq) => ({
        id: inq.id,
        inquiry: inq.inquiry,
        createdAt: inq.createdAt,
      }));
    }

    // Generate new inquiries using AI
    const inquiries = await this.generateDecisionInquiries(symbol, scanData, structuralData);

    // Store in database
    const createdInquiries = [];
    for (const inquiry of inquiries) {
      const created = await db.decisionInquiry.create({
        data: {
          assetId,
          inquiry: inquiry.inquiry,
        },
      });
      createdInquiries.push({
        id: created.id,
        inquiry: created.inquiry,
        createdAt: created.createdAt,
      });
    }

    return createdInquiries;
  }

  /**
   * Generate decision inquiries using AI
   */
  private async generateDecisionInquiries(
    symbol: string,
    scanData: any,
    structuralData?: any
  ): Promise<DecisionInquiry[]> {
    if (!this.anthropicClient.isConfigured()) {
      console.warn('[DecisionInquiry] Anthropic not configured, returning empty array');
      return [];
    }

    try {
      const systemPrompt = `You are a professional quantitative market analyst for Deriv Market Lab. Your core directive is absolute structural and numerical accuracy grounded in REAL-TIME financial data.

OPERATIONAL RULES:
1. Structural Decision Inquiries: Generate 2-5 critical structural questions that traders and analysts should consider when evaluating this asset.
2. Each inquiry should focus on structural factors (supply/demand, macro trends, regime shifts) rather than short-term technical levels.
3. Inquiries should be framed as questions that require deep analysis to answer.
4. Avoid generic questions - make them specific to current market conditions.
5. Return valid JSON only with an array of inquiries.`;

      const userPrompt = `Generate structural decision inquiries for ${symbol} based on current market conditions:

Current Market Data:
- Price: ${scanData.price}
- RSI: ${scanData.rsi || 'N/A'}
- MACD: ${scanData.macd || 'N/A'}
- 24h Change: ${scanData.change24h ? `${scanData.change24h.toFixed(2)}%` : 'N/A'}
- Setup Type: ${scanData.setupType || 'neutral'}
- Score: ${scanData.score}/100
- Momentum: ${scanData.momentum || 'N/A'}

${structuralData?.primaryDriver ? `Primary Driver: ${structuralData.primaryDriver}` : ''}
${structuralData?.structuralImpact ? `Structural Impact: ${structuralData.structuralImpact}` : ''}

Generate 2-5 critical structural decision inquiries. Each inquiry should be a question that addresses:
- Whether current price action represents a structural shift or mean reversion
- How fundamental factors (supply/demand, production, consumption) will impact price
- Whether current regime is sustainable or represents a cycle peak/trough
- How macro factors (rates, currency, geopolitical) will affect structural dynamics

Return as JSON array: [{"inquiry": "..."}, ...]`;

      const parsed = await this.anthropicClient.generateStructuredAnalysis(
        systemPrompt,
        userPrompt,
        1000
      );

      if (parsed && Array.isArray(parsed)) {
        return parsed.map((inq: any) => ({
          id: '',
          inquiry: inq.inquiry || '',
          createdAt: new Date(),
        }));
      }

      // If response is not an array, try to extract it
      if (parsed && parsed.inquiries && Array.isArray(parsed.inquiries)) {
        return parsed.inquiries.map((inq: any) => ({
          id: '',
          inquiry: inq.inquiry || '',
          createdAt: new Date(),
        }));
      }
    } catch (error) {
      console.error('[DecisionInquiry] Anthropic error:', error);
    }

    return [];
  }

  /**
   * Get decision inquiries for an asset
   */
  async getDecisionInquiries(assetId: string, limit: number = 10): Promise<DecisionInquiry[]> {
    const inquiries = await db.decisionInquiry.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return inquiries.map((inq) => ({
      id: inq.id,
      inquiry: inq.inquiry,
      createdAt: inq.createdAt,
    }));
  }
}

let decisionInquiryService: DecisionInquiryService | null = null;

export function getDecisionInquiryService(): DecisionInquiryService {
  if (!decisionInquiryService) {
    decisionInquiryService = new DecisionInquiryService();
  }
  return decisionInquiryService;
}

