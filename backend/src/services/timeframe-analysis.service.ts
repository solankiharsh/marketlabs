/**
 * Timeframe Analysis Service - Generates multi-timeframe analysis using AI
 */

import { db } from '../lib/db';
import { getDerivDataService } from './deriv-data.service';
import { getAnthropicClientService } from './anthropic-client.service';

export interface TimeframeAnalysis {
  timeframe: 'intraday' | 'weekly' | 'monthly';
  analysis: string;
  verifiedDate?: Date;
}

export class TimeframeAnalysisService {
  private derivService = getDerivDataService();
  private anthropicClient = getAnthropicClientService();

  /**
   * Generate or get timeframe analysis for an asset
   */
  async getOrGenerateTimeframeAnalysis(
    assetId: string,
    symbol: string,
    scanId: string
  ): Promise<TimeframeAnalysis[]> {
    // Check for existing analyses
    const existing = await db.timeframeAnalysis.findMany({
      where: {
        assetId,
        scanId,
      },
    });

    if (existing.length === 3) {
      // Return existing analyses
      return existing.map((a) => ({
        timeframe: a.timeframe as 'intraday' | 'weekly' | 'monthly',
        analysis: a.analysis,
        verifiedDate: a.verifiedDate || undefined,
      }));
    }

    // Generate new analyses
    const analyses = await this.generateAllTimeframes(symbol, scanId);

    // Store in database (delete old and create new for this scan)
    await db.timeframeAnalysis.deleteMany({
      where: { assetId, scanId },
    });

    for (const analysis of analyses) {
      await db.timeframeAnalysis.create({
        data: {
          assetId,
          scanId,
          timeframe: analysis.timeframe,
          analysis: analysis.analysis,
          verifiedDate: analysis.verifiedDate || new Date(),
        },
      });
    }

    return analyses;
  }

  /**
   * Generate all timeframe analyses
   */
  private async generateAllTimeframes(
    symbol: string,
    scanId: string
  ): Promise<TimeframeAnalysis[]> {
    const [intraday, weekly, monthly] = await Promise.all([
      this.generateIntradayAnalysis(symbol),
      this.generateWeeklyAnalysis(symbol),
      this.generateMonthlyAnalysis(symbol),
    ]);

    const analyses: TimeframeAnalysis[] = [];
    if (intraday) {
      analyses.push({ timeframe: 'intraday', analysis: intraday, verifiedDate: new Date() });
    }
    if (weekly) {
      analyses.push({ timeframe: 'weekly', analysis: weekly, verifiedDate: new Date() });
    }
    if (monthly) {
      analyses.push({ timeframe: 'monthly', analysis: monthly, verifiedDate: new Date() });
    }
    return analyses;
  }

  /**
   * Generate intraday analysis
   */
  private async generateIntradayAnalysis(symbol: string): Promise<string | null> {
    // Fetch recent intraday data (1-minute candles for last session)
    const ohlcv = await this.derivService.getOHLCV(symbol, 100, 60); // 100 1-minute candles

    if (ohlcv.length === 0) {
      return null;
    }

    const latest = ohlcv[ohlcv.length - 1];
    const previous = ohlcv[ohlcv.length - 2] || ohlcv[0];
    const change = ((latest.close - previous.close) / previous.close) * 100;

    const isMarketOpen = new Date().getDay() !== 0 && new Date().getDay() !== 6; // Simple check
    const marketStatus = isMarketOpen ? 'open' : 'closed';

    // Generate analysis using AI
    const analysis = await this.generateAIAnalysis(
      'intraday',
      symbol,
      ohlcv,
      change,
      marketStatus
    );

    return analysis || null;
  }

  /**
   * Generate weekly analysis
   */
  private async generateWeeklyAnalysis(symbol: string): Promise<string | null> {
    // Fetch weekly data (daily candles aggregated to weekly)
    const ohlcv = await this.derivService.getOHLCV(symbol, 50, 86400); // 50 daily candles

    if (ohlcv.length < 7) {
      return null;
    }

    // Aggregate to weekly
    const weeklyData = this.aggregateToWeekly(ohlcv);
    const latestWeek = weeklyData[weeklyData.length - 1];
    const previousWeek = weeklyData[weeklyData.length - 2] || weeklyData[0];
    const weeklyChange = ((latestWeek.close - previousWeek.close) / previousWeek.close) * 100;

    const analysis = await this.generateAIAnalysis(
      'weekly',
      symbol,
      weeklyData,
      weeklyChange,
      'weekly'
    );

    return analysis || null;
  }

