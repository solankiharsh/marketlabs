/**
 * OpenRouter Service - AI analysis via OpenRouter API
 * Supports Claude 3.5 Sonnet and Grok models
 */

import { env } from '../lib/env';

export type OpenRouterModel = 'claude-3.5-sonnet' | 'grok-beta';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenRouterService {
  private apiKey: string | null;
  private baseUrl: string;

  constructor() {
    // Support both OpenRouter and Anthropic API keys
    // If Anthropic key is provided, we'll use it directly
    this.apiKey = env.OPENROUTER_API_KEY || env.ANTHROPIC_API_KEY || null;
    this.baseUrl = env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Check if OpenRouter is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Check if we're using Anthropic API directly
   */
  private isUsingAnthropic(): boolean {
    return !!env.ANTHROPIC_API_KEY && !env.OPENROUTER_API_KEY;
  }

  /**
   * Generate AI analysis
   */
  async generateAnalysis(
    messages: OpenRouterMessage[],
    model: OpenRouterModel = 'claude-3.5-sonnet'
  ): Promise<OpenRouterResponse | null> {
    if (!this.isConfigured()) {
      console.warn('[OpenRouter] API key not configured, skipping AI analysis');
      return null;
    }

    // Use Anthropic API directly if Anthropic key is provided
    if (this.isUsingAnthropic()) {
      return this.generateAnthropicAnalysis(messages, model);
    }

    // Otherwise use OpenRouter
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://marketlabs.xyz', // Optional: for analytics
          'X-Title': 'MarketLabs AI Analysis', // Optional: for analytics
        },
        body: JSON.stringify({
          model: `anthropic/${model}`,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[OpenRouter] API error:', error);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('[OpenRouter] No content in response:', data);
        return null;
      }

      return {
        content,
        model: data.model || model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('[OpenRouter] Request error:', error.message);
      return null;
    }
  }

  /**
   * Generate AI analysis using Anthropic API directly
   */
  private async generateAnthropicAnalysis(
    messages: OpenRouterMessage[],
    model: OpenRouterModel = 'claude-3.5-sonnet'
  ): Promise<OpenRouterResponse | null> {
    try {
      // Map model names to Anthropic model IDs
      // Correct model names: claude-3-5-sonnet-20240620 (latest stable) or claude-3-5-sonnet-20241022
      const modelMap: Record<OpenRouterModel, string> = {
        'claude-3.5-sonnet': 'claude-3-5-sonnet-20240620', // Use stable version
        'grok-beta': 'claude-3-5-sonnet-20240620', // Fallback to Claude if Grok not available
      };

      const anthropicModel = modelMap[model] || 'claude-3-5-sonnet-20240620';

      // Convert messages format for Anthropic API
      const anthropicMessages = messages
        .filter(m => m.role !== 'system') // Anthropic uses system parameter separately
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      const systemMessage = messages.find(m => m.role === 'system')?.content || '';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 1000,
          temperature: 0.7,
          system: systemMessage,
          messages: anthropicMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Anthropic] API error:', error);
        return null;
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        console.error('[Anthropic] No content in response:', data);
        return null;
      }

      return {
        content,
        model: data.model || model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('[Anthropic] Request error:', error.message);
      return null;
    }
  }

  /**
   * Generate pattern review analysis
   */
  async reviewPattern(
    patternName: string,
    patternDirection: string,
    patternConfidence: number,
    ohlcvData: any[],
    indicators: any
  ): Promise<OpenRouterResponse | null> {
    const prompt = `Review this detected trading pattern:

Pattern: ${patternName}
Direction: ${patternDirection}
Algorithm Confidence: ${patternConfidence}%

Recent Price Data:
${ohlcvData.slice(-10).map((c, i) => 
  `Candle ${i}: O=${c.open.toFixed(2)} H=${c.high.toFixed(2)} L=${c.low.toFixed(2)} C=${c.close.toFixed(2)}`
).join('\n')}

Technical Indicators:
- RSI: ${indicators.rsi?.toFixed(2) || 'N/A'}
- MACD: ${indicators.macd?.toFixed(4) || 'N/A'} (Signal: ${indicators.macdSignal?.toFixed(4) || 'N/A'})
- EMA-21: ${indicators.ema21?.toFixed(2) || 'N/A'}
- EMA-50: ${indicators.ema50?.toFixed(2) || 'N/A'}

Provide:
1. Your independent confidence assessment (0-100%)
2. Brief reasoning (2-3 sentences)
3. Whether you agree or disagree with the algorithm

Format as JSON: { "confidence": number, "reasoning": "string", "agreement": "agree" | "disagree" | "partial" }`;

    return this.generateAnalysis([
      {
        role: 'system',
        content: 'You are a professional market analyst providing concise, data-driven pattern analysis. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);
  }

  /**
   * Generate comprehensive chart analysis
   */
  async analyzeChart(
    symbol: string,
    ohlcvData: any[],
    indicators: any,
    patterns?: any[]
  ): Promise<OpenRouterResponse | null> {
    const prompt = `Analyze this market chart comprehensively:

Symbol: ${symbol}
Timeframe: ${ohlcvData.length} candles

Price Action:
${ohlcvData.slice(-20).map((c, i) => 
  `Candle ${i}: O=${c.open.toFixed(2)} H=${c.high.toFixed(2)} L=${c.low.toFixed(2)} C=${c.close.toFixed(2)}`
).join('\n')}

Technical Indicators:
- RSI: ${indicators.rsi?.toFixed(2) || 'N/A'} ${indicators.rsi ? (indicators.rsi > 70 ? '(Overbought)' : indicators.rsi < 30 ? '(Oversold)' : '(Neutral)') : ''}
- MACD: ${indicators.macd?.toFixed(4) || 'N/A'} vs Signal ${indicators.macdSignal?.toFixed(4) || 'N/A'}
- EMA-21: ${indicators.ema21?.toFixed(2) || 'N/A'}
- EMA-50: ${indicators.ema50?.toFixed(2) || 'N/A'}

${patterns && patterns.length > 0 ? `Detected Patterns: ${patterns.map(p => `${p.patternName} (${p.direction}, ${p.confidence}%)`).join(', ')}` : 'No patterns detected'}

Provide:
1. Market outlook (2-3 sentences)
2. Key trends and levels to watch
3. Entry strategy (if applicable)
4. Exit strategy (if applicable)

Format as JSON: { "outlook": "string", "trends": "string", "entryStrategy": "string", "exitStrategy": "string" }`;

    return this.generateAnalysis([
      {
        role: 'system',
        content: 'You are a professional market analyst providing comprehensive chart analysis with actionable trading insights. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);
  }
}

let openRouterService: OpenRouterService | null = null;

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterService) {
    openRouterService = new OpenRouterService();
  }
  return openRouterService;
}

