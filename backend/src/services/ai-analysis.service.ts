/**
 * AI Analysis Service - Pattern review and comprehensive chart analysis
 */

import { db } from '../lib/db';
import { getOpenRouterService } from './openrouter.service';
import { DetectedPattern } from './pattern-detection.service';
import { DerivOHLCV } from '../types';

export interface AIAnalysisResult {
  analysisType: 'pattern_review' | 'comprehensive';
  model: string;
  confidence?: number;
  analysis: string;
  entryStrategy?: string;
  exitStrategy?: string;
}

export class AIAnalysisService {
  private openRouter = getOpenRouterService();

  /**
   * Generate or get AI analysis for a scan
   */
  async getOrGenerateAnalysis(
    assetId: string,
    scanId: string,
    analysisType: 'pattern_review' | 'comprehensive',
    data: {
      patterns?: DetectedPattern[];
      ohlcv: DerivOHLCV[];
      indicators: any;
      symbol: string;
    }
  ): Promise<AIAnalysisResult | null> {
    // Check for existing analysis
    const existing = await db.aiAnalysis.findFirst({
      where: {
        scanId,
        analysisType,
      },
    });

    if (existing) {
      return {
        analysisType: existing.analysisType as any,
        model: existing.model,
        confidence: existing.confidence ? Number(existing.confidence) : undefined,
        analysis: existing.analysis,
        entryStrategy: existing.entryStrategy || undefined,
        exitStrategy: existing.exitStrategy || undefined,
      };
    }

    // Generate new analysis
    let result: AIAnalysisResult | null = null;

    if (analysisType === 'pattern_review' && data.patterns && data.patterns.length > 0) {
      // Pattern review
      const bestPattern = data.patterns.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      const aiResponse = await this.openRouter.reviewPattern(
        bestPattern.patternName,
        bestPattern.direction,
        bestPattern.confidence,
        data.ohlcv,
        data.indicators
      );

      if (aiResponse) {
        try {
          const parsed = JSON.parse(aiResponse.content);
          result = {
            analysisType: 'pattern_review',
            model: aiResponse.model,
            confidence: parsed.confidence,
            analysis: parsed.reasoning || aiResponse.content,
            entryStrategy: undefined,
            exitStrategy: undefined,
          };
        } catch (e) {
          // Fallback if JSON parsing fails
          result = {
            analysisType: 'pattern_review',
            model: aiResponse.model,
            analysis: aiResponse.content,
          };
        }
      }
    } else {
      // Comprehensive analysis
      const aiResponse = await this.openRouter.analyzeChart(
        data.symbol,
        data.ohlcv,
        data.indicators,
        data.patterns
      );

      if (aiResponse) {
        try {
          const parsed = JSON.parse(aiResponse.content);
          result = {
            analysisType: 'comprehensive',
            model: aiResponse.model,
            analysis: parsed.outlook || parsed.analysis || aiResponse.content,
            entryStrategy: parsed.entryStrategy,
            exitStrategy: parsed.exitStrategy,
          };
        } catch (e) {
          // Fallback if JSON parsing fails
          result = {
            analysisType: 'comprehensive',
            model: aiResponse.model,
            analysis: aiResponse.content,
          };
        }
      }
    }

    // Store in database if generated
    if (result) {
      await db.aiAnalysis.create({
        data: {
          assetId,
          scanId,
          analysisType: result.analysisType,
          model: result.model,
          confidence: result.confidence || null,
          analysis: result.analysis,
          entryStrategy: result.entryStrategy || null,
          exitStrategy: result.exitStrategy || null,
        },
      });
    }

    return result;
  }

  /**
   * Get AI analysis for a scan
   */
  async getAnalysis(scanId: string, analysisType?: 'pattern_review' | 'comprehensive') {
    const where: any = { scanId };
    if (analysisType) {
      where.analysisType = analysisType;
    }

    const analyses = await db.aiAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (analyses.length === 0) {
      return null;
    }

    const analysis = analyses[0];
    return {
      analysisType: analysis.analysisType as any,
      model: analysis.model,
      confidence: analysis.confidence ? Number(analysis.confidence) : undefined,
      analysis: analysis.analysis,
      entryStrategy: analysis.entryStrategy || undefined,
      exitStrategy: analysis.exitStrategy || undefined,
    };
  }
}

let aiAnalysisService: AIAnalysisService | null = null;

export function getAIAnalysisService(): AIAnalysisService {
  if (!aiAnalysisService) {
    aiAnalysisService = new AIAnalysisService();
  }
  return aiAnalysisService;
}