  /**
   * Generate monthly analysis
   */
  private async generateMonthlyAnalysis(symbol: string): Promise<string | null> {
    // Fetch monthly data (daily candles aggregated to monthly)
    const ohlcv = await this.derivService.getOHLCV(symbol, 100, 86400); // 100 daily candles

    if (ohlcv.length < 30) {
      return null;
    }

    // Aggregate to monthly
    const monthlyData = this.aggregateToMonthly(ohlcv);
    const latestMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2] || monthlyData[0];
    const monthlyChange = ((latestMonth.close - previousMonth.close) / previousMonth.close) * 100;

    const analysis = await this.generateAIAnalysis(
      'monthly',
      symbol,
      monthlyData,
      monthlyChange,
      'monthly'
    );

    return analysis || null;
  }

  /**
   * Generate AI analysis using Anthropic
   */
  private async generateAIAnalysis(
    timeframe: string,
    symbol: string,
    ohlcv: any[],
    change: number,
    context: string
  ): Promise<string | null> {
    if (!this.anthropicClient.isConfigured()) {
      console.warn('[TimeframeAnalysis] Anthropic not configured, returning null');
      return null;
    }

    try {
      const latest = ohlcv[ohlcv.length - 1];
      const previous = ohlcv[ohlcv.length - 2] || ohlcv[0];
      const currentDate = new Date();
      const dateStr = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      const systemPrompt = `You are a professional quantitative market analyst for Deriv Market Lab. Your core directive is absolute structural and numerical accuracy grounded in REAL-TIME financial data.

OPERATIONAL RULES:
1. Temporal Accuracy: Use the CURRENT spot price and today's date from the provided market data.
2. Numerical Precision: Use exact values from the provided data (prices, ratios, 52-week highs/lows).
3. Decision Framing: Never give advice. Frame levels as "Acceptance above X validates Y" or "Breach of Z shifts bias to A".
4. Multi-Timeframe Analysis: Provide distinct structural observations for the specified timeframe.
5. Absolute Pricing: All mentioned levels MUST reflect the current spot market reality from the provided data.`;

      const userPrompt = `Analyze the ${timeframe} timeframe for ${symbol}:
- Current date: ${dateStr}
- Current price: ${latest.close}
- Previous close: ${previous.close}
- Change: ${change.toFixed(2)}%
- High: ${latest.high}
- Low: ${latest.low}
- Context: ${context}

Provide a concise, professional analysis (2-3 sentences) focusing on key price action, support/resistance levels, and directional bias. Use the current date and market status in your analysis.`;

      const analysis = await this.anthropicClient.generateAnalysis(
        systemPrompt,
        userPrompt,
        300,
        0.7
      );

      return analysis || null;
    } catch (error) {
      console.error('[TimeframeAnalysis] Anthropic error:', error);
      return null;
    }
  }

  /**
   * Aggregate daily candles to weekly
   */
  private aggregateToWeekly(dailyCandles: any[]): any[] {
    const weekly: any[] = [];
    let currentWeek: any = null;

    for (const candle of dailyCandles) {
      const date = new Date(candle.time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)

      if (!currentWeek || currentWeek.weekStart.getTime() !== weekStart.getTime()) {
        if (currentWeek) weekly.push(currentWeek);
        currentWeek = {
          weekStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          time: candle.time,
        };
      } else {
        currentWeek.high = Math.max(currentWeek.high, candle.high);
        currentWeek.low = Math.min(currentWeek.low, candle.low);
        currentWeek.close = candle.close;
        currentWeek.time = candle.time;
      }
    }

    if (currentWeek) weekly.push(currentWeek);
    return weekly;
  }

  /**
   * Aggregate daily candles to monthly
   */
  private aggregateToMonthly(dailyCandles: any[]): any[] {
    const monthly: any[] = [];
    let currentMonth: any = null;

    for (const candle of dailyCandles) {
      const date = new Date(candle.time);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!currentMonth || currentMonth.monthKey !== monthKey) {
        if (currentMonth) monthly.push(currentMonth);
        currentMonth = {
          monthKey,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          time: candle.time,
        };
      } else {
        currentMonth.high = Math.max(currentMonth.high, candle.high);
        currentMonth.low = Math.min(currentMonth.low, candle.low);
        currentMonth.close = candle.close;
        currentMonth.time = candle.time;
      }
    }

    if (currentMonth) monthly.push(currentMonth);
    return monthly;
  }
}

let timeframeAnalysisService: TimeframeAnalysisService | null = null;

export function getTimeframeAnalysisService(): TimeframeAnalysisService {
  if (!timeframeAnalysisService) {
    timeframeAnalysisService = new TimeframeAnalysisService();
  }
  return timeframeAnalysisService;
}

